import { buildToolShareMessage } from '../../utils/tool-share';
import { kinshipPresets } from '../../config/kinship-presets';
import { applyThemeForToolPage } from '../../utils/nav-theme';

Page({
  data: {
    themeClass: 'theme-light',
    keyword: '',
    list: kinshipPresets,
  },

  onShow() {
    this.setData(applyThemeForToolPage());
  },

  onSearch(e: WechatMiniprogram.Input) {
    const keyword = (e.detail.value || '').trim().toLowerCase();
    const list = !keyword
      ? kinshipPresets
      : kinshipPresets.filter(
          (x) =>
            x.q.toLowerCase().includes(keyword) || x.a.toLowerCase().includes(keyword)
        );
    this.setData({ keyword: e.detail.value, list });
  },
  onShareAppMessage() {
    return buildToolShareMessage('relative-calc', '亲戚计算器');
  },
});
