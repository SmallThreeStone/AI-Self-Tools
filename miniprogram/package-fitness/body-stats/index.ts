import { applyThemeForToolPage } from '../../utils/nav-theme';
import { buildToolShareMessage } from '../../utils/tool-share';
import { getBodyMeasurements, saveBodyMeasurement } from '../utils';
import type { BodyMeasurement } from '../types';

Page({
  data: {
    themeClass: 'theme-light',
    weight: '',
    bodyFat: '',
    chest: '',
    waist: '',
    hip: '',
    leftArm: '',
    rightArm: '',
    leftThigh: '',
    rightThigh: '',
    leftCalf: '',
    rightCalf: '',
    records: [] as BodyMeasurement[],
    showChart: false,
    weekWeights: [] as number[],
    weekLabels: [] as string[],
  },

  onShow() {
    this.setData(applyThemeForToolPage());
    this.loadRecords();
  },

  loadRecords() {
    const all = getBodyMeasurements();
    const records = all.slice(0, 20);
    const weekWeights = all.slice(0, 7).map((m) => m.weight).reverse();
    const weekLabels = all.slice(0, 7).map((m) => m.date.slice(5)).reverse();
    this.setData({ records, weekWeights, weekLabels });
  },

  onWeightInput(e: WechatMiniprogram.Input) { this.setData({ weight: e.detail.value }); },
  onBodyFatInput(e: WechatMiniprogram.Input) { this.setData({ bodyFat: e.detail.value }); },
  onChestInput(e: WechatMiniprogram.Input) { this.setData({ chest: e.detail.value }); },
  onWaistInput(e: WechatMiniprogram.Input) { this.setData({ waist: e.detail.value }); },
  onHipInput(e: WechatMiniprogram.Input) { this.setData({ hip: e.detail.value }); },
  onLeftArmInput(e: WechatMiniprogram.Input) { this.setData({ leftArm: e.detail.value }); },
  onRightArmInput(e: WechatMiniprogram.Input) { this.setData({ rightArm: e.detail.value }); },
  onLeftThighInput(e: WechatMiniprogram.Input) { this.setData({ leftThigh: e.detail.value }); },
  onRightThighInput(e: WechatMiniprogram.Input) { this.setData({ rightThigh: e.detail.value }); },
  onLeftCalfInput(e: WechatMiniprogram.Input) { this.setData({ leftCalf: e.detail.value }); },
  onRightCalfInput(e: WechatMiniprogram.Input) { this.setData({ rightCalf: e.detail.value }); },

  save() {
    const weight = parseFloat(this.data.weight);
    if (!(weight > 0)) {
      wx.showToast({ title: '请输入体重', icon: 'none' });
      return;
    }

    const today = new Date().toISOString().slice(0, 10);
    const record: BodyMeasurement = {
      date: today,
      weight,
      bodyFat: this.data.bodyFat ? parseFloat(this.data.bodyFat) : undefined,
      chest: this.data.chest ? parseFloat(this.data.chest) : undefined,
      waist: this.data.waist ? parseFloat(this.data.waist) : undefined,
      hip: this.data.hip ? parseFloat(this.data.hip) : undefined,
      leftArm: this.data.leftArm ? parseFloat(this.data.leftArm) : undefined,
      rightArm: this.data.rightArm ? parseFloat(this.data.rightArm) : undefined,
      leftThigh: this.data.leftThigh ? parseFloat(this.data.leftThigh) : undefined,
      rightThigh: this.data.rightThigh ? parseFloat(this.data.rightThigh) : undefined,
      leftCalf: this.data.leftCalf ? parseFloat(this.data.leftCalf) : undefined,
      rightCalf: this.data.rightCalf ? parseFloat(this.data.rightCalf) : undefined,
    };

    saveBodyMeasurement(record);
    wx.showToast({ title: '已保存', icon: 'success' });
    this.loadRecords();
    this.setData({
      weight: '', bodyFat: '', chest: '', waist: '', hip: '',
      leftArm: '', rightArm: '', leftThigh: '', rightThigh: '', leftCalf: '', rightCalf: '',
    });
  },

  toggleChart() {
    this.setData({ showChart: !this.data.showChart });
  },

  onShareAppMessage() {
    return buildToolShareMessage('fitness', '健身记录');
  },
});
