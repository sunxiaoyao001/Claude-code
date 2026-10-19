// Draws the orange LED date stamp (#FF9E2C, CLAUDE.md §4) bottom-right on the export canvas.
import { layoutStamp } from './sevenSegment';

/** The subset of CanvasRenderingContext2D the stamp needs (kept small so tests can fake it). */
export interface StampContext {
  fillStyle: unknown;
  shadowColor: string;
  shadowBlur: number;
  globalAlpha: number;
  save(): void;
  restore(): void;
  beginPath(): void;
  moveTo(x: number, y: number): void;
  lineTo(x: number, y: number): void;
  closePath(): void;
  fill(): void;
}

const STAMP_COLOR = '#FF9E2C';
const STAMP_GLOW = 'rgba(255, 158, 44, 0.75)';
const HEIGHT_RATIO = 0.03; // glyph height relative to the shorter image side
const MARGIN_RATIO = 0.055;

export function drawDateStamp(ctx: StampContext, text: string, imageWidth: number, imageHeight: number): void {
  const shortSide = Math.min(imageWidth, imageHeight);
  const height = Math.max(8, Math.round(shortSide * HEIGHT_RATIO));
  const margin = Math.round(shortSide * MARGIN_RATIO);
  const { polygons, width } = layoutStamp(text, height);
  const originX = imageWidth - margin - width;
  const originY = imageHeight - margin - height;

  ctx.save();
  ctx.fillStyle = STAMP_COLOR;
  ctx.globalAlpha = 0.92;
  // Two passes: a blurred one for the LED bloom, a crisp one for the segments.
  for (const blur of [height * 0.45, 0]) {
    ctx.shadowColor = blur > 0 ? STAMP_GLOW : 'transparent';
    ctx.shadowBlur = blur;
    ctx.beginPath();
    for (const polygon of polygons) {
      polygon.forEach(([x, y], index) => {
        if (index === 0) ctx.moveTo(originX + x, originY + y);
        else ctx.lineTo(originX + x, originY + y);
      });
      ctx.closePath();
    }
    ctx.fill();
  }
  ctx.restore();
}
