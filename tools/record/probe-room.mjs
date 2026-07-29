import { chromium } from 'playwright-core';
const b = await chromium.launch({ executablePath:'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', headless:true });
const p = await (await b.newContext({viewport:{width:1200,height:800}})).newPage();
const r = await p.goto('https://room-pitch.vercel.app/index.html',{waitUntil:'load',timeout:45000});
console.log('HTTP', r.status());
await new Promise(x=>setTimeout(x,3000));
console.log(JSON.stringify(await p.evaluate(() => ({
  title: document.title,
  屏數: +(document.documentElement.scrollHeight/innerHeight).toFixed(1),
  文字: document.body.innerText.replace(/\s+/g,' ').trim().slice(0,300),
  章節: [...document.querySelectorAll('section,[data-chapter],[id]')].map(e=>e.id||e.dataset.chapter).filter(Boolean).slice(0,12),
})), null, 1));
await b.close();
