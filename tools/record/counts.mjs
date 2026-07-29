/**
 * 核對站上文案寫的數字，跟線上實際有幾件對不對得起來。
 *
 * PRODUCT.md 的規矩：不得捏造數字。作品集上寫「衣櫃 104 件」，
 * 而訪客點進去看到 26 件 —— 那不只是筆誤，那是把唯一能被當場驗證的東西寫錯。
 */
import { chromium } from 'playwright-core';

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const browser = await chromium.launch({ executablePath: CHROME, headless: true });

const open = async (url) => {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await ctx.newPage();
  await page.goto(url, { waitUntil: 'load', timeout: 45000 });
  await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(2200);
  return { ctx, page };
};

// ── 今天穿什麼：切到「我的衣櫃」分頁數列 ───────────────────────────────
{
  const { ctx, page } = await open('https://outfit-today-ruby.vercel.app');
  await page.evaluate(() => {
    const t = [...document.querySelectorAll('button')].find((b) => /我的衣櫃/.test(b.textContent));
    t?.click();
  });
  await page.waitForTimeout(1500);
  const r = await page.evaluate(() => {
    const txt = document.body.innerText.replace(/\s+/g, ' ');
    const groups = [...txt.matchAll(/(上衣|下身|外套|鞋子|配件|洋裝)\s*\((\d+)\)/g)]
      .map((m) => ({ g: m[1], n: +m[2] }));
    return { groups, total: groups.reduce((s, x) => s + x.n, 0) };
  });
  console.log(`今天穿什麼  文案宣稱「衣櫃 104 件」`);
  console.log(`  線上實際：${r.groups.map((g) => `${g.g} ${g.n}`).join(' / ')}  = ${r.total} 件`);
  await ctx.close();
}

// ── 書櫃：canvas 型，抓全域資料 ────────────────────────────────────────
{
  const { ctx, page } = await open('https://bookshelf-nine-gamma.vercel.app/');
  const r = await page.evaluate(() => {
    const txt = document.body.innerText.replace(/\s+/g, ' ');
    // 卡片上的「N 本」之類
    const perShelf = [...txt.matchAll(/(\d{1,3})\s*(本|冊)/g)].map((m) => +m[1]);
    // 全域變數裡的書單
    const globals = Object.keys(window).filter((k) => {
      try {
        const v = window[k];
        return Array.isArray(v) && v.length > 20 && typeof v[0] === 'object';
      } catch {
        return false;
      }
    });
    return { perShelf, sum: perShelf.reduce((a, b) => a + b, 0), globals, snippet: txt.slice(0, 220) };
  });
  console.log(`\n書櫃  文案宣稱「122 張封面、六類分櫃」`);
  console.log(`  頁面上的「N 本」：${r.perShelf.join(' + ') || '（找不到）'}${r.sum ? ' = ' + r.sum : ''}`);
  console.log(`  可疑的全域書單變數：${r.globals.join(', ') || '（無）'}`);
  console.log(`  首屏文字：${r.snippet}`);
  await ctx.close();
}

// ── 唱片架：dock 有幾格就是幾張 ────────────────────────────────────────
{
  const { ctx, page } = await open('https://record-shelf-nine.vercel.app');
  const n = await page.evaluate(() => document.querySelectorAll('button.dock-item').length);
  console.log(`\n唱片架  文案宣稱「22 張專輯」  →  線上實際 ${n} 張`);
  await ctx.close();
}

// ── 我的衣櫃：畫廊有幾件 ───────────────────────────────────────────────
{
  const { ctx, page } = await open('https://wardrobe-gallery.vercel.app');
  const r = await page.evaluate(() => ({
    imgs: document.querySelectorAll('img').length,
    txt: document.body.innerText.replace(/\s+/g, ' ').slice(0, 200),
  }));
  console.log(`\n我的衣櫃  →  畫面上 ${r.imgs} 件`);
  console.log(`  ${r.txt}`);
  await ctx.close();
}

await browser.close();
