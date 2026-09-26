/**
 * 掃 G:\Vault，把「第二大腦」的真實篇數寫進 src/data/brain.json。
 *
 * 為什麼是獨立的一步，不塞進 build：
 *   media.ts 能在 build 時掃 public/media，是因為那個資料夾在 repo 裡，
 *   Vercel 的雲端 build 機器也拿得到。G:\Vault 不在 repo 裡、雲端更看不到 ——
 *   在 build 時讀它，本機 build 對、雲端 build 直接爆（見 README「素材資料夾的位置」那課）。
 *   所以這支在**本機**跑、把數字快照進 brain.json（進 repo），build 只讀那份快照。
 *
 *   流程：改完筆記 → `npm run sync` → `vercel --prod`。
 *
 * ── 計數慣例（唯一真相，改這裡就改全站的數字定義）────────────────────────
 *   一篇「筆記」= 一個 .md，但排除這些「不是內容」的檔：
 *     · _INDEX.md        —— 資料夾導航（第二層地圖，不是內容）
 *     · 00 索引.md        —— 給人看的總覽 MOC
 *     · 根目錄 CLAUDE.md / AGENTS.md —— AI 進門讀的地圖本身（圖上已是 root 節點）
 *     · Attachments/**   —— 圖片與附件區
 *     · **\/Templates/** —— 範本，不是筆記（例 Reading/Templates）
 *   total = 全 vault 的內容筆記數；各資料夾數 = 同一份清單按路徑前綴篩出的子集
 *   （保證資料夾數字一定是 total 的子集，不會各算各的對不起來）。
 *
 * 用法：
 *   node tools/scan-vault.mjs            # 預設掃 G:\Vault（相對本 repo 的 ../../Vault）
 *   VAULT_PATH=D:\Notes node tools/scan-vault.mjs
 */
import { readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, resolve, dirname, basename, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(__dirname, '..');

// 預設：這台機器的 vault 在 G:\Vault，相對 repo 是 ../../Vault（G:\Projects\personal-site → G:\）。
// 換機器或搬 vault，用 VAULT_PATH 覆蓋，不用改 code。
const VAULT = process.env.VAULT_PATH || resolve(REPO, '..', '..', 'Vault');
const OUT = join(REPO, 'src', 'data', 'brain.json');

/** 圖上畫的七個資料夾：key（給 code 用）→ vault 裡的實際資料夾名 */
const FOLDERS = {
  context: 'Context',
  projects: '1 Projects',
  topics: '3 Topics',
  journal: 'Journal',
  clippings: 'Clippings',
  reading: 'Reading',
  inbox: '0 Inbox',
};

/** 個別節點有畫在圖上的資料夾 —— 存檔名清單，之後可對照「畫的點是不是還在」 */
const INVENTORY = ['context', 'projects'];

/** 遞迴列出資料夾底下所有 .md 的絕對路徑 */
function walk(dir) {
  let out = [];
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return out; // 資料夾不存在就當空的，不炸
  }
  for (const name of entries) {
    // 點資料夾是工具與設定，不是筆記：.git / .obsidian / .agents / .claude / .trash …
    // （skill 檔、斜線指令、Obsidian 設定都住這裡，算進來會灌水）
    if (name.startsWith('.')) continue;
    const full = join(dir, name);
    let s;
    try {
      s = statSync(full);
    } catch {
      continue;
    }
    if (s.isDirectory()) out = out.concat(walk(full));
    else if (name.toLowerCase().endsWith('.md')) out.push(full);
  }
  return out;
}

/** 內容筆記判準（見檔頭「計數慣例」） */
function isContentNote(abs) {
  const rel = relative(VAULT, abs);
  const parts = rel.split(sep);
  const name = basename(abs);
  const lower = name.toLowerCase();

  if (lower === '_index.md') return false;
  if (name === '00 索引.md') return false;
  if (parts.length === 1 && (name === 'CLAUDE.md' || name === 'AGENTS.md')) return false;
  if (parts[0] === 'Attachments') return false;
  if (parts.includes('Templates')) return false;
  return true;
}

// —— 掃 ——
const allMd = walk(VAULT);
const contentNotes = allMd.filter(isContentNote);

const folders = {};
const notes = {};
for (const [key, folderName] of Object.entries(FOLDERS)) {
  const prefix = join(VAULT, folderName) + sep;
  const inFolder = contentNotes.filter((p) => p.startsWith(prefix));
  folders[key] = inFolder.length;
  if (INVENTORY.includes(key)) {
    notes[key] = inFolder.map((p) => basename(p, '.md')).sort((a, b) => a.localeCompare(b, 'zh-Hant'));
  }
}

const scannedAt = new Date().toISOString().slice(0, 10);
const data = {
  _generated: '由 tools/scan-vault.mjs 產生，勿手改。重掃：npm run sync',
  scannedAt,
  vault: VAULT,
  total: contentNotes.length,
  folders,
  notes,
};

writeFileSync(OUT, JSON.stringify(data, null, 2) + '\n', 'utf8');

// —— 人看的摘要 ——
console.log(`\n第二大腦實掃 · ${scannedAt}`);
console.log(`vault: ${VAULT}`);
console.log(`─────────────────────────────`);
for (const [key, folderName] of Object.entries(FOLDERS)) {
  console.log(`  ${folderName.padEnd(12)} ${String(folders[key]).padStart(3)}`);
}
console.log(`─────────────────────────────`);
console.log(`  總篇數        ${String(data.total).padStart(3)}`);
console.log(`\n寫入 ${relative(REPO, OUT)}`);

// —— 異常提醒（不擋，只叫出來讓人看一眼）——
const warn = [];
if (folders.reading <= 1) warn.push(`Reading 只有 ${folders.reading} 篇 —— 書搬走了還是換了記法？`);
if (folders.inbox === 0) warn.push('Inbox 是空的（正常：已歸檔）。');
if (data.total === 0) warn.push('總數 0 —— vault 路徑對嗎？用 VAULT_PATH 指定看看。');
if (warn.length) {
  console.log('\n⚠️  順手確認：');
  for (const w of warn) console.log(`   · ${w}`);
}
console.log('');
