// Small persisted camera preferences: the camera that was loaded last.
const CURRENT_PACK_KEY = 'camera.pack.v1';

export function loadCurrentPack(): string {
  try {
    const value: unknown = wx.getStorageSync(CURRENT_PACK_KEY);
    return typeof value === 'string' ? value : '';
  } catch {
    return '';
  }
}

export function saveCurrentPack(id: string): void {
  try {
    wx.setStorageSync(CURRENT_PACK_KEY, id);
  } catch {
    // Storage full: the camera still works, it just won't be remembered.
  }
}
