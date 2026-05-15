/**
 * 允许纳入「完整备份」的本地存储键（白名单）。
 * 勿将临时缓存、权限确认标记等列入，避免备份臃肿或误导用户。
 */
export const EXPORTABLE_TOOL_STORAGE_KEYS: readonly {
  key: string;
  /** 简短说明，供「我的」页对用户展示 */
  label: string;
}[] = [
  { key: 'tool_memo_notes_v1', label: '简易备忘录' },
  { key: 'tool_palette_favorites_v1', label: '调色板收藏色' },
  { key: 'tool_ruler_mm_per_px_v1', label: '直尺校准系数' },
  { key: 'tool_wooden_fish_merit_v1', label: '电子木鱼计数' },
  { key: 'tool_snake_highscore_v1', label: '贪吃蛇最高分（单机本地）' },
  { key: 'tool_countdown_events_v1', label: '倒数日事件列表' },
  { key: 'tool_scoreboard_v1', label: '记分牌队名与分数' },
  { key: 'tool_decision_options_v1', label: '决策转盘选项' },
  { key: 'tool_cargo_quote_v1', label: '装柜报价（产品库与柜型参数）' },
  { key: 'learn_user_words_v1', label: '单词本·我的词条（本地）' },
  { key: 'learn_favorites_v1', label: '单词本·我的收藏（本地）' },
  { key: 'learn_word_extra_v1', label: '单词本·自定义例句（本地）' },
  { key: 'learn_tts_quota_v1', label: '单词本·朗读日计数（本地）' },
  { key: 'learn_tts_config_v1', label: '单词本·朗读上限配置（本地 JSON）' },
  { key: 'learn_tts_paths_v1', label: '单词本·例句 TTS 缓存路径索引（本地）' },
] as const;

/** 核心配置键（不含工具），用于说明文案 */
export const EXPORTABLE_CORE_FIELDS: readonly { key: string; label: string }[] = [
  { key: 'toolbox_favorites', label: '收藏的工具 id 列表' },
  { key: 'toolbox_pinned_v1', label: '首页固定（最多 3 个）' },
  { key: 'toolbox_recent', label: '最近使用记录（含时间戳）' },
  { key: 'toolbox_usage', label: '各工具打开次数统计' },
  { key: 'toolbox_search_history', label: '搜索历史关键词' },
  { key: 'toolbox_theme_pref_v2', label: '主题偏好（跟随系统 / 浅色 / 深色）' },
];
