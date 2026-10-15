// 基础工具：缓动、确定性随机、发光贴图、光环母题、线、粒子、字幕排版、胶片质感。
// 所有绘制都是时间的纯函数：同一个 t 永远画出同一帧，方便逐帧导出和拖动预览。
(function () {
  const ZG = (window.ZG = window.ZG || {});
  const W = 1080, H = 1920;

  const C = (ZG.C = {
    night: '#05070D', ink: '#0A1222', navy: '#111C31', cold: '#6FA8C9', coldDim: '#26445C',
    amber: '#FFB547', amberHi: '#FFD9A0', amberDeep: '#D9701C', paper: '#EFE3CC',
    white: '#F4EEE4', dawnPeach: '#F2B79E', dawnBlue: '#9DB8D8', sepia: '#2A1D12',
  });

  ZG.FONT = {
    serif: '"ZG Serif", "Noto Serif SC", "Source Han Serif SC", "Songti SC", "STSong", serif',
    sans: '"ZG Sans", "Noto Sans SC", "PingFang SC", "Microsoft YaHei", "WenQuanYi Zen Hei", sans-serif',
  };

  // ---------- 数学 ----------
  const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
  const lerp = (a, b, t) => a + (b - a) * t;
  const inv = (a, b, x) => clamp((x - a) / (b - a));
  const E = {
    inOut: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
    out: (t) => 1 - Math.pow(1 - t, 3),
    in: (t) => t * t * t,
    outExpo: (t) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t)),
    inExpo: (t) => (t <= 0 ? 0 : Math.pow(2, 10 * t - 10)),
    outBack: (t) => { const c = 1.7; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); },
    smooth: (t) => t * t * (3 - 2 * t),
  };
  function hash(n) { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); }
  function rng(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) >>> 0; let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function noise(x) { const i = Math.floor(x), f = x - i; return lerp(hash(i), hash(i + 1), E.smooth(f)) * 2 - 1; }
  Object.assign(ZG, { clamp, lerp, inv, E, hash, rng, noise, W, H });

  // ---------- 颜色 ----------
  function hex(h) { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
  ZG.rgba = (h, a) => { const [r, g, b] = hex(h); return `rgba(${r},${g},${b},${a})`; };
  ZG.mix = (h1, h2, t) => {
    const a = hex(h1), b = hex(h2);
    return '#' + a.map((v, i) => Math.round(lerp(v, b[i], clamp(t))).toString(16).padStart(2, '0')).join('');
  };

  // ---------- 发光贴图（代替昂贵的 shadowBlur） ----------
  const glowCache = {};
  function glowSprite(color) {
    if (glowCache[color]) return glowCache[color];
    const c = document.createElement('canvas'); c.width = c.height = 128;
    const g = c.getContext('2d'); const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    gr.addColorStop(0, ZG.rgba(color, 1)); gr.addColorStop(0.25, ZG.rgba(color, 0.55));
    gr.addColorStop(0.6, ZG.rgba(color, 0.12)); gr.addColorStop(1, ZG.rgba(color, 0));
    g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
    return (glowCache[color] = c);
  }
  ZG.glow = function (ctx, x, y, r, color, a = 1) {
    if (a <= 0.003 || r <= 0) return;
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = clamp(a);
    ctx.drawImage(glowSprite(color), x - r, y - r, r * 2, r * 2); ctx.restore();
  };

  ZG.vgrad = function (ctx, top, bottom, a = 1) {
    const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, top); g.addColorStop(1, bottom);
    ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); ctx.restore();
  };

  // 发光描边：先画几层宽而淡的光晕，再画芯线
  ZG.glowStroke = function (ctx, pathFn, color, w, a = 1, glowAmt = 1) {
    ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.globalCompositeOperation = 'lighter';
    [[7, 0.05], [3.5, 0.1], [1.8, 0.22]].forEach(([k, al]) => {
      ctx.globalAlpha = clamp(a * al * glowAmt); ctx.strokeStyle = color; ctx.lineWidth = w * k;
      ctx.beginPath(); pathFn(ctx); ctx.stroke();
    });
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = clamp(a); ctx.strokeStyle = ZG.mix(color, '#FFFFFF', 0.35); ctx.lineWidth = w;
    ctx.beginPath(); pathFn(ctx); ctx.stroke(); ctx.restore();
  };

  // ---------- 母题：没有闭合的光环 ----------
  // gap: 缺口弧度（0 = 闭合）；close: 0..1 闭合进度；pulse: 缺口两端的呼吸光
  ZG.ring = function (ctx, x, y, r, o = {}) {
    const gap = o.gap == null ? 1.0 : o.gap, rot = o.rot || 0, a = o.a == null ? 1 : o.a;
    const w = o.w || Math.max(3, r * 0.045), color = o.color || C.amber;
    if (a <= 0.003) return;
    const s = rot - Math.PI / 2 + gap / 2, e = rot - Math.PI / 2 + Math.PI * 2 - gap / 2;
    ZG.glow(ctx, x, y, r * 2.1, color, a * 0.16 * (o.halo == null ? 1 : o.halo));
    ZG.glowStroke(ctx, (c) => c.arc(x, y, r, s, e), color, w, a, o.glowAmt || 1.2);
    if (gap > 0.02) {
      const pulse = 0.65 + 0.35 * Math.sin((o.t || 0) * 5.2);
      [s, e].forEach((ang) => {
        const px = x + Math.cos(ang) * r, py = y + Math.sin(ang) * r;
        ZG.glow(ctx, px, py, w * 7 * pulse, C.amberHi, a * 0.9);
      });
    }
  };

  // 句号：实心光点
  ZG.dot = function (ctx, x, y, r, a = 1, color = C.amberHi) {
    ZG.glow(ctx, x, y, r * 6, color, a * 0.5);
    ctx.save(); ctx.globalAlpha = clamp(a); ctx.fillStyle = ZG.mix(color, '#FFFFFF', 0.5);
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  };

  // ---------- 粒子 ----------
  // 爆散：从一点向外，随后向上飘（像灰烬/金粉）
  ZG.burst = function (ctx, seed, x, y, t, o = {}) {
    if (t < 0) return;
    const n = o.n || 80, spread = o.spread || 260, life = o.life || 1.6, color = o.color || C.amberHi;
    const R = rng(seed);
    for (let i = 0; i < n; i++) {
      const ang = R() * Math.PI * 2, sp = spread * (0.25 + R() * 0.75), lf = life * (0.5 + R() * 0.7);
      const k = clamp(t / lf); if (k >= 1) { R(); continue; }
      const d = E.outExpo(k) * sp;
      const px = x + Math.cos(ang) * d + noise(i * 3.1 + t * 1.3) * 18;
      const py = y + Math.sin(ang) * d * (o.flat || 1) - t * t * (o.rise || 60) * (0.4 + R() * 0.6);
      const sz = (o.size || 6) * (0.4 + R() * 0.9) * (1 - k * 0.6);
      ZG.glow(ctx, px, py, sz * 3, color, (1 - k) * (o.a || 1));
    }
  };
  // 汇聚：粒子从四周收拢到目标点
  ZG.converge = function (ctx, seed, x, y, k, o = {}) {
    const n = o.n || 120, R = rng(seed), color = o.color || C.amber;
    for (let i = 0; i < n; i++) {
      const ang = R() * Math.PI * 2, d0 = (o.radius || 900) * (0.4 + R() * 0.8), delay = R() * 0.35;
      const kk = E.inOut(clamp((k - delay) / (1 - delay)));
      const tx = x + (o.tx ? o.tx(i, R) : 0), ty = y + (o.ty ? o.ty(i, R) : 0);
      const px = lerp(x + Math.cos(ang) * d0, tx, kk), py = lerp(y + Math.sin(ang) * d0, ty, kk);
      const swirl = (1 - kk) * 120;
      ZG.glow(ctx, px + Math.cos(ang + 1.57) * swirl, py + Math.sin(ang + 1.57) * swirl,
        (o.size || 5) * (1 + R()), color, (o.a || 1) * (0.25 + 0.75 * Math.sin(kk * Math.PI * 0.999 + 0.0001)));
    }
  };
  // 环境浮尘
  ZG.dust = function (ctx, seed, n, t, a = 0.5, color = C.amberHi, area) {
    const R = rng(seed), ar = area || [0, 0, W, H];
    for (let i = 0; i < n; i++) {
      const bx = ar[0] + R() * ar[2], by = ar[1] + R() * ar[3], sp = 6 + R() * 18, ph = R() * 10;
      const x = bx + noise(ph + t * 0.25) * 40, y = ((by - t * sp) % ar[3] + ar[3]) % ar[3] + ar[1];
      const tw = 0.4 + 0.6 * Math.abs(Math.sin(ph + t * (0.6 + R())));
      ZG.glow(ctx, x, y, 3 + R() * 7, color, a * tw);
    }
  };

  // ---------- 胶片质感 ----------
  let grainTiles = null, vig = null;
  function initGrain() {
    grainTiles = [0, 1, 2, 3].map((k) => {
      const c = document.createElement('canvas'); c.width = c.height = 256;
      const g = c.getContext('2d'), img = g.createImageData(256, 256), R = rng(99 + k);
      for (let i = 0; i < img.data.length; i += 4) {
        const v = R() * 255; img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = 255;
      }
      g.putImageData(img, 0, 0); return c;
    });
  }
  ZG.grain = function (ctx, t, a = 0.06) {
    if (!grainTiles) initGrain();
    const tile = grainTiles[Math.floor(t * 24) % 4];
    ctx.save(); ctx.globalAlpha = a; ctx.globalCompositeOperation = 'overlay';
    const ox = Math.floor(hash(Math.floor(t * 24)) * 256);
    for (let y = -256; y < H; y += 256) for (let x = -256; x < W; x += 256) ctx.drawImage(tile, x + ox % 256, y + ox % 256);
    ctx.restore();
  };
  ZG.vignette = function (ctx, a = 0.75) {
    if (!vig) {
      vig = document.createElement('canvas'); vig.width = W; vig.height = H;
      const g = vig.getContext('2d'), gr = g.createRadialGradient(W / 2, H * 0.48, H * 0.18, W / 2, H * 0.5, H * 0.72);
      gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,1)'); g.fillStyle = gr; g.fillRect(0, 0, W, H);
    }
    ctx.save(); ctx.globalAlpha = a; ctx.drawImage(vig, 0, 0); ctx.restore();
  };

  // ---------- 文字 ----------
  ZG.font = (ctx, size, weight = 600, fam = 'serif') => { ctx.font = `${weight} ${size}px ${ZG.FONT[fam]}`; };
  // 带高亮词的一行字，居中。返回宽度
  ZG.richText = function (ctx, text, hl, cx, y, o = {}) {
    const size = o.size || 56, base = o.color || C.white, hc = o.hl || C.amber;
    ZG.font(ctx, size, o.weight || 600, o.fam || 'serif');
    ctx.save(); ctx.letterSpacing = (o.ls || 2) + 'px'; ctx.textBaseline = 'middle';
    const segs = []; let rest = text;
    while (rest.length) {
      let best = -1, word = '';
      (hl || []).forEach((w) => { const i = rest.indexOf(w); if (i >= 0 && (best < 0 || i < best)) { best = i; word = w; } });
      if (best < 0) { segs.push([rest, false]); break; }
      if (best > 0) segs.push([rest.slice(0, best), false]);
      segs.push([word, true]); rest = rest.slice(best + word.length);
    }
    const widths = segs.map(([s]) => ctx.measureText(s).width), total = widths.reduce((a, b) => a + b, 0);
    let x = cx - total / 2;
    segs.forEach(([s, isH], i) => {
      if (o.shadow !== false) { ctx.shadowColor = 'rgba(0,0,0,0.65)'; ctx.shadowBlur = 18; }
      ctx.globalAlpha = o.a == null ? 1 : o.a;
      ctx.fillStyle = isH ? hc : base; ctx.fillText(s, x, y);
      if (isH && o.glowHL !== false) { ctx.shadowBlur = 0; ZG.glow(ctx, x + widths[i] / 2, y, widths[i] * 0.55, hc, 0.12 * (o.a == null ? 1 : o.a)); }
      x += widths[i];
    });
    ctx.restore(); return total;
  };
  ZG.label = function (ctx, text, x, y, o = {}) {
    ZG.font(ctx, o.size || 24, o.weight || 400, o.fam || 'sans');
    ctx.save(); ctx.letterSpacing = (o.ls == null ? 4 : o.ls) + 'px'; ctx.globalAlpha = o.a == null ? 1 : o.a;
    ctx.fillStyle = o.color || C.white; ctx.textAlign = o.align || 'left'; ctx.textBaseline = 'middle';
    ctx.fillText(text, x, y); ctx.restore();
  };

  // ---------- 素材位（AI 拟真镜头的占位取景框） ----------
  ZG.placeholder = function (ctx, shot, lt) {
    const m = 70, L = 64, a = 0.55;
    ctx.save(); ctx.strokeStyle = ZG.rgba(C.white, a * 0.6); ctx.lineWidth = 3;
    [[m, m, 1, 1], [W - m, m, -1, 1], [m, H - m, 1, -1], [W - m, H - m, -1, -1]].forEach(([x, y, sx, sy]) => {
      ctx.beginPath(); ctx.moveTo(x, y + L * sy); ctx.lineTo(x, y); ctx.lineTo(x + L * sx, y); ctx.stroke();
    });
    ctx.restore();
    const blink = Math.floor(lt * 2) % 2 === 0 ? 1 : 0.35;
    ZG.glow(ctx, m + 22, m + 52, 16, '#FF5A4E', 0.7 * blink);
    ZG.label(ctx, `${shot.id}  ·  AI 拟真素材位`, m + 46, m + 52, { size: 26, a: 0.85, ls: 3 });
    ZG.label(ctx, shot.name, m + 46, m + 94, { size: 34, weight: 500, a: 0.9, ls: 2 });
    ZG.label(ctx, shot.note, m + 46, m + 140, { size: 24, a: 0.55, ls: 1 });
  };

  // ---------- 点单小票 ----------
  ZG.slip = function (ctx, x, y, o = {}) {
    const w = o.w || 150, h = o.h || 210, a = o.a == null ? 1 : o.a; if (a <= 0.003) return;
    ctx.save(); ctx.translate(x, y); ctx.rotate(o.rot || 0); ctx.globalAlpha = a;
    ZG.glow(ctx, 0, 0, w * 1.3, C.amber, 0.35 * (o.glow == null ? 1 : o.glow));
    ctx.fillStyle = ZG.mix(C.paper, C.amberHi, 0.15); ctx.beginPath();
    ctx.moveTo(-w / 2, -h / 2); ctx.lineTo(w / 2, -h / 2); ctx.lineTo(w / 2, h / 2);
    for (let i = 0; i <= 8; i++) ctx.lineTo(w / 2 - (i * w) / 8, h / 2 + (i % 2 ? -8 : 0));
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = ZG.rgba(C.sepia, 0.55); ctx.lineWidth = 3; const R = rng(o.seed || 1);
    for (let i = 0; i < 5; i++) {
      const ly = -h / 2 + 70 + i * 26, lw = w * (0.45 + R() * 0.35);
      ctx.beginPath(); ctx.moveTo(-w / 2 + 18, ly);
      for (let k = 0; k <= 10; k++) ctx.lineTo(-w / 2 + 18 + (k * lw) / 10, ly + Math.sin(k * 2.3 + i) * 3);
      ctx.stroke();
    }
    ctx.restore();
    ctx.save(); ctx.translate(x, y); ctx.rotate(o.rot || 0);
    const close = o.close || 0, rr = w * 0.17;
    ZG.ring(ctx, 0, -h / 2 + 34, rr, { gap: lerp(1.1, 0, close), rot: (o.t || 0) * 0.8, w: 4, a: a, t: o.t, halo: 0.6 });
    ctx.restore();
  };
})();
