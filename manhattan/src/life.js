// =====================================================================
//  Signals — one global cycle with a "green wave" offset uptown
// =====================================================================
const SIG_CYCLE = 90;
function sigState(axis, z, t) {
  const ph = (((t + z / 13) / SIG_CYCLE) % 1 + 1) % 1;
  if (axis === 'z') return ph < 0.5 ? 0 : ph < 0.544 ? 1 : 2;      // 0 green, 1 yellow, 2 red
  return ph >= 0.6 && ph < 0.9 ? 0 : ph >= 0.9 && ph < 0.944 ? 1 : 2;
}

// =====================================================================
//  Traffic
// =====================================================================
const CAR_TYPES = 6; // sedan, taxi, suv, van, truck, bus
const CAR_CAP = [110, 120, 70, 26, 18, 14];
const CAR_COLORS = [0x1c1c1e, 0xe8e8e6, 0x8c9096, 0x2a3242, 0x5a1d1d, 0x2f3d33, 0xb8b8b4, 0x14243e, 0x6a6f74, 0x3a2a24];
const TRAFFIC = { cars: [], meshes: [], lights: [], used: new Array(CAR_TYPES).fill(0), lanes: new Map() };
let carLightMat;
function makeSignalMaterial() {
  const m = new THREE.MeshBasicMaterial({ color: 0xffffff });
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uTime = U.uTime;
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute vec2 aLamp; varying vec2 vLamp; varying float vSz;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvLamp = aLamp; vSz = instanceMatrix[3].z;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform float uTime; varying vec2 vLamp; varying float vSz;')
      .replace('vec4 diffuseColor = vec4( diffuse, opacity );', `
        float ph = fract((uTime + vSz/13.) / ${SIG_CYCLE}.0);
        float st;
        if (vLamp.y < .5) st = ph < .5 ? 2. : ph < .544 ? 1. : 0.;
        else st = (ph >= .6 && ph < .9) ? 2. : (ph >= .9 && ph < .944) ? 1. : 0.;
        float b = floor(vLamp.x + .5);
        vec3 cols[3]; cols[0] = vec3(1.,.12,.08); cols[1] = vec3(1.,.62,.08); cols[2] = vec3(.25,1.,.62);
        float on = (b == 0. && st == 0.) || (b == 1. && st == 1.) || (b == 2. && st == 2.) ? 1. : 0.;
        vec4 diffuseColor = vec4(cols[int(b)] * mix(.06, 3.2, on), 1.);`);
  };
  m.customProgramCacheKey = () => 'sig1';
  return m;
}
function makeCarLightMaterial() {
  const m = new THREE.MeshBasicMaterial({ color: 0xffffff });
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uNight = U.uNight;
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute vec2 aLamp; varying vec2 vLamp;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvLamp = aLamp;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform float uNight; varying vec2 vLamp;')
      .replace('vec4 diffuseColor = vec4( diffuse, opacity );', `
        vec3 c = vLamp.x < .5 ? vec3(1.,.95,.82) * mix(.55, 4.0, uNight) : vec3(1.,.08,.05) * mix(.5, 2.6, uNight);
        vec4 diffuseColor = vec4(c, 1.);`);
  };
  m.customProgramCacheKey = () => 'carl1';
  return m;
}

function initTraffic(scene, vcMat) {
  carLightMat = makeCarLightMaterial();
  for (let t = 0; t < CAR_TYPES; t++) {
    const m = new THREE.InstancedMesh(carModel(t), vcMat, CAR_CAP[t]);
    m.frustumCulled = false; m.count = 0; m.castShadow = QUALITY.level >= 2;
    m.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(CAR_CAP[t] * 3), 3);
    scene.add(m); TRAFFIC.meshes.push(m);
    const l = new THREE.InstancedMesh(carLights(t), carLightMat, CAR_CAP[t]);
    l.frustumCulled = false; l.count = 0; scene.add(l); TRAFFIC.lights.push(l);
  }
  CORR.forEach((c, i) => { c.id = i; c.bb = corrBounds(c); });
}
function corrBounds(c) {
  if (c.axis === 'z') return [c.c - c.w, c.a0, c.c + c.w, c.a1];
  if (c.axis === 'x') return [c.a0, c.c - c.w, c.a1, c.c + c.w];
  const s = c.seg; return [Math.min(s.ax, s.bx) - 20, Math.min(s.az, s.bz) - 20, Math.max(s.ax, s.bx) + 20, Math.max(s.az, s.bz) + 20];
}
function corrLanes(c) {
  if (c.lanes) return c.lanes;
  const park = 2.6, inner = Math.max(3.2, c.w - 2 * park), n = Math.max(1, Math.floor(inner / 3.3)), lw = inner / n;
  const lanes = [];
  for (let i = 0; i < n; i++) {
    const off = -c.w / 2 + park + (i + 0.5) * lw;
    let dir;
    if (c.dir !== 0) dir = c.dir;
    else if (c.axis === 'z') dir = off > 0 ? -1 : 1;           // northbound on the east half
    else if (c.axis === 'x') dir = off > 0 ? 1 : -1;            // eastbound on the south half
    else dir = off > 0 ? 1 : -1;
    lanes.push({ off, dir, bus: c.bus && i === (dir > 0 ? 0 : n - 1) });
  }
  if (c.axis === 'd' && c.dir === -1) lanes.forEach((l) => (l.dir = -1));
  c.lanes = lanes;
  return lanes;
}
function corrPoint(c, s, off) {
  if (c.axis === 'z') return [c.c + off, s];
  if (c.axis === 'x') return [s, c.c + off];
  const g = c.seg; return [g.ax + g.dx * s - g.dz * off, g.az + g.dz * s + g.dx * off];
}
function corrYaw(c, dir) {
  if (c.axis === 'z') return dir > 0 ? 0 : Math.PI;
  if (c.axis === 'x') return dir > 0 ? Math.PI / 2 : -Math.PI / 2;
  const a = Math.atan2(c.seg.dx, c.seg.dz); return dir > 0 ? a : a + Math.PI;
}
function corrProject(c, x, z) {
  if (c.axis === 'z') return [z, Math.abs(x - c.c)];
  if (c.axis === 'x') return [x, Math.abs(z - c.c)];
  const g = c.seg; const s = (x - g.ax) * g.dx + (z - g.az) * g.dz; return [s, Math.abs(-(x - g.ax) * g.dz + (z - g.az) * g.dx)];
}

function spawnCar(car, px, pz, near = false) {
  const cand = [];
  for (const c of CORR) {
    const b = c.bb;
    if (px < b[0] - 650 || px > b[2] + 650 || pz < b[1] - 650 || pz > b[3] + 650) continue;
    const [s, d] = corrProject(c, px, pz);
    if (d > 600) continue;
    cand.push(c);
  }
  if (!cand.length) return false;
  for (let tries = 0; tries < 6; tries++) {
    const c = cand[Math.floor(rand() * cand.length)];
    const [sp] = corrProject(c, px, pz);
    const lo = Math.max(c.a0, sp - 520), hi = Math.min(c.a1, sp + 520);
    if (hi - lo < 20) continue;
    const s = rr(lo, hi);
    if (Math.abs(s - sp) < (near ? 0 : 80) && corrProject(c, px, pz)[1] < 60) continue;
    const lanes = corrLanes(c);
    const li = Math.floor(rand() * lanes.length), lane = lanes[li];
    // keep clear of other cars in the lane
    const key = c.id * 16 + li;
    const arr = TRAFFIC.lanes.get(key) || [];
    if (arr.some((o) => Math.abs(o.s - s) < 12)) continue;
    let type;
    const r = rand(), mid = nOfZ(corrPoint(c, s, 0)[1]) < 60 && nOfZ(corrPoint(c, s, 0)[1]) > 14;
    if (lane.bus && r < 0.3) type = 5;
    else type = r < (mid ? 0.42 : 0.18) ? 1 : r < 0.68 ? 0 : r < 0.86 ? 2 : r < 0.95 ? 3 : 4;
    if (TRAFFIC.used[type] >= CAR_CAP[type]) type = 0;
    if (TRAFFIC.used[type] >= CAR_CAP[type]) return false;
    Object.assign(car, { c, li, lane, s, v: rr(4, 10), vmax: c.axis === 'd' ? rr(8, 11) : rr(10, 14.5), type, active: true, col: type === 1 ? 0xf2b70f : type === 5 ? 0xffffff : pick(CAR_COLORS), brake: 0 });
    arr.push(car); TRAFFIC.lanes.set(key, arr);
    return true;
  }
  return false;
}
function despawnCar(car) {
  const key = car.c.id * 16 + car.li;
  const arr = TRAFFIC.lanes.get(key);
  if (arr) { const i = arr.indexOf(car); if (i >= 0) arr.splice(i, 1); }
  car.active = false;
}

const _m4 = new THREE.Matrix4(), _q = new THREE.Quaternion(), _v3 = new THREE.Vector3(), _s3 = new THREE.Vector3(1, 1, 1), _e = new THREE.Euler(), _col = new THREE.Color();
function updateTraffic(dt, px, pz, t, count) {
  while (TRAFFIC.cars.length < count) TRAFFIC.cars.push({ active: false });
  // sort lane lists by position along travel
  for (const arr of TRAFFIC.lanes.values()) if (arr.length > 1) arr.sort((a, b) => (a.s - b.s) * a.lane.dir);
  let spawned = 0;
  for (let i = 0; i < count; i++) {
    const car = TRAFFIC.cars[i];
    if (!car.active) { if (spawned < 6 && spawnCar(car, px, pz, TRAFFIC.first)) spawned++; continue; }
    const c = car.c, dir = car.lane.dir;
    // leader in lane
    const arr = TRAFFIC.lanes.get(c.id * 16 + car.li);
    const k = arr.indexOf(car);
    let gap = 1e9;
    if (k >= 0 && k < arr.length - 1) gap = (arr[k + 1].s - car.s) * dir - (car.type === 5 ? 13 : car.type === 4 ? 9 : 6);
    // next signal
    let stopDist = 1e9;
    if (c.axis !== 'd') {
      for (const [cp, hw] of c.cross) {
        const line = cp - dir * (hw + 4.5);
        const d = (line - car.s) * dir;
        if (d < -1) continue;
        if (d > 90) break;
        const zc = c.axis === 'z' ? cp : c.c;
        const st = sigState(c.axis, zc, t);
        if (st === 2 || (st === 1 && d > car.v * 1.2)) stopDist = d;
        break;
      }
      if (dir < 0) { // crossings are sorted ascending; search backwards
        stopDist = 1e9;
        for (let j = c.cross.length - 1; j >= 0; j--) {
          const [cp, hw] = c.cross[j];
          const line = cp - dir * (hw + 4.5);
          const d = (line - car.s) * dir;
          if (d < -1) continue;
          if (d > 90) break;
          const st = sigState(c.axis, c.axis === 'z' ? cp : c.c, t);
          if (st === 2 || (st === 1 && d > car.v * 1.2)) stopDist = d;
          break;
        }
      }
    }
    let vt = car.vmax;
    const lim = Math.min(gap, stopDist);
    if (lim < 60) vt = Math.min(vt, Math.sqrt(Math.max(0, 2 * 4.2 * (lim - 1.5))));
    const prev = car.v;
    car.v += clamp(vt - car.v, -7 * dt, 2.6 * dt);
    if (car.v < 0) car.v = 0;
    car.brake = car.v < prev - 0.01 || car.v < 0.3 ? 1 : 0;
    car.s += car.v * dir * dt;
    const [x, z] = corrPoint(c, car.s, car.lane.off);
    if (car.s < c.a0 - 5 || car.s > c.a1 + 5 || Math.hypot(x - px, z - pz) > 720) { despawnCar(car); continue; }
    car.x = x; car.z = z; car.yaw = corrYaw(c, dir);
    if (car.type === 1 && car.v < 0.5 && rand() < dt * 0.02) AUDIO.horn && AUDIO.horn(x, z);
  }
  TRAFFIC.first = false;
  // write instances
  TRAFFIC.used.fill(0);
  for (let i = 0; i < count; i++) {
    const car = TRAFFIC.cars[i];
    if (!car.active || car.x === undefined) continue;
    const t2 = car.type, n = TRAFFIC.used[t2];
    if (n >= CAR_CAP[t2]) continue;
    TRAFFIC.used[t2]++;
    _q.setFromEuler(_e.set(0, car.yaw, 0));
    _m4.compose(_v3.set(car.x, 0.01, car.z), _q, _s3);
    TRAFFIC.meshes[t2].setMatrixAt(n, _m4); TRAFFIC.lights[t2].setMatrixAt(n, _m4);
    TRAFFIC.meshes[t2].setColorAt(n, _col.setHex(car.col));
  }
  for (let t2 = 0; t2 < CAR_TYPES; t2++) {
    const m = TRAFFIC.meshes[t2], l = TRAFFIC.lights[t2];
    m.count = l.count = TRAFFIC.used[t2];
    m.instanceMatrix.needsUpdate = true; l.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  }
}

// =====================================================================
//  Pedestrians
// =====================================================================
const PEDS = { list: [], meshes: {}, cap: 700, blockGrid: new Map() };
const SKIN = [0x8d5524, 0xc68642, 0xe0ac69, 0xf1c27d, 0xffdbac, 0x5c3a21, 0xa36b3f, 0xd9a172];
const SHIRT = [0x1f2a44, 0x2b2b2b, 0xe8e6df, 0x7a1f24, 0x3e5a3a, 0x8a6a3e, 0x4a5a6a, 0xb9a27a, 0x1a1a1a, 0x5b2f52, 0x2f6f8f, 0xc35a2a, 0x6b6b6b, 0x0f3d2e];
const PANTS = [0x1c2433, 0x222222, 0x3a3a3a, 0x5a4a38, 0x27324a, 0x6b6257, 0x101010];
function pedModels() {
  const torso = merge([part(BOX, 0xffffff, 0, 1.28, 0, 0, 0, 0, 0.42, 0.62, 0.24), part(BOX, 0xffffff, -0.27, 1.25, 0, 0, 0, 0.05, 0.11, 0.58, 0.13), part(BOX, 0xffffff, 0.27, 1.25, 0, 0, 0, -0.05, 0.11, 0.58, 0.13), part(CYL6, 0xe0b090, 0, 1.63, 0, 0, 0, 0, 0.06, 0.1, 0.06)]);
  const head = merge([part(SPH, 0xffffff, 0, 1.78, 0, 0, 0, 0, 0.115, 0.135, 0.125)]);
  const hair = merge([part(SPH, 0xffffff, 0, 1.83, -0.015, 0, 0, 0, 0.122, 0.1, 0.13)]);
  const leg = merge([part(BOX, 0xffffff, 0, -0.4, 0, 0, 0, 0, 0.15, 0.8, 0.17), part(BOX, 0x262626, 0, -0.82, 0.04, 0, 0, 0, 0.13, 0.08, 0.27)]);
  return { torso, head, hair, leg };
}
function initPeds(scene, vcMat) {
  const M = pedModels();
  const mk = (g) => { const m = new THREE.InstancedMesh(g, vcMat, PEDS.cap); m.frustumCulled = false; m.count = 0; m.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(PEDS.cap * 3), 3); m.castShadow = QUALITY.level >= 2; scene.add(m); return m; };
  PEDS.meshes = { torso: mk(M.torso), head: mk(M.head), hair: mk(M.hair), legL: mk(M.leg), legR: mk(M.leg) };
  for (const b of BLOCKS) {
    if (b.cut) continue;
    const k = Math.floor(b.x0 / 120) * 100000 + Math.floor(b.z0 / 120);
    for (let i = Math.floor(b.x0 / 120); i <= Math.floor(b.x1 / 120); i++) for (let j = Math.floor(b.z0 / 120); j <= Math.floor(b.z1 / 120); j++) {
      const kk = (i + 1000) * 100000 + (j + 1000);
      let a = PEDS.blockGrid.get(kk); if (!a) { a = []; PEDS.blockGrid.set(kk, a); } a.push(b);
    }
  }
}
function blockAt(x, z) {
  const a = PEDS.blockGrid.get((Math.floor(x / 120) + 1000) * 100000 + (Math.floor(z / 120) + 1000));
  if (!a) return null;
  for (const b of a) if (x >= b.x0 && x <= b.x1 && z >= b.z0 && z <= b.z1) return b;
  return null;
}
function blockDensity(b) {
  const cx = (b.x0 + b.x1) / 2, cz = (b.z0 + b.z1) / 2;
  const n = nOfZ(cz);
  let d = 1;
  if (n > 30 && n < 60 && cx > -800 && cx < 700) d = 2.6;
  if (n > 41 && n < 48 && cx > -700 && cx < -350) d = 7;
  if (cz > 1400 && cz < 2600) d = 2.2;
  if (n > 110) d = 0.8;
  return d;
}
function perim(b, ins) { const w = b.x1 - b.x0 - 2 * ins, h = b.z1 - b.z0 - 2 * ins; return { w, h, P: 2 * (w + h) }; }
function perimPoint(b, ins, p) {
  const { w, h, P } = perim(b, ins);
  p = ((p % P) + P) % P;
  if (p < w) return [b.x0 + ins + p, b.z0 + ins, 1, 0];
  if (p < w + h) return [b.x1 - ins, b.z0 + ins + (p - w), 0, 1];
  if (p < 2 * w + h) return [b.x1 - ins - (p - w - h), b.z1 - ins, -1, 0];
  return [b.x0 + ins, b.z1 - ins - (p - 2 * w - h), 0, -1];
}
function spawnPed(pd, px, pz) {
  // choose a nearby block weighted by how busy it is
  let best = null, bw = 0;
  for (let t = 0; t < 10; t++) {
    const x = px + rr(-260, 260), z = pz + rr(-260, 260);
    const b = blockAt(x, z); if (!b) continue;
    const w = blockDensity(b) * rand();
    if (w > bw) { bw = w; best = b; }
  }
  if (!best) return false;
  const ins = rr(1.2, 3.4);
  const { P } = perim(best, ins);
  Object.assign(pd, { b: best, ins, p: rr(0, P), dir: chance(0.5) ? 1 : -1, v: rr(1.05, 1.6), active: true, ph: rr(0, 6), h: rr(0.92, 1.08),
    shirt: pick(SHIRT), pants: pick(PANTS), skin: pick(SKIN), hair: pick([0x1a1410, 0x2a1d14, 0x4a3524, 0x8a6a40, 0xb8b0a0, 0x0e0e0e]), cross: null });
  return true;
}
function updatePeds(dt, px, pz, count) {
  while (PEDS.list.length < count) PEDS.list.push({ active: false });
  let spawned = 0, n = 0;
  const M = PEDS.meshes;
  for (let i = 0; i < count; i++) {
    const pd = PEDS.list[i];
    if (!pd.active) { if (spawned < 12 && spawnPed(pd, px, pz)) spawned++; else continue; }
    let x, z, fx, fz, y = 0.15;
    if (pd.cross) {
      const c = pd.cross; c.t += pd.v * 1.15 * dt / c.L;
      x = lerp(c.ax, c.bx, c.t); z = lerp(c.az, c.bz, c.t); fx = (c.bx - c.ax) / c.L; fz = (c.bz - c.az) / c.L; y = 0.02;
      if (c.t >= 1) {
        pd.cross = null; pd.b = c.nb; pd.ins = c.ins;
        // project onto the new block perimeter
        const { w, h } = perim(pd.b, pd.ins);
        const lx = clamp(c.bx - pd.b.x0 - pd.ins, 0, w), lz = clamp(c.bz - pd.b.z0 - pd.ins, 0, h);
        const dN = Math.abs(lz), dS = Math.abs(h - lz), dW = Math.abs(lx), dE = Math.abs(w - lx);
        const m = Math.min(dN, dS, dW, dE);
        pd.p = m === dN ? lx : m === dE ? w + lz : m === dS ? w + h + (w - lx) : 2 * w + h + (h - lz);
      }
    } else {
      const { P, w, h } = perim(pd.b, pd.ins);
      const before = pd.p;
      pd.p += pd.v * pd.dir * dt;
      // corners: maybe cross the street
      const corners = [0, w, w + h, 2 * w + h, P];
      for (const cp of corners) {
        if ((before - cp) * (pd.p - cp) <= 0 && before !== pd.p && chance(0.35)) {
          const [cx, cz, ex, ez] = perimPoint(pd.b, pd.ins, cp + pd.dir * 0.01);
          const gx = ex * pd.dir, gz = ez * pd.dir;
          // continue straight across the street
          const tx = cx + gx * (pd.ins * 2 + 34), tz = cz + gz * (pd.ins * 2 + 34);
          let nb = null, L = 0;
          for (let d = 14; d < 48; d += 4) { const b2 = blockAt(cx + gx * d, cz + gz * d); if (b2 && b2 !== pd.b) { nb = b2; L = d; break; } }
          if (nb) { const ins = pd.ins; pd.cross = { ax: cx, az: cz, bx: cx + gx * (L + ins), bz: cz + gz * (L + ins), t: 0, L: L + ins, nb, ins }; break; }
        }
      }
      if (!pd.cross) {
        const q = perimPoint(pd.b, pd.ins, pd.p);
        x = q[0]; z = q[1]; fx = q[2] * pd.dir; fz = q[3] * pd.dir;
      } else { x = pd.cross.ax; z = pd.cross.az; fx = 0; fz = 1; }
    }
    if (Math.hypot(x - px, z - pz) > 330) { pd.active = false; continue; }
    pd.ph += pd.v * dt * 4.2;
    const yaw = Math.atan2(fx, fz);
    const sw = Math.sin(pd.ph) * 0.42;
    _s3.set(pd.h, pd.h, pd.h);
    _q.setFromEuler(_e.set(0, yaw, 0));
    _m4.compose(_v3.set(x, y + Math.abs(Math.cos(pd.ph)) * 0.025, z), _q, _s3);
    M.torso.setMatrixAt(n, _m4); M.head.setMatrixAt(n, _m4); M.hair.setMatrixAt(n, _m4);
    M.torso.setColorAt(n, _col.setHex(pd.shirt)); M.head.setColorAt(n, _col.setHex(pd.skin)); M.hair.setColorAt(n, _col.setHex(pd.hair));
    for (const [mesh, side, s] of [[M.legL, -0.1, sw], [M.legR, 0.1, -sw]]) {
      const hx = x + Math.cos(yaw) * side * pd.h, hz = z - Math.sin(yaw) * side * pd.h;
      _q.setFromEuler(_e.set(s, yaw, 0, 'YXZ'));
      _m4.compose(_v3.set(hx, y + 0.95 * pd.h, hz), _q, _s3);
      mesh.setMatrixAt(n, _m4); mesh.setColorAt(n, _col.setHex(pd.pants));
    }
    n++;
  }
  for (const k in M) { M[k].count = n; M[k].instanceMatrix.needsUpdate = true; M[k].instanceColor.needsUpdate = true; }
}

// =====================================================================
//  Boats and steam
// =====================================================================
const BOAT_MESHES = [];
function initBoats(scene, vcMat) {
  boatRoutes();
  for (const b of BOATS) {
    const g = merge([
      part(BOX, b.col, 0, 1.2, 0, 0, 0, 0, b.w, 3.2, b.len),
      part(BOX, 0x1d2125, 0, -0.6, 0, 0, 0, 0, b.w * 0.95, 1.2, b.len * 0.98),
      part(BOX, b.kind === 'ferry' ? b.col : 0xf2f2ee, 0, 3.2 + b.h / 4, b.len * 0.05, 0, 0, 0, b.w * 0.88, b.h / 2, b.len * 0.7),
      part(BOX, 0x22313a, 0, 3.4 + b.h / 4, b.len * 0.05, 0, 0, 0, b.w * 0.9, b.h / 6, b.len * 0.71),
      part(BOX, 0xf2f2ee, 0, 3.2 + b.h * 0.7, b.len * 0.12, 0, 0, 0, b.w * 0.6, b.h / 3, b.len * 0.3),
      part(CYL8, 0x2a2a2a, 0, 3.4 + b.h, -b.len * 0.1, 0, 0, 0, 0.6, 3, 0.6),
    ]);
    const m = new THREE.Mesh(g, vcMat); m.castShadow = true;
    scene.add(m); BOAT_MESHES.push(m);
    let L = 0; b.seg = []; for (let i = 0; i < b.path.length - 1; i++) { const l = Math.hypot(b.path[i + 1][0] - b.path[i][0], b.path[i + 1][1] - b.path[i][1]); b.seg.push(l); L += l; }
    b.L = L; b.s = b.t * L * 2;
  }
}
function updateBoats(dt) {
  BOATS.forEach((b, i) => {
    b.s = (b.s + b.speed * dt) % (b.L * 2);
    let s = b.s < b.L ? b.s : 2 * b.L - b.s; const fwd = b.s < b.L;
    let k = 0; while (k < b.seg.length - 1 && s > b.seg[k]) { s -= b.seg[k]; k++; }
    const a = b.path[k], c = b.path[k + 1], t = clamp(s / b.seg[k], 0, 1);
    const x = lerp(a[0], c[0], t), z = lerp(a[1], c[1], t);
    let yaw = Math.atan2(c[0] - a[0], c[1] - a[1]); if (!fwd) yaw += Math.PI;
    const m = BOAT_MESHES[i];
    m.position.set(x, -2.4 + Math.sin(U.uTime.value * 0.8 + i) * 0.15, z);
    m.rotation.set(Math.sin(U.uTime.value * 0.6 + i) * 0.015, yaw, 0);
  });
}

const STEAM = { sprites: [], src: [] };
function initSteam(scene) {
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(32, 32, 2, 32, 32, 32); grd.addColorStop(0, 'rgba(255,255,255,0.55)'); grd.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grd; g.fillRect(0, 0, 64, 64);
  const tex = new THREE.CanvasTexture(c);
  for (let i = 0; i < 90; i++) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, opacity: 0, color: 0xe8ecef }));
    s.visible = false; scene.add(s); STEAM.sprites.push({ s, life: 0 });
  }
  // manhole steam at a few midtown intersections
  for (const I of INTERS) if (typeof I.st === 'number' && I.st > 30 && I.st < 60 && I.x > -800 && I.x < 600 && hash2(I.x | 0, I.z | 0) < 0.06) STEAM.src.push([I.x + 2, 0.1, I.z + 1.5]);
}
function updateSteam(dt, px, pz) {
  const near = STEAM.src.filter((q) => Math.abs(q[0] - px) < 260 && Math.abs(q[2] - pz) < 260);
  for (const p of STEAM.sprites) {
    if (p.life <= 0) {
      if (!near.length) { p.s.visible = false; continue; }
      const q = near[Math.floor(rand() * near.length)];
      p.life = p.max = rr(2.5, 5); p.s.position.set(q[0] + rr(-0.4, 0.4), q[1], q[2] + rr(-0.4, 0.4)); p.vx = rr(-0.3, 0.6); p.vz = rr(-0.3, 0.3); p.s.visible = true;
    }
    p.life -= dt;
    const t = 1 - p.life / p.max;
    p.s.position.y += dt * (1.6 - t * 0.6); p.s.position.x += p.vx * dt; p.s.position.z += p.vz * dt;
    p.s.scale.setScalar(1 + t * 4.5);
    p.s.material.opacity = Math.sin(Math.PI * t) * 0.45 * (1 - ENV.night * 0.3);
  }
}
