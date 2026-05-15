import { getTheme } from '../utils/storage';

Component({
  data: {
    selected: 0,
    themeClass: 'theme-light',
    list: [
      {
        pagePath: '/pages/home/home',
        text: '首页',
        iconPath: '/assets/tab/home.svg',
        selectedIconPath: '/assets/tab/home-active.svg',
      },
      {
        pagePath: '/pages/category/category',
        text: '分类',
        iconPath: '/assets/tab/category.svg',
        selectedIconPath: '/assets/tab/category-active.svg',
      },
      {
        pagePath: '/pages/mine/mine',
        text: '我的',
        iconPath: '/assets/tab/mine.svg',
        selectedIconPath: '/assets/tab/mine-active.svg',
      },
    ],
  },

  lifetimes: {
    attached() {
      const mode = getTheme();
      this.setData({
        themeClass: mode === 'dark' ? 'theme-dark' : 'theme-light',
      });
    },
  },

  methods: {
    onSwitchTab(e: WechatMiniprogram.TouchEvent) {
      const raw = e.currentTarget.dataset.index;
      const index = typeof raw === 'number' ? raw : Number(raw);
      if (!Number.isFinite(index)) return;
      const item = this.data.list[index];
      if (!item) return;
      wx.switchTab({ url: item.pagePath });
    },
  },
});
