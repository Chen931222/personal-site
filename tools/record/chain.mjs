import { chromium } from 'playwright-core';
const b = await chromium.launch({ executablePath:'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', headless:true });
const p = await (await b.newContext({viewport:{width:861,height:540}})).newPage();
await p.goto('http://localhost:4321/work',{waitUntil:'load'});
await new Promise(r=>setTimeout(r,2600));
console.log(JSON.stringify(await p.evaluate(() => {
  const q = s => document.querySelector(s);
  const info = (sel) => { const e=q(sel); if(!e) return sel+' → 不存在';
    const c=getComputedStyle(e), b=e.getBoundingClientRect();
    return { sel, 高:Math.round(b.height), 寬:Math.round(b.width), display:c.display,
      containerType:c.containerType, alignSelf:c.alignSelf, height:c.height,
      gridRows:c.gridTemplateRows, aspect:c.aspectRatio }; };
  return {
    有box: !!q('.gate__box'),
    鏈: ['.stage','.deck','.gate','.gate__box','.gate__frame'].map(info),
  };
}), null, 1));
await b.close();
