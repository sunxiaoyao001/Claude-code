import * as THREE from 'three';
import { Sky } from 'three/addons/objects/Sky.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { mergeGeometries, mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';

// =====================================================================
//  Utilities
// =====================================================================
function mulberry32(a) {
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
let RNG = mulberry32(19110628);
const rand = () => RNG();
const rr = (a, b) => a + (b - a) * RNG();
const ri = (a, b) => Math.floor(a + (b - a + 1) * RNG());
const pick = (arr) => arr[Math.floor(RNG() * arr.length)];
const chance = (p) => RNG() < p;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const smoothstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
function hash2(x, z) {
  let h = Math.imul(x | 0, 374761393) + Math.imul(z | 0, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
function vnoise(x, z) {
  const ix = Math.floor(x), iz = Math.floor(z), fx = x - ix, fz = z - iz;
  const ux = fx * fx * (3 - 2 * fx), uz = fz * fz * (3 - 2 * fz);
  const a = hash2(ix, iz), b = hash2(ix + 1, iz), c = hash2(ix, iz + 1), d = hash2(ix + 1, iz + 1);
  return lerp(lerp(a, b, ux), lerp(c, d, ux), uz);
}
function fbm(x, z, oct = 4) {
  let s = 0, a = 0.5, f = 1;
  for (let i = 0; i < oct; i++) { s += a * vnoise(x * f, z * f); f *= 2.03; a *= 0.5; }
  return s;
}
function weighted(obj) { // {key:weight}
  let t = 0; for (const k in obj) t += obj[k];
  let r = RNG() * t;
  for (const k in obj) { r -= obj[k]; if (r <= 0) return k; }
  return Object.keys(obj)[0];
}
const sleepFrame = () => new Promise((r) => requestAnimationFrame(() => r()));

// ---- 2D polygon helpers (polys are arrays of [x,z]) ----
function polyArea(p) { let a = 0; for (let i = 0; i < p.length; i++) { const q = p[i], r = p[(i + 1) % p.length]; a += q[0] * r[1] - r[0] * q[1]; } return a / 2; }
function polyCentroid(p) { let x = 0, z = 0; for (const q of p) { x += q[0]; z += q[1]; } return [x / p.length, z / p.length]; }
function rectPoly(x0, z0, x1, z1) { return [[x0, z0], [x1, z0], [x1, z1], [x0, z1]]; }
function polyBounds(p) { let a = Infinity, b = Infinity, c = -Infinity, d = -Infinity; for (const q of p) { if (q[0] < a) a = q[0]; if (q[1] < b) b = q[1]; if (q[0] > c) c = q[0]; if (q[1] > d) d = q[1]; } return [a, b, c, d]; }
// keep the part of poly where (p - o)·n >= 0
function clipHalf(poly, ox, oz, nx, nz) {
  const out = [];
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i], b = poly[(i + 1) % poly.length];
    const da = (a[0] - ox) * nx + (a[1] - oz) * nz, db = (b[0] - ox) * nx + (b[1] - oz) * nz;
    if (da >= 0) out.push(a);
    if ((da >= 0) !== (db >= 0)) { const t = da / (da - db); out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]); }
  }
  return out;
}
function pointInPoly(x, z, p) {
  let ins = false;
  for (let i = 0, j = p.length - 1; i < p.length; j = i++) {
    const xi = p[i][0], zi = p[i][1], xj = p[j][0], zj = p[j][1];
    if ((zi > z) !== (zj > z) && x < (xj - xi) * (z - zi) / (zj - zi) + xi) ins = !ins;
  }
  return ins;
}
// separating axis test for convex polys
function convexOverlap(a, b) {
  for (const P of [a, b]) {
    for (let i = 0; i < P.length; i++) {
      const p = P[i], q = P[(i + 1) % P.length];
      const nx = q[1] - p[1], nz = p[0] - q[0];
      let amin = Infinity, amax = -Infinity, bmin = Infinity, bmax = -Infinity;
      for (const v of a) { const d = v[0] * nx + v[1] * nz; if (d < amin) amin = d; if (d > amax) amax = d; }
      for (const v of b) { const d = v[0] * nx + v[1] * nz; if (d < bmin) bmin = d; if (d > bmax) bmax = d; }
      if (amax <= bmin + 1e-6 || bmax <= amin + 1e-6) return false;
    }
  }
  return true;
}
function insetRect(r, l, t, rgt, b) { return [r[0] + l, r[1] + t, r[2] - rgt, r[3] - b]; }
function orientedRect(cx, cz, dx, dz, halfLen, halfW) { // dir (dx,dz) normalized
  const px = -dz, pz = dx;
  return [
    [cx - dx * halfLen - px * halfW, cz - dz * halfLen - pz * halfW],
    [cx + dx * halfLen - px * halfW, cz + dz * halfLen - pz * halfW],
    [cx + dx * halfLen + px * halfW, cz + dz * halfLen + pz * halfW],
    [cx - dx * halfLen + px * halfW, cz - dz * halfLen + pz * halfW],
  ];
}

// =====================================================================
//  Geography — grid-aligned frame. +x = east (toward the East River),
//  -z = north (uptown). 1 unit = 1 meter. 5th Avenue is x = 0,
//  Houston Street is z = 0, numbered streets every 79 m.
// =====================================================================
const SP = 79;
const zN = (n) => -n * SP;
const nOfZ = (z) => -z / SP;
const WIDE = new Set([14, 23, 34, 42, 57, 59, 72, 79, 86, 96, 106, 110, 116, 125, 135, 145, 155, 165, 175, 181, 191, 207]);

// Manhattan shoreline in the grid frame: [z, xWest, xEast]
const OUTLINE = [
  [-17560, -925, -895], [-17450, -985, -830], [-17100, -1120, -760], [-16600, -1240, -700], [-15800, -1300, -640],
  [-15000, -1270, -680], [-14062, -1320, -520], [-13000, -1380, -330], [-12245, -1450, -150], [-11500, -1530, 90],
  [-10900, -1580, 380], [-10300, -1630, 680], [-9875, -1650, 920], [-9500, -1640, 1000], [-8690, -1640, 1060],
  [-8000, -1640, 1080], [-7500, -1660, 1170], [-7000, -1690, 1260], [-5700, -1720, 1290], [-4661, -1780, 1250],
  [-4000, -1800, 1190], [-3318, -1810, 1150], [-2686, -1800, 1150], [-2000, -1760, 1300], [-1600, -1740, 1450],
  [-1300, -1720, 1560], [-1106, -1700, 1640], [-800, -1640, 1680], [-400, -1560, 1700], [0, -1470, 1720],
  [300, -1330, 1650], [600, -1180, 1400], [900, -1050, 1150], [1240, -900, 900], [1700, -790, 760],
  [2000, -720, 620], [2250, -680, 500], [2400, -680, 430], [2650, -640, 330], [2850, -560, 120], [2950, -280, -120],
];
const Z_MIN = OUTLINE[0][0], Z_MAX = OUTLINE[OUTLINE.length - 1][0];
const SHORE_STEP = 10;
const SHORE_W = new Float32Array(Math.ceil((Z_MAX - Z_MIN) / SHORE_STEP) + 2);
const SHORE_E = new Float32Array(SHORE_W.length);
(function buildShoreLUT() {
  let k = 0;
  for (let i = 0; i < SHORE_W.length; i++) {
    const z = Z_MIN + i * SHORE_STEP;
    while (k < OUTLINE.length - 2 && OUTLINE[k + 1][0] < z) k++;
    const a = OUTLINE[k], b = OUTLINE[Math.min(k + 1, OUTLINE.length - 1)];
    const t = clamp((z - a[0]) / Math.max(1, b[0] - a[0]), 0, 1);
    SHORE_W[i] = lerp(a[1], b[1], t); SHORE_E[i] = lerp(a[2], b[2], t);
  }
})();
function shoreW(z) { const f = (clamp(z, Z_MIN, Z_MAX) - Z_MIN) / SHORE_STEP, i = Math.floor(f); return lerp(SHORE_W[i], SHORE_W[i + 1], f - i); }
function shoreE(z) { const f = (clamp(z, Z_MIN, Z_MAX) - Z_MIN) / SHORE_STEP, i = Math.floor(f); return lerp(SHORE_E[i], SHORE_E[i + 1], f - i); }
function inManhattan(x, z, m = 0) { return z >= Z_MIN && z <= Z_MAX && x > shoreW(z) + m && x < shoreE(z) - m; }
function shoreRange(z0, z1, fnW) { // max West / min East over [z0,z1]
  let w = -Infinity, e = Infinity;
  for (let i = 0; i <= 6; i++) { const z = lerp(z0, z1, i / 6); w = Math.max(w, shoreW(z)); e = Math.min(e, shoreE(z)); }
  return [w, e];
}

// New Jersey shore (land is x < njX(z)) and Brooklyn / Queens / Bronx shore (land is x > ebX(z))
const NJ = [[-24000, -2300], [-17600, -2300], [-14062, -2440], [-10000, -2850], [-6000, -2900], [-2686, -2950], [0, -2600], [1700, -2000], [3000, -1950], [4500, -1650], [6000, -1550], [9000, -1700], [14000, -2200]];
const EB = [[-24000, -950], [-17700, -950], [-17560, -880]]; // Bronx north of Spuyten Duyvil, then follows Harlem River
function interpTable(T, z) {
  if (z <= T[0][0]) return T[0][1];
  for (let i = 0; i < T.length - 1; i++) if (z <= T[i + 1][0]) return lerp(T[i][1], T[i + 1][1], (z - T[i][0]) / (T[i + 1][0] - T[i][0]));
  return T[T.length - 1][1];
}
const njX = (z) => interpTable(NJ, z);
const BQ = [[-9200, 1500], [-7500, 1600], [-6000, 1700], [-4661, 1700], [-3300, 1750], [-2000, 1950], [-1000, 2100], [0, 2100], [500, 2000], [1000, 1700], [1500, 1400], [2000, 1180], [2700, 900], [3300, 700], [4200, 900], [6000, 2200], [9000, 3500]];
function ebX(z) {
  if (z < -17560) return -950;
  if (z < -9800) return shoreE(z) + 170;            // Harlem River ~170 m wide
  if (z < -9200) return lerp(shoreE(z) + 170, 1500, (z + 9800) / 600);
  return interpTable(BQ, z);
}
const ISLANDS = [
  { name: 'Liberty Island', poly: [[-1010, 5250], [-830, 5200], [-760, 5330], [-860, 5460], [-1020, 5420]] },
  { name: 'Ellis Island', poly: [[-1330, 4650], [-1150, 4640], [-1140, 4800], [-1320, 4820]] },
  { name: 'Governors Island', poly: [[160, 3450], [520, 3380], [760, 3650], [640, 4250], [300, 4300], [120, 3900]] },
  { name: 'Roosevelt Island', poly: [[1300, -3300], [1360, -3320], [1440, -4400], [1460, -5600], [1400, -6750], [1350, -6760], [1320, -5600], [1290, -4400]] },
  { name: "Randall's Island", poly: [[1120, -9050], [1500, -9150], [1650, -9600], [1500, -10350], [1150, -10250], [1100, -9600]] },
];
function landAt(x, z) {
  if (inManhattan(x, z)) return 'MN';
  if (x < njX(z)) return 'NJ';
  if (x > ebX(z)) return 'EB';
  if (z > 2950 && z < 2960 && x > -400 && x < 0) return null;
  for (const I of ISLANDS) { const b = I.bb || (I.bb = polyBounds(I.poly)); if (x > b[0] && x < b[2] && z > b[1] && z < b[3] && pointInPoly(x, z, I.poly)) return I.name; }
  return null;
}

// ---------------- Street grid ----------------
function mkLine(x, w, segsN, dir, opts = {}) {
  return Object.assign({ x, w, dir, segs: segsN.map(([a, b, name]) => ({ z0: zN(b), z1: zN(a), name })) }, opts);
}
function mkLineZ(x, w, segsZ, dir, opts = {}) {
  return Object.assign({ x, w, dir, segs: segsZ.map(([z0, z1, name]) => ({ z0, z1, name })) }, opts);
}
// dir: -1 northbound (toward -z), +1 southbound, 0 two-way
const AVES = [
  mkLine(-1500, 30, [[12, 59, '11 Av'], [59, 107, 'West End Av']], 0),
  mkLine(-1256, 30, [[13, 59, '10 Av'], [59, 155, 'Amsterdam Av']], -1),
  mkLine(-1012, 30, [[14, 59, '9 Av'], [59, 110, 'Columbus Av'], [110, 124, 'Manhattan Av']], 1),
  mkLine(-768, 30, [[14, 59, '8 Av'], [59, 110, 'Central Park W'], [110, 155, 'Frederick Douglass Blvd']], -1, { bike: true }),
  mkLine(-524, 30, [[0, 14, '7 Av S'], [14, 59, '7 Av'], [110, 155, 'Adam C Powell Blvd']], 1, { bus: true }),
  mkLine(-280, 30, [[0, 59, '6 Av'], [110, 147, 'Lenox Av']], -1, { bike: true }),
  mkLine(0, 30, [[6, 142, '5 Av']], 1, { bus: true }),
  mkLine(128, 24, [[23, 138, 'Madison Av']], -1, { bus: true }),
  mkLine(250, 30, [[0, 8, 'Lafayette St'], [8, 14, '4 Av'], [17, 32, 'Park Av S'], [32, 132, 'Park Av']], 0, { median: [46, 96] }),
  mkLine(373, 24, [[21, 131, 'Lexington Av']], 1),
  mkLine(501, 30, [[0, 129, '3 Av']], -1, { bus: true }),
  mkLine(699, 30, [[0, 128, '2 Av']], 1, { bike: true }),
  mkLine(897, 30, [[0, 127, '1 Av']], -1, { bike: true, bus: true }),
  mkLine(1095, 24, [[60, 92, 'York Av']], 0),
  mkLine(1070, 22, [[0, 14, 'Av A']], 0),
  mkLine(1245, 22, [[0, 14, 'Av B']], 0),
  mkLine(1420, 22, [[0, 14, 'Av C']], 0),
  mkLine(1595, 22, [[0, 10, 'Av D']], 0),
  mkLine(-400, 18, [[0, 8, 'MacDougal St']], 1),
  mkLine(-800, 18, [[0, 14, 'Hudson St']], -1),
  mkLine(-1050, 18, [[0, 13, 'Greenwich St']], 1),
  mkLine(-1300, 18, [[0, 12, 'Washington St']], -1),
  // Washington Heights & Inwood
  mkLine(-1180, 24, [[155, 190, 'Fort Washington Av']], 0),
  mkLine(-820, 24, [[155, 193, 'Amsterdam Av']], 0),
  mkLine(-650, 24, [[155, 193, 'St Nicholas Av']], 0),
  mkLine(-1150, 22, [[200, 218, 'Seaman Av']], 0),
  mkLine(-780, 22, [[200, 216, '10 Av']], 0),
];
// Downtown (south of Houston) — denser, irregular-feeling grid
const DOWN_X = [
  mkLineZ(60, 16, [[0, 600, 'Mercer St']], 1),
  mkLineZ(-30, 16, [[0, 600, 'Greene St']], -1),
  mkLineZ(-130, 20, [[0, 1570, 'W Broadway']], 1),
  mkLineZ(-240, 24, [[0, 580, '6 Av'], [580, 2400, 'Church St']], -1),
  mkLineZ(-420, 22, [[0, 900, 'Varick St']], 1),
  mkLineZ(-560, 20, [[0, 1300, 'Hudson St']], -1),
  mkLineZ(-700, 18, [[0, 1560, 'Greenwich St']], 1),
  mkLineZ(-860, 18, [[0, 1000, 'Washington St']], -1),
  mkLineZ(250, 22, [[0, 1250, 'Lafayette St']], 1),
  mkLineZ(340, 16, [[0, 1150, 'Mulberry St']], -1),
  mkLineZ(420, 16, [[0, 1150, 'Mott St']], 1),
  mkLineZ(500, 16, [[0, 900, 'Elizabeth St']], -1),
  mkLineZ(590, 26, [[0, 1250, 'Bowery']], 0),
  mkLineZ(760, 18, [[0, 1250, 'Forsyth St']], 1),
  mkLineZ(840, 18, [[0, 1250, 'Eldridge St']], -1),
  mkLineZ(930, 28, [[0, 1100, 'Allen St']], 0),
  mkLineZ(1010, 16, [[0, 950, 'Orchard St']], -1),
  mkLineZ(1090, 16, [[0, 950, 'Ludlow St']], 1),
  mkLineZ(1170, 20, [[0, 950, 'Essex St']], 0),
  mkLineZ(1250, 16, [[0, 800, 'Norfolk St']], -1),
  mkLineZ(1330, 16, [[0, 700, 'Suffolk St']], 1),
  mkLineZ(1410, 18, [[0, 700, 'Clinton St']], 0),
  mkLineZ(1490, 16, [[0, 500, 'Attorney St']], 1),
  mkLineZ(1570, 16, [[0, 400, 'Ridge St']], -1),
  mkLineZ(110, 16, [[1300, 2300, 'Nassau St']], 1),
  mkLineZ(220, 16, [[1400, 2600, 'William St']], -1),
  mkLineZ(340, 18, [[1650, 2700, 'Pearl St']], 1),
  mkLineZ(440, 22, [[1900, 2700, 'Water St']], 0),
];
const DOWN_Z = [
  { z: 0, w: 30, name: 'Houston St' }, { z: 95, w: 16, name: 'Prince St', east: 'Stanton St' }, { z: 190, w: 16, name: 'Spring St', east: 'Rivington St' },
  { z: 290, w: 20, name: 'Broome St', east: 'Delancey St', eastW: 36 }, { z: 390, w: 18, name: 'Grand St' }, { z: 480, w: 16, name: 'Howard St', east: 'Hester St' },
  { z: 580, w: 30, name: 'Canal St' }, { z: 680, w: 16, name: 'Walker St', east: 'Bayard St' }, { z: 760, w: 16, name: 'White St', east: 'Pell St' },
  { z: 840, w: 16, name: 'Franklin St', east: 'Division St' }, { z: 920, w: 16, name: 'Leonard St', east: 'E Broadway' }, { z: 1000, w: 24, name: 'Worth St', east: 'Henry St' },
  { z: 1080, w: 16, name: 'Duane St', east: 'Madison St' }, { z: 1160, w: 16, name: 'Reade St', east: 'Monroe St' }, { z: 1240, w: 24, name: 'Chambers St', east: 'Cherry St' },
  { z: 1320, w: 16, name: 'Warren St' }, { z: 1400, w: 16, name: 'Murray St' }, { z: 1480, w: 16, name: 'Park Pl' },
  { z: 1570, w: 20, name: 'Vesey St' }, { z: 1700, w: 20, name: 'Fulton St' }, { z: 1790, w: 16, name: 'John St' },
  { z: 1880, w: 16, name: 'Maiden Ln' }, { z: 1960, w: 18, name: 'Liberty St' }, { z: 2040, w: 14, name: 'Cedar St' },
  { z: 2120, w: 14, name: 'Pine St' }, { z: 2210, w: 16, name: 'Wall St' }, { z: 2300, w: 14, name: 'Exchange Pl' },
  { z: 2390, w: 16, name: 'Beaver St' }, { z: 2480, w: 14, name: 'Stone St' }, { z: 2570, w: 22, name: 'State St' },
  { z: 2650, w: 20, name: 'Battery Pl' },
];
// Broadway — the old Wickquasgeck trail cutting the grid on a diagonal
const BROADWAY = [
  [-210, 2640], [-90, 1900], [0, 1250], [70, 580], [130, 0], [150, -632], [130, -1106], [0, zN(23)], [-280, zN(34)],
  [-524, zN(45)], [-768, zN(59)], [-1012, zN(65)], [-1256, zN(72)], [-1385, zN(79)], [-1390, zN(110)], [-1390, zN(125)],
  [-1150, zN(155)], [-1000, zN(168)], [-1000, zN(200)], [-930, zN(214)], [-900, zN(222)],
];
const BW_HALF = 13; // half the roadway width
function broadwaySegs() {
  const out = [];
  for (let i = 0; i < BROADWAY.length - 1; i++) {
    const [ax, az] = BROADWAY[i], [bx, bz] = BROADWAY[i + 1];
    const L = Math.hypot(bx - ax, bz - az);
    out.push({ ax, az, bx, bz, L, dx: (bx - ax) / L, dz: (bz - az) / L });
  }
  return out;
}
const BW_SEGS = broadwaySegs();
function broadwayDist(x, z) { // distance to centerline and nearest segment
  let best = Infinity, bs = null, bt = 0;
  for (const s of BW_SEGS) {
    const t = clamp(((x - s.ax) * s.dx + (z - s.az) * s.dz), 0, s.L);
    const px = s.ax + s.dx * t, pz = s.az + s.dz * t;
    const d = Math.hypot(x - px, z - pz);
    if (d < best) { best = d; bs = s; bt = t; }
  }
  return { d: best, seg: bs, t: bt };
}

// Street naming
function streetName(n, x) {
  if (n === 0) return x < 0 ? 'W Houston St' : 'E Houston St';
  if (n === 59 && x > -768 && x < 0) return 'Central Park S';
  if (n === 110 && x > -768 && x < 0) return 'Central Park N';
  if (n === 125) return x < 0 ? 'W 125 St' : 'E 125 St';
  return (x < 0 ? 'W ' : 'E ') + n + ' St';
}
function lineAt(L, z) { for (const s of L.segs) if (z >= s.z0 - 0.5 && z <= s.z1 + 0.5) return s; return null; }

// Neighborhood names
function neighborhood(x, z) {
  const n = nOfZ(z);
  if (!inManhattan(x, z, -30)) {
    if (x < njX(z) + 50) return z > 1500 ? 'Jersey City' : z > -2000 ? 'Hoboken' : z > -9000 ? 'Weehawken' : 'Fort Lee';
    if (x > ebX(z) - 50) return z > 1200 ? 'Brooklyn' : z > -1500 ? 'Williamsburg' : z > -9200 ? 'Queens' : 'The Bronx';
    for (const I of ISLANDS) if (pointInPoly(x, z, I.poly)) return I.name;
    return z > 3000 ? 'Upper New York Bay' : x < 0 ? 'Hudson River' : 'East River';
  }
  if (z > 0) {
    if (z > 2600) return 'Battery Park';
    if (z > 1560) return x < -705 ? 'Battery Park City' : z < 1960 && x < -250 ? 'World Trade Center' : 'Financial District';
    if (z > 1240) return x < -300 ? 'Tribeca' : x < 300 ? 'Civic Center' : x < 900 ? 'Chinatown' : 'Two Bridges';
    if (z > 580) return x < -150 ? 'Tribeca' : x < 600 ? 'Chinatown' : 'Lower East Side';
    return x < -260 ? 'Hudson Square' : x < 250 ? 'SoHo' : x < 600 ? 'Nolita' : 'Lower East Side';
  }
  if (n < 14) return x < -524 ? 'West Village' : x < 250 ? 'Greenwich Village' : x < 1000 ? 'East Village' : 'Alphabet City';
  if (n < 30) {
    if (x < -1100 && n < 16) return 'Meatpacking District';
    return x < -280 ? 'Chelsea' : x < 250 ? 'Flatiron' : x < 897 ? 'Gramercy' : n < 21 ? 'Stuyvesant Town' : 'Kips Bay';
  }
  if (n < 42) return x < -1000 ? 'Hudson Yards' : x < -280 ? 'Garment District' : x < 250 ? (n < 37 ? 'Koreatown' : 'Midtown') : x < 897 ? 'Murray Hill' : 'Kips Bay';
  if (n < 59) return x < -800 ? "Hell's Kitchen" : x < -280 ? 'Theater District' : x < 600 ? 'Midtown' : 'Turtle Bay';
  if (n < 110) {
    if (x < -768) return n < 66 ? 'Lincoln Square' : n < 96 ? 'Upper West Side' : 'Manhattan Valley';
    if (x < 0) return 'Central Park';
    return n > 96 && x > 120 ? 'East Harlem' : n < 72 ? 'Lenox Hill' : n > 79 && n < 96 && x > 600 ? 'Yorkville' : 'Upper East Side';
  }
  if (n < 155) {
    if (x < -1100) return n < 125 ? 'Morningside Heights' : 'Hamilton Heights';
    return x > 250 && n < 132 ? 'East Harlem' : 'Harlem';
  }
  return n < 200 ? 'Washington Heights' : 'Inwood';
}
