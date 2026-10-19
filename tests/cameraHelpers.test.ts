import { describe, expect, it } from 'vitest';
import { defaultMirror, nextFlashMode } from '../miniprogram/core/camera/cameraOptions';
import { formatProbe } from '../miniprogram/core/camera/photoProbe';
import { buildDevLines, formatCapture } from '../miniprogram/pages/camera/devModel';

describe('camera options', () => {
  it('cycles flash off -> auto -> on -> off', () => {
    expect(nextFlashMode('off')).toBe('auto');
    expect(nextFlashMode('auto')).toBe('on');
    expect(nextFlashMode('on')).toBe('off');
  });

  it('mirrors the front camera only', () => {
    expect(defaultMirror('front')).toBe(true);
    expect(defaultMirror('back')).toBe(false);
  });
});

describe('photo probe formatting', () => {
  it('summarises a successful capture', () => {
    expect(formatProbe({ quality: 'original', ok: true, width: 3024, height: 4032, type: 'png', bytes: 15_728_640, elapsedMs: 812.4, error: '' }))
      .toBe('original: 3024×4032 png 15360KB 812ms');
  });

  it('shows the error for a failed capture', () => {
    expect(formatProbe({ quality: 'high', ok: false, width: 0, height: 0, type: '', bytes: 0, elapsedMs: 5, error: 'takePhoto:fail' }))
      .toBe('high: 失败 takePhoto:fail');
  });
});

describe('dev panel lines', () => {
  const stats = { deliveredFps: 30, renderedFps: 29, droppedFps: 1, avgRenderMs: 3.25, maxRenderMs: 9, frameWidth: 480, frameHeight: 640, totalDelivered: 300, totalRendered: 298 };
  const env = { sdkVersion: '3.17.0', platform: 'android', model: 'Pixel 7', canvasWidth: 2160, canvasHeight: 4680, pixelRatio: 2, glFailed: false, tier: 'high', halation: 'on', lookReady: true };
  const settings = { frameSize: 'medium', resolution: 'high', rotation: 90, mirror: true, grayscale: false, syncGpu: true, raw: false };

  it('prints frame, timing and settings', () => {
    const lines = buildDevLines(stats, null, env, settings);
    expect(lines[0]).toBe('帧 480×640 · 供帧 30 fps · 渲染 29 fps · 丢 1');
    expect(lines[1]).toContain('3.3ms');
    expect(lines[1]).toContain('含 GPU');
    expect(lines).toContain('WebGL 初始化中');
    expect(lines.at(-1)).toBe('frame-size medium · resolution high · 旋转 90° · 镜像 开');
  });

  it('names the active look and the halation state', () => {
    const lines = buildDevLines(stats, null, env, settings);
    expect(lines).toContain('滤镜 阳光罐头');
    expect(lines[3]).toContain('档位 high · 预览光晕 on');
    expect(buildDevLines(stats, null, env, { ...settings, raw: true })).toContain('滤镜 原始画面');
  });

  it('formats a capture with its timings', () => {
    const lines = formatCapture({
      width: 3024, height: 4032, shot: { leak: null },
      photo: { width: 3024, height: 4032, type: 'png', orientation: 'up', quality: 'original', resized: false },
      timings: [['takePhoto', 600], ['render', 120]],
    });
    expect(lines[0]).toBe('出片 3024×4032 · 总 720ms · 漏光 无');
    expect(lines[2]).toBe('takePhoto 600 · render 120');
  });

  it('says when WebGL is unavailable', () => {
    expect(buildDevLines(stats, null, { ...env, glFailed: true }, settings)).toContain('WebGL 不可用（显示的是原生相机预览）');
  });
});
