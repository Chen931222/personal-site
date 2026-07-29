/**
 * 唱片架 —— 8 秒，兩個動作。
 *
 * 要證明的事：這不是一面靜態的封面牆，是一台可以操作的唱機。
 * 所以動作選「換一張」跟「放下去」，不選捲動 —— 這個站只有一屏，捲了也沒東西。
 *
 * 結尾停在唱片正在播的狀態，跟開頭同一個構圖（封面置中），循環的接點看不太出來。
 */
export default async function (page, k) {
  await k.sleep(700); // 先讓人看清楚現在是哪一張

  // ① 從下面那排收藏裡挑一張 —— 一次帶出「這裡有一整架」
  await k.tap(page, 'button.dock-item', { move: 820, settle: 1500, nth: 6 });

  // ② 放下去。這是這個站唯一會發出聲音的動作，畫面上要看得到它被按下。
  await k.tap(page, '#playBtn', { move: 760, settle: 1400 });

  await page.evaluate(() => window.__curHide());
  await k.sleep(1100); // 游標退場，留一拍給封面
}
