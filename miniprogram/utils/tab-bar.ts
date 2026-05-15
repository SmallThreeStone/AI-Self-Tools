import { getTheme } from './storage';

const THEME_CLASS = { light: 'theme-light', dark: 'theme-dark' } as const;

export function updateTabBar(selected: 0 | 1 | 2) {
  const pages = getCurrentPages();
  const page = pages[pages.length - 1] as WechatMiniprogram.Page.TrivialInstance & {
    getTabBar?: () => { setData: (d: Record<string, unknown>) => void };
  };
  if (!page || typeof page.getTabBar !== 'function') return;
  const bar = page.getTabBar();
  if (!bar) return;
  const mode = getTheme();
  bar.setData({
    selected,
    themeClass: mode === 'dark' ? THEME_CLASS.dark : THEME_CLASS.light,
  });
}
