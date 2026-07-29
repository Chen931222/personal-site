/**
 * 開場動畫的時間軸。
 *
 * 四拍，總長 ≈ 4.3s：
 *   ① 0.00  兩列膠捲反向轉起（一次性長滑，power3.out —— 轉起來然後自己定格）
 *   ② 0.18  片頭字卡由下升起 → 1.05 升出鏡
 *   ③ 1.18  里程表接位，00 → 99，數到底閃一格紅
 *   ④ 2.70  名字左右兩半的 width 長出來，實體把膠捲推出畫面
 *   ⑤ 3.74  交棒給舞台（銀幕從中央拉開），開場淡出
 *
 * 參考站的完整版是 7.95s（含延遲約 8.95s 才進得了內容）。
 * 那是導演的招牌片頭，他負擔得起；一個要讓陌生人點進作品的作品集不該收這個過路費。
 * 這裡是重新配速的短版，保留全部四拍。
 *
 * **可重播**：點頁首的名字會再放一次。所以這支不能把 DOM 移除，
 * 而且每一段都必須用 fromTo —— 用 to 的話第二次會從上一次的終點開始，
 * 字卡會變成由上往下掉，方向整個反過來。
 *
 * 中途可跳過：點擊、任意鍵、捲動、觸控、或右下角的跳過鍵。
 */
import gsap from 'gsap';
import { EASE_TRANSITION, EASE_HEADING, prefersReduced } from './motion';

const SESSION_KEY = 'screening-room:intro-played';
export const INTRO_START = 'intro:start';
export const INTRO_END = 'intro:done';

const fire = (name: string) => document.dispatchEvent(new CustomEvent(name));

function unlockScroll() {
  document.documentElement.style.removeProperty('overflow');
}

/** 收起來，不移除 —— 重播還要用 */
function stow(root: HTMLElement) {
  root.setAttribute('hidden', '');
  unlockScroll();
}

/** 目前這一輪的時間軸與監聽，重播前要先收乾淨 */
let running: { tl: gsap.core.Timeline; ac: AbortController } | null = null;

export function playIntro(opts: { force?: boolean } = {}) {
  const root = document.querySelector<HTMLElement>('[data-intro-root]');
  if (!root) {
    fire(INTRO_END);
    return;
  }

  // 上一輪還在跑就先掐掉，不然兩條時間軸會互相打架
  if (running) {
    running.ac.abort();
    running.tl.kill();
    running = null;
  }

  let played = false;
  try {
    played = sessionStorage.getItem(SESSION_KEY) === '1';
  } catch {
    /* 隱私模式下 sessionStorage 會丟例外 —— 當成沒播過就好 */
  }

  // 帶著 #錨點 進站的人指名要去某一段，不該先被關進四秒的片頭。
  // （而且開場會鎖捲動 —— 鎖住之後瀏覽器就跳不到錨點了。）
  if (!opts.force && (played || prefersReduced() || location.hash)) {
    stow(root);
    fire(INTRO_END);
    return;
  }

  try {
    sessionStorage.setItem(SESSION_KEY, '1');
  } catch {
    /* 同上，寫不進去就算了 */
  }

  root.removeAttribute('hidden');
  // 這個屬性是 <head> 那支 inline script 為了避免「閃一下才消失」而下的。
  // 真的要播的時候必須拿掉，否則 CSS 會把整段開場壓成 display:none。
  document.documentElement.removeAttribute('data-no-intro');

  // 首頁現在是可以往下捲的。從第三幕按「重播開場」而不回到頂端的話，
  // 開場結束時交棒的那個口在畫面外，看到的會是一段空白。
  // 用 'instant' 不是 smooth —— 全域的 scroll-behavior:smooth 會讓它跟開場搶時間。
  window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });

  document.documentElement.style.overflow = 'hidden';
  fire(INTRO_START);

  const q = gsap.utils.selector(root);
  const stripL = q('[data-strip="l"]')[0] as HTMLElement | undefined;
  const stripR = q('[data-strip="r"]')[0] as HTMLElement | undefined;
  const cardMono = q('[data-card-mono]');
  const cardRows = q('[data-card-row]');
  const odo = q('[data-odo]')[0] as HTMLElement | undefined;
  const stripT = q('[data-odo-strip="t"]')[0] as HTMLElement | undefined;
  const stripO = q('[data-odo-strip="o"]')[0] as HTMLElement | undefined;
  const halves = q('[data-half]');
  const names = q('[data-name]');
  const skip = q('[data-skip]')[0] as HTMLElement | undefined;

  /**
   * 里程表：兩條 0…9,0 的數字條（各 11 格），共用同一條 ease 往上跑。
   *
   * 用 yPercent 而不是 px —— 不吃字體載入時機、不吃視窗尺寸。
   * 而且是真正的 tween，不是 onUpdate 回呼：回呼會被 seek、暫停與背景分頁抑制，
   * 靠回呼驅動的數字在那些情況下會整個停在 00。
   *
   * 個位跑 99 格，用 modifier 折回 0–10 格之間（第 11 格與第 1 格同字形，接縫看不出來）；
   * 十位跑 9 格。兩者同時抵達終點 → 停在 99。
   */
  const CELL = 100 / 11;
  const ODO_DUR = 1.35;
  const wrapOnes = (v: string | number) => parseFloat(String(v)) % (CELL * 10);

  const tl = gsap.timeline({
    defaults: { ease: EASE_TRANSITION },
    onComplete: () => {
      stow(root);
      running = null;
    },
  });

  // ── ① 膠捲：一次性長滑，在名字推開它之前自己慢下來停住 ──────────
  if (stripL) tl.fromTo(stripL, { yPercent: 0 }, { yPercent: -50, duration: 3.4, ease: 'power3.out' }, 0);
  if (stripR) tl.fromTo(stripR, { yPercent: -50 }, { yPercent: 0, duration: 3.4, ease: 'power3.out' }, 0);

  // ── ② 片頭字卡 ────────────────────────────────────────────────
  tl.fromTo(cardMono, { opacity: 0 }, { opacity: 1, duration: 0.42, ease: 'power3.out' }, 0.04);
  tl.fromTo(cardRows, { y: '110%' }, { y: '0%', duration: 0.78, stagger: 0.08, ease: 'power3.out' }, 0.18);
  if (skip) tl.fromTo(skip, { opacity: 0 }, { opacity: 1, duration: 0.4 }, 0.55);

  tl.to(cardMono, { opacity: 0, duration: 0.32, ease: 'power1.in' }, 1.0);
  tl.to(cardRows, { y: '-110%', duration: 0.48, stagger: 0.06, ease: 'power1.in' }, 1.05);

  // ── ③ 里程表 00 → 99 ──────────────────────────────────────────
  if (odo) tl.fromTo(odo, { opacity: 0, y: 42, color: 'var(--paper)' }, { opacity: 1, y: 0, duration: 0.4 }, 1.18);
  if (stripO) {
    tl.fromTo(
      stripO,
      { yPercent: 0 },
      { yPercent: -CELL * 99, duration: ODO_DUR, ease: EASE_TRANSITION, modifiers: { yPercent: wrapOnes } },
      1.24
    );
  }
  if (stripT) {
    tl.fromTo(stripT, { yPercent: 0 }, { yPercent: -CELL * 9, duration: ODO_DUR, ease: EASE_TRANSITION }, 1.24);
  }
  // 數到底閃一格紅 —— academy leader 的那一下
  if (odo) {
    tl.to(odo, { color: 'var(--red)', duration: 0.08 }, 2.5);
    tl.to(odo, { color: 'var(--paper)', duration: 0.28 }, 2.62);
    tl.to(odo, { opacity: 0, y: -46, duration: 0.42 }, 2.64);
  }

  // ── ④ 名字展開，把膠捲推出去 ──────────────────────────────────
  // 兩半各 50vw → 合計 100vw，必定把兩列膠捲推出畫面外。
  // 落定時間刻意排在交棒之前 —— 這是整段的高潮，要有一拍讓人看清楚，
  // 不能一邊淡出一邊還在升上來。
  tl.fromTo(halves, { width: 0 }, { width: '50vw', duration: 0.88 }, 2.7);
  tl.fromTo(names, { y: '110%' }, { y: '0%', duration: 0.8, stagger: 0.06, ease: EASE_HEADING }, 2.74);
  if (skip) tl.to(skip, { opacity: 0, duration: 0.3 }, 2.72);

  // ── ⑤ 交棒：舞台從中央拉開，開場淡出 ─────────────────────────
  // 刻意重疊：舞台先開始拉開，開場才淡掉，兩者疊在一起才是溶接。
  // 不要「整理」成先後順序 —— 那會變成兩段各自播完的接力。
  tl.call(() => fire(INTRO_END), undefined, 3.74);
  tl.fromTo(root, { opacity: 1 }, { opacity: 0, duration: 0.46, ease: 'power2.inOut' }, 3.78);

  // 開發期的檢查孔：可以 __intro.seek(t) 逐格驗證編排，
  // 不必依賴 requestAnimationFrame（背景分頁會凍結 rAF）。build 時會被移除。
  if (import.meta.env.DEV) {
    (window as unknown as Record<string, unknown>).__intro = tl;
  }

  // ── 跳過 ──────────────────────────────────────────────────────
  const ac = new AbortController();
  running = { tl, ac };

  let bailed = false;
  const bail = () => {
    if (bailed) return;
    bailed = true;
    ac.abort();
    // 不是硬切：把剩下的時間軸加速跑完，讓交棒仍然成立
    gsap.to(tl, { progress: 1, duration: 0.42, ease: 'power2.in', overwrite: true });
  };

  const { signal } = ac;
  window.addEventListener(
    'keydown',
    (e) => {
      if (e.key === 'Tab') return; // 讓使用者能 Tab 到跳過鍵
      bail();
    },
    { signal }
  );
  window.addEventListener('wheel', bail, { passive: true, signal });
  window.addEventListener('touchstart', bail, { passive: true, signal });
  root.addEventListener('click', bail, { signal });
}

/**
 * 重播開場。頁首的名字會呼叫它。
 *
 * 在首頁直接重跑；不在首頁就清掉 session 旗標讓連結導回首頁後自然播放。
 * 回傳是否「已經就地重播」—— 呼叫端據此決定要不要 preventDefault。
 */
export function replayIntro(): boolean {
  try {
    sessionStorage.removeItem(SESSION_KEY);
  } catch {
    /* 隱私模式：無所謂，force 那條路徑不看它 */
  }
  if (!document.querySelector('[data-intro-root]')) return false;
  playIntro({ force: true });
  return true;
}
