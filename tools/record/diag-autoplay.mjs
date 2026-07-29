/**
 * 影格裡的錄影到底有沒有在動？
 *
 * 站主的螢幕錄影顯示影格凍在 poster 上 10 秒沒動，但我這邊無頭 Chrome 是會播的 ——
 * 所以不能只問「play() 有沒有被拒」，要問「currentTime 有沒有一直前進」。
 *
 * 這支模擬最嚴苛的情況：**完全不帶任何 autoplay 旗標**，而且分兩種情境測 ——
 *   ① 純載入，不碰它（最接近站主一開頁就看的狀態）
 *   ② 載入後給一次使用者手勢（滾一下）
 * 兩種都逐秒記錄 currentTime，看門狗有沒有把它救回來一看就知道。
 */
import { chromium } from 'playwright-core';

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await chromium.launch({ executablePath: CHROME, headless: true });

async function run(label, { gesture }) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  const warns = [];
  page.on('console', (m) => {
    if (m.type() === 'warning' && /stage/.test(m.text())) warns.push(m.text().split('\n')[0]);
  });

  await page.goto('http://localhost:4321/work', { waitUntil: 'load' });
  await sleep(2500);

  if (gesture) {
    await page.mouse.move(720, 450);
    await page.mouse.wheel(0, 4); // 小於 DELTA_MIN，不會換幕，只提供手勢
    await sleep(400);
  }

  const track = [];
  for (let i = 0; i < 6; i++) {
    track.push(
      await page.evaluate(() => {
        const s = [...document.querySelectorAll('[data-slide]')].find(
          (el) => getComputedStyle(el).visibility !== 'hidden'
        );
        const v = s?.querySelector('[data-shot-video]');
        return v ? +v.currentTime.toFixed(2) : null;
      })
    );
    await sleep(1000);
  }

  const moved = track.filter((t, i) => i && t !== null && t !== track[i - 1]).length;
  console.log(`\n【${label}】`);
  console.log(`  currentTime 逐秒：${track.join(' → ')}`);
  console.log(`  有前進的秒數：${moved}/5  ${moved >= 4 ? '✅ 在播' : '❌ 卡住'}`);
  if (warns.length) console.log(`  主控台警告：${warns[0]}`);

  await ctx.close();
  return moved >= 4;
}

const a = await run('一開頁就看，完全不互動', { gesture: false });
const b = await run('滾一下之後', { gesture: true });

await browser.close();
console.log(`\n結論：${a && b ? '兩種情境都會播' : a ? '不互動會播，但互動後反而停了（不該發生）' : b ? '要有手勢才會播 —— 看門狗與手勢重試是必要的' : '兩種都不播，還有別的原因'}`);
