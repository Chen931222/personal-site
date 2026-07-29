import { chromium } from 'playwright-core';
const B='https://personal-site-tan-alpha.vercel.app';
const b = await chromium.launch({ executablePath:'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', headless:true });
const p = await (await b.newContext({viewport:{width:1440,height:900}})).newPage();
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const errs=[]; p.on('console',m=>{ if(m.type()==='error') errs.push(m.text().slice(0,70)); });

// 刻意走「站內換頁」進 /work —— 這是會壞的那條路
await p.goto(B+'/journal',{waitUntil:'load'}); await sleep(1500);
await p.click('a[href="/work"]'); await sleep(3000);
await p.mouse.move(720,450);

console.log('格'.padEnd(5)+'作品'.padEnd(16)+'在播   前進   readyState');
for (let i=0;i<8;i++){
  const t1 = await p.evaluate(()=>{const s=[...document.querySelectorAll('[data-slide]')].find(e=>!e.hasAttribute('aria-hidden'));const v=s?.querySelector('[data-shot-video]');return v?v.currentTime:null;});
  await sleep(1700);
  const r = await p.evaluate((t1)=>{
    const s=[...document.querySelectorAll('[data-slide]')].find(e=>!e.hasAttribute('aria-hidden'));
    const v=s?.querySelector('[data-shot-video]');
    const 名 = document.querySelector('[data-title]')?.textContent.trim();
    if(!v) return {名, 影片:'打樣框'};
    return {名, 在播:!v.paused, 前進:+(v.currentTime-t1).toFixed(2), rs:v.readyState};
  }, t1);
  const ok = r.影片==='打樣框' ? '—' : (r.在播 && r.前進>0.5 ? '✅' : '❌');
  console.log(String(i+1).padEnd(5)+String(r.名).padEnd(16)+(r.影片==='打樣框'?'（無影片，打樣框）':`${r.在播}   ${r.前進}   ${r.rs}`)+'  '+ok);
  await p.mouse.wheel(0,160); await sleep(1400);
}
console.log('\nconsole 錯誤:', errs.length? errs.join(' | ') : '無');
await b.close();
