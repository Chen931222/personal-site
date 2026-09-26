/**
 * 挪車的代價 —— 約 10 秒，挪車之舞一鏡到底。
 *
 * 整站的 money shot 是「取最深的車」：前車逐台彈進暫存堆疊、
 * 左上的程式字條逐行亮（while True: top = area.pop() …）、右上計數跟著掉。
 * 2026-08-06 站改版後重錄：程式字條面板預設開著，不用另外按 ——
 * 「動畫＋程式碼同步亮行」自己就是教學，正好一鏡收完。
 *
 * ⚠️ 站的狀態機比 07-29 多了一層：**電影式開場 → 導覽選單 → 操作台**。
 *    舊編排只按 btn-skip0（跳導覽），錄出來整段都在開場的佇列比較章節裡 ——
 *    畫面有東西在動，完全不是操作台（實測截圖 pk-dance.png）。
 *    現在要先按 intro-skip 再按 btn-skip0，缺一不可。
 *
 * 全速的舞要 20 秒＋，用站自己留的 window.__spdf(2.4) 加速到剪得進來。
 */

export default async function (page, k) {
  await k.moveTo(page, 1180, 640, 200);

  // 第一層：跳過電影式開場（沒有這步，後面全部白錄）
  await page.evaluate(() => document.getElementById('intro-skip')?.click());
  await k.sleep(800);

  // 第二層：跳過導覽 → 滿場操作台（程式字條預設開著）
  await page.evaluate(() => document.getElementById('btn-skip0').click());
  await k.sleep(1100);

  // 加速 + 開跳
  await page.evaluate(() => window.__spdf && window.__spdf(2.4));
  await page.evaluate(() => document.getElementById('op-deep').click());
  await k.sleep(8200);
}
