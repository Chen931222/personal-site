/**
 * 邊緣標尺的慣性迴圈。
 *
 * 使用者滾一下，兩條標尺反向跑一段再摩擦停下 —— 像片盤上的呎數表。
 * 動作由使用者發起，所以不在 WCAG 2.2 SC 2.2.2 的範圍內；
 * reduced-motion 下整條不啟動，維持靜止。
 */
import { prefersReduced } from './motion';

const SPEED = 0.02;
const FRICTION = 0.85;

let raf = 0;
let live: AbortController | null = null;

export function initRails() {
  live?.abort();
  cancelAnimationFrame(raf);
  live = null;

  const tracks = Array.from(document.querySelectorAll<HTMLElement>('[data-rail-track]'));
  if (tracks.length < 2 || prefersReduced()) return;

  live = new AbortController();
  const { signal } = live;

  const [L, R] = tracks;
  const st = { d: 0, l: 0, r: 0 };
  // 一份字條的高度 = track 的一半（剛好兩份），拿來做環繞取模
  let range = L.getBoundingClientRect().height / 2 || 1;

  const remeasure = () => {
    range = L.getBoundingClientRect().height / 2 || 1;
  };

  addEventListener('wheel', (e) => { st.d += e.deltaY; }, { passive: true, signal });

  let lastY = 0;
  addEventListener('touchstart', (e) => { lastY = e.touches[0].clientY; }, { passive: true, signal });
  addEventListener('touchmove', (e) => {
    const y = e.touches[0].clientY;
    st.d += (lastY - y) * 2;
    lastY = y;
  }, { passive: true, signal });

  addEventListener('resize', remeasure, { passive: true, signal });

  const loop = () => {
    if (signal.aborted) return;
    if (st.d !== 0 || st.l !== 0 || st.r !== 0) {
      st.l += st.d * SPEED;
      st.r -= st.d * SPEED;
      st.d *= FRICTION;
      if (Math.abs(st.d) < 0.01) st.d = 0;
      if (Math.abs(st.l) > range) st.l %= range;
      if (Math.abs(st.r) > range) st.r %= range;
      L.style.transform = `translate3d(0,${st.l}px,0)`;
      R.style.transform = `translate3d(0,${st.r}px,0)`;
    }
    raf = requestAnimationFrame(loop);
  };
  raf = requestAnimationFrame(loop);
}
