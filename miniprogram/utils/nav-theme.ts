import type { ThemeMode } from './storage';
import { getTheme } from './storage';

/** 顶部导航栏随明暗主题同步（Tab 页与各主路径页面请在 onShow / 切换主题后调用） */
export function applyNavigationBarTheme(mode: ThemeMode): void {
  const dark = mode === 'dark';
  wx.setNavigationBarColor({
    frontColor: dark ? '#ffffff' : '#000000',
    backgroundColor: dark ? '#141414' : '#ffffff',
    animation: {
      duration: 200,
      timingFunc: 'easeIn',
    },
  });
}

/** 分包工具页 onShow 一键同步导航栏 + page 根节点 themeClass */
export function applyThemeForToolPage(): {
  themeClass: 'theme-light' | 'theme-dark';
} {
  const mode = getTheme();
  applyNavigationBarTheme(mode);
  return {
    themeClass: mode === 'dark' ? 'theme-dark' : 'theme-light',
  };
}