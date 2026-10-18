'use strict';
// ============================================================================
//  KING OF DELIVERY — core: constants, math, deterministic randomness, colour,
//  canvas utilities. Every frame is a pure function of time t (seconds), so the
//  trailer can be rendered offline in parallel and scrubbed live.
// ============================================================================

const W = 1920, H = 1080, FPS = 24;
const BPM = 150, BEAT = 60 / BPM, BAR = BEAT * 4;
const DURATION = 119.2;
const TAU = Math.PI * 2;

const clamp = (x, a = 0, b = 1) => (x < a ? a : x > b ? b : x);
const lerp = (a, b, t) => a + (b - a) * t;
const seg = (t, a, b) => clamp((t - a) / (b - a));
const smoothstep = (a, b, t) => { const x = seg(t, a, b); return x * x * (3 - 2 * x); };
const fract = x => x - Math.floor(x);
const mod = (a, n) => ((a % n) + n) % n;
const pulse = (t, a, b) => (t >= a && t < b ? 1 : 0);

const Ease = {
  inQuad: t => t * t,
  outQuad: t => 1 - (1 - t) * (1 - t),
  inOutQuad: t => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2),
  inCubic: t => t * t * t,
  outCubic: t => 1 - Math.pow(1 - t, 3),
  inOutCubic: t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  outQuart: t => 1 - Math.pow(1 - t, 4),
  inQuart: t => t * t * t * t,
  outExpo: t => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t)),
  inExpo: t => (t <= 0 ? 0 : Math.pow(2, 10 * t - 10)),
  outBack: (t, s = 1.70158) => 1 + (s + 1) * Math.pow(t - 1, 3) + s * Math.pow(t - 1, 2),
  outElastic: t => (t <= 0 ? 0 : t >= 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * (TAU / 3)) + 1),
  inOutSine: t => -(Math.cos(Math.PI * t) - 1) / 2,
};

// ---------------------------------------------------------------- randomness
function hash1(n) {
  let x = Math.imul(n | 0, 0x27d4eb2d) ^ 0x165667b1;
  x = Math.imul(x ^ (x >>> 15), 0x85ebca6b);
  x = Math.imul(x ^ (x >>> 13), 0xc2b2ae35);
  x ^= x >>> 16;
  return (x >>> 0) / 4294967296;
}
const hash2 = (a, b) => hash1(Math.imul(a | 0, 0x9e3779b1) ^ Math.imul((b | 0) + 0x7f4a7c15, 0x85ebca77));
const hash3 = (a, b, c) => hash2(a, Math.imul(b | 0, 0x2545f491) ^ Math.imul((c | 0) + 0x632be5ab, 0xc2b2ae3d));

class RNG {
  constructor(seed) { this.s = (seed >>> 0) || 1; }
  next() {
    this.s = (this.s + 0x6d2b79f5) >>> 0;
    let t = this.s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  range(a, b) { return a + (b - a) * this.next(); }
  int(a, b) { return Math.floor(this.range(a, b + 1)); }
  pick(arr) { return arr[Math.floor(this.next() * arr.length) % arr.length]; }
  chance(p) { return this.next() < p; }
}

function vnoise(x, seed = 0) {
  const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f);
  return lerp(hash2(i, seed), hash2(i + 1, seed), u) * 2 - 1;
}
function fbm(x, seed = 0, oct = 3) {
  let s = 0, a = 0.5, f = 1;
  for (let i = 0; i < oct; i++) { s += a * vnoise(x * f, seed + i * 17); f *= 2.03; a *= 0.5; }
  return s;
}

// --------------------------------------------------------------------- colour
const _rgbCache = new Map();
function hexToRgb(h) {
  let v = _rgbCache.get(h);
  if (!v) { const n = parseInt(h.slice(1), 16); v = [(n >> 16) & 255, (n >> 8) & 255, n & 255]; _rgbCache.set(h, v); }
  return v;
}
function rgba(h, a = 1) { const c = hexToRgb(h); return `rgba(${c[0]},${c[1]},${c[2]},${a < 0 ? 0 : a > 1 ? 1 : a})`; }
function mixHex(a, b, t) {
  const A = hexToRgb(a), B = hexToRgb(b);
  return '#' + A.map((v, i) => Math.round(lerp(v, B[i], clamp(t))).toString(16).padStart(2, '0')).join('');
}
const shade = (h, t) => mixHex(h, '#000000', t);
const tint = (h, t) => mixHex(h, '#ffffff', t);

// --------------------------------------------------------------------- canvas
function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.ceil(w)); c.height = Math.max(1, Math.ceil(h));
  return c;
}
const _scratch = {};
function scratch(name, w, h) {
  let c = _scratch[name];
  if (!c || c.width !== w || c.height !== h) c = _scratch[name] = makeCanvas(w, h);
  const x = c.getContext('2d');
  x.setTransform(1, 0, 0, 1, 0, 0);
  x.globalAlpha = 1; x.globalCompositeOperation = 'source-over'; x.filter = 'none';
  x.clearRect(0, 0, c.width, c.height);
  return c;
}

// Emissive buffer: lights also paint here (half res); post blurs it into bloom,
// so only light sources glow and flat bright colours (yellow armour) stay crisp.
const EMIT = { c: null, g: null, main: null, k: 0.5, on: false };
function emitInit(mainCanvas) {
  EMIT.main = mainCanvas;
  EMIT.c = makeCanvas(W * EMIT.k, H * EMIT.k);
  EMIT.g = EMIT.c.getContext('2d');
}
function emitBegin() {
  if (!EMIT.g) return;
  const g = EMIT.g;
  g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; g.filter = 'none';
  g.clearRect(0, 0, EMIT.c.width, EMIT.c.height);
  EMIT.on = true;
}
function emitFor(ctx) {
  if (!EMIT.on || ctx.canvas !== EMIT.main) return null;
  const m = ctx.getTransform(), k = EMIT.k, g = EMIT.g;
  g.setTransform(m.a * k, m.b * k, m.c * k, m.d * k, m.e * k, m.f * k);
  g.globalCompositeOperation = 'lighter';
  return g;
}
// draw an image into the emissive buffer with ctx's current transform
function emitImage(ctx, img, x, y, w, h, a = 1) {
  const e = emitFor(ctx); if (!e) return;
  e.globalAlpha = clamp(a * ctx.globalAlpha);
  e.drawImage(img, x, y, w, h);
}
function emitFill(ctx, path, color, a = 1) {
  const e = emitFor(ctx); if (!e) return;
  e.globalAlpha = clamp(a * ctx.globalAlpha); e.fillStyle = color; e.fill(path);
}

const _glowCache = new Map();
function glowSprite(color, falloff = 2.2) {
  const key = color + falloff;
  let c = _glowCache.get(key);
  if (c) return c;
  c = makeCanvas(128, 128);
  const g = c.getContext('2d');
  const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  for (let i = 0; i <= 10; i++) {
    const s = i / 10;
    gr.addColorStop(s, rgba(color, Math.pow(1 - s, falloff)));
  }
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
  _glowCache.set(key, c);
  return c;
}
function glow(ctx, x, y, r, color, a = 1, falloff = 2.2, emit = 1) {
  if (a <= 0 || r <= 0) return;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = clamp(a * ctx.globalAlpha);
  const sp = glowSprite(color, falloff);
  ctx.drawImage(sp, x - r, y - r, r * 2, r * 2);
  if (emit > 0) emitImage(ctx, sp, x - r, y - r, r * 2, r * 2, emit);
  ctx.restore();
}
function glowEllipse(ctx, x, y, rx, ry, color, a = 1, rot = 0) {
  if (a <= 0) return;
  ctx.save();
  ctx.translate(x, y); ctx.rotate(rot); ctx.scale(1, ry / rx);
  ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = clamp(a * ctx.globalAlpha);
  ctx.drawImage(glowSprite(color), -rx, -rx, rx * 2, rx * 2);
  ctx.restore();
}

function poly(pts, close = true) {
  const p = new Path2D();
  p.moveTo(pts[0], pts[1]);
  for (let i = 2; i < pts.length; i += 2) p.lineTo(pts[i], pts[i + 1]);
  if (close) p.closePath();
  return p;
}
// smooth closed/open curve through points (Catmull-Rom -> Bezier)
function smoothPath(pts, close = true, tension = 0.5, path = new Path2D()) {
  const n = pts.length / 2;
  const P = i => {
    if (close) i = mod(i, n); else i = clamp(i, 0, n - 1);
    return [pts[i * 2], pts[i * 2 + 1]];
  };
  path.moveTo(pts[0], pts[1]);
  const last = close ? n : n - 1;
  for (let i = 0; i < last; i++) {
    const p0 = P(i - 1), p1 = P(i), p2 = P(i + 1), p3 = P(i + 2);
    const k = tension / 3 * 2;
    path.bezierCurveTo(
      p1[0] + (p2[0] - p0[0]) * k / 2, p1[1] + (p2[1] - p0[1]) * k / 2,
      p2[0] - (p3[0] - p1[0]) * k / 2, p2[1] - (p3[1] - p1[1]) * k / 2,
      p2[0], p2[1]);
  }
  if (close) path.closePath();
  return path;
}
function ellipsePath(x, y, rx, ry, rot = 0) { const p = new Path2D(); p.ellipse(x, y, rx, ry, rot, 0, TAU); return p; }
function circlePath(x, y, r) { const p = new Path2D(); p.arc(x, y, r, 0, TAU); return p; }
function rrectPath(x, y, w, h, r) { const p = new Path2D(); p.roundRect(x, y, w, h, r); return p; }

// capsule-shaped limb between two joints
function limbPath(x1, y1, x2, y2, w1, w2) {
  const a = Math.atan2(y2 - y1, x2 - x1);
  const nx = -Math.sin(a), ny = Math.cos(a);
  const p = new Path2D();
  p.moveTo(x1 + nx * w1, y1 + ny * w1);
  p.lineTo(x2 + nx * w2, y2 + ny * w2);
  p.arc(x2, y2, w2, a + Math.PI / 2, a - Math.PI / 2, true);
  p.lineTo(x1 - nx * w1, y1 - ny * w1);
  p.arc(x1, y1, w1, a - Math.PI / 2, a + Math.PI / 2, true);
  p.closePath();
  return p;
}

// two-bone IK: returns the middle joint
function ik(ax, ay, cx, cy, l1, l2, bend) {
  const dx = cx - ax, dy = cy - ay;
  const d = Math.min(Math.hypot(dx, dy), l1 + l2 - 0.01);
  const a = Math.atan2(dy, dx);
  const A = Math.acos(clamp((l1 * l1 + d * d - l2 * l2) / (2 * l1 * d), -1, 1));
  const ang = a + bend * A;
  return [ax + Math.cos(ang) * l1, ay + Math.sin(ang) * l1];
}

// cel-shaded fill: flat base, hard shadow band away from the key light,
// optional thin rim light, ink outline. Light direction is where light comes FROM.
const INK = '#0b0912';
function cel(ctx, path, base, dark, o = {}) {
  const lx = o.lx ?? -0.55, ly = o.ly ?? -0.85, d = o.d ?? 5;
  ctx.save();
  ctx.clip(path);
  if (o.rim) { ctx.fillStyle = o.rim; ctx.fill(path); ctx.translate(-(o.rx ?? 0.8) * (o.rw ?? 2.5), -(o.ry ?? 0.6) * (o.rw ?? 2.5)); }
  ctx.fillStyle = dark; ctx.fill(path);
  ctx.translate(lx * d, ly * d);
  ctx.fillStyle = base; ctx.fill(path);
  ctx.restore();
  if (o.line !== false) {
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    ctx.lineWidth = o.lw ?? 2.4; ctx.strokeStyle = o.line ?? INK; ctx.stroke(path);
  }
}
// armour plate defined in a local frame (origin ox,oy rotated by ang); the
// key light stays in world space so shading is consistent across plates
function plate(ctx, ox, oy, ang, pts, base, dark, o = {}) {
  ctx.save(); ctx.translate(ox, oy); ctx.rotate(ang);
  const lx = o.lx ?? -0.55, ly = o.ly ?? -0.85, c = Math.cos(-ang), s = Math.sin(-ang);
  const p = o.smooth ? smoothPath(pts, true, o.smooth) : poly(pts);
  const rx = o.rx ?? 0.8, ry = o.ry ?? 0.6;
  cel(ctx, p, base, dark, { ...o, lx: lx * c - ly * s, ly: lx * s + ly * c, rx: rx * c - ry * s, ry: rx * s + ry * c });
  ctx.restore();
  return p;
}

function flat(ctx, path, fill, line = INK, lw = 2.4) {
  ctx.fillStyle = fill; ctx.fill(path);
  if (line) { ctx.lineJoin = 'round'; ctx.lineWidth = lw; ctx.strokeStyle = line; ctx.stroke(path); }
}
function neon(ctx, path, color, w = 3, a = 1) {
  if (a <= 0) return;
  ctx.save();
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = clamp(a * ctx.globalAlpha);
  ctx.strokeStyle = rgba(color, 0.10); ctx.lineWidth = w * 7; ctx.stroke(path);
  ctx.strokeStyle = rgba(color, 0.28); ctx.lineWidth = w * 3; ctx.stroke(path);
  ctx.strokeStyle = tint(color, 0.55); ctx.lineWidth = w; ctx.stroke(path);
  const e = emitFor(ctx);
  if (e) {
    e.globalAlpha = clamp(a * ctx.globalAlpha); e.lineCap = 'round'; e.lineJoin = 'round';
    e.strokeStyle = color; e.lineWidth = w * 2.5; e.stroke(path);
  }
  ctx.restore();
}

// font shorthands (subset web fonts embedded at build time)
const FONT = {
  serif: '"Noto Serif SC", serif',
  sans: '"Noto Sans SC", sans-serif',
  brush: '"Ma Shan Zheng", "Noto Serif SC", serif',
  poster: '"ZCOOL QingKe HuangYou", "Noto Sans SC", sans-serif',
  anton: 'Anton, Impact, sans-serif',
  orb: 'Orbitron, monospace',
  raj: 'Rajdhani, sans-serif',
};
function font(size, fam, weight = '') { return `${weight} ${Math.round(size)}px ${fam}`.trim(); }

// spaced text (canvas letterSpacing is supported in Chromium, fall back manual)
function spacedText(ctx, str, x, y, spacing, mode = 'fill') {
  if ('letterSpacing' in ctx) {
    ctx.letterSpacing = spacing + 'px';
    const al = ctx.textAlign;
    // letterSpacing adds trailing space; compensate for centered text
    if (al === 'center') x += spacing / 2;
    if (mode === 'fill') ctx.fillText(str, x, y); else ctx.strokeText(str, x, y);
    ctx.letterSpacing = '0px';
    return;
  }
  if (mode === 'fill') ctx.fillText(str, x, y); else ctx.strokeText(str, x, y);
}
