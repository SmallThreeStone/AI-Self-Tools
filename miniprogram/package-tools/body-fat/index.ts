import { buildToolShareMessage } from '../../utils/tool-share';
import { applyThemeForToolPage } from '../../utils/nav-theme';

/** Mifflin-St Jeor 公式（估算基础代谢 kcal/日） */
function bmrMifflin(weightKg: number, heightCm: number, age: number, male: boolean): number {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  return male ? base + 5 : base - 161;
}

Page({
  data: {
    themeClass: 'theme-light',
    weight: '',
    height: '',
    age: '',
    male: true,
    activityIdx: 2,
    activityLabels: ['久坐', '轻度活动', '中度活动', '高强度'],
    /** 日常活动系数 */
    activityFactors: [1.2, 1.375, 1.55, 1.725],
    bmrText: '—',
    tdeeText: '—',
    hint: '结果为估算值，不能替代医学检测。',
  },

  onShow() {
    this.setData(applyThemeForToolPage());
  },

  onWeight(e: WechatMiniprogram.Input) {
    this.setData({ weight: e.detail.value });
  },

  onHeight(e: WechatMiniprogram.Input) {
    this.setData({ height: e.detail.value });
  },

  onAge(e: WechatMiniprogram.Input) {
    this.setData({ age: e.detail.value });
  },

  onGenderMale() {
    this.setData({ male: true });
    this.calc();
  },

  onGenderFemale() {
    this.setData({ male: false });
    this.calc();
  },

  onActivity(e: WechatMiniprogram.TouchEvent) {
    const idx = Number(e.currentTarget.dataset.idx);
    if (Number.isNaN(idx)) return;
    this.setData({ activityIdx: idx }, () => this.calc());
  },

  onCalc() {
    this.calc();
  },

  calc() {
    const w = parseFloat(this.data.weight);
    const h = parseFloat(this.data.height);
    const a = parseInt(this.data.age, 10);
    if (!(w > 0 && w < 500 && h > 50 && h < 260 && a > 10 && a < 120)) {
      this.setData({ bmrText: '—', tdeeText: '—' });
      return;
    }
    const bmr = bmrMifflin(w, h, a, this.data.male);
    const f = this.data.activityFactors[this.data.activityIdx] ?? 1.2;
    const tdee = bmr * f;
    this.setData({
      bmrText: `${Math.round(bmr)}`,
      tdeeText: `${Math.round(tdee)}`,
    });
  },
  onShareAppMessage() {
    return buildToolShareMessage('body-fat', '体脂与代谢');
  },
});
