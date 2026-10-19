// Dev-panel probe for the M1 test matrix: what takePhoto really returns on this device
// (size, format, file size, latency) for each quality setting. Capture itself is built in M2.

export type PhotoQuality = 'original' | 'high' | 'normal' | 'low';

export interface PhotoProbeResult {
  quality: PhotoQuality;
  ok: boolean;
  width: number;
  height: number;
  type: string;
  bytes: number;
  elapsedMs: number;
  error: string;
}

export function formatProbe(result: PhotoProbeResult): string {
  if (!result.ok) return `${result.quality}: 失败 ${result.error}`;
  const kb = Math.round(result.bytes / 1024);
  return `${result.quality}: ${result.width}×${result.height} ${result.type} ${kb}KB ${Math.round(result.elapsedMs)}ms`;
}

function errorText(error: unknown): string {
  if (error && typeof error === 'object' && 'errMsg' in error) return String((error as { errMsg: unknown }).errMsg);
  return String(error);
}

export function runPhotoProbe(quality: PhotoQuality): Promise<PhotoProbeResult> {
  const startedAt = Date.now();
  const base: PhotoProbeResult = { quality, ok: false, width: 0, height: 0, type: '', bytes: 0, elapsedMs: 0, error: '' };

  return new Promise((resolve) => {
    const fail = (error: unknown) => resolve({ ...base, elapsedMs: Date.now() - startedAt, error: errorText(error) });

    wx.createCameraContext().takePhoto({
      quality,
      fail,
      success: ({ tempImagePath }) => {
        const elapsedMs = Date.now() - startedAt;
        wx.getImageInfo({
          src: tempImagePath,
          fail,
          success: (info) => {
            wx.getFileSystemManager().getFileInfo({
              filePath: tempImagePath,
              fail,
              success: (file) => resolve({
                ...base,
                ok: true,
                width: info.width,
                height: info.height,
                type: info.type,
                bytes: file.size,
                elapsedMs,
              }),
            });
          },
        });
      },
    });
  });
}
