// “心里的城市”：每一扇窗是一段关系。结束的熄灯，没结束的一直亮着。
// 窗户的明暗是全局时间的函数，所以 SH11 / SH15 / SH17 / SH21 之间状态连续。
(function () {
  const ZG = window.ZG, C = ZG.C, W = ZG.W, H = ZG.H;
  const { clamp, lerp, inv, E, rng } = ZG;

  const LAYERS = [
    { n: 12, wmin: 110, wmax: 190, hmin: 900, hmax: 1300, base: 1650, win: [10, 16, 22, 30], col: '#0B1424', winOff: '#101C30', par: 0.35 },
    { n: 9, wmin: 150, wmax: 250, hmin: 700, hmax: 1150, base: 1800, win: [14, 22, 30, 40], col: '#0A111E', winOff: '#132037', par: 0.6 },
    { n: 6, wmin: 220, wmax: 340, hmin: 520, hmax: 900, base: 1960, win: [22, 32, 42, 56], col: '#070C16', winOff: '#16233A', par: 1 },
  ];
  const SPECIAL_T = [34.0, 34.35, 34.7];
  let CITY = null;

  function build() {
    const R = rng(2026), wins = [], blds = [];
    LAYERS.forEach((L, li) => {
      let x = -60;
      for (let b = 0; b < L.n * 2 && x < W + 60; b++) {
        const w = L.wmin + R() * (L.wmax - L.wmin), h = L.hmin + R() * (L.hmax - L.hmin);
        const bld = { li, x, y: L.base - h, w, h }; blds.push(bld);
        const [ww, wh, sx, sy] = L.win, cols = Math.floor((w - 24) / sx), rows = Math.floor((h - 40) / sy);
        const ox = x + (w - cols * sx) / 2 + (sx - ww) / 2;
        for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
          const r1 = R(), r2 = R();
          wins.push({ li, x: ox + c * sx, y: bld.y + 30 + r * sy, w: ww, h: wh, r1, r2,
            offAt: r2 < 0.75 ? 26.5 + r2 * 1.75 : 38.25 + (r2 - 0.75) * 3, warm: 0.7 + R() * 0.3 });
        }
        x += w * (0.75 + R() * 0.35);
      }
    });
    // 选一扇“主窗”（近景，画面偏中下）和三扇“特别的窗”
    let best = null, bd = 1e9;
    wins.forEach((w) => { if (w.li !== 2) return; const d = Math.hypot(w.x - 560, w.y - 1180); if (d < bd) { bd = d; best = w; } });
    best.main = true;
    const sp = [[300, 900], [760, 760], [470, 1450]];
    sp.forEach(([px, py], k) => {
      let b2 = null, d2 = 1e9;
      wins.forEach((w) => { if (w.li !== 1 || w.main) return; const d = Math.hypot(w.x - px, w.y - py); if (d < d2) { d2 = d; b2 = w; } });
      b2.special = k + 1;
    });
    CITY = { wins, blds, main: best, special: wins.filter((w) => w.special).sort((a, b) => a.special - b.special) };
  }

  // 0..1 亮度
  function lit(w, t) {
    if (w.main) return t < 50.0 ? 1 : 1 - E.inOut(inv(50.0, 51.4, t));
    if (w.special) {
      const on = SPECIAL_T[w.special - 1];
      return t < on ? 0 : t < 38.4 ? E.outExpo(inv(on, on + 0.12, t)) : 1 - inv(38.4, 38.9, t);
    }
    if (w.r1 > 0.22) return 0;
    return t < w.offAt ? 1 : 1 - inv(w.offAt, w.offAt + 0.08, t);
  }

  // o: { camY, zoom, fx, fy (缩放中心), dawn 0..1, focusMain }
  ZG.city = function (ctx, t, o = {}) {
    if (!CITY) build();
    const dawn = o.dawn || 0;
    const sky = ctx.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, ZG.mix('#03050B', '#6E8FB8', dawn)); sky.addColorStop(0.55, ZG.mix('#0A1324', '#E9B49A', dawn));
    sky.addColorStop(1, ZG.mix('#0C1626', '#F6D2B4', dawn));
    ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);
    if (dawn > 0) ZG.glow(ctx, 540, 1250, 900, '#FFE2C2', 0.5 * dawn);
    const z = o.zoom || 1, fx = o.fx == null ? 540 : o.fx, fy = o.fy == null ? 960 : o.fy;
    ctx.save(); ctx.translate(fx, fy); ctx.scale(z, z); ctx.translate(-fx, -fy);
    LAYERS.forEach((L, li) => {
      ctx.save(); ctx.translate(0, (o.camY || 0) * L.par);
      CITY.blds.forEach((b) => {
        if (b.li !== li) return;
        const face = ZG.mix(L.col, '#5A6B84', dawn * 0.6), g = ctx.createLinearGradient(b.x, 0, b.x + b.w, 0);
        g.addColorStop(0, ZG.mix(face, '#26364F', 0.35)); g.addColorStop(0.5, face); g.addColorStop(1, ZG.mix(face, '#000000', 0.35));
        ctx.fillStyle = g; ctx.fillRect(b.x, b.y, b.w, b.h + 400);
        ctx.fillStyle = ZG.rgba(dawn > 0.3 ? '#FFD9B8' : '#6F8FB8', 0.18 + dawn * 0.2); ctx.fillRect(b.x, b.y, b.w, 3);
      });
      CITY.wins.forEach((w) => {
        if (w.li !== li) return;
        const k = lit(w, t);
        ctx.fillStyle = ZG.mix(L.winOff, '#8899AA', dawn * 0.35); ctx.fillRect(w.x, w.y, w.w, w.h);
        if (k > 0.01) {
          ctx.globalAlpha = k; ctx.fillStyle = ZG.mix('#FFC36E', C.amberHi, w.warm - 0.7); ctx.fillRect(w.x, w.y, w.w, w.h); ctx.globalAlpha = 1;
          if (w.main || w.special || li === 2) ZG.glow(ctx, w.x + w.w / 2, w.y + w.h / 2, w.w * (w.main ? 3.2 : 2), C.amber, k * (w.main ? 0.75 : 0.4));
        }
      });
      ctx.restore();
      // 层与层之间的夜雾，拉开纵深
      if (li < 2) {
        const fog = ctx.createLinearGradient(0, 700, 0, 1920);
        fog.addColorStop(0, ZG.rgba(dawn > 0.3 ? '#F2C7AE' : '#18263D', 0)); fog.addColorStop(1, ZG.rgba(dawn > 0.3 ? '#F2C7AE' : '#18263D', 0.28 + dawn * 0.1));
        ctx.fillStyle = fog; ctx.fillRect(-200, 0, W + 400, H + 400);
      }
    });
    ctx.restore();
  };
  // 返回主窗/特别窗在屏幕上的位置（含 camY 视差，不含 zoom）
  ZG.cityPoint = function (which, camY) {
    if (!CITY) build();
    const w = which === 'main' ? CITY.main : CITY.special[which - 1];
    return { x: w.x + w.w / 2, y: w.y + w.h / 2 + (camY || 0) * LAYERS[w.li].par, w: w.w, h: w.h };
  };
  ZG.SPECIAL_T = SPECIAL_T;
})();
