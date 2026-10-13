// =====================================================================
//  Surrounding land: New Jersey (Palisades), Brooklyn, Queens, Bronx, islands
// =====================================================================
function palisadeH(z) {
  // cliff top height along the Hudson's west bank
  if (z > -2500) return 2.5;
  const gwb = Math.exp(-((z - zN(178)) ** 2) / (2 * 1600 * 1600));
  const base = lerp(2.5, 58, smoothstep(-2500, -6500, z));
  return lerp(base + 8 * (vnoise(z * 0.002, 3.3) - 0.5), 64, gwb);
}
function groundHeight(x, z) {
  if (inManhattan(x, z)) return 0;
  if (x < njX(z)) {
    const d = njX(z) - x;
    return 0.5 + (palisadeH(z) - 0.5) * smoothstep(15, 140, d);
  }
  if (x > ebX(z)) return 0.6 + 4 * smoothstep(200, 2500, x - ebX(z)) * vnoise(x * 0.001, z * 0.001);
  for (const I of ISLANDS) if (pointInPoly(x, z, I.poly)) return 0.6;
  return -2.5;
}

function landStrip(side) {
  // build a terrain mesh following the shore: rows along z, columns from the shore outward
  const zs = [];
  for (let z = -24000; z <= 14000; z += z > -19000 && z < 7000 ? 60 : 400) zs.push(z);
  const us = []; // distances from shore
  for (let d = 0; d <= 9000; d += d < 200 ? 20 : d < 1500 ? 80 : 600) us.push(d);
  const nx = us.length, nz = zs.length;
  const pos = new Float32Array(nx * nz * 3), uv = new Float32Array(nx * nz * 2), gg = new Float32Array(nx * nz * 4);
  for (let j = 0; j < nz; j++) {
    const z = zs[j];
    const sx = side < 0 ? njX(z) : ebX(z);
    for (let i = 0; i < nx; i++) {
      const x = sx + side * us[i];
      const v = j * nx + i;
      let h = side < 0 ? 0.5 + (palisadeH(z) - 0.5) * smoothstep(15, 140, us[i]) : groundHeight(x + side * 1, z);
      if (us[i] === 0) h = side < 0 ? Math.min(h, 0.5) : 0.6;
      pos[v * 3] = x; pos[v * 3 + 1] = h; pos[v * 3 + 2] = z;
      uv[v * 2] = x; uv[v * 2 + 1] = z;
      const cliff = side < 0 && z < -3500 && us[i] > 10 && us[i] < 150;
      gg[v * 4] = us[i] < 12 ? 11 : cliff ? 9 : (side < 0 && z < -6500 && us[i] < 900) ? 4 : 10;
    }
  }
  const idx = [];
  for (let j = 0; j < nz - 1; j++) for (let i = 0; i < nx - 1; i++) {
    const a = j * nx + i, b = a + 1, c = a + nx, d = c + 1;
    if (side < 0) idx.push(a, b, c, b, d, c); else idx.push(a, c, b, b, c, d);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('aUV', new THREE.BufferAttribute(uv, 2));
  g.setAttribute('aG', new THREE.BufferAttribute(gg, 4));
  g.setIndex(idx); g.computeVertexNormals(); g.computeBoundingSphere();
  extraMeshes.push({ geo: g, mat: 'ground', shadow: 'receive', cull: false });
  // seawall skirt along the shoreline
  const wall = [];
  for (let j = 0; j < nz - 1; j++) {
    const z0 = zs[j], z1 = zs[j + 1];
    const x0 = side < 0 ? njX(z0) : ebX(z0), x1 = side < 0 ? njX(z1) : ebX(z1);
    const h0 = side < 0 ? 0.5 : 0.6;
    wall.push(x0, h0, z0, x1, h0, z1, x1, -6, z1, x0, h0, z0, x1, -6, z1, x0, -6, z0);
  }
  const wg = new THREE.BufferGeometry(); wg.setAttribute('position', new THREE.Float32BufferAttribute(wall, 3)); wg.computeVertexNormals();
  extraMeshes.push({ geo: wg, mat: 'seawall', cull: false });
  // map
  const poly = [];
  for (const z of zs) poly.push([side < 0 ? njX(z) : ebX(z), z]);
  poly.push([side * 9000, 14000], [side * 9000, -24000]);
  mapPoly(poly, side < 0 ? '#3b4339' : '#40463e');
}

function genManhattanBase() {
  // the island slab: asphalt-ish ground under everything, and the seawall around it
  const pts = [];
  for (let z = Z_MIN; z <= Z_MAX; z += 20) pts.push([shoreW(z), z]);
  for (let z = Z_MAX; z >= Z_MIN; z -= 20) pts.push([shoreE(z), z]);
  const shape = new THREE.Shape(pts.map((p) => new THREE.Vector2(p[0], -p[1])));
  const g = new THREE.ShapeGeometry(shape, 1);
  g.rotateX(-Math.PI / 2); g.translate(0, -0.12, 0);
  const n = g.attributes.position.count;
  const uv = new Float32Array(n * 2), gg = new Float32Array(n * 4);
  for (let i = 0; i < n; i++) { uv[i * 2] = g.attributes.position.getX(i); uv[i * 2 + 1] = g.attributes.position.getZ(i); gg[i * 4] = 10; }
  g.setAttribute('aUV', new THREE.BufferAttribute(uv, 2)); g.setAttribute('aG', new THREE.BufferAttribute(gg, 4));
  g.deleteAttribute('uv');
  extraMeshes.push({ geo: g, mat: 'ground', shadow: 'receive', cull: false });
  const wall = [];
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i], b = pts[(i + 1) % pts.length];
    wall.push(a[0], -0.12, a[1], b[0], -6, b[1], b[0], -0.12, b[1], a[0], -0.12, a[1], a[0], -6, a[1], b[0], -6, b[1]);
  }
  const wg = new THREE.BufferGeometry(); wg.setAttribute('position', new THREE.Float32BufferAttribute(wall, 3)); wg.computeVertexNormals();
  extraMeshes.push({ geo: wg, mat: 'seawall', cull: false, double: true });
  addSolid(pts.length > 3 ? [[-3000, Z_MIN], [3000, Z_MIN], [3000, Z_MAX], [-3000, Z_MAX]] : pts, -10, -0.12, 'terrain', (x, z) => (inManhattan(x, z) ? -0.12 : null));
}

function genShoreRoads() {
  // West Side Highway / Henry Hudson Parkway and FDR Drive with their waterfront promenades
  for (const side of [-1, 1]) {
    const road = [], prom = [];
    for (let z = Z_MIN + 300; z <= (side < 0 ? 2600 : 2700); z += 30) {
      const sx = side < 0 ? shoreW(z) : shoreE(z);
      road.push([sx - side * (side < 0 ? 28 : 22), z]);
      prom.push([sx - side * 6.5, z]);
    }
    const W = side < 0 ? 30 : 26;
    for (let i = 0; i < road.length - 1; i++) {
      const [ax, az] = road[i], [bx, bz] = road[i + 1];
      const L = Math.hypot(bx - ax, bz - az), dx = (bx - ax) / L, dz = (bz - az) / L, nx = -dz, nz = dx;
      addRoadQuad(ax - nx * W / 2, az - nz * W / 2, nx, nz, dx, dz, W, L + 0.5, 1 | 64, 1, 0.01);
    }
    ribbon(prom, 11, 6, () => 0.15, 0);
    for (let i = 0; i < prom.length - 1; i++) {
      const [ax, az] = prom[i], [bx, bz] = prom[i + 1];
      const L = Math.hypot(bx - ax, bz - az), dx = (bx - ax) / L, dz = (bz - az) / L;
      addSolid(orientedRect((ax + bx) / 2, (az + bz) / 2, dx, dz, L / 2 + 0.3, 5.5), -1, 0.15, 'p');
      // railing at the water's edge
      const rx = (ax + bx) / 2 + side * 5.3 * (-dz) * (side < 0 ? -1 : -1) * 0, rz = (az + bz) / 2;
      const ex = (side < 0 ? shoreW(rz) : shoreE(rz)) - side * 0.6;
      addProp('fence', ex, rz, Math.atan2(-(bz - az), bx - ax), L, 0.15, 1.1);
      addSolid(orientedRect(ex, rz, dx, dz, L / 2 + 0.2, 0.25), 0, 1.3);
      if (i % 2 === 0) addTree((ax + bx) / 2 - side * 3.5, rz, 0.15, 'street');
      if (i % 1 === 0) addProp('parklamp', (ax + bx) / 2 + side * 3.5, rz, 0, 0.15);
      if (i % 3 === 0) addProp('bench', (ax + bx) / 2 + side * 4.5, rz + 3, side < 0 ? Math.PI / 2 : -Math.PI / 2, 0.15);
    }
  }
}

function genIslands() {
  for (const I of ISLANDS) {
    const shape = new THREE.Shape(I.poly.map((p) => new THREE.Vector2(p[0], -p[1])));
    const g = new THREE.ShapeGeometry(shape, 1); g.rotateX(-Math.PI / 2); g.translate(0, 0.6, 0);
    const n = g.attributes.position.count, uv = new Float32Array(n * 2), gg = new Float32Array(n * 4);
    for (let i = 0; i < n; i++) { uv[i * 2] = g.attributes.position.getX(i); uv[i * 2 + 1] = g.attributes.position.getZ(i); gg[i * 4] = I.name === 'Roosevelt Island' ? 10 : 4; }
    g.setAttribute('aUV', new THREE.BufferAttribute(uv, 2)); g.setAttribute('aG', new THREE.BufferAttribute(gg, 4)); g.deleteAttribute('uv');
    extraMeshes.push({ geo: g, mat: 'ground', shadow: 'receive' });
    const wall = [];
    for (let i = 0; i < I.poly.length; i++) { const a = I.poly[i], b = I.poly[(i + 1) % I.poly.length]; wall.push(a[0], 0.6, a[1], b[0], -6, b[1], b[0], 0.6, b[1], a[0], 0.6, a[1], a[0], -6, a[1], b[0], -6, b[1]); }
    const wg = new THREE.BufferGeometry(); wg.setAttribute('position', new THREE.Float32BufferAttribute(wall, 3)); wg.computeVertexNormals();
    extraMeshes.push({ geo: wg, mat: 'seawall', double: true });
    mapPoly(I.poly, I.name === 'Roosevelt Island' ? '#77766f' : '#4f7f46');
    addSolid(I.poly, -10, 0.6, 'terrain', () => 0.6);
    const b = polyBounds(I.poly);
    const area = (b[2] - b[0]) * (b[3] - b[1]);
    for (let i = 0; i < area / (I.name === 'Liberty Island' ? 900 : 260); i++) {
      const x = rr(b[0], b[2]), z = rr(b[1], b[3]);
      if (!pointInPoly(x, z, I.poly)) continue;
      if (I.name === 'Liberty Island' && Math.hypot(x + 890, z - 5335) < 70) continue;
      if (I.name === 'Roosevelt Island' && chance(0.6)) continue;
      addTree(x, z, 0.6, 'park');
    }
  }
  // Roosevelt Island apartment slabs and the Ellis Island hall
  const R = ISLANDS[3];
  for (let z = -4600; z > -6400; z -= 120) {
    const xc = lerp(1325, 1420, (z + 4600) / -1800 * 0) + 55;
    if (!pointInPoly(xc, z, R.poly)) continue;
    addBuilding([{ poly: rectPoly(xc - 18, z - 20, xc + 18, z + 20), y0: 0.6, y1: rr(30, 70) }], pick(['postwar', 'brown']), { base: 0.6 });
  }
  addBuilding([{ poly: rectPoly(-1280, 4700, -1190, 4760), y0: 0.6, y1: 22 }], 'civic', { col: 0x9c5a44, base: 0.6 });
  for (const [x, z] of [[-1280, 4700], [-1190, 4700], [-1280, 4760], [-1190, 4760]]) vc('copper', new THREE.SphereGeometry(4, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), 0x6f9a8a, x, 30, z);
}

// Buildings across the rivers: a band of blocks on each side
function genBoroughs() {
  const bands = [
    { side: -1, z0: -16800, z1: 5200, depth: 1300 },
    { side: 1, z0: -18200, z1: 3700, depth: 1500 },
  ];
  for (const B of bands) {
    for (let z = B.z0; z < B.z1; z += 95) {
      const sx = B.side < 0 ? njX(z) : ebX(z);
      for (let d = 60; d < B.depth; d += 115) {
        const x = sx + B.side * d;
        const bz0 = z + 8, bz1 = z + 87, bx0 = x - 50, bx1 = x + 50;
        if (landAt(bx0, bz0) !== landAt(bx1, bz1) || !landAt((bx0 + bx1) / 2, (bz0 + bz1) / 2) || landAt((bx0 + bx1) / 2, (bz0 + bz1) / 2) === 'MN') continue;
        if (B.side > 0 && (x - ebX(bz0) < 40 || x - ebX(bz1) < 40)) continue;
        if (B.side < 0 && (njX(bz0) - x < 70 || njX(bz1) - x < 70)) continue;
        if (RESERVED.some((r) => convexOverlap(rectPoly(bx0, bz0, bx1, bz1), r.poly))) continue;
        boroughBlock(bx0, bz0, bx1, bz1, B.side, d);
      }
    }
  }
}
function boroughDistrict(x, z, side) {
  if (side < 0) {
    if (z > 700 && z < 2700 && x > -3400) return { h: [25, 70], tall: 0.25, th: [110, 240], st: { glass: 4, postwar: 2, masonry: 1 } };
    if (z > -2600 && z <= 700) return { h: [12, 20], tall: 0.05, th: [40, 80], st: { brown: 5, masonry: 2, postwar: 1 } };
    if (z < -12500 && z > -15500) return { h: [14, 30], tall: 0.15, th: [60, 120], st: { postwar: 4, glass: 1 } };
    return { h: [10, 26], tall: 0.06, th: [40, 90], st: { postwar: 3, brown: 2, masonry: 1, glass: 1 } };
  }
  if (z > 2000 && z < 3100 && x < 2600) return { h: [20, 60], tall: 0.25, th: [90, 200], st: { glass: 3, masonry: 3, postwar: 2 } };
  if (z > -4300 && z < -2500 && x < 2500) return { h: [20, 50], tall: 0.35, th: [90, 200], st: { glass: 5, postwar: 2 } };
  if (z > -600 && z < 700 && x < 2500) return { h: [14, 40], tall: 0.15, th: [60, 140], st: { glass: 3, brown: 3, postwar: 1 } };
  if (z < -9800) return { h: [14, 26], tall: 0.08, th: [40, 70], st: { brown: 3, postwar: 3, masonry: 2 } };
  return { h: [10, 22], tall: 0.04, th: [30, 70], st: { brown: 4, postwar: 2, masonry: 2 } };
}
function boroughBlock(x0, z0, x1, z1, side, d) {
  const P = boroughDistrict((x0 + x1) / 2, (z0 + z1) / 2, side);
  const base = groundHeight((x0 + x1) / 2, (z0 + z1) / 2);
  const ix0 = x0 + 4, ix1 = x1 - 4, iz0 = z0 + 4, iz1 = z1 - 4;
  let x = ix0;
  const far = d > 700;
  while (x < ix1 - 6) {
    let w = rr(far ? 25 : 14, far ? 50 : 34); if (ix1 - (x + w) < 10) w = ix1 - x;
    const tall = chance(P.tall);
    const H = tall ? rr(P.th[0], P.th[1]) : rr(P.h[0], P.h[1]);
    const st = weighted(P.st);
    const halves = !tall && chance(0.6);
    const lots = halves ? [[x, iz0, x + w, iz0 + (iz1 - iz0) / 2 - 2], [x, iz0 + (iz1 - iz0) / 2 + 2, x + w, iz1]] : [[x, iz0, x + w, iz1]];
    for (const r of lots) {
      const tiers = rectTiers(r, H * (halves ? rr(0.8, 1.1) : 1), st, base - 1);
      for (const t of tiers) { t.y0 = Math.max(t.y0, base - 1); }
      addBuilding(tiers, st, { base: base - 1, flags: chance(0.3) ? 4 : 0, noMap: false });
    }
    x += w;
  }
}

function genWater() {
  const g = new THREE.PlaneGeometry(60000, 60000, 1, 1); g.rotateX(-Math.PI / 2); g.translate(0, -2.5, -5000);
  extraMeshes.push({ geo: g, mat: 'water', cull: false, isSea: true });
}

// ---------------------------------------------------------------------
//  Boats on the rivers
// ---------------------------------------------------------------------
const BOATS = [];
function boatRoutes() {
  // Staten Island Ferry (orange), Circle Line style sightseeing boats, tugs pushing barges
  BOATS.push({ kind: 'ferry', path: [[-120, 3050], [200, 4200], [700, 6800], [1500, 9500]], speed: 8, t: 0.1, col: 0xf07b1d, len: 94, w: 21, h: 9 });
  BOATS.push({ kind: 'ferry', path: [[-120, 3050], [200, 4200], [700, 6800], [1500, 9500]], speed: 8, t: 0.65, col: 0xf07b1d, len: 94, w: 21, h: 9 });
  BOATS.push({ kind: 'tour', path: [[-1950, -3400], [-2100, 0], [-1700, 2600], [-700, 3500], [600, 3100], [1100, 2000], [1500, 0], [1500, -3000]], speed: 6, t: 0.2, col: 0xe8e8e2, len: 50, w: 10, h: 6 });
  BOATS.push({ kind: 'tug', path: [[-2200, -12000], [-2100, -6000], [-2150, -1000], [-1900, 2500], [-1300, 3900]], speed: 4, t: 0.4, col: 0xb8322a, len: 22, w: 8, h: 7 });
  BOATS.push({ kind: 'tug', path: [[1520, -7000], [1550, -3000], [1450, 0], [1100, 2400], [650, 3300]], speed: 4.5, t: 0.7, col: 0x2a4f7a, len: 20, w: 8, h: 7 });
  BOATS.push({ kind: 'tour', path: [[-2000, -12000], [-2080, -8000], [-2150, -4000]], speed: 7, t: 0.5, col: 0xe8e8e2, len: 40, w: 9, h: 5 });
  BOATS.push({ kind: 'water taxi', path: [[-1700, 1500], [-1500, 2800], [-400, 3300], [900, 2700], [1300, 1200]], speed: 9, t: 0.3, col: 0xf5d020, len: 18, w: 6, h: 4 });
}
