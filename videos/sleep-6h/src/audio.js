/* =============================================================================
 * 音频引擎：75 BPM 梦境 Lo-fi 配乐 + 音效（全部程序化合成，无版权风险）
 * -----------------------------------------------------------------------------
 * 乐器：FM 电钢琴（Rhodes）、失谐暖 pad、八音盒琶音、正弦低音、柔和鼓组（软底鼓 / 刷子 / 沙锤）、
 *       黑胶底噪（随机咔嗒 + 粉噪）、磁带颤音（全局慢速音高摆动）。
 * 音效：眨眼、水滴涟漪、气泡、数日子的滴答、温柔的闹铃、风铃、倒放吸气、困倦时的"掉速"。
 * 与 focus-23min 相同：OfflineAudioContext 离线渲染，事件按 1 秒窗口分批建节点，固定随机种子。
 * ========================================================================== */
(function () {
  const U = FX.U;
  const A = (FX.Audio = {});
  const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);

  A.build = function (ctx, dest) {
    const sr = ctx.sampleRate;
    const rnd = U.prng(75075);
    const CFG = FX.CFG, EV = CFG.EV;
    const BEAT = 60 / CFG.BPM, BAR = BEAT * 4, STEP = BEAT / 4;

    /* ---------- 共享资源 ---------- */
    const noiseBuf = ctx.createBuffer(1, sr * 2, sr);
    { const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = rnd() * 2 - 1; }
    const irBuf = ctx.createBuffer(2, Math.floor(sr * 4.2), sr); // 更长的混响尾巴：梦境感
    for (let ch = 0; ch < 2; ch++) {
      const d = irBuf.getChannelData(ch);
      for (let i = 0; i < d.length; i++) d[i] = (rnd() * 2 - 1) * Math.pow(1 - i / d.length, 2.6);
    }

    /* ---------- 总线 ---------- */
    const limiter = ctx.createDynamicsCompressor();
    limiter.threshold.value = -1.5; limiter.knee.value = 0; limiter.ratio.value = 20;
    limiter.attack.value = 0.002; limiter.release.value = 0.1;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -18; comp.knee.value = 10; comp.ratio.value = 2.5;
    comp.attack.value = 0.01; comp.release.value = 0.3;
    const master = ctx.createGain(); master.gain.value = 0.85;
    // 整体 lo-fi 音色：高频略收
    const tone = ctx.createBiquadFilter(); tone.type = 'lowpass'; tone.frequency.value = 9500; tone.Q.value = 0.5;
    master.connect(tone).connect(comp).connect(limiter).connect(dest);

    const reverb = ctx.createConvolver(); reverb.buffer = irBuf;
    const revOut = ctx.createGain(); revOut.gain.value = 0.42;
    reverb.connect(revOut).connect(master);
    const delay = ctx.createDelay(3); delay.delayTime.value = BEAT * 0.75;
    const fb = ctx.createGain(); fb.gain.value = 0.42;
    const fbLP = ctx.createBiquadFilter(); fbLP.type = 'lowpass'; fbLP.frequency.value = 2600;
    delay.connect(fbLP).connect(fb).connect(delay);
    const delOut = ctx.createGain(); delOut.gain.value = 0.3;
    delay.connect(delOut).connect(master);

    const musicGain = ctx.createGain();
    const musicLP = ctx.createBiquadFilter(); musicLP.type = 'lowpass'; musicLP.Q.value = 0.7;
    const musicBus = ctx.createGain();
    musicBus.connect(musicLP).connect(musicGain).connect(master);
    const duck = ctx.createGain(); duck.connect(musicBus);
    const drums = ctx.createGain(); drums.gain.value = 0.75; drums.connect(musicBus);
    const sfx = ctx.createGain(); sfx.gain.value = 0.85; sfx.connect(master);

    // 磁带颤音：一个慢 LFO 推动所有合成器的 detune（单位 cents）
    const wow = ctx.createOscillator(); wow.frequency.value = 0.45;
    const wowAmt = ctx.createGain(); wowAmt.gain.value = 7;
    wow.connect(wowAmt); wow.start(0); wow.stop(CFG.DURATION + 1);
    // 困倦段加深颤音，"掉速"时整体音高下滑
    const wowDepth = ctx.createGain(); wowDepth.gain.value = 1;
    wowAmt.connect(wowDepth);
    const sag = ctx.createConstantSource(); sag.offset.value = 0; sag.start(0); sag.stop(CFG.DURATION + 1);
    const detuneBus = ctx.createGain(); detuneBus.gain.value = 1;
    wowDepth.connect(detuneBus); sag.connect(detuneBus);
    const wobble = (osc) => detuneBus.connect(osc.detune);

    const send = (node, amt, bus) => { const g = ctx.createGain(); g.gain.value = amt; node.connect(g).connect(bus); };
    const pan = (node, p, out) => { const s = ctx.createStereoPanner(); s.pan.value = p; node.connect(s).connect(out); };

    /* ---------- 基础发声器 ---------- */
    function noise(t, dur, loop = false) {
      const s = ctx.createBufferSource(); s.buffer = noiseBuf; s.loop = loop;
      s.start(t, loop ? 0 : rnd() * 0.9); s.stop(t + dur + 0.05); return s;
    }
    function noiseHit(t, dur, type, freq, vol, out, q = 0.7, fEnd = 0) {
      const s = noise(t, dur, dur > 1);
      const f = ctx.createBiquadFilter(); f.type = type; f.Q.value = q;
      f.frequency.setValueAtTime(freq, t); if (fEnd) f.frequency.exponentialRampToValueAtTime(fEnd, t + dur);
      const g = ctx.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0006, t + dur);
      s.connect(f).connect(g).connect(out); return g;
    }
    function tone1(t, type, f0, f1, dur, vol, out, attack = 0.004) {
      const o = ctx.createOscillator(); o.type = type;
      o.frequency.setValueAtTime(f0, t); if (f1 && f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
      const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(vol, t + attack); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g).connect(out); o.start(t); o.stop(t + dur + 0.02); return g;
    }

    /* ---------- 鼓组（柔和 lo-fi） ---------- */
    const kickTimes = [];
    function kick(t, v = 1) {
      const o = ctx.createOscillator(); o.type = 'sine';
      o.frequency.setValueAtTime(110, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.14);
      const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.8 * v, t + 0.006); g.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
      o.connect(g).connect(drums); o.start(t); o.stop(t + 0.55);
    }
    function brush(t, v = 1) {
      const g = noiseHit(t, 0.28, 'bandpass', 2600, 0.32 * v, drums, 0.6, 1500);
      send(g, 0.3, reverb);
      tone1(t, 'triangle', 220, 180, 0.08, 0.12 * v, drums);
    }
    function shaker(t, v = 1) { const g = noiseHit(t, 0.06, 'highpass', 6500, 0.09 * v, drums, 0.7); pan(g, (rnd() - 0.5) * 0.6, drums); }
    function rim(t, v = 1) { tone1(t, 'square', 1700, 1500, 0.025, 0.05 * v, drums, 0.001); }

    /* ---------- 合成器 ---------- */
    // FM 电钢琴：载波正弦 + 调制正弦（比率 1，指数衰减的调制深度）+ 震音
    function rhodes(t, m, dur, v = 0.12) {
      const f = mtof(m);
      const car = ctx.createOscillator(); car.type = 'sine'; car.frequency.value = f; wobble(car);
      const mod = ctx.createOscillator(); mod.type = 'sine'; mod.frequency.value = f * 1.0; wobble(mod);
      const mg = ctx.createGain();
      mg.gain.setValueAtTime(f * 1.4, t); mg.gain.exponentialRampToValueAtTime(f * 0.15, t + 0.6);
      mod.connect(mg).connect(car.frequency);
      const tine = ctx.createOscillator(); tine.type = 'sine'; tine.frequency.value = f * 4.0;
      const tg = ctx.createGain(); tg.gain.setValueAtTime(v * 0.25, t); tg.gain.exponentialRampToValueAtTime(0.0001, t + 0.25);
      tine.connect(tg);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + 0.008);
      g.gain.setTargetAtTime(v * 0.35, t + 0.05, 0.6);
      g.gain.setTargetAtTime(0.0001, t + dur, 0.25);
      const trem = ctx.createGain(); trem.gain.value = 1;
      const lfo = ctx.createOscillator(); lfo.frequency.value = 4.2;
      const lg = ctx.createGain(); lg.gain.value = 0.18; lfo.connect(lg).connect(trem.gain);
      car.connect(g); tg.connect(g); g.connect(trem);
      pan(trem, (m % 7) / 7 - 0.4, duck);
      send(trem, 0.35, reverb);
      [car, mod, tine, lfo].forEach((o) => { o.start(t); o.stop(t + dur + 1.4); });
    }
    function pad(t, ms, dur, v = 0.035, bright = 1200) {
      const out = ctx.createGain(); out.connect(duck); send(out, 0.7, reverb);
      const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = bright; f.Q.value = 0.4;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(v, t + Math.min(1.0, dur * 0.4));
      g.gain.setValueAtTime(v, t + dur - 0.2); g.gain.linearRampToValueAtTime(0.0001, t + dur + 1.0);
      f.connect(g).connect(out);
      for (const m of ms) for (const det of [-11, 0, 11]) {
        const o = ctx.createOscillator(); o.type = det === 0 ? 'sine' : 'triangle'; o.frequency.value = mtof(m); o.detune.value = det; wobble(o);
        o.connect(f); o.start(t); o.stop(t + dur + 1.1);
      }
    }
    function bass(t, m, dur, v = 0.22) {
      const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = mtof(m); wobble(o);
      const o2 = ctx.createOscillator(); o2.type = 'triangle'; o2.frequency.value = mtof(m);
      const g2 = ctx.createGain(); g2.gain.value = 0.25;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + 0.02);
      g.gain.setTargetAtTime(v * 0.6, t + 0.1, 0.4); g.gain.setTargetAtTime(0.0001, t + dur, 0.12);
      o.connect(g); o2.connect(g2).connect(g); g.connect(duck);
      o.start(t); o2.start(t); o.stop(t + dur + 0.6); o2.stop(t + dur + 0.6);
    }
    // 八音盒 / 钢片琴
    function bell(t, m, v = 0.05, p = 0) {
      const out = ctx.createGain(); pan(out, p, musicBus); send(out, 0.45, reverb); send(out, 0.35, delay);
      [[1, 1, 1.4], [2.0, 0.35, 0.6], [3.01, 0.18, 0.35], [5.4, 0.08, 0.2]].forEach(([r, a, d]) => tone1(t, 'sine', mtof(m) * r, 0, d, v * a, out, 0.002));
    }

    /* ---------- 黑胶底噪 ---------- */
    function vinyl(t0, t1, v = 0.02) {
      const s = noise(t0, t1 - t0, true);
      const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 1800; f.Q.value = 0.4;
      const g = ctx.createGain(); g.gain.value = v;
      s.connect(f).connect(g).connect(master);
      let x = t0;
      while (x < t1) { crackle(x, 0.05 + rnd() * 0.08); x += 0.05 + rnd() * 0.5; }
    }
    let crackle = (t, v) => noiseHit(t, 0.004, 'highpass', 3000, v, master);

    /* ---------- 音效 ---------- */
    function blinkSfx(t, v = 0.5) {
      const g = noiseHit(t, 0.35, 'lowpass', 1400, 0.25 * v, sfx, 0.7, 200); send(g, 0.4, reverb);
      tone1(t + 0.05, 'sine', 90, 50, 0.3, 0.35 * v, sfx, 0.01);
    }
    function drop(t, v = 0.3, m = 84) {
      const out = ctx.createGain(); out.connect(sfx); send(out, 0.6, reverb); send(out, 0.3, delay);
      tone1(t, 'sine', mtof(m), mtof(m - 12), 0.18, v, out, 0.002);
      tone1(t + 0.02, 'sine', mtof(m + 7), mtof(m - 5), 0.12, v * 0.4, out, 0.002);
    }
    function bubbles(t0, t1, rate = 10, v = 0.05) {
      let x = t0;
      while (x < t1) { const f = 500 + rnd() * 900; tone1(x, 'sine', f, f * 2.2, 0.06 + rnd() * 0.05, v * (0.4 + rnd() * 0.6), sfx, 0.004); x += (0.4 + rnd()) / rate; }
    }
    function tick(t, v = 0.08, f = 2200) { noiseHit(t, 0.01, 'highpass', 5000, v, sfx); tone1(t, 'sine', f, 0, 0.02, v * 0.6, sfx, 0.001); }
    function swell(t, dur, v = 0.12) {
      const s = noise(t, dur, true);
      const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 1.2;
      f.frequency.setValueAtTime(400, t); f.frequency.exponentialRampToValueAtTime(5000, t + dur);
      const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + dur);
      g.gain.linearRampToValueAtTime(0.0001, t + dur + 0.05);
      s.connect(f).connect(g).connect(sfx); send(g, 0.6, reverb);
    }
    function whoosh(t, dur = 0.6, v = 0.15, p = 0) {
      const s = noise(t, dur);
      const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 0.9;
      f.frequency.setValueAtTime(300, t); f.frequency.exponentialRampToValueAtTime(2400, t + dur * 0.5); f.frequency.exponentialRampToValueAtTime(500, t + dur);
      const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + dur * 0.5); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      s.connect(f).connect(g); pan(g, p, sfx); send(g, 0.5, reverb);
    }
    function chime(t, ms, v = 0.08, gap = 0.09) { ms.forEach((m, i) => bell(t + i * gap, m, v, (i / ms.length - 0.5) * 0.8)); }
    function softAlarm(t, v = 0.07) {
      // 两遍温柔的"叮—叮叮"
      [0, 0.32, 0.48, 1.2, 1.52, 1.68].forEach((d, i) => bell(t + d, [88, 91, 91][i % 3], v, i % 2 ? 0.3 : -0.3));
    }
    function heart(t, v = 0.4) { tone1(t, 'sine', 70, 42, 0.18, v, sfx, 0.006); tone1(t + 0.22, 'sine', 62, 40, 0.16, v * 0.7, sfx, 0.006); }

    /* ---------- 事件队列（按渲染窗口建节点，见 render()） ---------- */
    const queue = [];
    let horizon = -Infinity;
    const defer = (fn) => (t, ...a) => (t < horizon ? fn(t, ...a) : queue.push([t, () => fn(t, ...a)]));
    const _kick = kick;
    kick = (t, v) => { kickTimes.push(t); defer(_kick)(t, v); };
    brush = defer(brush); shaker = defer(shaker); rim = defer(rim);
    rhodes = defer(rhodes); pad = defer(pad); bass = defer(bass); bell = defer(bell);
    blinkSfx = defer(blinkSfx); drop = defer(drop); bubbles = defer(bubbles); tick = defer(tick);
    crackle = defer(crackle); swell = defer(swell); whoosh = defer(whoosh); chime = defer(chime); softAlarm = defer(softAlarm); heart = defer(heart);

    /* =====================================================================
     * 配乐编排：每小节一个和弦（25 小节）
     * =================================================================== */
    // 和弦（C 大调的梦境七和弦）：rh = 电钢琴和弦音，root = 低音
    const CH = {
      Fmaj7: { rh: [53, 57, 60, 64], root: 41 },
      Em7: { rh: [52, 55, 59, 62], root: 40 },
      Dm9: { rh: [50, 53, 57, 64], root: 38 },
      G6: { rh: [55, 59, 62, 64], root: 43 },
      Cmaj7: { rh: [48, 52, 55, 59], root: 36 },
      Am9: { rh: [57, 60, 64, 71], root: 45 },
      Bbmaj7: { rh: [53, 58, 62, 65], root: 46 },
      E7sus: { rh: [52, 57, 59, 62], root: 40 },
    };
    const PROG = [
      'Fmaj7', 'Em7',                          // 0–6.4 钩子
      'Dm9', 'G6', 'Cmaj7', 'Am9',             // 6.4–19.2 实验
      'Fmaj7', 'Em7', 'Dm9', 'G6', 'Am9',      // 19.2–35.2 反差
      'Fmaj7', 'Em7', 'Dm9', 'Cmaj7', 'Am9',   // 35.2–51.2 睡眠债
      'Dm9', 'Bbmaj7', 'Am9', 'E7sus',         // 51.2–64 代价（更暗）
      'Cmaj7', 'Fmaj7', 'Am9', 'G6',           // 64–76.8 解法（天亮）
      'Fmaj7',                                 // 76.8–80 互动（接回开头）
    ];
    const secOf = (t) => FX.sceneAt(t).id;
    for (let b = 0; b < PROG.length; b++) {
      const t = b * BAR, ch = CH[PROG[b]], s = secOf(t + 0.01);
      const climax = t >= EV.climax - 0.01 && t < 64;
      // pad
      pad(t, ch.rh.map((m) => m + 12), BAR, s === 'fix' ? 0.045 : 0.035, s === 'fix' ? 2200 : s === 'cost' ? 900 : 1400);
      // 电钢琴：每小节两次和弦（第 1 拍、第 3 拍后半）
      if (s !== 'cta') {
        rhodes(t, ch.rh[0], BAR * 0.45, 0.07);
        ch.rh.slice(1).forEach((m, i) => rhodes(t + 0.02 * (i + 1), m, BAR * 0.45, 0.06));
        if (!climax) ch.rh.forEach((m, i) => rhodes(t + BEAT * 2.5 + 0.02 * i, m + (i === 3 ? 12 : 0), BAR * 0.35, 0.045));
      } else {
        ch.rh.forEach((m, i) => rhodes(t + 0.04 * i, m, BAR, 0.06));
      }
      // 低音
      if (s !== 'hook' || b === 1) {
        bass(t, ch.root, BEAT * 1.8);
        if (s !== 'cta' && !climax) bass(t + BEAT * 2.5, ch.root + (b % 2 ? 7 : 0), BEAT * 1.2, 0.17);
      }
      // 鼓：钩子第 2 小节进入，金句段抽掉
      const drumsOn = !(s === 'hook' && b === 0) && !climax && s !== 'cta';
      if (drumsOn) {
        for (let k = 0; k < 16; k++) {
          const st = t + k * STEP + (k % 2 ? STEP * 0.12 : 0); // 轻微摇摆
          if (k === 0 || k === 10) kick(st, s === 'cost' ? 0.85 : 0.75);
          if (k === 4 || k === 12) brush(st, 0.8);
          if (k % 2 === 0) shaker(st, k % 4 === 0 ? 0.7 : 0.45);
          if (k === 7 && rnd() < 0.5) rim(st, 0.8);
        }
      }
      // 八音盒琶音
      if (s === 'study' || s === 'debt' || s === 'fix' || s === 'hook') {
        const notes = ch.rh.map((m) => m + 24);
        const pattern = [0, 2, 1, 3, 2, 1];
        for (let k = 0; k < 6; k++) {
          if (s === 'hook' && b === 0 && k < 2) continue;
          bell(t + BEAT * 0.5 + k * BEAT * 0.5, notes[pattern[k]], s === 'fix' ? 0.05 : 0.035, (k / 6 - 0.5) * 0.9);
        }
      }
    }
    vinyl(0, CFG.DURATION, 0.018);

    // 段落滤波 / 音量 / 颤音深度自动化
    musicLP.frequency.setValueAtTime(900, 0);
    musicLP.frequency.exponentialRampToValueAtTime(9000, 3.2);
    musicLP.frequency.setValueAtTime(9000, 51.2);
    musicLP.frequency.exponentialRampToValueAtTime(2600, 52.0);   // 代价段：闷、像隔着一层水
    musicLP.frequency.setValueAtTime(2600, 60.4);
    musicLP.frequency.exponentialRampToValueAtTime(700, 60.8);
    musicLP.frequency.setValueAtTime(700, 63.6);
    musicLP.frequency.exponentialRampToValueAtTime(12000, 64.6); // 天亮：豁然开朗
    musicLP.frequency.setValueAtTime(12000, 78.6);
    musicLP.frequency.exponentialRampToValueAtTime(900, 80);
    wowDepth.gain.setValueAtTime(1, 0);
    wowDepth.gain.setValueAtTime(1, 51.2);
    wowDepth.gain.linearRampToValueAtTime(3.2, 53.0);
    wowDepth.gain.setValueAtTime(3.2, 63.8);
    wowDepth.gain.linearRampToValueAtTime(0.6, 64.6);
    // "掉速"：困倦到极点时整体音高下滑，金句前恢复
    sag.offset.setValueAtTime(0, 0);
    sag.offset.setValueAtTime(0, 59.6);
    sag.offset.linearRampToValueAtTime(-180, 60.6);
    sag.offset.setValueAtTime(-180, 60.75);
    sag.offset.linearRampToValueAtTime(0, 60.8);
    musicGain.gain.setValueAtTime(1, 0);
    musicGain.gain.setValueAtTime(1, 60.5);
    musicGain.gain.linearRampToValueAtTime(0.45, 60.8);
    musicGain.gain.setValueAtTime(0.45, 63.8);
    musicGain.gain.linearRampToValueAtTime(1, 64.4);
    // 侧链：底鼓轻压 pad / 电钢琴
    kickTimes.sort((a, b) => a - b);
    duck.gain.setValueAtTime(1, 0);
    for (const kt of kickTimes) {
      duck.gain.setValueAtTime(1, kt);
      duck.gain.linearRampToValueAtTime(0.7, kt + 0.02);
      duck.gain.linearRampToValueAtTime(1, kt + 0.35);
    }

    /* =====================================================================
     * 音效编排
     * =================================================================== */
    // 钩子：睁眼、换句时眨眼 + 水滴涟漪
    blinkSfx(0.05, 0.5);
    swell(EV.textSwap - 1.0, 1.0, 0.1);
    blinkSfx(EV.textSwap - 0.1, 0.45);
    drop(EV.textSwap, 0.32, 84);
    chime(EV.textSwap + 0.3, [76, 79, 84], 0.04, 0.12);
    // 实验：每组出现一声钢片琴，逐日滴答
    EV.lanes.forEach((tt, i) => bell(tt, [72, 76, 79, 71][i], 0.06, -0.3 + i * 0.2));
    for (let d = 0; d < 14; d++) tick(EV.days[0] + (d / 13) * (EV.days[1] - EV.days[0]), 0.06, 1800 + d * 40);
    // 反差：曲线碰线时的水滴，主观曲线出现时的风铃
    drop(EV.hit6, 0.35, 81);
    drop(EV.hit4, 0.28, 77);
    swell(EV.feel[0] - 0.8, 0.8, 0.08);
    chime(EV.feel[1], [72, 79, 83, 86], 0.05, 0.1);
    // 睡眠债：气泡 + 每次入夜一个低水滴
    bubbles(36.0, 43.4, 7, 0.04);
    EV.waterCycles.forEach((s, i) => { drop(s + 0.9, 0.22, 64 - i); });
    whoosh(EV.weekend - 0.2, 0.7, 0.12);
    drop(EV.weekend + 0.05, 0.25, 76);
    whoosh(EV.coffee - 0.2, 0.7, 0.12, 0.3);
    drop(EV.coffee + 0.05, 0.3, 72);
    // 代价：每次快切眨眼 + 心跳，金句前的吸气
    EV.cuts.forEach((c, i) => { blinkSfx(c, 0.35); if (i < 4) blinkSfx(c + 1.45, 0.3); });
    [51.6, 53.2, 54.8, 56.4, 58.0, 58.9, 59.7].forEach((h, i) => heart(h, 0.3 + i * 0.03));
    swell(59.8, 1.0, 0.14);
    drop(EV.climax, 0.3, 69);
    chime(EV.climax + 1.5, [69, 72, 76, 79, 84], 0.04, 0.16);
    // 解法：天亮的风铃 + 温柔闹铃 + 每张卡片一个水滴
    chime(EV.dawn + 0.1, [72, 76, 79, 84, 88], 0.06, 0.08);
    softAlarm(EV.tips[0] + 0.2, 0.05);
    EV.tips.forEach((tt) => { whoosh(tt - 0.15, 0.5, 0.08); drop(tt + 0.1, 0.2, 79); });
    // 互动 + 闭眼
    bell(77.7, 84, 0.06); bell(77.8, 88, 0.05);
    swell(78.6, 0.6, 0.08);
    blinkSfx(EV.closeEyes + 0.4, 0.5);

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

  A.render = async function (sampleRate = 48000) {
    const len = Math.ceil(FX.CFG.DURATION * sampleRate);
    const ctx = new OfflineAudioContext(2, len, sampleRate);
    const flush = A.build(ctx, ctx.destination);
    const WIN = 1;
    for (let w = WIN; w < FX.CFG.DURATION; w += WIN) ctx.suspend(w).then(() => { flush(w + WIN); ctx.resume(); });
    flush(WIN);
    const buf = await ctx.startRendering();
    let peak = 0;
    for (let c = 0; c < buf.numberOfChannels; c++) { const d = buf.getChannelData(c); for (let i = 0; i < d.length; i++) { const a = Math.abs(d[i]); if (a > peak) peak = a; } }
    const gain = peak > 0 ? 0.89 / peak : 1;
    for (let c = 0; c < buf.numberOfChannels; c++) { const d = buf.getChannelData(c); for (let i = 0; i < d.length; i++) d[i] *= gain; }
    return buf;
  };

  A.toWav = function (buf) {
    const ch = buf.numberOfChannels, sr = buf.sampleRate, n = buf.length;
    const out = new ArrayBuffer(44 + n * ch * 2);
    const v = new DataView(out);
    const w = (o, s) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
    w(0, 'RIFF'); v.setUint32(4, 36 + n * ch * 2, true); w(8, 'WAVE');
    w(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, ch, true);
    v.setUint32(24, sr, true); v.setUint32(28, sr * ch * 2, true); v.setUint16(32, ch * 2, true); v.setUint16(34, 16, true);
    w(36, 'data'); v.setUint32(40, n * ch * 2, true);
    const chans = []; for (let c = 0; c < ch; c++) chans.push(buf.getChannelData(c));
    let o = 44;
    for (let i = 0; i < n; i++) for (let c = 0; c < ch; c++) { const s = Math.max(-1, Math.min(1, chans[c][i])); v.setInt16(o, s < 0 ? s * 0x8000 : s * 0x7fff, true); o += 2; }
    return out;
  };
})();
