'use strict';
// ============================================================================
//  World: sky, stars, moon, anime clouds, route streams, skylines (cached with
//  emissive twins), street, rooftops, tower, billboard.
// ============================================================================

const PAL = {
  skyTop: '#07061C', skyMid: '#141344', skyLow: '#2E1F63', haze: '#4B2C7E',
  cloud: '#262A78', cloudRim: '#6E73E8', cloudDark: '#161752',
  bFar: '#2A2A6E', bMid: '#16174A', bNear: '#0C0C2A',
  win: ['#9FE8FF', '#FFFFFF', '#FFC86B', '#FF7AB6', '#8CF0D8'],
  neon: ['#FF8A2A', '#FF4FA0', '#3CF2FF', '#FFD84A', '#B26BFF'],
};

// ----------------------------------------------------------------- layers ---
// a cached layer = colour canvas + emissive canvas (lights only) of equal size
function makeLayer(w, h) {
  const c = makeCanvas(w, h), e = makeCanvas(w * EMIT.k, h * EMIT.k);
  const g = c.getContext('2d'), eg = e.getContext('2d');
  eg.scale(EMIT.k, EMIT.k);
  return { c, e, g, eg, w, h };
}
// draw a layer (optionally wrapped horizontally for scrolling) with emission
function drawLayer(ctx, L, x, y, o = {}) {
  const w = o.w ?? L.w, h = o.h ?? L.h, a = o.a ?? 1;
  const sx = w / L.w;
  const draw = (dx) => {
    ctx.drawImage(L.c, dx, y, w, h);
    const e = emitFor(ctx);
    if (e) { // occlude light behind the opaque layer, then add the layer's own lights
      e.save(); e.globalCompositeOperation = 'destination-out'; e.globalAlpha = a; e.drawImage(L.c, dx, y, w, h); e.restore();
      if (o.emit !== false) emitImage(ctx, L.e, dx, y, w, h, (o.emitK ?? 1) * a);
    }
  };
  ctx.save(); ctx.globalAlpha *= a;
  if (o.wrap) {
    let dx = mod(x, w) - w;
    while (dx < W) { draw(dx); dx += w; }
  } else draw(x);
  ctx.restore();
}

// --------------------------------------------------------------- sky/moon ---
function drawSky(ctx, t, o = {}) {
  const g = ctx.createLinearGradient(0, o.y0 ?? 0, 0, o.y1 ?? H);
  g.addColorStop(0, o.top ?? PAL.skyTop); g.addColorStop(0.55, o.mid ?? PAL.skyMid); g.addColorStop(1, o.low ?? PAL.skyLow);
  ctx.fillStyle = g; ctx.fillRect(-50, -50, W + 100, H + 100);
  if (o.stars !== false) stars(ctx, t, o.starA ?? 1, o.ox ?? 0, o.oy ?? 0);
}
function stars(ctx, t, a = 1, ox = 0, oy = 0) {
  ctx.save();
  for (let i = 0; i < 260; i++) {
    const x = mod(hash2(i, 801) * W * 1.3 + ox, W * 1.3) - W * 0.15, y = mod(hash2(i, 802) * H * 0.85 + oy, H);
    const tw = 0.55 + 0.45 * Math.sin(t * (1 + hash2(i, 803) * 3) + i);
    const r = 0.8 + 1.6 * Math.pow(hash2(i, 804), 3);
    ctx.globalAlpha = a * tw * (0.35 + 0.65 * hash2(i, 805));
    ctx.fillStyle = hash2(i, 806) > 0.85 ? '#bfe6ff' : '#ffffff';
    ctx.fillRect(x, y, r, r);
  }
  ctx.restore();
}
function drawMoon(ctx, x, y, r, o = {}) {
  const a = o.a ?? 1;
  glow(ctx, x, y, r * 3.0, o.halo ?? '#8E9BFF', 0.32 * a, 1.6, 0.3);
  glow(ctx, x, y, r * 1.6, '#E8EEFF', 0.35 * a, 2.2, 0.3);
  ctx.save(); ctx.globalAlpha *= a;
  const g = ctx.createRadialGradient(x - r * 0.25, y - r * 0.25, r * 0.1, x, y, r);
  g.addColorStop(0, '#FFFFFF'); g.addColorStop(0.7, '#F4F6FF'); g.addColorStop(1, o.edge ?? '#D9DEFF');
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
  emitFill(ctx, circlePath(x, y, r), '#ffffff', 0.45 * a);
  // faint maria
  ctx.fillStyle = 'rgba(170,180,230,0.16)';
  for (let k = 0; k < 6; k++) { ctx.beginPath(); ctx.arc(x + (hash1(k + 40) - 0.5) * r * 1.1, y + (hash1(k + 50) - 0.5) * r * 1.1, r * (0.08 + hash1(k + 60) * 0.16), 0, TAU); ctx.fill(); }
  ctx.restore();
}

// ----------------------------------------------------------------- clouds ---
function cloudPath(w, h, seed) {
  // union of upper half-ellipses on a flat base (all subpaths counter-clockwise)
  const p = new Path2D();
  const n = 3 + Math.floor(hash1(seed) * 3);
  let tot = 0; const bumps = [];
  for (let i = 0; i < n; i++) { const b = 0.6 + hash2(seed, i) * 0.8; bumps.push(b); tot += b; }
  let x = 0;
  for (let i = 0; i < n; i++) {
    const bw = bumps[i] / tot * w;
    const edge = (i === 0 || i === n - 1) ? 0.62 : 1;
    const bh = h * (0.55 + 0.45 * hash2(seed, i + 10)) * edge;
    const rx = bw * 0.64;
    p.moveTo(x + bw / 2 + rx, 0);
    p.ellipse(x + bw / 2, 0, rx, bh, 0, 0, Math.PI, true);
    p.closePath();
    x += bw;
  }
  p.moveTo(0, 0); p.lineTo(w, 0); p.lineTo(w, -h * 0.3); p.lineTo(0, -h * 0.3); p.closePath();
  return p;
}
function drawCloud(ctx, x, y, w, h, seed, o = {}) {
  const p = cloudPath(w, h, seed);
  ctx.save(); ctx.translate(x, y);
  ctx.globalAlpha *= o.a ?? 1;
  ctx.save(); ctx.clip(p);
  ctx.fillStyle = o.rim ?? PAL.cloudRim; ctx.fill(p);
  ctx.translate(o.rx ?? 0, o.rw ?? 6);
  ctx.fillStyle = o.col ?? PAL.cloud; ctx.fill(p);
  ctx.restore();
  ctx.save(); ctx.clip(p);
  const g = ctx.createLinearGradient(0, -h, 0, 0);
  g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, rgba(o.dark ?? PAL.cloudDark, 0.85));
  ctx.fillStyle = g; ctx.fillRect(-w, -h * 1.5, w * 3, h * 1.5);
  ctx.restore();
  ctx.restore();
}
// a band of clouds across the frame (drifting)
function cloudBank(ctx, t, o = {}) {
  const n = o.n ?? 6, y = o.y ?? 600, seed = o.seed ?? 3, sc = o.scale ?? 1, drift = o.drift ?? 8;
  const span = W + 900;
  for (let i = 0; i < n; i++) {
    const w = (360 + 380 * hash2(i, seed)) * sc, h = (120 + 110 * hash2(i, seed + 1)) * sc;
    const x = mod(hash2(i, seed + 2) * span + t * drift * (0.6 + 0.6 * hash2(i, seed + 3)) + (o.ox ?? 0), span) - 450;
    drawCloud(ctx, x, y + (hash2(i, seed + 4) - 0.5) * (o.jy ?? 80), w, h, seed * 31 + i, o);
  }
}

// ---------------------------------------------------------- route streams ---
function routeStreams(ctx, t, o = {}) {
  const cols = o.cols ?? ['#FFD84A', '#3CC4FF'];
  const y0 = o.y ?? 260, amp = o.amp ?? 60;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  cols.forEach((col, ci) => {
    for (let k = 0; k < 3; k++) {
      const p = new Path2D();
      const ph = t * (0.6 + ci * 0.15) + k * 0.5 + ci * 2;
      for (let x = -40; x <= W + 40; x += 30) {
        const yy = y0 + ci * 26 + Math.sin(x * 0.004 + ph) * amp + Math.sin(x * 0.011 - ph * 1.3) * amp * 0.25 + k * 10;
        if (x === -40) p.moveTo(x, yy); else p.lineTo(x, yy);
      }
      ctx.strokeStyle = rgba(col, (o.a ?? 0.3) * (1 - k * 0.25)); ctx.lineWidth = 3 - k * 0.6;
      ctx.stroke(p);
      const e = emitFor(ctx); if (e) { e.globalAlpha = 0.4; e.strokeStyle = col; e.lineWidth = 4; e.stroke(p); }
    }
  });
  ctx.restore();
}

// --------------------------------------------------------------- skylines ---
const SIGN_WORDS = ['火锅', '面馆', '奶茶', '烧烤', '饺子', '网吧', '酒店', '药店', '超市', '茶餐厅', '咖啡', '按摩', '24H', '外卖', '便利店', '夜宵', '麻辣烫', '书店'];
function genSkyline(w, h, seed, o = {}) {
  const L = makeLayer(w, h);
  const g = L.g, eg = L.eg, r = new RNG(seed);
  const items = [];
  let x = -20;
  while (x < w) {
    const bw = r.range(o.minW ?? 90, o.maxW ?? 220);
    const bh = r.range(o.minH ?? 200, o.maxH ?? 600) * (r.chance(0.12) ? 1.35 : 1);
    items.push({ x, bw, bh, s: r.int(0, 1e9) });
    x += bw + r.range(-14, 24);
  }
  // draw each item, plus wrapped copy for seamless tiling
  for (const it of items) {
    for (const off of [0, -w, w]) {
      if (it.x + off > w + 10 || it.x + it.bw + off < -10) continue;
      drawBuilding(g, eg, it.x + off, h - it.bh, it.bw, it.bh, new RNG(it.s), o);
    }
  }
  // atmospheric haze towards the bottom
  if (o.haze !== false) {
    const hg = g.createLinearGradient(0, h * 0.35, 0, h);
    hg.addColorStop(0, rgba(o.hazeC ?? PAL.haze, 0)); hg.addColorStop(1, rgba(o.hazeC ?? PAL.haze, o.hazeA ?? 0.35));
    g.fillStyle = hg; g.fillRect(0, 0, w, h);
  }
  return L;
}
function drawBuilding(g, eg, x, y, bw, bh, r, o) {
  const body = o.body ?? PAL.bMid;
  const top = y;
  // silhouette with optional setback / crown / antenna
  g.fillStyle = body;
  g.fillRect(x, top, bw, bh + 2);
  let roofY = top;
  if (r.chance(0.35)) { // setback tier
    const tw = bw * r.range(0.45, 0.75), th = r.range(30, 90);
    g.fillRect(x + (bw - tw) / 2, top - th, tw, th + 1);
    roofY = top - th;
    if (r.chance(0.5)) { g.fillRect(x + bw / 2 - 2, roofY - r.range(30, 80), 4, 90); } // antenna
  } else if (r.chance(0.25)) { // spire
    g.beginPath(); g.moveTo(x + bw * 0.3, top); g.lineTo(x + bw / 2, top - r.range(60, 140)); g.lineTo(x + bw * 0.7, top); g.fill();
  }
  // rim light on one edge
  g.fillStyle = rgba(o.rimC ?? '#6E73E8', o.rimA ?? 0.35); g.fillRect(x + bw - 3, top, 3, bh);
  // windows
  const ws = o.win ?? 1;
  const cw = 7 * ws, ch = 9 * ws, gx = 14 * ws, gy = 18 * ws;
  const mode = r.int(0, 3);
  const litP = r.range(0.12, 0.5);
  const pal = o.winPal ?? PAL.win;
  const cols = Math.floor((bw - 16) / gx), rows = Math.floor((bh - 20) / gy);
  const x0 = x + (bw - cols * gx) / 2 + (gx - cw) / 2;
  const colPick = r.int(0, pal.length - 1);
  for (let j = 0; j < rows; j++) {
    if (mode === 1 && j % 3 === 2) continue;
    const rowLit = r.chance(0.9);
    for (let i = 0; i < cols; i++) {
      if (!rowLit || !r.chance(litP)) continue;
      const c = r.chance(0.7) ? pal[colPick] : r.pick(pal);
      const a = r.range(0.45, 1);
      const wx = x0 + i * gx, wy = y + 14 * ws + j * gy;
      g.fillStyle = rgba(c, a); g.fillRect(wx, wy, mode === 2 ? cw * 1.8 : cw, ch);
      eg.fillStyle = rgba(c, a * 0.5); eg.fillRect(wx, wy, mode === 2 ? cw * 1.8 : cw, ch);
    }
  }
  // vertical neon strip
  if (r.chance(o.stripP ?? 0.3)) {
    const c = r.pick(PAL.neon), sx = r.chance(0.5) ? x + 6 : x + bw - 10;
    const sy = y + r.range(10, bh * 0.3), sh = r.range(bh * 0.25, bh * 0.6);
    g.fillStyle = c; g.fillRect(sx, sy, 4, sh);
    eg.fillStyle = c; eg.fillRect(sx - 2, sy, 8, sh);
  }
  // vertical sign with characters
  if (o.signs && r.chance(o.signP ?? 0.3) && bw > 80) {
    const word = r.pick(SIGN_WORDS), c = r.pick(PAL.neon);
    const sz = o.signSize ?? 26;
    const sx = r.chance(0.5) ? x - sz * 0.3 : x + bw - sz * 0.9, sy = y + r.range(30, Math.max(40, bh * 0.4));
    const n = Array.from(word).length;
    g.fillStyle = '#0B0A1C'; g.fillRect(sx, sy, sz * 1.25, n * sz * 1.15 + 12);
    g.strokeStyle = c; g.lineWidth = 2; g.strokeRect(sx, sy, sz * 1.25, n * sz * 1.15 + 12);
    g.font = font(sz, FONT.sans, '900'); g.textAlign = 'center'; g.textBaseline = 'top';
    g.fillStyle = tint(c, 0.4); eg.fillStyle = c; eg.font = g.font; eg.textAlign = 'center'; eg.textBaseline = 'top';
    Array.from(word).forEach((ch2, k) => {
      g.fillText(ch2, sx + sz * 0.62, sy + 8 + k * sz * 1.15);
      eg.fillText(ch2, sx + sz * 0.62, sy + 8 + k * sz * 1.15);
    });
    eg.strokeStyle = c; eg.lineWidth = 3; eg.strokeRect(sx, sy, sz * 1.25, n * sz * 1.15 + 12);
  }
  // aviation light
  if (bh > (o.avH ?? 380) && r.chance(0.6)) {
    g.fillStyle = '#FF3355'; g.fillRect(x + bw / 2 - 3, roofY - 6, 6, 6);
    eg.fillStyle = '#FF3355'; eg.beginPath(); eg.arc(x + bw / 2, roofY - 3, 7, 0, TAU); eg.fill();
  }
}

// ------------------------------------------------------- the great tower ---
function drawTower(ctx, cx, baseY, s, t, o = {}) {
  ctx.save(); ctx.translate(cx, baseY); ctx.scale(s, s);
  const body = poly([-170, 0, -150, -1300, -110, -1560, -60, -1700, 60, -1700, 110, -1560, 150, -1300, 170, 0]);
  const g = ctx.createLinearGradient(-170, 0, 170, 0);
  g.addColorStop(0, '#0F1240'); g.addColorStop(0.5, '#1B1F5E'); g.addColorStop(1, '#0B0C30');
  ctx.fillStyle = g; ctx.fill(body);
  ctx.save(); ctx.clip(body);
  // lit vertical ribs
  for (let k = -6; k <= 6; k++) {
    const x = k * 24;
    ctx.fillStyle = k % 3 === 0 ? 'rgba(120,200,255,0.55)' : 'rgba(120,200,255,0.18)';
    ctx.fillRect(x - 1.5, -1700, 3, 1700);
  }
  for (let y = -60; y > -1700; y -= 46) {
    ctx.fillStyle = 'rgba(255,220,150,0.12)'; ctx.fillRect(-200, y, 400, 3);
  }
  ctx.restore();
  emitFill(ctx, poly([-1.5, 0, 1.5, 0, 1.5, -1700, -1.5, -1700]), '#78C8FF', 0.4);
  // crown ring + helipad
  ctx.fillStyle = '#0A0B26'; ctx.fillRect(-70, -1716, 140, 18);
  neon(ctx, poly([-70, -1716, 70, -1716], false), '#3CF2FF', 2, 1);
  // spire
  ctx.strokeStyle = '#0A0B26'; ctx.lineWidth = 10; ctx.beginPath(); ctx.moveTo(0, -1716); ctx.lineTo(0, -2050); ctx.stroke();
  ctx.lineWidth = 4; ctx.strokeStyle = '#3a3f80'; ctx.beginPath(); ctx.moveTo(0, -1716); ctx.lineTo(0, -2050); ctx.stroke();
  const blink = 0.5 + 0.5 * Math.sin(t * 5);
  for (const yy of [-1800, -1920, -2050]) glow(ctx, 0, yy, 26, '#FF3355', 0.5 + 0.5 * blink);
  // name plate
  if (o.label !== false) {
    ctx.font = font(44, FONT.sans, '900'); ctx.textAlign = 'center'; ctx.fillStyle = '#9FE8FF';
    ctx.fillText('云顶', 0, -1500); ctx.fillText('大厦', 0, -1450);
    emitFill(ctx, rrectPath(-50, -1546, 100, 106, 6), '#3CF2FF', 0.25);
  }
  ctx.restore();
}

// ------------------------------------------------------ world init (cache) --
const World = {
  init() {
    this.far = genSkyline(3840, 700, 11, { body: PAL.bFar, minH: 160, maxH: 480, win: 0.7, rimA: 0.15, hazeA: 0.5, stripP: 0.1, avH: 350 });
    this.mid = genSkyline(3840, 800, 23, { body: PAL.bMid, minH: 220, maxH: 640, signs: true, signP: 0.35, hazeA: 0.4 });
    this.near = genSkyline(3840, 900, 37, { body: PAL.bNear, minW: 150, maxW: 300, minH: 260, maxH: 760, win: 1.4, signs: true, signP: 0.6, signSize: 40, hazeA: 0.25, stripP: 0.45 });
    this.shops = genShopfronts(3840, 560, 51);
    this.roofs = genRooftops(6400, 700, 63);
  },
};
