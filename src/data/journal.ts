/**
 * 遊記 —— 從小到大去過的國家與地方。
 *
 * 這是站主「一件一件建檔」的另一份帳：衣櫃、書櫃、唱片架記的是東西，
 * 這一份記的是走過的路。所以它的長相是**帳本**，不是相簿牆 ——
 * 編號、國碼、年份、地名，一列一趟。
 *
 * ⚠️ 內容一律由站主提供，**不得代填**。
 *    沒去過的國家寫上去，是這個網站唯一不能犯的錯（見 PRODUCT.md）。
 *
 * ── 加一筆 ──────────────────────────────────────────────────────
 *
 *   {
 *     id: 'jp-2019',              // 唯一值，照片檔名靠它對應
 *     country: '日本',
 *     latin: 'JAPAN',
 *     code: 'JP',                 // ISO 3166-1 alpha-2，mono 索引用
 *     year: 2019,                 // 去的那一年。同一國去兩次就開兩筆。
 *     places: ['東京', '京都'],    // 去了哪些地方
 *     note: '第一次自己排行程。',   // 一句話，可省略
 *   },
 *
 * 照片：丟進 public/media/journal/，檔名 `<id>-01.webp`、`<id>-02.webp`…
 * 檔名對了就會出現，不用改這個檔案。
 */

export interface Trip {
  /** 唯一值；照片檔名的前綴 */
  id: string;
  /** 國家（中文） */
  country: string;
  /** 國家（拉丁，全大寫）—— 給 display 襯線用 */
  latin: string;
  /** ISO 3166-1 alpha-2 國碼，mono 索引用 */
  code: string;
  /** 去的年份 */
  year: number;
  /** 去了哪些地方 */
  places: string[];
  /** 一句話。留空就不顯示 —— 沒話說比硬湊一句好。 */
  note?: string;
}

/**
 * TODO：把你去過的地方填進來。
 *
 * 順序不用管，下面會自動照年份由早到晚排 —— 「從小到大」就是這份帳的讀法。
 */
export const TRIPS: Trip[] = [];

/** 照年份由早到晚。同年的照國碼排，順序才穩定（不會每次 build 跳來跳去）。 */
export const TRIPS_SORTED: Trip[] = [...TRIPS].sort(
  (a, b) => a.year - b.year || a.code.localeCompare(b.code)
);

/**
 * 統計。
 *
 * 國家數要**去重**：同一個國家去三次是一個國家、三趟。
 * 這兩個數字訪客會自己數，對不上就整份帳都不可信了。
 */
export const TRIP_STATS = {
  /** 幾個國家（去重） */
  countries: new Set(TRIPS.map((t) => t.country)).size,
  /** 幾個地方（去重；同一個城市去兩次算一個地方） */
  places: new Set(TRIPS.flatMap((t) => t.places)).size,
  /** 幾趟 */
  trips: TRIPS.length,
  /** 最早與最晚的年份；沒有資料時是 null */
  from: TRIPS.length ? Math.min(...TRIPS.map((t) => t.year)) : null,
  to: TRIPS.length ? Math.max(...TRIPS.map((t) => t.year)) : null,
};
