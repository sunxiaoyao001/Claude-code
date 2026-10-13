// =====================================================================
//  Geometry builders: building & ground specs → chunked BufferGeometry
// =====================================================================
function buildBuildingGeometry(specs) {
  let nv = 0, ni = 0;
  for (const s of specs) {
    if (s.faces) { for (const f of s.faces) { nv += f.length; ni += (f.length - 2) * 3; } continue; }
    const n = s.p.length;
    if (s.fl & 1) { nv += n; ni += (n - 2) * 3; }
    else if (s.y1 - s.y0 > 0.01) { nv += n * 4; ni += n * 6; }  // upper bound; degenerate walls are skipped
  }
  if (!nv) return null;
  const pos = new Float32Array(nv * 3), nrm = new Int8Array(nv * 3), uv = new Int16Array(nv * 2), wall = new Uint16Array(nv * 2);
  const col = new Uint8Array(nv * 3), meta = new Uint8Array(nv * 4);
  const idx = nv > 65535 ? new Uint32Array(ni) : new Uint16Array(ni);
  let v = 0, k = 0;
  const put = (x, y, z, nx, ny, nz, u, h, L, top, s) => {
    pos[v * 3] = x; pos[v * 3 + 1] = y; pos[v * 3 + 2] = z;
    nrm[v * 3] = nx * 127; nrm[v * 3 + 1] = ny * 127; nrm[v * 3 + 2] = nz * 127;
    uv[v * 2] = clamp(Math.round(u * 10), -32760, 32760); uv[v * 2 + 1] = clamp(Math.round(h * 10), -32760, 32760);
    wall[v * 2] = clamp(Math.round(L * 10), 0, 65535); wall[v * 2 + 1] = clamp(Math.round(top * 10), 0, 65535);
    col[v * 3] = (s.col >> 16) & 255; col[v * 3 + 1] = (s.col >> 8) & 255; col[v * 3 + 2] = s.col & 255;
    meta[v * 4] = s.st; meta[v * 4 + 1] = s.sd & 255; meta[v * 4 + 2] = s.fl; meta[v * 4 + 3] = clamp(Math.round(s.hw * 10), 0, 255);
    return v++;
  };
  for (const s of specs) {
    if (s.faces) {
      for (const f of s.faces) {
        let nx = 0, ny = 0, nz = 0;
        for (let i = 0; i < f.length; i++) { const a = f[i], b = f[(i + 1) % f.length]; nx += (a[1] - b[1]) * (a[2] + b[2]); ny += (a[2] - b[2]) * (a[0] + b[0]); nz += (a[0] - b[0]) * (a[1] + b[1]); }
        const nl = Math.hypot(nx, ny, nz) || 1; nx /= nl; ny /= nl; nz /= nl;
        // Newell gives the normal for CCW-from-outside ordering
        let tx = -nz, tz = nx; const tl = Math.hypot(tx, tz) || 1; tx /= tl; tz /= tl;
        let umin = Infinity, umax = -Infinity;
        for (const q of f) { const u = q[0] * tx + q[2] * tz; umin = Math.min(umin, u); umax = Math.max(umax, u); }
        let ytop = 0; for (const q of f) ytop = Math.max(ytop, q[1]);
        const i0 = v;
        for (const q of f) put(q[0], q[1], q[2], nx, ny, nz, q[0] * tx + q[2] * tz - umin, q[1] - s.base, umax - umin, ytop - s.base, s);
        for (let i = 1; i < f.length - 1; i++) { idx[k++] = i0; idx[k++] = i0 + i; idx[k++] = i0 + i + 1; }
      }
      continue;
    }
    const p = s.p, n = p.length;
    const sgn = polyArea(p) >= 0 ? 1 : -1;
    if (s.fl & 1) {
      const i0 = v;
      for (const q of p) put(q[0], s.y1, q[1], 0, 1, 0, 0, 0, 0, 0, s);
      for (let i = 1; i < n - 1; i++) {
        if (sgn > 0) { idx[k++] = i0; idx[k++] = i0 + i + 1; idx[k++] = i0 + i; }
        else { idx[k++] = i0; idx[k++] = i0 + i; idx[k++] = i0 + i + 1; }
      }
      continue;
    }
    if (s.y1 - s.y0 <= 0.01) continue;
    const top = s.y1 - s.base;
    for (let i = 0; i < n; i++) {
      const a = p[i], b = p[(i + 1) % n];
      const dx = b[0] - a[0], dz = b[1] - a[1];
      const L = Math.hypot(dx, dz);
      if (L < 0.05) continue;
      const nx = sgn * dz / L, nz = -sgn * dx / L;
      const h0 = s.y0 - s.base, h1 = s.y1 - s.base;
      const A0 = put(a[0], s.y0, a[1], nx, 0, nz, 0, h0, L, top, s);
      const B0 = put(b[0], s.y0, b[1], nx, 0, nz, L, h0, L, top, s);
      const B1 = put(b[0], s.y1, b[1], nx, 0, nz, L, h1, L, top, s);
      const A1 = put(a[0], s.y1, a[1], nx, 0, nz, 0, h1, L, top, s);
      if (nx * (-dz) + nz * dx > 0) { idx[k++] = A0; idx[k++] = B0; idx[k++] = B1; idx[k++] = A0; idx[k++] = B1; idx[k++] = A1; }
      else { idx[k++] = A0; idx[k++] = B1; idx[k++] = B0; idx[k++] = A0; idx[k++] = A1; idx[k++] = B1; }
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos.subarray(0, v * 3), 3));
  g.setAttribute('normal', new THREE.BufferAttribute(nrm.subarray(0, v * 3), 3, true));
  g.setAttribute('aUV', new THREE.BufferAttribute(uv.subarray(0, v * 2), 2));
  g.setAttribute('aWall', new THREE.BufferAttribute(wall.subarray(0, v * 2), 2));
  g.setAttribute('aCol', new THREE.BufferAttribute(col.subarray(0, v * 3), 3, true));
  g.setAttribute('aMeta', new THREE.BufferAttribute(meta.subarray(0, v * 4), 4, true));
  g.setIndex(new THREE.BufferAttribute(idx.subarray(0, k), 1));
  g.computeBoundingSphere(); g.computeBoundingBox();
  return g;
}

function buildGroundGeometry(specs) {
  let nv = 0, ni = 0;
  for (const s of specs) { const n = s.p.length; nv += n; ni += (n - 2) * 3; if (s.side) { nv += n * 4; ni += n * 6; } }
  if (!nv) return null;
  const pos = new Float32Array(nv * 3), nrm = new Int8Array(nv * 3), uv = new Float32Array(nv * 2), gg = new Float32Array(nv * 4);
  const idx = nv > 65535 ? new Uint32Array(ni) : new Uint16Array(ni);
  let v = 0, k = 0;
  const put = (x, y, z, nx, ny, nz, u, w, s) => {
    pos[v * 3] = x; pos[v * 3 + 1] = y; pos[v * 3 + 2] = z;
    nrm[v * 3] = nx * 127; nrm[v * 3 + 1] = ny * 127; nrm[v * 3 + 2] = nz * 127;
    uv[v * 2] = u; uv[v * 2 + 1] = w;
    gg[v * 4] = s.t; gg[v * 4 + 1] = s.f; gg[v * 4 + 2] = s.W; gg[v * 4 + 3] = s.L;
    return v++;
  };
  const mapUV = (s, x, z) => {
    if (!s.o) return [x, z];
    const [ox, oz, ux, uz, vx, vz] = s.o;
    return [(x - ox) * ux + (z - oz) * uz, (x - ox) * vx + (z - oz) * vz];
  };
  for (const s of specs) {
    const p = s.p, n = p.length, sgn = polyArea(p) >= 0 ? 1 : -1;
    const i0 = v;
    for (let qi = 0; qi < n; qi++) { const q = p[qi]; const t = mapUV(s, q[0], q[1]); put(q[0], s.ys ? s.ys[qi] : s.y, q[1], 0, 1, 0, t[0], t[1], s); }
    for (let i = 1; i < n - 1; i++) {
      if (sgn > 0) { idx[k++] = i0; idx[k++] = i0 + i + 1; idx[k++] = i0 + i; }
      else { idx[k++] = i0; idx[k++] = i0 + i; idx[k++] = i0 + i + 1; }
    }
    if (s.side) {
      for (let i = 0; i < n; i++) {
        const a = p[i], b = p[(i + 1) % n];
        const dx = b[0] - a[0], dz = b[1] - a[1], L = Math.hypot(dx, dz);
        if (L < 0.05) continue;
        const nx = sgn * dz / L, nz = -sgn * dx / L;
        const ta = mapUV(s, a[0], a[1]), tb = mapUV(s, b[0], b[1]);
        const A0 = put(a[0], s.y - s.side, a[1], nx, 0, nz, ta[0], ta[1], s);
        const B0 = put(b[0], s.y - s.side, b[1], nx, 0, nz, tb[0], tb[1], s);
        const B1 = put(b[0], s.y, b[1], nx, 0, nz, tb[0], tb[1], s);
        const A1 = put(a[0], s.y, a[1], nx, 0, nz, ta[0], ta[1], s);
        if (nx * (-dz) + nz * dx > 0) { idx[k++] = A0; idx[k++] = B0; idx[k++] = B1; idx[k++] = A0; idx[k++] = B1; idx[k++] = A1; }
        else { idx[k++] = A0; idx[k++] = B1; idx[k++] = B0; idx[k++] = A0; idx[k++] = A1; idx[k++] = B1; }
      }
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos.subarray(0, v * 3), 3));
  g.setAttribute('normal', new THREE.BufferAttribute(nrm.subarray(0, v * 3), 3, true));
  g.setAttribute('aUV', new THREE.BufferAttribute(uv.subarray(0, v * 2), 2));
  g.setAttribute('aG', new THREE.BufferAttribute(gg.subarray(0, v * 4), 4));
  g.setIndex(new THREE.BufferAttribute(idx.subarray(0, k), 1));
  g.computeBoundingSphere();
  return g;
}

// =====================================================================
//  Prop model library (merged, vertex-colored)
// =====================================================================
function colorize(g, hex) {
  g = g.index ? g.toNonIndexed() : g;
  const c = new THREE.Color(hex);
  const n = g.attributes.position.count, a = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { a[i * 3] = c.r; a[i * 3 + 1] = c.g; a[i * 3 + 2] = c.b; }
  g.setAttribute('color', new THREE.BufferAttribute(a, 3));
  if (g.attributes.uv) g.deleteAttribute('uv');
  return g;
}
function part(geo, hex, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) {
  const m = new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)), new THREE.Vector3(sx, sy, sz));
  const g = geo.clone(); g.applyMatrix4(m);
  return colorize(g, hex);
}
const BOX = new THREE.BoxGeometry(1, 1, 1);
const CYL6 = new THREE.CylinderGeometry(1, 1, 1, 6);
const CYL8 = new THREE.CylinderGeometry(1, 1, 1, 8);
const CYL12 = new THREE.CylinderGeometry(1, 1, 1, 12);
const SPH = new THREE.SphereGeometry(1, 8, 6);
const merge = (arr) => { const g = mergeGeometries(arr, false); g.computeBoundingSphere(); return g; };

function lampModel() {
  const pole = 0x5f6366;
  return merge([
    part(CYL8, pole, 0, 0.4, 0, 0, 0, 0, 0.17, 0.8, 0.17),
    part(CYL8, pole, 0, 4.2, 0, 0, 0, 0, 0.09, 8.2, 0.09),
    part(BOX, pole, 0, 8.25, -1.1, 0.12, 0, 0, 0.09, 0.09, 2.4),
  ]);
}
function lampHeadModel() { return merge([part(BOX, 0xffffff, 0, 8.12, -2.35, 0.1, 0, 0, 0.42, 0.16, 0.85)]); }
function treeTrunk() { return merge([part(CYL6, 0x4a3a2c, 0, 1.6, 0, 0, 0, 0, 0.16, 3.2, 0.16), part(CYL6, 0x4a3a2c, 0.5, 3.3, 0, 0, 0, 0.55, 0.08, 1.6, 0.08), part(CYL6, 0x4a3a2c, -0.4, 3.5, 0.2, 0.3, 0, -0.5, 0.07, 1.5, 0.07)]); }
function treeCrown(detail) {
  const parts = [];
  const blobs = detail ? [[0, 5.2, 0, 2.7], [1.35, 4.6, 0.5, 1.9], [-1.2, 4.75, -0.6, 2.0], [0.0, 4.4, 1.35, 1.75]] : [[0.3, 5.0, 0.2, 2.8], [-0.9, 4.6, -0.5, 2.1]];
  for (const [x, y, z, r] of blobs) {
    let g = new THREE.IcosahedronGeometry(r, detail ? 1 : 0);
    if (g.index) g = g.toNonIndexed();
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const px = p.getX(i), py = p.getY(i), pz = p.getZ(i);
      const k = 1 + 0.18 * Math.sin(px * 3.1 + pz * 2.3) * Math.cos(py * 2.7);
      p.setXYZ(i, px * k + x, py * k * 0.85 + y, pz * k + z);
    }
    g.deleteAttribute('normal'); g.deleteAttribute('uv');
    g = mergeVertices(g, 1e-3); g.computeVertexNormals(); g = g.toNonIndexed();
    const c = new Float32Array(g.attributes.position.count * 3);
    const p2 = g.attributes.position;
    for (let i = 0; i < p2.count; i++) { const sh = 0.62 + 0.38 * ((p2.getY(i) - y) / r * 0.5 + 0.5); c[i * 3] = sh; c[i * 3 + 1] = sh; c[i * 3 + 2] = sh; }
    g.setAttribute('color', new THREE.BufferAttribute(c, 3));
    parts.push(g);
  }
  return merge(parts);
}
function hydrantModel() {
  return merge([part(CYL8, 0xb8322a, 0, 0.35, 0, 0, 0, 0, 0.13, 0.7, 0.13), part(SPH, 0xc9c9c4, 0, 0.72, 0, 0, 0, 0, 0.14, 0.12, 0.14),
    part(CYL6, 0xb8322a, 0, 0.45, 0, 0, 0, Math.PI / 2, 0.06, 0.42, 0.06), part(CYL8, 0xb8322a, 0, 0.05, 0, 0, 0, 0, 0.18, 0.1, 0.18)]);
}
function trashModel() { return merge([part(CYL12, 0x2f4a33, 0, 0.45, 0, 0, 0, 0, 0.3, 0.9, 0.3), part(CYL12, 0x1f2a22, 0, 0.92, 0, 0, 0, 0, 0.31, 0.05, 0.31)]); }
function mailboxModel() { return merge([part(BOX, 0x1f4aa0, 0, 0.75, 0, 0, 0, 0, 0.55, 0.9, 0.5), part(CYL12, 0x1f4aa0, 0, 1.2, 0, 0, 0, Math.PI / 2, 0.27, 0.55, 0.25), part(BOX, 0x222222, 0, 0.15, 0, 0, 0, 0, 0.5, 0.3, 0.45)]); }
function cartModel() {
  return merge([part(BOX, 0xb9bcbe, 0, 1.05, 0, 0, 0, 0, 2.6, 1.3, 1.3), part(CYL8, 0x222222, -0.9, 0.25, 0.55, Math.PI / 2, 0, 0, 0.25, 0.1, 0.25), part(CYL8, 0x222222, 0.9, 0.25, 0.55, Math.PI / 2, 0, 0, 0.25, 0.1, 0.25),
    part(CYL6, 0x888888, 0, 2.3, 0, 0, 0, 0, 0.03, 1.4, 0.03), part(new THREE.ConeGeometry(1.6, 0.6, 8), 0xd9a520, 0, 3.0, 0), part(BOX, 0xc8302a, 0, 1.6, 0.66, 0, 0, 0, 2.2, 0.4, 0.02)]);
}
function kioskModel() { return merge([part(BOX, 0x3a3d40, 0, 1.45, 0, 0, 0, 0, 0.9, 2.9, 0.3)]); }
function kioskScreen() { return merge([part(BOX, 0xffffff, 0, 1.75, 0.16, 0, 0, 0, 0.7, 1.3, 0.02), part(BOX, 0xffffff, 0, 1.75, -0.16, 0, 0, 0, 0.7, 1.3, 0.02)]); }
function busstopModel() {
  return merge([part(BOX, 0x8c9296, 0, 2.6, 0, 0, 0, 0, 4.2, 0.12, 1.6), part(BOX, 0x2f3a40, -2.05, 1.3, 0, 0, 0, 0, 0.06, 2.4, 1.5), part(BOX, 0x2f3a40, 2.05, 1.3, 0, 0, 0, 0, 0.06, 2.4, 1.5),
    part(BOX, 0x404a50, 0, 1.3, -0.75, 0, 0, 0, 4.1, 2.4, 0.05), part(BOX, 0x6b4a2a, 0, 0.5, -0.45, 0, 0, 0, 3, 0.08, 0.4)]);
}
function stoopModel() { // depth along +z (out from the facade), unit depth scaled
  const s = 0x6a4536, parts = [];
  for (let i = 0; i < 6; i++) parts.push(part(BOX, s, 0, (i + 0.5) * 0.27, 1 - (i + 0.5) / 6, 0, 0, 0, 1.9, (i + 1) * 0.27, 1 / 6 + 0.01));
  parts.push(part(BOX, 0x1a1a1a, -0.95, 1.2, 0.5, -0.9, 0, 0, 0.05, 0.05, 1.5), part(BOX, 0x1a1a1a, 0.95, 1.2, 0.5, -0.9, 0, 0, 0.05, 0.05, 1.5));
  return merge(parts);
}
function shedModel() { // unit length along x
  const g = 0x2e5a3a;
  return merge([part(BOX, g, 0, 3.0, 0, 0, 0, 0, 1, 0.35, 2.6), part(BOX, 0x9a8a68, 0, 3.25, 0, 0, 0, 0, 1, 0.1, 2.6),
    ...[-0.45, -0.15, 0.15, 0.45].flatMap((x) => [part(BOX, g, x, 1.4, 1.2, 0, 0, 0, 0.012, 2.8, 0.12), part(BOX, g, x, 1.4, -1.2, 0, 0, 0, 0.012, 2.8, 0.12)])]);
}
function signalModel() { // pole at origin, mast arm along -x (out over the avenue)
  const c = 0x4c5154;
  return merge([part(CYL8, c, 0, 3.2, 0, 0, 0, 0, 0.13, 6.4, 0.13), part(BOX, c, -3.6, 6.1, 0, 0, 0, 0, 7.2, 0.14, 0.12),
    part(BOX, 0x2a2a1e, -5.2, 5.3, 0, 0, 0, 0, 0.42, 1.25, 0.34), part(BOX, 0x2a2a1e, 0.0, 3.2, 0.3, 0, 0, 0, 0.34, 1.25, 0.42),
    part(BOX, 0x1a1a1a, 0.25, 2.6, 0, 0, 0, 0, 0.3, 0.6, 0.25)]);
}
// signal lamps: aLamp = (bulb 0 red/1 yellow/2 green, axis 0 avenue/1 street)
function signalLamps() {
  const geos = [];
  const add = (x, y, z, bulb, axis) => {
    let g = new THREE.SphereGeometry(0.12, 6, 4); g.translate(x, y, z); g = g.toNonIndexed(); g.deleteAttribute('uv');
    const n = g.attributes.position.count, a = new Float32Array(n * 2);
    for (let i = 0; i < n; i++) { a[i * 2] = bulb; a[i * 2 + 1] = axis; }
    g.setAttribute('aLamp', new THREE.BufferAttribute(a, 2)); geos.push(g);
  };
  for (let b = 0; b < 3; b++) { add(-5.2, 5.7 - b * 0.38, 0.19, b, 0); add(-5.2, 5.7 - b * 0.38, -0.19, b, 0); }
  for (let b = 0; b < 3; b++) { add(0.19, 3.6 - b * 0.38, 0.3, b, 1); add(-0.19, 3.6 - b * 0.38, 0.3, b, 1); }
  return merge(geos);
}
function subwayModel() {
  const g = 0x1f4d36, parts = [];
  parts.push(part(BOX, 0x050505, 0, 0.17, 0, 0, 0, 0, 1.7, 0.02, 4.6));
  parts.push(part(BOX, g, -0.9, 0.6, 0, 0, 0, 0, 0.06, 0.9, 4.6), part(BOX, g, 0.9, 0.6, 0, 0, 0, 0, 0.06, 0.9, 4.6), part(BOX, g, 0, 0.6, -2.3, 0, 0, 0, 1.8, 0.9, 0.06));
  parts.push(part(CYL8, g, -0.9, 1.3, 2.3, 0, 0, 0, 0.05, 2.4, 0.05), part(CYL8, g, 0.9, 1.3, 2.3, 0, 0, 0, 0.05, 2.4, 0.05));
  return merge(parts);
}
function subwayGlobes() { return merge([part(SPH, 0xffffff, -0.9, 2.6, 2.3, 0, 0, 0, 0.2, 0.2, 0.2), part(SPH, 0xffffff, 0.9, 2.6, 2.3, 0, 0, 0, 0.2, 0.2, 0.2)]); }
function steamModel() {
  const parts = [];
  for (let i = 0; i < 6; i++) parts.push(part(CYL12, i % 2 ? 0xf2f2ee : 0xe2621d, 0, 0.5 + i * 0.6, 0, 0, 0, 0, 0.5, 0.6, 0.5));
  parts.push(part(CYL12, 0x222222, 0, 4.0, 0, 0, 0, 0, 0.42, 0.2, 0.42));
  return merge(parts);
}
function waterTowerModel() {
  const wood = [0x6b5038, 0x5d4632, 0x7a5c40, 0x4f4a45], parts = [];
  // barrel staves
  for (let i = 0; i < 16; i++) {
    const a = i / 16 * Math.PI * 2;
    parts.push(part(BOX, i % 2 ? 0x6b5038 : 0x5e4631, Math.cos(a) * 0.98, 2.6, Math.sin(a) * 0.98, 0, -a, 0, 0.06, 2.2, 0.4));
  }
  parts.push(part(CYL12, 0x5a4330, 0, 2.6, 0, 0, 0, 0, 0.97, 2.18, 0.97));
  for (const h of [1.8, 2.6, 3.4]) parts.push(part(CYL12, 0x2b2622, 0, h, 0, 0, 0, 0, 1.03, 0.05, 1.03));
  parts.push(part(new THREE.ConeGeometry(1.08, 0.9, 12), 0x3a3430, 0, 4.15, 0));
  for (const [x, z] of [[0.65, 0.65], [-0.65, 0.65], [0.65, -0.65], [-0.65, -0.65]]) parts.push(part(BOX, 0x2a2a28, x, 0.75, z, 0, 0, 0, 0.12, 1.5, 0.12));
  parts.push(part(BOX, 0x2a2a28, 0, 1.5, 0, 0, 0, 0, 1.5, 0.08, 1.5));
  return merge(parts);
}
function benchModel() { return merge([part(BOX, 0x3b4a3a, 0, 0.45, 0, 0, 0, 0, 1.8, 0.06, 0.45), part(BOX, 0x3b4a3a, 0, 0.75, -0.22, 0, 0, 0, 1.8, 0.4, 0.05), part(BOX, 0x1d1f1e, -0.8, 0.22, 0, 0, 0, 0, 0.06, 0.44, 0.45), part(BOX, 0x1d1f1e, 0.8, 0.22, 0, 0, 0, 0, 0.06, 0.44, 0.45)]); }
function parkLampModel() { return merge([part(CYL8, 0x1d211f, 0, 2, 0, 0, 0, 0, 0.07, 4, 0.07), part(CYL8, 0x1d211f, 0, 0.2, 0, 0, 0, 0, 0.14, 0.4, 0.14)]); }
function parkLampGlobe() { return merge([part(SPH, 0xffffff, 0, 4.2, 0, 0, 0, 0, 0.26, 0.32, 0.26)]); }
function antennaModel() { return merge([part(CYL6, 0x9a9a9a, 0, 0.5, 0, 0, 0, 0, 0.35, 1, 0.35)]); }
function spireModel() { return merge([part(new THREE.ConeGeometry(1, 1, 4), 0xc0c4c4, 0, 0.5, 0, 0, Math.PI / 4, 0)]); }
function fenceModel() { // unit length along x
  const parts = [part(BOX, 0x15181a, 0, 1.0, 0, 0, 0, 0, 1, 0.05, 0.05), part(BOX, 0x15181a, 0, 0.15, 0, 0, 0, 0, 1, 0.05, 0.05)];
  for (let i = 0; i < 8; i++) parts.push(part(BOX, 0x15181a, -0.5 + (i + 0.5) / 8, 0.55, 0, 0, 0, 0, 0.02, 1.1, 0.02));
  return merge(parts);
}

// Cars — unit models with body painted by instance color
function carModel(type) {
  const P = [];
  const glass = 0x1b2228, tire = 0x111111, chrome = 0x9a9a9a;
  const body = 0xffffff;
  if (type === 3) { // delivery van
    P.push(part(BOX, body, 0, 1.35, 0, 0, 0, 0, 2.0, 2.2, 5.6), part(BOX, glass, 0, 1.85, 2.7, 0, 0, 0, 1.85, 0.75, 0.25), part(BOX, 0x333333, 0, 0.35, 2.82, 0, 0, 0, 1.9, 0.25, 0.1));
  } else if (type === 4) { // box truck
    P.push(part(BOX, 0xe8e6df, 0, 2.0, -1.0, 0, 0, 0, 2.4, 2.8, 5.4), part(BOX, body, 0, 1.3, 2.6, 0, 0, 0, 2.3, 1.9, 2.0), part(BOX, glass, 0, 1.7, 3.62, 0, 0, 0, 2.1, 0.8, 0.06));
  } else if (type === 5) { // MTA bus
    P.push(part(BOX, 0xe9ecee, 0, 1.75, 0, 0, 0, 0, 2.55, 2.9, 12.2), part(BOX, glass, 0, 2.15, 0, 0, 0, 0, 2.57, 0.95, 11.4), part(BOX, 0x1c5aa8, 0, 1.15, 0, 0, 0, 0, 2.57, 0.25, 12.21), part(BOX, glass, 0, 2.0, 6.1, 0, 0, 0, 2.3, 1.4, 0.05));
    for (const z of [-4, 4]) for (const x of [-1.1, 1.1]) P.push(part(CYL12, tire, x, 0.5, z, 0, 0, Math.PI / 2, 0.5, 0.35, 0.5));
    return merge(P);
  } else {
    const L = type === 2 ? 4.9 : 4.7, Wd = type === 2 ? 1.95 : 1.82, H = type === 2 ? 1.0 : 0.72;
    P.push(part(BOX, body, 0, 0.35 + H / 2, 0, 0, 0, 0, Wd, H, L));
    const ch = type === 2 ? 0.85 : 0.62, cl = type === 2 ? 2.9 : 2.3;
    P.push(part(BOX, body, 0, 0.35 + H + ch / 2, type === 2 ? -0.25 : -0.15, 0, 0, 0, Wd * 0.9, ch, cl));
    P.push(part(BOX, glass, 0, 0.35 + H + ch * 0.5, type === 2 ? -0.25 : -0.15, 0, 0, 0, Wd * 0.92, ch * 0.75, cl * 0.96));
    P.push(part(BOX, glass, 0, 0.35 + H + ch * 0.45, type === 2 ? 1.25 : 1.0, -0.5, 0, 0, Wd * 0.85, 0.05, 0.9));
    if (type === 1) P.push(part(BOX, 0xfff3c0, 0, 0.35 + H + ch + 0.14, -0.2, 0, 0, 0, 0.75, 0.25, 0.28));
    P.push(part(BOX, chrome, 0, 0.42, L / 2, 0, 0, 0, Wd * 0.95, 0.15, 0.08), part(BOX, chrome, 0, 0.42, -L / 2, 0, 0, 0, Wd * 0.95, 0.15, 0.08));
  }
  const len = type === 4 ? 7.6 : type === 3 ? 5.6 : 4.7;
  for (const z of [-len * 0.33, len * 0.31]) for (const x of [-0.85, 0.85]) P.push(part(CYL12, tire, x * (type >= 3 ? 1.1 : 1), 0.34, z, 0, 0, Math.PI / 2, 0.34, 0.24, 0.34));
  return merge(P);
}
function carLights(type) { // front white, rear red: aLamp.x = 0 head, 1 tail
  const geos = [];
  const len = type === 5 ? 12.2 : type === 4 ? 7.6 : type === 3 ? 5.6 : type === 2 ? 4.9 : 4.7;
  const fz = type === 4 ? 3.65 : len / 2 + 0.01, rz = type === 4 ? -3.71 : -len / 2 - 0.01;
  const add = (x, y, z, k) => {
    let g = new THREE.BoxGeometry(0.32, 0.14, 0.04); g.translate(x, y, z); g = g.toNonIndexed(); g.deleteAttribute('uv');
    const n = g.attributes.position.count, a = new Float32Array(n * 2);
    for (let i = 0; i < n; i++) { a[i * 2] = k; a[i * 2 + 1] = 0; }
    g.setAttribute('aLamp', new THREE.BufferAttribute(a, 2)); geos.push(g);
  };
  const y = type >= 3 ? 0.9 : 0.75;
  add(-0.65, y, fz, 0); add(0.65, y, fz, 0); add(-0.7, y, rz, 1); add(0.7, y, rz, 1);
  return merge(geos);
}

// sign atlas for street-name blades
const SIGN_ATLAS = { canvas: null, map: new Map(), cols: 8, rows: 85, cw: 256, chh: 48 };
function signIndex(text) {
  let i = SIGN_ATLAS.map.get(text);
  if (i != null) return i;
  i = SIGN_ATLAS.map.size;
  if (i >= SIGN_ATLAS.cols * SIGN_ATLAS.rows) return 0;
  SIGN_ATLAS.map.set(text, i);
  return i;
}
function drawSignAtlas() {
  const c = document.createElement('canvas');
  c.width = SIGN_ATLAS.cols * SIGN_ATLAS.cw; c.height = SIGN_ATLAS.rows * SIGN_ATLAS.chh;
  const g = c.getContext('2d');
  g.fillStyle = '#00704a'; g.fillRect(0, 0, c.width, c.height);
  for (const [text, i] of SIGN_ATLAS.map) {
    const x = (i % SIGN_ATLAS.cols) * SIGN_ATLAS.cw, y = Math.floor(i / SIGN_ATLAS.cols) * SIGN_ATLAS.chh;
    g.strokeStyle = '#f4f3ee'; g.lineWidth = 3; g.strokeRect(x + 4, y + 4, SIGN_ATLAS.cw - 8, SIGN_ATLAS.chh - 8);
    g.fillStyle = '#f4f3ee';
    let fs = 30; g.font = `800 ${fs}px Archivo, "Helvetica Neue", Arial, sans-serif`;
    while (g.measureText(text).width > SIGN_ATLAS.cw - 24 && fs > 12) { fs -= 2; g.font = `800 ${fs}px Archivo, "Helvetica Neue", Arial, sans-serif`; }
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(text, x + SIGN_ATLAS.cw / 2, y + SIGN_ATLAS.chh / 2 + 1);
  }
  SIGN_ATLAS.canvas = c;
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return t;
}
function bladeModel() { // plane facing ±z, uv 0..1
  const g = new THREE.PlaneGeometry(1.5, 0.3);
  const g2 = g.clone(); g2.rotateY(Math.PI);
  g.translate(0, 0, 0.016); g2.translate(0, 0, -0.016);
  return mergeGeometries([g, g2]);
}
