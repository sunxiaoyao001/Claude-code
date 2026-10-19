// View model for the dev panel (develop/trial builds only). Pure formatting so it stays testable and
// the WXML only prints strings.
import type { FrameStatsSnapshot } from '../../core/camera/FrameStats';
import type { GLCaps } from '../../core/gl/GLCaps';

export interface DevSettings {
  frameSize: string;
  resolution: string;
  rotation: number;
  mirror: boolean;
  grayscale: boolean;
  syncGpu: boolean;
  /** Show the unprocessed frame instead of the look. */
  raw: boolean;
}

export interface DevEnvironment {
  sdkVersion: string;
  platform: string;
  model: string;
  canvasWidth: number;
  canvasHeight: number;
  pixelRatio: number;
  glFailed: boolean;
  tier: string;
  /** 'on' | 'off' | 'locked off' */
  halation: string;
  lookReady: boolean;
}

export interface DevModel {
  lines: string[];
  settings: DevSettings;
  /** Newest first: capture timings, takePhoto probes, export self-check lines. */
  results: string[];
}

const fixed = (value: number, digits = 1): string => value.toFixed(digits);

export function buildDevLines(
  stats: FrameStatsSnapshot,
  caps: GLCaps | null,
  env: DevEnvironment,
  settings: DevSettings,
): string[] {
  const timing = settings.syncGpu ? '含 GPU' : '仅 CPU 提交';
  const gl = env.glFailed
    ? 'WebGL 不可用（显示的是原生相机预览）'
    : caps
      ? `${caps.renderer || 'unknown GPU'} · maxTex ${caps.maxTextureSize} · maxRB ${caps.maxRenderbufferSize} · highp ${caps.fragmentHighp ? '有' : '无'}`
      : 'WebGL 初始化中';
  const look = settings.raw ? '原始画面' : env.lookReady ? '阳光罐头' : 'LUT 加载中';

  return [
    `帧 ${stats.frameWidth}×${stats.frameHeight} · 供帧 ${stats.deliveredFps} fps · 渲染 ${stats.renderedFps} fps · 丢 ${stats.droppedFps}`,
    `渲染耗时 平均 ${fixed(stats.avgRenderMs)}ms / 最大 ${fixed(stats.maxRenderMs)}ms（${timing}）`,
    `累计 供帧 ${stats.totalDelivered} / 渲染 ${stats.totalRendered}`,
    `画布 ${env.canvasWidth}×${env.canvasHeight} · DPR ${fixed(env.pixelRatio, 2)} · 档位 ${env.tier} · 预览光晕 ${env.halation}`,
    `滤镜 ${look}`,
    gl,
    `SDK ${env.sdkVersion} · ${env.platform} · ${env.model}`,
    `frame-size ${settings.frameSize} · resolution ${settings.resolution} · 旋转 ${settings.rotation}° · 镜像 ${settings.mirror ? '开' : '关'}`,
  ];
}

/** One capture as dev-panel lines: photo source, output and per-step timings. */
export function formatCapture(result: {
  width: number;
  height: number;
  photo: { width: number; height: number; type: string; orientation: string; quality: string; resized: boolean };
  timings: Array<[string, number]>;
  shot: { leak: unknown };
}): string[] {
  const total = result.timings.reduce((sum, [, ms]) => sum + ms, 0);
  const { photo } = result;
  return [
    `出片 ${result.width}×${result.height} · 总 ${total}ms · 漏光 ${result.shot.leak ? '有' : '无'}`,
    `原图 ${photo.quality} ${photo.width}×${photo.height} ${photo.type} ${photo.orientation}${photo.resized ? ' · 已缩放' : ''}`,
    result.timings.map(([label, ms]) => `${label} ${ms}`).join(' · '),
  ];
}
