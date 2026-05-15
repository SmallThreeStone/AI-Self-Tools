import { buildToolShareMessage } from '../../utils/tool-share';
import { applyThemeForToolPage } from '../../utils/nav-theme';

const PRESETS = ['加油', '生日快乐', '谢谢', '辛苦了', '新婚快乐'];

Page({
  data: {
    themeClass: 'theme-light',
    presets: PRESETS,
    text: '你好世界',
    fontSize: 56,
    dur: 10,
    rotate: false,
    animKey: 0,
    previewDark: true,
  },

  onShow() {
    this.setData(applyThemeForToolPage());
  },

  onPreset(e: WechatMiniprogram.TouchEvent) {
    const t = e.currentTarget.dataset.t as string | undefined;
    if (t) this.setData({ text: t });
  },

  onText(e: WechatMiniprogram.Input) {
    this.setData({ text: e.detail.value || ' ' });
  },

  onFontSize(e: WechatMiniprogram.SliderChange) {
    const fontSize = Math.round(Number(e.detail.value)) || 56;
    this.setData({ fontSize });
  },

  onDur(e: WechatMiniprogram.SliderChange) {
    const dur = Number(e.detail.value) || 10;
    this.setData({ dur, animKey: this.data.animKey + 1 });
  },

  onRotate() {
    this.setData({ rotate: !this.data.rotate });
  },

  onToggleBg() {
    this.setData({ previewDark: !this.data.previewDark });
  },
  onShareAppMessage() {
    return buildToolShareMessage('danmaku', '手持弹幕');
  },
});
