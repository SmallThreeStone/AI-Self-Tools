/**
 * 演示用在线 TTS：
 * - **有道 dictvoice**：单词、短片段多为真 MP3；整句长句易 HTTP 500，故例句采用「整句多 type → 截断 → 词头」多 URL 降级（见 `sentenceTtsDownloadCandidates`）。
 * - **百度 fanyi gettts**：在部分微信环境下 `downloadFile` 仅得到极小 HTML，**不再作为默认源**。
 *
 * 公众平台请为 **`https://dict.youdao.com`** 配置 **downloadFile**（及按需 **request**）合法域名。
 */

const youdaoDictvoice = (q: string, type: 0 | 1 | 2) =>
  `https://dict.youdao.com/dictvoice?audio=${encodeURIComponent(q)}&type=${type}`;

/** 从 dictvoice URL 取出 audio 参数原文（用于判断是否整句） */
export function youdaoAudioParamFromUrl(url: string): string | null {
  const m = url.match(/[?&]audio=([^&]*)/i);
  if (!m) return null;
  try {
    return decodeURIComponent(m[1]);
  } catch {
    return null;
  }
}

export function wordTtsDownloadCandidates(headword: string, preset?: string): string[] {
  if (preset && /^https?:\/\//i.test(preset)) return [preset];
  const t = headword.trim();
  if (!t) return [];
  return [youdaoDictvoice(t, 2)];
}

/** 与产品「长句」弱提示阈值一致 */
export const SENTENCE_TTS_MAX_CHARS = 300;

/**
 * 例句朗读 URL 列表（按顺序尝试 `wx.downloadFile` + MP3 校验）。
 * `headword` 用于最后兜底只播词头（仍为有声音频，避免整句 500 时完全无声）。
 */
export function sentenceTtsDownloadCandidates(
  sentence: string,
  preset: string | undefined,
  headword?: string
): string[] {
  if (preset && /^https?:\/\//i.test(preset)) return [preset];
  const raw = sentence.trim().slice(0, SENTENCE_TTS_MAX_CHARS);
  if (!raw) return [];
  const out: string[] = [];
  const seen = new Set<string>();
  const addVoice = (fragment: string) => {
    for (const ty of [2, 0, 1] as const) {
      const u = youdaoDictvoice(fragment, ty);
      if (!seen.has(u)) {
        seen.add(u);
        out.push(u);
      }
    }
  };
  addVoice(raw);
  for (const n of [120, 96, 72, 56, 40, 32, 24, 18, 14]) {
    if (raw.length > n) addVoice(raw.slice(0, n));
  }
  const hw = (headword || '').trim();
  if (hw) addVoice(hw);
  return out;
}

/** @deprecated 仅兼容旧调用；请优先用 `*_TtsDownloadCandidates` + 链式下载 */
export function wordAudioUrl(headword: string, preset?: string): string {
  const xs = wordTtsDownloadCandidates(headword, preset);
  return xs[0] || '';
}

/** @deprecated 仅兼容旧调用 */
export function sentenceAudioUrl(sentence: string, preset?: string): string {
  const xs = sentenceTtsDownloadCandidates(sentence, preset);
  return xs[0] || '';
}
