/**
 * 房間 · 個人索引 —— 8 秒，一鏡到底的滾動。
 *
 * 這是九個站裡唯一**不需要「動作」**的一支：它有 16.6 屏，本身就是一部片，
 * 滾動就是鏡頭在房間裡走。硬塞兩個點擊反而會打斷它。
 *
 * 所以編排只有一件事：把鏡頭穩穩地推過去。判斷依據是站自己的章節條 ——
 * 00 房間 / 01 衣櫃 / 02 主機 / 03 螢幕 / 04 專輯櫃 / 05 書櫃，
 * 一支 8 秒的片子走完前三章剛好，走完六章會變成快轉。
 *
 * 也是唯一不放游標的一支。畫面上沒有東西被點，放一顆游標在那裡只會讓人
 * 一直等它去點什麼。滾動的敘事不需要手。
 *
 * 收在第三章落定的位置 —— 深色、構圖穩，跟開頭的首屏同調，循環接點不刺眼。
 */

/**
 * 帶 ease 的絕對捲動。
 *
 * 不用 lib 的 k.scrollTo：那支是照步數跑的，而這個站每一格都在算
 * scroll-driven 的位移，步數固定會讓實際長度飄。這裡改用**經過的時間**算位置，
 * 慢的機器上會少幾格，但總長永遠是講好的那個數字。
 *
 * 曲線 power3.out 起手快、收尾慢 —— 像一次撥動之後的慣性。
 * 等速捲動一眼就看得出是機器在拉。
 */
async function glide(page, from, to, ms) {
  const t0 = Date.now();
  for (;;) {
    const t = Math.min(1, (Date.now() - t0) / ms);
    const e = 1 - Math.pow(1 - t, 3);
    await page.evaluate((y) => window.scrollTo(0, y), from + (to - from) * e);
    if (t >= 1) break;
    await new Promise((r) => setTimeout(r, 16));
  }
}

export default async function (page, k) {
  // 首屏停一拍：標題「房間 A room, read as an index」要讀得到，
  // 一開場就動的話那句話等於沒寫。
  await k.sleep(700);

  const H = await page.evaluate(() => document.documentElement.scrollHeight - innerHeight);

  /**
   * 這個站的章節是**釘住的**（sticky ＋ scroll-driven），所以捲動量跟畫面變化不是線性的：
   * 捲到章節中段時畫面是靜止的，只有換章那一下在動。
   *
   * 第一版走到 32% 就收，結果後段 2.5 秒完全沒動 —— 帳面上「還在捲」，
   * 看起來卻是一張靜止圖。改成走遠一點、分三段、尾巴收短，讓每一段都落在換章上。
   */
  await glide(page, 0, H * 0.18, 2100);
  await k.sleep(400); // 到章之間留一拍，不然讀起來像一路衝到底

  await glide(page, H * 0.18, H * 0.34, 2200);
  await k.sleep(400);

  await glide(page, H * 0.34, H * 0.46, 1500);
  await k.sleep(700); // 尾巴只留一拍 —— 停久了就是在播靜止畫
}
