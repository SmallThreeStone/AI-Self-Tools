import { buildToolShareMessage } from '../../utils/tool-share';
import { applyNavigationBarTheme } from '../../utils/nav-theme';
import { getTheme } from '../../utils/storage';

Page({
  data: {
    themeClass: 'theme-light',
    price: '',
    discount: '',
    finalPrice: '--',
    saved: '--',
  },

  onShow() {
    const mode = getTheme();
    applyNavigationBarTheme(mode);
    this.setData({
      themeClass: mode === 'dark' ? 'theme-dark' : 'theme-light',
    });
  },

  onPrice(e: WechatMiniprogram.Input) {
    this.setData({ price: e.detail.value }, () => this.calc());
  },

  onDiscount(e: WechatMiniprogram.Input) {
    this.setData({ discount: e.detail.value }, () => this.calc());
  },

  calc() {
    const price = parseFloat(this.data.price);
    const discount = parseFloat(this.data.discount);
    if (!Number.isFinite(price) || !Number.isFinite(discount)) {
      this.setData({ finalPrice: '--', saved: '--' });
      return;
    }
    const rate = Math.min(Math.max(discount, 0), 100);
    const pay = (price * (100 - rate)) / 100;
    const saved = price - pay;
    this.setData({
      finalPrice: pay.toFixed(2),
      saved: saved.toFixed(2),
    });
  },
  onShareAppMessage() {
    return buildToolShareMessage('discount', '折扣计算器');
  },
});
