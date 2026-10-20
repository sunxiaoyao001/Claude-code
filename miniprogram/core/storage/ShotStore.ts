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
  /** Roll number and 1-based frame on that roll (core/storage/RollCounter). */
  roll: number;
  frame: number;
  bytes: number;
}

// Records from before sizes were stored count as a typical full-resolution JPEG.
const ESTIMATED_SHOT_BYTES = 2 * 1024 * 1024;

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

/** Bytes the album occupies in USER_DATA_PATH, for the shared 200MB budget. */
export function albumBytes(): number {
  return listShots().reduce((sum, shot) => sum + (shot.bytes || ESTIMATED_SHOT_BYTES), 0);
}

export function saveShot(tempFilePath: string, meta: Omit<ShotRecord, 'id' | 'path' | 'createdAt' | 'bytes'>): Promise<ShotRecord> {
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
        let bytes = ESTIMATED_SHOT_BYTES;
        try {
          bytes = (fs.statSync(filePath) as WechatMiniprogram.Stats).size;
        } catch {
          // Keep the estimate; the size only feeds the cache budget.
        }
        const record: ShotRecord = { id, path: filePath, createdAt, bytes, ...meta };
        wx.setStorageSync(STORAGE_KEY, [record, ...listShots()]);
        resolve(record);
      },
      fail: (error) => reject(new Error(error.errMsg)),
    });
  });
}
