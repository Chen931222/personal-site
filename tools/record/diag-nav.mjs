import { chromium } from 'playwright-core';
const B='https://personal-site-tan-alpha.vercel.app';
const b = await chromium.launch({ executablePath:'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', headless:true });
const p = await (await b.newContext({viewport:{width:1440,height:900}})).newPage();
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const warns=[]; p.on('console',m=>{ if(/stage/.test(m.text())) warns.push(m.type()+': '+m.text().split('\n')[0]); });

await p.goto(B+'/journal',{waitUntil:'load'}); await sleep(1500);
await p.click('a[href="/work"]'); await sleep(4000);

const d = await p.evaluate(()=>{
  const s=[...document.querySelectorAll('[data-slide]')].find(e=>!e.hasAttribute('aria-hidden'));
  const v=s.querySelector('[data-shot-video]');
  return {
    src屬性: v.getAttribute('src'), currentSrc: v.currentSrc || '(空)',
    networkState: v.networkState,  // 0=EMPTY 1=IDLE 2=LOADING 3=NO_SOURCE
    readyState: v.readyState, paused: v.paused, preload: v.preload,
    error: v.error ? v.error.code+' '+v.error.message : null,
    已連上文件: v.isConnected,
  };
});
console.log('換頁後的影片元素：'); console.log(JSON.stringify(d,null,1));
console.log('stage 警告：', warns.length? warns.join(' | ') : '無');

// 手動叫 load() 看看能不能救
const after = await p.evaluate(async ()=>{
  const s=[...document.querySelectorAll('[data-slide]')].find(e=>!e.hasAttribute('aria-hidden'));
  const v=s.querySelector('[data-shot-video]');
  v.load();
  await new Promise(r=>setTimeout(r,1800));
  try { await v.play(); } catch(e){ return {結果:'play 仍被拒 '+e.name}; }
  await new Promise(r=>setTimeout(r,1200));
  return { 結果:'load() 之後', readyState:v.readyState, paused:v.paused, currentTime:+v.currentTime.toFixed(2) };
});
console.log('手動 load()：', JSON.stringify(after));
await b.close();
