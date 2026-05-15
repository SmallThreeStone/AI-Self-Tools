import { buildToolShareMessage } from '../../utils/tool-share';
import { dareTasks, truthQuestions } from '../../config/truth-dare-data';
import { applyThemeForToolPage } from '../../utils/nav-theme';

type Mode = 'mix' | 'truth' | 'dare';

Page({
  data: {
    themeClass: 'theme-light',
    mode: 'mix' as Mode,
    card: '',
  },

  onShow() {
    this.setData(applyThemeForToolPage());
  },

  onMode(e: WechatMiniprogram.TouchEvent) {
    const m = e.currentTarget.dataset.m as Mode;
    if (m) this.setData({ mode: m });
  },

  onNext() {
    const mode = this.data.mode;
    let type: 'truth' | 'dare';
    if (mode === 'truth') type = 'truth';
    else if (mode === 'dare') type = 'dare';
    else type = Math.random() < 0.5 ? 'truth' : 'dare';

    const pool = type === 'truth' ? truthQuestions : dareTasks;
    const card = pool[Math.floor(Math.random() * pool.length)]!;
    wx.vibrateShort({ type: 'light' });
    const prefix = type === 'truth' ? '真心话' : '大冒险';
    this.setData({
      card: `${prefix}：${card}`,
    });
  },
  onShareAppMessage() {
    return buildToolShareMessage('truth-dare', '真心话大冒险');
  },
});
