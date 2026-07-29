/**
 * 探勘：把 9 個已上線的站各開一次，量出「這個站的動作長什麼樣」。
 *
 * 編排（要捲多少、要點哪裡、幾秒）不用猜 —— 先量。
 * 輸出 probe.json 給 record.mjs 吃。
 */
import { chromium } from 'playwright-core';
import { writeFileSync } from 'node:fs';

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

export const SITES = [
  { slug: 'mi-espanol', url: 'https://mi-espanol-web.vercel.app' },
  { slug: 'worldcup-2026', url: 'https://worldcup-2026-bet.vercel.app' },
  { slug: 'dream-car-garage', url: 'https://dream-car-garage.chenchen931222.workers.dev' },
  { slug: 'bookshelf', url: 'https://bookshelf-nine-gamma.vercel.app/' },
  { slug: 'record-shelf', url: 'https://record-shelf-nine.vercel.app' },
  { slug: 'outfit-today', url: 'https://outfit-today-ruby.vercel.app' },
  { slug: 'wardrobe', url: 'https://wardrobe-gallery.vercel.app' },
  { slug: 'cpe49', url: 'https://cpe49-trainer.vercel.app' },
  { slug: 'five-layer-plan', url: 'https://five-layer-plan.vercel.app' },
];

const browser = await chromium.launch({ executablePath: CHROME, headless: true });
const out = [];

for (const s of SITES) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const rec = { ...s, ok: false };
  try {
    const r = await page.goto(s.url, { waitUntil: 'load', timeout: 45000 });
    rec.status = r?.status();
    await page.waitForTimeout(2500);

    rec.probe = await page.evaluate(() => {
      const de = document.documentElement;
      const txt = (el) => (el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 40);
      return {
        title: document.title,
        scrollH: de.scrollHeight,
        screens: +(de.scrollHeight / innerHeight).toFixed(1),
        // 是不是滾動敘事：有沒有 scroll 監聽的跡象（section 數、sticky/fixed 元素）
        sections: document.querySelectorAll('section, [data-section], main > div').length,
        sticky: [...document.querySelectorAll('body *')].filter((e) => {
          const p = getComputedStyle(e).position;
          return p === 'sticky' || p === 'fixed';
        }).length,
        canvas: document.querySelectorAll('canvas').length,
        video: document.querySelectorAll('video').length,
        imgs: document.querySelectorAll('img').length,
        // 前 12 個看起來像主要動作的按鈕
        buttons: [...document.querySelectorAll('button, [role=button], a.btn, nav a')]
          .slice(0, 12)
          .map((b) => txt(b))
          .filter(Boolean),
        h1: txt(document.querySelector('h1') || document.body).slice(0, 60),
      };
    });

    // 捲到底再量一次：有沒有東西真的在動（scroll 敘事的判準）
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    await page.waitForTimeout(1600);
    rec.bottomShot = await page.evaluate(() => ({
      y: Math.round(scrollY),
      // 捲到底之後畫面上有幾個元素跟頂端不同（粗略判斷有沒有進場動畫）
      visible: [...document.querySelectorAll('body *')].filter((e) => {
        const r = e.getBoundingClientRect();
        return r.top < innerHeight && r.bottom > 0 && r.width > 40 && r.height > 40;
      }).length,
    }));
    rec.ok = true;
  } catch (e) {
    rec.error = String(e).split('\n')[0].slice(0, 160);
  }
  await ctx.close();
  out.push(rec);
  console.log(
    `${rec.ok ? 'OK ' : 'ERR'} ${s.slug.padEnd(18)} ${rec.ok ? `${rec.probe.screens} 屏 · ${rec.probe.sections} 段 · canvas ${rec.probe.canvas} · img ${rec.probe.imgs}` : rec.error}`
  );
}

await browser.close();
writeFileSync(new URL('probe.json', import.meta.url), JSON.stringify(out, null, 2));
console.log('\n→ probe.json');
