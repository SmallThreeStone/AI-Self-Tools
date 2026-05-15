import {
  categories,
  findToolById,
  tools,
  type ToolDef,
  type CategoryId,
} from '../../config/tools';
import { openTool } from '../../utils/navigation';
import { applyNavigationBarTheme } from '../../utils/nav-theme';
import { buildDefaultShareMessage } from '../../utils/tool-share';
import { formatLastUsedLabel, formatPermissionHint } from '../../utils/tool-meta';
import {
  addSearchHistory,
  clearSearchHistory,
  getFavorites,
  getRecentMeta,
  getLastUsedAt,
  getPinnedIds,
  getRecentIds,
  getSearchHistory,
  getTheme,
  isFavorite,
  isPinned,
  toggleFavorite,
  togglePinned,
} from '../../utils/storage';
import { filterTools, guessTools, HOT_SEARCH_LABELS } from '../../utils/search';
import { updateTabBar } from '../../utils/tab-bar';

Page({
  data: {
    themeClass: 'theme-light',
    categories,
    searchKeyword: '',
    filteredTools: [] as ReturnType<typeof mapTools>,
    favorites: [] as ReturnType<typeof mapTools>,
    recent: [] as ReturnType<typeof mapTools>,
    guess: [] as ReturnType<typeof mapTools>,
    pinnedTools: [] as ReturnType<typeof mapTools>,
    hotLabels: HOT_SEARCH_LABELS,
    searchHistory: [] as string[],
    detailVisible: false,
    detailTool: {} as ToolDef,
    detailTagLine: '',
    detailPermissionText: '',
    detailLastUsedText: '',
    detailFavorited: false,
    detailPinned: false,
  },

  onLoad(query: Record<string, string | undefined>) {
    const raw = query.toolId;
    if (!raw) return;
    let toolId = raw;
    try {
      toolId = decodeURIComponent(raw);
    } catch {
      /* keep raw */
    }
    if (!findToolById(toolId)) {
      wx.showToast({ title: '无效的工具', icon: 'none' });
      return;
    }
    setTimeout(() => openTool(toolId), 280);
  },

  onShow() {
    const mode = getTheme();
    applyNavigationBarTheme(mode);
    this.setData({ themeClass: mode === 'dark' ? 'theme-dark' : 'theme-light' });
    updateTabBar(0);
    this.refreshSections();
    this.maybeOfferMigrationImport();
  },

  maybeOfferMigrationImport() {
    try {
      if (wx.getStorageSync('toolbox_migration_hint_v2')) return;
    } catch {
      return;
    }
    if (getFavorites().length > 0 || getRecentMeta().length > 0) return;
    wx.showModal({
      title: '迁移资料？',
      content: '当前暂无收藏与最近记录。若有备份 JSON，可在「我的 → 备份与恢复」导入。',
      confirmText: '去「我的」',
      cancelText: '稍后',
      success: (res) => {
        try {
          wx.setStorageSync('toolbox_migration_hint_v2', 1);
        } catch {
          /* ignore */
        }
        if (res.confirm) wx.switchTab({ url: '/pages/mine/mine' });
      },
    });
  },

  onShareAppMessage() {
    return buildDefaultShareMessage();
  },

  refreshSections() {
    const favIds = getFavorites();
    const recentIds = getRecentIds();
    const pinnedIds = getPinnedIds();
    const favTools = favIds.map(findToolById).filter(Boolean) as ToolDef[];
    const recentTools = recentIds.map(findToolById).filter(Boolean) as ToolDef[];
    const pinnedToolsRaw = pinnedIds.map(findToolById).filter(Boolean) as ToolDef[];
    const guessList = guessTools(favIds, recentIds);

    const kw = this.data.searchKeyword.trim();
    const base = kw ? filterTools(kw) : tools;

    this.setData({
      filteredTools: mapTools(base),
      favorites: mapTools(favTools),
      recent: mapTools(recentTools.slice(0, 8)),
      guess: mapTools(guessList),
      pinnedTools: mapTools(pinnedToolsRaw),
      searchHistory: getSearchHistory(),
    });

    if (this.data.detailVisible && this.data.detailTool?.id) {
      const id = this.data.detailTool.id;
      const tool = findToolById(id);
      if (tool) {
        const ts = getLastUsedAt(id);
        this.setData({
          detailTool: tool,
          detailTagLine: tool.tags.join(' · '),
          detailPermissionText: formatPermissionHint(tool),
          detailLastUsedText: ts ? formatLastUsedLabel(ts) : '',
          detailFavorited: isFavorite(id),
          detailPinned: isPinned(id),
        });
      }
    }
  },

  onTapCategory(e: WechatMiniprogram.TouchEvent) {
    const id = e.currentTarget.dataset.id as CategoryId | undefined;
    if (!id || !categories.some((c) => c.id === id)) return;
    const app = getApp<IAppOption>();
    app.globalData.pendingCategoryId = id;
    wx.switchTab({ url: '/pages/category/category' });
  },

  onSearchInput(e: WechatMiniprogram.Input) {
    const searchKeyword = e.detail.value || '';
    const filteredTools = mapTools(filterTools(searchKeyword));
    this.setData({ searchKeyword, filteredTools });
  },

  onSearchConfirm(e: WechatMiniprogram.Input) {
    const kw = (e.detail.value || '').trim();
    if (kw) {
      addSearchHistory(kw);
      this.setData({ searchHistory: getSearchHistory() });
    }
  },

  onTapSearchChip(e: WechatMiniprogram.TouchEvent) {
    const label = e.currentTarget.dataset.label as string | undefined;
    if (!label) return;
    const filteredTools = mapTools(filterTools(label));
    this.setData({ searchKeyword: label, filteredTools });
    addSearchHistory(label);
    this.setData({ searchHistory: getSearchHistory() });
  },

  onClearSearchHistory() {
    clearSearchHistory();
    this.setData({ searchHistory: [] });
  },

  onClearSearch() {
    this.setData({ searchKeyword: '' });
    this.refreshSections();
  },

  onToolDetail(e: WechatMiniprogram.CustomEvent<{ id: string }>) {
    const id = e.detail.id;
    const tool = findToolById(id);
    if (!tool) return;
    const ts = getLastUsedAt(id);
    this.setData({
      detailVisible: true,
      detailTool: tool,
      detailTagLine: tool.tags.join(' · '),
      detailPermissionText: formatPermissionHint(tool),
      detailLastUsedText: ts ? formatLastUsedLabel(ts) : '',
      detailFavorited: isFavorite(id),
      detailPinned: isPinned(id),
    });
  },

  onCloseDetail() {
    this.setData({ detailVisible: false });
  },

  onDetailOpen() {
    const id = this.data.detailTool.id;
    if (!id) return;
    this.setData({ detailVisible: false });
    openTool(id);
  },

  onDetailToggleFav() {
    const id = this.data.detailTool.id;
    if (!id) return;
    toggleFavorite(id);
    this.setData({
      detailFavorited: isFavorite(id),
    });
    this.refreshSections();
  },

  onDetailTogglePin() {
    const id = this.data.detailTool.id;
    if (!id) return;
    const r = togglePinned(id);
    if (r.error === 'full') {
      wx.showToast({ title: '常用已满（最多 3 个）', icon: 'none' });
      return;
    }
    this.setData({ detailPinned: r.pinned });
    this.refreshSections();
  },

  onOpenFromSearch(e: WechatMiniprogram.CustomEvent<{ id: string }>) {
    openTool(e.detail.id);
  },

  onOpenTool(e: WechatMiniprogram.CustomEvent<{ id: string }>) {
    openTool(e.detail.id);
  },
});

function mapTools(list: ToolDef[]) {
  return list.map((t) => ({
    ...t,
    favorited: isFavorite(t.id),
  }));
}
