// =====================================================================
//  Custom landmark geometry collector (vertex colored, merged per material)
// =====================================================================
const VC = { stone: [], metal: [], dark: [], glow: [], copper: [], gold: [], glass: [] };
function vc(kind, geo, hex, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) {
  VC[kind].push(part(geo, hex, x, y, z, rx, ry, rz, sx, sy, sz));
}
const extraMeshes = []; // [mesh] added to scene at the end

// heightfield helper
class HField {
  constructor(x0, z0, x1, z1, step) {
    this.x0 = x0; this.z0 = z0; this.step = step;
    this.nx = Math.ceil((x1 - x0) / step) + 1; this.nz = Math.ceil((z1 - z0) / step) + 1;
    this.h = new Float32Array(this.nx * this.nz);
    this.water = new Uint8Array(this.nx * this.nz);
  }
  at(x, z) {
    const fx = clamp((x - this.x0) / this.step, 0, this.nx - 1.001), fz = clamp((z - this.z0) / this.step, 0, this.nz - 1.001);
    const i = Math.floor(fx), j = Math.floor(fz), tx = fx - i, tz = fz - j;
    const k = j * this.nx + i;
    return lerp(lerp(this.h[k], this.h[k + 1], tx), lerp(this.h[k + this.nx], this.h[k + this.nx + 1], tx), tz);
  }
  wet(x, z) {
    const i = Math.round((x - this.x0) / this.step), j = Math.round((z - this.z0) / this.step);
    if (i < 0 || j < 0 || i >= this.nx || j >= this.nz) return false;
    return this.water[j * this.nx + i] === 1;
  }
}

// ribbon along a polyline at terrain height
function ribbon(pts, width, type, yFn, yOff = 0.08, flags = 0) {
  // densify
  const P = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const [ax, az] = pts[i], [bx, bz] = pts[i + 1];
    const L = Math.hypot(bx - ax, bz - az), n = Math.max(1, Math.ceil(L / 5));
    for (let k = 0; k < n; k++) P.push([lerp(ax, bx, k / n), lerp(az, bz, k / n)]);
  }
  P.push(pts[pts.length - 1]);
  let along = 0;
  for (let i = 0; i < P.length - 1; i++) {
    const [ax, az] = P[i], [bx, bz] = P[i + 1];
    const L = Math.hypot(bx - ax, bz - az); if (L < 0.01) continue;
    const dx = (bx - ax) / L, dz = (bz - az) / L, nx = -dz * width / 2, nz = dx * width / 2;
    // average normals with neighbours for smooth joints
    const poly = [[ax - nx, az - nz], [ax + nx, az + nz], [bx + nx, bz + nz], [bx - nx, bz - nz]];
    const ya = yFn(ax, az) + yOff, yb = yFn(bx, bz) + yOff;
    const c = [(ax + bx) / 2, (az + bz) / 2];
    getChunk(c[0], c[1]).gnd.push({ p: poly, y: (ya + yb) / 2, t: type, f: flags, W: width, L, o: [ax - nx, az - nz, nx * 2 / width, nz * 2 / width, dx, dz], side: 0, ys: [ya, ya, yb, yb] });
    along += L;
  }
}

// =====================================================================
//  Central Park
// =====================================================================
const CP = { x0: -753, x1: -15, z0: zN(110) + 15, z1: zN(59) - 15 };
const CP_WATER = [ // ellipses: cx, n (street), rx, rz(m), name
  [-130, 61.2, 85, 95, 'The Pond'],
  [-560, 74.7, 105, 110, 'The Lake'], [-420, 73.5, 115, 58, 'The Lake'], [-650, 76.3, 55, 60, 'The Lake'],
  [-95, 74.4, 38, 34, 'Conservatory Water'],
  [-370, 80.0, 72, 26, 'Turtle Pond'],
  [-375, 90.6, 245, 385, 'Jacqueline Kennedy Onassis Reservoir'],
  [-165, 107.9, 150, 108, 'Harlem Meer'],
  [-560, 102.1, 55, 40, 'The Pool'],
];
const CP_LAWNS = [
  [-530, 68, 120, 110, 'Sheep Meadow'], [-390, 82.8, 140, 170, 'Great Lawn'], [-410, 99.6, 175, 175, 'North Meadow'],
  [-95, 98.5, 55, 105, 'East Meadow'], [-480, 63.6, 115, 75, 'Heckscher Ballfields'], [-560, 105.1, 100, 95, 'Great Hill'],
  [-680, 72.4, 50, 40, 'Strawberry Fields'], [-200, 77.5, 70, 70, 'Cedar Hill'],
];
function ellD(x, z, e) { const dx = (x - e[0]) / e[2], dz = (z - zN(e[1])) / e[3]; return Math.sqrt(dx * dx + dz * dz); }
function cpWaterAt(x, z) { for (const e of CP_WATER) if (ellD(x, z, e) < 1) return e; return null; }
const CP_PATHS = [];
let cpField = null;

function cpPathNetwork() {
  const drive = [[-722, zN(59.6)], [-650, zN(62)], [-640, zN(66)], [-670, zN(72)], [-625, zN(78)], [-655, zN(86)], [-665, zN(96)], [-610, zN(103)],
    [-480, zN(106.8)], [-310, zN(108.7)], [-200, zN(106.3)], [-110, zN(101)], [-85, zN(95)], [-98, zN(85)], [-112, zN(76)], [-122, zN(70)],
    [-150, zN(64)], [-210, zN(61.2)], [-330, zN(60.4)], [-520, zN(60.1)], [-722, zN(59.6)]];
  CP_PATHS.push({ pts: drive, w: 10, type: 5, drive: true });
  // The Mall and Literary Walk to Bethesda Terrace
  CP_PATHS.push({ pts: [[-300, zN(66.2)], [-345, zN(68.5)], [-392, zN(71.4)]], w: 12, type: 6, mall: true });
  // reservoir running track
  const rv = CP_WATER[6], ring = [];
  for (let i = 0; i <= 48; i++) { const a = i / 48 * Math.PI * 2; ring.push([rv[0] + Math.cos(a) * (rv[2] + 9), zN(rv[1]) + Math.sin(a) * (rv[3] + 9)]); }
  CP_PATHS.push({ pts: ring, w: 4, type: 13 });
  // gates on both avenues wandering into the park
  const R = mulberry32(77);
  const gates = [60, 62, 64, 66, 67, 69, 72, 74, 77, 79, 81, 84, 86, 90, 93, 96, 100, 102, 105, 108];
  for (const g of gates) for (const side of [-1, 1]) {
    const x0 = side < 0 ? CP.x0 + 6 : CP.x1 - 6;
    const z0 = zN(g);
    const tx = side < 0 ? -640 + R() * 60 : -110 + R() * 30;
    const pts = [[x0, z0]];
    const steps = 5;
    for (let k = 1; k <= steps; k++) {
      const t = k / steps;
      pts.push([lerp(x0, tx, t) + (k < steps ? (R() - 0.5) * 40 : 0), z0 + (R() - 0.5) * 50 * Math.sin(t * Math.PI)]);
    }
    let bad = false; for (const p of pts) if (cpWaterAt(p[0], p[1])) bad = true;
    if (!bad) CP_PATHS.push({ pts, w: 3.5, type: 5 });
  }
  // cross-park paths
  for (let i = 0; i < 26; i++) {
    const n = 60 + R() * 49;
    const a = [-640, zN(n)], b = [-110, zN(n + (R() - 0.5) * 3)];
    const pts = [a];
    for (let k = 1; k < 8; k++) { const t = k / 8; pts.push([lerp(a[0], b[0], t), lerp(a[1], b[1], t) + Math.sin(t * 9 + i) * 25]); }
    pts.push(b);
    let ok = true; for (const p of pts) if (cpWaterAt(p[0], p[1]) || ellInLawn(p[0], p[1]) < 0.85) ok = false;
    if (ok) CP_PATHS.push({ pts, w: 3.2, type: 5 });
  }
  // lakeside loops
  for (const idx of [0, 1, 7]) {
    const e = CP_WATER[idx], ring2 = [];
    for (let i = 0; i <= 28; i++) { const a = i / 28 * Math.PI * 2; ring2.push([e[0] + Math.cos(a) * (e[2] + 8), zN(e[1]) + Math.sin(a) * (e[3] + 8)]); }
    CP_PATHS.push({ pts: ring2.filter((p) => !cpWaterAt(p[0], p[1])), w: 3, type: 5 });
  }
}
function ellInLawn(x, z) { let m = 9; for (const e of CP_LAWNS) m = Math.min(m, ellD(x, z, e)); return m; }
function distToPaths(x, z, maxD) {
  let best = maxD;
  for (const P of CP_PATHS) {
    const bb = P.bb || (P.bb = polyBounds(P.pts));
    if (x < bb[0] - best || x > bb[2] + best || z < bb[1] - best || z > bb[3] + best) continue;
    for (let i = 0; i < P.pts.length - 1; i++) {
      const [ax, az] = P.pts[i], [bx, bz] = P.pts[i + 1];
      const dx = bx - ax, dz = bz - az, L2 = dx * dx + dz * dz || 1;
      const t = clamp(((x - ax) * dx + (z - az) * dz) / L2, 0, 1);
      const d = Math.hypot(x - ax - dx * t, z - az - dz * t) - P.w / 2;
      if (d < best) best = d;
    }
  }
  return best;
}

function genCentralPark() {
  cpPathNetwork();
  const F = new HField(CP.x0, CP.z0, CP.x1, CP.z1, 8);
  cpField = F;
  // height: rolling schist hills, flattened under lawns and paths, carved for water
  for (let j = 0; j < F.nz; j++) for (let i = 0; i < F.nx; i++) {
    const x = F.x0 + i * F.step, z = F.z0 + j * F.step;
    const edge = Math.min(x - CP.x0, CP.x1 - x, z - CP.z0, CP.z1 - z);
    let h = 1.2 + 6.5 * fbm(x * 0.004 + 3, z * 0.004 - 2, 3) + 3.5 * Math.pow(fbm(x * 0.012, z * 0.012, 3), 2);
    // Vista Rock under Belvedere Castle, the Ramble ridge, North Woods
    h += 9 * Math.exp(-((x + 380) ** 2 + (z - zN(79.3)) ** 2) / (2 * 22 * 22));
    h += 4 * Math.exp(-((x + 520) ** 2 + (z - zN(77)) ** 2) / (2 * 70 * 70));
    h += 6 * Math.exp(-((x + 580) ** 2 + (z - zN(104)) ** 2) / (2 * 110 * 110));
    const lawn = ellInLawn(x, z);
    if (lawn < 1.2) h = lerp(2.2 + 1.2 * fbm(x * 0.01, z * 0.01, 2), h, smoothstep(0.85, 1.2, lawn));
    const dp = distToPaths(x, z, 20);
    if (dp < 12) h = lerp(1.8 + 3.0 * fbm(x * 0.004 + 3, z * 0.004 - 2, 2), h, smoothstep(1, 12, dp));
    h *= smoothstep(4, 40, edge); h = Math.max(h, 0.35);
    const w = cpWaterAt(x, z);
    if (w) { const d = ellD(x, z, w); h = lerp(-1.8, 0.3, smoothstep(0.75, 1.0, d)); F.water[j * F.nx + i] = 1; }
    else {
      // shoreline slope down toward lakes
      let near = 9; for (const e of CP_WATER) near = Math.min(near, ellD(x, z, e));
      if (near < 1.18) h = lerp(0.65, h, smoothstep(1.0, 1.18, near));
    }
    F.h[j * F.nx + i] = h;
  }
  // terrain mesh in strips (ground material, grass/rock by slope)
  const strips = 10, rowsPer = Math.ceil((F.nz - 1) / strips);
  for (let s = 0; s < strips; s++) {
    const j0 = s * rowsPer, j1 = Math.min(F.nz - 1, j0 + rowsPer);
    const nv = (j1 - j0 + 1) * F.nx;
    const pos = new Float32Array(nv * 3), uv = new Float32Array(nv * 2), gg = new Float32Array(nv * 4);
    for (let j = j0; j <= j1; j++) for (let i = 0; i < F.nx; i++) {
      const v = (j - j0) * F.nx + i, x = F.x0 + i * F.step, z = F.z0 + j * F.step, h = F.h[j * F.nx + i];
      pos[v * 3] = x; pos[v * 3 + 1] = h; pos[v * 3 + 2] = z;
      uv[v * 2] = x; uv[v * 2 + 1] = z;
      const sl = Math.abs(F.h[j * F.nx + Math.min(i + 1, F.nx - 1)] - h) + Math.abs(F.h[Math.min(j + 1, F.nz - 1) * F.nx + i] - h);
      gg[v * 4] = sl > 2.6 && h > 3 ? 9 : 4;
    }
    const idx = [];
    for (let j = j0; j < j1; j++) for (let i = 0; i < F.nx - 1; i++) {
      const a = (j - j0) * F.nx + i, b = a + 1, c = a + F.nx, d = c + 1;
      idx.push(a, c, b, b, c, d);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('aUV', new THREE.BufferAttribute(uv, 2));
    g.setAttribute('aG', new THREE.BufferAttribute(gg, 4));
    g.setIndex(idx); g.computeVertexNormals(); g.computeBoundingSphere();
    extraMeshes.push({ geo: g, mat: 'ground', shadow: 'receive' });
  }
  mapPoly(rectPoly(CP.x0, CP.z0, CP.x1, CP.z1), '#4b7a43');
  // walkable terrain (water blocks you)
  addSolid(rectPoly(CP.x0 + 5, CP.z0 + 5, CP.x1 - 5, CP.z1 - 5), -5, 0, 'terrain', (x, z) => (F.wet(x, z) && cpWaterAt(x, z) ? null : F.at(x, z)));
  // perimeter sidewalk and the low stone wall with gates
  const sw = 5;
  for (const r of [[CP.x0, CP.z0, CP.x1, CP.z0 + sw], [CP.x0, CP.z1 - sw, CP.x1, CP.z1], [CP.x0, CP.z0 + sw, CP.x0 + sw, CP.z1 - sw], [CP.x1 - sw, CP.z0 + sw, CP.x1, CP.z1 - sw]]) {
    addGround(rectPoly(...r), 6, 0.15, { side: 0.15 });
    addSolid(rectPoly(...r), -1, 0.15, 'p');
  }
  const wall = (ax, az, bx, bz) => {
    const L = Math.hypot(bx - ax, bz - az), n = Math.ceil(L / 70);
    for (let k = 0; k < n; k++) {
      const t0 = k / n + 0.035, t1 = (k + 1) / n - 0.035;
      const x0 = lerp(ax, bx, t0), z0 = lerp(az, bz, t0), x1 = lerp(ax, bx, t1), z1 = lerp(az, bz, t1);
      const poly = ax === bx ? rectPoly(x0 - 0.3, Math.min(z0, z1), x0 + 0.3, Math.max(z0, z1)) : rectPoly(Math.min(x0, x1), z0 - 0.3, Math.max(x0, x1), z0 + 0.3);
      pushPiece(poly, 0, 1.0, 0, 0x8e8778, 6, 3, 32);
      pushPiece(poly, 1.0, 1.0, 0, 0x8e8778, 6, 3, 1);
      addSolid(poly, 0, 1.0);
    }
  };
  wall(CP.x0 + sw, CP.z0 + sw, CP.x0 + sw, CP.z1 - sw); wall(CP.x1 - sw, CP.z0 + sw, CP.x1 - sw, CP.z1 - sw);
  wall(CP.x0 + sw, CP.z1 - sw, CP.x1 - sw, CP.z1 - sw); wall(CP.x0 + sw, CP.z0 + sw, CP.x1 - sw, CP.z0 + sw);
  for (let z = CP.z0 + 20; z < CP.z1 - 20; z += 29) { addProp('lamp', CP.x0 - 0.6, z, -Math.PI / 2); addProp('lamp', CP.x1 + 0.6, z, Math.PI / 2); }
  // paths
  for (const P of CP_PATHS) {
    ribbon(P.pts, P.w, P.type, (x, z) => F.at(x, z), 0.12);
    for (const [x, z] of P.pts) mapDot(x, z, P.w, P.drive ? '#7d7a72' : '#a5a08f');
    // lamps & benches
    let acc = 0;
    for (let i = 0; i < P.pts.length - 1; i++) {
      const [ax, az] = P.pts[i], [bx, bz] = P.pts[i + 1], L = Math.hypot(bx - ax, bz - az);
      const dx = (bx - ax) / L, dz = (bz - az) / L;
      for (let s = (30 - acc) % 30; s < L; s += 30) {
        const x = ax + dx * s - dz * (P.w / 2 + 0.8), z = az + dz * s + dx * (P.w / 2 + 0.8);
        if (!cpWaterAt(x, z)) { addProp('parklamp', x, z, 0, F.at(x, z)); }
        if (P.type !== 13 && chance(P.mall ? 0.9 : 0.35)) {
          const x2 = ax + dx * (s + 9) + dz * (P.w / 2 + 0.9), z2 = az + dz * (s + 9) - dx * (P.w / 2 + 0.9);
          if (!cpWaterAt(x2, z2)) addProp('bench', x2, z2, Math.atan2(-dz, dx) + Math.PI, F.at(x2, z2));
        }
      }
      acc = (acc + L) % 30;
    }
  }
  // lakes
  const waterMeshes = [];
  for (const e of CP_WATER) {
    const shape = new THREE.Shape();
    for (let i = 0; i <= 40; i++) {
      const a = i / 40 * Math.PI * 2;
      const x = e[0] + Math.cos(a) * e[2] * 1.02, z = zN(e[1]) + Math.sin(a) * e[3] * 1.02;
      i ? shape.lineTo(x, -z) : shape.moveTo(x, -z);
    }
    const g = new THREE.ShapeGeometry(shape, 1); g.rotateX(-Math.PI / 2); g.translate(0, 0.62, 0);
    waterMeshes.push(g);
    mapEllipse(e[0], zN(e[1]), e[2], e[3], '#5b7e93');
  }
  extraMeshes.push({ geo: mergeGeometries(waterMeshes), mat: 'water', shadow: 'receive' });
  // trees: dense in the Ramble and North Woods, scattered elsewhere, none on lawns, water or paths
  const R = mulberry32(4242);
  let n = 0;
  for (let z = CP.z0 + 10; z < CP.z1 - 10; z += 9) for (let x = CP.x0 + 10; x < CP.x1 - 10; x += 9) {
    const px = x + (R() - 0.5) * 8, pz = z + (R() - 0.5) * 8;
    if (cpWaterAt(px, pz)) continue;
    let near = 9; for (const e of CP_WATER) near = Math.min(near, ellD(px, pz, e));
    if (near < 1.06) continue;
    const lawn = ellInLawn(px, pz);
    if (lawn < 1.0) continue;
    if (distToPaths(px, pz, 6) < 2.5) continue;
    if (px > -165 && pz > zN(84.2) && pz < zN(79.8)) continue; // the Met
    const ramble = Math.exp(-((px + 520) ** 2 + (pz - zN(76.5)) ** 2) / (2 * 120 * 120));
    const north = Math.exp(-((px + 560) ** 2 + (pz - zN(104)) ** 2) / (2 * 150 * 150));
    const dens = clamp(0.5 + 0.5 * Math.max(ramble, north) + 0.35 * (fbm(px * 0.01, pz * 0.01, 2) - 0.5) + (lawn < 1.25 ? -0.2 : 0), 0.05, 0.95);
    if (R() > dens) continue;
    addTree(px, pz, F.at(px, pz) - 0.2, 'park'); n++;
  }
  // The Mall's elms in double rows
  const mall = CP_PATHS.find((p) => p.mall);
  for (let t = 0; t <= 1.0001; t += 1 / 22) {
    const x = lerp(mall.pts[0][0], mall.pts[2][0], t), z = lerp(mall.pts[0][1], mall.pts[2][1], t);
    for (const off of [-9, -14, 9, 14]) addProp('tree', x + off, z, R() * 6, 1.35 + R() * 0.2, F.at(x + off, z), 0, ri(0, 255));
  }
  // rock outcrops
  for (let i = 0; i < 260; i++) {
    const x = rr(CP.x0 + 20, CP.x1 - 20), z = rr(CP.z0 + 20, CP.z1 - 20);
    if (cpWaterAt(x, z) || ellInLawn(x, z) < 1.05 || distToPaths(x, z, 6) < 3) continue;
    addProp('rock', x, z, rr(0, 6), rr(1.2, 4.5), F.at(x, z) - 0.6);
  }
  // Bethesda Terrace & fountain (Angel of the Waters)
  const bx = -404, bz = zN(72.55), by = F.at(bx, bz);
  addGround(rectPoly(bx - 40, bz + 6, bx + 40, bz + 40), 6, by + 0.2, { side: 1 });
  vc('stone', CYL12, 0x9d927e, bx, by + 0.5, bz, 0, 0, 0, 13, 1.0, 13);
  vc('stone', CYL12, 0x9d927e, bx, by + 2.2, bz, 0, 0, 0, 2.2, 3.4, 2.2);
  vc('stone', CYL12, 0x8c826e, bx, by + 4.2, bz, 0, 0, 0, 3.6, 0.3, 3.6);
  vc('copper', CYL8, 0x3f6a5a, bx, by + 6.2, bz, 0, 0, 0, 0.6, 2.4, 0.6);
  vc('copper', BOX, 0x3f6a5a, bx, by + 7.0, bz, 0, 0, 0.3, 3.2, 0.9, 0.25);
  vc('copper', SPH, 0x3f6a5a, bx, by + 7.8, bz, 0, 0, 0, 0.35, 0.4, 0.35);
  const fw = new THREE.CircleGeometry(12.6, 32); fw.rotateX(-Math.PI / 2); fw.translate(bx, by + 0.95, bz);
  extraMeshes.push({ geo: fw, mat: 'water' });
  // arcade wall and the twin staircases
  pushPiece(rectPoly(bx - 40, bz + 40, bx + 40, bz + 46), by, by + 5.5, by, 0xa5977c, 7, 9, 0);
  pushPiece(rectPoly(bx - 40, bz + 40, bx + 40, bz + 46), by + 5.5, by + 5.5, by, 0xa5977c, 7, 9, 1);
  addSolid(rectPoly(bx - 40, bz + 40, bx + 40, bz + 46), by, by + 5.5);
  // Bow Bridge across the Lake
  bowBridge(F);
  // Belvedere Castle on Vista Rock
  const cx = -382, cz = zN(79.15), cy = F.at(cx, cz);
  const castle = (r, y0, y1, fl = 0) => { pushPiece(rectPoly(...r), y0, y1, cy, 0x7b776d, 7, 51, fl); pushPiece(rectPoly(...r), y1, y1, cy, 0x7b776d, 7, 51, 1); addSolid(rectPoly(...r), y0 - 2, y1); };
  castle([cx - 14, cz - 7, cx + 6, cz + 7], cy - 2, cy + 9);
  castle([cx + 6, cz - 4, cx + 13, cz + 4], cy - 2, cy + 18);
  vc('dark', new THREE.ConeGeometry(5.6, 6, 4), 0x3a3a3c, cx + 9.5, cy + 21, cz, 0, Math.PI / 4, 0);
  for (let i = 0; i < 7; i++) vc('stone', BOX, 0x7b776d, cx - 13 + i * 3, cy + 9.6, cz - 6.6, 0, 0, 0, 1.2, 1.2, 0.6);
  // The Metropolitan Museum of Art along Fifth Avenue
  const mx0 = -160, mx1 = -22, mz0 = zN(84.1), mz1 = zN(80.1);
  addBuilding([{ poly: rectPoly(mx0, mz0, mx1, mz1), y0: 0, y1: 24 }], 'civic', { col: 0xd8d0bf, seed: 21, flags: 0, noMap: false });
  addBuilding([{ poly: rectPoly(-46, zN(82.6), -22, zN(81.6)), y0: 0, y1: 31 }], 'civic', { col: 0xddd5c4, seed: 22 });
  for (let i = 0; i < 4; i++) for (const zz of [zN(82.6) + 2, zN(81.6) - 2]) vc('stone', CYL12, 0xe4ddce, -20.5, 12, zz + (i - 1.5) * 0, 0, 0, 0, 0.9, 24, 0.9);
  for (let i = 0; i < 8; i++) vc('stone', CYL12, 0xe4ddce, -20, 12, lerp(zN(82.6) + 2, zN(81.6) - 2, i / 7), 0, 0, 0, 0.9, 24, 0.9);
  addGround(rectPoly(-22, zN(83), -15, zN(81.2)), 6, 0.6, { side: 0.6 });
  addSolid(rectPoly(-22, zN(83), -15, zN(81.2)), -1, 0.6, 'p');
  // Wollman Rink & the reservoir fence
  addGround(rectPoly(-300, zN(62.9), -230, zN(62.1)), 6, F.at(-265, zN(62.5)) + 0.2, { side: 0.6 });
  STATS.cpTrees = n;
  // Columbus Circle monument at the southwest gate
  const ccx = -768, ccz = zN(59);
  addGround(circlePoly(ccx, ccz, 34, 28), 6, 0.04, {});
  addGround(circlePoly(ccx, ccz, 14, 24), 4, 0.25, { side: 0.25 });
  vc('stone', CYL12, 0xc6bfae, ccx, 1.5, ccz, 0, 0, 0, 2.6, 3, 2.6);
  vc('stone', CYL12, 0xd3ccbc, ccx, 12, ccz, 0, 0, 0, 1.15, 21, 1.15);
  vc('stone', BOX, 0xc6bfae, ccx, 22.8, ccz, 0, 0, 0, 2.2, 0.6, 2.2);
  vc('stone', CYL8, 0xbdb6a5, ccx, 25.0, ccz, 0, 0, 0, 0.55, 3.8, 0.55);
  vc('stone', SPH, 0xbdb6a5, ccx, 27.2, ccz, 0, 0, 0, 0.42, 0.45, 0.42);
  addSolid(circlePoly(ccx, ccz, 3, 12), 0, 30);
}
function circlePoly(cx, cz, r, n) { const p = []; for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2; p.push([cx + Math.cos(a) * r, cz + Math.sin(a) * r]); } return p; }
function mapDot(x, z, w, col) { mctx.fillStyle = col; mctx.fillRect((x - MAP.x0) * MAP.s - 0.6, (z - MAP.z0) * MAP.s - 0.6, Math.max(1.2, w * MAP.s), Math.max(1.2, w * MAP.s)); }
function mapEllipse(x, z, rx, rz, col) { mctx.fillStyle = col; mctx.beginPath(); mctx.ellipse((x - MAP.x0) * MAP.s, (z - MAP.z0) * MAP.s, rx * MAP.s, rz * MAP.s, 0, 0, Math.PI * 2); mctx.fill(); }

function bowBridge(F) {
  // find the water span along x = -478
  const x = -478; let za = null, zb = null;
  for (let z = zN(76.5); z < zN(72.5); z += 1) { if (cpWaterAt(x, z)) { if (za === null) za = z; zb = z; } }
  if (za === null) return;
  za -= 5; zb += 5;
  const L = zb - za, segs = 16, w = 3.4;
  for (let i = 0; i < segs; i++) {
    const t0 = i / segs, t1 = (i + 1) / segs;
    const y0 = 1.0 + 2.6 * Math.sin(Math.PI * t0), y1 = 1.0 + 2.6 * Math.sin(Math.PI * t1);
    const z0 = za + L * t0, z1 = za + L * t1;
    vc('stone', BOX, 0xd8d2c2, x, (y0 + y1) / 2 - 0.25, (z0 + z1) / 2, Math.atan2(y1 - y0, z1 - z0) * -1, 0, 0, w, 0.5, (z1 - z0) * 1.03);
    for (const s of [-1, 1]) vc('dark', BOX, 0xcfc8b6, x + s * (w / 2), (y0 + y1) / 2 + 0.5, (z0 + z1) / 2, -Math.atan2(y1 - y0, z1 - z0), 0, 0, 0.12, 0.9, (z1 - z0) * 1.03);
  }
  addSolid(rectPoly(x - w / 2, za, x + w / 2, zb), 0, 4, 'terrain', (px, pz) => 1.25 + 2.6 * Math.sin(Math.PI * clamp((pz - za) / L, 0, 1)));
}

// =====================================================================
//  Small parks and squares
// =====================================================================
function genSquares() {
  for (const p of PARKS) {
    if (p.kind === 'central') continue;
    const r = [p.x0, p.z0, p.x1, p.z1];
    if (p.kind === 'woods') { woodsPark(p); continue; }
    if (p.kind === 'battery') { batteryPark(p); continue; }
    addGround(rectPoly(...r), 3, 0.2, { side: 0.2, W: r[2] - r[0], L: r[3] - r[1], o: [r[0], r[1], 1, 0, 0, 1] });
    addSolid(rectPoly(...r), -1, 0.2, 'p');
    const k = 5;
    const inner = [r[0] + k, r[1] + k, r[2] - k, r[3] - k];
    if (inner[2] - inner[0] < 8 || inner[3] - inner[1] < 8) continue;
    mapPoly(rectPoly(...r), '#4f7f46');
    if (p.kind === 'union' || p.kind === 'cityhall' || p.kind === 'washsq') {
      // plaza center with lawns in the quadrants
      const cx = (inner[0] + inner[2]) / 2, cz = (inner[1] + inner[3]) / 2;
      addGround(rectPoly(...inner), 6, 0.2, { side: 0.05 });
      for (const [sx, sz] of [[0, 0], [1, 0], [0, 1], [1, 1]]) {
        const lx0 = sx ? cx + 6 : inner[0] + 4, lx1 = sx ? inner[2] - 4 : cx - 6, lz0 = sz ? cz + 6 : inner[1] + 4, lz1 = sz ? inner[3] - 4 : cz - 6;
        if (lx1 - lx0 < 6 || lz1 - lz0 < 6) continue;
        addGround(rectPoly(lx0, lz0, lx1, lz1), 4, 0.35, { side: 0.2 });
        for (let i = 0; i < (lx1 - lx0) * (lz1 - lz0) / 160; i++) addTree(rr(lx0 + 2, lx1 - 2), rr(lz0 + 2, lz1 - 2), 0.3, 'park');
        fenceRect(lx0, lz0, lx1, lz1, 0.35, 0.6);
      }
      if (p.kind === 'washsq') washSqArch(cx, inner[1] - 2, cx, cz);
      else if (p.kind === 'cityhall') {
        addBuilding([{ poly: rectPoly(cx - 45, cz - 14, cx + 45, cz + 14), y0: 0, y1: 16 }], 'civic', { col: 0xe8e2d6, seed: 60 });
        addBuilding([{ poly: rectPoly(cx - 8, cz - 8, cx + 8, cz + 8), y0: 16, y1: 30 }], 'civic', { col: 0xe8e2d6, seed: 61 });
        vc('copper', CYL12, 0x4d7a63, cx, 33, cz, 0, 0, 0, 4, 6, 4);
        vc('gold', SPH, 0xc49a3a, cx, 37.5, cz, 0, 0, 0, 1, 1.4, 1);
        fountain(cx, cz + 50, 9);
      } else fountain(cx, cz, 6);
      for (let x = inner[0] + 6; x < inner[2]; x += 18) for (const z of [inner[1] + 2, inner[3] - 2]) addProp('parklamp', x, z, 0, 0.2);
      continue;
    }
    // lawn + trees + benches + fence (classic square)
    addGround(rectPoly(...inner), 4, 0.35, { side: 0.2 });
    fenceRect(inner[0], inner[1], inner[2], inner[3], 0.35, 0.9);
    const cx = (inner[0] + inner[2]) / 2, cz = (inner[1] + inner[3]) / 2;
    addGround(rectPoly(cx - 2, inner[1], cx + 2, inner[3]), 5, 0.4);
    addGround(rectPoly(inner[0], cz - 2, inner[2], cz + 2), 5, 0.41);
    const area = (inner[2] - inner[0]) * (inner[3] - inner[1]);
    for (let i = 0; i < area / 140; i++) {
      const x = rr(inner[0] + 2, inner[2] - 2), z = rr(inner[1] + 2, inner[3] - 2);
      if (Math.abs(x - cx) < 4 || Math.abs(z - cz) < 4) continue;
      addTree(x, z, 0.3, 'park');
    }
    for (let x = inner[0] + 6; x < inner[2] - 4; x += 9) { addProp('bench', x, cz - 3.2, 0, 0.4); addProp('bench', x, cz + 3.2, Math.PI, 0.4); }
    for (let x = inner[0] + 4; x < inner[2]; x += 22) for (const z of [cz - 3, cz + 3]) addProp('parklamp', x, z, 0, 0.4);
    if (p.kind === 'bryant') fountain(inner[0] + 12, cz, 5);
  }
}
function fenceRect(x0, z0, x1, z1, y, hScale = 1) {
  const seg = (ax, az, bx, bz) => {
    const L = Math.hypot(bx - ax, bz - az);
    const n = Math.max(1, Math.round(L / 3));
    for (let i = 0; i < n; i++) {
      if (i === Math.floor(n / 2)) continue; // gate
      const t = (i + 0.5) / n;
      addProp('fence', lerp(ax, bx, t), lerp(az, bz, t), Math.atan2(-(bz - az), bx - ax), L / n, y, hScale);
    }
  };
  seg(x0, z0, x1, z0); seg(x1, z0, x1, z1); seg(x1, z1, x0, z1); seg(x0, z1, x0, z0);
}
function fountain(x, z, r) {
  vc('stone', CYL12, 0xa9a090, x, 0.55, z, 0, 0, 0, r, 0.8, r);
  vc('stone', CYL12, 0xa9a090, x, 1.4, z, 0, 0, 0, 0.8, 2.4, 0.8);
  vc('stone', CYL12, 0x9c9383, x, 2.7, z, 0, 0, 0, 2.2, 0.25, 2.2);
  const g = new THREE.CircleGeometry(r * 0.94, 28); g.rotateX(-Math.PI / 2); g.translate(x, 0.88, z);
  extraMeshes.push({ geo: g, mat: 'water' });
  addSolid(circlePoly(x, z, r, 16), 0, 1.0);
  FOUNTAINS.push([x, 0.9, z, r]);
}
const FOUNTAINS = [];
function washSqArch(cx, zArch, fx, fz) {
  const z0 = zArch - 4.5, z1 = zArch + 4.5, col = 0xece6da;
  const piece = (x0, x1, y0, y1) => { pushPiece(rectPoly(x0, z0, x1, z1), y0, y1, 0, col, 7, 77, 32); pushPiece(rectPoly(x0, z0, x1, z1), y1, y1, 0, col, 7, 77, 1); addSolid(rectPoly(x0, z0, x1, z1), y0, y1); };
  piece(cx - 9.75, cx - 4.5, 0.2, 23); piece(cx + 4.5, cx + 9.75, 0.2, 23); piece(cx - 4.5, cx + 4.5, 15, 23);
  vc('stone', new THREE.CylinderGeometry(4.5, 4.5, 9, 16, 1, false, 0, Math.PI), col, cx, 15, zArch, Math.PI / 2, 0, Math.PI / 2, 1, 1, 1);
  fountain(fx, fz + 10, 14);
}
function woodsPark(p) {
  const r = [p.x0, p.z0, p.x1, p.z1];
  addGround(rectPoly(...r), 4, 0.25, { side: 0.25 });
  addSolid(rectPoly(...r), -1, 0.25, 'p');
  mapPoly(rectPoly(...r), '#3f6b3a');
  const area = (r[2] - r[0]) * (r[3] - r[1]);
  for (let i = 0; i < area / 90; i++) { const x = rr(r[0] + 2, r[2] - 2), z = rr(r[1] + 2, r[3] - 2); if (landAt(x, z) === 'MN') addTree(x, z, 0.25, 'park'); }
  const cx = (r[0] + r[2]) / 2;
  const pts = []; for (let z = r[1]; z <= r[3]; z += 30) pts.push([cx + Math.sin(z * 0.02) * (r[2] - r[0]) * 0.3, z]);
  if (pts.length > 1) ribbon(pts, 3, 5, () => 0.25, 0.04);
}
function batteryPark(p) {
  // lawns, promenade and Castle Clinton at the tip
  const poly = [];
  for (let z = p.z0; z <= Z_MAX; z += 25) poly.push([shoreW(z) + 4, z]);
  for (let z = Z_MAX; z >= p.z0; z -= 25) poly.push([shoreE(z) - 4, z]);
  addGround(poly.filter((q, i) => i % 1 === 0), 4, 0.25, { side: 0.25 });
  addSolid(poly, -1, 0.25, 'p');
  mapPoly(poly, '#4f7f46');
  const b = polyBounds(poly);
  for (let i = 0; i < 900; i++) { const x = rr(b[0], b[2]), z = rr(b[1], b[3]); if (pointInPoly(x, z, poly) && inManhattan(x, z, 15)) addTree(x, z, 0.25, 'park'); }
  const cx = -470, cz = 2830;
  const ring = circlePoly(cx, cz, 28, 20);
  pushPiece(ring, 0.2, 8.5, 0, 0x9a6b4f, 6, 33, 32); pushPiece(ring, 8.5, 8.5, 0, 0x9a6b4f, 6, 33, 1);
  addSolid(ring, 0, 8.5);
  const prom = []; for (let z = p.z0; z <= 2940; z += 20) prom.push([shoreW(z) + 9, z]);
  ribbon(prom, 7, 6, () => 0.25, 0.05);
}
