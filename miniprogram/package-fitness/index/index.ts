import { applyThemeForToolPage } from '../../utils/nav-theme';
import { buildToolShareMessage } from '../../utils/tool-share';
import { getTodayWorkout, getTodayBodyMeasurement, getTodayDiet, getRecentBodyMeasurements } from '../utils';
import { drawWeightChart } from './chart';

Page({
  data: {
    themeClass: 'theme-light',
    workoutStatus: '',
    weightStatus: '',
    dietStatus: '',
    weightChartData: null as number[] | null,
    weightChartLabels: null as string[] | null,
    hasTodayBody: false,
  },

  onShow() {
    this.setData(applyThemeForToolPage());
    this.loadDashboard();
  },

  loadDashboard() {
    const todayWorkout = getTodayWorkout();
    const workoutStatus = todayWorkout
      ? `已完成 ${todayWorkout.totalSets} 组`
      : '今日尚未训练';

    const todayBody = getTodayBodyMeasurement();
    const weightStatus = todayBody
      ? `已记录 ${todayBody.weight} kg`
      : '尚未记录';
    const hasTodayBody = !!todayBody;

    const todayDiet = getTodayDiet();
    const dietStatus = todayDiet
      ? `已录 ${todayDiet.meals.length} 餐`
      : '尚未记录';

    const recent = getRecentBodyMeasurements(7);
    const weightChartData = recent.map((m) => m.weight).reverse();
    const weightChartLabels = recent.map((m) => m.date.slice(5)).reverse();

    this.setData({
      workoutStatus,
      weightStatus,
      dietStatus,
      hasTodayBody,
      weightChartData,
      weightChartLabels,
    });

    // 绘制体重图表
    wx.nextTick(() => {
      const query = wx.createSelectorQuery();
      query.select('.chart-canvas').fields({ node: false, size: true }).exec((res) => {
        if (!res || !res[0]) return;
        const { width, height } = res[0];
        const ctx = wx.createCanvasContext('weightChart');
        const { weightChartData, weightChartLabels } = this.data;
        if (weightChartData && weightChartData.length > 0) {
          const isDark = this.data.themeClass === 'theme-dark';
          drawWeightChart(ctx, weightChartData, weightChartLabels, width, height, isDark);
        }
        ctx.draw();
      });
    });
  },

  onStartWorkout() {
    wx.navigateTo({ url: '/package-fitness/workout/index' });
  },

  onRecordWeight() {
    wx.navigateTo({ url: '/package-fitness/body-stats/index' });
  },

  onRecordDiet() {
    wx.navigateTo({ url: '/package-fitness/diet/index' });
  },

  onShareAppMessage() {
    return buildToolShareMessage('fitness', '健身记录');
  },
});
