/**
 * 是否具备「可送 TTS 的拉丁字母内容」（纯中文等句不展示播放入口）。
 */
export function hasLatinLettersForTts(text: string): boolean {
  return /[a-zA-Z]/.test(text);
}
