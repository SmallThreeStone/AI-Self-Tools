import { buildToolShareMessage } from '../../utils/tool-share';
import { applyNavigationBarTheme } from '../../utils/nav-theme';
import { getTheme } from '../../utils/storage';

Page({
  data: {
    themeClass: 'theme-light',
    result: '',
    flipping: false,
  },

  onShow() {
    const mode = getTheme();
    applyNavigationBarTheme(mode);
    this.setData({
      themeClass: mode === 'dark' ? 'theme-dark' : 'theme-light',
    });
  },

  onFlip() {
    if (this.data.flipping) return;
    this.setData({ flipping: true, result: '' });
    wx.vibrateShort({ type: 'light' });
    setTimeout(() => {
      const heads = Math.random() < 0.5;
      this.setData({
        flipping: false,
        result: heads ? '正面' : '反面',
      });
      wx.vibrateShort({ type: 'medium' });
    }, 320);
  },
  onShareAppMessage() {
    return buildToolShareMessage('coin', '掷硬币');
  },
});
