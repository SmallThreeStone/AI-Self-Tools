Component({
  properties: {
    /** 页面主题类名，与全局 theme-light / theme-dark 一致 */
    themeClass: {
      type: String,
      value: 'theme-light',
    },
    /** 附加一行说明（如直尺「非计量器具」） */
    extra: {
      type: String,
      value: '',
    },
  },

  data: {
    dismissed: false,
  },

  methods: {
    onDismiss() {
      this.setData({ dismissed: true });
    },
  },
});
