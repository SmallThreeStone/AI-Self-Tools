import type { WordCategory, WordEntry, UserWordStored } from './types';
import { WORDS } from '../data/words';
import { readFavoritesRaw } from './learn-favorites';
import type { TargetType } from './learn-keys';
import { readUserExamples } from './learn-user-examples';
import { mergeKey, normHeadword, readUserWordsRaw } from './user-words';

export type ListScope = 'all' | 'daily' | 'trade' | 'favorites';

export function invalidateWordbookCache(): void {
  /* 无合并缓存；保留供编辑/删除调用 */
}

function toWordEntry(u: UserWordStored, overridesBuiltin: boolean): WordEntry {
  return {
    id: u.id,
    headword: u.headword.trim(),
    zh: u.zh.trim(),
    category: u.category,
    phonetic: u.phonetic,
    examples: u.examples && u.examples.length ? u.examples : [],
    audio_word_url: u.audio_word_url,
    tags: u.tags,
    source: 'user',
    overridesBuiltin,
  };
}

function mergeWords(): WordEntry[] {
  const users = readUserWordsRaw();
  const userKeys = new Set(users.map((u) => mergeKey(u.category, u.headword)));
  const out: WordEntry[] = [];
  for (const b of WORDS) {
    const k = mergeKey(b.category, b.headword);
    if (userKeys.has(k)) continue;
    out.push({
      ...b,
      examples: b.examples || [],
      source: 'builtin',
    });
  }
  for (const u of users) {
    const hadBuiltin = WORDS.some(
      (b) =>
        b.category === u.category && normHeadword(b.headword) === normHeadword(u.headword)
    );
    out.push(toWordEntry(u, hadBuiltin));
  }
  return out.sort((a, b) => a.headword.localeCompare(b.headword, 'en'));
}

export function loadWords(): WordEntry[] {
  return mergeWords();
}

export function findWord(id: string): WordEntry | undefined {
  return loadWords().find((w) => w.id === id);
}

function wordKey(w: WordEntry): string {
  const tt: TargetType = w.source === 'user' ? 'user' : 'builtin';
  return `${tt}:${w.id}`;
}

function poolForScope(scope: ListScope): WordEntry[] {
  const all = loadWords();
  if (scope === 'all') return all;
  if (scope === 'daily') return all.filter((w) => w.category === 'daily');
  if (scope === 'trade') return all.filter((w) => w.category === 'trade');
  const favs = readFavoritesRaw();
  const set = new Set(favs.map((f) => `${f.targetType}:${f.targetId}`));
  return all.filter((w) => set.has(wordKey(w)));
}

function filterPoolByQuery(pool: WordEntry[], query: string): WordEntry[] {
  const q = query.trim();
  if (!q) return [...pool];
  const low = q.toLowerCase();
  return pool.filter((w) => {
    if (w.headword.toLowerCase().includes(low)) return true;
    if (w.zh.includes(q)) return true;
    const blob = (w.tags || []).join('');
    if (blob.includes(q)) return true;
    for (const ex of w.examples) {
      if (ex.text.toLowerCase().includes(low)) return true;
      if (ex.zh_hint && ex.zh_hint.includes(q)) return true;
    }
    const tt: TargetType = w.source === 'user' ? 'user' : 'builtin';
    for (const ux of readUserExamples(tt, w.id)) {
      if (ux.textEn.toLowerCase().includes(low)) return true;
      if (ux.textZh && ux.textZh.includes(q)) return true;
      if (ux.note && ux.note.includes(q)) return true;
    }
    return false;
  });
}

function sortPool(scope: ListScope, pool: WordEntry[]): WordEntry[] {
  if (scope !== 'favorites') {
    return [...pool].sort((a, b) => a.headword.localeCompare(b.headword, 'en'));
  }
  const favs = readFavoritesRaw();
  const tsMap = new Map(favs.map((f) => [`${f.targetType}:${f.targetId}`, f.ts]));
  return [...pool].sort((a, b) => {
    const ta = tsMap.get(wordKey(a)) ?? 0;
    const tb = tsMap.get(wordKey(b)) ?? 0;
    if (tb !== ta) return tb - ta;
    return a.headword.localeCompare(b.headword, 'en');
  });
}

export function searchWordsInScope(scope: ListScope, q: string): WordEntry[] {
  const pool = poolForScope(scope);
  const hit = filterPoolByQuery(pool, q);
  return sortPool(scope, hit);
}

/** @deprecated 使用 searchWordsInScope；保留兼容 */
export function searchWords(cat: WordCategory, q: string): WordEntry[] {
  return searchWordsInScope(cat === 'daily' ? 'daily' : 'trade', q);
}

export function wordsSortedByHeadword(cat: WordCategory): WordEntry[] {
  return loadWords()
    .filter((w) => w.category === cat)
    .sort((a, b) => a.headword.localeCompare(b.headword, 'en'));
}
