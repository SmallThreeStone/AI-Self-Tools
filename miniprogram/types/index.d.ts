interface IAppOption {
  globalData: {
    theme: import('../utils/storage').ThemeMode;
    /** 首页分类 chip 跳转分类 Tab 时使用（switchTab 无法可靠带 query） */
    pendingCategoryId?: string;
  };
}
