/**
 * 拆解 —— 作品的內頁。
 *
 * 一件作品最多一篇拆解，鍵就是 PROJECTS 的 slug（不另開一套識別碼）。
 * 所以網址是 /work/<slug>，跟輪播、列表指的是同一件事。
 *
 * ⚠️ 收錄判準沿用 projects.ts 那一條：「這件裡面有沒有一個自己解掉的問題」。
 *    每件作品都配一篇，等於八篇薄文，那就變成部落格了 —— 這裡刻意只有有東西可講的才進來。
 *    沒有登記在這裡的作品不會生內頁，列表上也不會出現「拆解」入口。
 */
import type { Study } from './room';
import { STUDY as room } from './room';

export const STUDIES: Record<string, Study> = { room };

/** 這件作品有沒有拆解可以讀 */
export const hasStudy = (slug: string) => slug in STUDIES;

export type { Study, Scene, Block, Reckon, StudyTable } from './room';
