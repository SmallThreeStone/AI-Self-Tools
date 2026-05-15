import { getTheme } from './utils/storage';
import { syncCurrentPageThemeFromSystem } from './utils/theme-sync';

App<IAppOption>({
  globalData: {
    theme: 'light',
    pendingCategoryId: '',
  },
  onLaunch() {
    this.globalData.theme = getTheme();
    if (typeof wx.onThemeChange === 'function') {
      wx.onThemeChange(() => {
        syncCurrentPageThemeFromSystem();
      });
    }
  },
  onShow() {
    syncCurrentPageThemeFromSystem();
  },
});
