import { chromium } from 'playwright-core';
const b = await chromium.launch({ executablePath:'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', headless:true });
const p = await (await b.newContext({viewport:{width:1280,height:720}})).newPage();
await p.goto('https://parking-exhibit.vercel.app/',{waitUntil:'load',timeout:45000});
await p.waitForLoadState('networkidle',{timeout:15000}).catch(()=>{});
await new Promise(r=>setTimeout(r,2500));
console.log(JSON.stringify(await p.evaluate(()=>({
  掛鉤: {
    btn_skip0: !!document.getElementById('btn-skip0'),
    op_deep: !!document.getElementById('op-deep'),
    spdf: typeof window.__spdf,
  },
  按鈕列: [...document.querySelectorAll('button')].map(b=>({id:b.id,text:b.textContent.trim().slice(0,10),可見:b.offsetParent!==null})).filter(x=>x.text),
  程式字條面板: (()=>{ const el=[...document.querySelectorAll('div,aside,section')].find(e=>/SOURCE|程式字條|parking_stack/.test(e.textContent||'') && e.children.length<15); return el? '存在' : '找不到'; })(),
  計數器: [...document.querySelectorAll('[id*=count],[class*=count],[class*=stat]')].slice(0,6).map(e=>e.textContent.replace(/\s+/g,' ').trim().slice(0,20)),
})),null,1));
await b.close();
