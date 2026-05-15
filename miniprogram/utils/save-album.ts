/** 将临时文件保存到系统相册（处理相册授权），返回 Promise 便于串行保存多张 */
export function saveTempImageToAlbum(
  filePath: string,
  opts?: { silent?: boolean }
): Promise<void> {
  return new Promise((resolve, reject) => {
    wx.getSetting({
      success: (s) => {
        const save = () =>
          wx.saveImageToPhotosAlbum({
            filePath,
            success: () => {
              if (!opts?.silent) {
                wx.showToast({ title: '已保存', icon: 'success' });
              }
              resolve();
            },
            fail: () => {
              wx.showToast({ title: '保存失败', icon: 'none' });
              reject(new Error('save'));
            },
          });
        if (s.authSetting['scope.writePhotosAlbum']) {
          save();
          return;
        }
        wx.authorize({
          scope: 'scope.writePhotosAlbum',
          success: save,
          fail: () => {
            wx.showModal({
              title: '需要相册权限',
              content: '请在设置中允许保存到相册',
              showCancel: false,
            });
            reject(new Error('auth'));
          },
        });
      },
      fail: reject,
    });
  });
}
