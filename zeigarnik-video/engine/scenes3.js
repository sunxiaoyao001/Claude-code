// 第 17–22 镜：一扇还亮着的窗 → 转折 → 画上句号 → 天亮 → 互动
(function () {
  const ZG = window.ZG, C = ZG.C, W = ZG.W, H = ZG.H;
  const { clamp, lerp, inv, E, rng, noise } = ZG;
  const S = ZG.scenes;

  // ---------- SH17 整座城市只剩一扇窗亮着 ----------
  S.window = {
    cam: () => ({ s: 1 }),
    bg: () => {},
    fx: (ctx, s) => {
      const camY = 60, mp = ZG.cityPoint('main', camY), z = lerp(1, 4.6, E.inExpo(inv(0.6, 3.2, s.lt)) * 0.9 + E.inOut(s.p) * 0.1);
      ZG.city(ctx, s.t, { camY, zoom: z, fx: mp.x, fy: mp.y });
      const rr = 46 * z + 30;
      ZG.ring(ctx, mp.x, mp.y, rr, { gap: 0.9, rot: s.t * 0.35, w: 3 + z * 1.2, a: E.out(inv(0.3, 1.0, s.lt)), t: s.t });
      ZG.dust(ctx, 17, 20, s.t, 0.2, C.amber);
    },
  };

  // ---------- SH18 台灯亮起：冷 → 暖，转大调 ----------
  const LAMP = { x: 790, y: 760 };
  S.lamp = {
    cam: (s) => ({ s: 1.02 + 0.02 * s.p }),
    bg: (ctx, s) => {
      ZG.vgrad(ctx, '#05080F', '#0C1220');
      ctx.fillStyle = '#121A28'; ctx.fillRect(0, 1180, W, 740);
    },
    fx: (ctx, s) => {
      const on = E.outExpo(inv(0.05, 0.5, s.lt));
      ctx.save(); ctx.globalCompositeOperation = 'soft-light'; ctx.globalAlpha = 0.55 * on;
      ctx.fillStyle = '#FFB466'; ctx.fillRect(0, 0, W, H); ctx.restore();
      ZG.glow(ctx, LAMP.x, LAMP.y, 900 * on, '#FFC27A', 0.35 * on);
      ZG.glow(ctx, LAMP.x, LAMP.y, 160, C.amberHi, 0.9 * on);
      if (s.lt < 0.12) { ctx.save(); ctx.globalAlpha = (0.12 - s.lt) * 3; ctx.fillStyle = '#FFE6C0'; ctx.fillRect(0, 0, W, H); ctx.restore(); }
      ZG.dust(ctx, 18, 46, s.t, 0.45 * on, C.amberHi, [380, 700, 700, 900]);
    },
  };

  // ---------- SH19 写一封不寄出的信 ----------
  const LETTER = ['那天没说完的话，', '我现在说完：', '谢谢你出现过。', '再见。'];
  function paper(ctx) {
    const g = ctx.createRadialGradient(560, 1050, 100, 560, 1050, 1300);
    g.addColorStop(0, '#E9DCC3'); g.addColorStop(0.6, '#9C8B70'); g.addColorStop(1, '#2A2118');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = 'rgba(80,60,40,0.18)'; ctx.lineWidth = 2;
    for (let y = 820; y < 1700; y += 96) { ctx.beginPath(); ctx.moveTo(150, y); ctx.lineTo(930, y); ctx.stroke(); }
  }
  function writing(ctx, k, t) {
    const total = LETTER.join('').length; let shown = Math.floor(k * total), tip = null;
    ZG.font(ctx, 52, 600, 'serif'); ctx.textBaseline = 'alphabetic';
    LETTER.forEach((line, i) => {
      const n = clamp(shown, 0, line.length); shown -= line.length;
      if (n <= 0) return;
      const str = line.slice(0, n), x = 180, y = 800 + i * 96;
      ctx.fillStyle = '#2B1E12'; ctx.fillText(str, x, y);
      if (n < line.length || (shown < 0 && n === line.length)) tip = { x: x + ctx.measureText(str).width, y: y - 18 };
    });
    if (tip && k < 1) { ZG.glow(ctx, tip.x, tip.y, 40, C.amberHi, 0.9); ZG.burst(ctx, 1900 + Math.floor(t * 8), tip.x, tip.y, (t * 8) % 1 * 0.6, { n: 8, spread: 40, size: 3, rise: 40, life: 0.6 }); }
  }
  S.letter = {
    cam: (s) => ({ s: 1.04 + 0.03 * s.p, r: -0.01 }),
    bg: (ctx, s) => { paper(ctx); writing(ctx, E.inOut(inv(0.1, 2.9, s.lt)), s.t); },
    fx: (ctx, s) => {
      const k = E.inOut(inv(0.1, 2.9, s.lt));
      ZG.ring(ctx, 540, 470, 170, { gap: lerp(1.0, 0.28, k), rot: s.t * 0.3, w: 7, a: 0.95, t: s.t });
      ctx.save(); ctx.globalCompositeOperation = 'soft-light'; ctx.globalAlpha = 0.35; ctx.fillStyle = '#FFB466'; ctx.fillRect(0, 0, W, H); ctx.restore();
    },
  };

  // ---------- SH20 你自己画上的句号：光环闭合 ----------
  const SNAP = 1.3; // 48.0s
  S.closure = {
    cam: (s) => {
      const after = s.lt > SNAP ? 1 - E.out(inv(SNAP, SNAP + 0.6, s.lt)) : 0;
      return { s: 1.0 + 0.05 * E.inOut(inv(0, SNAP, s.lt)) + after * 0.05, fx: 540, fy: 900 };
    },
    bg: (ctx, s) => {
      paper(ctx); ctx.fillStyle = 'rgba(20,12,6,0.25)'; ctx.fillRect(0, 0, W, H);
      const k = E.inOut(inv(0.0, 1.15, s.lt));
      ctx.save(); ctx.strokeStyle = '#2B1E12'; ctx.lineWidth = 16; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.arc(540, 1190, 46, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * k); ctx.stroke(); ctx.restore();
    },
    fx: (ctx, s) => {
      const k = E.inOut(inv(0.0, 1.15, s.lt)), snapped = s.lt >= SNAP;
      const gap = snapped ? 0 : lerp(0.28, 0.06, k);
      const collapse = E.inOut(inv(SNAP + 0.55, SNAP + 1.25, s.lt));
      const r = lerp(300, 26, collapse);
      if (collapse < 1) ZG.ring(ctx, 540, 860, r, { gap, rot: s.t * 0.3 * (snapped ? 0 : 1), w: snapped ? 12 : 8, a: 1, t: s.t, glowAmt: snapped ? 2.2 : 1.2 });
      ZG.glow(ctx, 540, 1190, 60, C.amberHi, 0.6 * k);
      if (snapped) {
        const f = 1 - inv(SNAP, SNAP + 0.22, s.lt);
        for (let i = 0; i < 4; i++) {
          const rk = E.out(inv(SNAP + i * 0.08, SNAP + 1.3 + i * 0.08, s.lt));
          if (rk > 0 && rk < 1) ZG.ring(ctx, 540, 860, 300 + rk * 1100, { gap: 0, w: 3, a: (1 - rk) * 0.6, halo: 0, glowAmt: 0.7, color: C.amberHi });
        }
        ZG.burst(ctx, 2020, 540, 860, s.lt - SNAP, { n: 260, spread: 900, size: 6, rise: 70, life: 2.2 });
        if (collapse > 0) ZG.dot(ctx, 540, 860, lerp(0, 26, collapse), 1);
        if (f > 0) { ctx.save(); ctx.globalAlpha = f * 0.85; ctx.fillStyle = '#FFF4E2'; ctx.fillRect(0, 0, W, H); ctx.restore(); }
      }
    },
  };

  // ---------- SH21 天亮了：最后一盏窗灯熄灭 ----------
  S.dawn = {
    insetPlate: true,
    cam: () => ({ s: 1 }),
    bg: () => {},
    fx: (ctx, s) => {
      const camY = lerp(60, 160, E.inOut(s.p));
      ZG.city(ctx, s.t, { camY, zoom: lerp(1.25, 1.05, E.out(s.p)), dawn: E.inOut(inv(0.0, 2.6, s.lt)) });
      const mp = ZG.cityPoint('main', camY);
      ZG.dot(ctx, 540, 860, 26 * (1 - inv(0, 0.8, s.lt)), 1 - inv(0, 0.8, s.lt));
      ZG.dust(ctx, 21, 40, s.t, 0.35, '#FFF1DC');
      ZG.platePart(ctx, s, 0.88 * E.inOut(inv(1.6, 2.4, s.lt)), { s: 1.03 + 0.03 * s.p }, { mini: true });
      // 金句底衬：柔和的纵向渐变，不出现硬边色带
      const band = ctx.createLinearGradient(0, 640, 0, 1160);
      band.addColorStop(0, 'rgba(0,0,0,0)'); band.addColorStop(0.5, 'rgba(8,10,18,0.38)'); band.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = band; ctx.fillRect(0, 640, W, 520);
      void mp;
    },
  };

  // ---------- SH22 清晨的同一节车厢 · 互动 ----------
  const P = { x: 700, y: 840 };
  S.outro = {
    cam: (s) => ({ s: 1.05 - 0.04 * E.inOut(s.p) }),
    bg: (ctx, s) => ZG.subwayGlass(ctx, s.t, true),
    fx: (ctx, s) => {
      ZG.lightSweep(ctx, s.t * 0.5, 0.06, false);
      const ra = E.out(inv(4.1, 5.0, s.lt)), ping = s.t > 61.05 ? Math.exp(-(s.t - 61.05) * 3) : 0;
      ZG.ring(ctx, P.x, P.y, 120 * (1 + ping * 0.15), { gap: 1.0, rot: s.t * 0.4, w: 5, a: ra * 0.85, t: s.t, glowAmt: 1 + ping * 2 });
      const dim = inv(7.6, 8.3, s.lt);
      if (dim > 0) { ctx.save(); ctx.globalAlpha = dim * 0.6; ctx.fillStyle = '#05070D'; ctx.fillRect(0, 0, W, H); ctx.restore(); }
    },
  };
})();
