import { chromium } from 'playwright-core';
const b = await chromium.launch({ executablePath:'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', headless:true });
for (const s of [{w:1440,h:900,n:'j1'},{w:375,h:800,n:'j2'}]) {
  const p = await (await b.newContext({viewport:{width:s.w,height:s.h},deviceScaleFactor:2})).newPage();
  await p.goto('http://localhost:4321/journal',{waitUntil:'load'});
  await new Promise(r=>setTimeout(r,2000));
  await p.screenshot({ path:`check/${s.n}.png`, fullPage:true });
  const r = await p.evaluate(()=>({ ho:document.documentElement.scrollWidth-document.documentElement.clientWidth,
    stats:[...document.querySelectorAll('.head__stats p')].map(e=>e.textContent.trim().replace(/\s+/g,'')).join(' '),
    rows:document.querySelectorAll('.row').length, years:[...document.querySelectorAll('.row__year')].map(e=>e.textContent.trim()).join(',') }));
  console.log(s.n, JSON.stringify(r));
}
await b.close();
