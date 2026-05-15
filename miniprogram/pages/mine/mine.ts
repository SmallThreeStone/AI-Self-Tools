import { APP_NAME, APP_VERSION } from '../../config/app-meta';
import { applyNavigationBarTheme } from '../../utils/nav-theme';
import {
  getTheme,
  getThemePreference,
  setThemePreference,
  type ThemeMode,
  type ThemePreference,
} from '../../utils/storage';
import { updateTabBar } from '../../utils/tab-bar';

Page({
  data: {
    appName: APP_NAME,
    appVersion: APP_VERSION,
    themeClass: 'theme-light',
    themePrefLabel: '',
  },

  onShow() {
    const mode = getTheme();
    applyNavigationBarTheme(mode);
    this.applyTheme(mode);
    updateTabBar(2);
    this.refreshPrefLabel();
  },

  refreshPrefLabel() {
    const pref = getThemePreference();
    let themePrefLabel = '浅色';
    if (pref === 'system') themePrefLabel = '跟随系统';
    else if (pref === 'dark') themePrefLabel = '深色';
    this.setData({ themePrefLabel });
  },

  applyTheme(mode: ThemeMode) {
    const themeClass = mode === 'dark' ? 'theme-dark' : 'theme-light';
    this.setData({ themeClass });
  },

  onPickThemePref(e: WechatMiniprogram.TouchEvent) {
    const pref = e.currentTarget.dataset.pref as ThemePreference | undefined;
    if (!pref || (pref !== 'system' && pref !== 'light' && pref !== 'dark')) return;
    setThemePreference(pref);
    const mode = getTheme();
    applyNavigationBarTheme(mode);
    this.applyTheme(mode);
    this.refreshPrefLabel();
    updateTabBar(2);
    wx.showToast({ title: '已保存外观偏好', icon: 'none' });
  },

  onShareAppMessage() {
    return {
      title: `${APP_NAME} · 备份与工具偏好仅存本机`,
      path: '/pages/mine/mine',
    };
  },
});
