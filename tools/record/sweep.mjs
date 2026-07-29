import { chromium } from 'playwright-core';
const b = await chromium.launch({ executablePath:'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', headless:true });
const sleep = ms => new Promise(r=>setTimeout(r,ms));
const sizes = [];
for (const w of [1061, 940, 861, 820, 760, 718, 640, 540, 430, 375])
  for (const h of [790, 660, 600, 540])
    sizes.push({w,h});
console.log('尺寸'.padEnd(12)+'垂直溢出  水平溢出  影片在播  影片可見');
for (const s of sizes) {
  const ctx = await b.newContext({ viewport:{width:s.w,height:s.h} });
  const p = await ctx.newPage();
  await p.goto('http://localhost:4321/work',{waitUntil:'load'});
  await sleep(2600);
  const r = await p.evaluate(() => {
    const de = document.documentElement;
    const vis = [...document.querySelectorAll('[data-slide]')].find(e=>!e.hasAttribute('aria-hidden'));
    const v = vis?.querySelector('[data-shot-video]');
    let seen = '—';
    if (v) { const bb=v.getBoundingClientRect(); const h=Math.max(0,Math.min(bb.bottom,innerHeight)-Math.max(bb.top,0)); seen = bb.height?Math.round(h/bb.height*100)+'%':'0%'; }
    return { vo: de.scrollHeight-de.clientHeight, ho: de.scrollWidth-de.clientWidth, play: v? !v.paused : null, seen };
  });
  const flag = r.vo>0 ? ' ⚠️' : '';
  console.log(`${(s.w+'x'+s.h).padEnd(12)}${String(r.vo).padEnd(10)}${String(r.ho).padEnd(10)}${String(r.play).padEnd(10)}${r.seen}${flag}`);
  await ctx.close();
}
await b.close();
