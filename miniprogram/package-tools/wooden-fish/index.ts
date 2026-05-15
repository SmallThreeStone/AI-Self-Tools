import { buildToolShareMessage } from '../../utils/tool-share';
import { applyThemeForToolPage } from '../../utils/nav-theme';

const KEY = 'tool_wooden_fish_merit_v1';

Page({
  data: {
    themeClass: 'theme-light',
    merit: 0,
    /** 点击缩放动画 */
    bash: false,
  },

  onShow() {
    this.setData(applyThemeForToolPage());
    let merit = 0;
    try {
      const v = wx.getStorageSync(KEY) as unknown;
      if (typeof v === 'number' && v >= 0 && v < 1e9) merit = Math.floor(v);
    } catch {
      /* ignore */
    }
    this.setData({ merit });
  },

  onTap() {
    const merit = this.data.merit + 1;
    try {
      wx.setStorageSync(KEY, merit);
    } catch {
      /* ignore */
    }
    wx.vibrateShort({ type: 'light' });
    this.setData({ merit, bash: true });
    setTimeout(() => this.setData({ bash: false }), 120);
  },

  onReset() {
    wx.showModal({
      title: '清零功德？',
      success: (res) => {
        if (!res.confirm) return;
        try {
          wx.setStorageSync(KEY, 0);
        } catch {
          /* ignore */
        }
        this.setData({ merit: 0 });
      },
    });
  },
  onShareAppMessage() {
    return buildToolShareMessage('wooden-fish', '电子木鱼');
  },
});
