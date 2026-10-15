/* =============================================================================
 * 梦境风格图元：散景光斑 / 月亮与太阳 / 睡眠压力水杯 / 毛玻璃面板 / 夜间时钟 HUD
 * -----------------------------------------------------------------------------
 * 与 draw.js（通用动态文字、里程表、圆环等）配合使用。全部为时间的纯函数。
 * ========================================================================== */
(function () {
  const U = FX.U, E = U.ease, C = FX.CFG.C, D = FX.D;

  /** 深夜渐变底 + 星点 */
  D.night = function (ctx, t, o = {}) {
    const g = ctx.createLinearGradient(0, 0, 0, 1920);
    g.addColorStop(0, o.top || '#070a22');
    g.addColorStop(0.55, o.mid || '#05061a');
    g.addColorStop(1, o.bottom || '#020208');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 1080, 1920);
    const n = o.stars == null ? 90 : o.stars;
    for (let i = 0; i < n; i++) {
      const x = U.rnd(i, 81) * 1080, y = U.rnd(i, 82) * 1300;
      const tw = 0.4 + 0.6 * Math.abs(Math.sin(t * (0.6 + U.rnd(i, 83) * 1.4) + i));
      const s = 1 + U.rnd(i, 84) * 2.2;
      ctx.fillStyle = U.rgba('#dfe7ff', 0.5 * tw * (o.starAlpha == null ? 1 : o.starAlpha));
      ctx.fillRect(x, y, s, s);
    }
  };

  /** 散景光斑：大而柔的光圈缓慢漂浮（梦境感的主要来源） */
  D.bokeh = function (ctx, t, o = {}) {
    const n = o.n || 18, seed = o.seed || 3;
    const cols = o.colors || [C.moon, C.lav, C.pink];
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < n; i++) {
      const sp = 8 + U.rnd(i, seed) * 22;
      const x = ((U.rnd(i, seed + 1) * 1280 + Math.sin(t * 0.21 + i) * 60) % 1280) - 100;
      const y = ((((U.rnd(i, seed + 2) * 2200 - t * sp) % 2200) + 2200) % 2200) - 140;
      const r = 30 + U.rnd(i, seed + 3) * (o.maxR || 110);
      const a = (o.alpha == null ? 0.16 : o.alpha) * (0.5 + 0.5 * Math.sin(t * 0.7 + i * 1.7));
      const col = cols[i % cols.length];
      const g = ctx.createRadialGradient(x, y, r * 0.55, x, y, r);
      g.addColorStop(0, U.rgba(col, a * 0.55));
      g.addColorStop(0.85, U.rgba(col, a));
      g.addColorStop(1, U.rgba(col, 0));
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, U.TAU);
      ctx.fill();
    }
    ctx.restore();
  };

  /** 漂浮的细小光尘 */
  D.motes = function (ctx, t, o = {}) {
    const n = o.n || 70, seed = o.seed || 9;
    ctx.save();
    for (let i = 0; i < n; i++) {
      const sp = 10 + U.rnd(i, seed) * 30;
      const x = U.rnd(i, seed + 1) * 1080 + Math.sin(t * 0.5 + i) * 20;
      const y = (((U.rnd(i, seed + 2) * 1920 - t * sp) % 1920) + 1920) % 1920;
      const s = 1.5 + U.rnd(i, seed + 3) * 3;
      ctx.fillStyle = U.rgba(o.color || '#ffffff', (o.alpha || 0.55) * (0.3 + 0.7 * Math.abs(Math.sin(t * 1.3 + i))));
      ctx.beginPath();
      ctx.arc(x, y, s, 0, U.TAU);
      ctx.fill();
    }
    ctx.restore();
  };

  /** 上下渐变压暗（文字可读性） */
  D.shade = function (ctx, top = 0.7, mid = 0.2, bottom = 0.85, color = '4,5,14') {
    const g = ctx.createLinearGradient(0, 0, 0, 1920);
    g.addColorStop(0, `rgba(${color},${top})`);
    g.addColorStop(0.3, `rgba(${color},${mid})`);
    g.addColorStop(0.62, `rgba(${color},${mid})`);
    g.addColorStop(1, `rgba(${color},${bottom})`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 1080, 1920);
  };
  D.dim = function (ctx, a, color = '#04050e') {
    if (a <= 0) return;
    ctx.fillStyle = U.rgba(color, a);
    ctx.fillRect(0, 0, 1080, 1920);
  };

  /** 新月图标 */
  D.moonIcon = function (ctx, x, y, r, color = C.moon, a = 1) {
    ctx.save();
    ctx.globalAlpha *= a;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, U.TAU);
    ctx.arc(x + r * 0.45, y - r * 0.28, r * 0.85, 0, U.TAU, true);
    ctx.fill('evenodd');
    ctx.restore();
  };
  /** 太阳图标 */
  D.sunIcon = function (ctx, x, y, r, color = C.amber, a = 1, t = 0) {
    ctx.save();
    ctx.globalAlpha *= a;
    ctx.fillStyle = color;
    ctx.strokeStyle = color;
    ctx.lineWidth = r * 0.16;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(x, y, r * 0.55, 0, U.TAU);
    ctx.fill();
    for (let k = 0; k < 8; k++) {
      const ang = (k / 8) * U.TAU + t * 0.4;
      ctx.beginPath();
      ctx.moveTo(x + Math.cos(ang) * r * 0.78, y + Math.sin(ang) * r * 0.78);
      ctx.lineTo(x + Math.cos(ang) * r * 1.02, y + Math.sin(ang) * r * 1.02);
      ctx.stroke();
    }
    ctx.restore();
  };

  /** 毛玻璃面板（半透明 + 细描边 + 顶部高光） */
  D.frost = function (ctx, x, y, w, h, o = {}) {
    ctx.save();
    ctx.globalAlpha *= o.alpha == null ? 1 : o.alpha;
    U.rrect(ctx, x, y, w, h, o.r || 36);
    ctx.fillStyle = o.fill || 'rgba(14,18,44,0.58)';
    ctx.fill();
    const g = ctx.createLinearGradient(0, y, 0, y + h);
    g.addColorStop(0, 'rgba(255,255,255,0.10)');
    g.addColorStop(0.35, 'rgba(255,255,255,0.02)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fill();
    ctx.strokeStyle = o.stroke || 'rgba(200,215,255,0.28)';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();
  };

  /**
   * 睡眠压力水杯：level 0~1 为水位，debt 0~1 为杯底沉积的"睡眠债"
   * 水面是两层叠加的正弦波，伴随上升气泡
   */
  D.vessel = function (ctx, x, y, w, h, level, debt, t, o = {}) {
    ctx.save();
    ctx.globalAlpha *= o.alpha == null ? 1 : o.alpha;
    const r = w * 0.18;
    // 杯身
    U.rrect(ctx, x, y, w, h, r);
    ctx.fillStyle = 'rgba(160,185,255,0.07)';
    ctx.fill();
    ctx.save();
    ctx.clip();
    // 水
    const lv = U.clamp(level, 0, 1.08);
    const sy = y + h * (1 - lv);
    const g = ctx.createLinearGradient(0, sy, 0, y + h);
    g.addColorStop(0, U.rgba(o.water || '#8a86e0', 0.8));
    g.addColorStop(1, U.rgba(o.water2 || '#2f3a98', 0.92));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(x, y + h);
    for (let i = 0; i <= 40; i++) {
      const u = i / 40;
      const wy = sy + Math.sin(u * 9 + t * 3.2) * 9 + Math.sin(u * 17 - t * 2.1) * 4;
      ctx.lineTo(x + u * w, wy);
    }
    ctx.lineTo(x + w, y + h);
    ctx.closePath();
    ctx.fill();
    // 水面高光
    ctx.strokeStyle = 'rgba(230,235,255,0.6)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    for (let i = 0; i <= 40; i++) {
      const u = i / 40;
      const wy = sy + Math.sin(u * 9 + t * 3.2) * 9 + Math.sin(u * 17 - t * 2.1) * 4;
      i ? ctx.lineTo(x + u * w, wy) : ctx.moveTo(x, wy);
    }
    ctx.stroke();
    // 气泡
    for (let i = 0; i < 26; i++) {
      const bx = x + w * (0.1 + 0.8 * U.rnd(i, 71));
      const sp = 0.25 + U.rnd(i, 72) * 0.5;
      const ph = (t * sp + U.rnd(i, 73)) % 1;
      const by = y + h - ph * (y + h - sy);
      if (by < sy + 6) continue;
      ctx.strokeStyle = 'rgba(255,255,255,0.45)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(bx + Math.sin(t * 3 + i) * 6, by, 3 + U.rnd(i, 74) * 6, 0, U.TAU);
      ctx.stroke();
    }
    // 杯底沉积：睡眠债
    if (debt > 0) {
      const dh = h * U.clamp(debt);
      const dg = ctx.createLinearGradient(0, y + h - dh, 0, y + h);
      dg.addColorStop(0, U.rgba(C.pink, 0.75));
      dg.addColorStop(1, U.rgba('#7a2f6d', 0.95));
      ctx.fillStyle = dg;
      ctx.fillRect(x, y + h - dh, w, dh);
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.fillRect(x, y + h - dh, w, 2);
    }
    ctx.restore();
    // 杯身描边与刻度
    U.rrect(ctx, x, y, w, h, r);
    ctx.strokeStyle = 'rgba(220,230,255,0.75)';
    ctx.lineWidth = 4;
    ctx.stroke();
    ctx.fillStyle = 'rgba(220,230,255,0.6)';
    for (let k = 1; k < 10; k++) ctx.fillRect(x + w - 34, y + (h * k) / 10, k % 5 ? 14 : 26, 2);
    // 溢出警示
    if (level > 0.98) {
      ctx.fillStyle = U.rgba(C.pink, 0.5 + 0.5 * Math.sin(t * 12));
      ctx.fillRect(x - 10, y - 6, w + 20, 6);
    }
    ctx.restore();
  };

  /** 夜间时钟 HUD：时间从凌晨 01:12 走到早上 07:00（叙事上的"夜晚在流逝"） */
  D.nightHud = function (ctx, t, o = {}) {
    const a = o.alpha == null ? 0.8 : o.alpha;
    if (a <= 0) return;
    const min = U.lerp(72, 420, U.clamp(t / 76.8)); // 01:12 → 07:00
    const hh = Math.floor(min / 60), mm = Math.floor(min % 60);
    const day = min >= 360;
    ctx.save();
    ctx.globalAlpha *= a;
    const x = 64, y = 226;
    if (day) D.sunIcon(ctx, x + 14, y, 15, C.amber, 1, t);
    else D.moonIcon(ctx, x + 14, y, 14, C.moon);
    ctx.font = U.font(600, 30, 'display');
    ctx.fillStyle = day ? C.amber : C.ink;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    ctx.fillText(`${U.pad(hh)}:${U.pad(mm)}`, x + 42, y + 2);
    ctx.font = U.font(400, 22, 'mono');
    ctx.fillStyle = U.rgba(C.ink, 0.55);
    ctx.fillText(t >= 76.8 ? 'AM · 今晚早点睡' : day ? 'AM · 天亮了' : 'AM · 你还没睡', x + 136, y + 2);
    ctx.textAlign = 'right';
    ctx.fillText('SLEEP LAB · 睡眠实验室', 1016, y + 2);
    // 底部授权署名
    ctx.font = U.font(400, 18, 'mono');
    ctx.fillStyle = U.rgba(C.ink, 0.4);
    ctx.fillText('PHOTOS: OPEN IMAGES / FLICKR · CC BY 2.0 · CREDITS IN DESCRIPTION', 1016, 1528);
    ctx.restore();
  };
})();
