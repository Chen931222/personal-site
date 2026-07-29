import { chromium } from 'playwright-core';
const b = await chromium.launch({ executablePath:'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', headless:true });
const sleep = ms => new Promise(r=>setTimeout(r,ms));
for (const s of [{w:861,h:790},{w:861,h:540},{w:540,h:540},{w:375,h:540},{w:375,h:480}]) {
  const ctx = await b.newContext({ viewport:{width:s.w,height:s.h} });
  const p = await ctx.newPage();
  await p.goto('http://localhost:4321/work',{waitUntil:'load'});
  await sleep(2600);
  const r = await p.evaluate(() => {
    // 找畫面上真的看得見的那個巨型名字
    const shown = [...document.querySelectorAll('.nm__t')].filter(e => {
      const b = e.getBoundingClientRect();
      return b.height > 0 && Math.abs(new DOMMatrix(getComputedStyle(e).transform).f) < 5;
    });
    const e = shown[0];
    if (!e) return { 名字: '找不到', 共有: document.querySelectorAll('.nm__t').length };
    const bb = e.getBoundingClientRect();
    const vis = Math.max(0, Math.min(bb.bottom, innerHeight) - Math.max(bb.top, 0));
    const nav = document.querySelector('.nav__mark').getBoundingClientRect();
    return {
      名字: e.textContent.trim(),
      字級: getComputedStyle(e).fontSize,
      可見: Math.round(vis/bb.height*100)+'%',
      上緣: Math.round(bb.top),
      壓到導覽列: bb.top < nav.bottom && bb.bottom > nav.top,
    };
  });
  console.log(`${(s.w+'x'+s.h).padEnd(10)}`, JSON.stringify(r));
  await ctx.close();
}
await b.close();
