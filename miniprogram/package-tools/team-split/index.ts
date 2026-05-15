import { buildToolShareMessage } from '../../utils/tool-share';
import { applyThemeForToolPage } from '../../utils/nav-theme';
import { copyWithClipboardHint } from '../../utils/scope-hint';

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

Page({
  data: {
    themeClass: 'theme-light',
    raw: '',
    groupOptions: ['2', '3', '4', '5', '6', '7', '8'],
    groupIdx: 1,
    groups: 3,
    /** 展示用：每组一行标签 */
    resultLines: [] as string[],
    flatPreview: '',
  },

  onShow() {
    this.setData(applyThemeForToolPage());
  },

  onNames(e: WechatMiniprogram.Input) {
    this.setData({ raw: e.detail.value || '' });
  },

  onGroupPick(e: WechatMiniprogram.PickerChange) {
    const idx = Number(e.detail.value);
    const n = Number(this.data.groupOptions[idx] ?? '3');
    this.setData({ groupIdx: idx, groups: n });
  },

  onSplit() {
    const lines = this.data.raw
      .split(/\r\n|\r|\n/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (lines.length < 2) {
      wx.showToast({ title: '至少两行名单', icon: 'none' });
      return;
    }
    const g = Math.min(8, Math.max(2, this.data.groups));
    const shuffled = shuffle(lines);
    const buckets: string[][] = Array.from({ length: g }, () => []);
    shuffled.forEach((name, i) => {
      buckets[i % g].push(name);
    });
    const resultLines = buckets.map((bucket, idx) => `第 ${idx + 1} 组：${bucket.join('、')}`);
    const flatPreview = resultLines.join('\n');
    this.setData({ resultLines, flatPreview });
  },

  onCopy() {
    if (!this.data.flatPreview) {
      wx.showToast({ title: '请先分组', icon: 'none' });
      return;
    }
    copyWithClipboardHint({
      data: this.data.flatPreview,
      purpose: '将随机分组结果复制到剪贴板，便于粘贴到群聊。',
    });
  },
  onShareAppMessage() {
    return buildToolShareMessage('team-split', '随机分组');
  },
});
