import { persistTempTtsToCache } from './learn-tts-cache';

export type PlayHttpAudioOptions = {
  onFail: () => void;
  /** 仅当「最终采用的 URL」与之一致时写入缓存（避免截断/兜底音频写进整句 key） */
  persistCacheKey?: string;
  persistOnlyIfUrl?: string;
  /** 下载校验通过、即将 `play()` 时回调（用于降级提示） */
  onWin?: (meta: { url: string; index: number }) => void;
};

/** 在开发者工具 Console 中过滤 `[learn-tts]` 可复制整段给研发 */
export function logLearnTts(tag: string, payload: Record<string, unknown>) {
  try {
    console.error(`[learn-tts] ${tag}`, payload);
  } catch {
    /* ignore */
  }
}

function safeHost(u: string): string {
  try {
    const h = new URL(u).host;
    if (h) return h;
  } catch {
    /* 部分运行环境 new URL 异常 */
  }
  const m = u.match(/^https?:\/\/([^/?#]+)/i);
  return m ? m[1] : '';
}

function skipBomAndWhitespace(u8: Uint8Array): number {
  let i = 0;
  if (u8.length >= 3 && u8[0] === 0xef && u8[1] === 0xbb && u8[2] === 0xbf) {
    i = 3;
  }
  while (i < u8.length && (u8[i] === 0x0a || u8[i] === 0x0d || u8[i] === 0x20 || u8[i] === 0x09)) {
    i += 1;
  }
  return i;
}

function sniffTextJsonHtml(u8: Uint8Array): boolean {
  const i = skipBomAndWhitespace(u8);
  if (i >= u8.length) return true;
  const c = u8[i];
  return c === 0x3c || c === 0x7b || c === 0x5b;
}

function sniffMpegOrId3(u8: Uint8Array): boolean {
  const i = skipBomAndWhitespace(u8);
  if (i + 2 >= u8.length) return false;
  if (u8[i] === 0x49 && u8[i + 1] === 0x44 && u8[i + 2] === 0x33) return true;
  if (u8[i] === 0xff && (u8[i + 1] & 0xe0) === 0xe0) return true;
  return false;
}

export function runWithMp3FileValidated(
  filePath: string,
  onOk: () => void,
  onBad: (reason: string) => void
): void {
  const fs = wx.getFileSystemManager();
  fs.getFileInfo({
    filePath,
    success: (fi) => {
      if (fi.size < 200) {
        onBad('size_lt_200');
        return;
      }
      fs.readFile({
        filePath,
        position: 0,
        length: 512,
        /** 开发者工具里常见为 base64 字符串，而非 ArrayBuffer */
        encoding: 'base64',
        success: (rb) => {
          const raw = rb.data;
          let u8: Uint8Array;
          if (typeof raw === 'string') {
            try {
              u8 = new Uint8Array(wx.base64ToArrayBuffer(raw));
            } catch {
              onBad('base64_decode_fail');
              return;
            }
          } else if (raw instanceof ArrayBuffer) {
            u8 = new Uint8Array(raw);
          } else {
            onBad('read_bad_type');
            return;
          }
          if (u8.length === 0) {
            onBad('empty_head');
            return;
          }
          if (sniffTextJsonHtml(u8)) {
            onBad('looks_like_text');
            return;
          }
          if (!sniffMpegOrId3(u8)) {
            onBad('not_mp3_magic');
            return;
          }
          onOk();
        },
        fail: (e) => {
          logLearnTts('validate.readFile.fail', { errMsg: e.errMsg });
          onBad('read_fail');
        },
      });
    },
    fail: (e) => {
      logLearnTts('validate.getFileInfo.fail', { errMsg: e.errMsg });
      onBad('fileinfo_fail');
    },
  });
}

/**
 * 依次尝试多个 https，直到下载到通过 MP3 校验的临时文件再播放。
 * 单 URL 可传长度为 1 的数组（兼容旧逻辑）。
 */
export function playInnerAudioFromUrlChain(
  audio: WechatMiniprogram.InnerAudioContext,
  urls: string[],
  options: PlayHttpAudioOptions
): void {
  const clean = urls.filter((u) => u && /^https?:\/\//i.test(u));
  if (clean.length === 0) {
    wx.showToast({ title: '暂无可播放地址', icon: 'none' });
    options.onFail();
    return;
  }

  let idx = 0;

  const tryNext = () => {
    if (idx >= clean.length) {
      logLearnTts('chain.exhausted', { tried: clean.length });
      wx.showToast({ title: '演示朗读暂不可用，请稍后或换网络', icon: 'none', duration: 2800 });
      options.onFail();
      return;
    }

    const url = clean[idx];
    const cur = idx;
    idx += 1;

    logLearnTts('chain.try', {
      index: cur,
      total: clean.length,
      urlLen: url.length,
      host: safeHost(url),
    });

    wx.downloadFile({
      url,
      timeout: 120000,
      success: (res) => {
        logLearnTts('download.success', {
          index: cur,
          statusCode: res.statusCode,
          hasTemp: !!res.tempFilePath,
          profile: res.profile,
        });
        if (res.statusCode !== 200 || !res.tempFilePath) {
          logLearnTts('chain.bad_status', { index: cur, statusCode: res.statusCode });
          tryNext();
          return;
        }

        const temp = res.tempFilePath;

        const attachAndPlay = () => {
          try {
            audio.stop();
          } catch {
            /* ignore */
          }
          audio.src = temp;
          audio.play();
          const pk = options.persistCacheKey;
          const only = options.persistOnlyIfUrl;
          if (pk && (!only || only === url)) {
            persistTempTtsToCache(pk, temp);
          }
        };

        runWithMp3FileValidated(
          temp,
          () => {
            logLearnTts('chain.ok', { index: cur });
            options.onWin?.({ url, index: cur });
            attachAndPlay();
          },
          (reason) => {
            logLearnTts('chain.body_not_mp3', { index: cur, reason, tempTail: temp.slice(-48) });
            tryNext();
          }
        );
      },
      fail: (err) => {
        logLearnTts('chain.download_fail', {
          index: cur,
          errMsg: err.errMsg,
          errno: (err as WechatMiniprogram.GeneralCallbackResult & { errno?: number }).errno,
        });
        tryNext();
      },
    });
  };

  tryNext();
}

/** @deprecated 请用 `playInnerAudioFromUrlChain(audio, [url], opt)` */
export function playInnerAudioFromHttpOrPath(
  audio: WechatMiniprogram.InnerAudioContext,
  url: string,
  options: PlayHttpAudioOptions
): void {
  if (!/^https?:\/\//i.test(url)) {
    try {
      audio.stop();
    } catch {
      /* ignore */
    }
    audio.src = url;
    audio.play();
    return;
  }
  playInnerAudioFromUrlChain(audio, [url], options);
}
