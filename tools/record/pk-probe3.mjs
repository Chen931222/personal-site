import { chromium } from 'playwright-core';
const b = await chromium.launch({ executablePath:'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', headless:true });
const p = await (await b.newContext({viewport:{width:1280,height:720}})).newPage();
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
await p.goto('https://parking-exhibit.vercel.app/',{waitUntil:'load',timeout:45000});
await sleep(2000);
const vis = sel => p.evaluate(s=>{const e=document.querySelector(s);return !!e && e.offsetParent!==null && +getComputedStyle(e).opacity>0.1;}, sel);
console.log('載入後: intro-skip', await vis('#intro-skip'), '| btn-skip0', await vis('#btn-skip0'));
await p.evaluate(()=>document.getElementById('intro-skip')?.click());
await sleep(1500);
console.log('跳開場後: intro-skip', await vis('#intro-skip'), '| btn-skip0', await vis('#btn-skip0'), '| btn-tour', await vis('#btn-tour'));
await p.evaluate(()=>document.getElementById('btn-skip0').click());
await sleep(1800);
console.log('進操作台後: op-deep', await vis('#op-deep'), '| op-code', await vis('#op-code'), '| intro-skip', await vis('#intro-skip'));
const st = await p.evaluate(()=>({
  堆疊計數: [...document.querySelectorAll('*')].filter(e=>/^\d+\s*台$/.test(e.textContent?.trim()||'') && e.children.length<=1).map(e=>e.textContent.trim()).slice(0,4),
}));
console.log('計數:', JSON.stringify(st));
await p.evaluate(()=>{ window.__spdf && window.__spdf(2.4); document.getElementById('op-deep').click(); });
await sleep(3000);
await p.screenshot({path:'check/pk-dance2.png'});
console.log('操作台舞蹈截圖 → check/pk-dance2.png');
await b.close();
