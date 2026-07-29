/**
 * 作品清單 —— 全站唯一的真相來源。
 *
 * 這一份同時餵給三個地方：
 *   1. 開場動畫的兩列縮圖膠捲
 *   2. 首頁的作品舞台（左右切換）
 *   3. /work 索引頁
 * 新增一個作品只要在這裡加一筆。
 *
 * 資料來源：G:\Projects\room\index.html 的 WORKS 陣列。
 * 原註記：「每一筆的網址都匿名連線驗證過、標題對得上才寫進來。」
 *
 * ⚠️ cover / still 目前全是 null —— 會渲染成打樣佔位框。
 *    把截圖丟進 public/media/ 之後，把路徑填進來即可，例如 '/media/mi-espanol.webp'。
 */

export type ProjectStatus = 'live' | 'wip' | 'private';

export interface Project {
  /** 網址用的識別碼，也是 mono 標註顯示的代號 */
  slug: string;
  /** 中文名 —— 巨型襯線顯示的那個 */
  name: string;
  /** 拉丁副標 —— mono 小字 */
  latin: string;
  /** 一句分類 */
  kind: string;
  /**
   * 舞台左側巨型襯線顯示的短名。
   *
   * 跟 name 分開，是因為索引頁要完整名稱（「CPE 必考一星 49 題」），
   * 而舞台上那個字級只放得下 4–6 個字。上限由「最長的一筆要放得進名字欄」反推。
   */
  short: string;
  /** 一句描述。全部取自站主自己寫的文案。 */
  desc: string;
  status: ProjectStatus;
  /** 上線網址。未上線為 null，不給假連結。 */
  href: string | null;
  year: number;
  tags: string[];
  /** 3:2 縮圖，給膠捲與索引列用。null = 顯示打樣框 */
  cover: string | null;
  /** 16:9 大圖／短片，給首頁舞台用。null = 顯示打樣框 */
  still: string | null;
  /** 之後補的專案影片（.mp4）。null = 舞台不顯示播放鍵 */
  video: string | null;
  /**
   * 受控分類詞彙 —— 底部篩選列直接吃這個欄位。
   * 只用這五個：建檔／展示／學習／分析／工具。
   * 不要再開新類別，除非新類別至少會有兩件作品；
   * 只篩出一件的選項不是篩選，是噪音。
   */
  cat: '建檔' | '展示' | '學習' | '分析' | '工具';
}

export const PROJECTS: Project[] = [
  {
    slug: 'mi-espanol',
    name: 'Mi Español',
    latin: 'MI ESPANOL',
    kind: '西語學習網站',
    short: 'Mi Español',
    desc: '八個分區的西班牙語自學站，另配一支九幕的導覽頁。完成度最高，也是唯一打算拿出去賣的。',
    status: 'live',
    href: 'https://mi-espanol-web.vercel.app',
    year: 2026,
    tags: ['學習', '產品', '導覽頁'],
    cover: null,
    still: null,
    video: null,
    cat: '學習',
  },
  {
    slug: 'dream-car-garage',
    name: '夢想車庫',
    latin: 'DREAM GARAGE',
    kind: '360 汽車環景',
    short: '夢想車庫',
    desc: '八台車的即時 3D 環景。用自己的模型取代預錄影片，繞開了整個素材成本。',
    status: 'live',
    href: 'https://dream-car-garage.chenchen931222.workers.dev',
    year: 2026,
    tags: ['3D', 'WebGL', '展示'],
    cover: null,
    still: null,
    video: null,
    cat: '展示',
  },
  // 2026-07-29 撤下四件：
  //   書櫃（bookshelf）、唱片架（record-shelf）—— 版面語彙來自別人的站，
  //     不是自己想出來的東西，放在作品集裡等於拿別人的點子當自己的招牌。
  //   五層規劃系統（five-layer-plan）、Video-to-3D 立體快照（video-to-3d）。
  // 站都還在線上，只是不列為作品。素材（public/media/*）與錄影腳本都留著，
  // 要復原就把資料補回這裡。收錄的判準：這件裡面有沒有一個自己解掉的問題。
  {
    slug: 'wardrobe',
    name: '我的衣櫃',
    latin: 'WARDROBE',
    kind: '衣物畫廊',
    short: '我的衣櫃',
    desc: '把每一件衣服當成展品拍照陳列，是穿搭站的資料底層。',
    status: 'live',
    href: 'https://wardrobe-gallery.vercel.app',
    year: 2026,
    tags: ['建檔', '攝影', '畫廊'],
    cover: null,
    still: null,
    video: null,
    // 原本是「建檔」。書櫃與唱片架撤下後，那一類只剩這一件 ——
    // 照本檔案自己的規矩，只篩得出一件的選項不是篩選，是噪音。
    // 「建檔」這個字沒有消失：它還在上面的 tags 裡，也還是關於我那段的主詞。
    cat: '展示',
  },
  {
    slug: 'cpe49',
    name: 'CPE 必考一星 49 題',
    latin: 'CPE 49',
    kind: '程式檢定題解',
    short: 'CPE 49 題',
    desc: '大學程式能力檢定的題目與 Python 解法詳解。',
    status: 'live',
    href: 'https://cpe49-trainer.vercel.app',
    year: 2026,
    tags: ['教學', 'Python', '題解'],
    cover: null,
    still: null,
    video: null,
    cat: '學習',
  },
  {
    slug: 'oasis',
    name: 'OASIS 綠洲 探索空間',
    latin: 'OASIS',
    kind: '拼場共租平台',
    short: 'OASIS 綠洲',
    // 文案取自站主自己寫的 README 第一段：「想用一個空間，但一個人租太貴。」
    desc: '想用練團室但一個人租太貴——發起拼場，揪人、分攤、排程讓平台喬好。大二的期末專題，56 個測試、CI，一路做到上線。',
    status: 'live',
    href: 'https://oasis-green.onrender.com',
    year: 2026,
    tags: ['產品', '全端', '期末專題'],
    cover: null,
    still: null,
    video: null,
    cat: '工具',
  },
  {
    slug: 'policy-sandbox',
    name: '政策沙盤',
    latin: 'POLICY SANDBOX',
    kind: '可玩的論證',
    short: '政策沙盤',
    // 定位是「explorable explanation」：不是決策工具，是把論點做成可以親手驗證的展覽。
    // 2026-07-29 掛上時事：外送專法 7/21 上路，FIG.04 模擬「每單保底 45 元誰買單」。
    desc: '外送專法剛上路：每單保底 45 元，誰買單？六十個會自己盤算的模擬外送員、校準到台灣真實數據——把「演算法就是一種重分配政策」做成看得見的證明。',
    status: 'live',
    href: 'https://policy-sandbox-ashen.vercel.app',
    year: 2026,
    tags: ['模擬', '多智能體', '期末專題'],
    cover: null,
    still: null,
    video: null,
    cat: '分析',
  },
  {
    slug: 'parking-exhibit',
    name: '挪車的代價',
    latin: 'PARKING RECORDS',
    kind: '3D 資料結構展覽',
    short: '挪車的代價',
    // 與政策沙盤同一個簽名：把看不見的規則做成看得見的後果。
    // 引擎忠於大二資料結構期末的 Python（堆疊×2＋佇列＋BST），挪車數即時真算。
    desc: '取一台停在巷子深處的車，得先挪開前面四台。大二資料結構期末的停車場系統，改造成 3D 夜間停車場：自動導覽演完挪車之舞，再讓你親手取車，看堆疊與平面車位的帳單即時分流。',
    status: 'live',
    href: 'https://parking-exhibit.vercel.app',
    year: 2026,
    tags: ['3D', '資料結構', '期末專題'],
    cover: null,
    still: null,
    video: null,
    cat: '展示',
  },
  {
    slug: 'room',
    name: '房間',
    latin: 'THE ROOM',
    kind: '房間即索引',
    short: '房間',
    desc: '每一件物件通向一個正在進行的計畫。滾動就是鏡頭在房間裡走一遍。',
    status: 'live',
    href: 'https://room-pitch.vercel.app/index.html',
    year: 2026,
    tags: ['入口', '影像', '滾動敘事'],
    cover: null,
    still: null,
    video: null,
    cat: '展示',
  },
  {
    slug: 'langalpha',
    name: 'LangAlpha',
    latin: 'LANGALPHA',
    kind: '進行中',
    short: 'LangAlpha',
    desc: '用語言模型讀市場、給出可以被記分的預測。跑在自己的雲端機器上。',
    status: 'wip',
    href: null,
    year: 2026,
    tags: ['LLM', '市場', '可記分'],
    cover: null,
    still: null,
    video: null,
    cat: '分析',
  },
  // 第二大腦（second-brain）2026-07-29 移出作品清單：它不是一件作品，是做出所有作品的
  // 方法，而且點不進去（不公開）。現在它有自己的一頁 /method，講的比一格輪播多得多。
];

/**
 * 底部篩選列的選項：從實際資料統計，不是寫死的清單。
 * 舞台與 /work 都吃同一批作品 —— SLIDER 與 LIST 是同一份東西的兩種看法，
 * 不是兩份不同的清單。
 */
export const CATS = (() => {
  const m = new Map<string, number>();
  for (const p of PROJECTS) m.set(p.cat, (m.get(p.cat) ?? 0) + 1);
  return [...m.entries()].sort((a, b) => b[1] - a[1]).map(([cat, n]) => ({ cat, n }));
})();

/** 統計 —— 頁面上顯示的數字都從這裡算，不寫死 */
export const STATS = {
  total: PROJECTS.length,
  live: PROJECTS.filter((p) => p.status === 'live').length,
  wip: PROJECTS.filter((p) => p.status !== 'live').length,
};

/** 站主自己寫下的原則，附出處。取自 G:\Vault。 */
export const CREED = [
  { q: '要印刷品的質感，不要螢幕的炫技。', src: '網站開發 · 核心風格定義' },
  { q: '及格線是「陌生人願意掏錢」。', src: '關於我 · 自我要求' },
  { q: '先去找現成的輪子，再魔改。', src: '網站開發 · 工程原則' },
  { q: '一次性的成功要鑄造成可複用資產。', src: '網站開發 · 工程原則' },
];

/** 工具鏈 */
export const STACK = [
  'Claude Code',
  'Codex',
  'Typeless 語音輸入',
  'Obsidian',
  'Astro',
  'GSAP',
  'Vercel',
  'Cloudflare Workers',
];
