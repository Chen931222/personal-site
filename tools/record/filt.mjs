import { chromium } from 'playwright-core';
const B='https://personal-site-tan-alpha.vercel.app';
const b = await chromium.launch({ executablePath:'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', headless:true, args:['--autoplay-policy=no-user-gesture-required'] });
const p = await (await b.newContext({viewport:{width:1440,height:900},deviceScaleFactor:2})).newPage();
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const errs=[]; p.on('console',m=>{ if(m.type()==='error') errs.push(m.text().slice(0,60)); });
await p.goto(B+'/work',{waitUntil:'load'}); await sleep(4000);
await p.mouse.move(720,450);

const 數 = () => p.evaluate(()=>{
  const 亮 = s => [...document.querySelectorAll(s)].filter(e=>{const c=getComputedStyle(e);const b=e.getBoundingClientRect();return c.visibility!=='hidden'&&+c.opacity>0.05&&b.width>0;}).length;
  return { 名字亮:亮('[data-nm][data-active]'), 簡介亮:亮('[data-info][data-active]'),
           影格亮:亮('[data-slide]:not([aria-hidden])'), 背景亮:亮('[data-bg]'),
           進站鈕:亮('.info__go') };
});

console.log('初始      ', JSON.stringify(await 數()));
// 站主的操作：快速連點好幾個分類
for (const t of ['展示','建檔','學習','工具','分析','']) {
  await p.click(`[data-filter="${t}"]`); await sleep(260);
}
await sleep(1800);
console.log('連點六個後', JSON.stringify(await 數()));
// 滾動中途按篩選（最容易疊的時機）
await p.mouse.wheel(0,160); await sleep(180);
await p.click('[data-filter="建檔"]'); await sleep(1800);
console.log('換幕中按篩選', JSON.stringify(await 數()));
await p.screenshot({ path:'check/filter.png' });
console.log('console:', errs.length? errs.join(' | ') : '無');
await b.close();
