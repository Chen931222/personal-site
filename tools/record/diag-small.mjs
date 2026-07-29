/**
 * 小視窗裡影片不播 —— 而且版面也塌了。
 *
 * 站主的截圖：巨型作品名壓在導覽列上、右邊多了垂直捲軸、簡介被擠到影格下面。
 * 這支在幾個實際尺寸下同時量三件事：影片有沒有在動、版面有沒有重疊、有沒有溢出。
 */
import { chromium } from 'playwright-core';

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const SIZES = [
  { w: 1440, h: 900, label: '桌面（基準）' },
  { w: 1061, h: 790, label: '站主的小視窗' },
  { w: 1061, h: 620, label: '再矮一點' },
  { w: 900, h: 700, label: '斷點邊緣' },
  { w: 375, h: 780, label: '手機' },
];

const browser = await chromium.launch({ executablePath: CHROME, headless: true });

for (const s of SIZES) {
  const ctx = await browser.newContext({ viewport: { width: s.w, height: s.h } });
  const page = await ctx.newPage();
  await page.goto('http://localhost:4321/work', { waitUntil: 'load' });
  await sleep(3200);

  const t1 = await page.evaluate(() => {
    const v = document.querySelector('[data-slide]:not([aria-hidden]) [data-shot-video]');
    return v ? v.currentTime : null;
  });
  await sleep(1600);

  const r = await page.evaluate((t1) => {
    const de = document.documentElement;
    const vis = [...document.querySelectorAll('[data-slide]')].find((e) => !e.hasAttribute('aria-hidden'));
    const v = vis?.querySelector('[data-shot-video]');

    const box = (sel) => {
      const e = document.querySelector(sel);
      if (!e) return null;
      const b = e.getBoundingClientRect();
      return { t: Math.round(b.top), b: Math.round(b.bottom), l: Math.round(b.left), r: Math.round(b.right) };
    };

    // 巨型名字（作用中的那個）與導覽列的字標
    const name = [...document.querySelectorAll('[data-name-col]')].find((e) => e.hasAttribute('data-active'));
    const nb = name?.getBoundingClientRect();
    const mark = document.querySelector('.nav__mark')?.getBoundingClientRect();
    const overlap = nb && mark && nb.top < mark.bottom && nb.bottom > mark.top && nb.left < mark.right && nb.right > mark.left;

    return {
      影片: v
        ? {
            在播: !v.paused,
            前進了: +(v.currentTime - t1).toFixed(2),
            可視高: Math.round(v.getBoundingClientRect().height),
            在視窗內: (() => {
              const b = v.getBoundingClientRect();
              const visH = Math.max(0, Math.min(b.bottom, innerHeight) - Math.max(b.top, 0));
              return b.height ? Math.round((visH / b.height) * 100) + '%' : '0%';
            })(),
          }
        : '沒有影片元素',
      版面: {
        垂直溢出: de.scrollHeight - de.clientHeight,
        水平溢出: de.scrollWidth - de.clientWidth,
        名字壓到導覽列: !!overlap,
        名字: nb ? { t: Math.round(nb.top), b: Math.round(nb.bottom) } : null,
        影格: box('[data-frame]') ?? box('.shot'),
      },
    };
  }, t1);

  console.log(`\n【${s.label}  ${s.w}×${s.h}】`);
  console.log('  影片 ', JSON.stringify(r.影片));
  console.log('  版面 ', JSON.stringify(r.版面));
  await ctx.close();
}

await browser.close();
