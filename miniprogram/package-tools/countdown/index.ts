import { buildToolShareMessage } from '../../utils/tool-share';
import { applyThemeForToolPage } from '../../utils/nav-theme';

const KEY = 'tool_countdown_events_v1';

type Ev = { id: string; title: string; date: string };

function load(): Ev[] {
  try {
    const raw = wx.getStorageSync(KEY) as Ev[];
    return Array.isArray(raw) ? raw : [];
  } catch {
    return [];
  }
}

function save(list: Ev[]) {
  try {
    wx.setStorageSync(KEY, list);
  } catch {
    /* ignore */
  }
}

function daysFromToday(iso: string): number {
  const p = iso.split('-').map(Number);
  if (p.length !== 3 || !p[0] || !p[1] || !p[2]) return NaN;
  const t = new Date(p[0], p[1] - 1, p[2]).setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((t - today.getTime()) / 86400000);
}

Page({
  data: {
    themeClass: 'theme-light',
    rows: [] as Array<Ev & { label: string }>,
    titleIn: '',
    dateIn: '',
  },

  onShow() {
    this.setData(applyThemeForToolPage());
    this.reload();
  },

  reload() {
    const raw = load();
    const rows = raw.map((e) => ({
      ...e,
      label: formatLabel(e.date),
    }));
    rows.sort((a, b) => Math.abs(daysFromToday(a.date)) - Math.abs(daysFromToday(b.date)));
    this.setData({ rows });
  },

  onTitle(e: WechatMiniprogram.Input) {
    this.setData({ titleIn: e.detail.value });
  },

  onDate(e: WechatMiniprogram.Input) {
    this.setData({ dateIn: e.detail.value });
  },

  onAdd() {
    const title = this.data.titleIn.trim();
    const date = this.data.dateIn.trim();
    if (!title || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      wx.showToast({ title: '请填写标题与日期 YYYY-MM-DD', icon: 'none' });
      return;
    }
    const list = load();
    list.unshift({ id: `${Date.now()}`, title, date });
    save(list);
    this.setData({ titleIn: '', dateIn: '' });
    this.reload();
  },

  onDel(e: WechatMiniprogram.TouchEvent) {
    const id = e.currentTarget.dataset.id as string;
    if (!id) return;
    const list = load().filter((x) => x.id !== id);
    save(list);
    this.reload();
  },
});

function formatLabel(iso: string): string {
  const d = daysFromToday(iso);
  if (Number.isNaN(d)) return '日期无效';
  if (d === 0) return '就是今天';
  if (d > 0) return `还有 ${d} 天`;
  return `已过 ${-d} 天`;
}
