import { chromium } from 'playwright-core';
const b = await chromium.launch({ executablePath:'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', headless:true });
const sleep = ms => new Promise(r=>setTimeout(r,ms));
console.log('尺寸'.padEnd(11)+'名字'.padEnd(9)+'影格'.padEnd(9)+'簡介'.padEnd(9)+'儀表列'.padEnd(9)+'結論');
for (const s of [{w:861,h:790},{w:861,h:600},{w:861,h:540},{w:718,h:540},{w:540,h:540},{w:375,h:600},{w:375,h:540},{w:375,h:480}]) {
  const ctx = await b.newContext({ viewport:{width:s.w,height:s.h} });
  const p = await ctx.newPage();
  await p.goto('http://localhost:4321/work',{waitUntil:'load'});
  await sleep(2600);
  const r = await p.evaluate(() => {
    const inView = el => { if(!el) return '—'; const b=el.getBoundingClientRect();
      if (b.height===0) return '0高'; 
      const vis = Math.max(0, Math.min(b.bottom, innerHeight) - Math.max(b.top, 0));
      return Math.round(vis/b.height*100)+'%'; };
    const act = sel => [...document.querySelectorAll(sel)].find(e=>e.hasAttribute('data-active'));
    return {
      name: inView(act('[data-name-col]')?.querySelector('.nm__t') || act('[data-name-col]')),
      gate: inView(document.querySelector('.gate__frame')),
      info: inView(act('[data-info]')),
      bar:  inView(document.querySelector('.bar')),
    };
  });
  const vals = [r.name,r.gate,r.info,r.bar];
  const bad = vals.some(v => v!=='—' && v!=='100%');
  console.log(`${(s.w+'x'+s.h).padEnd(11)}${String(r.name).padEnd(9)}${String(r.gate).padEnd(9)}${String(r.info).padEnd(9)}${String(r.bar).padEnd(9)}${bad?'⚠️ 有被切':'OK'}`);
  await ctx.close();
}
await b.close();
