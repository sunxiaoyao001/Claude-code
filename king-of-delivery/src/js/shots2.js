'use strict';
// ============================================================================
//  Timeline part 2 — ACT 4 (rooftops) … ACT 7 (title & stinger)
// ============================================================================

// draw a figure into a scratch canvas and composite with a rim light
function drawRimmed(ctx, rimCol, dx, dy, fn) {
  const a = scratch('rimA', W, H), ag = a.getContext('2d');
  ag.setTransform(ctx.getTransform());
  fn(ag);
  const b = scratch('rimB', W, H), bg = b.getContext('2d');
  bg.drawImage(a, 0, 0);
  bg.globalCompositeOperation = 'source-in'; bg.fillStyle = rimCol; bg.fillRect(0, 0, W, H);
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.5;
  ctx.filter = 'blur(6px)'; ctx.drawImage(b, dx * 2, dy * 2); ctx.filter = 'none';
  ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
  ctx.drawImage(b, dx, dy);
  ctx.drawImage(a, 0, 0);
  ctx.restore();
  // the opaque figure occludes emissive light behind it (stops moon bloom bleeding over)
  if (EMIT.on && ctx.canvas === EMIT.main) {
    const e = EMIT.g; e.save(); e.setTransform(EMIT.k, 0, 0, EMIT.k, 0, 0);
    e.globalAlpha = 1; e.globalCompositeOperation = 'destination-out'; e.drawImage(a, 0, 0); e.restore();
  }
}

function rooftopScene(ctx, t, sx, o = {}) {
  drawSky(ctx, t, { ox: -sx * 0.01, ...(o.sky ?? {}) });
  if (o.moon !== false) drawMoon(ctx, o.moonX ?? 1150, o.moonY ?? 300, o.moonR ?? 150);
  routeStreams(ctx, t, { y: 210, a: 0.2, cols: o.streams });
  cloudBank(ctx, t, { y: 430, n: 5, seed: 71, scale: 1, ox: -sx * 0.03 });
  drawLayer(ctx, World.far, -sx * 0.05, 560, { wrap: true });
  drawLayer(ctx, World.mid, -sx * 0.15, 650, { wrap: true, a: 0.9 });
  const top = o.top ?? 330;
  drawLayer(ctx, World.roofs, -sx, top, { wrap: true });
  drawLaundry(ctx, World.roofs, -sx, top, t);
  return top;
}
function roofGround(sx, x, top) { const r = roofY(World.roofs, sx + x); return { y: top + r.y, air: r.air, d0: r.d0 }; }

// manga cut-in band with the character's eyes
function cutIn(ctx, who, lt, d, col) {
  ctx.fillStyle = '#05040A'; ctx.fillRect(0, 0, W, H);
  speedRadial(ctx, W / 2, H / 2, lt, { n: 80, inner: 200, color: shade(col, 0.4), a: 0.6 });
  const open = Ease.outExpo(seg(lt, 0, 0.25));
  const band = poly([0, 330 - 110 * open, W, 230 - 110 * open, W, 760 + 110 * open, 0, 860 + 110 * open]);
  ctx.save(); ctx.clip(band);
  ctx.fillStyle = col; ctx.fillRect(0, 0, W, H);
  halftone(ctx, 0, 0, W, H, shade(col, 0.4), 0.45, 18, false);
  speedHorizontal(ctx, lt, { n: 40, a: 0.5, color: '#ffffff', y0: 200, y1: 900 });
  drawBust(ctx, who, 1250 + (1 - Ease.outCubic(seg(lt, 0, 0.5))) * 300, 700, 3.3, { t: lt, yaw: who === 'B' ? -0.15 : 0.15, expr: 'determined', glow: 0.8, rim: '#ffffff', noBody: false });
  ctx.restore();
  ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 8; ctx.stroke(band);
}

// flame aura around a standing figure
function aura(ctx, cx, base, w, h, col, t, a = 1) {
  if (a <= 0) return;
  const fr = Math.floor(t * 12);
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (let layer = 0; layer < 3; layer++) {
    const k = 1 - layer * 0.28;
    const p = new Path2D();
    p.moveTo(cx - w * k / 2, base);
    const n = 9;
    for (let i = 0; i <= n; i++) {
      const u = i / n;
      const x = cx - w * k / 2 + u * w * k;
      const peak = h * k * (0.55 + 0.45 * Math.sin(u * Math.PI)) * (0.8 + 0.4 * hash3(i, fr, layer));
      p.lineTo(x - w * 0.03, base - peak * 0.7);
      p.lineTo(x, base - peak);
    }
    p.lineTo(cx + w * k / 2, base);
    p.closePath();
    ctx.fillStyle = rgba(layer === 2 ? '#FFFFFF' : col, (layer === 0 ? 0.35 : 0.45) * a);
    ctx.fill(p);
    emitFill(ctx, p, col, 0.4 * a);
  }
  ctx.restore();
}

function helipadScene(ctx, t, o = {}) {
  drawSky(ctx, t, { top: '#04020C', mid: '#120A2E', low: '#2A1452', starA: 0.4 });
  drawMoon(ctx, 1520, 250, 110, { a: 0.55 });
  const fl = Math.max(flicker(t, o.bolt1 ?? -9, 0.5), flicker(t, o.bolt2 ?? -9, 0.5));
  cloudBank(ctx, t, { y: 340, n: 6, seed: 91, scale: 1.3, col: fl > 0.3 ? '#3A2E8A' : '#1A1446', rim: '#6A5AD8' });
  drawLayer(ctx, World.far, -t * 3, 690, { wrap: true, w: World.far.w * 0.55, h: World.far.h * 0.55 });
  // spire
  ctx.strokeStyle = '#0A0820'; ctx.lineWidth = 26; ctx.beginPath(); ctx.moveTo(W / 2, 900); ctx.lineTo(W / 2, 120); ctx.stroke();
  ctx.strokeStyle = '#2A2660'; ctx.lineWidth = 8; ctx.beginPath(); ctx.moveTo(W / 2 - 6, 900); ctx.lineTo(W / 2 - 6, 120); ctx.stroke();
  for (const yy of [200, 380, 560]) glow(ctx, W / 2, yy, 30, '#FF3355', 0.6 + 0.4 * Math.sin(t * 6));
  if (fl > 0) lightning(ctx, W / 2 + 300, -100, W / 2, 140, 400 + Math.floor((o.bolt1 ?? 0) * 10), { a: fl, w: 5, color: '#D8C8FF' });
  // platform
  ctx.fillStyle = '#0B0A20'; ctx.fillRect(0, 880, W, 300);
  const pg = ctx.createLinearGradient(0, 790, 0, 900);
  pg.addColorStop(0, '#2A2758'); pg.addColorStop(1, '#141233');
  ctx.fillStyle = pg; ctx.beginPath(); ctx.ellipse(W / 2, 860, 1050, 90, 0, 0, TAU); ctx.fill();
  ctx.strokeStyle = 'rgba(255,214,90,0.8)'; ctx.lineWidth = 5; ctx.beginPath(); ctx.ellipse(W / 2, 860, 360, 34, 0, 0, TAU); ctx.stroke();
  ctx.save(); ctx.translate(W / 2, 860); ctx.scale(1, 0.1); ctx.font = font(420, FONT.anton); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillStyle = 'rgba(255,214,90,0.75)'; ctx.fillText('H', 0, 0); ctx.restore();
  for (let k = 0; k < 28; k++) {
    const a = k / 28 * TAU, x = W / 2 + Math.cos(a) * 1040, y = 860 + Math.sin(a) * 88;
    if (y < 860 && Math.abs(Math.cos(a)) < 0.2) continue;
    glow(ctx, x, y, 18, k % 2 ? '#3CF2FF' : '#FF4FD8', 0.6 + 0.4 * Math.sin(t * 8 + k));
  }
  // wet sheen
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.25 + fl * 0.4;
  ctx.fillStyle = '#7E6BFF'; ctx.beginPath(); ctx.ellipse(W / 2, 872, 700, 22, 0, 0, TAU); ctx.fill(); ctx.restore();
  return fl;
}

// ============================================================ ACT 4 ========
shot(56.0, 59.2, 'moonjump', (ctx, S) => {
  const { t, lt } = S;
  const ts = lt < 2.7 ? 0.06 : 0.06 + (lt - 2.7) * 3;
  drawSky(ctx, t);
  drawMoon(ctx, 960, 470, 360, { halo: '#B8C4FF' });
  cloudBank(ctx, t * 0.2, { y: 780, n: 5, seed: 81, scale: 1.3 });
  drawLayer(ctx, World.far, -t * 2, 650, { wrap: true });
  drawLayer(ctx, World.mid, -t * 4, 760, { wrap: true });
  const u = lt < 2.7 ? 0.2 + 0.6 * Ease.inOutSine(lt / 2.7) : 0.8 + (lt - 2.7) * 1.2;
  for (const [who, dx, dy, s] of [['B', 150, -60, 0.95], ['Y', -170, 70, 1.08]]) {
    const x = lerp(160, 1760, u) + dx, y = 880 - Math.sin(clamp(u) * Math.PI) * 250 + dy;
    drawRimmed(ctx, '#F4F6FF', 0, -4, g => drawRider(g, who, x, y, s, { t: 56 + lt * 0.06, sil: 0.88, glow: 0.8, lean: -0.3 + u * 0.5, speed: 0.25, noUnderglow: true }));
    glow(ctx, x + 150 * s, y - 160 * s, 60, TH[who].glow, 0.7);
  }
  rainLayers(ctx, lt, { ts, k: 0.7, vx: -300 });
  // big floating droplets near camera
  for (let i = 0; i < 9; i++) {
    const x = hash2(i, 41) * W, y = mod(hash2(i, 42) * H + lt * ts * 900, H);
    const r = 8 + 18 * hash2(i, 43);
    glow(ctx, x, y, r * 2.5, '#BFD0FF', 0.25);
    ctx.fillStyle = 'rgba(230,240,255,0.5)'; ctx.beginPath(); ctx.ellipse(x, y, r * 0.5, r, 0, 0, TAU); ctx.fill();
  }
}, S => ({ scene: 0.08, flash: Ease.inQuad(seg(S.lt, 2.9, 3.2)) * 0.5 }));

shot(59.2, 62.4, 'roofs', (ctx, S) => {
  const { t, lt } = S;
  const sp = 2300, sx = lt * sp + 900;
  const top = rooftopScene(ctx, t, sx);
  for (const [who, x, s, dt] of [['B', 1250, 0.88, 0], ['Y', 720, 0.98, 0.15]]) {
    const g = roofGround(sx, x, top), g2 = roofGround(sx, x + 60, top);
    const lean = Math.atan2(g2.y - g.y, 60) * 0.7;
    lightTrail(ctx, x - 150 * s, g.y - 46 * s, TH[who].glow, 900, 9);
    drawRider(ctx, who, x, g.y, s, { t: t + dt, lean, beam: true, scarfLift: g.air * 80 });
    if (g.air === 0 && g.d0 < 260) sparkBurst(ctx, x - 140 * s, g.y, g.d0 / sp, { n: 30, seed: Math.floor(sx / 1000) + x, dir: -2.6, spread: 1.0, life: 0.45 });
  }
  speedHorizontal(ctx, t, { n: 24, a: 0.25, y0: 150, y1: 940 });
  rainLayers(ctx, t, { k: 0.6, vx: -1300 });
  S.timer = 9 * 60 + 58 - lt;
}, { shake: 3 });

// LED billboard wall-ride (top-down on a vertical screen)
let _ledSrc = null;
function ledSource() {
  if (_ledSrc) return _ledSrc;
  const c = makeCanvas(120, 60), g = c.getContext('2d');
  const gr = g.createLinearGradient(0, 0, 120, 60); gr.addColorStop(0, '#3A0F6E'); gr.addColorStop(1, '#0E2A7A');
  g.fillStyle = gr; g.fillRect(0, 0, 120, 60);
  g.fillStyle = '#FF3B5C'; g.fillRect(6, 10, 64, 40);
  g.font = '900 15px "Noto Sans SC"'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#FFFFFF';
  g.fillText('满30减15', 38, 24); g.font = '900 11px "Noto Sans SC"'; g.fillText('限时补贴', 38, 40);
  drawMilkTea(g, 96, 30, 0.32);
  _ledSrc = g.getImageData(0, 0, 120, 60).data;
  return _ledSrc;
}
shot(62.4, 64.0, 'billboard', (ctx, S) => {
  const { t, lt } = S;
  const src = ledSource();
  ctx.fillStyle = '#04030C'; ctx.fillRect(0, 0, W, H);
  ctx.save(); ctx.translate(W / 2, H / 2); ctx.rotate(-0.16); ctx.scale(1.18, 1.18); ctx.translate(-W / 2, -H / 2);
  const cell = 24;
  const path = (who, tt) => {
    const u = clamp(tt / 1.6);
    const off = who === 'Y' ? 150 : -40;
    return [lerp(-300, 2300, u) + off * 0.3, lerp(920, 200, u) + off];
  };
  const pY = path('Y', lt), pB = path('B', lt + 0.12);
  const ang = Math.atan2(200 - 920, 2600);
  const trail = (x, y, p, who) => { // distance to trail segment behind rider
    const d = Math.abs((x - p[0]) * Math.sin(ang) - (y - p[1]) * Math.cos(ang));
    const along = (x - p[0]) * Math.cos(ang) + (y - p[1]) * Math.sin(ang);
    return along < 0 && along > -1400 && d < 60 ? (1 - d / 60) * (1 + along / 1400) : 0;
  };
  for (let gy = -120; gy < H + 120; gy += cell) {
    for (let gx = -160; gx < W + 160; gx += cell) {
      const sxp = clamp(Math.floor((gx + 160) / (W + 320) * 120), 0, 119), syp = clamp(Math.floor((gy + 120) / (H + 240) * 60), 0, 59);
      const i = (syp * 120 + sxp) * 4;
      let r = src[i], g = src[i + 1], b = src[i + 2];
      const flick = 0.75 + 0.25 * hash3(gx, gy, Math.floor(t * 10));
      const ty = trail(gx, gy, pY, 'Y'), tb = trail(gx, gy, pB, 'B');
      if (ty > 0) { r = lerp(r, 255, ty); g = lerp(g, 210, ty); b = lerp(b, 0, ty); }
      if (tb > 0) { r = lerp(r, 40, tb); g = lerp(g, 170, tb); b = lerp(b, 255, tb); }
      ctx.fillStyle = `rgb(${(r * flick) | 0},${(g * flick) | 0},${(b * flick) | 0})`;
      ctx.fillRect(gx + 2, gy + 2, cell - 4, cell - 4);
    }
  }
  emitFill(ctx, poly([-200, -200, W + 200, -200, W + 200, H + 200, -200, H + 200]), '#5A3AB0', 0.12);
  drawTopDown(ctx, 'B', pB[0], pB[1], 0.75, ang, { t });
  drawTopDown(ctx, 'Y', pY[0], pY[1], 0.8, ang, { t });
  ctx.restore();
  rain(ctx, t, { n: 120, a: 0.2, vx: -1600, vy: 900 });
  S.timer = 7 * 60 + 42 - lt;
}, { shake: 3, scene: 0.2 });

shot(64.0, 67.2, 'ultY', (ctx, S) => {
  const { t, lt } = S;
  if (lt < 0.9) {
    cutIn(ctx, 'Y', lt, 0.9, '#FFB800');
    attackName(ctx, lt, 3.2, '黄金袋鼠跳', 'GOLDEN KANGAROO LEAP', '#FFC400', { x: 110, y: 250, size: 110 });
    return;
  }
  const l = lt - 0.9;
  const sx = 4200 + l * 1600;
  rooftopScene(ctx, t, sx, { moonX: 1550, streams: ['#FFD84A', '#FF9A1A'] });
  ctx.save(); ctx.globalCompositeOperation = 'color'; ctx.fillStyle = 'rgba(255,170,0,0.18)'; ctx.fillRect(0, 0, W, H); ctx.restore();
  const u = seg(l, 0, 2.1);
  const kx = lerp(260, 1450, Ease.inOutSine(u)), ky = 1040 - Math.sin(u * Math.PI) * 250;
  const a = env(l, 0, 2.3, 0.25, 0.3);
  construct(ctx, KANGAROO, kx - 520, ky + 40, 0.82, '#FFC400', a, t, { rot: -0.2 + u * 0.35 });
  for (let k = 0; k < 30; k++) { // golden embers
    const age = fract(t * 0.8 + hash1(k + 700));
    const px = kx - 300 + hash1(k + 710) * 600 - age * 300, py = ky - 200 - age * 300 + hash1(k + 720) * 200;
    glow(ctx, px, py, 14, '#FFD84A', (1 - age) * a);
  }
  drawRider(ctx, 'Y', kx + 60, ky - 250, 0.9, { t, lean: -0.35 + u * 0.6, pivot: [-150, -48], glow: 1.6, beam: true });
  glow(ctx, kx - 20, ky - 380, 300, '#FFC400', 0.4 * a);
  rainLayers(ctx, t, { k: 0.5, vx: -1000 });
  attackName(ctx, lt, 3.2, '黄金袋鼠跳', 'GOLDEN KANGAROO LEAP', '#FFC400', { x: 110, y: 250, size: 110 });
  if (u > 0.92) mangaSFX(ctx, '轰！', 1350, 420, 170, { rot: -0.15, font: FONT.brush, scale: 1 + 0.5 * (1 - Ease.outBack(seg(l, 2.0, 2.2))), fill: ['#FFFFFF', '#FFE08A'], stroke2: '#FF6A00' });
  S.timer = 5 * 60 + 18 - lt;
}, S => ({ shake: S.lt > 2.9 ? 14 : 3, scene: 0.2 }));

shot(67.2, 70.4, 'ultB', (ctx, S) => {
  const { t, lt } = S;
  if (lt < 0.9) {
    cutIn(ctx, 'B', lt, 0.9, '#0A86FF');
    attackName(ctx, lt, 3.2, '蜂鸟·千里瞬', 'HUMMINGBIRD FLASH', '#2AA8FF', { x: 110, y: 250, size: 110 });
    return;
  }
  const l = lt - 0.9;
  const sx = 7400 + l * 2600;
  const top = rooftopScene(ctx, t, sx, { moonX: 400, streams: ['#3CC4FF', '#9B8CFF'] });
  ctx.save(); ctx.globalCompositeOperation = 'color'; ctx.fillStyle = 'rgba(0,120,255,0.2)'; ctx.fillRect(0, 0, W, H); ctx.restore();
  const a = env(l, 0, 2.3, 0.25, 0.3);
  construct(ctx, HUMMINGBIRD, 160, 900, 0.9, '#3CC4FF', a, t);
  hummingWings(ctx, 160, 900, 0.9, '#8AE3FF', a, t);
  // blink dashes: discrete jumps forward with afterimage streaks
  const step = Math.min(3, Math.floor(l / 0.55));
  const bx = 520 + step * 330 + (l % 0.55) * 60;
  for (let k = 0; k < step; k++) {
    const gx = 520 + k * 330;
    ctx.save(); ctx.globalAlpha = 0.25;
    drawRider(ctx, 'B', gx, roofGround(sx, gx, top).y, 0.9, { t, sil: 0.3, noUnderglow: true, glow: 0.5 });
    ctx.restore();
  }
  const fl = 1 - seg(l % 0.55, 0, 0.12);
  glow(ctx, bx, roofGround(sx, bx, top).y - 150, 260 * fl, '#8AE3FF', fl);
  speedHorizontal(ctx, t, { n: 20, a: 0.4 * fl, color: '#BFF2FF', y0: 450, y1: 800 });
  drawRider(ctx, 'B', bx, roofGround(sx, bx, top).y, 0.9, { t, glow: 1.6, beam: true });
  rainLayers(ctx, t, { k: 0.5, vx: -1500 });
  attackName(ctx, lt, 3.2, '蜂鸟·千里瞬', 'HUMMINGBIRD FLASH', '#2AA8FF', { x: 110, y: 250, size: 110 });
  if (step >= 1) mangaSFX(ctx, '咻！', 1400, 380, 140, { rot: 0.12, font: FONT.brush, alpha: fl, fill: ['#FFFFFF', '#CDEBFF'] });
  S.timer = 3 * 60 + 47 - lt;
}, S => ({ shake: 3, scene: 0.2, flash: S.lt > 0.9 ? (1 - seg((S.lt - 0.9) % 0.55, 0, 0.1)) * 0.25 : 0, flashC: '#BFF2FF' }));

shot(70.4, 72.0, 'clashSky', (ctx, S) => {
  const { t, lt } = S;
  const split = (yy) => W * 0.5 + (yy - H / 2) * 0.35;
  drawSky(ctx, t);
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = 'rgba(255,140,0,0.28)'; ctx.fill(poly([0, 0, split(0), 0, split(H), H, 0, H]));
  ctx.fillStyle = 'rgba(0,140,255,0.28)'; ctx.fill(poly([split(0), 0, W, 0, W, H, split(H), H]));
  ctx.restore();
  drawMoon(ctx, 960, 300, 160, { a: 0.6 });
  const push = Ease.outCubic(seg(lt, 0, 0.5));
  construct(ctx, KANGAROO, -260 + push * 160, 1000, 1.05, '#FFC400', 1, t, { rot: -0.15 });
  construct(ctx, HUMMINGBIRD, 2240 - push * 160, 900, 1.05, '#3CC4FF', 1, t, { flip: true });
  hummingWings(ctx, 2240 - push * 160, 900, 1.05, '#8AE3FF', 1, t, true);
  for (let k = 0; k < 3; k++) lightning(ctx, 960, 200 + k * 120, 960 + (k - 1) * 120, 760, Math.floor(t * 16) + k * 5, { color: k === 1 ? '#FFFFFF' : '#D8C8FF', w: 4, a: 0.9 });
  shockwave(ctx, 960, 540, fract(lt * 1.6), { r: 900 });
  drawLayer(ctx, World.near, -t * 20, 680, { wrap: true });
  rainLayers(ctx, t, { k: 0.5 });
}, { shake: 14, ca: 4, scene: 0.25 });

// quick-cut montage (8 cuts on the beat)
function speedometer(ctx, cx, cy, r, v) {
  ctx.fillStyle = '#0A0A16'; ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.fill();
  ctx.strokeStyle = '#3A3A5A'; ctx.lineWidth = 8; ctx.stroke();
  for (let k = 0; k <= 12; k++) {
    const a = Math.PI * 0.75 + k / 12 * Math.PI * 1.5;
    ctx.strokeStyle = k > 9 ? '#FF3B5C' : '#D8DBF5'; ctx.lineWidth = k % 2 ? 4 : 8;
    ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * r * 0.78, cy + Math.sin(a) * r * 0.78); ctx.lineTo(cx + Math.cos(a) * r * 0.92, cy + Math.sin(a) * r * 0.92); ctx.stroke();
  }
  const a = Math.PI * 0.75 + v * Math.PI * 1.5;
  ctx.strokeStyle = '#FF3B5C'; ctx.lineWidth = 10; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(a) * r * 0.8, cy + Math.sin(a) * r * 0.8); ctx.stroke();
  glow(ctx, cx + Math.cos(a) * r * 0.8, cy + Math.sin(a) * r * 0.8, 60, '#FF3B5C', 0.8);
  ctx.font = font(r * 0.28, FONT.orb, '900'); ctx.fillStyle = v > 0.9 ? '#FF3B5C' : '#FFFFFF'; ctx.textAlign = 'center';
  ctx.fillText(v > 0.9 ? 'MAX' : Math.round(v * 120) + '', cx, cy + r * 0.5);
}
shot(72.0, 75.2, 'montage', (ctx, S) => {
  const { t, lt } = S;
  const m = Math.min(7, Math.floor(lt / 0.4)), ml = lt - m * 0.4;
  const bgc = ['#FF9F00', '#0A86FF', '#16050A', '#FF9F00', '#0A86FF', '#0A0A16', '#FF9F00', '#16050A'][m];
  ctx.fillStyle = bgc; ctx.fillRect(0, 0, W, H);
  if (m === 0 || m === 4) {
    speedRadial(ctx, W / 2, H / 2, t, { n: 70, inner: 380, color: '#ffffff', a: 0.35 });
    const R = 330;
    if (m === 0) wheelHeavy(ctx, W / 2, H / 2 + 40, R, t * 30, TH.Y, { spin: 1 });
    else wheelTurbine(ctx, W / 2, H / 2 + 40, R, t * 30, TH.B, { spin: 1 });
    sparkStream(ctx, W / 2 - R * 0.7, H / 2 + 40 + R * 0.7, t, { rate: 200, dir: -2.4, spread: 1, vmin: 600, vmax: 1800, life: 0.4, w: 5 });
  } else if (m === 1 || m === 6) {
    const who = m === 1 ? 'B' : 'Y';
    const g = ctx.createLinearGradient(0, 132, 0, 948); g.addColorStop(0, '#F7C9A8'); g.addColorStop(1, '#D98C7A');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    drawAnimeEye(ctx, W / 2, H / 2 + 60, 1100, 640, who === 'B' ? -1 : 1, CAST[who], { open: 0.62, angry: 0.8, glow: 0.4 });
    speedRadial(ctx, W / 2, H / 2, t, { n: 50, inner: 520, color: '#ffffff', a: 0.3 });
  } else if (m === 2 || m === 7) {
    speedRadial(ctx, W / 2, H / 2, t, { n: 60, inner: 420, color: '#FF3B5C', a: 0.25 });
    const sc = 1 + 0.3 * (1 - Ease.outBack(seg(ml, 0, 0.15)));
    ctx.save(); ctx.translate(W / 2, H / 2); ctx.scale(sc, sc); ctx.translate(-W / 2, -H / 2);
    timerHUD(ctx, m === 2 ? 60 : 30, 1, { big: true, x: W / 2, y: H / 2 + 120, size: 300, label: '剩余时间 · TIME LEFT' });
    ctx.restore();
  } else if (m === 3) {
    speedRadial(ctx, W / 2, H / 2, t, { n: 70, inner: 380, color: '#ffffff', a: 0.3 });
    const tw = Ease.outCubic(seg(ml, 0, 0.3)) * 0.5;
    ctx.save(); ctx.translate(W / 2 + 100, H / 2 + 60); ctx.rotate(-0.15);
    ctx.fillStyle = '#1D1C27'; ctx.fillRect(-900, -60, 1200, 120);
    ctx.rotate(-tw);
    flat(ctx, rrectPath(-160, -110, 340, 220, 70), '#22212B', INK, 6);
    flat(ctx, rrectPath(40, -110, 110, 220, 30), '#FFD100', INK, 6);
    ctx.strokeStyle = '#3A3948'; ctx.lineWidth = 8;
    for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.moveTo(-120 + k * 50, -100); ctx.lineTo(-120 + k * 50, 100); ctx.stroke(); }
    ctx.restore();
    mangaSFX(ctx, '嗡——', 1300, 300, 120, { rot: -0.1, font: FONT.brush, fill: ['#FFFFFF', '#FFE08A'] });
  } else if (m === 5) {
    speedometer(ctx, W / 2, H / 2 + 30, 340, Ease.outCubic(seg(ml, 0, 0.35)) * 0.98 + 0.02 * Math.sin(t * 60));
  }
}, S => ({ lb: 1, shake: 8, scene: 0.2, flash: (1 - seg(S.lt % 0.4, 0, 0.08)) * 0.35 }));

// ============================================================ ACT 5 ========
shot(75.2, 78.4, 'helipad', (ctx, S) => {
  const { t, lt } = S;
  helipadScene(ctx, t, { bolt1: 77.2 });
  const u = Ease.outCubic(seg(lt, 0, 1.5));
  const yx = lerp(-500, 640, u), bx = lerp(2420, 1280, u);
  const skid = 1 - seg(lt, 1.0, 1.6);
  drawRider(ctx, 'Y', yx, 880, 0.92, { t, speed: 0.3 + 0.7 * (1 - u), lean: -0.12 * skid, pivot: [-150, -48], beam: true });
  drawRider(ctx, 'B', bx, 880, 0.9, { t: t + 0.2, speed: 0.3 + 0.7 * (1 - u), lean: -0.12 * skid, pivot: [-168, -42], flip: true, beam: true });
  if (skid > 0 && lt > 0.6) {
    sparkStream(ctx, yx - 150 * 0.92, 880, t, { rate: 120, dir: -2.8, spread: 0.9, life: 0.4, vmax: 900 });
    sparkStream(ctx, bx + 168 * 0.9, 880, t, { rate: 120, dir: -0.3, spread: 0.9, life: 0.4, vmax: 900 });
  }
  rainLayers(ctx, t, { k: 0.8, vx: -500 });
  if (lt > 1.2) titleText(ctx, '云顶大厦 · 天台', W / 2, 220, 52, { font: FONT.serif, alpha: env(lt, 1.2, 3.2, 0.3, 0.3), fill: ['#FFFFFF', '#E4E8FF'], glow: 'rgba(200,210,255,0.6)', spacing: 10 });
  S.timer = 10.99 - lt * 0.6;
}, S => ({ shake: S.lt < 1.4 ? 3 : 1, flash: flicker(S.t, 77.2, 0.5) * 0.6, flashC: '#E0D4FF' }));

shot(78.4, 80.0, 'eyes2', (ctx, S) => {
  const { t, lt } = S;
  for (const [who, y0, y1] of [['Y', 132, 540], ['B', 540, 948]]) {
    ctx.save(); ctx.beginPath(); ctx.rect(0, y0, W, y1 - y0); ctx.clip();
    const g = ctx.createLinearGradient(0, y0, 0, y1); g.addColorStop(0, '#F7C9A8'); g.addColorStop(1, '#D98C7A');
    ctx.fillStyle = g; ctx.fillRect(0, y0, W, y1 - y0);
    drawAnimeEye(ctx, who === 'Y' ? W * 0.42 : W * 0.58, (y0 + y1) / 2 + 30, 760, 380, who === 'Y' ? 1 : -1, CAST[who], { open: 0.55 + 0.1 * Math.sin(lt * 3), angry: 0.85, glow: 0.5 });
    ctx.restore();
  }
  ctx.fillStyle = '#000'; ctx.fillRect(0, 536, W, 8);
  S.timer = 5.6 - lt * 0.4;
}, { scene: 0.2 });

shot(80.0, 81.6, 'shoutY', (ctx, S) => {
  const { t, lt } = S;
  portraitBG(ctx, t, '#FF8A00', { lines: true });
  drawBust(ctx, 'Y', 960, 540, 2.0, { t, yaw: 0.25, expr: 'shout', rim: '#FFE7A0', wind: 1.4, glow: 0.4 });
  speakerSub(ctx, lt, S.d, 'Y', '这一单——', 'This order—', { cps: 8 });
}, { shake: 6 });
shot(81.6, 83.2, 'shoutB', (ctx, S) => {
  const { t, lt } = S;
  portraitBG(ctx, t, '#1E8FFF', { lines: true, dir: -1 });
  drawBust(ctx, 'B', 960, 540, 2.0, { t, yaw: -0.25, expr: 'shout', rim: '#BDF2FF', wind: 1.4, glow: 0.4 });
  speakerSub(ctx, lt, S.d, 'B', '——是我的！', '—is MINE!', { cps: 10 });
}, { shake: 6 });

shot(83.2, 84.8, 'power', (ctx, S) => {
  const { t, lt } = S;
  const split = (yy) => W * 0.5 + (yy - H / 2) * 0.3;
  ctx.save(); ctx.clip(poly([0, 0, split(0), 0, split(H), H, 0, H]));
  ctx.fillStyle = '#FF7A00'; ctx.fillRect(0, 0, W, H);
  speedHorizontal(ctx, t, { n: 30, a: 0.4, color: '#FFE08A', dir: 1 });
  aura(ctx, 520, 940, 420, 860, '#FFC400', t, 0.75);
  drawStanding(ctx, 'Y', 500, 940, 1.0, { t, wind: 1, rim: '#FFFFFF' });
  attackName(ctx, lt, S.d + 1, '终极送达', 'FINAL DELIVERY', '#FFD84A', { x: 70, y: 230, size: 96 });
  ctx.restore();
  ctx.save(); ctx.clip(poly([split(0), 0, W, 0, W, H, split(H), H]));
  ctx.fillStyle = '#009CFF'; ctx.fillRect(0, 0, W, H);
  speedHorizontal(ctx, t, { n: 30, a: 0.4, color: '#CDF6FF', dir: -1 });
  aura(ctx, 1420, 940, 420, 860, '#5FE0FF', t + 3, 0.75);
  drawStanding(ctx, 'B', 1440, 940, 1.0, { t, wind: 1, rim: '#FFFFFF', flip: true });
  attackName(ctx, lt - 0.15, S.d + 1, '蜂鸟极速', 'HUMMINGBIRD MAX', '#8AE3FF', { x: 1150, y: 720, size: 96 });
  ctx.restore();
  ctx.fillStyle = '#FFFFFF'; ctx.fill(poly([split(0) - 6, 0, split(0) + 6, 0, split(H) + 6, H, split(H) - 6, H]));
}, S => ({ lb: 0, shake: 8, ca: 3 + 6 * seg(S.lt, 1.2, 1.6), scene: 0.2 }));

shot(84.8, 86.4, 'charge', (ctx, S) => {
  const { t, lt } = S;
  helipadScene(ctx, t, {});
  const u = Ease.outQuart(seg(lt, 0, 1.6));
  speedRadial(ctx, W / 2, 700, t, { n: 90, inner: 260, color: '#FFFFFF', a: 0.3 });
  drawRider(ctx, 'Y', lerp(150, 790, u), 880, 0.95, { t, lean: -0.1, pivot: [-150, -48], beam: true, glow: 1.4 });
  drawRider(ctx, 'B', lerp(1770, 1130, u), 880, 0.93, { t: t + 0.3, lean: -0.1, pivot: [-168, -42], flip: true, beam: true, glow: 1.4 });
  glow(ctx, W / 2, 720, 200 + 200 * u, '#FFFFFF', 0.3 * u);
  rainLayers(ctx, t, { k: 0.7, vx: -300, ts: 1 - 0.85 * seg(lt, 0.9, 1.6) });
  S.timer = 1.99 - lt * 0.6;
}, { shake: 5 });

shot(86.4, 88.0, 'clash', (ctx, S) => {
  const { t, lt } = S;
  if (lt < 0.65) {
    const fr = Math.floor(lt * 24);
    const inv = fr % 4 >= 2;
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, W, H);
    speedRadial(ctx, W / 2, 620, t, { n: 160, inner: 160, color: '#000', a: 1, wk: 1.8 });
    drawRider(ctx, 'Y', 840, 800, 1.1, { t, sil: 1, noUnderglow: true, glow: 0, lean: -0.3, pivot: [-150, -48] });
    drawRider(ctx, 'B', 1080, 800, 1.08, { t, sil: 1, noUnderglow: true, glow: 0, lean: -0.3, pivot: [-168, -42], flip: true });
    shockwave(ctx, W / 2, 620, seg(lt, 0, 0.65), { r: 1300, color: '#000000', color2: '#444444' });
    ctx.save(); ctx.globalCompositeOperation = 'source-over';
    mangaSFX(ctx, '轰！！', 1180, 280, 230, { rot: -0.12, font: FONT.brush, fill: ['#000', '#000'], stroke: '#fff', scale: 1 + 0.4 * (1 - Ease.outBack(seg(lt, 0, 0.2))) });
    ctx.restore();
    if (inv) { ctx.save(); ctx.globalCompositeOperation = 'difference'; ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, W, H); ctx.restore(); }
    return;
  }
  ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, W, H);
  glow(ctx, W / 2, H / 2, 900, '#FFFFFF', 0.5);
}, S => ({ lb: 0, bloom: 0, scene: 0, vig: 0.15, grain: 0.06, shake: S.lt < 0.65 ? 22 : 0 }));

// ============================================================ ACT 6 ========
shot(88.0, 89.6, 'frozen', (ctx, S) => {
  const { t, lt } = S;
  helipadScene(ctx, 86.6, {});
  drawRider(ctx, 'Y', 860, 760, 0.95, { t: 86.6, lean: -0.25, pivot: [-150, -48], speed: 0, spin: 1, glow: 1.2 });
  drawRider(ctx, 'B', 1060, 760, 0.93, { t: 86.8, lean: -0.25, pivot: [-168, -42], flip: true, speed: 0, spin: 1, glow: 1.2 });
  // frozen sparks + rain
  ctx.fillStyle = '#FFE9A0';
  for (let i = 0; i < 60; i++) { const a = hash1(i + 50) * TAU, r = 40 + 260 * hash1(i + 60); ctx.fillRect(W / 2 + Math.cos(a) * r, 640 + Math.sin(a) * r * 0.6, 4, 4); }
  rainLayers(ctx, 86.6, { ts: 0.0001, k: 0.8 });
  ctx.save(); ctx.globalCompositeOperation = 'saturation'; ctx.globalAlpha = 0.75; ctx.fillStyle = '#808080'; ctx.fillRect(0, 0, W, H); ctx.restore();
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.15; ctx.fillStyle = '#8090FF'; ctx.fillRect(0, 0, W, H); ctx.restore();
}, S => ({ flash: 1 - Ease.outCubic(seg(S.lt, 0, 0.9)), scene: 0.2 }));

shot(89.6, 91.2, 'delivered', (ctx, S) => {
  const { t, lt } = S;
  const g = ctx.createRadialGradient(W / 2, H / 2, 100, W / 2, H / 2, 1100);
  g.addColorStop(0, '#2A1608'); g.addColorStop(1, '#05040A');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  bokeh(ctx, t, '#FF6A10', { a: 0.18, n: 18 });
  const zoom = 1 + 0.08 * Ease.inOutSine(S.p);
  ctx.save(); ctx.translate(W / 2, H / 2); ctx.scale(zoom, zoom); ctx.translate(-W / 2, -H / 2);
  drawPhone(ctx, W / 2, 560, 1.12, -0.04, 'Y', lt > 0.55 ? 'delivered' : 'grabbed', lt, { banner: seg(lt, 0.05, 0.35) - seg(lt, 0.5, 0.6), bannerText: '叮！订单已送达', bannerSub: '配送骑手：？？？' });
  ctx.restore();
  rain(ctx, t, { n: 140, a: 0.16 });
}, { lb: 1 });

shot(91.2, 92.8, 'shock', (ctx, S) => {
  const { t, lt } = S;
  const g = ctx.createLinearGradient(0, 0, W, 0); g.addColorStop(0, '#3A2306'); g.addColorStop(0.5, '#120E22'); g.addColorStop(1, '#06203F');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  drawBust(ctx, 'Y', 560, 600, 1.7, { t, yaw: 0.3, expr: 'shock', rim: '#FFE7A0' });
  drawBust(ctx, 'B', 1360, 600, 1.7, { t, yaw: -0.3, expr: 'shock', rim: '#BDF2FF' });
  // gloom lines
  ctx.save(); ctx.globalAlpha = 0.55; ctx.strokeStyle = '#5A5AC8'; ctx.lineWidth = 4;
  for (const cx of [560, 1360]) for (let k = -4; k <= 4; k++) { ctx.beginPath(); ctx.moveTo(cx + k * 22, 260); ctx.lineTo(cx + k * 22, 330 + Math.abs(k) * -8 + 60); ctx.stroke(); }
  ctx.restore();
  const sc = 1 + 0.5 * (1 - Ease.outBack(seg(lt, 0.1, 0.3)));
  if (lt > 0.1) mangaSFX(ctx, '！？', W / 2 - 110, 300, 200, { scale: sc, fill: ['#FFFFFF', '#FFE08A'] });
  const a = env(lt, 0.4, S.d, 0.1, 0.1);
  if (a > 0) {
    ctx.save(); ctx.globalAlpha = a; ctx.textAlign = 'center'; ctx.font = font(54, FONT.sans, '900'); ctx.lineJoin = 'round';
    ctx.strokeStyle = 'rgba(6,4,14,0.9)'; ctx.lineWidth = 9; ctx.strokeText('什么——？！', W / 2, H - 200);
    ctx.fillStyle = '#fff'; ctx.fillText('什么——？！', W / 2, H - 200);
    ctx.font = font(28, FONT.raj, '700'); ctx.fillStyle = '#DADDF5'; ctx.fillText('WHAT——?!', W / 2, H - 152);
    ctx.restore();
  }
}, { shake: 5 });

shot(92.8, 96.0, 'reveal', (ctx, S) => {
  const { t, lt } = S;
  const b1 = 93.15, b2 = 94.75;
  const fl = Math.max(flicker(t, b1, 0.55), flicker(t, b2, 0.55));
  const rise = Ease.inOutSine(S.p) * 60;
  ctx.save(); ctx.translate(0, rise);
  drawSky(ctx, t, { top: '#030108', mid: '#100822', low: '#2A1236', starA: 0.3 });
  drawMoon(ctx, 980, 470, 250, { a: 0.85, halo: '#FFB070' });
  cloudBank(ctx, t, { y: 760, n: 6, seed: 101, scale: 1.4, col: fl > 0.3 ? '#4A2A6A' : '#1C1036', rim: '#B26BFF' });
  if (fl > 0) lightning(ctx, 1560, -200, 1060, 600, 900 + Math.floor(t), { a: fl, w: 5, color: '#FFD0A0' });
  // spire rising from below, O standing on its tip against the moon
  ctx.fillStyle = '#05040C';
  ctx.fill(poly([930, 1250, 952, 742, 968, 742, 990, 1250]));
  ctx.fillRect(940, 728, 40, 16);
  glow(ctx, 960, 800, 26, '#FF3355', 0.8);
  const hood = lt < 2.25 ? 1 : 0;
  const sil = fl > 0.4 ? 0.15 : 0.82;
  drawRimmed(ctx, '#FF8A2A', -3, -2, g => drawStanding(g, 'O', 960, 730, 0.66, { t, hood, sil, wind: 1, rim: '#FFB070', flip: true, glowK: 1.2 }));
  ctx.restore();
  rainLayers(ctx, t, { k: 0.7, vx: -400 });
  if (lt > 0.6 && lt < 2.4) mangaSFX(ctx, '？？？', 1240, 380, 90, { jitter: true, t, alpha: env(lt, 0.6, 2.4, 0.1, 0.2), fill: ['#FFFFFF', '#FFB070'] });
  if (lt > 2.25) titleText(ctx, '淘宝闪购', 1250, 560, 90, { font: FONT.sans, align: 'left', alpha: env(lt, 2.25, 3.2, 0.1, 0.1), fill: ['#FFFFFF', '#FFD0A0'], stroke: '#3A1200', sw: 10, glow: '#FF6A10', glowR: 30 });
}, S => ({ flash: Math.max(flicker(S.t, 93.15, 0.55), flicker(S.t, 94.75, 0.55)) * 0.7, flashC: '#FFE6CC', shake: 2 }));

shot(96.0, 97.6, 'eyeO', (ctx, S) => eyeCloseup(ctx, 'O', S.lt, S.d, { angry: 0.1, glow: 0.6, look: [-0.3, 0] }), { scene: 0.2 });

shot(97.6, 99.2, 'bustO', (ctx, S) => {
  const { t, lt } = S;
  portraitBG(ctx, t, '#FF6A10');
  if (Math.floor(t * 8) % 5 === 0) lightning(ctx, 300, 140, 600, 900, Math.floor(t * 8), { color: '#FFB070', w: 2, a: 0.5, branches: 3 });
  drawBust(ctx, 'O', 900, 540, 1.9, { t, yaw: -0.18, expr: 'sly', talk: talkK(lt, 0.15, 1.1), rim: '#FFD0A0', wind: 0.8, glow: 0.3 });
  speakerSub(ctx, lt, S.d, 'O', '你们两个……太慢了。', 'You two… are way too slow.');
  nameCard(ctx, lt - 0.3, S.d, 'O', { x: W - 90, y: 560, bw: 700 });
});

shot(99.2, 100.8, 'akira', (ctx, S) => {
  const { t, lt } = S;
  ctx.fillStyle = '#07060F'; ctx.fillRect(0, 0, W, H);
  // neon reflections on wet asphalt
  for (let i = 0; i < 22; i++) {
    const x = hash2(i, 81) * W, y = hash2(i, 82) * H;
    glowEllipse(ctx, x, y, 140 + 160 * hash2(i, 83), 50, PAL.neon[i % 5], 0.25);
  }
  ctx.fillStyle = 'rgba(230,235,255,0.5)';
  for (let x = -100; x < W; x += 260) ctx.fillRect(x, 330, 150, 10);
  for (let x = -60; x < W; x += 260) ctx.fillRect(x, 790, 150, 10);
  // analytic slide path
  const P = (tt) => {
    if (tt < 0.45) return { x: lerp(-400, 820, tt / 0.45), y: 560, a: 0 };
    const u = Ease.outCubic(clamp((tt - 0.45) / 0.7));
    return { x: 820 + 420 * u, y: 560 + 60 * Math.sin(u * Math.PI * 0.5), a: -Math.PI / 2 * u };
  };
  const tail = (q) => [q.x + Math.cos(q.a) * -296 * 1.1, q.y + Math.sin(q.a) * -296 * 1.1];
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  for (const [wdt, al, col] of [[60, 0.12, '#FF3A1A'], [24, 0.4, '#FF5A1A'], [8, 0.9, '#FFD0A0']]) {
    ctx.beginPath();
    for (let k = 0; k <= 50; k++) {
      const tt = Math.max(0, lt - 1.2 + k / 50 * 1.2);
      const p = tail(P(tt));
      if (k === 0) ctx.moveTo(p[0], p[1]); else ctx.lineTo(p[0], p[1]);
    }
    ctx.strokeStyle = rgba(col, al); ctx.lineWidth = wdt; ctx.stroke();
  }
  ctx.restore();
  emitFill(ctx, circlePath(...tail(P(lt)), 40), '#FF5A1A', 1);
  const q = P(lt);
  drawTopDown(ctx, 'O', q.x, q.y, 1.1, q.a, { t });
  if (lt > 0.45 && lt < 1.15) sparkStream(ctx, ...tail(q), t, { rate: 200, dir: q.a + Math.PI, spread: 1.2, g: 0, vmin: 400, vmax: 1400, life: 0.35 });
  if (lt > 0.5) mangaSFX(ctx, '唰——！', 360, 260, 130, { rot: -0.08, font: FONT.brush, alpha: env(lt, 0.5, 1.6, 0.05, 0.3), fill: ['#FFFFFF', '#FFD0A0'], stroke2: '#FF5A0A' });
  rain(ctx, t, { n: 160, a: 0.2, vx: -100, vy: 600 });
}, { shake: 3, scene: 0.2 });

// ============================================================ ACT 7 ========
shot(100.8, 104.0, 'question', (ctx, S) => {
  blackBG(ctx); dust(ctx, S.t, 0.5);
  titleCard(ctx, S.lt - 0.3, S.d - 0.3, '谁，才是真正的外卖之王？', 'WHO IS THE TRUE KING OF DELIVERY?', { size: 96, spacing: 6 });
}, S => ({ lb: 0, scene: 0.35, flash: 1 - Ease.outCubic(seg(S.lt, 0, 0.6)), flashC: '#D8D8E0' }));

shot(104.0, 110.4, 'title', (ctx, S) => {
  const { t, lt } = S;
  blackBG(ctx); dust(ctx, t, 0.7);
  // light rays
  ctx.save(); ctx.translate(W / 2, 470); ctx.rotate(lt * 0.05); ctx.globalCompositeOperation = 'lighter';
  for (let k = 0; k < 24; k++) {
    ctx.rotate(TAU / 24);
    ctx.fillStyle = `rgba(255,220,160,${0.035 + 0.03 * hash1(k)})`;
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(1400, -60); ctx.lineTo(1400, 60); ctx.closePath(); ctx.fill();
  }
  ctx.restore();
  // three streaks
  const st = Ease.outExpo(seg(lt, 0, 0.6));
  for (const [col, y, dir] of [['#FFD100', 300, 1], ['#0B8CFF', 640, -1], ['#FF5A0A', 470, 1]]) {
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createLinearGradient(0, 0, W, 0);
    g.addColorStop(dir > 0 ? 0 : 1, rgba(col, 0)); g.addColorStop(0.5, rgba(col, 0.55 * st)); g.addColorStop(dir > 0 ? 1 : 0, rgba(col, 0));
    ctx.fillStyle = g; ctx.fillRect(0, y - 3, W, 6);
    ctx.restore();
  }
  const slam = seg(lt, 0, 0.35);
  const sc = 1 + 0.8 * (1 - Ease.outBack(slam, 1.4));
  // top line
  const a1 = env(lt, 0.5, 10, 0.4, 0.1);
  ctx.save(); ctx.globalAlpha = a1; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = font(36, FONT.sans, '900');
  const parts = [['美团', '#FFD100'], [' × ', '#9A9DB8'], ['饿了么', '#2AA8FF'], [' × ', '#9A9DB8'], ['淘宝闪购', '#FF6A10']];
  const totalW = parts.reduce((s2, p) => s2 + ctx.measureText(p[0]).width, 0);
  let x = W / 2 - totalW / 2;
  ctx.textAlign = 'left';
  for (const [txt, col] of parts) { ctx.fillStyle = col; ctx.fillText(txt, x, 268); x += ctx.measureText(txt).width; }
  ctx.restore();
  ctx.save(); ctx.translate(W / 2, 470); ctx.scale(sc, sc);
  titleText(ctx, '外卖之王', 6, 4, 250, { font: FONT.brush, weight: '', fill: ['#FFFFFF', '#FFE7A0', '#FFB300'], stroke: '#2A1600', sw: 18, glow: 'rgba(255,200,120,0.7)', glowR: 50, spacing: 16 });
  ctx.restore();
  // english title box
  const a2 = env(lt, 0.7, 10, 0.3, 0.1);
  ctx.save(); ctx.globalAlpha = a2;
  ctx.fillStyle = '#E8343C'; ctx.fillRect(W / 2 - 330, 640, 660, 84);
  ctx.font = font(64, FONT.anton); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#FFFFFF';
  spacedText(ctx, 'KING OF DELIVERY', W / 2, 684, 10);
  ctx.restore();
  const a3 = env(lt, 1.4, 10, 0.4, 0.1);
  ctx.save(); ctx.globalAlpha = a3; ctx.textAlign = 'center';
  ctx.font = font(34, FONT.sans, '900'); ctx.fillStyle = '#E6E8FF'; spacedText(ctx, '三方混战 · 即将开打', W / 2, 800, 10);
  ctx.font = font(24, FONT.raj, '700'); ctx.fillStyle = '#A8ACCF'; spacedText(ctx, 'COMING SOON TO A STREET NEAR YOU', W / 2, 846, 10);
  ctx.font = font(16, FONT.sans, '700'); ctx.fillStyle = '#6E7196';
  spacedText(ctx, '同人二创 · 非官方作品 · 与美团、饿了么、淘宝闪购无任何关联   |   FAN-MADE PARODY · NOT AFFILIATED WITH OR ENDORSED BY ANY COMPANY', W / 2, 1010, 2);
  ctx.restore();
}, S => ({ lb: 0, scene: 0.4, flash: (1 - seg(S.lt, 0.15, 0.6)) * (S.lt > 0.15 ? 0.85 : 0), shake: 12 * (1 - seg(S.lt, 0.2, 0.7)) }));

shot(110.4, 116.8, 'chibi', (ctx, S) => {
  const { t, lt } = S;
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#FFE2B8'); g.addColorStop(0.6, '#FFC8A0'); g.addColorStop(1, '#F6A98A');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  glow(ctx, W / 2, 520, 600, '#FFF4C8', 0.6);
  // pastel skyline
  ctx.fillStyle = '#B8A0C8';
  for (let i = 0; i < 30; i++) {
    const bw = 50 + 70 * hash1(i + 800), bh = 120 + 260 * hash1(i + 810), x = i * 66 - 20;
    ctx.fillRect(x, 820 - bh, bw, bh);
    ctx.fillStyle = '#F3E6F6'; for (let k = 0; k < 6; k++) ctx.fillRect(x + 10 + (k % 2) * 20, 830 - bh + 20 + Math.floor(k / 2) * 30, 6, 8); ctx.fillStyle = '#B8A0C8';
  }
  ctx.fillStyle = '#E8A27A'; ctx.fillRect(0, 820, W, 300);
  const stage = lt < 2.0 ? 0 : lt < 3.2 ? 1 : 2;
  drawChibi(ctx, 'Y', 600, 640, 1.0, { t, expr: stage === 0 ? 'happy' : 'happy', ph: 0, bounce: stage > 0 ? 8 : 3 });
  drawChibi(ctx, 'O', 960, 640, 1.0, { t, expr: stage === 0 ? 'smug' : stage === 1 ? 'shock' : 'cry', ph: 1, bounce: stage === 2 ? 0 : 3 });
  drawChibi(ctx, 'B', 1320, 640, 1.0, { t, expr: 'happy', ph: 2, bounce: stage > 0 ? 8 : 3 });
  // customer bubble
  const ba = env(lt, 0.3, 6.4, 0.25, 0.3);
  ctx.save(); ctx.globalAlpha = ba;
  flat(ctx, rrectPath(W / 2 - 520, 170, 1040, 130, 30), '#FFFFFF', '#3A3046', 5);
  ctx.fillStyle = '#FFFFFF'; ctx.fill(poly([W / 2 - 20, 296, W / 2 + 20, 296, W / 2, 330]));
  ctx.font = font(24, FONT.sans, '700'); ctx.fillStyle = '#9A90A8'; ctx.textAlign = 'left'; ctx.fillText('顾客 · CUSTOMER', W / 2 - 480, 210);
  ctx.font = font(46, FONT.sans, '900'); ctx.fillStyle = '#2A2236';
  ctx.fillText(typed('奶茶……洒了一半。', lt - 0.5, 8), W / 2 - 480, 262);
  ctx.restore();
  if (stage >= 1) mangaSFX(ctx, '哈哈哈', 300, 430, 70, { rot: -0.2, jitter: true, t, fill: ['#FFFFFF', '#FFF0B0'], stroke: '#5A3A20' });
  if (stage >= 1) mangaSFX(ctx, '哈哈哈', 1450, 430, 70, { rot: 0.2, jitter: true, t, fill: ['#FFFFFF', '#D8F0FF'], stroke: '#20405A' });
  if (stage === 2) {
    const sp = seg(lt, 3.2, 3.45);
    const sc = 1 + 1.5 * (1 - Ease.outBack(sp, 2));
    ctx.save(); ctx.translate(960, 520); ctx.rotate(-0.25); ctx.scale(sc, sc); ctx.globalAlpha = clamp(sp * 3);
    ctx.strokeStyle = '#E8343C'; ctx.lineWidth = 12; ctx.strokeRect(-190, -90, 380, 180);
    ctx.lineWidth = 4; ctx.strokeRect(-176, -76, 352, 152);
    ctx.font = font(110, FONT.sans, '900'); ctx.fillStyle = '#E8343C'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('差评', 0, -10);
    ctx.font = font(40, FONT.sans, '900'); ctx.fillText('★☆☆☆☆', 0, 58);
    ctx.restore();
    if (lt > 3.3 && lt < 4.4) mangaSFX(ctx, '啪！', 1180, 470, 110, { rot: 0.2, font: FONT.brush, fill: ['#FFFFFF', '#FFD0D0'], stroke: '#5A1010' });
  }
}, S => ({ lb: 0, vig: 0.35, scene: 0.05, grain: 0.04, bloom: 0.4, shake: S.lt > 3.2 && S.lt < 3.5 ? 10 : 0, flash: Math.max(0, 1 - S.lt / 0.25) * 0.9 }));

shot(116.8, DURATION, 'end', (ctx, S) => {
  blackBG(ctx);
  const a = env(S.lt, 0, S.d, 0.4, 0.8);
  ctx.save(); ctx.globalAlpha = a; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  titleText(ctx, '外卖之王', W / 2, 470, 120, { font: FONT.brush, weight: '', fill: ['#FFFFFF', '#FFE7A0'], glow: 'rgba(255,200,120,0.5)', alpha: a, spacing: 12 });
  ctx.globalAlpha = a;
  ctx.font = font(30, FONT.raj, '700'); ctx.fillStyle = '#E8343C'; spacedText(ctx, 'KING OF DELIVERY  ·  敬请期待  ·  COMING SOON', W / 2, 600, 10);
  ctx.restore();
}, { lb: 0, scene: 0.3 });
