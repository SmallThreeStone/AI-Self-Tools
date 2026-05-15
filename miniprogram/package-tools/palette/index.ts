import { buildToolShareMessage } from '../../utils/tool-share';
import { applyThemeForToolPage } from '../../utils/nav-theme';
import { copyWithClipboardHint } from '../../utils/scope-hint';

const FAV_KEY = 'tool_palette_favorites_v1';

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  const ss = s / 100;
  const ll = l / 100;
  const c = (1 - Math.abs(2 * ll - 1)) * ss;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = ll - c / 2;
  let r = 0;
  let g = 0;
  let b = 0;
  if (h < 60) {
    r = c;
    g = x;
  } else if (h < 120) {
    r = x;
    g = c;
  } else if (h < 180) {
    g = c;
    b = x;
  } else if (h < 240) {
    g = x;
    b = c;
  } else if (h < 300) {
    r = x;
    b = c;
  } else {
    r = c;
    b = x;
  }
  return [
    Math.round((r + m) * 255),
    Math.round((g + m) * 255),
    Math.round((b + m) * 255),
  ];
}

function rgbToHex(r: number, g: number, b: number): string {
  const h = (n: number) => n.toString(16).padStart(2, '0');
  return `#${h(r)}${h(g)}${h(b)}`.toUpperCase();
}

Page({
  data: {
    themeClass: 'theme-light',
    h: 210,
    s: 70,
    l: 50,
    hex: '#1677FF',
    favorites: [] as string[],
  },

  onShow() {
    this.setData(applyThemeForToolPage());
    let favorites: string[] = [];
    try {
      const raw = wx.getStorageSync(FAV_KEY) as string[];
      favorites = Array.isArray(raw) ? raw.slice(0, 24) : [];
    } catch {
      favorites = [];
    }
    this.setData({ favorites });
    this.syncHex(this.data.h, this.data.s, this.data.l);
  },

  onH(e: WechatMiniprogram.SliderChange) {
    const h = Number(e.detail.value);
    this.setData({ h });
    this.syncHex(h, this.data.s, this.data.l);
  },

  onS(e: WechatMiniprogram.SliderChange) {
    const s = Number(e.detail.value);
    this.setData({ s });
    this.syncHex(this.data.h, s, this.data.l);
  },

  onL(e: WechatMiniprogram.SliderChange) {
    const l = Number(e.detail.value);
    this.setData({ l });
    this.syncHex(this.data.h, this.data.s, l);
  },

  syncHex(h: number, s: number, l: number) {
    const [r, g, b] = hslToRgb(h, s, l);
    const hex = rgbToHex(r, g, b);
    this.setData({ hex });
  },

  onCopy() {
    const hex = this.data.hex;
    copyWithClipboardHint({
      data: hex,
      purpose: '将当前色值的十六进制代码复制到剪贴板。',
      success: () => wx.showToast({ title: '已复制', icon: 'success' }),
    });
  },

  onSaveFav() {
    const hex = this.data.hex;
    const favorites = [hex, ...this.data.favorites.filter((x) => x !== hex)].slice(0, 24);
    try {
      wx.setStorageSync(FAV_KEY, favorites);
    } catch {
      /* ignore */
    }
    this.setData({ favorites });
    wx.showToast({ title: '已收藏', icon: 'success' });
  },

  onPickFav(e: WechatMiniprogram.TouchEvent) {
    const hex = e.currentTarget.dataset.hex as string;
    if (!hex || !/^#[0-9A-Fa-f]{6}$/.test(hex)) return;
    const rgb = parseHex(hex);
    if (!rgb) return;
    const hsl = rgbToHsl(rgb[0], rgb[1], rgb[2]);
    this.setData({
      h: hsl.h,
      s: hsl.s,
      l: hsl.l,
      hex: hex.toUpperCase(),
    });
  },

  onRemoveFav(e: WechatMiniprogram.TouchEvent) {
    const hex = e.currentTarget.dataset.hex as string;
    const favorites = this.data.favorites.filter((x) => x !== hex);
    try {
      wx.setStorageSync(FAV_KEY, favorites);
    } catch {
      /* ignore */
    }
    this.setData({ favorites });
  },
});

function parseHex(hex: string): [number, number, number] | null {
  const m = /^#?([0-9a-fA-F]{6})$/.exec(hex.trim());
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** 0–360, 0–100, 0–100 */
function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  let h = 0;
  const l = (max + min) / 2;
  let s = 0;
  if (d > 0) {
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      default:
        h = ((r - g) / d + 4) / 6;
    }
  }
  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}
