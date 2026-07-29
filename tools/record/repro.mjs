import { chromium } from 'playwright-core';
const B='https://personal-site-tan-alpha.vercel.app';
const b = await chromium.launch({ executablePath:'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', headless:true });
const ctx = await b.newContext({viewport:{width:1440,height:900}});
const p = await ctx.newPage();
const sleep = ms=>new Promise(r=>setTimeout(r,ms));

async function 量(label){
  await sleep(3000);
  const t1 = await p.evaluate(()=>{const v=document.querySelector('[data-slide]:not([aria-hidden]) [data-shot-video]');return v?v.currentTime:null;});
  await sleep(2000);
  const r = await p.evaluate((t1)=>{
    const s=[...document.querySelectorAll('[data-slide]')].find(e=>!e.hasAttribute('aria-hidden'));
    const v=s?.querySelector('[data-shot-video]');
    if(!v) return {錯:'找不到作用中的影片'};
    return { 在播:!v.paused, 前進:+(v.currentTime-t1).toFixed(2), readyState:v.readyState,
      名字亮:!!document.querySelector('[data-nm][data-active]'),
      簡介亮:!!document.querySelector('[data-info][data-active]'),
      影格可見:getComputedStyle(s).visibility };
  }, t1);
  console.log(label.padEnd(26), JSON.stringify(r));
}

await p.goto(B+'/work',{waitUntil:'load'}); await 量('① 第一次進站');
await p.reload({waitUntil:'load'});          await 量('② 重新整理');
await p.click('a[href="/journal"]').catch(()=>p.goto(B+'/journal'));
await sleep(2500);
await p.click('a[href="/work"]').catch(()=>p.goto(B+'/work'));
await 量('③ 去 journal 再回來');
await p.goto(B+'/',{waitUntil:'load'}); await sleep(2000);
await p.click('a[href="/work"]').catch(()=>{});
await 量('④ 從首頁點 WORK');
await b.close();
