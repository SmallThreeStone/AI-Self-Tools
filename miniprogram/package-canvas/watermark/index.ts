import { buildToolShareMessage } from '../../utils/tool-share';
import { applyNavigationBarTheme } from '../../utils/nav-theme';
import { saveTempImageToAlbum } from '../../utils/save-album';
import { runAfterAlbumPickHintExplained } from '../../utils/scope-hint';
import { getTheme } from '../../utils/storage';

Page({
  data: {
    themeClass: 'theme-light',
    imagePath: '',
    text: '仅供展示',
    canvasW: 300,
    canvasH: 400,
  },

  onShow() {
    const mode = getTheme();
    applyNavigationBarTheme(mode);
    this.setData({
      themeClass: mode === 'dark' ? 'theme-dark' : 'theme-light',
    });
  },

  onText(e: WechatMiniprogram.Input) {
    this.setData({ text: e.detail.value || '仅供展示' });
  },

  onPick() {
    runAfterAlbumPickHintExplained(() => {
      wx.chooseMedia({
        count: 1,
        mediaType: ['image'],
        sourceType: ['album', 'camera'],
        success: (res) => {
          const path = res.tempFiles[0]?.tempFilePath;
          this.setData({ imagePath: path }, () => this.redraw());
        },
      });
    });
  },

  redraw(done?: () => void) {
    const { imagePath, text, canvasW, canvasH } = this.data;
    if (!imagePath) {
      done?.();
      return;
    }
    wx.getImageInfo({
      src: imagePath,
      success: (info) => {
        const ctx = wx.createCanvasContext('wmCanvas', this);
        const iw = info.width;
        const ih = info.height;
        const scale = Math.min(canvasW / iw, canvasH / ih);
        const dw = iw * scale;
        const dh = ih * scale;
        const dx = (canvasW - dw) / 2;
        const dy = (canvasH - dh) / 2;
        ctx.clearRect(0, 0, canvasW, canvasH);
        ctx.setFillStyle('#000000');
        ctx.fillRect(0, 0, canvasW, canvasH);
        ctx.drawImage(imagePath, dx, dy, dw, dh);
        const barH = 40;
        ctx.setFillStyle('rgba(0,0,0,0.45)');
        ctx.fillRect(0, canvasH - barH, canvasW, barH);
        ctx.setFillStyle('#ffffff');
        ctx.setFontSize(14);
        ctx.setTextBaseline('middle');
        ctx.fillText(text || '水印', 12, canvasH - barH / 2);
        ctx.draw(false, () => done?.());
      },
      fail: () => done?.(),
    });
  },

  onRefresh() {
    this.redraw();
  },

  onSave() {
    if (!this.data.imagePath) {
      wx.showToast({ title: '请先选择图片', icon: 'none' });
      return;
    }
    this.redraw(() => {
      wx.canvasToTempFilePath({
        canvasId: 'wmCanvas',
        success: (res) => {
          saveTempImageToAlbum(res.tempFilePath).catch(() => {});
        },
        fail: () => wx.showToast({ title: '导出失败', icon: 'none' }),
      });
    });
  },
  onShareAppMessage() {
    return buildToolShareMessage('watermark', '图片水印');
  },
});
