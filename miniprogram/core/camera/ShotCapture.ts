// Capture (CLAUDE.md §3 出片数据流): takePhoto (original, falling back to high) -> optional native resize
// to the device cap -> decode into an offscreen WebGL canvas -> full pipeline -> 2D export with the date
// stamp -> JPEG. The offscreen canvas, its GL context and the LUT texture are reused between shots.
import { captureLongEdgeLimit, type DeviceTier } from '../device/DeviceTier';
import { GLRenderer, type WebGLCanvasNode } from '../gl/GLRenderer';
import { captureSize, Pipeline } from '../gl/Pipeline';
import { rollShot, type ShotRandom } from '../gl/shotRandom';
import type { GLTexture } from '../gl/webgl1';
import type { FilterParams } from '../pack/FilterParams';
import { drawDateStamp } from '../stamp/DateStamp';
import { formatStamp } from '../stamp/sevenSegment';
import { copyFramebufferTo2D, encodeJpeg, type ExportCanvas } from './exportImage';
import { resolveOrientation, type ExifOrientation } from './orientation';
import { computeViewTransform } from './viewTransform';

export interface CaptureRequest {
  look: FilterParams;
  lutSrc: string;
  tier: DeviceTier;
  /** Hidden on-page `<canvas type="2d">` used for the export. */
  exportCanvas: ExportCanvas;
  seed: number;
  stampDate: Date;
}

export interface CaptureResult {
  tempFilePath: string;
  width: number;
  height: number;
  shot: ShotRandom;
  photo: { width: number; height: number; type: string; orientation: string; quality: string; resized: boolean };
  timings: Array<[string, number]>;
}

type PhotoQuality = 'original' | 'high';

function takePhoto(quality: PhotoQuality): Promise<string> {
  return new Promise((resolve, reject) => {
    wx.createCameraContext().takePhoto({
      quality,
      success: (res) => resolve(res.tempImagePath),
      fail: (error) => reject(new Error(error.errMsg)),
    });
  });
}

function imageInfo(src: string): Promise<WechatMiniprogram.GetImageInfoSuccessCallbackResult> {
  return new Promise((resolve, reject) => {
    wx.getImageInfo({ src, success: resolve, fail: (error) => reject(new Error(error.errMsg)) });
  });
}

/** Native resize (base library >= 2.26.0) so oversized originals never exceed the GL limits. */
function resizeTo(src: string, width: number, height: number, longEdge: number): Promise<string> {
  return new Promise((resolve, reject) => {
    wx.compressImage({
      src,
      quality: 95,
      ...(width >= height ? { compressedWidth: longEdge } : { compressedHeight: longEdge }),
      success: (res) => resolve(res.tempFilePath),
      fail: (error) => reject(new Error(error.errMsg)),
    });
  });
}

export class ShotCapture {
  private renderer: GLRenderer | null = null;
  private pipeline: Pipeline | null = null;
  private lutTexture: GLTexture | null = null;
  private lutSrc = '';
  private busy = false;

  get isBusy(): boolean {
    return this.busy;
  }

  async capture(request: CaptureRequest): Promise<CaptureResult> {
    if (this.busy) throw new Error('capture already running');
    this.busy = true;
    const timings: Array<[string, number]> = [];
    let last = Date.now();
    const mark = (label: string) => {
      const now = Date.now();
      timings.push([label, now - last]);
      last = now;
    };

    try {
      let quality: PhotoQuality = 'original';
      let path: string;
      try {
        path = await takePhoto('original');
      } catch {
        quality = 'high';
        path = await takePhoto('high');
      }
      mark('takePhoto');

      const { renderer, pipeline } = this.ensureContext();
      await this.ensureLut(renderer, pipeline, request);
      const info = await imageInfo(path);
      const limit = captureLongEdgeLimit(request.tier, renderer.caps);
      let resized = false;
      if (Math.max(info.width, info.height) > limit) {
        path = await resizeTo(path, info.width, info.height, limit);
        resized = true;
      }
      mark('prepare');

      const image = await renderer.loadImage(path);
      const source = { texture: renderer.createTexture(), width: image.width, height: image.height };
      const orientation = resolveOrientation(info.orientation as ExifOrientation, info.width, info.height, image.width, image.height);
      const out = captureSize(orientation.width, orientation.height, request.look.frame.aspectRatio);
      const shot = rollShot(request.seed, request.look);
      try {
        renderer.uploadImage(source.texture, image);
        mark('decode+upload');
        const transform = computeViewTransform({
          frameWidth: image.width,
          frameHeight: image.height,
          viewWidth: out.width,
          viewHeight: out.height,
          rotation: orientation.rotation,
          mirror: orientation.mirror,
        });
        // Render and read back in one synchronous block: the drawing buffer is only guaranteed until
        // control returns to the event loop.
        pipeline.renderCapture(source, transform.matrix, out.width, out.height, shot);
        mark('render');
        const ctx = copyFramebufferTo2D(renderer, out.width, out.height, request.exportCanvas);
        if (request.look.dateStamp.enabled) drawDateStamp(ctx, formatStamp(request.stampDate), out.width, out.height);
        mark('readback+stamp');
      } finally {
        renderer.deleteTexture(source.texture);
      }

      const tempFilePath = await encodeJpeg(request.exportCanvas, out.width, out.height);
      mark('encode');

      return {
        tempFilePath,
        width: out.width,
        height: out.height,
        shot,
        photo: { width: info.width, height: info.height, type: info.type, orientation: info.orientation, quality, resized },
        timings,
      };
    } finally {
      this.busy = false;
    }
  }

  destroy(): void {
    this.pipeline?.destroy();
    if (this.lutTexture) this.renderer?.deleteTexture(this.lutTexture);
    this.renderer?.destroy();
    this.renderer = null;
    this.pipeline = null;
    this.lutTexture = null;
    this.lutSrc = '';
  }

  private ensureContext(): { renderer: GLRenderer; pipeline: Pipeline } {
    if (this.renderer && this.pipeline && !this.renderer.isContextLost) {
      return { renderer: this.renderer, pipeline: this.pipeline };
    }
    this.destroy();
    // createOffscreenCanvas({ type }): base library >= 2.16.1.
    const canvas = wx.createOffscreenCanvas({ type: 'webgl', width: 1, height: 1 }) as unknown as WebGLCanvasNode;
    const renderer = GLRenderer.create(canvas, 1, 1);
    if (!renderer) throw new Error('offscreen WebGL is unavailable');
    this.renderer = renderer;
    this.pipeline = new Pipeline(renderer);
    return { renderer, pipeline: this.pipeline };
  }

  private async ensureLut(renderer: GLRenderer, pipeline: Pipeline, request: CaptureRequest): Promise<void> {
    if (!this.lutTexture || this.lutSrc !== request.lutSrc) {
      const image = await renderer.loadImage(request.lutSrc);
      const texture = this.lutTexture ?? renderer.createTexture();
      renderer.uploadImage(texture, image);
      this.lutTexture = texture;
      this.lutSrc = request.lutSrc;
    }
    pipeline.setLook(request.look, this.lutTexture);
  }
}
