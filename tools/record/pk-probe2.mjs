import { chromium } from 'playwright-core';
const b = await chromium.launch({ executablePath:'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', headless:true });
const p = await (await b.newContext({viewport:{width:1280,height:720}})).newPage();
await p.goto('https://parking-exhibit.vercel.app/',{waitUntil:'load',timeout:45000});
await new Promise(r=>setTimeout(r,2000));
await p.evaluate(()=>document.getElementById('btn-skip0').click());
await new Promise(r=>setTimeout(r,1500));
const st = await p.evaluate(()=>{
  const vis = el => el && el.offsetParent!==null && getComputedStyle(el).visibility!=='hidden' && +getComputedStyle(el).opacity>0.1;
  const panel=[...document.querySelectorAll('div,aside,section')].filter(e=>/parking_stack\.py/.test(e.textContent||'') && e.querySelectorAll('*').length<60).pop();
  return {
    程式字條預設: panel? (vis(panel)?'開著':'關著/藏著') : '找不到面板',
    op_code_樣式: document.getElementById('op-code')?.className || '',
    op_deep可見: vis(document.getElementById('op-deep')),
  };
});
console.log(JSON.stringify(st,null,1));
// 順便按一下取最深的車，2 秒後看程式面板有沒有跟著亮行
await p.evaluate(()=>{ window.__spdf && window.__spdf(2.4); document.getElementById('op-deep').click(); });
await new Promise(r=>setTimeout(r,2500));
await p.screenshot({path:'check/pk-dance.png'});
console.log('舞蹈中截圖 → check/pk-dance.png');
await b.close();
