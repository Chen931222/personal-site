import { chromium } from 'playwright-core';
const b = await chromium.launch({ executablePath:'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', headless:true });
const sleep = ms => new Promise(r=>setTimeout(r,ms));
for (const s of [{w:861,h:540},{w:375,h:540},{w:375,h:480}]) {
  const ctx = await b.newContext({ viewport:{width:s.w,height:s.h} });
  const p = await ctx.newPage();
  await p.goto('http://localhost:4321/work',{waitUntil:'load'});
  await sleep(2600);
  const r = await p.evaluate(() => {
    const h = el => el ? Math.round(el.getBoundingClientRect().height) : 0;
    const st = document.querySelector('.stage'), dk = document.querySelector('.deck');
    const cs = getComputedStyle(st);
    const nav = document.querySelector('.nav').getBoundingClientRect();
    const bar = document.querySelector('.bar').getBoundingClientRect();
    return {
      視窗: innerHeight,
      舞台上下內距: cs.paddingTop+' / '+cs.paddingBottom,
      可用: Math.round(st.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom)),
      deck實高: h(dk),
      '  名字欄': h(dk.querySelector('.nm')),
      '  影格欄': h(dk.querySelector('.gate')),
      '    └影格': h(dk.querySelector('.gate__frame')),
      '  簡介欄': h(dk.querySelector('.info')),
      導覽列底: Math.round(nav.bottom),
      儀表列頂: Math.round(bar.top),
    };
  });
  console.log(`\n【${s.w}x${s.h}】`); for (const [k,v] of Object.entries(r)) console.log('  '+k.padEnd(14)+v);
  await ctx.close();
}
await b.close();
