// =====================================================================
//  Bridges
// =====================================================================
const BRIDGE_LINES = [];   // suspender & stay lines [x,y,z,x,y,z,...]
const BRIDGE_LIGHTS = [];  // necklace light points
const CABLES = [];         // tube geometries
const LATTICE = [];        // see-through steel geometry (uses lattice material)
const BRIDGES = [];

function suspBridge(o) {
  const { ax, az } = o;
  const dl = Math.hypot(o.dx, o.dz), dx = o.dx / dl, dz = o.dz / dl;
  const px = -dz, pz = dx; // across
  const P = (s, off = 0) => [ax + dx * s + px * off, az + dz * s + pz * off];
  const t1 = o.t1, t2 = o.t2, len = o.len, Y = o.deckY;
  const rampIn = o.rampIn || t1 - 20, rampOut = o.rampOut || len - t2 - 20;
  const yAt = (s) => {
    if (s < t1) return Y * smoothstep(0, 1, clamp(s / rampIn, 0, 1)) * 0.5 + Y * clamp(s / rampIn, 0, 1) * 0.5;
    if (s <= t2) return Y + (o.crown || 3) * Math.sin(Math.PI * (s - t1) / (t2 - t1));
    if (o.flatEnd) return Y;
    const u = clamp((len - s) / rampOut, 0, 1); return Y * (0.5 * smoothstep(0, 1, u) + 0.5 * u);
  };
  const W = o.width;
  BRIDGES.push({ name: o.name, P, yAt, len, W, dx, dz });
  // deck segments
  const seg = 8;
  for (let s = 0; s < len; s += seg) {
    const s1 = Math.min(len, s + seg);
    const y0 = yAt(s), y1 = yAt(s1);
    const a = P(s, -W / 2), b = P(s, W / 2), c = P(s1, W / 2), d = P(s1, -W / 2);
    const mid = P((s + s1) / 2);
    const lanesW = (W - o.walk) / 2;
    // road lanes on both sides, planks for the promenade in the middle
    const l0 = [P(s, -W / 2), P(s, -o.walk / 2), P(s1, -o.walk / 2), P(s1, -W / 2)];
    const l1 = [P(s, o.walk / 2), P(s, W / 2), P(s1, W / 2), P(s1, o.walk / 2)];
    const wk = [P(s, -o.walk / 2), P(s, o.walk / 2), P(s1, o.walk / 2), P(s1, -o.walk / 2)];
    const push = (poly, t, yy, extra, oo) => getChunk(mid[0], mid[1]).gnd.push({ p: poly, y: (y0 + y1) / 2 + yy, t, f: extra, W: oo.W, L: s1 - s, o: oo.o, side: 0, ys: [y0 + yy, y0 + yy, y1 + yy, y1 + yy] });
    push(l0, 1, 0.02, 1, { W: lanesW, o: [l0[0][0], l0[0][1], px, pz, dx, dz] });
    push(l1, 1, 0.02, 1, { W: lanesW, o: [l1[0][0], l1[0][1], px, pz, dx, dz] });
    push(wk, 8, o.walkRaise || 0.05, 0, { W: o.walk, o: [wk[0][0], wk[0][1], px, pz, dx, dz] });
    // deck girder / truss underside
    const ym = (y0 + y1) / 2;
    if (ym > 2) {
      const ang = Math.atan2(y1 - y0, s1 - s);
      vc('dark', BOX, o.steel, mid[0], ym - o.girder / 2 - 0.05, mid[1], 0, Math.atan2(dx, dz), 0, W, o.girder, (s1 - s) * 1.01);
      for (const sd of [-1, 1]) {
        const e = P((s + s1) / 2, sd * (W / 2 + 0.3));
        vc('dark', BOX, o.rail, e[0], ym + 0.6, e[1], -ang * 0, Math.atan2(dx, dz), 0, 0.25, 1.3, (s1 - s) * 1.01);
      }
    }
    // piers under the approaches
    if (ym > 6 && Math.round(s / seg) % 5 === 0 && (s < t1 - 30 || s > t2 + 30)) {
      const pp = P((s + s1) / 2);
      const land = landAt(pp[0], pp[1]);
      const base = land ? groundHeight(pp[0], pp[1]) : -6;
      pushPiece(orientedRect(pp[0], pp[1], dx, dz, 3, W / 2 - 1), base, ym - o.girder, base, o.pierCol, 6, 4, 32);
      if (land) addSolid(orientedRect(pp[0], pp[1], dx, dz, 3, W / 2 - 1), base, ym - o.girder - 0.5);
    }
    mapLine(P(s), P(s1), '#8c8a84', W * MAP.s * 0.9);
  }
  // walkable deck and side rails
  const mid = P(len / 2);
  addSolid(orientedRect(mid[0], mid[1], dx, dz, len / 2, W / 2), -100, 0, 'terrain', (x, z) => {
    const s = (x - ax) * dx + (z - az) * dz; return yAt(s) + 0.02 + (Math.abs((x - ax) * px + (z - az) * pz) < o.walk / 2 ? (o.walkRaise || 0.05) : 0);
  });
  for (const sd of [-1, 1]) {
    const c = P(len / 2, sd * (W / 2 + 0.3));
    const s = addSolid(orientedRect(c[0], c[1], dx, dz, len / 2, 0.3), 0, 1, 'rail', (x, z) => yAt((x - ax) * dx + (z - az) * dz) + 1.2);
    s.thick = 2.2;
  }
  // reserve the land part so no building stands in the way
  reserve(orientedRect(mid[0], mid[1], dx, dz, len / 2, W / 2 + 4), o.name);
  // towers
  for (const ts of [t1, t2]) tower(o, P, ts, yAt(ts), dx, dz, px, pz);
  // anchorages
  for (const as of [o.a1, o.a2]) {
    const c = P(as);
    const ground = landAt(c[0], c[1]) ? groundHeight(c[0], c[1]) : -6;
    const top = yAt(as) - 0.8;
    if (top - ground > 3) { pushPiece(orientedRect(c[0], c[1], dx, dz, 22, W / 2 + 4), ground, top, ground, o.pierCol, 6, 4, 32); pushPiece(orientedRect(c[0], c[1], dx, dz, 22, W / 2 + 4), top, top, ground, o.pierCol, 6, 4, 1); }
  }
  // main cables, suspenders, stays and necklace lights
  const offs = o.cables;
  const topY = o.towerTop - 2;
  for (const off of offs) {
    const pts = [];
    const cy = (s) => {
      if (s <= t1) { const u = clamp((s - o.a1) / (t1 - o.a1), 0, 1); const ya = yAt(o.a1) + 2; return lerp(ya, topY, u) - 6 * Math.sin(Math.PI * u) * (o.sideSag || 1); }
      if (s <= t2) { const u = (s - t1) / (t2 - t1); const low = yAt((t1 + t2) / 2) + 2.5; return low + (topY - low) * Math.pow(2 * u - 1, 2); }
      const u = clamp((s - t2) / (o.a2 - t2), 0, 1); const yb = yAt(o.a2) + 2; return lerp(topY, yb, u) - 6 * Math.sin(Math.PI * u) * (o.sideSag || 1);
    };
    for (let s = o.a1; s <= o.a2 + 0.01; s += 12) { const p = P(s, off); pts.push(new THREE.Vector3(p[0], cy(s), p[1])); }
    const curve = new THREE.CatmullRomCurve3(pts);
    CABLES.push(new THREE.TubeGeometry(curve, Math.ceil((o.a2 - o.a1) / 6), o.cableR, 6, false));
    for (let s = o.a1 + 4; s < o.a2 - 4; s += o.susp) {
      if (Math.abs(s - t1) < 8 || Math.abs(s - t2) < 8) continue;
      const p = P(s, off), yc = cy(s), yd = yAt(s) + 0.8;
      if (yc - yd > 0.8) BRIDGE_LINES.push(p[0], yc, p[1], p[0], yd, p[1]);
      if (Math.round(s / o.susp) % 2 === 0) BRIDGE_LIGHTS.push(p[0], yc + o.cableR + 0.2, p[1]);
    }
    if (o.stays) {
      for (const ts of [t1, t2]) for (const sg of [-1, 1]) for (let k = 1; k <= o.stays; k++) {
        const s = ts + sg * k * 11; const p0 = P(ts, off), p1 = P(s, off);
        BRIDGE_LINES.push(p0[0], topY - 6, p0[1], p1[0], yAt(s) + 0.8, p1[1]);
      }
    }
  }
}

function tower(o, P, s, deckY, dx, dz, px, pz) {
  const W = o.width, top = o.towerTop;
  const rot = Math.atan2(dx, dz);
  const c = P(s);
  const water = -6;
  if (o.kind === 'stone') {
    const across = W / 2 + 7, depth = 9;
    const legs = [[-across, -across + 7], [-4.5, 4.5], [across - 7, across]];
    pushPiece(orientedRect(c[0], c[1], dx, dz, depth, across), water, deckY - 1.5, water, o.pierCol, 6, 7, 32);
    for (const [a, b] of legs) {
      const m = P(s, (a + b) / 2);
      const pr = orientedRect(m[0], m[1], dx, dz, depth * 0.85, (b - a) / 2);
      pushPiece(pr, deckY - 1.5, deckY + 28, water, o.pierCol, 6, 7, 32);
      addSolid(pr, deckY - 1.5, top);
    }
    // pointed arches: step the openings in
    const steps = [[28, 31, 1.5], [31, 34, 3.0], [34, 36.5, 4.2]];
    for (const [h0, h1, k] of steps) for (const [a, b] of [[-across + 7, -4.5], [4.5, across - 7]]) {
      for (const sd of [a, b]) {
        const m = P(s, sd === a ? a + k / 2 : b - k / 2);
        pushPiece(orientedRect(m[0], m[1], dx, dz, depth * 0.85, k / 2 + 0.01), deckY + h0, deckY + h1, water, o.pierCol, 6, 7, 32);
      }
    }
    const tp0 = orientedRect(c[0], c[1], dx, dz, depth * 0.85, across);
    pushPiece(tp0, deckY + 36.5, top, water, o.pierCol, 6, 7, 32);
    pushPiece(tp0, top, top, water, o.pierCol, 6, 7, 1);
    const cap = orientedRect(c[0], c[1], dx, dz, depth * 0.95, across + 0.8);
    pushPiece(cap, top - 3, top - 2.2, water, 0x9a8f7a, 6, 7, 32);
    return;
  }
  if (o.kind === 'steel' || o.kind === 'lattice') {
    const across = W / 2 + 2.5, leg = o.kind === 'steel' ? 3 : 4;
    pushPiece(orientedRect(c[0], c[1], dx, dz, 8, across + 3), water, deckY - o.girder, water, o.pierCol, 6, 7, 32);
    for (const sd of [-1, 1]) {
      const m = P(s, sd * (across - leg / 2));
      const lp = orientedRect(m[0], m[1], dx, dz, leg * 0.8, leg / 2);
      addSolid(lp, deckY - 2, top);
      if (o.kind === 'lattice') LATTICE.push(latticeBox(m[0], (deckY + top) / 2, m[1], leg * 1.6, top - deckY, leg, rot, o.steel));
      else vc('metal', BOX, o.steel, m[0], (deckY - o.girder + top) / 2, m[1], 0, rot, 0, leg, top - deckY + o.girder, leg * 1.6);
    }
    for (let h = deckY + 18; h < top; h += o.kind === 'steel' ? 22 : 16) vc('metal', BOX, o.steel, c[0], h, c[1], 0, rot, 0, across * 2, 1.6, 2.2);
    vc('metal', BOX, o.steel, c[0], top - 1, c[1], 0, rot, 0, across * 2 + 2, 2.5, 3.6);
    if (o.kind === 'lattice') for (let h = deckY + 6; h < top - 10; h += 16) LATTICE.push(latticeBox(c[0], h + 8, c[1], 1.2, 16, across * 2 - leg, rot + Math.PI / 2, o.steel, true));
    return;
  }
  if (o.kind === 'gwb') {
    const across = W / 2 + 6, legW = 12, legD = 10;
    pushPiece(orientedRect(c[0], c[1], dx, dz, 14, across + 6), water, 8, water, o.pierCol, 6, 7, 32);
    for (const sd of [-1, 1]) {
      const m = P(s, sd * (across - legW / 2));
      LATTICE.push(latticeBox(m[0], (8 + top) / 2, m[1], legD, top - 8, legW, rot, o.steel));
      addSolid(orientedRect(m[0], m[1], dx, dz, legD / 2, legW / 2), 8, top);
    }
    for (let h = 40; h < top; h += 46) LATTICE.push(latticeBox(c[0], h, c[1], 6, 9, across * 2 - legW, rot, o.steel, true));
    LATTICE.push(latticeBox(c[0], top - 4, c[1], 8, 8, across * 2 + 2, rot, o.steel, true));
  }
}

// a box whose faces use the see-through lattice texture; uv in meters/8
function latticeBox(x, y, z, depth, h, width, rot, hex, sideways = false) {
  let g = new THREE.BoxGeometry(sideways ? width : width, h, depth);
  if (sideways) g = new THREE.BoxGeometry(width, h, depth);
  const uv = g.attributes.uv, pos = g.attributes.position, nrm = g.attributes.normal;
  for (let i = 0; i < uv.count; i++) {
    const nx = Math.abs(nrm.getX(i)), ny = Math.abs(nrm.getY(i));
    const a = nx > 0.5 ? pos.getZ(i) : pos.getX(i);
    const b = ny > 0.5 ? pos.getZ(i) : pos.getY(i);
    uv.setXY(i, a / 7, b / 7);
  }
  g = g.toNonIndexed();
  g.applyMatrix4(new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, rot + (sideways ? Math.PI / 2 : 0), 0)), new THREE.Vector3(1, 1, 1)));
  const c = new THREE.Color(hex), n = g.attributes.position.count, col = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b; }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return g;
}

function genBridges() {
  // Brooklyn Bridge — granite Gothic towers, the diagonal stays make its web
  suspBridge({ name: 'Brooklyn Bridge', ax: 250, az: 1450, dx: 0.96, dz: 0.28, len: 1850, t1: 600, t2: 1086, a1: 330, a2: 1369, deckY: 38, crown: 3,
    towerTop: 84, width: 26, walk: 6, walkRaise: 0.6, kind: 'stone', pierCol: 0xa89d88, steel: 0x3a3632, rail: 0x2e2a26, girder: 3, cables: [-12, -5, 5, 12], cableR: 0.4, susp: 3, stays: 12 });
  tp('Bridges', 'Brooklyn Bridge promenade', 250 + 0.96 * 420, 1450 + 0.28 * 420, Math.atan2(-0.96, -0.28), null, 'Walk toward Brooklyn');
  // Manhattan Bridge — blue steel towers
  suspBridge({ name: 'Manhattan Bridge', ax: 620, az: 620, dx: 0.99, dz: 0.12, len: 1950, t1: 790, t2: 1238, a1: 569, a2: 1459, deckY: 41, crown: 3,
    towerTop: 98, width: 30, walk: 3, kind: 'steel', pierCol: 0x9a958a, steel: 0x6f8fa8, rail: 0x5c7a92, girder: 6, cables: [-13, -7, 7, 13], cableR: 0.45, susp: 4 });
  // Williamsburg Bridge — black lattice towers
  suspBridge({ name: 'Williamsburg Bridge', ax: 1380, az: 290, dx: 0.97, dz: -0.243, len: 1450, t1: 330, t2: 818, a1: 148, a2: 1000, deckY: 41, crown: 2,
    towerTop: 102, width: 36, walk: 4, kind: 'lattice', pierCol: 0x8f8a80, steel: 0x2b2d2e, rail: 0x2b2d2e, girder: 7, cables: [-14, 14], cableR: 0.55, susp: 4, sideSag: 0.4 });
  // George Washington Bridge — bare steel lattice towers, deck meets the Palisades
  suspBridge({ name: 'George Washington Bridge', ax: -760, az: zN(178), dx: -1, dz: 0, len: 2000, t1: 580, t2: 1647, a1: 360, a2: 1860, deckY: 64, crown: 3,
    towerTop: 184, width: 36, walk: 4, kind: 'gwb', pierCol: 0x8f8a80, steel: 0x8b9397, rail: 0x6b7377, girder: 9, cables: [-16, -13, 13, 16], cableR: 0.7, susp: 6, flatEnd: true, rampIn: 520 });
  tp('Bridges', 'George Washington Bridge', -760 - 700, zN(178) + 6, Math.PI / 2, null, 'Over the Hudson at 178th St');
  tp('Bridges', 'Manhattan Bridge', 620 + 600, 620 + 72, -Math.PI / 2, null, 'From Canal St');
  queensboro();
}

function queensboro() {
  const z = zN(59.6), x0 = 520, x1 = 2500, Y = 40, W = 28;
  const piers = [1255, 1300, 1450, 1700];
  const yAt = (x) => Y * Math.min(clamp((x - x0) / 560, 0, 1), clamp((x1 - x) / 560, 0, 1));
  BRIDGES.push({ name: 'Queensboro Bridge', P: (s, off = 0) => [x0 + s, z + off], yAt: (s) => yAt(x0 + s), len: x1 - x0, W, dx: 1, dz: 0 });
  for (let x = x0; x < x1; x += 8) {
    const y0 = yAt(x), y1 = yAt(x + 8);
    getChunk(x + 4, z).gnd.push({ p: [[x, z - W / 2], [x, z + W / 2], [x + 8, z + W / 2], [x + 8, z - W / 2]], y: (y0 + y1) / 2, t: 1, f: 1, W, L: 8, o: [x, z - W / 2, 0, 1, 1, 0], side: 0, ys: [y0, y0, y1, y1] });
    if ((y0 + y1) / 2 > 2) vc('dark', BOX, 0x5d6266, x + 4, (y0 + y1) / 2 - 2.6, z, 0, 0, 0, 8.08, 5, W);
    mapLine([x, z], [x + 8, z], '#8c8a84', W * MAP.s * 0.9);
  }
  addSolid(rectPoly(x0, z - W / 2, x1, z + W / 2), -100, 0, 'terrain', (x) => yAt(x) + 0.02);
  for (const sd of [-1, 1]) { const s = addSolid(rectPoly(x0, z + sd * (W / 2 + 0.3) - 0.3, x1, z + sd * (W / 2 + 0.3) + 0.3), 0, 1, 'rail', (x) => yAt(x) + 1.2); s.thick = 2.2; }
  reserve(rectPoly(x0, z - W / 2 - 4, x1, z + W / 2 + 4), 'Queensboro Bridge');
  // cantilever truss: chord rises over each pier
  const chord = (x) => { let h = 8; for (const p of piers) h = Math.max(h, 34 - Math.abs(x - p) * 0.2); return h; };
  for (let x = 1100; x < 1860; x += 10) {
    const h0 = chord(x), h1 = chord(x + 10), h = (h0 + h1) / 2;
    for (const sd of [-1, 1]) LATTICE.push(latticeBox(x + 5, Y + h / 2, z + sd * (W / 2 + 0.5), 1, h, 10.05, 0, 0x8a8f8c));
    vc('metal', BOX, 0x8a8f8c, x + 5, Y + h, z, Math.atan2(h1 - h0, 10) * 0, 0, Math.atan2(h1 - h0, 10), 10.3, 1.0, W + 2);
  }
  for (const p of piers) {
    const base = landAt(p, z) ? 0 : -6;
    pushPiece(rectPoly(p - 6, z - W / 2 - 3, p + 6, z + W / 2 + 3), base, Y - 5, base, 0x9c958a, 6, 7, 32);
    for (const sd of [-1, 1]) { vc('metal', new THREE.ConeGeometry(1.6, 12, 4), 0x8a8f8c, p, Y + 40, z + sd * (W / 2 + 0.5)); addSolid(rectPoly(p - 3, z + sd * (W / 2) - 1.5, p + 3, z + sd * (W / 2) + 1.5), Y - 6, Y + 34); }
  }
  for (let x = 1100; x < 1860; x += 9) BRIDGE_LIGHTS.push(x, Y + chord(x) + 0.8, z - W / 2 - 0.5, x, Y + chord(x) + 0.8, z + W / 2 + 0.5);
  tp('Bridges', 'Queensboro Bridge', 900, z, -Math.PI / 2, null, '59th St over Roosevelt Island');
}
