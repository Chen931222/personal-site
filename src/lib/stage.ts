/**
 * 首頁舞台的切換邏輯。
 *
 * 三欄：巨型作品名 ／ 影格 ／ 內容簡介。
 *
 * 互動規格沿用站主自己的「電影式步進展示 v2」：
 * 滾一下換一幕、900ms 冷卻、deltaY ≥ 20。
 * 另加上下鍵、觸控滑動、刻度點選、上下偷看格點擊、分類篩選。
 */
import gsap from 'gsap';
import { EASE_TRANSITION, EASE_HEADING, CURTAIN_OPEN, CURTAIN_SHUT, prefersReduced } from './motion';
import { INTRO_START, INTRO_END } from './intro';

const COOLDOWN = 900;
const DELTA_MIN = 20;

/** 每次 init 換一個 controller，換頁時把上一輪的監聽全部收掉，不累積 */
let live: AbortController | null = null;
let tcTimer = 0;

export function initStage() {
  live?.abort();
  live = null;
  window.clearInterval(tcTimer);

  const stage = document.querySelector<HTMLElement>('[data-stage]');
  if (!stage) return;

  live = new AbortController();
  const { signal } = live;

  const q = gsap.utils.selector(stage);
  const slides = q('[data-slide]') as HTMLElement[];
  const names = q('[data-nm]') as HTMLElement[];
  const infos = q('[data-info]') as HTMLElement[];
  const hits = q('[data-hit]') as HTMLElement[];
  const peekUp = q('.peek--up [data-peek-slot]') as HTMLElement[];
  const peekDn = q('.peek--dn [data-peek-slot]') as HTMLElement[];
  const counter = q('[data-counter]')[0] as HTMLElement | undefined;
  const titleEl = q('[data-title]')[0] as HTMLElement | undefined;
  const catEl = q('[data-cat]')[0] as HTMLElement | undefined;
  const kindEl = q('[data-kind]')[0] as HTMLElement | undefined;
  const announce = q('[data-announce]')[0] as HTMLElement | undefined;
  const cursor = q('[data-cursor]')[0] as HTMLElement | undefined;
  const cursorT = q('[data-cursor-t]')[0] as HTMLElement | undefined;
  const frame = q('[data-frame]')[0] as HTMLElement | undefined;
  const timecode = q('[data-timecode]')[0] as HTMLElement | undefined;
  /** 滿版背景層，跟中央影格共用同一條開合動作 */
  const bgs = q('[data-bg]') as HTMLElement[];

  /**
   * 手機不播背景影片。
   *
   * 一支作品同時要解兩路 720p（背景一路、影格一路）在中階手機上會直接掉格 ——
   * 而背景壓在 0.88 的暗場底下，動不動幾乎看不出來，付這個代價不划算。
   * 影片元素照樣留著（poster 就是首格），所以畫面不會空，只是不動。
   */
  const bgPlays = !reducedMotionOrNarrow();

  function reducedMotionOrNarrow() {
    return prefersReduced() || window.matchMedia('(max-width: 767px)').matches;
  }

  const n = slides.length;
  if (!n) return;

  const reduced = prefersReduced();
  /** 目前輪播的清單（篩選後的索引），以及在其中的位置 */
  let order = slides.map((_, i) => i);
  let pos = 0;
  let busy = false;
  let last = 0;

  /**
   * 正在跑的換幕。
   *
   * 換幕的收尾（把上一格收乾淨）是非同步的 —— 掛在 GSAP 的 onComplete 或 1400ms 逾時上。
   * 在它跑完之前如果又發生別的換幕或篩選，舊的那一格就永遠不會被收，
   * 於是畫面上同時亮著兩三個作品。所以任何新動作開始前，先把上一個結清。
   */
  let flight: { tl: gsap.core.Timeline; finish: () => void } | null = null;

  function settleFlight() {
    if (!flight) return;
    const f = flight;
    flight = null;
    f.tl.kill();
    f.finish(); // 有 done 旗標保護，重複呼叫是安全的
  }

  const cur = () => order[pos];
  const lines = (el: HTMLElement | undefined) =>
    el ? Array.from(el.querySelectorAll('[data-nm-line]')) : [];
  const meta = (i: number, k: string) => slides[i]?.dataset[k] ?? '';

  /**
   * 影格裡的錄影：只有當前這格在播。
   *
   * ⚠️ **不要把 play() 的失敗吞掉。**
   *
   * 原本這裡是 `.catch(() => {})`，註解寫「被擋就算了，poster 仍然看得到」。
   * 那句話是錯的：poster 看得到，但訪客看到的是**一張不會動的截圖** ——
   * 而這個影格的全部意義就是證明「這個網站真的會動」。
   * 失敗了還長得像成功，是最糟的一種壞法。
   *
   * play() 在幾種情況下會被拒，而且每一種都會**沉默地**發生：
   *   - 呼叫的當下這一格還被 clip-path 整個裁掉（交棒動畫還沒跑完），
   *     部分 Chrome 版本會把「看不見」當成不該自動播放
   *   - 瀏覽器的自動播放設定、省電模式、擴充套件
   *   - 影片還沒 ready
   *
   * 所以策略是**一直重試到真的在播**：進場動畫結束後再叫一次、
   * 影片 ready 時再叫一次、第一次使用者手勢時再叫一次。
   */
  let gestureArmed = false;

  function armGestureRetry() {
    if (gestureArmed) return;
    gestureArmed = true;
    // 任何一個手勢都能解開瀏覽器的自動播放限制。once + capture，
    // 不干擾頁面上其他的點擊行為。
    const retry = () => {
      gestureArmed = false;
      syncVideo(cur());
    };
    for (const ev of ['pointerdown', 'keydown', 'wheel', 'touchstart'] as const) {
      document.addEventListener(ev, retry, { once: true, passive: true, capture: true, signal });
    }
  }

  /**
   * 換頁之後，影片的來源要重新掛一次。
   *
   * Astro 的 ClientRouter 是用 `DOMParser` 解析新頁面的 HTML —— **那份文件的 base URL
   * 不是這個站**。於是 `<video src="/media/x.mp4">` 在被搬進活文件之前就已經跑過一次
   * 資源選擇，Chrome 直接判失敗：
   *
   *     networkState = 3 (NETWORK_NO_SOURCE)
   *     error = MEDIA_ELEMENT_ERROR: Media load rejected by URL safety check
   *
   * 節點搬進來之後瀏覽器**不會自己重試**，而且 `play()` 也救不回來（沒有來源可播）。
   * 必須明確叫一次 `load()` 重跑資源選擇 —— 這時 base URL 才是對的。
   *
   * 症狀很難認：第一次進站好好的，站內點一下 WORK／JOURNAL 再回來就變成一張靜態圖，
   * 而且 console 什麼都不說（play() 的 promise 根本沒 reject，它只是永遠等不到資料）。
   *
   * ⚠️ 條件要抓準。`load()` 會把播放位置歸零，看門狗每秒跑一次，
   *    無條件呼叫等於讓影片永遠停在第 0 秒。只在「來源根本沒接上」時才重掛。
   */
  function ensureSource(v: HTMLVideoElement) {
    if (v.error || v.networkState === HTMLMediaElement.NETWORK_NO_SOURCE) {
      v.load();
    }
  }

  function playNow(v: HTMLVideoElement) {
    ensureSource(v);
    const p = v.play();
    if (!p || typeof p.catch !== 'function') return;
    p.catch((err: unknown) => {
      const e = err as { name?: string; message?: string };
      if (import.meta.env.DEV) {
        console.warn(
          `[stage] 影格裡的錄影沒能自動播放：${e?.name ?? ''} ${e?.message ?? ''}\n` +
            '（等第一次使用者互動再試一次。若一直失敗，訪客看到的會是一張靜態封面。）'
        );
      }
      armGestureRetry();
    });
  }

  function syncVideo(i: number) {
    slides.forEach((s, j) => {
      const v = s.querySelector<HTMLVideoElement>('[data-shot-video]');
      if (!v) return;
      if (j === i) {
        v.preload = 'auto';
        // 檔案本身壞掉／404 的話，重試一萬次也沒用 —— 那要看得到才修得掉。
        v.addEventListener(
          'error',
          () => {
            const code = v.error?.code;
            console.error(
              `[stage] 影格的錄影載不起來：${v.currentSrc || v.src}\n` +
                `  MediaError code=${code}（1=中止 2=網路 3=解碼 4=格式不支援或 404）`
            );
          },
          { once: true, signal }
        );
        if (v.readyState >= 2) {
          playNow(v);
        } else {
          // 還沒 ready 就叫 play 有機會直接被拒。先掛 canplay，順便還是試一次。
          v.addEventListener('canplay', () => playNow(v), { once: true, signal });
          playNow(v);
        }
      } else if (!v.paused) {
        v.pause();
      }
    });

    /**
     * 背景那一路。
     *
     * 手機不播（bgPlays=false）—— 一支作品同時解兩路 720p 在中階手機上會掉格，
     * 而背景壓在 0.88 的暗場底下幾乎看不出在動，付這個代價不划算。
     * 不播的時候 poster（首格）照樣顯示，所以畫面不會空。
     */
    bgs.forEach((el, j) => {
      const v = el.querySelector<HTMLVideoElement>('[data-bg-video]');
      if (!v) return;
      if (j === i && bgPlays) {
        v.preload = 'auto';
        playNow(v);
      } else if (!v.paused) {
        v.pause();
      }
    });
  }

  /** 四周儀表：分類、片名、編號、上下偷看格 */
  function syncChrome(i: number) {
    if (counter) counter.textContent = String(pos + 1).padStart(2, '0');
    if (titleEl) titleEl.textContent = meta(i, 'mTitle');
    if (catEl) catEl.textContent = meta(i, 'mCat');
    if (kindEl) kindEl.textContent = meta(i, 'mKind');
    if (cursorT) cursorT.textContent = meta(i, 'mLive') === '1' ? '進站' : '進行中';

    const prev = order[(pos - 1 + order.length) % order.length];
    const next = order[(pos + 1) % order.length];
    peekUp.forEach((el, j) => el.toggleAttribute('data-active', j === prev));
    peekDn.forEach((el, j) => el.toggleAttribute('data-active', j === next));

    if (announce) announce.textContent = `第 ${pos + 1} 個，共 ${order.length} 個：${meta(i, 'mTitle')}`;
  }

  /**
   * 可點的東西是**排他**的：覆蓋在影格上的連結永遠只有一個是活的。
   *
   * 交叉淡接時新舊兩格會短暫並存（那是對的，視覺上要疊在一起），
   * 但兩個全幅連結同時 display:block 會讓使用者有兩個重疊的點擊區。
   * 右欄的「進站」按鈕不需要另外處理 —— 它在 .info__i 裡面，
   * 非作用中的 .info__i 是 visibility:hidden，瀏覽器本來就會把它移出 tab 順序。
   */
  function arm(i: number) {
    hits.forEach((el, j) => el.toggleAttribute('data-active', j === i));
  }

  /**
   * 名字、影格與簡介的呈現狀態 —— 交叉淡接期間可以短暫並存。
   *
   * 沒有這一步，螢幕閱讀器會把十三個作品的名字與簡介全部念一遍，
   * 使用者看到的只有一個。
   * 名字欄整個 aria-hidden（純視覺，內容在簡介欄與 sr-only 播報裡都有）；
   * 簡介欄含可聚焦的「進站」，所以只靠 visibility 收，不下 aria-hidden
   * （aria-hidden 的子樹裡放可聚焦元素本身就是 4.1.2 的失敗）。
   */
  function expose(i: number, on: boolean) {
    names[i]?.toggleAttribute('data-active', on);
    infos[i]?.toggleAttribute('data-active', on);
    if (slides[i]) {
      if (on) slides[i].removeAttribute('aria-hidden');
      else slides[i].setAttribute('aria-hidden', 'true');
    }
  }

  /** 一格就位需要的全部狀態改動。純狀態，不含動畫。 */
  function adopt(i: number) {
    arm(i);
    expose(i, true);
    syncChrome(i);
    syncVideo(i);
  }

  /** 把某一格設為就位的靜態狀態（不動畫） */
  function settle(i: number) {
    gsap.set(slides[i], { autoAlpha: 1, clipPath: CURTAIN_OPEN });
    gsap.set(bgs[i], { autoAlpha: 1, clipPath: CURTAIN_OPEN });
    gsap.set(lines(names[i]), { y: '0%' });
    gsap.set(infos[i], { autoAlpha: 1, y: 0 });
    adopt(i);
  }

  /** 把某一格藏起來 */
  function hide(i: number) {
    gsap.set(slides[i], { autoAlpha: 0, clipPath: CURTAIN_SHUT });
    gsap.set(bgs[i], { autoAlpha: 0, clipPath: CURTAIN_SHUT });
    gsap.set(lines(names[i]), { y: '112%' });
    gsap.set(infos[i], { autoAlpha: 0, y: 14 });
    expose(i, false);
  }

  const hideAll = () => {
    for (let i = 0; i < n; i++) hide(i);
  };

  /**
   * 除了指定那一格，其餘全部收乾淨。
   *
   * 篩選的 bug 就是差這一步：原本只叫 `hide(oldIndex)`，只收「點下去的當下那一格」。
   * 但換幕的收尾是掛在 GSAP 的 onComplete／1400ms 逾時上的非同步動作 ——
   * 在它跑完之前按篩選，舊的那格永遠不會被收，於是名字、簡介、按鈕整組疊在一起
   * （站主實測：三個作品名和兩份簡介同時亮著）。
   *
   * 不要試圖去追「哪幾格還亮著」—— 直接宣告最終狀態最便宜也最不會漏。
   */
  function hideAllExcept(i: number) {
    for (let j = 0; j < n; j++) if (j !== i) hide(j);
  }

  hideAll();

  /**
   * 某一格的進場動畫。狀態已經由 adopt() 同步設好，這裡只動視覺。
   *
   * onComplete 再叫一次 syncVideo 是必要的，不是保險：
   * adopt() 呼叫 play() 的那一刻，這一格還被 clip-path 整個裁在中線上 ——
   * 部分 Chrome 版本會把「畫面上看不見」當成不該自動播放而拒絕，
   * 而且拒絕得無聲無息。等它真的張開之後再叫一次，才是它看得見的時候。
   */
  function enter(i: number, o: { clip: number; lines: number; at: number }) {
    const tl = gsap.timeline({
      onComplete: () => {
        flight = null;
        syncVideo(cur());
      },
    });
    // 進場也要登記。不登記的話連按篩選時，上一次的進場動畫還在跑，
    // 會把已經收掉的簡介欄一路推回可見 —— 實測連點六個分類之後畫面上有四顆「進站」。
    flight = { tl, finish: () => { flight = null; } };
    tl.set(slides[i], { autoAlpha: 1 });
    tl.set(bgs[i], { autoAlpha: 1 }, 0);
    // clip-path 一律 fromTo：getComputedStyle 回傳的 polygon 點是像素，就算你寫的是 %
    tl.fromTo(
      slides[i],
      { clipPath: CURTAIN_SHUT },
      { clipPath: CURTAIN_OPEN, duration: o.clip, ease: EASE_TRANSITION },
      0
    );
    // 背景比影格慢一點、晚一點收 —— 同一個動作的兩個深度。
    // 兩層完全同步的話會讀成一張圖在放大，看不出「後面還有一層」。
    tl.fromTo(
      bgs[i],
      { clipPath: CURTAIN_SHUT },
      { clipPath: CURTAIN_OPEN, duration: o.clip * 1.25, ease: EASE_TRANSITION },
      0
    );
    tl.fromTo(
      lines(names[i]),
      { y: '112%' },
      { y: '0%', duration: o.lines, stagger: 0.07, ease: EASE_HEADING },
      o.at
    );
    tl.fromTo(
      infos[i],
      { autoAlpha: 0, y: 14 },
      { autoAlpha: 1, y: 0, duration: 0.7, ease: EASE_TRANSITION },
      o.at + 0.18
    );
    return tl;
  }

  /** 交棒進場 —— 銀幕從中央拉開，承接開場最後留下的那個口 */
  function reveal() {
    const i = cur();
    adopt(i);
    if (reduced) {
      settle(i);
      return;
    }
    enter(i, { clip: 1.15, lines: 1.0, at: 0.22 });
  }

  /** 換一幕。dir: 1 往下（後面的作品）、-1 往上 */
  function go(toPos: number, dir: number) {
    const next = ((toPos % order.length) + order.length) % order.length;
    if (next === pos || busy) return;
    busy = true;

    // 交棒進場（enter）還在跑時滑一下：不先殺掉它，它的淡入會跟這裡的淡出搶同一個元素，
    // 淡出 0.34s 先跑完，淡入繼續把舊簡介推回可見 —— 手機上兩張作品的文字疊在一起。
    settleFlight();
    hideAllExcept(cur());

    const from = cur();
    pos = next;
    const to = cur();

    // 狀態一律同步改，不掛在 GSAP 回呼上。
    // 回呼跑在 rAF 上，背景分頁會凍結 —— 那時儀表會停在舊作品的分類與片名，
    // 使用者切回來看到的讀數跟畫面對不上。動畫可以慢，讀數不能錯。
    adopt(to);

    if (reduced) {
      hide(from);
      settle(to);
      busy = false;
      return;
    }

    // 垂直片盤：往下捲時舊的往上出、新的從下面進來
    const outY = dir > 0 ? '-112%' : '112%';
    const inY = dir > 0 ? '112%' : '-112%';

    /**
     * 收尾只做一次，而且一定會做。
     *
     * 只掛 onComplete 是不夠的：GSAP 的 ticker 跑在 rAF 上，
     * 背景分頁會凍結它 —— 使用者在背景分頁滾了一下，busy 就永遠停在 true，
     * 切回來之後輪播整個不能動了。逾時保險比動畫本身重要。
     */
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      expose(from, false);
      busy = false;
      flight = null;
    };
    window.setTimeout(finish, 1400);

    const tl = gsap.timeline({ defaults: { ease: EASE_TRANSITION }, onComplete: finish });
    flight = { tl, finish };

    tl.to(lines(names[from]), { y: outY, duration: 0.5, stagger: 0.04 }, 0);
    tl.to(infos[from], { autoAlpha: 0, y: dir > 0 ? -10 : 10, duration: 0.34 }, 0);
    tl.to(slides[from], { autoAlpha: 0, duration: 0.5 }, 0.14);
    tl.to(bgs[from], { autoAlpha: 0, duration: 0.62 }, 0.14);

    tl.set(lines(names[to]), { y: inY }, 0);
    tl.set(slides[to], { autoAlpha: 1 }, 0.16);
    tl.set(bgs[to], { autoAlpha: 1 }, 0.16);
    tl.fromTo(
      slides[to],
      { clipPath: CURTAIN_SHUT },
      { clipPath: CURTAIN_OPEN, duration: 0.78, ease: EASE_TRANSITION },
      0.16
    );
    tl.fromTo(
      bgs[to],
      { clipPath: CURTAIN_SHUT },
      { clipPath: CURTAIN_OPEN, duration: 0.98, ease: EASE_TRANSITION },
      0.16
    );
    tl.to(lines(names[to]), { y: '0%', duration: 0.8, stagger: 0.05, ease: EASE_HEADING }, 0.28);
    tl.fromTo(
      infos[to],
      { autoAlpha: 0, y: dir > 0 ? 14 : -14 },
      { autoAlpha: 1, y: 0, duration: 0.6, ease: EASE_TRANSITION },
      0.42
    );
  }

  const step = (dir: number) => go(pos + dir, dir);

  /** 冷卻：一次手勢只換一幕，不會滾過頭 */
  function cooled() {
    const now = performance.now();
    if (now - last < COOLDOWN) return false;
    last = now;
    return true;
  }

  // ── 篩選 ────────────────────────────────────────────────────────
  const filterBtns = q('[data-filter]') as HTMLElement[];
  filterBtns.forEach((b) =>
    b.addEventListener(
      'click',
      () => {
        const tag = b.dataset.filter ?? '';
        const next = tag
          ? slides.map((_, i) => i).filter((i) => meta(i, 'mCat') === tag)
          : slides.map((_, i) => i);
        if (!next.length) return;

        filterBtns.forEach((x) => x.classList.toggle('is-on', x === b));

        // 換幕可能還在跑（滾一下之後馬上按篩選）。先把它結清，
        // 否則它的收尾會在幾百毫秒後才跑，那時 from 已經是別格了。
        settleFlight();

        const oldIndex = cur();
        const keep = next.indexOf(oldIndex);
        order = next;

        if (keep >= 0) {
          // 目前這格還在篩選結果裡 —— 不換畫面，只重算編號與上下偷看格。
          //
          // 但**一定要明確設回就位狀態**。上一次的進場動畫剛剛被 settleFlight() 殺掉，
          // 元素會停在半途的 inline 樣式（autoAlpha 0.4 之類）。只收別格不管自己，
          // 連點幾下之後簡介欄就整個不見了 —— 實測簡介亮=0、進站鈕=0。
          pos = keep;
          hideAllExcept(oldIndex);
          settle(oldIndex);
        } else {
          // 目前這格被篩掉了，跳到新集合的第一件
          pos = 0;
          busy = false;
          // 收乾淨「除了目標以外的全部」，不是只收 oldIndex ——
          // 見 hideAllExcept 的說明：只收一格會讓名字與簡介疊成一團。
          hideAllExcept(cur());
          adopt(cur());
          if (reduced) settle(cur());
          else enter(cur(), { clip: 0.7, lines: 0.75, at: 0.12 });
        }
      },
      { signal }
    )
  );

  // ── 捲動 ────────────────────────────────────────────────────────
  stage.addEventListener(
    'wheel',
    (e) => {
      const d = Math.abs(e.deltaY) >= Math.abs(e.deltaX) ? e.deltaY : e.deltaX;
      if (Math.abs(d) < DELTA_MIN) return;
      if (!cooled()) return;
      step(d > 0 ? 1 : -1);
    },
    { passive: true, signal }
  );

  // ── 鍵盤 ────────────────────────────────────────────────────────
  window.addEventListener(
    'keydown',
    (e) => {
      const t = e.target as HTMLElement | null;
      if (t && /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)) return;
      if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
        if (cooled()) step(1);
      } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
        if (cooled()) step(-1);
      }
    },
    { signal }
  );

  // ── 觸控 ────────────────────────────────────────────────────────
  let tx = 0;
  let ty = 0;
  stage.addEventListener(
    'touchstart',
    (e) => {
      tx = e.touches[0].clientX;
      ty = e.touches[0].clientY;
    },
    { passive: true, signal }
  );
  stage.addEventListener(
    'touchend',
    (e) => {
      const dx = e.changedTouches[0].clientX - tx;
      const dy = e.changedTouches[0].clientY - ty;
      const d = Math.abs(dy) > Math.abs(dx) ? -dy : -dx;
      if (Math.abs(d) < 42) return;
      if (!cooled()) return;
      step(d > 0 ? 1 : -1);
    },
    { passive: true, signal }
  );

  // ── 上下偷看格與刻度 ────────────────────────────────────────────
  (q('[data-peek]') as HTMLElement[]).forEach((b) =>
    b.addEventListener(
      'click',
      () => {
        last = performance.now();
        step(Number(b.dataset.peek));
      },
      { signal }
    )
  );


  // ── 游標跟隨標籤（桌面） ────────────────────────────────────────
  if (cursor && frame && !reduced) {
    const setX = gsap.quickTo(cursor, 'x', { duration: 0.35, ease: 'power3' });
    const setY = gsap.quickTo(cursor, 'y', { duration: 0.35, ease: 'power3' });
    window.addEventListener(
      'pointermove',
      (e) => {
        setX(e.clientX + 16);
        setY(e.clientY + 16);
      },
      { passive: true, signal }
    );
    frame.addEventListener('pointerenter', () => gsap.to(cursor, { opacity: 1, duration: 0.22 }), { signal });
    frame.addEventListener('pointerleave', () => gsap.to(cursor, { opacity: 0, duration: 0.22 }), { signal });
  }

  // ── 時間碼 ──────────────────────────────────────────────────────
  // 放映機在跑的讀數。純裝飾（aria-hidden），10Hz，reduced-motion 下靜止。
  if (timecode && !reduced) {
    const t0 = performance.now();
    const pad = (v: number) => String(Math.floor(v)).padStart(2, '0');
    tcTimer = window.setInterval(() => {
      if (signal.aborted) {
        window.clearInterval(tcTimer);
        return;
      }
      const s = (performance.now() - t0) / 1000;
      timecode.textContent = `${pad(s / 60)}:${pad(s % 60)}:${pad((s % 1) * 100)}`;
    }, 100);
  }

  /**
   * ── 錄影看門狗 ──────────────────────────────────────────────────
   *
   * 影格靜止不動是這一頁最糟的壞法：它跟「一張精心挑選的截圖」長得一模一樣，
   * 沒有錯誤、沒有破圖，訪客只會覺得「喔，是張圖」—— 而這一頁的全部意義
   * 就是證明這些網站真的會動。
   *
   * play() 被拒的原因太多（自動播放設定、省電模式、擴充套件、呼叫時還被裁掉），
   * 而且每一種都靜悄悄。與其一一猜，不如**直接看它有沒有在動**：
   * 每秒比對一次 currentTime，沒前進就再叫一次。
   *
   * 成本是每秒一次讀屬性；換掉的是「看起來好好的但其實壞了」。
   */
  if (!reduced) {
    let lastT = -1;
    const watchdog = window.setInterval(() => {
      if (signal.aborted) {
        window.clearInterval(watchdog);
        return;
      }
      if (document.hidden || busy) return; // 背景分頁本來就會停，換幕中也不算
      const v = slides[cur()]?.querySelector<HTMLVideoElement>('[data-shot-video]');
      if (!v) return;
      const t = v.currentTime;
      if (v.paused || t === lastT) playNow(v);
      lastT = t;
    }, 1000);
  }

  // ── 與開場的交棒 ────────────────────────────────────────────────
  // 開場可以重播，所以這兩個監聽不能是 once。
  // 開場一開始就把舞台整個收乾淨，避免重播時舊畫面還亮在後面。
  document.addEventListener(INTRO_START, hideAll, { signal });
  document.addEventListener(INTRO_END, reveal, { signal });

  // 保險：萬一開場整個沒跑起來（腳本例外、rAF 被凍住），舞台不能跟著卡死。
  // 開場還在畫面上時不介入 —— 讓它自己跑完再交棒。
  window.setTimeout(() => {
    if (signal.aborted) return;
    if (names[cur()]?.hasAttribute('data-active')) return;
    const root = document.querySelector('[data-intro-root]');
    if (root && !root.hasAttribute('hidden')) return;
    settle(cur());
  }, 1400);
}
