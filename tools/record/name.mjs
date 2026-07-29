import { chromium } from 'playwright-core';
const B='https://personal-site-tan-alpha.vercel.app';
const b = await chromium.launch({ executablePath:'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', headless:true });
for (const s of [{w:1440,h:900,n:'n1'},{w:375,h:800,n:'n2'}]) {
  const p = await (await b.newContext({viewport:{width:s.w,height:s.h},deviceScaleFactor:2})).newPage();
  await p.goto(B+'/',{waitUntil:'load'});
  await new Promise(r=>setTimeout(r,3300));   // 名字完全展開的那一拍
  await p.screenshot({ path:`check/${s.n}.png` });
  const d = await p.evaluate(()=>{
    const ha=document.querySelector('[data-half="a"]'), hb=document.querySelector('[data-half="b"]');
    const na=ha?.querySelector('.intro__name'), nb=hb?.querySelector('.intro__name');
    const r=e=>{const x=e.getBoundingClientRect();return {l:Math.round(x.left),r:Math.round(x.right),w:Math.round(x.width)};};
    return {
      左半字:na?.textContent.trim(), 右半字:nb?.textContent.trim(),
      左字框:na?r(na):null, 右字框:nb?r(nb):null, 視窗寬:innerWidth,
      水平溢出: document.documentElement.scrollWidth-document.documentElement.clientWidth,
      頁首字標: document.querySelector('.nav__wordmark')?.textContent.trim(),
      字級: na?getComputedStyle(na).fontSize:null,
    };
  });
  console.log(`\n【${s.w}x${s.h}】`); console.log(JSON.stringify(d,null,1));
}
await b.close();
