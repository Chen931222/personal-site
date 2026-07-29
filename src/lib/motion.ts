/**
 * 全站動態的單一入口。
 *
 * 原則（見 DESIGN.md）：一個 ease 家族、一次編排好的開場，
 * 不是到處撒 hover 動效。reduced-motion 走「直接呈現最終狀態」，不是加速。
 */
import gsap from 'gsap';
import { CustomEase } from 'gsap/CustomEase';

gsap.registerPlugin(CustomEase);

/**
 * Ease 家族。
 *
 * 這三條不是我猜的曲線 —— 是從參考站 (jasonbergh.com) 的 live GSAP timeline
 * dump 出來的實測值。「貴」的手感來自 bezier ＋ 0.9–1.4s 的長度 ＋ 小位移，
 * 把同一條 ease 套在 0.4s 的短 tween 上只會看起來卡。
 */
export const EASE_MAIN = CustomEase.create('mainEase', '0.65, 0, 0, 1');
/** 主力：推移、布幕、clip-path */
export const EASE_TRANSITION = CustomEase.create('transitionEase', '0.75, 0, 0, 1');
/** 對稱進出：字級大的行遮罩 */
export const EASE_HEADING = CustomEase.create('headingHoverEase', '0.75, 0, 0.25, 1');

export const CURTAIN_OPEN = 'polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)';
export const CURTAIN_SHUT = 'polygon(50% 0%, 50% 0%, 50% 100%, 50% 100%)';

export const prefersReduced = () =>
  typeof matchMedia === 'function' &&
  matchMedia('(prefers-reduced-motion: reduce)').matches;

let wired = false;

/**
 * 頁面轉場：兩片面板從中央闔上，換頁後往兩側拉開。
 *
 * 用 scaleX 面板而不是全螢幕 clip-path —— clip-path 不走合成器（每格重繪整個子樹），
 * 而且會裁掉 position:fixed 的後代（包含導覽列）。scaleX 只動 transform。
 */
function wireCurtain() {
  if (wired) return;
  wired = true;

  const panels = () => Array.from(document.querySelectorAll<HTMLElement>('[data-panel]'));

  const prime = (els: HTMLElement[]) => {
    gsap.set(els[0], { transformOrigin: 'left center' });
    gsap.set(els[1], { transformOrigin: 'right center' });
  };

  /**
   * 別無條件地 await 動畫。
   *
   * GSAP 的 ticker 跑在 requestAnimationFrame 上，而背景分頁的 rAF 會被凍結 ——
   * 使用者在背景分頁點一個連結，tween 的 promise 永遠不會 resolve，
   * 那一頁就再也換不過去。加一條逾時，動畫是禮物、不是門檻。
   */
  const atMost = (p: Promise<unknown>, ms: number) =>
    Promise.race([p, new Promise((r) => setTimeout(r, ms))]);

  document.addEventListener('astro:before-preparation', (e) => {
    const els = panels();
    if (els.length < 2) return;
    const ev = e as Event & { loader: () => Promise<void> };
    const original = ev.loader;

    ev.loader = async () => {
      if (prefersReduced()) {
        await original();
        return;
      }
      prime(els);
      const shut = gsap
        .fromTo(els, { scaleX: 0 }, { scaleX: 1, duration: 0.42, ease: EASE_TRANSITION })
        .then();
      await Promise.all([atMost(shut, 700), original()]);
    };
  });

  document.addEventListener('astro:page-load', () => {
    const els = panels();
    if (els.length < 2) return;
    if (prefersReduced()) {
      gsap.set(els, { scaleX: 0 });
      return;
    }
    // 換個支點，面板往兩側退開
    gsap.set(els[0], { transformOrigin: 'right center' });
    gsap.set(els[1], { transformOrigin: 'left center' });
    gsap.to(els, { scaleX: 0, duration: 0.52, ease: EASE_TRANSITION });
  });
}

export function initMotion() {
  wireCurtain();
}
