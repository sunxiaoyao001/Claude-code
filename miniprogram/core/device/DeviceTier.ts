// Device performance tier (CLAUDE.md §4): decides the capture long-edge cap and whether the preview
// starts with halation. wx.getDeviceBenchmarkInfo needs base library 3.4.5, above our 3.0.0 floor.
import type { GLCaps } from '../gl/GLCaps';

export type DeviceTier = 'low' | 'mid' | 'high';

export const CAPTURE_LONG_EDGE: Record<DeviceTier, number> = { low: 2048, mid: 3072, high: 4096 };

export interface BenchmarkInfo {
  benchmarkLevel?: number;
  modelLevel?: number;
}

export function tierFromBenchmark(info: BenchmarkInfo | null): DeviceTier {
  if (!info) return 'mid';
  // modelLevel: 1 high, 2 mid, 3 low, 0 unknown.
  if (info.modelLevel === 1) return 'high';
  if (info.modelLevel === 2) return 'mid';
  if (info.modelLevel === 3) return 'low';
  // benchmarkLevel: -1 unknown, otherwise higher is faster (mobile tops out around 50).
  const level = info.benchmarkLevel ?? -1;
  if (level < 0) return 'mid';
  if (level >= 30) return 'high';
  return level >= 15 ? 'mid' : 'low';
}

/** Largest capture long edge this device and GL context can render in one pass. */
export function captureLongEdgeLimit(tier: DeviceTier, caps: GLCaps): number {
  return Math.min(CAPTURE_LONG_EDGE[tier], caps.maxTextureSize, caps.maxRenderbufferSize, caps.maxViewport[0], caps.maxViewport[1]);
}

export function detectTier(): Promise<DeviceTier> {
  return new Promise((resolve) => {
    if (!wx.canIUse('getDeviceBenchmarkInfo')) {
      resolve('mid');
      return;
    }
    wx.getDeviceBenchmarkInfo({
      success: (info) => resolve(tierFromBenchmark(info)),
      fail: () => resolve('mid'),
    });
  });
}

/**
 * Whether translucent bars may use backdrop-filter blur (§7.2). There is no feature query for it in
 * WXSS, so this is a heuristic: low-tier phones and PC WeChat get the solid fallback. Platform comes
 * from wx.getDeviceInfo() (wx.getSystemInfoSync is deprecated since 2.20.1).
 */
export function useFrostedGlass(tier: DeviceTier, platform: string): boolean {
  if (tier === 'low') return false;
  return platform === 'ios' || platform === 'android' || platform === 'devtools' || platform === 'ohos';
}
