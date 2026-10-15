// 合成器：镜头调度、转场、AI 素材贴入、字幕、胶片质感。
// 用法：const r = ZG.createRenderer(canvas); await ZG.ready(); r.render(t);
(function () {
  const ZG = window.ZG, C = ZG.C, W = ZG.W, H = ZG.H;
  const { clamp, lerp, inv, E } = ZG;

  // ---------- 成片时间映射 ----------
  // engine/final.js 提供 ZG.FINAL = { duration, map: { old: [...], new: [...] }, lines: [...] }
  // 画面与卡点都按原分镜（设计时间）编排；成片按真实配音的节奏把设计时间分段拉伸。
  function interp(x, xs, ys) {
    if (x <= xs[0]) return ys[0] + (x - xs[0]);
    for (let i = 1; i < xs.length; i++) if (x <= xs[i]) return ys[i - 1] + (ys[i] - ys[i - 1]) * (x - xs[i - 1]) / (xs[i] - xs[i - 1]);
    return ys[ys.length - 1] + (x - xs[xs.length - 1]);
  }
  ZG.toOld = (t) => (ZG.FINAL ? interp(t, ZG.FINAL.map.new, ZG.FINAL.map.old) : t);
  ZG.toNew = (t) => (ZG.FINAL ? interp(t, ZG.FINAL.map.old, ZG.FINAL.map.new) : t);
  ZG.duration = () => (ZG.FINAL ? ZG.FINAL.duration : ZG.META.DURATION);
  ZG.lines = () => {
    if (!ZG.FINAL) return ZG.LINES;
    if (!ZG.FINAL.lines) ZG.FINAL.lines = ZG.LINES.map((l, i) => Object.assign({}, l, { t0: ZG.FINAL.lineTimes[i][0], t1: ZG.FINAL.lineTimes[i][1] }));
    return ZG.FINAL.lines;
  };

  // ---------- AI 素材 ----------
  // assets/manifest.json 例：{ "SH01": "SH01.mp4", "SH06": "SH06.png", "SH03-1": "photo1.jpg" }
  ZG.assets = {};
  ZG.loadAssets = async function (base = 'assets/') {
    let manifest = {};
    try { const r = await fetch(base + 'manifest.json', { cache: 'no-store' }); if (r.ok) manifest = await r.json(); } catch (e) { /* 没有素材也能跑 */ }
    await Promise.all(Object.entries(manifest).map(([id, file]) => new Promise((res) => {
      const url = base + file;
      if (/\.(mp4|webm|mov)$/i.test(file)) {
        const v = document.createElement('video'); v.src = url; v.muted = true; v.playsInline = true; v.preload = 'auto';
        v.onloadeddata = () => { ZG.assets[id] = { el: v, video: true }; res(); }; v.onerror = () => res();
      } else {
        const im = new Image(); im.onload = () => { ZG.assets[id] = { el: im }; res(); }; im.onerror = () => res(); im.src = url;
      }
    })));
    return ZG.assets;
  };
  // 逐帧导出前调用：把视频素材精确 seek 到该帧
  ZG.prepareFrame = async function (tNew) {
    const t = ZG.toOld(tNew), jobs = [];
    ZG.SHOTS.forEach((sh) => {
      if (t < sh.t0 - 0.5 || t > sh.t1 + 0.5) return;
      Object.keys(ZG.assets).forEach((id) => {
        if (id !== sh.id && !id.startsWith(sh.id + '-')) return;
        const a = ZG.assets[id]; if (!a.video) return;
        const target = clamp(t - sh.t0, 0, Math.max(0, a.el.duration - 0.04));
        if (Math.abs(a.el.currentTime - target) < 0.001) return;
        jobs.push(new Promise((res) => { a.el.addEventListener('seeked', res, { once: true }); a.el.currentTime = target; }));
      });
    });
    await Promise.all(jobs);
  };

  ZG.hasPlate = (id) => !!ZG.assets[id];
  // 铺满（cover）绘制素材；kb = { s 缩放, fx, fy 缩放中心 }
  ZG.drawPlate = function (ctx, id, x, y, w, h, t, kb) {
    const a = ZG.assets[id]; if (!a) return false;
    const el = a.el, iw = a.video ? el.videoWidth : el.naturalWidth, ih = a.video ? el.videoHeight : el.naturalHeight;
    if (!iw) return false;
    const sc = Math.max(w / iw, h / ih) * ((kb && kb.s) || 1), dw = iw * sc, dh = ih * sc;
    ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
    ctx.drawImage(el, x + w / 2 - dw / 2, y + h / 2 - dh / 2, dw, dh); ctx.restore();
    return true;
  };
  // 场景内部按需贴入本镜素材（insetPlate 场景用）
  ZG.platePart = function (ctx, s, alpha, kb, o = {}) {
    if (alpha <= 0.003 || ZG.OVERLAY) return;
    ctx.save(); ctx.globalAlpha = alpha;
    if (kb && kb.fx != null) { ctx.translate(kb.fx, kb.fy); ctx.scale(kb.s, kb.s); ctx.translate(-kb.fx, -kb.fy); }
    const ok = ZG.drawPlate(ctx, s.shot.id, 0, 0, W, H, s.t, kb && kb.fx == null ? kb : null);
    ctx.restore();
    if (!ok && ZG.NO_PLACEHOLDER) { if (!o.mini) { ctx.save(); ctx.globalAlpha = alpha; ZG.vgrad(ctx, '#04060C', '#0B1222'); ZG.glow(ctx, 700, 880, 380, '#4C7FB0', 0.28); ctx.restore(); } return; }
    if (!ok) {
      if (o.mini) ZG.label(ctx, `${s.shot.id} · AI 素材叠入位：${s.shot.note}`, 540, 230, { size: 24, align: 'center', a: 0.5 * alpha, ls: 2 });
      else { ctx.save(); ctx.globalAlpha = alpha; ZG.vgrad(ctx, '#05070D', '#121A2A'); ZG.placeholder(ctx, s.shot, s.lt); ctx.restore(); }
    }
  };

  // ---------- 单个镜头 ----------
  function renderShot(ctx, i, t) {
    const shot = ZG.SHOTS[i], sc = ZG.scenes[shot.scene];
    const d = shot.t1 - shot.t0, lt = t - shot.t0;
    const s = { t, lt, d, p: clamp(lt / d), shot, hasPlate: ZG.hasPlate(shot.id) };
    const cam = sc.cam ? sc.cam(s) : { s: 1 };
    ctx.save();
    // 透明叠加层模式（ZG.OVERLAY）：只输出动效与字幕，给剪辑软件叠在 AI 素材上
    if (ZG.OVERLAY) ctx.clearRect(0, 0, W, H); else { ctx.fillStyle = C.night; ctx.fillRect(0, 0, W, H); }
    const fx = cam.fx == null ? W / 2 : cam.fx, fy = cam.fy == null ? H / 2 : cam.fy;
    ctx.translate(fx + (cam.x || 0), fy + (cam.y || 0)); ctx.rotate(cam.r || 0); ctx.scale(cam.s || 1, cam.s || 1); ctx.translate(-fx, -fy);
    if (!sc.insetPlate && !(ZG.OVERLAY && shot.plate)) {
      if (s.hasPlate && shot.plate) ZG.drawPlate(ctx, shot.id, 0, 0, W, H, t);
      else sc.bg(ctx, s);
    }
    sc.fx(ctx, s);
    ctx.restore();
    if (shot.plate && !s.hasPlate && !sc.insetPlate && !ZG.OVERLAY && !ZG.NO_PLACEHOLDER) ZG.placeholder(ctx, shot, lt);
  }

  // ---------- 字幕 ----------
  function splitLine(ctx, text, maxW) {
    if (ctx.measureText(text).width <= maxW) return [text];
    const marks = []; for (let i = 1; i < text.length - 1; i++) if ('，：、'.includes(text[i])) marks.push(i);
    if (!marks.length) { const m = Math.ceil(text.length / 2); return [text.slice(0, m), text.slice(m)]; }
    const mid = text.length / 2, cut = marks.reduce((a, b) => (Math.abs(b - mid) < Math.abs(a - mid) ? b : a));
    return [text.slice(0, cut + 1), text.slice(cut + 1)];
  }
  ZG.SUB_Y = 1390; // 抖音安全区：避开底部文案区与右侧按钮
  function subtitles(ctx, t) {
    ZG.lines().forEach((ln) => {
      if (ln.hideSub || t < ln.t0 - 0.05 || t > ln.t1 + 0.25) return;
      const a = E.out(inv(ln.t0 - 0.05, ln.t0 + 0.18, t)) * (1 - inv(ln.t1 + 0.05, ln.t1 + 0.25, t));
      const rise = (1 - E.out(inv(ln.t0 - 0.05, ln.t0 + 0.25, t))) * 14;
      if (ln.big) {
        ZG.richText(ctx, ln.text, ln.hl, 540, ln.text.startsWith('放下') ? 820 : 960, { size: 84, weight: 900, ls: 10, a, color: C.white });
        return;
      }
      ZG.font(ctx, 54, 600, 'serif'); ctx.letterSpacing = '2px';
      const rows = splitLine(ctx, ln.text, 800); ctx.letterSpacing = '0px';
      // 字幕底衬：深色画面里几乎看不见，浅色画面（信纸、天亮）时保证可读
      const top = ZG.SUB_Y - (rows.length - 1) * 78 - 120, g = ctx.createLinearGradient(0, top, 0, ZG.SUB_Y + 110);
      g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(0.45, `rgba(0,0,0,${0.42 * a})`); g.addColorStop(0.75, `rgba(0,0,0,${0.42 * a})`); g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g; ctx.fillRect(0, top, W, ZG.SUB_Y + 110 - top);
      rows.forEach((row, k) => {
        const y = ZG.SUB_Y + rise - (rows.length - 1 - k) * 78;
        ZG.richText(ctx, row, ln.hl, 540, y, { size: 54, weight: 600, a, ls: 2 });
      });
    });
  }

  // ---------- 转场 ----------
  function composite(ctx, bufA, bufB, k, type) {
    if (type === 'fade') { ctx.drawImage(bufA, 0, 0, W, H); ctx.globalAlpha = k; ctx.drawImage(bufB, 0, 0, W, H); ctx.globalAlpha = 1; }
    else if (type === 'flash') {
      ctx.drawImage(k < 0.5 ? bufA : bufB, 0, 0, W, H);
      ctx.globalAlpha = Math.sin(Math.PI * k) * 0.9; ctx.fillStyle = '#FFF4E2'; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1;
    } else if (type === 'zoom') {
      const za = 1 + E.in(k) * 0.35, zb = 0.92 + 0.08 * E.out(k);
      ctx.save(); ctx.translate(W / 2, H / 2); ctx.scale(za, za); ctx.globalAlpha = 1 - k; ctx.drawImage(bufA, -W / 2, -H / 2, W, H); ctx.restore();
      ctx.save(); ctx.translate(W / 2, H / 2); ctx.scale(zb, zb); ctx.globalAlpha = k; ctx.drawImage(bufB, -W / 2, -H / 2, W, H); ctx.restore();
    } else if (type === 'light') {
      ctx.drawImage(bufA, 0, 0, W, H); ctx.globalAlpha = E.inOut(k); ctx.drawImage(bufB, 0, 0, W, H); ctx.globalAlpha = 1;
      ZG.glow(ctx, 540, 1000, 1400, '#FFC58A', Math.sin(Math.PI * k) * 0.9);
    } else ctx.drawImage(bufB, 0, 0, W, H);
  }

  ZG.createRenderer = function (canvas, opts = {}) {
    const ctx = canvas.getContext('2d'), scale = canvas.width / W;
    const mk = () => { const c = document.createElement('canvas'); c.width = canvas.width; c.height = canvas.height; return c; };
    const A = mk(), B = mk(), actx = A.getContext('2d'), bctx = B.getContext('2d');
    function into(c2, i, t) { c2.setTransform(scale, 0, 0, scale, 0, 0); renderShot(c2, i, t); }
    return {
      ctx,
      render(tNew) {
        tNew = clamp(tNew, 0, ZG.duration() - 1e-4);
        const t = clamp(ZG.toOld(tNew), 0, ZG.META.DURATION - 1e-4);
        const i = ZG.shotAt(t), sh = ZG.SHOTS[i];
        if (sh.xin > 0 && i > 0 && t < sh.t0 + sh.xin) {
          into(actx, i - 1, t); into(bctx, i, t);
          // 缓冲区与画布同像素尺寸，在 1080×1920 坐标系下按 W×H 贴回即可一一对应
          ctx.setTransform(scale, 0, 0, scale, 0, 0);
          composite(ctx, A, B, E.inOut((t - sh.t0) / sh.xin), sh.tx);
        } else { into(ctx, i, t); }
        ctx.setTransform(scale, 0, 0, scale, 0, 0);
        if (!opts.overlayOnly) { ZG.vignette(ctx, 0.55); ZG.grain(ctx, tNew, ZG.GRAIN == null ? 0.07 : ZG.GRAIN); }
        if (opts.subtitles !== false) subtitles(ctx, tNew);
      },
    };
  };

  // 字体 + 素材就绪
  ZG.ready = async function (assetBase) {
    const fams = ['600 54px "ZG Serif"', '900 84px "ZG Serif"', '300 110px "ZG Serif"', '400 30px "ZG Sans"', '500 40px "ZG Sans"'];
    try { await Promise.all(fams.map((f) => document.fonts.load(f, '你以为还爱结局蔡格尼克效应0123'))); } catch (e) { /* 回退到系统字体 */ }
    try { await document.fonts.ready; } catch (e) { /* */ }
    await ZG.loadAssets(assetBase);
  };
})();
