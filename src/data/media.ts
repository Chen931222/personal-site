/**
 * 素材解析 —— 在 build 時掃 public/media/，把檔名對回資料。
 *
 * 為什麼要這一層：站主的專案總是卡在「五分鐘的物理動作」（拍照、錄影、匯入）。
 * 如果補一張圖還要順手改一行 TypeScript，那個五分鐘就會變成一週。
 * 這裡的規矩是：**檔名對了就會出現在站上，不用改任何資料檔。**
 *
 *   public/media/bookshelf.mp4          → 書櫃的操作錄影
 *   public/media/bookshelf-still.webp   → 它的封面（沒有的話錄影管線會自動抽一張）
 *   public/media/bookshelf-cover.webp   → 開場膠捲與上下偷看格的縮圖
 *   public/media/portrait.webp          → 大頭照
 *   public/media/life-01.webp …         → 關於我的生活照，照編號排序
 *
 * ⚠️ 這個模組用 node:fs，只能在 .astro 的 frontmatter（build 時的 Node）裡用，
 *    不能被 <script> 匯入 —— 那會把它打包進瀏覽器，當場爆掉。
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * 素材資料夾的位置：兩種定位法各自只對一半，所以兩種都試。
 *
 *   - `process.cwd()`：**build 時對**（在專案根目錄跑），
 *     但 dev server 是 `astro dev --root G:\...` 從別的資料夾啟動的，cwd 不是專案根。
 *   - `import.meta.url`：**dev 時對**（Vite 直接服務原始檔），
 *     但 build 時這個模組會被打包到別的位置，相對路徑就跑掉了。
 *
 * 兩個都踩過：先是 dev 全部退回打樣框（build 卻是對的），
 * 改成相對模組之後換 build 全部退回（dev 才對）。兩次都**沒有任何錯誤訊息** ——
 * 素材只是安靜地消失。所以下面找不到時會叫出來，不再靜靜地失敗。
 */
const CANDIDATES = [
  path.join(path.dirname(fileURLToPath(import.meta.url)), '../../public/media'),
  path.resolve(process.cwd(), 'public/media'),
];

const DIR = CANDIDATES.find((p) => fs.existsSync(p)) ?? CANDIDATES[1];

const files: string[] = (() => {
  try {
    const f = fs.readdirSync(DIR);
    if (!f.length) console.warn(`[media] ${DIR} 是空的 —— 全站會顯示打樣佔位框`);
    return f;
  } catch {
    // 找不到資料夾不該讓 build 掛掉（乾淨 clone 時它本來就不存在），
    // 但一定要講出來 —— 靜靜地少掉所有影片是最難查的那種 bug。
    console.warn(`[media] 找不到素材資料夾，試過：\n  ${CANDIDATES.join('\n  ')}`);
    return [];
  }
})();

const IMG = ['.webp', '.avif', '.jpg', '.jpeg', '.png'];

/** 找 `<base>.<副檔名>`，依偏好順序。回傳的是網址路徑，不是磁碟路徑。 */
function find(base: string, exts: string[]): string | null {
  for (const ext of exts) {
    const hit = files.find((f) => f.toLowerCase() === (base + ext).toLowerCase());
    if (hit) return `/media/${hit}`;
  }
  return null;
}

export const findImage = (base: string) => find(base, IMG);
export const findVideo = (base: string) => find(base, ['.mp4', '.webm']);

/** 生活照：`life-01`、`life-02`… 照編號排序，有幾張就是幾張 */
export function lifePhotos() {
  return files
    .filter((f) => /^life-\d+\.(webp|avif|jpe?g|png)$/i.test(f))
    .sort()
    .map((f) => `/media/${f}`);
}

/**
 * 遊記照片：`public/media/journal/<id>-01.webp`…
 *
 * 另外掃一個子資料夾，不跟作品素材混在一起 ——
 * 遊記照片會愈長愈多，全部堆在 media/ 根目錄的話很快就找不到東西。
 */
const JDIR = path.join(DIR, 'journal');
const jfiles: string[] = (() => {
  try {
    return fs.readdirSync(JDIR);
  } catch {
    return []; // 還沒有照片是正常的，不要吵
  }
})();

export function tripPhotos(id: string): string[] {
  const re = new RegExp(`^${id}-\\d+\\.(webp|avif|jpe?g|png)$`, 'i');
  return jfiles
    .filter((f) => re.test(f))
    .sort()
    .map((f) => `/media/journal/${f}`);
}

/** 遊記照片的尺寸（給 aspect-ratio 用，避免載入時整頁位移） */
export function journalSize(webPath: string) {
  try {
    const buf = fs.readFileSync(path.join(JDIR, path.basename(webPath)));
    return sizeOf(buf);
  } catch {
    return null;
  }
}

/**
 * 讀圖片的原始尺寸，直接解檔頭 —— 不為了這件事引一個相依套件。
 *
 * 沒有尺寸就沒有 aspect-ratio，沒有 aspect-ratio 的圖片會在載入時把版面撐開一次
 * （CLS）。照片牆是交錯排的，一次跳動整面牆都會位移。
 */
export function imageSize(webPath: string): { w: number; h: number } | null {
  try {
    return sizeOf(fs.readFileSync(path.join(DIR, path.basename(webPath))));
  } catch {
    return null;
  }
}

/** 從檔頭解尺寸。認不出來就回 null —— 呼叫端自己有預設比例。 */
function sizeOf(buf: Buffer): { w: number; h: number } | null {
  try {
    // PNG: IHDR 固定在 offset 16
    if (buf.readUInt32BE(0) === 0x89504e47) {
      return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) };
    }

    // WebP: RIFF....WEBP，三種格式的尺寸位置不同
    if (buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP') {
      const fmt = buf.toString('ascii', 12, 16);
      if (fmt === 'VP8 ') return { w: buf.readUInt16LE(26) & 0x3fff, h: buf.readUInt16LE(28) & 0x3fff };
      if (fmt === 'VP8L') {
        const b = buf.readUInt32LE(21);
        return { w: (b & 0x3fff) + 1, h: ((b >> 14) & 0x3fff) + 1 };
      }
      if (fmt === 'VP8X') {
        const r24 = (o: number) => buf[o] | (buf[o + 1] << 8) | (buf[o + 2] << 16);
        return { w: r24(24) + 1, h: r24(27) + 1 };
      }
    }

    // JPEG: 掃 SOFn 標記
    if (buf.readUInt16BE(0) === 0xffd8) {
      let o = 2;
      while (o < buf.length - 9) {
        if (buf[o] !== 0xff) {
          o++;
          continue;
        }
        const marker = buf[o + 1];
        // SOF0–SOF15，扣掉 DHT(c4)、JPGA(c8)、DAC(cc) 這三個不是 SOF 的
        if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
          return { w: buf.readUInt16BE(o + 7), h: buf.readUInt16BE(o + 5) };
        }
        o += 2 + buf.readUInt16BE(o + 2);
      }
    }
  } catch {
    /* 讀不到就當作不知道，交給呼叫端的預設比例 */
  }
  return null;
}

/** 給 CSS 用的 `寬 / 高`；讀不到就回退到指定的預設 */
export function ratioOf(webPath: string | null, fallback: string): string {
  if (!webPath) return fallback;
  const s = imageSize(webPath);
  return s ? `${s.w} / ${s.h}` : fallback;
}

// ── 接回資料 ─────────────────────────────────────────────────────────────
// projects.ts 與 site.ts 保持純資料（可以被任何地方 import）；
// 掃檔案這件事只發生在這裡，元件改成吃下面這幾個。

import { PROJECTS, type Project } from './projects';
import { SITE, type Shot } from './site';

/** 作品清單，影片／首格／縮圖用檔名自動補上。資料檔裡寫死的值優先。 */
export const WORKS: Project[] = PROJECTS.map((p) => ({
  ...p,
  video: p.video ?? findVideo(p.slug),
  still: p.still ?? findImage(`${p.slug}-still`),
  cover: p.cover ?? findImage(`${p.slug}-cover`),
}));

/** 大頭照 —— 開場交棒之後的第一眼 */
export const PORTRAIT: string | null = SITE.portrait ?? findImage('portrait');

/**
 * 關於我的生活照。
 *
 * 有 `life-01.webp…` 就用實際檔案，張數由檔案決定、比例由圖片本身決定
 * （照片牆是交錯排的，硬套一個比例等於把每張照片都裁一刀）。
 * 一張都沒有時，退回 site.ts 裡那組打樣槽，版面照樣成立。
 */
export const PHOTOS: Shot[] = (() => {
  const found = lifePhotos();
  if (!found.length) return SITE.about.photos as unknown as Shot[];
  const slots = SITE.about.photos as unknown as Shot[];
  return found.map((src, i) => ({
    src,
    ratio: ratioOf(src, slots[i]?.ratio ?? '3 / 2'),
    label: slots[i]?.label ?? `生活照 ${String(i + 1).padStart(2, '0')}`,
    caption: slots[i]?.caption ?? '',
  }));
})();
