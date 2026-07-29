/**
 * 把手錄的原始檔剪成影格規格。
 *
 * 站主自己錄的長片段（20–30 秒、1920×1080、含游標）丟進 raw/，
 * 這支負責後半段：裁成 16:9、縮到 1280×720、切出最好的 8 秒、
 * 接成無縫循環、抽封面、放進 public/media/。
 *
 * 用法：
 *   node fromraw.mjs bookshelf --scan        先看一遍，挑進點
 *   node fromraw.mjs bookshelf 4.2           從第 4.2 秒剪 8 秒
 *   node fromraw.mjs bookshelf 4.2 7         從第 4.2 秒剪 7 秒
 *   node fromraw.mjs                         列出 raw/ 裡有什麼
 *
 * raw/ 的檔名要跟 slug 一樣：raw/bookshelf.mp4、raw/mi-espanol.mp4…
 * （Win+Alt+R 存出來的檔名很長，改名就好，不用重錄。）
 */
import { existsSync, mkdirSync, readdirSync, rmSync, statSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const RAW = path.join(here, 'raw');
const OUT = path.resolve(here, '../../public/media');
const TMP = path.join(here, '.tmp-raw');

mkdirSync(RAW, { recursive: true });
mkdirSync(OUT, { recursive: true });

const dur = (f) =>
  +(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration',
    '-of', 'default=nw=1:nk=1', f]) + '').trim();

const findRaw = (slug) => {
  const hit = readdirSync(RAW).find(
    (f) => path.parse(f).name.toLowerCase() === slug.toLowerCase()
  );
  return hit ? path.join(RAW, hit) : null;
};

const slug = process.argv[2];

if (!slug) {
  const files = readdirSync(RAW).filter((f) => /\.(mp4|mkv|mov|webm)$/i.test(f));
  if (!files.length) {
    console.log(`raw/ 是空的。\n把錄好的檔案放進：\n  ${RAW}\n檔名用 slug，例如 bookshelf.mp4`);
  } else {
    console.log('raw/ 裡有：');
    for (const f of files) {
      const p = path.join(RAW, f);
      console.log(`  ${path.parse(f).name.padEnd(20)} ${dur(p).toFixed(1)}s · ${(statSync(p).size / 1e6).toFixed(1)}MB`);
    }
    console.log('\n先 --scan 挑進點：node fromraw.mjs <slug> --scan');
  }
  process.exit(0);
}

const src = findRaw(slug);
if (!src) {
  console.error(`raw/ 裡找不到 ${slug}。現有：${readdirSync(RAW).join(', ') || '（空）'}`);
  process.exit(1);
}

const D = dur(src);

// ── --scan：每秒抽一格並烙上時間碼，用來挑進點 ─────────────────────────
if (process.argv.includes('--scan')) {
  mkdirSync(path.join(here, 'check'), { recursive: true });
  const sheet = path.join(here, 'check', `raw-${slug}.png`);
  const cols = 5;
  const secs = Math.min(Math.floor(D), 30);
  const rows = Math.ceil(secs / cols);

  /**
   * 每格烙上「這是第幾秒」—— 沒有它，看到好畫面也不知道要填哪個進點。
   *
   * Windows 版的 ffmpeg 沒有 fontconfig，drawtext 不指定 fontfile 會直接崩，
   * 而且是 exit code 3221225477（存取違規），錯誤訊息看不出是字型問題。
   * 所以指定系統字型，失敗再退回不烙字的版本 —— 挑進點還是能用，只是要自己數。
   */
  const tile = `,tile=${cols}x${rows}`;
  const base = 'fps=1,scale=380:-1';
  const stamp =
    ",drawtext=fontfile='C\\:/Windows/Fonts/consola.ttf'" +
    ":text='%{eif\\:n\\:d}s':x=8:y=8:fontsize=24:fontcolor=yellow:box=1:boxcolor=black@0.65";

  let stamped = true;
  try {
    execFileSync('ffmpeg', ['-y', '-i', src, '-vf', base + stamp + tile,
      '-frames:v', '1', '-loglevel', 'error', sheet], { stdio: 'pipe' });
  } catch {
    stamped = false;
    execFileSync('ffmpeg', ['-y', '-i', src, '-vf', base + tile,
      '-frames:v', '1', '-loglevel', 'error', sheet]);
  }

  console.log(`原始長度 ${D.toFixed(1)}s → ${path.relative(here, sheet)}`);
  console.log(
    stamped
      ? '每格左上角的數字就是秒數。'
      : `（字型載不到，沒烙秒數）左上到右下每格 1 秒，一列 ${cols} 格，從 0s 開始數。`
  );
  console.log(`挑好進點之後：node fromraw.mjs ${slug} <秒數>`);
  process.exit(0);
}

const ss = parseFloat(process.argv[3] ?? '0');
const want = parseFloat(process.argv[4] ?? '8');

if (Number.isNaN(ss) || ss < 0 || ss >= D) {
  console.error(`進點要在 0 到 ${D.toFixed(1)} 之間`);
  process.exit(1);
}

const X = 0.4; // 循環交叉溶接的長度
const take = Math.min(want + X, D - ss); // 多剪 X，溶接會吃掉
if (take < 3) {
  console.error(`從第 ${ss}s 起只剩 ${take.toFixed(1)}s，太短`);
  process.exit(1);
}

rmSync(TMP, { recursive: true, force: true });
mkdirSync(TMP, { recursive: true });
const mid = path.join(TMP, 'mid.mp4');
const mp4 = path.join(OUT, `${slug}.mp4`);
const still = path.join(OUT, `${slug}-still.webp`);

/**
 * 第一趟：裁成 16:9 再縮到 1280×720。
 *
 * 螢幕錄影常常不是剛好 16:9（有工作列、有瀏覽器外框、或螢幕本身是 16:10）。
 * `crop=ih*16/9:ih` 從中央裁出最大的 16:9 —— 已經是 16:9 的檔案不受影響。
 * 聲音直接丟掉：影格是靜音自動播放的，留著只是白佔容量。
 */
execFileSync('ffmpeg', ['-y', '-ss', String(ss), '-i', src, '-t', String(take), '-an',
  '-vf', "crop='min(iw,ih*16/9)':'min(ih,iw*9/16)',scale=1280:720:flags=lanczos,fps=30,setsar=1",
  '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '18', '-pix_fmt', 'yuv420p',
  '-loglevel', 'error', mid]);

const M = dur(mid);
const f = (n) => n.toFixed(3);

// 第二趟：接成無縫循環。join 一定放尾巴 —— 放開頭的話第 0 格是結尾的疊影。
execFileSync('ffmpeg', ['-y', '-i', mid, '-an', '-filter_complex',
  `[0:v]split=3[a][b][c];` +
  `[a]trim=${f(M - X)}:${f(M)},setpts=PTS-STARTPTS[tail];` +
  `[b]trim=0:${f(X)},setpts=PTS-STARTPTS[head];` +
  `[c]trim=${f(X)}:${f(M - X)},setpts=PTS-STARTPTS[body];` +
  `[tail][head]xfade=transition=fade:duration=${f(X)}:offset=0[join];` +
  `[body][join]concat=n=2:v=1[v]`,
  '-map', '[v]',
  '-c:v', 'libx264', '-preset', 'slow', '-crf', '27', '-pix_fmt', 'yuv420p',
  '-movflags', '+faststart', '-loglevel', 'error', mp4]);

execFileSync('ffmpeg', ['-y', '-ss', '0.15', '-i', mp4, '-frames:v', '1',
  '-q:v', '72', '-loglevel', 'error', still]);

// 剪好之後也做一張檢查圖 —— 不要交出自己沒看過的東西
mkdirSync(path.join(here, 'check'), { recursive: true });
const sheet = path.join(here, 'check', `${slug}.png`);
execFileSync('ffmpeg', ['-y', '-i', mp4, '-vf', 'fps=1.5,scale=420:-1,tile=4x3',
  '-frames:v', '1', '-loglevel', 'error', sheet]);

rmSync(TMP, { recursive: true, force: true });

const mb = statSync(mp4).size / 1e6;
const out = dur(mp4);
console.log(
  `OK  ${slug}  ${out.toFixed(1)}s · ${mb.toFixed(2)}MB` +
  (mb > 2 ? '  ⚠ 超過 2MB' : '') +
  (out < 5 || out > 11 ? `  ⚠ ${out.toFixed(1)}s 偏離 8 秒` : '')
);
console.log(`→ public/media/${slug}.mp4 ＋ -still.webp`);
console.log(`   檢查圖：${path.relative(here, sheet)}`);
