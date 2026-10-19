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
}

export interface DevEnvironment {
  sdkVersion: string;
  platform: string;
  model: string;
  canvasWidth: number;
  canvasHeight: number;
  pixelRatio: number;
  glFailed: boolean;
}

export interface DevModel {
  lines: string[];
  settings: DevSettings;
  photos: string[];
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

  return [
    `帧 ${stats.frameWidth}×${stats.frameHeight} · 供帧 ${stats.deliveredFps} fps · 渲染 ${stats.renderedFps} fps · 丢 ${stats.droppedFps}`,
    `渲染耗时 平均 ${fixed(stats.avgRenderMs)}ms / 最大 ${fixed(stats.maxRenderMs)}ms（${timing}）`,
    `累计 供帧 ${stats.totalDelivered} / 渲染 ${stats.totalRendered}`,
    `画布 ${env.canvasWidth}×${env.canvasHeight} · DPR ${fixed(env.pixelRatio, 2)}`,
    gl,
    `SDK ${env.sdkVersion} · ${env.platform} · ${env.model}`,
    `frame-size ${settings.frameSize} · resolution ${settings.resolution} · 旋转 ${settings.rotation}° · 镜像 ${settings.mirror ? '开' : '关'}`,
  ];
}
