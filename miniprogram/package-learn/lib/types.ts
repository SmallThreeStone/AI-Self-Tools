export type WordCategory = 'daily' | 'trade';

export type WordSource = 'builtin' | 'user';

export interface WordExample {
  text: string;
  zh_hint?: string;
  audio_sentence_url?: string;
}

export interface WordEntry {
  id: string;
  headword: string;
  phonetic?: string;
  zh: string;
  category: WordCategory;
  examples: WordExample[];
  audio_word_url?: string;
  tags?: string[];
  /** 内置 / 用户自建；合并后必有 */
  source?: WordSource;
  /** 用户词与同分类内置同词头时，列表只保留用户释义 */
  overridesBuiltin?: boolean;
}

/** 仅存本地的用户词条（不含 source 字段） */
export interface UserWordStored {
  id: string;
  headword: string;
  zh: string;
  category: WordCategory;
  phonetic?: string;
  examples?: WordExample[];
  audio_word_url?: string;
  tags?: string[];
}

export interface TextSeg {
  t: string;
  hit: boolean;
}
