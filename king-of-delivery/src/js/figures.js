'use strict';
// ============================================================================
//  Full-body standing figures (side view, facing +x, feet at y=0), top-down
//  riders, chibis.
// ============================================================================

const BODY = {
  Y: { jacket: '#FFD100', jacketD: '#C98C00', pants: '#24232E', pantsD: '#121119', boot: '#1D1C27', depth: 50, sh: 1.12, limb: 1.15 },
  B: { jacket: '#0D4FB8', jacketD: '#062C6E', pants: '#151B2A', pantsD: '#0A0E18', boot: '#EEF4FF', depth: 38, sh: 1.0, limb: 0.92 },
  O: { jacket: '#1E191C', jacketD: '#0B090A', pants: '#1A1517', pantsD: '#0A0809', boot: '#2A2226', depth: 34, sh: 0.92, limb: 0.88 },
};

// o: t, wind (0..1), sil (0..1 silhouette), rim colour, pose ('stand'|'crouch'|'point'), hood, look
function drawStanding(ctx, who, x, y, s, o = {}) {
  const t = o.t ?? 0, b = BODY[who], th = TH[who];
  const C = o.sil ? (h => mixHex(h, '#07060d', o.sil)) : (h => h);
  const wind = o.wind ?? 1;
  const crouch = o.pose === 'crouch' ? 1 : 0;
  ctx.save(); ctx.translate(x, y); ctx.scale(o.flip ? -s : s, s);
  const hip = [0, -300 + crouch * 110];
  const sh = [10 + crouch * 30, -478 + crouch * 140];
  const neck = [14 + crouch * 34, -500 + crouch * 140];
  const hc = [30 + crouch * 36, -552 + crouch * 140];
  const rim = o.rim ? rgba(o.rim, 0.95) : null;
  const ink = o.sil ? '#030207' : INK;

  // ---- flowing coat / cloak / scarf behind
  if (who === 'B') standCoat(ctx, [sh[0] - 20, sh[1] + 10], t, wind, C('#0D4FB8'), C('#062C6E'), 330, 120, rim);
  if (who === 'O') standCoat(ctx, [sh[0] - 10, sh[1] - 4], t, wind, C('#FF5A0A'), C('#B33A00'), 300, 150, rim);
  if (who === 'Y') {
    drawScarf(ctx, neck[0] - 12, neck[1] + 14, t, { speed: 0.55 + 0.45 * wind, C, w: 18, len: 300, col: '#FFC800', colD: '#C77F00' });
  }
  // ---- far leg + far arm
  const legs = crouch
    ? [[hip, [hip[0] + 70, hip[1] + 40], [hip[0] + 40, 0]], [hip, [hip[0] - 40, hip[1] + 70], [hip[0] - 90, 0]]]
    : [[hip, [hip[0] + 34, -150], [hip[0] + 40, -16]], [hip, [hip[0] - 30, -150], [hip[0] - 62, -16]]];
  const [nearLeg, farLeg] = legs;
  ctx.save(); ctx.translate(-4, 0);
  const lw = b.limb;
  flat(ctx, limbPath(...farLeg[0], ...farLeg[1], 34 * lw, 26 * lw), C(shade(b.pants, 0.4)), ink);
  flat(ctx, limbPath(...farLeg[1], ...farLeg[2], 26 * lw, 19 * lw), C(shade(b.pants, 0.4)), ink);
  bootSide(ctx, farLeg[2], C(shade(b.boot, 0.35)), ink);
  const fArmE = [sh[0] - 12, sh[1] + 96], fArmH = [sh[0] - 6, sh[1] + 180];
  flat(ctx, limbPath(...sh, ...fArmE, 22 * lw, 18 * lw), C(shade(b.jacketD, 0.4)), ink);
  flat(ctx, limbPath(...fArmE, ...fArmH, 18 * lw, 15 * lw), C(shade(b.jacketD, 0.4)), ink);
  ctx.restore();
  // ---- near leg
  flat(ctx, limbPath(...nearLeg[0], ...nearLeg[1], 36 * lw, 27 * lw), C(b.pants), ink);
  flat(ctx, limbPath(...nearLeg[1], ...nearLeg[2], 27 * lw, 20 * lw), C(b.pants), ink);
  if (who === 'Y') plate(ctx, ...nearLeg[1], 1.2, [-20, -18, 14, -22, 26, -2, 10, 18, -16, 16], C('#FFD100'), C('#C98C00'), { d: 4, rim, line: ink });
  if (who === 'B') plate(ctx, ...nearLeg[1], Math.atan2(nearLeg[2][1] - nearLeg[1][1], nearLeg[2][0] - nearLeg[1][0]), [20, -20, 156, -18, 156, 18, 20, 20], C('#EEF4FF'), C('#9DB2D6'), { d: 4, rim, line: ink });
  bootSide(ctx, nearLeg[2], C(b.boot), ink);
  // ---- torso
  const d = b.depth;
  const torso = smoothPath([hip[0] - d * 0.8, hip[1] + 10, hip[0] - d, hip[1] - 80, sh[0] - d * 1.05 * b.sh, sh[1] + 10, sh[0] - 6, sh[1] - 14, sh[0] + d * 0.7, sh[1] + 4, sh[0] + d * 0.9, sh[1] + 70, hip[0] + d * 0.9, hip[1] - 30, hip[0] + d * 0.8, hip[1] + 12], true, 0.4);
  cel(ctx, torso, C(b.jacket), C(b.jacketD), { d: 10, lx: 0.8, ly: -0.5, rim, rx: -1, ry: 0, rw: 4, line: ink, lw: 2.8 });
  ctx.save(); ctx.clip(torso);
  if (who === 'Y') {
    ctx.fillStyle = C('#1D1C27'); ctx.fillRect(hip[0] - 60, hip[1] - 80, 40, 120);
    ctx.fillStyle = C('#E9EDF5'); ctx.fillRect(hip[0] - 60, hip[1] - 70, 140, 8);
    ctx.fillStyle = C('#1D1C27'); ctx.fillRect(hip[0] - 60, hip[1] - 4, 140, 16);
  } else if (who === 'B') {
    ctx.fillStyle = C('#EEF4FF'); ctx.fill(poly([sh[0] + 8, sh[1] - 10, sh[0] + 40, sh[1] + 10, hip[0] + 40, hip[1], hip[0] + 18, hip[1]]));
  } else {
    ctx.strokeStyle = C('#3A2E2A'); ctx.lineWidth = 12; ctx.beginPath(); ctx.moveTo(sh[0] - 30, sh[1]); ctx.lineTo(hip[0] + 30, hip[1] - 20); ctx.stroke();
  }
  ctx.restore();
  if (who === 'B' && !o.sil) neon(ctx, poly([sh[0] + 34, sh[1] + 6, hip[0] + 36, hip[1] - 4], false), th.glow, 1.6, 0.8);
  if (who === 'O' && !o.sil) neon(ctx, poly([sh[0] + 22, sh[1] + 12, hip[0] + 26, hip[1] - 10], false), th.glow, 1.6, 0.8);
  // ---- head
  ctx.save(); ctx.translate(hc[0], hc[1]); ctx.scale(1.5, 1.5); ctx.rotate(o.headPitch ?? 0);
  drawProfileHead(ctx, who, t, { C, speed: wind, sil: o.sil, hood: o.hood, glow: o.glowK ?? 1 });
  ctx.restore();
  // ---- near arm
  let elbow = [sh[0] + 8, sh[1] + 98], hand = [sh[0] + 16, sh[1] + 184];
  if (o.pose === 'point') { elbow = [sh[0] + 90, sh[1] - 10]; hand = [sh[0] + 180, sh[1] - 30]; }
  if (who === 'B' && o.pose !== 'point') { elbow = [sh[0] + 14, sh[1] + 96]; hand = [sh[0] + 30, sh[1] + 150]; }
  if (crouch) { elbow = [sh[0] + 60, sh[1] + 70]; hand = [sh[0] + 100, sh[1] + 130]; }
  flat(ctx, limbPath(...sh, ...elbow, 24 * lw, 19 * lw), C(b.jacket), ink);
  flat(ctx, limbPath(...elbow, ...hand, 19 * lw, 16 * lw), C(b.jacket), ink);
  if (who === 'Y') {
    plate(ctx, ...sh, 0.3, [-30, 6, -24, -16, 2, -26, 30, -16, 36, 2, 26, 20, -6, 24, -28, 18], C('#1D1C27'), C('#0C0B12'), { d: 5, smooth: 0.15, rim, line: ink });
    ctx.save(); ctx.translate(...sh); ctx.rotate(0.3); ctx.fillStyle = C('#FFD100'); ctx.fillRect(-26, -2, 56, 7); ctx.restore();
  }
  if (!(who === 'B' && o.pose !== 'point')) {
    ctx.save(); ctx.translate(...hand); ctx.rotate(Math.atan2(hand[1] - elbow[1], hand[0] - elbow[0]));
    cel(ctx, rrectPath(-10, -14, 30, 28, 9), C('#22212b'), C('#0f0f16'), { d: 3, line: ink });
    ctx.fillStyle = C(th.main); ctx.fillRect(8, -13, 8, 26);
    ctx.restore();
  }
  ctx.restore();
}
function bootSide(ctx, f, col, ink) {
  const p = poly([f[0] - 22, f[1] + 16, f[0] - 20, f[1] - 26, f[0] + 6, f[1] - 24, f[0] + 40, f[1] - 4, f[0] + 46, f[1] + 16]);
  cel(ctx, p, col, shade(col, 0.5), { d: 3, line: ink });
}
function standCoat(ctx, root, t, wind, col, colD, len, wid, rim) {
  const N = 14, top = [], bot = [];
  for (let i = 0; i <= N; i++) {
    const u = i / N;
    const flap = Math.sin(t * 6 - u * 5) * 26 * u * wind + Math.sin(t * 11 - u * 9) * 8 * u * wind;
    const x = root[0] - len * u * (0.35 + 0.65 * wind);
    const yTop = root[1] + u * 40 + flap * 0.6 + (1 - wind) * u * 260;
    const yBot = root[1] + wid * 2.2 + u * (wid * 0.4) + flap + (1 - wind) * u * 120;
    top.push([x, yTop]); bot.push([x - 20 * u, yBot]);
  }
  const p = new Path2D();
  p.moveTo(top[0][0], top[0][1]);
  for (const q of top) p.lineTo(q[0], q[1]);
  for (let i = N; i >= 0; i--) {
    const q = bot[i];
    if (i % 3 === 0 && i > 0) p.lineTo(q[0] + 14, q[1] - 26); // ragged hem
    p.lineTo(q[0], q[1]);
  }
  p.closePath();
  cel(ctx, p, col, colD, { d: 14, lx: 0.4, ly: -1, rim, rw: 4 });
}

// ------------------------------------------------------------- top-down ---
// rider seen from above, travelling along +x
function drawTopDown(ctx, who, x, y, s, rot, o = {}) {
  const th = TH[who], t = o.t ?? 0;
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s, s);
  glowEllipse(ctx, 0, 0, 230, 90, th.glow, 0.45);
  // headlight cone
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  const g = ctx.createLinearGradient(150, 0, 700, 0); g.addColorStop(0, 'rgba(255,248,220,0.35)'); g.addColorStop(1, 'rgba(255,248,220,0)');
  ctx.fillStyle = g; ctx.fill(poly([150, -10, 150, 10, 700, 160, 700, -160])); ctx.restore();
  // wheels
  for (const wx of [-140, 150]) {
    if (who === 'O') { flat(ctx, rrectPath(wx - 46, -11, 92, 22, 10), '#0d0b0c'); neon(ctx, poly([wx - 40, 0, wx + 40, 0], false), th.glow, 3, 1); }
    else flat(ctx, rrectPath(wx - 44, -12, 88, 24, 10), '#121219');
  }
  // body
  const bodyCol = who === 'B' ? '#EEF4FF' : who === 'O' ? '#1E191C' : '#FFD100';
  const body = who === 'B' ? smoothPath([-240, 0, -150, -30, 60, -28, 230, 0, 60, 28, -150, 30], true, 0.4)
    : who === 'O' ? poly([-200, -18, 40, -30, 170, -10, 180, 0, 170, 10, 40, 30, -200, 18])
      : rrectPath(-200, -34, 370, 68, 22);
  cel(ctx, body, bodyCol, shade(bodyCol, 0.25), { d: 6, line: INK, lw: 3 });
  if (who === 'B') { // wing fins
    for (const sy of [-1, 1]) flat(ctx, poly([60, sy * 26, -90, sy * 70, -130, sy * 64, -40, sy * 26]), '#2AA8FF', INK, 2.4);
  }
  if (who === 'O') neon(ctx, poly([-180, 0, 160, 0], false), th.glow, 2, 0.9);
  // box
  if (who === 'Y') { flat(ctx, rrectPath(-280, -68, 136, 136, 10), '#FFD100', INK, 3); ctx.fillStyle = '#3a2f10'; ctx.fillRect(-270, -58, 116, 116); ctx.fillStyle = '#FFD100'; ctx.fillRect(-262, -50, 100, 100); }
  if (who === 'B') flat(ctx, rrectPath(-290, -54, 130, 108, 44), '#EEF4FF', INK, 3);
  if (who === 'O') flat(ctx, poly([-300, 0, -276, -44, -196, -44, -172, 0, -196, 44, -276, 44]), '#1E191C', INK, 3);
  ctx.save(); ctx.translate(who === 'Y' ? -212 : who === 'B' ? -225 : -236, 0); ctx.rotate(Math.PI / 2);
  ctx.font = font(who === 'Y' ? 44 : 32, FONT.sans, '900'); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillStyle = who === 'Y' ? '#17130A' : who === 'B' ? '#0B5FD1' : '#FF5A0A';
  ctx.fillText(who === 'Y' ? '美团' : who === 'B' ? '饿了么' : '闪购', 0, 0);
  ctx.restore();
  // rider: shoulders, arms, helmet / head
  const bc = BODY[who];
  flat(ctx, ellipsePath(-20, 0, 40, 62), bc.jacket, INK, 2.6);
  ctx.strokeStyle = INK; ctx.lineWidth = 18; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(-14, -50); ctx.lineTo(100, -60); ctx.moveTo(-14, 50); ctx.lineTo(100, 60); ctx.stroke();
  ctx.strokeStyle = bc.jacket; ctx.lineWidth = 12;
  ctx.beginPath(); ctx.moveTo(-14, -50); ctx.lineTo(100, -60); ctx.moveTo(-14, 50); ctx.lineTo(100, 60); ctx.stroke();
  ctx.strokeStyle = '#2a2a35'; ctx.lineWidth = 8; ctx.beginPath(); ctx.moveTo(104, -70); ctx.lineTo(104, 70); ctx.stroke();
  // trailing scarf / hair / cloak
  const wv = k => Math.sin(t * 12 - k) * 18;
  const trail = new Path2D(); trail.moveTo(-30, -14);
  for (let k = 1; k <= 8; k++) trail.lineTo(-30 - k * 34, -14 + wv(k * 0.7) * k / 8);
  for (let k = 8; k >= 1; k--) trail.lineTo(-30 - k * 34, 14 + wv(k * 0.7) * k / 8);
  trail.lineTo(-30, 14); trail.closePath();
  const tc = who === 'Y' ? '#FFC800' : who === 'B' ? CAST.B.hair : '#FF5A0A';
  flat(ctx, trail, tc, INK, 2.2);
  const hc = who === 'Y' ? '#FFD100' : who === 'B' ? CAST.B.hair : '#FF5A0A';
  flat(ctx, circlePath(18, 0, 30), hc, INK, 2.6);
  if (who === 'Y') { for (const sy of [-1, 1]) flat(ctx, ellipsePath(-6, sy * 22, 26, 9, sy * 0.3), '#FFD100', INK, 2); }
  if (who === 'O') { for (const sy of [-1, 1]) flat(ctx, poly([10, sy * 18, -20, sy * 34, 0, sy * 6]), '#FF6A10', INK, 2); }
  // taillight
  glow(ctx, who === 'Y' ? -286 : -296, 0, 40, '#ff3020', 0.9);
  ctx.restore();
}

// -------------------------------------------------------------- chibis ----
function drawChibi(ctx, who, x, y, s, o = {}) {
  const c = CAST[who], t = o.t ?? 0, ex = o.expr ?? 'happy';
  ctx.save(); ctx.translate(x, y + Math.sin(t * 8 + (o.ph ?? 0)) * (o.bounce ?? 3)); ctx.scale(s, s);
  // body
  const bodyCol = BODY[who].jacket;
  flat(ctx, rrectPath(-46, -10, 92, 90, 30), bodyCol, INK, 4);
  flat(ctx, ellipsePath(-24, 84, 20, 10), '#1D1C27', INK, 3); flat(ctx, ellipsePath(24, 84, 20, 10), '#1D1C27', INK, 3);
  if (who === 'Y') { ctx.fillStyle = '#1D1C27'; ctx.fillRect(-46, 30, 92, 12); flat(ctx, smoothPath([-50, -6, 0, 6, 50, -6, 52, 10, 0, 22, -52, 10], true, 0.4), '#FFC800', INK, 3); }
  if (who === 'B') { ctx.fillStyle = '#EEF4FF'; ctx.fillRect(-8, -10, 16, 90); }
  if (who === 'O') { ctx.fillStyle = '#FF5A0A'; ctx.fillRect(-46, -10, 22, 90); ctx.fillRect(24, -10, 22, 90); }
  // head
  const hy = -110;
  if (who === 'B') flat(ctx, smoothPath([-100, -30, -110, 70, -80, 90, 80, 90, 110, 70, 100, -30], true, 0.4), c.hair, c.hairLine, 4);
  if (who === 'O') flat(ctx, smoothPath([10, -190, -120, -260, -200, -150, -150, -170, -60, -170], true, 0.4), c.hair, c.hairLine, 4);
  flat(ctx, circlePath(0, hy, 104), SKIN.base, SKIN.line, 4);
  // hair / helmet
  if (who === 'Y') {
    flat(ctx, smoothPath([-108, -110, -90, -190, 0, -230, 90, -190, 108, -110, 60, -140, 0, -150, -60, -140], true, 0.35), '#FFD100', INK, 4);
    for (const sx of [-1, 1]) { ctx.save(); ctx.translate(sx * 50, -200); ctx.rotate(sx * 0.3); flat(ctx, ellipsePath(0, -50, 22, 60), '#FFD100', INK, 4); ctx.fillStyle = '#E8862A'; ctx.fill(ellipsePath(0, -50, 10, 42)); ctx.restore(); }
    for (let k = -3; k <= 3; k++) flat(ctx, poly([k * 26 - 16, -140, k * 26 + 16, -140, k * 26 + 4, -96]), c.hair, INK, 3);
  } else if (who === 'B') {
    flat(ctx, smoothPath([-110, -100, -80, -200, 0, -224, 80, -200, 110, -100, 70, -70, 30, -130, -10, -80, -50, -130, -90, -70], true, 0.3), c.hair, c.hairLine, 4);
    ctx.fillStyle = 'rgba(90,215,255,0.35)'; ctx.fillRect(-96, -128, 192, 34);
  } else {
    flat(ctx, smoothPath([-110, -100, -84, -196, 0, -222, 84, -196, 110, -100, 60, -150, 20, -110, -20, -160, -70, -110], true, 0.3), c.hair, c.hairLine, 4);
    for (const sx of [-1, 1]) flat(ctx, poly([sx * 40, -200, sx * 74, -268, sx * 96, -190]), '#FF6A10', INK, 4);
  }
  // face
  const ey = hy + 6;
  ctx.lineCap = 'round';
  if (ex === 'happy') {
    ctx.strokeStyle = INK; ctx.lineWidth = 7;
    for (const sx of [-1, 1]) { ctx.beginPath(); ctx.arc(sx * 40, ey + 6, 16, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke(); }
    flat(ctx, smoothPath([-20, ey + 40, 0, ey + 62, 20, ey + 40], true, 0.5), SKIN.mouth, INK, 4);
  } else if (ex === 'shock') {
    for (const sx of [-1, 1]) { flat(ctx, circlePath(sx * 40, ey, 22), '#ffffff', INK, 4); ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(sx * 40, ey, 5, 0, TAU); ctx.fill(); }
    flat(ctx, ellipsePath(0, ey + 50, 14, 18), SKIN.mouth, INK, 4);
    // sweat drop
    flat(ctx, smoothPath([80, hy - 60, 70, hy - 30, 80, hy - 20, 90, hy - 30], true, 0.5), '#9FDFFF', INK, 3);
  } else if (ex === 'cry') {
    ctx.strokeStyle = INK; ctx.lineWidth = 7;
    for (const sx of [-1, 1]) { ctx.beginPath(); ctx.moveTo(sx * 58, ey - 8); ctx.lineTo(sx * 24, ey + 6); ctx.stroke(); }
    ctx.fillStyle = 'rgba(120,200,255,0.85)';
    for (const sx of [-1, 1]) ctx.fillRect(sx * 40 - 8, ey + 10, 16, 70 + Math.sin(t * 20) * 6);
    flat(ctx, smoothPath([-24, ey + 56, 0, ey + 40, 24, ey + 56], true, 0.5), SKIN.mouth, INK, 4);
  } else if (ex === 'smug') {
    ctx.strokeStyle = INK; ctx.lineWidth = 7;
    for (const sx of [-1, 1]) { ctx.beginPath(); ctx.moveTo(sx * 58, ey); ctx.lineTo(sx * 22, ey); ctx.stroke(); }
    ctx.beginPath(); ctx.moveTo(-18, ey + 44); ctx.quadraticCurveTo(4, ey + 52, 24, ey + 36); ctx.stroke();
  }
  ctx.fillStyle = 'rgba(255,122,147,0.5)';
  for (const sx of [-1, 1]) { ctx.beginPath(); ctx.ellipse(sx * 66, ey + 34, 18, 9, 0, 0, TAU); ctx.fill(); }
  if (who === 'Y') flat(ctx, rrectPath(40, ey + 18, 34, 14, 5), '#F4DDB7', SKIN.line, 2);
  ctx.restore();
}
