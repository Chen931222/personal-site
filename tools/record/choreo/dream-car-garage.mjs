/**
 * 夢想車庫 —— 約 8 秒，兩個動作，都是「換一台車」。（2026-10-02 改版後重寫）
 *
 * 首頁現在不是即時 3D，是 Blender 攝影棚渲染的 360° 轉盤：每台 144 張，換車時車會轉進定位。
 * 要證明的事：這是一整排在攝影棚裡拍好的車，換一台，車和文字卡一起換。
 * 點右側縮圖列換車，比滾輪好錄：游標看得到在點什麼。
 *
 * 只挑相鄰的兩台：首頁一次預載前後一台，相鄰的那台換過去不會等圖。
 * W202 的綠 → MX-5 的紅 → Macan 的青，三格顏色差很多，縮到作品集的影格那麼小也看得出換了車。
 */

/**
 * 進門的準備（這段會被裁掉，不會出現在影片裡）：
 * 第一次來會先播開場影片，按「跳過開場」；第一台車在開場收掉後會重新轉進來，
 * 等它停好再開始錄，觀眾第一格看到的是停好的 W202。
 */
export async function ready(page) {
  await page.click('#intro-skip', { timeout: 4000 }).catch(() => {});
  await page
    .waitForFunction(() => document.querySelector('#loader')?.classList.contains('done'), { timeout: 15000 })
    .catch(() => {});
  await page.waitForTimeout(2600);
}

export default async function (page, k) {
  await k.sleep(500); // 先看清楚現在停的是 W202

  // ① 游標帶到右側縮圖列，點第二台（MX-5）：車轉進定位、文字卡換掉
  await k.tap(page, '#dots button', { move: 820, settle: 2000, nth: 1 });

  // ② 同樣的手勢再做一次（Macan），說的是「每一台都可以點」
  await k.tap(page, '#dots button', { move: 520, settle: 2000, nth: 2 });

  await page.evaluate(() => window.__curHide());
  await k.sleep(850); // 游標退場，留一拍給車
}
