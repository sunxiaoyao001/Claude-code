import type { Vec2 } from '../../core/math';
import type { NavGrid } from './NavGrid';

export interface PathResult {
  points: Vec2[];
  complete: boolean;
  expanded: number;
}

const SQRT2 = Math.SQRT2;
const DX = [1, -1, 0, 0, 1, 1, -1, -1];
const DY = [0, 0, 1, -1, 1, -1, 1, -1];

/**
 * Grid A* (8-connected, no corner cutting) over typed arrays. Search state is
 * reused between calls through a generation stamp, so no per-search clearing.
 */
export class Pathfinder {
  private readonly g: Float32Array;
  private readonly parent: Int32Array;
  private readonly openStamp: Uint32Array;
  private readonly closedStamp: Uint32Array;
  private heapIdx: Int32Array;
  private heapF: Float32Array;
  private heapSize = 0;
  private gen = 0;
  readonly w: number;
  readonly h: number;

  constructor(readonly nav: NavGrid) {
    this.w = nav.w;
    this.h = nav.h;
    const n = nav.w * nav.h;
    this.g = new Float32Array(n);
    this.parent = new Int32Array(n);
    this.openStamp = new Uint32Array(n);
    this.closedStamp = new Uint32Array(n);
    this.heapIdx = new Int32Array(4096);
    this.heapF = new Float32Array(4096);
  }

  private push(i: number, f: number) {
    if (this.heapSize >= this.heapIdx.length) {
      const ni = new Int32Array(this.heapIdx.length * 2);
      ni.set(this.heapIdx);
      const nf = new Float32Array(this.heapF.length * 2);
      nf.set(this.heapF);
      this.heapIdx = ni;
      this.heapF = nf;
    }
    let k = this.heapSize++;
    const hi = this.heapIdx;
    const hf = this.heapF;
    while (k > 0) {
      const p = (k - 1) >> 1;
      if (hf[p] <= f) break;
      hi[k] = hi[p];
      hf[k] = hf[p];
      k = p;
    }
    hi[k] = i;
    hf[k] = f;
  }

  private pop(): number {
    const hi = this.heapIdx;
    const hf = this.heapF;
    const top = hi[0];
    const n = --this.heapSize;
    if (n > 0) {
      const li = hi[n];
      const lf = hf[n];
      let k = 0;
      for (;;) {
        let c = 2 * k + 1;
        if (c >= n) break;
        if (c + 1 < n && hf[c + 1] < hf[c]) c++;
        if (hf[c] >= lf) break;
        hi[k] = hi[c];
        hf[k] = hf[c];
        k = c;
      }
      hi[k] = li;
      hf[k] = lf;
    }
    return top;
  }

  /** Nearest passable cell to (x, y) within a small radius, or -1. */
  nearestPassable(layer: 'inf' | 'tank', x: number, y: number, maxR = 6): number {
    const cost = layer === 'inf' ? this.nav.inf : this.nav.tank;
    const cx = Math.floor(x);
    const cy = Math.floor(y);
    if (cx >= 0 && cy >= 0 && cx < this.w && cy < this.h && cost[cy * this.w + cx] > 0) return cy * this.w + cx;
    let best = -1;
    let bestD = Infinity;
    for (let r = 1; r <= maxR; r++) {
      for (let yy = cy - r; yy <= cy + r; yy++)
        for (let xx = cx - r; xx <= cx + r; xx++) {
          if (Math.max(Math.abs(xx - cx), Math.abs(yy - cy)) !== r) continue;
          if (xx < 0 || yy < 0 || xx >= this.w || yy >= this.h) continue;
          const i = yy * this.w + xx;
          if (cost[i] <= 0) continue;
          const d = (xx + 0.5 - x) ** 2 + (yy + 0.5 - y) ** 2;
          if (d < bestD) {
            bestD = d;
            best = i;
          }
        }
      if (best >= 0) return best;
    }
    return -1;
  }

  find(layer: 'inf' | 'tank', sx: number, sy: number, gx: number, gy: number, maxExpand = 12000): PathResult | null {
    const cost = layer === 'inf' ? this.nav.inf : this.nav.tank;
    const w = this.w;
    const start = this.nearestPassable(layer, sx, sy, 3);
    const goal = this.nearestPassable(layer, gx, gy, 8);
    if (start < 0 || goal < 0) return null;
    if (start === goal) return { points: [{ x: gx, y: gy }], complete: true, expanded: 0 };

    const gen = ++this.gen;
    this.heapSize = 0;
    const gxC = goal % w;
    const gyC = (goal / w) | 0;
    const heur = (i: number) => {
      const dx = Math.abs((i % w) - gxC);
      const dy = Math.abs(((i / w) | 0) - gyC);
      return dx > dy ? dx + (SQRT2 - 1) * dy : dy + (SQRT2 - 1) * dx;
    };
    this.g[start] = 0;
    this.parent[start] = -1;
    this.openStamp[start] = gen;
    this.push(start, heur(start));
    let expanded = 0;
    let bestNode = start;
    let bestH = heur(start);
    let found = false;

    while (this.heapSize > 0) {
      const cur = this.pop();
      if (this.closedStamp[cur] === gen) continue;
      this.closedStamp[cur] = gen;
      if (cur === goal) {
        found = true;
        break;
      }
      if (++expanded > maxExpand) break;
      const cx = cur % w;
      const cy = (cur / w) | 0;
      const hCur = heur(cur);
      if (hCur < bestH) {
        bestH = hCur;
        bestNode = cur;
      }
      const gCur = this.g[cur];
      for (let d = 0; d < 8; d++) {
        const nx = cx + DX[d];
        const ny = cy + DY[d];
        if (nx < 0 || ny < 0 || nx >= w || ny >= this.h) continue;
        const ni = ny * w + nx;
        const c = cost[ni];
        if (c <= 0 || this.closedStamp[ni] === gen) continue;
        let step = 1;
        if (d >= 4) {
          // no corner cutting
          if (cost[cy * w + nx] <= 0 || cost[ny * w + cx] <= 0) continue;
          step = SQRT2;
        }
        const ng = gCur + step * c;
        if (this.openStamp[ni] === gen && ng >= this.g[ni]) continue;
        this.openStamp[ni] = gen;
        this.g[ni] = ng;
        this.parent[ni] = cur;
        this.push(ni, ng + heur(ni) * 1.001);
      }
    }

    const end = found ? goal : bestNode;
    const cells: number[] = [];
    for (let c = end; c >= 0; c = this.parent[c]) {
      cells.push(c);
      if (c === start) break;
    }
    cells.reverse();
    const pts = this.smooth(layer, cells);
    if (found) {
      // replace the final cell centre with the exact goal when it is reachable
      const gcx = Math.floor(gx);
      const gcy = Math.floor(gy);
      if (gcx + gcy * w === goal) pts[pts.length - 1] = { x: gx, y: gy };
    }
    return { points: pts, complete: found, expanded };
  }

  /** Greedy string pulling: keep only waypoints needed to stay on passable cells. */
  private smooth(layer: 'inf' | 'tank', cells: number[]): Vec2[] {
    const w = this.w;
    const out: Vec2[] = [];
    if (cells.length === 0) return out;
    let anchor = 0;
    let i = 1;
    while (i < cells.length) {
      let next = i;
      // extend as far as a straight line remains clear (cap lookahead for speed)
      for (let j = Math.min(cells.length - 1, anchor + 24); j > i; j--) {
        if (this.clearLine(layer, cells[anchor], cells[j])) {
          next = j;
          break;
        }
      }
      out.push({ x: (cells[next] % w) + 0.5, y: ((cells[next] / w) | 0) + 0.5 });
      anchor = next;
      i = next + 1;
    }
    if (out.length === 0) out.push({ x: (cells[0] % w) + 0.5, y: ((cells[0] / w) | 0) + 0.5 });
    return out;
  }

  /** Is the straight segment between two cell centres passable (with body clearance)? */
  clearLine(layer: 'inf' | 'tank', a: number, b: number): boolean {
    const w = this.w;
    const ax = (a % w) + 0.5;
    const ay = ((a / w) | 0) + 0.5;
    const bx = (b % w) + 0.5;
    const by = ((b / w) | 0) + 0.5;
    return this.clearSegment(layer, ax, ay, bx, by, layer === 'inf' ? 0.38 : 1.2);
  }

  clearSegment(layer: 'inf' | 'tank', ax: number, ay: number, bx: number, by: number, clearance: number): boolean {
    const cost = layer === 'inf' ? this.nav.inf : this.nav.tank;
    const w = this.w;
    const len = Math.hypot(bx - ax, by - ay);
    if (len < 1e-4) return true;
    const nx = -(by - ay) / len;
    const ny = (bx - ax) / len;
    const steps = Math.ceil(len / 0.35);
    // a straight segment must not be costlier per cell than the start cell (keeps tanks on roads)
    const baseCost = layer === 'tank' ? Math.max(1.05, cost[Math.floor(ay) * w + Math.floor(ax)] + 0.05) : Infinity;
    for (let s = 0; s <= steps; s++) {
      const t = s / steps;
      const px = ax + (bx - ax) * t;
      const py = ay + (by - ay) * t;
      for (let o = -1; o <= 1; o++) {
        const qx = Math.floor(px + nx * clearance * o);
        const qy = Math.floor(py + ny * clearance * o);
        if (qx < 0 || qy < 0 || qx >= w || qy >= this.h) return false;
        const c = cost[qy * w + qx];
        if (c <= 0 || c > baseCost) return false;
      }
    }
    return true;
  }
}
