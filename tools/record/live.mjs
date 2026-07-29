import { chromium } from 'playwright-core';
const B='https://personal-site-tan-alpha.vercel.app';
const b = await chromium.launch({ executablePath:'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', headless:true, args:['--autoplay-policy=no-user-gesture-required'] });
for (const path of ['/','/work','/work/list','/journal']) {
  const ctx = await b.newContext({viewport:{width:1440,height:900}});
  const p = await ctx.newPage();
  const errs=[], fails=[];
  p.on('console', m=>{ if(m.type()==='error') errs.push(m.text().slice(0,50)); });
  p.on('response', r=>{ if(r.status()>=400) fails.push(r.status()+' '+r.url().replace(B,'')); });
  const r = await p.goto(B+path,{waitUntil:'load',timeout:45000});
  await new Promise(x=>setTimeout(x,4000));
  const d = await p.evaluate(()=>{
    const v=document.querySelector('[data-shot-video]');
    return { title:document.title, canonical:document.querySelector('link[rel=canonical]')?.href,
      robots:document.querySelector('meta[name=robots]')?.content ?? '(無)',
      影片: v? {src:v.getAttribute('src'), 在播:!v.paused} : '—',
      溢出:document.documentElement.scrollWidth-document.documentElement.clientWidth };
  });
  console.log(`\n${path}  HTTP ${r.status()}`);
  console.log('  ', JSON.stringify(d));
  if(fails.length) console.log('   失敗請求:', fails.join(', '));
  if(errs.length) console.log('   console:', errs.join(' | '));
  await ctx.close();
}
await b.close();
