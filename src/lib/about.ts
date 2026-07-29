/**
 * 首頁「關於我」那一段的動態。
 *
 * 只有兩件事：
 *   ① 幕 ① 的銀幕拉開 —— 承接開場最後兩半名字之間留下的那個口。
 *      跟舞台用同一組 clip-path 常數，因為它們是同一個裝置。
 *   ② 各幕進場的小位移淡入（IntersectionObserver 加 class，動畫交給 CSS）。
 *
 * 刻意不用 GSAP 的捲動外掛跑 ②：進場只有一種、只跑一次，
 * 用 rAF 每格算位置換來的只有電池消耗。IO 是瀏覽器自己算的。
 *
 * 兩段各自包在 try 裡。它們共用一個進入點，但不該共用一條命 ——
 * 銀幕壞掉最多是少一個動作，進場沒掛好是整個下半頁留在 opacity:0。
 */
import gsap from 'gsap';
import { EASE_TRANSITION, CURTAIN_OPEN, CURTAIN_SHUT, prefersReduced } from './motion';
import { INTRO_START, INTRO_END } from './intro';

let live: AbortController | null = null;
let io: IntersectionObserver | null = null;

export function initAbout() {
  live?.abort();
  live = null;
  io?.disconnect();
  io = null;

  const hero = document.querySelector<HTMLElement>('[data-hero]');
  const rises = Array.from(document.querySelectorAll<HTMLElement>('[data-rise]'));
  if (!hero && !rises.length) return;

  live = new AbortController();
  const { signal } = live;
  const reduced = prefersReduced();

  // ── ① 銀幕與捲動提示 ──────────────────────────────────────────────
  try {
    const frame = hero?.querySelector<HTMLElement>('[data-hero-frame]');

    if (frame) {
      // 開場真的播過才需要「拉開」的動作。回訪者（開場被 session 跳過）
      // 收到的是同一個 INTRO_END 事件，但他們的畫面上什麼都沒發生過 ——
      // 對他們播一次閉合再拉開，等於憑空多一個沒有來由的動畫。
      let curtained = false;

      const shut = () => {
        curtained = true;
        gsap.set(frame, { clipPath: CURTAIN_SHUT });
      };

      const open = () => {
        if (!curtained || reduced) {
          gsap.set(frame, { clipPath: CURTAIN_OPEN });
          return;
        }
        gsap.fromTo(
          frame,
          { clipPath: CURTAIN_SHUT },
          { clipPath: CURTAIN_OPEN, duration: 1.02, ease: EASE_TRANSITION }
        );
      };

      // 開場可以重播，所以這兩個監聽不能是 once
      document.addEventListener(INTRO_START, shut, { signal });
      document.addEventListener(INTRO_END, open, { signal });

      // 保險：開場整個沒跑起來（腳本例外、rAF 被凍住）時，臉不能永遠關在幕後。
      // 開場還在畫面上就不介入 —— 讓它自己跑完再交棒。
      window.setTimeout(() => {
        if (signal.aborted) return;
        const root = document.querySelector('[data-intro-root]');
        if (root && !root.hasAttribute('hidden')) return;
        open();
      }, 1400);
    }

    const cue = hero?.querySelector<HTMLElement>('[data-hero-cue]');
    if (cue) {
      const sync = () => {
        if (window.scrollY > 40) cue.setAttribute('data-gone', '');
        else cue.removeAttribute('data-gone');
      };
      window.addEventListener('scroll', sync, { passive: true, signal });
      sync();
    }
  } catch {
    /* 銀幕沒接上不影響下面。1400ms 的保險本身也可能沒掛上 ——
       所以 CSS 那條閉合狀態只在 html[data-js] 時才生效，
       而 <head> 的保險會在 2.5 秒後把 data-js 拆掉。 */
  }

  // ── ② 進場 ────────────────────────────────────────────────────────
  if (!rises.length) return;

  const showAll = () => rises.forEach((el) => el.classList.add('is-in'));

  // 減少動態、或瀏覽器沒有 IO：直接呈現最終狀態
  if (reduced || typeof IntersectionObserver !== 'function') {
    showAll();
    return;
  }

  try {
    /**
     * 保險的判準是「觀察者有沒有活著」，不是「有沒有東西亮起來」。
     *
     * 首頁所有 [data-rise] 一開始都在摺線以下，健康的觀察者也不會馬上點亮任何一個；
     * 用「都還沒亮」當判準會在使用者慢慢讀的時候誤判，把整頁一次攤開。
     * IO 對每一個 observe 的目標都會先送一次初始回呼（不管有沒有相交）——
     * 那一次沒來，才是真的沒在跑。
     */
    let delivered = false;

    io = new IntersectionObserver(
      (entries, obs) => {
        delivered = true;
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          e.target.classList.add('is-in');
          obs.unobserve(e.target); // 只進場一次，不做來回
        }
      },
      // 底部收 12%：元素要真的進來一截才亮，擦邊而過不算
      { rootMargin: '0px 0px -12% 0px', threshold: 0.01 }
    );

    rises.forEach((el) => io?.observe(el));

    window.setTimeout(() => {
      if (signal.aborted || delivered) return;
      showAll();
    }, 4000);

    signal.addEventListener('abort', () => {
      io?.disconnect();
      io = null;
    });
  } catch {
    showAll();
  }
}
