import type { CategoryId, ToolDef } from '../../config/tools';
import { categories, findToolById, toolsByCategory } from '../../config/tools';
import { openTool } from '../../utils/navigation';
import { applyNavigationBarTheme } from '../../utils/nav-theme';
import { formatLastUsedLabel, formatPermissionHint } from '../../utils/tool-meta';
import { buildDefaultShareMessage } from '../../utils/tool-share';
import {
  getLastUsedAt,
  getTheme,
  isFavorite,
  isPinned,
  toggleFavorite,
  togglePinned,
} from '../../utils/storage';
import { updateTabBar } from '../../utils/tab-bar';

Page({
  data: {
    themeClass: 'theme-light',
    categories,
    activeId: 'social' as CategoryId,
    categoryTitle: '社交协作',
    toolCount: 0,
    list: [] as ReturnType<typeof mapWithFav>,
    detailVisible: false,
    detailTool: {} as ToolDef,
    detailTagLine: '',
    detailPermissionText: '',
    detailLastUsedText: '',
    detailFavorited: false,
    detailPinned: false,
  },

  onShow() {
    const mode = getTheme();
    applyNavigationBarTheme(mode);
    this.setData({ themeClass: mode === 'dark' ? 'theme-dark' : 'theme-light' });
    updateTabBar(1);

    const app = getApp<IAppOption>();
    const pending = app.globalData.pendingCategoryId;
    if (pending && categories.some((c) => c.id === pending)) {
      app.globalData.pendingCategoryId = '';
      this.setData({ activeId: pending as CategoryId }, () => this.syncList());
      return;
    }
    this.syncList();
  },

  onSelectCat(e: WechatMiniprogram.TouchEvent) {
    const id = e.currentTarget.dataset.id as CategoryId;
    if (!id) return;
    this.setData({ activeId: id }, () => this.syncList());
  },

  syncList() {
    const { activeId } = this.data;
    const raw = toolsByCategory(activeId);
    const cat = categories.find((c) => c.id === activeId);
    this.setData({
      categoryTitle: cat?.name ?? '',
      toolCount: raw.length,
      list: mapWithFav(raw),
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

  onOpen(e: WechatMiniprogram.CustomEvent<{ id: string }>) {
    openTool(e.detail.id);
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
    this.setData({ detailFavorited: isFavorite(id) });
    this.syncList();
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
    this.syncList();
  },

  onShareAppMessage() {
    return buildDefaultShareMessage();
  },
});

function mapWithFav(list: ReturnType<typeof toolsByCategory>) {
  return list.map((t) => ({
    ...t,
    favorited: isFavorite(t.id),
  }));
}
