import { chromium } from 'playwright-core';
const b = await chromium.launch({ executablePath:'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', headless:true, args:['--autoplay-policy=no-user-gesture-required'] });
for (const s of [{w:861,h:540,n:'a'},{w:861,h:790,n:'b'},{w:375,h:667,n:'c'}]) {
  const p = await (await b.newContext({viewport:{width:s.w,height:s.h},deviceScaleFactor:2})).newPage();
  await p.goto('http://localhost:4321/work',{waitUntil:'load'});
  await new Promise(r=>setTimeout(r,3400));
  await p.screenshot({ path:`check/fix-${s.n}.png` });
}
await b.close(); console.log('ok');
