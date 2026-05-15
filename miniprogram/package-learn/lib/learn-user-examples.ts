import type { TargetType } from './learn-keys';
import { extraStorageKey } from './learn-keys';

export const LEARN_WORD_EXTRA_KEY = 'learn_word_extra_v1';

export type UserExampleStored = {
  id: string;
  textEn: string;
  textZh?: string;
  note?: string;
  createdAt: number;
  pinned?: boolean;
  pinnedAt?: number;
};

type ExtraMap = Record<string, { userExamples: UserExampleStored[] }>;

function readMap(): ExtraMap {
  try {
    const v = wx.getStorageSync(LEARN_WORD_EXTRA_KEY);
    if (!v || typeof v !== 'object') return {};
    return v as ExtraMap;
  } catch {
    return {};
  }
}

function writeMap(m: ExtraMap): void {
  wx.setStorageSync(LEARN_WORD_EXTRA_KEY, m);
}

export function readUserExamples(targetType: TargetType, targetId: string): UserExampleStored[] {
  const k = extraStorageKey(targetType, targetId);
  const m = readMap();
  return sortUserExamples([...(m[k]?.userExamples || [])]);
}

function sortUserExamples(list: UserExampleStored[]): UserExampleStored[] {
  return [...list].sort((a, b) => {
    const ap = a.pinned ? a.pinnedAt ?? 0 : 0;
    const bp = b.pinned ? b.pinnedAt ?? 0 : 0;
    if (ap !== bp) return bp - ap;
    return b.createdAt - a.createdAt;
  });
}

export function setUserExamples(targetType: TargetType, targetId: string, list: UserExampleStored[]): void {
  const k = extraStorageKey(targetType, targetId);
  const m = readMap();
  m[k] = { userExamples: sortUserExamples(list) };
  writeMap(m);
}

export function upsertUserExample(
  targetType: TargetType,
  targetId: string,
  row: UserExampleStored
): void {
  const cur = readUserExamples(targetType, targetId);
  const i = cur.findIndex((x) => x.id === row.id);
  if (i >= 0) cur[i] = row;
  else cur.push(row);
  setUserExamples(targetType, targetId, cur);
}

export function deleteUserExample(targetType: TargetType, targetId: string, exId: string): void {
  const cur = readUserExamples(targetType, targetId).filter((x) => x.id !== exId);
  setUserExamples(targetType, targetId, cur);
}

export function newExampleId(): string {
  return `uex-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
}

export function togglePinExample(targetType: TargetType, targetId: string, exId: string): void {
  const cur = readUserExamples(targetType, targetId);
  const i = cur.findIndex((x) => x.id === exId);
  if (i < 0) return;
  const x = cur[i];
  const pinned = !x.pinned;
  cur[i] = {
    ...x,
    pinned,
    pinnedAt: pinned ? Date.now() : undefined,
  };
  setUserExamples(targetType, targetId, cur);
}

export function removeAllExtrasForTarget(targetType: TargetType, targetId: string): void {
  const k = extraStorageKey(targetType, targetId);
  const m = readMap();
  delete m[k];
  writeMap(m);
}
