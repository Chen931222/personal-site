/**
 * 第二大腦的實掃數字 —— /method 全頁數字的單一真相來源。
 *
 * 數字不是手寫的：tools/scan-vault.mjs 掃 G:\Vault 產生 brain.json，
 * 這一層只把它接上型別、外加一個「掃不出來」的策展常數（管線數）。
 * 重掃：`npm run sync`（見 README「第二大腦：數字怎麼保持誠實」）。
 *
 * ⚠️ 不要手改 brain.json 的數字 —— 下次 sync 會蓋掉，而且會讓站上的數字說謊。
 */
import data from './brain.json';

export interface Brain {
  /** 實掃日期 YYYY-MM-DD */
  scannedAt: string;
  /** 內容筆記總數（計數慣例見 tools/scan-vault.mjs 檔頭） */
  total: number;
  folders: {
    context: number;
    projects: number;
    topics: number;
    journal: number;
    clippings: number;
    reading: number;
    inbox: number;
  };
  /** 圖上個別畫出節點的資料夾，存檔名清單，用來對照「畫的點是不是還在」 */
  notes: {
    context: string[];
    projects: string[];
  };
}

export const BRAIN: Brain = data;

/**
 * 輸入管線數 —— 概念數字，不是檔案數，所以掃描器不產它。
 * 來源：G:\Vault\CLAUDE.md 的六條輸入管道（閃念膠囊／網頁剪藏／紙本閱讀／
 * Session 蒸餾／每日交接／週回顧）。增減管線時改這一個數。
 */
export const PIPELINES = 6;
