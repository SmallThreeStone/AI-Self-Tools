import { APP_DESC, APP_NAME, APP_VERSION } from '../../config/app-meta';
import { applyNavigationBarTheme } from '../../utils/nav-theme';
import { buildDefaultShareMessage } from '../../utils/tool-share';
import { getTheme } from '../../utils/storage';

Page({
  data: {
    themeClass: 'theme-light',
    appName: APP_NAME,
    version: APP_VERSION,
    desc: APP_DESC,
  },

  onShow() {
    const mode = getTheme();
    applyNavigationBarTheme(mode);
    this.setData({
      themeClass: mode === 'dark' ? 'theme-dark' : 'theme-light',
    });
  },

  onShareAppMessage() {
    return buildDefaultShareMessage();
  },
});
