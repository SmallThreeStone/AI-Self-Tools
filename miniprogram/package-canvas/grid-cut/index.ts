import { buildToolShareMessage } from '../../utils/tool-share';
import { applyNavigationBarTheme } from '../../utils/nav-theme';
import { saveTempImageToAlbum } from '../../utils/save-album';
import { runAfterAlbumPickHintExplained } from '../../utils/scope-hint';
import { getTheme } from '../../utils/storage';

const CELL = 400;

Page({
  data: {
    themeClass: 'theme-light',
    imagePath: '',
    thumbStyle: '',
    busy: false,
  },

  imageW: 0,
  imageH: 0,

  onShow() {
    const mode = getTheme();
    applyNavigationBarTheme(mode);
    this.setData({
      themeClass: mode === 'dark' ? 'theme-dark' : 'theme-light',
    });
  },

  onPick() {
    runAfterAlbumPickHintExplained(() => {
      wx.chooseMedia({
        count: 1,
        mediaType: ['image'],
        sourceType: ['album', 'camera'],
        success: (res) => {
          const path = res.tempFiles[0]?.tempFilePath;
          if (!path) return;
          wx.getImageInfo({
            src: path,
            success: (info) => {
              this.imageW = info.width;
              this.imageH = info.height;
              const maxW = wx.getSystemInfoSync().windowWidth - 30;
              const ratio = info.height / info.width;
              const th = Math.min(maxW * ratio, 360);
              this.setData({
                imagePath: path,
                thumbStyle: `width: ${maxW}px; height: ${th}px;`,
              });
            },
          });
        },
      });
    });
  },

  async onCutSave() {
    if (!this.data.imagePath || !this.imageW) {
      wx.showToast({ title: '请先选择图片', icon: 'none' });
      return;
    }
    if (this.data.busy) return;
    this.setData({ busy: true });
    wx.showLoading({ title: '处理中', mask: true });
    const src = this.data.imagePath;
    const iw = this.imageW;
    const ih = this.imageH;
    const cw = iw / 3;
    const ch = ih / 3;
    try {
      for (let row = 0; row < 3; row += 1) {
        for (let col = 0; col < 3; col += 1) {
          const sx = col * cw;
          const sy = row * ch;
          await this.exportCell(src, sx, sy, cw, ch);
          await delay(120);
        }
      }
      wx.hideLoading();
      wx.showModal({
        title: '完成',
        content: '已依次保存 9 张图到相册（若系统拦截请允许相册权限）。',
        showCancel: false,
      });
    } catch {
      wx.hideLoading();
      wx.showToast({ title: '切图失败', icon: 'none' });
    } finally {
      this.setData({ busy: false });
    }
  },

  exportCell(imagePath: string, sx: number, sy: number, sw: number, sh: number): Promise<void> {
    return new Promise((resolve, reject) => {
      const ctx = wx.createCanvasContext('gridCanvas', this);
      ctx.clearRect(0, 0, CELL, CELL);
      ctx.drawImage(imagePath, sx, sy, sw, sh, 0, 0, CELL, CELL);
      ctx.draw(false, () => {
        wx.canvasToTempFilePath({
          canvasId: 'gridCanvas',
          success: (res) => {
            saveTempImageToAlbum(res.tempFilePath, { silent: true })
              .then(() => resolve())
              .catch(reject);
          },
          fail: reject,
        });
      });
    });
  },
});

function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
