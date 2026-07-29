/**
 * 看清楚一個站的互動結構，寫編排前先跑這支。
 *   node inspect.mjs bookshelf
 * 也可以順便存幾張截圖：
 *   node inspect.mjs bookshelf --shots
 */
import { chromium } from 'playwright-core';
import { readFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const SITES = Object.fromEntries(
  JSON.parse(readFileSync(path.join(here, 'probe.json'), 'utf8')).map((s) => [s.slug, s.url])
);

const slug = process.argv[2];
const wantShots = process.argv.includes('--shots');
if (!SITES[slug]) {
  console.error(`用法: node inspect.mjs <slug>\n可用: ${Object.keys(SITES).join(' ')}`);
  process.exit(1);
}

const browser = await chromium.launch({ executablePath: CHROME, headless: true });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
const page = await ctx.newPage();
await page.goto(SITES[slug], { waitUntil: 'load', timeout: 45000 });
await page.waitForTimeout(2500);

const info = await page.evaluate(() => {
  const t = (el) => (el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 44);
  const sel = (el) => {
    if (el.id) return '#' + CSS.escape(el.id);
    const cls = [...el.classList].filter((c) => !/^(is-|has-)/.test(c)).slice(0, 2);
    return el.tagName.toLowerCase() + (cls.length ? '.' + cls.map((c) => CSS.escape(c)).join('.') : '');
  };
  const inView = (el) => {
    const r = el.getBoundingClientRect();
    return r.top < innerHeight && r.bottom > 0 && r.width > 8 && r.height > 8;
  };
  return {
    title: document.title,
    scrollH: document.documentElement.scrollHeight,
    vh: innerHeight,
    clickables: [...document.querySelectorAll('button,[role=button],a,summary,[onclick],input,select,label')]
      .filter(inView)
      .slice(0, 30)
      .map((el) => {
        const r = el.getBoundingClientRect();
        return { sel: sel(el), text: t(el), x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2), w: Math.round(r.width), h: Math.round(r.height) };
      }),
    bigBoxes: [...document.querySelectorAll('section,article,figure,canvas,video,img,[class*=card],[class*=grid],[class*=item]')]
      .filter(inView)
      .slice(0, 24)
      .map((el) => {
        const r = el.getBoundingClientRect();
        return { sel: sel(el), text: t(el), x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2), w: Math.round(r.width), h: Math.round(r.height) };
      }),
    headings: [...document.querySelectorAll('h1,h2,h3')].slice(0, 14).map(t),
  };
});

console.log(JSON.stringify(info, null, 1));

if (wantShots) {
  const dir = path.join(here, 'shots', slug);
  mkdirSync(dir, { recursive: true });
  for (const p of [0, 0.25, 0.5, 0.75, 1]) {
    await page.evaluate((q) => window.scrollTo(0, (document.documentElement.scrollHeight - innerHeight) * q), p);
    await page.waitForTimeout(1400);
    await page.screenshot({ path: path.join(dir, `${String(p * 100).padStart(3, '0')}.png`) });
  }
  console.log(`\n→ shots/${slug}/`);
}

await browser.close();
