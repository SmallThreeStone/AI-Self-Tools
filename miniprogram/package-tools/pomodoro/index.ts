import { buildToolShareMessage } from '../../utils/tool-share';
import { applyNavigationBarTheme } from '../../utils/nav-theme';
import { getTheme } from '../../utils/storage';

const PRESETS = [15, 25, 45];

Page({
  data: {
    themeClass: 'theme-light',
    presetLabels: PRESETS.map((x) => `${x} 分钟`),
    presetIndex: 1,
    minutes: 25,
    remainingSec: 25 * 60,
    timeText: '25:00',
    running: false,
    label: '准备开始',
  },

  timer: 0 as number,

  onShow() {
    const mode = getTheme();
    applyNavigationBarTheme(mode);
    this.setData({
      themeClass: mode === 'dark' ? 'theme-dark' : 'theme-light',
    });
  },

  onUnload() {
    this.stopTimer();
  },

  onMinutesChange(e: WechatMiniprogram.PickerChange) {
    if (this.data.running) return;
    const idx = Number(e.detail.value);
    const minutes = PRESETS[idx] ?? 25;
    const remainingSec = minutes * 60;
    this.setData({
      presetIndex: idx,
      minutes,
      remainingSec,
      timeText: formatClock(remainingSec),
      label: '准备开始',
    });
  },

  onToggle() {
    if (this.data.running) {
      this.stopTimer();
      this.setData({ running: false, label: '已暂停' });
      return;
    }
    let sec = this.data.remainingSec;
    if (sec <= 0) {
      sec = this.data.minutes * 60;
      this.setData({ remainingSec: sec, timeText: formatClock(sec) });
    }
    this.setData({ running: true, label: '专注中' });
    this.timer = setInterval(() => {
      const next = this.data.remainingSec - 1;
      if (next <= 0) {
        this.stopTimer();
        wx.vibrateShort({ type: 'medium' });
        wx.showToast({ title: '本轮结束', icon: 'success' });
        const resetSec = this.data.minutes * 60;
        this.setData({
          running: false,
          remainingSec: resetSec,
          timeText: formatClock(resetSec),
          label: '准备开始',
        });
        return;
      }
      this.setData({ remainingSec: next, timeText: formatClock(next) });
    }, 1000) as unknown as number;
  },

  onReset() {
    this.stopTimer();
    const remainingSec = this.data.minutes * 60;
    this.setData({
      running: false,
      remainingSec,
      timeText: formatClock(remainingSec),
      label: '准备开始',
    });
  },

  stopTimer() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = 0;
    }
  },
});

function formatClock(sec: number) {
  const m = Math.floor(sec / 60)
    .toString()
    .padStart(2, '0');
  const s = (sec % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}
