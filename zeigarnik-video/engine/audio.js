// 临时配乐与音效：全部用 Web Audio 程序合成，按 ZG.CUES 卡点生成整条 62 秒音轨。
// 正式版请替换为曲库音乐 + 真人/TTS 旁白；这条音轨用于预演节奏。
(function () {
  const ZG = window.ZG;
  const NOTE = { C: 0, 'C#': 1, D: 2, 'D#': 3, E: 4, F: 5, 'F#': 6, G: 7, 'G#': 8, A: 9, 'A#': 10, B: 11 };
  const hz = (n) => { const m = n.match(/^([A-G]#?)(\d)$/); return 440 * Math.pow(2, (NOTE[m[1]] + (+m[2] + 1) * 12 - 69) / 12); };
  const CHORDS = {
    Am: ['A2', 'E3', 'A3', 'C4', 'E4'], F: ['F2', 'C3', 'F3', 'A3', 'C4'], C: ['C3', 'G3', 'C4', 'E4', 'G4'],
    G: ['G2', 'D3', 'G3', 'B3', 'D4'], Am9: ['A2', 'E3', 'B3', 'C4', 'G4'],
  };

  function build(sampleRate = 48000) {
    const D = ZG.META.DURATION, ac = new OfflineAudioContext(2, Math.ceil(D * sampleRate), sampleRate);
    const R = ZG.rng(4242);
    // 母线：压缩 → 输出；混响发送
    const comp = ac.createDynamicsCompressor(); comp.threshold.value = -16; comp.ratio.value = 3; comp.attack.value = 0.005; comp.release.value = 0.25;
    const master = ac.createGain(); master.gain.value = 0.72; master.connect(comp); comp.connect(ac.destination);
    const verb = ac.createConvolver(), irLen = sampleRate * 3.2, ir = ac.createBuffer(2, irLen, sampleRate);
    for (let ch = 0; ch < 2; ch++) { const d = ir.getChannelData(ch); for (let i = 0; i < irLen; i++) d[i] = (R() * 2 - 1) * Math.pow(1 - i / irLen, 3.2); }
    verb.buffer = ir; const verbGain = ac.createGain(); verbGain.gain.value = 0.32; verb.connect(verbGain); verbGain.connect(master);
    const bus = (wet = 0.3, pan = 0) => {
      const g = ac.createGain(), p = ac.createStereoPanner(); p.pan.value = pan; g.connect(p); p.connect(master);
      if (wet > 0) { const s = ac.createGain(); s.gain.value = wet; g.connect(s); s.connect(verb); }
      return g;
    };
    const white = ac.createBuffer(1, sampleRate * 2, sampleRate); { const d = white.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = R() * 2 - 1; }
    const brown = ac.createBuffer(1, sampleRate * 4, sampleRate); { const d = brown.getChannelData(0); let l = 0; for (let i = 0; i < d.length; i++) { l = (l + 0.02 * (R() * 2 - 1)) / 1.02; d[i] = l * 3.5; } }
    const noise = (buf, t, dur, out) => { const s = ac.createBufferSource(); s.buffer = buf; s.loop = true; s.connect(out); s.start(t, R() * 1.5); s.stop(t + dur + 0.05); return s; };
    const env = (g, t, a, peak, d, curve = 'exp') => {
      g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(peak, t + a);
      if (curve === 'exp') g.gain.exponentialRampToValueAtTime(0.0001, t + a + d); else g.gain.linearRampToValueAtTime(0.0001, t + a + d);
    };
    const filt = (type, f, q = 0.7) => { const b = ac.createBiquadFilter(); b.type = type; b.frequency.value = f; b.Q.value = q; return b; };
    const osc = (type, f, t, dur, out) => { const o = ac.createOscillator(); o.type = type; o.frequency.setValueAtTime(f, t); o.connect(out); o.start(t); o.stop(t + dur + 0.05); return o; };

    // ---------- 乐器 ----------
    function piano(f, t, vel = 0.2, dur = 3, out) {
      const o2 = out || bus(0.35, (R() - 0.5) * 0.4);
      [[1, 1, 1], [2, 0.45, 1.6], [3, 0.2, 2.4], [4, 0.1, 3.2], [5, 0.05, 4]].forEach(([m, amp, dk]) => {
        const g = ac.createGain(); g.connect(o2); osc('sine', f * m * (1 + 0.0007 * m * m), t, dur, g);
        env(g, t, 0.004, vel * amp, dur / dk);
      });
    }
    function bell(f, t, vel, dur, ratios, pan = 0, wet = 0.5) {
      const o2 = bus(wet, pan);
      ratios.forEach(([m, amp, dk], i) => { const g = ac.createGain(); g.connect(o2); osc('sine', f * m, t, dur, g); env(g, t, 0.002 + i * 0.001, vel * amp, dur * dk); });
    }
    function pad(names, t, dur, vel, cutoff) {
      const out = bus(0.55, 0), lp = filt('lowpass', cutoff); lp.connect(out);
      names.forEach((n, i) => [-6, 6].forEach((cents) => {
        const g = ac.createGain(); g.connect(lp); const o = osc(i < 2 ? 'triangle' : 'sawtooth', hz(n), t, dur + 2, g); o.detune.value = cents;
        g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vel, t + Math.min(1.6, dur * 0.4));
        g.gain.setValueAtTime(vel, t + dur); g.gain.linearRampToValueAtTime(0.0001, t + dur + 1.8);
      }));
    }

    // ---------- 音效 ----------
    const SFX = {
      heartbeat(t) {
        [[0, 0.9], [0.22, 0.65]].forEach(([dt, v]) => {
          const g = ac.createGain(), lp = filt('lowpass', 140); g.connect(lp); lp.connect(bus(0.1));
          const o = osc('sine', 72, t + dt, 0.3, g); o.frequency.exponentialRampToValueAtTime(42, t + dt + 0.14); env(g, t + dt, 0.006, v, 0.2);
        });
      },
      rumble(t, c) {
        const g = ac.createGain(), lp = filt('lowpass', 95); g.connect(lp); lp.connect(bus(0.05));
        noise(brown, t, c.dur, g); const v = c.soft ? 0.18 : 0.42;
        g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(v, t + 0.4); g.gain.setValueAtTime(v, t + c.dur - 0.5); g.gain.linearRampToValueAtTime(0.0001, t + c.dur);
      },
      riser(t, c) {
        const g = ac.createGain(), bp = filt('bandpass', 400, 1.2); g.connect(bp); bp.connect(bus(0.3)); noise(white, t, c.dur, g);
        bp.frequency.setValueAtTime(400, t); bp.frequency.exponentialRampToValueAtTime(5000, t + c.dur);
        g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.22, t + c.dur); g.gain.linearRampToValueAtTime(0.0001, t + c.dur + 0.03);
      },
      crack(t) {
        [0, 0.035, 0.09].forEach((dt, i) => {
          const g = ac.createGain(), hp = filt('highpass', 2200); g.connect(hp); hp.connect(bus(0.4, (R() - 0.5) * 0.6)); noise(white, t + dt, 0.4, g); env(g, t + dt, 0.001, 0.9 - i * 0.25, 0.22 - i * 0.04);
        });
        for (let i = 0; i < 6; i++) bell(3000 + R() * 4500, t + R() * 0.12, 0.05, 0.4, [[1, 1, 0.5]], (R() - 0.5), 0.6);
      },
      boom(t) {
        const g = ac.createGain(), lp = filt('lowpass', 220); g.connect(lp); lp.connect(bus(0.25));
        const o = osc('sine', 95, t, 2.2, g); o.frequency.exponentialRampToValueAtTime(30, t + 1.1); env(g, t, 0.005, 0.7, 1.9);
        const g2 = ac.createGain(), lp2 = filt('lowpass', 400); g2.connect(lp2); lp2.connect(bus(0.4)); noise(brown, t, 0.6, g2); env(g2, t, 0.003, 0.4, 0.5);
      },
      pad(t, c) { pad(CHORDS[c.chord], t, c.dur, c.soft ? 0.024 : 0.038, c.soft ? 750 : 1150); },
      burn(t) {
        const g = ac.createGain(), bp = filt('bandpass', 1400, 0.8); g.connect(bp); bp.connect(bus(0.4, (R() - 0.5) * 0.8)); noise(white, t, 0.7, g);
        bp.frequency.setValueAtTime(800, t); bp.frequency.exponentialRampToValueAtTime(3000, t + 0.5);
        g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.16, t + 0.12); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.65);
      },
      ticks(t, c) {
        let x = 0, gap = 0.24;
        while (x < c.dur) { SFX.tick(t + x, 0.12 + x * 0.03); x += gap; gap = Math.max(0.09, gap * 0.9); }
      },
      tick(t, v) { v = typeof v === 'number' ? v : 0.15; const g = ac.createGain(), hp = filt('highpass', 3500); g.connect(hp); hp.connect(bus(0.15)); noise(white, t, 0.03, g); env(g, t, 0.001, v, 0.02); },
      note(t, c) { piano(hz(c.note), t, 0.22, 4); },
      whoosh(t) {
        const g = ac.createGain(), bp = filt('bandpass', 300, 1.4); g.connect(bp); bp.connect(bus(0.3)); noise(white, t - 0.2, 0.75, g);
        bp.frequency.setValueAtTime(300, t - 0.2); bp.frequency.exponentialRampToValueAtTime(2400, t + 0.05); bp.frequency.exponentialRampToValueAtTime(500, t + 0.5);
        g.gain.setValueAtTime(0.0001, t - 0.2); g.gain.linearRampToValueAtTime(0.28, t + 0.05); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
      },
      vinyl(t, c) {
        const g = ac.createGain(), bp = filt('bandpass', 2500, 0.5); g.connect(bp); bp.connect(bus(0.1)); noise(white, t, c.dur, g);
        g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.025, t + 0.4); g.gain.setValueAtTime(0.025, t + c.dur - 0.3); g.gain.linearRampToValueAtTime(0.0001, t + c.dur);
        for (let x = 0; x < c.dur; x += 0.05 + R() * 0.25) SFX.tick(t + x, 0.03 + R() * 0.05);
        [['A3', 0], ['C4', 1.2], ['E4', 2.4], ['D4', 3.6], ['C4', 4.8], ['B3', 6.0]].forEach(([n, dt]) => {
          const lp = filt('lowpass', 1600), hp = filt('highpass', 350), o2 = bus(0.2, -0.3); hp.connect(lp); lp.connect(o2);
          piano(hz(n), t + dt, 0.05, 2.2, hp);
        });
      },
      pop(t) { const g = ac.createGain(); g.connect(bus(0.35, (R() - 0.5) * 0.8)); const o = osc('sine', 700, t, 0.15, g); o.frequency.exponentialRampToValueAtTime(1300, t + 0.06); env(g, t, 0.003, 0.12, 0.1); },
      coin(t) { [0, 0.075, 0.13].forEach((dt, i) => bell(2100 + i * 160, t + dt, 0.08 - i * 0.02, 0.5, [[1, 1, 0.5], [1.62, 0.7, 0.35], [2.43, 0.5, 0.25], [3.2, 0.3, 0.2]], 0.2, 0.3)); },
      ding(t) { SFX.tick(t - 0.02, 0.18); bell(hz('G6'), t, 0.16, 1.6, [[1, 1, 1], [2, 0.35, 0.6], [2.76, 0.25, 0.45], [4.07, 0.12, 0.3], [5.4, 0.06, 0.2]], 0.15, 0.45); },
      reverse(t, c) {
        const g = ac.createGain(), hp = filt('highpass', 1500); g.connect(hp); hp.connect(bus(0.5)); noise(white, t, c.dur, g);
        g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.3, t + c.dur); g.gain.linearRampToValueAtTime(0.0001, t + c.dur + 0.02);
      },
      cello(t, c) {
        const out = bus(0.45), lp = filt('lowpass', 1100, 0.9); lp.connect(out);
        [['A2', 0.07], ['E3', 0.05]].forEach(([n, v]) => {
          const g = ac.createGain(); g.connect(lp); const o = osc('sawtooth', hz(n), t, c.dur + 1, g);
          const lfo = ac.createOscillator(), lg = ac.createGain(); lfo.frequency.value = 5.2; lg.gain.value = 9; lfo.connect(lg); lg.connect(o.detune); lfo.start(t); lfo.stop(t + c.dur + 1);
          g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(v, t + 0.9); g.gain.linearRampToValueAtTime(v * 1.5, t + c.dur * 0.7);
          g.gain.linearRampToValueAtTime(0.0001, t + c.dur + 0.6);
        });
      },
      twang(t) {
        const out = bus(0.4), lp = filt('lowpass', 4000, 2); lp.connect(out); const g = ac.createGain(); g.connect(lp);
        const o = osc('sawtooth', 300, t, 1.2, g); o.frequency.exponentialRampToValueAtTime(196, t + 0.07);
        lp.frequency.setValueAtTime(4500, t); lp.frequency.exponentialRampToValueAtTime(500, t + 0.6); env(g, t, 0.002, 0.25, 0.9);
        SFX.heartbeat(t + 0.02);
      },
      click(t) { const g = ac.createGain(), bp = filt('bandpass', 1800, 2); g.connect(bp); bp.connect(bus(0.2, (R() - 0.5) * 0.8)); noise(white, t, 0.03, g); env(g, t, 0.001, 0.22, 0.02); },
      piano(t, c) {
        const seg = c.dur / c.prog.length;
        c.prog.forEach((ch, k) => {
          const notes = CHORDS[ch], order = [0, 2, 3, 4, 3, 2];
          for (let i = 0; i < 6; i++) { const tt = t + k * seg + i * (seg / 6); if (tt < t + c.dur) piano(hz(notes[order[i]]) * (i === 3 ? 2 : 1), tt, i ? 0.09 : 0.15, 2.6); }
        });
      },
      chime(t) { bell(hz('E5'), t, 0.07, 1.2, [[1, 1, 1], [2, 0.2, 0.5]], -0.2, 0.4); bell(hz('C5'), t + 0.32, 0.07, 1.4, [[1, 1, 1], [2, 0.2, 0.5]], 0.2, 0.4); },
      tap(t) { [0, 0.16].forEach((dt) => { const g = ac.createGain(), lp = filt('lowpass', 400); g.connect(lp); lp.connect(bus(0.05)); osc('square', 165, t + dt, 0.1, g); env(g, t + dt, 0.005, 0.12, 0.08, 'lin'); }); },
      susp(t) { bell(hz('B5'), t, 0.07, 2.2, [[1, 1, 1], [2.76, 0.2, 0.5]], -0.3, 0.5); bell(hz('C6'), t + 0.01, 0.06, 2.2, [[1, 1, 1]], 0.3, 0.5); },
      rewind(t) {
        const g = ac.createGain(), bp = filt('bandpass', 900, 1); g.connect(bp); bp.connect(bus(0.2)); const o = osc('sawtooth', 180, t, 0.35, g);
        o.frequency.exponentialRampToValueAtTime(1900, t + 0.28); env(g, t, 0.01, 0.07, 0.3, 'lin'); noise(white, t, 0.3, g);
      },
      lamp(t) { SFX.click(t); SFX.click(t + 0.012); const g = ac.createGain(), lp = filt('lowpass', 300); g.connect(lp); lp.connect(bus(0.3)); osc('sine', 120, t, 0.5, g); env(g, t, 0.01, 0.25, 0.4); },
      pen(t, c) {
        for (let x = 0; x < c.dur; x += 0.18 + R() * 0.2) {
          const d = 0.08 + R() * 0.15, g = ac.createGain(), bp = filt('bandpass', 3200 + R() * 1500, 1.5); g.connect(bp); bp.connect(bus(0.1, 0.1));
          noise(white, t + x, d, g); g.gain.setValueAtTime(0.0001, t + x); g.gain.linearRampToValueAtTime(0.05, t + x + d * 0.3); g.gain.linearRampToValueAtTime(0.0001, t + x + d);
        }
      },
      bell(t) {
        bell(hz('C5'), t, 0.32, 6, [[0.5, 0.6, 1], [1, 1, 0.8], [1.19, 0.45, 0.6], [1.5, 0.35, 0.5], [2, 0.3, 0.45], [2.5, 0.18, 0.35], [3, 0.12, 0.3], [4.2, 0.08, 0.2]], 0, 0.7);
        bell(hz('G5'), t + 0.004, 0.08, 4, [[1, 1, 0.6], [2, 0.3, 0.4]], 0.4, 0.8);
      },
      swell(t, c) { pad(CHORDS[c.chord].concat(['C5', 'F5']), t, c.dur, 0.03, 2200); },
      birds(t, c) {
        for (let x = 0.2; x < c.dur; x += 0.35 + R() * 0.7) {
          const n = 2 + Math.floor(R() * 3), base = 2600 + R() * 1600, pan = (R() - 0.5) * 1.6;
          for (let k = 0; k < n; k++) { const tt = t + x + k * 0.07, g = ac.createGain(); g.connect(bus(0.4, pan)); const o = osc('sine', base, tt, 0.08, g); o.frequency.exponentialRampToValueAtTime(base * 1.5, tt + 0.05); env(g, tt, 0.005, 0.025, 0.06); }
        }
      },
    };
    ZG.CUES.forEach((c) => { const fn = SFX[c.sfx]; if (fn) fn(c.t, c); });
    return ac.startRendering();
  }

  function wav(buf) {
    const n = buf.length, ch = buf.numberOfChannels, sr = buf.sampleRate, bytes = 44 + n * ch * 2, ab = new ArrayBuffer(bytes), v = new DataView(ab);
    const w = (o, s) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
    w(0, 'RIFF'); v.setUint32(4, bytes - 8, true); w(8, 'WAVE'); w(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true);
    v.setUint16(22, ch, true); v.setUint32(24, sr, true); v.setUint32(28, sr * ch * 2, true); v.setUint16(32, ch * 2, true); v.setUint16(34, 16, true);
    w(36, 'data'); v.setUint32(40, n * ch * 2, true);
    const data = [...Array(ch)].map((_, i) => buf.getChannelData(i)); let o = 44;
    for (let i = 0; i < n; i++) for (let c = 0; c < ch; c++) { const s = Math.max(-1, Math.min(1, data[c][i])); v.setInt16(o, s < 0 ? s * 0x8000 : s * 0x7fff, true); o += 2; }
    return ab;
  }

  ZG.Audio = {
    _buf: null,
    async buffer() { return this._buf || (this._buf = await build()); },
    async wavBase64() {
      const ab = wav(await this.buffer()), u8 = new Uint8Array(ab); let s = '';
      for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000));
      return btoa(s);
    },
  };
})();
