/* =============================================================================
 * 音频引擎：120 BPM 赛博合成波配乐 + 全套音效（全部程序化合成，无版权风险）
 * -----------------------------------------------------------------------------
 * 用 OfflineAudioContext 一次性离线渲染 80 秒立体声（48kHz），然后：
 *   · 预览时：AudioBufferSourceNode 从任意时间点播放（拖动进度条也能声画同步）
 *   · 导出时：编码为 16-bit WAV，交给 ffmpeg 与画面合成
 * 所有随机数都来自固定种子，每次渲染结果完全一致。
 * 性能：几千个音符如果一次性建好节点，离线渲染会非常慢（每个节点每个渲染周期都要处理）。
 * 因此乐器调用先进入事件队列，渲染时按 1 秒窗口 suspend → 创建该窗口的节点 → resume。
 *
 * 混音结构：
 *   乐器 → duck(侧链压缩：每个底鼓压低 pad/bass) → musicBus → 低通(段落滤波) → musicGain ┐
 *   鼓组 → musicBus                                                                    ├→ master → 压缩 → 限幅 → 输出
 *   音效 → sfxBus ───────────────────────────────────────────────────────────────────┘
 *   发送：混响（程序生成冲激响应） / 附点八分延迟
 * ========================================================================== */
(function () {
  const U = FX.U;
  const A = (FX.Audio = {});
  const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);

  A.build = function (ctx, dest) {
    const sr = ctx.sampleRate;
    const rnd = U.prng(20231023);
    const CFG = FX.CFG, EV = CFG.EV;
    const BEAT = 60 / CFG.BPM, STEP = BEAT / 4;

    /* ---------- 共享资源 ---------- */
    const noiseBuf = ctx.createBuffer(1, sr * 2, sr);
    {
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = rnd() * 2 - 1;
    }
    const irBuf = ctx.createBuffer(2, Math.floor(sr * 2.8), sr);
    for (let ch = 0; ch < 2; ch++) {
      const d = irBuf.getChannelData(ch);
      for (let i = 0; i < d.length; i++) d[i] = (rnd() * 2 - 1) * Math.pow(1 - i / d.length, 3.4);
    }
    const shaperCurve = (k) => {
      const n = 1024, c = new Float32Array(n);
      for (let i = 0; i < n; i++) { const x = (i / (n - 1)) * 2 - 1; c[i] = Math.tanh(k * x) / Math.tanh(k); }
      return c;
    };

    /* ---------- 总线 ---------- */
    const limiter = ctx.createDynamicsCompressor();
    limiter.threshold.value = -1.5; limiter.knee.value = 0; limiter.ratio.value = 20;
    limiter.attack.value = 0.001; limiter.release.value = 0.08;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -16; comp.knee.value = 8; comp.ratio.value = 3.5;
    comp.attack.value = 0.005; comp.release.value = 0.2;
    const master = ctx.createGain();
    master.gain.value = 0.85;
    master.connect(comp).connect(limiter).connect(dest);

    const reverb = ctx.createConvolver();
    reverb.buffer = irBuf;
    const revOut = ctx.createGain();
    revOut.gain.value = 0.32;
    reverb.connect(revOut).connect(master);

    const delay = ctx.createDelay(2);
    delay.delayTime.value = BEAT * 0.75; // 附点八分
    const fb = ctx.createGain(); fb.gain.value = 0.34;
    const fbLP = ctx.createBiquadFilter(); fbLP.type = 'lowpass'; fbLP.frequency.value = 3200;
    delay.connect(fbLP).connect(fb).connect(delay);
    const delOut = ctx.createGain(); delOut.gain.value = 0.28;
    delay.connect(delOut).connect(master);

    const musicGain = ctx.createGain();
    const musicLP = ctx.createBiquadFilter();
    musicLP.type = 'lowpass'; musicLP.Q.value = 0.9;
    const musicBus = ctx.createGain();
    musicBus.connect(musicLP).connect(musicGain).connect(master);
    const duck = ctx.createGain();
    duck.connect(musicBus);
    const drums = ctx.createGain();
    drums.gain.value = 0.9;
    drums.connect(musicBus);
    const sfx = ctx.createGain();
    sfx.gain.value = 0.9;
    sfx.connect(master);

    const send = (node, amt, bus) => { const g = ctx.createGain(); g.gain.value = amt; node.connect(g).connect(bus); };
    const pan = (node, p, out) => { const s = ctx.createStereoPanner(); s.pan.value = p; node.connect(s).connect(out); };

    /* ---------- 基础发声器 ---------- */
    function noise(t, dur, loop = false) {
      const s = ctx.createBufferSource();
      s.buffer = noiseBuf;
      s.loop = loop;
      s.start(t, loop ? 0 : rnd() * 0.9);
      s.stop(t + dur + 0.05);
      return s;
    }
    function noiseHit(t, dur, type, freq, vol, out, q = 0.7, fEnd = 0) {
      const s = noise(t, dur, dur > 1);
      const f = ctx.createBiquadFilter();
      f.type = type; f.Q.value = q;
      f.frequency.setValueAtTime(freq, t);
      if (fEnd) f.frequency.exponentialRampToValueAtTime(fEnd, t + dur);
      const g = ctx.createGain();
      g.gain.setValueAtTime(vol, t);
      g.gain.exponentialRampToValueAtTime(0.0006, t + dur);
      s.connect(f).connect(g).connect(out);
      return g;
    }
    function tone(t, type, f0, f1, dur, vol, out, attack = 0.003) {
      const o = ctx.createOscillator();
      o.type = type;
      o.frequency.setValueAtTime(f0, t);
      if (f1 && f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(vol, t + attack);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g).connect(out);
      o.start(t);
      o.stop(t + dur + 0.02);
      return g;
    }

    /* ---------- 鼓组 ---------- */
    const kickTimes = [];
    function kick(t, v = 1) {
      const o = ctx.createOscillator();
      o.type = 'sine';
      o.frequency.setValueAtTime(175, t);
      o.frequency.exponentialRampToValueAtTime(50, t + 0.1);
      o.frequency.exponentialRampToValueAtTime(38, t + 0.4);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(v, t + 0.003);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.42);
      o.connect(g).connect(drums);
      o.start(t); o.stop(t + 0.45);
      noiseHit(t, 0.014, 'highpass', 2500, v * 0.3, drums);
    }
    function snare(t, v = 1) {
      const g = noiseHit(t, 0.2, 'bandpass', 1900, 0.55 * v, drums, 0.8);
      send(g, 0.25, reverb);
      tone(t, 'triangle', 200, 160, 0.12, 0.35 * v, drums);
    }
    function clap(t, v = 1) {
      for (let k = 0; k < 3; k++) noiseHit(t + k * 0.011, 0.03, 'bandpass', 1300, 0.45 * v, drums, 1.2);
      const g = noiseHit(t + 0.03, 0.2, 'bandpass', 1200, 0.35 * v, drums, 1);
      send(g, 0.35, reverb);
    }
    function hat(t, v = 1, open = false) {
      const g = noiseHit(t, open ? 0.24 : 0.045, 'highpass', 7600, 0.2 * v, drums, 0.8);
      pan(g, 0.25, drums);
    }
    function crash(t, v = 1) {
      const g = noiseHit(t, 1.8, 'highpass', 5000, 0.28 * v, drums, 0.6);
      send(g, 0.4, reverb);
    }

    /* ---------- 合成器 ---------- */
    const dist = ctx.createWaveShaper();
    dist.curve = shaperCurve(3);
    const distOut = ctx.createGain(); distOut.gain.value = 0.42;
    dist.connect(distOut).connect(duck);

    function bass(t, m, dur, v, cut, distorted = false) {
      const out = ctx.createGain();
      out.connect(distorted ? dist : duck);
      const o1 = ctx.createOscillator(); o1.type = 'sawtooth'; o1.frequency.value = mtof(m);
      const o2 = ctx.createOscillator(); o2.type = 'square'; o2.frequency.value = mtof(m - 12);
      const g2 = ctx.createGain(); g2.gain.value = 0.5;
      const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.Q.value = 7;
      f.frequency.setValueAtTime(cut * 4, t);
      f.frequency.exponentialRampToValueAtTime(cut, t + 0.12);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(v, t + 0.005);
      g.gain.setValueAtTime(v, t + dur * 0.7);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o1.connect(f); o2.connect(g2).connect(f);
      f.connect(g).connect(out);
      o1.start(t); o2.start(t); o1.stop(t + dur + 0.02); o2.stop(t + dur + 0.02);
    }
    function pad(t, ms, dur, v, bright = 1400, revAmt = 0.5) {
      const out = ctx.createGain();
      out.connect(duck);
      send(out, revAmt, reverb);
      const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = bright; f.Q.value = 0.5;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(v, t + Math.min(0.4, dur * 0.3));
      g.gain.setValueAtTime(v, t + dur - 0.1);
      g.gain.linearRampToValueAtTime(0.0001, t + dur + 0.5);
      f.connect(g).connect(out);
      for (const m of ms) for (const det of [-9, 9]) {
        const o = ctx.createOscillator();
        o.type = 'sawtooth'; o.frequency.value = mtof(m); o.detune.value = det;
        o.connect(f); o.start(t); o.stop(t + dur + 0.6);
      }
    }
    function pluck(t, m, v, dur = 0.3) {
      const o = ctx.createOscillator(); o.type = 'square'; o.frequency.value = mtof(m);
      const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.Q.value = 3;
      f.frequency.setValueAtTime(5200, t);
      f.frequency.exponentialRampToValueAtTime(700, t + 0.18);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(v, t + 0.004);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(f).connect(g).connect(musicBus);
      send(g, 0.4, delay);
      o.start(t); o.stop(t + dur + 0.02);
    }
    function lead(t, m, dur, v) {
      const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 3400; f.Q.value = 1;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(v, t + 0.02);
      g.gain.setValueAtTime(v, t + dur * 0.8);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.12);
      const lfo = ctx.createOscillator(); lfo.frequency.value = 5.5;
      const lg = ctx.createGain(); lg.gain.setValueAtTime(0, t); lg.gain.linearRampToValueAtTime(5, t + 0.25);
      lfo.connect(lg);
      for (const det of [-7, 7]) {
        const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = mtof(m); o.detune.value = det;
        lg.connect(o.frequency);
        o.connect(f); o.start(t); o.stop(t + dur + 0.2);
      }
      lfo.start(t); lfo.stop(t + dur + 0.2);
      f.connect(g).connect(musicBus);
      send(g, 0.3, delay); send(g, 0.3, reverb);
    }
    function stab(t, ms, v = 0.18) {
      for (const m of ms) {
        const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = mtof(m);
        const f = ctx.createBiquadFilter(); f.type = 'lowpass';
        f.frequency.setValueAtTime(6000, t); f.frequency.exponentialRampToValueAtTime(500, t + 0.3);
        const g = ctx.createGain();
        g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
        o.connect(f).connect(g).connect(sfx);
        send(g, 0.4, reverb);
        o.start(t); o.stop(t + 0.55);
      }
    }

    /* ---------- 音效 ---------- */
    function impact(t, v = 1) {
      const g = tone(t, 'sine', 120, 30, 1.1, 0.9 * v, sfx, 0.002);
      noiseHit(t, 0.9, 'lowpass', 900, 0.5 * v, sfx, 0.7, 120);
      const n = noiseHit(t, 0.25, 'highpass', 3000, 0.25 * v, sfx);
      send(g, 0.3, reverb); send(n, 0.5, reverb);
    }
    function subDrop(t, v = 1) { tone(t, 'sine', 90, 27, 1.8, 0.8 * v, sfx, 0.01); }
    function riser(t, dur, v = 0.3) {
      const s = noise(t, dur, true);
      const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 2.2;
      f.frequency.setValueAtTime(300, t); f.frequency.exponentialRampToValueAtTime(9000, t + dur);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + dur);
      g.gain.linearRampToValueAtTime(0.0001, t + dur + 0.03);
      s.connect(f).connect(g).connect(sfx);
      send(g, 0.35, reverb);
      const o = ctx.createOscillator(); o.type = 'sawtooth';
      o.frequency.setValueAtTime(110, t); o.frequency.exponentialRampToValueAtTime(880, t + dur);
      const of = ctx.createBiquadFilter(); of.type = 'lowpass'; of.frequency.value = 1800;
      const og = ctx.createGain();
      og.gain.setValueAtTime(0.0001, t); og.gain.exponentialRampToValueAtTime(v * 0.25, t + dur);
      og.gain.linearRampToValueAtTime(0.0001, t + dur + 0.03);
      o.connect(of).connect(og).connect(sfx);
      o.start(t); o.stop(t + dur + 0.05);
    }
    function whoosh(t, dur = 0.5, v = 0.3, p = 0) {
      const s = noise(t, dur);
      const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 1.4;
      f.frequency.setValueAtTime(400, t);
      f.frequency.exponentialRampToValueAtTime(4200, t + dur * 0.55);
      f.frequency.exponentialRampToValueAtTime(700, t + dur);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(v, t + dur * 0.5);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      s.connect(f).connect(g);
      pan(g, p, sfx);
      send(g, 0.25, reverb);
    }
    function ding(t, v = 0.4, semis = 0, p = 0) {
      const base = 1318.5 * Math.pow(2, semis / 12);
      const out = ctx.createGain();
      pan(out, p, sfx);
      send(out, 0.25, reverb);
      [[1, 1, 0.9], [2.76, 0.4, 0.45], [5.4, 0.18, 0.2]].forEach(([r, a, d]) => tone(t, 'sine', base * r, 0, d, v * a, out, 0.002));
    }
    function bigDing(t) {
      ding(t, 0.75, 0, 0);
      ding(t + 0.11, 0.6, 7, 0);
    }
    function glitch(t, dur, v = 0.25) {
      let x = t;
      while (x < t + dur) {
        const seg = 0.015 + rnd() * 0.04;
        if (rnd() < 0.55) tone(x, 'square', 60 + rnd() * 2600, 0, seg, v * (0.4 + rnd() * 0.6), sfx, 0.001);
        else noiseHit(x, seg, rnd() < 0.5 ? 'highpass' : 'bandpass', 800 + rnd() * 6000, v, sfx, 1.5);
        x += seg + rnd() * 0.025;
      }
    }
    function blip(t, f, v = 0.08, dur = 0.03) { tone(t, 'sine', f, 0, dur, v, sfx, 0.001); }
    function chatter(t0, t1, rate = 22, v = 0.05) {
      let x = t0;
      while (x < t1) { blip(x, 1200 + rnd() * 2200, v * (0.5 + rnd() * 0.5), 0.02); x += (0.5 + rnd()) / rate; }
    }
    function tick(t, v = 0.15, f = 2600) { noiseHit(t, 0.012, 'highpass', 4500, v, sfx); blip(t, f, v * 0.5, 0.012); }
    function heartbeat(t, v = 0.9) {
      tone(t, 'sine', 78, 40, 0.18, v, sfx, 0.004);
      tone(t + 0.2, 'sine', 70, 38, 0.16, v * 0.7, sfx, 0.004);
    }
    function vibrate(t, dur = 0.38, v = 0.18) {
      const o = ctx.createOscillator(); o.type = 'square'; o.frequency.value = 160;
      const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 500;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(v, t + 0.02);
      g.gain.setValueAtTime(v, t + dur - 0.03);
      g.gain.linearRampToValueAtTime(0.0001, t + dur);
      o.connect(f).connect(g).connect(sfx);
      o.start(t); o.stop(t + dur + 0.02);
    }
    function alarm(t, dur, v = 0.12) {
      const o = ctx.createOscillator(); o.type = 'square';
      for (let x = 0, k = 0; x < dur; x += 0.22, k++) o.frequency.setValueAtTime(k % 2 ? 620 : 880, t + x);
      const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 2200;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(v, t + 0.02);
      g.gain.setValueAtTime(v, t + dur - 0.1);
      g.gain.linearRampToValueAtTime(0.0001, t + dur);
      o.connect(f).connect(g).connect(sfx);
      send(g, 0.2, reverb);
      o.start(t); o.stop(t + dur + 0.02);
    }
    function shatter(t, v = 1) {
      const n1 = noiseHit(t, 0.55, 'highpass', 1600, 0.55 * v, sfx);
      noiseHit(t, 0.3, 'bandpass', 5200, 0.4 * v, sfx, 1.2);
      send(n1, 0.4, reverb);
      for (let i = 0; i < 46; i++) {
        const x = t + Math.pow(rnd(), 1.6) * 0.9;
        const out = ctx.createGain();
        pan(out, rnd() * 2 - 1, sfx);
        send(out, 0.3, reverb);
        tone(x, 'sine', 2600 + rnd() * 6800, 0, 0.05 + rnd() * 0.35, (0.04 + rnd() * 0.12) * v, out, 0.001);
      }
    }
    function powerUp(t, dur = 0.9, v = 0.25) {
      const o = ctx.createOscillator(); o.type = 'sawtooth';
      o.frequency.setValueAtTime(110, t); o.frequency.exponentialRampToValueAtTime(880, t + dur);
      const f = ctx.createBiquadFilter(); f.type = 'lowpass';
      f.frequency.setValueAtTime(300, t); f.frequency.exponentialRampToValueAtTime(7000, t + dur);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + dur * 0.8);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.2);
      o.connect(f).connect(g).connect(sfx);
      send(g, 0.4, reverb);
      o.start(t); o.stop(t + dur + 0.25);
    }
    function chime(t, ms, v = 0.18, gap = 0.07) {
      ms.forEach((m, i) => {
        const out = ctx.createGain();
        send(out, 0.4, reverb); send(out, 0.2, delay);
        out.connect(sfx);
        tone(t + i * gap, 'sine', mtof(m), 0, 0.9, v, out, 0.002);
        tone(t + i * gap, 'triangle', mtof(m + 12), 0, 0.4, v * 0.3, out, 0.002);
      });
    }

    /* ---------- 事件队列：把顶层乐器 / 音效调用延迟到渲染窗口内再建节点 ---------- */
    const queue = [];
    let horizon = -Infinity; // 早于该时间的事件立即创建，否则进入队列
    const defer = (fn) => (t, ...a) => (t < horizon ? fn(t, ...a) : queue.push([t, () => fn(t, ...a)]));
    const _kick = kick;
    kick = (t, v) => { kickTimes.push(t); defer(_kick)(t, v); };
    snare = defer(snare); clap = defer(clap); hat = defer(hat); crash = defer(crash);
    bass = defer(bass); pad = defer(pad); pluck = defer(pluck); lead = defer(lead); stab = defer(stab);
    impact = defer(impact); subDrop = defer(subDrop); riser = defer(riser); whoosh = defer(whoosh);
    ding = defer(ding); bigDing = defer(bigDing); glitch = defer(glitch); blip = defer(blip);
    chatter = defer(chatter); tick = defer(tick); heartbeat = defer(heartbeat); vibrate = defer(vibrate);
    alarm = defer(alarm); shatter = defer(shatter); powerUp = defer(powerUp); chime = defer(chime);

    /* =====================================================================
     * 配乐编排（按 16 分音符步进）
     * =================================================================== */
    // 和弦表（pad 声部 + 贝斯根音）
    const CH = {
      Am: { pad: [57, 60, 64], root: 33 },
      F: { pad: [57, 60, 65], root: 29 },
      C: { pad: [55, 60, 64], root: 36 },
      G: { pad: [55, 59, 62], root: 31 },
      E: { pad: [56, 59, 64], root: 28 },
      Am9: { pad: [57, 60, 64, 71], root: 33 },
    };
    // 每小节（2 秒）一个和弦，共 40 小节
    const PROG = [
      'Am', 'Am', 'Am',            // 0–6   钩子
      'Am', 'F',                   // 6–10  片头
      'Am', 'F', 'C', 'G', 'Am',   // 10–20 现象
      'Am', 'F', 'C', 'G', 'Am',   // 20–30 爬坡（最后一小节是紧张段）
      'Am', 'F', 'E',              // 30–36 碎裂（半速）
      'Am', 'F', 'E', 'Am',        // 36–44 时钟
      'Am9', 'F', 'Am9',           // 44–50 残留（空灵）
      'Am', 'G', 'F', 'E',         // 50–58 反转
      'Am', 'F', 'C', 'G',         // 58–66 账单
      'C', 'G', 'Am', 'F', 'C',    // 66–76 恢复（大调感）
      'F', 'G',                    // 76–80 互动（回到 Am 开头，形成循环）
    ];
    const chordAt = (t) => CH[PROG[Math.min(PROG.length - 1, Math.floor(t / 2))]];
    const sec = (t) => FX.sceneAt(t).id;

    // pad：每小节一个和弦
    for (let b = 0; b < 40; b++) {
      const t = b * 2, s = sec(t + 0.01), ch = CH[PROG[b]];
      if (t >= 28 && t < 30) { pad(t, ch.pad, 1.7, 0.035, 700, 0.6); continue; }
      const cfg = {
        hook: [0.03, 900], title: [0.05, 2200], decline: [0.045, 1500], climb: [0.045, 1600 + (t - 20) * 120],
        shatter: [0.05, 900], clock: [0.045, 900], residue: [0.06, 2400], twist: [0.045, 1800],
        ledger: [0.04, 1300], recover: [0.06, 3000], cta: [0.05, 2000],
      }[s];
      pad(t, ch.pad, 2, cfg[0], cfg[1], s === 'residue' ? 0.9 : 0.5);
    }

    const ARP = [0, 1, 2, 3, 2, 1, 0, 2];
    for (let i = 0; i < 640; i++) {
      const t = i * STEP, s = sec(t + 0.001);
      const sb = i % 16, ib = i % 4, beat = Math.floor(i / 4);
      const ch = chordAt(t);
      const arpNote = (oct) => { const tones = [ch.pad[0], ch.pad[1], ch.pad[2], ch.pad[0] + 12]; return tones[ARP[i % 8]] + oct; };

      if (s === 'hook') {
        if (ib === 0 && t < 5) kick(t, 0.9);
        if (ib === 2) hat(t, 0.8);
        if (t < 5) bass(t, ch.root + (sb % 8 === 6 ? 12 : 0), STEP * 0.9, 0.16, 420);
        if (t >= 5 && t < 6) snare(t, 0.25 + (t - 5) * 0.6);
      } else if (s === 'title') {
        if (ib === 0) kick(t, 1);
        if (sb === 4 || sb === 12) clap(t, 0.8);
        hat(t, ib === 2 ? 0.9 : 0.4);
        bass(t, ch.root + (sb % 4 === 2 ? 12 : 0), STEP * 0.9, 0.17, 1300);
        pluck(t, arpNote(12), 0.05);
      } else if (s === 'decline') {
        if (ib === 0) kick(t, 0.95);
        if (sb === 4 || sb === 12) clap(t, 0.7);
        if (ib === 2) hat(t, 0.8); else if (ib === 3) hat(t, 0.25);
        if (ib === 0 || ib === 2) bass(t, ch.root, STEP * 1.8, 0.16, 800);
        if (ib === 0 || ib === 2) pluck(t, arpNote(12), 0.035);
      } else if (s === 'climb') {
        if (t < 28) {
          const k = (t - 20) / 8;
          if (ib === 0) kick(t, 0.95);
          hat(t, ib === 2 ? 0.8 : 0.35);
          bass(t, ch.root + (sb % 8 === 6 ? 12 : 0), STEP * 0.9, 0.16, 600 + 1800 * k);
          pluck(t, arpNote(k > 0.5 ? 24 : 12), 0.03 + 0.03 * k);
          if (t >= 26) {
            const rr = t >= 27 ? 1 : (ib % 2 === 0 ? 1 : 0);
            if (rr) snare(t, 0.2 + (t - 26) * 0.35);
          }
        }
      } else if (s === 'shatter' || s === 'clock') {
        if (t < 30.25) continue; // 留出"叮"的空间
        if (sb === 0 || sb === 10) kick(t, 1);
        if (sb === 8) snare(t, 0.9);
        if (ib === 2) hat(t, 0.4);
        if (sb === 0) bass(t, ch.root, 1.9, 0.2, 380, true);
      } else if (s === 'residue') {
        if (sb === 0) kick(t, 0.5);
        if (ib === 0 && i % 8 === 0) pluck(t, arpNote(24), 0.03, 0.5);
        if (sb === 14 && rnd() < 0.7) pluck(t, ch.pad[2] + 31, 0.02, 0.6);
      } else if (s === 'twist') {
        if (ib === 0) kick(t, 1);
        if (sb === 4 || sb === 12) (t < EV.twistSwitch ? clap : snare)(t, 0.8);
        hat(t, ib === 2 ? 0.9 : 0.45);
        bass(t, ch.root + (sb % 4 === 2 ? 12 : 0), STEP * 0.9, 0.17, t < EV.twistSwitch ? 1600 : 700, t >= EV.twistSwitch);
        if (t < EV.twistSwitch) pluck(t, arpNote(24), 0.04);
      } else if (s === 'ledger') {
        if (t >= 65.6) continue; // 停顿
        if (ib === 0) kick(t, 0.95);
        if (ib === 2) hat(t, 0.7);
        if (ib === 2) bass(t, ch.root, STEP * 1.6, 0.18, 900);
        if (t >= 64 && t < 65.6) snare(t, 0.2 + (t - 64) * 0.4);
      } else if (s === 'recover') {
        if (ib === 0) kick(t, 1);
        if (sb === 4 || sb === 12) clap(t, 0.85);
        hat(t, ib === 2 ? 0.9 : 0.45);
        bass(t, ch.root + (sb % 4 === 2 ? 12 : 0), STEP * 0.9, 0.17, 1900);
        pluck(t, arpNote(24), 0.03);
      } else if (s === 'cta') {
        if (ib === 2) hat(t, 0.4);
        if (ib === 0 || ib === 2) pluck(t, arpNote(12), 0.04, 0.4);
        if (sb === 0) bass(t, ch.root, 1.8, 0.14, 600);
      }
    }
    // 恢复段主旋律（C – G – Am – F – C）
    const MEL = [
      [72, 0.5], [76, 0.5], [79, 0.5], [76, 0.5], [74, 0.5], [71, 0.5], [74, 0.5], [79, 0.5],
      [72, 0.5], [76, 0.5], [81, 0.75], [79, 0.25], [77, 0.5], [76, 0.5], [72, 0.5], [69, 0.5],
      [72, 0.5], [76, 0.5], [79, 1.0],
    ];
    let mt = 66.0;
    for (const [m, d] of MEL) { if (mt >= 75.9) break; lead(mt, m, d * 0.9, 0.06); mt += d; }

    // 段落滤波 & 音量自动化
    musicLP.frequency.setValueAtTime(14000, 0);
    musicLP.frequency.setValueAtTime(14000, 27.9);
    musicLP.frequency.exponentialRampToValueAtTime(320, 29.6);
    musicLP.frequency.setValueAtTime(14000, 30.0);
    musicLP.frequency.setValueAtTime(14000, 65.45);
    musicLP.frequency.exponentialRampToValueAtTime(500, 65.6);
    musicLP.frequency.setValueAtTime(14000, 66.0);
    musicGain.gain.setValueAtTime(1, 0);
    musicGain.gain.setValueAtTime(1, 29.6);
    musicGain.gain.linearRampToValueAtTime(0.0, 29.8);
    musicGain.gain.setValueAtTime(1, 30.0);
    musicGain.gain.setValueAtTime(1, 65.5);
    musicGain.gain.linearRampToValueAtTime(0.1, 65.62);
    musicGain.gain.setValueAtTime(1, 66.0);
    // 侧链：每个底鼓压低 pad / bass，制造"抽吸"律动
    kickTimes.sort((a, b) => a - b);
    duck.gain.setValueAtTime(1, 0);
    for (const kt of kickTimes) {
      duck.gain.setValueAtTime(1, kt);
      duck.gain.linearRampToValueAtTime(0.4, kt + 0.012);
      duck.gain.linearRampToValueAtTime(1, kt + 0.24);
    }

    /* =====================================================================
     * 音效编排（与 scenes.js 中的视觉事件一一对应）
     * =================================================================== */
    // S01 钩子
    glitch(0, 0.45, 0.22);
    chatter(0.05, 0.9, 26, 0.05);
    chatter(0.3, 1.0, 18, 0.03);
    blip(1.0, 1760, 0.08, 0.05); blip(1.08, 2350, 0.08, 0.06); // 准星锁定
    glitch(EV.storm.start - 0.04, 0.2, 0.3);
    for (let i = 0; i < EV.storm.n; i++) {
      const tt = EV.storm.start + i * EV.storm.step;
      ding(tt, 0.22 + 0.1 * rnd(), Math.floor(rnd() * 5) - 2, rnd() * 1.6 - 0.8);
      if (i % 3 === 0) vibrate(tt, 0.2, 0.08);
    }
    riser(4.0, 2.0, 0.28);
    whoosh(EV.stormOut, 0.75, 0.4);
    // S02 片头
    impact(6.0, 1); subDrop(6.0, 0.9); crash(6.0, 0.8);
    chatter(6.35, 7.0, 24, 0.045);
    whoosh(6.55, 0.5, 0.18); whoosh(7.0, 0.6, 0.15, 0.4);
    glitch(9.5, 0.5, 0.2); whoosh(9.5, 0.5, 0.2, -0.3);
    // S03 现象
    stab(10.0, [57, 64], 0.08);
    whoosh(10.2, 0.4, 0.15); whoosh(10.55, 0.5, 0.2);
    EV.declineBars.forEach((bt, i) => {
      whoosh(bt, 0.35, 0.15, 0.3);
      chatter(bt + 0.1, bt + 0.9, 30, 0.04);
      if (i > 0) tone(bt + 0.8, 'square', 110, 90, 0.25, 0.08, sfx);
      if (i === 2) { stab(bt + 0.9, [45, 52, 57], 0.12); glitch(bt + 0.9, 0.2, 0.2); }
    });
    whoosh(EV.researcher, 0.6, 0.2, -0.3);
    chatter(EV.researcher + 0.1, EV.researcher + 0.7, 26, 0.05);
    glitch(19.4, 0.25, 0.2);
    whoosh(19.35, 0.65, 0.25);
    // S04 爬坡
    whoosh(20.3, 0.45, 0.15); whoosh(22.75, 0.45, 0.15);
    chatter(20.4, 21.3, 20, 0.04);
    blip(21.3, 1760, 0.07, 0.05); blip(21.38, 2350, 0.07, 0.06);
    EV.heartbeats.forEach((h) => heartbeat(h, 0.85));
    vibrate(28.4, 0.35, 0.16); vibrate(28.9, 0.35, 0.16);
    riser(28.6, 1.15, 0.12);
    whoosh(EV.banner, 0.5, 0.25);
    // S05 碎裂
    bigDing(EV.impact);
    shatter(EV.impact + 0.02, 1);
    impact(EV.impact + 0.02, 1.1);
    subDrop(EV.impact, 1);
    alarm(EV.impact + 0.35, 2.0, 0.07);
    glitch(30.25, 0.3, 0.2);
    whoosh(31.8, 0.45, 0.18); impact(32.4, 0.7);
    chatter(33.0, 33.8, 28, 0.045);
    glitch(35.55, 0.45, 0.25);
    // S06 时钟
    glitch(36.0, 0.2, 0.25); whoosh(36.25, 0.45, 0.15);
    {
      let x = 36.6, rate = 8;
      while (x < EV.clockLock) { tick(x, 0.09, 2400 + (x - 36.6) * 200); rate = 8 + (x - 36.6) * 5; x += 1 / rate; }
      tone(36.6, 'sine', 200, 900, EV.clockLock - 36.6, 0.05, sfx, 0.3);
    }
    stab(EV.clockLock, [45, 52, 57, 60], 0.12); impact(EV.clockLock, 0.6); ding(EV.clockLock + 0.02, 0.2, -12);
    whoosh(39.8, 0.45, 0.15);
    for (let x = 40.0; x < 43.3; x += 0.5) tick(x, 0.12, Math.round((x - 40) / 0.5) % 2 ? 1800 : 2400);
    riser(43.2, 0.8, 0.22);
    // S07 残留
    chime(44.0, [81, 84, 88], 0.08, 0.12);
    whoosh(44.35, 0.6, 0.15); chatter(44.6, 45.3, 22, 0.04);
    whoosh(46.6, 0.5, 0.12);
    riser(48.6, 1.4, 0.15);
    whoosh(49.55, 0.45, 0.3, 0.6);
    // S08 反转
    impact(50.0, 0.8); crash(50.0, 0.5); whoosh(50.1, 0.4, 0.12); whoosh(50.55, 0.4, 0.15);
    impact(EV.twistFast, 0.6); whoosh(EV.twistFast - 0.05, 0.35, 0.35, -0.6);
    for (let k = 0; k < 8; k++) blip(EV.twistFast + 0.45 + k * 0.1, 600 + k * 180, 0.05, 0.04);
    glitch(EV.twistSwitch, 0.3, 0.3); impact(EV.twistSwitch, 0.9); stab(EV.twistSwitch, [41, 48, 53], 0.12);
    EV.gauges.forEach((g) => { alarm(g, 0.44, 0.07); tone(g, 'sine', 90, 45, 0.3, 0.5, sfx); });
    impact(EV.neq, 1); stab(EV.neq, [40, 47, 52, 56], 0.12);
    riser(56.3, 1.6, 0.2);
    glitch(57.5, 0.5, 0.25);
    // S09 账单
    whoosh(58.15, 0.45, 0.15);
    EV.ledgerHours.forEach((h, i) => {
      const it = CFG.ledgerT(h);
      ding(it, 0.2, i % 3, -0.3 + i * 0.12);
      for (let k = 0; k < 3; k++) tick(it + 0.5 + k * 0.08, 0.08, 2000 + k * 300);
    });
    riser(62.2, 3.4, 0.22);
    whoosh(63.8, 0.45, 0.2); whoosh(EV.formula, 0.4, 0.15);
    impact(EV.formula + 0.4, 1); stab(EV.formula + 0.4, [45, 52, 57], 0.12);
    tick(EV.formula + 0.9, 0.12, 1800);
    glitch(65.55, 0.45, 0.3);
    // S10 恢复
    impact(66.0, 0.8); crash(66.0, 0.7); powerUp(65.2, 0.8, 0.2);
    chatter(66.05, 66.5, 26, 0.045); whoosh(66.1, 0.4, 0.15);
    EV.cards.forEach((ct, i) => { whoosh(ct - 0.05, 0.45, 0.3, 0.7); impact(ct, 0.35); chatter(ct + 0.1, ct + 0.7, 20, 0.03); });
    blip(67.85, 900, 0.1, 0.03); blip(67.9, 1400, 0.1, 0.05); // 勿扰开关
    [70.3, 70.6, 70.9, 71.2].forEach((x, k) => blip(x, 880 * Math.pow(2, k / 4), 0.08, 0.06));
    for (let x = 72.8; x < EV.restored - 0.1; x += 0.25) tick(x, 0.05, 2200);
    chime(EV.restored, [72, 76, 79, 84], 0.12, 0.08);
    whoosh(EV.restored - 0.1, 0.5, 0.2);
    for (let k = 0; k < 8; k++) blip(EV.restored + 0.2 + k * 0.075, 700 + k * 150, 0.05, 0.04);
    // S11 互动
    impact(76.0, 0.4); whoosh(76.15, 0.4, 0.12); whoosh(76.45, 0.45, 0.15);
    blip(76.95, 600, 0.1, 0.06); blip(77.02, 1200, 0.08, 0.06);
    whoosh(77.3, 0.4, 0.12);
    riser(79.0, 1.0, 0.18);
    glitch(79.4, 0.6, 0.2);

    /** 创建 [.., until) 内的全部事件节点（事件内部再调用的乐器若落在窗口内会立即创建） */
    return function flush(until) {
      horizon = until;
      for (;;) {
        const due = [];
        for (let i = queue.length - 1; i >= 0; i--) if (queue[i][0] < until) due.push(queue.splice(i, 1)[0]);
        if (!due.length) break;
        due.sort((a, b) => a[0] - b[0]).forEach((e) => e[1]());
      }
    };
  };

  /** 离线渲染整段音频（含峰值归一化到 -1 dBFS） */
  A.render = async function (sampleRate = 48000) {
    const len = Math.ceil(FX.CFG.DURATION * sampleRate);
    const ctx = new OfflineAudioContext(2, len, sampleRate);
    const flush = A.build(ctx, ctx.destination);
    // 1 秒窗口（48000/128 = 375 个渲染块，正好对齐）
    const WIN = 1;
    for (let w = WIN; w < FX.CFG.DURATION; w += WIN) {
      ctx.suspend(w).then(() => { flush(w + WIN); ctx.resume(); });
    }
    flush(WIN);
    const buf = await ctx.startRendering();
    let peak = 0;
    for (let c = 0; c < buf.numberOfChannels; c++) {
      const d = buf.getChannelData(c);
      for (let i = 0; i < d.length; i++) { const a = Math.abs(d[i]); if (a > peak) peak = a; }
    }
    const gain = peak > 0 ? 0.89 / peak : 1;
    for (let c = 0; c < buf.numberOfChannels; c++) {
      const d = buf.getChannelData(c);
      for (let i = 0; i < d.length; i++) d[i] *= gain;
    }
    return buf;
  };

  /** AudioBuffer → 16-bit PCM WAV（ArrayBuffer） */
  A.toWav = function (buf) {
    const ch = buf.numberOfChannels, sr = buf.sampleRate, n = buf.length;
    const out = new ArrayBuffer(44 + n * ch * 2);
    const v = new DataView(out);
    const w = (o, s) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
    w(0, 'RIFF'); v.setUint32(4, 36 + n * ch * 2, true); w(8, 'WAVE');
    w(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, ch, true);
    v.setUint32(24, sr, true); v.setUint32(28, sr * ch * 2, true); v.setUint16(32, ch * 2, true); v.setUint16(34, 16, true);
    w(36, 'data'); v.setUint32(40, n * ch * 2, true);
    const chans = [];
    for (let c = 0; c < ch; c++) chans.push(buf.getChannelData(c));
    let o = 44;
    for (let i = 0; i < n; i++)
      for (let c = 0; c < ch; c++) {
        const s = Math.max(-1, Math.min(1, chans[c][i]));
        v.setInt16(o, s < 0 ? s * 0x8000 : s * 0x7fff, true);
        o += 2;
      }
    return out;
  };
})();
