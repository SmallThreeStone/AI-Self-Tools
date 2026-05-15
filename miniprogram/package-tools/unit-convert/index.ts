import { buildToolShareMessage } from '../../utils/tool-share';
import { applyNavigationBarTheme } from '../../utils/nav-theme';
import { getTheme } from '../../utils/storage';

type Kind = 'length' | 'weight';

Page({
  data: {
    themeClass: 'theme-light',
    kind: 'length' as Kind,
    tabs: [
      { id: 'length', name: '长度' },
      { id: 'weight', name: '重量' },
    ],
    input: '',
    lines: [] as string[],
  },

  onShow() {
    const mode = getTheme();
    applyNavigationBarTheme(mode);
    this.setData({
      themeClass: mode === 'dark' ? 'theme-dark' : 'theme-light',
    });
    this.compute(this.data.input);
  },

  onTab(e: WechatMiniprogram.TouchEvent) {
    const kind = e.currentTarget.dataset.kind as Kind;
    if (!kind || kind === this.data.kind) return;
    this.setData({ kind }, () => this.compute(this.data.input));
  },

  onInput(e: WechatMiniprogram.Input) {
    const v = e.detail.value;
    this.setData({ input: v }, () => this.compute(v));
  },

  compute(raw: string) {
    const n = parseFloat(raw);
    const lines: string[] = [];
    if (!Number.isFinite(n)) {
      this.setData({ lines: ['请输入数字'] });
      return;
    }
    if (this.data.kind === 'length') {
      lines.push(`米：${n.toFixed(4)} m`);
      lines.push(`厘米：${(n * 100).toFixed(2)} cm`);
      lines.push(`毫米：${(n * 1000).toFixed(1)} mm`);
      lines.push(`千米：${(n / 1000).toFixed(6)} km`);
    } else {
      lines.push(`千克：${n.toFixed(4)} kg`);
      lines.push(`克：${(n * 1000).toFixed(2)} g`);
      lines.push(`磅：${(n * 2.20462).toFixed(4)} lb`);
    }
    this.setData({ lines });
  },
  onShareAppMessage() {
    return buildToolShareMessage('unit-convert', '单位换算');
  },
});
