import { buildToolShareMessage } from '../../utils/tool-share';
import { applyThemeForToolPage } from '../../utils/nav-theme';

const KEY = 'tool_scoreboard_v1';

Page({
  data: {
    themeClass: 'theme-light',
    nameA: 'A 队',
    nameB: 'B 队',
    scoreA: 0,
    scoreB: 0,
  },

  onShow() {
    this.setData(applyThemeForToolPage());
    try {
      const raw = wx.getStorageSync(KEY) as
        | { nameA?: string; nameB?: string; scoreA?: number; scoreB?: number }
        | undefined;
      if (raw && typeof raw === 'object') {
        this.setData({
          nameA: raw.nameA || 'A 队',
          nameB: raw.nameB || 'B 队',
          scoreA: Number.isFinite(raw.scoreA) ? raw.scoreA! : 0,
          scoreB: Number.isFinite(raw.scoreB) ? raw.scoreB! : 0,
        });
      }
    } catch {
      /* ignore */
    }
  },

  persist() {
    const { nameA, nameB, scoreA, scoreB } = this.data;
    try {
      wx.setStorageSync(KEY, { nameA, nameB, scoreA, scoreB });
    } catch {
      /* ignore */
    }
  },

  onNameA(e: WechatMiniprogram.Input) {
    this.setData({ nameA: e.detail.value }, () => this.persist());
  },

  onNameB(e: WechatMiniprogram.Input) {
    this.setData({ nameB: e.detail.value }, () => this.persist());
  },

  addA() {
    this.setData({ scoreA: this.data.scoreA + 1 }, () => this.persist());
  },

  subA() {
    this.setData({ scoreA: Math.max(0, this.data.scoreA - 1) }, () => this.persist());
  },

  addB() {
    this.setData({ scoreB: this.data.scoreB + 1 }, () => this.persist());
  },

  subB() {
    this.setData({ scoreB: Math.max(0, this.data.scoreB - 1) }, () => this.persist());
  },

  onReset() {
    wx.showModal({
      title: '归零',
      content: '双方分数清零？',
      success: (res) => {
        if (res.confirm) {
          this.setData({ scoreA: 0, scoreB: 0 }, () => this.persist());
        }
      },
    });
  },
  onShareAppMessage() {
    return buildToolShareMessage('scoreboard', '记分牌');
  },
});
