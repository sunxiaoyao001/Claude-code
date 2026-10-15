// 第 9–16 镜：机制（张力）→ 映射到感情 → 反复
(function () {
  const ZG = window.ZG, C = ZG.C, W = ZG.W, H = ZG.H;
  const { clamp, lerp, inv, E, rng, noise } = ZG;
  const S = ZG.scenes;

  // ---------- SH09 凌晨三点 → 推进到心里：绷紧的弦 ----------
  const RC = { x: 540, y: 900, r: 210 };
  function strings(ctx, t, amp, a) {
    const R = rng(909);
    for (let i = 0; i < 16; i++) {
      const ang = -Math.PI / 2 + 0.6 + (i / 16) * (Math.PI * 2 - 1.2) + (R() - 0.5) * 0.1;
      const sx = RC.x + Math.cos(ang) * RC.r, sy = RC.y + Math.sin(ang) * RC.r;
      const ex = RC.x + Math.cos(ang) * 1500, ey = RC.y + Math.sin(ang) * 1500;
      const ph = R() * 6, fr = 9 + R() * 6;
      ZG.glowStroke(ctx, (c) => {
        for (let k = 0; k <= 30; k++) {
          const u = k / 30, d = Math.sin(Math.PI * u) * Math.sin(t * fr + ph) * amp * (0.6 + R() * 0.0);
          const px = lerp(sx, ex, u) - Math.sin(ang) * d, py = lerp(sy, ey, u) + Math.cos(ang) * d;
          k ? c.lineTo(px, py) : c.moveTo(px, py);
        }
      }, C.amber, 1.4, 0.5 * a, 0.8);
    }
  }
  ZG.mindStrings = strings;
  S.tension = {
    insetPlate: true,
    cam: (s) => ({ s: 1 }),
    bg: () => {},
    fx: (ctx, s) => {
      const push = E.inExpo(inv(0.35, 1.0, s.lt));
      if (push < 1) ZG.platePart(ctx, s, 1 - push, { s: 1 + push * 2.2, fx: 640, fy: 820 });
      const m = E.out(inv(0.75, 1.3, s.lt));
      if (m <= 0) return;
      ctx.save(); ctx.globalAlpha = m; ZG.vgrad(ctx, '#05060E', '#0E0B1C'); ctx.restore();
      const amp = 6 + 26 * E.inOut(inv(1.6, 2.6, s.lt));
      strings(ctx, s.t, amp, m);
      ZG.ring(ctx, RC.x, RC.y, RC.r, { gap: 0.95, rot: 0.3 + s.t * 0.25, w: 8, a: m, t: s.t });
      ZG.dust(ctx, 31, 30, s.t, 0.3 * m, C.amber);
      ZG.label(ctx, '注：近年的元分析显示，“记得更清楚”并不稳定；“忍不住想回去完成”的倾向更可靠。', 540, 1500,
        { size: 20, align: 'center', a: 0.45 * m, ls: 1 });
    },
  };

  // ---------- SH10 手腕上的线，把她往回拉 ----------
  const WRIST = { x: 430, y: 1180 }, PAST = { x: 760, y: 620 };
  S.wrist = {
    cam: (s) => ({ s: 1.03 + 0.03 * s.p, r: s.lt > 1.25 ? -0.012 * E.out(inv(1.25, 1.8, s.lt)) : 0 }),
    bg: (ctx, s) => {
      ZG.vgrad(ctx, '#05070D', '#101826');
      const R = rng(55);
      for (let i = 0; i < 14; i++) { const x = R() * W, y = 300 + R() * 700; ZG.glow(ctx, x, y, 40 + R() * 80, R() > 0.5 ? '#FFB066' : '#7FB4D8', 0.25); ZG.glow(ctx, x, 1900 - (y - 300) * 0.4, 30, '#FFB066', 0.12); }
    },
    fx: (ctx, s) => {
      const tight = E.out(inv(1.15, 1.3, s.lt)), vib = s.lt > 1.25 ? Math.exp(-(s.lt - 1.25) * 3.2) : 0;
      const sag = lerp(140, 10, tight), wob = Math.sin(s.lt * 38) * 34 * vib;
      const mx = (WRIST.x + PAST.x) / 2 + wob, my = (WRIST.y + PAST.y) / 2 + sag;
      ZG.glowStroke(ctx, (c) => { c.moveTo(WRIST.x, WRIST.y); c.quadraticCurveTo(mx, my, PAST.x, PAST.y); }, C.amber, 3 + tight * 1.5, 0.95, 1.4);
      ZG.glow(ctx, WRIST.x, WRIST.y, 50, C.amberHi, 0.6);
      ZG.ring(ctx, PAST.x, PAST.y, 64, { gap: 1, rot: s.t * 0.6, w: 5, a: 0.9, t: s.t });
      if (vib > 0.05) ZG.burst(ctx, 1010, WRIST.x, WRIST.y, s.lt - 1.25, { n: 30, spread: 120, size: 4, life: 0.8, rise: 20 });
    },
  };

  // ---------- SH11 心里的城市：结束的都熄了灯 ----------
  S.city = {
    cam: () => ({ s: 1 }),
    bg: () => {},
    fx: (ctx, s) => {
      const k = E.inOut(s.p);
      ZG.city(ctx, s.t, { camY: lerp(-260, 60, k), zoom: lerp(1.12, 1, k) });
      ZG.dust(ctx, 13, 24, s.t, 0.2, C.cold);
    },
  };

  // ---------- SH12 站台 · 没有好好的告别 ----------
  S.platform = {
    cam: (s) => ({ s: 1.02 + 0.03 * s.p }),
    bg: (ctx, s) => {
      ZG.vgrad(ctx, '#070B12', '#151C26');
      const vp = { x: 560, y: 760 };
      // 顶棚灯带：两列向消失点收拢
      [[60, 120], [1020, 120]].forEach(([sx, sy]) => {
        for (let i = 0; i < 9; i++) {
          const d = E.out(i / 9), x = lerp(sx, vp.x, d), y = lerp(sy, vp.y, d), w = lerp(150, 14, d);
          ctx.fillStyle = `rgba(214,232,255,${0.75 - d * 0.5})`; ctx.fillRect(x - w / 2, y, w, lerp(10, 2, d));
          ZG.glow(ctx, x, y, w * 1.2, '#BFD8F2', 0.22 * (1 - d));
        }
      });
      // 站台边缘的黄色安全线
      ctx.strokeStyle = 'rgba(230,190,90,0.55)'; ctx.lineWidth = 8;
      ctx.beginPath(); ctx.moveTo(-100, 1920); ctx.lineTo(vp.x - 40, vp.y + 40); ctx.stroke();
      ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.beginPath(); ctx.moveTo(-100, 1920); ctx.lineTo(vp.x - 40, vp.y + 40); ctx.lineTo(1080, vp.y + 40); ctx.lineTo(1080, 1920); ctx.closePath(); ctx.fill();
    },
    fx: (ctx, s) => {
      const R = rng(1212), sp = E.in(inv(0, 1.6, s.lt));
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 18; i++) {
        const y = 700 + R() * 500, len = 300 + R() * 600, x = ((R() * W - s.lt * (900 + 2600 * sp)) % (W + len)) + W;
        ctx.fillStyle = `rgba(190,215,255,${0.05 + 0.12 * sp})`; ctx.fillRect(x - len, y, len, 3 + R() * 5);
      }
      ctx.restore();
      ZG.ring(ctx, 300, 760, 70, { gap: 1, rot: s.t * 0.5, w: 4, a: 0.75, t: s.t });
    },
  };

  // ---------- SH13 没说出口的话 ----------
  S.unsaid = {
    cam: (s) => ({ s: 1.06 + 0.04 * s.p }),
    bg: (ctx, s) => { ZG.cafeBg(ctx, s.t); ctx.fillStyle = 'rgba(5,8,14,0.35)'; ctx.fillRect(0, 0, W, H); },
    fx: (ctx, s) => {
      const chars = '我其实一直想'.split('');
      chars.forEach((ch, i) => {
        const on = 0.1 + i * 0.13, a = E.out(inv(on, on + 0.15, s.lt)) * (1 - inv(0.95, 1.35, s.lt));
        const x = 380 + i * 62, y = 880 - i * 6 - inv(0.95, 1.5, s.lt) * 80;
        if (a > 0) ZG.richText(ctx, ch, [], x, y, { size: 54, weight: 600, a: a * 0.85, color: C.amberHi, shadow: false });
        if (s.lt > 0.95) ZG.burst(ctx, 1300 + i, x, y, s.lt - 0.95 - i * 0.03, { n: 16, spread: 70, size: 3.5, rise: 120, life: 0.9, a: 0.8 });
      });
      ZG.ring(ctx, 760, 700, 54, { gap: 1, rot: s.t * 0.7, w: 3.5, a: 0.6, t: s.t });
    },
  };

  // ---------- SH14 停在那天的聊天框 ----------
  function bubble(ctx, x, y, text, mine, a) {
    ZG.font(ctx, 36, 400, 'sans'); const tw = ctx.measureText(text).width, bw = tw + 56, bh = 84;
    const bx = mine ? x - bw : x;
    ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = mine ? '#2E5E86' : '#1E2633';
    ctx.beginPath(); ctx.roundRect(bx, y, bw, bh, 26); ctx.fill();
    ctx.fillStyle = '#E9EEF5'; ctx.textBaseline = 'middle'; ctx.fillText(text, bx + 28, y + bh / 2 + 2); ctx.restore();
  }
  S.chat = {
    cam: (s) => ({ s: 1 + 0.12 * E.inOut(s.p), fx: 540, fy: 1460 }),
    bg: () => {},
    fx: (ctx, s) => {
      ZG.vgrad(ctx, '#020307', '#070A12');
      const px = 150, py = 230, pw = 780, ph = 1460;
      ZG.glow(ctx, 540, 960, 700, '#3C6E9E', 0.18);
      ctx.save(); ctx.fillStyle = '#0B0F16'; ctx.strokeStyle = 'rgba(255,255,255,0.14)'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.roundRect(px, py, pw, ph, 70); ctx.fill(); ctx.stroke(); ctx.restore();
      ZG.label(ctx, 'TA', 540, py + 110, { size: 40, align: 'center', weight: 500, a: 0.95, ls: 4 });
      ctx.fillStyle = 'rgba(255,255,255,0.08)'; ctx.fillRect(px, py + 170, pw, 2);
      ZG.label(ctx, '2021年11月7日 23:41', 540, py + 250, { size: 26, align: 'center', a: 0.45, ls: 2 });
      bubble(ctx, px + 40, py + 300, '最近有点忙，等我忙完这阵。', false, 1);
      bubble(ctx, px + pw - 40, py + 420, '好，你先忙。', true, 1);
      ZG.label(ctx, '之后，再也没有新消息', 540, py + 700, { size: 24, align: 'center', a: 0.28, ls: 6 });
      const iy = py + ph - 200;
      ctx.save(); ctx.fillStyle = '#161C27'; ctx.beginPath(); ctx.roundRect(px + 36, iy, pw - 200, 96, 48); ctx.fill(); ctx.restore();
      const draft = '其实我一直想问你', n = Math.min(draft.length, Math.floor(inv(0.1, 1.0, s.lt) * draft.length + 0.0001));
      ZG.font(ctx, 36, 400, 'sans'); ctx.fillStyle = '#E9EEF5'; ctx.textBaseline = 'middle';
      const txt = draft.slice(0, n); ctx.fillText(txt, px + 76, iy + 50);
      const cx = px + 80 + ctx.measureText(txt).width;
      if (Math.floor(s.t * 2.2) % 2 === 0) { ctx.fillStyle = C.amber; ctx.fillRect(cx, iy + 26, 4, 48); }
      ZG.ring(ctx, px + pw - 96, iy + 48, 34, { gap: 1.1, rot: s.t * 0.9, w: 5, a: 1, t: s.t });
    },
  };

  // ---------- SH15 都是一张没结账的单 → 飞进城市点亮窗户 ----------
  function ticket(ctx, kind, x, y, a) {
    ctx.save(); ctx.translate(x, y); ctx.globalAlpha = a;
    if (kind === 0) { ctx.fillStyle = '#C9D6E3'; ctx.fillRect(-120, -60, 240, 120); ZG.label(ctx, '车票 · 末班', 0, 0, { size: 26, align: 'center', color: '#20303F', ls: 2 }); }
    if (kind === 1) { ctx.fillStyle = '#EFE3CC'; ctx.fillRect(-80, -110, 160, 220); ZG.label(ctx, '两杯拿铁', 0, -40, { size: 24, align: 'center', color: '#3A2A1A', ls: 2 }); }
    if (kind === 2) { ctx.fillStyle = '#0B0F16'; ctx.strokeStyle = 'rgba(255,255,255,0.3)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.roundRect(-70, -130, 140, 260, 22); ctx.fill(); ctx.stroke(); ZG.glow(ctx, 0, 0, 80, '#3C6E9E', 0.4); }
    ctx.restore();
  }
  S.slips = {
    cam: () => ({ s: 1 }),
    bg: () => {},
    fx: (ctx, s) => {
      const camY = 60; ZG.city(ctx, s.t, { camY, zoom: 1 });
      ctx.fillStyle = 'rgba(3,5,10,0.35)'; ctx.fillRect(0, 0, W, H);
      const starts = [[230, 1150], [540, 1200], [850, 1150]];
      starts.forEach(([sx, sy], k) => {
        const morph = E.inOut(inv(0.3, 0.5, s.lt)), t0 = 0.5 + k * 0.35, fly = E.inOut(inv(t0, t0 + 0.4, s.lt));
        const tgt = ZG.cityPoint(k + 1, camY);
        if (fly >= 1) return;
        const x = lerp(sx, tgt.x, fly), y = lerp(sy, tgt.y, fly) - Math.sin(fly * Math.PI) * 160, sc = lerp(1, 0.12, E.in(fly));
        if (morph < 1) ticket(ctx, k, sx, sy, (1 - morph) * E.out(inv(0, 0.15, s.lt)));
        if (morph > 0) { ctx.save(); ctx.translate(x, y); ctx.scale(sc, sc); ZG.slip(ctx, 0, 0, { a: morph, seed: 20 + k, t: s.t, rot: (1 - fly) * 0.1 }); ctx.restore(); }
      });
      ZG.SPECIAL_T.forEach((on, k) => {
        if (s.t > on) { const p = ZG.cityPoint(k + 1, camY); ZG.burst(ctx, 1500 + k, p.x, p.y, s.t - on, { n: 40, spread: 90, size: 4, life: 0.7, rise: 10 }); }
      });
    },
  };

  // ---------- SH16 反复：同一个夜晚被倒带 ----------
  const STAMPS = ['01:12', '02:47', '03:58'];
  S.loop = {
    cam: (s) => ({ s: 1.04 }),
    bg: (ctx, s) => { ZG.vgrad(ctx, '#04050A', '#0B1020'); ZG.glow(ctx, 640, 1100, 320, '#4C7FB0', 0.35); },
    fx: (ctx, s) => {
      const seg = Math.min(2, Math.floor(s.lt)), lt = s.lt - seg, rw = 1 - inv(0.0, 0.28, lt);
      if (rw > 0) {
        const R = rng(seg * 7 + Math.floor(lt * 30));
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        for (let i = 0; i < 14; i++) { ctx.fillStyle = `rgba(170,200,255,${0.12 * rw})`; ctx.fillRect(0, R() * H, W, 2 + R() * 18); }
        ctx.restore();
      }
      ZG.ring(ctx, 540, 520, 190, { gap: 0.9, rot: -s.t * 0.5 - rw * 3, w: 4, a: 0.7, t: s.t });
      ZG.richText(ctx, STAMPS[seg], [], 540 + rw * 30 * noise(s.t * 40), 520, { size: 110, weight: 300, ls: 10, a: 0.92 - rw * 0.4, color: C.white });
      ZG.label(ctx, ['第一次想起', '第二次想起', '第三次想起'][seg], 540, 660, { size: 26, align: 'center', a: 0.5, ls: 10 });
    },
  };
})();
