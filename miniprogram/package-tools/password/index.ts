import { buildToolShareMessage } from '../../utils/tool-share';
import { applyNavigationBarTheme } from '../../utils/nav-theme';
import { getTheme } from '../../utils/storage';
import { copyWithClipboardHint } from '../../utils/scope-hint';

Page({
  data: {
    themeClass: 'theme-light',
    length: 16,
    useUpper: true,
    useLower: true,
    useNumber: true,
    useSymbol: false,
    result: '',
  },

  onShow() {
    const mode = getTheme();
    applyNavigationBarTheme(mode);
    this.setData({
      themeClass: mode === 'dark' ? 'theme-dark' : 'theme-light',
    });
  },

  onLength(e: WechatMiniprogram.Input) {
    const n = parseInt(e.detail.value, 10);
    const length = Number.isFinite(n) ? Math.min(Math.max(n, 8), 32) : 16;
    this.setData({ length });
  },

  onToggle(e: WechatMiniprogram.TouchEvent) {
    const key = e.currentTarget.dataset.key;
    if (key === 'useUpper') this.setData({ useUpper: !this.data.useUpper });
    else if (key === 'useLower') this.setData({ useLower: !this.data.useLower });
    else if (key === 'useNumber') this.setData({ useNumber: !this.data.useNumber });
    else if (key === 'useSymbol') this.setData({ useSymbol: !this.data.useSymbol });
  },

  onGenerate() {
    const pwd = generate({
      length: this.data.length,
      useUpper: this.data.useUpper,
      useLower: this.data.useLower,
      useNumber: this.data.useNumber,
      useSymbol: this.data.useSymbol,
    });
    if (!pwd) {
      wx.showToast({ title: '请至少选一类字符', icon: 'none' });
      return;
    }
    this.setData({ result: pwd });
  },

  onCopy() {
    if (!this.data.result) {
      wx.showToast({ title: '请先生成', icon: 'none' });
      return;
    }
    copyWithClipboardHint({
      data: this.data.result,
      purpose: '将生成的密码复制到剪贴板。',
      success: () =>
        wx.showModal({
          title: '已复制',
          content: '密码请妥善保管，勿截图分享到公开渠道。',
          showCancel: false,
        }),
    });
  },
});

const UPPER = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
const LOWER = 'abcdefghijkmnopqrstuvwxyz';
const NUM = '23456789';
const SYM = '!@#$%^&*-_+=';

function generate(opts: {
  length: number;
  useUpper: boolean;
  useLower: boolean;
  useNumber: boolean;
  useSymbol: boolean;
}) {
  let pool = '';
  const ensured: string[] = [];
  if (opts.useUpper) {
    pool += UPPER;
    ensured.push(pick(UPPER));
  }
  if (opts.useLower) {
    pool += LOWER;
    ensured.push(pick(LOWER));
  }
  if (opts.useNumber) {
    pool += NUM;
    ensured.push(pick(NUM));
  }
  if (opts.useSymbol) {
    pool += SYM;
    ensured.push(pick(SYM));
  }
  if (!pool) return '';

  const len = Math.min(Math.max(opts.length, 8), 32);
  let out = ensured.join('');
  while (out.length < len) {
    out += pick(pool);
  }
  return shuffle(out).slice(0, len);
}

function pick(str: string) {
  const i = Math.floor(Math.random() * str.length);
  return str[i]!;
}

function shuffle(s: string) {
  const arr = s.split('');
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j]!, arr[i]!];
  }
  return arr.join('');
}
