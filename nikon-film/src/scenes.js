// scenes.js — card layouts, HUD, corner assembly, grid transitions and motion blur.
'use strict';
const E = require('./engine');
const { W, H, CELL, BEAT, FPS, ROWS, PW, HUES, css, mix, clamp, lerp, expOut, expIn, expInOut, pattern, drawRow,
  FONTS, fitSize, maskText, typeOn, chip, createCanvas, CREAM, INK, G, motif } = E;
const { drawAct, discColor, ACTS } = require('./stage');
const EDL = require('./edl');
const { shots, SECOND, ITEMS, FOCALS, BUILD_STEPS } = EDL;

const SX = 1410, SY = 515, SR = 345, FU = 468;      // stage centre, sun disc radius, figure unit
const TX = 150, TW = 800;                            // text column
const MASK_X0 = 990, MASK_X1 = 1085;                 // figure layer fades to zero before the text column
const N_ITEMS = ITEMS.length;
const RED = E.hex('#E5432F');

const mk = () => { const c = createCanvas(W, H); return { c, x: c.getContext('2d') }; };
const FIG = mk(), BAND = mk(), A = mk(), B = mk(), C = mk(), TMP = mk();

const pad2 = n => String(n).padStart(2, '0');
const frac = x => x - Math.floor(x);
const dirOf = r => (r % 2 ? 1 : -1);

// ---------- backgrounds ----------
function rowsBg(ctx, hue, seed, contrast, offFn) {
  const pat = pattern(hue, seed, contrast);
  for (let r = 0; r < ROWS; r++) drawRow(ctx, pat, r, offFn(r));
}
const driftOff = (seed, t, speed = 14) => r => (seed * 613 + r * 977) % PW + dirOf(r) * speed * t;
function lowBg(ctx, hue, seed, t) { rowsBg(ctx, hue, seed, 0.2, driftOff(seed, t)); }

function sunDisc(ctx, th, kind, tl, len, cx = SX, cy = SY, R = SR) {
  ctx.fillStyle = css(discColor(th, kind)); ctx.beginPath(); ctx.arc(cx, cy, R, 0, 7); ctx.fill();
  // the one soft light sweep
  ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, R, 0, 7); ctx.clip();
  ctx.translate(cx, cy); ctx.rotate(-0.38);
  const x = lerp(-R - 300, R + 300, clamp(tl / len));
  const g = ctx.createLinearGradient(x - 220, 0, x + 220, 0);
  g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.5, `rgba(255,255,255,${th.kind === 'light' ? 0.16 : 0.075})`); g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g; ctx.fillRect(-R * 1.5, -R * 1.5, R * 3, R * 3);
  ctx.restore();
}

// ---------- figure layer: own buffer, masked before the text column, assembled from sliding bands ----------
function bandCompose(ctx, src, tl, dur, n = 10, amp = 560, y0 = 0, y1 = H) {
  const h = (y1 - y0) / n;
  if (tl >= dur + 0.03 * n) { ctx.drawImage(src, 0, 0); return; }
  const bx = BAND.x; bx.clearRect(0, 0, W, H);
  for (let i = 0; i < n; i++) {
    const p = expOut(clamp((tl - 0.03 * i) / dur));
    if (p <= 0) continue;
    const dx = dirOf(i) * (1 - p) * amp, y = y0 + i * h;
    bx.drawImage(src, 0, y, W, h + 1, dx, y, W, h + 1);
  }
  maskFig(bx);
  ctx.drawImage(BAND.c, 0, 0);
}
function maskFig(fctx, x0 = MASK_X0, x1 = MASK_X1) {
  fctx.globalCompositeOperation = 'destination-in';
  const g = fctx.createLinearGradient(x0, 0, x1, 0);
  g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,1)');
  fctx.fillStyle = g; fctx.fillRect(0, 0, W, H);
  fctx.globalCompositeOperation = 'source-over';
}
function figureLayer(ctx, act, bl, th, tl, dur = 0.5) {
  const f = FIG.x; f.clearRect(0, 0, W, H);
  drawAct(f, act, bl, th, SX, SY, FU, { R: SR });
  maskFig(f);
  bandCompose(ctx, FIG.c, tl, dur);
}

// ---------- corner assembly (front-view camera built part by part) ----------
function camFront(ctx, cx, cy, w, step, col, bg, newStep = 0, np = 1) {
  const C_ = css(col), B_ = css(bg), h = w * 0.62, top = cy - h / 2;
  const show = k => step >= k && (k !== newStep || np > 0);
  const sc = k => (k === newStep ? expOut(np) : 1);
  ctx.save();
  if (show(8)) { const s = sc(8); G.capsule(ctx, [cx - 0.34 * w, top - 0.27 * w * s], [cx + 0.08 * w, top - 0.27 * w * s], 0.05 * w, C_); G.line(ctx, [cx - 0.3 * w, top - 0.27 * w * s], [cx - 0.3 * w, top], 0.04 * w, C_); }
  if (show(3)) { const s = sc(3); G.rrect(ctx, cx - w / 2 * s, cy - h / 2 * s, w * s, h * s, w * 0.09, C_); G.rrect(ctx, cx + 0.22 * w, top - 0.06 * w, 0.14 * w, 0.08 * w, 0.02 * w, C_); }
  if (show(4)) {
    const s = sc(4);
    if (step >= 7 && show(7)) G.rrect(ctx, cx - 0.18 * w, top - 0.16 * w * s, 0.36 * w, 0.2 * w, 0.05 * w, C_);
    else { ctx.fillStyle = C_; ctx.beginPath(); ctx.moveTo(cx - 0.22 * w, top + 2); ctx.lineTo(cx - 0.13 * w, top - 0.2 * w * s); ctx.lineTo(cx + 0.13 * w, top - 0.2 * w * s); ctx.lineTo(cx + 0.22 * w, top + 2); ctx.fill(); }
    const Rm = (step >= 7 ? 0.335 : 0.29) * w * s;
    G.disc(ctx, [cx, cy + 0.03 * w], Rm, B_); G.disc(ctx, [cx, cy + 0.03 * w], Rm - 0.032 * w, C_);
  }
  if (show(2)) { const s = sc(2); G.disc(ctx, [cx, cy + 0.03 * w], 0.235 * w * s, step >= 3 ? B_ : C_); G.disc(ctx, [cx, cy + 0.03 * w], 0.195 * w * s, step >= 3 ? C_ : B_); }
  if (show(1)) { const s = sc(1); G.disc(ctx, [cx, cy + 0.03 * w], 0.14 * w * s, css(mix(col, bg, 0.5))); G.disc(ctx, [cx - 0.05 * w, cy - 0.02 * w], 0.032 * w * s, C_); }
  if (show(5)) { const s = sc(5) * 0.12 * w; G.rrect(ctx, cx - 0.42 * w, top + 0.07 * w, s, s, 0.015 * w, B_); G.rrect(ctx, cx - 0.42 * w + s * 0.25, top + 0.07 * w + s * 0.25, s * 0.5, s * 0.5, 0.01 * w, C_); }
  if (show(6)) G.disc(ctx, [cx + 0.36 * w, top + 0.13 * w], 0.04 * w * sc(6), css(RED));
  ctx.restore();
}
function buildWidget(ctx, sh, tl, th) {
  const step = EDL.buildAt(sh.idx);
  if (step <= 0) return;
  const isNew = sh.it && sh.it.build === step;
  const np = isNew ? clamp((tl - 2 * BEAT) / 0.35) : 1;
  const col = th.type, bg = th.t[2];
  camFront(ctx, 1790, 958, 112, step, col, bg, isNew ? step : 0, np);
  if (isNew) { const t = (tl - 2 * BEAT) / 0.5; if (t > 0 && t < 1) G.ring(ctx, [1790, 962], 110 * expOut(t), 6 * (1 - t), css(col)); }
  const shown = isNew && np <= 0 ? step - 1 : step;
  typeOn(ctx, { text: shown ? `BUILD ${pad2(shown)} / 08 · ${BUILD_STEPS[shown - 1]}` : 'BUILD 00 / 08', x: 1860, y: 1034, px: 19, color: col, t: 9, align: 'right', alpha: 0.85 });
}

// ---------- HUD ----------
function hudTop(ctx, th, right, tl) {
  typeOn(ctx, { text: 'NIKON  ·  1917 — 2025', x: 60, y: 74, px: 20, color: th.type, t: 9, alpha: 0.85 });
  if (right) typeOn(ctx, { text: right, x: 1860, y: 74, px: 20, color: th.type, t: tl - 0.05, align: 'right', alpha: 0.85 });
}
function ticks(ctx, th, cur, tl, o = {}) {
  const x0 = 60, base = 1036, step = 17, N = o.N || N_ITEMS, gone = o.gone ?? N;
  ctx.save(); ctx.fillStyle = css(th.type);
  for (let i = 0; i < Math.min(N, gone); i++) {
    let h = 16, a = 0.2;
    if (i + 1 < cur) { a = 0.55; }
    if (i + 1 === cur) { h = lerp(16, 42, expOut(clamp(tl / 0.3))); a = 1; }
    if (o.allDone) { a = 0.55; h = 16; }
    ctx.globalAlpha = a; ctx.fillRect(x0 + i * step, base - h, 6, h);
  }
  ctx.restore();
  if (o.label !== false) typeOn(ctx, { text: o.label || `${pad2(Math.max(cur, 0))} / ${pad2(N)}`, x: x0 + N * step + 18, y: base, px: 20, color: th.type, t: tl, alpha: 0.85 });
}
const chLabel = ch => `CH ${pad2(ch.n)} · ${ch.en}`;

// ---------- cards ----------
function secondLine(ctx, text, y, th, tl, px = 46) {
  const font = SECOND === 'en' ? FONTS.latB(px) : FONTS.zhB(px + 2);
  maskText(ctx, { text, font, px, x: TX, y, color: th.type, t: tl, track: SECOND === 'en' ? -0.005 : 0.02, alpha: 0.92 });
}
function itemCard(ctx, sh, t) {
  const th = HUES[sh.hue], tl = t - sh.t0, bl = tl / BEAT, it = sh.it;
  lowBg(ctx, sh.hue, sh.seed, t);
  const st = ACTS[it.act](bl, th).stage || {};
  sunDisc(ctx, th, st.disc, tl, sh.len * BEAT);
  figureLayer(ctx, it.act, bl, th, tl);
  const yearCol = th.t[4];
  const Y = 440;
  maskText(ctx, { text: String(it.year), font: FONTS.lat(200), px: 200, x: TX - 10, y: Y, color: yearCol, t: tl, track: -0.035 });
  const px = fitSize(ctx, it.zh, FONTS.zh, 150, TW, -0.02);
  const ty = Y + 46 + px * 0.86;
  maskText(ctx, { text: it.zh, font: FONTS.zh(px), px, x: TX, y: ty, color: th.type, t: tl - 0.08, track: -0.02 });
  secondLine(ctx, SECOND === 'en' ? it.en : it.sub, ty + 82, th, tl - 0.16);
  chip(ctx, { text: it.tag, x: TX, y: ty + 116, px: 21, fg: th.t[1], bg: th.type, t: tl - 0.3 });
  hudTop(ctx, th, chLabel(sh.ch), tl);
  ticks(ctx, th, sh.no, tl);
  buildWidget(ctx, sh, tl, th);
}
// Count that rolls to its value and lands on a beat.
function countText(v, dec) { return dec ? v.toFixed(1) : String(Math.round(v)); }
function specCard(ctx, sh, t) {
  const th = HUES[sh.hue], tl = t - sh.t0, bl = tl / BEAT, it = sh.it;
  lowBg(ctx, sh.hue, sh.seed, t);
  sunDisc(ctx, th, null, tl, sh.len * BEAT);
  figureLayer(ctx, it.act, bl, th, tl);
  maskText(ctx, { text: String(it.year), font: FONTS.lat(150), px: 150, x: TX - 8, y: 290, color: th.t[4], t: tl, track: -0.035 });
  maskText(ctx, { text: it.zh, font: FONTS.zh(124), px: 124, x: TX + 430, y: 290, color: th.type, t: tl - 0.08, track: -0.02 });
  secondLine(ctx, SECOND === 'en' ? it.en : it.sub, 372, th, tl - 0.16, 42);
  // 0 → 55 over the stripped bar (beats 0–4), lands on beat 4; 46.5 → 16 over beats 4–8, lands on beat 8.
  const a = bl < 4 ? 55 * expInOut(clamp(bl / 4)) : 55;
  const bv = bl < 4 ? 46.5 : lerp(46.5, 16, expInOut(clamp((bl - 4.05) / 3.6)));
  const NUM = 210;
  const row = (txt, y, col, tl0, zh, meta) => {
    ctx.font = FONTS.lat(NUM); ctx.letterSpacing = `${-0.04 * NUM}px`;
    const w = ctx.measureText(txt).width;
    maskText(ctx, { text: txt, font: FONTS.lat(NUM), px: NUM, x: TX - 10, y, color: col, t: tl0, track: -0.04 });
    maskText(ctx, { text: 'mm', font: FONTS.lat(72), px: 72, x: TX + w + 4, y, color: col, t: tl0 - 0.06 });
    maskText(ctx, { text: zh, font: FONTS.zhB(38), px: 38, x: TX + w + 150, y: y - 112, color: col, t: tl0 - 0.12 });
    typeOn(ctx, { text: meta, x: TX + w + 150, y: y - 60, px: 20, color: col, t: tl0 - 0.18, alpha: 0.9 });
  };
  row(countText(a, false), 610, th.type, tl - 0.12, '内径', 'INNER Ø');
  if (bl >= 3.7) row(countText(bv, bv > 16.05), 870, th.t[4], (bl - 3.7) * BEAT, '法兰距', 'F 46.5 — Z 16');
  hudTop(ctx, th, chLabel(sh.ch), tl);
  ticks(ctx, th, sh.no, tl);
  buildWidget(ctx, sh, tl, th);
}
function chapterCard(ctx, sh, t) {
  const th = HUES[sh.hue], tl = t - sh.t0, bl = tl / BEAT, ch = sh.ch;
  // full-contrast pattern; rows jump a quarter cell on every beat
  rowsBg(ctx, sh.hue, sh.seed, 1, r => (sh.seed * 389 + r * 571) % PW + dirOf(r) * (CELL / 4) * (Math.floor(bl) + expOut(clamp(frac(bl) / 0.28))) + dirOf(r) * 8 * tl);
  const block = th.kind === 'light' ? INK : th.t[0];
  for (let k = 0; k < 3; k++) {
    const p = expOut(clamp((tl - 0.05 * k) / 0.42));
    ctx.fillStyle = css(block); ctx.fillRect(-(1 - p) * 1000, (2 + k) * CELL - (k === 0 ? 0 : 1), 5 * CELL, CELL + 1);
  }
  const acc = th.kind === 'light' ? th.t[2] : th.t[4];
  typeOn(ctx, { text: `CHAPTER ${pad2(ch.n)}`, x: TX, y: 2 * CELL + 64, px: 22, color: acc, t: tl - 0.15 });
  maskText(ctx, { text: ch.zh, font: FONTS.zh(270), px: 270, x: TX - 12, y: 2 * CELL + 340, color: CREAM, t: tl - 0.12, track: -0.02 });
  maskText(ctx, { text: ch.en, font: FONTS.lat(56), px: 56, x: TX, y: 2 * CELL + 440, color: CREAM, t: tl - 0.22, track: 0.02 });
  typeOn(ctx, { text: ch.range, x: TX + 5 * CELL - 60, y: 2 * CELL + 436, px: 22, color: acc, t: tl - 0.3, align: 'right' });
  const hth = { type: CREAM };
  hudTop(ctx, hth, chLabel(ch), tl);
}
function focalCard(ctx, sh, t) {
  const th = HUES[sh.hue], tl = t - sh.t0, bl = tl / BEAT, fo = sh.fo;
  lowBg(ctx, sh.hue, sh.seed, t);
  const st = ACTS[fo.act](bl, th).stage || {};
  sunDisc(ctx, th, st.disc, tl, sh.len * BEAT);
  figureLayer(ctx, fo.act, bl, th, tl, 0.3);
  // viewfinder brackets tighten onto the subject on beat 1
  const k = lerp(1.1, 1, expOut(clamp((bl - 0.85) / 0.3))), R = (SR + 26) * k, L = 64;
  ctx.save(); ctx.strokeStyle = css(th.type); ctx.lineWidth = 5; ctx.lineCap = 'butt';
  for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) { const x = SX + sx * R, y = SY + sy * R; ctx.beginPath(); ctx.moveTo(x - sx * L, y); ctx.lineTo(x, y); ctx.lineTo(x, y - sy * L); ctx.stroke(); }
  if (bl >= 1) { const f = 46; ctx.lineWidth = 4; ctx.strokeRect(SX - f, SY - 60 - f, 2 * f, 2 * f); }
  ctx.restore();
  const n = String(fo.mm);
  maskText(ctx, { text: n, font: FONTS.lat(290), px: 290, x: TX - 12, y: 520, color: th.type, t: tl, dur: 0.3, track: -0.045 });
  ctx.font = FONTS.lat(290); ctx.letterSpacing = `${-0.045 * 290}px`;
  const nw = ctx.measureText(n).width;
  maskText(ctx, { text: 'mm', font: FONTS.lat(96), px: 96, x: TX + nw + 6, y: 520, color: th.type, t: tl - 0.05, dur: 0.3 });
  maskText(ctx, { text: fo.zh, font: FONTS.zh(170), px: 170, x: TX - 6, y: 720, color: th.type, t: tl - 0.06, dur: 0.3 });
  chip(ctx, { text: fo.en, x: TX, y: 770, px: 21, fg: th.t[1], bg: th.type, t: tl - 0.14 });
  hudTop(ctx, th, chLabel(sh.ch), tl);
  focalRuler(ctx, th, sh.no, tl);
}
function focalRuler(ctx, th, cur, tl) {
  const x0 = 60, x1 = 860, base = 1036, lg = v => Math.log(v);
  const X = mm => x0 + (lg(mm) - lg(14)) / (lg(800) - lg(14)) * (x1 - x0);
  ctx.save(); ctx.fillStyle = css(th.type);
  ctx.globalAlpha = 0.3; ctx.fillRect(x0, base - 2, x1 - x0, 2);
  FOCALS.forEach((f, i) => {
    let h = 16, a = 0.3;
    if (i + 1 < cur) a = 0.6;
    if (i + 1 === cur) { h = lerp(16, 42, expOut(clamp(tl / 0.2))); a = 1; }
    ctx.globalAlpha = a; ctx.fillRect(X(f.mm) - 3, base - h, 6, h);
  });
  ctx.restore();
  const f = FOCALS[cur - 1];
  typeOn(ctx, { text: `${f.mm} mm`, x: X(f.mm), y: base - 54, px: 18, color: th.type, t: tl, align: 'center' });
  typeOn(ctx, { text: '14 — 800 mm', x: x1 + 24, y: base, px: 20, color: th.type, t: 9, alpha: 0.85 });
}

// ---------- opening ----------
function gridLines(ctx, bl, full) {
  ctx.save(); ctx.strokeStyle = css(CREAM, 0.16); ctx.lineWidth = 1.5;
  for (let k = 1; k < 11; k++) { const p = full ? 1 : expOut(clamp((bl - k * 0.045) / 0.8)); if (p <= 0) continue; ctx.beginPath(); ctx.moveTo(k * CELL, 0); ctx.lineTo(k * CELL, H * p); ctx.stroke(); }
  for (let r = 1; r < 6; r++) { const p = full ? 1 : expOut(clamp((bl - 1 - r * 0.06) / 0.8)); if (p <= 0) continue; ctx.beginPath(); ctx.moveTo(0, r * CELL); ctx.lineTo(W * p, r * CELL); ctx.stroke(); }
  ctx.restore();
  ctx.fillStyle = css(CREAM, 0.5);
  for (let k = 1; k < 11; k++) for (let r = 1; r < 6; r++) { const p = full ? 1 : clamp((bl - 2 - (k + r) * 0.03) / 0.2); if (p > 0) { ctx.beginPath(); ctx.arc(k * CELL, r * CELL, 3.2 * expOut(p), 0, 7); ctx.fill(); } }
}
function gridCard(ctx, sh, t) {
  const tl = t - sh.t0, bl = tl / BEAT, th = HUES.INK;
  ctx.fillStyle = css(th.t[1]); ctx.fillRect(0, 0, W, H);
  gridLines(ctx, bl, false);
  if (bl >= 3) {
    typeOn(ctx, { text: 'NIKON  ·  1917 — 2025', x: 60, y: 74, px: 20, color: CREAM, t: tl - 3 * BEAT, alpha: 0.85 });
    typeOn(ctx, { text: 'A FILM IN PICTOGRAMS', x: 1860, y: 74, px: 20, color: CREAM, t: tl - 3 * BEAT - 0.1, align: 'right', alpha: 0.85 });
    ticks(ctx, { type: CREAM }, 0, tl - 3 * BEAT, { label: `00 / ${pad2(N_ITEMS)}` });
  }
}
const CELL0 = [5, 2]; // the opening cell
function cellCard(ctx, sh, t) {
  const tl = t - sh.t0, bl = tl / BEAT, th = HUES.LUMEN;
  ctx.fillStyle = css(HUES.INK.t[1]); ctx.fillRect(0, 0, W, H);
  gridLines(ctx, bl, true);
  typeOn(ctx, { text: 'NIKON  ·  1917 — 2025', x: 60, y: 74, px: 20, color: CREAM, t: 9, alpha: 0.85 });
  const cx = CELL0[0] * CELL + CELL / 2, cy = CELL0[1] * CELL + CELL / 2;
  const pop = expOut(clamp(tl / 0.35));
  const grow = expInOut(clamp((bl - 2) / 1.0));
  const s = pop * lerp(1, 13, grow);
  const px = lerp(cx, W / 2, grow), py = lerp(cy, H / 2, grow);
  const rot = Math.floor(bl) >= 1 ? Math.min(2, Math.floor(bl)) : 0;
  ctx.save(); ctx.translate(px, py); ctx.scale(s, s);
  motif(ctx, 'rings', -CELL / 2, -CELL / 2, CELL, rot, css(th.t[4]), css(th.t[2]));
  ctx.restore();
  if (bl >= 3) {
    const pat = pattern('LUMEN', 3, 0.2), off = driftOff(3, t);
    for (let r = 0; r < ROWS; r++) {
      const p = expOut(clamp((tl - 3 * BEAT - r * 0.05) / 0.45));
      if (p <= 0) continue;
      ctx.save(); ctx.translate(dirOf(r) * (1 - p) * W, 0); drawRow(ctx, pat, r, off(r)); ctx.restore();
    }
  }
}
function bigLens(ctx, cx, cy, R, th, tl) {
  const k = [[0.86, INK], [0.76, th.t[3]], [0.69, INK], [0.5, th.t[1]], [0.43, INK], [0.3, mix(th.t[2], CREAM, 0.25)]];
  for (const [r, c] of k) G.disc(ctx, [cx, cy], R * r, css(c));
  // focus ring tick rotates; aperture pulses on beats
  const a = tl * 0.9;
  ctx.save(); ctx.translate(cx, cy); ctx.rotate(a); ctx.fillStyle = css(th.t[3]);
  for (let i = 0; i < 24; i++) { ctx.rotate(Math.PI / 12); ctx.fillRect(R * 0.79, -3, R * 0.05, 6); }
  ctx.restore();
  const pulse = 1 - 0.18 * Math.max(0, 1 - frac(tl / BEAT) / 0.4);
  G.disc(ctx, [cx, cy], R * 0.17 * pulse, css(INK));
  G.disc(ctx, [cx - R * 0.12, cy - R * 0.13], R * 0.05, css(CREAM, 0.85));
}
function titleCard(ctx, sh, t) {
  const tl = t - sh.t0, th = HUES.LUMEN;
  lowBg(ctx, 'LUMEN', 3, t);
  sunDisc(ctx, th, null, tl, sh.len * BEAT);
  const f = FIG.x; f.clearRect(0, 0, W, H); bigLens(f, SX, SY, SR * 0.9, th, tl); bandCompose(ctx, FIG.c, tl, 0.5);
  maskText(ctx, { text: '百年，', font: FONTS.zh(250), px: 250, x: TX - 14, y: 430, color: INK, t: tl, track: -0.03 });
  maskText(ctx, { text: '为看见', font: FONTS.zh(250), px: 250, x: TX - 14, y: 690, color: INK, t: tl - 0.08, track: -0.03 });
  maskText(ctx, { text: 'A CENTURY OF SEEING', font: FONTS.lat(50), px: 50, x: TX, y: 790, color: INK, t: tl - 0.18, track: 0.04 });
  hudTop(ctx, th, 'A FILM IN PICTOGRAMS', 9);
  ticks(ctx, th, 0, tl, { label: `00 / ${pad2(N_ITEMS)}` });
}

// ---------- icon wall ----------
const WALL = (() => {
  const list = [];
  ITEMS.forEach(it => list.push({ act: it.act, hue: EDL.CHAPTERS[it.ch - 1].hue, len: it.spec ? 8 : 4 }));
  FOCALS.forEach((fo, i) => list.push({ act: fo.act, hue: ['KILN', 'LAKE', 'SENSOR', 'DUSK', 'LUMEN'][i % 5], len: 2 }));
  const tiles = [];
  let k = 0;
  for (let r = 0; r < 3; r++) for (let c = 0; c < 9; c++) {
    if (c === 8) tiles.push({ r, c, motif: true, hue: ['KILN', 'LAKE', 'SENSOR'][r] });
    else tiles.push(Object.assign({ r, c }, list[k++]));
  }
  return tiles;
})();
const TWID = W / 9, THGT = H / 3;
function wallCard(ctx, sh, t) {
  const tl = t - sh.t0, bl = tl / BEAT;
  ctx.fillStyle = css(HUES.INK.t[1]); ctx.fillRect(0, 0, W, H);
  const moon = WALL.find(x => x.act === 'moon');
  const mc = [(moon.c + 0.5) * TWID, (moon.r + 0.5) * THGT];
  const z = expInOut(clamp(bl / 2.2)), s = lerp(5.2, 1, z);
  const fc = [lerp(mc[0], W / 2, z), lerp(mc[1], H / 2, z)];
  ctx.save(); ctx.translate(W / 2, H / 2); ctx.scale(s, s); ctx.translate(-fc[0], -fc[1]);
  for (const tile of WALL) {
    const cx = (tile.c + 0.5) * TWID, cy = (tile.r + 0.5) * THGT;
    const d = Math.hypot(cx - W / 2, cy - H / 2) / Math.hypot(W / 2, H / 2);
    const col = expIn(clamp((bl - 6 - (1 - d) * 0.0 - d * 0.6) / 0.9));
    const k = 1 - col;
    if (k <= 0.001) continue;
    const turned = bl >= 4 + (tile.c / 8) * 0.8 + tile.r * 0.1;
    const hue = turned ? 'LUMEN' : tile.hue, th = HUES[hue];
    ctx.save();
    ctx.translate(lerp(W / 2, cx, k), lerp(H / 2, cy, k)); ctx.scale(k, k);
    ctx.fillStyle = css(th.t[2]); ctx.fillRect(-TWID / 2 - 0.5, -THGT / 2 - 0.5, TWID + 1, THGT + 1);
    if (tile.motif) {
      motif(ctx, ['sun', 'rings', 'quarter'][tile.r], -TWID / 2, -TWID / 2 - 30, TWID, tile.r, css(th.t[4]), css(th.t[1]));
    } else {
      const R = 82, U = 112, lb = (bl * (tile.len === 2 ? 0.5 : 0.5) + tile.c * 0.31 + tile.r * 0.17) % tile.len;
      const st = ACTS[tile.act](lb, th).stage || {};
      G.disc(ctx, [0, -14], R, css(discColor(th, st.disc)));
      ctx.save(); ctx.beginPath(); ctx.rect(-TWID / 2, -THGT / 2, TWID, THGT); ctx.clip();
      drawAct(ctx, tile.act, lb, th, 0, -14, U, { R });
      ctx.restore();
    }
    ctx.restore();
  }
  ctx.restore();
  if (bl >= 7.2) G.disc(ctx, [W / 2, H / 2], 14 * expOut(clamp((bl - 7.2) / 0.3)), css(HUES.LUMEN.t[2]));
  const hc = { type: bl >= 4.9 ? INK : CREAM };
  if (bl < 6.2) { hudTop(ctx, hc, 'ALL 24', tl); ticks(ctx, hc, 0, tl, { allDone: true, label: `${pad2(N_ITEMS)} / ${pad2(N_ITEMS)}` }); }
}

// ---------- end card & out ----------
function endCard(ctx, sh, t, o = {}) {
  const tl = t - sh.t0, bl = tl / BEAT, th = HUES.INK, Y = HUES.LUMEN;
  rowsBg(ctx, 'INK', 7, 0.6, r => { const ts = (2 + r * 1.7) * BEAT; return (7 * 613 + r * 977) % PW + dirOf(r) * 90 * expOut(clamp((o.tFreeze ?? tl) / ts)); });
  const yellow = Y.t[2];
  ctx.fillStyle = css(yellow); ctx.beginPath(); ctx.arc(SX, SY, SR, 0, 7); ctx.fill();
  const f = FIG.x; f.clearRect(0, 0, W, H);
  camFront(f, SX, SY + 20, 430, 8, INK, yellow);
  bandCompose(ctx, FIG.c, tl, 0.55);
  maskText(ctx, { text: '尼康', font: FONTS.zh(290), px: 290, x: TX - 16, y: 500, color: CREAM, t: tl - 0.05, track: -0.02 });
  maskText(ctx, { text: 'NIKON', font: FONTS.lat(118), px: 118, x: TX - 4, y: 640, color: yellow, t: tl - 0.13, track: 0.12 });
  maskText(ctx, { text: '百年，为看见', font: FONTS.zhB(62), px: 62, x: TX, y: 760, color: CREAM, t: tl - 0.5, track: 0.06 });
  typeOn(ctx, { text: 'A CENTURY OF SEEING', x: TX, y: 816, px: 21, color: CREAM, t: tl - 0.7, alpha: 0.8 });
  hudTop(ctx, { type: CREAM }, '1917 — 2025', tl - 0.2);
  ticks(ctx, { type: CREAM }, 0, tl, { allDone: true, gone: o.gone, label: o.gone !== undefined && o.gone < N_ITEMS ? false : `${pad2(N_ITEMS)} / ${pad2(N_ITEMS)}` });
  typeOn(ctx, { text: 'BUILD 08 / 08 · COMPLETE', x: 1860, y: 1034, px: 19, color: CREAM, t: tl - 1.0, align: 'right', alpha: 0.85 });
}
function outCard(ctx, sh, t) {
  const tl = t - sh.t0, bl = tl / BEAT;
  const end = shots[sh.idx - 1];
  ctx.fillStyle = css(CREAM); ctx.fillRect(0, 0, W, H);
  const gone = Math.max(0, N_ITEMS - Math.floor(bl / 0.25));
  C.x.clearRect(0, 0, W, H);
  endCard(C.x, end, t, { gone, tFreeze: 30 });
  for (let r = 0; r < ROWS; r++) {
    const p = expIn(clamp((bl - 1 - r * 0.55) / 0.7));
    if (p >= 1) continue;
    ctx.drawImage(C.c, 0, r * CELL, W, CELL, dirOf(r) * p * W, r * CELL, W, CELL);
  }
  if (bl >= 5) {
    maskText(ctx, { text: 'NIKON  ·  1917 — 2025', font: FONTS.mono(26), px: 26, x: W / 2, y: H / 2 + 10, color: INK, t: tl - 5 * BEAT, align: 'center', track: 0.2 });
  }
}

// ---------- dispatch ----------
const RENDER = { grid: gridCard, cell: cellCard, title: titleCard, chapter: chapterCard, item: itemCard, spec: specCard, focal: focalCard, wall: wallCard, end: endCard, out: outCard };
function renderShot(ctx, sh, t) {
  ctx.save(); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  RENDER[sh.type](ctx, sh, t);
  ctx.restore();
}

// ---------- transitions (snap to the grid) ----------
const WIN0 = 3 / FPS, WIN1 = 5 / FPS, WIN = WIN0 + WIN1;
function irisPoint(prev) {
  if (prev && (prev.type === 'item' || prev.type === 'spec')) return [SX, SY - 60];
  return [W / 2, H / 2];
}
function compose(ctx, tr, a, b, p, prevShot) {
  const e = expInOut(p);
  ctx.fillStyle = css(INK); ctx.fillRect(0, 0, W, H);
  switch (tr) {
    case 'rows':
      ctx.drawImage(a, 0, 0);
      for (let r = 0; r < ROWS; r++) { const q = expInOut(clamp(p * 1.6 - r * 0.12)); ctx.drawImage(b, 0, r * CELL, W, CELL, dirOf(r) * (1 - q) * W, r * CELL, W, CELL); }
      break;
    case 'cols': {
      ctx.drawImage(a, 0, 0);
      const n = Math.ceil(W / CELL);
      for (let c = 0; c < n; c++) { const q = expInOut(clamp(p * 1.7 - c * 0.07)); ctx.drawImage(b, c * CELL, 0, CELL, H, c * CELL, -(1 - q) * H, CELL, H); }
      break;
    }
    case 'push': case 'whip':
      ctx.drawImage(a, -e * W, 0); ctx.drawImage(b, W - e * W, 0);
      break;
    case 'quarter': {
      ctx.drawImage(a, 0, 0);
      ctx.save(); ctx.beginPath();
      for (let r = 0; r < ROWS; r++) for (let c = 0; c < 11; c++) {
        const q = expInOut(clamp(p * 1.5 - (c + r) * 0.03)), corner = (c + r) % 4;
        const ox = c * CELL + (corner === 1 || corner === 2 ? CELL : 0), oy = r * CELL + (corner >= 2 ? CELL : 0);
        if (q <= 0) continue;
        ctx.moveTo(ox, oy); ctx.arc(ox, oy, q * CELL * 1.42, 0, 7);
      }
      ctx.clip(); ctx.drawImage(b, 0, 0); ctx.restore();
      break;
    }
    case 'iris': {
      ctx.drawImage(a, 0, 0);
      const pt = irisPoint(prevShot), R = e * Math.hypot(W, H);
      ctx.save(); ctx.beginPath(); ctx.arc(pt[0], pt[1], R, 0, 7); ctx.clip(); ctx.drawImage(b, 0, 0); ctx.restore();
      break;
    }
    case 'flip': {
      for (let r = 0; r < ROWS; r++) for (let c = 0; c < 11; c++) {
        const q = clamp(p * 1.5 - (c * 0.035 + r * 0.02)), src = q < 0.5 ? a : b, sx = Math.abs(Math.cos(q * Math.PI));
        const w = CELL * sx;
        if (w < 0.5) continue;
        ctx.drawImage(src, c * CELL, r * CELL, CELL, CELL, c * CELL + (CELL - w) / 2, r * CELL, w, CELL);
      }
      break;
    }
    default: ctx.drawImage(p < 0.5 ? a : b, 0, 0);
  }
}
function shotAt(t) {
  for (let i = shots.length - 1; i >= 0; i--) if (t >= shots[i].t0 - 1e-9) return i;
  return 0;
}
// Returns the transition in effect at time t, if any.
function transitionAt(t) {
  const i = shotAt(t), cur = shots[i], next = shots[i + 1];
  if (next && next.tr !== 'cut' && t >= next.t0 - WIN0) return { a: cur, b: next, tr: next.tr, p: (t - (next.t0 - WIN0)) / WIN };
  if (i > 0 && cur.tr !== 'cut' && t < cur.t0 + WIN1) return { a: shots[i - 1], b: cur, tr: cur.tr, p: (t - (cur.t0 - WIN0)) / WIN };
  return null;
}
function renderAt(ctx, t) {
  const tr = transitionAt(t);
  if (!tr) { renderShot(ctx, shots[shotAt(t)], t); return; }
  renderShot(A.x, tr.a, t); renderShot(B.x, tr.b, t);
  compose(ctx, tr.tr, A.c, B.c, clamp(tr.p), tr.a);
}
// Motion blur only where things move: transitions, whips, chapter row jumps, the wall's pull-back and collapse, the final row exits.
function moving(t) {
  if (transitionAt(t)) return 5;
  const sh = shots[shotAt(t)], bl = (t - sh.t0) / BEAT;
  if (sh.type === 'chapter' && frac(bl) < 0.3) return 2;
  if (sh.type === 'wall' && (bl < 2.2 || (bl > 6 && bl < 7.6))) return 5;
  if (sh.type === 'out' && bl > 1 && bl < 5) return 4;
  if (sh.type === 'cell' && bl > 2 && bl < 3.6) return 3;
  return 0;
}
function renderFrame(ctx, t) {
  const n = moving(t);
  if (!n) { renderAt(ctx, t); return; }
  const shutter = 0.5 / FPS;
  for (let k = 0; k < n; k++) {
    const tk = t - shutter / 2 + shutter * (k + 0.5) / n;
    renderAt(TMP.x, tk);
    ctx.globalAlpha = 1 / (k + 1); ctx.drawImage(TMP.c, 0, 0); ctx.globalAlpha = 1;
  }
}

module.exports = { renderFrame, renderShot, shots, SX, SY, SR, W, H };
