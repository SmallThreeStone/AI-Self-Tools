import type { ToolDef } from '../config/tools';

/** 权限说明（与注册表 requiredScopes 对齐，供详情展示） */
export function formatPermissionHint(tool: ToolDef): string {
  const scopes = tool.requiredScopes;
  if (!scopes?.length) {
    return '按当前设计无需相册、剪贴板等敏感能力；实际仍以使用时系统提示为准。';
  }
  const map: Record<string, string> = {
    clipboard: '剪贴板（复制内容）',
    album: '相册（选择或保存图片）',
    camera: '相机（拍照）',
  };
  return `可能涉及：${scopes.map((s) => map[s] ?? s).join('、')}。`;
}

export function formatLastUsedLabel(ts: number | undefined): string {
  if (ts == null || !Number.isFinite(ts)) return '';
  const d = Date.now() - ts;
  if (d < 60_000) return '刚刚';
  if (d < 3_600_000) return `${Math.floor(d / 60_000)} 分钟前`;
  if (d < 86_400_000) return `${Math.floor(d / 3_600_000)} 小时前`;
  const days = Math.floor(d / 86_400_000);
  if (days < 14) return `${days} 天前`;
  const dt = new Date(ts);
  const mm = `${dt.getMonth() + 1}`.padStart(2, '0');
  const dd = `${dt.getDate()}`.padStart(2, '0');
  const hh = `${dt.getHours()}`.padStart(2, '0');
  const mi = `${dt.getMinutes()}`.padStart(2, '0');
  return `${dt.getFullYear()}-${mm}-${dd} ${hh}:${mi}`;
}
