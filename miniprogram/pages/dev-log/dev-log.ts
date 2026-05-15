import { changelog } from '../../config/changelog';
import { applyNavigationBarTheme } from '../../utils/nav-theme';
import { buildDefaultShareMessage } from '../../utils/tool-share';
import { getTheme } from '../../utils/storage';

Page({
  data: {
    themeClass: 'theme-light',
    entries: [] as Array<(typeof changelog)[number] & { isLast: boolean }>,
    hint: '数据来自 config/changelog.ts，发版时在数组顶部追加一条。',
  },

  onShow() {
    const mode = getTheme();
    applyNavigationBarTheme(mode);
    const themeClass = mode === 'dark' ? 'theme-dark' : 'theme-light';
    const entries = changelog.map((e, i) => ({
      ...e,
      isLast: i === changelog.length - 1,
    }));
    this.setData({ themeClass, entries });
  },

  onShareAppMessage() {
    return buildDefaultShareMessage();
  },
});