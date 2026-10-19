// "存到手机": writes a shot to the system album (CLAUDE.md §9-1). saveImageToPhotosAlbum asks for
// scope.writePhotosAlbum on first use; once denied it never asks again, so we guide to wx.openSetting.

export type AlbumResult = 'saved' | 'denied' | 'failed';

function openSettingForAlbum(): Promise<boolean> {
  return new Promise((resolve) => {
    wx.showModal({
      title: '需要相册权限',
      content: '在设置里打开「保存到相册」，就能把照片存到手机。',
      confirmText: '去设置',
      cancelText: '暂不',
      success: ({ confirm }) => {
        if (!confirm) {
          resolve(false);
          return;
        }
        wx.openSetting({
          success: ({ authSetting }) => resolve(authSetting['scope.writePhotosAlbum'] === true),
          fail: () => resolve(false),
        });
      },
      fail: () => resolve(false),
    });
  });
}

function writeToAlbum(filePath: string): Promise<AlbumResult> {
  return new Promise((resolve) => {
    wx.saveImageToPhotosAlbum({
      filePath,
      success: () => resolve('saved'),
      fail: ({ errMsg }) => resolve(/auth|deny|denied|authorize/i.test(errMsg) ? 'denied' : 'failed'),
    });
  });
}

export async function saveToAlbum(filePath: string): Promise<AlbumResult> {
  const setting = await new Promise<WechatMiniprogram.AuthSetting>((resolve) => {
    wx.getSetting({ success: ({ authSetting }) => resolve(authSetting), fail: () => resolve({}) });
  });
  if (setting['scope.writePhotosAlbum'] === false && !(await openSettingForAlbum())) return 'denied';

  const result = await writeToAlbum(filePath);
  if (result === 'denied' && (await openSettingForAlbum())) return writeToAlbum(filePath);
  return result;
}
