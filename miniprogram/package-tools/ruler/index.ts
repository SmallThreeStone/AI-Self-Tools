import { buildToolShareMessage } from '../../utils/tool-share';
import { applyThemeForToolPage } from '../../utils/nav-theme';

/** 每像素对应毫米（校准后写入） */
const KEY = 'tool_ruler_mm_per_px_v1';
/** ISO 银行卡宽度，用作对照物（毫米） */
const CARD_MM = 85.6;

Page({
  data: {
    themeClass: 'theme-light',
    windowWidthPx: 375,
    mmPerPx: 0,
    barPx: 200,
    ticks: [] as {
      left: number;
      major: boolean;
      label: string;
    }[],
    calibrated: false,
  },

  onShow() {
    this.setData(applyThemeForToolPage());
    const info = wx.getWindowInfo();
    const w = info.windowWidth || 375;
    let mmPerPx = 0;
    try {
      const stored = wx.getStorageSync(KEY) as number;
      if (typeof stored === 'number' && stored > 0 && stored < 1) mmPerPx = stored;
    } catch {
      /* ignore */
    }
    this.setData({
      windowWidthPx: w,
      mmPerPx,
      calibrated: mmPerPx > 0,
    });
    this.buildTicks(mmPerPx, w);
  },

  onBarPx(e: WechatMiniprogram.SliderChange) {
    const barPx = Number(e.detail.value);
    this.setData({ barPx });
  },

  onCalibrate() {
    const { barPx, windowWidthPx } = this.data;
    if (barPx < 40) {
      wx.showToast({ title: '请先拖动白条宽度对齐卡片', icon: 'none' });
      return;
    }
    wx.showModal({
      title: '确认校准',
      content:
        '请确认白条宽度已与银行卡长边完全对齐。校准后刻度为估算值，不能替代法定计量器具。',
      confirmText: '保存',
      cancelText: '再调整',
      success: (res) => {
        if (!res.confirm) return;
        const mmPerPx = CARD_MM / barPx;
        try {
          wx.setStorageSync(KEY, mmPerPx);
        } catch {
          /* ignore */
        }
        this.setData({ mmPerPx, calibrated: true });
        this.buildTicks(mmPerPx, windowWidthPx);
        wx.showToast({ title: '校准已保存', icon: 'success' });
      },
    });
  },

  onReset() {
    try {
      wx.removeStorageSync(KEY);
    } catch {
      /* ignore */
    }
    this.setData({ mmPerPx: 0, calibrated: false });
    this.buildTicks(0, this.data.windowWidthPx);
  },

  buildTicks(mmPerPx: number, windowWidthPx: number) {
    if (!mmPerPx || !windowWidthPx) {
      this.setData({ ticks: [] });
      return;
    }
    const lengthMm = windowWidthPx * mmPerPx;
    const ticks: typeof this.data.ticks = [];
    for (let mm = 0; mm <= lengthMm; mm += 5) {
      const pxFromLeft = mm / mmPerPx;
      const major = mm % 10 === 0;
      ticks.push({
        left: (pxFromLeft / windowWidthPx) * 100,
        major,
        label: major ? `${mm / 10}` : '',
      });
    }
    this.setData({ ticks });
  },
  onShareAppMessage() {
    return buildToolShareMessage('ruler', '直尺');
  },
});
