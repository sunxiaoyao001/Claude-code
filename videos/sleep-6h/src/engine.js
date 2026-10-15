/* =============================================================================
 * 渲染引擎：逐帧合成 + 全局叠加层（HUD / 章节条 / 字幕）+ 播放器 + 导出
 * -----------------------------------------------------------------------------
 * renderFrame(t) 是整个项目的核心：给定时间 t，确定性地画出一帧。
 *   1. 2D 画布：场景 → 全局 HUD → 章节条 → 字幕
 *   2. WebGL 后期：镜头/故障/色散/辉光/调色
 * 预览、拖动、实时录制（WebM）、无头逐帧导出（render.mjs）都调用同一个函数。
 * ========================================================================== */
(function () {
  const U = FX.U, E = U.ease, D = FX.D, C = FX.CFG.C, CFG = FX.CFG;

  /** 每个场景的强调色 */
  function sceneColor(t) {
    const id = FX.sceneAt(t).id;
    return { hook: C.pink, study: C.moon, curves: C.pink, debt: C.lav, cost: C.pink, fix: C.amber, cta: C.moon }[id] || C.moon;
  }

  /* ---------- 章节条 ---------- */
  function chapterStrip(ctx, t) {
    const ch = CFG.CHAPTERS.find((c) => t >= c.start && t < c.end);
    const vis = U.p(t, 10, 10.4) * (1 - U.p(t, 75.8, 76.2));
    if (!vis) return;
    const col = sceneColor(t);
    ctx.save();
    ctx.globalAlpha = vis;
    // 5 个章节圆点（当前章节的圆点会被进度"填满"）
    const y = 278;
    CFG.CHAPTERS.forEach((c, i) => {
      const p = U.inv(c.start, c.end, t);
      const x = 860 + i * 34;
      ctx.strokeStyle = U.rgba(C.ink, 0.35);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(x, y, 8, 0, U.TAU);
      ctx.stroke();
      if (p > 0) {
        ctx.fillStyle = col;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.arc(x, y, 8, -Math.PI / 2, -Math.PI / 2 + U.TAU * p);
        ctx.fill();
      }
    });
    if (ch) {
      const age = t - ch.start;
      const a = U.p(age, 0, 0.6);
      ctx.globalAlpha *= a;
      ctx.textBaseline = 'middle';
      ctx.textAlign = 'left';
      ctx.font = U.font(600, 24, 'display');
      ctx.fillStyle = col;
      ctx.fillText(`Ch.${ch.no}`, 64, y + 1);
      ctx.font = U.font(600, 30, 'serif');
      ctx.fillStyle = U.rgba(C.ink, 0.9);
      ctx.fillText(ch.name, 130, y + 1);
    }
    ctx.restore();
  }

  /* ---------- 字幕 ---------- */
  function splitLines(ctx, text, maxW) {
    if (ctx.measureText(text).width <= maxW) return [text];
    const chars = Array.from(text);
    const mid = chars.length / 2;
    let best = -1, bestD = 1e9;
    chars.forEach((c, i) => {
      if ('，；：、—？！'.includes(c)) {
        const d = Math.abs(i + 1 - mid);
        if (d < bestD) { bestD = d; best = i + 1; }
      }
    });
    if (best < 0) best = Math.ceil(mid);
    // 破折号成对保留在上一行
    if (chars[best] === '—') best++;
    return [chars.slice(0, best).join(''), chars.slice(best).join('')];
  }

  function subtitles(ctx, t) {
    const cue = CFG.SUBS.find((s) => t >= s.s && t < s.e);
    if (!cue) return;
    const lt = t - cue.s, dur = cue.e - cue.s;
    const a = U.p(lt, 0, 0.12) * (1 - U.p(lt, dur - 0.12, dur));
    if (a <= 0) return;
    const col = sceneColor(t);
    const size = 50;
    ctx.save();
    ctx.font = U.font(700, size, 'cn');
    const lines = splitLines(ctx, cue.t, 900);
    const lh = size * 1.32;
    const yBase = 1448 - (lines.length - 1) * lh;
    const widths = lines.map((l) => ctx.measureText(l).width);
    const bw = Math.max(...widths) + 64;
    const bh = lines.length * lh + 30;
    const by = yBase - size - 8;
    // 底板：毛玻璃药丸
    ctx.globalAlpha = a;
    U.rrect(ctx, 540 - bw / 2, by, bw, bh, 30);
    ctx.fillStyle = 'rgba(8,10,28,0.6)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(200,215,255,0.22)';
    ctx.lineWidth = 2;
    ctx.stroke();
    // 逐字出现（打字机，0.3s 内打完）
    const total = Array.from(cue.t).length;
    const shown = Math.ceil(total * U.p(lt, 0, 0.3, E.linear));
    let idx = 0;
    lines.forEach((line, li) => {
      const chars = Array.from(line);
      const mask = hlMask(line, cue.hl);
      let x = 540 - widths[li] / 2;
      const y = yBase + li * lh;
      chars.forEach((c, ci) => {
        const w = ctx.measureText(c).width;
        if (idx < shown) {
          ctx.fillStyle = mask[ci] ? col : '#ffffff';
          ctx.fillText(c, x, y);
        }
        x += w;
        idx++;
      });
    });
    ctx.restore();
  }
  function hlMask(str, hl) {
    const chars = Array.from(str), m = new Array(chars.length).fill(false);
    (hl || []).forEach((w) => {
      let i = str.indexOf(w);
      while (i >= 0) { for (let k = 0; k < w.length; k++) m[i + k] = true; i = str.indexOf(w, i + w.length); }
    });
    return m;
  }

  /* ---------- 抖音界面遮挡示意（仅预览） ---------- */
  function safeOverlay(ctx) {
    const S = CFG.SAFE;
    ctx.save();
    ctx.fillStyle = 'rgba(255,40,80,0.18)';
    ctx.fillRect(0, 0, 1080, S.top);
    ctx.fillRect(0, 1920 - S.bottom, 1080, S.bottom);
    ctx.fillRect(1080 - S.right, 860, S.right, 1920 - 860 - S.bottom);
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.lineWidth = 3;
    [940, 1080, 1220, 1360].forEach((y) => { ctx.beginPath(); ctx.arc(1080 - 85, y, 44, 0, U.TAU); ctx.stroke(); });
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.font = U.font(700, 30, 'cn');
    ctx.textAlign = 'left';
    ctx.fillText('@账号名  ·  视频标题文案区域', 40, 1920 - S.bottom + 90);
    ctx.fillText('推荐   关注   同城', 380, 110);
    ctx.restore();
  }

  /* =======================================================================
   * 引擎
   * ===================================================================== */
  const Engine = (FX.Engine = {
    scale: 1,
    showSafe: false,
    postOn: true,

    init(out, scale = 1) {
      this.scale = scale;
      const w = Math.round(CFG.W * scale), h = Math.round(CFG.H * scale);
      out.width = w;
      out.height = h;
      this.out = out;
      this.work = U.canvas(w, h);
      this.ctx = this.work.getContext('2d');
      this.post = FX.createPost(out, w, h);
    },

    /** 渲染 t 时刻的一帧 */
    renderFrame(t) {
      t = U.clamp(t, 0, CFG.DURATION - 1e-4);
      const ctx = this.ctx, s = this.scale;
      const P = FX.defaultPost();
      ctx.setTransform(s, 0, 0, s, 0, 0);
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = C.bg;
      ctx.fillRect(0, 0, CFG.W, CFG.H);

      const sc = FX.sceneAt(t);
      ctx.save();
      FX.S[sc.id](ctx, t - sc.start, t, P);
      ctx.restore();

      ctx.setTransform(s, 0, 0, s, 0, 0);
      ctx.globalAlpha = 1;
      // 全局叠加层（片头和碎裂瞬间弱化 HUD）
      D.nightHud(ctx, t, { alpha: 0.85 * (1 - U.inOut(t, 60.6, 64.2, 0.4, 0.4)) });
      chapterStrip(ctx, t);
      subtitles(ctx, t);
      if (this.showSafe) safeOverlay(ctx);

      if (this.postOn) this.post.render(this.work, P, t);
      else this.post.render(this.work, FX.defaultPostNeutral(), t);
    },
  });

  /** 关闭后期时用的中性参数 */
  FX.defaultPostNeutral = () =>
    Object.assign(FX.defaultPost(), { barrel: 0, chroma: 0, bloom: 0, scan: 0, vig: 0, grain: 0, sat: 1, contrast: 1 });

  /* =======================================================================
   * 播放器（预览页面）
   * ===================================================================== */
  FX.Player = {
    t: 0,
    playing: false,
    audioBuf: null,
    actx: null,
    src: null,
    startAt: 0,
    startT: 0,
    listeners: [],

    async init(buf) {
      this.audioBuf = buf;
    },
    onTick(fn) { this.listeners.push(fn); },
    now() {
      if (!this.playing) return this.t;
      if (this.actx && this.src) return this.startT + (this.actx.currentTime - this.startAt);
      return this.startT + (performance.now() - this.startAt) / 1000;
    },
    play(extraDest) {
      if (this.playing) return;
      if (this.t >= CFG.DURATION - 0.05) this.t = 0;
      this.playing = true;
      this.startT = this.t;
      if (this.audioBuf) {
        this.actx = this.actx || new AudioContext({ sampleRate: this.audioBuf.sampleRate });
        this.actx.resume();
        this.src = this.actx.createBufferSource();
        this.src.buffer = this.audioBuf;
        this.src.connect(this.actx.destination);
        if (extraDest) this.src.connect(extraDest);
        this.startAt = this.actx.currentTime + 0.03;
        this.src.start(this.startAt, this.t);
      } else {
        this.startAt = performance.now();
      }
      const loop = () => {
        if (!this.playing) return;
        this.t = this.now();
        if (this.t >= CFG.DURATION) {
          this.t = CFG.DURATION;
          this.pause();
          this.listeners.forEach((f) => f(this.t, true));
          return;
        }
        Engine.renderFrame(this.t);
        this.listeners.forEach((f) => f(this.t, false));
        requestAnimationFrame(loop);
      };
      requestAnimationFrame(loop);
    },
    pause() {
      if (!this.playing) return;
      this.t = Math.min(CFG.DURATION, this.now());
      this.playing = false;
      if (this.src) { try { this.src.stop(); } catch (e) {} this.src.disconnect(); this.src = null; }
    },
    seek(t) {
      const was = this.playing;
      this.pause();
      this.t = U.clamp(t, 0, CFG.DURATION);
      Engine.renderFrame(this.t);
      this.listeners.forEach((f) => f(this.t, false));
      if (was) this.play();
    },

    /** 实时录制 WebM（浏览器内导出，速度 = 1x 实时） */
    async recordWebM(onProgress) {
      this.pause();
      this.t = 0;
      this.actx = this.actx || new AudioContext({ sampleRate: this.audioBuf.sampleRate });
      const dest = this.actx.createMediaStreamDestination();
      const stream = new MediaStream([...Engine.out.captureStream(CFG.FPS).getVideoTracks(), ...dest.stream.getAudioTracks()]);
      const mime = ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm'].find((m) => MediaRecorder.isTypeSupported(m));
      const rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 16e6, audioBitsPerSecond: 256e3 });
      const chunks = [];
      rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
      const done = new Promise((res) => (rec.onstop = res));
      rec.start(250);
      const stopFn = (t, ended) => { onProgress && onProgress(t / CFG.DURATION); if (ended && rec.state !== 'inactive') rec.stop(); };
      this.listeners.push(stopFn);
      this.play(dest);
      await done;
      this.listeners = this.listeners.filter((f) => f !== stopFn);
      return new Blob(chunks, { type: 'video/webm' });
    },
  };

  /* =======================================================================
   * 启动 & 无头渲染接口（供 render.mjs 调用）
   * ===================================================================== */
  FX.boot = async function (out, opts = {}) {
    const report = await FX.Assets.load(opts.base || 'assets/');
    Engine.init(out, opts.scale || 1);
    let audio = null;
    if (opts.audio !== false) audio = await FX.Audio.render(48000);
    await FX.Player.init(audio);
    Engine.renderFrame(opts.t || 0);
    return { report, audio, webgl: Engine.post.webgl };
  };

  // 逐帧导出：渲染并返回 JPEG/PNG 的 base64
  window.__renderFrame = (t, type = 'image/jpeg', q = 0.94) => {
    Engine.renderFrame(t);
    return Engine.out.toDataURL(type, q).split(',')[1];
  };
  // 导出音频 WAV 的 base64（分块编码，避免超长字符串拼接）
  window.__getAudioWav = async () => {
    const buf = FX.Player.audioBuf || (await FX.Audio.render(48000));
    const bytes = new Uint8Array(FX.Audio.toWav(buf));
    let s = '';
    for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    return btoa(s);
  };
})();
