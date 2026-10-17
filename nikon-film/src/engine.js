// engine.js — Pictogram Motion core: palette, grid pattern, motifs, figure, type, easing.
'use strict';
const { createCanvas, GlobalFonts } = require('@napi-rs/canvas');
const path = require('path');

const FONT_DIR = path.join(__dirname, '..', 'fonts');
GlobalFonts.registerFromPath(path.join(FONT_DIR, 'NotoSansSC-Black.otf'), 'NotoBlack');
GlobalFonts.registerFromPath(path.join(FONT_DIR, 'NotoSansSC-Bold.otf'), 'NotoBold');
GlobalFonts.registerFromPath(path.join(FONT_DIR, 'Inter-Black.otf'), 'InterBlack');
GlobalFonts.registerFromPath(path.join(FONT_DIR, 'Inter-ExtraBold.otf'), 'InterXB');
GlobalFonts.registerFromPath(path.join(FONT_DIR, 'DMMono-Medium.ttf'), 'DMMono');

const W = 1920, H = 1080, CELL = 180, FPS = 24, BPM = 96;
const BEAT = 60 / BPM;            // 0.625 s = 15 frames
const ROWS = 6, PCOLS = 16, PW = PCOLS * CELL; // pattern wraps every 16 cells

// ---------- maths & easing ----------
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
const expOut = t => (t <= 0 ? 0 : t >= 1 ? 1 : 1 - Math.pow(2, -10 * t));
const expIn = t => (t <= 0 ? 0 : t >= 1 ? 1 : Math.pow(2, 10 * t - 10));
const expInOut = t => (t <= 0 ? 0 : t >= 1 ? 1 : t < 0.5 ? Math.pow(2, 20 * t - 10) / 2 : (2 - Math.pow(2, -20 * t + 10)) / 2);
const backOut = t => { const c = 1.9; t = clamp(t) - 1; return 1 + (c + 1) * t * t * t + c * t * t; };
const prog = (t, t0, dur) => clamp((t - t0) / dur);
const D2R = Math.PI / 180;

function rng(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

// ---------- colour ----------
const hex = h => { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const css = (c, a = 1) => (a >= 1 ? `rgb(${c[0] | 0},${c[1] | 0},${c[2] | 0})` : `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`);
const CREAM = hex('#F3EEE3'), INK = hex('#141416');

function makeHue(name, base, kind) {
  const b = hex(base);
  let t;
  if (kind === 'neutral') t = [hex('#101114'), hex('#17181C'), b, hex('#30323A'), hex('#464953')];
  else if (kind === 'light') t = [mix(b, INK, 0.5), mix(b, INK, 0.22), b, mix(b, CREAM, 0.42), mix(b, CREAM, 0.74)];
  else t = [mix(b, INK, 0.55), mix(b, INK, 0.28), b, mix(b, CREAM, 0.38), mix(b, CREAM, 0.68)];
  const light = kind === 'light';
  return {
    name, kind, t,
    type: light ? INK : CREAM,
    fig: light ? mix(INK, b, 0.08) : CREAM,
    disc: light ? t[4] : kind === 'neutral' ? t[4] : t[1],
    accent: kind === 'neutral' ? hex('#F2C200') : light ? INK : CREAM,
  };
}
const HUES = {
  KILN: makeHue('KILN', '#C4532F'),
  LAKE: makeHue('LAKE', '#12706A'),
  SENSOR: makeHue('SENSOR', '#2C52C4'),
  DUSK: makeHue('DUSK', '#6A3E8E'),
  LUMEN: makeHue('LUMEN', '#F2C200', 'light'),
  INK: makeHue('INK', '#1F2025', 'neutral'),
};
const ROTATION = ['LUMEN', 'KILN', 'LAKE', 'SENSOR', 'DUSK'];

// ---------- motif library (generic geometry only) ----------
const MOTIFS = ['quarter', 'half', 'scales', 'dots', 'tri', 'arcs', 'sun', 'checker', 'crescent', 'rings', 'bars', 'diamond'];
function motif(ctx, kind, x, y, s, rot, cA, cB) {
  ctx.save();
  ctx.beginPath(); ctx.rect(x, y, s, s); ctx.clip();
  ctx.fillStyle = cB; ctx.fillRect(x, y, s, s);
  ctx.translate(x + s / 2, y + s / 2); ctx.rotate(rot * Math.PI / 2); ctx.translate(-s / 2, -s / 2);
  ctx.fillStyle = cA; ctx.strokeStyle = cA;
  const P = () => ctx.beginPath();
  switch (kind) {
    case 'quarter': P(); ctx.moveTo(0, 0); ctx.arc(0, 0, s, 0, Math.PI / 2); ctx.fill(); break;
    case 'half': P(); ctx.arc(s / 2, s, s / 2, Math.PI, 0); ctx.fill(); break;
    case 'scales': {
      const r = s / 6;
      for (let j = 0; j < 4; j++) for (let i = -1; i < 4; i++) {
        const cx = i * 2 * r + (j % 2 ? r : 0) + r, cy = j * r * 1.5 + r;
        P(); ctx.arc(cx, cy, r, 0, Math.PI); ctx.fill();
      }
      break;
    }
    case 'dots': { const n = 4, g = s / n; for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) { P(); ctx.arc(g * (i + 0.5), g * (j + 0.5), g * 0.26, 0, 7); ctx.fill(); } break; }
    case 'tri': { const n = 3, g = s / n; for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) { P(); ctx.moveTo(i * g, (j + 1) * g); ctx.lineTo((i + 0.5) * g, j * g); ctx.lineTo((i + 1) * g, (j + 1) * g); ctx.fill(); } break; }
    case 'arcs': { ctx.lineWidth = s / 9; for (let k = 1; k <= 4; k++) { P(); ctx.arc(0, s, (k - 0.5) * s / 4.5, -Math.PI / 2, 0); ctx.stroke(); } break; }
    case 'sun': {
      P(); ctx.arc(s / 2, s / 2, s * 0.16, 0, 7); ctx.fill();
      for (let k = 0; k < 12; k++) { const a = k * Math.PI / 6, w = Math.PI / 18; P(); ctx.moveTo(s / 2 + Math.cos(a - w) * s * 0.24, s / 2 + Math.sin(a - w) * s * 0.24); ctx.arc(s / 2, s / 2, s * 0.46, a - w, a + w); ctx.lineTo(s / 2 + Math.cos(a + w) * s * 0.24, s / 2 + Math.sin(a + w) * s * 0.24); ctx.fill(); }
      break;
    }
    case 'checker': { const n = 4, g = s / n; for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) if ((i + j) % 2 === 0) ctx.fillRect(i * g, j * g, g, g); break; }
    case 'crescent': P(); ctx.arc(s / 2, s / 2, s * 0.4, 0, 7); ctx.fill(); ctx.fillStyle = cB; P(); ctx.arc(s * 0.66, s * 0.4, s * 0.34, 0, 7); ctx.fill(); break;
    case 'rings': { for (let k = 4; k >= 1; k--) { ctx.fillStyle = k % 2 ? cA : cB; P(); ctx.arc(s / 2, s / 2, s * 0.115 * k, 0, 7); ctx.fill(); } break; }
    case 'bars': { const g = s / 8; for (let k = 0; k < 4; k++) ctx.fillRect(0, (k * 2 + 0.5) * g, s, g); break; }
    case 'diamond': P(); ctx.moveTo(s / 2, s * 0.08); ctx.lineTo(s * 0.92, s / 2); ctx.lineTo(s / 2, s * 0.92); ctx.lineTo(s * 0.08, s / 2); ctx.fill(); break;
  }
  ctx.restore();
}

// ---------- grid pattern ----------
// Built in 2x2 blocks: a block is either one big disc spanning it, or four cells that each carry a motif or a flat tone.
// Rows (one cell tall) are blitted with independent offsets, which slices discs into half-discs.
const patCache = new Map();
const PAT_LRU = 14;
function pattern(hueName, seed, contrast = 1) {
  const key = `${hueName}|${seed}|${contrast}`;
  if (patCache.has(key)) { const c = patCache.get(key); patCache.delete(key); patCache.set(key, c); return c; }
  const hue = HUES[hueName];
  const pal = hue.t.map(c => mix(c, hue.t[2], 1 - contrast));
  const P = pal.map(c => css(c));
  const cv = createCanvas(PW, ROWS * CELL), ctx = cv.getContext('2d');
  const R = rng(seed * 7919 + hueName.length * 131);
  const pick = (not) => { let k; do { k = (R() * 5) | 0; } while (not.includes(k)); return k; };
  ctx.fillStyle = P[1]; ctx.fillRect(0, 0, PW, ROWS * CELL);
  for (let bj = 0; bj < ROWS / 2; bj++) for (let bi = 0; bi < PCOLS / 2; bi++) {
    const x = bi * 2 * CELL, y = bj * 2 * CELL;
    if (R() < 0.42) {
      const bg = pick([]), fg = pick([bg]);
      ctx.fillStyle = P[bg]; ctx.fillRect(x, y, 2 * CELL, 2 * CELL);
      ctx.fillStyle = P[fg]; ctx.beginPath(); ctx.arc(x + CELL, y + CELL, CELL, 0, 7); ctx.fill();
      const r = R();
      if (r < 0.35) { ctx.fillStyle = P[pick([fg])]; ctx.beginPath(); ctx.arc(x + CELL, y + CELL, CELL * 0.5, 0, 7); ctx.fill(); }
      else if (r < 0.55) { const c = pick([fg]); ctx.fillStyle = P[c]; ctx.beginPath(); ctx.arc(x + CELL, y + CELL, CELL * 0.72, 0, 7); ctx.fill(); ctx.fillStyle = P[fg]; ctx.beginPath(); ctx.arc(x + CELL, y + CELL, CELL * 0.44, 0, 7); ctx.fill(); }
    } else {
      for (let k = 0; k < 4; k++) {
        const cx = x + (k % 2) * CELL, cy = y + (k >> 1) * CELL;
        const bg = pick([]);
        if (R() < 0.55) motif(ctx, MOTIFS[(R() * MOTIFS.length) | 0], cx, cy, CELL, (R() * 4) | 0, P[pick([bg])], P[bg]);
        else { ctx.fillStyle = P[bg]; ctx.fillRect(cx, cy, CELL, CELL); }
      }
    }
  }
  patCache.set(key, cv);
  if (patCache.size > PAT_LRU) patCache.delete(patCache.keys().next().value);
  return cv;
}

// Blit one pattern row with a horizontal offset (wraps every PW px).
function drawRow(ctx, pat, r, off, dy = r * CELL, dx = 0, w = W) {
  let o = ((off % PW) + PW) % PW, x = dx, left = w;
  while (left > 0) {
    const seg = Math.min(left, PW - o);
    ctx.drawImage(pat, o, r * CELL, seg, CELL, x, dy, seg, CELL);
    x += seg; left -= seg; o = 0;
  }
}
function drawRows(ctx, pat, offFn) { for (let r = 0; r < ROWS; r++) drawRow(ctx, pat, r, offFn(r)); }

// ---------- figure ----------
// Unit = body height, origin at the hip. Limb angles: 0 = straight down, +90 = forward, 180 = up.
// Arms are relative to the torso; legs are relative to the body frame. Elbow/knee are relative bends.
const SEG = { torso: 0.31, uarm: 0.165, farm: 0.16, thigh: 0.24, shin: 0.245, head: 0.088, neck: 0.125 };
const LW = { limb: 0.074, torso: 0.118 };
const POSE0 = { x: 0, y: 0, rot: 0, tor: 0, hd: 0, an: [8, 10], af: [-8, 10], ln: [6, -4], lf: [-6, -4] };

function lerpPose(a, b, t) {
  const o = {};
  for (const k of new Set([...Object.keys(POSE0), ...Object.keys(a), ...Object.keys(b)])) {
    const va = a[k] ?? b[k] ?? POSE0[k], vb = b[k] ?? a[k] ?? POSE0[k];
    if (typeof va === 'string' || typeof va === 'boolean') { o[k] = t < 0.5 ? va : vb; continue; }
    o[k] = Array.isArray(va) ? [lerp(va[0], vb[0], t), lerp(va[1], vb[1], t)] : lerp(va, vb, t);
  }
  return o;
}
// Two-bone IK: returns [upperAbs, bendRel] in degrees (0 = down, +90 = forward).
function ik(o, tg, l1, l2, bend) {
  const dx = tg[0] - o[0], dy = tg[1] - o[1];
  const d = clamp(Math.hypot(dx, dy), 1e-4, (l1 + l2) * 0.9995);
  const a = Math.atan2(dx, dy) / D2R;
  const al = Math.acos(clamp((l1 * l1 + d * d - l2 * l2) / (2 * l1 * d), -1, 1)) / D2R;
  const be = Math.acos(clamp((l1 * l1 + l2 * l2 - d * d) / (2 * l1 * l2), -1, 1)) / D2R;
  return [a - bend * al, bend * (180 - be)];
}
// Resolve a pose spec: hand/foot targets (hn, hf, fn, ff, in unit body space) override limb angles.
function resolve(spec) {
  const p = Object.assign({}, POSE0, spec);
  const td = [Math.sin(p.tor * D2R), -Math.cos(p.tor * D2R)];
  const sh = [p.x + td[0] * SEG.torso * 0.9, p.y + td[1] * SEG.torso * 0.9];
  const hip = [p.x, p.y];
  const arm = (tg, bend) => { const [u, e] = ik(sh, tg, SEG.uarm, SEG.farm, bend); return [u - p.tor, e]; };
  if (spec.hn) p.an = arm(spec.hn, spec.bn ?? 1);
  if (spec.hf) p.af = arm(spec.hf, spec.bf ?? 1);
  if (spec.fn) p.ln = ik(hip, spec.fn, SEG.thigh, SEG.shin, spec.kn ?? -1);
  if (spec.ff) p.lf = ik(hip, spec.ff, SEG.thigh, SEG.shin, spec.kf ?? -1);
  return p;
}
// keys: [[beat, pose, ease?], ...]; actions land on integer beats.
function keyPose(keys, b) {
  if (b <= keys[0][0]) return lerpPose(keys[0][1], keys[0][1], 0);
  for (let i = 0; i < keys.length - 1; i++) {
    const [b0, p0] = keys[i], [b1, p1, e] = keys[i + 1];
    if (b < b1) { const t = (b - b0) / (b1 - b0); return lerpPose(p0, p1, (e || expInOut)(t)); }
  }
  return lerpPose(keys[keys.length - 1][1], keys[keys.length - 1][1], 0);
}

const dirDown = a => [Math.sin(a * D2R), Math.cos(a * D2R)];
function joints(p) {
  const hip = [p.x, p.y];
  const td = [Math.sin(p.tor * D2R), -Math.cos(p.tor * D2R)];
  const neck = [hip[0] + td[0] * SEG.torso, hip[1] + td[1] * SEG.torso];
  const sh = [hip[0] + td[0] * SEG.torso * 0.9, hip[1] + td[1] * SEG.torso * 0.9];
  const hdA = p.tor + p.hd;
  const head = [neck[0] + Math.sin(hdA * D2R) * SEG.neck * 0.62, neck[1] - Math.cos(hdA * D2R) * SEG.neck * 0.62 - SEG.head * 0.55];
  const arm = (a) => { const u = dirDown(a[0] + p.tor), f = dirDown(a[0] + p.tor + a[1]); const el = [sh[0] + u[0] * SEG.uarm, sh[1] + u[1] * SEG.uarm]; return [el, [el[0] + f[0] * SEG.farm, el[1] + f[1] * SEG.farm]]; };
  const leg = (a) => { const u = dirDown(a[0]), f = dirDown(a[0] + a[1]); const kn = [hip[0] + u[0] * SEG.thigh, hip[1] + u[1] * SEG.thigh]; return [kn, [kn[0] + f[0] * SEG.shin, kn[1] + f[1] * SEG.shin]]; };
  const [en, hn] = arm(p.an), [ef, hf] = arm(p.af), [kn, fn] = leg(p.ln), [kf, ff] = leg(p.lf);
  return { hip, neck, sh, head, en, hn, ef, hf, kn, fn, kf, ff };
}

// A figure view maps unit space to screen: origin (ox, oy), scale U px, facing f, whole-body rotation.
function view(ox, oy, U, f = 1, rot = 0) { return { ox, oy, U, f, rot }; }
function toScreen(v, p, pose) {
  const r = (pose ? pose.rot : 0) * D2R;
  const x = p[0] * v.f, y = p[1];
  const c = Math.cos(r * v.f), s = Math.sin(r * v.f);
  return [v.ox + (x * c - y * s) * v.U, v.oy + (x * s + y * c) * v.U];
}
function bar(ctx, a, b, w) { ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); }
function poly(ctx, pts, w) { ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]); ctx.stroke(); }

// Draw the figure; props(ctx, S, J, col) is called between far and near layers ('mid') or at the end ('front').
function drawFigure(ctx, v, pose, col, bg, props) {
  const J = joints(pose), S = {};
  for (const k in J) S[k] = toScreen(v, J[k], pose);
  const far = css(mix(col, bg, 0.4)), near = css(col);
  ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  const L = LW.limb * v.U;
  ctx.strokeStyle = far; ctx.fillStyle = far;
  if (props && props.back) props.back(ctx, S, J, far, v);
  poly(ctx, [S.sh, S.ef, S.hf], L);
  poly(ctx, [S.hip, S.kf, S.ff], L);
  ctx.strokeStyle = near; ctx.fillStyle = near;
  if (props && props.mid) props.mid(ctx, S, J, near, v);
  bar(ctx, S.hip, S.neck, LW.torso * v.U);
  poly(ctx, [S.hip, S.kn, S.fn], L);
  poly(ctx, [S.sh, S.en, S.hn], L);
  ctx.beginPath(); ctx.arc(S.head[0], S.head[1], SEG.head * v.U, 0, 7); ctx.fill();
  if (props && props.front) props.front(ctx, S, J, near, v);
  ctx.restore();
  return S;
}

// ---------- props (discs, rings, capsules, lines) ----------
const G = {
  disc(ctx, p, r, c) { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(p[0], p[1], r, 0, 7); ctx.fill(); },
  ring(ctx, p, r, w, c) { ctx.strokeStyle = c; ctx.lineWidth = w; ctx.beginPath(); ctx.arc(p[0], p[1], r, 0, 7); ctx.stroke(); },
  capsule(ctx, a, b, w, c) { ctx.strokeStyle = c; ctx.lineCap = 'round'; bar(ctx, a, b, w); },
  line(ctx, a, b, w, c) { ctx.strokeStyle = c; ctx.lineCap = 'butt'; bar(ctx, a, b, w); ctx.lineCap = 'round'; },
  rrect(ctx, x, y, w, h, r, c) { ctx.fillStyle = c; ctx.beginPath(); ctx.roundRect(x, y, w, h, r); ctx.fill(); },
  // A camera pictogram: body box + lens disc, centred at p, rotated by ang, size s (px of body width).
  camera(ctx, p, s, ang, c, bgc, lensLen = 0) {
    ctx.save(); ctx.translate(p[0], p[1]); ctx.rotate(ang);
    ctx.fillStyle = c;
    ctx.beginPath(); ctx.roundRect(-s / 2, -s * 0.32, s, s * 0.64, s * 0.12); ctx.fill();
    ctx.beginPath(); ctx.roundRect(-s * 0.18, -s * 0.48, s * 0.36, s * 0.22, s * 0.06); ctx.fill();
    if (lensLen > 0) { ctx.beginPath(); ctx.roundRect(s * 0.3, -s * 0.26, s * lensLen, s * 0.52, s * 0.1); ctx.fill(); }
    else { ctx.fillStyle = bgc; ctx.beginPath(); ctx.arc(0, s * 0.02, s * 0.2, 0, 7); ctx.fill(); ctx.fillStyle = c; ctx.beginPath(); ctx.arc(0, s * 0.02, s * 0.1, 0, 7); ctx.fill(); }
    ctx.restore();
  },
};

// ---------- type ----------
const FONTS = {
  zh: (px) => `900 ${px}px NotoBlack`,
  zhB: (px) => `700 ${px}px NotoBold`,
  lat: (px) => `900 ${px}px InterBlack`,
  latB: (px) => `800 ${px}px InterXB`,
  mono: (px) => `500 ${px}px DMMono`,
};
function fitSize(ctx, text, fontFn, maxPx, maxW, track = 0) {
  let px = maxPx;
  for (let i = 0; i < 30; i++) {
    ctx.font = fontFn(px); ctx.letterSpacing = `${track * px}px`;
    if (ctx.measureText(text).width <= maxW) break;
    px *= 0.94;
  }
  return Math.floor(px);
}
// Type slides up out of a mask. t is seconds since the line's own start.
function maskText(ctx, o) {
  const { text, font, x, y, color, t, dur = 0.42, px, align = 'left', track = 0 } = o;
  if (t <= 0 && !o.exit) return;
  const e = expOut(t / dur);
  const ex = o.exit ? expIn(clamp(o.exit)) : 0;
  ctx.save();
  ctx.font = font; ctx.letterSpacing = `${track * px}px`; ctx.textAlign = align;
  const w = ctx.measureText(text).width + px;
  const bx = align === 'center' ? x - w / 2 : align === 'right' ? x - w : x - px * 0.1;
  ctx.beginPath(); ctx.rect(bx, y - px * 1.05, w + px * 0.2, px * 1.38); ctx.clip();
  ctx.fillStyle = css(color, o.alpha ?? 1);
  ctx.fillText(text, x, y + (1 - e) * px * 1.3 - ex * px * 1.3);
  ctx.restore();
}
// Mono meta line that types on without a caret.
function typeOn(ctx, o) {
  const { text, x, y, px = 22, color, t, cps = 38, align = 'left', track = 0.18, alpha = 1 } = o;
  if (t <= 0) return;
  const n = Math.min(text.length, Math.floor(t * cps) + 1);
  ctx.save(); ctx.font = FONTS.mono(px); ctx.letterSpacing = `${track * px}px`; ctx.textAlign = 'left';
  ctx.fillStyle = css(color, alpha);
  const fw = ctx.measureText(text).width;
  const x0 = align === 'right' ? x - fw : align === 'center' ? x - fw / 2 : x;
  ctx.fillText(text.slice(0, n), x0, y);
  ctx.restore();
}
// Mono chip: rounded rectangle with text, revealed by mask slide-up.
function chip(ctx, o) {
  const { text, x, y, px = 22, fg, bg, t } = o;
  if (t <= 0) return;
  ctx.save(); ctx.font = FONTS.mono(px); ctx.letterSpacing = `${0.16 * px}px`;
  const w = ctx.measureText(text).width + px * 1.4, h = px * 1.9;
  const e = expOut(t / 0.4);
  ctx.beginPath(); ctx.rect(x - 2, y - 2, w + 4, h + 4); ctx.clip();
  ctx.translate(0, (1 - e) * h * 1.1);
  ctx.fillStyle = css(bg); ctx.beginPath(); ctx.roundRect(x, y, w, h, h / 2); ctx.fill();
  ctx.fillStyle = css(fg); ctx.textBaseline = 'middle'; ctx.fillText(text, x + px * 0.72, y + h / 2 + 1);
  ctx.restore();
  return w;
}

module.exports = {
  W, H, CELL, FPS, BPM, BEAT, ROWS, PW, createCanvas,
  clamp, lerp, expOut, expIn, expInOut, backOut, prog, rng, D2R,
  hex, mix, css, CREAM, INK, HUES, ROTATION,
  MOTIFS, motif, pattern, drawRow, drawRows,
  SEG, POSE0, keyPose, lerpPose, resolve, ik, joints, view, toScreen, drawFigure, bar, poly, G,
  FONTS, fitSize, maskText, typeOn, chip,
};
