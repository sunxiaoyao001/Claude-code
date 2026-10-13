/* =============================================================================
 * 2D 动效图元库（HUD / 动态文字 / 粒子 / 碎片 / 通知卡片 / 仪表）
 * -----------------------------------------------------------------------------
 * 所有函数都是"无状态"的：输入时间和参数，输出画面。
 * 发光效果交给 post.js 的辉光（Bloom），这里尽量不用 shadowBlur（性能杀手）。
 * ========================================================================== */
(function () {
  const U = FX.U, E = U.ease, C = FX.CFG.C;
  const D = (FX.D = {});

  /* ======================= 背景层 ======================= */

  /** 深色背景 + 点阵网格 + 漂浮数据尘埃（带视差） */
  D.bg = function (ctx, t, o = {}) {
    const W = 1080, H = 1920;
    const tint = o.tint || C.cyan;
    const g = ctx.createRadialGradient(540, 820, 80, 540, 900, 1300);
    g.addColorStop(0, o.inner || '#0b1222');
    g.addColorStop(1, C.bg);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    // 点阵
    const ga = o.grid == null ? 0.16 : o.grid;
    if (ga > 0) {
      ctx.fillStyle = U.rgba(tint, ga);
      const step = 54, off = (t * 12) % step;
      for (let y = -step + off; y < H; y += step)
        for (let x = 27; x < W; x += step) ctx.fillRect(x - 1.5, y - 1.5, 3, 3);
    }
    // 数据尘埃：3 层视差
    const n = o.dust == null ? 70 : o.dust;
    for (let i = 0; i < n; i++) {
      const layer = i % 3;
      const sp = [18, 36, 70][layer];
      const x = U.rnd(i, 11) * W + Math.sin(t * 0.4 + i) * 12;
      const y = (((U.rnd(i, 12) * H - t * sp) % H) + H) % H;
      const a = (0.18 + 0.35 * U.rnd(i, 13)) * (layer + 1) / 3;
      const s = 1.5 + layer * 1.6;
      ctx.fillStyle = U.rgba(i % 7 === 0 ? C.magenta : tint, a);
      ctx.fillRect(x, y, s, s);
    }
  };

  /** 合成波风格透视地面网格 */
  D.floorGrid = function (ctx, t, o = {}) {
    const horizon = o.horizon || 1180, color = o.color || C.magenta, alpha = o.alpha == null ? 0.6 : o.alpha;
    const speed = o.speed || 0.8;
    ctx.save();
    ctx.lineWidth = 2;
    const cx = 540;
    // 纵线（从消失点发散）
    for (let i = -14; i <= 14; i++) {
      const xb = cx + i * 160;
      const gr = ctx.createLinearGradient(0, horizon, 0, 1920);
      gr.addColorStop(0, U.rgba(color, 0));
      gr.addColorStop(1, U.rgba(color, alpha));
      ctx.strokeStyle = gr;
      ctx.beginPath();
      ctx.moveTo(cx + i * 6, horizon);
      ctx.lineTo(xb * 1.6 - cx * 0.6, 1920);
      ctx.stroke();
    }
    // 横线（透视间距 + 向镜头移动）
    const ph = (t * speed) % 1;
    for (let k = 0; k < 18; k++) {
      const z = 18 - k - ph; // 远 → 近
      if (z <= 0.2) continue;
      const y = horizon + 740 / z;
      if (y > 1920) continue;
      const a = alpha * U.clamp((y - horizon) / 500);
      ctx.strokeStyle = U.rgba(color, a);
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(1080, y);
      ctx.stroke();
    }
    // 地平线辉光
    const hg = ctx.createLinearGradient(0, horizon - 120, 0, horizon + 40);
    hg.addColorStop(0, U.rgba(color, 0));
    hg.addColorStop(0.75, U.rgba(color, alpha * 0.35));
    hg.addColorStop(1, U.rgba(color, 0));
    ctx.fillStyle = hg;
    ctx.fillRect(0, horizon - 120, 1080, 160);
    ctx.restore();
  };

  /** 半调网点纹理（印刷感），叠在照片上 */
  let halftonePat = null;
  D.halftone = function (ctx, x, y, w, h, alpha = 0.35) {
    if (!halftonePat) {
      const c = U.canvas(10, 10), g = c.getContext('2d');
      g.fillStyle = '#000';
      g.beginPath();
      g.arc(5, 5, 2.3, 0, U.TAU);
      g.fill();
      halftonePat = ctx.createPattern(c, 'repeat');
    }
    ctx.save();
    ctx.globalAlpha *= alpha;
    ctx.fillStyle = halftonePat;
    ctx.fillRect(x, y, w, h);
    ctx.restore();
  };

  /** 从上到下扫过的光束 */
  D.scanBeam = function (ctx, y, color = C.cyan, alpha = 1, x = 0, w = 1080, thick = 140) {
    ctx.save();
    const g = ctx.createLinearGradient(0, y - thick, 0, y + 6);
    g.addColorStop(0, U.rgba(color, 0));
    g.addColorStop(0.85, U.rgba(color, 0.18 * alpha));
    g.addColorStop(1, U.rgba(color, 0.0));
    ctx.fillStyle = g;
    ctx.fillRect(x, y - thick, w, thick + 6);
    ctx.fillStyle = U.rgba('#ffffff', 0.9 * alpha);
    ctx.fillRect(x, y - 1.5, w, 3);
    ctx.restore();
  };

  /** 柔光斑（廉价"发光"） */
  D.glow = function (ctx, x, y, r, color, a = 0.5) {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, U.rgba(color, a));
    g.addColorStop(1, U.rgba(color, 0));
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  };

  /* ======================= HUD ======================= */

  /** 全局 HUD 边框：角标、录制标识、时间码、刻度尺 */
  D.hudFrame = function (ctx, t, o = {}) {
    const col = o.color || C.cyan, a = o.alpha == null ? 0.55 : o.alpha;
    if (a <= 0) return;
    ctx.save();
    ctx.strokeStyle = U.rgba(col, a);
    ctx.fillStyle = U.rgba(col, a);
    ctx.lineWidth = 3;
    const L = 46, x0 = 44, x1 = 1036, y0 = 250, y1 = 1500;
    const corner = (x, y, dx, dy) => {
      ctx.beginPath();
      ctx.moveTo(x, y + dy * L);
      ctx.lineTo(x, y);
      ctx.lineTo(x + dx * L, y);
      ctx.stroke();
    };
    corner(x0, y0, 1, 1); corner(x1, y0, -1, 1); corner(x0, y1, 1, -1); corner(x1, y1, -1, -1);
    // 左侧刻度尺（随时间滚动）
    const a0 = ctx.globalAlpha;
    for (let i = 0; i < 40; i++) {
      const y = y0 + 80 + ((i * 28 + t * 40) % 1120);
      const long = i % 5 === 0;
      ctx.globalAlpha = a0 * 0.5 * (1 - Math.abs(y - (y0 + y1) / 2) / 640);
      ctx.fillRect(x0 + 2, y, long ? 18 : 9, 2);
    }
    ctx.globalAlpha = a0;
    // 顶部：REC + 系统名 + 时间码
    ctx.font = U.font(700, 24, 'mono');
    ctx.textBaseline = 'middle';
    const blink = Math.floor(t * 2) % 2 === 0;
    if (blink) {
      ctx.fillStyle = U.rgba(C.red, Math.min(1, a * 1.6));
      ctx.beginPath();
      ctx.arc(x0 + 10, y0 - 30, 8, 0, U.TAU);
      ctx.fill();
    }
    ctx.fillStyle = U.rgba(col, a);
    ctx.textAlign = 'left';
    ctx.fillText('REC  FOCUS.SYS // v2.3', x0 + 30, y0 - 30);
    ctx.textAlign = 'right';
    const ff = Math.floor((t % 1) * 60);
    ctx.fillText(`T+${U.pad(t / 60)}:${U.pad(t % 60)}:${U.pad(ff)}`, x1, y0 - 30);
    // 底部：信号格 + 照片授权署名（CC BY 2.0 要求署名，完整名单见 assets/photos/CREDITS.md）
    ctx.textAlign = 'left';
    ctx.fillText(`SIG ${'▮'.repeat(3 + (Math.floor(t * 3) % 3))}`, x0 + 6, y1 + 28);
    ctx.textAlign = 'right';
    ctx.font = U.font(400, 18, 'mono');
    ctx.fillText('PHOTOS: OPEN IMAGES / FLICKR · CC BY 2.0 · CREDITS IN DESCRIPTION', x1, y1 + 28);
    ctx.restore();
  };

  /**
   * 追踪准星：lock 0→1 时四角从外向内收拢并锁定
   */
  D.reticle = function (ctx, x, y, r, t, lock, o = {}) {
    const col = o.color || C.cyan;
    const a = o.alpha == null ? 1 : o.alpha;
    if (a <= 0) return;
    ctx.save();
    ctx.globalAlpha *= a;
    ctx.strokeStyle = col;
    ctx.fillStyle = col;
    const e = E.outCubic(U.clamp(lock));
    const d = r * (1 + (1 - e) * 1.4);
    const rot = (1 - e) * 0.8;
    ctx.lineWidth = 4;
    ctx.translate(x, y);
    // 四角
    ctx.save();
    ctx.rotate(rot);
    const L = r * 0.38;
    for (let k = 0; k < 4; k++) {
      ctx.save();
      ctx.rotate((k * Math.PI) / 2);
      ctx.beginPath();
      ctx.moveTo(-d, -d + L);
      ctx.lineTo(-d, -d);
      ctx.lineTo(-d + L, -d);
      ctx.stroke();
      ctx.restore();
    }
    ctx.restore();
    // 旋转虚线环
    ctx.lineWidth = 2;
    ctx.setLineDash([10, 14]);
    ctx.lineDashOffset = -t * 40;
    ctx.globalAlpha *= 0.7;
    ctx.beginPath();
    ctx.arc(0, 0, r * 1.18, 0, U.TAU);
    ctx.stroke();
    ctx.setLineDash([]);
    // 外刻度弧
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(0, 0, r * 1.36, t * 1.2, t * 1.2 + 0.9);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, 0, r * 1.36, t * 1.2 + Math.PI, t * 1.2 + Math.PI + 0.5);
    ctx.stroke();
    ctx.globalAlpha /= 0.7;
    // 十字
    ctx.lineWidth = 2;
    const cs = r * 0.16;
    ctx.beginPath();
    ctx.moveTo(-cs, 0); ctx.lineTo(cs, 0);
    ctx.moveTo(0, -cs); ctx.lineTo(0, cs);
    ctx.stroke();
    // 标签
    if (o.label) {
      // 自动选边：右侧放不下 380px 的标签就放左侧
      const rl = Math.min(r, 150); // 标签偏移不随准星无限放大
      const side = o.side || (x + rl * 1.25 + 60 + 380 < 1040 ? 'right' : 'left');
      o = Object.assign({}, o, { side });
      const lx = rl * 1.25 * (o.side === 'left' ? -1 : 1), ly = (o.below ? 1 : -1) * rl * 1.25;
      // 标签端点夹在画面内
      const ex = side === 'left' ? Math.max(lx - 60, 440 - x) : Math.min(lx + 60, 640 - x);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(rl * 0.75 * Math.sign(lx), Math.sign(ly) * rl * 0.75);
      ctx.lineTo(lx, ly);
      ctx.lineTo(ex, ly);
      ctx.stroke();
      ctx.textAlign = o.side === 'left' ? 'right' : 'left';
      ctx.textBaseline = 'bottom';
      ctx.font = U.font(700, 26, 'mono');
      ctx.fillText(U.scramble(o.label, lock, t, 7), ex + (o.side === 'left' ? -8 : 8), ly - 4);
      if (o.sub) {
        ctx.font = U.font(700, 34, 'cn');
        ctx.fillStyle = C.ink;
        ctx.textBaseline = 'top';
        ctx.fillText(o.sub, ex + (o.side === 'left' ? -8 : 8), ly + 6);
      }
    }
    ctx.restore();
  };

  /** 进度环（带刻度） */
  D.ring = function (ctx, x, y, r, p, o = {}) {
    const col = o.color || C.cyan, lw = o.width || 10;
    ctx.save();
    ctx.lineCap = o.cap || 'butt';
    if (o.track !== false) {
      ctx.strokeStyle = U.rgba(col, o.trackAlpha == null ? 0.15 : o.trackAlpha);
      ctx.lineWidth = lw;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, U.TAU);
      ctx.stroke();
    }
    if (p > 0) {
      ctx.strokeStyle = col;
      ctx.lineWidth = lw;
      ctx.beginPath();
      const a0 = (o.start == null ? -Math.PI / 2 : o.start);
      ctx.arc(x, y, r, a0, a0 + U.TAU * U.clamp(p));
      ctx.stroke();
    }
    if (o.ticks) {
      ctx.strokeStyle = U.rgba(col, o.tickAlpha == null ? 0.6 : o.tickAlpha);
      ctx.lineWidth = 2;
      for (let i = 0; i < o.ticks; i++) {
        const ang = (i / o.ticks) * U.TAU + (o.rot || 0);
        const long = i % 5 === 0;
        const r0 = r + lw / 2 + 6, r1 = r0 + (long ? 22 : 10);
        ctx.beginPath();
        ctx.moveTo(x + Math.cos(ang) * r0, y + Math.sin(ang) * r0);
        ctx.lineTo(x + Math.cos(ang) * r1, y + Math.sin(ang) * r1);
        ctx.stroke();
      }
    }
    ctx.restore();
  };

  /** 分段能量条 */
  D.meter = function (ctx, x, y, w, h, v, t, o = {}) {
    const n = o.segments || 24, gap = o.gap || 6;
    const col = o.color || C.cyan;
    const sw = (w - gap * (n - 1)) / n;
    const lit = v * n;
    for (let i = 0; i < n; i++) {
      const f = U.clamp(lit - i);
      ctx.fillStyle = U.rgba(col, 0.13);
      ctx.fillRect(x + i * (sw + gap), y, sw, h);
      if (f > 0) {
        const lead = f < 1 || i === Math.floor(lit) - 1;
        const flick = lead ? 0.75 + 0.25 * Math.sin(t * 40 + i) : 1;
        ctx.fillStyle = U.rgba(i / n > (o.hotFrom || 2) ? (o.hot || C.magenta) : col, f * flick);
        ctx.fillRect(x + i * (sw + gap), y, sw, h);
      }
    }
  };

  /** 脑电波 / 信号波形 */
  D.wave = function (ctx, x, y, w, amp, t, o = {}) {
    const col = o.color || C.cyan;
    ctx.save();
    ctx.strokeStyle = col;
    ctx.lineWidth = o.width || 3;
    ctx.globalAlpha *= o.alpha == null ? 1 : o.alpha;
    ctx.beginPath();
    const n = 160, chaos = o.chaos || 0;
    for (let i = 0; i <= n; i++) {
      const u = i / n;
      const env = Math.sin(u * Math.PI);
      let v = Math.sin(u * 18 + t * 5) * 0.55 + Math.sin(u * 7 - t * 3.1) * 0.35;
      v += U.noise(u * 40 + t * 12, 3) * chaos * 1.6;
      const px = x + u * w, py = y + v * amp * env;
      i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
    }
    ctx.stroke();
    ctx.restore();
  };

  /** 半圆仪表（数值 0..1，>0.66 进入红区） */
  D.gauge = function (ctx, x, y, r, v, t, o = {}) {
    ctx.save();
    ctx.lineWidth = o.width || 16;
    const a0 = Math.PI, a1 = Math.PI * 2;
    const seg = [[0, 0.45, C.green], [0.45, 0.68, C.amber], [0.68, 1, C.red]];
    for (const [s, e, c] of seg) {
      ctx.strokeStyle = U.rgba(c, 0.25);
      ctx.beginPath();
      ctx.arc(x, y, r, a0 + (a1 - a0) * s + 0.02, a0 + (a1 - a0) * e - 0.02);
      ctx.stroke();
      const fe = Math.min(e, v);
      if (fe > s) {
        ctx.strokeStyle = c;
        ctx.beginPath();
        ctx.arc(x, y, r, a0 + (a1 - a0) * s + 0.02, a0 + (a1 - a0) * fe - 0.02);
        ctx.stroke();
      }
    }
    // 指针（红区抖动）
    const jit = v > 0.68 ? U.noise(t * 30, 5) * 0.04 : 0;
    const ang = a0 + (a1 - a0) * U.clamp(v + jit);
    ctx.strokeStyle = C.ink;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(ang) * (r - 26), y + Math.sin(ang) * (r - 26));
    ctx.stroke();
    ctx.fillStyle = C.ink;
    ctx.beginPath();
    ctx.arc(x, y, 10, 0, U.TAU);
    ctx.fill();
    // 刻度
    ctx.strokeStyle = U.rgba(C.ink, 0.4);
    ctx.lineWidth = 2;
    for (let i = 0; i <= 10; i++) {
      const aa = a0 + (a1 - a0) * (i / 10);
      ctx.beginPath();
      ctx.moveTo(x + Math.cos(aa) * (r + 14), y + Math.sin(aa) * (r + 14));
      ctx.lineTo(x + Math.cos(aa) * (r + (i % 5 ? 22 : 32)), y + Math.sin(aa) * (r + (i % 5 ? 22 : 32)));
      ctx.stroke();
    }
    ctx.restore();
  };

  /** 滚动的十六进制数据列 */
  D.dataColumn = function (ctx, x, y, rows, t, seed, o = {}) {
    ctx.save();
    ctx.font = U.font(400, o.size || 20, 'mono');
    ctx.textAlign = o.align || 'left';
    ctx.textBaseline = 'top';
    const tick = Math.floor(t * (o.rate || 12));
    for (let i = 0; i < rows; i++) {
      const r = U.rnd(tick + i * 13, seed);
      const a = (o.alpha == null ? 0.5 : o.alpha) * (0.4 + 0.6 * U.rnd(i, seed + 1));
      ctx.fillStyle = U.rgba(i % 6 === 0 ? (o.accent || C.magenta) : (o.color || C.cyan), a);
      const hex = (Math.floor(r * 0xffffffff) >>> 0).toString(16).toUpperCase().padStart(8, '0');
      ctx.fillText(`${U.pad(i + tick % 90, 2)} ${hex.slice(0, 4)} ${hex.slice(4)}`, x, y + i * (o.size || 20) * 1.4);
    }
    ctx.restore();
  };

  /** 斜条警示带（滚动） */
  D.hazard = function (ctx, x, y, w, h, t, color = C.red, alpha = 1) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, w, h);
    ctx.clip();
    ctx.fillStyle = U.rgba('#000000', 0.6 * alpha);
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = U.rgba(color, alpha);
    const step = 56, off = (t * 160) % step;
    for (let k = -2; k < w / step + 4; k++) {
      const sx = x + k * step + off - h;
      ctx.beginPath();
      ctx.moveTo(sx, y + h);
      ctx.lineTo(sx + h, y);
      ctx.lineTo(sx + h + step / 2, y);
      ctx.lineTo(sx + step / 2, y + h);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  };

  /** 放射速度线 */
  D.speedLines = function (ctx, cx, cy, t, k, o = {}) {
    if (k <= 0) return;
    ctx.save();
    const n = o.n || 90, tick = Math.floor(t * 30);
    for (let i = 0; i < n; i++) {
      const ang = U.rnd(i, tick % 4 + 50) * U.TAU;
      const r0 = 260 + U.rnd(i, tick + 3) * 500;
      const len = (120 + U.rnd(i, tick + 9) * 600) * k;
      ctx.strokeStyle = U.rgba(i % 5 === 0 ? (o.accent || C.magenta) : (o.color || '#ffffff'), 0.25 + 0.5 * U.rnd(i, 4));
      ctx.lineWidth = 1 + U.rnd(i, 8) * 4;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(ang) * r0, cy + Math.sin(ang) * r0);
      ctx.lineTo(cx + Math.cos(ang) * (r0 + len), cy + Math.sin(ang) * (r0 + len));
      ctx.stroke();
    }
    ctx.restore();
  };

  /** 火花爆发（解析式粒子：位置只由 t 决定） */
  D.sparks = function (ctx, x, y, dt, o = {}) {
    if (dt < 0) return;
    const n = o.n || 80, life = o.life || 1.2, seed = o.seed || 1;
    const g = o.gravity == null ? 1400 : o.gravity;
    ctx.save();
    ctx.lineCap = 'round';
    for (let i = 0; i < n; i++) {
      const lf = life * (0.4 + 0.6 * U.rnd(i, seed));
      if (dt > lf) continue;
      const ang = (o.dir == null ? U.rnd(i, seed + 1) * U.TAU : o.dir + (U.rnd(i, seed + 1) - 0.5) * (o.spread || 1.4));
      const sp = (o.speed || 1400) * (0.3 + 0.7 * U.rnd(i, seed + 2));
      const drag = Math.exp(-dt * 2.2);
      const vx = Math.cos(ang) * sp * drag, vy = Math.sin(ang) * sp * drag + g * dt;
      const px = x + Math.cos(ang) * sp * (1 - Math.exp(-dt * 2.2)) / 2.2;
      const py = y + Math.sin(ang) * sp * (1 - Math.exp(-dt * 2.2)) / 2.2 + 0.5 * g * dt * dt;
      const a = 1 - dt / lf;
      ctx.strokeStyle = U.rgba(i % 4 === 0 ? (o.color2 || '#ffffff') : (o.color || C.cyan), a);
      ctx.lineWidth = 2 + 3 * U.rnd(i, seed + 3);
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.lineTo(px - vx * 0.03, py - vy * 0.03);
      ctx.stroke();
    }
    ctx.restore();
  };

  /* ======================= 玻璃碎裂 ======================= */

  /** 预生成三角碎片（抖动网格三角剖分） */
  D.buildShards = function (w, h, cols, rows, seed) {
    const rnd = U.prng(seed);
    const pts = [];
    for (let j = 0; j <= rows; j++) {
      pts[j] = [];
      for (let i = 0; i <= cols; i++) {
        const edge = i === 0 || j === 0 || i === cols || j === rows;
        const jx = edge ? 0 : (rnd() - 0.5) * 0.8, jy = edge ? 0 : (rnd() - 0.5) * 0.8;
        pts[j][i] = [((i + jx) / cols) * w, ((j + jy) / rows) * h];
      }
    }
    const tris = [];
    for (let j = 0; j < rows; j++)
      for (let i = 0; i < cols; i++) {
        const a = pts[j][i], b = pts[j][i + 1], c = pts[j + 1][i + 1], d = pts[j + 1][i];
        const pair = rnd() < 0.5 ? [[a, b, c], [a, c, d]] : [[a, b, d], [b, c, d]];
        for (const tri of pair) {
          const cx = (tri[0][0] + tri[1][0] + tri[2][0]) / 3, cy = (tri[0][1] + tri[1][1] + tri[2][1]) / 3;
          tris.push({ v: tri, cx, cy, r1: rnd(), r2: rnd(), r3: rnd(), r4: rnd() });
        }
      }
    return tris;
  };

  /**
   * 绘制碎裂：dt = 撞击后经过的秒数；(ix,iy) = 撞击点
   * 碎片朝镜头飞出（放大）+ 3D 翻转（scaleX = cos）+ 重力
   */
  D.drawShards = function (ctx, src, tris, dt, ix, iy, o = {}) {
    const g = o.gravity == null ? 1700 : o.gravity;
    for (const s of tris) {
      const dist = Math.hypot(s.cx - ix, s.cy - iy) + 1;
      // 方向取自画面中心（四散），延迟取自撞击点（裂纹从撞击点向外扩散）
      const ox0 = o.cx == null ? ix : o.cx, oy0 = o.cy == null ? iy : o.cy;
      const dx = s.cx - ox0, dy = s.cy - oy0;
      const dd = Math.hypot(dx, dy) + 1;
      const nx = dx / dd, ny = dy / dd;
      const delay = (dist / 2600) * (o.ripple == null ? 1 : o.ripple);
      const tt = Math.max(0, dt - delay);
      const pow = (700 + 1300 * s.r1) * (0.7 + Math.min(1, dd / 900));
      const ox = nx * pow * tt + (s.r3 - 0.5) * 300 * tt;
      const oy = ny * pow * tt - 420 * tt + 0.5 * g * tt * tt;
      const rot = (s.r2 - 0.5) * 9 * tt;
      const flip = Math.cos((2 + s.r4 * 7) * tt);
      const zs = 1 + (0.6 + 1.4 * s.r1) * tt * 1.6;
      const alpha = U.clamp(1 - (tt - 0.5) / 0.9);
      if (alpha <= 0) continue;
      ctx.save();
      ctx.globalAlpha *= alpha;
      ctx.translate(s.cx + ox, s.cy + oy);
      ctx.rotate(rot);
      ctx.scale(flip * zs, zs);
      ctx.translate(-s.cx, -s.cy);
      ctx.beginPath();
      ctx.moveTo(s.v[0][0], s.v[0][1]);
      ctx.lineTo(s.v[1][0], s.v[1][1]);
      ctx.lineTo(s.v[2][0], s.v[2][1]);
      ctx.closePath();
      ctx.save();
      ctx.clip();
      const minx = Math.max(0, Math.min(s.v[0][0], s.v[1][0], s.v[2][0]) - 2);
      const miny = Math.max(0, Math.min(s.v[0][1], s.v[1][1], s.v[2][1]) - 2);
      const maxx = Math.min(src.width, Math.max(s.v[0][0], s.v[1][0], s.v[2][0]) + 2);
      const maxy = Math.min(src.height, Math.max(s.v[0][1], s.v[1][1], s.v[2][1]) + 2);
      if (maxx > minx && maxy > miny) ctx.drawImage(src, minx, miny, maxx - minx, maxy - miny, minx, miny, maxx - minx, maxy - miny);
      // 翻到背面时变暗，模拟玻璃反光
      if (flip < 0.3) {
        ctx.fillStyle = U.rgba('#000000', U.clamp(0.3 - flip) * 0.8);
        ctx.fill();
      }
      ctx.restore();
      // 玻璃边缘高光
      ctx.strokeStyle = U.rgba('#ffffff', 0.55 * (1 - U.clamp(tt * 1.2)) + 0.15);
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();
    }
  };

  /* ======================= 文字 ======================= */

  /** 普通文字（带可选描边 / 字距） */
  D.text = function (ctx, str, x, y, o = {}) {
    ctx.save();
    ctx.font = o.font || U.font(900, 64);
    ctx.textAlign = o.align || 'center';
    ctx.textBaseline = o.baseline || 'alphabetic';
    if (o.spacing) ctx.letterSpacing = o.spacing + 'px';
    ctx.globalAlpha *= o.alpha == null ? 1 : o.alpha;
    if (o.stroke) {
      ctx.strokeStyle = o.stroke;
      ctx.lineWidth = o.strokeWidth || 3;
      ctx.lineJoin = 'round';
      ctx.strokeText(str, x, y);
    }
    if (o.color !== null) {
      ctx.fillStyle = o.color || C.ink;
      ctx.fillText(str, x, y);
    }
    ctx.restore();
  };

  /** 色散文字：品红 / 青色两层错位 + 主色 */
  D.chromaText = function (ctx, str, x, y, off, o = {}) {
    ctx.save();
    ctx.font = o.font || U.font(900, 64);
    ctx.textAlign = o.align || 'center';
    ctx.textBaseline = o.baseline || 'alphabetic';
    if (o.spacing) ctx.letterSpacing = o.spacing + 'px';
    ctx.globalAlpha *= o.alpha == null ? 1 : o.alpha;
    if (off > 0.2) {
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = U.rgba(o.c1 || C.magenta, 0.85);
      ctx.fillText(str, x - off, y + off * 0.25);
      ctx.fillStyle = U.rgba(o.c2 || C.cyan, 0.85);
      ctx.fillText(str, x + off, y - off * 0.25);
      ctx.globalCompositeOperation = 'source-over';
    }
    if (o.stroke) {
      ctx.strokeStyle = o.stroke;
      ctx.lineWidth = o.strokeWidth || 4;
      ctx.strokeText(str, x, y);
    }
    if (o.color !== null) {
      ctx.fillStyle = o.color || C.ink;
      ctx.fillText(str, x, y);
    }
    ctx.restore();
  };

  const measureCache = new Map();
  function charWidths(ctx, str, font, spacing) {
    const key = font + '|' + str + '|' + spacing;
    let r = measureCache.get(key);
    if (!r) {
      ctx.save();
      ctx.font = font;
      const chars = Array.from(str);
      const ws = chars.map((c) => ctx.measureText(c).width + spacing);
      r = { chars, ws, total: ws.reduce((a, b) => a + b, 0) - spacing };
      ctx.restore();
      if (measureCache.size > 4000) measureCache.clear();
      measureCache.set(key, r);
    }
    return r;
  }

  function hlMask(str, hl) {
    const chars = Array.from(str), mask = new Array(chars.length).fill(false);
    if (!hl) return mask;
    for (const w of hl) {
      if (!w) continue;
      let from = 0;
      const s = chars.join('');
      while (true) {
        const idx = s.indexOf(w, from);
        if (idx < 0) break;
        // indexOf 返回 UTF-16 下标；本项目文本均在 BMP 内，可直接对应
        for (let k = 0; k < Array.from(w).length; k++) mask[idx + k] = true;
        from = idx + w.length;
      }
    }
    return mask;
  }

  /**
   * 逐字动态文字（Kinetic Typography）
   * @param lt  该文字的本地时间（0 = 开始出现）
   * @param o.mode   'rise' 上浮回弹 | 'slam' 从大砸下 | 'decode' 乱码解码 | 'drop' 下落
   * @param o.out    退场开始时间（本地），null 表示不退场
   * @param o.hl     高亮关键词数组
   */
  D.kinetic = function (ctx, str, x, y, lt, o = {}) {
    if (lt < 0) return 0;
    let size = o.size || 80;
    const weight = o.weight || 900, fam = o.fam || 'cn', spacing = o.spacing || 0;
    let font = U.font(weight, size, fam);
    let m = charWidths(ctx, str, font, spacing);
    if (o.maxWidth && m.total > o.maxWidth) {
      size = Math.floor(size * (o.maxWidth / m.total));
      font = U.font(weight, size, fam);
      m = charWidths(ctx, str, font, spacing);
    }
    const stagger = o.stagger == null ? 0.035 : o.stagger, dur = o.dur || 0.5;
    const mode = o.mode || 'rise';
    const mask = hlMask(str, o.hl);
    const align = o.align || 'center';
    let cx = align === 'center' ? x - m.total / 2 : align === 'right' ? x - m.total : x;
    ctx.save();
    ctx.font = font;
    ctx.textBaseline = o.baseline || 'alphabetic';
    ctx.textAlign = 'left';
    const baseA = (o.alpha == null ? 1 : o.alpha) * ctx.globalAlpha; // 继承外层透明度
    for (let i = 0; i < m.chars.length; i++) {
      const ch = m.chars[i];
      const w = m.ws[i];
      const li = (lt - i * stagger) / dur;
      if (li <= 0) { cx += w; continue; }
      const p = U.clamp(li);
      let a = U.clamp(li * 2.5), sx = 1, sy = 1, dy = 0, dx = 0, rot = 0, glyph = ch;
      if (mode === 'rise') {
        const e = E.outBack(p, 2.2);
        dy = (1 - e) * size * 0.7;
        sx = sy = 0.7 + 0.3 * e;
      } else if (mode === 'slam') {
        const e = E.outExpo(p);
        sx = sy = 1 + (1 - e) * 2.2;
        a = U.clamp(li * 4);
      } else if (mode === 'drop') {
        const e = E.outBack(p, 1.6);
        dy = -(1 - e) * size * 1.2;
        rot = (1 - e) * (U.rnd(i, 3) - 0.5) * 0.8;
      } else if (mode === 'decode') {
        if (p < 1 && ch !== ' ') glyph = U.scramble('X', 0, lt + i * 0.37, i + 5);
        a = U.clamp(li * 6);
      }
      // 退场：逐字上飘消失
      if (o.out != null && lt > o.out) {
        const lo = U.clamp((lt - o.out - i * stagger * 0.6) / (o.outDur || 0.35));
        const e = E.inCubic(lo);
        a *= 1 - e;
        dy -= e * size * 0.6;
        dx += e * (U.rnd(i, 9) - 0.5) * 40;
      }
      if (a <= 0.001) { cx += w; continue; }
      ctx.save();
      ctx.globalAlpha = baseA * a;
      ctx.translate(cx + w / 2 + dx, y + dy);
      if (rot) ctx.rotate(rot);
      if (sx !== 1 || sy !== 1) ctx.scale(sx, sy);
      const col = mask[i] ? (o.hlColor || C.cyan) : (o.color || C.ink);
      if (o.chroma) {
        ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = U.rgba(C.magenta, 0.8);
        ctx.fillText(glyph, -w / 2 - o.chroma, 0);
        ctx.fillStyle = U.rgba(C.cyan, 0.8);
        ctx.fillText(glyph, -w / 2 + o.chroma, 0);
        ctx.globalCompositeOperation = 'source-over';
      }
      if (o.stroke) {
        ctx.strokeStyle = o.stroke;
        ctx.lineWidth = o.strokeWidth || 6;
        ctx.lineJoin = 'round';
        ctx.strokeText(glyph, -w / 2, 0);
      }
      ctx.fillStyle = col;
      ctx.fillText(glyph, -w / 2, 0);
      ctx.restore();
      cx += w;
    }
    ctx.restore();
    return m.total;
  };

  /** 文字宽度测量 */
  D.measure = function (ctx, str, font, spacing = 0) {
    return charWidths(ctx, str, font, spacing).total;
  };

  /**
   * 里程表式滚动数字（odometer）：value 为浮点数，个位按小数部分滚动，进位联动
   */
  D.odometer = function (ctx, value, digits, x, y, o = {}) {
    const size = o.size || 120;
    const font = U.font(o.weight || 900, size, o.fam || 'display');
    ctx.save();
    ctx.font = font;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';
    const dw = o.digitWidth || size * 0.78;
    const total = dw * digits;
    let sx = (o.align === 'left' ? x : o.align === 'right' ? x - total : x - total / 2);
    const v = Math.max(0, value);
    const frac = v % 1;
    for (let k = digits - 1; k >= 0; k--) {
      const pw = Math.pow(10, k);
      const d = Math.floor(v / pw) % 10;
      const lower = v % pw;
      const f = k === 0 ? frac : lower > pw - 1 ? frac : 0;
      const cx = sx + dw / 2;
      ctx.save();
      ctx.beginPath();
      ctx.rect(cx - dw / 2, y - size * 0.62, dw, size * 1.24);
      ctx.clip();
      ctx.fillStyle = o.color || C.ink;
      const leading = !o.keepZeros && Math.floor(v / pw) === 0 && k > 0;
      if (!leading) {
        ctx.fillText(String(d), cx, y - f * size * 1.1);
        ctx.fillText(String((d + 1) % 10), cx, y + (1 - f) * size * 1.1);
      } else {
        ctx.globalAlpha *= 0.18;
        ctx.fillText('0', cx, y);
      }
      ctx.restore();
      sx += dw;
    }
    ctx.restore();
    return total;
  };

  /* ======================= 卡片 / 图标 ======================= */

  /** 线性图标 */
  D.icon = function (ctx, kind, x, y, s, color = C.cyan, lw = 5) {
    ctx.save();
    ctx.translate(x, y);
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = lw;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    const r = s / 2;
    ctx.beginPath();
    if (kind === 'moon') {
      ctx.arc(0, 0, r * 0.8, Math.PI * 0.35, Math.PI * 1.65, false);
      ctx.arc(r * 0.38, -r * 0.1, r * 0.62, Math.PI * 1.45, Math.PI * 0.55, true);
      ctx.closePath();
      ctx.stroke();
    } else if (kind === 'inbox') {
      ctx.rect(-r * 0.8, -r * 0.55, r * 1.6, r * 1.1);
      ctx.moveTo(-r * 0.8, r * 0.05);
      ctx.lineTo(-r * 0.3, r * 0.05);
      ctx.lineTo(-r * 0.15, r * 0.3);
      ctx.lineTo(r * 0.15, r * 0.3);
      ctx.lineTo(r * 0.3, r * 0.05);
      ctx.lineTo(r * 0.8, r * 0.05);
      ctx.stroke();
    } else if (kind === 'timer') {
      ctx.arc(0, r * 0.1, r * 0.72, 0, U.TAU);
      ctx.moveTo(0, r * 0.1);
      ctx.lineTo(0, -r * 0.3);
      ctx.moveTo(0, r * 0.1);
      ctx.lineTo(r * 0.3, r * 0.3);
      ctx.moveTo(-r * 0.2, -r * 0.85);
      ctx.lineTo(r * 0.2, -r * 0.85);
      ctx.stroke();
    } else if (kind === 'bell') {
      ctx.moveTo(-r * 0.65, r * 0.4);
      ctx.quadraticCurveTo(-r * 0.6, -r * 0.7, 0, -r * 0.7);
      ctx.quadraticCurveTo(r * 0.6, -r * 0.7, r * 0.65, r * 0.4);
      ctx.closePath();
      ctx.moveTo(-r * 0.15, r * 0.6);
      ctx.lineTo(r * 0.15, r * 0.6);
      ctx.stroke();
    } else if (kind === 'check') {
      ctx.moveTo(-r * 0.6, 0);
      ctx.lineTo(-r * 0.15, r * 0.45);
      ctx.lineTo(r * 0.65, -r * 0.45);
      ctx.stroke();
    } else if (kind === 'warn') {
      ctx.moveTo(0, -r * 0.8);
      ctx.lineTo(r * 0.85, r * 0.7);
      ctx.lineTo(-r * 0.85, r * 0.7);
      ctx.closePath();
      ctx.moveTo(0, -r * 0.25);
      ctx.lineTo(0, r * 0.25);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, r * 0.47, lw * 0.6, 0, U.TAU);
      ctx.fill();
    } else if (kind === 'arrowDown') {
      ctx.moveTo(0, -r * 0.8);
      ctx.lineTo(0, r * 0.7);
      ctx.moveTo(-r * 0.5, r * 0.2);
      ctx.lineTo(0, r * 0.7);
      ctx.lineTo(r * 0.5, r * 0.2);
      ctx.stroke();
    } else if (kind === 'msg') {
      U.rrect(ctx, -r * 0.8, -r * 0.6, r * 1.6, r * 1.05, r * 0.25);
      ctx.moveTo(-r * 0.3, r * 0.45);
      ctx.lineTo(-r * 0.45, r * 0.8);
      ctx.lineTo(r * 0.05, r * 0.45);
      ctx.stroke();
    }
    ctx.restore();
  };

  /** 圆形真人头像 */
  D.avatar = function (ctx, id, x, y, r, o = {}) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, r, 0, U.TAU);
    ctx.clip();
    FX.photo.draw(ctx, id, x - r, y - r, r * 2, r * 2, { grade: o.grade || 'raw', zoom: o.zoom || 1 });
    ctx.restore();
    if (o.ring) {
      ctx.save();
      ctx.strokeStyle = o.ring;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(x, y, r + 3, 0, U.TAU);
      ctx.stroke();
      ctx.restore();
    }
  };

  /**
   * 手机通知卡片（毛玻璃风格）
   * o: { app, title, body, time, avatar (照片 id) | icon {kind,color}, accent, scale }
   */
  D.notif = function (ctx, x, y, w, o = {}) {
    const s = o.scale || 1;
    const h = 168;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(s, s);
    ctx.globalAlpha *= o.alpha == null ? 1 : o.alpha;
    // 卡片底
    U.rrect(ctx, 0, 0, w, h, 38);
    ctx.fillStyle = 'rgba(22,26,38,0.86)';
    ctx.fill();
    ctx.strokeStyle = U.rgba(o.accent || '#ffffff', o.accent ? 0.7 : 0.16);
    ctx.lineWidth = 2.5;
    ctx.stroke();
    // 顶部高光
    const hl = ctx.createLinearGradient(0, 0, 0, h);
    hl.addColorStop(0, 'rgba(255,255,255,0.10)');
    hl.addColorStop(0.5, 'rgba(255,255,255,0)');
    ctx.fillStyle = hl;
    U.rrect(ctx, 0, 0, w, h, 38);
    ctx.fill();
    // 头像 / 图标
    const ax = 92, ay = h / 2;
    if (o.avatar) D.avatar(ctx, o.avatar, ax, ay, 52);
    else {
      U.rrect(ctx, ax - 52, ay - 52, 104, 104, 26);
      ctx.fillStyle = (o.icon && o.icon.bg) || '#2a3142';
      ctx.fill();
      D.icon(ctx, (o.icon && o.icon.kind) || 'msg', ax, ay, 64, (o.icon && o.icon.color) || '#fff', 6);
    }
    // 文字
    ctx.textBaseline = 'alphabetic';
    ctx.textAlign = 'left';
    ctx.font = U.font(400, 26, 'cn');
    ctx.fillStyle = 'rgba(235,245,255,0.55)';
    ctx.fillText(o.app || '消息', 172, 54);
    ctx.textAlign = 'right';
    ctx.fillText(o.time || '现在', w - 34, 54);
    ctx.textAlign = 'left';
    ctx.font = U.font(700, 38, 'cn');
    ctx.fillStyle = '#ffffff';
    ctx.fillText(o.title || '', 172, 100);
    ctx.font = U.font(400, 32, 'cn');
    ctx.fillStyle = 'rgba(235,245,255,0.78)';
    let body = o.body || '';
    while (body.length > 1 && ctx.measureText(body).width > w - 210) body = body.slice(0, -2) + '…';
    ctx.fillText(body, 172, 142);
    ctx.restore();
    return h * s;
  };

  /** 来源角标 */
  D.source = function (ctx, str, y = 1305, a = 1) {
    if (a <= 0) return;
    D.text(ctx, '数据来源 · ' + str, 540, y, { font: U.font(400, 24, 'cn'), color: U.rgba(C.ink, 0.5 * a) });
  };

  /** 场景标题牌（小标签 + 斜切底板） */
  D.tag = function (ctx, str, x, y, color, a = 1, t = 0) {
    if (a <= 0) return;
    ctx.save();
    ctx.globalAlpha *= a;
    ctx.font = U.font(700, 28, 'mono');
    const w = ctx.measureText(str).width + 44;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + w * U.clamp(a * 1.2), y);
    ctx.lineTo(x + w * U.clamp(a * 1.2) - 16, y + 46);
    ctx.lineTo(x, y + 46);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#05060a';
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    ctx.fillText(U.scramble(str, U.clamp(a * 1.3), t, 3), x + 16, y + 24);
    ctx.restore();
  };
})();
