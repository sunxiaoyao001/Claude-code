// Procedural human brain geometry, shared by the fold precompute script (Node) and the renderer.
// Pure math, no imports: runs under `node --experimental-strip-types` and in the Remotion bundle.
// Axes: x = lateral (right +), y = up, z = anterior (frontal pole +). Brain length ≈ 1.7 units.

export type V3 = [number, number, number];

// ---------- seeded simplex noise (3D) ----------
const F3 = 1 / 3;
const G3 = 1 / 6;
const GRAD: number[] = [1, 1, 0, -1, 1, 0, 1, -1, 0, -1, -1, 0, 1, 0, 1, -1, 0, 1, 1, 0, -1, -1, 0, -1, 0, 1, 1, 0, -1, 1, 0, 1, -1, 0, -1, -1];

export const makeNoise3 = (seed: number) => {
  const perm = new Uint8Array(512);
  const p = new Uint8Array(256);
  for (let i = 0; i < 256; i++) p[i] = i;
  let s = seed >>> 0 || 1;
  for (let i = 255; i > 0; i--) {
    s = (s * 1664525 + 1013904223) >>> 0;
    const j = s % (i + 1);
    const t = p[i];
    p[i] = p[j];
    p[j] = t;
  }
  for (let i = 0; i < 512; i++) perm[i] = p[i & 255];
  return (x: number, y: number, z: number): number => {
    const s0 = (x + y + z) * F3;
    const i = Math.floor(x + s0);
    const j = Math.floor(y + s0);
    const k = Math.floor(z + s0);
    const t0 = (i + j + k) * G3;
    const x0 = x - (i - t0);
    const y0 = y - (j - t0);
    const z0 = z - (k - t0);
    let i1, j1, k1, i2, j2, k2;
    if (x0 >= y0) {
      if (y0 >= z0) [i1, j1, k1, i2, j2, k2] = [1, 0, 0, 1, 1, 0];
      else if (x0 >= z0) [i1, j1, k1, i2, j2, k2] = [1, 0, 0, 1, 0, 1];
      else [i1, j1, k1, i2, j2, k2] = [0, 0, 1, 1, 0, 1];
    } else if (y0 < z0) [i1, j1, k1, i2, j2, k2] = [0, 0, 1, 0, 1, 1];
    else if (x0 < z0) [i1, j1, k1, i2, j2, k2] = [0, 1, 0, 0, 1, 1];
    else [i1, j1, k1, i2, j2, k2] = [0, 1, 0, 1, 1, 0];
    const x1 = x0 - i1 + G3, y1 = y0 - j1 + G3, z1 = z0 - k1 + G3;
    const x2 = x0 - i2 + 2 * G3, y2 = y0 - j2 + 2 * G3, z2 = z0 - k2 + 2 * G3;
    const x3 = x0 - 1 + 3 * G3, y3 = y0 - 1 + 3 * G3, z3 = z0 - 1 + 3 * G3;
    const ii = i & 255, jj = j & 255, kk = k & 255;
    let n = 0;
    const corner = (gx: number, gy: number, gz: number, h: number) => {
      let t = 0.6 - gx * gx - gy * gy - gz * gz;
      if (t < 0) return 0;
      const g = (h % 12) * 3;
      t *= t;
      return t * t * (GRAD[g] * gx + GRAD[g + 1] * gy + GRAD[g + 2] * gz);
    };
    n += corner(x0, y0, z0, perm[ii + perm[jj + perm[kk]]]);
    n += corner(x1, y1, z1, perm[ii + i1 + perm[jj + j1 + perm[kk + k1]]]);
    n += corner(x2, y2, z2, perm[ii + i2 + perm[jj + j2 + perm[kk + k2]]]);
    n += corner(x3, y3, z3, perm[ii + 1 + perm[jj + 1 + perm[kk + 1]]]);
    return 32 * n;
  };
};

// ---------- icosphere with shared vertices ----------
export const makeIcosphere = (freq: number) => {
  const t = (1 + Math.sqrt(5)) / 2;
  const base: V3[] = [
    [-1, t, 0], [1, t, 0], [-1, -t, 0], [1, -t, 0],
    [0, -1, t], [0, 1, t], [0, -1, -t], [0, 1, -t],
    [t, 0, -1], [t, 0, 1], [-t, 0, -1], [-t, 0, 1],
  ];
  const faces = [
    [0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11],
    [1, 5, 9], [5, 11, 4], [11, 10, 2], [10, 7, 6], [7, 1, 8],
    [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9],
    [4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1],
  ];
  const pos: number[] = [];
  const idx: number[] = [];
  const keyMap = new Map<string, number>();
  const vert = (x: number, y: number, z: number) => {
    const l = Math.hypot(x, y, z);
    x /= l; y /= l; z /= l;
    const key = `${Math.round(x * 1e5)},${Math.round(y * 1e5)},${Math.round(z * 1e5)}`;
    const found = keyMap.get(key);
    if (found !== undefined) return found;
    const id = pos.length / 3;
    pos.push(x, y, z);
    keyMap.set(key, id);
    return id;
  };
  for (const [a, b, c] of faces) {
    const A = base[a], B = base[b], Cc = base[c];
    const grid: number[][] = [];
    for (let i = 0; i <= freq; i++) {
      grid[i] = [];
      for (let j = 0; j <= freq - i; j++) {
        const u = i / freq, v = j / freq, w = 1 - u - v;
        grid[i][j] = vert(
          A[0] * w + B[0] * u + Cc[0] * v,
          A[1] * w + B[1] * u + Cc[1] * v,
          A[2] * w + B[2] * u + Cc[2] * v,
        );
      }
    }
    for (let i = 0; i < freq; i++) {
      for (let j = 0; j < freq - i; j++) {
        idx.push(grid[i][j], grid[i + 1][j], grid[i][j + 1]);
        if (j < freq - i - 1) idx.push(grid[i + 1][j], grid[i + 1][j + 1], grid[i][j + 1]);
      }
    }
  }
  return {pos: new Float32Array(pos), idx: new Uint32Array(idx)};
};

// ---------- implicit hemisphere shape ----------
const smin = (a: number, b: number, k: number) => {
  const h = Math.max(k - Math.abs(a - b), 0) / k;
  return Math.min(a, b) - h * h * k * 0.25;
};
const smax = (a: number, b: number, k: number) => -smin(-a, -b, k);
const ell = (x: number, y: number, z: number, c: V3, r: V3) => {
  const k = Math.hypot((x - c[0]) / r[0], (y - c[1]) / r[1], (z - c[2]) / r[2]);
  return (k - 1) * Math.min(r[0], r[1], r[2]);
};

/** Signed distance (approx.) of the RIGHT hemisphere; mirror x for the left one. */
export const hemiSDF = (x: number, y: number, z: number) => {
  // Dome + frontal lobe share a flattened orbital underside that rises toward the frontal pole.
  let f = ell(x, y, z, [0.35, 0.08, -0.07], [0.38, 0.53, 0.8]);
  f = smin(f, ell(x, y, z, [0.29, 0.06, 0.37], [0.31, 0.43, 0.47]), 0.12);
  const orbital = -0.27 + 0.32 * Math.max(0, z - 0.12) - y;
  f = smax(f, z > -0.05 ? orbital : -1, 0.08);
  f = smin(f, ell(x, y, z, [0.31, 0.03, -0.44], [0.31, 0.43, 0.43]), 0.12); // occipital
  f = smin(f, ell(x, y, z, [0.42, -0.25, -0.06], [0.27, 0.235, 0.44]), 0.07); // temporal lobe
  f = smax(f, 0.002 - x, 0.022); // medial wall: hemispheres almost touch
  f = smax(f, -0.52 - y, 0.12);
  return f;
};

export const HEMI_CENTER: V3 = [0.33, 0.0, -0.02];
const RAY_SCALE: V3 = [0.36, 0.5, 0.84];

/** Star-projects the unit icosphere onto the hemisphere surface. */
export const shapeHemisphere = (unit: Float32Array) => {
  const n = unit.length / 3;
  const out = new Float32Array(unit.length);
  for (let i = 0; i < n; i++) {
    let dx = unit[i * 3] * RAY_SCALE[0];
    let dy = unit[i * 3 + 1] * RAY_SCALE[1];
    let dz = unit[i * 3 + 2] * RAY_SCALE[2];
    const l = Math.hypot(dx, dy, dz);
    dx /= l; dy /= l; dz /= l;
    let lo = 0, hi = 1.4;
    for (let it = 0; it < 32; it++) {
      const m = (lo + hi) / 2;
      const f = hemiSDF(HEMI_CENTER[0] + dx * m, HEMI_CENTER[1] + dy * m, HEMI_CENTER[2] + dz * m);
      if (f < 0) lo = m;
      else hi = m;
    }
    const r = (lo + hi) / 2;
    out[i * 3] = HEMI_CENTER[0] + dx * r;
    out[i * 3 + 1] = HEMI_CENTER[1] + dy * r;
    out[i * 3 + 2] = HEMI_CENTER[2] + dz * r;
  }
  return out;
};

// ---------- landmark fissures (lateral view, z/y plane) ----------
const distToPolyline = (pz: number, py: number, pts: [number, number][]) => {
  let best = 1e9;
  for (let i = 0; i < pts.length - 1; i++) {
    const [az, ay] = pts[i];
    const [bz, by] = pts[i + 1];
    const vz = bz - az, vy = by - ay;
    const t = Math.max(0, Math.min(1, ((pz - az) * vz + (py - ay) * vy) / (vz * vz + vy * vy)));
    const d = Math.hypot(pz - az - vz * t, py - ay - vy * t);
    if (d < best) best = d;
  }
  return best;
};
const SYLVIAN: [number, number][] = [[0.34, -0.2], [0.2, -0.14], [0.04, -0.09], [-0.12, -0.05], [-0.24, 0.0], [-0.31, 0.09]];
const CENTRAL: [number, number][] = [[-0.1, 0.6], [-0.06, 0.46], [-0.01, 0.3], [0.04, 0.16], [0.07, 0.04], [0.1, -0.04]];

/** 0..1 strength of the major fissures at a surface point (right-hemisphere coordinates). */
export const fissure = (x: number, y: number, z: number) => {
  const lateral = Math.max(0, Math.min(1, (x - 0.2) / 0.16));
  const syl = Math.exp(-((distToPolyline(z, y, SYLVIAN) / 0.03) ** 2)) * lateral;
  const upper = Math.max(0, Math.min(1, (x - 0.03) / 0.08));
  const cen = Math.exp(-((distToPolyline(z, y, CENTRAL) / 0.02) ** 2)) * upper * (y > -0.06 ? 1 : 0);
  return {syl, cen};
};

// ---------- reaction–diffusion on the mesh (precompute) ----------
export const buildAdjacency = (idx: Uint32Array, n: number) => {
  const sets: Set<number>[] = new Array(n);
  for (let i = 0; i < n; i++) sets[i] = new Set();
  for (let t = 0; t < idx.length; t += 3) {
    const a = idx[t], b = idx[t + 1], c = idx[t + 2];
    sets[a].add(b); sets[a].add(c);
    sets[b].add(a); sets[b].add(c);
    sets[c].add(a); sets[c].add(b);
  }
  const offs = new Uint32Array(n + 1);
  for (let i = 0; i < n; i++) offs[i + 1] = offs[i] + sets[i].size;
  const nbr = new Uint32Array(offs[n]);
  for (let i = 0; i < n; i++) {
    let k = offs[i];
    for (const j of sets[i]) nbr[k++] = j;
  }
  return {offs, nbr};
};

export type RDOptions = {
  iterations: number;
  cell: number; // pattern scale: grid-cell size in world units
  feed?: number;
  kill?: number;
  seed?: number;
  pin?: (i: number) => number; // 0..1: how strongly vertex i is held in the "sulcus" state
};

/** Gray–Scott on a triangle mesh. Returns v (pattern) per vertex, normalised to 0..1. */
export const reactionDiffusion = (pos: Float32Array, idx: Uint32Array, opt: RDOptions) => {
  const n = pos.length / 3;
  const {offs, nbr} = buildAdjacency(idx, n);
  const w = new Float32Array(nbr.length);
  for (let i = 0; i < n; i++) {
    for (let k = offs[i]; k < offs[i + 1]; k++) {
      const j = nbr[k];
      const d2 = (pos[i * 3] - pos[j * 3]) ** 2 + (pos[i * 3 + 1] - pos[j * 3 + 1]) ** 2 + (pos[i * 3 + 2] - pos[j * 3 + 2]) ** 2;
      const deg = offs[i + 1] - offs[i];
      w[k] = ((4 / deg) * (opt.cell * opt.cell)) / Math.max(d2, 1e-12);
    }
  }
  const F = opt.feed ?? 0.029;
  const K = opt.kill ?? 0.057;
  const Du = 0.2, Dv = 0.1, dt = 1.0;
  // Keep explicit Euler stable at dt = 1: cap each vertex's total weight (Du·dt·2·Σw < 2).
  for (let i = 0; i < n; i++) {
    let sum = 0;
    for (let k = offs[i]; k < offs[i + 1]; k++) sum += w[k];
    if (sum > 4.4) for (let k = offs[i]; k < offs[i + 1]; k++) w[k] *= 4.4 / sum;
  }
  let u = new Float32Array(n).fill(1);
  let v = new Float32Array(n);
  let u2 = new Float32Array(n);
  let v2 = new Float32Array(n);
  const noise = makeNoise3(opt.seed ?? 7);
  for (let i = 0; i < n; i++) {
    const s = noise(pos[i * 3] * 40, pos[i * 3 + 1] * 40, pos[i * 3 + 2] * 40);
    if (s > 0.3) {
      v[i] = 0.5;
      u[i] = 0.5;
    }
  }
  const pin = new Float32Array(n);
  if (opt.pin) for (let i = 0; i < n; i++) pin[i] = opt.pin(i);
  for (let it = 0; it < opt.iterations; it++) {
    for (let i = 0; i < n; i++) {
      let lu = 0, lv = 0;
      const ui = u[i], vi = v[i];
      for (let k = offs[i]; k < offs[i + 1]; k++) {
        const j = nbr[k];
        lu += w[k] * (u[j] - ui);
        lv += w[k] * (v[j] - vi);
      }
      const uvv = ui * vi * vi;
      let nu = ui + dt * (Du * lu - uvv + F * (1 - ui));
      let nv = vi + dt * (Dv * lv + uvv - (F + K) * vi);
      const p = pin[i];
      if (p > 0) {
        nu = nu + (0.32 - nu) * p;
        nv = nv + (0.3 - nv) * p;
      }
      u2[i] = nu;
      v2[i] = nv;
    }
    [u, u2] = [u2, u];
    [v, v2] = [v2, v];
  }
  let lo = Infinity, hi = -Infinity;
  for (let i = 0; i < n; i++) {
    lo = Math.min(lo, v[i]);
    hi = Math.max(hi, v[i]);
  }
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) out[i] = (v[i] - lo) / (hi - lo || 1);
  return out;
};

export const ICO_FREQ = 110;
