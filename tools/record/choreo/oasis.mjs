/**
 * 綠洲 Oasis —— 8 秒，兩個動作，三個畫面。
 *
 * 這站跟其他 9 支不一樣：它是多頁式（真的換頁，不是 SPA），
 * 而且住在 Render 免費方案上，閒置會睡著、Neon 資料庫也會睡著。
 * 兩件事各有一個對策，都寫在下面。
 *
 * ① hero「找空間，找人一起用」停一拍 → 點「探索空間」：
 *    先讓主張被讀到。拼場是個要解釋的概念，這一屏就是它的解釋。
 * ② 探索頁的空間卡（有照片、有評分、有價格）→ 點第一張 →
 *    收在詳情頁：大圖＋「發起拼場」鈕落定的那一格。
 *    最能證明「這是個真的平台」的兩個畫面，剛好是這條路徑的終點。
 *
 * 不走的路：首頁往下捲。第二屏是「最新拼場」的空狀態
 * （「目前還沒有拼場資訊」）—— 空狀態不當開場，也不當中場。
 */

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * 跨頁用的點擊。不能用 lib 的 k.click ——
 * 它在 mouse.up 之後還要 evaluate 一次游標回彈，但這一下點的是真的連結，
 * 文件當場被換掉，evaluate 撞上 destroyed context 就把整支編排炸了
 * （2026-07-28 實測：2.7 秒斷片，正好停在第一個點擊）。
 * 這裡只做按下→放開，回彈與游標都交給落地後的 reinstall。
 */
async function navClick(page) {
  await page.evaluate(() => window.__curDown(true)).catch(() => {});
  await sleep(120);
  await page.mouse.down();
  await sleep(80);
  await page.mouse.up();
}

/**
 * 跨頁之後注入的游標會跟舊文件一起消失（installCursor 是打在 document 上的）。
 * 每次換頁都要重裝，並把 __lastCur 接回點擊前的位置 ——
 * 不接的話下一段 moveTo 會從預設的 (640,700) 憑空跳出來。
 */
async function reinstall(page, k, x, y) {
  await k.installCursor(page);
  await page.evaluate(([a, b]) => {
    window.__cur(a, b);
    window.__lastCur = { x: a, y: b };
  }, [x, y]);
}

/**
 * 把 Render 與 Neon 都打醒。
 *
 * 冷啟動的頭幾發 API 會間歇性 500（Neon 睡醒的競態，2026-07-28 實測：
 * 同一條 /api/spaces 先 500 後 200）—— 錄到的話探索頁是一片空。
 * 這段跑在 ready 裡，時間全部算進 lead、會被剪掉，寧可多等。
 */
export async function ready(page) {
  await page.evaluate(async () => {
    const warm = [
      '/api/spaces?keyword=&city=&type=&max_price=0&page=1&per_page=9',
      '/api/spaces/cities',
      // 詳情頁的 API 也要熱——2026-07-28 實錄：只熱列表 API 的話，
      // 走到詳情頁還是一屏骨架等 /api/spaces/1，waitForSelector 直接逾時
      '/api/spaces/1',
      '/api/spaces/1/reviews',
    ];
    for (const u of warm) {
      try {
        await fetch(u);
      } catch {
        /* 打不醒就交給編排裡的 waitForSelector 兜底 */
      }
    }
  });
}

export default async function (page, k) {
  // 游標進場，停在標題下緣 —— 讓 hero 被讀 0.7 秒再動手
  await k.moveTo(page, 632, 396, 420);
  await k.sleep(700);

  // ① 點 hero 的「探索空間」。頁首右上也有一顆同名連結，
  //    所以用座標不用文字選 —— hero 那顆在 (484, 480)。
  await k.moveTo(page, 484, 480, 480);
  await navClick(page);

  // 等探索頁的卡片圖片真的出現（load ≠ 卡片在，資料是 fetch 進來的）
  await page.waitForSelector('a[href*="/space?id="] img', { timeout: 15000 });
  await reinstall(page, k, 484, 480);
  await k.sleep(620); // 三張卡片看一拍：照片、評分、價格

  // ② 點第一張卡（Tiny Desk Studio，中心 575,546）
  await k.moveTo(page, 575, 546, 520);
  await navClick(page);

  // 詳情頁：等大圖與「發起拼場」鈕都到位。
  // 25s 不是隨便放寬：Render 免費層 API 偶爾要 10s+，15s 逾時炸過一次
  await page.waitForSelector('button.corent-start-btn', { timeout: 25000 });
  await page.waitForSelector('main img', { timeout: 25000 });
  await reinstall(page, k, 575, 546);

  // 游標讓開大圖，滑向右欄price／拼場鈕的方向但不點 ——
  // 第三個動作只會讓前兩個都看不清楚
  await k.moveTo(page, 940, 430, 520);
  await k.sleep(2100); // 收尾：大圖＋發起拼場落定
}
