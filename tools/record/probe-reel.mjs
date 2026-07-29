import { chromium } from 'playwright-core';
const b = await chromium.launch({ executablePath:'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', headless:true });
const p = await (await b.newContext({viewport:{width:1440,height:900}})).newPage();
await p.goto('http://localhost:4321/', {waitUntil:'load'});
await p.waitForTimeout(2500);
console.log(JSON.stringify(await p.evaluate(() => {
  const img = document.querySelector('.reel__frame img');
  if (!img) return { 錯誤: '膠捲格裡沒有 <img>', 內容: document.querySelector('.reel__frame')?.innerHTML.slice(0,200) };
  const out = { src: img.getAttribute('src'), 載入成功: img.complete && img.naturalWidth > 0, 原始尺寸: `${img.naturalWidth}x${img.naturalHeight}` };
  let el = img, chain = [];
  while (el && el !== document.body) {
    const s = getComputedStyle(el);
    if (s.opacity !== '1' || s.filter !== 'none' || s.mixBlendMode !== 'normal')
      chain.push(`${el.className||el.tagName}: opacity=${s.opacity} filter=${s.filter} blend=${s.mixBlendMode}`);
    el = el.parentElement;
  }
  out.壓暗的層 = chain;
  return out;
}), null, 1));
await b.close();
