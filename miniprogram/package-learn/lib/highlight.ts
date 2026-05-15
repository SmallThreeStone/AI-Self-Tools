import type { TextSeg } from './types';

/** 将文本拆成片段，便于 WXML 中高亮与 query 匹配的部分（大小写不敏感） */
export function highlightSegments(text: string, query: string): TextSeg[] {
  const q = query.trim();
  if (!q || !text) return [{ t: text, hit: false }];
  const esc = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`(${esc})`, 'gi');
  const parts = text.split(re);
  const qLow = q.toLowerCase();
  return parts
    .filter((p) => p.length > 0)
    .map((p) => ({
      t: p,
      hit: p.toLowerCase() === qLow,
    }));
}

/** 例句内对词条 headword 的子串高亮（大小写不敏感，展示保留原文大小写） */
export function highlightHeadwordSegments(text: string, headword: string): TextSeg[] {
  const hw = headword.trim();
  if (!hw || !text) return [{ t: text, hit: false }];
  const esc = hw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`(${esc})`, 'gi');
  const parts = text.split(re);
  const lw = hw.toLowerCase();
  return parts
    .filter((p) => p.length > 0)
    .map((p) => ({
      t: p,
      hit: p.toLowerCase() === lw,
    }));
}
