import { chromium } from 'playwright-core';
/** room-sepia 脫敏部署的端到端驗證：散頁 404、#about 殘留、出口牌、影片 Range */
const B = 'https://room-sepia.vercel.app';
const b = await chromium.launch({
  executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  headless: true,
});
const p = await (await b.newContext({ viewport: { width: 1280, height: 800 } })).newPage();
const r = await p.goto(B + '/', { waitUntil: 'load', timeout: 40000 });
await new Promise((x) => setTimeout(x, 2500));
const d = await p.evaluate(() => ({
  title: document.title,
  canonical: document.querySelector('link[rel=canonical]')?.href,
  og_url: document.querySelector('meta[property="og:url"]')?.content,
  og_image: document.querySelector('meta[property="og:image"]')?.content,
  about殘留: document.querySelectorAll('#about').length,
  出口牌: document.querySelectorAll('#exit').length,
  SEEKING: document.body.innerText.includes('SEEKING'),
  找實習: document.body.innerText.includes('實習'),
  出口連結: document.querySelector('#exit a')?.href ?? '(無)',
}));
console.log('首頁 HTTP', r.status());
console.log(JSON.stringify(d, null, 1));
for (const path of [
  '/about-lab.html', '/plate.html', '/about.html', '/hub.html', '/projects.html',
  '/_backup-20260802/index.html', '/outside.html', '/assets/og.png',
]) {
  const rr = await p.goto(B + path, { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => null);
  console.log(`  ${String(rr?.status() ?? 'ERR').padEnd(4)} ${path}`);
}
const range = await p.evaluate(async () => {
  const r = await fetch('/assets/room-pan.mp4', { headers: { Range: 'bytes=0-1023' } });
  return r.status;
});
console.log('  影片 Range 請求 →', range, '（206 = 可刷動）');
await b.close();
