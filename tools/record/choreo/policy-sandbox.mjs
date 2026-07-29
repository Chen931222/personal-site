/**
 * 政策沙盤 —— 8 秒，一次測繪掃描＋兩段捲動。
 *
 * 這站是純靜態（Vercel），沒有要暖的 API。
 * 唯一的麻煩：開場的紅線測繪掃描在頁面載入時就跑完了，
 * 而錄影的 lead 剪裁會把載入段整個切掉 —— 掃描等於沒被錄到。
 * 對策：站上留了 window.__resurvey()（index.html），編排開頭呼叫一次重播。
 *
 * ① 掃描：紅線從左到右把墨線村莊畫出來，Gini 讀數跟著走針 ——
 *    這是整站唯一的 authored moment，也是影片的開場。
 * ② 捲到測量結果表（三種演算法的 Gini 對照，論點的數字形式）。
 * ③ 收在秀梅的證言 —— 紅字「只有標題黨衝得動流量」當結尾格。
 */

export default async function (page, k) {
  // 游標先讓開，掃描是主角。CTA 懸停試過一版 —— 那是第三個動作，剪掉。
  // （2026-07-28 首錄 12.7s：這站的 evaluate 來回比本機站慢，係數再打七折）
  await k.moveTo(page, 1180, 640, 250);

  // ① 重播測繪掃描（2.2s），讀數走針可以延伸到捲動段，不用等到落定
  await page.evaluate(() => window.__resurvey && window.__resurvey());
  await k.sleep(1900);

  // ② 捲到測量結果表
  await k.scrollToPct(page, 0.3, 450);
  await k.sleep(650);

  // ③ 收在秀梅證言
  await k.scrollToPct(page, 0.52, 400);
  await k.sleep(700);
}
