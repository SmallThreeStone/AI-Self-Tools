import { buildToolShareMessage } from '../../utils/tool-share';
import { applyThemeForToolPage } from '../../utils/nav-theme';

const STORAGE_KEY = 'tool_decision_options_v1';

Page({
  data: {
    themeClass: 'theme-light',
    optionsText: '吃火锅\n看电影\n宅家\n散步',
    result: '',
    spinning: false,
  },

  onShow() {
    this.setData(applyThemeForToolPage());
    try {
      const saved = wx.getStorageSync(STORAGE_KEY) as string;
      if (typeof saved === 'string' && saved.trim()) {
        this.setData({ optionsText: saved });
      }
    } catch {
      /* ignore */
    }
  },

  onOptions(e: WechatMiniprogram.Input) {
    const optionsText = e.detail.value;
    this.setData({ optionsText });
    try {
      wx.setStorageSync(STORAGE_KEY, optionsText);
    } catch {
      /* ignore */
    }
  },

  onSpin() {
    if (this.data.spinning) return;
    const lines = this.data.optionsText
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (!lines.length) {
      wx.showToast({ title: '请至少填一项', icon: 'none' });
      return;
    }
    this.setData({ spinning: true, result: '' });
    wx.vibrateShort({ type: 'light' });
    const rounds = 12 + Math.floor(Math.random() * 8);
    let i = 0;
    const tick = () => {
      const pick = lines[Math.floor(Math.random() * lines.length)]!;
      this.setData({ result: pick });
      i += 1;
      if (i < rounds) {
        setTimeout(tick, 60 + i * 4);
      } else {
        this.setData({ spinning: false });
        wx.vibrateShort({ type: 'medium' });
      }
    };
    setTimeout(tick, 80);
  },
  onShareAppMessage() {
    return buildToolShareMessage('decision-wheel', '决策转盘');
  },
});
