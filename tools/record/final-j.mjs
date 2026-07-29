import { chromium } from 'playwright-core';
const b = await chromium.launch({ executablePath:'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', headless:true });
const sleep = ms => new Promise(r=>setTimeout(r,ms));
let bad=0;
console.log('頁'.padEnd(13)+'尺寸'.padEnd(11)+'水平溢出  垂直溢出  小目標  aria陷阱  console');
for (const path of ['/journal']) {
 for (const s of [{w:1920,h:1080},{w:1440,h:900},{w:861,h:540},{w:768,h:700},{w:375,h:667}]) {
  const ctx = await b.newContext({ viewport:{width:s.w,height:s.h} });
  const p = await ctx.newPage();
  const errs=[]; p.on('console', m=>{ if(m.type()==='error') errs.push(m.text().slice(0,60)); });
  await p.goto('http://localhost:4321'+path,{waitUntil:'load'});
  await sleep(2600);
  const r = await p.evaluate(() => {
    const de=document.documentElement;
    const small=[...document.querySelectorAll('a,button,[role=button]')].filter(e=>{
      const b=e.getBoundingClientRect(); const c=getComputedStyle(e);
      return b.width>0 && c.visibility!=='hidden' && c.display!=='none' && (b.width<24||b.height<24); }).length;
    const trap=[...document.querySelectorAll('[aria-hidden=true]')].filter(e=>e.querySelector('a[href],button,input,select,textarea,[tabindex]:not([tabindex="-1"])')).length;
    return { ho:de.scrollWidth-de.clientWidth, vo: location.pathname==='/work'? de.scrollHeight-de.clientHeight : 0, small, trap };
  });
  const ok = r.ho===0 && r.vo===0 && r.small===0 && r.trap===0 && errs.length===0;
  if(!ok) bad++;
  console.log(`${path.padEnd(13)}${(s.w+'x'+s.h).padEnd(11)}${String(r.ho).padEnd(10)}${String(r.vo).padEnd(10)}${String(r.small).padEnd(8)}${String(r.trap).padEnd(10)}${errs.length}  ${ok?'':'⚠️ '+JSON.stringify(errs)}`);
  await ctx.close();
 }
}
await b.close();
console.log(bad? `\n⚠️ ${bad} 項有問題` : '\n✅ 15 組全過');

