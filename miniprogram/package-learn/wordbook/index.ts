import { applyThemeForToolPage } from '../../utils/nav-theme';
import { buildToolShareMessage } from '../../utils/tool-share';
import type { TextSeg } from '../lib/types';
import { readFavoritesRaw, isFavorite, toggleFavorite } from '../lib/learn-favorites';
import type { TargetType } from '../lib/learn-keys';
import { searchWordsInScope, type ListScope } from '../lib/word-store';
import { highlightSegments } from '../lib/highlight';

const DEBOUNCE_MS = 300;

type RowVm = {
  id: string;
  headSegs: TextSeg[];
  zhSegs: TextSeg[];
  isUser: boolean;
  overridesBuiltin: boolean;
  targetType: TargetType;
  targetId: string;
  favorited: boolean;
  showCatBadge: boolean;
  catLabel: string;
};

Page({
  data: {
    themeClass: 'theme-light',
    scope: 'all' as ListScope,
    searchInput: '',
    searchKeyword: '',
    list: [] as RowVm[],
    emptyVisible: false,
    emptyFavoritesHint: false,
    listScrollPx: 480,
  },

  debounceTimer: 0 as number,

  onShow() {
    this.setData(applyThemeForToolPage());
    this.updateListScrollHeight();
    this.applySearch(this.data.searchKeyword);
  },

  onLoad() {
    this.updateListScrollHeight();
    this.applySearch(this.data.searchKeyword);
  },

  updateListScrollHeight() {
    try {
      const sys = wx.getWindowInfo?.() ?? wx.getSystemInfoSync();
      const winH = sys.windowHeight || 667;
      const winW = sys.windowWidth || 375;
      const rpx = winW / 750;
      const reserved = (48 + 88 + 72 + 100 + 48 + 24 + 40) * rpx;
      const listScrollPx = Math.max(240, Math.floor(winH - reserved));
      this.setData({ listScrollPx });
    } catch {
      /* keep default */
    }
  },

  onUnload() {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = 0;
    }
  },

  applySearch(keyword: string) {
    const { scope } = this.data;
    const kw = keyword.trim();
    const raw = searchWordsInScope(scope, keyword);
    const emptyFavoritesHint = scope === 'favorites' && !kw && readFavoritesRaw().length === 0;
    const emptyVisible = raw.length === 0 && !emptyFavoritesHint;
    const showCatBadge = scope === 'all' || scope === 'favorites';
    const list: RowVm[] = raw.map((w) => {
      const targetType: TargetType = w.source === 'user' ? 'user' : 'builtin';
      return {
        id: w.id,
        headSegs: highlightSegments(w.headword, keyword),
        zhSegs: highlightSegments(w.zh, keyword),
        isUser: w.source === 'user',
        overridesBuiltin: !!w.overridesBuiltin,
        targetType,
        targetId: w.id,
        favorited: isFavorite(targetType, w.id),
        showCatBadge,
        catLabel: w.category === 'daily' ? '日常' : '外贸',
      };
    });
    this.setData({
      list,
      emptyVisible,
      emptyFavoritesHint,
    });
  },

  onSearchInput(e: WechatMiniprogram.Input) {
    const searchInput = e.detail.value || '';
    this.setData({ searchInput });
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => {
      this.debounceTimer = 0;
      this.setData({ searchKeyword: searchInput });
      this.applySearch(searchInput);
    }, DEBOUNCE_MS) as unknown as number;
  },

  onSearchConfirm(e: WechatMiniprogram.Input) {
    const kw = ((e.detail.value || '') || this.data.searchInput).trim();
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = 0;
    }
    this.setData({ searchInput: kw, searchKeyword: kw });
    this.applySearch(kw);
  },

  onClearSearch() {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = 0;
    }
    this.setData({ searchInput: '', searchKeyword: '' });
    this.applySearch('');
  },

  onScope(e: WechatMiniprogram.TouchEvent) {
    const s = e.currentTarget.dataset.scope as ListScope | undefined;
    if (s !== 'all' && s !== 'daily' && s !== 'trade' && s !== 'favorites') return;
    this.setData({ scope: s }, () => this.applySearch(this.data.searchKeyword));
  },

  onOpenDetail(e: WechatMiniprogram.TouchEvent) {
    const id = e.currentTarget.dataset.id as string | undefined;
    if (!id) return;
    const q = encodeURIComponent(this.data.searchKeyword || '');
    wx.navigateTo({
      url: `/package-learn/wordbook/detail?id=${encodeURIComponent(id)}&q=${q}`,
    });
  },

  onToggleFav(e: WechatMiniprogram.TouchEvent) {
    const tt = e.currentTarget.dataset.tt as TargetType | undefined;
    const tid = e.currentTarget.dataset.tid as string | undefined;
    if (!tt || !tid || (tt !== 'builtin' && tt !== 'user')) return;
    toggleFavorite(tt, tid);
    this.applySearch(this.data.searchKeyword);
  },

  onAdd() {
    const { scope } = this.data;
    const cat =
      scope === 'trade' ? 'trade' : scope === 'daily' ? 'daily' : 'daily';
    wx.navigateTo({
      url: `/package-learn/wordbook/edit?cat=${encodeURIComponent(cat)}`,
    });
  },

  onShareAppMessage() {
    return buildToolShareMessage('wordbook', '单词本');
  },
});
