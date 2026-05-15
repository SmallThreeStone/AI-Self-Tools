/** 默认每日「单词 + 例句」合成朗读次数上限（与 learn_tts_config_v1 可覆盖） */
export const LEARN_TTS_DEFAULT_DAILY_LIMIT = 80;

export type LearnTtsConfigStored = {
  /** `null` / `-1` 表示关闭上限；`0` 表示禁止一切 TTS（慎用） */
  dailyLimit?: number | null;
};

export function getLearnTtsDailyLimit(): number | null {
  try {
    let raw = wx.getStorageSync('learn_tts_config_v1') as LearnTtsConfigStored | string | undefined;
    if (typeof raw === 'string') {
      try {
        raw = JSON.parse(raw) as LearnTtsConfigStored;
      } catch {
        raw = undefined;
      }
    }
    if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
      const v = raw.dailyLimit;
      if (v === null || v === -1) return null;
      if (typeof v === 'number' && Number.isFinite(v) && v >= 0) return Math.floor(v);
    }
  } catch {
    /* ignore */
  }
  return LEARN_TTS_DEFAULT_DAILY_LIMIT;
}
