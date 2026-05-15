import { buildToolShareMessage } from '../../utils/tool-share';
import { applyNavigationBarTheme } from '../../utils/nav-theme';
import { saveTempImageToAlbum } from '../../utils/save-album';
import { getTheme } from '../../utils/storage';

const PAD = 24;
const LINE_H = 26;
const FONT_PX = 15;
const MAX_CHARS_PER_LINE = 22;
const MAX_LINES = 120;

Page({
  data: {
    themeClass: 'theme-light',
    content: '',
    canvasW: 345,
    canvasH: 400,
    canvasStyle: '',
    ready: false,
  },

  onLoad() {
    const w = wx.getSystemInfoSync().windowWidth || 375;
    const canvasW = Math.min(375, w - 30);
    this.setData({
      canvasW,
      canvasStyle: `width: ${canvasW}px; height: 400px;`,
    });
  },

  onShow() {
    const mode = getTheme();
    applyNavigationBarTheme(mode);
    this.setData({
      themeClass: mode === 'dark' ? 'theme-dark' : 'theme-light',
    });
  },

  onInput(e: WechatMiniprogram.Input) {
    this.setData({ content: e.detail.value });
  },

  onPreview() {
    const raw = this.data.content.trim();
    if (!raw) {
      wx.showToast({ title: '请先输入文字', icon: 'none' });
      return;
    }
    const lines = wrapLines(raw, MAX_CHARS_PER_LINE).slice(0, MAX_LINES);
    if (lines.length >= MAX_LINES) {
      wx.showToast({ title: '内容过长，已截断', icon: 'none' });
    }
    const { canvasW } = this.data;
    const canvasH = Math.max(120, PAD * 2 + lines.length * LINE_H);
    this.setData(
      {
        canvasH,
        canvasStyle: `width: ${canvasW}px; height: ${canvasH}px;`,
        ready: true,
      },
      () => {
        setTimeout(() => this.draw(lines), 50);
      }
    );
  },

  draw(lines: string[]) {
    const { canvasW, canvasH } = this.data;
    const dark = getTheme() === 'dark';
    const bg = dark ? '#1f1f1f' : '#ffffff';
    const fg = dark ? '#e8e8e8' : '#222222';
    const ctx = wx.createCanvasContext('tiCanvas', this);
    ctx.setFillStyle(bg);
    ctx.fillRect(0, 0, canvasW, canvasH);
    ctx.setFillStyle(fg);
    ctx.setFontSize(FONT_PX);
    ctx.setTextBaseline('top');
    let y = PAD;
    for (const line of lines) {
      ctx.fillText(line, PAD, y);
      y += LINE_H;
    }
    ctx.draw(false, () => {
      wx.showToast({ title: '已生成预览', icon: 'none' });
    });
  },

  onSave() {
    if (!this.data.ready) {
      wx.showToast({ title: '请先生成预览', icon: 'none' });
      return;
    }
    wx.canvasToTempFilePath({
      canvasId: 'tiCanvas',
      success: (res) => {
        saveTempImageToAlbum(res.tempFilePath).catch(() => {});
      },
      fail: () => wx.showToast({ title: '导出失败', icon: 'none' }),
    });
  },
});

function wrapLines(text: string, maxChars: number): string[] {
  const out: string[] = [];
  const parts = text.split(/\r?\n/);
  for (const p of parts) {
    if (!p) {
      out.push(' ');
      continue;
    }
    for (let i = 0; i < p.length; i += maxChars) {
      out.push(p.slice(i, i + maxChars));
    }
  }
  return out;
}
