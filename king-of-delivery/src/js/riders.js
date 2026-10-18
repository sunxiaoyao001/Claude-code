'use strict';
// ============================================================================
//  Riders on scooters — side view (facing +x, ground contact at local y=0).
//  Each rider and machine is a distinct design:
//   Y 美团  "KANGAROO HEAVY"  chunky utility e-moped, cube box, bull bar, broad bruiser
//   B 饿了么 "HUMMINGBIRD"     long low racer, beak nose, wing fins, slim rider in long coat
//   O 闪购  "FLASH"           hubless ring wheels, lightning frame, hooded trickster in a tuck
// ============================================================================

const TH = {
  Y: { key: 'Y', cn: '美团', en: 'MEITUAN', main: '#FFD100', light: '#FFF3A0', dark: '#C98C00', deep: '#5C3D00', glow: '#FFD84A', neon: '#FFEA80', suit: '#1D1C27', suit2: '#2E2C3A', rim: '#FF4FD8' },
  B: { key: 'B', cn: '饿了么', en: 'ELE.ME', main: '#0B8CFF', light: '#A6DEFF', dark: '#0456B4', deep: '#021F4A', glow: '#3CC4FF', neon: '#8AE3FF', suit: '#121726', suit2: '#1E2740', white: '#EEF4FF', rim: '#3CF2FF' },
  O: { key: 'O', cn: '淘宝闪购', en: 'TAOBAO SHANGOU', main: '#FF5A0A', light: '#FFB27A', dark: '#B33A00', deep: '#3D1200', glow: '#FF7A1A', neon: '#FFB070', suit: '#161214', suit2: '#262024', rim: '#FFC94A' },
};

function emblemPath(key) {
  if (key === 'Y') { // kangaroo
    return smoothPath([13, -14, 15, -19, 13, -12, 17, -11, 18, -8, 12, -6, 9, -1, 10, 6, 15, 12, 18, 13, 16, 15, 4, 15, -1, 12,
      -10, 16, -19, 19, -21, 18, -12, 11, -8, 2, -3, -6, 5, -11, 9, -18], true, 0.4);
  }
  if (key === 'B') { // hummingbird
    return smoothPath([22, -6, 9, -3, 6, -1, 2, -16, -2, -21, -2, -6, -8, -13, -10, -4, -6, 3, -14, 9, -19, 17, -8, 11, -1, 6, 6, 2, 9, -1], true, 0.3);
  }
  return poly([6, -24, -10, 2, 0, 2, -6, 24, 12, -4, 2, -4]); // lightning
}
const BOLT = [6, -24, -10, 2, 0, 2, -6, 24, 12, -4, 2, -4];

// ------------------------------------------------------------------ wheels ---
function wheelBlur(ctx, R, rot, a = 0.18) {
  ctx.strokeStyle = `rgba(255,255,255,${a})`; ctx.lineWidth = 2;
  for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.arc(0, 0, R * (0.35 + k * 0.14), rot + k * 2, rot + k * 2 + 1.4); ctx.stroke(); }
}
function wheelHeavy(ctx, cx, cy, R, rot, th, o = {}) {
  const C = o.C ?? (h => h), spin = o.spin ?? 1;
  ctx.save(); ctx.translate(cx, cy);
  ctx.fillStyle = C('#0E0E14'); ctx.beginPath(); ctx.arc(0, 0, R, 0, TAU); ctx.fill();
  if (spin < 0.5) { // tread blocks
    ctx.fillStyle = C('#22222c');
    for (let k = 0; k < 18; k++) { ctx.save(); ctx.rotate(rot + k * TAU / 18); ctx.fillRect(R - 6, -4, 6, 8); ctx.restore(); }
  }
  ctx.lineWidth = 2.6; ctx.strokeStyle = INK; ctx.beginPath(); ctx.arc(0, 0, R, 0, TAU); ctx.stroke();
  ctx.fillStyle = C('#2a2a35'); ctx.beginPath(); ctx.arc(0, 0, R * 0.66, 0, TAU); ctx.fill();
  if (spin > 0.5) {
    const g = ctx.createRadialGradient(0, 0, R * 0.15, 0, 0, R * 0.66);
    g.addColorStop(0, C('#b8bccb')); g.addColorStop(1, C('#3a3b48'));
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, R * 0.64, 0, TAU); ctx.fill();
    wheelBlur(ctx, R, rot);
  } else {
    ctx.fillStyle = C('#9aa0b4');
    for (let k = 0; k < 6; k++) { ctx.save(); ctx.rotate(rot + k * TAU / 6); ctx.fillRect(R * 0.16, -5, R * 0.5, 10); ctx.restore(); }
  }
  ctx.fillStyle = C(th.main); ctx.beginPath(); ctx.arc(0, 0, R * 0.26, 0, TAU); ctx.fill();
  ctx.lineWidth = 2; ctx.strokeStyle = INK; ctx.stroke();
  ctx.fillStyle = C('#1d1c27'); ctx.beginPath(); ctx.arc(0, 0, R * 0.1, 0, TAU); ctx.fill();
  ctx.restore();
  neon(ctx, circlePath(cx, cy, R * 0.68), th.glow, 2.2, o.glow ?? 1);
}
function wheelTurbine(ctx, cx, cy, R, rot, th, o = {}) {
  const C = o.C ?? (h => h), spin = o.spin ?? 1;
  ctx.save(); ctx.translate(cx, cy);
  ctx.fillStyle = C('#0E0F16'); ctx.beginPath(); ctx.arc(0, 0, R, 0, TAU); ctx.fill();
  ctx.lineWidth = 2.2; ctx.strokeStyle = INK; ctx.stroke();
  ctx.fillStyle = C('#dfe8f8'); ctx.beginPath(); ctx.arc(0, 0, R * 0.8, 0, TAU); ctx.fill();
  ctx.fillStyle = C('#172036'); ctx.beginPath(); ctx.arc(0, 0, R * 0.74, 0, TAU); ctx.fill();
  if (spin > 0.5) {
    const g = ctx.createRadialGradient(0, 0, R * 0.1, 0, 0, R * 0.74);
    g.addColorStop(0, C('#8fc8ff')); g.addColorStop(1, C('#16203a'));
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, R * 0.72, 0, TAU); ctx.fill();
    wheelBlur(ctx, R, rot, 0.25);
  } else {
    ctx.strokeStyle = C('#bfd6f5'); ctx.lineWidth = 2.2;
    for (let k = 0; k < 14; k++) {
      const a = rot + k * TAU / 14;
      ctx.beginPath(); ctx.moveTo(Math.cos(a) * R * 0.16, Math.sin(a) * R * 0.16);
      ctx.quadraticCurveTo(Math.cos(a + 0.5) * R * 0.5, Math.sin(a + 0.5) * R * 0.5, Math.cos(a + 0.9) * R * 0.72, Math.sin(a + 0.9) * R * 0.72);
      ctx.stroke();
    }
  }
  ctx.fillStyle = C('#ffffff'); ctx.beginPath(); ctx.arc(0, 0, R * 0.16, 0, TAU); ctx.fill();
  ctx.lineWidth = 2; ctx.strokeStyle = INK; ctx.stroke();
  ctx.restore();
  neon(ctx, circlePath(cx, cy, R * 0.8), th.glow, 1.8, o.glow ?? 1);
}
function wheelHubless(ctx, cx, cy, R, rot, th, o = {}) {
  const C = o.C ?? (h => h);
  ctx.save(); ctx.translate(cx, cy);
  const ring = new Path2D(); ring.arc(0, 0, R, 0, TAU); ring.arc(0, 0, R * 0.62, 0, TAU, true);
  ctx.fillStyle = C('#0D0B0C'); ctx.fill(ring, 'evenodd');
  ctx.lineWidth = 2.4; ctx.strokeStyle = INK; ctx.stroke(ring);
  ctx.restore();
  neon(ctx, circlePath(cx, cy, R * 0.66), th.glow, 3.2, o.glow ?? 1);
  neon(ctx, circlePath(cx, cy, R * 0.86), th.glow, 1.2, 0.6 * (o.glow ?? 1));
  // energy arcs crossing the empty hub
  ctx.save(); ctx.translate(cx, cy); ctx.rotate(rot);
  ctx.globalCompositeOperation = 'lighter';
  ctx.strokeStyle = rgba(th.glow, 0.55); ctx.lineWidth = 1.6;
  for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.arc(0, 0, R * (0.3 + 0.08 * k), k * 2.1, k * 2.1 + 1.1); ctx.stroke(); }
  ctx.restore();
}

// --------------------------------------------------------------- scooters ---
// each returns anchors {seat, grip, foot, box, neckOff} in local coords
const SCOOTER = {
  Y: { wb: [-150, 152], R: 48, seat: [-78, -164], grip: [92, -228], foot: [10, -82], crouch: 0.15 },
  B: { wb: [-168, 168], R: 42, seat: [-92, -146], grip: [84, -196], foot: [-12, -70], crouch: 0.62 },
  O: { wb: [-154, 150], R: 46, seat: [-84, -150], grip: [70, -190], foot: [-46, -96], crouch: 0.85 },
};

function drawScooterY(ctx, th, C, o, t) {
  const sp = o.spin ?? 1, wr = o.wheel ?? 0, gk = o.glow ?? 1;
  // delivery box (big cube)
  const bx = -284, by = -312, bw = 134, bh = 140;
  ctx.strokeStyle = INK; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(-262, -170); ctx.lineTo(-138, -172); ctx.stroke();
  const box = rrectPath(bx, by, bw, bh, 8);
  cel(ctx, box, C('#FFD100'), C('#C98C00'), { d: 10, rim: o.sil ? null : rgba(th.rim, 0.85), rx: -1, ry: 0, rw: 4 });
  ctx.save(); ctx.clip(box);
  ctx.fillStyle = C('#3a2f10'); ctx.fillRect(bx, by, bw, 20);
  ctx.fillStyle = C('#D9DDE6'); ctx.fillRect(bx, by + bh - 30, bw, 10);
  ctx.restore();
  ctx.lineWidth = 2.6; ctx.strokeStyle = INK; ctx.stroke(box);
  if (!o.sil || o.sil < 0.6) {
    ctx.save(); ctx.translate(bx + bw / 2, by + 72); if (o.flip) ctx.scale(-1, 1);
    ctx.fillStyle = C('#17130A'); ctx.save(); ctx.translate(0, -26); ctx.scale(1.1, 1.1); ctx.fill(emblemPath('Y')); ctx.restore();
    ctx.font = font(44, FONT.sans, '900'); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('美团', 0, 16);
    ctx.restore();
  }
  // wheels
  wheelHeavy(ctx, -150, -48, 48, wr, th, { C, spin: sp, glow: gk });
  wheelHeavy(ctx, 152, -48, 48, wr, th, { C, spin: sp, glow: gk });
  // kangaroo-tail rear fender
  const tail = smoothPath([-120, -104, -190, -112, -232, -84, -246, -30, -236, -26, -214, -76, -170, -94, -120, -92], true, 0.35);
  cel(ctx, tail, C('#1D1C27'), C('#0B0A10'), { d: 4 });
  // rear body slab
  const rear = poly([-250, -112, -230, -150, -40, -158, -22, -126, -40, -96, -110, -86, -236, -92]);
  cel(ctx, rear, C('#FFD100'), C('#C98C00'), { d: 8, rim: o.sil ? null : rgba(th.rim, 0.9), rx: 0, ry: 1, rw: 3 });
  ctx.save(); ctx.clip(rear); ctx.fillStyle = C('#1D1C27'); ctx.fillRect(-250, -112, 230, 12); ctx.restore();
  ctx.lineWidth = 2.6; ctx.strokeStyle = INK; ctx.stroke(rear);
  neon(ctx, poly([-228, -104, -50, -110], false), th.glow, 1.8, gk);
  // seat
  flat(ctx, poly([-170, -156, -156, -174, -40, -170, -26, -158, -40, -152, -160, -152]), C('#17161f'));
  // floorboard with hazard stripes
  const floor = poly([-44, -94, 84, -94, 92, -70, -50, -66]);
  flat(ctx, floor, C('#1D1C27'));
  ctx.save(); ctx.clip(floor); ctx.fillStyle = C('#FFD100');
  for (let k = -60; k < 100; k += 24) ctx.fill(poly([k, -70, k + 12, -70, k + 24, -94, k + 12, -94]));
  ctx.restore(); ctx.lineWidth = 2.4; ctx.strokeStyle = INK; ctx.stroke(floor);
  // fork
  ctx.strokeStyle = INK; ctx.lineWidth = 16; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(126, -150); ctx.lineTo(152, -48); ctx.stroke();
  ctx.strokeStyle = C('#8f95aa'); ctx.lineWidth = 10; ctx.beginPath(); ctx.moveTo(126, -150); ctx.lineTo(152, -48); ctx.stroke();
  // front fender (with hazard stripe)
  const ff = new Path2D(); ff.arc(152, -48, 60, Math.PI * 1.05, Math.PI * 1.9); ff.arc(152, -48, 52, Math.PI * 1.88, Math.PI * 1.07, true); ff.closePath();
  cel(ctx, ff, C('#FFD100'), C('#C98C00'), { d: 3 });
  // boxy front shield
  const shield = poly([70, -94, 96, -150, 104, -214, 150, -214, 160, -150, 150, -112, 120, -88]);
  cel(ctx, shield, C('#FFD100'), C('#C98C00'), { d: 9, lx: 0.5, ly: -0.8, rim: o.sil ? null : rgba(th.rim, 0.85), rx: -1, ry: 0.3, rw: 3 });
  ctx.save(); ctx.clip(shield); ctx.fillStyle = C('#1D1C27'); ctx.fillRect(70, -126, 100, 10); ctx.restore();
  ctx.lineWidth = 2.6; ctx.strokeStyle = INK; ctx.stroke(shield);
  // bull bar
  ctx.strokeStyle = INK; ctx.lineWidth = 9; ctx.beginPath(); ctx.moveTo(150, -206); ctx.quadraticCurveTo(186, -170, 176, -104); ctx.lineTo(156, -92); ctx.stroke();
  ctx.strokeStyle = C('#4a4a58'); ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(150, -206); ctx.quadraticCurveTo(186, -170, 176, -104); ctx.lineTo(156, -92); ctx.stroke();
  // handlebar + handguard
  ctx.strokeStyle = INK; ctx.lineWidth = 10; ctx.beginPath(); ctx.moveTo(118, -212); ctx.lineTo(96, -232); ctx.stroke();
  flat(ctx, smoothPath([86, -244, 112, -248, 116, -226, 92, -224], true, 0.3), C('#1D1C27'));
  // big round headlight + fog light
  flat(ctx, circlePath(152, -170, 21), C('#2a2a35'), INK, 2.6);
  flat(ctx, circlePath(153, -170, 15), '#fffbe6', INK, 2);
  glow(ctx, 158, -170, 90, '#fff2c4', 0.9 * gk);
  flat(ctx, circlePath(156, -128, 8), '#ffe9a0', INK, 1.6);
  glow(ctx, 158, -128, 34, '#ffd36a', 0.7 * gk);
  if (o.beam) headBeam(ctx, 168, -170, 0.38 * gk);
  // taillight
  flat(ctx, rrectPath(-258, -134, 8, 22, 3), '#ff2a3a', INK, 1.5);
  glow(ctx, -256, -123, 46, '#ff2038', 0.9 * gk);
}

function drawScooterB(ctx, th, C, o, t) {
  const sp = o.spin ?? 1, wr = o.wheel ?? 0, gk = o.glow ?? 1;
  // streamlined capsule box
  const box = rrectPath(-292, -268, 132, 104, 40);
  cel(ctx, box, C('#EEF4FF'), C('#9DB2D6'), { d: 9, rim: o.sil ? null : rgba(th.rim, 0.9), rx: -1, ry: 0, rw: 4 });
  ctx.save(); ctx.clip(box);
  ctx.fillStyle = C('#0B8CFF'); ctx.fill(poly([-300, -200, -150, -226, -150, -196, -300, -170]));
  ctx.restore(); ctx.lineWidth = 2.6; ctx.strokeStyle = INK; ctx.stroke(box);
  if (!o.sil || o.sil < 0.6) {
    ctx.save(); ctx.translate(-226, -232); if (o.flip) ctx.scale(-1, 1);
    ctx.font = font(30, FONT.sans, '900'); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = C('#0B5FD1');
    ctx.fillText('饿了么', 0, 0);
    ctx.restore();
  }
  wheelTurbine(ctx, -168, -42, 42, wr, th, { C, spin: sp, glow: gk });
  wheelTurbine(ctx, 168, -42, 42, wr, th, { C, spin: sp, glow: gk });
  // swingarm
  ctx.strokeStyle = INK; ctx.lineWidth = 12; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(-168, -42); ctx.lineTo(-70, -78); ctx.stroke();
  ctx.strokeStyle = C('#c7d3ea'); ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(-168, -42); ctx.lineTo(-70, -78); ctx.stroke();
  // long low teardrop body
  const body = smoothPath([-262, -126, -200, -150, -110, -158, -40, -134, -30, -96, 40, -78, 110, -96, 150, -128, 232, -132, 196, -112, 168, -84, 120, -62, -60, -58, -150, -80, -240, -100], true, 0.38);
  cel(ctx, body, C('#EEF4FF'), C('#9DB2D6'), { d: 9, rim: o.sil ? null : rgba(th.rim, 0.95), rx: 0, ry: 1, rw: 3 });
  ctx.save(); ctx.clip(body);
  ctx.fillStyle = C('#0B8CFF');
  ctx.fill(smoothPath([-270, -118, -120, -132, 40, -88, 150, -116, 240, -128, 240, -100, 150, -92, 40, -66, -120, -96, -270, -100], true, 0.3));
  ctx.restore();
  ctx.lineWidth = 2.6; ctx.strokeStyle = INK; ctx.stroke(body);
  // wing fins (hummingbird)
  const flap = Math.sin(t * 14) * 3;
  for (const [ox, a] of [[0, 1], [26, 0.75]]) {
    const wing = smoothPath([60 + ox, -102, -40 + ox, -150 - flap * a, -130 + ox, -146 - flap * a, -40 + ox, -122, 40 + ox, -96], true, 0.35);
    ctx.save(); ctx.globalAlpha = 0.9;
    cel(ctx, wing, C('#2AA8FF'), C('#0A58BE'), { d: 4, line: INK, lw: 2 });
    ctx.restore();
    neon(ctx, poly([56 + ox, -104, -34 + ox, -142 - flap * a, -118 + ox, -144 - flap * a], false), th.glow, 1.4, 0.8 * gk);
  }
  // seat
  flat(ctx, smoothPath([-176, -152, -150, -166, -60, -158, -46, -146, -64, -142, -170, -146], true, 0.3), C('#121726'));
  // front fork (hidden mono-shock)
  ctx.strokeStyle = INK; ctx.lineWidth = 12; ctx.beginPath(); ctx.moveTo(130, -118); ctx.lineTo(168, -42); ctx.stroke();
  ctx.strokeStyle = C('#c7d3ea'); ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(130, -118); ctx.lineTo(168, -42); ctx.stroke();
  // clip-on bar
  ctx.strokeStyle = INK; ctx.lineWidth = 8; ctx.beginPath(); ctx.moveTo(108, -150); ctx.lineTo(86, -194); ctx.stroke();
  // beak LED strip
  const beak = poly([150, -128, 232, -132, 150, -120]);
  ctx.fillStyle = '#E9FBFF'; ctx.fill(beak);
  neon(ctx, poly([156, -126, 228, -131], false), '#9BEBFF', 2.2, gk);
  glow(ctx, 228, -131, 50, '#bff4ff', 0.8 * gk);
  if (o.beam) headBeam(ctx, 232, -131, 0.34 * gk);
  flat(ctx, rrectPath(-266, -128, 7, 16, 3), '#ff2a3a', INK, 1.5);
  glow(ctx, -264, -120, 40, '#ff2038', 0.8 * gk);
}

function drawScooterO(ctx, th, C, o, t) {
  const wr = o.wheel ?? 0, gk = o.glow ?? 1;
  // hex case
  const hx = -236, hy = -246;
  const hexP = poly([hx - 50, hy, hx - 30, hy - 40, hx + 40, hy - 40, hx + 58, hy, hx + 40, hy + 40, hx - 30, hy + 40]);
  cel(ctx, hexP, C('#1E191C'), C('#0C0A0B'), { d: 6, rim: o.sil ? null : rgba(th.rim, 0.8), rx: -1, ry: 0, rw: 3 });
  neon(ctx, hexP, th.glow, 1.4, 0.8 * gk);
  if (!o.sil || o.sil < 0.6) {
    ctx.save(); ctx.translate(hx + 4, hy); if (o.flip) ctx.scale(-1, 1);
    ctx.fillStyle = C('#FF5A0A'); ctx.save(); ctx.translate(-30, 0); ctx.scale(0.9, 0.9); ctx.fill(poly(BOLT)); ctx.restore();
    ctx.font = font(30, FONT.sans, '900'); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('闪购', 14, 2);
    ctx.restore();
  }
  wheelHubless(ctx, -154, -46, 46, wr, th, { C, glow: gk });
  wheelHubless(ctx, 150, -46, 46, wr, th, { C, glow: gk });
  // lightning-bolt frame
  const frame = poly([-150, -46, -96, -118, -40, -92, 26, -136, 70, -96, 150, -46, 120, -46, 66, -78, 22, -112, -40, -70, -92, -96, -132, -40]);
  cel(ctx, frame, C('#FF5A0A'), C('#B33A00'), { d: 4 });
  neon(ctx, poly([-96, -112, -40, -86, 26, -130, 70, -92], false), th.glow, 1.6, gk);
  // angular body: tail, tank, cowl
  const body = poly([-226, -132, -170, -150, -40, -142, 20, -170, 100, -184, 176, -150, 150, -128, 92, -122, 40, -112, -40, -112, -130, -112, -210, -116]);
  cel(ctx, body, C('#1E191C'), C('#0B090A'), { d: 8, rim: o.sil ? null : rgba(th.rim, 0.9), rx: 0, ry: -1, rw: 3 });
  ctx.save(); ctx.clip(body);
  ctx.fillStyle = C('#FF5A0A'); ctx.fill(poly([-60, -150, 20, -168, 100, -182, 176, -148, 130, -146, 30, -150]));
  ctx.restore(); ctx.lineWidth = 2.6; ctx.strokeStyle = INK; ctx.stroke(body);
  // seat
  flat(ctx, poly([-180, -150, -170, -162, -50, -156, -36, -146, -170, -146]), C('#0E0B0D'));
  // slit headlight
  ctx.fillStyle = '#FFF4E0'; ctx.fill(poly([150, -160, 178, -150, 150, -146]));
  glow(ctx, 170, -152, 60, '#ffd2a0', 0.9 * gk);
  if (o.beam) headBeam(ctx, 178, -150, 0.36 * gk);
  // front fork (single-sided)
  ctx.strokeStyle = INK; ctx.lineWidth = 10; ctx.beginPath(); ctx.moveTo(120, -150); ctx.lineTo(150, -60); ctx.stroke();
  ctx.strokeStyle = C('#3a3236'); ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(120, -150); ctx.lineTo(150, -60); ctx.stroke();
  // clip-on
  ctx.strokeStyle = INK; ctx.lineWidth = 8; ctx.beginPath(); ctx.moveTo(94, -170); ctx.lineTo(72, -190); ctx.stroke();
  // tail light bar (orange-red, for light trails)
  flat(ctx, poly([-232, -136, -224, -136, -220, -120, -228, -120]), '#ff3a1a', INK, 1.4);
  glow(ctx, -228, -128, 50, '#ff4a1a', gk);
}
function headBeam(ctx, x, y, a) {
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  const g = ctx.createLinearGradient(x, 0, x + 900, 0);
  g.addColorStop(0, `rgba(255,248,225,${a})`); g.addColorStop(1, 'rgba(255,248,225,0)');
  ctx.fillStyle = g; ctx.fill(poly([x, y - 8, x, y + 8, x + 900, y + 170, x + 900, y - 190]));
  ctx.restore();
}

// ------------------------------------------------------------ rider body ---
function drawRider(ctx, who, x, y, s, o = {}) {
  const th = TH[who], t = o.t ?? 0, sc = SCOOTER[who];
  const C = o.sil ? (h => mixHex(h, '#06050b', o.sil)) : (h => h);
  const gk = o.glow ?? 1;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(o.flip ? -s : s, s);
  if (o.lean) { const pv = o.pivot ?? [0, 0]; ctx.translate(pv[0], pv[1]); ctx.rotate(o.lean); ctx.translate(-pv[0], -pv[1]); }
  const speed = o.speed ?? 1;
  const so = { ...o, C, wheel: o.wheel ?? t * 24 * speed, spin: o.spin ?? (speed > 0.3 ? 1 : 0) };
  if (!o.noUnderglow) glowEllipse(ctx, 0, -4, 250, 16, th.glow, 0.55 * gk);

  // ---- skeleton
  const bob = Math.sin(t * 15) * 1.6 * speed * (o.bob ?? 1);
  const stand = o.stand ?? 0, crouch = o.crouch ?? sc.crouch;
  const hip = [sc.seat[0] + 8 - stand * 6, sc.seat[1] + 6 - stand * 44 + bob];
  const th0 = 0.35 + crouch * 0.75 - stand * 0.3;
  const u = [Math.sin(th0), -Math.cos(th0)], n = [Math.cos(th0), Math.sin(th0)];
  const torsoL = who === 'Y' ? 102 : who === 'B' ? 104 : 92;
  const sh = [hip[0] + u[0] * torsoL, hip[1] + u[1] * torsoL];
  const headAng = (o.headPitch ?? 0) + (crouch - 0.4) * -0.35;
  const neck = [sh[0] + Math.sin(th0 * 0.5) * 14, sh[1] - Math.cos(th0 * 0.5) * 14];
  const hc = [neck[0] + 16 + Math.sin(headAng) * 6, neck[1] - 30];
  const grip = sc.grip, foot = [sc.foot[0] - stand * 4, sc.foot[1]];
  const armBack = o.armBack ?? 0, armUp = o.armUp ?? 0;
  let hand = grip;
  if (armBack > 0) hand = [lerp(grip[0], sh[0] - 130, armBack), lerp(grip[1], sh[1] - 50, armBack)];
  if (armUp > 0) hand = [lerp(hand[0], sh[0] + 40, armUp), lerp(hand[1], sh[1] - 120, armUp)];
  const ua = who === 'Y' ? 66 : 64, fa = who === 'Y' ? 64 : 62;
  const elbow = ik(sh[0], sh[1], hand[0], hand[1], ua, fa, armBack > 0.5 || armUp > 0.5 ? -1 : 1);
  const knee = ik(hip[0], hip[1], foot[0], foot[1], 90, 86, -1);
  const P = (base, a, b) => [base[0] + n[0] * a + u[0] * b, base[1] + n[1] * a + u[1] * b];
  const rim = o.sil ? null : rgba(th.rim, 0.9);
  const body = who === 'Y' ? { jacket: '#FFD100', jacketD: '#C98C00', pants: '#24232E', pantsD: '#121119', depth: 32, boot: '#1D1C27' }
    : who === 'B' ? { jacket: '#0D4FB8', jacketD: '#062C6E', pants: '#151B2A', pantsD: '#0A0E18', depth: 24, boot: '#EEF4FF' }
      : { jacket: '#1E191C', jacketD: '#0B090A', pants: '#1A1517', pantsD: '#0A0809', depth: 22, boot: '#2A2226' };

  // ---- coat tails / cloak behind everything (B, O)
  if (who === 'B' && !o.noRider) coatTails(ctx, P(hip, -18, 30), t, speed, C('#0D4FB8'), C('#062C6E'), 300, 70, th.glow);
  if (who === 'O' && !o.noRider) coatTails(ctx, P(sh, -16, -6), t, speed, C('#FF5A0A'), C('#B33A00'), 250, 90, th.glow);

  // ---- far limbs
  ctx.save(); ctx.translate(-8, -4);
  if (o.noRider) ctx.globalAlpha = 0;
  const fk = ik(hip[0], hip[1], foot[0] + 10, foot[1], 90, 86, -1);
  flat(ctx, limbPath(hip[0], hip[1], fk[0], fk[1], 17, 14), C('#0c0b12'));
  flat(ctx, limbPath(fk[0], fk[1], foot[0] + 10, foot[1], 14, 11), C('#0c0b12'));
  const fe = ik(sh[0], sh[1], grip[0] + 8, grip[1] - 4, ua, fa, 1);
  flat(ctx, limbPath(sh[0], sh[1], fe[0], fe[1], 12, 10), C('#0c0b12'));
  flat(ctx, limbPath(fe[0], fe[1], grip[0] + 8, grip[1] - 4, 10, 9), C(shade(body.jacketD, 0.4)));
  ctx.restore();

  // ---- scooter
  if (who === 'Y') drawScooterY(ctx, th, C, so, t);
  else if (who === 'B') drawScooterB(ctx, th, C, so, t);
  else drawScooterO(ctx, th, C, so, t);
  if (o.noRider) { ctx.restore(); return; }

  // ---- scarf (Y) / ponytail (B, O hood down)
  if (who === 'Y') drawScarf(ctx, neck[0] - 8, neck[1] + 8, t, { speed, C, w: 15, len: 270, col: '#FFC800', colD: '#C77F00', glowC: th.glow });

  // ---- torso
  const d = body.depth;
  const torso = smoothPath([P(hip, -d * 0.7, -10), P(hip, -d * 0.85, 46), P(sh, -d * 0.9, -10), P(sh, -d * 0.4, 14), P(sh, d * 0.5, 12), P(sh, d, -14), P(hip, d * 0.95, 40), P(hip, d * 0.7, 2), P(hip, 0, -18)].flat(), true, 0.45);
  cel(ctx, torso, C(body.jacket), C(body.jacketD), { d: 8, rim, rx: 0.4, ry: -0.9, rw: 3 });
  ctx.save(); ctx.clip(torso);
  if (who === 'Y') { // black side panel + reflective stripe
    ctx.fillStyle = C('#1D1C27'); ctx.fill(poly([P(hip, -40, -20), P(hip, -6, -20), P(sh, -10, -10), P(sh, -40, -10)].flat()));
    ctx.strokeStyle = C('#E9EDF5'); ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(...P(hip, -50, 52)); ctx.lineTo(...P(hip, 50, 52)); ctx.stroke();
  } else if (who === 'B') {
    ctx.fillStyle = C('#EEF4FF'); ctx.fill(poly([P(sh, d * 0.2, 20), P(sh, d + 4, 0), P(hip, d + 4, 56), P(hip, d * 0.5, 50)].flat()));
  } else {
    ctx.strokeStyle = C('#3A2E2A'); ctx.lineWidth = 9; ctx.beginPath(); ctx.moveTo(...P(sh, -d, -8)); ctx.lineTo(...P(hip, d, 30)); ctx.stroke();
  }
  ctx.restore();
  ctx.lineWidth = 2.6; ctx.strokeStyle = INK; ctx.stroke(torso);
  if (who === 'B') neon(ctx, poly([P(sh, d * 0.3, 18), P(hip, d * 0.6, 50)].flat(), false), th.glow, 1.4, 0.8 * gk);
  if (who === 'O') neon(ctx, poly([P(sh, d * 0.6, -4), P(hip, d * 0.8, 40)].flat(), false), th.glow, 1.4, 0.8 * gk);

  // ---- near leg
  flat(ctx, limbPath(hip[0], hip[1], knee[0], knee[1], who === 'Y' ? 21 : 18, 15), C(body.pants));
  flat(ctx, limbPath(knee[0], knee[1], foot[0], foot[1], 15, 12), C(body.pants));
  const shA = Math.atan2(foot[1] - knee[1], foot[0] - knee[0]), shL = Math.hypot(foot[0] - knee[0], foot[1] - knee[1]);
  if (who === 'Y') {
    plate(ctx, knee[0], knee[1], Math.atan2(knee[1] - hip[1], knee[0] - hip[0]), [-14, -15, 10, -18, 22, -2, 8, 14, -12, 12], C('#FFD100'), C('#C98C00'), { d: 4, rw: 2.5, rim });
  }
  if (who === 'B') { // tall white boots
    plate(ctx, knee[0], knee[1], shA, [shL * 0.18, -15, shL + 6, -14, shL + 6, 12, shL * 0.18, 14], C('#EEF4FF'), C('#9DB2D6'), { d: 3, rim });
  }
  const boot = poly([foot[0] - 18, foot[1] + 4, foot[0] - 17, foot[1] - 22, foot[0] + 2, foot[1] - 20, foot[0] + 30, foot[1] - 9, foot[0] + 36, foot[1] + 4]);
  cel(ctx, boot, C(body.boot), C(shade(body.boot, 0.5)), { d: 3 });
  if (who !== 'B') { ctx.fillStyle = C(th.main); ctx.fill(poly([foot[0] + 14, foot[1] - 15, foot[0] + 30, foot[1] - 9, foot[0] + 30, foot[1] - 4, foot[0] + 14, foot[1] - 9])); }

  // ---- head (profile)
  ctx.save(); ctx.translate(hc[0], hc[1]); ctx.rotate(headAng);
  drawProfileHead(ctx, who, t, { C, speed, sil: o.sil, hood: o.hood, glow: gk, look: o.look });
  ctx.restore();

  // ---- near arm
  const faA = Math.atan2(hand[1] - elbow[1], hand[0] - elbow[0]);
  flat(ctx, limbPath(sh[0], sh[1], elbow[0], elbow[1], who === 'Y' ? 15 : 12, 11), C(body.jacket));
  flat(ctx, limbPath(elbow[0], elbow[1], hand[0], hand[1], who === 'Y' ? 13 : 11, 10), C(body.jacket));
  if (who === 'Y') { // black elbow pad + reflective cuff
    flat(ctx, circlePath(elbow[0], elbow[1], 12), C('#1D1C27'));
  }
  // cuff
  const cuff = [lerp(elbow[0], hand[0], 0.82), lerp(elbow[1], hand[1], 0.82)];
  ctx.save(); ctx.translate(cuff[0], cuff[1]); ctx.rotate(faA);
  flat(ctx, rrectPath(-6, -12, 12, 24, 3), C(who === 'B' ? '#EEF4FF' : '#1D1C27'));
  ctx.restore();
  // shoulder
  const pc = P(sh, 2, -2);
  if (who === 'Y') {
    plate(ctx, pc[0], pc[1], th0 - 0.25, [-30, 6, -24, -15, 2, -24, 28, -16, 34, 2, 24, 18, -6, 22, -26, 16], C('#1D1C27'), C('#0C0B12'), { d: 5, smooth: 0.15, rim, rw: 3 });
    ctx.save(); ctx.translate(pc[0], pc[1]); ctx.rotate(th0 - 0.25); ctx.fillStyle = C('#FFD100'); ctx.fillRect(-24, -2, 50, 6); ctx.restore();
  } else if (who === 'B') {
    plate(ctx, pc[0], pc[1], th0 - 0.25, [-24, 8, -18, -12, 4, -18, 24, -10, 26, 6, -4, 16], C('#0D4FB8'), C('#062C6E'), { d: 4, smooth: 0.2, rim, rw: 3 });
  }
  // glove
  ctx.save(); ctx.translate(hand[0], hand[1]); ctx.rotate(faA);
  cel(ctx, rrectPath(-9, -12, 26, 24, 8), C('#22212b'), C('#0f0f16'), { d: 3 });
  ctx.fillStyle = C(th.main); ctx.fillRect(6, -11, 7, 22);
  ctx.restore();
  ctx.restore();
}

// fabric trailing behind (coat tails / cloak)
function coatTails(ctx, root, t, speed, col, colD, len, wid, glowC) {
  const N = 12, pts = [];
  for (let i = 0; i <= N; i++) {
    const u = i / N;
    pts.push([root[0] - len * u * (0.7 + 0.3 * speed), root[1] + u * (30 + (1 - speed) * 120) + Math.sin(t * 11 - u * 6) * 22 * u]);
  }
  const p = new Path2D();
  p.moveTo(root[0], root[1] - wid * 0.3);
  for (let i = 1; i <= N; i++) { const u = i / N; p.lineTo(pts[i][0], pts[i][1] - wid * 0.5 * (1 - u * 0.4)); }
  // jagged tail end
  const e = pts[N];
  p.lineTo(e[0] - 24, e[1] + 6); p.lineTo(e[0] + 4, e[1] + 14); p.lineTo(e[0] - 14, e[1] + wid * 0.5);
  for (let i = N; i >= 0; i--) { const u = i / N; p.lineTo(pts[i][0], pts[i][1] + wid * 0.5 * (1 - u * 0.2)); }
  p.closePath();
  cel(ctx, p, col, colD, { d: 10, lx: 0, ly: -1 });
}

function drawScarf(ctx, ax, ay, t, o = {}) {
  const N = 16, len = o.len ?? 250, sp = o.speed ?? 1, C = o.C ?? (h => h);
  const pts = [];
  for (let i = 0; i <= N; i++) {
    const s = i / N;
    const wave = Math.sin(t * 13 - i * 0.62) * (4 + 26 * s) + Math.sin(t * 7.3 - i * 0.31) * 8 * s;
    pts.push([ax - len * s * (0.75 + 0.25 * sp), ay + wave + (1 - sp) * 120 * s * s + 6 * s - (o.lift ?? 0) * s * s]);
  }
  const L = [], R = [];
  for (let i = 0; i <= N; i++) {
    const p0 = pts[Math.max(0, i - 1)], p1 = pts[Math.min(N, i + 1)];
    let dx = p1[0] - p0[0], dy = p1[1] - p0[1]; const d = Math.hypot(dx, dy) || 1; dx /= d; dy /= d;
    const w = (o.w ?? 13) * (1 - 0.4 * i / N);
    L.push([pts[i][0] - dy * w, pts[i][1] + dx * w]); R.push([pts[i][0] + dy * w, pts[i][1] - dx * w]);
  }
  const p = new Path2D();
  p.moveTo(L[0][0], L[0][1]);
  for (let i = 1; i <= N; i++) p.lineTo(L[i][0], L[i][1]);
  const e = pts[N], pe = pts[N - 2];
  p.lineTo(lerp(e[0], pe[0], 0.6), lerp(e[1], pe[1], 0.6));
  for (let i = N; i >= 0; i--) p.lineTo(R[i][0], R[i][1]);
  p.closePath();
  ctx.save();
  ctx.fillStyle = C(o.col ?? '#FFC800'); ctx.fill(p);
  ctx.clip(p); ctx.fillStyle = C(o.colD ?? '#C77F00');
  for (let i = 0; i < N; i++) if (pts[i + 1][1] - pts[i][1] > 1.5) ctx.fill(poly([L[i][0], L[i][1], L[i + 1][0], L[i + 1][1], R[i + 1][0], R[i + 1][1], R[i][0], R[i][1]]));
  ctx.restore();
  ctx.lineJoin = 'round'; ctx.lineWidth = 2.2; ctx.strokeStyle = INK; ctx.stroke(p);
}

// ---------------------------------------------------- profile heads (side) --
function drawProfileHead(ctx, who, t, o = {}) {
  const C = o.C ?? (h => h), sp = o.speed ?? 1, c = CAST[who];
  const hair = C(c.hair), hairD = C(c.hairShade), hl = C(c.hairLine);
  const hooded = who === 'O' && o.hood;
  // ---- hair streaming behind
  if (who === 'Y') {
    for (let k = 0; k < 5; k++) {
      const a = [-30 + k * 3, -14 + k * 9], b = [-74 - k * 6 + Math.sin(t * 12 + k) * 4 * sp, -16 + k * 13];
      cel(ctx, lockPath(a, b, 20, 3), hair, hairD, { d: 4, line: hl, lw: 1.8 });
    }
  } else if (who === 'B') {
    for (let k = 0; k < 5; k++) {
      const w = Math.sin(t * 9 + k * 0.8) * 10 * sp;
      const a = [-22, -30 + k * 11], b = [-150 - k * 22 + w, -40 + k * 18 + w * 0.8 + (1 - sp) * 60];
      cel(ctx, lockPath(a, b, 30 - k * 3, -8), hair, hairD, { d: 5, line: hl, lw: 1.8 });
    }
  } else if (who === 'O' && !hooded) {
    const a = [-14, -40], b = [-140 + Math.sin(t * 9) * 12 * sp, -44 + Math.sin(t * 9 - 1) * 14 + (1 - sp) * 70];
    cel(ctx, lockPath(a, b, 36, -18), hair, hairD, { d: 5, line: hl, lw: 1.8 });
  }
  if (hooded) {
    const fl = Math.sin(t * 12) * 7 * sp;
    const tailHood = smoothPath([20, -46, -10, -56, -50, -48, -104, -44 + fl, -70, -22, -44, 12, -16, 34], true, 0.35);
    cel(ctx, tailHood, C('#FF5A0A'), C('#B33A00'), { d: 6, line: INK, lw: 2.2 });
  }
  // ---- skull + face
  const head = smoothPath([14, -38, 32, -18, 34, -4, 44, 10, 36, 14, 37, 20, 34, 25, 36, 29, 31, 38, 12, 42, -10, 40, -30, 22, -36, -6, -22, -34], true, 0.35);
  cel(ctx, head, C(SKIN.base), C(SKIN.shade), { d: 5, lx: 0.8, ly: -0.4, line: C(SKIN.line), lw: 2.2 });
  ctx.strokeStyle = C(SKIN.deep); ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(-6, 8, 6, -1.2, 1.6); ctx.stroke();
  // ---- eye
  if (!hooded) {
    ctx.fillStyle = '#ffffff'; ctx.fill(poly([18, -2, 31, -6, 30, 6, 21, 6]));
    ctx.fillStyle = C(c.iris[1]); ctx.beginPath(); ctx.ellipse(27, 1, 3.6, 6, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#120A12'; ctx.fill(poly([16, -4, 32, -9, 35, -4, 30, -5, 18, -1]));
    ctx.strokeStyle = C(c.brow); ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(18, -14); ctx.lineTo(33, -15); ctx.stroke();
  }
  // ---- hair cap + bangs
  const cap = smoothPath([31, -22, 27, -38, 6, -48, -22, -45, -40, -24, -42, 0, -35, 24, -22, 27, -14, 6, -6, -14, 16, -20], true, 0.35);
  if (who === 'B' || (who === 'O' && !hooded)) {
    cel(ctx, cap, hair, hairD, { d: 5, lx: 0.3, ly: -1, line: hl, lw: 2 });
    ctx.strokeStyle = rgba(c.hairHi, 0.8); ctx.lineWidth = 3; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(-4, -10, 34, -2.2, -1.5); ctx.stroke();
    for (let k = 0; k < 3; k++) cel(ctx, lockPath([22 - k * 9, -34 + k * 2], [36 - k * 4, -4 + k * 3], 15, 5), hair, hairD, { d: 3, line: hl, lw: 1.6 });
  }
  if (who === 'Y') {
    for (let k = 0; k < 3; k++) cel(ctx, lockPath([14 + k * 7, -24], [24 + k * 8, -6 + k * 2], 13, 3), hair, hairD, { d: 3, line: hl, lw: 1.6 });
    // kangaroo ears swept back
    for (const [bx, by, r, k] of [[-22, -52, -1.05, 0.88], [-6, -58, -0.9, 1]]) {
      ctx.save(); ctx.translate(bx, by); ctx.rotate(r + Math.sin(t * 9 + k) * 0.06 * sp); ctx.scale(0.62 * k, 0.62 * k);
      const ear = smoothPath([-24, 10, -30, -40, -18, -96, 0, -118, 18, -96, 30, -40, 24, 10], true, 0.45);
      cel(ctx, ear, C(k < 1 ? '#E0B000' : '#FFD100'), C('#C98C00'), { d: 6, line: INK, lw: 3.6 });
      ctx.fillStyle = C('#E8862A'); ctx.fill(smoothPath([-11, -4, -15, -42, -7, -86, 0, -96, 7, -86, 15, -42, 11, -4], true, 0.45));
      ctx.restore();
    }
    // helmet shell
    const helm = smoothPath([39, -22, 35, -42, 14, -60, -16, -61, -40, -42, -46, -12, -40, 4, -22, -8, 8, -18], true, 0.35);
    cel(ctx, helm, C('#FFD100'), C('#C98C00'), { d: 7, lx: 0.3, ly: -1, line: INK, lw: 2.6, rim: o.sil ? null : rgba(TH.Y.rim, 0.9), rx: -1, ry: 0.2, rw: 3 });
    ctx.strokeStyle = C('#1D1C27'); ctx.lineWidth = 6; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-40, 0); ctx.quadraticCurveTo(-2, -22, 39, -22); ctx.stroke();
    if (!o.sil) { ctx.fillStyle = 'rgba(255,255,255,0.8)'; ctx.beginPath(); ctx.ellipse(-4, -50, 14, 4, -0.2, 0, TAU); ctx.fill(); }
    // goggles down
    ctx.strokeStyle = INK; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(-42, -4); ctx.lineTo(18, -2); ctx.stroke();
    flat(ctx, rrectPath(15, -11, 24, 18, 6), C('#2B2938'), INK, 2);
    const lg = ctx.createLinearGradient(0, -8, 0, 6); lg.addColorStop(0, '#FF7A00'); lg.addColorStop(1, '#FFE27A');
    flat(ctx, rrectPath(21, -8, 16, 12, 4), lg, INK, 1.5);
    ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.fillRect(24, -6, 6, 2);
  } else if (who === 'B') {
    flat(ctx, smoothPath([12, -10, 42, -8, 44, 4, 14, 6], true, 0.3), 'rgba(90,215,255,0.45)', C('#9EEBFF'), 1.6);
    neon(ctx, poly([12, -10, 42, -8], false), '#5FE0FF', 1.6, o.glow ?? 1);
    const fin = poly([-4, -8, -58, -34, -70, -28, -8, 4]);
    cel(ctx, fin, C('#EAF4FF'), C('#7FA0D6'), { d: 3, line: C('#1C2A50'), lw: 1.8 });
    neon(ctx, poly([-8, -6, -60, -30], false), '#5FE0FF', 1.1, 0.7 * (o.glow ?? 1));
  } else if (who === 'O') {
    if (hooded) {
      const hood = smoothPath([42, -18, 30, -46, -2, -58, -32, -48, -40, -10, -30, 26, 0, 14, 20, -8], true, 0.35);
      cel(ctx, hood, C('#FF5A0A'), C('#B33A00'), { d: 6, line: INK, lw: 2.4, rim: o.sil ? null : rgba(TH.O.rim, 0.9), rw: 3 });
      ctx.fillStyle = 'rgba(10,5,5,0.94)'; ctx.fill(smoothPath([40, -16, 26, -38, 10, -32, 12, 8, 32, 14], true, 0.3));
      ctx.fillStyle = '#FFB347'; ctx.fill(poly([22, -4, 35, -9, 33, -2]));
      glow(ctx, 30, -5, 26, '#FF7A1A', 0.9);
    } else {
      ctx.strokeStyle = INK; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(-2, -6, 40, -2.5, -0.95); ctx.stroke();
      ctx.save(); ctx.translate(-6, -46); ctx.rotate(-0.55); ctx.scale(0.5, 0.5);
      cel(ctx, poly([-30, 8, 0, -70, 30, 8]), C('#FF6A10'), C('#B33A00'), { d: 5, line: INK, lw: 4 });
      ctx.restore();
      flat(ctx, ellipsePath(-8, 6, 10, 14), C('#2A2226'));
      ctx.fillStyle = C('#FF6A10'); ctx.fillRect(-10, -4, 4, 20);
    }
  }
}
