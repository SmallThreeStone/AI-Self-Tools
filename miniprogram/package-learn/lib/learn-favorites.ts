import type { TargetType } from './learn-keys';

export const LEARN_FAVORITES_KEY = 'learn_favorites_v1';

export type FavoriteStored = {
  targetId: string;
  targetType: TargetType;
  ts: number;
};

function isRecord(x: unknown): x is Record<string, unknown> {
  return typeof x === 'object' && x !== null;
}

function isValidFav(x: unknown): x is FavoriteStored {
  if (!isRecord(x)) return false;
  const tid = x.targetId;
  const tt = x.targetType;
  const ts = x.ts;
  if (typeof tid !== 'string' || !tid) return false;
  if (tt !== 'builtin' && tt !== 'user') return false;
  return typeof ts === 'number' && Number.isFinite(ts);
}

export function readFavoritesRaw(): FavoriteStored[] {
  try {
    const v = wx.getStorageSync(LEARN_FAVORITES_KEY);
    if (!Array.isArray(v)) return [];
    return v.filter(isValidFav);
  } catch {
    return [];
  }
}

export function writeFavoritesRaw(list: FavoriteStored[]): void {
  wx.setStorageSync(LEARN_FAVORITES_KEY, list);
}

export function isFavorite(targetType: TargetType, targetId: string): boolean {
  return readFavoritesRaw().some((f) => f.targetType === targetType && f.targetId === targetId);
}

export function toggleFavorite(targetType: TargetType, targetId: string): boolean {
  const list = readFavoritesRaw();
  const i = list.findIndex((f) => f.targetType === targetType && f.targetId === targetId);
  if (i >= 0) {
    list.splice(i, 1);
    writeFavoritesRaw(list);
    return false;
  }
  list.push({ targetType, targetId, ts: Date.now() });
  list.sort((a, b) => b.ts - a.ts);
  writeFavoritesRaw(list);
  return true;
}

export function removeFavoriteByTarget(targetType: TargetType, targetId: string): void {
  const next = readFavoritesRaw().filter((f) => !(f.targetType === targetType && f.targetId === targetId));
  writeFavoritesRaw(next);
}
