import { chromium } from 'playwright-core';
import { readFileSync } from 'node:fs';
/** 全部作品連結體檢：進站按下去不能是 404 —— room-pitch 就是這樣死掉沒人發現的 */
const src = readFileSync('../../src/data/projects.ts', 'utf8');
const hrefs = [...src.matchAll(/href:\s*'(https?:[^']+)'/g)].map((m) => m[1]);
const b = await chromium.launch({
  executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  headless: true,
});
let bad = 0;
for (const u of hrefs) {
  const p = await (await b.newContext()).newPage();
  try {
    const r = await p.goto(u, { waitUntil: 'domcontentloaded', timeout: 40000 });
    const t = await p.title();
    const dead = r.status() >= 400 || /NOT_FOUND|404/i.test(t);
    if (dead) bad++;
    console.log(`${dead ? '❌' : 'OK'}  ${String(r.status()).padEnd(4)} ${u}  「${t.slice(0, 34)}」`);
  } catch (e) {
    bad++;
    console.log(`❌  ERR  ${u}  ${String(e).split('\n')[0].slice(0, 60)}`);
  }
  await p.context().close();
}
await b.close();
console.log(bad ? `\n❌ ${bad} 條死鏈` : '\n✅ 全部活著');
