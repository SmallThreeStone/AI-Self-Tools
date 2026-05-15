import { buildToolShareMessage } from '../../utils/tool-share';
import { applyThemeForToolPage } from '../../utils/nav-theme';

Page({
  data: {
    themeClass: 'theme-light',
    /** 遮罩强度 0–85，对应 dim 透明度 */
    dimPercent: 0,
    dim: 0,
    showPanel: true,
  },

  onShow() {
    this.setData(applyThemeForToolPage());
  },

  noop() {},

  onDim(e: WechatMiniprogram.SliderChange) {
    const dimPercent = Number(e.detail.value);
    this.setData({ dimPercent, dim: dimPercent / 100 });
  },

  onTapStage() {
    this.setData({ showPanel: !this.data.showPanel });
  },
  onShareAppMessage() {
    return buildToolShareMessage('fill-light', '屏幕补光灯');
  },
});
