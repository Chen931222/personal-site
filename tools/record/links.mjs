import { chromium } from 'playwright-core';
const B='https://personal-site-tan-alpha.vercel.app';
const b = await chromium.launch({ executablePath:'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', headless:true });
const p = await (await b.newContext({viewport:{width:1440,height:900}})).newPage();
const errs=[]; p.on('console', m=>{ if(m.type()==='error') errs.push(m.text().slice(0,60)); });
await p.goto(B+'/',{waitUntil:'load'});
await new Promise(x=>setTimeout(x,3000));
// 捲到最底，讓關於我的結尾進場
await p.evaluate(()=>window.scrollTo(0,document.documentElement.scrollHeight));
await new Promise(x=>setTimeout(x,2500));
const r = await p.evaluate(()=>{
  const out=[...document.querySelectorAll('a[href*="github.com"],a[href*="linkedin"]')].map(a=>{
    const bb=a.getBoundingClientRect(); const cs=getComputedStyle(a);
    return { 文字:a.textContent.trim(), href:a.getAttribute('href'),
      rel:a.getAttribute('rel'), 目標:a.getAttribute('target'),
      尺寸:`${Math.round(bb.width)}x${Math.round(bb.height)}`,
      可見: cs.visibility!=='hidden' && cs.display!=='none' && bb.width>0 };
  });
  return { 連結:out, favicon:!!document.querySelector('link[rel=icon]') };
});
console.log(JSON.stringify(r,null,1));
console.log('console 錯誤:', errs.length? errs.join(' | ') : '無');
await p.screenshot({ path:'check/end.png', clip:{x:0,y:340,width:1440,height:520} });
await b.close();
