'use strict';
// ============================================================================
//  Scene builders: street (side-scroll), rooftops, helipad, map UI, phone UI,
//  energy constructs, coupons, eye close-ups, VS / face-off panels.
// ============================================================================

const SHOP_NAMES = ['老王牛肉面', '川味火锅', '老街烧烤', '张记饺子', '鲜榨果汁', '24H便利店', '麻辣烫', '煲仔饭', '奶茶', '兰州拉面', '网咖', '大药房', '夜宵', '茶餐厅', '小笼包', '螺蛳粉'];

// ------------------------------------------------------------ shopfronts ---
function genShopfronts(w, h, seed) {
  const L = makeLayer(w, h), g = L.g, eg = L.eg, r = new RNG(seed);
  let x = 0;
  const blds = [];
  while (x < w) { const bw = r.range(260, 420); blds.push({ x, bw, s: r.int(0, 1e9) }); x += bw; }
  // stretch last to fit seamlessly
  const k = w / x; blds.forEach(b => { b.x *= k; b.bw *= k; });
  for (const b of blds) {
    const rr = new RNG(b.s);
    const top = rr.range(0, h * 0.35);
    const body = rr.pick(['#15143A', '#1A1640', '#121331', '#1D1A46']);
    g.fillStyle = body; g.fillRect(b.x, top, b.bw + 1, h - top);
    g.fillStyle = 'rgba(110,115,232,0.25)'; g.fillRect(b.x + b.bw - 3, top, 3, h - top);
    // upper windows
    const shopH = 190, shopY = h - shopH;
    for (let wy = top + 30; wy < shopY - 60; wy += 58) {
      for (let wx = b.x + 24; wx < b.x + b.bw - 50; wx += 62) {
        const lit = rr.chance(0.3);
        const c = rr.pick(PAL.win);
        g.fillStyle = lit ? rgba(c, 0.7) : '#0C0B22'; g.fillRect(wx, wy, 30, 34);
        if (lit) { eg.fillStyle = rgba(c, 0.3); eg.fillRect(wx, wy, 30, 34); }
        g.fillStyle = '#0A0A1C'; g.fillRect(wx - 3, wy + 40, 46, 5);
        if (rr.chance(0.25)) { // AC unit
          g.fillStyle = '#2A2C4A'; g.fillRect(wx + 2, wy + 46, 36, 18); g.strokeStyle = '#11122A'; g.lineWidth = 2; g.strokeRect(wx + 2, wy + 46, 36, 18);
          g.beginPath(); g.arc(wx + 14, wy + 55, 6, 0, TAU); g.stroke();
        }
      }
    }
    // shop: awning + lit window + sign
    const sc = rr.pick(PAL.neon);
    g.fillStyle = '#0A0918'; g.fillRect(b.x, shopY, b.bw, shopH);
    const lg = g.createLinearGradient(0, shopY + 60, 0, h);
    lg.addColorStop(0, rgba('#FFD9A0', 0.55)); lg.addColorStop(1, rgba('#C8603A', 0.4));
    g.fillStyle = lg; g.fillRect(b.x + 20, shopY + 70, b.bw - 40, shopH - 70);
    eg.fillStyle = rgba('#FFC27A', 0.35); eg.fillRect(b.x + 20, shopY + 70, b.bw - 40, shopH - 70);
    // people silhouettes inside
    g.fillStyle = 'rgba(40,20,30,0.75)';
    for (let p = 0; p < 2; p++) { const px = b.x + 40 + rr.range(0, b.bw - 100); g.beginPath(); g.arc(px, shopY + 120, 12, 0, TAU); g.fill(); g.fillRect(px - 16, shopY + 132, 32, 60); }
    // awning stripes
    for (let k2 = 0; k2 < Math.ceil(b.bw / 30); k2++) { g.fillStyle = k2 % 2 ? sc : '#EDEDF5'; g.fillRect(b.x + k2 * 30, shopY + 50, 30, 18); }
    // sign board
    const name = rr.pick(SHOP_NAMES);
    g.fillStyle = '#0B0A1C'; g.fillRect(b.x + 10, shopY, b.bw - 20, 48);
    g.strokeStyle = sc; g.lineWidth = 3; g.strokeRect(b.x + 12, shopY + 2, b.bw - 24, 44);
    g.font = font(32, FONT.sans, '900'); g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillStyle = tint(sc, 0.45); g.fillText(name, b.x + b.bw / 2, shopY + 25);
    eg.font = g.font; eg.textAlign = 'center'; eg.textBaseline = 'middle'; eg.fillStyle = sc; eg.fillText(name, b.x + b.bw / 2, shopY + 25);
    eg.strokeStyle = sc; eg.lineWidth = 4; eg.strokeRect(b.x + 12, shopY + 2, b.bw - 24, 44);
    // vertical sign
    if (rr.chance(0.5)) {
      const vw = rr.pick(SIGN_WORDS), vc = rr.pick(PAL.neon), n = Array.from(vw).length;
      const vx = b.x + b.bw - 60, vy = top + 40;
      g.fillStyle = '#0B0A1C'; g.fillRect(vx, vy, 50, n * 52 + 16); g.strokeStyle = vc; g.lineWidth = 3; g.strokeRect(vx, vy, 50, n * 52 + 16);
      g.font = font(40, FONT.sans, '900'); g.fillStyle = tint(vc, 0.45); eg.font = g.font; eg.fillStyle = vc;
      Array.from(vw).forEach((ch, i) => { g.fillText(ch, vx + 25, vy + 34 + i * 52); eg.fillText(ch, vx + 25, vy + 34 + i * 52); });
      eg.strokeStyle = vc; eg.lineWidth = 4; eg.strokeRect(vx, vy, 50, n * 52 + 16);
    }
  }
  return L;
}

// reflection of a layer in wet ground (flipped, squashed, faded, rippled)
function wetReflection(ctx, L, x, yTop, h, t, o = {}) {
  const a = o.a ?? 0.32, k = o.k ?? 1, LW = L.w * k;
  const strips = 16, sh = h / strips;
  ctx.save();
  ctx.globalAlpha *= a;
  for (let i = 0; i < strips; i++) {
    const srcY = L.h - (i + 1) * (L.h * (o.span ?? 0.5) / strips);
    const srcH = L.h * (o.span ?? 0.5) / strips;
    const off = Math.sin(t * 3 + i * 1.7) * 6 * (i / strips);
    ctx.globalAlpha = a * (1 - i / strips);
    let dx = mod(x + off, LW) - LW;
    while (dx < W) {
      ctx.save(); ctx.translate(dx, yTop + i * sh + sh); ctx.scale(1, -1);
      ctx.drawImage(L.c, 0, srcY, L.w, srcH, 0, 0, LW, sh);
      ctx.restore();
      dx += LW;
    }
  }
  ctx.restore();
}

// full side-scrolling street scene; returns ground lines
function streetScene(ctx, t, o = {}) {
  const sx = o.scroll ?? t * 2400;
  drawSky(ctx, t, { ox: -sx * 0.01 });
  if (o.moon !== false) drawMoon(ctx, o.moonX ?? 1180, o.moonY ?? 250, 110);
  routeStreams(ctx, t, { y: 230, a: 0.18 });
  cloudBank(ctx, t, { y: 360, n: 4, seed: 41, scale: 0.8, ox: -sx * 0.02 });
  drawLayer(ctx, World.far, -sx * 0.04, 140, { wrap: true });
  drawLayer(ctx, World.mid, -sx * 0.1, 180, { wrap: true });
  const shk = 0.68, shopW = World.shops.w * shk, shopH = World.shops.h * shk;
  drawLayer(ctx, World.shops, -sx * 0.5, 760 - shopH, { wrap: true, w: shopW, h: shopH });
  ctx.fillStyle = 'rgba(12,8,34,0.32)'; ctx.fillRect(0, 760 - shopH - 40, W, shopH + 40);
  // sidewalk
  ctx.fillStyle = '#121128'; ctx.fillRect(0, 760, W, 24);
  ctx.fillStyle = 'rgba(140,150,255,0.35)'; ctx.fillRect(0, 760, W, 3);
  // road
  const rg = ctx.createLinearGradient(0, 784, 0, H);
  rg.addColorStop(0, '#0C0B1E'); rg.addColorStop(1, '#06050F');
  ctx.fillStyle = rg; ctx.fillRect(0, 784, W, H - 784);
  wetReflection(ctx, World.shops, -sx * 0.5, 784, 200, t, { a: 0.3, span: 0.45, k: shk });
  // lane dashes (motion blurred)
  ctx.save();
  const lane = (y, hgt, sp, len, gap, a) => {
    const off = mod(-sx * sp, len + gap);
    ctx.fillStyle = `rgba(230,235,255,${a})`;
    for (let x = off - (len + gap); x < W + len; x += len + gap) ctx.fillRect(x, y, len, hgt);
  };
  lane(842, 5, 1.0, 220, 200, 0.55);
  lane(930, 7, 1.25, 260, 240, 0.5);
  ctx.restore();
  splashes(ctx, t, { y0: 790, y1: 948, n: 40, scroll: sx * 1.0, rate: 3 });
  return { far: 860, near: 905 };
}
function streetForeground(ctx, t, sx, o = {}) {
  // lamp posts passing close to camera
  const sp = 1.9, gap = 900;
  const off = mod(-sx * sp, gap);
  for (let x = off - gap; x < W + 200; x += gap) {
    ctx.fillStyle = '#05040B'; ctx.fillRect(x, 0, 34, H);
    ctx.fillRect(x - 160, 120, 194, 16);
    glow(ctx, x - 150, 150, 120, '#FFE2A8', 0.5);
  }
}

// --------------------------------------------------------------- rooftops ---
function genRooftops(w, h, seed) {
  const L = makeLayer(w, h), g = L.g, eg = L.eg, r = new RNG(seed);
  const segs = [];
  let x = 0;
  while (x < w - 200) {
    const bw = r.range(560, 980), top = r.range(250, 330);
    segs.push({ x0: x, x1: Math.min(w, x + bw), top });
    x += bw + (r.chance(0.8) ? r.range(170, 240) : 0);
  }
  for (const sgm of segs) {
    const rr = new RNG(Math.floor(sgm.x0) + seed);
    const bw = sgm.x1 - sgm.x0;
    g.fillStyle = '#100F2C'; g.fillRect(sgm.x0, sgm.top, bw, h - sgm.top);
    // facade windows
    for (let wy = sgm.top + 50; wy < h; wy += 56) for (let wx = sgm.x0 + 30; wx < sgm.x1 - 40; wx += 64) {
      if (!rr.chance(0.35)) continue;
      const c = rr.pick(PAL.win); g.fillStyle = rgba(c, 0.7); g.fillRect(wx, wy, 26, 30);
      eg.fillStyle = rgba(c, 0.35); eg.fillRect(wx, wy, 26, 30);
    }
    // parapet
    g.fillStyle = '#1B1A44'; g.fillRect(sgm.x0, sgm.top - 18, bw, 22);
    g.fillStyle = 'rgba(140,150,255,0.5)'; g.fillRect(sgm.x0, sgm.top - 18, bw, 3);
    // props
    let px = sgm.x0 + 60;
    while (px < sgm.x1 - 140) {
      const kind = rr.int(0, 5);
      const base = sgm.top - 18;
      if (kind === 0) { // water tower
        g.fillStyle = '#0C0B22'; g.fillRect(px + 10, base - 70, 8, 70); g.fillRect(px + 70, base - 70, 8, 70);
        g.fillStyle = '#26245A'; g.fillRect(px, base - 150, 88, 82);
        g.beginPath(); g.moveTo(px - 4, base - 150); g.lineTo(px + 44, base - 186); g.lineTo(px + 92, base - 150); g.fill();
        g.strokeStyle = '#3B3A80'; g.lineWidth = 3; for (let k = 1; k < 4; k++) { g.beginPath(); g.moveTo(px, base - 150 + k * 20); g.lineTo(px + 88, base - 150 + k * 20); g.stroke(); }
        px += 150;
      } else if (kind === 1) { // solar water heater
        g.fillStyle = '#2A2860'; g.save(); g.translate(px, base); g.rotate(-0.5);
        g.fillRect(0, -10, 150, 60); g.strokeStyle = '#4F55B8'; g.lineWidth = 2;
        for (let k = 0; k < 10; k++) { g.beginPath(); g.moveTo(10 + k * 14, -6); g.lineTo(10 + k * 14, 46); g.stroke(); }
        g.restore();
        g.fillStyle = '#C9CEE8'; g.beginPath(); g.ellipse(px + 140, base - 80, 30, 18, 0, 0, TAU); g.fill();
        g.fillStyle = '#0C0B22'; g.fillRect(px + 110, base - 64, 6, 64); g.fillRect(px + 160, base - 64, 6, 64);
        px += 220;
      } else if (kind === 2) { // AC units
        for (let k = 0; k < 2; k++) {
          g.fillStyle = '#2C2E5C'; g.fillRect(px + k * 70, base - 44, 60, 44);
          g.strokeStyle = '#15163A'; g.lineWidth = 3; g.beginPath(); g.arc(px + k * 70 + 30, base - 22, 14, 0, TAU); g.stroke();
        }
        px += 170;
      } else if (kind === 3) { // laundry line (static part; clothes drawn live)
        g.fillStyle = '#0C0B22'; g.fillRect(px, base - 120, 6, 120); g.fillRect(px + 220, base - 120, 6, 120);
        sgm.laundry = sgm.laundry || []; sgm.laundry.push([px + 3, base - 116, px + 223]);
        px += 260;
      } else if (kind === 4) { // rooftop neon sign
        const word = rr.pick(['外卖', '奶茶', '火锅', '旅馆', '网吧', '夜宵']), c = rr.pick(PAL.neon);
        const n = Array.from(word).length;
        g.fillStyle = '#0C0B22'; g.fillRect(px + 10, base - 40, 6, 40); g.fillRect(px + n * 70 - 16, base - 40, 6, 40);
        g.fillStyle = '#0B0A1C'; g.fillRect(px, base - 130, n * 70, 90); g.strokeStyle = c; g.lineWidth = 3; g.strokeRect(px, base - 130, n * 70, 90);
        g.font = font(60, FONT.sans, '900'); g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillStyle = tint(c, 0.45);
        eg.font = g.font; eg.textAlign = 'left'; eg.textBaseline = 'middle'; eg.fillStyle = c;
        Array.from(word).forEach((ch, i) => { g.fillText(ch, px + 6 + i * 70, base - 84); eg.fillText(ch, px + 6 + i * 70, base - 84); });
        eg.strokeStyle = c; eg.lineWidth = 4; eg.strokeRect(px, base - 130, n * 70, 90);
        px += n * 70 + 60;
      } else { // antenna + dish
        g.fillStyle = '#0C0B22'; g.fillRect(px + 20, base - 140, 5, 140);
        g.beginPath(); g.ellipse(px + 60, base - 40, 30, 20, -0.5, 0, TAU); g.fill();
        eg.fillStyle = '#FF3355'; eg.beginPath(); eg.arc(px + 22, base - 142, 6, 0, TAU); eg.fill();
        g.fillStyle = '#FF3355'; g.fillRect(px + 19, base - 146, 7, 7);
        px += 120;
      }
      px += rr.range(40, 120);
    }
  }
  L.segs = segs;
  return L;
}
// roof height (canvas-local y) under world x in a rooftop layer, with jump arcs over gaps
function roofY(L, wx) {
  const segs = L.segs, w = L.w;
  const x = mod(wx, w);
  for (let i = 0; i < segs.length; i++) {
    const s = segs[i];
    if (x >= s.x0 && x <= s.x1) return { y: s.top - 18, air: 0, d0: x - s.x0 };
    const nx = segs[(i + 1) % segs.length];
    const nx0 = i + 1 < segs.length ? nx.x0 : nx.x0 + w;
    if (x > s.x1 && x < nx0) {
      const p = (x - s.x1) / (nx0 - s.x1);
      const y = lerp(s.top, nx.top, p) - 18 - Math.sin(p * Math.PI) * 120;
      return { y, air: Math.sin(p * Math.PI), d0: 1e9 };
    }
  }
  return { y: segs[0].top - 18, air: 0, d0: 1e9 };
}
function drawLaundry(ctx, L, x, y, t) {
  for (const s of L.segs) {
    if (!s.laundry) continue;
    for (const [lx0, ly, lx1] of s.laundry) {
      let dx = mod(x + lx0, L.w);
      if (dx > W + 300) dx -= L.w;
      if (dx < -400) continue;
      const len = lx1 - lx0;
      ctx.strokeStyle = '#3A3A70'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(dx, y + ly); ctx.quadraticCurveTo(dx + len / 2, y + ly + 16, dx + len, y + ly); ctx.stroke();
      const cols = ['#FF7AB6', '#9FE8FF', '#FFD84A', '#FFFFFF', '#B26BFF'];
      for (let k = 0; k < 4; k++) {
        const cx = dx + 30 + k * 50, cy = y + ly + 8;
        const sw = Math.sin(t * 7 + k) * 10;
        ctx.fillStyle = cols[(k + Math.floor(lx0)) % cols.length];
        ctx.beginPath(); ctx.moveTo(cx - 16, cy); ctx.lineTo(cx + 16, cy); ctx.lineTo(cx + 18 + sw, cy + 46); ctx.lineTo(cx - 14 + sw, cy + 46); ctx.closePath(); ctx.fill();
      }
    }
  }
}

// ------------------------------------------------------------------ phone ---
function drawPhone(ctx, x, y, s, rot, theme, state, lt, o = {}) {
  const col = theme === 'Y' ? '#FFD100' : theme === 'B' ? '#0B8CFF' : '#FF5A0A';
  const dark = theme === 'Y' ? '#1A1505' : '#FFFFFF';
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s, s);
  // mount + body
  flat(ctx, rrectPath(-200, -390, 400, 780, 50), '#0D0D14', '#2E2E3C', 6);
  const scr = rrectPath(-180, -370, 360, 740, 36);
  ctx.save(); ctx.clip(scr);
  ctx.fillStyle = '#F3F4F8'; ctx.fillRect(-200, -400, 400, 800);
  emitFill(ctx, scr, '#ffffff', 0.12);
  // header
  ctx.fillStyle = col; ctx.fillRect(-180, -370, 360, 120);
  ctx.fillStyle = dark; ctx.font = font(34, FONT.sans, '900'); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(theme === 'Y' ? '美团 · 骑手' : theme === 'B' ? '饿了么 · 蜂鸟' : '淘宝闪购', 0, -300);
  ctx.font = font(18, FONT.raj, '700'); ctx.fillText('22:58  ·  ●●● 5G', 0, -346);
  if (state === 'order' || state === 'grabbed') {
    // order card
    flat(ctx, rrectPath(-160, -220, 320, 380, 20), '#FFFFFF', '#D8DAE6', 2);
    ctx.fillStyle = '#E8343C'; ctx.font = font(24, FONT.sans, '900'); ctx.textAlign = 'left';
    ctx.fillText('新订单', -136, -186);
    ctx.fillStyle = '#9A9DB0'; ctx.font = font(20, FONT.raj, '700'); ctx.textAlign = 'right'; ctx.fillText('#0001', 136, -186);
    // milk tea icon
    drawMilkTea(ctx, -100, -60, 0.9);
    ctx.textAlign = 'left'; ctx.fillStyle = '#1B1C24'; ctx.font = font(34, FONT.sans, '900');
    ctx.fillText('奶茶 ×1', -40, -110);
    ctx.font = font(22, FONT.sans, '700'); ctx.fillStyle = '#6A6D80';
    ctx.fillText('少糖 · 去冰', -40, -70);
    ctx.fillText('云顶大厦 88F 天台', -40, -34);
    ctx.fillStyle = '#E8343C'; ctx.font = font(26, FONT.orb, '900'); ctx.fillText('限时 30:00', -40, 8);
    ctx.fillStyle = '#1B1C24'; ctx.font = font(22, FONT.sans, '700'); ctx.fillText('配送费 ¥ 8.88', -40, 46);
    ctx.fillStyle = '#9A9DB0'; ctx.font = font(18, FONT.sans, '700'); ctx.fillText('顾客：？？？', -40, 84);
    // grab button
    const done = state === 'grabbed';
    const pressK = o.press ?? 0;
    ctx.save(); ctx.translate(0, 250); ctx.scale(1 - pressK * 0.06, 1 - pressK * 0.06);
    flat(ctx, rrectPath(-150, -50, 300, 100, 50), done ? '#2FCB71' : col, null);
    ctx.fillStyle = done ? '#ffffff' : dark; ctx.font = font(44, FONT.sans, '900'); ctx.textAlign = 'center';
    ctx.fillText(done ? '抢单成功 ✓' : '抢 单', 0, 2);
    ctx.restore();
    if (o.ripple !== undefined && o.ripple >= 0 && o.ripple < 1) {
      ctx.strokeStyle = `rgba(255,255,255,${1 - o.ripple})`; ctx.lineWidth = 8;
      ctx.beginPath(); ctx.arc(0, 250, 40 + o.ripple * 200, 0, TAU); ctx.stroke();
    }
  } else if (state === 'delivered') {
    ctx.fillStyle = '#2FCB71'; ctx.beginPath(); ctx.arc(0, -120, 90, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 18; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(-40, -120); ctx.lineTo(-8, -88); ctx.lineTo(46, -150); ctx.stroke();
    ctx.fillStyle = '#1B1C24'; ctx.font = font(44, FONT.sans, '900'); ctx.textAlign = 'center';
    ctx.fillText('订单已送达', 0, 20);
    ctx.font = font(26, FONT.orb, '900'); ctx.fillStyle = '#6A6D80'; ctx.fillText('用时 29:59', 0, 70);
    flat(ctx, rrectPath(-150, 120, 300, 110, 20), '#FFFFFF', '#D8DAE6', 2);
    flat(ctx, circlePath(-96, 175, 34), '#FF5A0A', null);
    ctx.fillStyle = '#fff'; ctx.save(); ctx.translate(-96, 175); ctx.scale(1.1, 1.1); ctx.fill(poly(BOLT)); ctx.restore();
    ctx.textAlign = 'left'; ctx.fillStyle = '#6A6D80'; ctx.font = font(20, FONT.sans, '700'); ctx.fillText('配送骑手', -48, 158);
    ctx.fillStyle = '#FF5A0A'; ctx.font = font(34, FONT.sans, '900'); ctx.fillText('？？？', -48, 198);
  }
  ctx.restore();
  // notification banner
  if (o.banner !== undefined && o.banner > 0) {
    const by = -370 + (Ease.outBack(clamp(o.banner)) * 150) - 150;
    ctx.save(); ctx.beginPath(); ctx.rect(-180, -370, 360, 740); ctx.clip();
    flat(ctx, rrectPath(-170, by + 10, 340, 110, 24), 'rgba(30,30,40,0.95)', null);
    ctx.fillStyle = col; ctx.beginPath(); ctx.arc(-120, by + 65, 30, 0, TAU); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.font = font(30, FONT.sans, '900'); ctx.textAlign = 'left'; ctx.fillText(o.bannerText ?? '叮！新订单', -76, by + 48);
    ctx.font = font(20, FONT.sans, '700'); ctx.fillStyle = '#C9CBD8'; ctx.fillText(o.bannerSub ?? '奶茶 ×1 · 云顶大厦', -76, by + 86);
    ctx.restore();
  }
  // rain drops on glass + reflection
  ctx.save(); ctx.clip(scr);
  ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.fill(poly([-180, -370, -40, -370, -180, -60]));
  for (let i = 0; i < 26; i++) {
    const rx = (hash2(i, 61) - 0.5) * 340, ry = (hash2(i, 62) - 0.5) * 720 + lt * 40 * hash2(i, 63), rr = 4 + 10 * hash2(i, 64);
    ctx.fillStyle = 'rgba(140,160,200,0.25)'; ctx.beginPath(); ctx.arc(rx, ry, rr, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.beginPath(); ctx.arc(rx - rr * 0.3, ry - rr * 0.3, rr * 0.25, 0, TAU); ctx.fill();
  }
  ctx.restore();
  ctx.restore();
}
function drawMilkTea(ctx, x, y, s) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  flat(ctx, poly([-40, -50, 40, -50, 30, 60, -30, 60]), 'rgba(240,226,200,0.95)', '#4A3B2A', 3);
  ctx.fillStyle = '#C8A27A'; ctx.fill(poly([-38, -20, 38, -20, 30, 58, -30, 58]));
  ctx.fillStyle = '#3A2414';
  for (let k = 0; k < 7; k++) { ctx.beginPath(); ctx.arc(-20 + (k % 4) * 13, 40 - Math.floor(k / 4) * 12, 5, 0, TAU); ctx.fill(); }
  flat(ctx, rrectPath(-46, -60, 92, 14, 6), '#FF8FA3', '#4A3B2A', 3);
  ctx.strokeStyle = '#FF5A7A'; ctx.lineWidth = 8; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(10, -60); ctx.lineTo(24, -100); ctx.stroke();
  ctx.restore();
}

// -------------------------------------------------------------------- map ---
function drawMapUI(ctx, lt, d) {
  ctx.fillStyle = '#070B1E'; ctx.fillRect(0, 0, W, H);
  const cam = Ease.inOutCubic(seg(lt, 0, d));
  ctx.save();
  ctx.translate(W / 2, H / 2); ctx.rotate(-0.03 + cam * 0.03); ctx.scale(0.86 + cam * 0.06, 0.86 + cam * 0.06); ctx.translate(-W / 2 - 20, -H / 2 + 30);
  // river
  ctx.strokeStyle = '#0F2350'; ctx.lineWidth = 70; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(-100, 700); ctx.bezierCurveTo(500, 560, 900, 980, 2100, 640); ctx.stroke();
  // blocks + streets
  ctx.fillStyle = '#0C1430';
  for (let i = 0; i < 18; i++) for (let j = 0; j < 10; j++) {
    if (hash2(i, j + 300) < 0.15) continue;
    ctx.fillStyle = hash2(i, j + 400) > 0.8 ? '#13204A' : '#0E1838';
    ctx.fillRect(i * 112 + 10, j * 112 + 10, 90, 90);
  }
  ctx.strokeStyle = 'rgba(80,120,220,0.25)'; ctx.lineWidth = 2;
  for (let i = 0; i <= 18; i++) { ctx.beginPath(); ctx.moveTo(i * 112 + 5, 0); ctx.lineTo(i * 112 + 5, H); ctx.stroke(); }
  for (let j = 0; j <= 10; j++) { ctx.beginPath(); ctx.moveTo(0, j * 112 + 5); ctx.lineTo(W, j * 112 + 5); ctx.stroke(); }
  // routes
  const dest = [1460, 230];
  const rY = [[120, 900], [450, 900], [450, 565], [900, 565], [900, 341], [1236, 341], [1236, 230], dest];
  const rB = [[120, 790], [341, 790], [341, 677], [789, 677], [789, 453], [1124, 453], [1124, 230], dest];
  const path = (pts) => { const p = new Path2D(); pts.forEach((q, i) => i ? p.lineTo(q[0], q[1]) : p.moveTo(q[0], q[1])); return p; };
  const along = (pts, u) => {
    let L = 0; const segs = [];
    for (let i = 0; i < pts.length - 1; i++) { const l = Math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1]); segs.push(l); L += l; }
    let d2 = u * L;
    for (let i = 0; i < segs.length; i++) { if (d2 <= segs[i]) { const k = d2 / segs[i]; return [lerp(pts[i][0], pts[i + 1][0], k), lerp(pts[i][1], pts[i + 1][1], k)]; } d2 -= segs[i]; }
    return pts[pts.length - 1];
  };
  ctx.setLineDash([16, 12]);
  ctx.strokeStyle = 'rgba(255,209,0,0.35)'; ctx.lineWidth = 6; ctx.stroke(path(rY));
  ctx.strokeStyle = 'rgba(11,140,255,0.35)'; ctx.stroke(path(rB));
  ctx.setLineDash([]);
  const uY = 0.08 + 0.3 * seg(lt, 0, d), uB = 0.1 + 0.29 * seg(lt, 0, d);
  for (const [pts, u, col, lab] of [[rY, uY, '#FFD100', '美团'], [rB, uB, '#2AA8FF', '饿了么']]) {
    // travelled part
    const done = [];
    for (let k = 0; k <= 40; k++) done.push(along(pts, u * k / 40));
    neon(ctx, path(done), col, 4, 1);
    const p = along(pts, u);
    glow(ctx, p[0], p[1], 70, col, 0.9);
    flat(ctx, circlePath(p[0], p[1], 16), col, '#fff', 4);
    ctx.font = font(28, FONT.sans, '900'); ctx.fillStyle = col; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.fillText(lab, p[0] + 26, p[1] - 30);
    ctx.font = font(22, FONT.orb, '900'); ctx.fillStyle = '#fff';
    ctx.fillText(((1 - u) * 8.8).toFixed(1) + 'km', p[0] + 26, p[1] + 2);
  }
  // destination pin
  const pulse = 1 + 0.2 * Math.sin(lt * 10);
  glow(ctx, dest[0], dest[1], 120 * pulse, '#FF4FD8', 0.7);
  flat(ctx, circlePath(dest[0], dest[1], 30), '#FF4FD8', '#fff', 4);
  ctx.font = font(30, FONT.sans, '900'); ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.fillText('王', dest[0], dest[1] + 2);
  ctx.font = font(34, FONT.sans, '900'); ctx.fillStyle = '#FFB3EE'; ctx.fillText('云顶大厦 88F', dest[0], dest[1] - 62);
  ctx.restore();
  // map HUD frame
  ctx.strokeStyle = 'rgba(120,170,255,0.6)'; ctx.lineWidth = 3;
  ctx.strokeRect(60, 170, W - 120, H - 340);
  ctx.font = font(24, FONT.raj, '700'); ctx.fillStyle = '#9FB8FF'; ctx.textAlign = 'left';
  spacedText(ctx, 'ROUTE TRACKING · 实时追踪', 90, 210, 6);
}

// ------------------------------------------------------------- constructs ---
const KANGAROO = [760, -640, 730, -600, 660, -560, 640, -500, 700, -440, 690, -415, 610, -440, 600, -340, 650, -230, 640, -150, 830, -50, 820, -30, 560, -30, 470, -120, 420, -210,
  360, -240, 120, -180, -220, -80, -210, -100, 100, -230, 380, -330, 430, -470, 520, -590, 570, -650, 560, -860, 610, -690, 640, -880, 680, -690, 720, -680];
const HUMMINGBIRD = [1000, -560, 740, -585, 700, -640, 640, -662, 588, -640, 560, -600, 480, -560, 380, -522, 260, -472, 120, -446, 205, -412, 110, -362, 262, -402, 400, -420, 540, -440, 640, -482, 700, -522, 740, -556];
function construct(ctx, pts, x, y, s, col, a, t, o = {}) {
  if (a <= 0) return;
  ctx.save(); ctx.translate(x, y); ctx.scale(o.flip ? -s : s, s);
  if (o.rot) ctx.rotate(o.rot);
  const p = smoothPath(pts, true, 0.25);
  ctx.save(); ctx.globalAlpha = a * 0.22; ctx.fillStyle = col; ctx.fill(p); ctx.restore();
  // wireframe facets (radial to the centroid + every-third chords)
  ctx.save(); ctx.globalAlpha = a; ctx.clip(p);
  ctx.strokeStyle = rgba(tint(col, 0.3), 0.5); ctx.lineWidth = 3 / s;
  const n = pts.length / 2;
  let cxp = 0, cyp = 0; for (let i = 0; i < n; i++) { cxp += pts[i * 2]; cyp += pts[i * 2 + 1]; } cxp /= n; cyp /= n;
  ctx.beginPath();
  for (let i = 0; i < n; i++) { ctx.moveTo(pts[i * 2], pts[i * 2 + 1]); ctx.lineTo(cxp, cyp); }
  for (let i = 0; i + 3 < n; i += 3) { ctx.moveTo(pts[i * 2], pts[i * 2 + 1]); ctx.lineTo(pts[(i + 3) * 2], pts[(i + 3) * 2 + 1]); }
  ctx.stroke();
  // scanning band
  const sy = -900 + ((t * 600) % 1000);
  const g = ctx.createLinearGradient(0, sy - 60, 0, sy + 60);
  g.addColorStop(0, rgba(col, 0)); g.addColorStop(0.5, rgba(tint(col, 0.5), 0.5)); g.addColorStop(1, rgba(col, 0));
  ctx.fillStyle = g; ctx.fillRect(-400, sy - 60, 1600, 120);
  ctx.restore();
  ctx.save(); ctx.globalAlpha = a; neon(ctx, p, col, 5 / s * 1.5, 1); ctx.restore();
  ctx.restore();
}
function hummingWings(ctx, x, y, s, col, a, t, flip) {
  ctx.save(); ctx.translate(x, y); ctx.scale(flip ? -s : s, s);
  for (const [k, ph] of [[0.85, 0.6], [1, 0]]) {
    const ang = Math.sin(t * 26 + ph) * 0.7;
    ctx.save(); ctx.translate(520, -575); ctx.rotate(-0.35 + ang); ctx.scale(k, k);
    const wing = smoothPath([0, 0, 40, -160, 10, -380, -60, -560, -120, -600, -130, -520, -110, -320, -60, -120], true, 0.35);
    ctx.globalAlpha = a * 0.22; ctx.fillStyle = col; ctx.fill(wing);
    ctx.globalAlpha = a;
    ctx.strokeStyle = rgba(tint(col, 0.4), 0.55); ctx.lineWidth = 2.5 / s;
    for (let f = 1; f <= 5; f++) { ctx.beginPath(); ctx.moveTo(-10 * f, -60 * f); ctx.lineTo(-30 - 22 * f, -120 - 90 * f); ctx.stroke(); }
    neon(ctx, wing, col, 3 / s, 1);
    ctx.restore();
  }
  ctx.restore();
}

// ---------------------------------------------------------------- coupons ---
function coupon(ctx, x, y, s, ang, flip, label, col = '#2AA8FF') {
  ctx.save(); ctx.translate(x, y); ctx.rotate(ang); ctx.scale(s * Math.max(0.08, Math.abs(Math.cos(flip))), s);
  const back = Math.cos(flip) < 0;
  const p = rrectPath(-70, -40, 140, 80, 10);
  ctx.fillStyle = back ? '#0A58BE' : '#EAF6FF'; ctx.fill(p);
  ctx.lineWidth = 3; ctx.strokeStyle = col; ctx.stroke(p);
  if (!back) {
    ctx.fillStyle = '#E8343C'; ctx.fillRect(-70, -40, 40, 80);
    ctx.fillStyle = '#fff'; ctx.font = font(26, FONT.sans, '900'); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('券', -50, 0);
    ctx.fillStyle = '#0B3E8C'; ctx.font = font(label.length > 4 ? 22 : 30, FONT.sans, '900'); ctx.fillText(label, 18, 0);
  }
  ctx.restore();
}

// ---------------------------------------------------------- eye close-up ---
function eyeCloseup(ctx, who, lt, d, o = {}) {
  const c = CAST[who];
  const bgA = who === 'Y' ? ['#FFC78A', '#E58A5A'] : who === 'B' ? ['#E6D2D8', '#9FA6D8'] : ['#FFC08A', '#E5704A'];
  const g = ctx.createLinearGradient(0, 132, 0, H - 132);
  g.addColorStop(0, bgA[0]); g.addColorStop(1, bgA[1]);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  const zoom = 1 + 0.06 * seg(lt, 0, d);
  ctx.save(); ctx.translate(W / 2, H / 2); ctx.scale(zoom, zoom); ctx.translate(-W / 2, -H / 2);
  // skin shading
  const sg = ctx.createRadialGradient(W / 2, H / 2 + 120, 100, W / 2, H / 2, 900);
  sg.addColorStop(0, 'rgba(255,240,230,0.5)'); sg.addColorStop(1, 'rgba(120,60,80,0.35)');
  ctx.fillStyle = sg; ctx.fillRect(0, 0, W, H);
  const open = o.open ?? Ease.outCubic(seg(lt, 0.1, 0.45));
  drawAnimeEye(ctx, W / 2 + 40, H / 2 + 40, 900, 600, who === 'B' ? -1 : 1, c, { open: 0.15 + open * 0.85, angry: o.angry ?? 0.35, glow: o.glow ?? 0.25, look: o.look ?? [0, 0] });
  // hair strands hanging over
  for (let k = 0; k < 6; k++) {
    const x0 = 200 + k * 290 + (hash1(k + 9) - 0.5) * 80, len = 200 + 260 * hash1(k + 19);
    const sw = Math.sin(lt * 3 + k) * 6;
    const p = lockPath([x0, 60], [x0 + 30 + sw, 60 + len], 90 - k * 4, 10);
    cel(ctx, p, c.hair, c.hairShade, { d: 12, line: c.hairLine, lw: 4 });
  }
  if (who === 'B') { // visor overlay
    ctx.fillStyle = 'rgba(80,210,255,0.18)'; ctx.fillRect(0, 200, W, 640);
    ctx.strokeStyle = 'rgba(160,240,255,0.35)'; ctx.lineWidth = 2;
    for (let y = 210; y < 840; y += 9) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
    ctx.strokeStyle = 'rgba(200,250,255,0.8)'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(W / 2 + 40, H / 2 + 60, 230, -0.6, 0.9); ctx.stroke();
    ctx.font = font(26, FONT.orb, '900'); ctx.fillStyle = 'rgba(200,250,255,0.85)'; ctx.textAlign = 'left';
    ctx.fillText('TARGET LOCK · 美团', W / 2 + 300, H / 2 - 120);
    ctx.fillText('ETA 27:12', W / 2 + 300, H / 2 - 80);
  }
  if (who === 'O') { // crackling sparks
    for (let k = 0; k < 3; k++) lightning(ctx, 300 + k * 600, 140, 420 + k * 500, 900, Math.floor(lt * 12) + k * 7, { color: '#FF8A2A', w: 2, a: 0.6, branches: 2 });
  }
  ctx.restore();
  // horizontal lens flare across the iris
  const fl = Ease.outCubic(seg(lt, 0.2, 0.6));
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  const lg = ctx.createLinearGradient(0, 0, W, 0);
  lg.addColorStop(0, 'rgba(255,255,255,0)'); lg.addColorStop(0.5, `rgba(255,255,255,${0.8 * fl})`); lg.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = lg; ctx.fillRect(0, H / 2 + 36, W, 4);
  ctx.restore();
}
