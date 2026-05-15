/** 工具页转发分享（首页承接 toolId） */
export function buildToolShareMessage(
  toolId: string,
  displayName: string
): WechatMiniprogram.Page.ICustomShareContent {
  return {
    title: `工具箱 · ${displayName}`,
    path: `/pages/home/home?toolId=${encodeURIComponent(toolId)}`,
  };
}

/** Tab / 通用页默认分享 */
export function buildDefaultShareMessage(): WechatMiniprogram.Page.ICustomShareContent {
  return {
    title: '自用工具箱',
    path: '/pages/home/home',
  };
}
