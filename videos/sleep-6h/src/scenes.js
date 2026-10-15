/* =============================================================================
 * 场景编排（7 个场景 / 80 秒）
 * -----------------------------------------------------------------------------
 * 签名：S.<id>(ctx, lt, t, P)  —— lt 为场景本地时间，P 为后期参数（场景直接修改）。
 * 梦境语言：液态扭曲（P.liquid）、水波涟漪（P.ripA/ripT/ripC）、重影（P.ghost）、
 *           失焦（P.defocus）、眼皮开合（P.blink）、散景光斑、宋体浮现文字。
 * 版式：y 226 时钟 HUD / y 278 章节 / 400–560 标题 / 600–1260 主视觉 / 1395–1490 字幕
 * ========================================================================== */
(function () {
  const U = FX.U, E = U.ease, D = FX.D, C = FX.CFG.C, EV = FX.CFG.EV, SRC = FX.CFG.SOURCES;
  const S = (FX.S = {});

  const full = (ctx, id, o) => FX.photo.draw(ctx, id, 0, 0, 1080, 1920, o);
  const drift = (t, amt = 0.01, seed = 1) => [U.fbm(t * 0.3, seed) * amt, U.fbm(t * 0.25, seed + 9) * amt];
  /** 梦境基础后期 */
  function dreamPost(P, o = {}) {
    P.liquid = o.liquid == null ? 0.3 : o.liquid;
    P.bloom = o.bloom == null ? 0.85 : o.bloom;
    P.thresh = o.thresh == null ? 0.6 : o.thresh;
    P.bloomTint = o.bloomTint || [0.85, 0.92, 1.18];
    P.scan = 0;
    P.barrel = 0.03;
    P.chroma = 0.06;
    P.vig = 0.9;
    P.grain = 0.035;
    P.sat = o.sat == null ? 1.0 : o.sat;
    P.contrast = 1.04;
  }
  /** 小号来源角标 */
  function source(ctx, str, y, a = 1) {
    if (a <= 0) return;
    D.text(ctx, str, 540, y, { font: U.font(400, 22, 'mono'), color: U.rgba(C.ink, 0.5 * a) });
  }
  /** 大号渐变数字 */
  function gradNum(ctx, str, x, y, size, c1, c2, a = 1, align = 'center') {
    ctx.save();
    ctx.globalAlpha *= a;
    ctx.font = U.font(900, size, 'display');
    ctx.textAlign = align;
    ctx.textBaseline = 'alphabetic';
    const g = ctx.createLinearGradient(0, y - size * 0.8, 0, y);
    g.addColorStop(0, c1);
    g.addColorStop(1, c2);
    ctx.fillStyle = g;
    ctx.fillText(str, x, y);
    ctx.restore();
  }
  /** 一个微眨眼（打瞌睡）：在 at 附近缓慢闭上再猛地睁开 */
  const nod = (t, at, depth = 0.7, close = 0.35, open = 0.12) => {
    if (t < at - close || t > at + open) return 0;
    return t < at ? depth * E.inQuad(U.inv(at - close, at, t)) : depth * (1 - E.outCubic(U.inv(at, at + open, t)));
  };

  /* ===================================================================
   * S1 钩子 0–6.4s：睁眼 → "每晚只睡 6 小时" → 涟漪 → "≈ 通宵一整晚"
   * ================================================================= */
  S.hook = function (ctx, lt, t, P) {
    const sw = EV.textSwap;
    const [dx, dy] = drift(t, 0.012, 3);
    full(ctx, 'sleeperMan', { grade: 'moon', zoom: 1.24 - 0.12 * E.outCubic(U.inv(0, 6.4, lt)), dx, dy });
    D.dim(ctx, 0.42);
    D.shade(ctx, 0.78, 0.3, 0.9);
    D.glow(ctx, 540, 820, 620, '#02030a', 0.55); // 文字后的暗晕
    D.bokeh(ctx, t, { n: 14, alpha: 0.13 });
    D.motes(ctx, t, { n: 50, alpha: 0.4 });

    // 第一句
    D.kinetic(ctx, '每晚只睡', 540, 610, lt - 0.3, { size: 84, fam: 'serif', weight: 600, mode: 'float', stagger: 0.09, out: sw - 0.5, outDur: 0.5 });
    const a6 = U.p(lt, 0.7, 1.4) * (1 - U.p(lt, sw - 0.2, sw + 0.15));
    if (a6 > 0) {
      const s = 1 + 0.04 * Math.sin(lt * 1.6);
      ctx.save();
      ctx.translate(500, 1000);
      ctx.scale(s, s);
      gradNum(ctx, '6', 0, 0, 440, '#ffffff', C.lav, a6);
      ctx.restore();
      D.text(ctx, '小时', 735, 980, { font: U.font(900, 96, 'serif'), color: C.pink, alpha: a6 });
    }
    // 第二句
    D.kinetic(ctx, '两周后，你的注意力', 540, 640, lt - sw - 0.15, { size: 62, fam: 'serif', weight: 600, mode: 'float', stagger: 0.05 });
    D.kinetic(ctx, '≈ 通宵一整晚', 540, 880, lt - sw - 0.55, { size: 128, fam: 'serif', weight: 900, mode: 'float', hl: ['通宵一整晚'], hlColor: C.pink, stagger: 0.08 });
    D.text(ctx, '注意力测试 · ' + SRC.study, 540, 980, { font: U.font(400, 24, 'mono'), color: U.rgba(C.ink, 0.55), alpha: U.p(lt, sw + 1.4, sw + 1.9) });

    dreamPost(P, { liquid: 0.55 });
    // 睁眼（全片从闭眼开始，结尾闭眼，形成循环）+ 换句时的一次眨眼
    P.blink = Math.max(0.85 * (1 - U.p(lt, 0, 0.75, E.outCubic)), nod(lt, sw, 0.6, 0.25, 0.18));
    P.ripA = 1.2 * U.hit(lt, sw, 1.2);
    P.ripT = Math.max(0, lt - sw);
    P.ripC = [0.5, 0.47];
    P.defocus = 0.55 * U.inOut(lt, sw - 0.3, sw + 0.4, 0.25, 0.3);
    P.ghost = 0.45 * U.hit(lt, sw, 0.5);
  };

  /* ===================================================================
   * S2 实验 6.4–19.2s：2003 · 宾大 · 4 个组 · DAY 01 → 14
   * ================================================================= */
  const GROUPS = [
    { name: '8 小时', sub: '每晚卧床', h: 8, col: C.mint },
    { name: '6 小时', sub: '每晚卧床', h: 6, col: C.pink, focus: true },
    { name: '4 小时', sub: '每晚卧床', h: 4, col: C.lav },
    { name: '通宵组', sub: '连续 3 晚不睡', h: 0, col: C.red },
  ];
  S.study = function (ctx, lt, t, P) {
    const [dx, dy] = drift(t, 0.01, 5);
    full(ctx, 'fogStreet', { grade: 'moon', zoom: 1.1 + lt * 0.01, dx, dy });
    D.dim(ctx, 0.35);
    D.shade(ctx, 0.75, 0.25, 0.9);
    D.bokeh(ctx, t, { n: 10, alpha: 0.1, colors: [C.amber, C.moon] });

    D.text(ctx, '2003 · UNIVERSITY OF PENNSYLVANIA', 540, 405, { font: U.font(400, 26, 'mono'), color: U.rgba(C.moon, 0.85), spacing: 3, alpha: U.p(lt, 0.1, 0.6) });
    D.kinetic(ctx, '一场 14 天的睡眠实验', 540, 505, lt - 0.3, { size: 76, fam: 'serif', weight: 900, mode: 'float', hl: ['14 天'], hlColor: C.pink, stagger: 0.06 });
    D.text(ctx, '48 名健康成年人 · 21–38 岁', 540, 568, { font: U.font(400, 32, 'cn'), color: U.rgba(C.ink, 0.75), alpha: U.p(lt, 3.8, 4.3) });

    // 实验面板
    const px = 80, py = 610, pw = 920, ph = 590;
    const pa = U.p(lt, 0.8, 1.4);
    D.frost(ctx, px, py + (1 - pa) * 40, pw, ph, { alpha: pa });
    const [d0, d1] = EV.days;
    const dayP = U.inv(d0 - 6.4, d1 - 6.4, lt);
    const day = 1 + Math.floor(13 * dayP + 1e-6);
    ctx.save();
    ctx.globalAlpha *= pa;
    D.text(ctx, '实验分组 · 每晚卧床时间', px + 40, py + 66, { font: U.font(700, 30, 'cn'), color: U.rgba(C.ink, 0.8), align: 'left' });
    const da = U.p(lt, d0 - 6.4 - 0.4, d0 - 6.4);
    D.text(ctx, 'DAY', px + pw - 170, py + 70, { font: U.font(400, 26, 'mono'), color: U.rgba(C.moon, 0.8), align: 'right', alpha: da });
    D.text(ctx, U.pad(day), px + pw - 40, py + 88, { font: U.font(900, 96, 'display'), color: C.ink, align: 'right', alpha: da });
    ctx.restore();

    const bx = 330, bw = 610;
    GROUPS.forEach((g, i) => {
      const t0 = EV.lanes[i] - 6.4;
      const a = U.p(lt, t0, t0 + 0.5) * pa;
      if (a <= 0) return;
      const y = 790 + i * 112;
      ctx.save();
      ctx.globalAlpha *= a;
      D.text(ctx, g.name, px + 40, y + 6, { font: U.font(900, 46, 'serif'), color: g.focus ? C.pink : C.ink, align: 'left' });
      D.text(ctx, g.sub, px + 40, y + 44, { font: U.font(400, 24, 'cn'), color: U.rgba(C.ink, 0.55), align: 'left' });
      // 卧床时间条（满格 = 9 小时）
      ctx.fillStyle = 'rgba(200,215,255,0.1)';
      U.rrect(ctx, bx, y - 26, bw, 30, 15);
      ctx.fill();
      const fp = U.p(lt, t0 + 0.1, t0 + 0.9, E.outCubic);
      const len = (bw * g.h) / 9 * fp;
      if (g.h > 0) {
        const gr = ctx.createLinearGradient(bx, 0, bx + len, 0);
        gr.addColorStop(0, U.rgba(g.col, 0.35));
        gr.addColorStop(1, g.col);
        ctx.fillStyle = gr;
        U.rrect(ctx, bx, y - 26, Math.max(30, len), 30, 15);
        ctx.fill();
        D.moonIcon(ctx, bx + len - 2, y - 11, 12, '#ffffff', fp);
      } else {
        D.text(ctx, '0 小时 × 3 晚', bx + 12, y - 3, { font: U.font(700, 28, 'cn'), color: C.red, align: 'left', alpha: fp });
      }
      // 14 个"夜晚"圆点：随 DAY 推进依次点亮（通宵组只有 3 晚）
      const nights = g.h > 0 ? 14 : 3;
      for (let k = 0; k < nights; k++) {
        const on = dayP > 0 && k < day;
        ctx.fillStyle = on ? U.rgba(g.col, 0.95) : 'rgba(200,215,255,0.18)';
        ctx.beginPath();
        ctx.arc(bx + 12 + k * 45, y + 26, on ? 7 : 5, 0, U.TAU);
        ctx.fill();
      }
      ctx.restore();
      if (g.focus) D.glow(ctx, px + 120, y - 10, 160, C.pink, 0.12 * a);
    });
    source(ctx, '研究：' + SRC.study, 1250, U.p(lt, 1.2, 1.8));

    dreamPost(P, { liquid: 0.22 });
    P.blink = nod(lt, 0, 0.6, 0.0, 0.5);
    // 每次新的一天：轻微的脉冲
    if (dayP > 0 && dayP < 1) {
      const ph = (13 * dayP) % 1;
      P.zoom += 0.006 * Math.exp(-ph * 6);
    }
    EV.lanes.forEach((tt) => { P.ripA = Math.max(P.ripA, 0.35 * U.hit(t, tt, 0.6)); });
    P.ripT = (() => { let best = 99; EV.lanes.forEach((tt) => { if (t >= tt) best = Math.min(best, t - tt); }); return best === 99 ? 0 : best; })();
    P.ripC = [0.5, 0.6];
  };

  /* ===================================================================
   * S3 反差 19.2–35.2s：失误曲线逐日上升 vs 主观困倦几乎持平
   * ================================================================= */
  const f8 = (d) => 0.08 + 0.012 * ((d - 1) / 13);
  const f6 = (d) => 0.08 + 0.5 * ((d - 1) / 13);
  const f4 = (d) => 0.08 + 0.76 * Math.pow((d - 1) / 13, 0.95);
  const feel = (d) => 0.08 + 0.22 * (1 - Math.exp(-(d - 1) / 1.6));
  S.curves = function (ctx, lt, t, P) {
    const [dx, dy] = drift(t, 0.01, 7);
    full(ctx, 'commuter', { grade: 'moon', zoom: 1.12 + lt * 0.006, dx, dy });
    D.dim(ctx, 0.5);
    D.shade(ctx, 0.75, 0.25, 0.9);
    D.bokeh(ctx, t, { n: 10, alpha: 0.1 });

    const fT = EV.feel[0] - 19.2;
    D.kinetic(ctx, '注意力失误次数', 540, 450, lt - 0.2, { size: 72, fam: 'serif', weight: 900, mode: 'float', out: fT - 0.6, outDur: 0.5 });
    D.kinetic(ctx, '你的大脑 vs 你的感觉', 540, 450, lt - fT, { size: 72, fam: 'serif', weight: 900, mode: 'float', hl: ['大脑', '感觉'], hlColor: C.pink, stagger: 0.06 });

    const px = 70, py = 520, pw = 940, ph = 720;
    D.frost(ctx, px, py, pw, ph, { alpha: U.p(lt, 0.2, 0.8) });
    const x0 = 160, x1 = 900, y0 = 600, y1 = 1150;
    const X = (d) => x0 + ((d - 1) / 13) * (x1 - x0);
    const Y = (v) => y1 - v * (y1 - y0);
    const ga = U.p(lt, 0.4, 1.0);
    ctx.save();
    ctx.globalAlpha *= ga;
    // 坐标轴
    ctx.strokeStyle = 'rgba(220,230,255,0.4)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x0, y0 - 20);
    ctx.lineTo(x0, y1);
    ctx.lineTo(x1 + 30, y1);
    ctx.stroke();
    [1, 7, 14].forEach((d) => D.text(ctx, `第${d}天`, X(d), y1 + 42, { font: U.font(400, 24, 'cn'), color: U.rgba(C.ink, 0.6) }));
    D.text(ctx, '失误 ↑', x0 + 10, y0 - 30, { font: U.font(700, 24, 'cn'), color: U.rgba(C.ink, 0.6), align: 'left' });
    // 参考线：通宵 1 晚 / 2 晚
    [[0.58, '通宵 1 晚'], [0.84, '通宵 2 晚']].forEach(([v, lab]) => {
      ctx.setLineDash([10, 12]);
      ctx.strokeStyle = 'rgba(255,140,170,0.55)';
      ctx.beginPath();
      ctx.moveTo(x0, Y(v));
      ctx.lineTo(x1 + 30, Y(v));
      ctx.stroke();
      ctx.setLineDash([]);
      D.text(ctx, lab, x0 + 14, Y(v) - 14, { font: U.font(700, 24, 'cn'), color: U.rgba(C.red, 0.85), align: 'left' });
    });
    ctx.restore();

    // 三条失误曲线逐日绘制
    const [c0, c1] = EV.curveDraw;
    const dNow = 1 + 13 * U.p(t, c0, c1, E.linear);
    const line = (fn, col, w, upto, dash) => {
      if (upto <= 1) return null;
      ctx.save();
      ctx.strokeStyle = col;
      ctx.lineWidth = w;
      ctx.lineJoin = 'round';
      if (dash) ctx.setLineDash(dash);
      ctx.beginPath();
      for (let d = 1; d <= upto + 1e-6; d += 0.25) (d === 1 ? ctx.moveTo : ctx.lineTo).call(ctx, X(d), Y(fn(d)));
      ctx.lineTo(X(upto), Y(fn(upto)));
      ctx.stroke();
      ctx.restore();
      return [X(upto), Y(fn(upto))];
    };
    const la = U.p(t, c0 - 0.4, c0);
    if (la > 0) {
      ctx.save();
      ctx.globalAlpha *= la;
      const h8 = line(f8, U.rgba(C.mint, 0.85), 4, dNow);
      const h4 = line(f4, C.lav, 5, dNow);
      const h6 = line(f6, C.pink, 8, dNow);
      [[h8, '8h', C.mint], [h4, '4h', C.lav], [h6, '6h', C.pink]].forEach(([h, lab, col]) => {
        if (!h) return;
        D.glow(ctx, h[0], h[1], 44, col, 0.5);
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(h[0], h[1], 7, 0, U.TAU);
        ctx.fill();
        D.text(ctx, lab, h[0] + 22, h[1] + 9, { font: U.font(700, 26, 'mono'), color: col, align: 'left' });
      });
      ctx.restore();
    }
    // 标注：≈ 通宵 1 晚 / 2 晚
    const tag = (txt, x, y, col, a) => {
      if (a <= 0) return;
      ctx.save();
      ctx.globalAlpha *= a;
      ctx.font = U.font(900, 34, 'serif');
      const w = ctx.measureText(txt).width + 40;
      U.rrect(ctx, x - w, y - 30, w, 52, 26);
      ctx.fillStyle = U.rgba(col, 0.92);
      ctx.fill();
      ctx.fillStyle = '#140818';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillText(txt, x - 20, y - 3);
      ctx.restore();
    };
    tag('≈ 通宵 1 晚', X(14) - 30, Y(f6(14)) + 52, C.pink, U.p(t, EV.hit6, EV.hit6 + 0.35, E.outBack));
    tag('≈ 通宵 2 晚', X(14) - 30, Y(f4(14)) - 40, C.lav, U.p(t, EV.hit4, EV.hit4 + 0.35, E.outBack));

    // 主观困倦曲线（6 小时组）：先涨一点就基本持平
    const [e0, e1] = EV.feel;
    const fNow = 1 + 13 * U.p(t, e0, e1, E.inOutSine);
    if (t > e0) {
      line(feel, 'rgba(255,255,255,0.95)', 5, fNow, [14, 10]);
      const ta = U.p(t, e1 - 0.2, e1 + 0.3);
      if (ta > 0) {
        ctx.save();
        ctx.globalAlpha *= ta;
        D.text(ctx, '你的感觉：只是有点困', X(8.5), Y(feel(8.5)) + 54, { font: U.font(900, 34, 'serif'), color: '#ffffff' });
        // 差距箭头
        const gx = X(14) + 46, ya = Y(feel(14)), yb = Y(f6(14));
        const pulse = 0.6 + 0.4 * Math.sin(t * 6);
        ctx.strokeStyle = U.rgba(C.pink, pulse);
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(gx, ya - 8);
        ctx.lineTo(gx, yb + 8);
        ctx.moveTo(gx - 10, yb + 22);
        ctx.lineTo(gx, yb + 8);
        ctx.lineTo(gx + 10, yb + 22);
        ctx.stroke();
        ctx.restore();
      }
    }
    D.text(ctx, '示意图 · 据 ' + SRC.study + '（每晚卧床 4 / 6 / 8 小时，连续 14 天）', 540, 1290, {
      font: U.font(400, 22, 'cn'), color: U.rgba(C.ink, 0.5), alpha: U.p(lt, 1, 1.5),
    });

    dreamPost(P, { liquid: 0.18 });
    P.ripA = 0.9 * U.hit(t, EV.hit6, 1.0) + 0.6 * U.hit(t, EV.hit4, 0.9);
    P.ripT = t >= EV.hit4 ? t - EV.hit4 : Math.max(0, t - EV.hit6);
    P.ripC = [X(14) / 1080, Y(f6(14)) / 1920];
    P.ghost = 0.22 * U.hit(t, e1, 0.8) + 0.08 * U.inOut(t, e0, e1 + 1.2, 0.4, 0.6);
    P.defocus = 0.12 * U.inOut(t, e0, e1 + 1.0, 0.4, 0.6);
    P.blink = nod(lt, 0, 0.5, 0, 0.45);
  };

  /* ===================================================================
   * S4 机制 35.2–51.2s：睡眠压力水杯 → 周末补觉 → 咖啡
   * ================================================================= */
  /** 水位模型：白天上涨，夜里只排掉一部分，残留逐日累积成"睡眠债" */
  function waterAt(t) {
    const W = EV.waterCycles;
    let residual = 0.12, level = 0.12, debt = 0, phase = 'day', k = -1;
    for (let i = 0; i < W.length; i++) {
      const s = W[i], peak = residual + 0.62, nextRes = 0.12 + 0.13 * (i + 1);
      if (t < s) break;
      k = i;
      if (t < s + 0.9) { level = U.lerp(residual, peak, E.inOutSine(U.inv(s, s + 0.9, t))); phase = 'day'; }
      else { level = U.lerp(peak, nextRes, E.inOutCubic(U.inv(s + 0.9, s + 1.5, t))); phase = 'night'; }
      debt = U.lerp(residual - 0.12, nextRes - 0.12, U.inv(s + 0.9, s + 1.5, t));
      residual = t >= s + 1.5 ? nextRes : residual;
    }
    return { level, debt, phase, day: k + 1 };
  }
  S.debt = function (ctx, lt, t, P) {
    const wkT = EV.weekend - 35.2, cfT = EV.coffee - 35.2;
    const [dx, dy] = drift(t, 0.01, 11);
    if (lt < wkT) {
      // A：睡眠压力
      full(ctx, 'yawn', { grade: 'dusk', zoom: 1.15 + lt * 0.01, dx, dy, alpha: 1 });
      D.dim(ctx, 0.5);
      D.shade(ctx, 0.75, 0.3, 0.92);
      D.bokeh(ctx, t, { n: 10, alpha: 0.1, colors: [C.lav, C.pink] });
      D.kinetic(ctx, '睡眠压力', 540, 440, lt - 0.2, { size: 92, fam: 'serif', weight: 900, mode: 'float', stagger: 0.1 });
      D.text(ctx, 'ADENOSINE · 腺苷在大脑里累积', 540, 505, { font: U.font(400, 26, 'mono'), color: U.rgba(C.lav, 0.9), alpha: U.p(lt, 0.6, 1.0) });
      const w = waterAt(t);
      const va = U.p(lt, 0.4, 0.9);
      D.vessel(ctx, 340, 640, 400, 540, w.level, w.debt, t, { alpha: va });
      // 太阳 / 月亮：白天涨，夜里排
      if (w.day > 0) {
        if (w.phase === 'day') D.sunIcon(ctx, 820, 700, 34, C.amber, va, t);
        else D.moonIcon(ctx, 820, 700, 30, C.moon, va);
        D.text(ctx, `第 ${w.day} 天`, 820, 780, { font: U.font(700, 30, 'cn'), color: U.rgba(C.ink, 0.85), alpha: va });
        D.text(ctx, w.phase === 'day' ? '醒着 → 压力上涨' : '只睡 6 小时 → 排不干净', 540, 1250, {
          font: U.font(900, 44, 'serif'), color: w.phase === 'day' ? C.amber : C.moon, alpha: va,
        });
      }
      if (w.debt > 0.05) {
        D.text(ctx, '睡眠债', 230, 1180 - 540 * w.debt * 0.5, { font: U.font(900, 34, 'serif'), color: C.pink, align: 'right', alpha: U.clamp(w.debt * 4) });
      }
      source(ctx, SRC.adenosine, 1310, U.p(lt, 1.2, 1.6));
      dreamPost(P, { liquid: 0.3 });
      // 每次"入夜"一个涟漪
      let rip = 0, rt = 0;
      EV.waterCycles.forEach((s) => { const h = U.hit(t, s + 0.9, 0.7); if (h > rip) { rip = h; rt = t - (s + 0.9); } });
      P.ripA = 0.5 * rip;
      P.ripT = rt;
      P.ripC = [0.5, 0.48];
      P.blink = nod(lt, 0, 0.6, 0, 0.5);
    } else if (lt < cfT) {
      // B：周末补觉
      const l2 = lt - wkT;
      full(ctx, 'sleeperWoman', { grade: 'moon', zoom: 1.2 - l2 * 0.02, dx, dy });
      D.dim(ctx, 0.35);
      D.shade(ctx, 0.75, 0.25, 0.92);
      D.bokeh(ctx, t, { n: 12, alpha: 0.12 });
      D.kinetic(ctx, '周末补觉', 540, 470, l2 - 0.15, { size: 96, fam: 'serif', weight: 900, mode: 'float', stagger: 0.09 });
      D.kinetic(ctx, '≠ 还清', 540, 600, l2 - 0.7, { size: 96, fam: 'serif', weight: 900, mode: 'float', color: C.pink, stagger: 0.09 });
      // 一周睡眠债柱状图
      const days = ['一', '二', '三', '四', '五', '六', '日'];
      const vals = [0.18, 0.34, 0.5, 0.66, 0.82, 0.58, 0.42];
      const bx0 = 150, bw = 92, gap = 26, base = 1180, hMax = 380;
      const fa = U.p(l2, 0.4, 0.9);
      D.frost(ctx, 100, 760, 880, 500, { alpha: fa });
      days.forEach((d, i) => {
        const gp = U.p(l2, 0.5 + i * 0.12, 1.1 + i * 0.12, E.outCubic);
        const v = vals[i] * gp;
        const x = bx0 + i * (bw + gap);
        const weekend = i >= 5;
        ctx.save();
        ctx.globalAlpha *= fa;
        const g = ctx.createLinearGradient(0, base - hMax * v, 0, base);
        g.addColorStop(0, weekend ? C.moon : C.pink);
        g.addColorStop(1, U.rgba(weekend ? C.moon : C.pink, 0.25));
        ctx.fillStyle = g;
        U.rrect(ctx, x, base - hMax * v, bw, hMax * v, 14);
        ctx.fill();
        D.text(ctx, '周' + d, x + bw / 2, base + 44, { font: U.font(700, 28, 'cn'), color: weekend ? C.moon : U.rgba(C.ink, 0.75) });
        ctx.restore();
      });
      D.text(ctx, '睡眠债', 140, 800, { font: U.font(700, 26, 'cn'), color: U.rgba(C.ink, 0.6), align: 'left', alpha: fa });
      D.text(ctx, '补觉后仍然没有归零', 940, 800, { font: U.font(700, 26, 'cn'), color: C.moon, align: 'right', alpha: U.p(l2, 1.6, 2.0) });
      source(ctx, SRC.weekend, 1310, U.p(l2, 0.8, 1.2));
      dreamPost(P, { liquid: 0.28 });
      P.blink = nod(l2, 0, 0.7, 0, 0.5);
      P.ripA = 0.6 * U.hit(l2, 0, 1);
      P.ripT = l2;
    } else {
      // C：咖啡只是挡住了信号
      const l3 = lt - cfT;
      full(ctx, 'coffee', { grade: 'moon', zoom: 1.08 + l3 * 0.03, dx, dy });
      D.dim(ctx, 0.55);
      D.shade(ctx, 0.75, 0.15, 0.92);
      D.kinetic(ctx, '咖啡', 540, 470, l3 - 0.1, { size: 104, fam: 'serif', weight: 900, mode: 'float' });
      D.kinetic(ctx, '只是挡住了"困"的信号', 540, 560, l3 - 0.5, { size: 54, fam: 'serif', weight: 600, mode: 'float', stagger: 0.04 });
      // 小水杯：水位仍高，被一块毛玻璃挡住
      const va = U.p(l3, 0.6, 1.1);
      D.vessel(ctx, 400, 760, 280, 400, 0.92, 0.6, t, { alpha: va });
      const mp = U.p(l3, 1.2, 1.8, E.outCubic);
      D.frost(ctx, 370, 740, 340 * mp, 230, { alpha: va * 0.95, fill: 'rgba(40,30,22,0.82)', stroke: 'rgba(255,200,150,0.5)', r: 24 });
      if (mp > 0.8) D.text(ctx, '咖啡因', 540, 870, { font: U.font(900, 40, 'serif'), color: C.amber, alpha: U.p(l3, 1.6, 2.0) });
      D.text(ctx, '压力还在 ↑', 540, 1250, { font: U.font(900, 50, 'serif'), color: C.pink, alpha: U.p(l3, 2.2, 2.6) });
      source(ctx, SRC.caffeine, 1310, U.p(l3, 1.0, 1.4));
      dreamPost(P, { liquid: 0.3 });
      P.ripA = 0.8 * U.hit(l3, 0.05, 1.2);
      P.ripT = Math.max(0, l3 - 0.05);
      P.ripC = [0.5, 0.42];
      P.blink = nod(l3, 0, 0.6, 0, 0.4);
    }
  };

  /* ===================================================================
   * S5 代价 51.2–64s：困倦快切 → 你察觉不到 → 金句
   * ================================================================= */
  const SHOTS = [
    { id: 'trainGroup', word: '反应变慢' },
    { id: 'earbuds', word: '记性变差' },
    { id: 'phoneNight', word: '动不动就走神' },
    { id: 'nightTrain', word: '最危险的是——' },
  ];
  S.cost = function (ctx, lt, t, P) {
    const cl = EV.climax - 51.2;
    dreamPost(P, { liquid: 0.6, sat: 0.95 });
    if (lt < cl) {
      const cuts = EV.cuts;
      let k = 0;
      for (let i = 0; i < cuts.length; i++) if (t >= cuts[i]) k = i;
      const st = t - cuts[k];
      if (k < 4) {
        const sh = SHOTS[k];
        const [dx, dy] = drift(t, 0.02, 13 + k);
        full(ctx, sh.id, { grade: 'dusk', zoom: 1.18 + st * 0.06, dx, dy });
        D.dim(ctx, 0.35);
        D.shade(ctx, 0.7, 0.2, 0.9);
        D.bokeh(ctx, t, { n: 8, alpha: 0.12, colors: [C.pink, C.lav] });
        D.kinetic(ctx, sh.word, 540, 900, st - 0.1, { size: k === 3 ? 92 : 120, fam: 'serif', weight: 900, mode: 'float', stagger: 0.07, color: k === 3 ? C.ink : '#ffffff' });
        // 打瞌睡：每个镜头末尾缓慢闭眼又猛地睁开
        P.blink = Math.max(nod(st, 1.45, 0.75, 0.6, 0.12), nod(st, 0, 0.5, 0, 0.18));
        P.defocus = 0.22 * (0.5 + 0.5 * Math.sin(st * 3.3 + k)) * U.p(st, 0.5, 0.9);
        P.ghost = (0.14 + 0.1 * Math.sin(st * 2.1 + k)) * U.p(st, 0.4, 0.8);
        P.zoom += 0.04 * U.hit(st, 0, 0.3);
      } else {
        // 57.6–60.8：你察觉不到自己变差了
        const [dx, dy] = drift(t, 0.012, 21);
        full(ctx, 'commuter', { grade: 'dusk', zoom: 1.25, dx, dy });
        D.dim(ctx, 0.45);
        D.shade(ctx, 0.75, 0.3, 0.92);
        D.kinetic(ctx, '你察觉不到', 540, 820, st - 0.1, { size: 120, fam: 'serif', weight: 900, mode: 'float', color: C.pink, stagger: 0.09 });
        D.kinetic(ctx, '自己变差了', 540, 980, st - 0.7, { size: 120, fam: 'serif', weight: 900, mode: 'float', stagger: 0.09 });
        P.defocus = 0.25 * U.p(st, 2.0, 3.2);
        P.ghost = 0.12 * U.p(st, 1.5, 2.5);
      }
    } else {
      // 金句：你不是适应了，你只是忘了清醒是什么感觉
      const l2 = lt - cl;
      D.night(ctx, t, { stars: 120 });
      full(ctx, 'moon', { grade: 'moon', zoom: 1.4 + l2 * 0.04, dy: 0.3, alpha: 0.55 });
      D.bokeh(ctx, t, { n: 16, alpha: 0.12 });
      D.motes(ctx, t, { n: 60, alpha: 0.5 });
      D.kinetic(ctx, '你不是适应了，', 540, 760, l2 - 0.15, { size: 76, fam: 'serif', weight: 600, mode: 'float', stagger: 0.07 });
      D.kinetic(ctx, '你只是忘了', 540, 900, l2 - 0.9, { size: 96, fam: 'serif', weight: 900, mode: 'float', stagger: 0.08 });
      D.kinetic(ctx, '清醒是什么感觉', 540, 1040, l2 - 1.5, { size: 96, fam: 'serif', weight: 900, mode: 'float', color: C.pink, stagger: 0.08 });
      P.liquid = 0.4;
      P.blink = 0.6 * U.p(l2, 2.6, 3.2, E.inQuad);
      P.ripA = 0.7 * U.hit(l2, 0, 1.2);
      P.ripT = l2;
      P.ripC = [0.5, 0.45];
    }
  };

  /* ===================================================================
   * S6 解法 64–76.8s：天亮了 → 至少 7 小时 → 三招
   * ================================================================= */
  const TIPS = [
    { photo: 'alarm', no: '01', title: '固定起床时间', sub: '周末也一样，生物钟最怕忽早忽晚' },
    { photo: 'phoneWarm', no: '02', title: '睡前一小时，放下手机', sub: '把手机放到伸手够不着的地方' },
    { photo: 'deskNap', no: '03', title: '午睡别超过 20 分钟', sub: '睡太久，醒来反而更昏沉' },
  ];
  S.fix = function (ctx, lt, t, P) {
    const [dx, dy] = drift(t, 0.01, 17);
    full(ctx, 'dawn', { grade: 'dawn', zoom: 1.3 - 0.1 * E.outCubic(U.inv(0, 12.8, lt)), dx, dy: dy + 0.22 });
    D.dim(ctx, 0.45, '#1a0a10');
    D.shade(ctx, 0.6, 0.2, 0.85, '20,8,14');
    D.glow(ctx, 540, 880, 560, '#12060c', 0.6);
    D.bokeh(ctx, t, { n: 14, alpha: 0.13, colors: [C.amber, C.pink] });
    D.motes(ctx, t, { n: 50, alpha: 0.5, color: '#ffe2b8' });

    const t1 = EV.tips[0] - 64;
    // 7+ 小时
    const ra = 1 - U.p(lt, t1 - 0.4, t1);
    if (ra > 0) {
      ctx.save();
      ctx.globalAlpha *= ra;
      D.kinetic(ctx, '成年人建议 · 每晚至少', 540, 560, lt - 0.3, { size: 54, fam: 'serif', weight: 600, mode: 'float', stagger: 0.04 });
      const na = U.p(lt, 0.7, 1.4);
      const s = 0.9 + 0.1 * E.outBack(U.p(lt, 0.7, 1.4, E.linear));
      ctx.save();
      ctx.translate(500, 930);
      ctx.scale(s, s);
      gradNum(ctx, '7+', 0, 0, 400, '#fff4dc', C.amber, na);
      ctx.restore();
      D.text(ctx, '小时', 830, 900, { font: U.font(900, 92, 'serif'), color: '#ffffff', alpha: na });
      D.text(ctx, SRC.rec, 540, 1030, { font: U.font(400, 24, 'cn'), color: U.rgba('#ffffff', 0.6), alpha: U.p(lt, 1.4, 1.9) });
      ctx.restore();
    }
    // 三张卡片
    TIPS.forEach((tp, i) => {
      const c0 = EV.tips[i] - 64, c1 = i < 2 ? EV.tips[i + 1] - 64 : 12.8;
      if (lt < c0 - 0.1 || lt > c1 + 0.4) return;
      const ain = U.p(lt, c0, c0 + 0.6, E.outCubic), aout = U.p(lt, c1 - 0.25, c1 + 0.2, E.inCubic);
      const a = ain * (1 - aout);
      const oy = (1 - ain) * 80 - aout * 60;
      const la = lt - c0;
      ctx.save();
      ctx.globalAlpha *= a;
      ctx.translate(0, oy);
      D.frost(ctx, 90, 470, 900, 820, { fill: 'rgba(30,14,22,0.55)', stroke: 'rgba(255,215,170,0.35)' });
      ctx.save();
      U.rrect(ctx, 120, 500, 840, 470, 26);
      ctx.clip();
      FX.photo.draw(ctx, tp.photo, 120, 500, 840, 470, { grade: 'dawn', zoom: 1.1 + la * 0.03 });
      ctx.fillStyle = 'rgba(30,12,18,0.28)';
      ctx.fillRect(120, 500, 840, 470);
      const pg = ctx.createLinearGradient(0, 760, 0, 970);
      pg.addColorStop(0, 'rgba(30,14,22,0)');
      pg.addColorStop(1, 'rgba(30,14,22,0.75)');
      ctx.fillStyle = pg;
      ctx.fillRect(120, 760, 840, 210);
      ctx.restore();
      D.text(ctx, tp.no, 150, 950, { font: U.font(900, 110, 'display'), color: C.amber, align: 'left' });
      D.kinetic(ctx, tp.title, 540, 1080, la - 0.25, { size: 64, fam: 'serif', weight: 900, mode: 'float', stagger: 0.05, maxWidth: 840 });
      D.kinetic(ctx, tp.sub, 540, 1170, la - 0.6, { size: 38, fam: 'cn', weight: 400, mode: 'float', stagger: 0.025, color: U.rgba('#ffffff', 0.85), maxWidth: 820 });
      ctx.restore();
    });

    dreamPost(P, { liquid: 0.12, bloomTint: [1.2, 1.0, 0.82], sat: 1.05, bloom: 0.7, thresh: 0.7 });
    P.tint = [1.06, 1.0, 0.94];
    P.blink = 0.6 * (1 - U.p(lt, 0, 0.9, E.outCubic));
    P.flash = 0.35 * U.hit(lt, 0.15, 0.6);
    P.flashColor = [1, 0.85, 0.65];
    EV.tips.forEach((tt) => { P.ripA = Math.max(P.ripA, 0.5 * U.hit(t, tt, 0.8)); });
    const last = EV.tips.filter((tt) => t >= tt).pop();
    P.ripT = last ? t - last : 0;
    P.ripC = [0.5, 0.4];
  };

  /* ===================================================================
   * S7 互动 76.8–80s：你昨晚睡了几个小时？（结尾闭眼，接回开头）
   * ================================================================= */
  S.cta = function (ctx, lt, t, P) {
    const [dx, dy] = drift(t, 0.01, 19);
    D.night(ctx, t, { stars: 120 });
    // 月亮放在标题上方的小窗里（不压文字）
    ctx.save();
    ctx.globalCompositeOperation = 'screen'; // 黑底透明，只留月光
    FX.photo.draw(ctx, 'moon', 290, 170, 500, 500, { grade: 'moon', zoom: 1.6, dx, dy, alpha: 0.85 });
    ctx.restore();
    D.bokeh(ctx, t, { n: 14, alpha: 0.12 });
    D.motes(ctx, t, { n: 50, alpha: 0.45 });
    D.kinetic(ctx, '你昨晚', 540, 640, lt - 0.1, { size: 90, fam: 'serif', weight: 900, mode: 'float' });
    D.kinetic(ctx, '睡了几个小时？', 540, 790, lt - 0.4, { size: 110, fam: 'serif', weight: 900, mode: 'float', hl: ['几个小时'], hlColor: C.pink, stagger: 0.06 });
    const ba = U.p(lt, 0.8, 1.2, E.outBack);
    if (ba > 0) {
      ctx.save();
      ctx.translate(540, 950);
      ctx.scale(ba, ba);
      D.frost(ctx, -230, -80, 460, 150, { r: 40 });
      const n = 3 + Math.floor(U.rnd(Math.floor(t * 6), 77) * 7);
      D.text(ctx, String(n), -50, 34, { font: U.font(900, 104, 'display'), color: '#ffffff' });
      if (Math.floor(t * 2.5) % 2 === 0) { ctx.fillStyle = C.pink; ctx.fillRect(10, -46, 5, 84); }
      D.text(ctx, '小时', 110, 26, { font: U.font(900, 60, 'serif'), color: C.pink });
      ctx.restore();
    }
    D.kinetic(ctx, '评论区报个数', 520, 1130, lt - 1.2, { size: 64, fam: 'serif', weight: 900, mode: 'float', hl: ['报个数'], hlColor: C.moon });
    const aa = U.p(lt, 1.4, 1.7);
    if (aa > 0) {
      ctx.save();
      ctx.globalAlpha *= aa;
      ctx.translate(840 + Math.sin(lt * 8) * 12, 1108);
      ctx.rotate(-Math.PI / 2);
      D.icon(ctx, 'arrowDown', 0, 0, 64, C.moon, 7);
      ctx.restore();
    }
    // 结尾：闭眼并淡入开场画面，形成循环
    const lp = U.p(lt, 2.8, 3.2, E.inQuad);
    if (lp > 0) {
      ctx.save();
      ctx.globalAlpha *= lp;
      S.hook(ctx, 0, 0, FX.defaultPost());
      ctx.restore();
    }
    dreamPost(P, { liquid: U.lerp(0.25, 0.55, U.p(lt, 2.4, 3.2)) });
    P.blink = Math.max(nod(lt, 0, 0.6, 0, 0.5), 0.85 * U.p(lt, 2.4, 3.2, E.inOutSine));
  };
})();
