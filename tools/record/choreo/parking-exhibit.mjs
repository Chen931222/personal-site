/**
 * 挪車的代價 —— 9 秒，挪車之舞一鏡到底。
 *
 * 整站的 money shot 是「取最深的車」：前車逐台倒出暫存區、帳單逐次跳。
 * 全速演完要 20 秒＋，錄影用 window.__spdf(2.4) 加速到剪得進 9 秒。
 * 開場用 btn-skip0 瞬跳過導覽（INSTANT），先站在滿場的操作台狀態，
 * 再按「取最深的車」讓舞從第一格就開跳。
 */

export default async function (page, k) {
  await k.moveTo(page, 1180, 640, 200);

  // 瞬間完成導覽 → 滿場操作台
  await page.evaluate(() => document.getElementById('btn-skip0').click());
  await k.sleep(1200);

  // 加速 + 開跳
  await page.evaluate(() => window.__spdf && window.__spdf(2.4));
  await page.evaluate(() => document.getElementById('op-deep').click());
  await k.sleep(8200);
}
