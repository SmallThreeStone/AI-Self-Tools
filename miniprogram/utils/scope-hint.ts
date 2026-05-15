/** 首次使用敏感能力前的说明（与隐私预期对齐），同意后写入本地标记 */

const KEY_CLIPBOARD_ACK = 'toolbox_scope_clipboard_ack_v1';
const KEY_ALBUM_PICK_ACK = 'toolbox_scope_album_pick_ack_v1';

export function copyWithClipboardHint(opts: {
  data: string;
  purpose: string;
  success?: () => void;
}): void {
  const paste = () => {
    wx.setClipboardData({
      data: opts.data,
      success: () => {
        if (opts.success) opts.success();
        else wx.showToast({ title: '已复制', icon: 'none' });
      },
    });
  };

  let ack = false;
  try {
    ack = !!wx.getStorageSync(KEY_CLIPBOARD_ACK);
  } catch {
    ack = false;
  }
  if (ack) {
    paste();
    return;
  }

  wx.showModal({
    title: '剪贴板说明',
    content: `${opts.purpose}\n\n仅在您确认后将内容写入系统剪贴板，便于粘贴到其他应用；不会上传到服务器。`,
    confirmText: '允许复制',
    cancelText: '取消',
    success: (res) => {
      if (!res.confirm) return;
      try {
        wx.setStorageSync(KEY_CLIPBOARD_ACK, 1);
      } catch {
        /* ignore */
      }
      paste();
    },
  });
}

/** 首次从相册选图前的说明（chooseMedia 等入口统一调用） */
export function runAfterAlbumPickHintExplained(run: () => void): void {
  let ack = false;
  try {
    ack = !!wx.getStorageSync(KEY_ALBUM_PICK_ACK);
  } catch {
    ack = false;
  }
  if (ack) {
    run();
    return;
  }

  wx.showModal({
    title: '相册与相机说明',
    content:
      '接下来将请求访问相册或相机，仅用于您选择的图片在本地处理；不会上传除非您主动保存或分享。',
    confirmText: '继续',
    cancelText: '取消',
    success: (res) => {
      if (!res.confirm) return;
      try {
        wx.setStorageSync(KEY_ALBUM_PICK_ACK, 1);
      } catch {
        /* ignore */
      }
      run();
    },
  });
}
