import { buildToolShareMessage } from '../../utils/tool-share';
import { applyThemeForToolPage } from '../../utils/nav-theme';

const STORAGE_KEY = 'tool_memo_notes_v1';

export type MemoItem = {
  id: string;
  title: string;
  body: string;
  ts: number;
};

function loadNotes(): MemoItem[] {
  try {
    const raw = wx.getStorageSync(STORAGE_KEY) as unknown;
    if (!Array.isArray(raw)) return [];
    return raw.filter(
      (x): x is MemoItem =>
        x &&
        typeof x === 'object' &&
        typeof (x as MemoItem).id === 'string' &&
        typeof (x as MemoItem).body === 'string'
    );
  } catch {
    return [];
  }
}

function saveNotes(list: MemoItem[]): void {
  wx.setStorageSync(STORAGE_KEY, list);
}

function formatMemoDate(ts: number): string {
  const d = new Date(ts);
  const mm = `${d.getMonth() + 1}`.padStart(2, '0');
  const dd = `${d.getDate()}`.padStart(2, '0');
  const hh = `${d.getHours()}`.padStart(2, '0');
  const mi = `${d.getMinutes()}`.padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd} ${hh}:${mi}`;
}

Page({
  data: {
    themeClass: 'theme-light',
    list: [] as (MemoItem & { tsLabel: string })[],
    editing: false,
    editId: '',
    title: '',
    body: '',
  },

  onShow() {
    this.setData(applyThemeForToolPage());
    this.refreshList();
  },

  refreshList() {
    const list = loadNotes()
      .sort((a, b) => b.ts - a.ts)
      .map((x) => ({ ...x, tsLabel: formatMemoDate(x.ts) }));
    this.setData({ list });
  },

  onAdd() {
    this.setData({
      editing: true,
      editId: '',
      title: '',
      body: '',
    });
  },

  onOpenItem(e: WechatMiniprogram.TouchEvent) {
    const id = e.currentTarget.dataset.id as string;
    const item = loadNotes().find((x) => x.id === id);
    if (!item) return;
    this.setData({
      editing: true,
      editId: item.id,
      title: item.title,
      body: item.body,
    });
  },

  onTitle(e: WechatMiniprogram.Input) {
    this.setData({ title: e.detail.value || '' });
  },

  onBody(e: WechatMiniprogram.Input) {
    this.setData({ body: e.detail.value || '' });
  },

  onSave() {
    const body = this.data.body.trim();
    const title = this.data.title.trim() || (body ? body.slice(0, 24) : '无标题');
    if (!body && !this.data.editId) {
      wx.showToast({ title: '内容为空', icon: 'none' });
      return;
    }
    let list = loadNotes();
    const ts = Date.now();
    if (this.data.editId) {
      list = list.map((x) =>
        x.id === this.data.editId ? { ...x, title, body, ts } : x
      );
    } else if (body) {
      list.unshift({
        id: `n_${ts}`,
        title,
        body,
        ts,
      });
    }
    saveNotes(list);
    wx.showToast({ title: '已保存', icon: 'success' });
    this.setData({ editing: false, editId: '', title: '', body: '' });
    this.refreshList();
  },

  onDelete() {
    if (!this.data.editId) {
      this.setData({ editing: false });
      return;
    }
    wx.showModal({
      title: '删除这条备忘？',
      success: (res) => {
        if (!res.confirm) return;
        const list = loadNotes().filter((x) => x.id !== this.data.editId);
        saveNotes(list);
        wx.showToast({ title: '已删除', icon: 'none' });
        this.setData({ editing: false, editId: '', title: '', body: '' });
        this.refreshList();
      },
    });
  },

  onBackList() {
    this.setData({ editing: false, editId: '', title: '', body: '' });
  },
  onShareAppMessage() {
    return buildToolShareMessage('memo', '简易备忘录');
  },
});
