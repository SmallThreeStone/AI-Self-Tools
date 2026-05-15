import { findToolById } from '../../config/tools';
import { applyNavigationBarTheme } from '../../utils/nav-theme';
import { buildDefaultShareMessage } from '../../utils/tool-share';
import { getTheme } from '../../utils/storage';

Page({
  data: {
    themeClass: 'theme-light',
    title: '',
    desc: '',
    icon: '',
  },

  onShow() {
    const mode = getTheme();
    applyNavigationBarTheme(mode);
    this.setData({
      themeClass: mode === 'dark' ? 'theme-dark' : 'theme-light',
    });
  },
  onLoad(query: Record<string, string | undefined>) {
    const id = query.id ? decodeURIComponent(query.id) : '';
    const tool = findToolById(id);
    if (!tool) {
      wx.showToast({ title: '未找到工具', icon: 'none' });
      return;
    }
    wx.setNavigationBarTitle({ title: tool.name });
    this.setData({
      title: tool.name,
      desc: tool.desc,
      icon: tool.icon,
    });
  },

  onShareAppMessage() {
    return buildDefaultShareMessage();
  },
});
