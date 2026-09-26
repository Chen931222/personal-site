import { chromium } from 'playwright-core';
/** /method 的本機驗證：截圖＋結構數字＋hover 退暗邏輯 */
const b = await chromium.launch({
  executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  headless: true,
});
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
for (const s of [{ w: 1440, h: 900, n: 'm1' }, { w: 375, h: 800, n: 'm2' }]) {
  const ctx = await b.newContext({ viewport: { width: s.w, height: s.h }, deviceScaleFactor: 2 });
  const p = await ctx.newPage();
  const errs = [];
  p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text().slice(0, 60)); });
  await p.goto('http://localhost:4321/method', { waitUntil: 'load' });
  await sleep(2200);
  await p.screenshot({ path: `check/${s.n}.png`, fullPage: true });
  const r = await p.evaluate(() => {
    const de = document.documentElement;
    const svg = document.querySelector('[data-brain]');
    const vis = (el) => el && getComputedStyle(el).display !== 'none';
    return {
      ho: de.scrollWidth - de.clientWidth,
      圖: vis(svg) ? '顯示' : '隱藏',
      樹: vis(document.querySelector('.atlas__tree')) ? '顯示' : '隱藏',
      節點: svg ? svg.querySelectorAll('[data-node]').length : 0,
      線: svg ? svg.querySelectorAll('.bg-edge').length : 0,
      卡: document.querySelectorAll('.card').length,
      wiki連結: document.querySelectorAll('.card__wiki').length,
    };
  });
  console.log(`${s.w}x${s.h}`, JSON.stringify(r), errs.length ? 'console: ' + errs.join('|') : '');
  await ctx.close();
}
// hover 驗證：滑到「網站開發」節點，數退暗的元素
const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
const p = await ctx.newPage();
await p.goto('http://localhost:4321/method', { waitUntil: 'load' });
await sleep(1800);
await p.evaluate(() => {
  const g = document.querySelector('[data-node="web"] .bg-dot');
  const r = g.getBoundingClientRect();
  window.scrollTo(0, r.top + scrollY - 400);
});
await sleep(400);
const pos = await p.evaluate(() => {
  const r = document.querySelector('[data-node="web"] .bg-dot').getBoundingClientRect();
  return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
});
await p.mouse.move(pos.x, pos.y);
await sleep(500);
console.log(
  'hover 網站開發:',
  JSON.stringify(
    await p.evaluate(() => ({
      退暗的線: document.querySelectorAll('.bg-edge.is-dim').length,
      亮著的線: document.querySelectorAll('.bg-edge:not(.is-dim)').length,
      退暗的點: document.querySelectorAll('[data-node].is-dim').length,
    }))
  ),
  '（網站開發應亮 5 條：1 條來自 Context ＋ 4 條關聯）'
);
await b.close();
