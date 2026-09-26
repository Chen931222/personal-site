/**
 * 拆解 · 房間掃描 —— 這一篇的唯一真相來源。
 *
 * 為什麼是一份手寫的資料檔，而不是去解析 room-splat 的 README：
 * README 是寫給工程師看的（指令、旗標、檔案路徑），拆解頁是寫給陌生人看的。
 * 自動轉出來的東西，讀起來就會是一份 README。策展是內容工作，不是工程工作。
 *
 * ⚠️ 誠實條款（比照 /method）：
 *    每一張表都必須帶 `source` —— 那個數字是從哪個實際跑過的檔案或指令來的。
 *    沒有出處的數字不要寫進來。散文裡也不要出現表格以外的新數字。
 *
 * 數字出處：G:\Projects\room-splat\README.md（實測紀錄）與 G:\Projects\room\scan.html（交付規格）。
 */

/** 「我原本以為 / 實測是 / 後果」—— 這一頁的招牌裝置 */
export interface Reckon {
  thought: string;
  actual: string;
  result: string;
}

export interface StudyTable {
  head: string[];
  rows: string[][];
  /** 要加重的列（0 起算，對應 rows 的索引） */
  strong?: number[];
  /** 誠實條款：這張表的數字從哪來 */
  source: string;
}

export type Block =
  | { kind: 'text'; body: string[] }
  | { kind: 'table'; table: StudyTable }
  | { kind: 'reckons'; items: Reckon[] }
  /** 一組大字讀數，用在「交付」那一幕 */
  | { kind: 'chain'; steps: { label: string; value: string }[]; note: string }
  /** 條列，用在「還沒解的」 */
  | { kind: 'list'; items: { term: string; body: string }[] }
  /**
   * 可互動的成品，點了才載。
   *
   * 走 iframe 指向已上線的檢視器，不把 Three.js + Spark 搬進這個站：
   * 那是 7 MB 的 vendor 檔，而且檢視器已經處理好 WebGL2 偵測、載入進度、
   * iPhone 的 pixelRatio 夾制 —— 複製一份就會有兩份要維護。
   * iframe 另外給了兩個好處：WebGL 掛掉不會拖垮這一頁，
   * 而移除節點就是確定的 GPU 釋放。
   */
  | {
      kind: 'embed';
      src: string;
      title: string;
      /** 按鈕上要老實寫的下載量 */
      weight: string;
      caption: string;
      full: string;
    };

export interface Scene {
  num: string;
  title: string;
  latin: string;
  blocks: Block[];
}

export interface Study {
  /** 對應 PROJECTS 裡的 slug */
  project: string;
  index: string;
  title: string;
  latin: string;
  lede: string;
  /** 頁首那條規格讀數 */
  spec: { label: string; value: string }[];
  /** 成品連結 */
  live: { label: string; href: string };
  scenes: Scene[];
  abstract: string[];
}

export const STUDY: Study = {
  project: 'room',
  index: '01',
  title: '一支手機影片，變成可以走進去的房間',
  latin: 'THE ROOM, MEASURED',
  lede: '同一個房間拍了三次。前兩次的失敗，比第三次的成功更能說明這件事的難處在哪。',

  spec: [
    { label: '期間', value: '2026.08.18 — 08.20' },
    { label: '影片', value: '3 支 · 取用第 3 支' },
    { label: '影格', value: '2,118 → 353' },
    { label: '交付', value: '162 MB → 5.79 MB' },
  ],

  live: { label: '走進掃描', href: 'https://room-sepia.vercel.app/scan.html' },

  scenes: [
    {
      num: '01',
      title: '問題',
      latin: 'THE QUESTION',
      blocks: [
        {
          kind: 'text',
          body: [
            '房間這個站的開場，是一支一鏡到底的長鏡：鏡頭替你在房間裡走一遍。它好看，但它是一條被拍死的路線——你只能沿著我走過的方向看。',
            '問題很單純：同一個房間，能不能變成一個你自己走的空間？沒有鏡頭、沒有預錄路線，想蹲下來看桌子底下就蹲下來。而且要能在瀏覽器裡開，不裝任何東西。',
          ],
        },
      ],
    },

    {
      num: '02',
      title: '失敗的第一版',
      latin: 'THE FIRST ONE WAS BAD',
      blocks: [
        {
          kind: 'text',
          body: [
            '第一次的素材是現成的——就是站上那支開場影片，1440×810、2.5 Mbps。省事，而且它有攝影測量需要的所有特質：一鏡到底、鏡頭真的在空間中移動、深景深、房間夠亂（雜物就是特徵點）。',
            '解算全數通過，240 張影格一張不掉。然後打開來看——只要視角離開原本拍攝的路線，畫面就浮出一層像水墨筆觸的半透明拖影。',
            '這是這件事最容易騙人的地方：解算成功不等於重建可用。',
          ],
        },
        {
          kind: 'table',
          table: {
            head: ['項目', 'v1 客廳'],
            rows: [
              ['來源', '1440×810 · 2.5 Mbps · 48 秒'],
              ['選用影格', '240'],
              ['COLMAP 註冊', '240 / 240（100%）'],
              ['稀疏點', '25,090'],
              ['重投影誤差', '0.653 px'],
              ['最終 splat', '735,407'],
            ],
            source: 'colmap/sparse0 · Brush 15,000 步訓練記錄',
          },
        },
      ],
    },

    {
      num: '03',
      title: '我怎麼知道它爛',
      latin: 'PUTTING A NUMBER ON IT',
      blocks: [
        {
          kind: 'text',
          body: [
            '「看起來怪」不能拿來當工作依據。所以先寫了一支量測工具，把每一顆高斯的三軸尺度排序後算分布——這一步才把感覺變成可以追蹤的數字。',
            '結果是兩個病灶：一半的高斯最長軸是中間軸的 5 倍以上，最極端的 1% 到 1,700 倍。這些細針從訓練視角看是對的，換個角度就攤成拖影。另一個是不透明度中位數只有 0.057，大量近乎透明的高斯疊起來就是霧。',
          ],
        },
        {
          kind: 'table',
          table: {
            head: ['指標', 'p50', 'p90', 'p99'],
            rows: [
              ['不透明度', '0.057', '0.241', '0.643'],
              ['針狀度 s0/s1', '4.96', '39.96', '1,701.74'],
              ['盤狀度 s1/s2', '3.72', '69.47', '3,331.56'],
            ],
            strong: [1],
            source: 'prune.mjs 對 splats/export_15000.ply 的實測分布',
          },
        },
        {
          kind: 'text',
          body: [
            '這裡有一個不能混的分辨：針（s0/s1 大）該砍，盤（s1/s2 大）不能砍——盤是平面的正常形狀，砍了牆面會破。第一版用「最長軸／最短軸」當單一指標，兩者混在一起，會誤砍 77%。',
          ],
        },
      ],
    },

    {
      num: '04',
      title: '四個把我修正的決定',
      latin: 'WHAT I GOT WRONG',
      blocks: [
        {
          kind: 'text',
          body: [
            '這件事真正花掉的時間，不在寫程式，在四次「我以為的」被實測推翻。',
          ],
        },
        {
          kind: 'reckons',
          items: [
            {
              thought: '焦距讓解算器自己猜就好，預設值是影像長邊的 1.2 倍。',
              actual: 'iPhone 直式 4K 的真實焦距是 945 px，預設猜的是 2,592 px——差 2.7 倍。',
              result:
                '猜錯 → 最初幾張的三角測量算出錯誤深度 → 模型從第一步就長歪。無先驗只註冊 2 / 353，幾乎是完全失敗；補上先驗並固定住焦距後，351 / 353。這是成敗，不是微調。',
            },
            {
              thought:
                '窮舉比對是 O(n²)，張數一多就爆，所以永遠改用循序比對。',
              actual:
                '353 張的窮舉在這台機器上只跑 8 分鐘，而且徹底沒有斷鏈。循序比對反而碎成 5 塊（221 / 87 / 54 / 35 / 10），斷在轉身太快的地方。',
              result:
                '我把一條在「上千張」情境下成立的規則，過度推廣到所有情境。修正後的規則：600 張以下一律用窮舉。',
            },
            {
              thought: '殘影是雜點，修剪得越狠應該越乾淨。',
              actual:
                '最狠的那一版（只留 15.3%）反而更糟——沙發整塊塌陷成暗色拖影。構成柔和表面的，正是那些低不透明度的高斯。',
              result: '修剪不是清潔，是取捨。中間那一檔（留 26.3%）才是甜蜜點。',
            },
            {
              thought: '深色木門那段拍壞了，多拍幾次總會有一次拍對。',
              actual:
                '沒註冊的 41 張是連續的開頭那段，平均亮度 24 / 255，其餘畫面是 91——暗 3.8 倍。而暗部的特徵點抓到的是感光元件雜訊，拍十次就是十份不同的雜訊。',
              result:
                '重拍在這裡是無效的。那扇門根本不在模型裡，看到的殘影不是「重建得差」，是那裡沒有資料、剩下的高斯在瞎猜。這不是軟體問題，要拿燈去照。',
            },
          ],
        },
      ],
    },

    {
      num: '05',
      title: '三次拍攝',
      latin: 'THREE TAKES',
      blocks: [
        {
          kind: 'text',
          body: [
            '第二支影片換了房間、換成 4K、把燈全開。第三支再修正走位——轉角處放慢、避開最暗的區域、加大繞行範圍。',
            '這張表是整件事的結論：後面的軟體只是把資訊搬運出來，資訊有多少是拍攝當下就決定的。針狀度 p99 從 1,701 掉到 39.7，是 43 倍的改善，而它幾乎全部來自重拍。',
          ],
        },
        {
          kind: 'table',
          table: {
            head: ['', 'v1 客廳', 'v2 臥室', 'v3 重拍'],
            rows: [
              ['來源', '1440×810 · 2.5 Mbps', '4K · 45 Mbps', '4K · 45 Mbps'],
              ['選用影格', '240', '402', '353'],
              ['註冊', '240 / 240', '361 / 402', '351 / 353'],
              ['稀疏點', '25,090', '80,658', '72,400'],
              ['針狀度 p99', '1,701.74', '53.57', '39.70'],
              ['訓練時間', '14 分', '8.7 分', '—'],
            ],
            strong: [4],
            source: 'room-splat/README.md · 三次重建的 COLMAP 與 prune.mjs 輸出',
          },
        },
        {
          kind: 'text',
          body: [
            '順帶一提：資料變好時，訓練不但沒變慢，還更快收斂。v2 用了比 v1 更多的步數，時間反而少了三分之一。',
          ],
        },
      ],
    },

    {
      num: '06',
      title: '交付',
      latin: 'SHIPPING IT',
      blocks: [
        {
          kind: 'text',
          body: [
            '重建完的檔案是 162 MB。那不是一個能放在網頁上的東西——所以最後這一段全在處理「怎麼讓它小到可以被打開」。',
            '中間那一步是隱私：衣櫃的鏡子把本人清楚照進了掃描裡，臉可辨識。而且鏡面來回反射造出一路延伸到 15 公尺外的假幾何。處理方式是從某張影格上框出鏡面的螢幕矩形、往場景裡拉出一個角錐、刪掉裡面的東西——不能用世界座標的包圍盒，因為第一次反射就落在真實房間的範圍內，盒子切不掉。',
          ],
        },
        {
          kind: 'chain',
          steps: [
            { label: '重建原檔', value: '162 MB' },
            { label: '砍鏡面反射', value: '149 MB' },
            { label: '修剪針狀與霧', value: '57 MB' },
            { label: 'SOG 交付', value: '5.79 MB' },
          ],
          note: '最終 254,953 顆高斯（原始 718,980）。線上實際檔案 6,072,613 bytes。',
        },
        {
          kind: 'embed',
          src: 'https://room-sepia.vercel.app/scan.html?bare=1',
          title: '房間掃描 · 可互動的 3D 檢視器',
          weight: '5.79 MB',
          caption:
            '拖曳旋轉、滾輪遠近、右鍵平移。視角越靠近原本的拍攝路徑越準——splat 只在被拍過的角度附近成立。',
          full: 'https://room-sepia.vercel.app/scan.html',
        },
      ],
    },

    {
      num: '07',
      title: '還沒解的',
      latin: 'STILL OPEN',
      blocks: [
        {
          kind: 'text',
          body: ['這一段留著，是因為沒有它，前面六段都不該被相信。'],
        },
        {
          kind: 'list',
          items: [
            {
              term: '暗部',
              body: '深色木門那整段仍然不在模型裡。這要靠拍攝時鎖定曝光、刻意過曝、實際補光，不是後處理能救的。',
            },
            {
              term: '真實尺寸',
              body: '目前是解算器的任意單位，沒有公制。iPhone 16（非 Pro）沒有 LiDAR，要靠捲尺量一段已知距離回推縮放係數。',
            },
            {
              term: '發光表面',
              body: '三個螢幕都開著。會發光又會變動的表面是攝影測量的毒藥，那幾塊就是雜訊。',
            },
            {
              term: '單向通過',
              body: '每個表面只從很窄的角度看過一次。畫面下半的糊是資訊不足，不是雜點——那只能重拍補角度。',
            },
          ],
        },
      ],
    },
  ],

  abstract: [
    'Turning a handheld phone video into a Gaussian splat you can walk around in — three takes over three days, in the browser, no plugin.',
    'The decisive finding was not in the software. COLMAP guesses focal length at 1.2× the long edge (2,592 px); the true value for a portrait 4K iPhone frame is 945 px. Off by 2.7×, registration collapses to 2 of 353 frames. With the prior supplied and the focal length locked, 351 of 353 register.',
    'The second finding: exhaustive matching beat sequential at this scale — 8 minutes, zero broken chains, where sequential fragmented into five disconnected components. Below ~600 frames, exhaustive is simply the right choice.',
    'Everything else was capture, not code. Reshooting at 4K dropped the 99th-percentile needle ratio from 1,701 to 39.7. Delivery: 162 MB reconstruction pruned and compressed to a 5.79 MB SOG, with mirror reflections removed by screen-space frustum culling — both for the false geometry they produced and because the wardrobe mirror had captured a recognisable face.',
  ],
};
