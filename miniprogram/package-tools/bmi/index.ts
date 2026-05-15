import { buildToolShareMessage } from '../../utils/tool-share';
import { applyNavigationBarTheme } from '../../utils/nav-theme';
import { getTheme } from '../../utils/storage';

Page({
  data: {
    themeClass: 'theme-light',
    heightCm: '',
    weightKg: '',
    bmiText: '--',
    level: '',
  },

  onShow() {
    const mode = getTheme();
    applyNavigationBarTheme(mode);
    this.setData({
      themeClass: mode === 'dark' ? 'theme-dark' : 'theme-light',
    });
  },

  onHeight(e: WechatMiniprogram.Input) {
    this.setData({ heightCm: e.detail.value }, () => this.calc());
  },

  onWeight(e: WechatMiniprogram.Input) {
    this.setData({ weightKg: e.detail.value }, () => this.calc());
  },

  calc() {
    const h = parseFloat(this.data.heightCm);
    const w = parseFloat(this.data.weightKg);
    if (!Number.isFinite(h) || !Number.isFinite(w) || h <= 0 || w <= 0) {
      this.setData({ bmiText: '--', level: '' });
      return;
    }
    const hm = h / 100;
    const bmi = w / (hm * hm);
    const val = bmi.toFixed(1);
    let level = '';
    if (bmi < 18.5) level = '偏瘦';
    else if (bmi < 24) level = '正常';
    else if (bmi < 28) level = '超重';
    else level = '肥胖';
    this.setData({
      bmiText: val,
      level: `判定：${level}（仅供参考）`,
    });
  },
  onShareAppMessage() {
    return buildToolShareMessage('bmi', 'BMI计算器');
  },
});
