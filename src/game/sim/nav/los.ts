import { segmentCircleChord } from '../../core/math';
import { Cell, CELL_INFO, type GameMap } from '../map/GameMap';

/**
 * Amanatides–Woo grid traversal from (x0,y0) to (x1,y1). The visitor receives
 * each crossed cell with entry/exit distances (metres); return true to stop.
 */
export function traverse(
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  visit: (cx: number, cy: number, tIn: number, tOut: number) => boolean,
): void {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const len = Math.hypot(dx, dy);
  let cx = Math.floor(x0);
  let cy = Math.floor(y0);
  const ex = Math.floor(x1);
  const ey = Math.floor(y1);
  const stepX = dx > 0 ? 1 : dx < 0 ? -1 : 0;
  const stepY = dy > 0 ? 1 : dy < 0 ? -1 : 0;
  const tDeltaX = stepX !== 0 ? Math.abs(1 / dx) : Infinity;
  const tDeltaY = stepY !== 0 ? Math.abs(1 / dy) : Infinity;
  let tMaxX = stepX > 0 ? (cx + 1 - x0) / dx : stepX < 0 ? (cx - x0) / dx : Infinity;
  let tMaxY = stepY > 0 ? (cy + 1 - y0) / dy : stepY < 0 ? (cy - y0) / dy : Infinity;
  let t = 0;
  for (let guard = 0; guard < 2048; guard++) {
    const tNext = Math.min(tMaxX, tMaxY, 1);
    if (visit(cx, cy, t * len, tNext * len)) return;
    if ((cx === ex && cy === ey) || tNext >= 1) return;
    if (tMaxX < tMaxY) {
      cx += stepX;
      t = tMaxX;
      tMaxX += tDeltaX;
    } else {
      cy += stepY;
      t = tMaxY;
      tMaxY += tDeltaY;
    }
  }
}

export interface SmokeLike {
  x: number;
  y: number;
  r: number;
  density: number;
}

/** Opacity from structures along a segment, ignoring the start and end cells. */
export function structureOpacity(map: GameMap, x0: number, y0: number, x1: number, y1: number, cap = 1): number {
  const sx = Math.floor(x0);
  const sy = Math.floor(y0);
  const ex = Math.floor(x1);
  const ey = Math.floor(y1);
  let op = 0;
  traverse(x0, y0, x1, y1, (cx, cy) => {
    if ((cx === sx && cy === sy) || (cx === ex && cy === ey)) return false;
    if (cx < 0 || cy < 0 || cx >= map.w || cy >= map.h) {
      op = cap;
      return true;
    }
    const k = map.cells[cy * map.w + cx] as Cell;
    if (k !== Cell.Empty) {
      op += CELL_INFO[k].opacity;
      if (op >= cap) return true;
    }
    return false;
  });
  return op;
}

export function smokeOpacity(smokes: readonly SmokeLike[], x0: number, y0: number, x1: number, y1: number): number {
  let op = 0;
  for (let i = 0; i < smokes.length; i++) {
    const s = smokes[i];
    if (s.density <= 0.01) continue;
    op += segmentCircleChord(x0, y0, x1, y1, s.x, s.y, s.r) * s.density;
  }
  return op;
}

export function hasLOS(map: GameMap, smokes: readonly SmokeLike[], x0: number, y0: number, x1: number, y1: number): boolean {
  if (smokeOpacity(smokes, x0, y0, x1, y1) >= 1) return false;
  return structureOpacity(map, x0, y0, x1, y1, 1) < 1;
}

/** True when a soft body (e.g. tank OBB) is not needed; checks only walls for blast propagation. */
export function blastClear(map: GameMap, x0: number, y0: number, x1: number, y1: number): boolean {
  let clear = true;
  const ex = Math.floor(x1);
  const ey = Math.floor(y1);
  traverse(x0, y0, x1, y1, (cx, cy) => {
    if (cx === ex && cy === ey) return true;
    const k = map.kind(cx, cy);
    if (k === Cell.Wall || k === Cell.Rock || k === Cell.Wreck) {
      if (!(cx === Math.floor(x0) && cy === Math.floor(y0))) {
        clear = false;
        return true;
      }
    }
    return false;
  });
  return clear;
}
