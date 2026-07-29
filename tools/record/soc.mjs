import { chromium } from 'playwright-core';
const B='https://personal-site-tan-alpha.vercel.app';
const b = await chromium.launch({ executablePath:'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', headless:true });
const p = await (await b.newContext({viewport:{width:1440,height:900},deviceScaleFactor:2})).newPage();
const errs=[]; p.on('console',m=>{ if(m.type()==='error') errs.push(m.text().slice(0,60)); });
await p.goto(B+'/',{waitUntil:'load'}); await new Promise(r=>setTimeout(r,3000));
await p.evaluate(()=>window.scrollTo(0,document.documentElement.scrollHeight));
await new Promise(r=>setTimeout(r,2500));
const d = await p.evaluate(()=>{
  const 亮=e=>{const c=getComputedStyle(e);const b=e.getBoundingClientRect();return c.visibility!=='hidden'&&c.display!=='none'&&b.width>0;};
  return [...document.querySelectorAll('.soc')].filter(亮).map(a=>{
    const svg=a.querySelector('svg'), path=svg?.querySelector('path');
    const bb=a.getBoundingClientRect(), ib=svg?.getBoundingClientRect();
    return { 標籤:a.querySelector('.soc__t')?.textContent.trim(), href:a.getAttribute('href').slice(0,44),
      圖示尺寸: ib?`${Math.round(ib.width)}x${Math.round(ib.height)}`:'無',
      填色: path?getComputedStyle(path).fill:'無',
      路徑長度: path?path.getAttribute('d').length:0,
      文字色: getComputedStyle(a.querySelector('.soc__t')).color,
      觸控目標: `${Math.round(bb.width)}x${Math.round(bb.height)}` };
  });
});
console.log(JSON.stringify(d,null,1));
console.log('console:', errs.length? errs.join(' | ') : '無');
await p.screenshot({ path:'check/soc.png', clip:{x:60,y:560,width:700,height:190} });
await b.close();
