/**
 * 錄「這個網站自己」的走訪影片。
 *
 * 為什麼要這支：開發時的瀏覽器面板如果沒有顯示，渲染管線是凍結的 ——
 * 截不到圖、動畫也不會跑，站主看不到成品。用無頭 Chrome 錄一段下來，
 * 至少「它跑起來長什麼樣」不用靠想像。
 *
 *   node tour.mjs home    開場動畫 → 往下捲＝關於我
 *   node tour.mjs work    作品舞台，逐一翻過去（影格裡的錄影會播）
 *
 * 產出在 check/tour-<which>.mp4。這是給人看的，不上站。
 */
import { chromium } from 'playwright-core';
import { mkdirSync, readdirSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const BASE = 'http://localhost:4321';
const W = 1440;
const H = 900;

const which = process.argv[2] || 'work';
const TMP = path.join(here, '.tmp-tour');
rmSync(TMP, { recursive: true, force: true });
mkdirSync(TMP, { recursive: true });
mkdirSync(path.join(here, 'check'), { recursive: true });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await chromium.launch({
  executablePath: CHROME,
  headless: true,
  // 影格裡的 <video> 是 muted + autoplay，但無頭模式預設會擋自動播放
  args: ['--autoplay-policy=no-user-gesture-required'],
});

const ctx = await browser.newContext({
  viewport: { width: W, height: H },
  deviceScaleFactor: 1,
  recordVideo: { dir: TMP, size: { width: W, height: H } },
  reducedMotion: 'no-preference',
});
const page = await ctx.newPage();

/** 帶 ease 的捲動，跟站上同一條曲線（power3.out） */
async function glide(toY, ms) {
  const steps = Math.round(ms / 16);
  const from = await page.evaluate(() => window.scrollY);
  for (let i = 1; i <= steps; i++) {
    const t = 1 - Math.pow(1 - i / steps, 3);
    await page.evaluate((v) => window.scrollTo(0, v), from + (toY - from) * t);
    await sleep(16);
  }
}

if (which === 'home') {
  await page.goto(BASE + '/', { waitUntil: 'load' });
  await sleep(6200); // 開場 4.24s ＋ 交棒 ＋ 一拍留白

  // 往下走一遍關於我。慢一點 —— 這是要給人「讀」的，不是要證明它會捲。
  const H1 = await page.evaluate(() => document.querySelector('#about').offsetTop);
  await glide(H1, 1800);
  await sleep(1700);
  await glide(H1 + 1000, 1500);
  await sleep(1200);
  await page.evaluate(() => {
    const el = document.querySelector('.who');
    window.__who = el.offsetTop;
  });
  const who = await page.evaluate(() => window.__who);
  await glide(who, 1600);
  await sleep(1800);
  await glide(who + 900, 1400);
  await sleep(1400);
  const pathTop = await page.evaluate(() => document.querySelector('.path-sec').offsetTop);
  await glide(pathTop, 1500);
  await sleep(1800);
  const end = await page.evaluate(() => document.querySelector('.end').offsetTop);
  await glide(end, 1500);
  await sleep(2000);
} else {
  await page.goto(BASE + '/work', { waitUntil: 'load' });
  await sleep(2800); // 舞台從中線拉開，第一支錄影起播

  // 滾輪監聽掛在 .stage 上，不是 window ——
  // 游標預設在 (0,0)，那裡是固定的導覽列（z-index 900），事件根本不會落到舞台上。
  // 先把游標移到畫面中央。
  await page.mouse.move(W / 2, H / 2);

  // 逐一翻過去。停 2.8 秒 —— 每支錄影 8 秒，停這麼久大概看得到一個完整動作。
  for (let i = 0; i < 6; i++) {
    await page.mouse.wheel(0, 160);
    await sleep(2800);
  }
  await sleep(1000);
}

await ctx.close();

const webm = readdirSync(TMP).find((f) => f.endsWith('.webm'));
const out = path.join(here, 'check', `tour-${which}.mp4`);
execFileSync('ffmpeg', ['-y', '-i', path.join(TMP, webm), '-an',
  '-vf', `scale=${W}:${H}:flags=lanczos,fps=30`,
  '-c:v', 'libx264', '-preset', 'slow', '-crf', '28', '-pix_fmt', 'yuv420p',
  '-movflags', '+faststart', '-loglevel', 'error', out]);

await browser.close();
rmSync(TMP, { recursive: true, force: true });

const d = (execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration',
  '-of', 'default=nw=1:nk=1', out]) + '').trim();
console.log(`→ check/tour-${which}.mp4  ${(+d).toFixed(1)}s`);
