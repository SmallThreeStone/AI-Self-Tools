import { findToolById } from '../config/tools';
import {
  bumpUsage,
  recordRecent,
} from './storage';

/** 构建实际跳转路径（占位页追加 id） */
export function resolveToolPath(toolId: string): string | null {
  const t = findToolById(toolId);
  if (!t) return null;
  if (t.path === '/pages/stub/stub') {
    return `/pages/stub/stub?id=${encodeURIComponent(toolId)}`;
  }
  return t.path.startsWith('/') ? t.path : `/${t.path}`;
}

function subpackageNameForUrl(url: string): 'tools' | 'canvas' | 'game' | 'beijing' | 'learn' | 'fitness' | null {
  if (url.includes('/package-tools/')) return 'tools';
  if (url.includes('/package-canvas/')) return 'canvas';
  if (url.includes('/package-game/')) return 'game';
  if (url.includes('/package-beijing/')) return 'beijing';
  if (url.includes('/package-learn/')) return 'learn';
  if (url.includes('/package-fitness/')) return 'fitness';
  return null;
}

function loadToolSubpackage(
  name: 'tools' | 'canvas' | 'game' | 'beijing' | 'learn' | 'fitness',
  success: () => void,
  fail: (err: WechatMiniprogram.GeneralCallbackResult) => void
): void {
  const wxLoad = wx as WechatMiniprogram.Wx & {
    loadSubpackage?(opts: {
      name: string;
      success?: () => void;
      fail?: (err: WechatMiniprogram.GeneralCallbackResult) => void;
    }): void;
  };
  if (typeof wxLoad.loadSubpackage !== 'function') {
    success();
    return;
  }
  wxLoad.loadSubpackage({ name, success, fail });
}

function navigateToUrl(url: string): void {
  wx.navigateTo({
    url,
    fail: (err: WechatMiniprogram.GeneralCallbackResult) => {
      wx.showModal({
        title: '页面打开失败',
        content:
          (err?.errMsg || '').replace(/^navigateTo:fail\s*/i, '') ||
          '网络不稳定或资源未加载完成，请稍后重试。',
        confirmText: '重试',
        cancelText: '取消',
        success: (res) => {
          if (res.confirm) openToolPage(url);
        },
      });
    },
  });
}

/** 打开工具页（含分包预加载与失败重试） */
export function openToolPage(url: string): void {
  const pkg = subpackageNameForUrl(url);
  const go = () => navigateToUrl(url);

  if (!pkg) {
    go();
    return;
  }

  loadToolSubpackage(
    pkg,
    go,
    (err: WechatMiniprogram.GeneralCallbackResult) => {
      wx.showModal({
        title: '加载失败',
        content:
          (err?.errMsg || '').replace(/^loadSubpackage:fail\s*/i, '') ||
          '分包下载失败，请检查网络后重试。',
        confirmText: '重试',
        cancelText: '取消',
        success: (res) => {
          if (res.confirm) openToolPage(url);
        },
      });
    }
  );
}

export function openTool(toolId: string): void {
  const path = resolveToolPath(toolId);
  if (!path) {
    wx.showToast({ title: '未找到工具', icon: 'none' });
    return;
  }
  recordRecent(toolId);
  bumpUsage(toolId);
  openToolPage(path);
}
