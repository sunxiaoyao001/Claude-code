/* =============================================================================
 * 场景编排（11 个场景 / 80 秒）
 * -----------------------------------------------------------------------------
 * 每个场景函数签名： S.<id>(ctx, lt, t, P)
 *   ctx  2D 画布（坐标系 1080×1920）
 *   lt   场景本地时间（秒，从 0 开始）
 *   t    全片时间（秒）
 *   P    后期参数（镜头缩放、震屏、色散、故障、闪白……），场景直接修改
 *
 * 版式分区（避开抖音 UI 遮挡）：
 *   y 222        顶部状态栏（全局 HUD）
 *   y 262–292    章节条（全局）
 *   y 400–560    标题区
 *   y 600–1300   主视觉区
 *   y 1340       数据来源角标
 *   y 1395–1490  字幕（全局）
 * ========================================================================== */
(function () {
  const U = FX.U, E = U.ease, D = FX.D, C = FX.CFG.C, EV = FX.CFG.EV;
  const S = (FX.S = {});
  const H1 = 430, H2 = 550; // 标题基线

  /* ---------------- 公共辅助 ---------------- */
  const full = (ctx, id, o) => FX.photo.draw(ctx, id, 0, 0, 1080, 1920, o);

  /** 上下渐变压暗（保证文字可读） */
  function shade(ctx, top = 0.7, mid = 0.25, bottom = 0.8) {
    const g = ctx.createLinearGradient(0, 0, 0, 1920);
    g.addColorStop(0, `rgba(4,5,10,${top})`);
    g.addColorStop(0.32, `rgba(4,5,10,${mid})`);
    g.addColorStop(0.62, `rgba(4,5,10,${mid})`);
    g.addColorStop(1, `rgba(4,5,10,${bottom})`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 1080, 1920);
  }
  /** 水平压暗带：照片中段放大字时使用 */
  function band(ctx, y0, y1, a = 0.6) {
    const g = ctx.createLinearGradient(0, y0, 0, y1);
    g.addColorStop(0, 'rgba(4,5,10,0)');
    g.addColorStop(0.25, `rgba(4,5,10,${a})`);
    g.addColorStop(0.75, `rgba(4,5,10,${a})`);
    g.addColorStop(1, 'rgba(4,5,10,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, y0, 1080, y1 - y0);
  }
  function dim(ctx, a, color = '#04050a') {
    if (a <= 0) return;
    ctx.fillStyle = U.rgba(color, a);
    ctx.fillRect(0, 0, 1080, 1920);
  }
  /** 根据照片清单里的人脸框求屏幕上的脸部中心和半径 */
  function faceOf(id, map) {
    const f = FX.photo.face(id);
    if (!f) {
      const m = FX.photo.meta(id).focus;
      const [x, y] = map(m.x, m.y);
      return { x, y, r: 140 };
    }
    const [x0, y0] = map(f.x, f.y), [x1, y1] = map(f.x + f.w, f.y + f.h);
    return { x: (x0 + x1) / 2, y: (y0 + y1) / 2, r: U.clamp(Math.max(x1 - x0, y1 - y0) * 0.5, 90, 160) };
  }
  /** 手持感漂移 */
  const drift = (t, amt = 0.012, seed = 1) => [U.fbm(t * 0.35, seed) * amt, U.fbm(t * 0.3, seed + 9) * amt];
  /** 冲击震屏（写入 P） */
  function shake(P, t, k, freq = 38) {
    if (k <= 0.0005) return;
    P.shakeX += U.noise(t * freq, 21) * 0.025 * k;
    P.shakeY += U.noise(t * freq, 37) * 0.025 * k;
    P.rot += U.noise(t * freq * 0.7, 51) * 0.02 * k;
  }

  /** 通知卡片素材：真人头像 + 生活化的内容 */
  const NOTIFS = [
    { app: '工作群', title: '李经理 @你', body: '在吗？方便看下这个文件', avatar: 'avBoss', time: '现在' },
    { app: '消息', title: '妈妈', body: '吃饭了没？降温了记得多穿点', avatar: 'avMom', time: '1 分钟前' },
    { app: '外卖', title: '骑手已取餐', body: '预计 12:30 送达，请保持电话畅通', icon: { kind: 'bell', bg: '#f59e0b' }, time: '现在' },
    { app: '工作群', title: '周雨晴', body: '下午的会提前到两点，别忘了', avatar: 'avColleague', time: '2 分钟前' },
    { app: '消息', title: '阿杰', body: '晚上开黑吗？就差你了', avatar: 'avFriend', time: '现在' },
    { app: '邮件', title: '【紧急】季度报告修改意见', body: '请在今天下班前回复', icon: { kind: 'msg', bg: '#e11d48' }, time: '3 分钟前' },
    { app: '快递', title: '您的包裹已到驿站', body: '取件码 8-2-3015', icon: { kind: 'inbox', bg: '#10b981' }, time: '现在' },
    { app: '日历', title: '15:00 周会', body: '15 分钟后开始', icon: { kind: 'timer', bg: '#7c3aed' }, time: '现在' },
    { app: '短视频', title: '你关注的人更新了', body: '点击查看 3 条新作品', icon: { kind: 'bell', bg: '#ff2e88' }, time: '现在' },
  ];

  /* ===================================================================
   * S01 钩子 0–6s：真人眼睛特写 → "47 秒" → 通知风暴
   * ================================================================= */
  S.hook = function (ctx, lt, t, P) {
    const st = EV.storm, out = EV.stormOut;
    // 背景：眼睛特写，先缓慢拉远，结尾猛推
    const [dx, dy] = drift(t, 0.01, 3);
    const z = 1.45 - 0.2 * E.outCubic(U.inv(0, 3, lt)) + 0.9 * U.p(lt, out, 6, E.inExpo);
    const map = full(ctx, 'eye', { grade: 'cyber', zoom: z, dx, dy: dy - 0.12 });
    D.halftone(ctx, 0, 0, 1080, 1920, 0.22);
    shade(ctx, 0.75, 0.15, 0.85);
    // 风暴阶段压暗背景
    dim(ctx, 0.55 * U.p(lt, st.start, st.start + 0.6));

    // 眼睛上的追踪准星
    const fm = FX.photo.meta('eye').focus;
    const [ex, ey] = map(fm.x, fm.y);
    const rA = 1 - U.p(lt, 2.8, 3.05);
    D.reticle(ctx, ex, ey, 120, t, U.p(lt, 0.15, 1.0), { color: C.cyan, label: 'TARGET // ATTENTION', sub: '注意力', alpha: rA });

    // 标题标签
    const a1 = 1 - U.p(lt, 2.85, 3.0);
    if (a1 > 0) {
      ctx.save();
      ctx.globalAlpha *= a1;
      D.text(ctx, U.scramble('AVG. ATTENTION SPAN ON ONE SCREEN', U.p(lt, 0.1, 0.9, E.linear), t, 2), 540, 372, {
        font: U.font(700, 28, 'mono'), color: C.cyan, spacing: 2,
      });
      D.kinetic(ctx, '单屏平均专注时长', 540, 450, lt - 0.25, { size: 62, weight: 700, stagger: 0.04 });
      // 巨型数字 47 + 秒（t=0 时处于乱码状态，便于和结尾无缝循环）
      const p = U.p(lt, 0.0, 0.85, E.linear);
      const num = U.scramble('47', p, t, 4);
      const pulse = U.beatPulse(t, 0.1) * 0.03;
      ctx.save();
      ctx.translate(500, 760);
      ctx.scale(1 + pulse, 1 + pulse);
      D.chromaText(ctx, num, 0, 0, 22 * (1 - p) + 5, { font: U.font(900, 400, 'display'), baseline: 'middle', color: C.ink });
      ctx.restore();
      D.text(ctx, '秒', 820, 860, { font: U.font(900, 120), color: C.magenta });
      // 秒表环：47/60
      D.ring(ctx, 540, 760, 330, (47 / 60) * U.p(lt, 0.3, 1.8, E.inOutCubic), {
        color: C.magenta, width: 8, ticks: 60, rot: -Math.PI / 2, trackAlpha: 0.12, tickAlpha: 0.35,
      });
      // 侧边数据流
      D.dataColumn(ctx, 70, 1110, 9, t, 31, { alpha: 0.35, size: 20 });
      D.dataColumn(ctx, 1010, 1110, 9, t, 32, { alpha: 0.35, size: 20, align: 'right' });
      ctx.restore();
    }
    // 打断前的故障闪
    P.glitch += 0.6 * (1 - U.p(lt, 0, 0.8)) + 0.9 * U.hit(lt, st.start, 0.18);
    P.chroma += 0.5 * (1 - U.p(lt, 0, 0.8));
    P.flash += 0.35 * U.hit(lt, st.start, 0.1);
    P.flashColor = [1, 0.25, 0.55];

    // 通知风暴：14 张真实感通知卡片从景深里飞来
    if (lt >= st.start) {
      const cards = [];
      for (let i = 0; i < st.n; i++) {
        const spawn = st.start + i * st.step;
        if (lt < spawn) continue;
        const wx = (U.rnd(i, 1) - 0.5) * 820;
        const wy = (U.rnd(i, 2) - 0.5) * 1250 - 40;
        const zf = 1.05 + U.rnd(i, 3) * 1.3;
        let z = U.lerp(7, zf, U.p(lt, spawn, spawn + 0.42, E.outCubic));
        z *= 1 - 0.95 * U.p(lt, out, 5.95, E.inExpo);
        cards.push({ i, z, wx, wy, rot: (U.rnd(i, 4) - 0.5) * 0.3 * (z / 3) });
      }
      cards.sort((a, b) => b.z - a.z);
      for (const c of cards) {
        const s = 1.3 / c.z;
        const x = 540 + c.wx / c.z, y = 880 + c.wy / c.z;
        const a = U.clamp((7 - c.z) / 1.6) * U.clamp(c.z / 0.3);
        if (a <= 0.01) continue;
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(c.rot);
        ctx.scale(s, s);
        D.notif(ctx, -430, -84, 860, Object.assign({ alpha: a, accent: c.i === 0 ? C.magenta : null }, NOTIFS[c.i % NOTIFS.length]));
        ctx.restore();
      }
      // 打断计数
      const n = Math.min(st.n, Math.floor((lt - st.start) / st.step) + 1);
      const ca = 1 - U.p(lt, out, out + 0.3);
      D.text(ctx, `INTERRUPT ×${U.pad(n)}`, 540, 380, { font: U.font(900, 64, 'display'), color: C.magenta, alpha: ca });
      // 每张卡片到达时轻微震屏 + 色散
      const k = U.hit(lt, st.start + Math.floor((lt - st.start) / st.step) * st.step, 0.08);
      shake(P, t, 0.5 * k * ca);
      P.chroma += 0.25 * k;
    }
    // 冲出镜头：径向模糊 + 闪白
    const fo = U.p(lt, out, 6, E.inExpo);
    P.zoomBlur += 0.35 * fo;
    P.flash += 0.9 * U.p(lt, 5.85, 6, E.inQuad);
    if (lt > 5.85) P.flashColor = [1, 1, 1];
  };

  /* ===================================================================
   * S02 片头 6–10s："23 MIN" 爆破登场
   * ================================================================= */
  S.title = function (ctx, lt, t, P) {
    D.bg(ctx, t, { tint: C.magenta, grid: 0.1, inner: '#140a24' });
    D.floorGrid(ctx, t, { horizon: 1260, color: C.magenta, alpha: 0.55, speed: 1.4 });
    // 地平线后的"太阳"环
    D.glow(ctx, 540, 1260, 520, C.magenta, 0.28);

    const cx = 540, cy = 760;
    const bp = U.beatPulse(t, 0.12);
    const outP = U.p(lt, 3.5, 4, E.inExpo);
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(1 + outP * 0.6 + bp * 0.015, 1 + outP * 0.6 + bp * 0.015);
    ctx.translate(-cx, -cy);
    // 多层旋转 HUD 环
    const rp = U.p(lt, 0.05, 1.6, E.outCubic);
    D.ring(ctx, cx, cy, 320, rp, { color: C.cyan, width: 6, ticks: 72, rot: t * 0.25, trackAlpha: 0.1 });
    ctx.save();
    ctx.strokeStyle = U.rgba(C.magenta, 0.6);
    ctx.lineWidth = 3;
    ctx.setLineDash([4, 18]);
    ctx.lineDashOffset = t * 60;
    ctx.beginPath();
    ctx.arc(cx, cy, 380 * U.p(lt, 0, 0.6, E.outBack), 0, U.TAU);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.lineWidth = 14;
    ctx.strokeStyle = U.rgba(C.cyan, 0.85);
    ctx.beginPath();
    ctx.arc(cx, cy, 262, -t * 0.9, -t * 0.9 + 1.2 * rp);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx, cy, 262, -t * 0.9 + Math.PI, -t * 0.9 + Math.PI + 0.6 * rp);
    ctx.stroke();
    ctx.restore();

    // "23" 从 3 倍大砸下来
    const sp = U.p(lt, 0, 0.28, E.outExpo);
    const s = U.lerp(3.2, 1, sp);
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(s, s);
    D.chromaText(ctx, '23', 0, 8, 30 * (1 - sp) + 6 + bp * 6, {
      font: U.font(900, 430, 'display'), baseline: 'middle', alpha: U.clamp(lt * 8),
    });
    ctx.restore();
    ctx.restore();

    D.text(ctx, U.scramble('M I N U T E S', U.p(lt, 0.35, 1.0, E.linear), t, 9), cx, 1065, {
      font: U.font(700, 50, 'display'), color: C.cyan, alpha: U.clamp((lt - 0.3) * 4) * (1 - outP),
    });
    D.text(ctx, U.scramble('CASE FILE #023 // 注意力事故报告', U.p(lt, 0.2, 0.9, E.linear), t, 8), cx, H1 - 20, {
      font: U.font(700, 30, 'mono'), color: U.rgba(C.ink, 0.75), alpha: 1 - outP,
    });
    const ta = 1 - outP;
    if (ta > 0) {
      ctx.save();
      ctx.globalAlpha *= ta;
      D.kinetic(ctx, '一次分心的真实代价', cx, 1205, lt - 0.55, { size: 96, hl: ['真实代价'], hlColor: C.magenta, stagger: 0.05 });
      // 下划线扫过
      const up = U.p(lt, 1.0, 1.6, E.inOutCubic);
      ctx.fillStyle = C.magenta;
      ctx.fillRect(160, 1240, 760 * up, 6);
      ctx.fillStyle = '#fff';
      ctx.fillRect(160 + 760 * up - 40, 1240, 40 * (up > 0 && up < 1 ? 1 : 0), 6);
      ctx.restore();
    }
    // 撞击火花
    D.sparks(ctx, cx, cy, lt, { n: 140, speed: 2200, life: 1.3, seed: 6, color: C.cyan, color2: C.magenta, gravity: 900 });

    // 后期：撞击闪白 + 径向模糊 + 震屏；结尾马赛克转场
    P.flash += 0.85 * U.hit(lt, 0, 0.12);
    P.zoomBlur += 0.45 * U.hit(lt, 0, 0.25);
    shake(P, t, U.hit(lt, 0, 0.35) * 1.4);
    P.chroma += 0.35 * U.hit(lt, 0, 0.4) + bp * 0.12;
    P.bloom += 0.3;
    P.pixel += 46 * U.p(lt, 3.5, 4, E.inQuad);
    P.glitch += 0.4 * U.p(lt, 3.55, 4);
  };

  /* ===================================================================
   * S03 现象 10–20s：注意力在缩水（2004 → 2012 → 近年）
   * ================================================================= */
  S.decline = function (ctx, lt, t, P) {
    const [dx, dy] = drift(t, 0.015, 5);
    full(ctx, 'phoneDark', { grade: 'cyber', zoom: 1.12 + lt * 0.014, dx, dy });
    D.halftone(ctx, 0, 0, 1080, 1920, 0.3);
    dim(ctx, 0.5);
    shade(ctx, 0.6, 0.15, 0.85);

    D.kinetic(ctx, '你的注意力', 540, H1, lt - 0.2, { size: 92 });
    D.kinetic(ctx, '正在缩水', 540, H2, lt - 0.55, { size: 120, hl: ['缩水'], hlColor: C.magenta, chroma: 4, mode: 'slam', stagger: 0.07 });

    // 数据面板
    const px = 80, py = 610, pw = 920, ph = 560;
    const pa = U.p(lt, 0.4, 0.9);
    ctx.save();
    ctx.globalAlpha *= pa;
    U.rrect(ctx, px, py, pw, ph * U.p(lt, 0.4, 0.9, E.outExpo), 22);
    ctx.fillStyle = 'rgba(5,9,20,0.78)';
    ctx.fill();
    ctx.strokeStyle = U.rgba(C.cyan, 0.45);
    ctx.lineWidth = 2;
    ctx.stroke();
    D.text(ctx, 'ATTENTION SPAN · 单屏平均专注时长', px + 34, py + 56, { font: U.font(700, 26, 'mono'), color: C.cyan, align: 'left' });
    D.text(ctx, '秒', px + pw - 34, py + 56, { font: U.font(700, 26, 'cn'), color: U.rgba(C.ink, 0.5), align: 'right' });
    ctx.restore();

    const rows = [
      { year: '2004', v: 150, label: '2分30秒' },
      { year: '2012', v: 75, label: '75秒', loss: '-50%' },
      { year: '近年', v: 47, label: '47秒', loss: '-69%', hot: true },
    ];
    const bx = px + 230, bw = 640, maxV = 150;
    rows.forEach((r, i) => {
      const t0 = EV.declineBars[i] - 10;
      const y = py + 150 + i * 140;
      const a = U.p(lt, t0, t0 + 0.3);
      if (a <= 0) return;
      ctx.save();
      ctx.globalAlpha *= pa * a;
      const col = r.hot ? C.magenta : C.cyan;
      D.text(ctx, r.year, px + 40, y + 22, { font: U.font(900, 54, r.year === '近年' ? 'cn' : 'display'), color: r.hot ? C.magenta : C.ink, align: 'left' });
      // 2004 基准的虚线轮廓
      ctx.strokeStyle = U.rgba(C.ink, 0.25);
      ctx.setLineDash([8, 8]);
      ctx.lineWidth = 2;
      ctx.strokeRect(bx, y - 26, bw, 52);
      ctx.setLineDash([]);
      // 数据条生长
      const gp = U.p(lt, t0 + 0.1, t0 + 0.9, E.outExpo);
      const len = (bw * r.v) / maxV;
      const cur = len * gp;
      const gr = ctx.createLinearGradient(bx, 0, bx + len, 0);
      gr.addColorStop(0, U.rgba(col, 0.35));
      gr.addColorStop(1, col);
      ctx.fillStyle = gr;
      ctx.fillRect(bx, y - 26, cur, 52);
      ctx.fillStyle = '#fff';
      ctx.fillRect(bx + cur - 4, y - 30, 4, 60); // 发光前沿
      // 流失部分：红色斜纹
      if (r.loss) {
        const lp = U.p(lt, t0 + 0.8, t0 + 1.2);
        if (lp > 0) {
          D.hazard(ctx, bx + len, y - 26, (bw - len) * lp, 52, t, C.red, 0.55 * lp);
          D.text(ctx, r.loss, bx + len + (bw - len) / 2, y + 16, { font: U.font(900, 44, 'display'), color: '#fff', alpha: lp });
        }
      }
      // 数值滚动
      const val = Math.round(r.v * gp);
      const lab = gp >= 1 ? r.label : `${val}秒`;
      D.text(ctx, lab, bx + Math.max(cur, 140) - 14, y - 40, {
        font: U.font(900, r.hot ? 48 : 38, 'cn'), color: r.hot ? C.magenta : C.ink, align: 'right',
      });
      ctx.restore();
      if (r.hot) {
        P.chroma += 0.4 * U.hit(lt, t0 + 0.9, 0.3);
        P.flash += 0.15 * U.hit(lt, t0 + 0.9, 0.1);
        shake(P, t, U.hit(lt, t0 + 0.9, 0.25) * 0.6);
      }
    });

    // 研究者档案卡
    const rt = EV.researcher - 10;
    const ra = U.p(lt, rt, rt + 0.5, E.outExpo);
    if (ra > 0) {
      const cy = 1255, cyy = cy + (1 - ra) * 120;
      ctx.save();
      ctx.globalAlpha *= ra;
      U.rrect(ctx, 80, cyy - 62, 920, 124, 62);
      ctx.fillStyle = 'rgba(8,14,28,0.88)';
      ctx.fill();
      ctx.strokeStyle = U.rgba(C.cyan, 0.6);
      ctx.lineWidth = 2;
      ctx.stroke();
      if (FX.photo.has('researcher')) D.avatar(ctx, 'researcher', 142, cyy, 48, { grade: 'cyber', ring: C.cyan });
      else {
        ctx.fillStyle = U.rgba(C.cyan, 0.15);
        ctx.beginPath();
        ctx.arc(142, cyy, 48, 0, U.TAU);
        ctx.fill();
        D.text(ctx, 'GM', 142, cyy + 14, { font: U.font(900, 36, 'display'), color: C.cyan });
      }
      D.text(ctx, U.scramble('Gloria Mark', U.p(lt, rt + 0.1, rt + 0.7, E.linear), t, 12), 214, cyy - 8, {
        font: U.font(900, 40, 'display'), align: 'left', color: '#fff',
      });
      D.text(ctx, '加州大学尔湾分校 · 信息学教授 ·《Attention Span》', 214, cyy + 36, {
        font: U.font(400, 28, 'cn'), align: 'left', color: U.rgba(C.ink, 0.7),
      });
      D.scanBeam(ctx, cyy - 62 + 124 * U.p(lt, rt, rt + 0.6, E.linear), C.cyan, 1 - U.p(lt, rt + 0.5, rt + 0.7), 80, 920, 60);
      ctx.restore();
    }

    // 入场马赛克收回；出场扫描光束
    P.pixel += 46 * (1 - U.p(lt, 0, 0.45, E.outQuad));
    const ob = U.p(lt, 9.35, 10, E.inCubic);
    if (ob > 0) {
      const y = 1920 * ob;
      ctx.fillStyle = C.bg;
      ctx.fillRect(0, 0, 1080, y);
      D.scanBeam(ctx, y, C.cyan, 1, 0, 1080, 220);
    }
    P.glitch += 0.25 * U.hit(lt, 9.4, 0.2);
  };

  /* ===================================================================
   * S04 机制 20–30s：专注是一条爬坡曲线（真人深度工作）
   * ================================================================= */
  S.climb = function (ctx, lt, t, P) {
    const [dx, dy] = drift(t, 0.01, 7);
    const z = 1.04 + 0.2 * E.inOutSine(U.inv(0, 10, lt)) + 0.05 * U.p(lt, 9.4, 10, E.inCubic);
    const map = full(ctx, 'deepWork', { grade: 'cyber', zoom: z, dx, dy });
    D.halftone(ctx, 0, 0, 1080, 1920, 0.18);
    shade(ctx, 0.75, 0.1, 0.9);

    // 心跳：红色暗角脉冲
    let hb = 0;
    for (const h of EV.heartbeats) hb = Math.max(hb, U.hit(t, h, 0.18));
    if (hb > 0) {
      const g = ctx.createRadialGradient(540, 960, 300, 540, 960, 1200);
      g.addColorStop(0, 'rgba(255,48,67,0)');
      g.addColorStop(1, `rgba(255,48,67,${0.45 * hb})`);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, 1080, 1920);
      P.zoom += 0.025 * hb;
      P.chroma += 0.25 * hb;
    }
    // 手机亮屏的光（右下角闪烁）
    const pl = U.p(lt, 8.3, 8.6) * (0.65 + 0.35 * Math.sin(lt * 23) * Math.sin(lt * 7));
    if (pl > 0) D.glow(ctx, 980, 1650, 700, '#bfefff', 0.35 * pl);

    // 人脸追踪
    const f = faceOf('deepWork', map);
    D.reticle(ctx, f.x, f.y, f.r, t, U.p(lt, 0.4, 1.3), {
      color: C.cyan, label: 'SUBJECT 01 // DEEP WORK', sub: '深度工作中', below: true, alpha: 1 - U.p(lt, 9.0, 9.4),
    });

    // 标题：两句接力
    D.kinetic(ctx, '专注不是开关', 540, 395, lt - 0.3, { size: 92, out: 2.4 });
    D.kinetic(ctx, '是一条爬坡曲线', 540, 395, lt - 2.75, { size: 100, hl: ['爬坡曲线'], hlColor: C.cyan, mode: 'rise', out: 5.05 });

    // 脑电波：随专注度提高而平稳
    const u = E.inOutSine(U.inv(1.0, 7.8, lt));
    const focus = 0.92 / (1 + Math.exp(-10 * (u - 0.45)));
    const fNorm = focus / 0.92;
    D.wave(ctx, 110, 940, 860, 46 * (1 - fNorm * 0.6), t, {
      color: C.cyan, chaos: 1 - fNorm, alpha: U.p(lt, 0.8, 1.3) * (1 - U.p(lt, 9.2, 9.6)), width: 3,
    });

    // 专注曲线面板
    const gx = 110, gy = 1010, gw = 860, gh = 300;
    const ga = U.p(lt, 0.8, 1.3) * (1 - U.p(lt, 9.2, 9.6) * 0.6);
    if (ga > 0) {
      ctx.save();
      ctx.globalAlpha *= ga;
      U.rrect(ctx, gx - 20, gy - 30, gw + 40, gh + 70, 20);
      ctx.fillStyle = 'rgba(4,8,18,0.72)';
      ctx.fill();
      ctx.strokeStyle = U.rgba(C.cyan, 0.35);
      ctx.lineWidth = 2;
      ctx.stroke();
      // 坐标轴
      ctx.strokeStyle = U.rgba(C.ink, 0.35);
      ctx.beginPath();
      ctx.moveTo(gx, gy);
      ctx.lineTo(gx, gy + gh);
      ctx.lineTo(gx + gw, gy + gh);
      ctx.stroke();
      D.text(ctx, '专注度', gx + 12, gy + 26, { font: U.font(700, 26, 'cn'), color: U.rgba(C.ink, 0.6), align: 'left' });
      D.text(ctx, '时间 →', gx + gw - 4, gy + gh + 32, { font: U.font(700, 26, 'cn'), color: U.rgba(C.ink, 0.6), align: 'right' });
      // 曲线（逐步绘制）
      const N = 90;
      const curve = (k) => {
        const uu = k / N;
        const fv = 0.92 / (1 + Math.exp(-10 * (uu - 0.45)));
        return [gx + uu * gw, gy + gh - (fv / 0.92) * (gh - 30)];
      };
      const head = Math.max(1, Math.floor(u * N));
      const fill = ctx.createLinearGradient(0, gy, 0, gy + gh);
      fill.addColorStop(0, U.rgba(C.cyan, 0.35));
      fill.addColorStop(1, U.rgba(C.cyan, 0));
      ctx.beginPath();
      ctx.moveTo(gx, gy + gh);
      for (let k = 0; k <= head; k++) ctx.lineTo(...curve(k));
      const [hx, hy] = curve(head);
      ctx.lineTo(hx, gy + gh);
      ctx.closePath();
      ctx.fillStyle = fill;
      ctx.fill();
      ctx.beginPath();
      for (let k = 0; k <= head; k++) (k ? ctx.lineTo : ctx.moveTo).apply(ctx, curve(k));
      ctx.strokeStyle = C.cyan;
      ctx.lineWidth = 5;
      ctx.stroke();
      // 前沿光点 + 竖向参考线
      ctx.strokeStyle = U.rgba(C.cyan, 0.4);
      ctx.setLineDash([6, 8]);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(hx, gy);
      ctx.lineTo(hx, gy + gh);
      ctx.stroke();
      ctx.setLineDash([]);
      D.glow(ctx, hx, hy, 60, C.cyan, 0.6);
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(hx, hy, 9, 0, U.TAU);
      ctx.fill();
      // 数值
      D.text(ctx, `${Math.round(focus * 100)}%`, gx + gw - 6, gy + 50, { font: U.font(900, 76, 'display'), color: '#fff', align: 'right' });
      ctx.restore();
    }

    // 通知横幅：在 30.0s 准时落位（随后被打碎）
    const bt = EV.banner - 20, land = EV.impact - 20;
    if (lt >= bt) {
      const bp = U.p(lt, bt, land, E.outBack);
      const by = U.lerp(-260, 250, bp);
      D.notif(ctx, 90, by, 900, Object.assign({ accent: C.magenta }, NOTIFS[0]));
    }
    P.zoom += 0.03 * U.p(lt, 9.4, 10, E.inCubic);
  };

  /* ===================================================================
   * S05 机制 30–36s：叮 —— 画面碎裂，FOCUS LOST
   * ================================================================= */
  let snap = null, tris = null;
  /** 把 30.0s 那一帧（含通知横幅）渲染进离屏画布，作为碎裂的素材 */
  function climbSnapshot() {
    if (!snap) {
      snap = U.canvas(1080, 1920);
      const g = snap.getContext('2d');
      g.fillStyle = C.bg;
      g.fillRect(0, 0, 1080, 1920);
      S.climb(g, 9.999, 29.999, FX.defaultPost());
      tris = D.buildShards(1080, 1920, 8, 13, 77);
    }
    return snap;
  }
  FX.resetCaches = () => { snap = null; };

  S.shatter = function (ctx, lt, t, P) {
    // 红色警报环境
    D.bg(ctx, t, { tint: C.red, grid: 0.12, inner: '#22050b', dust: 40 });
    D.floorGrid(ctx, t, { horizon: 1240, color: C.red, alpha: 0.45, speed: 0.6 });
    const rp = U.beatPulse(t, 0.18);
    D.glow(ctx, 540, 820, 900, C.red, 0.08 + 0.12 * rp);

    const ix = 540, iy = 334;
    // 警示带
    const ha = U.p(lt, 0.3, 0.6);
    D.hazard(ctx, 0, 300, 1080 * ha, 40, t, C.red, 0.9);
    D.hazard(ctx, 1080 * (1 - ha), 1288, 1080, 36, -t, C.red, 0.9);

    // 主体信息
    const blink = lt < 1.4 ? (Math.sin(lt * 30) > -0.3 ? 1 : 0.35) : 1;
    const fa = U.p(lt, 0.3, 0.4) * blink;
    if (fa > 0) {
      ctx.save();
      ctx.globalAlpha *= fa;
      const wp = U.beatPulse(t, 0.2);
      D.icon(ctx, 'warn', 540, 470, 120 * (1 + wp * 0.08), C.red, 9);
      D.ring(ctx, 540, 480, 95 + wp * 20, 1, { color: U.rgba(C.red, 0.4 * wp), width: 3, track: false });
      D.kinetic(ctx, 'FOCUS LOST', 540, 680, lt - 0.3, { size: 140, fam: 'display', mode: 'slam', color: C.red, stagger: 0.03, chroma: 5, maxWidth: 900 });
      // 能量条崩溃 92% → 0%
      const cp = U.p(lt, 0.45, 1.5, E.inExpo);
      D.meter(ctx, 140, 760, 800, 46, 0.92 * (1 - cp), t, { segments: 24, color: C.red });
      D.text(ctx, `${Math.round(92 * (1 - cp))}%`, 540, 915, { font: U.font(900, 120, 'display'), color: '#fff' });
      ctx.restore();
    }
    D.kinetic(ctx, '一条消息，', 540, 1100, lt - 1.8, { size: 96 });
    D.kinetic(ctx, '清零。', 540, 1250, lt - 2.4, { size: 150, mode: 'slam', color: C.red, stagger: 0.08, chroma: 6 });
    D.text(ctx, U.scramble('ERR 0x23 // FOCUS PROCESS TERMINATED', U.p(lt, 3.0, 3.8, E.linear), t, 14), 540, 1368, {
      font: U.font(700, 26, 'mono'), color: C.red, alpha: U.p(lt, 2.9, 3.1),
    });

    // 碎片（在最上层）
    const src = climbSnapshot();
    D.drawShards(ctx, src, tris, lt, ix, iy, { cx: 540, cy: 900, gravity: 1300 });
    D.sparks(ctx, ix, iy, lt, { n: 160, speed: 2600, life: 1.4, seed: 23, color: '#ffffff', color2: C.cyan, gravity: 1600 });

    // 后期：闪白 → 红、强震、色散、故障、径向模糊
    P.flash += 0.9 * U.hit(lt, 0, 0.06);
    P.flashColor = lt < 0.08 ? [1, 1, 1] : [1, 0.15, 0.22];
    P.flash += 0.1 * U.hit(lt, 0.12, 0.2);
    shake(P, t, U.hit(lt, 0, 0.4) * 2.0);
    P.chroma += 0.7 * U.hit(lt, 0, 0.3) + 0.15 * rp;
    P.glitch += 0.9 * U.hit(lt, 0, 0.12) + 0.6 * U.p(lt, 5.6, 6);
    P.zoomBlur += 0.25 * U.hit(lt, 0, 0.12);
    P.zoomCX = ix / 1080;
    P.zoomCY = iy / 1920;
    P.tint = [1.04, 0.95, 0.95];
  };

  /* ===================================================================
   * S06 代价 36–44s：23 分 15 秒（快进的时钟）
   * ================================================================= */
  S.clock = function (ctx, lt, t, P) {
    const [dx, dy] = drift(t, 0.012, 11);
    full(ctx, 'distracted', { grade: 'alarm', zoom: 1.14 + lt * 0.02, dx, dy });
    D.halftone(ctx, 0, 0, 1080, 1920, 0.3);
    dim(ctx, 0.5);
    shade(ctx, 0.7, 0.2, 0.85);

    D.kinetic(ctx, '被打断一次', 540, H1, lt - 0.25, { size: 92 });
    D.kinetic(ctx, '平均需要', 540, H2 - 20, lt - 0.9, { size: 56, weight: 700, color: U.rgba(C.ink, 0.75) });

    const cx = 540, cy = 855, R = 280;
    const zin = U.p(lt, 7.3, 8, E.inExpo);
    const lockT = EV.clockLock - 36;
    const v = 23.25 * U.p(lt, 0.6, lockT, E.inOutCubic); // 分钟
    const locked = lt >= lockT;
    const lk = U.hit(lt, lockT, 0.3);
    const ca = U.p(lt, 0.3, 0.8);
    ctx.save();
    ctx.globalAlpha *= ca;
    ctx.translate(cx, cy);
    ctx.scale(U.p(lt, 0.3, 0.9, E.outBack) * (1 + lk * 0.06), U.p(lt, 0.3, 0.9, E.outBack) * (1 + lk * 0.06));
    ctx.translate(-cx, -cy);
    // 表盘底
    ctx.fillStyle = 'rgba(10,2,6,0.7)';
    ctx.beginPath();
    ctx.arc(cx, cy, R + 40, 0, U.TAU);
    ctx.fill();
    D.ring(ctx, cx, cy, R, v / 60, { color: C.red, width: 22, ticks: 60, rot: -Math.PI / 2, trackAlpha: 0.14, tickAlpha: 0.5 });
    // 秒针拖影（快进感）
    if (!locked) {
      const secAng = ((v * 60) % 60) / 60 * U.TAU - Math.PI / 2;
      for (let k = 0; k < 8; k++) {
        const a = secAng - k * 0.09;
        ctx.strokeStyle = U.rgba('#ffffff', 0.5 * (1 - k / 8));
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + Math.cos(a) * (R - 40), cy + Math.sin(a) * (R - 40));
        ctx.stroke();
      }
    }
    // 分针
    const mAng = (v / 60) * U.TAU - Math.PI / 2;
    ctx.strokeStyle = C.red;
    ctx.lineWidth = 9;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(mAng) * (R - 80), cy + Math.sin(mAng) * (R - 80));
    ctx.stroke();
    // 数字
    const mm = Math.floor(v), ss = locked ? 15 : Math.floor((v % 1) * 60);
    D.chromaText(ctx, `${U.pad(mm)}:${U.pad(ss)}`, cx, cy + 10, 4 + lk * 18, {
      font: U.font(900, 150, 'display'), baseline: 'middle', color: '#fff',
    });
    D.text(ctx, '分        秒', cx, cy + 120, { font: U.font(700, 32, 'cn'), color: U.rgba(C.ink, 0.6) });
    ctx.restore();
    // 快进标识
    if (!locked && lt > 0.6) {
      D.text(ctx, '▶▶  ×60', cx, cy - 120, { font: U.font(900, 40, 'display'), color: C.red, alpha: Math.sin(lt * 14) > 0 ? 1 : 0.3 });
    }
    // 锁定时的火花
    D.sparks(ctx, cx, cy, lt - lockT, { n: 90, speed: 1500, life: 0.9, seed: 41, color: C.red, color2: '#fff', gravity: 600 });

    D.kinetic(ctx, '才能回到原来的任务', 540, 1235, lt - (lockT + 0.2), { size: 70, hl: ['原来的任务'], hlColor: C.red });
    D.source(ctx, FX.CFG.SOURCES.resume, 1300, U.p(lt, lockT + 0.4, lockT + 0.8));

    P.flash += 0.3 * lk;
    P.flashColor = [1, 0.3, 0.35];
    shake(P, t, lk * 1.2);
    P.chroma += 0.4 * lk;
    P.glitch += 0.6 * U.hit(lt, 0, 0.2);
    // 出场：镜头冲进表盘
    P.zoom += 3.5 * zin;
    P.zoomBlur += 0.35 * zin;
    P.zoomCX = cx / 1080;
    P.zoomCY = cy / 1920;
    P.flash += 0.9 * U.p(lt, 7.8, 8);
    if (lt > 7.6) P.flashColor = [1, 1, 1];
    P.tint = [1.05, 0.95, 0.95];
  };

  /* ===================================================================
   * S07 代价 44–50s：注意力残留（真人残影 + 注意力粒子流向消息）
   * ================================================================= */
  S.residue = function (ctx, lt, t, P) {
    const [dx, dy] = drift(t, 0.01, 13);
    const z = 1.18 + lt * 0.015;
    const map = full(ctx, 'deepWork', { grade: 'cyber', zoom: z, dx, dy });
    // 残影：同一张照片的 4 个品红色"分身"向消息方向漂移
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    const a0 = ctx.globalAlpha;
    for (let k = 1; k <= 4; k++) {
      const off = (24 + 30 * Math.sin(lt * 1.3 + k)) * k * U.p(lt, 0.3, 1.5);
      ctx.globalAlpha = a0 * 0.16 * (1 - k / 5);
      FX.photo.draw(ctx, 'deepWork', off * 0.9, -off * 0.6, 1080, 1920, { grade: 'alarm', zoom: z, dx, dy });
    }
    ctx.restore();
    D.halftone(ctx, 0, 0, 1080, 1920, 0.2);
    shade(ctx, 0.6, 0.2, 0.9);
    band(ctx, 900, 1330, 0.7);

    // 悬浮的那条消息（右上）
    const nx = 610, ny = 610;
    const na = U.p(lt, 0.5, 1.0);
    ctx.save();
    ctx.translate(nx, ny + Math.sin(lt * 1.6) * 10);
    ctx.rotate(-0.06);
    ctx.scale(0.52, 0.52);
    D.notif(ctx, -450, -84, 900, Object.assign({ alpha: na * 0.95, accent: C.magenta }, NOTIFS[0]));
    ctx.restore();

    // 注意力粒子：从脸部流向消息（贝塞尔路径 + 噪声）
    const f = faceOf('deepWork', map);
    const pa = U.p(lt, 0.8, 1.4);
    if (pa > 0) {
      const ax = f.x, ay = f.y, bx = nx, by = ny;
      const mx = (ax + bx) / 2 + 120, my = Math.min(ay, by) - 220;
      for (let i = 0; i < 70; i++) {
        const sp = 0.25 + U.rnd(i, 61) * 0.35;
        const u = ((lt * sp + U.rnd(i, 62)) % 1);
        const iu = 1 - u;
        const x = iu * iu * ax + 2 * iu * u * mx + u * u * bx + U.noise(lt * 2 + i, 63) * 26;
        const y = iu * iu * ay + 2 * iu * u * my + u * u * by + U.noise(lt * 2 + i, 64) * 26;
        const s = 3 + U.rnd(i, 65) * 5;
        ctx.fillStyle = U.rgba(i % 3 ? C.magenta : '#ffffff', pa * Math.sin(u * Math.PI) * 0.9);
        ctx.fillRect(x - s / 2, y - s / 2, s, s);
      }
    }

    // 概念卡
    const cy = 1040;
    D.kinetic(ctx, '注意力残留', 540, cy, lt - 0.35, { size: 128, chroma: 3, stagger: 0.06 });
    D.text(ctx, U.scramble('ATTENTION  RESIDUE', U.p(lt, 0.6, 1.3, E.linear), t, 15), 540, cy + 70, {
      font: U.font(700, 38, 'display'), color: C.magenta, alpha: U.p(lt, 0.55, 0.7), spacing: 6,
    });
    // 注意力分配条（示意，无具体比例）
    const ba = U.p(lt, 2.6, 3.1);
    if (ba > 0) {
      const bx0 = 170, bw = 740, by0 = 1190;
      const split = 0.62 + Math.sin(lt * 3.3) * 0.04;
      ctx.save();
      ctx.globalAlpha *= ba;
      ctx.fillStyle = U.rgba(C.cyan, 0.85);
      ctx.fillRect(bx0, by0, bw * split * U.p(lt, 2.6, 3.3, E.outExpo), 30);
      ctx.fillStyle = U.rgba(C.magenta, 0.55 + 0.45 * Math.abs(Math.sin(lt * 9)));
      ctx.fillRect(bx0 + bw * split + 8, by0, bw * (1 - split) * U.p(lt, 2.9, 3.5, E.outExpo) - 8, 30);
      D.text(ctx, '当前任务', bx0, by0 + 76, { font: U.font(700, 32, 'cn'), color: C.cyan, align: 'left' });
      D.text(ctx, '那条消息', bx0 + bw, by0 + 76, { font: U.font(700, 32, 'cn'), color: C.magenta, align: 'right' });
      ctx.restore();
    }
    D.source(ctx, FX.CFG.SOURCES.residue, 1315, U.p(lt, 1.2, 1.6));

    P.flash += 0.8 * (1 - U.p(lt, 0, 0.35));
    P.flashColor = [1, 1, 1];
    P.bloom += 0.35;
    P.chroma += 0.2 + 0.1 * Math.sin(lt * 2);
    P.zoom += 0.01 * Math.sin(lt * 1.5);
    // 出场：横向甩镜
    const wo = U.p(lt, 5.55, 6, E.inExpo);
    P.dirBlurX += 0.25 * wo;
    P.shakeX += 0.6 * wo;
  };

  /* ===================================================================
   * S08 代价 50–58s：被打断的人反而更快 —— 但更累
   * ================================================================= */
  S.twist = function (ctx, lt, t, P) {
    const sw = EV.twistSwitch - 50;
    if (lt < sw) {
      // ------- 前半：更快 -------
      D.bg(ctx, t, { tint: C.cyan, grid: 0.08, inner: '#061426' });
      D.floorGrid(ctx, t, { horizon: 1180, color: C.cyan, alpha: 0.45, speed: 3.2 });
      D.speedLines(ctx, 540, 760, t, 1 - 0.4 * U.p(lt, 0, 1.5), { color: '#ffffff', accent: C.cyan, n: 110 });
      D.kinetic(ctx, '更反直觉的是——', 540, H1 - 10, lt - 0.1, { size: 54, weight: 700, color: U.rgba(C.ink, 0.75) });
      D.kinetic(ctx, '被打断的人', 540, 660, lt - 0.55, { size: 110 });
      const ft = EV.twistFast - 50;
      // "反而做得更快"：带运动拖影
      for (let k = 3; k >= 1; k--) {
        const tr = 1 - U.p(lt, ft + 0.1, ft + 0.6);
        if (tr <= 0) break;
        D.kinetic(ctx, '反而做得更快', 540 - k * 46 * tr, 830, lt - ft, { size: 132, mode: 'slam', alpha: 0.18 * tr, hl: ['更快'], hlColor: C.green });
      }
      D.kinetic(ctx, '反而做得更快', 540, 830, lt - ft, { size: 132, mode: 'slam', hl: ['更快'], hlColor: C.green, chroma: 4 });
      // 速度表
      const ma = U.p(lt, ft + 0.4, ft + 0.8);
      if (ma > 0) {
        ctx.save();
        ctx.globalAlpha *= ma;
        D.text(ctx, 'SPEED  速度', 150, 1010, { font: U.font(700, 30, 'mono'), color: C.green, align: 'left' });
        D.meter(ctx, 150, 1040, 680, 48, 0.86 * U.p(lt, ft + 0.4, ft + 1.4, E.outExpo), t, { segments: 20, color: C.green });
        D.icon(ctx, 'check', 900, 1064, 90, C.green, 10);
        ctx.restore();
      }
      P.flash += 0.4 * U.hit(lt, 0, 0.12);
      P.zoomBlur += 0.18 * U.hit(lt, ft, 0.3);
      shake(P, t, U.hit(lt, ft, 0.3));
      P.chroma += 0.3 * U.hit(lt, ft, 0.3);
    } else {
      // ------- 后半：代价 -------
      const l2 = lt - sw;
      const [dx, dy] = drift(t, 0.012, 17);
      const zz = 1.12 + 0.3 * (1 - U.p(l2, 0, 0.6, E.outExpo));
      full(ctx, 'stressed', { grade: 'alarm', zoom: zz, dx, dy });
      D.halftone(ctx, 0, 0, 1080, 1920, 0.3);
      dim(ctx, 0.5);
      shade(ctx, 0.7, 0.25, 0.9);
      D.kinetic(ctx, '代价是——', 540, H1, l2 - 0.05, { size: 90, mode: 'slam', color: '#fff', stagger: 0.06 });
      const labels = ['压力', '挫败感', '时间压力'];
      labels.forEach((lab, i) => {
        const gt = EV.gauges[i] - EV.twistSwitch;
        const gx = 205 + i * 335, gy = 780;
        const a = U.p(l2, gt - 0.5, gt - 0.2);
        if (a <= 0) return;
        const v = U.lerp(0.28, 0.92, E.outElastic(U.inv(gt, gt + 0.9, l2)));
        ctx.save();
        ctx.globalAlpha *= a;
        D.gauge(ctx, gx, gy, 118, v, t, { width: 16 });
        D.text(ctx, lab, gx, gy + 80, { font: U.font(900, 46), color: '#fff' });
        if (l2 > gt) D.text(ctx, '↑', gx + 92, gy - 70, { font: U.font(900, 64, 'display'), color: C.red, alpha: U.p(l2, gt, gt + 0.2) });
        ctx.restore();
        const hk = U.hit(l2, gt, 0.2);
        shake(P, t, hk * 0.9);
        P.chroma += 0.3 * hk;
        P.flash += 0.12 * hk;
      });
      D.text(ctx, '被打断组 vs 未被打断组', 540, 960, {
        font: U.font(700, 34, 'cn'), color: U.rgba(C.ink, 0.65), alpha: U.p(l2, 1.0, 1.4),
      });
      const nt = EV.neq - EV.twistSwitch;
      D.kinetic(ctx, '更快 ≠ 更好', 540, 1170, l2 - nt, { size: 128, mode: 'slam', hl: ['≠'], hlColor: C.red, chroma: 5, stagger: 0.06 });
      D.source(ctx, FX.CFG.SOURCES.stress, 1300, U.p(l2, 1.2, 1.6));
      P.flash += 0.6 * U.hit(l2, 0, 0.12);
      P.flashColor = [1, 0.15, 0.25];
      P.glitch += 0.8 * U.hit(l2, 0, 0.3);
      shake(P, t, U.hit(l2, nt, 0.3) * 1.2);
      P.tint = [1.06, 0.94, 0.94];
    }
    // 出场
    P.glitch += 0.7 * U.p(lt, 7.5, 8);
    P.pixel += 30 * U.p(lt, 7.7, 8, E.inQuad);
  };

  /* ===================================================================
   * S09 账单 58–66s：一天的时间轴，6 次打断吃掉 2 小时 18 分
   * ================================================================= */
  S.ledger = function (ctx, lt, t, P) {
    D.bg(ctx, t, { tint: C.magenta, grid: 0.1, inner: '#170a1c', dust: 40 });
    const fT = EV.formula - 58;
    const collapse = U.p(lt, fT - 0.4, fT, E.inCubic);

    D.kinetic(ctx, '假设你一天被打断 6 次', 540, H1 - 10, lt - 0.15, { size: 76, hl: ['6 次'], hlColor: C.magenta, out: fT - 0.6 });

    const [s0, s1] = EV.ledgerScan;
    const y0 = 600, y1 = 1300, tx = 170;
    const yOf = (h) => y0 + ((h - 9) / 9) * (y1 - y0);
    const la = U.p(lt, 0.3, 0.7) * (1 - collapse);
    if (la > 0) {
      ctx.save();
      ctx.globalAlpha *= la;
      // 时间轴主线
      ctx.strokeStyle = U.rgba(C.ink, 0.35);
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(tx, y0);
      ctx.lineTo(tx, y0 + (y1 - y0) * U.p(lt, 0.3, 0.9, E.outCubic));
      ctx.stroke();
      for (let h = 9; h <= 18; h++) {
        const y = yOf(h);
        ctx.fillStyle = U.rgba(C.ink, 0.5);
        ctx.fillRect(tx - 10, y - 1, 20, 2);
        if (h % 3 === 0) D.text(ctx, `${U.pad(h)}:00`, tx - 22, y + 9, { font: U.font(700, 24, 'mono'), color: U.rgba(C.ink, 0.6), align: 'right' });
      }
      // 扫描线 "现在"
      const sp = U.inv(s0 - 58, s1 - 58, lt);
      const nowH = 9 + 9 * sp;
      const sy = yOf(nowH);
      if (sp > 0 && sp < 1) {
        ctx.fillStyle = U.rgba(C.cyan, 0.9);
        ctx.fillRect(tx - 16, sy - 2, 830, 4);
        D.glow(ctx, tx, sy, 50, C.cyan, 0.6);
        const hh = Math.floor(nowH), mm = Math.floor((nowH % 1) * 60);
        D.text(ctx, `${U.pad(hh)}:${U.pad(mm)}`, tx + 830, sy - 12, { font: U.font(700, 26, 'mono'), color: C.cyan, align: 'right' });
      }
      // 打断记录：时间轴红块 + 通知卡片 + 连接线
      const roster = [
        { n: NOTIFS[0] }, { n: NOTIFS[1] }, { n: NOTIFS[2] }, { n: NOTIFS[3] }, { n: NOTIFS[5] }, { n: NOTIFS[4] },
      ];
      EV.ledgerHours.forEach((h, i) => {
        const it = FX.CFG.ledgerT(h) - 58;
        if (lt < it) return;
        const by = yOf(h);
        const bh = ((23 / 60) / 9) * (y1 - y0);
        const gp = U.p(lt, it, it + 0.3, E.outExpo);
        ctx.fillStyle = C.red;
        ctx.fillRect(tx - 12, by, 24, bh * gp);
        D.glow(ctx, tx, by + bh / 2, 44, C.red, 0.5 * U.hit(lt, it, 0.4));
        const cy = 600 + i * 116;
        const cp = U.p(lt, it, it + 0.35, E.outBack);
        // 连接线
        ctx.strokeStyle = U.rgba(C.red, 0.55);
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(tx + 14, by + bh / 2);
        ctx.lineTo(236, cy + 50);
        ctx.stroke();
        ctx.save();
        ctx.translate(250 + (1 - cp) * 300, cy);
        ctx.scale(0.6, 0.6);
        D.notif(ctx, 0, 0, 880, Object.assign({}, roster[i].n, { alpha: U.clamp(cp), time: `${U.pad(Math.floor(h))}:${U.pad((h % 1) * 60)}` }));
        ctx.restore();
        // "+23 min" 标签飘向计数器
        const fp = U.p(lt, it + 0.1, it + 0.7, E.inOutCubic);
        if (fp > 0 && fp < 1) {
          const fx = U.lerp(760, 830, fp), fy = U.lerp(cy + 50, 520, fp);
          D.text(ctx, '+23 min', fx, fy, { font: U.font(900, 34, 'display'), color: C.red, alpha: 1 - fp * 0.6 });
        }
      });
      ctx.restore();
      // 计数器
      let lost = 0;
      EV.ledgerHours.forEach((h) => {
        const it = FX.CFG.ledgerT(h) - 58;
        lost += 23 * U.p(lt, it + 0.5, it + 0.9, E.outCubic);
      });
      ctx.save();
      ctx.globalAlpha *= la;
      D.text(ctx, 'LOST · 已损失', 660, 486, { font: U.font(700, 24, 'mono'), color: C.red, align: 'left' });
      D.odometer(ctx, lost, 3, 760, 540, { size: 74, color: '#fff', digitWidth: 52, align: 'left' });
      D.text(ctx, '分钟', 930, 556, { font: U.font(700, 30, 'cn'), color: U.rgba(C.ink, 0.7), align: 'left' });
      ctx.restore();
    }

    // 公式：6 × 23 分钟 = 2 小时 18 分 ；超过工作日的 1/4
    if (lt > fT - 0.1) {
      const l2 = lt - fT;
      D.kinetic(ctx, '6 × 23 分钟', 540, 720, l2, { size: 100, fam: 'cn', mode: 'rise' });
      D.text(ctx, '=', 540, 850, { font: U.font(900, 90, 'display'), color: U.rgba(C.ink, 0.6), alpha: U.p(l2, 0.25, 0.4) });
      D.kinetic(ctx, '2小时18分', 540, 1010, l2 - 0.4, { size: 150, mode: 'slam', color: C.red, chroma: 6, stagger: 0.05 });
      const ra = U.p(l2, 0.9, 1.2);
      if (ra > 0) {
        ctx.save();
        ctx.globalAlpha *= ra;
        D.ring(ctx, 300, 1180, 70, 0.2875 * U.p(l2, 0.9, 1.6, E.outCubic), { color: C.red, width: 26, trackAlpha: 0.18 });
        D.text(ctx, '8h', 300, 1192, { font: U.font(900, 34, 'display'), color: '#fff' });
        D.text(ctx, '超过工作日的', 400, 1170, { font: U.font(700, 40), color: '#fff', align: 'left' });
        D.text(ctx, '1/4', 400, 1240, { font: U.font(900, 72, 'display'), color: C.red, align: 'left' });
        ctx.restore();
      }
      P.flash += 0.3 * U.hit(l2, 0.4, 0.12);
      P.flashColor = [1, 0.2, 0.3];
      shake(P, t, U.hit(l2, 0.4, 0.35) * 1.4);
      P.chroma += 0.4 * U.hit(l2, 0.4, 0.4);
    }
    // 每次打断：轻震
    EV.ledgerHours.forEach((h) => {
      const k = U.hit(t, FX.CFG.ledgerT(h), 0.15);
      shake(P, t, k * 0.5);
      P.chroma += 0.2 * k;
    });
    // 入场 / 出场
    P.pixel += 30 * (1 - U.p(lt, 0, 0.3, E.outQuad));
    P.glitch += 0.9 * U.p(lt, 7.6, 8);
    P.tint = [1.04, 0.96, 1.0];
  };

  /* ===================================================================
   * S10 解法 66–76s：三招抢回专注（真实照片卡片）
   * ================================================================= */
  const STEPS = [
    { no: '01', title: '开勿扰', sub: '专注时段，手机扣过来', photo: 'phoneDown', icon: 'moon' },
    { no: '02', title: '集中回', sub: '每 1–2 小时，统一处理一次消息', photo: 'batch', icon: 'inbox' },
    { no: '03', title: '番茄钟', sub: '25 分钟专注 + 5 分钟休息', photo: 'timer', icon: 'timer' },
  ];
  S.recover = function (ctx, lt, t, P) {
    D.bg(ctx, t, { tint: C.green, grid: 0.12, inner: '#04201a' });
    D.floorGrid(ctx, t, { horizon: 1300, color: C.green, alpha: 0.35, speed: 1 });
    const rT = EV.restored - 66;

    // 开场：SYSTEM RECOVERY
    const introOut = U.p(lt, 0.85, 1.05);
    if (introOut < 1) {
      ctx.save();
      ctx.globalAlpha *= 1 - introOut;
      D.text(ctx, U.scramble('>> SYSTEM RECOVERY', U.p(lt, 0, 0.5, E.linear), t, 18), 540, 760, {
        font: U.font(700, 44, 'mono'), color: C.green,
      });
      D.kinetic(ctx, '三招，抢回专注', 540, 920, lt - 0.1, { size: 112, mode: 'slam', hl: ['抢回专注'], hlColor: C.green, chroma: 4, stagger: 0.05 });
      ctx.restore();
    }

    // 三张卡片
    STEPS.forEach((s, i) => {
      const c0 = EV.cards[i] - 66, c1 = i < 2 ? EV.cards[i + 1] - 66 : rT;
      if (lt < c0 - 0.05 || lt > c1 + 0.5) return;
      const pin = U.p(lt, c0, c0 + 0.45, E.outExpo);
      const pout = U.p(lt, c1 - 0.05, c1 + 0.35, E.inExpo);
      const ox = (1 - pin) * 1080 - pout * 1080;
      const la = lt - c0;
      ctx.save();
      ctx.translate(ox, 0);
      // 步骤指示
      D.text(ctx, `STEP ${s.no} / 03`, 120, 405, { font: U.font(700, 28, 'mono'), color: C.green, align: 'left' });
      for (let k = 0; k < 3; k++) {
        ctx.fillStyle = k <= i ? C.green : U.rgba(C.green, 0.2);
        ctx.fillRect(760 + k * 70, 392, 56, 8);
      }
      // 标题
      D.icon(ctx, s.icon, 170, 505, 84, C.green, 7);
      D.kinetic(ctx, s.title, 240, 540, la - 0.15, { size: 108, align: 'left', stagger: 0.06 });
      // 照片面板（内部视差）
      const px = 110, py = 600, pw = 860, ph = 620;
      ctx.save();
      U.rrect(ctx, px, py, pw, ph, 34);
      ctx.clip();
      FX.photo.draw(ctx, s.photo, px, py, pw, ph, { grade: 'heal', zoom: 1.12 + la * 0.03, dx: ox / 1080 * -0.15 });
      D.halftone(ctx, px, py, pw, ph, 0.18);
      const pg = ctx.createLinearGradient(0, py + ph * 0.5, 0, py + ph);
      pg.addColorStop(0, 'rgba(2,10,8,0)');
      pg.addColorStop(1, 'rgba(2,10,8,0.8)');
      ctx.fillStyle = pg;
      ctx.fillRect(px, py, pw, ph);
      D.scanBeam(ctx, py + ph * U.p(la, 0.1, 0.9, E.inOutCubic), C.green, 1 - U.p(la, 0.8, 1.0), px, pw, 120);
      ctx.restore();
      ctx.strokeStyle = U.rgba(C.green, 0.8);
      ctx.lineWidth = 3;
      U.rrect(ctx, px, py, pw, ph, 34);
      ctx.stroke();
      // 巨型描边编号
      D.text(ctx, s.no, px + 30, py + ph - 40, {
        font: U.font(900, 220, 'display'), align: 'left', color: null, stroke: U.rgba(C.green, 0.9), strokeWidth: 4,
      });
      // 每张卡片的专属小动效
      if (i === 0) {
        // 勿扰开关
        const on = U.p(la, 0.7, 1.0, E.outBack);
        const sx = px + pw - 210, sy = py + 40;
        U.rrect(ctx, sx, sy, 170, 76, 38);
        ctx.fillStyle = on > 0.5 ? U.rgba(C.green, 0.9) : 'rgba(255,255,255,0.2)';
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(sx + 38 + on * 94, sy + 38, 30, 0, U.TAU);
        ctx.fill();
        D.text(ctx, '勿扰', sx - 20, sy + 50, { font: U.font(700, 34), color: '#fff', align: 'right' });
      } else if (i === 1) {
        // 集中处理的时间点依次点亮
        const slots = ['10:00', '12:00', '14:00', '16:00'];
        slots.forEach((sl, k) => {
          const on = U.p(la, 0.5 + k * 0.3, 0.7 + k * 0.3);
          const sx = px + 40 + k * 200, sy = py + 40;
          U.rrect(ctx, sx, sy, 180, 64, 32);
          ctx.fillStyle = on > 0 ? U.rgba(C.green, 0.25 + 0.6 * on) : 'rgba(0,0,0,0.45)';
          ctx.fill();
          D.text(ctx, sl, sx + 90, sy + 43, { font: U.font(700, 30, 'mono'), color: on > 0.5 ? '#04130e' : '#fff' });
        });
      } else {
        // 番茄钟倒计时环
        const rx = px + pw - 150, ry = py + 150;
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.beginPath();
        ctx.arc(rx, ry, 110, 0, U.TAU);
        ctx.fill();
        const rem = 25 * 60 - la * 4; // 演示：4 倍速走秒
        D.ring(ctx, rx, ry, 92, 1 - la * 0.05, { color: C.green, width: 12, ticks: 25, trackAlpha: 0.2 });
        D.text(ctx, `${U.pad(rem / 60)}:${U.pad(rem % 60)}`, rx, ry + 16, { font: U.font(900, 46, 'display'), color: '#fff' });
      }
      // 说明
      D.kinetic(ctx, s.sub, 540, 1300, la - 0.45, { size: 54, weight: 700, color: U.rgba(C.ink, 0.9), maxWidth: 860 });
      ctx.restore();
      // 切卡：横向运动模糊
      const k = U.hit(lt, c0, 0.18);
      P.dirBlurX += 0.12 * k;
      P.chroma += 0.25 * k;
    });

    // 专注恢复：主角回归（绿色片调）
    if (lt > rT - 0.05) {
      const l2 = lt - rT;
      const map = full(ctx, 'deepWork', { grade: 'heal', zoom: 1.2 - 0.08 * U.p(l2, 0, 1, E.outCubic), alpha: U.p(l2, 0, 0.25) });
      ctx.save();
      ctx.globalAlpha *= U.p(l2, 0, 0.25);
      shade(ctx, 0.7, 0.2, 0.9);
      ctx.restore();
      const f = faceOf('deepWork', map);
      D.reticle(ctx, f.x, f.y, f.r, t, U.p(l2, 0.1, 0.5), { color: C.green, label: 'FOCUS RESTORED', sub: '专注已恢复', below: true });
      D.meter(ctx, 140, 1150, 800, 46, U.p(l2, 0.2, 0.8, E.outExpo), t, { segments: 24, color: C.green });
      D.text(ctx, `${Math.round(100 * U.p(l2, 0.2, 0.8, E.outExpo))}%`, 540, 1290, { font: U.font(900, 110, 'display'), color: '#fff', alpha: U.p(l2, 0.2, 0.3) });
      P.flash += 0.35 * U.hit(l2, 0, 0.15);
      P.flashColor = [0.6, 1, 0.85];
    }
    P.flash += 0.4 * U.hit(lt, 0, 0.15);
    if (lt < 0.5) P.flashColor = [0.6, 1, 0.85];
    P.pixel += 30 * (1 - U.p(lt, 0, 0.3, E.outQuad));
  };

  /* ===================================================================
   * S11 互动 76–80s：评论区报数（结尾无缝接回开头）
   * ================================================================= */
  S.cta = function (ctx, lt, t, P) {
    const [dx, dy] = drift(t, 0.01, 19);
    full(ctx, 'deepWork', { grade: 'cyber', zoom: 1.12, dx, dy, alpha: 0.4 });
    dim(ctx, 0.45);
    D.bg(ctx, t, { tint: C.cyan, grid: 0.08, inner: 'rgba(0,0,0,0)', dust: 50 });
    shade(ctx, 0.5, 0.2, 0.8);

    D.kinetic(ctx, '你今天', 540, 600, lt - 0.15, { size: 100 });
    D.kinetic(ctx, '被打断了几次？', 540, 750, lt - 0.45, { size: 118, hl: ['几次'], hlColor: C.magenta, mode: 'slam', chroma: 4, stagger: 0.05 });
    // 输入框：数字在跳
    const ba = U.p(lt, 0.9, 1.2, E.outBack);
    if (ba > 0) {
      ctx.save();
      ctx.translate(540, 905);
      ctx.scale(ba, ba);
      U.rrect(ctx, -260, -80, 520, 160, 30);
      ctx.fillStyle = 'rgba(4,10,22,0.85)';
      ctx.fill();
      ctx.strokeStyle = C.cyan;
      ctx.lineWidth = 4;
      ctx.stroke();
      const n = Math.floor(U.rnd(Math.floor(t * 8), 71) * 30);
      D.text(ctx, lt < 2.6 ? U.pad(n) : '__', -40, 38, { font: U.font(900, 110, 'display'), color: '#fff' });
      if (Math.floor(t * 2.5) % 2 === 0) { ctx.fillStyle = C.cyan; ctx.fillRect(48, -50, 6, 100); }
      D.text(ctx, '次', 150, 34, { font: U.font(900, 72), color: C.magenta });
      ctx.restore();
    }
    // 评论区箭头（指向右侧评论按钮）
    const aa = U.p(lt, 1.3, 1.6);
    if (aa > 0) {
      ctx.save();
      ctx.globalAlpha *= aa;
      D.kinetic(ctx, '评论区报个数', 500, 1130, lt - 1.3, { size: 76, hl: ['报个数'], hlColor: C.cyan });
      const bx = 830 + Math.sin(lt * 9) * 14;
      ctx.translate(bx, 1104);
      ctx.rotate(-Math.PI / 2);
      D.icon(ctx, 'arrowDown', 0, 0, 70, C.cyan, 8);
      ctx.restore();
      D.text(ctx, '关注我 · 把专注抢回来', 540, 1250, { font: U.font(700, 44), color: U.rgba(C.ink, 0.75), alpha: U.p(lt, 1.8, 2.1) });
    }
    // 结尾：故障渐入开场画面，形成循环
    const lp = U.p(lt, 3.55, 4, E.inQuad);
    if (lp > 0) {
      ctx.save();
      ctx.globalAlpha *= lp;
      S.hook(ctx, 0, 0, FX.defaultPost());
      ctx.restore();
    }
    P.glitch += 0.6 * U.p(lt, 3.3, 4);
    P.chroma += 0.5 * U.p(lt, 3.3, 4);
    P.flash += 0.3 * U.hit(lt, 0, 0.12);
    P.flashColor = [0.7, 1, 1];
  };
})();
