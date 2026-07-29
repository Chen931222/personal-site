/**
 * 全站設定的單一入口。
 *
 * ⚠️ 標了 TODO 的欄位是「等你補」的——目前是明顯的佔位符，
 *    不會假裝成真的。改這一個檔案就會同時改到開場動畫、頁首、頁尾與 SEO。
 */
import { STATS } from './projects';

/** 首頁「關於我」用的生活照槽 */
export interface Shot {
  /** 放進 public/media/ 之後把路徑填這裡。null = 打樣佔位框 */
  src: string | null;
  /** CSS aspect-ratio */
  ratio: string;
  /** 打樣框上的 mono 標註，也是 alt 的基礎 */
  label: string;
  /** 照片旁的一句圖說。留空就不顯示 */
  caption?: string;
}

/** 學經歷／現在正在做什麼的一列 */
export interface PathEntry {
  /** 時間，mono。進行中寫「2026 —」 */
  period: string;
  /** 主標，襯線 */
  title: string;
  /** 單位／身分，mono */
  org: string;
  /** 一句話說明，可留空字串 */
  note: string;
  /** 目前正在做的 → 紅點 */
  now?: boolean;
  /** 還沒填 → 用打樣樣式呈現（虛線、淡、標「待補」），不會假裝成真的 */
  todo?: boolean;
}

export const SITE = {
  /**
   * 名字。開場動畫最後會把它拆成左右兩半、往兩側展開（參考站的 "Jason | Bergh"）。
   * zh 是站上顯示的，latin 給 <title> 與 SEO 用。
   *
   * 中文的斷點照姓／名切，不是照字數切 —— 一個字對兩個字看起來不對稱，
   * 但把「亞」丟到左邊會把名字切壞，那比不對稱嚴重得多。
   *
   * 拉丁拼法用威妥瑪（台灣護照的慣例），佐證是站主自己的 repo 就叫 `chu`。
   * 若護照上是別的拼法（YACHENG／JU YA-CHENG…），改這一行就好。
   */
  name: {
    zh: { a: '朱', b: '亞承' },
    latin: { a: 'CHU', b: 'YA-CHENG' },
  },

  /** 一句話定位。出現在 <meta description> 與關於頁。 */
  tagline: '把生活裡的東西一件一件建檔，再做成一個可以走進去的展場。',

  /** 頁首名字底下的兩行 mono ——「你做的是哪一行」。兩個詞，不要形容詞。 */
  roles: ['建檔', '展覽'],

  /** 開場動畫的片頭字卡。兩行，短，大。用你自己的話。 */
  intro: {
    mono: 'EXHIBITIONS, NOT TOOLS',
    line1: '不做工具',
    line2: '做展覽',
  },

  /** 頁尾與關於頁的聯絡方式。 */
  contact: {
    email: 'chenchen931222@gmail.com',
    /**
     * 社群帳號。href 是空字串的會被自動濾掉（三個渲染處都有濾），
     * 所以還沒拿到的先留空，不會在站上留一個死連結。
     *
     * 這裡填的東西會同時出現在三個地方：關於我的結尾、全螢幕選單的頁腳、全站頁尾。
     */
    links: [
      // 出處：chu-website 的 git remote（github.com/Chen931222/chu.git），帳號已驗證存在。
      { label: 'GITHUB', href: 'https://github.com/Chen931222' },
      // 網址保留站主給的 percent-encoded 形式 —— LinkedIn 的中文 slug 這樣寫最穩，
      // 換成原字中文雖然也能開，但轉貼到別的地方容易被二次編碼弄壞。
      {
        label: 'LINKEDIN',
        href: 'https://www.linkedin.com/in/%E4%BA%9E%E6%89%BF-%E6%9C%B1-108663422/',
      },
    ],
  },

  /**
   * TODO ③：個人照。放進 public/media/ 之後把路徑填在這裡。
   * 留 null 會顯示打樣佔位框，不會破版。
   *
   * 這一張是**開場動畫交棒的那一張** —— 名字兩半分開留下的口，
   * 銀幕拉開之後出現的就是它。挑一張正面、乾淨、你自己看得順眼的。
   */
  portrait: null as string | null,

  /**
   * 首頁往下捲的「關於我」。
   * 順序是刻意的：先看到人 → 再讀他是誰 → 再看他做過什麼 → 最後才給聯絡方式。
   * 名片背面的邏輯，不是履歷的邏輯。
   */
  about: {
    /** mono 小標。想換成別的說法就改這裡（例：ABOUT ME） */
    label: 'GET TO KNOW ME',

    /**
     * TODO ④：生活照。四到六張最好 —— 少於四張撐不起一面牆，
     * 多於六張就從「認識一個人」變成「看一本相簿」。
     * 直式與橫式交錯，版面才有呼吸。
     */
    photos: [
      { src: null, ratio: '4 / 5', label: '生活照 01', caption: '' },
      { src: null, ratio: '3 / 2', label: '生活照 02', caption: '' },
      { src: null, ratio: '1 / 1', label: '生活照 03', caption: '' },
      { src: null, ratio: '3 / 4', label: '生活照 04', caption: '' },
    ] as Shot[],

    /** 自我介紹的第一句。巨型襯線，會跟你的名字並排。短，一句。 */
    lede: '興大學生，正在學西班牙語，剩下的時間都拿去把生活建檔。',

    /** 接下來的段落。內文級，兩到三段就夠。 */
    body: [
      // 這裡只舉作品集上找得到的站 —— 舉到一個作品頁上沒有的名字，訪客會以為自己漏看了。
      '做的網站看起來題材各異 —— 衣櫃、車庫、去過的地方 —— 骨子裡是同一個動作：把生活裡的東西一件一件建檔，再做成一個可以走進去的展場。',
      '不做工具，做展覽。每一站都有開場、有敘事、有節奏；功能是演員，呈現才是劇本。及格線不是「能動」，是陌生人願意掏錢。',
    ],

    /**
     * 學經歷與現在。由新到舊。
     * now: true 會亮紅點（目前正在做的）。
     * todo: true 是明顯的打樣列 —— 填好之後把這個旗標拿掉。
     *
     * ⚠️ 這裡只寫真的。不要為了讓版面看起來滿而補獎項、客戶或數字。
     */
    path: [
      {
        period: '2026 —',
        title: '把生活建檔',
        // 從 STATS 算，不要寫死。作品增減時這個數字必須跟著動 ——
        // 訪客點進作品頁一數就對得起來，寫死的話遲早變成當場被抓包的謊。
        org: `個人專案 · ${STATS.total} 件`,
        // ⚠️ 這三個數字訪客點進去就能當場數。2026-07-27 實測：
        //    藏書 119（站上六櫃標頭相加）、唱片 22（dock 格數）都對得上；
        //    衣櫃 104 是本機 wardrobe-ai/library.json 的真實筆數，
        //    但線上的「今天穿什麼」只出貨了 26 件 —— 數字沒說謊，出貨的資料落後了。
        note: '衣櫃 104 件、藏書 119 冊、唱片 22 張，逐件拍照、掃描、登記，再做成網站。',
        now: true,
      },
      {
        period: '2026 —',
        title: '學西班牙語',
        org: '自學 · Mi Español',
        note: '學到一半發現沒有順手的工具，於是自己做了一個八分區的自學站。',
        now: true,
      },
      {
        period: '待補',
        title: '興大',
        org: '科系 · 入學年',
        note: '',
        todo: true,
      },
      {
        period: '待補',
        title: '一段經歷',
        org: '實習／社團／打工／競賽',
        note: '有就寫，沒有就把這一列整條刪掉 —— 空欄比假資歷好看。',
        todo: true,
      },
    ] as PathEntry[],

    /** 最後一段的邀請語。放在信箱上方。 */
    outro: '看完了？剩下的用講的比較快。',
  },

  /**
   * 頁首右上角的導覽。
   * 「首頁」不放這裡 —— 左上角的名字本來就是回首頁（順便重播開場），
   * 同一個目的地不要在同一列出現兩次。
   * 「關於」是首頁的錨點，不是另一頁：首頁往下捲就是關於我。
   */
  nav: [
    { label: '作品', latin: 'WORK', href: '/work' },
    { label: '遊記', latin: 'JOURNAL', href: '/journal' },
    { label: '關於', latin: 'ABOUT', href: '/#about' },
  ],
} as const;

export type Site = typeof SITE;
