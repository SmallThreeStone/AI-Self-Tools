import { getLearnTtsDailyLimit } from './learn-tts-config';

const STORAGE_KEY = 'learn_tts_quota_v1';

type QuotaRow = { d: string; n: number };

function todayKey(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = `${d.getMonth() + 1}`.padStart(2, '0');
  const day = `${d.getDate()}`.padStart(2, '0');
  return `${y}${m}${day}`;
}

function readRow(): QuotaRow {
  try {
    const raw = wx.getStorageSync(STORAGE_KEY) as QuotaRow | undefined;
    if (raw && typeof raw === 'object' && typeof raw.d === 'string' && typeof raw.n === 'number') {
      return { d: raw.d, n: Math.max(0, Math.floor(raw.n)) };
    }
  } catch {
    /* ignore */
  }
  return { d: '', n: 0 };
}

function writeRow(row: QuotaRow) {
  try {
    wx.setStorageSync(STORAGE_KEY, row);
  } catch {
    /* ignore */
  }
}

function normalizedRowForToday(): QuotaRow {
  const t = todayKey();
  let row = readRow();
  if (row.d !== t) {
    row = { d: t, n: 0 };
    writeRow(row);
  }
  return row;
}

/** 当前日已成功开始播放的次数（单词 + 例句合计，在 onPlay 时 +1） */
export function getLearnTtsUsedToday(): number {
  const t = todayKey();
  const row = readRow();
  if (row.d !== t) return 0;
  return row.n;
}

/** 是否仍有一次播放额度（未真正扣减） */
export function hasLearnTtsSlot(): boolean {
  const limit = getLearnTtsDailyLimit();
  if (limit === null) return true;
  return getLearnTtsUsedToday() < limit;
}

/** 音频 onPlay 回调里调用：一次成功起播计 1 次 */
export function commitLearnTtsPlay(): void {
  const limit = getLearnTtsDailyLimit();
  if (limit === null) return;
  const row = normalizedRowForToday();
  const next = { d: row.d, n: row.n + 1 };
  writeRow(next);
}

/** 点击播放前：已达上限则 Toast 并返回 false */
export function ensureLearnTtsSlotBeforePlay(): boolean {
  if (hasLearnTtsSlot()) return true;
  wx.showToast({
    title: '今日朗读次数已用完，明日 0 点后可继续使用',
    icon: 'none',
    duration: 2800,
  });
  return false;
}
