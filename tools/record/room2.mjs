import { chromium } from 'playwright-core';
/** 比對兩個房間站的部署狀態（room-pitch 之死就是這支抓到的） */
const b = await chromium.launch({
  executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  headless: true,
});
for (const u of ['https://room-sepia.vercel.app/', 'https://room-pitch.vercel.app/index.html']) {
  const p = await (await b.newContext({ viewport: { width: 1200, height: 800 } })).newPage();
  try {
    const r = await p.goto(u, { waitUntil: 'load', timeout: 40000 });
    await new Promise((x) => setTimeout(x, 2500));
    const d = await p.evaluate(() => ({
      title: document.title,
      屏數: +(document.documentElement.scrollHeight / innerHeight).toFixed(1),
      文字: document.body.innerText.replace(/\s+/g, ' ').trim().slice(0, 160),
    }));
    console.log(`${u}\n  HTTP ${r.status()} | ${d.title} | ${d.屏數} 屏\n  ${d.文字}\n`);
  } catch (e) {
    console.log(`${u}\n  錯誤: ${String(e).split('\n')[0]}\n`);
  }
}
await b.close();
