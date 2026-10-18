'use strict';
// ============================================================================
//  FX library: rain, splashes, speed lines, sparks, lightning, shockwaves,
//  impact frames, anime typography, camera shake and post-processing.
// ============================================================================

// ------------------------------------------------------------------- rain ---
// Screen-space rain streaks. vx/vy in px/s; ts = time scale (slow motion).
function rain(ctx, t, o = {}) {
  const n = o.n ?? 380, seed = o.seed ?? 1;
  const vy = o.vy ?? 2600, vx = o.vx ?? -380;
  const ts = o.ts ?? 1;
  const sp = Math.hypot(vx, vy), dx = vx / sp, dy = vy / sp;
  const L0 = Math.max(o.minLen ?? 4, sp * (o.exp ?? 0.022) * Math.min(1, ts * 1.5));
  const tt = t * ts;
  const x0 = o.x0 ?? 0, x1 = o.x1 ?? W, y0 = o.y0 ?? -60, y1 = o.y1 ?? H + 60;
  const spanX = (x1 - x0) + 400, spanY = (y1 - y0) + 200;
  ctx.save();
  ctx.lineCap = 'round';
  ctx.strokeStyle = rgba(o.color ?? '#c8dcff', o.a ?? 0.32);
  ctx.lineWidth = o.w ?? 1.4;
  if (o.comp) ctx.globalCompositeOperation = o.comp;
  ctx.beginPath();
  for (let i = 0; i < n; i++) {
    const k = 0.65 + 0.7 * hash2(i, seed + 2);
    const y = y0 - 100 + mod(hash2(i, seed + 1) * spanY + vy * tt * k, spanY);
    const x = x0 - 200 + mod(hash2(i, seed) * spanX + vx * tt * k, spanX);
    const L = L0 * k;
    ctx.moveTo(x, y); ctx.lineTo(x - dx * L, y - dy * L);
  }
  ctx.stroke();
  if (o.dots) { // slow-motion: bright drop heads
    ctx.fillStyle = rgba('#ffffff', (o.a ?? 0.32) * 1.6);
    ctx.beginPath();
    for (let i = 0; i < n; i++) {
      const k = 0.65 + 0.7 * hash2(i, seed + 2);
      const y = y0 - 100 + mod(hash2(i, seed + 1) * spanY + vy * tt * k, spanY);
      const x = x0 - 200 + mod(hash2(i, seed) * spanX + vx * tt * k, spanX);
      const r = (o.w ?? 1.4) * 0.9;
      ctx.moveTo(x + r, y); ctx.arc(x, y, r, 0, TAU);
    }
    ctx.fill();
  }
  ctx.restore();
}
// three depth layers of rain
function rainLayers(ctx, t, o = {}) {
  const k = o.k ?? 1, ts = o.ts ?? 1, vx = o.vx ?? -380, col = o.color ?? '#c8dcff';
  const dots = ts < 0.3;
  rain(ctx, t, { n: Math.round(520 * k), seed: 11, vy: 2100, vx: vx * 0.8, a: 0.16, w: 1, ts, color: col, dots, minLen: 3 });
  rain(ctx, t, { n: Math.round(300 * k), seed: 23, vy: 2800, vx, a: 0.26, w: 1.6, ts, color: col, dots, minLen: 5 });
  if (o.near !== false) {
    rain(ctx, t, { n: Math.round(46 * k), seed: 37, vy: 3900, vx: vx * 1.3, a: 0.12, w: 5, ts, color: col, exp: 0.03, dots, minLen: 10 });
    rain(ctx, t, { n: Math.round(46 * k), seed: 37, vy: 3900, vx: vx * 1.3, a: 0.2, w: 2, ts, color: '#ffffff', exp: 0.03, minLen: 10 });
  }
}

// ground splashes (perspective-scaled). scroll shifts them with the ground.
function splashes(ctx, t, o = {}) {
  const n = o.n ?? 50, seed = o.seed ?? 5, rate = o.rate ?? 2.5;
  const y0 = o.y0 ?? H * 0.7, y1 = o.y1 ?? H, scroll = o.scroll ?? 0;
  ctx.save();
  ctx.lineWidth = 1.5;
  for (let i = 0; i < n; i++) {
    const r = rate * (0.8 + 0.4 * hash2(i, seed + 3));
    const ph = t * r + hash2(i, seed);
    const cyc = Math.floor(ph), p = (ph - cyc) / 0.4;
    if (p > 1) continue;
    const yy = lerp(y0, y1, hash3(i, cyc, seed + 1));
    const sc = lerp(0.35, 1.25, (yy - y0) / Math.max(1, y1 - y0)) * (o.scale ?? 1);
    const x = mod(hash3(i, cyc, seed) * (W + 200) - scroll, W + 200) - 100;
    const rr = (3 + 16 * Ease.outCubic(p)) * sc;
    ctx.strokeStyle = rgba(o.color ?? '#d7e6ff', 0.45 * (1 - p));
    ctx.beginPath(); ctx.ellipse(x, yy, rr, rr * 0.28, 0, 0, TAU); ctx.stroke();
    if (p < 0.6) {
      ctx.fillStyle = rgba('#ffffff', 0.5 * (1 - p / 0.6));
      for (let j = 0; j < 3; j++) {
        const a = -Math.PI / 2 + (j - 1) * 0.7;
        const d = 14 * sc * p * 1.4;
        const lift = (10 * sc) * Math.sin(p / 0.6 * Math.PI);
        ctx.fillRect(x + Math.cos(a) * d, yy - lift + Math.sin(a) * d * 0.2, 1.6 * sc, 1.6 * sc);
      }
    }
  }
  ctx.restore();
}

// water drops on the camera lens
function lensDrops(ctx, t, o = {}) {
  const n = o.n ?? 12, seed = o.seed ?? 77, a = o.a ?? 1;
  ctx.save();
  for (let i = 0; i < n; i++) {
    const r = 5 + 26 * Math.pow(hash2(i, seed + 2), 2);
    const slide = hash2(i, seed + 3) > 0.65 ? 40 + 120 * hash2(i, seed + 4) : 0;
    const x = hash2(i, seed) * W;
    const y = mod(hash2(i, seed + 1) * H + slide * t, H + 80) - 40;
    if (slide) {
      ctx.strokeStyle = `rgba(220,235,255,${0.05 * a})`; ctx.lineWidth = r * 0.5;
      ctx.beginPath(); ctx.moveTo(x, y - r); ctx.lineTo(x, y - r - 140); ctx.stroke();
    }
    const g = ctx.createRadialGradient(x - r * 0.25, y - r * 0.3, r * 0.1, x, y, r);
    g.addColorStop(0, `rgba(255,255,255,${0.10 * a})`);
    g.addColorStop(0.7, `rgba(180,200,255,${0.05 * a})`);
    g.addColorStop(0.93, `rgba(0,0,10,${0.22 * a})`);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
    ctx.fillStyle = `rgba(255,255,255,${0.55 * a})`;
    ctx.beginPath(); ctx.ellipse(x - r * 0.35, y - r * 0.4, r * 0.22, r * 0.12, -0.6, 0, TAU); ctx.fill();
    ctx.strokeStyle = `rgba(255,240,255,${0.25 * a})`; ctx.lineWidth = Math.max(1, r * 0.12);
    ctx.beginPath(); ctx.arc(x, y, r * 0.78, 0.3, 1.5); ctx.stroke();
  }
  ctx.restore();
}

// ------------------------------------------------------------ speed lines ---
function speedRadial(ctx, cx, cy, t, o = {}) {
  const n = o.n ?? 90, inner = o.inner ?? 320;
  const fr = Math.floor(t * (o.fps ?? 12));
  const R = Math.hypot(W, H) * 1.2;
  ctx.save();
  ctx.fillStyle = rgba(o.color ?? '#ffffff', o.a ?? 0.8);
  if (o.comp) ctx.globalCompositeOperation = o.comp;
  ctx.beginPath();
  for (let i = 0; i < n; i++) {
    const a = hash3(i, fr, 11) * TAU;
    const w = (0.003 + hash3(i, fr, 12) * 0.016) * (o.wk ?? 1);
    const r0 = inner * (0.75 + hash3(i, fr, 13) * 0.8);
    ctx.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0);
    ctx.lineTo(cx + Math.cos(a - w) * R, cy + Math.sin(a - w) * R);
    ctx.lineTo(cx + Math.cos(a + w) * R, cy + Math.sin(a + w) * R);
    ctx.closePath();
  }
  ctx.fill();
  ctx.restore();
}
function speedHorizontal(ctx, t, o = {}) {
  const n = o.n ?? 60, v = o.v ?? 5200, seed = o.seed ?? 3;
  const y0 = o.y0 ?? 0, y1 = o.y1 ?? H, dir = o.dir ?? -1;
  ctx.save();
  if (o.comp) ctx.globalCompositeOperation = o.comp;
  const col = o.color ?? '#ffffff';
  for (let i = 0; i < n; i++) {
    const len = 180 + 900 * hash2(i, seed + 1);
    const th = 1 + 4 * Math.pow(hash2(i, seed + 2), 3);
    const y = lerp(y0, y1, hash2(i, seed));
    const span = W + len * 2;
    let x = mod(hash2(i, seed + 3) * span + dir * v * (0.6 + 0.8 * hash2(i, seed + 4)) * t, span) - len;
    const g = ctx.createLinearGradient(x, 0, x + len, 0);
    const al = (o.a ?? 0.45) * (0.3 + 0.7 * hash2(i, seed + 5));
    g.addColorStop(0, rgba(col, 0)); g.addColorStop(dir < 0 ? 0.2 : 0.8, rgba(col, al)); g.addColorStop(1, rgba(col, 0));
    ctx.fillStyle = g;
    ctx.fillRect(x, y - th / 2, len, th);
  }
  ctx.restore();
}

// ----------------------------------------------------------------- sparks ---
function sparkColor(p) {
  if (p < 0.15) return '#ffffff';
  if (p < 0.4) return '#fff1a8';
  if (p < 0.7) return '#ffb03a';
  return '#ff5a1f';
}
function spark(ctx, x, y, age, i, o) {
  const seed = o.seed ?? 3;
  const L = (o.life ?? 0.55) * (0.35 + 0.65 * hash2(i, seed + 4));
  if (age < 0 || age > L) return;
  const a = (o.dir ?? -Math.PI / 2) + (hash2(i, seed) - 0.5) * (o.spread ?? Math.PI);
  const v = lerp(o.vmin ?? 250, o.vmax ?? 1300, hash2(i, seed + 1));
  const vx = Math.cos(a) * v + (o.wind ?? 0), vy = Math.sin(a) * v;
  const g = o.g ?? 1900;
  const px = x + vx * age, py = y + vy * age + 0.5 * g * age * age;
  const cvy = vy + g * age, k = o.streak ?? 0.022;
  const p = age / L;
  ctx.strokeStyle = sparkColor(p);
  ctx.globalAlpha = 1 - p * 0.7;
  ctx.lineWidth = (o.w ?? 2.6) * (1 - p * 0.6);
  ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px - vx * k, py - cvy * k); ctx.stroke();
}
function sparkBurst(ctx, x, y, age, o = {}) {
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
  const n = o.n ?? 40;
  for (let i = 0; i < n; i++) spark(ctx, x, y, age, i, o);
  ctx.restore();
  if (age >= 0 && age < 0.12) glow(ctx, x, y, (o.flash ?? 90) * (1 - age / 0.12), '#fff3c0', 0.9);
}
function sparkStream(ctx, x, y, t, o = {}) {
  const rate = o.rate ?? 70, life = o.life ?? 0.5;
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
  const i1 = Math.floor(t * rate), i0 = Math.floor((t - life) * rate);
  for (let i = i0; i <= i1; i++) {
    const age = t - i / rate;
    const ex = typeof x === 'function' ? x(i / rate) : x, ey = typeof y === 'function' ? y(i / rate) : y;
    spark(ctx, ex, ey, age, i, o);
  }
  ctx.restore();
  glow(ctx, typeof x === 'function' ? x(t) : x, typeof y === 'function' ? y(t) : y, o.flash ?? 60, '#ffd27a', 0.6 + 0.4 * hash1(Math.floor(t * 24)));
}

// -------------------------------------------------------------- lightning ---
function boltPoints(x0, y0, x1, y1, seed, rough = 0.3, depth = 7) {
  let pts = [[x0, y0], [x1, y1]];
  let disp = Math.hypot(x1 - x0, y1 - y0) * rough;
  for (let d = 0; d < depth; d++) {
    const np = [];
    for (let i = 0; i < pts.length - 1; i++) {
      const [ax, ay] = pts[i], [bx, by] = pts[i + 1];
      const len = Math.hypot(bx - ax, by - ay) || 1;
      const off = (hash3(seed, d, i) - 0.5) * disp;
      np.push(pts[i], [(ax + bx) / 2 - (by - ay) / len * off, (ay + by) / 2 + (bx - ax) / len * off]);
    }
    np.push(pts[pts.length - 1]);
    pts = np; disp *= 0.55;
  }
  return pts;
}
function strokeBolt(ctx, pts, color, w, a) {
  const p = new Path2D(); p.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) p.lineTo(pts[i][0], pts[i][1]);
  ctx.strokeStyle = rgba(color, 0.10 * a); ctx.lineWidth = w * 12; ctx.stroke(p);
  ctx.strokeStyle = rgba(color, 0.35 * a); ctx.lineWidth = w * 4; ctx.stroke(p);
  ctx.strokeStyle = rgba('#ffffff', a); ctx.lineWidth = w; ctx.stroke(p);
}
function lightning(ctx, x0, y0, x1, y1, seed, o = {}) {
  const a = o.a ?? 1; if (a <= 0) return;
  const color = o.color ?? '#b7a6ff', w = o.w ?? 3;
  const pts = boltPoints(x0, y0, x1, y1, seed, o.rough ?? 0.3, o.depth ?? 7);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter'; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  strokeBolt(ctx, pts, color, w, a);
  const nb = o.branches ?? 5;
  for (let b = 0; b < nb; b++) {
    const k = Math.floor(hash2(seed, b + 40) * pts.length * 0.75);
    const [sx, sy] = pts[k];
    const ang = Math.atan2(y1 - y0, x1 - x0) + (hash2(seed, b + 60) - 0.5) * 1.8;
    const len = Math.hypot(x1 - x0, y1 - y0) * (0.12 + 0.25 * hash2(seed, b + 80));
    const bp = boltPoints(sx, sy, sx + Math.cos(ang) * len, sy + Math.sin(ang) * len, seed * 7 + b, 0.35, 5);
    strokeBolt(ctx, bp, color, w * 0.5, a * 0.8);
  }
  ctx.restore();
}
// lightning flicker envelope: a few rapid flashes after t0
function flicker(t, t0, dur = 0.5) {
  const x = t - t0;
  if (x < 0 || x > dur) return 0;
  const k = Math.floor(x * 30);
  const on = [1, 0.3, 1, 0.8, 0.2, 0.6, 0.15, 0.4, 0.1, 0.25, 0.05][k] ?? 0;
  return on * (1 - x / dur * 0.5);
}

// -------------------------------------------------------- impact & shocks ---
function shockwave(ctx, x, y, p, o = {}) {
  if (p <= 0 || p >= 1) return;
  const R = (o.r ?? 900) * Ease.outCubic(p), a = 1 - p, sq = o.squash ?? 1;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.strokeStyle = rgba(o.color ?? '#ffffff', 0.85 * a);
  ctx.lineWidth = (o.w ?? 46) * (1 - p) + 2;
  ctx.beginPath(); ctx.ellipse(x, y, R, R * sq, 0, 0, TAU); ctx.stroke();
  ctx.strokeStyle = rgba(o.color2 ?? '#9fd8ff', 0.5 * a);
  ctx.lineWidth = 3;
  ctx.beginPath(); ctx.ellipse(x, y, R * 0.78, R * 0.78 * sq, 0, 0, TAU); ctx.stroke();
  ctx.restore();
}
// whole-frame negative / posterised "impact frame"
function impactFrame(ctx, mode = 0) {
  const s = scratch('impact', W, H), g = s.getContext('2d');
  g.filter = mode === 1 ? 'grayscale(1) contrast(7)' : 'grayscale(1) contrast(7) invert(1)';
  g.drawImage(ctx.canvas, 0, 0);
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.drawImage(s, 0, 0);
  ctx.restore();
}
function starburst(cx, cy, r0, r1, n, seed, rot = 0) {
  const p = new Path2D();
  for (let i = 0; i < n * 2; i++) {
    const a = rot + i / (n * 2) * TAU;
    const r = i % 2 === 0 ? r1 * (0.75 + 0.5 * hash2(i, seed)) : r0 * (0.85 + 0.3 * hash2(i, seed + 1));
    if (i === 0) p.moveTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r); else p.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
  }
  p.closePath();
  return p;
}

// ------------------------------------------------------------- typography ---
// fade envelope inside [a,b]
function env(t, a, b, fi = 0.15, fo = 0.15) {
  if (t < a || t > b) return 0;
  return clamp(Math.min(fi > 0 ? (t - a) / fi : 1, fo > 0 ? (b - t) / fo : 1));
}
// big anime title text: glow, hard drop shadow, ink outline, gradient fill
function titleText(ctx, str, x, y, size, o = {}) {
  ctx.save();
  ctx.font = font(size, o.font ?? FONT.serif, o.weight ?? '900');
  ctx.textAlign = o.align ?? 'center'; ctx.textBaseline = o.base ?? 'middle';
  const sp = o.spacing ?? 0;
  if (o.alpha !== undefined) ctx.globalAlpha = clamp(o.alpha);
  if (o.glow) {
    ctx.shadowColor = o.glow; ctx.shadowBlur = o.glowR ?? size * 0.35;
    ctx.fillStyle = o.glow; spacedText(ctx, str, x, y, sp);
    ctx.shadowBlur = 0; ctx.shadowColor = 'transparent';
  }
  if (o.shadow) {
    const d = o.sd ?? size * 0.06;
    ctx.fillStyle = o.shadow; ctx.strokeStyle = o.shadow;
    ctx.lineWidth = (o.sw ?? size * 0.09); ctx.lineJoin = 'round';
    spacedText(ctx, str, x + d, y + d, sp, 'stroke'); spacedText(ctx, str, x + d, y + d, sp);
  }
  if (o.stroke) {
    ctx.strokeStyle = o.stroke; ctx.lineWidth = o.sw ?? size * 0.09; ctx.lineJoin = 'round';
    spacedText(ctx, str, x, y, sp, 'stroke');
  }
  if (o.stroke2) { // inner light outline (manga SFX style)
    ctx.strokeStyle = o.stroke2; ctx.lineWidth = (o.sw2 ?? size * 0.045); ctx.lineJoin = 'round';
    spacedText(ctx, str, x, y, sp, 'stroke');
  }
  let fill = o.fill ?? '#ffffff';
  if (Array.isArray(fill)) {
    const g = ctx.createLinearGradient(0, y - size * 0.55, 0, y + size * 0.5);
    fill.forEach((c, i) => g.addColorStop(i / (fill.length - 1), c));
    fill = g;
  }
  ctx.fillStyle = fill;
  spacedText(ctx, str, x, y, sp);
  ctx.restore();
}
// manga-style onomatopoeia
function sfxText(ctx, str, x, y, size, o = {}) {
  ctx.save();
  ctx.translate(x, y); ctx.rotate(o.rot ?? -0.12);
  const sc = o.scale ?? 1; ctx.scale(sc, sc);
  if (o.alpha !== undefined) ctx.globalAlpha = clamp(o.alpha);
  if (o.burst) {
    const b = starburst(0, 0, size * 0.55, size * 1.05, 14, o.seed ?? 3);
    ctx.fillStyle = o.burst; ctx.fill(b);
    ctx.lineWidth = 5; ctx.strokeStyle = INK; ctx.stroke(b);
  }
  titleText(ctx, str, 0, 0, size, {
    font: o.font ?? FONT.brush, weight: '', fill: o.fill ?? ['#ffffff', o.color ?? '#ffd100'],
    stroke: INK, sw: size * 0.16, stroke2: o.stroke2 ?? '#ffffff', sw2: size * 0.07, spacing: o.spacing ?? 0,
  });
  ctx.restore();
}
// subtitle pair: Chinese line + English line
function subtitle(ctx, cn, en, a = 1, o = {}) {
  if (a <= 0) return;
  const y = o.y ?? H - 168;
  ctx.save();
  ctx.globalAlpha = clamp(a);
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = font(o.size ?? 54, o.font ?? FONT.serif, '900');
  ctx.lineJoin = 'round';
  ctx.strokeStyle = 'rgba(5,3,12,0.85)'; ctx.lineWidth = 10;
  spacedText(ctx, cn, W / 2, y, 6, 'stroke');
  ctx.fillStyle = o.color ?? '#ffffff';
  spacedText(ctx, cn, W / 2, y, 6);
  if (en) {
    ctx.font = font(o.enSize ?? 30, FONT.raj, '700');
    ctx.strokeStyle = 'rgba(5,3,12,0.85)'; ctx.lineWidth = 7;
    spacedText(ctx, en, W / 2, y + 58, 8, 'stroke');
    ctx.fillStyle = o.enColor ?? 'rgba(235,235,255,0.92)';
    spacedText(ctx, en, W / 2, y + 58, 8);
  }
  ctx.restore();
}
// typewriter: returns string revealed so far
function typed(str, t, cps = 18) { return Array.from(str).slice(0, Math.max(0, Math.floor(t * cps))).join(''); }

// glitch-sliced image of a text block drawn by fn into a scratch canvas
function glitchDraw(ctx, t, amt, drawFn, seed = 1) {
  const s = scratch('glitch', W, H), g = s.getContext('2d');
  drawFn(g);
  if (amt <= 0.001) { ctx.drawImage(s, 0, 0); return; }
  const fr = Math.floor(t * 24);
  const slices = 18;
  for (let i = 0; i < slices; i++) {
    const y0 = Math.floor(i * H / slices), h = Math.ceil(H / slices);
    const r = hash3(i, fr, seed);
    const off = r > 0.6 ? (hash3(i, fr, seed + 1) - 0.5) * 160 * amt : 0;
    ctx.drawImage(s, 0, y0, W, h, off, y0, W, h);
  }
  if (amt > 0.3) { // colour split ghost
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.35 * amt;
    ctx.drawImage(s, 10 * amt, 0); ctx.restore();
  }
}

// ------------------------------------------------------------------ camera ---
function shakeOffset(t, amp, freq = 26, seed = 0) {
  if (amp <= 0) return [0, 0, 0];
  return [fbm(t * freq, seed) * amp, fbm(t * freq, seed + 50) * amp, fbm(t * freq * 0.6, seed + 90) * amp * 0.0009];
}

// --------------------------------------------------------- post-processing ---
const Post = {
  ready: false,
  init() {
    // film grain tiles
    this.grainTiles = [];
    for (let k = 0; k < 4; k++) {
      const c = makeCanvas(256, 256), g = c.getContext('2d');
      const id = g.createImageData(256, 256);
      const r = new RNG(900 + k);
      for (let i = 0; i < id.data.length; i += 4) {
        const v = 128 + (r.next() + r.next() + r.next() - 1.5) * 110;
        id.data[i] = id.data[i + 1] = id.data[i + 2] = v; id.data[i + 3] = 255;
      }
      g.putImageData(id, 0, 0);
      this.grainTiles.push(c);
    }
    // vignette
    this.vig = makeCanvas(W, H);
    const v = this.vig.getContext('2d');
    const gr = v.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, H * 1.05);
    gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(0.6, 'rgba(0,0,0,0.35)'); gr.addColorStop(1, 'rgba(0,0,0,0.85)');
    v.fillStyle = gr; v.fillRect(0, 0, W, H);
    this.ready = true;
  },
  // emissive bloom (lights only) + a faint thresholded scene bloom
  bloom(ctx, s = 0.9, scene = 0.15) {
    EMIT.on = false;
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalCompositeOperation = 'lighter';
    if (EMIT.c && s > 0) {
      const a = scratch('bloomA', W / 4, H / 4), ag = a.getContext('2d');
      ag.filter = 'blur(3px)'; ag.drawImage(EMIT.c, 0, 0, W / 4, H / 4);
      const b = scratch('bloomB', W / 16, H / 16), bg = b.getContext('2d');
      bg.filter = 'blur(3px)'; bg.drawImage(EMIT.c, 0, 0, W / 16, H / 16);
      ctx.globalAlpha = clamp(s * 0.55); ctx.drawImage(a, 0, 0, W, H);
      ctx.globalAlpha = clamp(s * 0.75); ctx.drawImage(b, 0, 0, W, H);
    }
    if (scene > 0) {
      const a = scratch('bloomS', W / 8, H / 8), ag = a.getContext('2d');
      ag.filter = 'saturate(1.3) brightness(0.62) contrast(4) blur(2px)';
      ag.drawImage(ctx.canvas, 0, 0, W / 8, H / 8);
      ctx.globalCompositeOperation = 'screen';
      ctx.globalAlpha = clamp(scene); ctx.drawImage(a, 0, 0, W, H);
    }
    ctx.restore();
  },
  grain(ctx, t, a = 0.06) {
    if (a <= 0) return;
    const fr = Math.floor(t * FPS);
    const tile = this.grainTiles[fr % 4];
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalCompositeOperation = 'overlay'; ctx.globalAlpha = a;
    const ox = Math.floor(hash1(fr) * 256), oy = Math.floor(hash1(fr + 999) * 256);
    ctx.translate(-ox, -oy);
    ctx.fillStyle = ctx.createPattern(tile, 'repeat');
    ctx.fillRect(0, 0, W + 256, H + 256);
    ctx.restore();
  },
  vignette(ctx, a = 1) {
    if (a <= 0) return;
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = clamp(a); ctx.drawImage(this.vig, 0, 0); ctx.restore();
  },
  aberration(ctx, px) {
    if (px < 0.75) return;
    const src = scratch('abS', W, H); src.getContext('2d').drawImage(ctx.canvas, 0, 0);
    const chan = (name, col) => {
      const c = scratch(name, W, H), g = c.getContext('2d');
      g.drawImage(src, 0, 0); g.globalCompositeOperation = 'multiply'; g.fillStyle = col; g.fillRect(0, 0, W, H);
      return c;
    };
    const r = chan('abR', '#ff0000'), gr = chan('abG', '#00ff00'), b = chan('abB', '#0000ff');
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalCompositeOperation = 'source-over'; ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'lighter';
    ctx.drawImage(r, -px, 0); ctx.drawImage(gr, 0, 0); ctx.drawImage(b, px, px * 0.3);
    ctx.restore();
  },
  letterbox(ctx, k, h = 132) {
    if (k <= 0) return;
    const hh = Math.round(h * clamp(k));
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, W, hh); ctx.fillRect(0, H - hh, W, hh); ctx.restore();
  },
  flash(ctx, color, a, comp = 'source-over') {
    if (a <= 0) return;
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalCompositeOperation = comp;
    ctx.globalAlpha = clamp(a); ctx.fillStyle = color; ctx.fillRect(0, 0, W, H); ctx.restore();
  },
};

// halftone dot field (comic panel texture), faded by a radial mask
const _halftone = {};
function halftone(ctx, x, y, w, h, color, a = 0.25, step = 14, fade = true) {
  const key = color + step;
  if (!_halftone[key]) {
    const c = makeCanvas(step, step), g = c.getContext('2d');
    g.fillStyle = color; g.beginPath(); g.arc(step / 2, step / 2, step * 0.32, 0, TAU); g.fill();
    _halftone[key] = c;
  }
  const s = scratch('halftone', W, H), g = s.getContext('2d');
  g.fillStyle = g.createPattern(_halftone[key], 'repeat');
  g.fillRect(x, y, w, h);
  if (fade) {
    g.globalCompositeOperation = 'destination-in';
    const gr = g.createRadialGradient(x + w / 2, y + h / 2, 0, x + w / 2, y + h / 2, Math.max(w, h) * 0.6);
    gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(0.5, 'rgba(0,0,0,0.3)'); gr.addColorStop(1, 'rgba(0,0,0,1)');
    g.fillStyle = gr; g.fillRect(x, y, w, h);
  }
  ctx.save(); ctx.globalAlpha = a; ctx.drawImage(s, 0, 0); ctx.restore();
}
