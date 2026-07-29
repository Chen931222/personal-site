/**
 * 書櫃 —— 8 秒，兩個動作。
 *
 * 這個站只有一屏，垂直捲不動；它的軸是橫的。滾輪推的是一整排分類卡，
 * 所以第一個動作就照它自己在左下角寫的那句做：「滾動 · 點類別看書」。
 *
 * 為什麼是「先滾，再點」而不是「先點，再穿過書櫃」：
 *   進類別的轉場是一整面色塊由下往上蓋滿再退開，中間有大半秒是純色。
 *   那半秒放在第 4 秒沒人介意，放在第 2 秒就等於把最多人看到的那一段
 *   拿去播一塊紅色。所以把「會動」擺前面，把「有東西」擺後面。
 *
 * ① 滾動：畫面從左半邊空著（只有三張卡）變成五張卡填滿，計數器 1 → 3。
 *    一眼就知道這是一整排，不是三張圖。
 * ② 點中央那張：色塊掃過去，退開時露出一條立體的書封通道，底下寫著 01 / 21 ——
 *    到這裡才證明卡片後面真的有書櫃，不是一個好看的封面而已。
 *
 * 收在書封剛落定的那一格，跟開頭的深底構圖同調，循環的接點不刺眼。
 */

/**
 * 橫向書櫃的滾動。
 *
 * 站是自己收 wheel 事件在推 track，不是 window.scroll，
 * 所以 k.scrollTo 那組用不上，得真的餵滾輪。
 * 用經過的時間算該推到哪（不是固定步數）—— 每一發 wheel 走 CDP 都要時間，
 * 照步數跑的話實際長度會比帳面多出三成，8 秒就變 11 秒。
 * 曲線用 power3.out：起手快、收尾慢，像一次撥動之後的慣性，不像機器等速推。
 */
async function shelfGlide(page, dist, ms) {
  const t0 = Date.now();
  let sent = 0;
  for (;;) {
    const t = Math.min(1, (Date.now() - t0) / ms);
    const want = dist * (1 - Math.pow(1 - t, 3));
    if (want > sent) {
      await page.mouse.wheel(0, want - sent);
      sent = want;
    }
    if (t >= 1) break;
    await new Promise((r) => setTimeout(r, 16));
  }
}

export default async function (page, k) {
  // 游標先進場停在書櫃下緣。滾動時它不動 —— 人滾滾輪的時候手本來就不動，
  // 讓它在畫面上有個位置，等一下往上點才不是憑空冒出來。
  await k.moveTo(page, 640, 596, 420);
  await k.sleep(260);

  // ① 推兩格，六類走過三類，中央停在「看懂世界」
  await shelfGlide(page, 618, 1250);
  await k.sleep(520); // 停一拍，讓人看清楚停在哪一張

  // ② 點中央那張。游標走 400px 只給 560ms —— 這段只有游標在動，
  //    拖太久就是一秒的靜止畫面，八秒的片子付不起。
  await k.tap(page, 'a.card', { move: 560, settle: 700, nth: 2 });

  // 色塊蓋過來之後游標沒有作用了，先退場，不要讓它浮在純色上
  await page.evaluate(() => window.__curHide());
  await k.sleep(2700); // 掃過、退開、21 張書封落定
}
