import { buildToolShareMessage } from '../../utils/tool-share';
import { applyNavigationBarTheme } from '../../utils/nav-theme';
import { getTheme } from '../../utils/storage';

// uQRCode UMD（Apache-2.0），运行时挂载 errorCorrectLevel
// eslint-disable-next-line @typescript-eslint/no-require-imports
const UQRCodeLib = require('../../utils/uqrcode.js') as {
  new (): {
    data: string;
    size: number;
    margin: number;
    errorCorrectLevel: number;
    foregroundColor: string;
    backgroundColor: string;
    canvasContext: WechatMiniprogram.CanvasContext;
    make(): void;
    drawCanvas(): Promise<void>;
  };
  errorCorrectLevel: { L: number; M: number; Q: number; H: number };
};

Page({
  data: {
    themeClass: 'theme-light',
    content: 'https://',
    canvasStyle: 'width: 400px; height: 400px;',
    canvasPx: 400,
    hasImage: false,
  },

  onShow() {
    this.applyTheme();
  },

  applyTheme() {
    const mode = getTheme();
    applyNavigationBarTheme(mode);
    const dark = mode === 'dark';
    this.setData({
      themeClass: dark ? 'theme-dark' : 'theme-light',
    });
  },

  onInput(e: WechatMiniprogram.Input) {
    this.setData({ content: e.detail.value });
  },

  onGenerate() {
    const text = this.data.content.trim();
    if (!text) {
      wx.showToast({ title: '请输入内容', icon: 'none' });
      return;
    }
    wx.showLoading({ title: '生成中' });
    const qr = new UQRCodeLib();
    qr.data = text;
    qr.size = this.data.canvasPx;
    qr.margin = 8;
    qr.errorCorrectLevel = UQRCodeLib.errorCorrectLevel.M;
    const dark = getTheme() === 'dark';
    qr.foregroundColor = dark ? '#ffffff' : '#000000';
    qr.backgroundColor = dark ? '#1f1f1f' : '#ffffff';
    try {
      qr.make();
    } catch {
      wx.hideLoading();
      wx.showToast({ title: '内容过长或无效', icon: 'none' });
      return;
    }
    const ctx = wx.createCanvasContext('qrCanvas', this);
    qr.canvasContext = ctx;
    qr
      .drawCanvas()
      .then(() => {
        wx.hideLoading();
        this.setData({ hasImage: true });
      })
      .catch(() => {
        wx.hideLoading();
        wx.showToast({ title: '绘制失败', icon: 'none' });
      });
  },

  onSave() {
    wx.canvasToTempFilePath({
      canvasId: 'qrCanvas',
      success: (res) => this.saveAlbum(res.tempFilePath),
      fail: () => wx.showToast({ title: '请先成功生成', icon: 'none' }),
    });
  },

  saveAlbum(filePath: string) {
    wx.getSetting({
      success: (s) => {
        const run = () =>
          wx.saveImageToPhotosAlbum({
            filePath,
            success: () => wx.showToast({ title: '已保存', icon: 'success' }),
            fail: () => wx.showToast({ title: '保存失败', icon: 'none' }),
          });
        if (s.authSetting['scope.writePhotosAlbum']) {
          run();
          return;
        }
        wx.authorize({
          scope: 'scope.writePhotosAlbum',
          success: run,
          fail: () =>
            wx.showModal({
              title: '需要相册权限',
              content: '请在设置中允许保存到相册',
              showCancel: false,
            }),
        });
      },
    });
  },
  onShareAppMessage() {
    return buildToolShareMessage('qrcode', '二维码生成');
  },
});
