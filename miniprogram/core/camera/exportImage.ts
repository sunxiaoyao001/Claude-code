// Export chain (CLAUDE.md §2, decided C-08): the rendered WebGL frame is read back in horizontal strips
// into a 2D canvas, the date stamp is drawn on that same canvas, and wx.canvasToTempFilePath encodes a
// JPEG. canvasToTempFilePath is documented for `type="2d"` canvases only, hence the 2D hop.
// Strips cap transient memory at width * STRIP_ROWS * 4 bytes instead of a full-frame copy.
import type { GLRenderer } from '../gl/GLRenderer';
import type { StampContext } from '../stamp/DateStamp';

const STRIP_ROWS = 128;

export interface ExportContext2D extends StampContext {
  createImageData(width: number, height: number): { data: Uint8ClampedArray };
  putImageData(imageData: { data: Uint8ClampedArray }, dx: number, dy: number): void;
}

export interface ExportCanvas {
  width: number;
  height: number;
  getContext(type: '2d'): unknown;
}

/** Copies the renderer's current framebuffer (width x height, GL bottom-up) into the 2D canvas, top-down. */
export function copyFramebufferTo2D(renderer: GLRenderer, width: number, height: number, canvas: ExportCanvas): ExportContext2D {
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d') as ExportContext2D;
  const rowBytes = width * 4;
  const strip = new Uint8Array(rowBytes * STRIP_ROWS);

  for (let top = 0; top < height; top += STRIP_ROWS) {
    const rows = Math.min(STRIP_ROWS, height - top);
    const glY = height - top - rows;
    const pixels = rows === STRIP_ROWS ? strip : strip.subarray(0, rowBytes * rows);
    renderer.readPixels(0, glY, width, rows, pixels);
    const imageData = ctx.createImageData(width, rows);
    for (let row = 0; row < rows; row++) {
      // GL row 0 is the bottom of the strip.
      const src = (rows - 1 - row) * rowBytes;
      imageData.data.set(pixels.subarray(src, src + rowBytes), row * rowBytes);
    }
    ctx.putImageData(imageData, 0, top);
  }
  return ctx;
}

export function encodeJpeg(canvas: ExportCanvas, width: number, height: number, quality = 0.92): Promise<string> {
  return new Promise((resolve, reject) => {
    wx.canvasToTempFilePath({
      canvas,
      x: 0,
      y: 0,
      width,
      height,
      destWidth: width,
      destHeight: height,
      fileType: 'jpg',
      quality,
      success: (res) => resolve(res.tempFilePath),
      fail: (error) => reject(new Error(error.errMsg)),
    });
  });
}
