import { buildToolShareMessage } from '../../utils/tool-share';
import { applyThemeForToolPage } from '../../utils/nav-theme';

Page({
  data: {
    themeClass: 'theme-light',
    time: '',
    date: '',
  },

  timer: 0 as number,

  onShow() {
    this.setData(applyThemeForToolPage());
    this.clearTimer();
    this.tick();
    this.timer = setInterval(() => this.tick(), 1000) as unknown as number;
  },

  onHide() {
    this.clearTimer();
  },

  onUnload() {
    this.clearTimer();
  },

  clearTimer() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = 0;
    }
  },

  tick() {
    const d = new Date();
    const h = d.getHours().toString().padStart(2, '0');
    const m = d.getMinutes().toString().padStart(2, '0');
    const s = d.getSeconds().toString().padStart(2, '0');
    const wk = ['日', '一', '二', '三', '四', '五', '六'][d.getDay()];
    const date = `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日 周${wk}`;
    this.setData({
      time: `${h}:${m}:${s}`,
      date,
    });
  },
  onShareAppMessage() {
    return buildToolShareMessage('zen-clock', '禅意时钟');
  },
});
