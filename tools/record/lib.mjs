/**
 * 錄影編排的共用動作。
 *
 * 為什麼是腳本不是手錄：
 *   ① 手錄的游標會晃、節奏會抖，13 支的手感不會一致
 *   ② 站改版之後手錄要全部重來，腳本重跑一次就好
 *   ③ 尺寸、長度、檔案大小可以精準控制（影格是 16:9，錄成 16:10 就得裁）
 *
 * 節奏的規矩（改之前先想清楚）：
 *   - 每個動作前後都要留白。沒有停頓的操作看起來像故障，不像示範。
 *   - 游標用 ease 移動，不走直線等速 —— 等速的游標一眼就知道是機器。
 *   - 一支影片最多兩個動作。第三個動作只會讓前兩個都看不清楚。
 */

/** 站主自己的 ease 家族，錄影跟網站用同一條曲線 */
const EASE = (t) => 1 - Math.pow(1 - t, 3); // power3.out

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * ⚠️ move / scrollTo 的 ms 不是實際秒數，大約是實際的一半。
 *
 * 每一步除了 sleep(16) 還要跟瀏覽器來回一趟（evaluate ＋ mouse.move），
 * 實測一步約 31ms。也就是 `move: 800` 跑出來大概是 1.6 秒。
 *
 * **不要「修好」它。** 現有 9 支編排都是照這個實際行為調出來的，
 * 改成準確計時會讓每一支瞬間快一倍、長度全部掉到 4 秒。
 * 要改就得連 9 支的參數一起重調 —— 那是一次獨立的工作，不是順手做。
 */

/** 一支影片的目標長度。理由見 README —— 8 秒 = 兩個動作 ＋ 呼吸。 */
export const TARGET_MS = 8000;

/**
 * 注入一顆看得見的游標。
 *
 * 點擊型的示範沒有游標的話，畫面會無緣無故自己變，讀起來像故障。
 *
 * ⚠️ 它必須在**深底與淺底上都看得見**。這 9 個站有黑底（唱片架）也有米白紙感
 *    （五層規劃、Mi Español）—— 單純的白圈移動途中看得到，一停到白色按鈕上就整個消失，
 *    而消失的那一刻正好是「按下去」，因果就斷了。
 *    所以是雙層環：外圈深、內圈亮，任何背景上都有一邊會浮出來。
 *    （不用 mix-blend-mode: difference —— 它會把紅底翻成青色，等於憑空多一個顏色。）
 */
export async function installCursor(page) {
  await page.addStyleTag({
    content: `
      #__rec_cur {
        position: fixed; left: 0; top: 0; z-index: 2147483647;
        width: 20px; height: 20px; margin: -10px 0 0 -10px;
        border: 2px solid rgba(255,255,255,.95);
        border-radius: 50%; pointer-events: none;
        /* 內外各補一圈深色：白底靠它、深底靠白環本身 */
        box-shadow:
          0 0 0 1.5px rgba(0,0,0,.55),
          inset 0 0 0 1.5px rgba(0,0,0,.45),
          0 1px 6px rgba(0,0,0,.35);
        transition: transform .12s ease-out, opacity .2s;
        opacity: 0;
      }
      /* 中心點：環在小按鈕上會框住整顆按鈕，看不出「點在哪」 */
      #__rec_cur::after {
        content: ''; position: absolute; inset: 6px;
        border-radius: 50%; background: rgba(255,255,255,.95);
        box-shadow: 0 0 0 1px rgba(0,0,0,.5);
      }
      #__rec_cur.is-down { transform: scale(.6); }
    `,
  });
  await page.evaluate(() => {
    const d = document.createElement('div');
    d.id = '__rec_cur';
    document.body.appendChild(d);
    window.__cur = (x, y) => {
      d.style.left = x + 'px';
      d.style.top = y + 'px';
      d.style.opacity = '1';
    };
    window.__curDown = (v) => d.classList.toggle('is-down', v);
    window.__curHide = () => (d.style.opacity = '0');
  });
}

/** 游標帶 ease 移到某個座標 */
export async function moveTo(page, x, y, ms = 700) {
  const steps = Math.max(2, Math.round(ms / 16));
  const from = (await page.evaluate(() => window.__lastCur)) || { x: 640, y: 700 };
  for (let i = 1; i <= steps; i++) {
    const t = EASE(i / steps);
    const cx = from.x + (x - from.x) * t;
    const cy = from.y + (y - from.y) * t;
    await page.evaluate(([a, b]) => {
      window.__cur(a, b);
      window.__lastCur = { x: a, y: b };
    }, [cx, cy]);
    await page.mouse.move(cx, cy);
    await sleep(16);
  }
}

/** 移到某個元素的中心 */
export async function moveToEl(page, selector, ms = 700, nth = 0) {
  const box = await page.evaluate(
    ([sel, n]) => {
      const el = document.querySelectorAll(sel)[n];
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    },
    [selector, nth]
  );
  if (!box) throw new Error(`找不到 ${selector}[${nth}]`);
  await moveTo(page, box.x, box.y, ms);
  return box;
}

/** 按下去（含游標的縮放回饋），前後自帶停頓 */
export async function click(page, { settle = 900 } = {}) {
  await page.evaluate(() => window.__curDown(true));
  await sleep(120);
  await page.mouse.down();
  await sleep(80);
  await page.mouse.up();
  await page.evaluate(() => window.__curDown(false));
  await sleep(settle);
}

/** 移過去然後按下去 —— 最常用的一組 */
export async function tap(page, selector, { move = 700, settle = 900, nth = 0 } = {}) {
  await moveToEl(page, selector, move, nth);
  await sleep(160); // 停一下再按。人不會碰到就立刻點。
  await click(page, { settle });
}

/** 帶 ease 的捲動。不用 scrollTo({behavior:'smooth'})，那條曲線不是我們的。 */
export async function scrollTo(page, y, ms = 1400) {
  const steps = Math.max(2, Math.round(ms / 16));
  const from = await page.evaluate(() => window.scrollY);
  for (let i = 1; i <= steps; i++) {
    const t = EASE(i / steps);
    await page.evaluate((v) => window.scrollTo(0, v), from + (y - from) * t);
    await sleep(16);
  }
}

/** 捲到整份文件的某個比例 */
export async function scrollToPct(page, pct, ms = 1400) {
  const y = await page.evaluate(
    (p) => (document.documentElement.scrollHeight - innerHeight) * p,
    pct
  );
  await scrollTo(page, y, ms);
}

export { sleep };
