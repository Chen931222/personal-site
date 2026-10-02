/**
 * 開場膠捲的縮圖：把 9 個已上線的站各抓一張 3:2 截圖。
 *
 * 膠捲格是 3:2，所以直接用 3:2 的視窗去抓 —— 不要抓 16:9 再裁，
 * 裁掉的永遠是版面刻意留的那一邊。
 *
 * 輸出 public/media/<slug>-cover.webp，media.ts 靠檔名自動接上，不用改資料檔。
 *
 *   node covers.mjs            全部
 *   node covers.mjs bookshelf  只抓一個
 */
import { chromium } from 'playwright-core';
import { execFileSync } from 'node:child_process';
import { mkdirSync, rmSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(here, '../../public/media');
const TMP = path.join(here, '.tmp-cover');
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

/**
 * 上線前先在本機錄：URL_OVERRIDE=dream-car-garage=http://localhost:8787 node record.mjs dream-car-garage
 * 可以用逗號串多個。沒設就照 probe.json／SITES 的正式網址。
 */
const URL_OVERRIDE = Object.fromEntries(
  (process.env.URL_OVERRIDE || '').split(',').filter(Boolean).map((kv) => [kv.slice(0, kv.indexOf('=')), kv.slice(kv.indexOf('=') + 1)])
);

const W = 1200;
const H = 800; // 3:2

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * 每個站進門要做的事。
 *
 * 大部分站 `load` 之後就是可看的畫面，但有三個不是 ——
 * 而且它們「還沒好」的樣子（進度條、骨架、開場大字）縮到縮圖尺寸
 * 一律讀成「這個站壞了」。所以寧可多等。
 */
const SITES = [
  { slug: 'mi-espanol', url: 'https://mi-espanol-web.vercel.app' },
  {
    slug: 'worldcup-2026',
    url: 'https://worldcup-2026-bet.vercel.app',
    // 站自己的電影式開場是大字配大留白 —— 縮成縮圖只剩一片黑。跳過它，抓看板。
    async prep(page) {
      const skip = page.locator('button, a').filter({ hasText: /跳過|直接進入|skip/i }).first();
      if (await skip.count()) {
        await skip.click({ timeout: 3000 }).catch(() => {});
        await sleep(1400);
      }
    },
  },
  {
    slug: 'dream-car-garage',
    url: 'https://dream-car-garage.chenchen931222.workers.dev',
    // 2026-10-02：首頁第一次來會先播 11 秒開場影片，先按「跳過開場」；
    // 之後是攝影棚轉盤，等載入條收掉、第一台車轉進定位
    async prep(page) {
      await page.click('#intro-skip', { timeout: 3000 }).catch(() => {});
      await page
        .waitForFunction(() => {
          const l = document.querySelector('#loader');
          return !l || l.classList.contains('done') || getComputedStyle(l).opacity === '0';
        }, { timeout: 15000 })
        .catch(() => {});
      await sleep(2600); // 模型進場淡入＋自動環轉轉到看得出車型的角度
    },
  },
  { slug: 'bookshelf', url: 'https://bookshelf-nine-gamma.vercel.app/' },
  { slug: 'record-shelf', url: 'https://record-shelf-nine.vercel.app' },
  {
    slug: 'outfit-today',
    url: 'https://outfit-today-ruby.vercel.app',
    // 天氣是 async 抓的，回來會把整個推薦區重畫；早抓會拍到骨架
    async prep(page) {
      await page
        .waitForFunction(() => !/抓取|載入中|loading/i.test(document.body.innerText), { timeout: 12000 })
        .catch(() => {});
      await sleep(1200);
    },
  },
  { slug: 'wardrobe', url: 'https://wardrobe-gallery.vercel.app' },
  { slug: 'cpe49', url: 'https://cpe49-trainer.vercel.app' },
  { slug: 'five-layer-plan', url: 'https://five-layer-plan.vercel.app' },
  {
    slug: 'oasis',
    url: 'https://oasis-green.onrender.com/',
    // Render 免費方案會睡著，Neon 醒來的頭幾發 API 會 500 ——
    // 先打醒再抓，不然 hero 底下的「精選空間」是一排骨架
    async prep(page) {
      await page.evaluate(async () => {
        try { await fetch('/api/spaces?sort=rating&per_page=3'); } catch {}
      });
      await sleep(1600);
    },
  },
  {
    slug: 'parking-exhibit',
    url: 'https://parking-exhibit.vercel.app',
    // 標題幕縮成縮圖只剩大字 —— 跳過開場與導覽，抓滿場車的操作台狀態。
    // ⚠️ 2026-08-06 改版後多一層電影式開場：intro-skip 要先按，
    //    只按 btn-skip0 的話拍到的是開場的佇列章節，不是操作台。
    async prep(page) {
      await page.evaluate(() => document.getElementById('intro-skip')?.click());
      await sleep(900);
      await page.evaluate(() => document.getElementById('btn-skip0').click());
      await sleep(5000);
    },
  },
  {
    slug: 'policy-sandbox',
    url: 'https://policy-sandbox-ashen.vercel.app',
    // 開場測繪掃描 2.2 秒 —— 等紅線掃完、Gini 走針落定再抓，
    // 不然縮圖是半個村莊配一條紅線，讀成「圖表壞了」
    async prep(page) {
      await sleep(3400);
    },
  },
  {
    slug: 'room',
    url: 'https://room-sepia.vercel.app',
    // 16.6 屏的滾動敘事，首屏是「房間 · 個人索引」的標題卡 —— 縮圖用首屏就對了
    async prep(page) {
      await page.evaluate(() => window.scrollTo(0, 0));
      await sleep(1400);
    },
  },
];

const only = process.argv[2];
const list = only ? SITES.filter((s) => s.slug === only) : SITES;
if (!list.length) {
  console.error(`沒有這個 slug：${only}`);
  process.exit(1);
}

rmSync(TMP, { recursive: true, force: true });
mkdirSync(TMP, { recursive: true });
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ executablePath: CHROME, headless: true });

for (const s of list) {
  const ctx = await browser.newContext({
    viewport: { width: W, height: H },
    deviceScaleFactor: 2, // 高解析抓、縮小輸出 —— 細字才不會糊
  });
  const page = await ctx.newPage();
  try {
    await page.goto(URL_OVERRIDE[s.slug] || s.url, { waitUntil: 'load', timeout: 45000 });
    // load 不等於畫面可看。networkidle 才等得到字體、圖片與延後抓的資料。
    await page.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => {});
    await sleep(1500);
    if (s.prep) await s.prep(page);

    const png = path.join(TMP, `${s.slug}.png`);
    await page.screenshot({ path: png });

    const out = path.join(OUT, `${s.slug}-cover.webp`);
    execFileSync('ffmpeg', ['-y', '-i', png,
      '-vf', 'scale=900:600:flags=lanczos',
      '-quality', '80', '-loglevel', 'error', out]);

    const kb = Math.round(execFileSync('node', ['-e', `process.stdout.write(String(require('fs').statSync(${JSON.stringify(out)}).size))`]) / 1024);
    console.log(`OK  ${s.slug.padEnd(18)} ${kb}KB`);
  } catch (e) {
    console.log(`ERR ${s.slug.padEnd(18)} ${String(e).split('\n')[0].slice(0, 110)}`);
  }
  await ctx.close();
}

await browser.close();
rmSync(TMP, { recursive: true, force: true });

// 沒抓到的要講出來 —— 這些格子會留著打樣框
const missing = SITES.filter((s) => !existsSync(path.join(OUT, `${s.slug}-cover.webp`)));
if (missing.length) console.log(`\n⚠️ 還缺：${missing.map((m) => m.slug).join(', ')}`);
