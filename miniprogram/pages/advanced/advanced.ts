import { EXPORTABLE_CORE_FIELDS, EXPORTABLE_TOOL_STORAGE_KEYS } from '../../config/export-keys';
import { tools } from '../../config/tools';
import { applyNavigationBarTheme } from '../../utils/nav-theme';
import { buildDefaultShareMessage } from '../../utils/tool-share';
import {
  clearAllUserData,
  exportFavoritesPayload,
  exportUserPayload,
  getTheme,
  getUsageMap,
  importFavoritesPayload,
  importFullBackup,
  type ImportMode,
  type ThemeMode,
} from '../../utils/storage';
import { copyWithClipboardHint } from '../../utils/scope-hint';

Page({
  data: {
    themeClass: 'theme-light',
    backupLines: [] as string[],
    usageLines: [] as string[],
    importText: '',
    showImport: false,
    showImportFav: false,
    importFavText: '',
  },

  onShow() {
    const mode = getTheme();
    applyNavigationBarTheme(mode);
    this.applyTheme(mode);
    this.refreshBackupLines();
    this.refreshUsage();
  },

  applyTheme(mode: ThemeMode) {
    const themeClass = mode === 'dark' ? 'theme-dark' : 'theme-light';
    this.setData({ themeClass });
  },

  refreshBackupLines() {
    const core = EXPORTABLE_CORE_FIELDS.map((x) => `${x.label}（${x.key}）`);
    const tool = EXPORTABLE_TOOL_STORAGE_KEYS.map((x) => `${x.label}（${x.key}）`);
    this.setData({
      backupLines: ['【核心】', ...core, '【工具数据】', ...tool, '不含相册图片原文件；权限确认标记不导出。'],
    });
  },

  refreshUsage() {
    const usage = getUsageMap();
    const ranked = tools
      .map((t) => ({ id: t.id, name: t.name, n: usage[t.id] ?? 0 }))
      .filter((x) => x.n > 0)
      .sort((a, b) => b.n - a.n)
      .slice(0, 8);
    const usageLines = ranked.map((x) => `${x.name} · ${x.n} 次`);
    this.setData({ usageLines });
  },

  onExport() {
    wx.showLoading({ title: '导出中', mask: true });
    try {
      const json = exportUserPayload();
      copyWithClipboardHint({
        data: json,
        purpose: '将完整备份 JSON（含工具白名单数据）写入剪贴板，便于粘贴保存。',
      });
    } finally {
      wx.hideLoading();
    }
  },

  onExportFavorites() {
    const json = exportFavoritesPayload();
    copyWithClipboardHint({
      data: json,
      purpose: '将收藏列表 JSON 写入剪贴板。',
    });
  },

  onToggleImport() {
    this.setData({ showImport: !this.data.showImport });
  },

  onToggleImportFav() {
    this.setData({ showImportFav: !this.data.showImportFav });
  },

  onImportInput(e: WechatMiniprogram.Input) {
    this.setData({ importText: e.detail.value });
  },

  onImportFavInput(e: WechatMiniprogram.Input) {
    this.setData({ importFavText: e.detail.value });
  },

  runImport(mode: ImportMode) {
    const text = this.data.importText.trim();
    if (!text) {
      wx.showToast({ title: '请先粘贴备份 JSON', icon: 'none' });
      return;
    }
    wx.showLoading({ title: mode === 'merge' ? '合并中' : '覆盖中', mask: true });
    try {
      const r = importFullBackup(text, mode);
      if (!r.ok) {
        wx.showToast({ title: r.error ?? '导入失败', icon: 'none' });
        return;
      }
      wx.showToast({ title: '导入成功', icon: 'success' });
      this.setData({ importText: '', showImport: false });
      this.refreshUsage();
    } finally {
      wx.hideLoading();
    }
  },

  onImportMerge() {
    this.runImport('merge');
  },

  onImportReplace() {
    wx.showModal({
      title: '覆盖导入',
      content: '将用备份替换当前收藏、记录及白名单内的工具数据（外观偏好也会被备份覆盖）。确定继续？',
      confirmText: '覆盖',
      success: (res) => {
        if (res.confirm) this.runImport('replace');
      },
    });
  },

  onChooseBackupFile() {
    wx.chooseMessageFile({
      count: 1,
      type: 'file',
      extension: ['json'],
      success: (res) => {
        const p = res.tempFiles[0]?.path;
        if (!p) return;
        const fs = wx.getFileSystemManager();
        fs.readFile({
          filePath: p,
          encoding: 'utf8',
          success: (r) => {
            const text = typeof r.data === 'string' ? r.data : '';
            this.setData({ importText: text, showImport: true });
            wx.showToast({ title: '已读入文件', icon: 'none' });
          },
          fail: () => wx.showToast({ title: '读取失败', icon: 'none' }),
        });
      },
      fail: () => wx.showToast({ title: '未选择文件', icon: 'none' }),
    });
  },

  onImportFavConfirm() {
    const ok = importFavoritesPayload(this.data.importFavText);
    if (!ok) {
      wx.showToast({ title: '收藏 JSON 无效', icon: 'none' });
      return;
    }
    wx.showToast({ title: '收藏已更新', icon: 'success' });
    this.setData({ importFavText: '', showImportFav: false });
  },

  onClear() {
    wx.showModal({
      title: '清除本地数据',
      content: '将移除收藏、首页固定、最近使用与点击统计；不影响主题与小程序代码。',
      success: (res) => {
        if (res.confirm) {
          clearAllUserData();
          wx.showToast({ title: '已清除', icon: 'none' });
          this.refreshUsage();
        }
      },
    });
  },

  onShareAppMessage() {
    return buildDefaultShareMessage();
  },
});
