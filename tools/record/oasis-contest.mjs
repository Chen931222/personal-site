/**
 * 興程式競賽用：Oasis 綠洲 1–3 分鐘介紹短片的主體段（公開流程，不登入）。
 *
 *   node oasis-contest.mjs
 *
 * 產出 G:\Projects\oasis-green\_contest\video\main.webm（Playwright 原始錄影）
 * 之後由 build.sh 接片頭片尾、轉 mp4。
 *
 * 跟 8 秒循環的 record.mjs 不同：這支要 80–100 秒、有字幕列、真的換頁。
 * 換頁的地雷照 choreo/oasis.mjs：跨頁點擊只做 mouse down/up，落地後重裝游標與字幕列。
 */
import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';
import * as k from './lib.mjs';

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const BASE = 'https://oasis-green.onrender.com';
const OUT_DIR = 'G:\\Projects\\oasis-green\\_contest\\video\\raw';
mkdirSync(OUT_DIR, { recursive: true });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// 字幕列：每頁載入時都由 addInitScript 定義 window.__cap，所以換頁後直接可用
const CAPTION_INIT = `
  (function(){
    function ensure(){
      let el = document.getElementById('__cap');
      if (el) return el;
      el = document.createElement('div');
      el.id = '__cap';
      el.style.cssText = 'position:fixed;left:0;right:0;bottom:0;z-index:2147483646;padding:16px 28px 18px;background:rgba(20,24,22,.86);color:#fff;font:500 22px/1.45 "Noto Sans TC","Microsoft JhengHei",sans-serif;letter-spacing:.02em;border-top:3px solid #1d9e75;opacity:0;transition:opacity .35s;pointer-events:none;backdrop-filter:blur(6px)';
      (document.body || document.documentElement).appendChild(el);
      return el;
    }
    window.__cap = function(t){ const el = ensure(); el.textContent = t; el.style.opacity = t ? '1' : '0'; };
  })();
`;

async function cap(page, text) {
  await page.evaluate((t) => window.__cap(t), text);
}

async function land(page, x, y) {
  // 落地：等 load、重裝游標、把游標接回原位
  await page.waitForLoadState('load');
  await sleep(300);
  await k.installCursor(page);
  await page.evaluate(([a, b]) => { window.__cur(a, b); window.__lastCur = { x: a, y: b }; }, [x, y]);
}

async function navClick(page) {
  await page.evaluate(() => window.__curDown(true)).catch(() => {});
  await sleep(120);
  await page.mouse.down();
  await sleep(80);
  await page.mouse.up();
}

async function center(page, selector, nth = 0) {
  const box = await page.evaluate(([sel, n]) => {
    const el = document.querySelectorAll(sel)[n];
    if (!el) return null;
    el.scrollIntoView({ block: 'center' });
    const r = el.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  }, [selector, nth]);
  if (!box) throw new Error(`找不到 ${selector}[${nth}]`);
  return box;
}

const browser = await chromium.launch({ executablePath: CHROME, headless: true });
const ctx = await browser.newContext({
  viewport: { width: 1280, height: 720 },
  deviceScaleFactor: 1,
  locale: 'zh-TW',
  recordVideo: { dir: OUT_DIR, size: { width: 1280, height: 720 } },
});
await ctx.addInitScript(CAPTION_INIT);
const page = await ctx.newPage();
const tCtx = Date.now();

// 預熱：Render 與 Neon 都打醒，編排路徑上的每一條 API 都要熱
await page.goto(BASE + '/api/health', { waitUntil: 'load', timeout: 90000 });
for (const u of ['/api/co-rentals', '/api/spaces?keyword=&city=&type=&max_price=0&page=1&per_page=9', '/api/spaces/cities', '/api/spaces/1', '/api/spaces/1/reviews']) {
  for (let i = 0; i < 4; i++) {
    const r = await page.evaluate(async (u) => (await fetch(u)).status, u);
    if (r === 200) break;
    await sleep(2000);
  }
}

// ── 1. 首頁 ────────────────────────────────────────────────────────────────
await page.goto(BASE + '/', { waitUntil: 'load', timeout: 60000 });
await sleep(800);
const T0 = Date.now(); // 片頭裁切點：從這裡開始算
await land(page, 640, 560);
await cap(page, '想用一個空間，但一個人租太貴。Oasis 讓你發起或加入「拼場」，分攤費用、找到夥伴。');
await k.moveTo(page, 470, 330, 900);
await sleep(3200);
await cap(page, '怎麼運作？探索空間 → 發起或加入拼場 → 名額滿了自動成團，各自完成預約。');
await k.scrollToPct(page, 0.28, 1600);
await sleep(3600);

// ── 2. 拼場列表 ────────────────────────────────────────────────────────────
await cap(page, '');
await k.scrollTo(page, 0, 900);
let b = await center(page, 'a[href="/co-rental"]');
await k.moveTo(page, b.x, b.y, 900);
await sleep(200);
await navClick(page);
await land(page, b.x, b.y);
await cap(page, '拼場列表：每一場都看得到日期時段、目的、已加入人數與每人費用。');
await page.waitForSelector('text=NT$', { timeout: 30000 }).catch(() => {});
await sleep(800);
await k.moveTo(page, 640, 420, 900);
await sleep(2600);
await cap(page, '例如：週五練團缺鼓手與貝斯，四個名額已有兩人，每人 450 元。名額滿了狀態自動轉成團。');
await k.scrollTo(page, 260, 1400);
await sleep(3800);
await cap(page, '想加入的人登入後一鍵加入；發起人設定名額 2 到 10 人與每人費用，重複加入會被擋下。');
await k.scrollTo(page, 620, 1400);
await sleep(3600);

// ── 3. 空間詳情 ────────────────────────────────────────────────────────────
await cap(page, '');
await k.scrollTo(page, 0, 900);
b = await center(page, 'a[href^="/space"]');
await k.moveTo(page, b.x, b.y, 900);
await sleep(200);
await navClick(page);
await land(page, b.x, b.y);
await cap(page, '空間詳情：大圖、評分、設備、每小時價格與可預約時段；「發起拼場」的入口就在這裡。');
await page.waitForSelector('text=發起拼場', { timeout: 30000 }).catch(() => {});
await sleep(600);
await k.moveTo(page, 900, 300, 1000);
await sleep(2800);
await k.scrollToPct(page, 0.45, 1800);
await cap(page, '評分與評論、設備清單、時段查詢，都是真的 API 回來的資料，不是寫死的畫面。');
await sleep(3400);

// ── 4. 探索空間 ────────────────────────────────────────────────────────────
await cap(page, '');
await k.scrollTo(page, 0, 900);
b = await center(page, 'a[href="/explore"]');
await k.moveTo(page, b.x, b.y, 900);
await sleep(200);
await navClick(page);
await land(page, b.x, b.y);
await cap(page, '探索空間：依城市、類型、價格篩選；空間擁有者可以上架閒置時段，讓拼場把零散需求聚起來。');
await page.waitForSelector('text=NT$', { timeout: 30000 }).catch(() => {});
await sleep(800);
await k.moveTo(page, 640, 430, 900);
await sleep(2400);
await k.scrollToPct(page, 0.35, 1600);
await sleep(3000);

// ── 5. 登入頁：安全設計 ────────────────────────────────────────────────────
await cap(page, '');
await k.scrollTo(page, 0, 900);
b = await center(page, 'a[href="/login"]');
await k.moveTo(page, b.x, b.y, 900);
await sleep(200);
await navClick(page);
await land(page, b.x, b.y);
await cap(page, '帳號：註冊、信箱驗證、忘記密碼、驗證題防機器人。「記得我」是兩套 session 策略：勾選保持 30 天，取消則關掉瀏覽器就登出。');
await sleep(600);
await k.moveTo(page, 640, 420, 900);
await sleep(5200);

// ── 6. 收尾回首頁 ──────────────────────────────────────────────────────────
await cap(page, '');
await page.goto(BASE + '/', { waitUntil: 'load', timeout: 60000 });
await land(page, 640, 560);
await cap(page, 'FastAPI 後端、69 個 API 路由、57 個自動化測試、SQLite 與 PostgreSQL 雙支援，部署於 Render。');
await k.moveTo(page, 640, 620, 1200);
await sleep(4200);
await cap(page, '');
await sleep(800);

const total = (Date.now() - T0) / 1000;
await ctx.close();
await browser.close();
console.log(JSON.stringify({ lead_seconds: ((T0 - tCtx) / 1000).toFixed(2), main_seconds: total.toFixed(1), out: OUT_DIR }));
