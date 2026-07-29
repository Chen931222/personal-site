import { chromium } from 'playwright-core';
const B='https://personal-site-tan-alpha.vercel.app';
const b = await chromium.launch({ executablePath:'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', headless:true, args:['--autoplay-policy=no-user-gesture-required'] });
const p = await (await b.newContext({viewport:{width:1440,height:900},deviceScaleFactor:1})).newPage();
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
await p.goto(B+'/work',{waitUntil:'load'}); await sleep(5000);
await p.screenshot({ path:'check/bg1.png' });

// 量「巨型名字旁邊的背景」實際亮度，算對比
const lum=(r,g,b)=>{const f=c=>{c/=255;return c<=0.03928?c/12.92:Math.pow((c+0.055)/1.055,2.4)};return .2126*f(r)+.7152*f(g)+.0722*f(b)};
const px = await p.evaluate(()=>{
  const c=document.createElement('canvas');
  return new Promise(res=>res(null)); // 畫布抓不到跨層合成，改用截圖取樣
});
await b.close();

// 用截圖取樣：名字大約在 x 100-500, y 380-520 這一帶
import { execFileSync } from 'node:child_process';
const out = execFileSync('ffmpeg',['-i','check/bg1.png','-vf','crop=360:120:90:380,scale=1:1','-f','rawvideo','-pix_fmt','rgb24','-'],{maxBuffer:1e7});
const [r,g,bb]=[out[0],out[1],out[2]];
const L1=lum(233,228,216), L2=lum(r,g,bb);
const ratio=(Math.max(L1,L2)+0.05)/(Math.min(L1,L2)+0.05);
console.log(`名字區域的背景平均色 rgb(${r}, ${g}, ${bb})`);
console.log(`巨型名字(#E9E4D8) 對比 = ${ratio.toFixed(2)}:1   ${ratio>=4.5?'✅ AA 過':'❌ 低於 4.5'}`);
