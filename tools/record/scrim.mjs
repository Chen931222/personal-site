import { chromium } from 'playwright-core';
const B='https://personal-site-tan-alpha.vercel.app';
const b = await chromium.launch({ executablePath:'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', headless:true, args:['--autoplay-policy=no-user-gesture-required'] });
const p = await (await b.newContext({viewport:{width:1440,height:900},deviceScaleFactor:1})).newPage();
await p.goto(B+'/work',{waitUntil:'load'});
await new Promise(r=>setTimeout(r,5000));
console.log(JSON.stringify(await p.evaluate(()=>{
  const sc=document.querySelector('.bg__scrim');
  const act=[...document.querySelectorAll('[data-bg]')].find(e=>getComputedStyle(e).visibility!=='hidden'&&+getComputedStyle(e).opacity>0.5);
  const cs=sc?getComputedStyle(sc):null;
  return {
    暗場存在:!!sc,
    暗場背景色: cs?.backgroundColor,
    暗場尺寸: sc? `${Math.round(sc.getBoundingClientRect().width)}x${Math.round(sc.getBoundingClientRect().height)}`:null,
    暗場zIndex: cs?.zIndex, 暗場opacity: cs?.opacity,
    // 誰在上面？比較 DOM 順序
    暗場在最後: sc?.parentElement.lastElementChild===sc,
    作用中背景opacity: act? getComputedStyle(act).opacity : '無',
    bg層opacity: getComputedStyle(document.querySelector('.bg')).opacity,
  };
}),null,1));
await b.close();
