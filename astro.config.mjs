// @ts-check
import { defineConfig, fontProviders } from 'astro/config';

// 靜態輸出，不需要 Vercel adapter。
// 部署：vercel --prod（node 要先補進 PATH，見 README）
export default defineConfig({
  // 有自訂網域之後改這裡 —— canonical 與 OG 網址都吃這個值。
  // 留佔位符的話等於告訴 Google「這頁的正本在別的網域」，整站不會被正確收錄。
  site: 'https://personal-site-tan-alpha.vercel.app',
  output: 'static',

  // 拉丁 display 與 mono 自架（build 時下載、預載入，零外部請求、零 FOUT）。
  // 中文襯線走 Google CDN —— CJK 字檔太大，需要 Google 的 unicode-range 分段下載。
  fonts: [
    {
      provider: fontProviders.fontshare(),
      name: 'Sentient',
      cssVariable: '--f-sentient',
      weights: [200, 300, 400],
      styles: ['normal', 'italic'],
      subsets: ['latin'],
      // 刻意留空：CJK 的接棒順序由 global.css 的 --font-display 自己排，
      // 否則通用 serif 會在 Noto Serif TC 之前先接走中文字。
      fallbacks: [],
    },
    {
      provider: fontProviders.google(),
      name: 'Geist Mono',
      cssVariable: '--f-mono',
      weights: [400, 500],
      styles: ['normal'],
      subsets: ['latin'],
      fallbacks: ['ui-monospace', 'monospace'],
    },
  ],

  // ⚠️ Astro 7 的預設是 'jsx'，會把元素之間的空白吃掉：
  //    `<span>上線中</span> <span>2026</span>` 會變成「上線中2026」。
  //    排版導向的站一定要關掉。
  compressHTML: true,

  build: {
    inlineStylesheets: 'auto',
  },
  devToolbar: {
    enabled: false,
  },
});
