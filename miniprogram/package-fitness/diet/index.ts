import { applyThemeForToolPage } from '../../utils/nav-theme';
import { buildToolShareMessage } from '../../utils/tool-share';

Page({
  data: { themeClass: 'theme-light' },
  onShow() { this.setData(applyThemeForToolPage()); },
  onShareAppMessage() { return buildToolShareMessage('fitness', '健身记录'); },
});
