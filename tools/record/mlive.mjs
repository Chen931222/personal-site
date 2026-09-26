import { chromium } from 'playwright-core';
/** /method 的線上驗證：大小寫、節點數、錨點、水平溢出 */
const B = 'https://personal-site-tan-alpha.vercel.app';
const b = await chromium.launch({
  executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  headless: true,
});
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
for (const s of [{ w: 1440, h: 900, n: 'mL1' }, { w: 375, h: 800, n: 'mL2' }]) {
  const ctx = await b.newContext({ viewport: { width: s.w, height: s.h }, deviceScaleFactor: 2 });
  const p = await ctx.newPage();
  const errs = [];
  p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text().slice(0, 60)); });
  const r = await p.goto(B + '/method', { waitUntil: 'load' });
  await sleep(2200);
  await p.screenshot({ path: `check/${s.n}.png`, fullPage: true });
  const d = await p.evaluate(() => {
    const de = document.documentElement;
    const fm = document.querySelector('.card__fm');
    const tr = document.querySelector('.atlas__row .atlas__name');
    return {
      ho: de.scrollWidth - de.clientWidth,
      frontmatter第一行: fm ? getComputedStyle(fm).textTransform : '無',
      樹: tr ? getComputedStyle(tr.parentElement).textTransform : '無',
      節點: document.querySelectorAll('[data-node]').length,
      錨點跳轉: !!document.querySelector('#nav') && !!document.querySelector('a[href="#nav"]'),
    };
  });
  console.log(`${s.w} HTTP${r.status()}`, JSON.stringify(d), errs.length ? 'console: ' + errs.join('|') : '✓');
  await ctx.close();
}
await b.close();
