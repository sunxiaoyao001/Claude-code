import { traverse } from '../nav/los';
import { Cell, CELL_INFO, type GameMap } from './GameMap';

const DX = [1, 1, 0, -1, -1, -1, 0, 1];
const DY = [0, 1, 1, 1, 0, -1, -1, -1];
const BUCKET = 8;

/**
 * Precomputed cover candidates: walkable cells next to something that stops
 * bullets, with an 8-direction protection mask. Runtime queries verify the
 * protection against actual threat positions with short ray casts.
 */
export class CoverMap {
  readonly mask: Uint8Array;
  readonly highMask: Uint8Array;
  private readonly bucketsW: number;
  private readonly buckets: Set<number>[];

  constructor(readonly map: GameMap) {
    this.mask = new Uint8Array(map.w * map.h);
    this.highMask = new Uint8Array(map.w * map.h);
    this.bucketsW = Math.ceil(map.w / BUCKET);
    this.buckets = Array.from({ length: this.bucketsW * Math.ceil(map.h / BUCKET) }, () => new Set<number>());
    for (let y = 0; y < map.h; y++) for (let x = 0; x < map.w; x++) this.compute(x, y);
  }

  updateAround(x: number, y: number) {
    for (let yy = y - 1; yy <= y + 1; yy++) for (let xx = x - 1; xx <= x + 1; xx++) this.compute(xx, yy);
  }

  private compute(x: number, y: number) {
    const map = this.map;
    if (!map.inBounds(x, y)) return;
    const i = map.idx(x, y);
    const bucket = this.buckets[Math.floor(y / BUCKET) * this.bucketsW + Math.floor(x / BUCKET)];
    if (CELL_INFO[map.cells[i] as Cell].blocksMove) {
      this.mask[i] = 0;
      this.highMask[i] = 0;
      bucket.delete(i);
      return;
    }
    let m = 0;
    let hm = 0;
    for (let d = 0; d < 8; d++) {
      const k = map.kind(x + DX[d], y + DY[d]);
      const c = CELL_INFO[k].cover;
      if (c >= 0.6) {
        m |= 1 << d;
        if (k === Cell.Wall || k === Cell.Rock || k === Cell.Wreck) hm |= 1 << d;
      }
    }
    this.mask[i] = m;
    this.highMask[i] = hm;
    if (m) bucket.add(i);
    else bucket.delete(i);
  }

  /** Collect cover cell indices within radius r of (x, y). */
  query(x: number, y: number, r: number, out: number[]): number[] {
    const map = this.map;
    const bx0 = Math.max(0, Math.floor((x - r) / BUCKET));
    const bx1 = Math.min(this.bucketsW - 1, Math.floor((x + r) / BUCKET));
    const by0 = Math.max(0, Math.floor((y - r) / BUCKET));
    const by1 = Math.min(Math.ceil(map.h / BUCKET) - 1, Math.floor((y + r) / BUCKET));
    const r2 = r * r;
    for (let by = by0; by <= by1; by++)
      for (let bx = bx0; bx <= bx1; bx++)
        for (const i of this.buckets[by * this.bucketsW + bx]) {
          const cx = (i % map.w) + 0.5;
          const cy = Math.floor(i / map.w) + 0.5;
          if ((cx - x) ** 2 + (cy - y) ** 2 <= r2) out.push(i);
        }
    return out;
  }

  /** Quick mask test: does the cell have cover roughly facing angle `a`? */
  facing(i: number, a: number): number {
    const m = this.mask[i];
    if (!m) return 0;
    const oct = ((Math.round(a / (Math.PI / 4)) % 8) + 8) % 8;
    if (m & (1 << oct)) return 1;
    if (m & (1 << ((oct + 1) % 8)) || m & (1 << ((oct + 7) % 8))) return 0.5;
    return 0;
  }
}

/**
 * Protection (0..1) a body at (px, py) gets from cover against a threat at (tx, ty):
 * casts three shoulder-width rays from the body toward the threat over the first 1.7 m.
 */
export function protectionFrom(map: GameMap, px: number, py: number, tx: number, ty: number): number {
  const dx = tx - px;
  const dy = ty - py;
  const len = Math.hypot(dx, dy);
  if (len < 0.5) return 0;
  const ux = dx / len;
  const uy = dy / len;
  const reach = Math.min(1.7, len);
  let total = 0;
  for (let o = -1; o <= 1; o++) {
    const ox = px - uy * 0.28 * o;
    const oy = py + ux * 0.28 * o;
    const sx = Math.floor(ox);
    const sy = Math.floor(oy);
    let best = 0;
    traverse(ox, oy, ox + ux * reach, oy + uy * reach, (cx, cy) => {
      if (cx === sx && cy === sy) return false;
      const c = CELL_INFO[map.kind(cx, cy)].cover;
      if (c > best) best = c;
      return best >= 0.95;
    });
    total += best;
  }
  return total / 3;
}
