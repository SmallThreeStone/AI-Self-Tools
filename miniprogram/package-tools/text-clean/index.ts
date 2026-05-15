import { buildToolShareMessage } from '../../utils/tool-share';
import { applyThemeForToolPage } from '../../utils/nav-theme';

Page({
  data: {
    themeClass: 'theme-light',
    raw: '',
    lines: '0',
    chars: '0',
    nonSpace: '0',
  },

  onShow() {
    this.setData(applyThemeForToolPage());
  },

  onInput(e: WechatMiniprogram.Input) {
    const raw = e.detail.value || '';
    this.setData({ raw }, () => this.stats());
  },

  stats() {
    const raw = this.data.raw;
    const lines = raw.length === 0 ? 0 : raw.split(/\r\n|\r|\n/).length;
    const chars = [...raw].length;
    const nonSpace = [...raw.replace(/\s+/g, '')].length;
    this.setData({
      lines: `${lines}`,
      chars: `${chars}`,
      nonSpace: `${nonSpace}`,
    });
  },

  onTrimEnds() {
    const raw = this.data.raw.replace(/^\s+|\s+$/g, '');
    this.setData({ raw }, () => {
      this.stats();
      wx.showToast({ title: '已去首尾空白', icon: 'none' });
    });
  },

  onCollapseSpace() {
    let raw = this.data.raw;
    raw = raw.replace(/[ \t]+/g, ' ');
    raw = raw.replace(/\n{3,}/g, '\n\n');
    this.setData({ raw }, () => {
      this.stats();
      wx.showToast({ title: '已压缩空白', icon: 'none' });
    });
  },

  onClear() {
    this.setData({ raw: '', lines: '0', chars: '0', nonSpace: '0' });
  },
  onShareAppMessage() {
    return buildToolShareMessage('text-clean', '文本整理');
  },
});
