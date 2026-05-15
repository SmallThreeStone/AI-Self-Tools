/**
 * 例句 TTS 本地缓存：同一 sentenceKey + 文本归一化 hash 对应稳定本地文件路径。
 * 用户编辑例句后文本变 → hash 变 → 自然未命中，等同失效。
 */

const MAP_KEY = 'learn_tts_paths_v1';

function simpleHash(s: string): string {
  let h = 5381;
  for (let i = 0; i < s.length; i += 1) {
    h = (h * 33) ^ s.charCodeAt(i);
  }
  return (h >>> 0).toString(16);
}

export function normalizeTextForTtsCache(text: string): string {
  return text.trim().replace(/\s+/g, ' ');
}

/** 与 `tts.ts` / 播放策略变更时递增；v4 起有道链式降级（弃用百度 gettts 主源） */
const TTS_CACHE_SCHEME = 'youdao_tts_v1';

export function learnTtsCacheKey(sentenceKey: string, text: string): string {
  return `${TTS_CACHE_SCHEME}|${sentenceKey}|${simpleHash(normalizeTextForTtsCache(text))}`;
}

function readMap(): Record<string, string> {
  try {
    const raw = wx.getStorageSync(MAP_KEY) as Record<string, string> | undefined;
    if (raw && typeof raw === 'object' && !Array.isArray(raw)) return { ...raw };
  } catch {
    /* ignore */
  }
  return {};
}

function writeMap(m: Record<string, string>) {
  try {
    wx.setStorageSync(MAP_KEY, m);
  } catch {
    /* ignore */
  }
}

export function getCachedTtsSavedPath(cacheKey: string): string | undefined {
  const m = readMap();
  const p = m[cacheKey];
  if (!p || typeof p !== 'string') return undefined;
  try {
    wx.getFileSystemManager().accessSync(p);
    return p;
  } catch {
    const next = { ...m };
    delete next[cacheKey];
    writeMap(next);
    return undefined;
  }
}

export function removeLearnTtsCacheEntry(cacheKey: string): void {
  const m = readMap();
  if (!m[cacheKey]) return;
  const next = { ...m };
  delete next[cacheKey];
  writeMap(next);
}

/** 将 downloadFile 得到的临时文件写入持久缓存（避免再发起一次远程下载）。 */
export function persistTempTtsToCache(cacheKey: string, tempFilePath: string): void {
  if (!tempFilePath) return;
  wx.getFileSystemManager().saveFile({
    tempFilePath,
    success: (sres: WechatMiniprogram.SaveFileSuccessCallbackResult) => {
      const m = readMap();
      m[cacheKey] = sres.savedFilePath;
      writeMap(m);
    },
  });
}

/** 下载远程 TTS 并写入本地，供下次直播本地文件 */
export function prefetchTtsToCache(cacheKey: string, remoteUrl: string): void {
  if (!remoteUrl || !/^https?:\/\//i.test(remoteUrl)) return;
  wx.downloadFile({
    url: remoteUrl,
    success: (res) => {
      if (res.statusCode !== 200 || !res.tempFilePath) return;
      wx.getFileSystemManager().saveFile({
        tempFilePath: res.tempFilePath,
        success: (sres: WechatMiniprogram.SaveFileSuccessCallbackResult) => {
          const m = readMap();
          m[cacheKey] = sres.savedFilePath;
          writeMap(m);
        },
      });
    },
  });
}
