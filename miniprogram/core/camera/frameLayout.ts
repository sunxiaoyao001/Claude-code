// Where the film frame sits on screen (CLAUDE.md §7.2): between the status row and the controls, as
// large as the pack's aspect ratio allows, centred. The CSS rect positions the frame lines; the same
// rect in canvas pixels (GL origin bottom-left) is where the pipeline renders.
import type { Viewport } from '../gl/GLRenderer';

export interface Rect {
  left: number;
  top: number;
  width: number;
  height: number;
}

/** Largest rect of the given aspect (width / height) inside `area`, centred. */
export function fitFrame(area: Rect, aspect: number): Rect {
  let width = area.width;
  let height = width / aspect;
  if (height > area.height) {
    height = area.height;
    width = height * aspect;
  }
  return {
    left: area.left + (area.width - width) / 2,
    top: area.top + (area.height - height) / 2,
    width,
    height,
  };
}

/** CSS rect -> canvas viewport for a canvas covering the whole window. */
export function toCanvasViewport(rect: Rect, pixelRatio: number, canvasHeight: number): Viewport {
  const x = Math.round(rect.left * pixelRatio);
  const y = Math.round(rect.top * pixelRatio);
  const width = Math.round(rect.width * pixelRatio);
  const height = Math.round(rect.height * pixelRatio);
  return { x, y: canvasHeight - y - height, width, height };
}

/** Status-row format glyph: a box with the frame's proportions inside a square of `size`. */
export function formatGlyph(aspect: number, size: number): { width: number; height: number } {
  return aspect >= 1
    ? { width: size, height: Math.max(2, Math.round(size / aspect)) }
    : { width: Math.max(2, Math.round(size * aspect)), height: size };
}
