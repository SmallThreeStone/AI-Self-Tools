import { applyThemeForToolPage } from '../../utils/nav-theme';
import { buildToolShareMessage } from '../../utils/tool-share';
import type { TextSeg, WordEntry, WordExample } from '../lib/types';
import { findWord, invalidateWordbookCache } from '../lib/word-store';
import { highlightHeadwordSegments, highlightSegments } from '../lib/highlight';
import { SENTENCE_TTS_MAX_CHARS, sentenceTtsDownloadCandidates, wordTtsDownloadCandidates, youdaoAudioParamFromUrl } from '../lib/tts';
import { readUserWordsRaw, writeUserWordsRaw } from '../lib/user-words';
import { isFavorite, removeFavoriteByTarget, toggleFavorite } from '../lib/learn-favorites';
import { targetFromWord, type TargetType } from '../lib/learn-keys';
import {
  deleteUserExample,
  readUserExamples,
  removeAllExtrasForTarget,
  togglePinExample,
} from '../lib/learn-user-examples';
import { getCachedTtsSavedPath, learnTtsCacheKey, removeLearnTtsCacheEntry } from '../lib/learn-tts-cache';
import { commitLearnTtsPlay, ensureLearnTtsSlotBeforePlay } from '../lib/learn-tts-quota';
import { hasLatinLettersForTts } from '../lib/learn-tts-readable';
import { logLearnTts, playInnerAudioFromUrlChain, runWithMp3FileValidated, type PlayHttpAudioOptions } from '../lib/learn-audio-play';

const WARN_EX_COUNT = 50;
const WARN_DISMISS_PREFIX = 'learn_ex_warn_dismiss_v1_';

function toastInnerAudioError(res: WechatMiniprogram.InnerAudioContextOnErrorListenerResult) {
  const code = res.errCode;
  let title = '播放失败';
  if (code === 10002) {
    title = '网络异常：请为 dict.youdao.com 配置 downloadFile（及按需 request）合法域名';
  } else if (code === 10003 || code === 10004) {
    title = '音频无法播放：可清除存储键 learn_tts_paths_v1 后重试';
  } else {
    title = '播放失败，请检查网络、静音开关与合法域名';
  }
  wx.showToast({ title, icon: 'none', duration: 3200 });
}

type TtsUiState = 'idle' | 'loading' | 'playing' | 'failed';

type BuiltinExVm = {
  kind: 'builtin';
  bi: number;
  textSegs: TextSeg[];
  zh_hint: string;
  ttsReadable: boolean;
  tts: TtsUiState;
};

type UserExVm = {
  kind: 'user';
  id: string;
  textSegs: TextSeg[];
  textZh: string;
  note: string;
  pinned: boolean;
  ttsReadable: boolean;
  tts: TtsUiState;
};

type PlayIntent = { kind: 'word' } | { kind: 'builtin'; bi: number } | { kind: 'user'; exid: string };

Page({
  data: {
    themeClass: 'theme-light',
    loaded: false,
    headSegs: [] as TextSeg[],
    zhSegs: [] as TextSeg[],
    phonetic: '',
    wordTts: 'idle' as TtsUiState,
    isUser: false,
    overridesBuiltin: false,
    favorited: false,
    hasBuiltinExamples: false,
    hasUserExamples: false,
    builtinExVm: [] as BuiltinExVm[],
    userExVm: [] as UserExVm[],
    exWarnBanner: false,
    targetType: 'builtin' as TargetType,
    targetId: '',
  },

  audio: null as WechatMiniprogram.InnerAudioContext | null,
  wordRef: null as WordEntry | null,
  wordId: '',
  lastQ: '',
  playIntent: null as PlayIntent | null,
  /** 同一句/词连点重播时不重复计次 */
  skipQuotaCommitOnce: false,

  onShow() {
    this.setData(applyThemeForToolPage());
    if (this.wordId) {
      this.applyWord(this.wordId, this.lastQ);
    }
  },

  onLoad(query: Record<string, string | undefined>) {
    const audio = wx.createInnerAudioContext();
    audio.obeyMuteSwitch = true;
    audio.onPlay(() => {
      if (!this.skipQuotaCommitOnce) {
        commitLearnTtsPlay();
      }
      this.skipQuotaCommitOnce = false;
      this.applyPlayingUi();
    });
    /** stop() 用于切曲时不应清空 UI，否则下一段 onPlay 前会闪 idle */
    audio.onStop(() => {});
    audio.onEnded(() => {
      this.applyStoppedUi();
    });
    audio.onError((res: WechatMiniprogram.InnerAudioContextOnErrorListenerResult) => {
      logLearnTts('innerAudio.onError', { errCode: res.errCode, errMsg: res.errMsg });
      toastInnerAudioError(res);
      this.applyErrorUi();
    });
    this.audio = audio;

    let id = query.id || '';
    let qRaw = query.q || '';
    try {
      id = decodeURIComponent(id);
    } catch {
      /* keep */
    }
    try {
      qRaw = decodeURIComponent(qRaw);
    } catch {
      /* keep */
    }

    this.wordId = id;
    this.lastQ = qRaw;
    this.applyWord(id, qRaw);
  },

  onHide() {
    this.stopPlaybackAndResetUi();
  },

  stopPlaybackAndResetUi() {
    if (this.audio) {
      try {
        this.audio.stop();
      } catch {
        /* ignore */
      }
    }
    this.playIntent = null;
    this.skipQuotaCommitOnce = false;
    this.setData({
      wordTts: 'idle',
      builtinExVm: this.data.builtinExVm.map((x) => ({ ...x, tts: 'idle' as TtsUiState })),
      userExVm: this.data.userExVm.map((x) => ({ ...x, tts: 'idle' as TtsUiState })),
    });
  },

  applyWord(id: string, qRaw: string) {
    if (this.audio) {
      try {
        this.audio.stop();
      } catch {
        /* ignore */
      }
    }
    this.playIntent = null;
    this.skipQuotaCommitOnce = false;

    const w = findWord(id);
    if (!w) {
      if (this.data.loaded) {
        wx.showToast({ title: '词条已删除', icon: 'none' });
        setTimeout(() => wx.navigateBack(), 400);
      } else {
        wx.showToast({ title: '词条不存在', icon: 'none' });
        setTimeout(() => wx.navigateBack(), 400);
      }
      return;
    }
    this.wordRef = w;
    const { targetType, targetId } = targetFromWord(w);
    const userRows = readUserExamples(targetType, targetId);

    const builtinExVm: BuiltinExVm[] = (w.examples || []).map((ex: WordExample, bi: number) => ({
      kind: 'builtin' as const,
      bi,
      textSegs: highlightHeadwordSegments(ex.text, w.headword),
      zh_hint: ex.zh_hint || '',
      ttsReadable: hasLatinLettersForTts(ex.text),
      tts: 'idle' as TtsUiState,
    }));

    const userExVm: UserExVm[] = userRows.map((ux) => ({
      kind: 'user' as const,
      id: ux.id,
      textSegs: highlightHeadwordSegments(ux.textEn, w.headword),
      textZh: ux.textZh || '',
      note: ux.note || '',
      pinned: !!ux.pinned,
      ttsReadable: hasLatinLettersForTts(ux.textEn),
      tts: 'idle' as TtsUiState,
    }));

    const warnKey = `${WARN_DISMISS_PREFIX}${targetType}_${targetId}`;
    let dismissed = false;
    try {
      dismissed = !!wx.getStorageSync(warnKey);
    } catch {
      dismissed = false;
    }
    const exWarnBanner = userRows.length > WARN_EX_COUNT && !dismissed;

    this.setData({
      loaded: true,
      headSegs: highlightSegments(w.headword, qRaw),
      zhSegs: highlightSegments(w.zh, qRaw),
      phonetic: w.phonetic || '',
      isUser: w.source === 'user',
      overridesBuiltin: !!w.overridesBuiltin,
      favorited: isFavorite(targetType, targetId),
      hasBuiltinExamples: builtinExVm.length > 0,
      hasUserExamples: userExVm.length > 0,
      builtinExVm,
      userExVm,
      exWarnBanner,
      targetType,
      targetId,
      wordTts: 'idle',
    });
  },

  onUnload() {
    this.stopPlaybackAndResetUi();
    if (this.audio) {
      this.audio.destroy();
      this.audio = null;
    }
  },

  applyPlayingUi() {
    const intent = this.playIntent;
    if (!intent) return;
    if (intent.kind === 'word') {
      this.setData({
        wordTts: 'playing',
        builtinExVm: this.data.builtinExVm.map((x) => ({ ...x, tts: 'idle' })),
        userExVm: this.data.userExVm.map((x) => ({ ...x, tts: 'idle' })),
      });
      return;
    }
    if (intent.kind === 'builtin') {
      const bi = intent.bi;
      this.setData({
        wordTts: 'idle',
        builtinExVm: this.data.builtinExVm.map((x) =>
          x.bi === bi ? { ...x, tts: 'playing' } : { ...x, tts: 'idle' }
        ),
        userExVm: this.data.userExVm.map((x) => ({ ...x, tts: 'idle' })),
      });
      return;
    }
    const exid = intent.exid;
    this.setData({
      wordTts: 'idle',
      builtinExVm: this.data.builtinExVm.map((x) => ({ ...x, tts: 'idle' })),
      userExVm: this.data.userExVm.map((x) => (x.id === exid ? { ...x, tts: 'playing' } : { ...x, tts: 'idle' })),
    });
  },

  applyStoppedUi() {
    this.playIntent = null;
    this.setData({
      wordTts: 'idle',
      builtinExVm: this.data.builtinExVm.map((x) => ({ ...x, tts: 'idle' })),
      userExVm: this.data.userExVm.map((x) => ({ ...x, tts: 'idle' })),
    });
  },

  applyErrorUi() {
    const intent = this.playIntent;
    this.playIntent = null;
    if (!intent) {
      this.setData({ wordTts: 'idle' });
      return;
    }
    if (intent.kind === 'word') {
      this.setData({
        wordTts: 'failed',
        builtinExVm: this.data.builtinExVm.map((x) => ({ ...x, tts: 'idle' })),
        userExVm: this.data.userExVm.map((x) => ({ ...x, tts: 'idle' })),
      });
      return;
    }
    if (intent.kind === 'builtin') {
      const bi = intent.bi;
      this.setData({
        wordTts: 'idle',
        builtinExVm: this.data.builtinExVm.map((x) =>
          x.bi === bi ? { ...x, tts: 'failed' } : { ...x, tts: 'idle' }
        ),
        userExVm: this.data.userExVm.map((x) => ({ ...x, tts: 'idle' })),
      });
      return;
    }
    const exid = intent.exid;
    this.setData({
      wordTts: 'idle',
      builtinExVm: this.data.builtinExVm.map((x) => ({ ...x, tts: 'idle' })),
      userExVm: this.data.userExVm.map((x) => (x.id === exid ? { ...x, tts: 'failed' } : { ...x, tts: 'idle' })),
    });
  },

  onToggleFavorite() {
    const w = this.wordRef;
    if (!w) return;
    const { targetType, targetId } = targetFromWord(w);
    const favorited = toggleFavorite(targetType, targetId);
    this.setData({ favorited });
  },

  onPlayWord() {
    const w = this.wordRef;
    const audio = this.audio;
    if (!w || !audio) return;
    if (!ensureLearnTtsSlotBeforePlay()) return;

    if (this.data.wordTts === 'playing' && this.playIntent?.kind === 'word') {
      this.skipQuotaCommitOnce = true;
      try {
        audio.seek(0);
      } catch {
        /* seek 失败则整段重播 */
        const urls = wordTtsDownloadCandidates(w.headword, w.audio_word_url);
        if (urls.length === 0) {
          wx.showToast({ title: '暂无可播放地址', icon: 'none' });
          return;
        }
        playInnerAudioFromUrlChain(audio, urls, { onFail: () => this.applyErrorUi() });
      }
      audio.play();
      return;
    }

    const urls = wordTtsDownloadCandidates(w.headword, w.audio_word_url);
    if (urls.length === 0) {
      wx.showToast({ title: '暂无可播放地址', icon: 'none' });
      return;
    }
    this.playIntent = { kind: 'word' };
    this.setData({
      wordTts: 'loading',
      builtinExVm: this.data.builtinExVm.map((x) => ({ ...x, tts: 'idle' })),
      userExVm: this.data.userExVm.map((x) => ({ ...x, tts: 'idle' })),
    });
    playInnerAudioFromUrlChain(audio, urls, { onFail: () => this.applyErrorUi() });
  },

  onTapSentenceTts(e: WechatMiniprogram.TouchEvent) {
    const kind = e.currentTarget.dataset.kind as string | undefined;
    const w = this.wordRef;
    const audio = this.audio;
    const wid = this.wordId;
    if (!w || !audio || !wid) return;

    let text = '';
    let preset = '';
    let intent: PlayIntent;
    let cacheSentenceKey = '';
    let builtinBi: number | undefined;
    let userExid: string | undefined;

    if (kind === 'builtin') {
      const bi = Number(e.currentTarget.dataset.bi);
      builtinBi = bi;
      const ex = w.examples?.[bi];
      if (!ex) return;
      if (!hasLatinLettersForTts(ex.text)) {
        wx.showToast({ title: '暂不支持朗读该句', icon: 'none' });
        return;
      }
      text = ex.text;
      preset = ex.audio_sentence_url || '';
      intent = { kind: 'builtin', bi };
      cacheSentenceKey = `builtin:${wid}:${bi}`;
    } else if (kind === 'user') {
      const exid = e.currentTarget.dataset.exid as string | undefined;
      if (!exid) return;
      userExid = exid;
      const { targetType, targetId } = targetFromWord(w);
      const row = readUserExamples(targetType, targetId).find((x) => x.id === exid);
      if (!row) return;
      if (!hasLatinLettersForTts(row.textEn)) {
        wx.showToast({ title: '暂不支持朗读该句', icon: 'none' });
        return;
      }
      text = row.textEn;
      preset = '';
      intent = { kind: 'user', exid };
      cacheSentenceKey = `user:${exid}`;
    } else {
      return;
    }

    const urls = sentenceTtsDownloadCandidates(text, preset, w.headword);
    if (urls.length === 0) {
      wx.showToast({ title: '暂无可播放地址', icon: 'none' });
      return;
    }

    if (kind === 'builtin' && builtinBi !== undefined) {
      const bi = builtinBi;
      const exRow = this.data.builtinExVm.find((x) => x.bi === bi);
      if (
        exRow?.tts === 'playing' &&
        this.playIntent?.kind === 'builtin' &&
        this.playIntent.bi === bi
      ) {
        this.skipQuotaCommitOnce = true;
        try {
          audio.seek(0);
        } catch {
          this.startSentenceAudio(audio, text, preset, cacheSentenceKey);
          return;
        }
        audio.play();
        return;
      }
    } else if (kind === 'user' && userExid !== undefined) {
      const exid = userExid;
      const exRow = this.data.userExVm.find((x) => x.id === exid);
      if (
        exRow?.tts === 'playing' &&
        this.playIntent?.kind === 'user' &&
        this.playIntent.exid === exid
      ) {
        this.skipQuotaCommitOnce = true;
        try {
          audio.seek(0);
        } catch {
          this.startSentenceAudio(audio, text, preset, cacheSentenceKey);
          return;
        }
        audio.play();
        return;
      }
    }

    if (!ensureLearnTtsSlotBeforePlay()) return;

    if (text.trim().length > SENTENCE_TTS_MAX_CHARS) {
      wx.showToast({ title: '句子较长，加载可能更久', icon: 'none' });
    }

    this.playIntent = intent;
    if (kind === 'builtin' && builtinBi !== undefined) {
      const bi = builtinBi;
      this.setData({
        wordTts: 'idle',
        builtinExVm: this.data.builtinExVm.map((x) =>
          x.bi === bi ? { ...x, tts: 'loading' } : { ...x, tts: 'idle' }
        ),
        userExVm: this.data.userExVm.map((x) => ({ ...x, tts: 'idle' })),
      });
    } else if (kind === 'user' && userExid !== undefined) {
      const exid = userExid;
      this.setData({
        wordTts: 'idle',
        builtinExVm: this.data.builtinExVm.map((x) => ({ ...x, tts: 'idle' })),
        userExVm: this.data.userExVm.map((x) => (x.id === exid ? { ...x, tts: 'loading' } : { ...x, tts: 'idle' })),
      });
    }

    this.startSentenceAudio(audio, text, preset, cacheSentenceKey);
  },

  startSentenceAudio(
    audio: WechatMiniprogram.InnerAudioContext,
    text: string,
    preset: string,
    cacheSentenceKey: string
  ) {
    const w = this.wordRef;
    const candidates = sentenceTtsDownloadCandidates(text, preset, w?.headword);
    const primary = candidates[0] || '';
    const ck = learnTtsCacheKey(cacheSentenceKey, text);
    const rawTrim = text.trim();
    const hwTrim = (w?.headword || '').trim();

    const chainOpts: PlayHttpAudioOptions = {
      onFail: () => this.applyErrorUi(),
      persistCacheKey: ck,
      persistOnlyIfUrl: primary,
      onWin: ({ url }: { url: string; index: number }) => {
        const ap = youdaoAudioParamFromUrl(url);
        if (!ap || !rawTrim) return;
        if (hwTrim && ap.toLowerCase() === hwTrim.toLowerCase() && ap.length < rawTrim.length) {
          wx.showToast({ title: '例句整句暂无法合成，已播放词头', icon: 'none', duration: 2800 });
        } else if (ap.length < rawTrim.length) {
          wx.showToast({ title: '整句暂不可用，已播放较短片段', icon: 'none', duration: 2600 });
        }
      },
    };

    const local = getCachedTtsSavedPath(ck);
    if (local) {
      runWithMp3FileValidated(
        local,
        () => {
          try {
            audio.stop();
          } catch {
            /* ignore */
          }
          audio.src = local;
          audio.play();
        },
        (reason) => {
          logLearnTts('cache.reject', { reason, tail: local.slice(-40) });
          removeLearnTtsCacheEntry(ck);
          playInnerAudioFromUrlChain(audio, candidates, chainOpts);
        }
      );
      return;
    }
    playInnerAudioFromUrlChain(audio, candidates, chainOpts);
  },

  onAddSentence() {
    const w = this.wordRef;
    if (!w) return;
    const { targetType, targetId } = targetFromWord(w);
    wx.navigateTo({
      url: `/package-learn/wordbook/sentence-edit?targetType=${encodeURIComponent(
        targetType
      )}&targetId=${encodeURIComponent(targetId)}`,
    });
  },

  onEditSentence(e: WechatMiniprogram.TouchEvent) {
    const exid = e.currentTarget.dataset.exid as string | undefined;
    const w = this.wordRef;
    if (!exid || !w) return;
    const { targetType, targetId } = targetFromWord(w);
    wx.navigateTo({
      url: `/package-learn/wordbook/sentence-edit?targetType=${encodeURIComponent(
        targetType
      )}&targetId=${encodeURIComponent(targetId)}&exId=${encodeURIComponent(exid)}`,
    });
  },

  onDeleteSentence(e: WechatMiniprogram.TouchEvent) {
    const exid = e.currentTarget.dataset.exid as string | undefined;
    const w = this.wordRef;
    if (!exid || !w) return;
    const { targetType, targetId } = targetFromWord(w);
    wx.showModal({
      title: '删除例句',
      content: '确定删除这条我的例句？',
      confirmText: '删除',
      confirmColor: '#cf1322',
      success: (res) => {
        if (!res.confirm) return;
        deleteUserExample(targetType, targetId, exid);
        invalidateWordbookCache();
        this.applyWord(this.wordId, this.lastQ);
      },
    });
  },

  onPinSentence(e: WechatMiniprogram.TouchEvent) {
    const exid = e.currentTarget.dataset.exid as string | undefined;
    const w = this.wordRef;
    if (!exid || !w) return;
    const { targetType, targetId } = targetFromWord(w);
    togglePinExample(targetType, targetId, exid);
    invalidateWordbookCache();
    this.applyWord(this.wordId, this.lastQ);
  },

  onDismissExWarn() {
    const k = `${WARN_DISMISS_PREFIX}${this.data.targetType}_${this.data.targetId}`;
    try {
      wx.setStorageSync(k, 1);
    } catch {
      /* ignore */
    }
    this.setData({ exWarnBanner: false });
  },

  onEdit() {
    const id = this.wordRef?.id;
    if (!id || this.wordRef?.source !== 'user') return;
    wx.navigateTo({
      url: `/package-learn/wordbook/edit?id=${encodeURIComponent(id)}`,
    });
  },

  onDelete() {
    const id = this.wordRef?.id;
    if (!id || this.wordRef?.source !== 'user') return;
    wx.showModal({
      title: '删除词条',
      content: '删除后无法恢复，可稍后在列表中重新添加。',
      confirmText: '删除',
      confirmColor: '#cf1322',
      success: (res) => {
        if (!res.confirm) return;
        removeFavoriteByTarget('user', id);
        removeAllExtrasForTarget('user', id);
        const next = readUserWordsRaw().filter((x) => x.id !== id);
        writeUserWordsRaw(next);
        invalidateWordbookCache();
        wx.navigateBack();
      },
    });
  },

  onShareAppMessage() {
    const w = this.wordRef;
    const name = w ? `${w.headword}` : '单词本';
    return buildToolShareMessage('wordbook', name);
  },
});
