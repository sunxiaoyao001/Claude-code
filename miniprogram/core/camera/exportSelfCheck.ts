// Dev-panel self check for the M2 export spike (CLAUDE.md §12 M2): runs on the device and reports
//  1. LUT accuracy: an identity LUT PNG through the full composite must return the input (checks that
//     the platform decodes PNGs without colour management, which the LUT format relies on);
//  2. export path A: on-page `<canvas type="2d">` -> canvasToTempFilePath (documented);
//  3. export path B: offscreen 2D canvas -> canvasToTempFilePath (undocumented);
//  4. path A at the device's capture size, with timings.
import { captureLongEdgeLimit, type DeviceTier } from '../device/DeviceTier';
import { GLRenderer, type WebGLCanvasNode } from '../gl/GLRenderer';
import { Pipeline } from '../gl/Pipeline';
import type { FilterParams } from '../pack/FilterParams';
import { copyFramebufferTo2D, encodeJpeg, type ExportCanvas } from './exportImage';
import { computeViewTransform } from './viewTransform';

const NEUTRAL: FilterParams = {
  lut: { id: 'identity', intensity: 1 },
  vignette: { strength: 0, softness: 0.4 },
  halation: { strength: 0, threshold: 0.85, radius: 1 },
  grain: { size: 1, intensity: 0, lumaWeight: 0, colored: false },
  lightLeak: { probability: 0, opacityMin: 0, opacityMax: 0 },
  frame: { aspectRatio: '3:4' },
  dateStamp: { enabled: false },
};
const NO_RANDOM = { seed: 0, grainSeed: 0, ditherSeed: 0, leak: null };
const TEST_SIZE = 192;

function gradient(size: number): Uint8Array {
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const o = (y * size + x) * 4;
      data[o] = Math.round((x / (size - 1)) * 255);
      data[o + 1] = Math.round((y / (size - 1)) * 255);
      data[o + 2] = Math.round(((x + y) / (2 * (size - 1))) * 255);
      data[o + 3] = 255;
    }
  }
  return data;
}

async function timed<T>(work: () => Promise<T>): Promise<[T, number]> {
  const start = Date.now();
  const value = await work();
  return [value, Date.now() - start];
}

function describe(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export async function runExportSelfCheck(pageCanvas: ExportCanvas, tier: DeviceTier): Promise<string[]> {
  const lines: string[] = [];
  const canvas = wx.createOffscreenCanvas({ type: 'webgl', width: TEST_SIZE, height: TEST_SIZE }) as unknown as WebGLCanvasNode;
  const renderer = GLRenderer.create(canvas, TEST_SIZE, TEST_SIZE);
  if (!renderer) return ['离屏 WebGL 不可用'];
  const pipeline = new Pipeline(renderer);

  try {
    const lutImage = await renderer.loadImage('/assets/luts/identity.png');
    const lut = renderer.createTexture();
    renderer.uploadImage(lut, lutImage);
    pipeline.setLook(NEUTRAL, lut);

    const input = gradient(TEST_SIZE);
    const source = { texture: renderer.createTexture(), width: TEST_SIZE, height: TEST_SIZE };
    renderer.uploadRGBA(source.texture, TEST_SIZE, TEST_SIZE, input.buffer as ArrayBuffer);
    const identity = computeViewTransform({ frameWidth: TEST_SIZE, frameHeight: TEST_SIZE, viewWidth: TEST_SIZE, viewHeight: TEST_SIZE, rotation: 0, mirror: false });

    // 1. LUT accuracy
    pipeline.renderCapture(source, identity.matrix, TEST_SIZE, TEST_SIZE, NO_RANDOM);
    const out = new Uint8Array(TEST_SIZE * TEST_SIZE * 4);
    renderer.readPixels(0, 0, TEST_SIZE, TEST_SIZE, out);
    let maxError = 0;
    for (let y = 0; y < TEST_SIZE; y++) {
      for (let x = 0; x < TEST_SIZE; x++) {
        const o = ((TEST_SIZE - 1 - y) * TEST_SIZE + x) * 4; // GL rows are bottom-up
        const i = (y * TEST_SIZE + x) * 4;
        for (let c = 0; c < 3; c++) maxError = Math.max(maxError, Math.abs((out[o + c] ?? 0) - (input[i + c] ?? 0)));
      }
    }
    lines.push(`LUT 精度：最大误差 ${maxError}/255（≤3 合格）${maxError <= 3 ? '✓' : '✗ PNG 解码可能做了色彩转换'}`);

    // 2. path A, small
    try {
      pipeline.renderCapture(source, identity.matrix, TEST_SIZE, TEST_SIZE, NO_RANDOM);
      copyFramebufferTo2D(renderer, TEST_SIZE, TEST_SIZE, pageCanvas);
      const [path, ms] = await timed(() => encodeJpeg(pageCanvas, TEST_SIZE, TEST_SIZE));
      lines.push(`导出 A（页面 2D canvas）：✓ ${ms}ms ${path.slice(-12)}`);
    } catch (error) {
      lines.push(`导出 A（页面 2D canvas）：✗ ${describe(error)}`);
    }

    // 3. path B, small
    try {
      const offscreen2d = wx.createOffscreenCanvas({ type: '2d', width: TEST_SIZE, height: TEST_SIZE }) as unknown as ExportCanvas;
      pipeline.renderCapture(source, identity.matrix, TEST_SIZE, TEST_SIZE, NO_RANDOM);
      copyFramebufferTo2D(renderer, TEST_SIZE, TEST_SIZE, offscreen2d);
      const [, ms] = await timed(() => encodeJpeg(offscreen2d, TEST_SIZE, TEST_SIZE));
      lines.push(`导出 B（离屏 2D canvas）：✓ ${ms}ms`);
    } catch (error) {
      lines.push(`导出 B（离屏 2D canvas）：✗ ${describe(error)}`);
    }

    // 4. path A at full capture size
    const longEdge = captureLongEdgeLimit(tier, renderer.caps);
    const width = Math.round((longEdge * 3) / 4);
    const height = longEdge;
    try {
      const startedAt = Date.now();
      const big = computeViewTransform({ frameWidth: TEST_SIZE, frameHeight: TEST_SIZE, viewWidth: width, viewHeight: height, rotation: 0, mirror: false });
      pipeline.renderCapture(source, big.matrix, width, height, NO_RANDOM);
      const renderMs = Date.now() - startedAt;
      copyFramebufferTo2D(renderer, width, height, pageCanvas);
      const readbackMs = Date.now() - startedAt - renderMs;
      const [path, encodeMs] = await timed(() => encodeJpeg(pageCanvas, width, height));
      const info = await new Promise<WechatMiniprogram.GetImageInfoSuccessCallbackResult>((resolve, reject) => {
        wx.getImageInfo({ src: path, success: resolve, fail: (error) => reject(new Error(error.errMsg)) });
      });
      lines.push(`满尺寸 ${width}×${height}（${tier} 档）：渲染 ${renderMs}ms · 读回 ${readbackMs}ms · 编码 ${encodeMs}ms → ${info.width}×${info.height}`);
    } catch (error) {
      lines.push(`满尺寸 ${width}×${height}：✗ ${describe(error)}`);
    }

    renderer.deleteTexture(source.texture);
    renderer.deleteTexture(lut);
  } catch (error) {
    lines.push(`自检中断：${describe(error)}`);
  } finally {
    pipeline.destroy();
    renderer.destroy();
  }
  return lines;
}
