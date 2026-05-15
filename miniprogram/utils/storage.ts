import { EXPORTABLE_TOOL_STORAGE_KEYS } from '../config/export-keys';

const KEY_FAV = 'toolbox_favorites';
const KEY_RECENT = 'toolbox_recent';
const KEY_THEME = 'toolbox_theme';
const KEY_THEME_PREF = 'toolbox_theme_pref_v2';
const KEY_USAGE = 'toolbox_usage';
const KEY_SEARCH_HISTORY = 'toolbox_search_history';
const KEY_PINNED = 'toolbox_pinned_v1';

/** 首页「常用」固定工具，最多 3 个 */
export const PINNED_MAX = 3;

const MAX_BACKUP_CHARS = 6 * 1024 * 1024;
const MAX_FAVORITES = 400;
const MAX_RECENT_ITEMS = 40;

export type ThemeMode = 'light' | 'dark';
/** 外观策略：跟随系统 / 固定浅色 / 固定深色 */
export type ThemePreference = 'system' | ThemeMode;

function migrateLegacyThemePref(): void {
  try {
    if (wx.getStorageSync(KEY_THEME_PREF)) return;
    const old = wx.getStorageSync(KEY_THEME) as string;
    if (old === 'dark' || old === 'light') {
      wx.setStorageSync(KEY_THEME_PREF, old);
    }
  } catch {
    /* ignore */
  }
}

function resolveEffective(pref: ThemePreference): ThemeMode {
  if (pref === 'system') {
    try {
      const bi = wx.getAppBaseInfo();
      return bi.theme === 'dark' ? 'dark' : 'light';
    } catch {
      return 'light';
    }
  }
  return pref;
}

export function getThemePreference(): ThemePreference {
  migrateLegacyThemePref();
  try {
    const v = wx.getStorageSync(KEY_THEME_PREF) as string;
    if (v === 'system' || v === 'dark' || v === 'light') return v as ThemePreference;
  } catch {
    /* ignore */
  }
  return 'light';
}

export function setThemePreference(pref: ThemePreference): void {
  wx.setStorageSync(KEY_THEME_PREF, pref);
  try {
    wx.setStorageSync(KEY_THEME, resolveEffective(pref));
  } catch {
    /* ignore */
  }
}

/** 当前生效的浅/深（已解析「跟随系统」） */
export function getTheme(): ThemeMode {
  return resolveEffective(getThemePreference());
}

/** 兼容旧接口：等同设为浅色或深色（非跟随） */
export function setTheme(mode: ThemeMode): void {
  setThemePreference(mode);
}

export function getFavorites(): string[] {
  try {
    const raw = wx.getStorageSync(KEY_FAV);
    return Array.isArray(raw) ? raw : [];
  } catch {
    return [];
  }
}

export function toggleFavorite(id: string): boolean {
  const list = getFavorites();
  const idx = list.indexOf(id);
  if (idx >= 0) {
    list.splice(idx, 1);
  } else {
    list.unshift(id);
  }
  wx.setStorageSync(KEY_FAV, list);
  return list.includes(id);
}

export function isFavorite(id: string): boolean {
  return getFavorites().includes(id);
}

type RecentItem = { id: string; ts: number };

export function getRecentMeta(): RecentItem[] {
  try {
    const raw = wx.getStorageSync(KEY_RECENT) as RecentItem[];
    return Array.isArray(raw) ? raw : [];
  } catch {
    return [];
  }
}

export function getLastUsedAt(toolId: string): number | undefined {
  const hit = getRecentMeta().find((x) => x.id === toolId);
  return hit?.ts;
}

export function recordRecent(id: string, max = 20): void {
  let list: RecentItem[] = [];
  try {
    const raw = wx.getStorageSync(KEY_RECENT);
    if (Array.isArray(raw)) list = raw;
  } catch {
    list = [];
  }
  const next = [{ id, ts: Date.now() }, ...list.filter((x) => x.id !== id)].slice(0, max);
  wx.setStorageSync(KEY_RECENT, next);
}

export function getRecentIds(): string[] {
  return getRecentMeta().map((x) => x.id);
}

export function getPinnedIds(): string[] {
  try {
    const raw = wx.getStorageSync(KEY_PINNED);
    if (!Array.isArray(raw)) return [];
    return raw.filter((x): x is string => typeof x === 'string').slice(0, PINNED_MAX);
  } catch {
    return [];
  }
}

export function setPinnedIds(ids: string[]): void {
  const uniq = [...new Set(ids)].slice(0, PINNED_MAX);
  wx.setStorageSync(KEY_PINNED, uniq);
}

export function isPinned(id: string): boolean {
  return getPinnedIds().includes(id);
}

export function togglePinned(id: string): { pinned: boolean; error?: 'full' } {
  const cur = getPinnedIds();
  const idx = cur.indexOf(id);
  if (idx >= 0) {
    setPinnedIds(cur.filter((x) => x !== id));
    return { pinned: false };
  }
  if (cur.length >= PINNED_MAX) {
    return { pinned: false, error: 'full' };
  }
  setPinnedIds([...cur, id]);
  return { pinned: true };
}

export function bumpUsage(id: string): void {
  let map: Record<string, number> = {};
  try {
    const raw = wx.getStorageSync(KEY_USAGE);
    if (raw && typeof raw === 'object') map = raw as Record<string, number>;
  } catch {
    map = {};
  }
  map[id] = (map[id] ?? 0) + 1;
  wx.setStorageSync(KEY_USAGE, map);
}

export function getUsageMap(): Record<string, number> {
  try {
    const raw = wx.getStorageSync(KEY_USAGE);
    return raw && typeof raw === 'object' ? (raw as Record<string, number>) : {};
  } catch {
    return {};
  }
}

export function clearAllUserData(): void {
  wx.removeStorageSync(KEY_FAV);
  wx.removeStorageSync(KEY_RECENT);
  wx.removeStorageSync(KEY_USAGE);
  wx.removeStorageSync(KEY_SEARCH_HISTORY);
  wx.removeStorageSync(KEY_PINNED);
}

const SEARCH_HISTORY_MAX = 15;

export function addSearchHistory(q: string): void {
  const raw = q.trim();
  if (!raw) return;
  let list: string[] = [];
  try {
    const v = wx.getStorageSync(KEY_SEARCH_HISTORY);
    if (Array.isArray(v)) list = v.filter((x): x is string => typeof x === 'string');
  } catch {
    list = [];
  }
  const next = [raw, ...list.filter((x) => x !== raw)].slice(0, SEARCH_HISTORY_MAX);
  wx.setStorageSync(KEY_SEARCH_HISTORY, next);
}

export function getSearchHistory(): string[] {
  try {
    const v = wx.getStorageSync(KEY_SEARCH_HISTORY);
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string').slice(0, SEARCH_HISTORY_MAX) : [];
  } catch {
    return [];
  }
}

export function clearSearchHistory(): void {
  try {
    wx.removeStorageSync(KEY_SEARCH_HISTORY);
  } catch {
    /* ignore */
  }
}

function collectToolStorageForExport(): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const { key } of EXPORTABLE_TOOL_STORAGE_KEYS) {
    try {
      const v = wx.getStorageSync(key);
      if (v !== undefined && v !== '') out[key] = v;
    } catch {
      /* skip */
    }
  }
  return out;
}

/** 完整备份 JSON（v2）：含核心配置与白名单内工具数据 */
export function exportUserPayload(): string {
  return JSON.stringify(
    {
      schemaVersion: 2,
      schema: 'toolbox-backup-v2',
      exportedAt: Date.now(),
      core: {
        favorites: getFavorites(),
        pinned: getPinnedIds(),
        recent: getRecentMeta(),
        usage: getUsageMap(),
        searchHistory: getSearchHistory(),
        themePreference: getThemePreference(),
      },
      toolStorage: collectToolStorageForExport(),
    },
    null,
    2
  );
}

export function exportFavoritesPayload(): string {
  return JSON.stringify(
    {
      favorites: getFavorites(),
      exportedAt: Date.now(),
      schema: 'toolbox-favorites-v1',
    },
    null,
    2
  );
}

export function importFavoritesPayload(json: string): boolean {
  try {
    const data = JSON.parse(json) as {
      favorites?: unknown;
      schema?: string;
    };
    if (!Array.isArray(data.favorites)) return false;
    const ids = data.favorites.filter((x): x is string => typeof x === 'string').slice(0, MAX_FAVORITES);
    wx.setStorageSync(KEY_FAV, ids);
    return true;
  } catch {
    return false;
  }
}

function isAllowedToolKey(k: string): boolean {
  return EXPORTABLE_TOOL_STORAGE_KEYS.some((x) => x.key === k);
}

function mergeStringLists(a: string[], b: string[], maxLen: number): string[] {
  return [...new Set([...a, ...b])].slice(0, maxLen);
}

function mergeRecent(a: RecentItem[], b: RecentItem[]): RecentItem[] {
  const map = new Map<string, RecentItem>();
  for (const x of [...a, ...b]) {
    if (!x || typeof x.id !== 'string' || typeof x.ts !== 'number') continue;
    const prev = map.get(x.id);
    if (!prev || x.ts > prev.ts) map.set(x.id, x);
  }
  return [...map.values()].sort((p, q) => q.ts - p.ts).slice(0, 20);
}

function mergeUsage(a: Record<string, number>, b: Record<string, number>): Record<string, number> {
  const out = { ...a };
  for (const [k, v] of Object.entries(b)) {
    if (typeof v !== 'number' || !Number.isFinite(v)) continue;
    out[k] = (out[k] ?? 0) + v;
  }
  return out;
}

function applyToolStoragePayload(raw: unknown, mode: 'merge' | 'replace'): void {
  if (mode === 'replace') {
    clearWhitelistedToolKeys();
  }
  if (!raw || typeof raw !== 'object') return;
  const obj = raw as Record<string, unknown>;
  for (const k of Object.keys(obj)) {
    if (!isAllowedToolKey(k)) continue;
    try {
      wx.setStorageSync(k, obj[k]);
    } catch {
      /* skip */
    }
  }
}

function clearWhitelistedToolKeys(): void {
  for (const { key } of EXPORTABLE_TOOL_STORAGE_KEYS) {
    try {
      wx.removeStorageSync(key);
    } catch {
      /* ignore */
    }
  }
}

export type ImportMode = 'merge' | 'replace';

export function importFullBackup(json: string, mode: ImportMode): { ok: boolean; error?: string } {
  if (!json || json.length > MAX_BACKUP_CHARS) {
    return { ok: false, error: '文件过大或为空' };
  }
  let data: unknown;
  try {
    data = JSON.parse(json);
  } catch {
    return { ok: false, error: '不是合法的 JSON' };
  }
  if (!data || typeof data !== 'object') {
    return { ok: false, error: '数据格式无效' };
  }

  const obj = data as Record<string, unknown>;
  const schema = obj.schema as string | undefined;
  const v2 = schema === 'toolbox-backup-v2' || obj.schemaVersion === 2;

  if (v2) {
    return importV2(obj, mode);
  }

  const legacyShape =
    schema === 'toolbox-backup-v1' ||
    Array.isArray(obj.favorites) ||
    Array.isArray(obj.pinned) ||
    Array.isArray(obj.recent) ||
    !!(obj.usage && typeof obj.usage === 'object');
  if (legacyShape) {
    return importV1(obj, mode);
  }

  return { ok: false, error: '无法识别的备份版本' };
}

function importV2(root: Record<string, unknown>, mode: ImportMode): { ok: boolean; error?: string } {
  const core = root.core as Record<string, unknown> | undefined;
  const toolStorage = root.toolStorage;

  if (!core || typeof core !== 'object') {
    return { ok: false, error: '缺少 core 区块' };
  }

  const favIn = core.favorites;
  const pinIn = core.pinned;
  const recentIn = core.recent;
  const usageIn = core.usage;
  const searchIn = core.searchHistory;
  const themePrefIn = core.themePreference;

  if (favIn !== undefined && !Array.isArray(favIn)) return { ok: false, error: 'favorites 格式错误' };
  if (pinIn !== undefined && !Array.isArray(pinIn)) return { ok: false, error: 'pinned 格式错误' };
  if (recentIn !== undefined && !Array.isArray(recentIn)) return { ok: false, error: 'recent 格式错误' };
  if (usageIn !== undefined && (typeof usageIn !== 'object' || usageIn === null)) {
    return { ok: false, error: 'usage 格式错误' };
  }
  if (searchIn !== undefined && !Array.isArray(searchIn)) return { ok: false, error: 'searchHistory 格式错误' };

  const favArr = (favIn as unknown[] | undefined)?.filter((x): x is string => typeof x === 'string') ?? [];
  const pinArr = (pinIn as unknown[] | undefined)?.filter((x): x is string => typeof x === 'string') ?? [];
  const recentArr =
    (recentIn as unknown[] | undefined)
      ?.filter(
        (x): x is RecentItem =>
          !!x && typeof x === 'object' && typeof (x as RecentItem).id === 'string' && typeof (x as RecentItem).ts === 'number'
      ) ?? [];
  const searchArr =
    (searchIn as unknown[] | undefined)?.filter((x): x is string => typeof x === 'string') ?? [];

  if (mode === 'replace') {
    wx.setStorageSync(KEY_FAV, favArr.slice(0, MAX_FAVORITES));
    setPinnedIds(pinArr);
    wx.setStorageSync(KEY_RECENT, recentArr.slice(0, MAX_RECENT_ITEMS));
    if (usageIn && typeof usageIn === 'object') wx.setStorageSync(KEY_USAGE, usageIn);
    wx.setStorageSync(KEY_SEARCH_HISTORY, searchArr.slice(0, SEARCH_HISTORY_MAX));
    if (themePrefIn === 'system' || themePrefIn === 'dark' || themePrefIn === 'light') {
      setThemePreference(themePrefIn as ThemePreference);
    }
    applyToolStoragePayload(toolStorage, 'replace');
    return { ok: true };
  }

  const mergedFav = mergeStringLists(getFavorites(), favArr, MAX_FAVORITES);
  wx.setStorageSync(KEY_FAV, mergedFav);

  const mergedPin = mergeStringLists(getPinnedIds(), pinArr, PINNED_MAX);
  setPinnedIds(mergedPin);

  wx.setStorageSync(KEY_RECENT, mergeRecent(getRecentMeta(), recentArr));

  if (usageIn && typeof usageIn === 'object') {
    wx.setStorageSync(KEY_USAGE, mergeUsage(getUsageMap(), usageIn as Record<string, number>));
  }

  const mergedSearch = mergeStringLists(getSearchHistory(), searchArr, SEARCH_HISTORY_MAX);
  wx.setStorageSync(KEY_SEARCH_HISTORY, mergedSearch);

  applyToolStoragePayload(toolStorage, 'merge');
  return { ok: true };
}

function importV1(data: Record<string, unknown>, mode: ImportMode): { ok: boolean; error?: string } {
  const favorites = data.favorites;
  const pinned = data.pinned;
  const recent = data.recent;
  const usage = data.usage;
  const theme = data.theme;

  if (favorites !== undefined && !Array.isArray(favorites)) return { ok: false, error: 'favorites 格式错误' };

  if (mode === 'replace') {
    if (Array.isArray(favorites)) {
      wx.setStorageSync(
        KEY_FAV,
        favorites.filter((x): x is string => typeof x === 'string').slice(0, MAX_FAVORITES)
      );
    }
    if (Array.isArray(pinned)) {
      setPinnedIds(pinned.filter((x): x is string => typeof x === 'string'));
    }
    if (Array.isArray(recent)) {
      const ok = recent.filter(
        (x): x is RecentItem =>
          !!x && typeof x === 'object' && typeof (x as RecentItem).id === 'string' && typeof (x as RecentItem).ts === 'number'
      );
      wx.setStorageSync(KEY_RECENT, ok.slice(0, MAX_RECENT_ITEMS));
    }
    if (usage && typeof usage === 'object') wx.setStorageSync(KEY_USAGE, usage as Record<string, number>);
    if (theme === 'dark' || theme === 'light') setThemePreference(theme);
    return { ok: true };
  }

  if (Array.isArray(favorites)) {
    const add = favorites.filter((x): x is string => typeof x === 'string');
    wx.setStorageSync(KEY_FAV, mergeStringLists(getFavorites(), add, MAX_FAVORITES));
  }
  if (Array.isArray(pinned)) {
    const add = pinned.filter((x): x is string => typeof x === 'string');
    setPinnedIds(mergeStringLists(getPinnedIds(), add, PINNED_MAX));
  }
  if (Array.isArray(recent)) {
    const ok = recent.filter(
      (x): x is RecentItem =>
        !!x && typeof x === 'object' && typeof (x as RecentItem).id === 'string' && typeof (x as RecentItem).ts === 'number'
    );
    wx.setStorageSync(KEY_RECENT, mergeRecent(getRecentMeta(), ok));
  }
  if (usage && typeof usage === 'object') {
    wx.setStorageSync(KEY_USAGE, mergeUsage(getUsageMap(), usage as Record<string, number>));
  }
  return { ok: true };
}

/** @deprecated 请使用 importFullBackup；保留兼容旧调用（默认合并） */
export function importUserPayload(json: string): boolean {
  return importFullBackup(json, 'merge').ok;
}
