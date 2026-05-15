import { applyThemeForToolPage } from '../../utils/nav-theme';
import type { UserWordStored, WordCategory } from '../lib/types';
import { invalidateWordbookCache } from '../lib/word-store';
import {
  HEADWORD_MAX_LEN,
  mergeKey,
  newUserWordId,
  readUserWordsRaw,
  writeUserWordsRaw,
} from '../lib/user-words';

Page({
  data: {
    themeClass: 'theme-light',
    mode: 'add' as 'add' | 'edit',
    editId: '',
    headword: '',
    zh: '',
    category: 'daily' as WordCategory,
    headwordMax: HEADWORD_MAX_LEN,
    hint: '与内置同词头时，保存后以您的释义为准展示。',
  },

  onShow() {
    this.setData(applyThemeForToolPage());
  },

  onLoad(query: Record<string, string | undefined>) {
    this.setData(applyThemeForToolPage());
    let id = query.id || '';
    let cat = (query.cat || 'daily') as WordCategory;
    try {
      id = decodeURIComponent(id);
    } catch {
      /* keep */
    }
    if (cat !== 'daily' && cat !== 'trade') cat = 'daily';

    if (id) {
      const list = readUserWordsRaw();
      const found = list.find((x) => x.id === id);
      if (!found) {
        wx.showToast({ title: '只能编辑我的词条', icon: 'none' });
        setTimeout(() => wx.navigateBack(), 400);
        return;
      }
      this.setData({
        mode: 'edit',
        editId: id,
        headword: found.headword,
        zh: found.zh,
        category: found.category,
      });
      wx.setNavigationBarTitle({ title: '编辑词条' });
    } else {
      this.setData({ mode: 'add', category: cat });
      wx.setNavigationBarTitle({ title: '添加词条' });
    }
  },

  onHeadword(e: WechatMiniprogram.Input) {
    this.setData({ headword: e.detail.value || '' });
  },

  onZh(e: WechatMiniprogram.Input) {
    this.setData({ zh: e.detail.value || '' });
  },

  onCat(e: WechatMiniprogram.TouchEvent) {
    const c = e.currentTarget.dataset.cat as WordCategory | undefined;
    if (c !== 'daily' && c !== 'trade') return;
    this.setData({ category: c });
  },

  onSave() {
    const headword = (this.data.headword || '').trim();
    const zh = (this.data.zh || '').trim();
    if (!headword) {
      wx.showToast({ title: '请填写英文词头', icon: 'none' });
      return;
    }
    if (headword.length > HEADWORD_MAX_LEN) {
      wx.showToast({ title: `词头不超过 ${HEADWORD_MAX_LEN} 字`, icon: 'none' });
      return;
    }
    if (!zh) {
      wx.showToast({ title: '请填写中文释义', icon: 'none' });
      return;
    }

    const { category, mode, editId } = this.data;
    const list = [...readUserWordsRaw()];
    const key = mergeKey(category, headword);

    const dupIdxOther = list.findIndex(
      (x) => mergeKey(x.category, x.headword) === key && x.id !== (mode === 'edit' ? editId : '')
    );
    if (dupIdxOther >= 0) {
      wx.showModal({
        title: '重复词头',
        content: '已存在同分类、同词头的我的词条，是否用本条覆盖？',
        confirmText: '覆盖',
        success: (res) => {
          if (!res.confirm) return;
          list.splice(dupIdxOther, 1);
          this.persist(list, headword, zh, category, mode, editId);
        },
      });
      return;
    }

    this.persist(list, headword, zh, category, mode, editId);
  },

  persist(
    list: UserWordStored[],
    headword: string,
    zh: string,
    category: WordCategory,
    mode: 'add' | 'edit',
    editId: string
  ) {
    if (mode === 'edit') {
      const i = list.findIndex((x) => x.id === editId);
      if (i < 0) {
        wx.showToast({ title: '记录不存在', icon: 'none' });
        return;
      }
      const prev = list[i];
      list[i] = { ...prev, headword, zh, category, examples: prev.examples || [] };
    } else {
      list.push({
        id: newUserWordId(),
        headword,
        zh,
        category,
        examples: [],
      });
    }

    writeUserWordsRaw(list);
    invalidateWordbookCache();
    wx.showToast({ title: '已保存', icon: 'success' });
    setTimeout(() => wx.navigateBack(), 400);
  },
});
