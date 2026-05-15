import { applyThemeForToolPage } from '../../utils/nav-theme';
import type { TargetType } from '../lib/learn-keys';
import {
  deleteUserExample,
  newExampleId,
  readUserExamples,
  upsertUserExample,
  type UserExampleStored,
} from '../lib/learn-user-examples';
import { invalidateWordbookCache } from '../lib/word-store';

Page({
  data: {
    themeClass: 'theme-light',
    mode: 'add' as 'add' | 'edit',
    targetType: 'builtin' as TargetType,
    targetId: '',
    exId: '',
    textEn: '',
    textZh: '',
    note: '',
  },

  onShow() {
    this.setData(applyThemeForToolPage());
  },

  onLoad(query: Record<string, string | undefined>) {
    this.setData(applyThemeForToolPage());
    let targetType = (query.targetType || 'builtin') as TargetType;
    let targetId = query.targetId || '';
    let exId = query.exId || '';
    try {
      targetId = decodeURIComponent(targetId);
    } catch {
      /* keep */
    }
    try {
      exId = decodeURIComponent(exId);
    } catch {
      /* keep */
    }
    if (targetType !== 'builtin' && targetType !== 'user') targetType = 'builtin';
    if (!targetId) {
      wx.showToast({ title: '参数错误', icon: 'none' });
      setTimeout(() => wx.navigateBack(), 400);
      return;
    }

    this.setData({ targetType, targetId });

    if (exId) {
      const list = readUserExamples(targetType, targetId);
      const found = list.find((x) => x.id === exId);
      if (!found) {
        wx.showToast({ title: '例句不存在', icon: 'none' });
        setTimeout(() => wx.navigateBack(), 400);
        return;
      }
      this.setData({
        mode: 'edit',
        exId,
        textEn: found.textEn,
        textZh: found.textZh || '',
        note: found.note || '',
      });
      wx.setNavigationBarTitle({ title: '编辑例句' });
    } else {
      this.setData({ mode: 'add' });
      wx.setNavigationBarTitle({ title: '添加例句' });
    }
  },

  onEn(e: WechatMiniprogram.Input) {
    this.setData({ textEn: e.detail.value || '' });
  },

  onZh(e: WechatMiniprogram.Input) {
    this.setData({ textZh: e.detail.value || '' });
  },

  onNote(e: WechatMiniprogram.Input) {
    this.setData({ note: e.detail.value || '' });
  },

  onSave() {
    const textEn = (this.data.textEn || '').trim();
    if (!textEn) {
      wx.showToast({ title: '请填写英文例句', icon: 'none' });
      return;
    }
    const { targetType, targetId, mode, exId } = this.data;
    const textZh = (this.data.textZh || '').trim();
    const note = (this.data.note || '').trim();

    if (mode === 'edit') {
      const list = readUserExamples(targetType, targetId);
      const prev = list.find((x) => x.id === exId);
      if (!prev) {
        wx.showToast({ title: '记录不存在', icon: 'none' });
        return;
      }
      const row: UserExampleStored = {
        ...prev,
        textEn,
        textZh: textZh || undefined,
        note: note || undefined,
      };
      upsertUserExample(targetType, targetId, row);
    } else {
      const row: UserExampleStored = {
        id: newExampleId(),
        textEn,
        textZh: textZh || undefined,
        note: note || undefined,
        createdAt: Date.now(),
        pinned: false,
      };
      upsertUserExample(targetType, targetId, row);
    }
    invalidateWordbookCache();
    wx.showToast({ title: '已保存', icon: 'success' });
    setTimeout(() => wx.navigateBack(), 400);
  },
});
