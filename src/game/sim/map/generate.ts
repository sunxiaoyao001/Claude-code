import { Rng, fbm, hash2 } from '../../core/rng';
import type { BattleConfig, BattleScale } from '../types';
import { Cell, CELL_INFO, GameMap, Ground, Mat, type Building } from './GameMap';

export function mapSizeFor(scale: BattleScale): number {
  return scale === 10 ? 96 : scale === 15 ? 112 : 128;
}

type Rect = { x0: number; y0: number; x1: number; y1: number };

const FREE = 0;
const KEEP_CLEAR = 1; // roads, spawn, point cores: no obstacles
const USED = 2; // occupied by a placed feature (+ margin)

/**
 * Procedural map builder. Content is generated for the left half (x < N/2) and then
 * copied with a 180° rotation, so both teams always get a mirror-fair battlefield.
 */
class Gen {
  readonly N: number;
  readonly H: number;
  readonly res: Uint8Array;
  readonly yA: number;
  readonly yC: number;

  constructor(
    readonly map: GameMap,
    readonly rng: Rng,
  ) {
    this.N = map.w;
    this.H = map.w / 2;
    this.res = new Uint8Array(map.w * map.h);
    this.yA = Math.round(this.N * 0.24);
    this.yC = this.N - this.yA;
  }

  idx(x: number, y: number) {
    return y * this.N + x;
  }

  inside(x: number, y: number) {
    return x >= 0 && y >= 0 && x < this.N && y < this.N;
  }

  reserve(r: Rect, val: number) {
    for (let y = Math.max(0, r.y0); y < Math.min(this.N, r.y1); y++)
      for (let x = Math.max(0, r.x0); x < Math.min(this.N, r.x1); x++) {
        const i = this.idx(x, y);
        if (this.res[i] < val) this.res[i] = val;
      }
  }

  free(r: Rect, allowKeepClear = false): boolean {
    if (r.x0 < 0 || r.y0 < 0 || r.x1 > this.N || r.y1 > this.N) return false;
    for (let y = r.y0; y < r.y1; y++)
      for (let x = r.x0; x < r.x1; x++) {
        const v = this.res[this.idx(x, y)];
        if (v === USED || (!allowKeepClear && v === KEEP_CLEAR)) return false;
        if (this.map.cells[this.idx(x, y)] !== Cell.Empty) return false;
      }
    return true;
  }

  fillGround(r: Rect, g: Ground) {
    for (let y = Math.max(0, r.y0); y < Math.min(this.N, r.y1); y++)
      for (let x = Math.max(0, r.x0); x < Math.min(this.N, r.x1); x++) this.map.ground[this.idx(x, y)] = g;
  }

  /** Place an obstacle if the cell is free and not kept clear. */
  put(x: number, y: number, kind: Cell, mat: Mat, force = false): boolean {
    if (!this.inside(x, y)) return false;
    const i = this.idx(x, y);
    if (!force && (this.res[i] !== FREE || this.map.cells[i] !== Cell.Empty)) return false;
    this.map.set(x, y, kind, mat);
    this.res[i] = USED;
    return true;
  }

  /** Rasterised thick line of ground. */
  groundLine(x0: number, y0: number, x1: number, y1: number, w: number, g: Ground, keepClear = true) {
    const len = Math.hypot(x1 - x0, y1 - y0);
    const steps = Math.max(1, Math.ceil(len * 2));
    for (let s = 0; s <= steps; s++) {
      const t = s / steps;
      const cx = x0 + (x1 - x0) * t;
      const cy = y0 + (y1 - y0) * t;
      for (let oy = -w; oy <= w; oy++)
        for (let ox = -w; ox <= w; ox++) {
          if (ox * ox + oy * oy > w * w + 0.5) continue;
          const x = Math.floor(cx + ox);
          const y = Math.floor(cy + oy);
          if (!this.inside(x, y)) continue;
          this.map.ground[this.idx(x, y)] = g;
          if (keepClear && this.res[this.idx(x, y)] === FREE) this.res[this.idx(x, y)] = KEEP_CLEAR;
        }
    }
  }

  /**
   * Rectangular building with perimeter walls, windows, doors, optional interior partition
   * and optional ruin damage. Returns the building or null if the area is taken.
   */
  building(
    x0: number,
    y0: number,
    w: number,
    h: number,
    opt: { mat: Mat; floor: Ground; windowEvery?: number; doors?: number; partition?: boolean; ruin?: number },
  ): Building | null {
    const r = { x0, y0, x1: x0 + w, y1: y0 + h };
    if (!this.free(r)) return null;
    const map = this.map;
    const id = map.buildings.length;
    const b: Building = {
      id,
      ...r,
      mat: opt.mat,
      floor: opt.floor,
      roof: true,
      wallCells: 0,
      destroyedCells: 0,
      occupants: 0,
      ruined: false,
    };
    map.buildings.push(b);
    for (let y = y0; y < y0 + h; y++)
      for (let x = x0; x < x0 + w; x++) {
        const edge = x === x0 || y === y0 || x === x0 + w - 1 || y === y0 + h - 1;
        map.set(x, y, edge ? Cell.Wall : Cell.Empty, edge ? opt.mat : Mat.None, id);
        map.ground[this.idx(x, y)] = opt.floor;
      }
    // windows
    const every = opt.windowEvery ?? 3;
    const sides: [number, number, number, number][] = [
      [x0 + 1, y0, 1, 0],
      [x0 + 1, y0 + h - 1, 1, 0],
      [x0, y0 + 1, 0, 1],
      [x0 + w - 1, y0 + 1, 0, 1],
    ];
    for (const [sx, sy, dx, dy] of sides) {
      const len = (dx ? w : h) - 2;
      const phase = this.rng.int(0, every - 1);
      for (let k = 1; k < len - 1; k++) {
        if ((k + phase) % every === 0) map.set(sx + dx * k, sy + dy * k, Cell.Window, opt.mat, id);
      }
    }
    // doors: pick sides, prefer sides facing open (reserved/keep-clear) cells
    const doorCount = opt.doors ?? (w * h > 70 ? 3 : 2);
    const sideOrder = this.rng.shuffle([0, 1, 2, 3]);
    let placed = 0;
    for (const s of sideOrder) {
      if (placed >= doorCount) break;
      const [sx, sy, dx, dy] = sides[s];
      const len = (dx ? w : h) - 2;
      if (len < 3) continue;
      const k = this.rng.int(1, len - 2);
      const dw = len >= 7 && this.rng.chance(0.5) ? 2 : 1;
      const nx = s === 2 ? -1 : s === 3 ? 1 : 0;
      const ny = s === 0 ? -1 : s === 1 ? 1 : 0;
      for (let d = 0; d < dw; d++) {
        const cx = sx + dx * (k + d);
        const cy = sy + dy * (k + d);
        map.set(cx, cy, Cell.Empty, Mat.None, id);
        map.ground[this.idx(cx, cy)] = opt.floor;
        // make sure the doorstep is walkable
        const ox = cx + nx;
        const oy = cy + ny;
        if (this.inside(ox, oy) && CELL_INFO[map.kind(ox, oy)].blocksMove && map.bld[this.idx(ox, oy)] < 0) {
          map.set(ox, oy, Cell.Empty);
        }
      }
      placed++;
    }
    // interior partition for big buildings
    if (opt.partition && (w >= 10 || h >= 10)) {
      if (w >= h) {
        const px = x0 + Math.floor(w / 2) + this.rng.int(-1, 1);
        const gap = this.rng.int(y0 + 2, y0 + h - 4);
        for (let y = y0 + 1; y < y0 + h - 1; y++) if (y !== gap && y !== gap + 1) map.set(px, y, Cell.Wall, opt.mat, id);
      } else {
        const py = y0 + Math.floor(h / 2) + this.rng.int(-1, 1);
        const gap = this.rng.int(x0 + 2, x0 + w - 4);
        for (let x = x0 + 1; x < x0 + w - 1; x++) if (x !== gap && x !== gap + 1) map.set(x, py, Cell.Wall, opt.mat, id);
      }
    }
    // ruin damage
    if (opt.ruin && opt.ruin > 0) {
      b.ruined = true;
      b.roof = false;
      for (let y = y0; y < y0 + h; y++)
        for (let x = x0; x < x0 + w; x++) {
          const k = map.kind(x, y);
          if ((k === Cell.Wall || k === Cell.Window) && this.rng.chance(opt.ruin)) map.set(x, y, Cell.Rubble, Mat.None, id);
          else if (k === Cell.Empty && this.rng.chance(opt.ruin * 0.25)) map.set(x, y, Cell.Rubble, Mat.None, id);
        }
    }
    this.reserve({ x0: x0 - 1, y0: y0 - 1, x1: x0 + w + 1, y1: y0 + h + 1 }, USED);
    return b;
  }

  /** Organic clump grown by random walk. */
  cluster(cx: number, cy: number, count: number, kind: Cell, mat: Mat | (() => Mat), spread = 1, density = 1) {
    let x = cx;
    let y = cy;
    let placed = 0;
    for (let i = 0; i < count * 4 && placed < count; i++) {
      if (this.rng.chance(density)) {
        const m = typeof mat === 'function' ? mat() : mat;
        if (this.put(x, y, kind, m)) placed++;
      }
      x += this.rng.int(-spread, spread);
      y += this.rng.int(-spread, spread);
      if (Math.hypot(x - cx, y - cy) > Math.sqrt(count) * 1.6) {
        x = cx + this.rng.int(-1, 1);
        y = cy + this.rng.int(-1, 1);
      }
    }
    return placed;
  }

  /** A line of obstacles (sandbags, barriers, low walls…). */
  line(x0: number, y0: number, x1: number, y1: number, kind: Cell, mat: Mat, force = false) {
    const steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
    for (let s = 0; s <= steps; s++) {
      const x = Math.round(x0 + ((x1 - x0) * s) / Math.max(1, steps));
      const y = Math.round(y0 + ((y1 - y0) * s) / Math.max(1, steps));
      this.put(x, y, kind, mat, force);
    }
  }

  /** U-shaped sandbag emplacement opening away from `facing`. */
  emplacement(cx: number, cy: number, facing: number, mat = Mat.Sandbag) {
    const fx = Math.round(Math.cos(facing));
    const fy = Math.round(Math.sin(facing));
    // front wall perpendicular to facing
    const px = -fy;
    const py = fx;
    for (let k = -1; k <= 1; k++) this.put(cx + fx + px * k, cy + fy + py * k, Cell.Low, mat, true);
    if (this.rng.chance(0.6)) {
      this.put(cx + px * 2, cy + py * 2, Cell.Low, mat, true);
      this.put(cx - px * 2, cy - py * 2, Cell.Low, mat, true);
    }
  }

  /** Wrecked vehicle occupying two cells along an axis. */
  wreck(x: number, y: number, horizontal: boolean, mat: Mat) {
    const x2 = horizontal ? x + 1 : x;
    const y2 = horizontal ? y : y + 1;
    if (!this.inside(x2, y2)) return false;
    const i1 = this.idx(x, y);
    const i2 = this.idx(x2, y2);
    if (this.map.cells[i1] !== Cell.Empty || this.map.cells[i2] !== Cell.Empty) return false;
    if (this.res[i1] === USED || this.res[i2] === USED) return false;
    this.map.set(x, y, Cell.Wreck, mat);
    this.map.set(x2, y2, Cell.Wreck, mat);
    // the variant byte stores orientation + which half (renderer draws one sprite for the pair)
    this.map.vari[i1] = horizontal ? 1 : 3;
    this.map.vari[i2] = horizontal ? 2 : 4;
    this.res[i1] = USED;
    this.res[i2] = USED;
    return true;
  }

  // ---------------------------------------------------------------------------

  mirror() {
    const { N, H, map } = this;
    const remap = new Map<number, number>();
    const original = [...map.buildings];
    for (const b of original) {
      if (b.x1 <= H) {
        const nb: Building = {
          ...b,
          id: map.buildings.length,
          x0: N - b.x1,
          x1: N - b.x0,
          y0: N - b.y1,
          y1: N - b.y0,
        };
        map.buildings.push(nb);
        remap.set(b.id, nb.id);
      } else {
        remap.set(b.id, b.id);
      }
    }
    for (let y = 0; y < N; y++)
      for (let x = 0; x < H; x++) {
        const i = this.idx(x, y);
        const j = this.idx(N - 1 - x, N - 1 - y);
        map.cells[j] = map.cells[i];
        map.mat[j] = map.mat[i];
        map.hp[j] = map.hp[i];
        map.ground[j] = map.ground[i];
        const b = map.bld[i];
        map.bld[j] = b >= 0 ? (remap.get(b) ?? -1) : -1;
        const v = map.vari[i];
        // wreck halves swap when rotated 180°
        map.vari[j] = v === 1 ? 2 : v === 2 ? 1 : v === 3 ? 4 : v === 4 ? 3 : v;
        this.res[j] = this.res[i];
      }
  }

  /** Apply the same cell edit to a cell and its mirror. */
  setSym(x: number, y: number, kind: Cell, mat = Mat.None) {
    const keepBld = (cx: number, cy: number) => this.map.bld[this.idx(cx, cy)];
    this.map.set(x, y, kind, mat, keepBld(x, y));
    const mx = this.N - 1 - x;
    const my = this.N - 1 - y;
    this.map.set(mx, my, kind, mat, keepBld(mx, my));
  }

  /** BFS over infantry-walkable cells. */
  reach(sx: number, sy: number): Uint8Array {
    const { N, map } = this;
    const seen = new Uint8Array(N * N);
    const q = new Int32Array(N * N);
    let qh = 0;
    let qt = 0;
    const s = this.idx(sx, sy);
    seen[s] = 1;
    q[qt++] = s;
    while (qh < qt) {
      const c = q[qh++];
      const cx = c % N;
      const cy = (c / N) | 0;
      for (let d = 0; d < 4; d++) {
        const nx = cx + (d === 0 ? 1 : d === 1 ? -1 : 0);
        const ny = cy + (d === 2 ? 1 : d === 3 ? -1 : 0);
        if (nx < 0 || ny < 0 || nx >= N || ny >= N) continue;
        const ni = this.idx(nx, ny);
        if (seen[ni] || CELL_INFO[map.cells[ni] as Cell].blocksMove) continue;
        seen[ni] = 1;
        q[qt++] = ni;
      }
    }
    return seen;
  }

  /** Carve a corridor (symmetrically) from the nearest reachable cell to a target. */
  carveTo(seen: Uint8Array, tx: number, ty: number) {
    const { N } = this;
    let best = -1;
    let bestD = Infinity;
    for (let i = 0; i < N * N; i++) {
      if (!seen[i]) continue;
      const d = Math.hypot((i % N) - tx, ((i / N) | 0) - ty);
      if (d < bestD) {
        bestD = d;
        best = i;
      }
    }
    if (best < 0) return;
    let x = best % N;
    let y = (best / N) | 0;
    while (x !== tx || y !== ty) {
      if (x !== tx && (y === ty || this.rng.chance(0.5))) x += Math.sign(tx - x);
      else y += Math.sign(ty - y);
      if (CELL_INFO[this.map.kind(x, y)].blocksMove) this.setSym(x, y, this.map.bld[this.idx(x, y)] >= 0 ? Cell.Rubble : Cell.Empty);
    }
  }

  finalize() {
    const { N, map, rng } = this;
    // spawn zones
    const sy0 = Math.round(N / 2 - 10);
    const sy1 = Math.round(N / 2 + 10);
    map.spawns = [
      { x0: 2, y0: sy0, x1: 10, y1: sy1, facing: 0 },
      { x0: N - 10, y0: N - sy1, x1: N - 2, y1: N - sy0, facing: Math.PI },
    ];
    map.points = [
      { id: 0, label: 'A', x: N / 2, y: this.yA, r: 7 },
      { id: 1, label: 'B', x: N / 2, y: N / 2, r: 7 },
      { id: 2, label: 'C', x: N / 2, y: this.yC, r: 7 },
    ];
    // keep point cores and spawn interiors walkable
    for (const p of map.points)
      for (let y = Math.floor(p.y - 1.5); y <= Math.ceil(p.y + 0.5); y++)
        for (let x = Math.floor(p.x - 1.5); x <= Math.ceil(p.x + 0.5); x++)
          if (map.inBounds(x, y) && CELL_INFO[map.kind(x, y)].blocksMove) this.setSym(x, y, Cell.Empty);
    const s0 = map.spawns[0];
    for (let y = s0.y0; y < s0.y1; y++)
      for (let x = s0.x0; x < s0.x1; x++) if (map.kind(x, y) !== Cell.Empty) this.setSym(x, y, Cell.Empty);
    // map border is solid rock-free but impassable for physics; nothing to do here.
    // connectivity
    for (let pass = 0; pass < 4; pass++) {
      const seen = this.reach(Math.floor((s0.x0 + s0.x1) / 2), Math.floor((s0.y0 + s0.y1) / 2));
      const targets = [
        [Math.floor(N - 6), Math.floor(N / 2)],
        ...map.points.map((p) => [Math.floor(p.x), Math.floor(p.y)]),
      ];
      let ok = true;
      for (const [tx, ty] of targets) {
        if (!seen[this.idx(tx, ty)]) {
          ok = false;
          this.carveTo(seen, tx, ty);
        }
      }
      if (ok) break;
    }
    // building bookkeeping
    for (const b of map.buildings) {
      b.wallCells = 0;
      for (let y = b.y0; y < b.y1; y++)
        for (let x = b.x0; x < b.x1; x++) {
          const i = this.idx(x, y);
          if (map.bld[i] !== b.id) continue;
          const k = map.cells[i];
          if (k === Cell.Wall || k === Cell.Window) b.wallCells++;
        }
    }
    // per-cell variation byte (preserve wreck orientation codes)
    for (let i = 0; i < N * N; i++) {
      if (map.cells[i] === Cell.Wreck) continue;
      map.vari[i] = (rng.next() * 256) | 0;
    }
  }
}

// -----------------------------------------------------------------------------
// Biomes
// -----------------------------------------------------------------------------

function genUrban(g: Gen) {
  const { N, H, map, rng, yA, yC } = g;
  // base: rubble-strewn lots
  for (let y = 0; y < N; y++)
    for (let x = 0; x < H; x++) {
      const n = fbm(x * 0.09, y * 0.09, map.seed);
      map.ground[g.idx(x, y)] = n > 0.62 ? Ground.Dirt : n > 0.45 ? Ground.Gravel : Ground.Concrete;
    }
  const roadW = 2;
  const vx1 = 15;
  const vx2 = H - 12;
  // horizontal avenues through A, B, C
  for (const ry of [yA, N / 2, yC]) {
    g.fillGround({ x0: 0, y0: Math.floor(ry - roadW - 1), x1: H, y1: Math.floor(ry + roadW + 1) }, Ground.Sidewalk);
    g.fillGround({ x0: 0, y0: Math.floor(ry - roadW), x1: H, y1: Math.floor(ry + roadW) }, Ground.Asphalt);
    g.reserve({ x0: 0, y0: Math.floor(ry - roadW - 1), x1: H, y1: Math.floor(ry + roadW + 1) }, KEEP_CLEAR);
  }
  // vertical streets
  for (const rx of [vx1, vx2]) {
    g.fillGround({ x0: rx - 1, y0: 0, x1: rx + roadW * 2 + 1, y1: N }, Ground.Sidewalk);
    g.fillGround({ x0: rx, y0: 0, x1: rx + roadW * 2, y1: N }, Ground.Asphalt);
    g.reserve({ x0: rx - 1, y0: 0, x1: rx + roadW * 2 + 1, y1: N }, KEEP_CLEAR);
  }
  // crosswalk stripes near intersections
  for (const ry of [yA, N / 2, yC])
    for (const rx of [vx1, vx2]) {
      for (let y = Math.floor(ry - roadW); y < Math.floor(ry + roadW); y++) {
        map.ground[g.idx(rx - 2, y)] = Ground.Crosswalk;
        map.ground[g.idx(rx + roadW * 2 + 1, y)] = Ground.Crosswalk;
      }
    }
  // central plaza around B
  const plaza = { x0: H - 8, y0: N / 2 - 8, x1: H + 8, y1: N / 2 + 8 };
  g.fillGround(plaza, Ground.Tile);
  g.reserve(plaza, KEEP_CLEAR);
  // squares at A and C on the centre column
  for (const py of [yA, yC]) {
    const sq = { x0: H - 6, y0: py - 6, x1: H + 6, y1: py + 6 };
    g.fillGround(sq, Ground.Concrete);
    g.reserve(sq, KEEP_CLEAR);
  }
  // spawn staging lot
  g.fillGround({ x0: 0, y0: N / 2 - 11, x1: 12, y1: N / 2 + 11 }, Ground.Concrete);
  g.reserve({ x0: 0, y0: N / 2 - 11, x1: 12, y1: N / 2 + 11 }, KEEP_CLEAR);

  // city blocks
  const cols: [number, number][] = [
    [1, vx1 - 1],
    [vx1 + roadW * 2 + 1, vx2 - 1],
    [vx2 + roadW * 2 + 1, H],
  ];
  const rows: [number, number][] = [
    [1, yA - roadW - 1],
    [yA + roadW + 1, N / 2 - roadW - 1],
    [N / 2 + roadW + 1, yC - roadW - 1],
    [yC + roadW + 1, N - 1],
  ];
  for (const [cx0, cx1] of cols)
    for (const [ry0, ry1] of rows) {
      const bw = cx1 - cx0;
      const bh = ry1 - ry0;
      if (bw < 5 || bh < 5) continue;
      // sidewalk ring
      g.fillGround({ x0: cx0, y0: ry0, x1: cx1, y1: ry1 }, Ground.Sidewalk);
      g.fillGround({ x0: cx0 + 1, y0: ry0 + 1, x1: cx1 - 1, y1: ry1 - 1 }, rng.chance(0.5) ? Ground.Concrete : Ground.Gravel);
      const park = rng.chance(0.18);
      if (park) {
        g.fillGround({ x0: cx0 + 1, y0: ry0 + 1, x1: cx1 - 1, y1: ry1 - 1 }, Ground.Grass);
        for (let k = 0; k < (bw * bh) / 14; k++)
          g.put(rng.int(cx0 + 1, cx1 - 2), rng.int(ry0 + 1, ry1 - 2), Cell.Tree, Mat.DeadTree);
        continue;
      }
      for (let attempt = 0; attempt < 30; attempt++) {
        const w = rng.int(6, Math.min(13, bw - 1));
        const h = rng.int(6, Math.min(12, bh - 1));
        if (w > bw - 1 || h > bh - 1) continue;
        const x0 = rng.int(cx0 + 1, cx1 - w);
        const y0 = rng.int(ry0 + 1, ry1 - h);
        const mat = rng.chance(0.55) ? Mat.Brick : Mat.Concrete;
        g.building(x0, y0, w, h, {
          mat,
          floor: mat === Mat.Brick ? Ground.Plank : Ground.Tile,
          windowEvery: rng.pick([2, 3, 3]),
          partition: true,
          ruin: rng.chance(0.2) ? rng.range(0.2, 0.45) : 0,
        });
      }
      // clutter in alleys
      for (let k = 0; k < 4; k++) {
        const x = rng.int(cx0 + 1, cx1 - 2);
        const y = rng.int(ry0 + 1, ry1 - 2);
        g.put(x, y, Cell.Low, rng.pick([Mat.Crate, Mat.Crate, Mat.Barrel, Mat.Sandbag]));
      }
    }

  // street furniture: wrecked cars & barricades
  const roadSpots: [number, number, boolean][] = [];
  for (const ry of [yA, N / 2, yC]) for (let x = 13; x < H - 2; x += rng.int(7, 12)) roadSpots.push([x, Math.floor(ry + rng.int(-2, 0)), true]);
  for (const rx of [vx1, vx2]) for (let y = 4; y < N - 4; y += rng.int(9, 15)) roadSpots.push([rx + rng.int(0, 2), y, false]);
  for (const [x, y, hor] of roadSpots) {
    if (rng.chance(0.6)) g.wreck(x, y, hor, rng.chance(0.75) ? Mat.Car : Mat.Truck);
    else if (hor) g.line(x, y, x, y + 1, Cell.Low, Mat.Barrier, true);
    else g.line(x, y, x + 1, y, Cell.Low, Mat.Barrier, true);
  }
  // plaza monument + emplacements
  g.line(H - 2, N / 2 - 3, H - 1, N / 2 - 3, Cell.Low, Mat.Barrier, true);
  g.line(H - 5, N / 2 + 2, H - 5, N / 2 + 4, Cell.Low, Mat.Sandbag, true);
  g.put(H - 3, N / 2 - 6, Cell.Tree, Mat.DeadTree, true);
  g.put(H - 7, N / 2 + 6, Cell.Tree, Mat.DeadTree, true);
  g.emplacement(H - 6, N / 2 - 1, 0);
  for (const py of [yA, yC]) {
    g.emplacement(H - 4, py - 3, 0);
    g.emplacement(H - 3, py + 3, 0);
    g.line(H - 1, py - 5, H - 1, py - 4, Cell.Low, Mat.Barrier, true);
  }
}

function genDesert(g: Gen) {
  const { N, H, map, rng, yA, yC } = g;
  for (let y = 0; y < N; y++)
    for (let x = 0; x < H; x++) {
      const n = fbm(x * 0.06, y * 0.06, map.seed);
      const m = fbm(x * 0.15 + 40, y * 0.15, map.seed + 7);
      map.ground[g.idx(x, y)] = n > 0.6 ? Ground.SandDark : m > 0.68 ? Ground.Gravel : Ground.Sand;
    }
  // dirt tracks: spawn -> A, spawn -> B, spawn -> C
  const sx = 8;
  const sy = N / 2;
  g.groundLine(sx, sy, H, yA, 1.4, Ground.Dirt);
  g.groundLine(sx, sy, H, sy, 1.4, Ground.Dirt);
  g.groundLine(sx, sy, H, yC, 1.4, Ground.Dirt);
  g.groundLine(H - 14, 2, H - 14, N - 2, 1.0, Ground.Dirt);
  g.reserve({ x0: 0, y0: N / 2 - 11, x1: 12, y1: N / 2 + 11 }, KEEP_CLEAR);
  for (const p of [yA, N / 2, yC]) g.reserve({ x0: H - 3, y0: p - 3, x1: H + 3, y1: p + 3 }, KEEP_CLEAR);

  // adobe villages: one near the centre, one near A/C lines
  const villages: [number, number][] = [
    [H - 16, N / 2 - 14],
    [H - 18, yA + 4],
    [H - 20, yC - 12],
    [22, yA - 6],
    [24, yC + 2],
  ];
  for (const [vx, vy] of villages) {
    const houses = rng.int(2, 4);
    for (let k = 0; k < houses; k++) {
      for (let attempt = 0; attempt < 12; attempt++) {
        const w = rng.int(5, 8);
        const h = rng.int(5, 8);
        const x0 = Math.round(vx + rng.int(-6, 6));
        const y0 = Math.round(vy + rng.int(-6, 6));
        if (x0 + w > H - 1) continue;
        if (g.building(x0, y0, w, h, { mat: Mat.Adobe, floor: Ground.Dirt, windowEvery: 3, doors: 2, ruin: rng.chance(0.25) ? 0.3 : 0 })) break;
      }
    }
    // courtyard low walls
    const cx = Math.round(vx + rng.int(-3, 3));
    const cy = Math.round(vy + rng.int(-3, 3));
    const len = rng.int(4, 7);
    if (rng.chance(0.5)) g.line(cx, cy, Math.min(H - 1, cx + len), cy, Cell.Low, Mat.Adobe);
    else g.line(cx, cy, cx, cy + len, Cell.Low, Mat.Adobe);
    // palms
    for (let k = 0; k < rng.int(2, 5); k++) g.put(Math.round(vx + rng.int(-8, 8)), Math.round(vy + rng.int(-8, 8)), Cell.Tree, Mat.Palm);
  }
  // rock outcrops
  for (let k = 0; k < Math.round(N / 12); k++) {
    const x = rng.int(12, H - 4);
    const y = rng.int(4, N - 5);
    g.cluster(x, y, rng.int(4, 13), Cell.Rock, Mat.Rock, 1, 0.9);
  }
  // scattered dead trees
  for (let k = 0; k < N / 6; k++) g.put(rng.int(10, H - 2), rng.int(2, N - 3), Cell.Tree, Mat.DeadTree);
  // wrecks on tracks
  for (let k = 0; k < 4; k++) g.wreck(rng.int(14, H - 8), rng.pick([yA + 2, N / 2 + 2, yC - 3, rng.int(8, N - 8)]), rng.chance(0.5), rng.chance(0.5) ? Mat.Truck : Mat.Car);
  // fortifications around points
  g.emplacement(H - 5, N / 2 - 2, 0);
  g.emplacement(H - 4, N / 2 + 4, 0);
  for (const py of [yA, yC]) {
    g.emplacement(H - 5, py, 0);
    g.line(H - 2, py - 5, H - 1, py - 5, Cell.Low, Mat.Sandbag, true);
    g.line(H - 2, py + 5, H - 1, py + 5, Cell.Low, Mat.Sandbag, true);
  }
  // crates and barrels near villages
  for (let k = 0; k < N / 8; k++) g.put(rng.int(12, H - 2), rng.int(3, N - 4), Cell.Low, rng.pick([Mat.Crate, Mat.Barrel, Mat.Sandbag]));
}

function genSnow(g: Gen) {
  const { N, H, map, rng, yA, yC } = g;
  for (let y = 0; y < N; y++)
    for (let x = 0; x < H; x++) {
      const n = fbm(x * 0.07, y * 0.07, map.seed);
      map.ground[g.idx(x, y)] = n > 0.66 ? Ground.SnowPacked : Ground.Snow;
    }
  // frozen ponds
  for (const [px, py, r] of [
    [H - 20, N / 2 + 6, 5],
    [26, yA - 4, 4],
  ] as [number, number, number][]) {
    for (let y = py - r - 1; y <= py + r + 1; y++)
      for (let x = px - r - 2; x <= px + r + 2; x++) {
        const d = Math.hypot((x - px) / 1.25, y - py);
        if (g.inside(x, y) && x < H && d < r + fbm(x * 0.4, y * 0.4, map.seed) * 1.5) map.ground[g.idx(x, y)] = Ground.Ice;
      }
  }
  // tracks
  g.groundLine(8, N / 2, H, N / 2, 1.3, Ground.SnowPacked);
  g.groundLine(8, N / 2, H - 6, yA, 1.1, Ground.SnowPacked);
  g.groundLine(8, N / 2, H - 6, yC, 1.1, Ground.SnowPacked);
  g.reserve({ x0: 0, y0: N / 2 - 11, x1: 12, y1: N / 2 + 11 }, KEEP_CLEAR);
  for (const p of [yA, N / 2, yC]) g.reserve({ x0: H - 4, y0: p - 4, x1: H + 4, y1: p + 4 }, KEEP_CLEAR);

  // central stone lodge straddling B (self-symmetric footprint), with roomy interior
  const lodge = g.building(H - 6, N / 2 - 5, 12, 10, { mat: Mat.Stone, floor: Ground.Plank, windowEvery: 2, doors: 4, partition: false });
  if (lodge) {
    // extra doors on the west side so the left half (which is mirrored) is well connected
    map.set(H - 6, N / 2 - 1, Cell.Empty, Mat.None, lodge.id);
    map.set(H - 6, N / 2, Cell.Empty, Mat.None, lodge.id);
    map.set(H - 3, N / 2 - 5, Cell.Empty, Mat.None, lodge.id);
    map.set(H - 2, N / 2 + 4, Cell.Empty, Mat.None, lodge.id);
  }
  // pine forests
  for (let k = 0; k < Math.round(N / 20); k++) {
    const fx = rng.int(14, H - 6);
    const fy = rng.int(6, N - 7);
    const r = rng.int(4, 8);
    for (let y = fy - r; y <= fy + r; y++)
      for (let x = fx - r; x <= fx + r; x++) {
        if (x >= H - 1 || !g.inside(x, y)) continue;
        const d = Math.hypot(x - fx, y - fy) / r;
        if (d < 1 && hash2(x, y, map.seed) < 0.42 * (1 - d * 0.6) && rng.chance(0.85)) g.put(x, y, Cell.Tree, Mat.Pine);
      }
  }
  // cabins
  const spots: [number, number][] = [
    [H - 18, yA - 4],
    [H - 17, yC - 6],
    [20, yA + 6],
    [20, yC - 10],
    [H - 24, N / 2 - 9],
  ];
  for (const [vx, vy] of spots)
    for (let attempt = 0; attempt < 10; attempt++) {
      const w = rng.int(5, 8);
      const h = rng.int(5, 7);
      const x0 = vx + rng.int(-4, 4);
      const y0 = vy + rng.int(-4, 4);
      if (x0 + w > H - 1) continue;
      if (g.building(x0, y0, w, h, { mat: Mat.Wood, floor: Ground.Plank, windowEvery: 3, doors: 2, ruin: rng.chance(0.2) ? 0.3 : 0 })) break;
    }
  // boulders
  for (let k = 0; k < N / 10; k++) g.cluster(rng.int(12, H - 3), rng.int(3, N - 4), rng.int(1, 5), Cell.Rock, Mat.Rock, 1, 0.9);
  // log piles & sandbags
  for (let k = 0; k < N / 9; k++) g.put(rng.int(12, H - 2), rng.int(3, N - 4), Cell.Low, rng.pick([Mat.Logs, Mat.Logs, Mat.Crate]));
  g.emplacement(H - 9, N / 2 - 3, 0);
  g.emplacement(H - 9, N / 2 + 3, 0);
  for (const py of [yA, yC]) {
    g.emplacement(H - 5, py - 2, 0);
    g.line(H - 3, py + 4, H - 1, py + 4, Cell.Low, Mat.Logs, true);
  }
  for (let k = 0; k < 3; k++) g.wreck(rng.int(14, H - 8), rng.int(6, N - 7), rng.chance(0.5), Mat.Truck);
}

export function generateMap(config: BattleConfig): GameMap {
  const N = mapSizeFor(config.scale);
  const map = new GameMap(N, config.biome, config.seed);
  const rng = new Rng((config.seed ^ 0x51a7e) >>> 0);
  const g = new Gen(map, rng);
  if (config.biome === 'urban') genUrban(g);
  else if (config.biome === 'desert') genDesert(g);
  else genSnow(g);
  g.mirror();
  g.finalize();
  return map;
}
