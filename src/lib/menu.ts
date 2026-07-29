/**
 * 全螢幕選單的開關。
 *
 * 焦點阻隔用原生的 `inert`：把選單以外的區塊整個設為 inert，
 * 瀏覽器會同時處理焦點順序與輔助技術樹，比手寫的焦點陷阱可靠得多
 * （手寫的版本永遠會漏掉某一種鍵盤路徑）。
 */
import gsap from 'gsap';
import { EASE_TRANSITION, EASE_HEADING, prefersReduced } from './motion';

let live: AbortController | null = null;

export function initMenu() {
  live?.abort();
  live = null;

  const menuEl = document.querySelector<HTMLElement>('[data-menu]');
  // 一定要限定 button。開關狀態掛在 <html> 上（data-menu-on），是另一個屬性 ——
  // 但選 [data-menu-*] 這種模糊寫法遲早會選到 <html>，而下面會對 trigger 寫
  // textContent。真的選錯的話，那一行會把整份文件換成「關閉」兩個字。
  const triggerEl = document.querySelector<HTMLButtonElement>('button[data-menu-open]');
  if (!menuEl || !triggerEl) return;
  // 收進 const，closure 裡才留得住「非 null」這個判斷
  const menu = menuEl;
  const trigger = triggerEl;

  live = new AbortController();
  const { signal } = live;

  const bg = menu.querySelector<HTMLElement>('[data-menu-bg]');
  const rows = Array.from(menu.querySelectorAll<HTMLElement>('[data-menu-line]'));
  const foot = menu.querySelector<HTMLElement>('.menu__foot');
  const panel = menu.querySelector<HTMLElement>('[data-menu-panel]');
  const closers = Array.from(document.querySelectorAll<HTMLElement>('[data-menu-close]'));

  /**
   * 選單以外、要被 inert 掉的區塊。
   *
   * 頁首那排導覽連結也要算進來 —— 它們在選單之上（z-index 900），
   * 只用 CSS 藏起來的話鍵盤還是 tab 得到，焦點就漏出去了。
   */
  const outside = () =>
    Array.from(
      document.querySelectorAll<HTMLElement>('main, footer, [data-stage], [data-nav-links], .skip')
    ).filter((el) => !menu.contains(el));

  let open = false;
  let tl: gsap.core.Timeline | null = null;

  function setOpen(next: boolean) {
    if (next === open) return;
    open = next;
    const reduced = prefersReduced();

    trigger.setAttribute('aria-expanded', String(next));
    trigger.textContent = next ? '關閉' : '選單';
    document.documentElement.toggleAttribute('data-menu-on', next);

    tl?.kill();

    if (next) {
      menu.removeAttribute('hidden');
      document.documentElement.style.overflow = 'hidden';
      outside().forEach((el) => el.setAttribute('inert', ''));

      if (reduced) {
        gsap.set(bg, { scaleY: 1 });
        gsap.set(rows, { y: '0%' });
        gsap.set(foot, { opacity: 1 });
      } else {
        tl = gsap.timeline();
        tl.fromTo(bg, { scaleY: 0 }, { scaleY: 1, duration: 0.5, ease: EASE_TRANSITION }, 0);
        tl.fromTo(
          rows,
          { y: '112%' },
          { y: '0%', duration: 0.85, stagger: 0.055, ease: EASE_HEADING },
          0.22
        );
        tl.fromTo(foot, { opacity: 0 }, { opacity: 1, duration: 0.5 }, 0.5);
      }
      // 開啟後把焦點交給選單本身，鍵盤才會落在對的地方
      panel?.setAttribute('tabindex', '-1');
      panel?.focus({ preventScroll: true });
    } else {
      outside().forEach((el) => el.removeAttribute('inert'));
      document.documentElement.style.removeProperty('overflow');

      const done = () => {
        menu.setAttribute('hidden', '');
        gsap.set(rows, { y: '112%' });
        gsap.set(foot, { opacity: 0 });
      };

      if (reduced) {
        done();
      } else {
        tl = gsap.timeline({ onComplete: done });
        tl.to(rows, { y: '-112%', duration: 0.36, stagger: 0.03, ease: 'power1.in' }, 0);
        tl.to(foot, { opacity: 0, duration: 0.2 }, 0);
        tl.to(bg, { scaleY: 0, duration: 0.42, ease: EASE_TRANSITION }, 0.12);
        // GSAP 的 ticker 跑在 rAF 上，背景分頁會凍結 —— 沒有這條保險，
        // 選單會永遠停在半開狀態，而 main 還是 inert 的，整頁都點不動。
        window.setTimeout(() => {
          if (!open) done();
        }, 900);
      }
      trigger.focus({ preventScroll: true });
    }
  }

  trigger.addEventListener('click', () => setOpen(!open), { signal });
  closers.forEach((el) => el.addEventListener('click', () => setOpen(false), { signal }));

  // 點清單裡的連結就關掉（同頁錨點與 mailto 不會觸發換頁）
  menu.querySelectorAll('[data-menu-row]').forEach((a) =>
    a.addEventListener('click', () => setOpen(false), { signal })
  );

  window.addEventListener(
    'keydown',
    (e) => {
      if (e.key === 'Escape' && open) {
        e.preventDefault();
        setOpen(false);
      }
    },
    { signal }
  );

  // 換頁前先收乾淨，免得 inert 留在新頁面上
  document.addEventListener(
    'astro:before-swap',
    () => {
      if (open) {
        open = false;
        outside().forEach((el) => el.removeAttribute('inert'));
        document.documentElement.style.removeProperty('overflow');
      }
      // 無條件清掉，不放在 if 裡：選單開著時按瀏覽器的上一頁也會走到這裡，
      // 屬性留在 <html> 上的話，新頁面的頁首連結會被 CSS 一直藏著。
      document.documentElement.removeAttribute('data-menu-on');
    },
    { signal }
  );
}
