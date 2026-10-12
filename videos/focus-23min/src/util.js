/* =============================================================================
 * 工具库：缓动曲线 / 确定性随机 / 噪声 / 时间包络 / 文字辅助
 * -----------------------------------------------------------------------------
 * 关键原则：画面是时间 t 的纯函数。任何"随机"都来自 hash(seed)，
 * 因此任意一帧都能被单独、重复地渲染（逐帧导出、拖动进度条都不会抖动）。
 * ========================================================================== */
(function () {
  const U = (FX.U = {});

  U.clamp = (x, a = 0, b = 1) => (x < a ? a : x > b ? b : x);
  U.lerp = (a, b, t) => a + (b - a) * t;
  /** 把 x 从 [a,b] 映射到 [0,1] 并夹紧 —— 动画进度的基本单位 */
  U.inv = (a, b, x) => U.clamp((x - a) / (b - a));
  U.mix = (a, b, t) => a + (b - a) * t;
  U.TAU = Math.PI * 2;

  /* ---------- 缓动曲线 ---------- */
  const E = (U.ease = {
    linear: (x) => x,
    inQuad: (x) => x * x,
    outQuad: (x) => 1 - (1 - x) * (1 - x),
    inOutQuad: (x) => (x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2),
    inCubic: (x) => x * x * x,
    outCubic: (x) => 1 - Math.pow(1 - x, 3),
    inOutCubic: (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2),
    outQuart: (x) => 1 - Math.pow(1 - x, 4),
    inQuart: (x) => x * x * x * x,
    inOutQuart: (x) => (x < 0.5 ? 8 * x * x * x * x : 1 - Math.pow(-2 * x + 2, 4) / 2),
    outExpo: (x) => (x >= 1 ? 1 : 1 - Math.pow(2, -10 * x)),
    inExpo: (x) => (x <= 0 ? 0 : Math.pow(2, 10 * x - 10)),
    inOutExpo: (x) =>
      x <= 0 ? 0 : x >= 1 ? 1 : x < 0.5 ? Math.pow(2, 20 * x - 10) / 2 : (2 - Math.pow(2, -20 * x + 10)) / 2,
    outBack: (x, s = 1.70158) => 1 + (s + 1) * Math.pow(x - 1, 3) + s * Math.pow(x - 1, 2),
    inBack: (x, s = 1.70158) => (s + 1) * x * x * x - s * x * x,
    outElastic: (x) =>
      x <= 0 ? 0 : x >= 1 ? 1 : Math.pow(2, -10 * x) * Math.sin((x * 10 - 0.75) * ((2 * Math.PI) / 3)) + 1,
    inOutSine: (x) => -(Math.cos(Math.PI * x) - 1) / 2,
    outSine: (x) => Math.sin((x * Math.PI) / 2),
  });

  /** 进度 + 缓动：在 [a,b] 区间内从 0 走到 1 */
  U.p = (t, a, b, ease = E.outCubic) => ease(U.inv(a, b, t));

  /** 进入-保持-退出 包络：返回 0..1 （常用于元素出现/消失） */
  U.inOut = (t, a, b, fadeIn = 0.3, fadeOut = 0.3, easeIn = E.outCubic, easeOut = E.inCubic) => {
    if (t < a || t > b) return 0;
    const i = fadeIn > 0 ? easeIn(U.inv(a, a + fadeIn, t)) : 1;
    const o = fadeOut > 0 ? 1 - easeOut(U.inv(b - fadeOut, b, t)) : 1;
    return Math.min(i, o);
  };

  /** 冲击包络：在 at 时刻瞬间拉满，之后指数衰减（闪白、震屏、色散冲击） */
  U.hit = (t, at, decay = 0.25, attack = 0.012) => {
    if (t < at - attack) return 0;
    if (t < at) return (t - (at - attack)) / attack;
    return Math.exp(-(t - at) / decay);
  };

  /* ---------- 确定性随机 ---------- */
  /** 32bit 整数哈希 → [0,1) */
  U.hash = (n) => {
    let x = n | 0;
    x = Math.imul(x ^ (x >>> 16), 0x45d9f3b);
    x = Math.imul(x ^ (x >>> 16), 0x45d9f3b);
    x ^= x >>> 16;
    return (x >>> 0) / 4294967296;
  };
  /** 两个整数种子组合 */
  U.rnd = (a, b = 0) => U.hash(Math.imul(a | 0, 73856093) ^ Math.imul(b | 0, 19349663) ^ 0x5bd1e995);
  /** 区间随机 */
  U.rr = (a, b, lo, hi) => lo + (hi - lo) * U.rnd(a, b);
  /** 可复现的伪随机序列生成器（用于一次性生成几何，如碎片三角形） */
  U.prng = (seed) => {
    let s = seed >>> 0 || 1;
    return () => {
      s ^= s << 13; s >>>= 0;
      s ^= s >>> 17;
      s ^= s << 5; s >>>= 0;
      return s / 4294967296;
    };
  };

  /** 1D 平滑值噪声（-1..1），用于手持感漂移、抖动 */
  U.noise = (x, seed = 0) => {
    const i = Math.floor(x), f = x - i;
    const a = U.rnd(i, seed) * 2 - 1, b = U.rnd(i + 1, seed) * 2 - 1;
    const s = f * f * (3 - 2 * f);
    return a + (b - a) * s;
  };
  /** 分形噪声 */
  U.fbm = (x, seed = 0) => U.noise(x, seed) * 0.6 + U.noise(x * 2.1, seed + 7) * 0.3 + U.noise(x * 4.3, seed + 13) * 0.1;

  /* ---------- 节拍 ---------- */
  U.beatLen = () => 60 / FX.CFG.BPM;
  /** 节拍包络：每拍开头为 1，随后衰减 —— 让画面随音乐"呼吸" */
  U.beatPulse = (t, decay = 0.12, every = 1) => {
    const bl = U.beatLen() * every;
    const ph = ((t % bl) + bl) % bl;
    return Math.exp(-ph / decay);
  };

  /* ---------- 文字 ---------- */
  const GLYPHS = '01#%&@$*+=<>/\\|ABCDEFGHJKLMNPQRSTUVWXYZ▓▒░█';
  /**
   * 解码文字效果：p 从 0→1 时，字符从左到右依次"锁定"为正确字符，
   * 未锁定的位置显示随机符号（每 1/24 秒换一次）。
   */
  U.scramble = (text, p, t, seed = 1) => {
    const chars = Array.from(text);
    const n = chars.length;
    const locked = Math.floor(p * (n + 0.999));
    const tick = Math.floor(t * 24);
    let out = '';
    for (let i = 0; i < n; i++) {
      const c = chars[i];
      if (i < locked || c === ' ' || p >= 1) out += c;
      else out += GLYPHS[Math.floor(U.rnd(tick * 31 + i, seed) * GLYPHS.length)];
    }
    return out;
  };

  /** 数字补零 */
  U.pad = (n, len = 2) => String(Math.max(0, Math.floor(n))).padStart(len, '0');

  /** 字体字符串 */
  U.font = (weight, size, fam = 'cn') => `${weight} ${size}px ${FX.CFG.FONT[fam]}`;

  /** 颜色：hex → rgba */
  U.rgba = (hex, a = 1) => {
    const h = hex.replace('#', '');
    const v = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
    return `rgba(${(v >> 16) & 255},${(v >> 8) & 255},${v & 255},${a})`;
  };
  U.hexToRgb = (hex) => {
    const v = parseInt(hex.replace('#', ''), 16);
    return [(v >> 16) & 255, (v >> 8) & 255, v & 255];
  };

  /** 圆角矩形路径 */
  U.rrect = (ctx, x, y, w, h, r) => {
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  };

  /** 创建离屏画布 */
  U.canvas = (w, h) => {
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(w));
    c.height = Math.max(1, Math.round(h));
    return c;
  };
})();
