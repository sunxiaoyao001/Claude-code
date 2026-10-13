// =====================================================================
//  Player: walking with collision and steps, flying, mouse/keys/touch
// =====================================================================
const STEP = 0.62, EYE = 1.68, RADIUS = 0.35;
const PL = { x: -520, z: -3600, feet: 0.15, vy: 0, yaw: 0, pitch: 0, mode: 'walk', grounded: true, vx: 0, vz: 0,
  run: false, flySpeed: 22, camY: 1.8, bob: 0, stepPhase: 0, speed: 0, lastStep: 0 };
const KEYS = {};
const TOUCH = { mx: 0, mz: 0, active: false, run: false, up: false, down: false };
let solidStamp = 0;
const solidSeen = new Uint32Array(1 << 20);

function supportAt(x, z, feet, step = STEP, noBuildings = false) {
  let best = -Infinity;
  const g = groundHeight(x, z);
  if (g > -1) best = g;
  const ids = solidsNear(x, z);
  let water = false;
  if (ids) for (const id of ids) {
    const s = solids[id];
    const b = s.bb;
    if (x < b[0] || x > b[2] || z < b[1] || z > b[3]) continue;
    if (s.poly.length !== 4 || s.kind !== 'b' ? !pointInPoly(x, z, s.poly) : !pointInPoly(x, z, s.poly)) continue;
    let t = s.topFn ? s.topFn(x, z) : s.top;
    if (t === null || Number.isNaN(t)) { if (s.kind === 'terrain' && s.topFn) water = true; continue; }
    if (s.kind === 'rail' || (noBuildings && s.kind === 'b')) continue;
    if (t <= feet + step && t > best) best = t;
  }
  if (water && best < 0.5) return null;
  return best === -Infinity ? null : best;
}

function insideBuilding(x, z, feet) {
  const ids = solidsNear(x, z); if (!ids) return false;
  for (const id of ids) { const s = solids[id]; if (s.kind !== 'b') continue; const b = s.bb; if (x < b[0] || x > b[2] || z < b[1] || z > b[3]) continue; if (s.top > feet + STEP && s.bottom < feet + 1.75 && pointInPoly(x, z, s.poly)) return true; }
  return false;
}
function collide(x, z, feet, r, height = 1.75) {
  for (let it = 0; it < 3; it++) {
    solidStamp++;
    let moved = false;
    for (let ci = -1; ci <= 1; ci++) for (let cj = -1; cj <= 1; cj++) {
      const ids = solidsNear(x + ci * r * 1.2, z + cj * r * 1.2);
      if (!ids) continue;
      for (const id of ids) {
        if (solidSeen[id & 0xfffff] === solidStamp) continue;
        solidSeen[id & 0xfffff] = solidStamp;
        const s = solids[id];
        if (s.kind === 'terrain' || s.kind === 'p' || s.kind === 'g') continue;
        const b = s.bb;
        if (x < b[0] - r || x > b[2] + r || z < b[1] - r || z > b[3] + r) continue;
        let top = s.topFn ? s.topFn(x, z) : s.top;
        if (top === null || Number.isNaN(top)) continue;
        const bottom = s.topFn ? top - (s.thick || 1) : s.bottom;
        if (top <= feet + STEP || bottom >= feet + height) continue;
        const res = pushOut(x, z, r, s.poly);
        if (res) { x = res[0]; z = res[1]; moved = true; }
      }
    }
    if (!moved) break;
  }
  return [x, z];
}
function pushOut(x, z, r, poly) {
  // closest point on polygon boundary
  let bd = Infinity, bx = 0, bz = 0;
  for (let i = 0, n = poly.length; i < n; i++) {
    const a = poly[i], b = poly[(i + 1) % n];
    const dx = b[0] - a[0], dz = b[1] - a[1], L2 = dx * dx + dz * dz || 1e-9;
    const t = clamp(((x - a[0]) * dx + (z - a[1]) * dz) / L2, 0, 1);
    const px = a[0] + dx * t, pz = a[1] + dz * t, d = (x - px) ** 2 + (z - pz) ** 2;
    if (d < bd) { bd = d; bx = px; bz = pz; }
  }
  const d = Math.sqrt(bd);
  const inside = pointInPoly(x, z, poly);
  if (!inside && d >= r) return null;
  let nx = x - bx, nz = z - bz, nl = Math.hypot(nx, nz) || 1e-6;
  nx /= nl; nz /= nl;
  if (inside) { nx = -nx; nz = -nz; return [bx + nx * r, bz + nz * r]; }
  return [bx + nx * r, bz + nz * r];
}

function setupInput(canvas, onMap) {
  addEventListener('keydown', (e) => {
    if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT')) return;
    KEYS[e.code] = true;
    if (e.code === 'KeyF') toggleFly();
    if (e.code === 'KeyM') onMap();
    if (e.code === 'KeyT') HUD.cycleFlow();
    if (e.code === 'BracketRight') { ENV.minutes = (ENV.minutes + 60) % 1440; HUD.toast(HUD.timeStr()); }
    if (e.code === 'BracketLeft') { ENV.minutes = (ENV.minutes + 1380) % 1440; HUD.toast(HUD.timeStr()); }
    if (e.code === 'KeyH') HUD.toggleHelp();
    if (e.code === 'KeyP') HUD.togglePhoto();
    if (e.code === 'KeyN') { ENV.minutes = ENV.night > 0.5 ? 13 * 60 : 21 * 60; HUD.toast(HUD.timeStr()); }
    if (e.code === 'Space' || e.code.startsWith('Arrow')) e.preventDefault();
  });
  addEventListener('keyup', (e) => { KEYS[e.code] = false; });
  addEventListener('blur', () => { for (const k in KEYS) KEYS[k] = false; });
  // mouse look: pointer lock when available, otherwise drag
  let dragging = false, lx = 0, ly = 0;
  canvas.addEventListener('mousedown', (e) => {
    if (document.pointerLockElement !== canvas && canvas.requestPointerLock && !HUD.mapOpen) {
      try { const p = canvas.requestPointerLock(); if (p && p.catch) p.catch(() => {}); } catch (err) { /* drag fallback */ }
    }
    dragging = true; lx = e.clientX; ly = e.clientY;
  });
  addEventListener('mouseup', () => { dragging = false; });
  addEventListener('mousemove', (e) => {
    if (document.pointerLockElement === canvas) look(e.movementX, e.movementY, 0.0022);
    else if (dragging) { look(e.clientX - lx, e.clientY - ly, 0.004); lx = e.clientX; ly = e.clientY; }
  });
  canvas.addEventListener('wheel', (e) => {
    if (PL.mode === 'fly') { PL.flySpeed = clamp(PL.flySpeed * (e.deltaY > 0 ? 0.85 : 1.18), 4, 400); HUD.toast(`Flight speed ${Math.round(PL.flySpeed)} m/s`); }
    e.preventDefault();
  }, { passive: false });
  // touch: left stick moves, drag elsewhere looks
  const stick = document.getElementById('stick'), knob = stick.firstElementChild;
  let sid = null, sx = 0, sy = 0;
  stick.addEventListener('touchstart', (e) => { const t = e.changedTouches[0]; sid = t.identifier; const r = stick.getBoundingClientRect(); sx = r.left + r.width / 2; sy = r.top + r.height / 2; e.preventDefault(); }, { passive: false });
  stick.addEventListener('touchmove', (e) => {
    for (const t of e.changedTouches) if (t.identifier === sid) {
      let dx = t.clientX - sx, dy = t.clientY - sy; const l = Math.hypot(dx, dy), m = 46;
      if (l > m) { dx *= m / l; dy *= m / l; }
      knob.style.transform = `translate(${dx}px,${dy}px)`;
      TOUCH.mx = dx / m; TOUCH.mz = dy / m; TOUCH.active = true;
    }
    e.preventDefault();
  }, { passive: false });
  const endStick = (e) => { for (const t of e.changedTouches) if (t.identifier === sid) { sid = null; TOUCH.mx = TOUCH.mz = 0; TOUCH.active = false; knob.style.transform = ''; } };
  stick.addEventListener('touchend', endStick); stick.addEventListener('touchcancel', endStick);
  let lid = null, tlx = 0, tly = 0;
  canvas.addEventListener('touchstart', (e) => { const t = e.changedTouches[0]; if (lid === null) { lid = t.identifier; tlx = t.clientX; tly = t.clientY; } e.preventDefault(); }, { passive: false });
  canvas.addEventListener('touchmove', (e) => { for (const t of e.changedTouches) if (t.identifier === lid) { look(t.clientX - tlx, t.clientY - tly, 0.006); tlx = t.clientX; tly = t.clientY; } e.preventDefault(); }, { passive: false });
  canvas.addEventListener('touchend', (e) => { for (const t of e.changedTouches) if (t.identifier === lid) lid = null; });
  const hold = (id, key) => { const b = document.getElementById(id); b.addEventListener('touchstart', (e) => { TOUCH[key] = true; e.preventDefault(); }, { passive: false }); b.addEventListener('touchend', () => { TOUCH[key] = false; }); };
  document.getElementById('tRun').addEventListener('touchstart', (e) => { TOUCH.run = !TOUCH.run; e.target.style.background = TOUCH.run ? 'rgba(252,204,10,.7)' : ''; e.preventDefault(); }, { passive: false });
  hold('tUp', 'up'); hold('tDn', 'down');
}
function look(dx, dy, s) {
  PL.yaw -= dx * s;
  PL.pitch = clamp(PL.pitch - dy * s, -1.45, 1.45);
}
function toggleFly() {
  PL.mode = PL.mode === 'fly' ? 'walk' : 'fly';
  if (PL.mode === 'fly') { PL.vy = 0; HUD.toast('Flying — Space to climb, C to descend, scroll for speed'); }
  else { PL.vy = 0; PL.grounded = false; HUD.toast('Walking — you will drop to the nearest surface'); }
  document.getElementById('touch').querySelector('.tbtns').style.display = '';
}

function updatePlayer(dt) {
  const fwd = (KEYS.KeyW || KEYS.ArrowUp ? 1 : 0) - (KEYS.KeyS || KEYS.ArrowDown ? 1 : 0) - TOUCH.mz;
  const strafe = (KEYS.KeyD || KEYS.ArrowRight ? 1 : 0) - (KEYS.KeyA || KEYS.ArrowLeft ? 1 : 0) + TOUCH.mx;
  const run = KEYS.ShiftLeft || KEYS.ShiftRight || TOUCH.run;
  const sy = Math.sin(PL.yaw), cy = Math.cos(PL.yaw);
  // forward is -z when yaw = 0
  const fx = -sy, fz = -cy, rx = cy, rz = -sy;
  let ix = fx * fwd + rx * strafe, iz = fz * fwd + rz * strafe;
  const il = Math.hypot(ix, iz); if (il > 1) { ix /= il; iz /= il; }
  if (PL.mode === 'fly') {
    const sp = PL.flySpeed * (run ? 5 : 1);
    const cp = Math.cos(PL.pitch), spi = Math.sin(PL.pitch);
    let vx = (fx * cp * fwd + rx * strafe) * sp, vz = (fz * cp * fwd + rz * strafe) * sp, vy = spi * fwd * sp;
    if (KEYS.Space || TOUCH.up || KEYS.KeyE) vy += sp * 0.8;
    if (KEYS.KeyC || TOUCH.down || KEYS.KeyQ) vy -= sp * 0.8;
    const k = 1 - Math.exp(-dt * 4);
    PL.vx += (vx - PL.vx) * k; PL.vz += (vz - PL.vz) * k; PL.vy += (vy - PL.vy) * k;
    let nx = PL.x + PL.vx * dt, nz = PL.z + PL.vz * dt;
    let ny = PL.feet + PL.vy * dt;
    [nx, nz] = collide(nx, nz, ny, 1.2, 3);
    const sup = supportAt(nx, nz, ny + 0.5, 0) ?? -2.5;
    if (ny < sup) ny = sup;
    ny = Math.min(ny, 2600);
    PL.x = clamp(nx, -9000, 9000); PL.z = clamp(nz, -26000, 16000); PL.feet = ny;
    PL.speed = Math.hypot(PL.vx, PL.vz, PL.vy);
    PL.camY = PL.feet + EYE;
    return;
  }
  const target = run ? 8.5 : 3.0;
  const k = 1 - Math.exp(-dt * (PL.grounded ? 9 : 1.5));
  PL.vx += (ix * target - PL.vx) * k; PL.vz += (iz * target - PL.vz) * k;
  let nx = PL.x + PL.vx * dt, nz = PL.z + PL.vz * dt;
  [nx, nz] = collide(nx, nz, PL.feet, RADIUS);
  let sup = supportAt(nx, nz, PL.feet);
  if (sup === null) {
    // water or void: try sliding along each axis
    const sa = supportAt(nx, PL.z, PL.feet), sb = supportAt(PL.x, nz, PL.feet);
    if (sa !== null) { nz = PL.z; sup = sa; } else if (sb !== null) { nx = PL.x; sup = sb; } else { nx = PL.x; nz = PL.z; sup = supportAt(nx, nz, PL.feet); }
    PL.vx *= 0.3; PL.vz *= 0.3;
  }
  PL.x = nx; PL.z = nz;
  if (sup === null) sup = PL.feet;
  if (PL.grounded) {
    if (sup >= PL.feet - 0.7) { PL.feet = sup; PL.vy = 0; }
    else PL.grounded = false;
    if (KEYS.Space || TOUCH.up) { PL.vy = 4.6; PL.grounded = false; }
  }
  if (!PL.grounded) {
    PL.vy -= 18 * dt;
    PL.feet += PL.vy * dt;
    const s2 = supportAt(PL.x, PL.z, PL.feet + 0.05);
    if (s2 !== null && PL.feet <= s2) { PL.feet = s2; PL.vy = 0; PL.grounded = true; }
    if (PL.feet < -30) { PL.feet = 0; PL.grounded = true; }
  }
  PL.speed = Math.hypot(PL.vx, PL.vz);
  // camera: smooth step-ups and a gentle head bob
  const want = PL.feet + EYE;
  PL.camY += (want - PL.camY) * (1 - Math.exp(-dt * (Math.abs(want - PL.camY) > 3 ? 30 : 14)));
  if (PL.grounded && PL.speed > 0.4) {
    const prev = PL.stepPhase;
    PL.stepPhase += dt * PL.speed * (run ? 1.05 : 1.75);
    if (Math.floor(prev / Math.PI) !== Math.floor(PL.stepPhase / Math.PI)) AUDIO.step && AUDIO.step(run);
  }
  PL.bob = PL.grounded ? Math.sin(PL.stepPhase * 2) * 0.035 * clamp(PL.speed / 3, 0, 1.4) : 0;
}

function teleport(t) {
  PL.x = t.x; PL.z = t.z; PL.vx = PL.vz = PL.vy = 0;
  PL.yaw = t.yaw || 0; PL.pitch = t.y && t.y > 50 ? -0.15 : 0;
  if (t.y != null) { PL.feet = t.y; }
  else {
    // land at street level: spiral out of water and building footprints to the nearest open spot
    const open = (x, z) => {
      const lo = supportAt(x, z, 80, 0, true);
      if (lo === null) return null;
      const c = collide(x, z, lo, RADIUS);
      return Math.hypot(c[0] - x, c[1] - z) < 0.01 && !insideBuilding(x, z, lo) ? lo : null;
    };
    let s = open(t.x, t.z);
    for (let r = 3; s === null && r < 500; r += 3) for (let a = 0; a < 6.28 && s === null; a += 0.4) {
      const x = t.x + Math.cos(a) * r, z = t.z + Math.sin(a) * r, q = open(x, z);
      if (q !== null) { PL.x = x; PL.z = z; s = q; }
    }
    PL.feet = s ?? 0.15;
  }
  if (PL.mode === 'fly' && (t.y == null || t.y < 50)) PL.mode = 'walk';
  PL.grounded = true; PL.camY = PL.feet + EYE;
  TRAFFIC.cars.forEach((c) => c.active && despawnCar(c));
  TRAFFIC.first = true;
  PEDS.list.forEach((p) => (p.active = false));
}
