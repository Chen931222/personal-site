/**
 * 錄一支（或全部）操作影片。
 *
 *   node record.mjs bookshelf        # 錄一支
 *   node record.mjs                  # 全部有編排檔的都錄
 *
 * 產出：
 *   ../../public/media/<slug>.mp4         1280×720 H.264，靜音，可循環
 *   ../../public/media/<slug>-still.webp  第一格，影片載入前的封面與行動網路備援
 *
 * 每個站的編排放在 choreo/<slug>.mjs，export default async (page, k) => {...}
 */
import { chromium } from 'playwright-core';
import { mkdirSync, readdirSync, rmSync, readFileSync, statSync, openSync, closeSync, unlinkSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import * as k from './lib.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.resolve(here, '../../public/media');
const TMP = path.join(here, '.tmp');
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

const SITES = Object.fromEntries(
  JSON.parse(readFileSync(path.join(here, 'probe.json'), 'utf8')).map((s) => [s.slug, s.url])
);

const only = process.argv[2];
const slugs = readdirSync(path.join(here, 'choreo'))
  .filter((f) => f.endsWith('.mjs') && !f.startsWith('_'))
  .map((f) => f.replace('.mjs', ''))
  .filter((s) => !only || s === only);

if (!slugs.length) {
  console.error(only ? `choreo/${only}.mjs 不存在` : 'choreo/ 裡沒有編排檔');
  process.exit(1);
}

/**
 * 錄影一次只能有一支在跑。
 *
 * Playwright 的錄影是走 CDP screencast 收合成器吐出來的每一格 ——
 * 機器一忙，頁面就少畫幾格，少掉的格會被補成停格。
 * 那不是「電腦慢」，是**成品會頓**，而且你在 log 上看不出來。
 * 平行跑編排沒問題，錄影必須排隊。
 */
const LOCK = path.join(here, '.record.lock');
let lockFd = null;
for (let i = 0; i < 600; i++) {
  try {
    lockFd = openSync(LOCK, 'wx');
    break;
  } catch {
    if (i === 0) console.log('… 另一支正在錄，排隊中');
    await new Promise((r) => setTimeout(r, 2000));
  }
}
if (lockFd === null) {
  console.error('等不到錄影鎖（20 分鐘）。若確定沒有其他程序在跑，刪掉 .record.lock');
  process.exit(1);
}
const release = () => {
  try {
    closeSync(lockFd);
    unlinkSync(LOCK);
  } catch {
    /* 已經清掉了就算了 */
  }
};
process.on('exit', release);
process.on('SIGINT', () => {
  release();
  process.exit(130);
});

mkdirSync(OUT, { recursive: true });
const TMPME = path.join(TMP, String(process.pid));
rmSync(TMPME, { recursive: true, force: true });
mkdirSync(TMPME, { recursive: true });

const browser = await chromium.launch({ executablePath: CHROME, headless: true });

for (const slug of slugs) {
  const url = SITES[slug];
  if (!url) {
    console.log(`SKIP ${slug} —— probe.json 裡沒有這個網址`);
    continue;
  }

  const dir = path.join(TMPME, slug);
  mkdirSync(dir, { recursive: true });

  const ctx = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    deviceScaleFactor: 1,
    // 錄影尺寸就是影格尺寸。錄成別的比例之後要裁，裁掉的一定是你在意的那一邊。
    recordVideo: { dir, size: { width: 1280, height: 720 } },
    // 站上大多有進場動畫。減少動態會讓它們直接跳到終點，那就沒東西可錄了。
    reducedMotion: 'no-preference',
  });

  const page = await ctx.newPage();
  // 錄影從 context 建立那一刻就開始，所以開頭一定有一段「白畫面＋載入」。
  // 記下編排真正開始的時間，等一下用 -ss 把那一段切掉 ——
  // 影格裡不該有人看得到網站在 loading。
  const tCtx = Date.now();
  let lead = 0;
  let took = 0;
  try {
    await page.goto(url, { waitUntil: 'load', timeout: 45000 });

    // load 事件遠早於「畫面真的可以看了」。夢想車庫要讀 8 個 glb 模型，
    // 今天穿什麼要等天氣 API 回來重畫一次 —— 只給固定寬限的話，
    // 影片開頭會出現「載入車庫 94%」或骨架畫面。
    // networkidle 抓得到這兩種，抓不到的再靠下面的固定寬限與各站自己的 ready。
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
    await k.sleep(1200); // 讓字體與首屏圖片落定，不然第一格是空的
    await k.installCursor(page);
    await page.evaluate(() => (window.__lastCur = { x: 640, y: 760 }));

    const mod = await import(pathToFileURL(path.join(here, 'choreo', `${slug}.mjs`)).href);

    // 各站自己的「準備好了」條件。跑在 lead 之前 —— 這一段等待會被裁掉，
    // 不會變成影片開頭那段沒人想看的等待畫面。
    if (typeof mod.ready === 'function') await mod.ready(page);

    lead = (Date.now() - tCtx) / 1000;
    const t0 = Date.now();
    await mod.default(page, k);
    took = Date.now() - t0;
  } catch (e) {
    console.log(`ERR  ${slug}: ${String(e).split('\n')[0].slice(0, 120)}`);
  }

  await ctx.close(); // 影片要 context 關掉才會寫完

  const webm = readdirSync(dir).find((f) => f.endsWith('.webm'));
  if (!webm) {
    console.log(`ERR  ${slug}: 沒有產出影片`);
    continue;
  }
  const src = path.join(dir, webm);
  const mp4 = path.join(OUT, `${slug}.mp4`);
  const still = path.join(OUT, `${slug}-still.webp`);

  // ── 第一趟：切掉開頭的載入，統一成 30fps 的中繼檔 ──────────────────
  const mid = path.join(dir, 'mid.mp4');
  execFileSync('ffmpeg', ['-y', '-ss', lead.toFixed(2), '-i', src, '-an',
    '-vf', 'scale=1280:720:flags=lanczos,fps=30',
    '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '18', '-pix_fmt', 'yuv420p',
    '-loglevel', 'error', mid]);

  const probeDur = (f) =>
    +(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration',
      '-of', 'default=nw=1:nk=1', f]) + '').trim();
  const D = probeDur(mid);

  /**
   * ── 第二趟：接成無縫循環 ────────────────────────────────────────────
   *
   * `<video loop>` 是硬切回第一格。8 秒一次的硬切在一個一直亮著的影格裡
   * 非常顯眼 —— 尤其這些站的結尾狀態跟開頭差很多（唱片架從黑底變成紅底）。
   *
   * 作法：把尾巴 X 秒跟開頭 X 秒交叉溶接成一塊 join，
   * 輸出 = body ＋ join，長度 D−X。
   *   body 從原片的第 X 秒開始（乾淨），
   *   join 結束在原片的第 X 秒（＝body 的起點），所以它自己流回自己。
   *
   * ⚠️ join 一定要放**尾巴**，不能放開頭。
   *    放開頭的話第 0 格是「結尾淡出中」的疊影 —— 影片一播先閃一下自己的結局
   *    再溶回開頭。9 支全中，實測抽第 0 格看出來的：每一支的第一眼都是它的最後一幕。
   */
  const X = 0.4;
  const f = (n) => n.toFixed(3);
  execFileSync('ffmpeg', ['-y', '-i', mid, '-an', '-filter_complex',
    `[0:v]split=3[a][b][c];` +
    `[a]trim=${f(D - X)}:${f(D)},setpts=PTS-STARTPTS[tail];` +
    `[b]trim=0:${f(X)},setpts=PTS-STARTPTS[head];` +
    `[c]trim=${f(X)}:${f(D - X)},setpts=PTS-STARTPTS[body];` +
    `[tail][head]xfade=transition=fade:duration=${f(X)}:offset=0[join];` +
    `[body][join]concat=n=2:v=1[v]`,
    '-map', '[v]',
    // H.264 + yuv420p + faststart：Safari 與 iOS 對這三樣特別挑。
    // crf 27 在 1280×720 的介面畫面上看不出壓縮痕跡，又壓得進 2MB。
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '27', '-pix_fmt', 'yuv420p',
    '-movflags', '+faststart', '-loglevel', 'error', mp4]);
  // 封面取第 0.15 秒。溶接改到尾巴之後第 0 格就是乾淨的開場，
  // 抓 0.15 只是避開首格編碼的軟化，不再需要跳過 0.4 秒的疊影。
  execFileSync(
    'ffmpeg',
    ['-y', '-ss', '0.15', '-i', mp4, '-frames:v', '1', '-q:v', '72', '-loglevel', 'error', still]
  );

  const mb = statSync(mp4).size / 1e6;
  const dur = probeDur(mp4);
  const warn = [
    dur < 5 || dur > 11 ? `⚠ ${dur.toFixed(1)}s 偏離 8 秒` : '',
    mb > 2 ? `⚠ ${mb.toFixed(2)}MB 超過 2MB` : '',
  ].filter(Boolean).join(' ');

  console.log(
    `OK   ${slug.padEnd(18)} ${dur.toFixed(1)}s · ${mb.toFixed(2)}MB · 編排 ${(took / 1000).toFixed(1)}s ${warn}`
  );
}

await browser.close();
rmSync(TMPME, { recursive: true, force: true });
release();
console.log('\n→ public/media/');
