import type { UserWordStored, WordCategory } from './types';

export const LEARN_USER_WORDS_KEY = 'learn_user_words_v1';
export const HEADWORD_MAX_LEN = 48;

export function normHeadword(h: string): string {
  return h.trim().replace(/\s+/g, ' ').toLowerCase();
}

function isRecord(x: unknown): x is Record<string, unknown> {
  return typeof x === 'object' && x !== null;
}

function isValidStored(x: unknown): x is UserWordStored {
  if (!isRecord(x)) return false;
  const id = x.id;
  const headword = x.headword;
  const zh = x.zh;
  const cat = x.category;
  if (typeof id !== 'string' || !id.startsWith('user-')) return false;
  if (typeof headword !== 'string' || typeof zh !== 'string') return false;
  if (cat !== 'daily' && cat !== 'trade') return false;
  return true;
}

export function readUserWordsRaw(): UserWordStored[] {
  try {
    const v = wx.getStorageSync(LEARN_USER_WORDS_KEY);
    if (!Array.isArray(v)) return [];
    return v.filter(isValidStored);
  } catch {
    return [];
  }
}

export function writeUserWordsRaw(list: UserWordStored[]): void {
  wx.setStorageSync(LEARN_USER_WORDS_KEY, list);
}

export function newUserWordId(): string {
  return `user-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
}

export function mergeKey(category: WordCategory, headword: string): string {
  return `${category}:${normHeadword(headword)}`;
}
