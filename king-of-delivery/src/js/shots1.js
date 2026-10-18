'use strict';
// ============================================================================
//  Timeline part 1 — engine + ACT 0 (cold open) … ACT 3 (street chase)
//  150 BPM: one bar = 1.6 s; every cut lands on the bar grid.
// ============================================================================

const SHOTS = [];
function shot(t0, t1, name, draw, post = {}) { SHOTS.push({ t0, t1, name, draw, post }); }
const DEF_POST = { lb: 1, bloom: 1, scene: 0.12, vig: 0.7, grain: 0.05, ca: 0, shake: 0 };

function renderFrame(ctx, t) {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; ctx.filter = 'none';
  emitBegin();
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
  const sh = SHOTS.find(s => t >= s.t0 && t < s.t1);
  const post = { ...DEF_POST };
  if (sh) {
    const S = { t, lt: t - sh.t0, d: sh.t1 - sh.t0 };
    S.p = S.lt / S.d;
    Object.assign(post, typeof sh.post === 'function' ? sh.post(S) : sh.post);
    ctx.save();
    if (post.shake > 0) {
      const [dx, dy, r] = shakeOffset(t, post.shake, 30, 7);
      ctx.translate(W / 2 + dx, H / 2 + dy); ctx.rotate(r); ctx.scale(1.04, 1.04); ctx.translate(-W / 2, -H / 2);
    }
    sh.draw(ctx, S, post);
    ctx.restore();
    if (post.hud) post.hud(ctx, S);
    if (S.timer !== undefined) timerHUD(ctx, S.timer, S.timerA ?? 1);
  }
  Post.bloom(ctx, post.bloom, post.scene);
  if (post.ca > 0) Post.aberration(ctx, post.ca);
  Post.vignette(ctx, post.vig);
  if (post.after) post.after(ctx);
  Post.letterbox(ctx, post.lb);
  Post.grain(ctx, t, post.grain * 0.75);
  if (post.flash) Post.flash(ctx, post.flashC ?? '#ffffff', post.flash);
}

// helpers -------------------------------------------------------------------
const blackBG = (ctx) => { ctx.fillStyle = '#040408'; ctx.fillRect(0, 0, W, H); };
function dust(ctx, t, a = 0.5) {
  ctx.save();
  for (let i = 0; i < 90; i++) {
    const x = mod(hash2(i, 901) * W + t * 12 * (hash2(i, 902) - 0.3), W), y = mod(hash2(i, 903) * H - t * 8 * hash2(i, 904), H);
    ctx.globalAlpha = a * (0.3 + 0.7 * hash2(i, 905)) * (0.6 + 0.4 * Math.sin(t * 2 + i));
    ctx.fillStyle = '#C8D0FF'; ctx.fillRect(x, y, 2, 2);
  }
  ctx.restore();
}
// light trail streak behind a rider (side view)
function lightTrail(ctx, x, y, col, len = 900, w = 10, a = 0.8) {
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  const g = ctx.createLinearGradient(x - len, 0, x, 0);
  g.addColorStop(0, rgba(col, 0)); g.addColorStop(1, rgba(col, a));
  ctx.fillStyle = g; ctx.fillRect(x - len, y - w / 2, len, w);
  ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.globalAlpha = a; ctx.fillRect(x - len * 0.4, y - 1, len * 0.4, 2);
  ctx.restore();
  emitFill(ctx, rrectPath(x - len * 0.6, y - w / 2, len * 0.6, w, 0), col, 0.6 * a);
}
// rider with motion-blur ghosts
function riderBlur(ctx, who, x, y, s, o, n = 4, dx = 40) {
  for (let k = n; k >= 1; k--) {
    ctx.save(); ctx.globalAlpha = 0.12 + 0.1 * (n - k) / n;
    drawRider(ctx, who, x - k * dx, y, s, { ...o, noUnderglow: true, glow: 0.3 });
    ctx.restore();
  }
  drawRider(ctx, who, x, y, s, o);
}
// portrait background: dark gradient + bokeh + rain
function portraitBG(ctx, t, col, o = {}) {
  const g = ctx.createRadialGradient(W * (o.cx ?? 0.5), H * 0.45, 100, W / 2, H / 2, 1200);
  g.addColorStop(0, shade(col, 0.55)); g.addColorStop(1, shade(col, 0.92));
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  bokeh(ctx, t, col, { a: 0.28, dir: o.dir ?? 1 });
  if (o.lines) speedRadial(ctx, W / 2, H * 0.45, t, { n: 70, inner: 420, color: tint(col, 0.4), a: 0.35 });
  rain(ctx, t, { n: 160, a: 0.18, vy: 2200, vx: -200, w: 1.2 });
}
function talkK(lt, start, dur) { // mouth movement while a line is spoken
  if (lt < start || lt > start + dur) return 0;
  return 0.25 + 0.75 * Math.abs(Math.sin((lt - start) * 17)) * (0.6 + 0.4 * Math.sin((lt - start) * 5.3));
}

// ============================================================ ACT 0 ========
shot(0, 3.2, 'app', (ctx, S) => {
  const { lt, t } = S;
  ctx.fillStyle = '#05050A'; ctx.fillRect(0, 0, W, H);
  dust(ctx, t, 0.35);
  const a = env(lt, 0.2, 3.2, 0.5, 0.01);
  const zoom = 1 + Ease.inExpo(seg(lt, 2.85, 3.2)) * 1.5;
  ctx.save(); ctx.globalAlpha = a;
  ctx.translate(W / 2, 470); ctx.scale(zoom, zoom); ctx.translate(-W / 2, -470);
  ctx.font = font(22, FONT.raj, '700'); ctx.fillStyle = '#6E7196'; ctx.textAlign = 'center';
  spacedText(ctx, 'DELIVERY APP · 外卖', W / 2, 380, 10);
  const bx = W / 2, by = 470, bw = 900, bh = 88;
  flat(ctx, rrectPath(bx - bw / 2, by - bh / 2, bw, bh, 44), '#101019', '#2E2E44', 2);
  emitFill(ctx, rrectPath(bx - bw / 2, by - bh / 2, bw, bh, 44), '#5A64C8', 0.05);
  // magnifier
  ctx.strokeStyle = '#8D90B8'; ctx.lineWidth = 4;
  ctx.beginPath(); ctx.arc(bx - bw / 2 + 50, by - 4, 14, 0, TAU); ctx.moveTo(bx - bw / 2 + 60, by + 6); ctx.lineTo(bx - bw / 2 + 70, by + 16); ctx.stroke();
  const q = '今晚，谁才是外卖之王？';
  const shown = typed(q, lt - 0.7, 7.5);
  ctx.font = font(36, FONT.sans, '700'); ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#ECEDF8';
  ctx.fillText(shown, bx - bw / 2 + 92, by);
  const tw = ctx.measureText(shown).width;
  if (fract(lt * 2) < 0.55) { ctx.fillStyle = '#ECEDF8'; ctx.fillRect(bx - bw / 2 + 96 + tw, by - 20, 3, 40); }
  // send button
  const press = env(lt, 2.55, 2.9, 0.05, 0.2);
  flat(ctx, circlePath(bx + bw / 2 - 46, by, 30 - press * 4), press > 0 ? '#FFD100' : '#2A2A3E', null);
  ctx.strokeStyle = press > 0 ? '#1A1505' : '#A6A9CC'; ctx.lineWidth = 4; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(bx + bw / 2 - 46, by + 12); ctx.lineTo(bx + bw / 2 - 46, by - 12); ctx.lineTo(bx + bw / 2 - 56, by - 2);
  ctx.moveTo(bx + bw / 2 - 46, by - 12); ctx.lineTo(bx + bw / 2 - 36, by - 2); ctx.stroke();
  ctx.restore();
}, S => ({ lb: 0, vig: 0.95, grain: 0.04, scene: 0.2, flash: Ease.inQuad(seg(S.lt, 2.95, 3.2)) * 0.9 }));

shot(3.2, 4.8, 'card1', (ctx, S) => {
  blackBG(ctx); dust(ctx, S.t, 0.6);
  titleCard(ctx, S.lt, S.d, '一份订单。', 'ONE ORDER.');
}, { lb: 0, scene: 0.35 });

shot(4.8, 6.4, 'card2', (ctx, S) => {
  blackBG(ctx); dust(ctx, S.t, 0.6);
  const a = env(S.lt, 0, S.d, 0.15, 0.2);
  const pul = 0.8 + 0.2 * Math.sin(S.lt * 9);
  const sep = 300 + 40 * Ease.outCubic(seg(S.lt, 0, 0.6));
  glow(ctx, W / 2 - sep - 60, H / 2 - 30, 260 * pul, '#FFC400', 0.55 * a);
  glow(ctx, W / 2 - sep - 60, H / 2 - 30, 70, '#FFFFFF', 0.8 * a);
  glow(ctx, W / 2 + sep + 60, H / 2 - 30, 260 * pul, '#1E9BFF', 0.55 * a);
  glow(ctx, W / 2 + sep + 60, H / 2 - 30, 70, '#FFFFFF', 0.8 * a);
  titleCard(ctx, S.lt, S.d, '两位骑手。', 'TWO RIDERS.');
}, { lb: 0, scene: 0.35 });

shot(6.4, 8.0, 'card3', (ctx, S) => {
  blackBG(ctx); dust(ctx, S.t, 0.6);
  const g = seg(S.lt, 1.1, 1.6);
  if (g > 0) {
    glitchDraw(ctx, S.t, g, (gc) => titleCard(gc, S.lt, S.d + 1, '三十分钟。', 'THIRTY MINUTES.', { fo: 0.01 }), 5);
  } else titleCard(ctx, S.lt, S.d + 1, '三十分钟。', 'THIRTY MINUTES.', { fo: 0.01 });
  // red countdown ghost
  ctx.save(); ctx.globalAlpha = 0.18 * env(S.lt, 0.3, 1.6, 0.4, 0.1);
  ctx.font = font(400, FONT.orb, '900'); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#FF3B5C';
  ctx.fillText('30:00', W / 2, H / 2 - 20);
  ctx.restore();
}, S => ({ lb: 0, scene: 0.35, ca: seg(S.lt, 1.1, 1.6) * 10, flash: Ease.inQuad(seg(S.lt, 1.4, 1.6)) }));

// ============================================================ ACT 1 ========
shot(8.0, 11.2, 'city', (ctx, S) => {
  const { t, lt } = S;
  const k = 1 + 0.05 * Ease.inOutSine(S.p);
  ctx.save(); ctx.translate(W / 2, H / 2); ctx.scale(k, k); ctx.translate(-W / 2, -H / 2 + 20 * S.p);
  drawSky(ctx, t);
  drawMoon(ctx, 1330, 320, 150);
  routeStreams(ctx, t, { y: 250 });
  cloudBank(ctx, t, { y: 470, n: 5, seed: 5, scale: 1.1 });
  drawLayer(ctx, World.far, -t * 10, 380, { wrap: true });
  drawTower(ctx, 1150, 1080, 0.42, t);
  drawLayer(ctx, World.mid, -t * 25, 420, { wrap: true });
  cloudBank(ctx, t, { y: 760, n: 4, seed: 9, scale: 0.8, a: 0.9 });
  drawLayer(ctx, World.near, -t * 50, 560, { wrap: true });
  ctx.restore();
  rainLayers(ctx, t, { k: 0.7 });
  locationCard(ctx, lt - 0.5, 2.6, '不夜城', 'NIGHTLESS CITY  ·  2026');
}, S => ({ flash: (1 - seg(S.lt, 0, 0.35)) * 0.9 }));

shot(11.2, 14.4, 'tower', (ctx, S) => {
  const { t, lt } = S;
  const lift = Ease.inOutSine(S.p) * 120;
  ctx.save(); ctx.translate(0, lift);
  drawSky(ctx, t, { oy: lift * 0.2 });
  drawMoon(ctx, 1500, 210 - lift * 0.3, 120);
  cloudBank(ctx, t, { y: 360, n: 5, seed: 17, scale: 1.0 });
  drawLayer(ctx, World.far, -t * 8, 520, { wrap: true });
  drawTower(ctx, 1290, 1500, 0.78, t, { label: false });
  const fl = flicker(t, 13.6, 0.5);
  if (fl > 0) lightning(ctx, 1500, -200, 1290, 1500 - 2050 * 0.78, 77, { a: fl, w: 4, color: '#C9B8FF' });
  drawLayer(ctx, World.mid, -t * 18, 640, { wrap: true });
  ctx.restore();
  rainLayers(ctx, t, { k: 0.6 });
  hudPanel(ctx, lt - 0.3, 2.9, { x: 700, y: 400, l1: 'FINAL ORDER · 终极订单', l2: '外卖之王', l3a: '#1' });
  dropsIn(ctx, lt - 0.4, 2.8, '抢单倒计时 · ORDER DROPS IN', 3 - Math.floor((lt - 0.4) / 0.8), W - 110, 880);
}, S => ({ flash: flicker(S.t, 13.6, 0.5) * 0.5, flashC: '#D8CCFF' }));

function introRooftop(ctx, S, who) {
  const { t, lt } = S;
  const flip = who === 'B';
  const k = 1 + 0.04 * S.p;
  ctx.save(); ctx.translate(W / 2, H / 2); ctx.scale(k, k); ctx.translate(-W / 2, -H / 2);
  drawSky(ctx, t, who === 'B' ? { mid: '#10204A', low: '#1D3A6E' } : {});
  const mx = flip ? 1380 : 540;
  drawMoon(ctx, mx, 400, 270, { halo: who === 'B' ? '#7FC8FF' : '#FFD9A0' });
  cloudBank(ctx, t, { y: 640, n: 4, seed: who === 'B' ? 21 : 13, scale: 1.2, col: who === 'B' ? '#1B2C6E' : '#2A2470', rim: who === 'B' ? '#69B8FF' : '#8F7BE8' });
  drawLayer(ctx, World.far, -t * 6 + (flip ? 900 : 0), 520, { wrap: true });
  drawLayer(ctx, World.mid, -t * 12 + (flip ? 1700 : 300), 660, { wrap: true });
  // rooftop slab
  ctx.fillStyle = '#07071A'; ctx.fillRect(0, 830, W, 260);
  ctx.fillStyle = 'rgba(160,170,255,0.4)'; ctx.fillRect(0, 830, W, 3);
  for (let x = 30; x < W; x += 140) { ctx.fillStyle = '#0D0D26'; ctx.fillRect(x, 800, 8, 30); }
  ctx.fillStyle = '#0D0D26'; ctx.fillRect(0, 798, W, 6);
  const rimC = who === 'B' ? '#BDE7FF' : '#FFF0C0';
  if (who === 'Y') {
    drawRider(ctx, 'Y', 470, 832, 1.12, { t, speed: 0, spin: 0, wheel: 0.4, glow: 0.8, bob: 0, noRider: true });
    drawStanding(ctx, 'Y', 960, 830, 0.86, { t, wind: 0.9, rim: rimC });
  } else {
    drawRider(ctx, 'B', 1450, 832, 1.08, { t, speed: 0, spin: 0, wheel: 0.4, glow: 0.8, bob: 0, flip: true, noRider: true });
    drawStanding(ctx, 'B', 960, 830, 0.9, { t, wind: 0.9, rim: rimC, flip: true });
  }
  ctx.restore();
  rainLayers(ctx, t, { k: 0.5, near: true });
  nameCard(ctx, lt - 0.55, S.d - 0.55, who, who === 'B' ? { align: 'left', x: 140, y: 800 } : { x: W - 140, y: 800 });
}
shot(14.4, 17.6, 'introY', (ctx, S) => introRooftop(ctx, S, 'Y'));
shot(17.6, 19.2, 'eyeY', (ctx, S) => eyeCloseup(ctx, 'Y', S.lt, S.d), { scene: 0.2 });
shot(19.2, 20.8, 'bustY', (ctx, S) => {
  const { t, lt } = S;
  portraitBG(ctx, t, '#FF9A1A');
  drawBust(ctx, 'Y', 960, 520, 1.85, { t, yaw: 0.22, expr: 'grin', talk: talkK(lt, 0.1, 1.2), rim: '#FFE7A0', wind: 0.6 });
  speakerSub(ctx, lt, S.d, 'Y', '三十分钟？我十五分钟就够了。', 'Thirty minutes? I only need fifteen.');
});
shot(20.8, 24.0, 'introB', (ctx, S) => introRooftop(ctx, S, 'B'));
shot(24.0, 25.6, 'eyeB', (ctx, S) => eyeCloseup(ctx, 'B', S.lt, S.d, { angry: 0.15, glow: 0.35 }), { scene: 0.2 });
shot(25.6, 27.2, 'bustB', (ctx, S) => {
  const { t, lt } = S;
  portraitBG(ctx, t, '#1E8FFF', { dir: -1 });
  drawBust(ctx, 'B', 960, 520, 1.85, { t, yaw: -0.22, expr: 'smirk', talk: talkK(lt, 0.1, 1.1), rim: '#BDF2FF', wind: 0.6 });
  speakerSub(ctx, lt, S.d, 'B', '饿了么？那就……追上我。', 'Hungry? Then… catch me.');
});

// ============================================================ ACT 2 ========
shot(27.2, 30.4, 'faceoff', (ctx, S) => {
  const { t, lt } = S;
  const push = 1 + 0.06 * S.p;
  const split = (yy) => W * 0.56 - (yy - H / 2) * 0.32;
  const left = poly([0, 0, split(0), 0, split(H), H, 0, H]);
  const right = poly([split(0), 0, W, 0, W, H, split(H), H]);
  ctx.save(); ctx.clip(left);
  let g = ctx.createLinearGradient(0, 0, W * 0.6, H); g.addColorStop(0, '#FF7A00'); g.addColorStop(1, '#5A1E00');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  speedRadial(ctx, 480, 520, t, { n: 60, inner: 380, color: '#FFE08A', a: 0.25 });
  ctx.translate(560, 560); ctx.scale(push, push); ctx.translate(-560, -560);
  drawBust(ctx, 'Y', 560, 640, 3.4, { t, yaw: 0.12, expr: 'determined', rim: '#FFF0A0', glow: 0.25 });
  ctx.restore();
  ctx.save(); ctx.clip(right);
  g = ctx.createLinearGradient(W, 0, W * 0.4, H); g.addColorStop(0, '#00C8FF'); g.addColorStop(1, '#03205A');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  speedRadial(ctx, 1440, 520, t, { n: 60, inner: 380, color: '#BFF6FF', a: 0.25 });
  ctx.translate(1380, 560); ctx.scale(push, push); ctx.translate(-1380, -560);
  drawBust(ctx, 'B', 1380, 660, 3.4, { t, yaw: -0.12, expr: 'calm', rim: '#DFFBFF', glow: 0.3 });
  ctx.restore();
  // split crackle
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  lightning(ctx, split(0), 0, split(H), H, Math.floor(t * 14), { color: '#FFFFFF', w: 3, a: 0.9, rough: 0.08, branches: 4 });
  ctx.restore();
  ctx.fillStyle = '#FFFFFF'; ctx.fill(poly([split(0) - 4, 0, split(0) + 4, 0, split(H) + 4, H, split(H) - 4, H]));
  const jit = { jitter: true, t, vertical: true, font: FONT.sans };
  mangaSFX(ctx, 'ゴゴゴ', 120, 220, 96, { ...jit, fill: ['#FFFFFF', '#FFD8A8'], stroke2: '#7A2A00' });
  mangaSFX(ctx, 'ゴゴゴ', W - 140, 230, 96, { ...jit, fill: ['#FFFFFF', '#C8F2FF'], stroke2: '#003A6A' });
}, S => ({ shake: 2 + 6 * S.p, scene: 0.18 }));

shot(30.4, 32.0, 'vs', (ctx, S) => {
  const { t, lt } = S;
  const split = (yy) => W * 0.52 - (yy - H / 2) * 0.22;
  const sl = Ease.outExpo(seg(lt, 0, 0.35));
  ctx.save(); ctx.clip(poly([0, 0, split(0), 0, split(H), H, 0, H]));
  ctx.fillStyle = '#FF9F00'; ctx.fillRect(0, 0, W, H);
  halftone(ctx, 0, 0, W * 0.6, H, '#B85A00', 0.5, 16);
  drawBust(ctx, 'Y', 470 - (1 - sl) * 400, 600, 2.0, { t, yaw: 0.35, expr: 'grin', rim: '#FFFFFF' });
  ctx.restore();
  ctx.save(); ctx.clip(poly([split(0), 0, W, 0, W, H, split(H), H]));
  ctx.fillStyle = '#0A86FF'; ctx.fillRect(0, 0, W, H);
  halftone(ctx, W * 0.45, 0, W * 0.55, H, '#02358A', 0.5, 16);
  drawBust(ctx, 'B', 1460 + (1 - sl) * 400, 600, 2.0, { t, yaw: -0.35, expr: 'smirk', rim: '#FFFFFF' });
  ctx.restore();
  ctx.fillStyle = '#FFFFFF'; ctx.fill(poly([split(0) - 7, 0, split(0) + 7, 0, split(H) + 7, H, split(H) - 7, H]));
  // VS slam
  const vs = seg(lt, 0.15, 0.4);
  if (vs > 0) {
    const sc = 1 + 2.2 * (1 - Ease.outBack(vs, 2));
    ctx.save(); ctx.translate(W / 2 + 10, H / 2 - 20); ctx.scale(sc, sc); ctx.transform(1, 0, -0.2, 1, 0, 0);
    titleText(ctx, 'VS', 0, 0, 300, { font: FONT.anton, weight: '', fill: ['#FFF6C8', '#FFC400', '#C77700'], stroke: '#2A1A00', sw: 22, glow: 'rgba(255,220,120,0.8)', glowR: 40 });
    ctx.restore();
  }
  // names
  ctx.save(); ctx.transform(1, 0, -0.18, 1, 0, 0);
  titleText(ctx, '美团', 330, 900, 120, { font: FONT.sans, fill: ['#FFFFFF', '#FFF0B0'], stroke: '#2A1A00', sw: 14, align: 'center' });
  titleText(ctx, '饿了么', 1720, 900, 120, { font: FONT.sans, fill: ['#FFFFFF', '#CDEBFF'], stroke: '#001E4A', sw: 14, align: 'center' });
  ctx.restore();
  if (lt > 0.4) mangaSFX(ctx, '咚！', 1500, 250, 110, { rot: 0.15, scale: 1 + 0.3 * (1 - Ease.outBack(seg(lt, 0.4, 0.6))), font: FONT.brush, fill: ['#FFFFFF', '#E8F4FF'] });
}, S => ({ lb: 0, shake: 10 * (1 - seg(S.lt, 0.2, 0.7)), scene: 0.15, flash: (1 - seg(S.lt, 0.15, 0.3)) * (S.lt > 0.15 ? 0.6 : 0) }));

shot(32.0, 33.6, 'order', (ctx, S) => {
  const { t, lt } = S;
  const g = ctx.createLinearGradient(0, 0, W, 0);
  g.addColorStop(0, '#2A1E06'); g.addColorStop(0.5, '#0A0A16'); g.addColorStop(1, '#061A33');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  bokeh(ctx, t, '#FFB300', { a: 0.12, n: 14 });
  bokeh(ctx, t + 40, '#1E9BFF', { a: 0.12, n: 14, dir: -1 });
  const press = env(lt, 0.85, 1.05, 0.05, 0.1);
  const grabbed = lt > 1.0;
  const banner = seg(lt, 0.05, 0.4) - seg(lt, 0.75, 0.9);
  drawPhone(ctx, 560, 560, 0.95, -0.07, 'Y', grabbed ? 'grabbed' : 'order', lt, { banner, press, ripple: lt > 0.95 ? (lt - 0.95) * 2.5 : -1 });
  drawPhone(ctx, 1360, 560, 0.95, 0.07, 'B', grabbed ? 'grabbed' : 'order', lt, { banner, press, ripple: lt > 0.95 ? (lt - 0.95) * 2.5 : -1 });
  if (lt > 1.1) mangaSFX(ctx, '！？', W / 2 - 80, 470, 130, { scale: 1 + 0.4 * (1 - Ease.outBack(seg(lt, 1.1, 1.3))), fill: ['#FFFFFF', '#FFE08A'] });
  rain(ctx, t, { n: 120, a: 0.15 });
}, S => ({ lb: 0, shake: S.lt > 0.9 && S.lt < 1.2 ? 6 : 0 }));

shot(33.6, 35.2, 'launch', (ctx, S) => {
  const { t, lt } = S;
  if (lt < 0.8) {
    blackBG(ctx);
    const r = Ease.outExpo(seg(lt, 0, 0.5));
    ctx.save(); ctx.translate(W / 2, H / 2);
    ctx.strokeStyle = rgba('#FF3B5C', 0.6 * (1 - r)); ctx.lineWidth = 30 * (1 - r) + 2;
    ctx.beginPath(); ctx.arc(0, 0, 200 + r * 700, 0, TAU); ctx.stroke();
    ctx.restore();
    speedRadial(ctx, W / 2, H / 2, t, { n: 70, inner: 450, color: '#FFFFFF', a: 0.18 });
    const sc = 1 + 0.6 * (1 - Ease.outBack(seg(lt, 0, 0.25)));
    ctx.save(); ctx.translate(W / 2, H / 2 + 80); ctx.scale(sc, sc); ctx.translate(-W / 2, -(H / 2 + 80));
    timerHUD(ctx, 1800, 1, { big: true, x: W / 2, y: H / 2 + 120, label: '开始配送 · DELIVERY START' });
    ctx.restore();
    return;
  }
  const l2 = lt - 0.8;
  const sx = Ease.inQuad(seg(l2, 0, 0.8)) * 900;
  streetScene(ctx, t, { scroll: sx + 2000 });
  const pop = Ease.inCubic(seg(l2, 0.15, 0.8));
  const lean = -0.16 * Math.sin(Math.PI * seg(l2, 0, 0.6));
  drawRider(ctx, 'B', 760 + pop * 300, 862, 0.8, { t, speed: 0.4 + pop, lean, pivot: [-168, -42], beam: true });
  drawRider(ctx, 'Y', 980 + pop * 340, 912, 0.95, { t, speed: 0.4 + pop, lean, pivot: [-150, -48], beam: true });
  sparkStream(ctx, 980 - 150 * 0.95 + pop * 340, 912, t, { rate: 90, dir: -2.6, spread: 0.9, vmin: 300, vmax: 900, life: 0.4 });
  splashes(ctx, t, { y0: 880, y1: 948, n: 30, rate: 8 });
  const sfx = seg(l2, 0.05, 0.25);
  if (sfx > 0) mangaSFX(ctx, '出发！', 1180, 330, 150, { rot: -0.1, scale: 1 + 0.6 * (1 - Ease.outBack(sfx)), font: FONT.brush, fill: ['#FFFFFF', '#FFE08A'], stroke2: '#FF4FD8' });
  rainLayers(ctx, t, { k: 0.6, vx: -600 });
}, S => ({ shake: S.lt > 0.8 ? 5 : 3, flash: Ease.inQuad(seg(S.lt, 1.45, 1.6)) * 0.85 }));

// ============================================================ ACT 3 ========
shot(35.2, 38.4, 'chase', (ctx, S) => {
  const { t, lt } = S;
  const sx = lt * 2600 + 5000;
  streetScene(ctx, t, { scroll: sx });
  const yX = 560 + Ease.inOutSine(seg(lt, 0, S.d)) * 420 + Math.sin(lt * 1.3) * 40, bX = 1420 - Ease.inOutSine(seg(lt, 0, S.d)) * 260 + Math.sin(lt * 1.1 + 1) * 40;
  lightTrail(ctx, bX - 168 * 1.0, 872 - 42, '#3CC4FF', 1100, 9);
  drawRider(ctx, 'B', bX, 872, 1.0, { t, beam: true });
  lightTrail(ctx, yX - 150 * 1.15, 936 - 55, '#FFD84A', 1100, 11);
  drawRider(ctx, 'Y', yX, 936, 1.15, { t: t + 0.2, beam: true });
  speedHorizontal(ctx, t, { n: 26, a: 0.25, y0: 140, y1: 940 });
  rainLayers(ctx, t, { k: 0.7, vx: -1500 });
  S.timer = 29 * 60 + 41 - lt;
}, { shake: 2.5 });

shot(38.4, 40.0, 'whoosh', (ctx, S) => {
  const { t, lt } = S;
  streetScene(ctx, t, { scroll: 9000 + lt * 300 });
  const pass = (who, t0, y, s) => {
    const u = (lt - t0) / 0.55;
    if (u < -0.1 || u > 1.2) return;
    const x = lerp(-900, 2900, Ease.inOutSine(clamp(u)));
    lightTrail(ctx, x - 150 * s, y - 50 * s, TH[who].glow, 1600, 18);
    riderBlur(ctx, who, x, y, s, { t, beam: true }, 4, 70);
    if (u > 0.3 && u < 0.9) for (let k = 0; k < 2; k++) sparkBurst(ctx, x - 140 * s, y, (u - 0.3) * 0.6, { n: 26, seed: k + (who === 'Y' ? 1 : 5), dir: -2.7, spread: 0.8, vmin: 400, vmax: 1300, life: 0.5 });
  };
  pass('Y', 0.05, 1060, 2.3);
  pass('B', 0.55, 1020, 2.0);
  rainLayers(ctx, t, { k: 0.6, vx: -500 });
  if (lt > 0.4) lensDrops(ctx, lt, { n: 14, a: clamp((lt - 0.4) * 3) });
  if (lt > 0.2 && lt < 1.2) mangaSFX(ctx, '嗖——', 300, 330, 120, { rot: -0.08, alpha: env(lt, 0.2, 1.2, 0.05, 0.3), font: FONT.brush, fill: ['#FFFFFF', '#BFE6FF'] });
}, S => ({ shake: (S.lt > 0.15 && S.lt < 0.6) || (S.lt > 0.65 && S.lt < 1.1) ? 12 : 2 }));

shot(40.0, 41.6, 'map', (ctx, S) => {
  drawMapUI(ctx, S.lt, S.d);
  S.timer = 27 * 60 + 12 - S.lt;
}, { scene: 0.2 });

// coupons fired backwards by Ele.me
function couponStorm(ctx, t, lt, fromX, fromY, o = {}) {
  const labels = ['满30减15', '¥5', '满20减8', '¥10', '免配送', '¥3'];
  for (let i = 0; i < 40; i++) {
    const t0 = 0.25 + i * 0.05;
    const age = lt - t0;
    if (age < 0 || age > 1.6) continue;
    const ang = Math.PI + (hash1(i + 300) - 0.5) * 0.9;
    const v = 1100 + 700 * hash1(i + 310);
    const x = fromX + Math.cos(ang) * v * age, y = fromY + Math.sin(ang) * v * age + 260 * age * age;
    if (x < -200 || y > 1000) continue;
    coupon(ctx, x, y, 0.8 + 0.4 * hash1(i + 320), age * 2 + i, age * 14 + i, labels[i % labels.length]);
    emitFill(ctx, circlePath(x, y, 40), '#3CC4FF', 0.25);
    if (hash1(i + 330) > 0.7 && age > 0.6 && age < 0.9) sparkBurst(ctx, x, y, age - 0.6, { n: 16, seed: i, life: 0.3, vmax: 700 });
  }
}
shot(41.6, 44.8, 'coupon', (ctx, S) => {
  const { t, lt } = S;
  const sx = lt * 2400 + 12000;
  streetScene(ctx, t, { scroll: sx });
  ctx.save(); ctx.globalCompositeOperation = 'color'; ctx.fillStyle = 'rgba(30,110,255,0.25)'; ctx.fillRect(0, 0, W, H); ctx.restore();
  const yDodge = Math.sin(seg(lt, 0.6, 2.2) * Math.PI * 3) * 26;
  const throwK = env(lt, 0.15, 1.6, 0.15, 0.4);
  lightTrail(ctx, 1260 - 168 * 0.82, 862 - 34, '#3CC4FF', 1100, 8);
  drawRider(ctx, 'B', 1260, 862, 0.82, { t, armBack: throwK, beam: true });
  lightTrail(ctx, 520 - 150 * 0.95, 912 - 46 + yDodge, '#FFD84A', 900, 10);
  drawRider(ctx, 'Y', 520, 912 + yDodge, 0.95, { t: t + 0.3, lean: yDodge * 0.004, beam: true });
  couponStorm(ctx, t, lt, 1180, 700);
  rainLayers(ctx, t, { k: 0.6, vx: -1400 });
  attackName(ctx, lt - 0.1, 2.9, '千券乱舞', 'COUPON STORM', '#2AA8FF', { x: 110, y: 290 });
  if (lt > 0.6 && lt < 2.4) mangaSFX(ctx, '唰唰唰', 1250, 420, 90, { rot: 0.12, jitter: true, t, fill: ['#FFFFFF', '#CDEBFF'] });
  S.timer = 24 * 60 + 13 - lt;
}, { shake: 3 });

shot(44.8, 48.0, 'blitz', (ctx, S) => {
  const { t, lt } = S;
  const sx = lt * 2800 + 16000;
  streetScene(ctx, t, { scroll: sx });
  ctx.save(); ctx.globalCompositeOperation = 'color'; ctx.fillStyle = 'rgba(255,170,0,0.22)'; ctx.fillRect(0, 0, W, H); ctx.restore();
  const hop = seg(lt, 0.7, 1.9);
  const hy = -Math.sin(hop * Math.PI) * 300;
  const yx = lerp(380, 1150, Ease.inOutCubic(seg(lt, 0.5, 2.4)));
  const bx = 1250 - Ease.inCubic(seg(lt, 1.2, 3.2)) * 500;
  drawRider(ctx, 'B', bx, 862, 0.82, { t, beam: true });
  // coupon wall being smashed
  const smash = seg(lt, 1.05, 1.6);
  for (let i = 0; i < 18; i++) {
    const cx0 = 860 + (i % 3) * 70, cy0 = 520 + Math.floor(i / 3) * 70;
    const out = Ease.outCubic(smash);
    const ax = (hash1(i + 500) - 0.3) * 900, ay = (hash1(i + 510) - 0.6) * 700;
    if (smash < 1) coupon(ctx, cx0 + ax * out, cy0 + ay * out + 300 * out * out, 0.75, (hash1(i + 520) - 0.5) * 2 * out, i + out * 10, ['满30减15', '¥5', '¥10'][i % 3]);
  }
  if (smash > 0 && smash < 1) sparkBurst(ctx, 900, 640, smash * 0.6, { n: 60, seed: 9, spread: TAU, vmin: 300, vmax: 1600, life: 0.6, flash: 200 });
  // golden aura + afterimages
  const aura = env(lt, 0.5, 2.6, 0.2, 0.5);
  for (let k = 3; k >= 1; k--) {
    ctx.save(); ctx.globalAlpha = 0.25 * aura;
    drawRider(ctx, 'Y', yx - k * 120, 912 + hy * (1 - k * 0.12), 0.95, { t, sil: 0.4, noUnderglow: true, glow: 0.5, lean: -hop * 0.2 });
    ctx.restore();
  }
  glow(ctx, yx - 30, 912 + hy - 160, 420 * aura, '#FFC400', 0.55 * aura);
  speedRadial(ctx, yx, 912 + hy - 160, t, { n: 50, inner: 300, color: '#FFE08A', a: 0.25 * aura });
  drawRider(ctx, 'Y', yx, 912 + hy, 0.95, { t, lean: -0.25 * Math.sin(hop * Math.PI), pivot: [-150, -48], beam: true, glow: 1.4 });
  rainLayers(ctx, t, { k: 0.6, vx: -1600 });
  attackName(ctx, lt - 0.05, 2.9, '袋鼠闪击', 'KANGAROO BLITZ', '#FFC400', { x: 110, y: 290 });
  if (smash > 0 && smash < 1) mangaSFX(ctx, '砰！', 1000, 400, 170, { rot: -0.15, scale: 1 + 0.5 * (1 - Ease.outBack(clamp(smash * 3))), font: FONT.brush, fill: ['#FFFFFF', '#FFE08A'], stroke2: '#FF6A00' });
  S.timer = 21 * 60 + 5 - lt;
}, S => ({ shake: S.lt > 1.0 && S.lt < 1.5 ? 16 : 3, flash: env(S.lt, 1.05, 1.25, 0.02, 0.15) * 0.5, flashC: '#FFE9A0' }));

shot(48.0, 49.6, 'grind', (ctx, S) => {
  const { t, lt } = S;
  const sx = lt * 3000 + 22000;
  ctx.save(); ctx.translate(W / 2, H / 2); ctx.scale(1.25, 1.25); ctx.translate(-W / 2, -H / 2 - 80);
  streetScene(ctx, t, { scroll: sx });
  drawRider(ctx, 'B', 1010, 870, 0.92, { t, beam: true, lean: 0.03 });
  drawRider(ctx, 'Y', 960, 912, 1.0, { t: t + 0.3, beam: true, lean: -0.03 });
  sparkStream(ctx, 980, 852, t, { rate: 160, dir: -2.9, spread: 1.2, vmin: 300, vmax: 1300, life: 0.5, wind: -400, flash: 90 });
  ctx.restore();
  speedHorizontal(ctx, t, { n: 30, a: 0.3, y0: 140, y1: 940 });
  rainLayers(ctx, t, { k: 0.6, vx: -1800 });
  if (lt > 0.15) mangaSFX(ctx, '铛！！', 1240, 330, 150, { rot: 0.12, scale: 1 + 0.5 * (1 - Ease.outBack(seg(lt, 0.15, 0.35))), font: FONT.brush, fill: ['#FFFFFF', '#FFF0C0'], stroke2: '#FF8A2A' });
  S.timer = 18 * 60 + 47 - lt;
}, { shake: 9 });

shot(49.6, 51.2, 'lineY', (ctx, S) => {
  const { t, lt } = S;
  portraitBG(ctx, t, '#FF8A00', { lines: true });
  drawBust(ctx, 'Y', 960, 540, 1.9, { t, yaw: 0.3, expr: 'shout', rim: '#FFE7A0', wind: 1.2, talk: 0 });
  speakerSub(ctx, lt, S.d, 'Y', '补贴再多，也买不到速度！', 'Subsidies can\'t buy speed!');
}, { shake: 4 });
shot(51.2, 52.8, 'lineB', (ctx, S) => {
  const { t, lt } = S;
  portraitBG(ctx, t, '#1E8FFF', { dir: -1 });
  drawBust(ctx, 'B', 960, 540, 1.9, { t, yaw: -0.3, expr: 'smirk', rim: '#BDF2FF', talk: talkK(lt, 0.15, 1.0), wind: 1.0 });
  speakerSub(ctx, lt, S.d, 'B', '可惜……我两样都有。', 'Too bad… I have both.');
});

shot(52.8, 54.4, 'ramp', (ctx, S) => {
  const { t, lt } = S;
  const tilt = Ease.inQuad(seg(lt, 0.5, 1.6)) * 260;
  ctx.save(); ctx.translate(0, tilt);
  streetScene(ctx, t, { scroll: lt * 2600 + 30000 });
  // ramp structure
  const rx = 1100 - lt * 700;
  ctx.fillStyle = '#0B0A1E';
  for (let k = 0; k < 6; k++) ctx.fillRect(rx + 80 + k * 90, 905 - k * 40, 10, k * 40 + 40);
  const ramp = poly([rx, 910, rx + 620, 680, rx + 640, 700, rx + 20, 925]);
  flat(ctx, ramp, '#3A3A52', INK, 3);
  ctx.save(); ctx.clip(ramp); ctx.fillStyle = '#FFD100';
  for (let k = 0; k < 20; k++) ctx.fill(poly([rx + k * 40, 930, rx + k * 40 + 20, 930, rx + k * 40 + 60, 660, rx + k * 40 + 40, 660]));
  ctx.restore();
  const up = (who, d0, x0, s) => {
    const u = seg(lt, d0, d0 + 0.9);
    const x = x0 + u * 1100;
    const y = 912 - Math.max(0, (x - rx)) * 0.37 - Ease.inQuad(u) * 300;
    drawRider(ctx, who, x, y, s, { t, lean: -0.36 * clamp((x - rx) / 200), pivot: [0, 0], beam: true });
  };
  up('B', 0.1, 380, 0.85);
  up('Y', 0.35, 200, 0.95);
  ctx.restore();
  rainLayers(ctx, t, { k: 0.6, vx: -1200 });
  titleText(ctx, '目标：天台', 160, 300, 70, { font: FONT.serif, align: 'left', fill: ['#FFFFFF', '#E4E8FF'], glow: 'rgba(200,210,255,0.6)', alpha: env(lt, 0.2, 1.5, 0.2, 0.3), spacing: 8 });
  S.timer = 12 * 60 + 30 - lt;
}, { shake: 4 });

shot(54.4, 56.0, 'impact', (ctx, S) => {
  const { t, lt } = S;
  const inv = Math.floor(lt * 12) % 2 === 1 && lt < 0.5;
  ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, W, H);
  speedRadial(ctx, W * 0.55, H * 0.4, t, { n: 140, inner: 330, color: '#000000', a: 1, wk: 1.6 });
  const rise = Ease.outCubic(seg(lt, 0, S.d));
  ctx.save();
  ctx.translate(W * 0.5 + rise * 120, H * 0.62 - rise * 140);
  ctx.rotate(-0.35);
  drawRider(ctx, 'B', 260, -60, 1.1, { t, sil: 1, noUnderglow: true, glow: 0 });
  drawRider(ctx, 'Y', -180, 120, 1.25, { t, sil: 1, noUnderglow: true, glow: 0 });
  ctx.restore();
  mangaSFX(ctx, '飞——！', 1280, 760, 170, { rot: -0.2, font: FONT.brush, fill: ['#000', '#000'], stroke: '#fff', scale: 1 + 0.3 * (1 - Ease.outBack(seg(lt, 0, 0.25))) });
  if (inv) { ctx.save(); ctx.globalCompositeOperation = 'difference'; ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, W, H); ctx.restore(); }
}, { lb: 1, bloom: 0, scene: 0, vig: 0.3, grain: 0.08, shake: 8 });
