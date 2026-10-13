// =====================================================================
//  World store: chunks, solids (collision / walkable), map canvas
// =====================================================================
const CHUNK = 400;
const chunks = new Map();
function chunkKey(cx, cz) { return (cx + 512) * 4096 + (cz + 512); }
function getChunk(x, z) {
  const cx = Math.floor(x / CHUNK), cz = Math.floor(z / CHUNK), k = chunkKey(cx, cz);
  let c = chunks.get(k);
  if (!c) { c = { cx, cz, key: k, bld: [], gnd: [], props: {}, meshes: [], propMeshes: [] }; chunks.set(k, c); }
  return c;
}
function addProp(type, x, z, a = 0, b = 1, c = 0, d = 0, e = 0) {
  const ch = getChunk(x, z); (ch.props[type] || (ch.props[type] = [])).push(x, z, a, b, c, d, e);
}
const STATS = { buildings: 0, blocks: 0, trees: 0, lamps: 0, cars: 0, streets: 0 };

// ---- solids: walkable tops & collision ----
const SOL_CELL = 40;
const solids = [];
const solGrid = new Map();
function addSolid(poly, bottom, top, kind = 'b', topFn = null) {
  const bb = polyBounds(poly);
  const s = { poly, bb, bottom, top, kind, topFn };
  const id = solids.length; solids.push(s);
  const i0 = Math.floor(bb[0] / SOL_CELL), i1 = Math.floor(bb[2] / SOL_CELL), j0 = Math.floor(bb[1] / SOL_CELL), j1 = Math.floor(bb[3] / SOL_CELL);
  for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) {
    const k = (i + 2000) * 8192 + (j + 2000);
    let a = solGrid.get(k); if (!a) { a = []; solGrid.set(k, a); } a.push(id);
  }
  return s;
}
function solidsNear(x, z) { return solGrid.get((Math.floor(x / SOL_CELL) + 2000) * 8192 + (Math.floor(z / SOL_CELL) + 2000)) || null; }

// ---- reserved areas (landmarks, bridges): lots that touch them are skipped ----
const RESERVED = [];
function reserve(poly, name) { RESERVED.push({ poly, bb: polyBounds(poly), name }); }
function reservedHit(poly) {
  const b = polyBounds(poly);
  for (const r of RESERVED) {
    if (b[2] < r.bb[0] || b[0] > r.bb[2] || b[3] < r.bb[1] || b[1] > r.bb[3]) continue;
    if (convexOverlap(poly, r.poly)) return r;
  }
  return null;
}

// ---- map canvas (drawn while generating) ----
const MAP = { x0: -3300, z0: -18300, x1: 2600, z1: 6200, s: 0.2 };
MAP.w = Math.round((MAP.x1 - MAP.x0) * MAP.s); MAP.h = Math.round((MAP.z1 - MAP.z0) * MAP.s);
const mapCanvas = document.createElement('canvas');
mapCanvas.width = MAP.w; mapCanvas.height = MAP.h;
const mctx = mapCanvas.getContext('2d');
mctx.fillStyle = '#2d4553'; mctx.fillRect(0, 0, MAP.w, MAP.h);
function mapPoly(poly, fill) {
  mctx.fillStyle = fill; mctx.beginPath();
  poly.forEach((p, i) => { const X = (p[0] - MAP.x0) * MAP.s, Y = (p[1] - MAP.z0) * MAP.s; i ? mctx.lineTo(X, Y) : mctx.moveTo(X, Y); });
  mctx.closePath(); mctx.fill();
}

// =====================================================================
//  Parks, superblocks and margins
// =====================================================================
const PARKS = [];
const NOROAD = []; // rects where the grid does not run
function park(name, x0, z0, x1, z1, kind = 'square', opts = {}) {
  const p = Object.assign({ name, x0, z0, x1, z1, kind }, opts); PARKS.push(p); NOROAD.push(p); return p;
}
const SUPER = [];
function superblock(name, x0, z0, x1, z1, kind) { const s = { name, x0, z0, x1, z1, kind }; SUPER.push(s); NOROAD.push(s); return s; }
function inRectList(list, x, z, m = 0) { for (const r of list) if (x > r.x0 + m && x < r.x1 - m && z > r.z0 + m && z < r.z1 - m) return r; return null; }

park('Central Park', -753, zN(110) + 15, -15, zN(59) - 15, 'central');
park('Bryant Park', -265, zN(42) + 15, -142, zN(40) - 9, 'bryant');
park('Madison Square Park', 15, zN(26) + 9, 113, zN(23) - 15, 'square');
park('Union Square', 146, zN(17) + 9, 235, zN(14) - 15, 'union');
park('Washington Square Park', -170, -470, 105, -322, 'washsq');
park('Tompkins Square Park', 1081, zN(10) + 9, 1234, zN(7) - 9, 'square');
park('Stuyvesant Square', 510, zN(17) + 9, 690, zN(15) - 9, 'square');
park('Gramercy Park', 262, zN(21) + 9, 361, zN(20) - 9, 'gramercy');
park('Marcus Garvey Park', 15, zN(124) + 9, 113, zN(120) - 9, 'square');
park('Morningside Park', -1240, zN(123) + 9, -1027, zN(110) - 15, 'woods');
park('St. Nicholas Park', -1240, zN(141) + 9, -1027, zN(128) - 9, 'woods');
park('Jackie Robinson Park', -753, zN(155) + 15, -539, zN(145) - 15, 'woods');
park('City Hall Park', 5, 1255, 235, 1565, 'cityhall');
park('Battery Park', -900, 2660, 600, 3200, 'battery');
park('Sara D. Roosevelt Park', 600, 8, 750, 572, 'square');
park('Columbus Park', 360, 760, 495, 912, 'square');
park('Fort Tryon Park', -1400, zN(200) + 9, -1012, zN(190) - 9, 'woods');
park('Inwood Hill Park', -1400, zN(222), -1012, zN(204) - 9, 'woods');
park('Dewitt Clinton Park', -1740, zN(54) + 9, -1515, zN(52) - 9, 'square');
park('Thomas Jefferson Park', 912, zN(114) + 9, 1100, zN(111) - 9, 'square');

superblock('Stuyvesant Town', 912, zN(20) + 9, 1400, zN(14) - 15, 'stuytown');
superblock('United Nations', 912, zN(48) + 9, 1120, zN(42) - 15, 'un');
superblock('Grand Central', 143, zN(46) + 9, 358, zN(42) - 15, 'gct');
superblock('World Trade Center', -680, 1580, -252, 1951, 'wtc');
superblock('Lincoln Center', -1241, zN(66) + 9, -1027, zN(62) - 9, 'lincoln');
superblock('Hudson Yards', -1700, zN(34) + 15, -1271, zN(30) - 9, 'hy');
superblock('Madison Square Garden', -753, zN(33) + 9, -539, zN(31) - 9, 'msg');

function westExtra(n) {
  if (n >= 72 && n < 129) return 150;      // Riverside Park
  if (n >= 155 && n < 186) return 110;     // Fort Washington Park
  return 0;
}
function eastExtra(n) {
  if (n > -1 && n < 12) return 120;        // East River Park
  if (n >= 84 && n < 90) return 90;        // Carl Schurz Park
  if (n >= 155 && n < 196) return 140;     // Highbridge Park
  return 0;
}
const WEST_IN = 45, EAST_IN = 38; // distance from shoreline to first block (highway + esplanade)

// =====================================================================
//  Districts — what the buildings look like where
// =====================================================================
const DT = {
  fidi: { lot: 'office', h: [45, 140], tall: .35, th: [150, 290], st: { masonry: 4, deco: 3, glass: 4 }, store: .5, wt: .05 },
  bpc: { lot: 'office', h: [60, 130], tall: .3, th: [120, 220], st: { glass: 5, masonry: 2, postwar: 2 }, store: .3 },
  civic: { lot: 'office', h: [30, 90], tall: .15, th: [100, 180], st: { masonry: 5, deco: 2, glass: 1 }, store: .4, wt: .2 },
  tribeca: { lot: 'loft', h: [18, 42], st: { loft: 5, masonry: 3, glass: .6 }, store: .7, wt: .35 },
  soho: { lot: 'loft', h: [18, 30], st: { loft: 7, masonry: 2 }, store: 1, wt: .35, fire: .4 },
  hudsq: { lot: 'loft', h: [25, 70], tall: .1, th: [80, 130], st: { loft: 3, masonry: 3, glass: 2 }, store: .5, wt: .3 },
  china: { lot: 'tenement', h: [15, 22], ah: [18, 40], st: { brown: 6, postwar: 1 }, store: 1, fire: .85, wt: .15 },
  les: { lot: 'tenement', h: [15, 22], ah: [18, 45], st: { brown: 6, postwar: 1, glass: .3 }, store: .8, fire: .85, wt: .15 },
  wvill: { lot: 'row', h: [11, 16], ah: [14, 30], st: { brown: 5 }, ast: { brown: 3, masonry: 2 }, store: .35, fire: .25, wt: .15 },
  gvill: { lot: 'row', h: [13, 19], ah: [30, 65], st: { brown: 5 }, ast: { masonry: 4, postwar: 2 }, store: .4, fire: .3, wt: .3 },
  evill: { lot: 'tenement', h: [15, 21], ah: [18, 30], st: { brown: 6 }, store: .85, fire: .85, wt: .15 },
  chelsea: { lot: 'row', h: [13, 18], ah: [25, 60], st: { brown: 5 }, ast: { masonry: 3, postwar: 2, loft: 2 }, store: .4, fire: .5, wt: .25 },
  chelw: { lot: 'loft', h: [22, 55], st: { loft: 3, masonry: 3, glass: 2 }, store: .4, wt: .3 },
  flat: { lot: 'loft', h: [35, 75], tall: .08, th: [90, 160], st: { loft: 3, masonry: 4, deco: 1 }, store: .9, wt: .45 },
  gram: { lot: 'mixed', h: [15, 22], ah: [40, 80], st: { brown: 4 }, ast: { masonry: 3, postwar: 3 }, store: .5, fire: .4, wt: .35 },
  kips: { lot: 'apart', h: [35, 110], st: { postwar: 4, masonry: 2, glass: 1 }, store: .5, wt: .2 },
  garment: { lot: 'loft', h: [45, 95], tall: .12, th: [110, 200], st: { masonry: 5, loft: 2, deco: 1 }, store: .8, wt: .45 },
  ktown: { lot: 'office', h: [40, 100], tall: .15, th: [110, 200], st: { masonry: 4, deco: 2, glass: 2 }, store: .9, wt: .3 },
  murray: { lot: 'mixed', h: [15, 22], ah: [45, 110], st: { brown: 4 }, ast: { postwar: 3, masonry: 3, glass: 1 }, store: .4, fire: .3, wt: .3 },
  midtown: { lot: 'office', h: [60, 170], tall: .45, th: [170, 300], st: { glass: 5, deco: 3, masonry: 3 }, store: .7, wt: .08 },
  mideast: { lot: 'office', h: [50, 150], tall: .3, th: [150, 250], st: { glass: 4, deco: 2, masonry: 3, postwar: 1 }, store: .6, wt: .1 },
  theater: { lot: 'office', h: [40, 140], tall: .35, th: [150, 240], st: { glass: 4, masonry: 3, deco: 2 }, store: 1, wt: .1 },
  hk: { lot: 'tenement', h: [15, 22], ah: [25, 90], st: { brown: 6 }, ast: { postwar: 3, glass: 2, masonry: 2 }, store: .8, fire: .8, wt: .2 },
  turtle: { lot: 'mixed', h: [15, 22], ah: [50, 150], st: { brown: 3 }, ast: { postwar: 3, glass: 2, masonry: 2 }, store: .5, fire: .3, wt: .25 },
  uws: { lot: 'row', h: [14, 19], ah: [40, 70], st: { brown: 6 }, ast: { masonry: 6, postwar: 1 }, store: .3, fire: .2, wt: .45 },
  ues: { lot: 'row', h: [14, 19], ah: [45, 90], st: { brown: 6 }, ast: { masonry: 5, postwar: 3 }, store: .3, fire: .2, wt: .4 },
  yorkv: { lot: 'mixed', h: [15, 22], ah: [60, 140], st: { brown: 5 }, ast: { postwar: 5, glass: 1 }, store: .5, fire: .6, wt: .3 },
  eharlem: { lot: 'tenement', h: [14, 20], ah: [16, 30], st: { brown: 6 }, store: .7, fire: .8, wt: .15, proj: .2 },
  harlem: { lot: 'row', h: [13, 17], ah: [16, 32], st: { brown: 6 }, ast: { brown: 3, masonry: 2 }, store: .4, fire: .35, wt: .15, proj: .07 },
  morning: { lot: 'apart', h: [30, 45], st: { masonry: 6, brown: 1 }, store: .3, wt: .5 },
  hamilton: { lot: 'row', h: [14, 19], ah: [20, 30], st: { brown: 5, masonry: 1 }, store: .3, fire: .4, wt: .2 },
  heights: { lot: 'apart', h: [18, 26], st: { masonry: 4, brown: 3 }, store: .4, wt: .3, fire: .4 },
  park5: { lot: 'apart', h: [50, 85], st: { masonry: 6, deco: 1 }, store: 0, wt: .55 },
  billion: { lot: 'office', h: [80, 200], tall: .5, th: [220, 330], st: { glass: 5, masonry: 2 }, store: .6, wt: 0 },
  jersey: { lot: 'office', h: [20, 60], tall: .12, th: [80, 200], st: { glass: 3, postwar: 3, masonry: 2 }, store: .3, wt: .1 },
  boro: { lot: 'apart', h: [10, 30], tall: .04, th: [50, 140], st: { brown: 3, postwar: 3, masonry: 2, glass: 1 }, store: .2, wt: .15 },
};
function districtAt(x, z) {
  const n = nOfZ(z);
  if (z > 0) {
    if (z > 1560) return x < -560 ? DT.bpc : DT.fidi;
    if (z > 1240) return x < 300 ? DT.civic : DT.china;
    if (z > 580) return x < -150 ? DT.tribeca : x < 250 ? DT.civic : x < 900 ? DT.china : DT.les;
    return x < -300 ? DT.hudsq : x < 300 ? DT.soho : x < 600 ? DT.china : DT.les;
  }
  if (n < 14) return x < -524 ? DT.wvill : x < 250 ? DT.gvill : DT.evill;
  if (n < 30) return x < -1000 ? DT.chelw : x < -280 ? DT.chelsea : x < 250 ? DT.flat : x < 897 ? DT.gram : DT.kips;
  if (n < 42) return x < -1000 ? DT.hk : x < -280 ? DT.garment : x < 250 ? DT.ktown : DT.murray;
  if (n >= 56 && n < 58.5 && x > -900 && x < 400) return DT.billion;
  if (n < 59) return x < -768 ? DT.hk : x < -280 ? DT.theater : x < 600 ? DT.midtown : DT.turtle;
  if (n < 110) {
    if (x < -768) return x > -800 - 230 ? DT.park5 : DT.uws;
    if (x > 0 && x < 140) return n < 96 ? DT.park5 : DT.eharlem;
    if (x > 200 && x < 300 && n < 96) return DT.park5;
    return n > 96 ? DT.eharlem : x > 600 ? DT.yorkv : DT.ues;
  }
  if (n < 155) return x < -1100 ? (n < 125 ? DT.morning : DT.hamilton) : x > 250 && n < 132 ? DT.eharlem : DT.harlem;
  return DT.heights;
}

// =====================================================================
//  Palettes & building specs
// =====================================================================
const PAL = {
  glass: [0x6d8796, 0x4f6878, 0x7f9aa6, 0x5a7385, 0x8fa7b0, 0x3e5260, 0x6f7f7a, 0x8a8f8c, 0x5d6b73, 0x9eb3bd, 0x7a705e],
  masonry: [0xc9bda5, 0xb9ad95, 0xd4cbb7, 0xa89c86, 0x8f4b37, 0x9b5a40, 0x7c4433, 0xb7956d, 0xa0937f, 0xc2b49a, 0x8c8478, 0xd6c6a6],
  brown: [0x6e4636, 0x7a4b38, 0x5e3b2e, 0x8e4a35, 0x9c553c, 0x874332, 0xa35f43, 0x93503a, 0x7f4535, 0xb06a4a],
  deco: [0xcfc5ad, 0xbfb49b, 0xd8cfbb, 0xa99d86, 0xbdb6a6, 0x9c8f7c],
  postwar: [0xe2ddd2, 0xd5cfc2, 0xc4bdb0, 0xb7ae9e, 0x9f5440, 0xa7a39a, 0xc9a98a],
  loft: [0xe3ddcc, 0xcfc6b0, 0xb3ada1, 0xd9c9a3, 0x8e9894, 0xc9b48f, 0xa7a9a6, 0xe8e2d4, 0x9a6b52],
  plain: [0x8a8680, 0x6f6c68, 0x9a958d, 0x5f5d5a, 0x7d776f],
};
const STYLE_ID = { glass: 0, masonry: 1, brown: 2, deco: 3, postwar: 4, loft: 5, plain: 6, civic: 7, grid: 8 };

function pushPiece(poly, y0, y1, base, col, style, seed, flags, houseW = 0) {
  const c = polyCentroid(poly);
  getChunk(c[0], c[1]).bld.push({ p: poly, y0, y1, base, col, st: style, sd: seed, fl: flags, hw: houseW });
}
// A building: list of tiers [{poly, y0, y1}] — registers geometry, collision and the map
function addBuilding(tiers, styleName, opts = {}) {
  const style = typeof styleName === 'number' ? styleName : STYLE_ID[styleName];
  const col = opts.col != null ? opts.col : pick(PAL[styleName] || PAL.masonry);
  const seed = opts.seed != null ? opts.seed : ri(0, 255);
  const base = opts.base || 0;
  let flags = opts.flags || 0;
  let maxTop = 0;
  tiers.forEach((t, i) => {
    let f = flags;
    if (i > 0) f &= ~(2 | 4);          // fire escapes / storefronts only on the base
    pushPiece(t.poly, t.y0, t.y1, base, col, style, seed, f, i === 0 ? (opts.houseW || 0) : 0);
    pushPiece(t.poly, t.y1, t.y1, base, col, style, seed, 1 | (f & 8));  // roof (degenerate walls skipped)
    addSolid(t.poly, t.y0, t.y1, 'b');
    if (t.y1 > maxTop) maxTop = t.y1;
  });
  if (!opts.noMap) {
    const h = maxTop - base;
    const g = Math.round(clamp(150 - h * 0.35, 70, 150));
    mapPoly(tiers[0].poly, `rgb(${g + 18},${g + 14},${g + 8})`);
  }
  STATS.buildings++;
  return { col, seed, top: maxTop };
}

function rectTiers(r, H, styleName, base = 0, shape = null) {
  // r = [x0,z0,x1,z1]
  const W = r[2] - r[0], D = r[3] - r[1];
  const tiers = [];
  const t = (rect, y0, y1) => tiers.push({ poly: rectPoly(rect[0], rect[1], rect[2], rect[3]), y0: base + y0, y1: base + y1 });
  const minD = Math.min(W, D);
  shape = shape || (H < 48 || minD < 18 ? 'box'
    : styleName === 'glass' ? (H > 110 ? pick(['podium', 'podium', 'straight', 'notch']) : pick(['straight', 'podium']))
    : styleName === 'deco' ? (H > 90 ? 'wedding' : 'setback')
    : styleName === 'postwar' ? (H > 70 ? pick(['plaza', 'setback']) : 'box')
    : H > 80 ? pick(['wedding', 'setback', 'podium']) : pick(['box', 'setback']));
  if (shape === 'box' || minD < 14) { t(r, 0, H); return tiers; }
  if (shape === 'straight') { t(r, 0, H); return tiers; }
  if (shape === 'plaza') { const k = Math.min(rr(4, 9), minD * 0.2); t(insetRect(r, k, k, k, k), 0, H); return tiers; }
  if (shape === 'setback') {
    const h1 = H * rr(0.68, 0.85), k = Math.min(rr(2.5, 5), minD * 0.15);
    t(r, 0, h1); t(insetRect(r, k, k, k, k), h1, H); return tiers;
  }
  if (shape === 'podium') {
    const h1 = rr(14, 34), k = Math.min(rr(4, 9), minD * 0.22);
    t(r, 0, h1); t(insetRect(r, k, k, k, k), h1, H); return tiers;
  }
  if (shape === 'notch') {
    const h1 = rr(10, 22), k = Math.min(rr(3, 7), minD * 0.18);
    t(r, 0, h1);
    const rt = insetRect(r, k, k, k, k);
    const h2 = H * rr(0.7, 0.86);
    t(rt, h1, h2);
    t(insetRect(rt, k * .8, k * .8, k * .8, k * .8), h2, H);
    return tiers;
  }
  // wedding cake: 3-5 setbacks
  const n = H > 180 ? ri(4, 5) : ri(3, 4);
  let rect = r.slice(), y = 0;
  const hs = [];
  let rem = 1; for (let i = 0; i < n; i++) { const f = i === 0 ? rr(0.3, 0.45) : rem / (n - i) * rr(0.8, 1.2); hs.push(f); rem -= f; }
  hs[n - 1] += rem;
  for (let i = 0; i < n; i++) {
    const y1 = i === n - 1 ? H : y + H * hs[i];
    t(rect, y, y1);
    y = y1;
    const w = rect[2] - rect[0], d = rect[3] - rect[1];
    const k = Math.min(rr(2.5, 6), Math.min(w, d) * 0.16);
    if (Math.min(w, d) - 2 * k < 8) break;
    rect = insetRect(rect, k, k, k, k);
  }
  return tiers;
}

// roof extras: bulkheads, mechanical boxes, water towers, antennas
function roofExtras(tiers, styleName, H, P, base = 0) {
  const top = tiers[tiers.length - 1];
  const b = polyBounds(top.poly), w = b[2] - b[0], d = b[3] - b[1];
  if (w < 6 || d < 6) return;
  const y = top.y1;
  const isRect = top.poly.length === 4;
  if (H > 150 && (styleName === 'glass' || styleName === 'postwar')) {
    const k = Math.min(w, d) * rr(0.15, 0.25);
    const mh = rr(5, 12);
    pushPiece(rectPoly(b[0] + k, b[1] + k, b[2] - k, b[3] - k), y, y + mh, base, 0x55595c, 6, ri(0, 255), 0);
    pushPiece(rectPoly(b[0] + k, b[1] + k, b[2] - k, b[3] - k), y + mh, y + mh, base, 0x55595c, 6, 1, 1);
    if (chance(0.25)) { const cx = (b[0] + b[2]) / 2, cz = (b[1] + b[3]) / 2; addProp('antenna', cx, cz, y + mh, rr(15, 45)); }
    return;
  }
  if (H > 150 && styleName === 'deco' && chance(0.6)) {
    const cx = (b[0] + b[2]) / 2, cz = (b[1] + b[3]) / 2;
    const s = Math.min(w, d) * 0.3;
    pushPiece(rectPoly(cx - s, cz - s, cx + s, cz + s), y, y + s * 1.2, base, 0xc4bba5, 3, 7, 16);
    pushPiece(rectPoly(cx - s, cz - s, cx + s, cz + s), y + s * 1.2, y + s * 1.2, base, 0xc4bba5, 3, 7, 1);
    addProp('spire', cx, cz, y + s * 1.2, rr(18, 45), s * 0.55);
    return;
  }
  if (!isRect) return;
  // stair/elevator bulkhead — every walk-up and pre-war roof has one
  if (H > 12 && chance(0.8)) {
    const bw = Math.min(w * 0.4, rr(3.5, 6.5)), bd = Math.min(d * 0.4, rr(3.5, 6));
    const bx = rr(b[0] + 1, b[2] - 1 - bw), bz = rr(b[1] + 1, b[3] - 1 - bd);
    const bh = rr(3, 4.5);
    const pc = styleName === 'brown' ? pick(PAL.brown) : pick(PAL.plain);
    pushPiece(rectPoly(bx, bz, bx + bw, bz + bd), y, y + bh, base, pc, 6, ri(0, 255), 0);
    pushPiece(rectPoly(bx, bz, bx + bw, bz + bd), y + bh, y + bh, base, pc, 6, ri(0, 255), 1);
  }
  if (H > 30 && w > 14 && d > 14 && chance(0.5)) {
    for (let i = 0; i < ri(1, 3); i++) {
      const bw = rr(2, 5), bd = rr(2, 4);
      const bx = rr(b[0] + 1, b[2] - 1 - bw), bz = rr(b[1] + 1, b[3] - 1 - bd);
      pushPiece(rectPoly(bx, bz, bx + bw, bz + bd), y, y + rr(1.2, 2.4), base, 0x9a9a96, 6, ri(0, 255), 0);
    }
  }
  if (styleName !== 'glass' && H > 14 && H < 130 && chance(P.wt || 0) && w > 8 && d > 8) {
    const r = H > 40 ? rr(3, 4.2) : rr(2.3, 3.2);
    const x = rr(b[0] + r + 1, b[2] - r - 1), z = rr(b[1] + r + 1, b[3] - r - 1);
    addProp('watertower', x, z, y, r, ri(0, 3));
  }
}

// =====================================================================
//  Grid → rows, blocks, roads
// =====================================================================
const ROADS = [];      // {poly, ...} for minimap
const CORR = [];       // traffic corridors
const BLOCKS = [];     // plate rects for pedestrians
const INTERS = [];     // intersections {x,z,wx,wz,aveName,stName}

function addGround(poly, type, y, opts = {}) {
  const c = polyCentroid(poly);
  getChunk(c[0], c[1]).gnd.push({ p: poly, y, t: type, f: opts.f || 0, W: opts.W || 0, L: opts.L || 0, o: opts.o || null, side: opts.side || 0 });
}
// oriented road quad: origin (ox,oz), along (vx,vz) length L, across (ux,uz) width W
function addRoadQuad(ox, oz, ux, uz, vx, vz, W, L, flags, type = 1, y = 0) {
  // split long quads so chunk culling stays tight
  const n = Math.max(1, Math.ceil(L / 120));
  for (let i = 0; i < n; i++) {
    const a = L * i / n, b = L * (i + 1) / n;
    const p = [[ox + vx * a, oz + vz * a], [ox + vx * a + ux * W, oz + vz * a + uz * W], [ox + vx * b + ux * W, oz + vz * b + uz * W], [ox + vx * b, oz + vz * b]];
    let f = flags;
    if (i > 0) f &= ~16; if (i < n - 1) f &= ~32;
    addGround(p, type, y, { f, W, L: b - a, o: [ox + vx * a, oz + vz * a, ux, uz, vx, vz] });
  }
  const P = [[ox, oz], [ox + ux * W, oz + uz * W], [ox + ux * W + vx * L, oz + uz * W + vz * L], [ox + vx * L, oz + vz * L]];
  mapPoly(P, '#56595a');
}

const ZONES = [];
(function defineZones() {
  const numZ = [];
  for (let n = 222; n >= 1; n--) numZ.push({ z: zN(n), w: WIDE.has(n) ? 30 : 18, n });
  numZ.push({ z: 0, w: 30, n: 0 });
  ZONES.push({ id: 'num', zLines: numZ, xLines: AVES });
  ZONES.push({ id: 'down', zLines: DOWN_Z.map((d, i) => Object.assign({ n: -1 - i }, d)), xLines: DOWN_X });
})();

function activeLines(zone, zc) {
  const out = [];
  for (const L of zone.xLines) {
    const s = lineAt(L, zc);
    if (s && L.x > shoreW(zc) + WEST_IN && L.x < shoreE(zc) - EAST_IN) out.push({ L, x: L.x, w: L.w, name: s.name });
  }
  out.sort((a, b) => a.x - b.x);
  return out;
}

function genGrid() {
  for (const zone of ZONES) {
    const zl = zone.zLines;
    for (let i = 0; i < zl.length - 1; i++) {
      const N = zl[i], S = zl[i + 1];
      const z0 = N.z + N.w / 2, z1 = S.z - S.w / 2;
      if (z1 - z0 < 10) continue;
      const zc = (z0 + z1) / 2, n = nOfZ(zc);
      if (zc < Z_MIN + 20 || zc > Z_MAX - 20) continue;
      const [sw, se] = shoreRange(z0, z1);
      if (se - sw < 120) continue;
      const wx = westExtra(n), ex = eastExtra(n);
      const westEdge = sw + WEST_IN + wx, eastEdge = se - EAST_IN - ex;
      const act = activeLines(zone, zc).filter((a) => a.x > westEdge + 5 && a.x < eastEdge - 5);
      // avenue segments
      for (const a of act) {
        if (inRectList(NOROAD, a.x, zc, -2)) continue;
        const flags = (a.L.dir === 0 ? 1 : 0) | (a.L.bus ? 2 : 0) | (a.L.bike ? 4 : 0) | (a.L.dir > 0 ? 8 : 0) | 16 | 32
          | (a.L.median && n > a.L.median[0] && n < a.L.median[1] ? 64 : 0);
        addRoadQuad(a.x - a.w / 2, z0, 1, 0, 0, 1, a.w, z1 - z0, flags);
      }
      // blocks
      let prevX = westEdge, prevLine = null;
      const cuts = act.concat([{ x: eastEdge, w: 0, edge: true }]);
      for (const c of cuts) {
        const bx0 = prevX, bx1 = c.x - c.w / 2;
        if (bx1 - bx0 > 14) emitBlock(bx0, z0, bx1, z1, prevLine, c.edge ? null : c, zone, { west: !prevLine, east: !!c.edge, wx, ex });
        prevX = c.x + c.w / 2; prevLine = c.edge ? null : c;
      }
      if (wx > 0) emitShorePark(sw, z0, z1, westEdge, 'w', n);
      if (ex > 0) emitShorePark(se, z0, z1, eastEdge, 'e', n);
    }
    // streets along each z-line
    for (let i = 0; i < zl.length; i++) {
      const Z = zl[i];
      const z = Z.z;
      if (z < Z_MIN + 30 || z > Z_MAX - 30) continue;
      if (zone.id === 'num' && Z.n === 0) { /* Houston: union of both zones */ }
      const lines = new Map();
      for (const zz of [z - Z.w / 2 - 3, z + Z.w / 2 + 3]) {
        for (const a of activeLines(zone, zz)) lines.set(a.L, a);
        if (zone.id === 'num' && Z.n === 0) for (const a of activeLines(ZONES[1], zz)) lines.set(a.L, a);
      }
      if (zone.id === 'down' && i === 0) continue; // Houston handled by the numbered zone
      const n = nOfZ(z);
      const wE = shoreW(z) + WEST_IN + westExtra(n + 0.5) * (westExtra(n - 0.5) > 0 ? 1 : 0);
      const eE = shoreE(z) - EAST_IN - eastExtra(n + 0.5) * (eastExtra(n - 0.5) > 0 ? 1 : 0);
      const arr = [...lines.values()].filter((a) => a.x > wE && a.x < eE).sort((a, b) => a.x - b.x);
      const pts = [{ x: wE, w: 0, edge: true }].concat(arr, [{ x: eE, w: 0, edge: true }]);
      const twoWay = Z.n >= 0 ? WIDE.has(Z.n) || Z.n === 0 : Z.w >= 24;
      const east = Z.n >= 0 ? Z.n % 2 === 0 : i % 2 === 0;
      const sw = (Z.eastW && 0) || Z.w;
      let any = false;
      for (let k = 0; k < pts.length - 1; k++) {
        const A = pts[k], B = pts[k + 1];
        const xa = A.x + A.w / 2, xb = B.x - B.w / 2;
        if (xb - xa < 3) continue;
        const xm = (xa + xb) / 2;
        if (inRectList(NOROAD, xm, z, -2)) continue;
        if (!inManhattan(xm, z, 20)) continue;
        const flags = (twoWay ? 1 : 0) | (east ? 8 : 0) | (A.edge ? 0 : 16) | (B.edge ? 0 : 32);
        addRoadQuad(xa, z - sw / 2, 0, 1, 1, 0, sw, xb - xa, flags);
        any = true;
      }
      for (const a of arr) {
        if (inRectList(NOROAD, a.x, z, 1)) continue;
        if (!inManhattan(a.x, z, 30)) continue;
        addGround(rectPoly(a.x - a.w / 2, z - sw / 2, a.x + a.w / 2, z + sw / 2), 0, 0);
        INTERS.push({ x: a.x, z, wx: a.w, wz: sw, ave: a.name, st: Z.n > 0 ? Z.n : Z.name, line: a.L, zl: Z });
      }
      if (any) {
        STATS.streets++;
        CORR.push({ axis: 'x', c: z, w: sw, a0: wE, a1: eE, dir: twoWay ? 0 : east ? 1 : -1, cross: arr.map((a) => [a.x, a.w / 2]), name: Z.n > 0 ? Z.n : Z.name });
      }
    }
    // avenue corridors (contiguous ranges along each x line)
    for (const L of zone.xLines) {
      for (const s of L.segs) {
        const cross = [];
        for (const Z of zl) if (Z.z > s.z0 - 1 && Z.z < s.z1 + 1 && !inRectList(NOROAD, L.x, Z.z, 1) && inManhattan(L.x, Z.z, 40)) cross.push([Z.z, Z.w / 2]);
        if (cross.length < 2) continue;
        cross.sort((a, b) => a[0] - b[0]);
        CORR.push({ axis: 'z', c: L.x, w: L.w, a0: cross[0][0], a1: cross[cross.length - 1][0], dir: L.dir, cross, name: s.name, bus: L.bus });
      }
    }
  }
  // Broadway: diagonal road on top of the grid
  for (const s of BW_SEGS) {
    const nx = -s.dz, nz = s.dx;
    const n0 = nOfZ(s.az), n1 = nOfZ(s.bz);
    // Times Square plazas between 42nd and 47th
    const tsA = zN(47), tsB = zN(42);
    const pieces = [];
    if (Math.min(s.az, s.bz) < tsB && Math.max(s.az, s.bz) > tsA) {
      // split at the plaza ends
      const tOf = (z) => (z - s.az) / s.dz;
      const ta = clamp(tOf(tsB), 0, s.L), tb = clamp(tOf(tsA), 0, s.L);
      pieces.push([0, ta, 1], [ta, tb, 7], [tb, s.L, 1]);
    } else pieces.push([0, s.L, 1]);
    for (const [a, b, type] of pieces) {
      if (b - a < 1) continue;
      const ox = s.ax + s.dx * a - nx * BW_HALF, oz = s.az + s.dz * a - nz * BW_HALF;
      const twoWay = n0 > 59 && n1 > 59;
      addRoadQuad(ox, oz, nx, nz, s.dx, s.dz, BW_HALF * 2, b - a, twoWay ? 1 : 0, type, 0.03);
    }
    CORR.push({ axis: 'd', seg: s, w: BW_HALF * 2, a0: 0, a1: s.L, dir: (n0 > 59 && n1 > 59) ? 0 : -1, cross: [], name: 'Broadway' });
  }
}

function emitShorePark(shoreX, z0, z1, edge, side, n) {
  const zz = [z0 - 9, z1 + 9];
  let poly;
  if (side === 'w') {
    const a = shoreW(zz[0]) + WEST_IN, b = shoreW(zz[1]) + WEST_IN;
    poly = [[a, zz[0]], [edge, zz[0]], [edge, zz[1]], [b, zz[1]]];
  } else {
    const a = shoreE(zz[0]) - EAST_IN, b = shoreE(zz[1]) - EAST_IN;
    poly = [[edge, zz[0]], [a, zz[0]], [b, zz[1]], [edge, zz[1]]];
  }
  if (Math.abs(polyArea(poly)) < 100) return;
  addGround(poly, 4, 0.2, { side: 0.2 });
  addSolid(poly, -1, 0.2, 'g');
  mapPoly(poly, '#3f6b3a');
  // trees and paths
  const b = polyBounds(poly);
  for (let i = 0; i < (b[2] - b[0]) * (b[3] - b[1]) / 220; i++) {
    const x = rr(b[0], b[2]), z = rr(b[1], b[3]);
    if (pointInPoly(x, z, poly)) addTree(x, z, 0.2, 'park');
  }
  const px = side === 'w' ? lerp(b[0], edge, 0.55) : lerp(edge, b[2], 0.45);
  addGround(rectPoly(px - 2, zz[0], px + 2, zz[1]), 5, 0.24);
}

// ---------------------------------------------------------------------
//  Blocks
// ---------------------------------------------------------------------
function emitBlock(x0, z0, x1, z1, wLine, eLine, zone, edges) {
  const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
  const n = nOfZ(cz);
  for (const r of PARKS.concat(SUPER)) {
    const ox = Math.min(x1, r.x1) - Math.max(x0, r.x0), oz = Math.min(z1, r.z1) - Math.max(z0, r.z0);
    if (ox > 0 && oz > 0 && ox * oz > 0.6 * (x1 - x0) * (z1 - z0)) return;
  }
  STATS.blocks++;
  // plate polygon follows the shore on the island's edge blocks
  let plate = rectPoly(x0, z0, x1, z1);
  let rectPlate = true;
  if (edges.west && edges.wx === 0) {
    const a = shoreW(z0) + WEST_IN, b = shoreW(z1) + WEST_IN;
    if (a < x1 - 10 && b < x1 - 10) { plate = [[a, z0], [x1, z0], [x1, z1], [b, z1]]; rectPlate = false; }
  }
  if (edges.east && edges.ex === 0) {
    const a = shoreE(z0) - EAST_IN, b = shoreE(z1) - EAST_IN;
    if (a > x0 + 10 && b > x0 + 10) { plate = [[plate[0][0], z0], [a, z0], [b, z1], [plate[3][0], z1]]; rectPlate = false; }
  }
  const bw = broadwayDist(cx, cz);
  const diag = Math.hypot(x1 - x0, z1 - z0) / 2;
  const cut = bw.d < diag + BW_HALF + 2;
  const plates = cut ? cutBroadway(plate, BW_HALF) : [plate];
  for (const p of plates) {
    if (rectPlate && !cut) addGround(p, 3, 0.15, { W: x1 - x0, L: z1 - z0, o: [x0, z0, 1, 0, 0, 1], side: 0.15 });
    else addGround(p, 3, 0.15, { side: 0.15 });
    addSolid(p, -1, 0.15, 'p');
    mapPoly(p, '#a9a69e');
  }
  BLOCKS.push({ x0, z0, x1, z1, cut, n });
  const P = districtAt(cx, cz);
  const blk = { x0, z0, x1, z1, cx, cz, n, wLine, eLine, cut, P, zone };
  streetFurniture(blk);
  // special blocks
  if (P.proj && chance(P.proj) && x1 - x0 > 120 && !cut) { projectsBlock(blk); return; }
  if (P.lot !== 'office' && chance(0.025) && !cut) { parkingLot(blk); return; }
  const lots = makeLots(blk);
  for (const lot of lots) buildLot(lot, blk);
}

function cutBroadway(poly, half) {
  const c = polyCentroid(poly);
  const { seg: s } = broadwayDist(c[0], c[1]);
  const nx = -s.dz, nz = s.dx;
  const a = clipHalf(poly, s.ax + nx * half, s.az + nz * half, nx, nz);
  const b = clipHalf(poly, s.ax - nx * half, s.az - nz * half, -nx, -nz);
  return [a, b].filter((p) => p.length >= 3 && Math.abs(polyArea(p)) > 6);
}

function makeLots(B) {
  const P = B.P;
  const swA = 5.5, swS = 4.6;
  const ix0 = B.x0 + (B.wLine ? swA : swS), ix1 = B.x1 - (B.eLine ? swA : swS);
  const iz0 = B.z0 + swS, iz1 = B.z1 - swS;
  const W = ix1 - ix0, D = iz1 - iz0;
  const lots = [];
  if (W < 6 || D < 6) return lots;
  const L = (x0, z0, x1, z1, o) => lots.push(Object.assign({ r: [x0, z0, x1, z1] }, o));
  const kind = P.lot;
  const ah = P.ah || P.h;
  if (kind === 'office') {
    let x = ix0;
    while (x < ix1 - 4) {
      let w = rr(22, 62); if (ix1 - (x + w) < 16) w = ix1 - x;
      const tall = chance(P.tall || 0);
      const H = tall ? rr(P.th[0], P.th[1]) : lerp(P.h[0], P.h[1], Math.pow(rand(), 1.5));
      if (!tall && D > 40 && chance(0.35)) {
        const zm = iz0 + D * rr(0.4, 0.6);
        L(x, iz0, x + w, zm, { H: H * rr(.7, 1), front: 'N' }); L(x, zm, x + w, iz1, { H: H * rr(.6, 1), front: 'S' });
      } else L(x, iz0, x + w, iz1, { H, front: 'N', tall });
      x += w;
    }
    return lots;
  }
  if (kind === 'apart') {
    let x = ix0;
    while (x < ix1 - 4) {
      let w = rr(24, 55); if (ix1 - (x + w) < 18) w = ix1 - x;
      const H = rr(P.h[0], P.h[1]) * (chance(P.tall || 0) ? 2.2 : 1);
      if (D > 36 && chance(0.55)) {
        const zm = iz0 + D / 2;
        L(x, iz0, x + w, zm - rr(0, 4), { H, front: 'N' }); L(x, zm + rr(0, 4), x + w, iz1, { H: H * rr(.85, 1.1), front: 'S' });
      } else L(x, iz0, x + w, iz1, { H, front: 'N' });
      x += w;
    }
    return lots;
  }
  // row / tenement / loft / mixed: avenue-end buildings + two rows facing the streets
  let ax0 = ix0, ax1 = ix1;
  const aveEnd = (xa, xb, side) => {
    let z = iz0;
    const parts = D > 45 && chance(0.6) ? ri(2, 3) : 1;
    for (let k = 0; k < parts; k++) {
      const z1 = k === parts - 1 ? iz1 : z + D / parts * rr(0.85, 1.15);
      const H = rr(ah[0], ah[1]);
      L(xa, z, xb, z1, { H, front: side, ave: true, style: P.ast ? weighted(P.ast) : null });
      z = z1;
    }
  };
  const aw = clamp(rr(16, 32), 10, W * 0.3);
  if (B.wLine && W > 45) { aveEnd(ix0, ix0 + aw, 'W'); ax0 = ix0 + aw; }
  const aw2 = clamp(rr(16, 32), 10, W * 0.3);
  if (B.eLine && W > 45) { aveEnd(ix1 - aw2, ix1, 'E'); ax1 = ix1 - aw2; }
  const isRow = kind === 'row' || kind === 'mixed';
  const rowD = Math.min(D / 2, kind === 'loft' ? D / 2 : kind === 'tenement' ? rr(17, 23) : rr(13, 17));
  for (const side of ['N', 'S']) {
    let x = ax0;
    while (x < ax1 - 3) {
      if (kind === 'loft') {
        let w = rr(8, 24); if (ax1 - (x + w) < 7) w = ax1 - x;
        const H = rr(P.h[0], P.h[1]) * (chance(P.tall || 0) ? 2 : 1);
        const d = D / 2 - rr(0, 3);
        side === 'N' ? L(x, iz0, x + w, iz0 + d, { H, front: 'N' }) : L(x, iz1 - d, x + w, iz1, { H, front: 'S' });
        x += w; continue;
      }
      const apt = chance(kind === 'mixed' ? 0.3 : 0.08);
      if (apt) {
        let w = rr(18, 34); if (ax1 - (x + w) < 7) w = ax1 - x;
        const H = rr(ah[0], ah[1]) * rr(0.7, 1);
        const d = D / 2 - rr(0, 2);
        const st = P.ast ? weighted(P.ast) : null;
        side === 'N' ? L(x, iz0, x + w, iz0 + d, { H, front: 'N', style: st }) : L(x, iz1 - d, x + w, iz1, { H, front: 'S', style: st });
        x += w; continue;
      }
      const hw = kind === 'tenement' ? rr(7.2, 8) : rr(5.4, 7.6);
      let cnt = ri(2, 7);
      let w = hw * cnt; if (ax1 - (x + w) < hw * 0.9) { w = ax1 - x; cnt = Math.max(1, Math.round(w / hw)); }
      const H = rr(P.h[0], P.h[1]);
      const set = isRow ? rr(0, 3.2) : 0;
      const d = rowD - set;
      side === 'N' ? L(x, iz0 + set, x + w, iz0 + set + d, { H, front: 'N', houseW: w / cnt, setback: set, row: true })
        : L(x, iz1 - set - d, x + w, iz1 - set, { H, front: 'S', houseW: w / cnt, setback: set, row: true });
      x += w;
    }
  }
  return lots;
}

function buildLot(lot, B) {
  const P = B.P;
  let [x0, z0, x1, z1] = lot.r;
  if (x1 - x0 < 4 || z1 - z0 < 4) return;
  const styleName = lot.style || (lot.row ? (P.lot === 'row' && chance(0.12) ? 'masonry' : 'brown') : weighted(P.st));
  const H = Math.max(6, lot.H);
  let flags = 0;
  const onAve = lot.ave || P.lot === 'office' || P.lot === 'loft';
  if ((onAve && chance(P.store != null ? Math.max(P.store, 0.5) : 0.6)) || chance((P.store || 0) * (lot.row ? 0.35 : 0.6))) flags |= 4;
  if ((styleName === 'brown') && chance(P.fire || 0)) flags |= 2;
  let polys = [rectPoly(x0, z0, x1, z1)];
  if (B.cut) {
    polys = cutBroadway(polys[0], BW_HALF + 4.6);
    if (polys.length === 1 && Math.abs(polyArea(polys[0])) > (x1 - x0) * (z1 - z0) * 0.97) polys = [rectPoly(x0, z0, x1, z1)];
  }
  for (const poly of polys) {
    if (Math.abs(polyArea(poly)) < 30) continue;
    if (reservedHit(poly)) continue;
    let tiers;
    const isRect = poly.length === 4 && (poly[0][1] === poly[1][1]);
    if (isRect) {
      const pb = polyBounds(poly);
      tiers = rectTiers(pb, H, styleName);
    } else {
      // Broadway frontage: simple extrusion, maybe a setback
      const Hb = Math.min(H, 160);
      tiers = [{ poly, y0: 0, y1: Hb }];
    }
    const info = addBuilding(tiers, styleName, { flags, houseW: lot.houseW || 0 });
    roofExtras(tiers, styleName, H, P);
    if (lot.row && styleName === 'brown' && lot.setback > 1.4 && H < 22 && isRect) {
      // stoops up to the parlor floor
      const cnt = Math.round((x1 - x0) / lot.houseW);
      for (let k = 0; k < cnt; k++) {
        const hx = x0 + (k + 0.5) * lot.houseW + lot.houseW * 0.22;
        if (lot.front === 'N') addProp('stoop', hx, z0, Math.PI, Math.min(lot.setback, 3));
        else addProp('stoop', hx, z1, 0, Math.min(lot.setback, 3));
      }
    }
    if (chance(0.035) && flags & 4 && isRect) {
      // sidewalk shed (scaffolding) along the front
      if (lot.front === 'N') addProp('shed', (x0 + x1) / 2, z0 - 2.4, 0, x1 - x0);
      else if (lot.front === 'S') addProp('shed', (x0 + x1) / 2, z1 + 2.4, Math.PI, x1 - x0);
    }
  }
}

function projectsBlock(B) {
  // NYCHA "towers in the park": lawns and cross-shaped brick slabs
  const ix0 = B.x0 + 6, ix1 = B.x1 - 6, iz0 = B.z0 + 5, iz1 = B.z1 - 5;
  addGround(rectPoly(ix0, iz0, ix1, iz1), 4, 0.2, { side: 0.05 });
  const n = Math.max(1, Math.floor((ix1 - ix0) / 75));
  const col = pick([0x9a5340, 0x8c4a3a, 0xa0604a, 0x7d4636]);
  const H = rr(38, 62);
  for (let i = 0; i < n; i++) {
    const cx = lerp(ix0, ix1, (i + 0.5) / n), cz = (iz0 + iz1) / 2;
    const a = 9, b = Math.min(24, (iz1 - iz0) / 2 - 2);
    const tiers1 = [{ poly: rectPoly(cx - b, cz - a, cx + b, cz + a), y0: 0, y1: H }];
    const tiers2 = [{ poly: rectPoly(cx - a, cz - b, cx + a, cz + b), y0: 0, y1: H }];
    addBuilding(tiers1, 'postwar', { col, flags: 0 });
    addBuilding(tiers2, 'postwar', { col, flags: 0, noMap: false });
    roofExtras(tiers1, 'postwar', H, { wt: 0 });
  }
  for (let i = 0; i < (ix1 - ix0) / 12; i++) { const x = rr(ix0, ix1), z = chance(.5) ? rr(iz0, iz0 + 8) : rr(iz1 - 8, iz1); addTree(x, z, 0.2, 'street'); }
}

function parkingLot(B) {
  const ix0 = B.x0 + 5, ix1 = B.x1 - 5, iz0 = B.z0 + 4.6, iz1 = B.z1 - 4.6;
  const x1 = Math.min(ix1, ix0 + rr(30, 60));
  addGround(rectPoly(ix0, iz0, x1, iz1), 0, 0.17);
  for (let x = ix0 + 3; x < x1 - 3; x += 2.8) for (const z of [iz0 + 3, iz1 - 3]) if (chance(0.7)) addProp('pcar', x, z, Math.PI / 2 + (z > (iz0 + iz1) / 2 ? Math.PI : 0), ri(0, 5), 0.17);
  const lots = makeLots(Object.assign({}, B, { x0: x1 + 2, wLine: null }));
  for (const lot of lots) buildLot(lot, B);
}

// ---------------------------------------------------------------------
//  Street furniture along plate edges
// ---------------------------------------------------------------------
function streetFurniture(B) {
  const { x0, z0, x1, z1, P } = B;
  const leafy = P.lot === 'row' || P.lot === 'mixed' || P.lot === 'apart' || P === DT.park5;
  const res = P.lot !== 'office';
  // edges: N (z0), S (z1) along x; W (x0), E (x1) along z
  const edges = [
    { ax: x0, az: z0, bx: x1, bz: z0, nx: 0, nz: -1, ave: false },
    { ax: x1, az: z1, bx: x0, bz: z1, nx: 0, nz: 1, ave: false },
    { ax: x0, az: z1, bx: x0, bz: z0, nx: -1, nz: 0, ave: !!B.wLine },
    { ax: x1, az: z0, bx: x1, bz: z1, nx: 1, nz: 0, ave: !!B.eLine },
  ];
  for (const e of edges) {
    const len = Math.hypot(e.bx - e.ax, e.bz - e.az);
    if (len < 12) continue;
    const dx = (e.bx - e.ax) / len, dz = (e.bz - e.az) / len;
    const rot = Math.atan2(e.nx, e.nz);
    const at = (s, inset) => [e.ax + dx * s - e.nx * inset, e.az + dz * s - e.nz * inset];
    if (B.cut) { const m = at(len / 2, 0); if (broadwayDist(m[0], m[1]).d < BW_HALF + 6) continue; }
    // lamps
    for (let s = 12; s < len - 6; s += 29) { const [x, z] = at(s, 0.55); addProp('lamp', x, z, rot); STATS.lamps++; }
    // street trees
    if (leafy || chance(0.25)) {
      const sp = leafy ? rr(7.5, 10) : 13;
      for (let s = 9 + rr(0, 4); s < len - 8; s += sp) if (chance(leafy ? 0.85 : 0.5)) { const [x, z] = at(s, 1.25); addTree(x, z, 0.15, 'street'); }
    }
    // hydrant, trash basket, mailbox, news boxes
    { const [x, z] = at(rr(5, 9), 0.7); if (chance(0.75)) addProp('hydrant', x, z, rot); }
    { const [x, z] = at(len - 2.2, 1.0); if (chance(0.55)) addProp('trash', x, z, rot); }
    if (e.ave && chance(0.25)) { const [x, z] = at(rr(3, 6), 1.6); addProp('mailbox', x, z, rot); }
    if (e.ave && P.lot === 'office' && chance(0.2)) { const [x, z] = at(rr(8, 20), 1.3); addProp('cart', x, z, rot + Math.PI / 2); }
    if (e.ave && chance(0.12)) { const [x, z] = at(len * rr(0.3, 0.7), 0.9); addProp('kiosk', x, z, rot); }
    if (e.ave && chance(0.08)) { const [x, z] = at(len * 0.5, 1.6); addProp('busstop', x, z, rot); }
    // parked cars along the curb (not on avenue bus lanes)
    if (!e.ave || chance(0.5)) {
      const occ = res ? 0.78 : 0.5;
      for (let s = 9; s < len - 9; s += rr(5.6, 7.4)) {
        if (!chance(occ)) continue;
        const [x, z] = at(s, -1.25);
        const r = rand();
        const t = r < (res ? 0.12 : 0.35) ? 1 : r < 0.6 ? 0 : r < 0.85 ? 2 : r < 0.95 ? 3 : 4;
        addProp('pcar', x, z, rot + Math.PI / 2 + (chance(0.5) ? 0 : Math.PI), t, 0);
        STATS.cars++;
      }
    }
  }
  // corner signal poles (NW and SE corners) with street-name blades
  const corners = [[x0, z0, 1, 1], [x1, z1, -1, -1]];
  for (const [cx, cz, sx, sz] of corners) {
    const hasAve = sx > 0 ? !!B.wLine : !!B.eLine;
    if (!hasAve) continue;
    addProp('signal', cx + sx * 0.8, cz + sz * 0.8, sx > 0 ? 0 : Math.PI, B.n);
  }
  // subway entrance on busy avenues
  if ((B.wLine && /^(6 Av|7 Av|8 Av|Lexington Av|Broadway|Central Park W|Lenox Av|Adam C Powell Blvd|Church St)$/.test(B.wLine.name) || B.cut) && chance(0.13)) {
    addProp('subway', x0 + 3.2, z0 + rr(9, 16), Math.PI / 2);
  }
  if (P.lot === 'office' && chance(0.025)) addProp('steam', x0 - 6, z0 + 3, 0);
}

function addTree(x, z, y, kind) {
  const s = kind === 'street' ? rr(0.7, 1.08) : rr(1.0, 1.55);
  addProp('tree', x, z, rr(0, Math.PI * 2), s, y, kind === 'street' ? 1 : 0, ri(0, 255));
  STATS.trees++;
}
