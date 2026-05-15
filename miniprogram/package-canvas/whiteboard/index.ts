import { buildToolShareMessage } from '../../utils/tool-share';
import { applyNavigationBarTheme } from '../../utils/nav-theme';
import { saveTempImageToAlbum } from '../../utils/save-album';
import { getTheme } from '../../utils/storage';

Page({
  data: {
    themeClass: 'theme-light',
    canvasW: 375,
    canvasH: 480,
    canvasStyle: '',
    color: '#1677ff',
    lineWidth: 4,
  },

  lastX: 0,
  lastY: 0,
  drawing: false,

  onLoad() {
    const w = wx.getSystemInfoSync().windowWidth || 375;
    const h = Math.min(560, Math.floor(w * 1.25));
    this.setData({
      canvasW: w,
      canvasH: h,
      canvasStyle: `width: ${w}px; height: ${h}px;`,
    });
  },

  onReady() {
    this.fillWhite();
  },

  onShow() {
    const mode = getTheme();
    applyNavigationBarTheme(mode);
    this.setData({
      themeClass: mode === 'dark' ? 'theme-dark' : 'theme-light',
    });
  },

  fillWhite() {
    const { canvasW, canvasH } = this.data;
    const ctx = wx.createCanvasContext('wbCanvas', this);
    ctx.setFillStyle('#ffffff');
    ctx.fillRect(0, 0, canvasW, canvasH);
    ctx.draw();
  },

  touchStart(e: WechatMiniprogram.TouchEvent) {
    const p = touchXY(e);
    if (!p) return;
    this.drawing = true;
    this.lastX = p.x;
    this.lastY = p.y;
  },

  touchMove(e: WechatMiniprogram.TouchEvent) {
    if (!this.drawing) return;
    const p = touchXY(e);
    if (!p) return;
    const ctx = wx.createCanvasContext('wbCanvas', this);
    ctx.setStrokeStyle(this.data.color);
    ctx.setLineWidth(this.data.lineWidth);
    ctx.setLineCap('round');
    ctx.setLineJoin('round');
    ctx.moveTo(this.lastX, this.lastY);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    ctx.draw(true);
    this.lastX = p.x;
    this.lastY = p.y;
  },

  touchEnd() {
    this.drawing = false;
  },

  onClear() {
    this.fillWhite();
  },

  onColor(e: WechatMiniprogram.TouchEvent) {
    const c = e.currentTarget.dataset.color as string;
    if (c) this.setData({ color: c });
  },

  onSave() {
    wx.canvasToTempFilePath({
      canvasId: 'wbCanvas',
      success: (res) => {
        saveTempImageToAlbum(res.tempFilePath).catch(() => {});
      },
      fail: () => wx.showToast({ title: '导出失败', icon: 'none' }),
    });
  },
});

function touchXY(e: WechatMiniprogram.TouchEvent): { x: number; y: number } | null {
  const t = e.touches[0] || e.changedTouches[0];
  if (!t) return null;
  const any = t as unknown as { x?: number; y?: number; clientX?: number; clientY?: number };
  const x = typeof any.x === 'number' ? any.x : any.clientX ?? 0;
  const y = typeof any.y === 'number' ? any.y : any.clientY ?? 0;
  return { x, y };
}
