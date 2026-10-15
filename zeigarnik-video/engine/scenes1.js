// 第 1–8 镜：钩子 → 认知反差 → 餐馆实验 → 效应命名
// 每个场景：cam(s) 镜头运动；bg(ctx,s) 程序背景（有 AI 素材时跳过）；fx(ctx,s) 叠加动效（始终绘制）
// s = { t 全局时间, lt 镜头内时间, d 镜头时长, p 进度0..1, shot, hasPlate }
(function () {
  const ZG = window.ZG, C = ZG.C, W = ZG.W, H = ZG.H;
  const { clamp, lerp, inv, E, rng, noise } = ZG;
  const S = (ZG.scenes = ZG.scenes || {});

  // ---------- 共用：地铁车窗 ----------
  function subwayGlass(ctx, t, day) {
    ZG.vgrad(ctx, day ? '#3B4B5E' : '#04060B', day ? '#1B2433' : '#0B1322');
    const g = { x: 80, y: 360, w: 920, h: 1120 };
    ctx.save(); ctx.beginPath(); ctx.roundRect(g.x, g.y, g.w, g.h, 46); ctx.clip();
    ZG.vgrad(ctx, day ? '#7E92A6' : '#070C16', day ? '#3E4F63' : '#0E1828');
    if (!day) for (let i = 0; i < 6; i++) {
      const ph = ((t * 2.2 + i / 6) % 1), x = lerp(g.x + g.w + 300, g.x - 600, ph);
      const yy = g.y + 140 + (i % 3) * 330;
      const gr = ctx.createLinearGradient(x, 0, x + 520, 0);
      gr.addColorStop(0, 'rgba(255,214,150,0)'); gr.addColorStop(0.2, 'rgba(255,214,150,0.55)'); gr.addColorStop(1, 'rgba(255,214,150,0)');
      ctx.fillStyle = gr; ctx.fillRect(x, yy, 520, 10);
    }
    ctx.restore();
    ctx.save(); ctx.strokeStyle = ZG.rgba(C.white, 0.12); ctx.lineWidth = 4;
    ctx.beginPath(); ctx.roundRect(g.x, g.y, g.w, g.h, 46); ctx.stroke(); ctx.restore();
  }
  function lightSweep(ctx, t, a, warm) {
    const ph = (t * 1.6) % 1, x = lerp(W + 400, -400, ph);
    const gr = ctx.createLinearGradient(x - 300, 0, x + 300, 0);
    const col = warm ? '255,205,140' : '200,225,255';
    gr.addColorStop(0, `rgba(${col},0)`); gr.addColorStop(0.5, `rgba(${col},${a})`); gr.addColorStop(1, `rgba(${col},0)`);
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = gr; ctx.fillRect(0, 0, W, H); ctx.restore();
  }
  ZG.subwayGlass = subwayGlass; ZG.lightSweep = lightSweep;
  const P = { x: 700, y: 840 }; // 倒影中 TA 的位置

  S.subway = {
    cam: (s) => ({ s: 1 + 0.05 * E.inOut(s.p) }),
    bg: (ctx, s) => subwayGlass(ctx, s.t),
    fx: (ctx, s) => {
      lightSweep(ctx, s.t, 0.07, true);
      ZG.glow(ctx, P.x, P.y, 420, C.amber, 0.12 * E.inOut(inv(0.4, 1.9, s.lt)));
      ZG.dust(ctx, 3, 26, s.t, 0.25, C.cold);
    },
  };

  // ---------- SH02 玻璃裂成一个没闭合的圆 ----------
  const HIT2 = 1.45; // 3.35s “结局”
  const cracks = (() => {
    const R = rng(7), out = [];
    for (let i = 0; i < 11; i++) {
      const a0 = (i / 11) * Math.PI * 2 + R() * 0.4, len = 260 + R() * 520, pts = [[P.x, P.y]];
      let x = P.x, y = P.y, a = a0;
      for (let k = 1; k <= 7; k++) { a += (R() - 0.5) * 0.5; x += Math.cos(a) * len / 7; y += Math.sin(a) * len / 7; pts.push([x, y]); }
      out.push(pts);
    }
    return out;
  })();
  function crackPath(ctx, pts, k) {
    const n = Math.max(1, Math.floor(k * (pts.length - 1)));
    ctx.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i <= n; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  }
  function ringCrack(ctx, r, k) {
    const gap = 0.9, a0 = -Math.PI / 2 + gap / 2, span = (Math.PI * 2 - gap) * k;
    for (let i = 0; i <= 60; i++) {
      const a = a0 + (span * i) / 60, rr = r + noise(i * 1.7) * 14;
      const x = P.x + Math.cos(a) * rr, y = P.y + Math.sin(a) * rr;
      i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    }
  }
  ZG.crackGlass = function (ctx, k, glowA) {
    cracks.forEach((pts) => ZG.glowStroke(ctx, (c) => crackPath(c, pts, k), C.white, 2.2, 0.75, 0.5));
    ZG.glowStroke(ctx, (c) => ringCrack(c, 230, k), C.amber, 5, 1, 1.6 * glowA);
  };
  S.crack = {
    cam: (s) => {
      const hit = inv(HIT2, HIT2 + 0.5, s.lt), punch = s.lt > HIT2 ? (1 - E.out(hit)) * 0.06 : 0;
      const sh = s.lt > HIT2 && s.lt < HIT2 + 0.12 ? 14 : 0;
      return { s: 1.05 + 0.03 * s.p + punch, x: sh * noise(s.lt * 90), y: sh * noise(s.lt * 77 + 5) };
    },
    bg: (ctx, s) => subwayGlass(ctx, s.t),
    fx: (ctx, s) => {
      lightSweep(ctx, s.t, 0.06, true);
      const pre = inv(0, HIT2, s.lt);
      ZG.glow(ctx, P.x, P.y, 420 + pre * 120, C.amber, 0.12 + 0.18 * pre);
      if (s.lt >= HIT2) {
        const k = E.outExpo(inv(HIT2, HIT2 + 0.18, s.lt));
        ZG.crackGlass(ctx, k, 0.6 + 0.4 * Math.sin(s.lt * 6));
        ZG.burst(ctx, 21, P.x, P.y, s.lt - HIT2, { n: 70, spread: 420, color: C.white, size: 4, rise: 10, life: 1 });
        const f = 1 - inv(HIT2, HIT2 + 0.25, s.lt);
        if (f > 0) { ctx.save(); ctx.globalAlpha = f * 0.35; ctx.fillStyle = C.white; ctx.fillRect(0, 0, W, H); ctx.restore(); }
      }
    },
  };

  // ---------- SH03 好好告别的回忆：失色、化灰 ----------
  const PHOTOS = [
    { x: 300, y: 560, r: -0.1, z: 0.9, cap: '机场 · 2018', hue: '#C98B5A', dieAt: 0.6 },
    { x: 790, y: 500, r: 0.08, z: 0.75, cap: '毕业 · 2016', hue: '#B7A07A', dieAt: 1.1 },
    { x: 560, y: 900, r: -0.03, z: 1.05, cap: '车站 · 2020', hue: '#8E9DB0', dieAt: 1.6 },
    { x: 250, y: 1150, r: 0.12, z: 0.78, cap: '海边 · 2015', hue: '#D9A47A', dieAt: 1.85 },
    { x: 830, y: 1170, r: -0.09, z: 0.8, cap: '生日 · 2019', hue: '#C27A6B', dieAt: 2.0 },
  ];
  function photo(ctx, ph, i, x, y, sc, rot, gray, a, t) {
    const w = 330 * sc, h = 400 * sc;
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.globalAlpha = a;
    ctx.fillStyle = ZG.mix('#EEE7DA', '#8A8A8A', gray * 0.6); ctx.fillRect(-w / 2, -h / 2, w, h);
    const ix = -w / 2 + 16 * sc, iy = -h / 2 + 16 * sc, iw = w - 32 * sc, ih = h - 96 * sc;
    if (!ZG.drawPlate(ctx, 'SH03-' + (i + 1), ix, iy, iw, ih, t)) {
      const g = ctx.createLinearGradient(0, iy, 0, iy + ih);
      g.addColorStop(0, ZG.mix(ph.hue, '#555555', gray)); g.addColorStop(1, ZG.mix('#1A1410', '#222222', gray));
      ctx.fillStyle = g; ctx.fillRect(ix, iy, iw, ih);
      const R = rng(40 + i);
      for (let k = 0; k < 7; k++) ZG.glow(ctx, ix + R() * iw, iy + R() * ih * 0.7, 20 + R() * 40, ZG.mix('#FFD9A0', '#BBBBBB', gray), 0.35);
    }
    if (gray > 0) { ctx.fillStyle = `rgba(110,110,110,${gray * 0.55})`; ctx.globalCompositeOperation = 'saturation'; ctx.fillRect(ix, iy, iw, ih); ctx.globalCompositeOperation = 'source-over'; }
    ZG.label(ctx, ph.cap, 0, h / 2 - 42 * sc, { size: 26 * sc, align: 'center', color: '#3A332B', fam: 'serif', a: 0.85 * a });
    ctx.restore();
    ZG.dot(ctx, x + Math.cos(rot) * (w / 2 - 34 * sc), y + (h / 2 - 42 * sc), 6 * sc, 0.6 * a * (1 - gray));
  }
  S.photos = {
    cam: (s) => ({ s: 1.02 + 0.06 * s.p }),
    bg: (ctx, s) => { ZG.vgrad(ctx, '#07090F', '#141016'); ZG.dust(ctx, 5, 30, s.t, 0.18, C.white); },
    fx: (ctx, s) => {
      PHOTOS.forEach((ph, i) => {
        const fl = noise(i * 9 + s.t * 0.4) * 16, k = inv(ph.dieAt, ph.dieAt + 0.35, s.lt);
        const gray = E.out(inv(ph.dieAt - 0.25, ph.dieAt, s.lt)), x = ph.x + (s.p - 0.5) * 60 * (ph.z - 0.9) * 4, y = ph.y + fl;
        if (k < 1) photo(ctx, ph, i, x, y - k * 40, ph.z, ph.r + fl * 0.002, gray, 1 - E.in(k), s.t);
        if (s.lt > ph.dieAt) ZG.burst(ctx, 60 + i, x, y, s.lt - ph.dieAt, { n: 90, spread: 220, color: '#C9C1B6', size: 4, rise: 140, life: 1.6, a: 0.8, flat: 0.6 });
      });
    },
  };

  // ---------- SH04 唯一还亮着的半张照片 + 年份翻页 ----------
  function tornPath(ctx, x, y, w, h) {
    ctx.moveTo(x, y); ctx.lineTo(x + w * 0.62, y);
    for (let i = 0; i <= 24; i++) ctx.lineTo(x + w * 0.62 + noise(i * 2.3) * 26 + (i % 2 ? 10 : -8), y + (h * i) / 24);
    ctx.lineTo(x, y + h); ctx.closePath();
  }
  S.torn = {
    cam: (s) => ({ s: 1 + 0.08 * E.inOut(s.p) }),
    bg: (ctx, s) => { ZG.vgrad(ctx, '#05070C', '#0D0B10'); },
    fx: (ctx, s) => {
      const x = 250, y = 640, w = 640, h = 760;
      ZG.ring(ctx, 540, 1020, 520, { gap: 1.2, rot: 1.2 + s.t * 0.15, w: 6, a: 0.55 * E.out(inv(0, 0.8, s.lt)), t: s.t });
      ZG.glow(ctx, 450, 1020, 620, C.amber, 0.22);
      ctx.save(); ctx.translate(0, noise(s.t * 0.5) * 10); ctx.beginPath(); tornPath(ctx, x, y, w, h); ctx.clip();
      ctx.fillStyle = '#EEE7DA'; ctx.fillRect(x, y, w, h);
      const ix = x + 26, iy = y + 26, iw = w - 26, ih = h - 150;
      if (!ZG.drawPlate(ctx, 'SH04', ix, iy, iw, ih, s.t, { s: 1.05 + 0.05 * s.p })) {
        ZG.vgrad(ctx, '#1B2636', '#0C0F16'); ctx.fillStyle = '#152131'; ctx.fillRect(ix, iy, iw, ih);
        const R = rng(12);
        for (let k = 0; k < 14; k++) ZG.glow(ctx, ix + R() * iw, iy + R() * ih, 18 + R() * 50, k % 3 ? C.amber : '#E4564A', 0.4);
        ctx.strokeStyle = 'rgba(200,220,255,0.18)'; ctx.lineWidth = 2;
        for (let k = 0; k < 40; k++) { const rx = ix + R() * iw, ry = iy + ((R() * ih + s.t * 900) % ih); ctx.beginPath(); ctx.moveTo(rx, ry); ctx.lineTo(rx - 6, ry + 34); ctx.stroke(); }
        if (!ZG.NO_PLACEHOLDER) ZG.label(ctx, '雨夜路口 · TA 转身（AI 素材）', ix + 30, iy + ih - 40, { size: 24, a: 0.6 });
      }
      ctx.restore();
      ZG.glowStroke(ctx, (c) => { for (let i = 0; i <= 24; i++) { const px = x + w * 0.62 + noise(i * 2.3) * 26 + (i % 2 ? 10 : -8), py = y + (h * i) / 24; i ? c.lineTo(px, py) : c.moveTo(px, py); } }, C.amber, 3, 0.9, 1.4);
      ZG.burst(ctx, 77, x + w * 0.62, y + h * 0.5, (s.lt % 1.2), { n: 24, spread: 120, size: 4, rise: 90, life: 1.2, a: 0.7 });
      // 年份翻页：2019 → 2026
      const idx = E.inOut(inv(0.15, 2.3, s.lt)) * 7, step = Math.floor(idx), settle = step >= 7;
      const yr = 2019 + Math.min(7, step), roll = settle ? 0 : idx - step;
      ZG.label(ctx, '那天之后', 540, 330, { size: 28, align: 'center', a: 0.6, ls: 10 });
      ctx.save(); ctx.beginPath(); ctx.rect(240, 372, 600, 126); ctx.clip();
      const dy = E.inOut(roll) * -140;
      ZG.richText(ctx, String(yr), [], 540, 435 + dy, { size: 120, weight: 300, color: C.white, ls: 18, a: 0.9 });
      if (!settle) ZG.richText(ctx, String(yr + 1), [], 540, 575 + dy, { size: 120, weight: 300, color: C.white, ls: 18, a: 0.9 });
      ctx.restore();
      if (settle) ZG.glow(ctx, 540, 435, 260, C.amber, 0.25 * (1 - inv(2.3, 2.9, s.lt)));
    },
  };

  // ---------- SH05–SH07 1920 年代餐馆 ----------
  function cafeBg(ctx, t, frozen) {
    ZG.vgrad(ctx, '#1A120B', '#0B0806');
    const R = rng(33), tt = frozen ? 0 : t;
    for (let i = 0; i < 26; i++) {
      const x = R() * W, y = 200 + R() * 1300, r = 30 + R() * 90;
      ZG.glow(ctx, x + noise(i + tt * 0.2) * 20, y, r, R() > 0.3 ? '#FFB066' : '#FFE2B0', 0.18 + R() * 0.2);
    }
  }
  function oldFilm(ctx, t, a) {
    const R = rng(Math.floor(t * 12));
    ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = 'rgba(70,45,20,0.28)'; ctx.globalCompositeOperation = 'multiply'; ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'source-over';
    for (let i = 0; i < 3; i++) if (R() > 0.4) { ctx.fillStyle = `rgba(255,240,210,${0.06 + R() * 0.08})`; ctx.fillRect(R() * W, 0, 2, H); }
    ctx.fillStyle = `rgba(0,0,0,${0.04 + R() * 0.05})`; ctx.fillRect(0, 0, W, H); ctx.restore();
  }
  ZG.cafeBg = cafeBg; ZG.oldFilm = oldFilm;
  S.cafe = {
    cam: (s) => ({ s: 1.08 - 0.05 * E.inOut(s.p), y: noise(s.t * 3) * 2 }),
    bg: (ctx, s) => cafeBg(ctx, s.t),
    fx: (ctx, s) => {
      oldFilm(ctx, s.t, 1);
      const a = E.out(inv(0.2, 0.8, s.lt));
      ZG.label(ctx, '约一百年前 · 欧洲某家餐馆', 540, 1540, { size: 30, align: 'center', a: 0.75 * a, ls: 8, fam: 'serif' });
      ZG.dust(ctx, 8, 40, s.t, 0.35);
    },
  };

  const SLIPS = [
    { x: 210, y: 560, r: -0.12 }, { x: 430, y: 380, r: 0.06 }, { x: 700, y: 360, r: -0.05 },
    { x: 905, y: 600, r: 0.1 }, { x: 860, y: 1120, r: -0.08 },
  ];
  const HEAD = { x: 540, y: 860 };
  function threads(ctx, t, list) {
    list.forEach(({ x, y, a, i }) => {
      const mx = (x + HEAD.x) / 2, my = (y + HEAD.y) / 2 + 60 + Math.sin(t * 3 + i) * 10;
      ZG.glowStroke(ctx, (c) => { c.moveTo(HEAD.x, HEAD.y); c.quadraticCurveTo(mx, my, x, y); }, C.amber, 1.6, 0.55 * a, 0.9);
    });
  }
  const POP = [0.15, 0.55, 0.95, 1.35, 1.75];
  S.waiter = {
    cam: (s) => ({ s: 1.04, r: lerp(-0.015, 0.015, E.inOut(s.p)) }),
    bg: (ctx, s) => cafeBg(ctx, s.t, true),
    fx: (ctx, s) => {
      oldFilm(ctx, s.t, 0.8);
      const vis = SLIPS.map((sl, i) => ({ ...sl, i, a: E.outBack(inv(POP[i], POP[i] + 0.35, s.lt)) }));
      threads(ctx, s.t, vis.filter((v) => v.a > 0));
      vis.forEach((v) => v.a > 0 && ZG.slip(ctx, v.x, v.y + Math.sin(s.t * 1.5 + v.i) * 10, { rot: v.r, a: clamp(v.a), seed: v.i + 1, t: s.t, w: 150 * clamp(v.a, 0.4, 1.1), h: 210 * clamp(v.a, 0.4, 1.1) }));
      ZG.glow(ctx, HEAD.x, HEAD.y, 120, C.amber, 0.25);
    },
  };

  const CLOSE = [0.4, 1.05, 1.65, 1.65]; // 15.1 / 15.75 / 16.35
  S.paid = {
    cam: (s) => ({ s: 1.04 + 0.02 * s.p, r: 0.015 }),
    bg: (ctx, s) => cafeBg(ctx, s.t, true),
    fx: (ctx, s) => {
      oldFilm(ctx, s.t, 0.8);
      const list = [];
      SLIPS.forEach((sl, i) => {
        const ct = CLOSE[i], bob = Math.sin(s.t * 1.5 + i) * 10;
        if (i === 4) {
          const up = E.inOut(inv(2.0, 2.6, s.lt));
          const x = lerp(sl.x, 540, up), y = lerp(sl.y + bob, 300, up);
          list.push({ x, y, a: 1, i }); ZG.slip(ctx, x, y, { rot: sl.r * (1 - up), seed: 5, t: s.t, glow: 1 + up });
          return;
        }
        const k = inv(ct, ct + 0.2, s.lt), gone = inv(ct + 0.2, ct + 0.45, s.lt);
        if (gone < 1) { list.push({ x: sl.x, y: sl.y + bob, a: 1 - gone, i }); ZG.slip(ctx, sl.x, sl.y + bob, { rot: sl.r, a: 1 - gone, seed: i + 1, t: s.t, close: E.inExpo(k) }); }
        if (s.lt > ct + 0.2) {
          ZG.burst(ctx, 90 + i, sl.x, sl.y, s.lt - ct - 0.2, { n: 110, spread: 240, size: 5, rise: 120, life: 1.4 });
          ZG.dot(ctx, sl.x, sl.y - 70, 9, 1 - inv(ct + 0.2, ct + 0.6, s.lt));
        }
      });
      threads(ctx, s.t, list);
    },
  };

  // ---------- SH08 效应命名 ----------
  const RING8 = { x: 540, y: 860, r: 250 };
  S.title = {
    cam: (s) => ({ s: 1 + 0.04 * E.out(s.p) }),
    bg: (ctx, s) => { ZG.vgrad(ctx, '#03040A', '#0A1020'); },
    fx: (ctx, s) => {
      const k = inv(0, 0.9, s.lt);
      ZG.converge(ctx, 808, RING8.x, RING8.y, k, { n: 220, radius: 1000, size: 4,
        tx: (i, R) => Math.cos(-Math.PI / 2 + 0.55 + (i / 220) * (Math.PI * 2 - 1.1)) * RING8.r,
        ty: (i, R) => Math.sin(-Math.PI / 2 + 0.55 + (i / 220) * (Math.PI * 2 - 1.1)) * RING8.r });
      const ra = E.out(inv(0.6, 1.1, s.lt));
      ZG.ring(ctx, RING8.x, RING8.y, RING8.r, { gap: 1.1, rot: 0.5 + s.lt * 0.2, w: 9, a: ra, t: s.t });
      for (let i = 0; i < 3; i++) {
        const rk = inv(0.05 + i * 0.18, 1.6 + i * 0.18, s.lt);
        if (rk > 0 && rk < 1) ZG.ring(ctx, RING8.x, RING8.y, RING8.r * (1 + rk * 1.6), { gap: 0, w: 2, a: (1 - rk) * 0.35, halo: 0, glowAmt: 0.5 });
      }
      const ta = E.out(inv(0.35, 0.95, s.lt));
      ZG.richText(ctx, '蔡格尼克效应', [], 540, 1300 + (1 - ta) * 40, { size: 118, weight: 900, ls: 14, a: ta, color: C.white });
      ZG.label(ctx, 'ZEIGARNIK  EFFECT  ·  1927', 540, 1410, { size: 28, align: 'center', a: 0.7 * E.out(inv(0.7, 1.3, s.lt)), color: C.amber, ls: 10, fam: 'serif' });
    },
  };
})();
