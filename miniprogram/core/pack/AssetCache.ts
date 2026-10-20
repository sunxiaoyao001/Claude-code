// CDN asset cache (CLAUDE.md §5): downloads pack files (LUT, thumbnail) into USER_DATA_PATH/assets,
// verifies SHA-256 before keeping them, and evicts least-recently-used files to a budget that shrinks
// as the album grows (the 200MB local quota is shared with shots). Files are content-addressed by hash,
// so a re-published pack with unchanged files downloads nothing.
import { sha256Hex } from '../util/sha256';
import type { RemoteAsset } from './CameraPack';

const MB = 1024 * 1024;
// Local files + cache share 200MB; keep headroom for temp files from takePhoto and export.
const LOCAL_QUOTA_SAFE = 180 * MB;
export const CACHE_MAX = 50 * MB;
export const CACHE_MIN = 20 * MB;
const RETRY_DELAYS_MS = [500, 1500];
const INDEX_KEY = 'assets.v1';

export type ProgressFn = (progress: number) => void;

interface CacheEntry {
  path: string;
  bytes: number;
  lastUsed: number;
}

export type CacheIndex = Record<string, CacheEntry>;

/** Platform calls the cache needs; wxCachePlatform() binds them to wx, tests pass fakes. */
export interface CachePlatform {
  dir: string;
  download(url: string, onProgress: ProgressFn): Promise<string>;
  readFile(path: string): ArrayBuffer;
  /** Moves a downloaded temp file to its permanent path. */
  keepFile(tempPath: string, path: string): void;
  removeFile(path: string): void;
  exists(path: string): boolean;
  loadIndex(): CacheIndex;
  storeIndex(index: CacheIndex): void;
  wait(ms: number): Promise<void>;
  now(): number;
}

/** Cache budget given the bytes already used by the album: 50MB, shrinking to no less than 20MB. */
export function cacheBudget(albumBytes: number): number {
  return Math.min(CACHE_MAX, Math.max(CACHE_MIN, LOCAL_QUOTA_SAFE - albumBytes));
}

/** Hashes of entries to delete, oldest first, until the rest fits the budget. `keep` is never evicted. */
export function planEviction(index: CacheIndex, budget: number, keep: ReadonlySet<string>): string[] {
  let total = Object.values(index).reduce((sum, entry) => sum + entry.bytes, 0);
  const victims: string[] = [];
  const oldestFirst = Object.entries(index).sort((a, b) => a[1].lastUsed - b[1].lastUsed);
  for (const [hash, entry] of oldestFirst) {
    if (total <= budget) break;
    if (keep.has(hash)) continue;
    victims.push(hash);
    total -= entry.bytes;
  }
  return victims;
}

function extensionOf(url: string): string {
  const match = /\.([a-z0-9]+)(?:[?#]|$)/i.exec(url);
  return match?.[1]?.toLowerCase() ?? 'bin';
}

export class AssetCache {
  private index: CacheIndex;
  private inflight = new Map<string, Promise<string>>();

  constructor(private readonly platform: CachePlatform, private readonly budget: () => number) {
    this.index = platform.loadIndex();
  }

  /** Local path when the asset is already cached, without touching the network. */
  peek(asset: RemoteAsset): string | null {
    const entry = this.index[asset.sha256];
    if (!entry) return null;
    if (!this.platform.exists(entry.path)) {
      delete this.index[asset.sha256];
      this.platform.storeIndex(this.index);
      return null;
    }
    return entry.path;
  }

  usage(): number {
    return Object.values(this.index).reduce((sum, entry) => sum + entry.bytes, 0);
  }

  /** Local path of the asset, downloading and verifying it first when needed. */
  ensure(asset: RemoteAsset, onProgress: ProgressFn = () => undefined, keep: readonly string[] = []): Promise<string> {
    const cached = this.peek(asset);
    if (cached) {
      this.touch(asset.sha256);
      onProgress(1);
      return Promise.resolve(cached);
    }
    const pending = this.inflight.get(asset.sha256);
    if (pending) return pending;
    const task = this.fetch(asset, onProgress, keep).finally(() => this.inflight.delete(asset.sha256));
    this.inflight.set(asset.sha256, task);
    return task;
  }

  private async fetch(asset: RemoteAsset, onProgress: ProgressFn, keep: readonly string[]): Promise<string> {
    const { platform } = this;
    let lastError: unknown = null;
    for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
      if (attempt > 0) await platform.wait(RETRY_DELAYS_MS[attempt - 1] ?? 0);
      try {
        const temp = await platform.download(asset.url, onProgress);
        const hash = sha256Hex(platform.readFile(temp));
        if (hash !== asset.sha256.toLowerCase()) {
          platform.removeFile(temp);
          throw new Error(`checksum mismatch for ${asset.url}`);
        }
        const path = `${platform.dir}/${hash}.${extensionOf(asset.url)}`;
        platform.keepFile(temp, path);
        this.index[asset.sha256] = { path, bytes: asset.bytes, lastUsed: platform.now() };
        this.evict(new Set([asset.sha256, ...keep]));
        platform.storeIndex(this.index);
        onProgress(1);
        return path;
      } catch (error) {
        lastError = error;
      }
    }
    throw lastError instanceof Error ? lastError : new Error(String(lastError));
  }

  private touch(hash: string): void {
    const entry = this.index[hash];
    if (!entry) return;
    entry.lastUsed = this.platform.now();
    this.platform.storeIndex(this.index);
  }

  private evict(keep: ReadonlySet<string>): void {
    for (const hash of planEviction(this.index, this.budget(), keep)) {
      const entry = this.index[hash];
      if (entry) {
        try {
          this.platform.removeFile(entry.path);
        } catch {
          // Already gone; dropping the index entry is all that is left to do.
        }
      }
      delete this.index[hash];
    }
  }
}

export function wxCachePlatform(): CachePlatform {
  const fs = wx.getFileSystemManager();
  const dir = `${wx.env.USER_DATA_PATH}/assets`;
  const exists = (path: string) => {
    try {
      fs.accessSync(path);
      return true;
    } catch {
      return false;
    }
  };
  return {
    dir,
    download: (url, onProgress) => new Promise((resolve, reject) => {
      const task = wx.downloadFile({
        url,
        success: (res) => (res.statusCode === 200 ? resolve(res.tempFilePath) : reject(new Error(`HTTP ${res.statusCode}`))),
        fail: (error) => reject(new Error(error.errMsg)),
      });
      task.onProgressUpdate((res) => onProgress(res.progress / 100));
    }),
    readFile: (path) => fs.readFileSync(path) as ArrayBuffer,
    keepFile: (tempPath, path) => {
      if (!exists(dir)) fs.mkdirSync(dir, true);
      fs.saveFileSync(tempPath, path);
    },
    removeFile: (path) => fs.unlinkSync(path),
    exists,
    loadIndex: () => {
      try {
        const value: unknown = wx.getStorageSync(INDEX_KEY);
        return value && typeof value === 'object' ? (value as CacheIndex) : {};
      } catch {
        return {};
      }
    },
    storeIndex: (index) => wx.setStorageSync(INDEX_KEY, index),
    wait: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
    now: () => Date.now(),
  };
}
