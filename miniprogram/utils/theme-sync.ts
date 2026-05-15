import { getTheme, getThemePreference } from './storage';
import { applyNavigationBarTheme } from './nav-theme';

/** 跟随系统模式下，系统深浅变化时刷新当前页导航栏与 themeClass */
export function syncCurrentPageThemeFromSystem(): void {
  if (getThemePreference() !== 'system') return;
  const pages = getCurrentPages();
  const cur = pages[pages.length - 1] as
    | (WechatMiniprogram.Page.Instance<
        WechatMiniprogram.IAnyObject,
        WechatMiniprogram.IAnyObject
      > & {
        setData?: (d: WechatMiniprogram.IAnyObject) => void;
      })
    | undefined;
  if (!cur || typeof cur.setData !== 'function') return;
  const mode = getTheme();
  applyNavigationBarTheme(mode);
  cur.setData({
    themeClass: mode === 'dark' ? 'theme-dark' : 'theme-light',
  });
}
