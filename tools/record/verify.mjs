import { chromium } from 'playwright-core';
const b = await chromium.launch({ executablePath:'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', headless:true });
const sleep = ms => new Promise(r=>setTimeout(r,ms));
console.log('尺寸'.padEnd(11)+'溢出'.padEnd(7)+'影格尺寸'.padEnd(14)+'比例'.padEnd(9)+'名字壓導覽'.padEnd(12)+'儀表列可見');
let bad = 0;
for (const s of [{w:1440,h:900},{w:1061,h:790},{w:861,h:790},{w:861,h:660},{w:861,h:540},{w:718,h:600},{w:540,h:540},{w:430,h:700},{w:375,h:790},{w:375,h:600},{w:375,h:540},{w:375,h:480}]) {
  const ctx = await b.newContext({ viewport:{width:s.w,height:s.h} });
  const p = await ctx.newPage();
  await p.goto('http://localhost:4321/work',{waitUntil:'load'});
  await sleep(2600);
  const r = await p.evaluate(() => {
    const de = document.documentElement;
    const f = document.querySelector('.gate__frame').getBoundingClientRect();
    const nav = document.querySelector('.nav__mark').getBoundingClientRect();
    const shown = [...document.querySelectorAll('.nm__t')].filter(e => { const bb=e.getBoundingClientRect(); return bb.height>0 && Math.abs(new DOMMatrix(getComputedStyle(e).transform).f)<5; })[0];
    const nb = shown?.getBoundingClientRect();
    const bar = document.querySelector('.bar').getBoundingClientRect();
    const barVis = Math.max(0, Math.min(bar.bottom,innerHeight)-Math.max(bar.top,0));
    return { vo: de.scrollHeight-de.clientHeight, w: Math.round(f.width), h: Math.round(f.height),
      ratio: (f.width/f.height).toFixed(2),
      hit: nb ? (nb.top < nav.bottom && nb.bottom > nav.top) : null,
      bar: bar.height? Math.round(barVis/bar.height*100)+'%':'—' };
  });
  const ok = r.vo===0 && Math.abs(r.ratio-1.78)<0.04 && !r.hit && r.bar==='100%';
  if(!ok) bad++;
  console.log(`${(s.w+'x'+s.h).padEnd(11)}${String(r.vo).padEnd(7)}${(r.w+'x'+r.h).padEnd(14)}${String(r.ratio).padEnd(9)}${String(r.hit).padEnd(12)}${r.bar}  ${ok?'':'⚠️'}`);
  await ctx.close();
}
await b.close();
console.log(bad? `\n⚠️ ${bad} 個尺寸有問題` : '\n✅ 全部通過');
