'use strict';
// ============================================================================
//  Anime faces: busts (front ↔ 3/4 via a light pseudo-3D head projection),
//  eyes, expressions, hair, headgear, outfits. Three distinct characters:
//   Y  美团 Meituan        — hot-blooded bruiser, spiky black hair, kangaroo-ear half helmet + goggles
//   B  饿了么 Ele.me        — cool rival, long silver-blue hair + ponytail, hummingbird visor, tall-collar coat
//   O  淘宝闪购 Taobao Shangou — sly trickster girl, orange high ponytail, fox-ear headset, hood
// ============================================================================

const SKIN = {
  base: '#FFE6D5', shade: '#F3B6A4', deep: '#DE9182', line: '#4A2026', blush: '#FF7A93',
  mouth: '#5E1824', tongue: '#FF7F8E', teeth: '#FFFFFF',
};

const CAST = {
  Y: {
    hair: '#2A2438', hairShade: '#14111E', hairHi: '#7472A6', hairLine: '#07060B',
    iris: ['#4A1E00', '#FF8A00', '#FFE27A'], irisLine: '#2A1000', glowC: '#FFC233', pupil: 'sun', brow: '#1A1424',
    cloth: '#FFD100', clothShade: '#C98C00', cloth2: '#1D1C27', cloth2Shade: '#0C0B12', accent: '#FFE45C',
    shoulder: 214,
  },
  B: {
    hair: '#DCE9FF', hairShade: '#90A8D8', hairHi: '#FFFFFF', hairLine: '#2A3A66',
    iris: ['#00305E', '#14AEFF', '#C6F4FF'], irisLine: '#001A38', glowC: '#45C8FF', pupil: 'ring', brow: '#7F95C4',
    cloth: '#0D4FB8', clothShade: '#062C6E', cloth2: '#EEF4FF', cloth2Shade: '#A9BCDD', accent: '#5FE0FF',
    shoulder: 186,
  },
  O: {
    hair: '#FF7A1F', hairShade: '#C2410C', hairHi: '#FFD3A6', hairLine: '#5A1A00',
    iris: ['#4A1400', '#FF6A00', '#FFD86B'], irisLine: '#2E0C00', glowC: '#FF8A2A', pupil: 'bolt', brow: '#B23A06',
    cloth: '#FF5A0A', clothShade: '#B33A00', cloth2: '#1A1416', cloth2Shade: '#0A0809', accent: '#FFB070',
    shoulder: 170,
  },
};

// pseudo-3D head projection: x right, y down, z towards camera
function headProj(yaw, pitch = 0) {
  const cy = Math.cos(yaw), sy = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch);
  return (x, y, z) => {
    const X = x * cy + z * sy, Z = -x * sy + z * cy;
    return [X, y * cp - Z * sp];
  };
}
// cubic bezier sampler
function bez(p0, p1, p2, p3, n) {
  const out = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n, u = 1 - t;
    out.push([
      u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0],
      u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1],
    ]);
  }
  return out;
}

// ------------------------------------------------------------------- eyes ---
// draws one eye (+ brow) centred at (cx,cy). side=+1: outer corner on screen
// right; side=-1: mirrored. o: open, angry, look[x,y], shock, glow, happy, brow, browRaise
function drawAnimeEye(ctx, cx, cy, w, h, side, c, o = {}) {
  ctx.save();
  ctx.translate(cx, cy); ctx.scale(side, 1);
  const op = o.open ?? 1, ang = o.angry ?? 0;
  if (o.brow !== false) drawBrow(ctx, w, h, c, ang, o.browRaise ?? 0, o.worried ?? 0);
  if (op < 0.14) { // closed / happy arc
    ctx.strokeStyle = SKIN.line; ctx.lineWidth = h * 0.13; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-w * 0.48, 0);
    ctx.quadraticCurveTo(0, o.happy ? -h * 0.42 : h * 0.22, w * 0.5, o.happy ? h * 0.05 : -h * 0.04); ctx.stroke();
    ctx.restore(); return;
  }
  const inner = [-w * 0.5, h * 0.08], outer = [w * 0.5, -h * 0.05 + ang * h * 0.05];
  const c1 = [-w * 0.3, -h * 0.4 * op + ang * h * 0.34], c2 = [w * 0.24, -h * 0.66 * op + ang * h * 0.12];
  const low = h * 0.46 * Math.min(1, op * 1.25);
  const c3 = [w * 0.36, low * 0.9], c4 = [-w * 0.2, low];
  const eye = new Path2D();
  eye.moveTo(...inner); eye.bezierCurveTo(...c1, ...c2, ...outer); eye.bezierCurveTo(...c3, ...c4, ...inner); eye.closePath();
  ctx.fillStyle = '#FFFFFF'; ctx.fill(eye);
  ctx.save(); ctx.clip(eye);
  const top = -h * 0.66 * op;
  const lg = ctx.createLinearGradient(0, top, 0, top + h * 0.55);
  lg.addColorStop(0, 'rgba(110,100,170,0.55)'); lg.addColorStop(1, 'rgba(110,100,170,0)');
  ctx.fillStyle = lg; ctx.fillRect(-w, -h, w * 2, h * 2);
  // iris
  const sk = o.shock ? 0.55 : 1;
  const ix = (o.look?.[0] ?? 0) * side * w * 0.17 + w * 0.02, iy = (o.look?.[1] ?? 0) * h * 0.12 + h * 0.05;
  const irx = w * 0.32 * sk, iry = h * 0.58 * sk;
  const ig = ctx.createLinearGradient(0, iy - iry, 0, iy + iry);
  ig.addColorStop(0, c.iris[0]); ig.addColorStop(0.42, c.iris[1]); ig.addColorStop(1, c.iris[2]);
  ctx.fillStyle = ig; ctx.beginPath(); ctx.ellipse(ix, iy, irx, iry, 0, 0, TAU); ctx.fill();
  irisPattern(ctx, ix, iy, irx, iry, c, o);
  ctx.strokeStyle = c.irisLine; ctx.lineWidth = Math.max(1.2, w * 0.035);
  ctx.beginPath(); ctx.ellipse(ix, iy, irx, iry, 0, 0, TAU); ctx.stroke();
  const sg = ctx.createLinearGradient(0, iy - iry, 0, iy - iry * 0.1);
  sg.addColorStop(0, 'rgba(0,0,0,0.5)'); sg.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = sg; ctx.beginPath(); ctx.ellipse(ix, iy, irx, iry, 0, 0, TAU); ctx.fill();
  if (!o.shock && !o.noHi) {
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath(); ctx.roundRect(ix - irx * 0.62, iy - iry * 0.66, irx * 0.52, iry * 0.36, irx * 0.12); ctx.fill();
    ctx.beginPath(); ctx.arc(ix + irx * 0.42, iy + iry * 0.36, irx * 0.15, 0, TAU); ctx.fill();
  }
  ctx.restore();
  if ((o.glow ?? 0) > 0) glow(ctx, ix, iy, w * 0.75, c.glowC, o.glow);
  // upper lash line (tapered, with wing)
  const up = bez(inner, c1, c2, outer, 18);
  const lash = new Path2D();
  const thick = s => h * (0.04 + 0.15 * Math.pow(Math.sin(Math.PI * Math.min(1, 0.15 + s * 0.9)), 0.6) * (0.55 + 0.45 * s));
  lash.moveTo(up[0][0], up[0][1]);
  for (let i = 1; i < up.length; i++) lash.lineTo(up[i][0], up[i][1]);
  lash.lineTo(w * 0.66, -h * 0.26 + ang * h * 0.04); // wing
  lash.lineTo(w * 0.47, -h * 0.12);
  for (let i = up.length - 1; i >= 0; i--) { const s = i / (up.length - 1); lash.lineTo(up[i][0], up[i][1] - thick(s)); }
  lash.closePath();
  ctx.fillStyle = '#120A12'; ctx.fill(lash);
  // lower lash
  const lo = bez(outer, c3, c4, inner, 12);
  ctx.strokeStyle = SKIN.line; ctx.lineCap = 'round'; ctx.lineWidth = h * 0.05;
  ctx.beginPath(); ctx.moveTo(lo[1][0], lo[1][1]);
  for (let i = 2; i <= 6; i++) ctx.lineTo(lo[i][0], lo[i][1]);
  ctx.stroke();
  // double-eyelid crease
  ctx.lineWidth = h * 0.035; ctx.strokeStyle = 'rgba(74,32,38,0.6)';
  ctx.beginPath(); ctx.moveTo(-w * 0.15, -h * 0.66 * op - h * 0.12 + ang * h * 0.2);
  ctx.quadraticCurveTo(w * 0.2, -h * 0.82 * op - h * 0.1 + ang * h * 0.1, w * 0.42, -h * 0.4); ctx.stroke();
  ctx.restore();
}
function drawBrow(ctx, w, h, c, ang, raise, worried) {
  const iy = -h * 0.98 + ang * h * 0.28 - raise * h * 0.25 - worried * h * 0.25;
  const oy = -h * 1.12 - ang * h * 0.08 - raise * h * 0.35 + worried * h * 0.15;
  const p = new Path2D();
  p.moveTo(-w * 0.44, iy + h * 0.06);
  p.quadraticCurveTo(w * 0.05, (iy + oy) / 2 - h * 0.18, w * 0.6, oy);
  p.quadraticCurveTo(w * 0.05, (iy + oy) / 2 - h * 0.02, -w * 0.44, iy + h * 0.2);
  p.closePath();
  ctx.fillStyle = c.brow; ctx.fill(p);
}
function irisPattern(ctx, ix, iy, irx, iry, c, o) {
  ctx.save();
  if (c.pupil === 'sun') {
    ctx.strokeStyle = 'rgba(255,240,170,0.55)'; ctx.lineWidth = Math.max(1, irx * 0.035);
    ctx.beginPath();
    for (let k = 0; k < 22; k++) {
      const a = k / 22 * TAU;
      ctx.moveTo(ix + Math.cos(a) * irx * 0.32, iy + Math.sin(a) * iry * 0.32);
      ctx.lineTo(ix + Math.cos(a) * irx * 0.86, iy + Math.sin(a) * iry * 0.86);
    }
    ctx.stroke();
    ctx.fillStyle = '#2A0E00'; ctx.beginPath(); ctx.ellipse(ix, iy + iry * 0.06, irx * 0.34, iry * 0.38, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(255,200,80,0.9)'; ctx.lineWidth = Math.max(1, irx * 0.05);
    ctx.beginPath(); ctx.ellipse(ix, iy + iry * 0.06, irx * 0.44, iry * 0.48, 0, 0, TAU); ctx.stroke();
    ctx.fillStyle = '#FFF2B0';
    ctx.fill(starburstPath(ix + irx * 0.12, iy + iry * 0.2, irx * 0.04, irx * 0.16, 4, 0));
  } else if (c.pupil === 'ring') {
    ctx.strokeStyle = 'rgba(200,250,255,0.7)'; ctx.lineWidth = Math.max(1, irx * 0.04);
    ctx.beginPath(); ctx.ellipse(ix, iy, irx * 0.72, iry * 0.72, 0, 0, TAU); ctx.stroke();
    ctx.setLineDash([irx * 0.08, irx * 0.06]);
    ctx.beginPath(); ctx.ellipse(ix, iy, irx * 0.55, iry * 0.55, 0, 0, TAU); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = '#001226'; ctx.beginPath(); ctx.ellipse(ix, iy + iry * 0.04, irx * 0.3, iry * 0.34, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(130,230,255,0.9)'; ctx.lineWidth = Math.max(1, irx * 0.05);
    ctx.beginPath(); ctx.ellipse(ix, iy + iry * 0.04, irx * 0.38, iry * 0.42, 0, 0, TAU); ctx.stroke();
  } else if (c.pupil === 'bolt') {
    const rg = ctx.createRadialGradient(ix, iy, 0, ix, iy, irx);
    rg.addColorStop(0, 'rgba(255,230,140,0.6)'); rg.addColorStop(1, 'rgba(255,230,140,0)');
    ctx.fillStyle = rg; ctx.fillRect(ix - irx, iy - iry, irx * 2, iry * 2);
    ctx.fillStyle = '#2A0A00';
    const s = irx * 0.9;
    ctx.fill(poly([ix + s * 0.12, iy - iry * 0.62, ix - s * 0.3, iy + iry * 0.08, ix - s * 0.02, iy + iry * 0.06, ix - s * 0.16, iy + iry * 0.66, ix + s * 0.32, iy - iry * 0.12, ix + s * 0.04, iy - iry * 0.1]));
  }
  ctx.restore();
}
function starburstPath(cx, cy, r0, r1, n, rot = 0) {
  const p = new Path2D();
  for (let i = 0; i < n * 2; i++) {
    const a = rot + i / (n * 2) * TAU, r = i % 2 === 0 ? r1 : r0;
    if (i === 0) p.moveTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r); else p.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
  }
  p.closePath();
  return p;
}

// ------------------------------------------------------------------ hair ----
// a hair lock from root to tip (already projected 2D points)
function lockPath(a, b, w, bend, tipW = 0) {
  const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1, nx = -dy / L, ny = dx / L;
  const mx = (a[0] + b[0]) / 2 + nx * bend, my = (a[1] + b[1]) / 2 + ny * bend;
  const p = new Path2D();
  p.moveTo(a[0] + nx * w / 2, a[1] + ny * w / 2);
  p.quadraticCurveTo(mx + nx * w * 0.3, my + ny * w * 0.3, b[0] + nx * tipW, b[1] + ny * tipW);
  if (tipW) p.lineTo(b[0] - nx * tipW, b[1] - ny * tipW);
  p.quadraticCurveTo(mx - nx * w * 0.3, my - ny * w * 0.3, a[0] - nx * w / 2, a[1] - ny * w / 2);
  p.closePath();
  return p;
}
function drawLocks(ctx, P, locks, c, t, wind = 1) {
  for (const L of locks) {
    const sw = Math.sin(t * (L.f ?? 3.1) + (L.ph ?? 0)) * (L.sway ?? 4) * wind;
    const a = P(...L.r), b0 = P(...L.tip);
    const b = [b0[0] + sw, b0[1] + sw * 0.3];
    const p = lockPath(a, b, L.w, L.bend ?? 0, L.tw ?? 0);
    cel(ctx, p, L.col ?? c.hair, L.shade ?? c.hairShade, { d: L.d ?? 7, lx: L.lx ?? -0.7, ly: L.ly ?? -0.5, line: c.hairLine, lw: 2.2 });
    if (L.w > 30) {
      ctx.strokeStyle = rgba(c.hairShade, 0.8); ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.moveTo(a[0], a[1]);
      ctx.quadraticCurveTo((a[0] + b[0]) / 2 + (L.bend ?? 0) * 0.5, (a[1] + b[1]) / 2, lerp(a[0], b[0], 0.78), lerp(a[1], b[1], 0.78));
      ctx.stroke();
    }
  }
}

// ----------------------------------------------------------- head pieces ---
const FACE3D = (() => {
  const R = [[96, -70, 18], [101, -30, 22], [99, 8, 28], [92, 42, 36], [76, 78, 48], [52, 108, 60], [24, 129, 70]];
  const top = [[70, -112, 46], [0, -124, 60]];
  const pts = [[0, -124, 60], [70, -112, 46], ...R, [0, 138, 74], ...R.slice().reverse().map(p => [-p[0], p[1], p[2]]), [-70, -112, 46]];
  return pts;
})();
function facePath(P, yaw) {
  const pts = FACE3D.map(p => {
    const q = P(...p);
    const near = Math.sign(p[0]) === Math.sign(yaw) && Math.abs(yaw) > 0.01;
    if (near) q[0] = lerp(q[0], Math.sign(p[0]) * Math.abs(p[0]) * 1.0 + yaw * 30, Math.min(1, Math.abs(yaw) * 0.9));
    return q;
  });
  return smoothPath(pts.flat(), true, 0.42);
}

// ------------------------------------------------------------------ bust ----
// who: Y|B|O. Local units: face ~200 wide, eyes at y≈0, chin y≈150.
// o: t, yaw, pitch, expr(neutral|smirk|grin|shout|shock|calm|sly|talk), talk(0..1 mouth open),
//    look, blink, glow (eye glow), hood (O, 0..1), mask (O), wind, rim (rim light colour), noBody
function drawBust(ctx, who, x, y, s, o = {}) {
  const c = CAST[who], t = o.t ?? 0, yaw = o.yaw ?? 0, pitch = o.pitch ?? 0;
  const P = headProj(yaw, pitch);
  const expr = o.expr ?? 'neutral';
  ctx.save();
  ctx.translate(x, y); ctx.scale(s, s);
  if (o.rot) ctx.rotate(o.rot);
  const wind = o.wind ?? 1;

  // ---- back hair / ponytails
  backHair(ctx, who, P, c, t, wind, o);
  // ---- body
  if (!o.noBody) drawOutfit(ctx, who, c, yaw, t, o);
  // ---- neck
  const nx = yaw * 26;
  const neck = poly([nx - 34, 92, nx + 34, 92, nx + 42, 210, nx - 42, 210]);
  ctx.fillStyle = SKIN.base; ctx.fill(neck);
  ctx.save(); ctx.clip(neck);
  ctx.fillStyle = SKIN.shade;
  ctx.beginPath(); ctx.moveTo(nx - 60, 90); ctx.lineTo(nx + 60, 90); ctx.lineTo(nx + 60, 136); ctx.quadraticCurveTo(nx, 166, nx - 60, 136); ctx.fill();
  ctx.restore();
  ctx.strokeStyle = SKIN.line; ctx.lineWidth = 2; ctx.stroke(neck);
  if (!o.noBody) outfitCollar(ctx, who, c, yaw, t, o);

  // ---- face
  const face = facePath(P, yaw);
  ctx.fillStyle = SKIN.base; ctx.fill(face);
  ctx.save(); ctx.clip(face);
  // far-side cel shade band
  if (Math.abs(yaw) > 0.02) {
    ctx.fillStyle = SKIN.shade; ctx.fill(face);
    ctx.save(); ctx.translate(Math.sign(yaw) * (6 + 34 * Math.abs(yaw)), -4); ctx.fillStyle = SKIN.base; ctx.fill(face); ctx.restore();
  }
  // under-chin & hair shadow band
  ctx.fillStyle = 'rgba(243,182,164,0.85)';
  ctx.beginPath(); ctx.ellipse(P(0, -96, 60)[0], -96, 140, 34, 0, 0, TAU); ctx.fill();
  ctx.restore();
  ctx.strokeStyle = SKIN.line; ctx.lineWidth = 2.6; ctx.lineJoin = 'round'; ctx.stroke(face);
  // rim light on face edge
  if (o.rim) {
    ctx.save(); ctx.clip(face);
    ctx.strokeStyle = rgba(o.rim, 0.85); ctx.lineWidth = 8;
    ctx.translate(o.rimDir ?? 4, 0); ctx.stroke(face);
    ctx.restore();
  }

  // ---- features
  const fs = (nrm) => clamp(Math.cos(nrm - yaw), 0.3, 1);
  const eL = P(-46, 4, 66), eR = P(46, 4, 66);
  const eo = eyeOpts(expr, o, t);
  // blush
  const bl = o.blush ?? (expr === 'shock' ? 0.12 : 0.28);
  for (const e of [eL, eR]) {
    ctx.save(); ctx.globalAlpha = bl * 0.8;
    ctx.fillStyle = SKIN.blush; ctx.beginPath(); ctx.ellipse(e[0], e[1] + 50, 24, 9, 0, 0, TAU); ctx.fill();
    ctx.restore();
  }
  drawAnimeEye(ctx, eL[0], eL[1], 68 * fs(-0.45), 52, -1, c, eo);
  drawAnimeEye(ctx, eR[0], eR[1], 68 * fs(0.45), 52, 1, c, eo);
  // nose
  const nt = P(0, 52, 100), nb = P(4, 30, 92);
  ctx.strokeStyle = SKIN.deep; ctx.lineWidth = 2.4; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(nb[0] - yaw * 6, nb[1]); ctx.lineTo(nt[0], nt[1]); ctx.lineTo(nt[0] - 7 + yaw * 8, nt[1] + 3); ctx.stroke();
  // mouth
  drawMouth(ctx, P(0, 92, 82), 1 - Math.abs(yaw) * 0.35, expr, o, c, who);
  // character marks
  if (who === 'Y') { // cheek plaster
    const b = P(64, 60, 58);
    ctx.save(); ctx.translate(b[0], b[1]); ctx.rotate(-0.4); ctx.scale(fs(0.6), 1);
    flat(ctx, rrectPath(-17, -7, 34, 14, 5), '#F4DDB7', SKIN.line, 1.6);
    ctx.fillStyle = '#E1BE8D'; ctx.fillRect(-4, -7, 8, 14);
    ctx.restore();
  } else if (who === 'B') { // beauty mark
    const m = P(-58, 44, 58); ctx.fillStyle = SKIN.line; ctx.beginPath(); ctx.arc(m[0], m[1], 2.6, 0, TAU); ctx.fill();
  } else if (who === 'O') { // lightning face paint
    const m = P(62, 40, 58);
    ctx.save(); ctx.translate(m[0], m[1]); ctx.scale(fs(0.6) * 0.9, 0.9);
    ctx.fillStyle = '#FF6A00'; ctx.fill(poly([4, -14, -6, 2, 0, 2, -4, 14, 8, -2, 2, -2]));
    ctx.restore();
  }

  // ---- front hair + headgear
  frontHair(ctx, who, P, c, t, wind, o, yaw);
  headgear(ctx, who, P, c, t, o, yaw);
  // visor goes over the eyes (Ele.me)
  if (who === 'B' && o.visor !== false) visorB(ctx, P, c, t, yaw, o);
  // hood shadow (Taobao mystery)
  if (who === 'O' && (o.hood ?? 0) > 0) hoodO(ctx, P, c, t, o.hood, o);
  ctx.restore();
}

function eyeOpts(expr, o, t) {
  const e = { look: o.look, glow: o.glow ?? 0 };
  // blink
  const bl = o.blink ?? -1;
  let open = 1;
  if (bl >= 0) { const d = Math.abs(t - bl); if (d < 0.08) open = 0.05 + d / 0.08 * 0.95; }
  switch (expr) {
    case 'grin': Object.assign(e, { angry: 0.35, open: 0.95 }); break;
    case 'shout': Object.assign(e, { angry: 0.9, open: 1.08 }); break;
    case 'smirk': Object.assign(e, { angry: 0.15, open: 0.72, browRaise: 0.2 }); break;
    case 'calm': Object.assign(e, { open: 0.68 }); break;
    case 'sly': Object.assign(e, { open: 0.62, angry: 0.1, browRaise: 0.35 }); break;
    case 'shock': Object.assign(e, { shock: true, open: 1.18, worried: 0.8 }); break;
    case 'determined': Object.assign(e, { angry: 0.55, open: 0.9 }); break;
    case 'happy': Object.assign(e, { open: 0, happy: true }); break;
  }
  e.open = (e.open ?? 1) * open * (o.openK ?? 1);
  return e;
}

function drawMouth(ctx, m, k, expr, o, c, who) {
  const [mx, my] = m;
  ctx.save(); ctx.translate(mx, my); ctx.scale(k, 1);
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  const talk = o.talk ?? 0;
  const line = () => { ctx.strokeStyle = SKIN.line; ctx.lineWidth = 2.6; };
  if (expr === 'shout' || talk > 0.05) {
    const op = expr === 'shout' ? 1 : talk;
    const wdt = expr === 'shout' ? 30 : 18, hh = 6 + 30 * op;
    const p = new Path2D();
    p.moveTo(-wdt, -2); p.quadraticCurveTo(0, -8, wdt, -2); p.quadraticCurveTo(wdt * 0.7, hh, 0, hh); p.quadraticCurveTo(-wdt * 0.7, hh, -wdt, -2); p.closePath();
    ctx.fillStyle = SKIN.mouth; ctx.fill(p);
    ctx.save(); ctx.clip(p);
    ctx.fillStyle = SKIN.teeth; ctx.fillRect(-wdt, -10, wdt * 2, 10);
    ctx.fillStyle = SKIN.tongue; ctx.beginPath(); ctx.ellipse(0, hh, wdt * 0.6, hh * 0.45, 0, 0, TAU); ctx.fill();
    ctx.restore();
    line(); ctx.stroke(p);
  } else if (expr === 'grin') {
    const p = new Path2D();
    p.moveTo(-26, -6); p.quadraticCurveTo(0, -2, 26, -10); p.quadraticCurveTo(14, 16, -2, 14); p.quadraticCurveTo(-20, 10, -26, -6); p.closePath();
    ctx.fillStyle = SKIN.mouth; ctx.fill(p);
    ctx.save(); ctx.clip(p); ctx.fillStyle = SKIN.teeth; ctx.fillRect(-30, -14, 60, 12);
    if (who === 'Y') { ctx.fill(poly([12, -4, 18, -4, 15, 4])); }
    ctx.restore();
    line(); ctx.stroke(p);
  } else if (expr === 'smirk' || expr === 'sly') {
    line(); ctx.beginPath(); ctx.moveTo(-16, 2); ctx.quadraticCurveTo(2, 6, 18, -6); ctx.stroke();
    ctx.lineWidth = 1.8; ctx.beginPath(); ctx.moveTo(18, -6); ctx.lineTo(21, -10); ctx.stroke();
    if (expr === 'sly' && who === 'O') { // tiny fang
      ctx.fillStyle = '#FFFFFF'; ctx.beginPath(); ctx.moveTo(6, 3); ctx.lineTo(11, 2); ctx.lineTo(9, 9); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = SKIN.line; ctx.lineWidth = 1.2; ctx.stroke();
    }
  } else if (expr === 'shock') {
    const p = new Path2D(); p.ellipse(0, 6, 9, 12, 0, 0, TAU);
    ctx.fillStyle = SKIN.mouth; ctx.fill(p); line(); ctx.stroke(p);
  } else if (expr === 'happy') {
    const p = new Path2D(); p.moveTo(-18, -4); p.quadraticCurveTo(0, 22, 18, -4); p.closePath();
    ctx.fillStyle = SKIN.mouth; ctx.fill(p); line(); ctx.stroke(p);
  } else if (expr === 'calm') {
    line(); ctx.beginPath(); ctx.moveTo(-14, 0); ctx.quadraticCurveTo(0, 6, 14, -1); ctx.stroke();
  } else if (expr === 'determined') {
    line(); ctx.beginPath(); ctx.moveTo(-16, 2); ctx.quadraticCurveTo(0, -3, 16, 2); ctx.stroke();
  } else {
    line(); ctx.beginPath(); ctx.moveTo(-13, 0); ctx.quadraticCurveTo(0, 4, 13, 0); ctx.stroke();
  }
  ctx.restore();
}

// ------------------------------------------------------------ hair styles ---
function backHair(ctx, who, P, c, t, wind, o) {
  if (who === 'Y') {
    const locks = [
      { r: [-92, -40, -30], tip: [-168, 30, -40], w: 54, bend: 10, ph: 0 },
      { r: [92, -40, -30], tip: [170, 40, -40], w: 54, bend: -10, ph: 1 },
      { r: [-70, 20, -50], tip: [-120, 120, -50], w: 48, bend: 6, ph: 2 },
      { r: [70, 20, -50], tip: [126, 126, -50], w: 48, bend: -6, ph: 3 },
      { r: [0, 30, -60], tip: [10, 140, -60], w: 60, bend: 0, ph: 4 },
    ];
    drawLocks(ctx, P, locks, c, t, wind);
    flat(ctx, ellipsePath(P(0, -60, -10)[0], -56, 112, 118), c.hairShade, c.hairLine, 2);
  } else if (who === 'B') {
    // long ponytail streaming back
    const sw = Math.sin(t * 2.4) * 18 * wind, sw2 = Math.sin(t * 2.4 - 1.2) * 26 * wind;
    const a = P(-30, -40, -90), b = P(-180 + sw * 0.4, 120 + sw, -90), e = P(-250 + sw2, 330 + sw2 * 0.5, -90);
    const pt = new Path2D();
    pt.moveTo(a[0] + 30, a[1] - 20);
    pt.bezierCurveTo(b[0] + 70, b[1] - 40, e[0] + 40, e[1] - 60, e[0], e[1]);
    pt.bezierCurveTo(e[0] + 10, e[1] - 90, b[0] - 10, b[1] - 10, a[0] - 30, a[1] + 20);
    pt.closePath();
    cel(ctx, pt, c.hair, c.hairShade, { d: 10, line: c.hairLine });
    const locks = [
      { r: [-96, -40, -20], tip: [-126, 210, -30], w: 70, bend: 14, ph: 0, sway: 6 },
      { r: [96, -40, -20], tip: [128, 214, -30], w: 70, bend: -14, ph: 1, sway: 6 },
    ];
    drawLocks(ctx, P, locks, c, t, wind);
    crown(ctx, P, c, t, [
      { r: [10, -170, -20], tip: [-30, -238, -20], w: 30, bend: -16, ph: 2 },
      { r: [-40, -160, -20], tip: [-110, -196, -20], w: 34, bend: -10, ph: 1 },
    ]);
  } else if (who === 'O') {
    if ((o.hood ?? 0) < 0.5) {
      // high ponytail
      const sw = Math.sin(t * 2.8) * 22 * wind;
      const a = P(10, -150, -40), b = P(-150 + sw * 0.5, -250, -40), e = P(-250 + sw, 40 + sw * 0.6, -40);
      const pt = new Path2D();
      pt.moveTo(a[0] + 26, a[1]);
      pt.bezierCurveTo(b[0] + 90, b[1] - 80, e[0] - 40, e[1] - 160, e[0], e[1]);
      pt.bezierCurveTo(e[0] + 30, e[1] - 150, b[0] + 60, b[1] - 10, a[0] - 22, a[1] + 26);
      pt.closePath();
      cel(ctx, pt, c.hair, c.hairShade, { d: 10, line: c.hairLine });
      const locks = [
        { r: [-94, -30, -20], tip: [-112, 120, -30], w: 52, bend: 8, ph: 0 },
        { r: [94, -30, -20], tip: [114, 116, -30], w: 52, bend: -8, ph: 1 },
      ];
      drawLocks(ctx, P, locks, c, t, wind);
    }
    if ((o.hood ?? 0) < 0.5) crown(ctx, P, c, t, []);
  }
}

function frontHair(ctx, who, P, c, t, wind, o, yaw) {
  if (who === 'Y') {
    // spiky bangs under the helmet brim
    const locks = [
      { r: [-96, -96, 30], tip: [-118, -10, 40], w: 42, bend: 6 },
      { r: [96, -96, 30], tip: [120, -8, 40], w: 42, bend: -6 },
      { r: [-74, -104, 50], tip: [-82, -24, 62], w: 40, bend: 4 },
      { r: [74, -104, 50], tip: [86, -30, 62], w: 40, bend: -4 },
      { r: [-46, -112, 58], tip: [-40, -32, 70], w: 40, bend: -3 },
      { r: [46, -112, 58], tip: [52, -40, 70], w: 40, bend: 3 },
      { r: [-14, -116, 62], tip: [-6, -18, 74], w: 40, bend: -2 },
      { r: [18, -116, 62], tip: [26, -50, 74], w: 34, bend: 3 },
    ];
    // hair shadow on forehead
    ctx.save(); ctx.globalAlpha = 0.5; ctx.translate(0, 12);
    for (const L of locks) { const a = P(...L.r), b = P(...L.tip); ctx.fillStyle = SKIN.deep; ctx.fill(lockPath(a, b, L.w, L.bend)); }
    ctx.restore();
    drawLocks(ctx, P, locks, c, t, wind * 0.5);
  } else if (who === 'B') {
    const locks = [
      { r: [-100, -96, 20], tip: [-112, 70, 36], w: 48, bend: 8, ph: 0.5 },
      { r: [100, -96, 20], tip: [114, 74, 36], w: 48, bend: -8, ph: 1.5 },
      { r: [-70, -116, 48], tip: [-78, -14, 64], w: 44, bend: 6 },
      { r: [-36, -122, 56], tip: [-34, -30, 70], w: 42, bend: 4 },
      { r: [0, -124, 60], tip: [6, -22, 74], w: 40, bend: -3 },
      { r: [34, -122, 58], tip: [52, 38, 72], w: 50, bend: -8, sway: 6 }, // long lock over the eye
      { r: [70, -116, 48], tip: [86, -10, 64], w: 44, bend: -6 },
    ];
    ctx.save(); ctx.globalAlpha = 0.45; ctx.translate(0, 12);
    for (const L of locks.slice(2)) { const a = P(...L.r), b = P(...L.tip); ctx.fillStyle = SKIN.deep; ctx.fill(lockPath(a, b, L.w, L.bend)); }
    ctx.restore();
    drawLocks(ctx, P, locks, c, t, wind * 0.6);
    // angel-ring shine
    shine(ctx, P, c, -112);
  } else if (who === 'O') {
    if ((o.hood ?? 0) >= 0.5) return;
    const locks = [
      { r: [-98, -90, 20], tip: [-110, 40, 36], w: 44, bend: 8 },
      { r: [98, -90, 20], tip: [108, 30, 36], w: 44, bend: -8 },
      { r: [-86, -118, 40], tip: [-20, -20, 70], w: 56, bend: 16 }, // side-swept fringe
      { r: [-50, -126, 50], tip: [24, -30, 72], w: 52, bend: 14 },
      { r: [-12, -128, 56], tip: [62, -36, 70], w: 46, bend: 12 },
      { r: [30, -124, 56], tip: [90, -40, 60], w: 40, bend: 8 },
    ];
    ctx.save(); ctx.globalAlpha = 0.45; ctx.translate(0, 12);
    for (const L of locks.slice(2)) { const a = P(...L.r), b = P(...L.tip); ctx.fillStyle = SKIN.deep; ctx.fill(lockPath(a, b, L.w, L.bend)); }
    ctx.restore();
    drawLocks(ctx, P, locks, c, t, wind * 0.6);
    shine(ctx, P, c, -116);
  }
}
function crown(ctx, P, c, t, tufts) {
  drawLocks(ctx, P, tufts, c, t, 1);
  const cx = P(0, -60, -10)[0];
  const cap = ellipsePath(cx, -60, 114, 118);
  cel(ctx, cap, c.hair, c.hairShade, { d: 12, lx: -0.6, ly: -0.7, line: c.hairLine, lw: 2.2 });
  ctx.save(); ctx.clip(cap);
  ctx.strokeStyle = rgba(c.hairShade, 0.9); ctx.lineWidth = 2; ctx.lineCap = 'round';
  for (let k = -4; k <= 4; k++) {
    ctx.beginPath(); ctx.moveTo(cx + k * 6, -176);
    ctx.quadraticCurveTo(cx + k * 30, -150, cx + k * 27, -70); ctx.stroke();
  }
  ctx.restore();
}
function shine(ctx, P, c, y) {
  ctx.save();
  ctx.strokeStyle = rgba(c.hairHi, 0.85); ctx.lineCap = 'round';
  for (let k = -3; k <= 3; k++) {
    const a = P(k * 26 - 8, y + Math.abs(k) * 6, 70 - Math.abs(k) * 8), b = P(k * 26 + 8, y + 4 + Math.abs(k) * 6, 70 - Math.abs(k) * 8);
    ctx.lineWidth = 5 - Math.abs(k) * 0.5;
    ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
  }
  ctx.restore();
}

// ---------------------------------------------------------------- headgear ---
function headgear(ctx, who, P, c, t, o, yaw) {
  if (who === 'Y') {
    // kangaroo ears (behind shell top)
    const earSway = Math.sin(t * 4) * 0.05;
    for (const sx of [-1, 1]) {
      const base = P(sx * 52, -176, 0);
      ctx.save(); ctx.translate(base[0], base[1]); ctx.rotate(sx * 0.32 + earSway * sx);
      const ear = smoothPath([-24, 10, -30, -40, -18, -96, 0, -118, 18, -96, 30, -40, 24, 10], true, 0.45);
      cel(ctx, ear, '#FFD100', '#C98C00', { d: 6, line: INK, lw: 2.4 });
      ctx.fillStyle = '#E8862A';
      ctx.fill(smoothPath([-11, -4, -15, -42, -7, -86, 0, -96, 7, -86, 15, -42, 11, -4], true, 0.45));
      ctx.restore();
    }
    // half-helmet shell
    const shellPts = [[-120, -46, 0], [-114, -120, -10], [-70, -182, -10], [0, -206, -10], [70, -182, -10], [114, -120, -10], [120, -46, 0], [96, -88, 50], [50, -106, 66], [0, -112, 72], [-50, -106, 66], [-96, -88, 50]];
    const sp = smoothPath(shellPts.map(p => P(...p)).flat(), true, 0.35);
    cel(ctx, sp, '#FFD100', '#C98C00', { d: 12, rim: o.rim ? rgba(o.rim, 0.9) : null, rx: Math.sign(yaw || 1), ry: 0.3, rw: 5, line: INK, lw: 3 });
    // brim band
    const brim = [[-120, -46, 0], [-96, -88, 50], [-50, -106, 66], [0, -112, 72], [50, -106, 66], [96, -88, 50], [120, -46, 0]].map(p => P(...p));
    ctx.strokeStyle = INK; ctx.lineWidth = 16; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath(); brim.forEach((q, i) => i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1])); ctx.stroke();
    ctx.strokeStyle = '#2B2938'; ctx.lineWidth = 10;
    ctx.beginPath(); brim.forEach((q, i) => i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1])); ctx.stroke();
    // centre stripe + gloss
    const s0 = P(0, -110, 72), s1 = P(0, -206, -10);
    ctx.strokeStyle = '#1D1C27'; ctx.lineWidth = 14;
    ctx.beginPath(); ctx.moveTo(s0[0], s0[1] - 6); ctx.quadraticCurveTo(P(0, -190, 50)[0], -186, s1[0], s1[1]); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    const g0 = P(-70, -168, 30);
    ctx.save(); ctx.translate(g0[0], g0[1]); ctx.rotate(-0.55); ctx.beginPath(); ctx.ellipse(0, 0, 30, 7, 0, 0, TAU); ctx.fill(); ctx.restore();
    // goggles on the helmet front
    const gl = P(-40, -142, 70), gr = P(40, -142, 70);
    ctx.strokeStyle = INK; ctx.lineWidth = 10;
    ctx.beginPath(); ctx.moveTo(P(-118, -110, 10)[0], -110); ctx.quadraticCurveTo(P(0, -150, 76)[0], -150, P(118, -110, 10)[0], -110); ctx.stroke();
    for (const [g, n] of [[gl, -0.45], [gr, 0.45]]) {
      const fk = clamp(Math.cos(n - yaw), 0.35, 1);
      ctx.save(); ctx.translate(g[0], g[1]); ctx.scale(fk, 1);
      flat(ctx, ellipsePath(0, 0, 33, 26), '#2B2938', INK, 3);
      const lg = ctx.createLinearGradient(0, -22, 0, 22);
      lg.addColorStop(0, '#FF7A00'); lg.addColorStop(0.6, '#FFC233'); lg.addColorStop(1, '#FFF3B0');
      flat(ctx, ellipsePath(0, 0, 25, 19), lg, INK, 2);
      ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.beginPath(); ctx.ellipse(-8, -7, 9, 4, -0.5, 0, TAU); ctx.fill();
      ctx.restore();
    }
  } else if (who === 'B') {
    // hummingbird wing fins at the temples
    for (const sx of [-1, 1]) {
      const b = P(sx * 110, -24, 4);
      ctx.save(); ctx.translate(b[0], b[1]); ctx.scale(sx, 1); ctx.rotate(-0.35);
      const fin = poly([0, -10, 70, -44, 96, -40, 40, -6, 80, -16, 30, 10, 0, 12]);
      cel(ctx, fin, '#EAF4FF', '#7FA0D6', { d: 4, line: '#1C2A50', lw: 2 });
      neon(ctx, poly([8, -6, 70, -40], false), '#5FE0FF', 1.5, 0.8);
      ctx.restore();
    }
  } else if (who === 'O') {
    if ((o.hood ?? 0) >= 0.5) return;
    // fox-ear headset
    const band = [[-106, -96, 0], [-80, -170, -10], [0, -200, -10], [80, -170, -10], [106, -96, 0]].map(p => P(...p));
    ctx.strokeStyle = INK; ctx.lineWidth = 15; ctx.lineCap = 'round';
    ctx.beginPath(); band.forEach((q, i) => i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1])); ctx.stroke();
    ctx.strokeStyle = '#2A2226'; ctx.lineWidth = 9;
    ctx.beginPath(); band.forEach((q, i) => i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1])); ctx.stroke();
    for (const sx of [-1, 1]) {
      const b = P(sx * 66, -178, -4);
      ctx.save(); ctx.translate(b[0], b[1]); ctx.rotate(sx * 0.28 + Math.sin(t * 5 + sx) * 0.04);
      const ear = poly([-30, 8, 0, -70, 30, 8]);
      cel(ctx, ear, '#FF6A10', '#B33A00', { d: 5, line: INK, lw: 2.4 });
      ctx.fillStyle = '#2A1A16'; ctx.fill(poly([-15, 2, 0, -42, 15, 2]));
      ctx.restore();
      // ear cups
      const cup = P(sx * 106, -40, 0);
      flat(ctx, ellipsePath(cup[0], cup[1], 20, 30), '#2A2226', INK, 2.4);
      ctx.fillStyle = '#FF6A10'; ctx.fillRect(cup[0] - 4, cup[1] - 18, 8, 36);
    }
    // lightning hair clip
    const cl = P(70, -96, 56);
    ctx.save(); ctx.translate(cl[0], cl[1]); ctx.rotate(0.3);
    flat(ctx, poly([6, -24, -10, 2, 0, 2, -6, 24, 12, -4, 2, -4]), '#FFD23F', INK, 2);
    ctx.restore();
  }
}
function visorB(ctx, P, c, t, yaw, o) {
  const pts = [[-112, -40, 26], [-60, -46, 60], [0, -48, 72], [60, -46, 60], [112, -40, 26], [112, 18, 26], [60, 22, 60], [0, 24, 72], [-60, 22, 60], [-112, 18, 26]].map(p => P(...p));
  const v = smoothPath(pts.flat(), true, 0.25);
  ctx.save();
  ctx.fillStyle = 'rgba(80,210,255,0.22)'; ctx.fill(v);
  ctx.clip(v);
  ctx.strokeStyle = 'rgba(160,240,255,0.55)'; ctx.lineWidth = 1.4;
  const sc = (t * 40) % 20;
  for (let y = -48; y < 26; y += 5) { ctx.beginPath(); ctx.moveTo(-200, y + (sc % 5)); ctx.lineTo(200, y + (sc % 5)); ctx.globalAlpha = 0.18; ctx.stroke(); }
  ctx.globalAlpha = 1;
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.fill(poly([P(-90, -40, 40)[0], -40, P(-60, -40, 60)[0], -40, P(-110, 18, 30)[0], 18, P(-140, 18, 30)[0], 18]));
  ctx.restore();
  ctx.strokeStyle = 'rgba(190,245,255,0.9)'; ctx.lineWidth = 2.2; ctx.stroke(v);
  const top = new Path2D(); top.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < 5; i++) top.lineTo(pts[i][0], pts[i][1]);
  neon(ctx, top, '#5FE0FF', 2, 0.9);
  // tiny HUD text
  ctx.save(); ctx.font = font(9, FONT.orb, '900'); ctx.fillStyle = 'rgba(190,245,255,0.8)';
  const h0 = P(-96, 12, 40); ctx.fillText('SPD 99.9', h0[0], h0[1]);
  ctx.restore();
}
function hoodO(ctx, P, c, t, k, o) {
  ctx.save();
  ctx.globalAlpha = clamp(k * 2 - 1);
  const outer = [[-150, 200, 0], [-170, -40, -10], [-130, -190, -20], [0, -250, -10], [130, -190, -20], [170, -40, -10], [150, 200, 0]].map(p => P(...p));
  const inner = [[110, 170, 40], [120, -30, 50], [84, -150, 60], [0, -176, 70], [-84, -150, 60], [-120, -30, 50], [-110, 170, 40]].map(p => P(...p));
  const hood = new Path2D();
  smoothPath(outer.flat(), false, 0.4, hood);
  hood.lineTo(inner[0][0], inner[0][1]);
  smoothPath(inner.flat(), false, 0.4, hood);
  hood.closePath();
  // darkness inside the hood (face in shadow)
  const inn = smoothPath(inner.flat(), true, 0.4);
  ctx.save(); ctx.clip(inn);
  const dg = ctx.createLinearGradient(0, -180, 0, 160);
  dg.addColorStop(0, 'rgba(8,4,6,0.97)'); dg.addColorStop(0.55, 'rgba(14,6,8,0.9)'); dg.addColorStop(1, 'rgba(30,10,10,0.55)');
  ctx.fillStyle = dg; ctx.fillRect(-300, -300, 600, 600);
  ctx.restore();
  cel(ctx, hood, c.cloth, c.clothShade, { d: 14, line: INK, lw: 3, rim: o.rim ? rgba(o.rim, 0.8) : null, rw: 5 });
  // glowing eyes in the dark
  const eL = P(-44, 2, 66), eR = P(44, 2, 66);
  for (const [e, sd] of [[eL, -1], [eR, 1]]) {
    ctx.save(); ctx.translate(e[0], e[1]); ctx.scale(sd, 1);
    ctx.fillStyle = '#FFB347'; ctx.fill(poly([-24, 4, 2, -8, 26, -4, 6, 6]));
    ctx.restore();
    glow(ctx, e[0], e[1], 60, '#FF7A1A', 0.9);
  }
  if (o.mask) { // half mask over the mouth
    const m = [[-100, 40, 50], [0, 30, 100], [100, 40, 50], [90, 140, 50], [0, 170, 80], [-90, 140, 50]].map(p => P(...p));
    flat(ctx, smoothPath(m.flat(), true, 0.3), '#1A1416', INK, 2.4);
    ctx.strokeStyle = '#FF6A10'; ctx.lineWidth = 2;
    for (let k2 = -2; k2 <= 2; k2++) { const a = P(k2 * 18, 90, 96); ctx.beginPath(); ctx.moveTo(a[0], a[1] - 10); ctx.lineTo(a[0], a[1] + 10); ctx.stroke(); }
  }
  ctx.restore();
}

// ----------------------------------------------------------------- outfits ---
function drawOutfit(ctx, who, c, yaw, t, o) {
  const sw = c.shoulder, sx = yaw * 30;
  const body = smoothPath([sx - 46, 178, sx - sw * 0.75, 214, sx - sw, 276, sx - sw - 18, 560, sx + sw + 18, 560, sx + sw, 276, sx + sw * 0.75, 214, sx + 46, 178], true, 0.3);
  if (who === 'Y') {
    cel(ctx, body, c.cloth, c.clothShade, { d: 18, lx: -0.6, ly: -0.8, rim: o.rim ? rgba(o.rim, 0.8) : null, rw: 6 });
    ctx.save(); ctx.clip(body);
    // black side panels + zipper
    ctx.fillStyle = c.cloth2;
    ctx.fill(poly([sx - sw - 30, 300, sx - sw * 0.55, 330, sx - sw * 0.45, 600, sx - sw - 40, 600]));
    ctx.fill(poly([sx + sw + 30, 300, sx + sw * 0.55, 330, sx + sw * 0.45, 600, sx + sw + 40, 600]));
    ctx.fillStyle = '#FFE45C'; ctx.fillRect(sx - sw - 40, 296, sw * 2 + 80, 8);
    ctx.strokeStyle = '#1D1C27'; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(sx + 8, 210); ctx.lineTo(sx + 14, 600); ctx.stroke();
    // chest patch
    ctx.translate(sx - 90, 340); ctx.rotate(-0.04);
    flat(ctx, rrectPath(-46, -22, 92, 44, 8), '#1D1C27', INK, 2);
    ctx.font = font(26, FONT.sans, '900'); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#FFD100';
    ctx.fillText('美团', 0, 2);
    ctx.restore();
    ctx.lineWidth = 3; ctx.strokeStyle = INK; ctx.stroke(body);
  } else if (who === 'B') {
    cel(ctx, body, c.cloth, c.clothShade, { d: 18, lx: -0.6, ly: -0.8, rim: o.rim ? rgba(o.rim, 0.8) : null, rw: 6 });
    ctx.save(); ctx.clip(body);
    // coat lapels + inner turtleneck
    ctx.fillStyle = '#10131D'; ctx.fill(poly([sx - 50, 190, sx + 50, 190, sx + 70, 600, sx - 70, 600]));
    ctx.fillStyle = c.cloth; ctx.strokeStyle = INK; ctx.lineWidth = 2.5;
    const lapL = poly([sx - 52, 196, sx - 110, 250, sx - 60, 600, sx - 30, 600]); ctx.fill(lapL); ctx.stroke(lapL);
    const lapR = poly([sx + 52, 196, sx + 110, 250, sx + 60, 600, sx + 30, 600]); ctx.fill(lapR); ctx.stroke(lapR);
    neon(ctx, poly([sx - 110, 252, sx - 62, 600], false), c.accent, 2, 0.8);
    neon(ctx, poly([sx + 110, 252, sx + 62, 600], false), c.accent, 2, 0.8);
    // hummingbird pin
    ctx.translate(sx + 128, 330); ctx.scale(1.1, 1.1);
    ctx.fillStyle = '#EAF4FF'; ctx.fill(emblemPath('B'));
    ctx.restore();
    ctx.lineWidth = 3; ctx.strokeStyle = INK; ctx.stroke(body);
  } else if (who === 'O') {
    cel(ctx, body, c.cloth2, c.cloth2Shade, { d: 14 });
    ctx.save(); ctx.clip(body);
    // orange cloak over shoulders
    ctx.fillStyle = c.cloth;
    ctx.fill(smoothPath([sx - sw - 40, 600, sx - sw - 30, 280, sx - 90, 214, sx - 40, 300, sx - sw * 0.5, 600], true, 0.3));
    ctx.fill(smoothPath([sx + sw + 40, 600, sx + sw + 30, 280, sx + 90, 214, sx + 40, 300, sx + sw * 0.5, 600], true, 0.3));
    // straps
    ctx.strokeStyle = '#3A2E2A'; ctx.lineWidth = 12;
    ctx.beginPath(); ctx.moveTo(sx - 80, 230); ctx.lineTo(sx + 90, 560); ctx.stroke();
    ctx.fillStyle = '#FFD23F'; ctx.fillRect(sx + 6, 380, 16, 16);
    // lightning emblem
    ctx.translate(sx - 70, 400); ctx.scale(1.6, 1.6);
    ctx.fillStyle = '#FF6A10'; ctx.fill(poly([6, -24, -10, 2, 0, 2, -6, 24, 12, -4, 2, -4]));
    ctx.restore();
    ctx.lineWidth = 3; ctx.strokeStyle = INK; ctx.stroke(body);
    if ((o.hood ?? 0) < 0.5) { // hood bunched behind the neck
      flat(ctx, smoothPath([sx - 120, 230, sx - 70, 170, sx + 70, 170, sx + 120, 230, sx + 60, 214, sx - 60, 214], true, 0.4), c.clothShade, INK, 2.5);
    }
  }
}
function outfitCollar(ctx, who, c, yaw, t, o) {
  const sx = yaw * 26;
  if (who === 'Y') {
    // scarf wrapped around the neck, tail flowing
    const wrap = smoothPath([sx - 68, 166, sx, 186, sx + 68, 166, sx + 72, 204, sx, 226, sx - 72, 204], true, 0.4);
    cel(ctx, wrap, '#FFC800', '#C77F00', { d: 8, line: INK });
    const wd = o.wind ?? 1;
    const pts = [], N = 10;
    for (let i = 0; i <= N; i++) {
      const u = i / N;
      pts.push([sx + 50 + u * 270, 214 + Math.sin(t * 7 - u * 5) * 18 * u * wd + u * 40, 14 * (1 - u * 0.5)]);
    }
    const tail = new Path2D();
    tail.moveTo(pts[0][0], pts[0][1] - pts[0][2]);
    for (const q of pts) tail.lineTo(q[0], q[1] - q[2]);
    tail.lineTo(pts[N][0] - 18, pts[N][1] + 4);
    for (let i = N; i >= 0; i--) tail.lineTo(pts[i][0], pts[i][1] + pts[i][2]);
    tail.closePath();
    cel(ctx, tail, '#FFC800', '#C77F00', { d: 7, line: INK });
  } else if (who === 'B') {
    // tall white standing collar
    for (const s2 of [-1, 1]) {
      const col = poly([sx + s2 * 40, 104, sx + s2 * 92, 126, sx + s2 * 104, 236, sx + s2 * 50, 214]);
      cel(ctx, col, c.cloth2, c.cloth2Shade, { d: 6, line: INK, lw: 2.5 });
      neon(ctx, poly([sx + s2 * 92, 128, sx + s2 * 104, 234], false), c.accent, 1.6, 0.8);
    }
  } else if (who === 'O') {
    if (!o.mask) {
      flat(ctx, smoothPath([sx - 60, 186, sx, 200, sx + 60, 186, sx + 64, 222, sx, 236, sx - 64, 222], true, 0.4), '#2A2226', INK, 2.5);
    }
  }
}
