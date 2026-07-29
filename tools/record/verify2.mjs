import { chromium } from 'playwright-core';
const b = await chromium.launch({ executablePath:'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', headless:true });
const sleep = ms => new Promise(r=>setTimeout(r,ms));
console.log('尺寸'.padEnd(11)+'影格'.padEnd(12)+'影格可見'.padEnd(11)+'簡介可見'.padEnd(11)+'deck高/可用');
for (const s of [{w:861,h:790},{w:861,h:660},{w:861,h:540},{w:718,h:600},{w:375,h:540},{w:375,h:480}]) {
  const ctx = await b.newContext({ viewport:{width:s.w,height:s.h} });
  const p = await ctx.newPage();
  await p.goto('http://localhost:4321/work',{waitUntil:'load'});
  await sleep(2600);
  const r = await p.evaluate(() => {
    const see = el => { const bb=el.getBoundingClientRect(); if(!bb.height) return '0';
      const v=Math.max(0,Math.min(bb.bottom,innerHeight)-Math.max(bb.top,0)); return Math.round(v/bb.height*100)+'%'; };
    const st=document.querySelector('.stage'), cs=getComputedStyle(st);
    const f=document.querySelector('.gate__frame');
    const info=[...document.querySelectorAll('.info__i')].find(e=>getComputedStyle(e).visibility!=='hidden');
    return { fw:Math.round(f.getBoundingClientRect().width), fh:Math.round(f.getBoundingClientRect().height),
      fv:see(f), iv: info?see(info):'—',
      deck: Math.round(document.querySelector('.deck').getBoundingClientRect().height),
      avail: Math.round(st.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom)) };
  });
  const ok = r.fv==='100%' && r.iv==='100%';
  console.log(`${(s.w+'x'+s.h).padEnd(11)}${(r.fw+'x'+r.fh).padEnd(12)}${r.fv.padEnd(11)}${r.iv.padEnd(11)}${r.deck}/${r.avail}  ${ok?'':'⚠️ 被切'}`);
  await ctx.close();
}
await b.close();
