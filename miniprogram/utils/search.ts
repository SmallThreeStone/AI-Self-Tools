import { tools as allTools } from '../config/tools';
import { getUsageMap } from './storage';

/** 首页热搜标签（点击即填入搜索，仅存本地展示） */
export const HOT_SEARCH_LABELS = ['bmi', '番茄', '向导', '水印', '转盘', '分账'];

/** 命令别名 -> 工具 id */
const aliases: Record<string, string> = {
  memo: 'memo',
  备忘: 'memo',
  trim: 'text-clean',
  文本: 'text-clean',
  team: 'team-split',
  分组: 'team-split',
  bmi: 'bmi',
  pwd: 'password',
  pomodoro: 'pomodoro',
  timer: 'pomodoro',
  discount: 'discount',
  unit: 'unit-convert',
  watermark: 'watermark',
  qr: 'qrcode',
  qrcode: 'qrcode',
  coin: 'coin',
  split: 'bill-split',
  text2img: 'text-to-image',
  grid: 'grid-cut',
  board: 'whiteboard',
  wm: 'watermark',
  img: 'watermark',
  tomato: 'pomodoro',
  番茄: 'pomodoro',
  pass: 'password',
  wheel: 'decision-wheel',
  dare: 'truth-dare',
  kin: 'relative-calc',
  fish: 'wooden-fish',
  snake: 'snake',
  palette: 'palette',
  color: 'palette',
  转盘: 'decision-wheel',
  亲戚: 'relative-calc',
  木鱼: 'wooden-fish',
  贪吃蛇: 'snake',
  蛇: 'snake',
  单词本: 'wordbook',
  wordbook: 'wordbook',
  背单词: 'wordbook',
  词表: 'wordbook',
  倒数: 'countdown',
  北京: 'beijing-trip',
  beijing: 'beijing-trip',
  北京游: 'beijing-trip',
  向导: 'beijing-trip',
  故宫: 'beijing-trip',
  长城: 'beijing-trip',
  邯郸: 'beijing-trip',
 水印: 'watermark',
 白板: 'whiteboard',
 账单: 'bill-split',
};

export function filterTools(keyword: string) {
  const q = keyword.trim().toLowerCase();
  if (!q) return allTools;
  const aliasId = aliases[q];
  if (aliasId) {
    const hit = allTools.filter((t) => t.id === aliasId);
    if (hit.length) return hit;
  }
  return allTools.filter((t) => {
    const blob = `${t.name}${t.desc}${t.tags.join('')}`.toLowerCase();
    return blob.includes(q);
  });
}

export function guessTools(favoriteIds: string[], recentIds: string[]) {
  const usage = getUsageMap();
  const scored = allTools.map((t) => {
    let score = 0;
    if (usage[t.id]) score += usage[t.id] * 3;
    if (recentIds.includes(t.id)) score += 5;
    if (favoriteIds.includes(t.id)) score += 2;
    return { tool: t, score };
  });
  scored.sort((a, b) => b.score - a.score);
  const picked = scored.filter((x) => x.score > 0).map((x) => x.tool);
  const pool = allTools
    .filter((t) => !favoriteIds.includes(t.id))
    .sort((a, b) => (usage[b.id] ?? 0) - (usage[a.id] ?? 0));
  const out = [...picked];
  let i = 0;
  while (out.length < 8 && i < pool.length) {
    if (!out.find((x) => x.id === pool[i].id)) out.push(pool[i]);
    i += 1;
  }
  return out.slice(0, 8);
}
