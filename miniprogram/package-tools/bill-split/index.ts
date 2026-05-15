import { buildToolShareMessage } from '../../utils/tool-share';
import { applyNavigationBarTheme } from '../../utils/nav-theme';
import { getTheme } from '../../utils/storage';
import { copyWithClipboardHint } from '../../utils/scope-hint';

Page({
  data: {
    themeClass: 'theme-light',
    total: '',
    people: '',
    perPerson: '--',
    summary: '',
  },

  onShow() {
    const mode = getTheme();
    applyNavigationBarTheme(mode);
    this.setData({
      themeClass: mode === 'dark' ? 'theme-dark' : 'theme-light',
    });
  },

  onTotal(e: WechatMiniprogram.Input) {
    this.setData({ total: e.detail.value }, () => this.calc());
  },

  onPeople(e: WechatMiniprogram.Input) {
    this.setData({ people: e.detail.value }, () => this.calc());
  },

  calc() {
    const total = parseFloat(this.data.total);
    const people = parseInt(this.data.people, 10);
    if (!Number.isFinite(total) || total <= 0 || !Number.isFinite(people) || people < 1) {
      this.setData({ perPerson: '--', summary: '' });
      return;
    }
    const each = total / people;
    const perPerson = each.toFixed(2);
    const summary = `总金额：¥${total.toFixed(2)}\n人数：${people}\n每人应付：¥${perPerson}`;
    this.setData({ perPerson, summary });
  },

  onCopy() {
    if (!this.data.summary) {
      wx.showToast({ title: '请先填写金额与人数', icon: 'none' });
      return;
    }
    copyWithClipboardHint({
      data: this.data.summary,
      purpose: '将分账结算文案复制到剪贴板，便于粘贴到聊天或备忘录。',
    });
  },
  onShareAppMessage() {
    return buildToolShareMessage('bill-split', '聚会分账');
  },
});
