// =====================================================================
//  HUD, minimap, full map, settings
// =====================================================================
const $ = (id) => document.getElementById(id);
const HUD = {
  mapOpen: false, photo: false, helpShown: true, last: 0,
  init() {
    this.mini = $('miniC').getContext('2d');
    $('bMap').onclick = () => this.toggleMap();
    $('bFly').onclick = () => toggleFly();
    $('bSet').onclick = () => { $('settings').hidden = !$('settings').hidden; };
    $('bSnd').onclick = () => { AUDIO.toggle(); $('bSnd').textContent = AUDIO.muted ? 'Sound off' : 'Sound on'; };
    $('mapclose').onclick = () => this.toggleMap();
    const sTime = $('sTime');
    sTime.oninput = () => { ENV.minutes = +sTime.value; };
    for (const b of $('sFlow').children) b.onclick = () => { ENV.flow = +b.dataset.v; this.syncSettings(); };
    for (const b of $('sQual').children) b.onclick = () => { applyQuality(+b.dataset.v); this.syncSettings(); };
    $('sFov').oninput = (e) => { CAMERA.fov = +e.target.value; CAMERA.updateProjectionMatrix(); };
    this.syncSettings();
    this.buildMapUI();
    setTimeout(() => this.toggleHelp(false), 16000);
  },
  syncSettings() {
    for (const b of $('sFlow').children) b.setAttribute('aria-pressed', String(+b.dataset.v === ENV.flow));
    for (const b of $('sQual').children) b.setAttribute('aria-pressed', String(+b.dataset.v === QUALITY.level));
  },
  show() { for (const id of ['loc', 'status', 'mini', 'miniN', 'help', 'tools', 'cross', 'fps']) $(id).hidden = false; if (matchMedia('(pointer: coarse)').matches) $('touch').hidden = false; },
  toggleHelp(v) { this.helpShown = v ?? !this.helpShown; $('help').classList.toggle('dim', !this.helpShown); },
  togglePhoto() {
    this.photo = !this.photo;
    for (const id of ['loc', 'status', 'mini', 'miniN', 'help', 'tools', 'cross', 'fps', 'settings']) { if (this.photo) $(id).dataset.was = $(id).hidden ? '1' : '', $(id).hidden = true; else $(id).hidden = $(id).dataset.was === '1'; }
    if (!this.photo) this.toast('Photo mode off'); else this.toast('Photo mode — P to bring the HUD back');
  },
  cycleFlow() { const opts = [0, 1, 60, 600]; ENV.flow = opts[(opts.indexOf(ENV.flow) + 1) % opts.length]; this.syncSettings(); this.toast(ENV.flow === 0 ? 'Clock paused' : ENV.flow === 1 ? 'Clock at real time' : `Clock ×${ENV.flow}`); },
  toastT: 0,
  toast(msg) { const t = $('toast'); t.textContent = msg; t.classList.add('on'); clearTimeout(this.toastT); this.toastT = setTimeout(() => t.classList.remove('on'), 2400); },
  timeStr() {
    const m = Math.floor(ENV.minutes), h = Math.floor(m / 60), mm = m % 60;
    return `${((h + 11) % 12) + 1}:${String(mm).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
  },
  update(dt, fps) {
    this.last += dt;
    if (this.last > 0.2) {
      this.last = 0;
      const loc = describe(PL.x, PL.z, PL.feet);
      $('sStreet').textContent = loc.a; $('sAve').textContent = loc.b;
      $('sAve').parentElement.hidden = !loc.b;
      $('sHood').textContent = loc.hood; $('sPlace').textContent = loc.place ? '· ' + loc.place : '';
      $('tTime').textContent = this.timeStr();
      $('tDate').textContent = 'Tue Oct 13' + (ENV.flow === 0 ? ' · paused' : ENV.flow > 1 ? ` · ×${ENV.flow}` : '');
      const fly = PL.mode === 'fly', run = !fly && (KEYS.ShiftLeft || KEYS.ShiftRight || TOUCH.run) && PL.speed > 4;
      $('mBullet').textContent = fly ? 'F' : run ? 'R' : 'W';
      $('mBullet').classList.toggle('f', fly);
      $('mName').textContent = fly ? 'Flying' : run ? 'Running' : 'Walking';
      $('mSpeed').textContent = fly ? `${Math.round(PL.speed)} m/s · ${Math.round(PL.feet)} m up` : `${PL.speed.toFixed(1)} m/s` + (PL.feet > 5 ? ` · ${Math.round(PL.feet)} m up` : '');
      if (!$('settings').hidden) { $('sTime').value = Math.floor(ENV.minutes); $('sTimeV').textContent = this.timeStr(); }
      $('fps').textContent = `${Math.round(fps)} FPS`;
    }
    this.drawMini();
  },
  drawMini() {
    const g = this.mini, S = 368, R = S / 2;
    const range = PL.mode === 'fly' ? clamp(PL.feet * 2.4, 420, 3000) : 420; // meters radius
    const k = R / range; // px per meter
    g.save();
    g.fillStyle = '#2d4553'; g.fillRect(0, 0, S, S);
    g.translate(R, R); g.rotate(PL.yaw);
    const sc = k / MAP.s;
    g.imageSmoothingEnabled = true;
    const sx = (PL.x - MAP.x0) * MAP.s, sz = (PL.z - MAP.z0) * MAP.s, half = range * MAP.s * 1.45;
    g.drawImage(mapCanvas, sx - half, sz - half, half * 2, half * 2, -half * sc, -half * sc, half * 2 * sc, half * 2 * sc);
    // nearby traffic as dots
    g.fillStyle = '#f2b70f';
    for (const c of TRAFFIC.cars) if (c.active && c.x !== undefined) { const dx = (c.x - PL.x) * k, dz = (c.z - PL.z) * k; if (Math.abs(dx) < R && Math.abs(dz) < R) g.fillRect(dx - 1.5, dz - 1.5, 3, 3); }
    g.restore();
    // player arrow (points up = forward)
    g.fillStyle = '#fccc0a'; g.strokeStyle = '#0c0d0e'; g.lineWidth = 3;
    g.beginPath(); g.moveTo(R, R - 15); g.lineTo(R + 10, R + 11); g.lineTo(R, R + 5); g.lineTo(R - 10, R + 11); g.closePath(); g.stroke(); g.fill();
    // north marker rides the rim
    const n = $('miniN').firstElementChild;
    const a = PL.yaw, rr2 = (n.parentElement.clientWidth / 2) - 2;
    n.style.left = `${rr2 + Math.sin(-a) * -rr2 + 2}px`; n.style.top = `${rr2 - Math.cos(a) * rr2 - 4}px`; n.style.transform = 'translate(-50%,0)';
  },
  // ---------------- full map ----------------
  buildMapUI() {
    const lm = $('lm');
    const groups = {};
    for (const t of TELEPORTS) (groups[t.group] = groups[t.group] || []).push(t);
    const colors = { Midtown: 'var(--line-yellow)', Downtown: 'var(--line-red)', Uptown: 'var(--line-green)', Bridges: 'var(--line-blue)', 'Up high': 'var(--line-orange)', Harbor: '#7fb9c9' };
    for (const g of ['Midtown', 'Up high', 'Downtown', 'Uptown', 'Bridges', 'Harbor']) {
      if (!groups[g]) continue;
      const h = document.createElement('div'); h.className = 'grp'; h.textContent = g; lm.appendChild(h);
      for (const t of groups[g]) {
        const b = document.createElement('button'); b.type = 'button';
        b.innerHTML = `<span class="dot" style="background:${colors[g]}"></span><span>${t.name}<small>${t.sub}</small></span>`;
        b.onclick = () => { teleport(t); this.toggleMap(false); this.toast(t.name); };
        lm.appendChild(b);
      }
    }
    const wrap = $('mapwrap'), cv = $('mapC');
    this.mv = { scale: 0.16, ox: 0, oy: 0 };
    let drag = null, moved = 0;
    wrap.addEventListener('mousedown', (e) => { drag = [e.clientX, e.clientY, this.mv.ox, this.mv.oy]; moved = 0; wrap.style.cursor = 'grabbing'; });
    addEventListener('mousemove', (e) => { if (!drag) return; this.mv.ox = drag[2] + e.clientX - drag[0]; this.mv.oy = drag[3] + e.clientY - drag[1]; moved += Math.abs(e.movementX) + Math.abs(e.movementY); this.drawMap(); });
    addEventListener('mouseup', (e) => {
      if (drag && moved < 5 && e.target === cv) {
        const r = cv.getBoundingClientRect();
        const wx = MAP.x0 + ((e.clientX - r.left - this.mv.ox) / this.mv.scale) / MAP.s, wz = MAP.z0 + ((e.clientY - r.top - this.mv.oy) / this.mv.scale) / MAP.s;
        if (landAt(wx, wz)) { teleport({ x: wx, z: wz, yaw: PL.yaw }); this.toggleMap(false); this.toast(describe(wx, wz, 0).hood); }
        else this.toast('That spot is in the water — pick a place on land');
      }
      drag = null; wrap.style.cursor = '';
    });
    wrap.addEventListener('wheel', (e) => {
      e.preventDefault();
      const r = cv.getBoundingClientRect(), mx = e.clientX - r.left, my = e.clientY - r.top;
      const f = e.deltaY > 0 ? 0.85 : 1.18, ns = clamp(this.mv.scale * f, 0.08, 4);
      this.mv.ox = mx - (mx - this.mv.ox) * ns / this.mv.scale; this.mv.oy = my - (my - this.mv.oy) * ns / this.mv.scale; this.mv.scale = ns;
      this.drawMap();
    }, { passive: false });
    let pinch = null;
    wrap.addEventListener('touchstart', (e) => { if (e.touches.length === 1) { drag = [e.touches[0].clientX, e.touches[0].clientY, this.mv.ox, this.mv.oy]; moved = 0; } else if (e.touches.length === 2) { pinch = [Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY), this.mv.scale]; } }, { passive: true });
    wrap.addEventListener('touchmove', (e) => {
      if (e.touches.length === 1 && drag) { this.mv.ox = drag[2] + e.touches[0].clientX - drag[0]; this.mv.oy = drag[3] + e.touches[0].clientY - drag[1]; moved += 3; }
      else if (e.touches.length === 2 && pinch) { const d = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY); this.mv.scale = clamp(pinch[1] * d / pinch[0], 0.08, 4); }
      this.drawMap(); e.preventDefault();
    }, { passive: false });
    wrap.addEventListener('touchend', () => { drag = null; pinch = null; });
  },
  toggleMap(v) {
    this.mapOpen = v ?? !this.mapOpen;
    $('map').hidden = !this.mapOpen;
    if (this.mapOpen) {
      if (document.pointerLockElement) document.exitPointerLock();
      const wrap = $('mapwrap'), cv = $('mapC');
      cv.width = wrap.clientWidth * devicePixelRatio; cv.height = wrap.clientHeight * devicePixelRatio;
      cv.style.width = wrap.clientWidth + 'px'; cv.style.height = wrap.clientHeight + 'px';
      this.mv.scale = 0.5;
      this.mv.ox = wrap.clientWidth / 2 - (PL.x - MAP.x0) * MAP.s * this.mv.scale; this.mv.oy = wrap.clientHeight / 2 - (PL.z - MAP.z0) * MAP.s * this.mv.scale;
      this.drawMap();
    }
  },
  drawMap() {
    const cv = $('mapC'), g = cv.getContext('2d'), dpr = devicePixelRatio;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.fillStyle = '#22394a'; g.fillRect(0, 0, cv.width, cv.height);
    g.imageSmoothingEnabled = this.mv.scale < 2;
    g.drawImage(mapCanvas, this.mv.ox, this.mv.oy, MAP.w * this.mv.scale, MAP.h * this.mv.scale);
    const P = (x, z) => [this.mv.ox + (x - MAP.x0) * MAP.s * this.mv.scale, this.mv.oy + (z - MAP.z0) * MAP.s * this.mv.scale];
    g.font = '700 12px Archivo, "Helvetica Neue", Arial, sans-serif'; g.textBaseline = 'middle';
    const boxes = [];
    for (const t of TELEPORTS) {
      const [x, y] = P(t.x, t.z);
      g.fillStyle = '#f4f3ee'; g.beginPath(); g.arc(x, y, 3.5, 0, 7); g.fill();
      if (this.mv.scale > 0.35) {
        const w = g.measureText(t.name).width + 8, b = [x + 6, y - 9, x + 6 + w, y + 9];
        if (boxes.some((o) => b[0] < o[2] && b[2] > o[0] && b[1] < o[3] && b[3] > o[1])) continue;
        boxes.push(b);
        g.fillStyle = 'rgba(12,13,14,.8)'; g.fillRect(b[0], b[1], w, 18); g.fillStyle = '#f4f3ee'; g.fillText(t.name, x + 10, y);
      }
    }
    // street labels when zoomed in
    if (this.mv.scale > 1.2) {
      g.fillStyle = 'rgba(244,243,238,.8)'; g.font = '600 10px Archivo, Arial, sans-serif';
      for (let n = 1; n <= 220; n += this.mv.scale > 2.5 ? 1 : 5) { const [x, y] = P(shoreW(zN(n)) + 70, zN(n)); g.fillText(n + ' St', x, y); }
    }
    const [px, py] = P(PL.x, PL.z);
    g.save(); g.translate(px, py); g.rotate(-PL.yaw);
    g.fillStyle = '#fccc0a'; g.strokeStyle = '#0c0d0e'; g.lineWidth = 2.5;
    g.beginPath(); g.moveTo(0, -12); g.lineTo(8, 9); g.lineTo(0, 4); g.lineTo(-8, 9); g.closePath(); g.stroke(); g.fill();
    g.restore();
  },
};

function describe(x, z, feet) {
  const hood = neighborhood(x, z);
  let a = '', b = '', place = '';
  // bridges
  for (const B of BRIDGES) {
    const s = (x - B.P(0)[0]) * B.dx + (z - B.P(0)[1]) * B.dz, off = Math.abs(-(x - B.P(0)[0]) * B.dz + (z - B.P(0)[1]) * B.dx);
    if (s > 0 && s < B.len && off < B.W / 2 + 3 && Math.abs(feet - B.yAt(s)) < 4 && B.yAt(s) > 3) return { a: B.name, b: '', hood: Math.round(B.yAt(s)) + ' m above ' + (z > 0 || x > 0 ? 'the East River' : 'the river'), place: '' };
  }
  const inCP = x > CP.x0 && x < CP.x1 && z > CP.z0 && z < CP.z1;
  if (inCP) {
    let best = null, bd = 1e9;
    for (const e of CP_WATER.concat(CP_LAWNS)) { const d = ellD(x, z, e); if (d < bd) { bd = d; best = e; } }
    const n = Math.round(nOfZ(z));
    return { a: 'Central Park', b: `near ${n} St`, hood: bd < 1.6 ? best[4] : 'Central Park', place: '' };
  }
  if (!inManhattan(x, z, -40)) return { a: hood, b: '', hood: landAt(x, z) ? 'Across the river' : 'On the water', place: '' };
  const names = locateNames(x, z);
  a = names.street; b = names.ave;
  // nearest teleport name as a place hint
  let bd = 160;
  for (const t of TELEPORTS) { const d = Math.hypot(t.x - x, t.z - z); if (d < bd) { bd = d; place = t.name; } }
  return { a, b, hood, place };
}

// =====================================================================
//  Audio — synthesized street ambience
// =====================================================================
const AUDIO = {
  ctx: null, muted: false, master: null,
  start() {
    if (this.ctx) return;
    try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return; }
    const c = this.ctx;
    this.master = c.createGain(); this.master.gain.value = 0.7; this.master.connect(c.destination);
    const noise = (type) => {
      const len = c.sampleRate * 4, buf = c.createBuffer(1, len, c.sampleRate), d = buf.getChannelData(0);
      let last = 0;
      for (let i = 0; i < len; i++) { const w = Math.random() * 2 - 1; if (type === 'brown') { last = (last + 0.02 * w) / 1.02; d[i] = last * 3.5; } else d[i] = w; }
      const src = c.createBufferSource(); src.buffer = buf; src.loop = true; src.start(); return src;
    };
    // traffic rumble
    const rum = noise('brown'), lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 380;
    this.rumble = c.createGain(); this.rumble.gain.value = 0.0; rum.connect(lp).connect(this.rumble).connect(this.master);
    // distant hiss of the city
    const hs = noise('white'), bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 900; bp.Q.value = 0.4;
    this.hiss = c.createGain(); this.hiss.gain.value = 0.0; hs.connect(bp).connect(this.hiss).connect(this.master);
    // wind aloft
    const wn = noise('white'), wf = c.createBiquadFilter(); wf.type = 'bandpass'; wf.frequency.value = 420; wf.Q.value = 0.7;
    this.wind = c.createGain(); this.wind.gain.value = 0; wn.connect(wf).connect(this.wind).connect(this.master);
    this.windF = wf;
    // crowd murmur for Times Square
    const cr = noise('white'), cf = c.createBiquadFilter(); cf.type = 'bandpass'; cf.frequency.value = 520; cf.Q.value = 1.4;
    this.crowd = c.createGain(); this.crowd.gain.value = 0; cr.connect(cf).connect(this.crowd).connect(this.master);
    this.noiseBuf = rum.buffer;
    this.timer = 0; this.bird = 0;
  },
  toggle() { this.muted = !this.muted; if (this.master) this.master.gain.value = this.muted ? 0 : 0.7; },
  update(dt) {
    if (!this.ctx || this.muted) return;
    const c = this.ctx, t = c.currentTime;
    const alt = PL.feet, park = (PL.x > CP.x0 && PL.x < CP.x1 && PL.z > CP.z0 && PL.z < CP.z1);
    const onIsland = inManhattan(PL.x, PL.z);
    const busy = onIsland ? (park ? 0.25 : 1) : 0.3;
    const altF = 1 - smoothstep(20, 400, alt);
    const nightF = 1 - ENV.night * 0.35;
    this.rumble.gain.setTargetAtTime(0.22 * busy * altF * nightF, t, 0.5);
    this.hiss.gain.setTargetAtTime(0.018 * busy * altF + 0.006, t, 0.5);
    const wind = PL.mode === 'fly' ? clamp(PL.speed / 80, 0, 1) * 0.12 + smoothstep(40, 400, alt) * 0.08 : smoothstep(60, 300, alt) * 0.1;
    this.wind.gain.setTargetAtTime(wind, t, 0.4); this.windF.frequency.setTargetAtTime(300 + PL.speed * 6, t, 0.3);
    const ts = Math.hypot(PL.x + 520, PL.z - zN(44.5));
    this.crowd.gain.setTargetAtTime(alt < 30 ? 0.05 * (1 - smoothstep(60, 260, ts)) : 0, t, 0.6);
    this.timer -= dt;
    if (this.timer < 0 && busy > 0.5 && altF > 0.3) { this.timer = rr(2.5, 9); this.horn(PL.x + rr(-150, 150), PL.z + rr(-150, 150)); }
    if (chance(dt / 70) && altF > 0.2 && onIsland) this.siren();
    this.bird -= dt;
    if ((park || !onIsland) && this.bird < 0 && ENV.night < 0.5) { this.bird = rr(0.6, 3); this.chirp(); }
  },
  pan(x, z) {
    const dx = x - PL.x, dz = z - PL.z, d = Math.hypot(dx, dz) || 1;
    const right = (dx * Math.cos(PL.yaw) - dz * Math.sin(PL.yaw)) / d;
    const p = this.ctx.createStereoPanner ? this.ctx.createStereoPanner() : this.ctx.createGain();
    if (p.pan) p.pan.value = clamp(right, -1, 1);
    return [p, clamp(40 / (d + 20), 0.05, 1)];
  },
  horn(x, z) {
    if (!this.ctx || this.muted) return;
    const c = this.ctx, t = c.currentTime;
    const [p, vol] = this.pan(x, z);
    const g = c.createGain(); g.gain.setValueAtTime(0, t);
    const dur = rr(0.12, 0.45);
    g.gain.linearRampToValueAtTime(0.06 * vol, t + 0.02); g.gain.setValueAtTime(0.06 * vol, t + dur); g.gain.linearRampToValueAtTime(0, t + dur + 0.05);
    const f = rr(360, 470);
    for (const k of [1, 1.26]) { const o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f * k; const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1800; o.connect(lp).connect(g); o.start(t); o.stop(t + dur + 0.1); }
    g.connect(p).connect(this.master);
    if (chance(0.3)) setTimeout(() => this.horn(x, z), 220);
  },
  siren() {
    const c = this.ctx, t = c.currentTime;
    const o = c.createOscillator(); o.type = 'triangle';
    const lfo = c.createOscillator(); lfo.frequency.value = rr(0.25, 0.4);
    const lg = c.createGain(); lg.gain.value = 380; lfo.connect(lg).connect(o.frequency); o.frequency.value = 1050;
    const g = c.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.025, t + 2); g.gain.linearRampToValueAtTime(0, t + 9);
    const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1400;
    o.connect(lp).connect(g).connect(this.master); o.start(t); lfo.start(t); o.stop(t + 9.2); lfo.stop(t + 9.2);
  },
  chirp() {
    const c = this.ctx, t = c.currentTime;
    const o = c.createOscillator(), g = c.createGain();
    const f = rr(2400, 4200);
    o.frequency.setValueAtTime(f, t); o.frequency.exponentialRampToValueAtTime(f * rr(0.6, 1.4), t + 0.12);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.02, t + 0.02); g.gain.linearRampToValueAtTime(0, t + 0.14);
    o.connect(g).connect(this.master); o.start(t); o.stop(t + 0.16);
    if (chance(0.6)) setTimeout(() => this.chirp(), rr(90, 200));
  },
  step(run) {
    if (!this.ctx || this.muted) return;
    const c = this.ctx, t = c.currentTime;
    const src = c.createBufferSource(); src.buffer = this.noiseBuf;
    const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = PL.feet > 0.3 && (PL.x > CP.x0 && PL.x < CP.x1) ? 500 : 1300; bp.Q.value = 1.2;
    const g = c.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(run ? 0.35 : 0.22, t + 0.01); g.gain.exponentialRampToValueAtTime(0.001, t + 0.09);
    src.connect(bp).connect(g).connect(this.master); src.start(t, Math.random() * 3); src.stop(t + 0.12);
  },
};
