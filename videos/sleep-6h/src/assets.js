/* =============================================================================
 * 素材加载：字体 + 真实照片 + 统一调色（Gradient Map）
 * -----------------------------------------------------------------------------
 * 照片在加载后会被预先调成几套"片调"，渲染时直接取缓存，不在每帧做滤镜：
 *   moon  月光蓝（主片调：深夜蓝黑 → 月光蓝 → 白）
 *   dusk  暮色紫粉（困倦 / 代价段落）
 *   dawn  黎明琥珀（解法段落）
 *   raw   原色
 * ========================================================================== */
(function () {
  const U = FX.U;

  /* ---------- 字体 ----------
   * 字体文件清单由 tools/build-fonts.mjs 生成（assets/fonts/fonts.js → FX.FONT_FILES），
   * 每条为 [字体族, 文件, 字重, unicode-range]。缺失时回退到系统字体。 */
  async function loadFonts(base) {
    const files = FX.FONT_FILES || [];
    const ok = {}, bad = {};
    await Promise.all(
      files.map(async ([family, file, weight, range]) => {
        const key = `${family} ${weight}`;
        try {
          const ff = new FontFace(family, `url(${base}fonts/${file})`, { weight, unicodeRange: range });
          await ff.load();
          document.fonts.add(ff);
          ok[key] = (ok[key] || 0) + 1;
        } catch (e) {
          bad[key] = (bad[key] || 0) + 1;
        }
      })
    );
    const report = Object.keys(ok).map((k) => `${k} ✓`);
    Object.keys(bad).forEach((k) => report.push(`${k} ✗（${bad[k]} 个文件加载失败，回退系统字体）`));
    if (!files.length) report.push('未找到字体清单，使用系统字体');
    return report;
  }

  /* ---------- 片调（Gradient Map） ---------- */
  const GRADES = {
    moon: [[0, '#02030a'], [0.25, '#0d1440'], [0.55, '#3f58b8'], [0.8, '#a9c3ff'], [0.94, '#e6edff'], [1, '#ffffff']],
    dusk: [[0, '#050210'], [0.28, '#251040'], [0.55, '#7a3f97'], [0.8, '#f29ad0'], [1, '#fff2fa']],
    dawn: [[0, '#0a0408'], [0.3, '#3a1530'], [0.58, '#c0604f'], [0.82, '#ffcb8f'], [1, '#fffaf0']],
    mono: [[0, '#000000'], [1, '#ffffff']],
  };

  function buildLUT(stops) {
    const lut = new Uint8ClampedArray(256 * 3);
    for (let i = 0; i < 256; i++) {
      const x = i / 255;
      let k = 0;
      while (k < stops.length - 2 && x > stops[k + 1][0]) k++;
      const [x0, c0] = stops[k], [x1, c1] = stops[k + 1];
      const f = U.clamp((x - x0) / (x1 - x0 || 1));
      const a = U.hexToRgb(c0), b = U.hexToRgb(c1);
      lut[i * 3] = a[0] + (b[0] - a[0]) * f;
      lut[i * 3 + 1] = a[1] + (b[1] - a[1]) * f;
      lut[i * 3 + 2] = a[2] + (b[2] - a[2]) * f;
    }
    return lut;
  }
  const LUTS = {};
  for (const k in GRADES) LUTS[k] = buildLUT(GRADES[k]);

  /** 对一张源画布做 gradient map 调色（对比度 1.22，轻微压暗） */
  function gradeCanvas(src, grade) {
    const c = U.canvas(src.width, src.height);
    const g = c.getContext('2d', { willReadFrequently: true });
    g.drawImage(src, 0, 0);
    if (grade === 'raw') return c;
    const lut = LUTS[grade];
    const id = g.getImageData(0, 0, c.width, c.height);
    const d = id.data;
    // 轻度 USM 锐化：图库原图最长边只有 1024px，竖屏全屏会放大 2~3 倍，先锐化再放大更清楚
    const bc = U.canvas(c.width, c.height);
    const bg = bc.getContext('2d', { willReadFrequently: true });
    bg.filter = 'blur(1.6px)';
    bg.drawImage(src, 0, 0);
    const bd = bg.getImageData(0, 0, c.width, c.height).data;
    const lum = (a, i) => (a[i] * 0.2126 + a[i + 1] * 0.7152 + a[i + 2] * 0.0722) / 255;
    for (let i = 0; i < d.length; i += 4) {
      let l = lum(d, i);
      l += 0.75 * (l - lum(bd, i));
      l = U.clamp((l - 0.5) * 1.22 + 0.47); // 对比度 + 轻微压暗
      const j = (l * 255) | 0;
      d[i] = lut[j * 3];
      d[i + 1] = lut[j * 3 + 1];
      d[i + 2] = lut[j * 3 + 2];
    }
    g.putImageData(id, 0, 0);
    return c;
  }

  /* ---------- 缺图占位：明确标注"这里需要一张真实照片" ---------- */
  function placeholder(id, meta) {
    const c = U.canvas(1200, 1600);
    const g = c.getContext('2d');
    const grd = g.createLinearGradient(0, 0, 1200, 1600);
    grd.addColorStop(0, '#2a2f3a');
    grd.addColorStop(1, '#0d1016');
    g.fillStyle = grd;
    g.fillRect(0, 0, 1200, 1600);
    // 斜线纹理
    g.strokeStyle = 'rgba(255,255,255,0.05)';
    g.lineWidth = 18;
    for (let x = -1600; x < 1200; x += 70) {
      g.beginPath();
      g.moveTo(x, 0);
      g.lineTo(x + 1600, 1600);
      g.stroke();
    }
    g.strokeStyle = 'rgba(255,255,255,0.35)';
    g.lineWidth = 6;
    g.setLineDash([30, 20]);
    g.strokeRect(40, 40, 1120, 1520);
    g.setLineDash([]);
    g.fillStyle = 'rgba(255,255,255,0.32)';
    g.textAlign = 'center';
    g.font = U.font(700, 40, 'mono');
    g.fillText('NO SIGNAL · 待放入真实照片', 600, 700);
    g.font = U.font(700, 32, 'mono');
    g.fillStyle = 'rgba(255,255,255,0.26)';
    g.fillText('assets/photos/' + meta.file, 600, 760);
    // 拍摄要求（自动换行）
    g.font = U.font(400, 30, 'cn');
    g.fillStyle = 'rgba(255,255,255,0.22)';
    const words = Array.from(meta.shot || '');
    let line = '', y = 840;
    for (const ch of words) {
      if (g.measureText(line + ch).width > 900) {
        g.fillText(line, 600, y);
        y += 44;
        line = '';
      }
      line += ch;
    }
    if (line) g.fillText(line, 600, y);
    return c;
  }

  /* ---------- 照片库 ---------- */
  const store = {}; // id -> { src: canvas, real: bool, meta, graded: {} }
  const MAX_SIDE = 2000;

  function loadImage(url) {
    return new Promise((res) => {
      const img = new Image();
      img.onload = () => res(img);
      img.onerror = () => res(null);
      img.src = url;
    });
  }

  async function loadPhotos(base) {
    const report = [];
    const ids = Object.keys(FX.PHOTOS || {});
    await Promise.all(
      ids.map(async (id) => {
        const meta = FX.PHOTOS[id];
        const img = await loadImage(`${base}photos/${meta.file}`);
        let src;
        if (img) {
          // 统一缩到长边 ≤ 2000px，控制内存
          const s = Math.min(1, MAX_SIDE / Math.max(img.naturalWidth, img.naturalHeight));
          src = U.canvas(img.naturalWidth * s, img.naturalHeight * s);
          src.getContext('2d').drawImage(img, 0, 0, src.width, src.height);
          report.push(`${meta.file} ✓ ${img.naturalWidth}×${img.naturalHeight}`);
        } else {
          src = placeholder(id, meta);
          report.push(`${meta.file} ✗ 缺失（显示占位）`);
        }
        store[id] = { src, real: !!img, meta, graded: {} };
      })
    );
    return report;
  }

  function graded(id, grade) {
    const e = store[id];
    if (!e) return null;
    if (!e.graded[grade]) e.graded[grade] = gradeCanvas(e.src, grade);
    return e.graded[grade];
  }

  /**
   * 绘制照片（cover 填充 + 焦点构图 + 推拉）
   * @param o.grade  片调
   * @param o.zoom   ≥1，推镜倍率
   * @param o.dx/dy  平移（相对可视区域的比例）
   * @param o.fx/fy  焦点覆盖（默认用清单里的 focus）
   * @returns 映射函数 (nx, ny) => [屏幕x, 屏幕y]，用来把 HUD 准星钉在人脸上
   */
  function draw(ctx, id, x, y, w, h, o = {}) {
    const e = store[id];
    if (!e) return () => [x + w / 2, y + h / 2];
    const img = graded(id, o.grade || 'moon');
    const iw = img.width, ih = img.height;
    const zoom = Math.max(1, o.zoom || 1);
    const scale = Math.max(w / iw, h / ih) * zoom;
    const sw = w / scale, sh = h / scale;
    const fx = o.fx != null ? o.fx : e.meta.focus.x;
    const fy = o.fy != null ? o.fy : e.meta.focus.y;
    const cx = fx * iw + (o.dx || 0) * sw;
    const cy = fy * ih + (o.dy || 0) * sh;
    const sx = U.clamp(cx - sw / 2, 0, Math.max(0, iw - sw));
    const sy = U.clamp(cy - sh / 2, 0, Math.max(0, ih - sh));
    ctx.imageSmoothingQuality = 'high';
    if (o.alpha != null && o.alpha < 1) {
      ctx.save();
      ctx.globalAlpha *= o.alpha;
      ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
      ctx.restore();
    } else {
      ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
    }
    return (nx, ny) => [x + (nx * iw - sx) * scale, y + (ny * ih - sy) * scale];
  }

  FX.Assets = {
    async load(base = 'assets/') {
      const fonts = await loadFonts(base);
      const photos = await loadPhotos(base);
      return { fonts, photos };
    },
  };

  FX.photo = {
    draw,
    graded,
    has: (id) => !!(store[id] && store[id].real),
    meta: (id) => (store[id] ? store[id].meta : null),
    face: (id) => (store[id] && store[id].meta.face) || null,
  };
})();
