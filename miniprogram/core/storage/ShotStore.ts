// In-app album records (CLAUDE.md §2): finished JPEGs are moved into USER_DATA_PATH/shots and indexed
// in storage (metadata only, never pixels). The system album is only written when the user asks.
// Quota handling against the 200MB local-file budget arrives with the gallery in M5.

export interface ShotRecord {
  id: string;
  path: string;
  packId: string;
  createdAt: number;
  width: number;
  height: number;
  /** Seed of the per-shot random variables, so the shot can be re-rendered. */
  seed: number;
}

const STORAGE_KEY = 'shots.v1';

function shotsDir(): string {
  return `${wx.env.USER_DATA_PATH}/shots`;
}

function ensureDir(fs: WechatMiniprogram.FileSystemManager, dir: string): void {
  try {
    fs.accessSync(dir);
  } catch {
    fs.mkdirSync(dir, true);
  }
}

export function listShots(): ShotRecord[] {
  try {
    const value: unknown = wx.getStorageSync(STORAGE_KEY);
    return Array.isArray(value) ? (value as ShotRecord[]) : [];
  } catch {
    return [];
  }
}

export function saveShot(tempFilePath: string, meta: Omit<ShotRecord, 'id' | 'path' | 'createdAt'>): Promise<ShotRecord> {
  const fs = wx.getFileSystemManager();
  ensureDir(fs, shotsDir());
  const createdAt = Date.now();
  const id = `${createdAt.toString(36)}-${meta.seed.toString(36)}`;
  const filePath = `${shotsDir()}/${id}.jpg`;
  return new Promise((resolve, reject) => {
    fs.saveFile({
      tempFilePath,
      filePath,
      success: () => {
        const record: ShotRecord = { id, path: filePath, createdAt, ...meta };
        wx.setStorageSync(STORAGE_KEY, [record, ...listShots()]);
        resolve(record);
      },
      fail: (error) => reject(new Error(error.errMsg)),
    });
  });
}
