/**
 * 我的衣櫃 —— 8 秒，兩個動作。
 *
 * 要證明的事：這不是一張排版好的衣服拼貼，是一個轉得動、點得開的展櫃。
 * 站自己在底下寫了規矩：「滾輪轉動 · 點一件聚焦」，那就照它的話錄。
 *
 * ① 滾輪把整圈轉一段 —— 12 件同時繞著中心走，一次證明「整櫃都是活的」。
 *    這個站只有一屏，捲頁沒有東西，能動的就是這圈。
 * ② 點其中一件 —— 衣服放大到滿版，右下浮出名字與標籤。
 *    這才是這個站的底層主張：每件衣服都是單獨拍過的展品，不是縮圖。
 *
 * 順序不能倒過來。先看到「一整櫃」，放大才有份量；
 * 先放大再退回去看櫃子，等於把結論講在前面。
 *
 * 游標刻意停在右側空白處滾輪，不壓到中央的「今日推薦」——
 * 轉動時中央那段字是唯一不動的東西，被游標蓋住就少了一個對照。
 */

/**
 * 手指撥滾輪的力道：中間重、兩頭輕。等速的滾輪跟等速的游標一樣，一眼看穿是機器。
 *
 * total 是試出來的。第一版用 90，圈確實轉了，但在 1.5fps 的檢查圖上前後兩格幾乎一樣 ——
 * 「有動」跟「看得出來在動」是兩件事，這支片只有一次機會講前者。
 * 240 大約是半圈：夠明顯，又還沒快到糊成一片。
 */
async function spin(page, total = 240, steps = 24, gap = 40) {
  const w = [];
  for (let i = 0; i < steps; i++) w.push(Math.sin(((i + 0.5) / steps) * Math.PI));
  const sum = w.reduce((a, b) => a + b, 0);
  for (const v of w) {
    await page.mouse.wheel(0, (total * v) / sum);
    await new Promise((r) => setTimeout(r, gap));
  }
}

/**
 * 挑一件「前排」的衣服來點。
 * 圈是有透視的，靠近觀眾的那幾件最大 —— 點大的，放大時的位移才連得起來。
 * 中央那塊字的範圍要避開，游標不該從字上面壓過去。
 */
async function frontPiece(page) {
  return page.evaluate(() => {
    const inText = (x, y) => x > 505 && x < 775 && y > 250 && y < 470;
    const all = [...document.querySelectorAll('button.landing-card')].map((el) => {
      const r = el.getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2, a: r.width * r.height };
    });
    const ok = all.filter((c) => !inText(c.x, c.y));
    return (ok.length ? ok : all).sort((p, q) => q.a - p.a)[0];
  });
}

export default async function (page, k) {
  await k.sleep(750); // 先讓人看清楚這是一圈十二件，不是一張海報

  // ① 轉。游標先滑到右邊的空白，再撥。
  // 開場的每一拍都很貴 —— 多數人只看得到前三秒，圈必須在第 1.4 秒就開始動。
  await k.moveTo(page, 990, 300, 520);
  await k.sleep(140);
  await spin(page);
  await k.sleep(620); // 停穩。轉完立刻點，會看不出來剛剛轉過。

  // ② 點開一件。這是全片唯一要人「看清楚一樣東西」的一拍，留長一點。
  const it = await frontPiece(page);
  if (!it) throw new Error('找不到 button.landing-card');
  await k.moveTo(page, it.x, it.y, 620);
  await k.sleep(150);
  await k.click(page, { settle: 2000 });

  await page.evaluate(() => window.__curHide());
  await k.sleep(1250); // 游標退場，把最後一拍留給那件衣服
}
