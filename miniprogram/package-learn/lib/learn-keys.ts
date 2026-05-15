import type { WordEntry, WordSource } from './types';

export type TargetType = 'builtin' | 'user';

export function targetTypeFromSource(source: WordSource | undefined): TargetType {
  return source === 'user' ? 'user' : 'builtin';
}

export function targetFromWord(w: WordEntry): { targetType: TargetType; targetId: string } {
  return { targetType: targetTypeFromSource(w.source), targetId: w.id };
}

export function extraStorageKey(targetType: TargetType, targetId: string): string {
  return `${targetType}:${targetId}`;
}