'use strict';
// ============================================================================
//  Soundtrack: everything synthesised with Web Audio in an OfflineAudioContext.
//  Anime-rock at 150 BPM on the "royal road" progression (IV–V–iii–vi in G),
//  guzheng plucks, taiko, braams, plus SFX cued to the picture.
// ============================================================================

const SR = 48000;
const mtof = m => 440 * Math.pow(2, (m - 69) / 12);
const bt = (bar, beat = 0) => bar * BAR + beat * BEAT;

class Mixer {
  constructor(ctx) {
    this.ctx = ctx;
    this.rng = new RNG(1234);
    const c = ctx;
    this.out = c.createGain(); this.out.gain.value = 0.78;
    const comp = c.createDynamicsCompressor();
    comp.threshold.value = -18; comp.knee.value = 8; comp.ratio.value = 3.5; comp.attack.value = 0.006; comp.release.value = 0.22;
    const lim = c.createDynamicsCompressor();
    lim.threshold.value = -2; lim.knee.value = 0; lim.ratio.value = 20; lim.attack.value = 0.001; lim.release.value = 0.08;
    this.out.connect(comp); comp.connect(lim); lim.connect(c.destination);
    // music bus with filter (slow-mo) + duck gain
    this.music = c.createGain(); this.music.gain.value = 0.8;
    this.mfilt = c.createBiquadFilter(); this.mfilt.type = 'lowpass'; this.mfilt.frequency.value = 20000; this.mfilt.Q.value = 0.7;
    this.duck = c.createGain();
    this.music.connect(this.mfilt); this.mfilt.connect(this.duck); this.duck.connect(this.out);
    this.sfx = c.createGain(); this.sfx.gain.value = 0.9; this.sfx.connect(this.out);
    // reverb
    this.verb = c.createConvolver(); this.verb.buffer = this.makeIR(2.8, 2.6);
    this.verbIn = c.createGain(); this.verbIn.gain.value = 1;
    const verbOut = c.createGain(); verbOut.gain.value = 0.55;
    this.wet = c.createGain(); this.wet.gain.value = 1; this.wet.connect(this.out);
    this.verbIn.connect(this.verb); this.verb.connect(verbOut); verbOut.connect(this.wet);
    // ping-pong delay
    this.dly = c.createGain();
    const dl = c.createDelay(2), dr = c.createDelay(2), fb = c.createGain(), pl = c.createStereoPanner(), pr = c.createStereoPanner();
    dl.delayTime.value = BEAT * 0.75; dr.delayTime.value = BEAT * 0.75; fb.gain.value = 0.38; pl.pan.value = -0.7; pr.pan.value = 0.7;
    const dlp = c.createBiquadFilter(); dlp.type = 'lowpass'; dlp.frequency.value = 4500;
    this.dly.connect(dl); dl.connect(pl); pl.connect(this.wet); dl.connect(dr); dr.connect(pr); pr.connect(this.wet); dr.connect(dlp); dlp.connect(fb); fb.connect(dl);
    // shared instrument buses
    this.kickBus = this.shaper(2.2); this.kickBus.connect(this.music);
    this.bassBus = this.shaper(1.6); const bOut = this.g(0.55); this.bassBus.connect(bOut); bOut.connect(this.music);
    this.gtrBus = this.shaper(9);
    const gpk = this.filt('peaking', 900, 1); gpk.gain.value = -6;
    const gcab = this.filt('lowpass', 2600, 0.9), ghp = this.filt('highpass', 90);
    this.gtrBus.connect(gpk); gpk.connect(gcab); gcab.connect(ghp); const gOut = this.g(0.12); ghp.connect(gOut); gOut.connect(this.music);
    this.hatBus = this.filt('highpass', 8000); this.hatBus.connect(this.music);
    // noise sources
    this.white = this.noise(3, 'white');
    this.pink = this.noise(3, 'pink');
    this.brown = this.noise(4, 'brown');
    this.ks = new Map();
  }
  makeIR(sec, decay) {
    const c = this.ctx, n = Math.floor(sec * SR), b = c.createBuffer(2, n, SR), r = new RNG(77);
    for (let ch = 0; ch < 2; ch++) {
      const d = b.getChannelData(ch);
      for (let i = 0; i < n; i++) {
        const tt = i / SR;
        const er = tt < 0.08 && r.next() < 0.004 ? 1 : 0;
        d[i] = ((r.next() * 2 - 1) * Math.pow(1 - tt / sec, decay) * 0.6 + er * 0.5) * (tt < 0.01 ? tt / 0.01 : 1);
      }
    }
    return b;
  }
  noise(sec, type) {
    const n = Math.floor(sec * SR), b = this.ctx.createBuffer(1, n, SR), d = b.getChannelData(0), r = new RNG(type.length * 99);
    let b0 = 0, b1 = 0, b2 = 0, last = 0;
    for (let i = 0; i < n; i++) {
      const w = r.next() * 2 - 1;
      if (type === 'white') d[i] = w;
      else if (type === 'pink') { b0 = 0.99765 * b0 + w * 0.099; b1 = 0.963 * b1 + w * 0.2965; b2 = 0.57 * b2 + w * 1.0526; d[i] = (b0 + b1 + b2 + w * 0.1848) * 0.2; }
      else { last = (last + 0.02 * w) / 1.02; d[i] = last * 3.5; }
    }
    return b;
  }
  // -------------------------------------------------------------- helpers
  g(v = 1) { const n = this.ctx.createGain(); n.gain.value = v; return n; }
  osc(type, f) { const o = this.ctx.createOscillator(); o.type = type; o.frequency.value = f; return o; }
  filt(type, f, q = 0.7) { const b = this.ctx.createBiquadFilter(); b.type = type; b.frequency.value = f; b.Q.value = q; return b; }
  pan(p) { const s = this.ctx.createStereoPanner(); s.pan.value = p; return s; }
  src(buf, loop = true) { const s = this.ctx.createBufferSource(); s.buffer = buf; s.loop = loop; return s; }
  shaper(k) {
    const n = 2048, c = new Float32Array(n);
    for (let i = 0; i < n; i++) { const x = i / (n - 1) * 2 - 1; c[i] = Math.tanh(x * k) / Math.tanh(k); }
    const s = this.ctx.createWaveShaper(); s.curve = c; s.oversample = '2x'; return s;
  }
  // gain envelope: attack, hold-decay to sustain level, release at end
  adsr(gain, t, a, d, s, dur, r, peak) {
    const p = gain.gain;
    p.setValueAtTime(0, t);
    p.linearRampToValueAtTime(peak, t + a);
    p.setTargetAtTime(peak * s, t + a, d / 3 + 1e-4);
    p.setTargetAtTime(0, t + Math.max(a, dur), r / 4 + 1e-4);
  }
  send(node, dest, v) { const g = this.g(v); node.connect(g); g.connect(dest); }
  stop(nodes, t) { for (const n of nodes) n.stop(t); }

  // ================================================================ DRUMS
  kick(t, v = 1) {
    const o = this.osc('sine', 150), g = this.g(0);
    o.frequency.setValueAtTime(170, t); o.frequency.exponentialRampToValueAtTime(48, t + 0.11); o.frequency.exponentialRampToValueAtTime(38, t + 0.4);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v, t + 0.003); g.gain.exponentialRampToValueAtTime(0.001, t + 0.42);
    o.connect(g); g.connect(this.kickBus);
    o.start(t); o.stop(t + 0.45);
    const n = this.src(this.white), hp = this.filt('highpass', 2500), ng = this.g(0);
    ng.gain.setValueAtTime(0.25 * v, t); ng.gain.exponentialRampToValueAtTime(0.001, t + 0.015);
    n.connect(hp); hp.connect(ng); ng.connect(this.music); n.start(t, this.rng.next()); n.stop(t + 0.03);
  }
  snare(t, v = 1) {
    const n = this.src(this.white), bp = this.filt('bandpass', 1900, 0.8), hp = this.filt('highpass', 500), g = this.g(0);
    g.gain.setValueAtTime(0.75 * v, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
    n.connect(bp); bp.connect(hp); hp.connect(g); g.connect(this.music); this.send(g, this.verbIn, 0.35);
    n.start(t, this.rng.next() * 2); n.stop(t + 0.25);
    const o = this.osc('triangle', 200), og = this.g(0);
    o.frequency.setValueAtTime(220, t); o.frequency.exponentialRampToValueAtTime(160, t + 0.08);
    og.gain.setValueAtTime(0.55 * v, t); og.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
    o.connect(og); og.connect(this.music); o.start(t); o.stop(t + 0.14);
  }
  hat(t, v = 1, open = false, p = 0.25) {
    const n = this.src(this.white), g = this.g(0), pn = this.pan(p);
    const d = open ? 0.28 : 0.045;
    g.gain.setValueAtTime(0.44 * v, t); g.gain.exponentialRampToValueAtTime(0.001, t + d);
    n.connect(g); g.connect(pn); pn.connect(this.hatBus);
    n.start(t, this.rng.next() * 2); n.stop(t + d + 0.02);
  }
  crash(t, v = 1) {
    const n = this.src(this.white), hp = this.filt('highpass', 4200), g = this.g(0);
    g.gain.setValueAtTime(0.45 * v, t); g.gain.exponentialRampToValueAtTime(0.001, t + 2.2);
    n.connect(hp); hp.connect(g); g.connect(this.music); this.send(g, this.verbIn, 0.3);
    n.start(t, this.rng.next()); n.stop(t + 2.3);
  }
  taiko(t, v = 1, f = 70) {
    const o = this.osc('sine', f), g = this.g(0);
    o.frequency.setValueAtTime(f * 1.5, t); o.frequency.exponentialRampToValueAtTime(f, t + 0.08);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v, t + 0.004); g.gain.exponentialRampToValueAtTime(0.001, t + 1.0);
    o.connect(g); g.connect(this.music); this.send(g, this.verbIn, 0.6);
    o.start(t); o.stop(t + 1.05);
    const n = this.src(this.brown), lp = this.filt('lowpass', 900), ng = this.g(0);
    ng.gain.setValueAtTime(0.9 * v, t); ng.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
    n.connect(lp); lp.connect(ng); ng.connect(this.music); this.send(ng, this.verbIn, 0.5);
    n.start(t, this.rng.next() * 3); n.stop(t + 0.2);
  }
  tom(t, v = 1, f = 120) {
    const o = this.osc('sine', f), g = this.g(0);
    o.frequency.setValueAtTime(f * 1.4, t); o.frequency.exponentialRampToValueAtTime(f, t + 0.1);
    g.gain.setValueAtTime(0.8 * v, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
    o.connect(g); g.connect(this.music); this.send(g, this.verbIn, 0.3); o.start(t); o.stop(t + 0.4);
  }
  // ============================================================== TONAL
  bass(t, m, dur, v = 1) {
    const f = mtof(m);
    const o1 = this.osc('sawtooth', f), o2 = this.osc('square', f / 2), lp = this.filt('lowpass', 300, 4), g = this.g(0);
    o1.detune.value = -6;
    lp.frequency.setValueAtTime(260, t); lp.frequency.linearRampToValueAtTime(1500, t + 0.012); lp.frequency.setTargetAtTime(380, t + 0.015, 0.06);
    const s2 = this.g(0.25);
    o1.connect(lp); o2.connect(s2); s2.connect(lp); lp.connect(g); g.connect(this.bassBus);
    this.adsr(g, t, 0.005, 0.12, 0.7, dur * 0.85, 0.04, 0.42 * v);
    o1.start(t); o2.start(t); o1.stop(t + dur + 0.1); o2.stop(t + dur + 0.1);
  }
  chug(t, root, dur, v = 1, open = false) {
    const fs = [mtof(root), mtof(root + 7), mtof(root + 12)];
    const g = this.g(0);
    fs.forEach((f, i) => { const o = this.osc('sawtooth', f); o.detune.value = (i - 1) * 7; o.connect(g); o.start(t); o.stop(t + dur + 0.1); });
    g.connect(this.gtrBus);
    const d = open ? dur * 0.9 : 0.11;
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.5 * v, t + 0.004); g.gain.setTargetAtTime(0, t + d, 0.025);
  }
  pad(t, notes, dur, v = 1, bright = 1800) {
    const g = this.g(0), lp = this.filt('lowpass', bright, 0.6);
    lp.connect(g); g.connect(this.music); this.send(g, this.verbIn, 0.5);
    for (const m of notes) for (const dt of [-9, 0, 9]) {
      const o = this.osc('sawtooth', mtof(m)); o.detune.value = dt + (this.rng.next() - 0.5) * 4;
      const pn = this.pan((dt / 9) * 0.6); o.connect(pn); pn.connect(lp);
      o.start(t); o.stop(t + dur + 1.6);
    }
    this.adsr(g, t, 0.5, 0.6, 0.85, dur, 1.2, 0.05 * v / Math.max(1, notes.length / 3));
  }
  lead(t, m, dur, v = 1, glideFrom = null) {
    const f = mtof(m);
    const g = this.g(0), lp = this.filt('lowpass', 5600, 1.1), mix = this.g(1);
    const vib = this.osc('sine', 5.6), vg = this.g(0);
    vg.gain.setValueAtTime(0, t); vg.gain.linearRampToValueAtTime(f * 0.012, t + Math.min(0.3, dur));
    vib.connect(vg);
    const oscs = [];
    for (const dt of [-14, -6, 0, 6, 14]) {
      const o = this.osc('sawtooth', f); o.detune.value = dt;
      if (glideFrom) { o.frequency.setValueAtTime(mtof(glideFrom), t); o.frequency.exponentialRampToValueAtTime(f, t + 0.06); }
      vg.connect(o.frequency); o.connect(mix); oscs.push(o);
    }
    const sq = this.osc('square', f / 2); const sg = this.g(0.3); sq.connect(sg); sg.connect(mix); oscs.push(sq);
    mix.connect(lp); lp.connect(g); g.connect(this.music); this.send(g, this.verbIn, 0.35); this.send(g, this.dly, 0.18);
    this.adsr(g, t, 0.012, 0.2, 0.8, dur * 0.95, 0.12, 0.056 * v);
    for (const o of oscs) { o.start(t); o.stop(t + dur + 0.4); }
    vib.start(t); vib.stop(t + dur + 0.4);
  }
  ksBuffer(m) {
    if (this.ks.has(m)) return this.ks.get(m);
    const f = mtof(m), n = Math.floor(SR * 2.2), b = this.ctx.createBuffer(1, n, SR), d = b.getChannelData(0);
    const P = Math.max(2, Math.round(SR / f)), r = new RNG(m * 31), line = new Float32Array(P);
    for (let i = 0; i < P; i++) line[i] = (r.next() * 2 - 1) * (0.7 + 0.3 * Math.sin(i / P * Math.PI));
    let idx = 0, prev = 0;
    for (let i = 0; i < n; i++) {
      const cur = line[idx];
      const nv = 0.996 * (0.5 * cur + 0.5 * prev);
      prev = cur; line[idx] = nv; d[i] = cur;
      idx = (idx + 1) % P;
    }
    this.ks.set(m, b);
    return b;
  }
  pluck(t, m, v = 1, bend = 0, p = 0) {
    const s = this.src(this.ksBuffer(m), false), g = this.g(0.5 * v), hp = this.filt('highpass', 180), pn = this.pan(p);
    if (bend) { s.playbackRate.setValueAtTime(1, t + 0.08); s.playbackRate.linearRampToValueAtTime(Math.pow(2, bend / 12), t + 0.3); }
    s.connect(hp); hp.connect(g); g.connect(pn); pn.connect(this.music); this.send(g, this.verbIn, 0.45); this.send(g, this.dly, 0.15);
    s.start(t); s.stop(t + 2.2);
  }
  pizz(t, m, v = 1) {
    const o = this.osc('triangle', mtof(m)), g = this.g(0), o2 = this.osc('sine', mtof(m) * 2), g2 = this.g(0.3);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.32 * v, t + 0.004); g.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
    o.connect(g); o2.connect(g2); g2.connect(g); g.connect(this.music); this.send(g, this.verbIn, 0.2);
    o.start(t); o2.start(t); o.stop(t + 0.4); o2.stop(t + 0.4);
  }
  choir(t, notes, dur, v = 1) {
    const out = this.g(0); out.connect(this.music); this.send(out, this.verbIn, 0.8);
    const forms = [[800, 10], [1150, 12], [2900, 14]];
    for (const m of notes) for (const dt of [-8, 3, 11]) {
      const o = this.osc('sawtooth', mtof(m)); o.detune.value = dt;
      const vib = this.osc('sine', 4.8 + this.rng.next()), vg = this.g(mtof(m) * 0.008); vib.connect(vg); vg.connect(o.frequency);
      for (const [ff, q] of forms) { const bp = this.filt('bandpass', ff, q), fg = this.g(ff > 2000 ? 0.4 : 1); o.connect(bp); bp.connect(fg); fg.connect(out); }
      o.start(t); o.stop(t + dur + 1.5); vib.start(t); vib.stop(t + dur + 1.5);
    }
    this.adsr(out, t, 0.6, 0.5, 0.9, dur, 1.2, 0.09 * v / notes.length);
  }
  braam(t, m, dur = 3, v = 1) {
    const g = this.g(0), lp = this.filt('lowpass', 120, 2), sh = this.shaper(3);
    for (const [k, dt] of [[0, -10], [0, 10], [12, 0], [19, 5], [-12, 0]]) {
      const o = this.osc('sawtooth', mtof(m + k)); o.detune.value = dt; o.connect(sh); o.start(t); o.stop(t + dur + 0.8);
    }
    sh.connect(lp); lp.connect(g); g.connect(this.music); this.send(g, this.verbIn, 0.6);
    lp.frequency.setValueAtTime(100, t); lp.frequency.exponentialRampToValueAtTime(2400, t + 0.12); lp.frequency.exponentialRampToValueAtTime(260, t + dur);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.32 * v, t + 0.03); g.gain.setTargetAtTime(0, t + dur * 0.6, dur * 0.25);
  }
  // ================================================================ SFX
  boom(t, v = 1) { // cinematic hit: sub drop + noise burst + reverb
    const o = this.osc('sine', 90), g = this.g(0);
    o.frequency.setValueAtTime(110, t); o.frequency.exponentialRampToValueAtTime(32, t + 1.2);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.65 * v, t + 0.006); g.gain.exponentialRampToValueAtTime(0.001, t + 1.6);
    o.connect(g); g.connect(this.sfx); o.start(t); o.stop(t + 1.7);
    const n = this.src(this.white), lp = this.filt('lowpass', 3000), ng = this.g(0);
    lp.frequency.setValueAtTime(5000, t); lp.frequency.exponentialRampToValueAtTime(200, t + 0.6);
    ng.gain.setValueAtTime(0.7 * v, t); ng.gain.exponentialRampToValueAtTime(0.001, t + 0.7);
    n.connect(lp); lp.connect(ng); ng.connect(this.sfx); this.send(ng, this.verbIn, 0.8);
    n.start(t, this.rng.next()); n.stop(t + 0.75);
  }
  riser(t, dur, v = 1) {
    const n = this.src(this.white), bp = this.filt('bandpass', 300, 2.5), g = this.g(0);
    bp.frequency.setValueAtTime(300, t); bp.frequency.exponentialRampToValueAtTime(9000, t + dur);
    g.gain.setValueAtTime(0.001, t); g.gain.exponentialRampToValueAtTime(0.5 * v, t + dur); g.gain.linearRampToValueAtTime(0, t + dur + 0.02);
    n.connect(bp); bp.connect(g); g.connect(this.sfx); this.send(g, this.verbIn, 0.3);
    n.start(t, this.rng.next()); n.stop(t + dur + 0.05);
    const o = this.osc('sawtooth', 110), og = this.g(0), lp = this.filt('lowpass', 1200);
    o.frequency.setValueAtTime(110, t); o.frequency.exponentialRampToValueAtTime(880, t + dur);
    og.gain.setValueAtTime(0.001, t); og.gain.exponentialRampToValueAtTime(0.08 * v, t + dur); og.gain.linearRampToValueAtTime(0, t + dur + 0.02);
    o.connect(lp); lp.connect(og); og.connect(this.sfx); o.start(t); o.stop(t + dur + 0.05);
  }
  whoosh(t, dur = 0.5, v = 1, p0 = -0.8, p1 = 0.8, f0 = 400, f1 = 2400) {
    const n = this.src(this.pink), bp = this.filt('bandpass', f0, 1.4), g = this.g(0), pn = this.pan(p0);
    bp.frequency.setValueAtTime(f0, t); bp.frequency.exponentialRampToValueAtTime(f1, t + dur * 0.6); bp.frequency.exponentialRampToValueAtTime(f0 * 0.7, t + dur);
    pn.pan.setValueAtTime(p0, t); pn.pan.linearRampToValueAtTime(p1, t + dur);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.9 * v, t + dur * 0.55); g.gain.linearRampToValueAtTime(0, t + dur);
    n.connect(bp); bp.connect(g); g.connect(pn); pn.connect(this.sfx); this.send(g, this.verbIn, 0.25);
    n.start(t, this.rng.next()); n.stop(t + dur + 0.05);
  }
  ding(t, v = 1, base = 84) { // app notification chime
    for (const [k, dt] of [[0, 0], [7, 0.09], [12, 0.18]]) {
      const f = mtof(base + k);
      for (const [mul, a, d] of [[1, 1, 0.9], [2.01, 0.35, 0.5], [3.02, 0.15, 0.3]]) {
        const o = this.osc('sine', f * mul), g = this.g(0);
        g.gain.setValueAtTime(0, t + dt); g.gain.linearRampToValueAtTime(0.16 * v * a, t + dt + 0.004); g.gain.exponentialRampToValueAtTime(0.001, t + dt + d);
        o.connect(g); g.connect(this.sfx); this.send(g, this.verbIn, 0.35);
        o.start(t + dt); o.stop(t + dt + d + 0.05);
      }
    }
  }
  beep(t, f = 1200, v = 1, d = 0.08, type = 'square') {
    const o = this.osc(type, f), g = this.g(0), lp = this.filt('lowpass', 5000);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.1 * v, t + 0.003); g.gain.setValueAtTime(0.1 * v, t + d * 0.7); g.gain.linearRampToValueAtTime(0, t + d);
    o.connect(lp); lp.connect(g); g.connect(this.sfx); o.start(t); o.stop(t + d + 0.02);
  }
  tick(t, v = 1, hi = true) {
    const n = this.src(this.white), bp = this.filt('bandpass', hi ? 4200 : 2800, 5), g = this.g(0);
    g.gain.setValueAtTime(0.6 * v, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.03);
    n.connect(bp); bp.connect(g); g.connect(this.sfx); n.start(t, this.rng.next()); n.stop(t + 0.04);
    this.beep(t, hi ? 2000 : 1500, 0.4 * v, 0.02, 'sine');
  }
  key(t, v = 1) { // keyboard typing click
    const n = this.src(this.white), bp = this.filt('bandpass', 3000 + this.rng.next() * 1500, 3), g = this.g(0);
    g.gain.setValueAtTime(0.35 * v, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.025);
    n.connect(bp); bp.connect(g); g.connect(this.sfx); n.start(t, this.rng.next()); n.stop(t + 0.03);
  }
  blip(t, f, v = 1) { // dialogue "voice" blip
    const o = this.osc('square', f * (0.95 + this.rng.next() * 0.1)), g = this.g(0), lp = this.filt('lowpass', 2400);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.05 * v, t + 0.005); g.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
    o.connect(lp); lp.connect(g); g.connect(this.sfx); o.start(t); o.stop(t + 0.07);
  }
  thunder(t, v = 1, close = true) {
    const n = this.src(this.brown), lp = this.filt('lowpass', 420), g = this.g(0);
    g.gain.setValueAtTime(0, t);
    let tt = t;
    for (let k = 0; k < 9; k++) { tt += 0.12 + this.rng.next() * 0.35; g.gain.linearRampToValueAtTime((0.4 + this.rng.next() * 0.6) * v * Math.pow(0.82, k), tt); }
    g.gain.linearRampToValueAtTime(0, tt + 1.2);
    n.connect(lp); lp.connect(g); g.connect(this.sfx); this.send(g, this.verbIn, 0.5);
    n.start(t, this.rng.next()); n.stop(tt + 1.3);
    if (close) {
      const c = this.src(this.white), hp = this.filt('highpass', 900), cg = this.g(0);
      cg.gain.setValueAtTime(0.8 * v, t); cg.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
      c.connect(hp); hp.connect(cg); cg.connect(this.sfx); this.send(cg, this.verbIn, 0.6);
      c.start(t, this.rng.next()); c.stop(t + 0.55);
    }
  }
  zap(t, v = 1, f = 1800) {
    const o = this.osc('sawtooth', f), g = this.g(0), hp = this.filt('highpass', 800), sh = this.shaper(6);
    o.frequency.setValueAtTime(f * 1.8, t); o.frequency.exponentialRampToValueAtTime(f * 0.3, t + 0.18);
    g.gain.setValueAtTime(0.14 * v, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
    o.connect(sh); sh.connect(hp); hp.connect(g); g.connect(this.sfx); this.send(g, this.verbIn, 0.3); o.start(t); o.stop(t + 0.25);
    this.whoosh(t - 0.02, 0.18, 0.4 * v, 0, 0, 2000, 7000);
  }
  shing(t, v = 1) { // metallic glint
    for (const f of [2637, 3951, 5274, 6645]) {
      const o = this.osc('sine', f), g = this.g(0);
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.05 * v, t + 0.005); g.gain.exponentialRampToValueAtTime(0.001, t + 0.9);
      o.connect(g); g.connect(this.sfx); this.send(g, this.verbIn, 0.6); o.start(t); o.stop(t + 1);
    }
    this.whoosh(t - 0.12, 0.2, 0.35 * v, -0.3, 0.3, 3000, 9000);
  }
  clang(t, v = 1) {
    for (const [f, d] of [[523, 1.2], [1187, 0.8], [1789, 0.6], [2734, 0.5], [3999, 0.35]]) {
      const o = this.osc('sine', f), g = this.g(0);
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.13 * v, t + 0.002); g.gain.exponentialRampToValueAtTime(0.001, t + d);
      o.connect(g); g.connect(this.sfx); this.send(g, this.verbIn, 0.5); o.start(t); o.stop(t + d + 0.05);
    }
    const n = this.src(this.white), hp = this.filt('highpass', 2000), g = this.g(0);
    g.gain.setValueAtTime(0.5 * v, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
    n.connect(hp); hp.connect(g); g.connect(this.sfx); n.start(t, this.rng.next()); n.stop(t + 0.1);
  }
  scrape(t, dur, v = 1) {
    const n = this.src(this.white), bp = this.filt('bandpass', 3800, 3), g = this.g(0);
    g.gain.setValueAtTime(0, t);
    for (let x = 0; x < dur; x += 0.03) g.gain.linearRampToValueAtTime((0.25 + this.rng.next() * 0.45) * v, t + x);
    g.gain.linearRampToValueAtTime(0, t + dur + 0.05);
    n.connect(bp); bp.connect(g); g.connect(this.sfx); this.send(g, this.verbIn, 0.2);
    n.start(t, this.rng.next()); n.stop(t + dur + 0.1);
  }
  motor(t, dur, f0, f1, v = 1, p0 = 0, p1 = 0) { // electric scooter whine
    const o = this.osc('sawtooth', f0), o2 = this.osc('sine', f0 * 2), g = this.g(0), bp = this.filt('bandpass', 1400, 0.8), pn = this.pan(p0);
    for (const x of [o, o2]) { x.frequency.setValueAtTime(x === o ? f0 : f0 * 2, t); x.frequency.exponentialRampToValueAtTime(x === o ? f1 : f1 * 2, t + dur); }
    pn.pan.setValueAtTime(p0, t); pn.pan.linearRampToValueAtTime(p1, t + dur);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.12 * v, t + dur * 0.25); g.gain.linearRampToValueAtTime(0.1 * v, t + dur * 0.8); g.gain.linearRampToValueAtTime(0, t + dur);
    const g2 = this.g(0.35); o2.connect(g2); g2.connect(bp);
    o.connect(bp); bp.connect(g); g.connect(pn); pn.connect(this.sfx);
    o.start(t); o2.start(t); o.stop(t + dur + 0.05); o2.stop(t + dur + 0.05);
  }
  pass(t, v = 1, dir = 1) { // doppler pass-by: motor + whoosh
    this.motor(t - 0.25, 0.7, 620, 300, 1.2 * v, -0.9 * dir, 0.9 * dir);
    this.whoosh(t - 0.25, 0.65, 1.1 * v, -0.9 * dir, 0.9 * dir, 300, 1800);
  }
  screech(t, dur, v = 1) {
    const n = this.src(this.white), bp = this.filt('bandpass', 2600, 9), bp2 = this.filt('bandpass', 3400, 12), g = this.g(0);
    bp.frequency.setValueAtTime(2900, t); bp.frequency.linearRampToValueAtTime(2200, t + dur);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.8 * v, t + 0.05); g.gain.linearRampToValueAtTime(0.6 * v, t + dur * 0.8); g.gain.linearRampToValueAtTime(0, t + dur);
    n.connect(bp); n.connect(bp2); bp.connect(g); bp2.connect(g); g.connect(this.sfx); this.send(g, this.verbIn, 0.3);
    n.start(t, this.rng.next()); n.stop(t + dur + 0.05);
  }
  glitch(t, dur, v = 1) {
    for (let x = 0; x < dur; x += 0.035 + this.rng.next() * 0.05) {
      if (this.rng.next() < 0.35) continue;
      this.beep(t + x, 200 + this.rng.next() * 3000, 0.9 * v, 0.02 + this.rng.next() * 0.03, this.rng.next() < 0.5 ? 'square' : 'sawtooth');
    }
  }
  heartbeat(t, v = 1) {
    for (const [dt, a] of [[0, 1], [0.24, 0.7]]) {
      const o = this.osc('sine', 60), g = this.g(0);
      o.frequency.setValueAtTime(70, t + dt); o.frequency.exponentialRampToValueAtTime(40, t + dt + 0.15);
      g.gain.setValueAtTime(0, t + dt); g.gain.linearRampToValueAtTime(0.9 * v * a, t + dt + 0.01); g.gain.exponentialRampToValueAtTime(0.001, t + dt + 0.22);
      o.connect(g); g.connect(this.sfx); o.start(t + dt); o.stop(t + dt + 0.25);
    }
  }
  tinnitus(t, dur, v = 1) {
    const o = this.osc('sine', 5600), g = this.g(0);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.03 * v, t + 0.2); g.gain.linearRampToValueAtTime(0, t + dur);
    o.connect(g); g.connect(this.out); o.start(t); o.stop(t + dur + 0.05);
  }
  rumble(t, dur, v = 1) {
    const n = this.src(this.brown), lp = this.filt('lowpass', 160), g = this.g(0), lfo = this.osc('sine', 7), lg = this.g(0.3 * v);
    lfo.connect(lg); lg.connect(g.gain);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.6 * v, t + dur * 0.5); g.gain.linearRampToValueAtTime(0.0, t + dur);
    n.connect(lp); lp.connect(g); g.connect(this.sfx);
    n.start(t, this.rng.next()); n.stop(t + dur + 0.05); lfo.start(t); lfo.stop(t + dur + 0.05);
  }
  crackle(t, dur, v = 1) {
    for (let x = 0; x < dur; x += 0.02 + this.rng.next() * 0.06) {
      const n = this.src(this.white), hp = this.filt('highpass', 3000), g = this.g(0), tt = t + x;
      g.gain.setValueAtTime((0.1 + this.rng.next() * 0.25) * v, tt); g.gain.exponentialRampToValueAtTime(0.001, tt + 0.02);
      n.connect(hp); hp.connect(g); g.connect(this.sfx); n.start(tt, this.rng.next()); n.stop(tt + 0.03);
    }
  }
  splash(t, v = 1) {
    const n = this.src(this.white), lp = this.filt('lowpass', 2500), g = this.g(0);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.5 * v, t + 0.02); g.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
    n.connect(lp); lp.connect(g); g.connect(this.sfx); n.start(t, this.rng.next()); n.stop(t + 0.4);
  }
  sparks(t, dur, v = 1) { this.crackle(t, dur, 0.8 * v); this.scrape(t, dur, 0.4 * v); }
  revCymbal(t, dur, v = 1) {
    const n = this.src(this.white), hp = this.filt('highpass', 5000), g = this.g(0);
    g.gain.setValueAtTime(0.001, t); g.gain.exponentialRampToValueAtTime(0.4 * v, t + dur); g.gain.linearRampToValueAtTime(0, t + dur + 0.01);
    n.connect(hp); hp.connect(g); g.connect(this.sfx); n.start(t, this.rng.next()); n.stop(t + dur + 0.02);
  }
  gong(t, v = 1) {
    for (const [r, d] of [[1, 5], [1.52, 4], [2.08, 3.5], [2.61, 3], [3.37, 2.5], [4.12, 2]]) {
      const o = this.osc('sine', 98 * r), g = this.g(0);
      o.frequency.setValueAtTime(98 * r * 1.01, t); o.frequency.linearRampToValueAtTime(98 * r, t + 1.5);
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.12 * v / r, t + 0.03); g.gain.exponentialRampToValueAtTime(0.001, t + d);
      o.connect(g); g.connect(this.sfx); this.send(g, this.verbIn, 0.6); o.start(t); o.stop(t + d + 0.05);
    }
  }
  boing(t, v = 1) {
    const o = this.osc('sine', 300), g = this.g(0);
    o.frequency.setValueAtTime(220, t); o.frequency.exponentialRampToValueAtTime(700, t + 0.12); o.frequency.exponentialRampToValueAtTime(330, t + 0.3);
    g.gain.setValueAtTime(0.25 * v, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
    o.connect(g); g.connect(this.sfx); o.start(t); o.stop(t + 0.4);
  }
  sadTrombone(t, v = 1) {
    const notes = [[62, 0, 0.45], [61, 0.45, 0.45], [60, 0.9, 0.45], [59, 1.35, 1.2]];
    for (const [m, dt, d] of notes) {
      const o = this.osc('sawtooth', mtof(m - 12)), lp = this.filt('lowpass', 900, 2), g = this.g(0), vib = this.osc('sine', 6), vg = this.g(0);
      if (d > 1) { vg.gain.setValueAtTime(0, t + dt); vg.gain.linearRampToValueAtTime(8, t + dt + 0.4); }
      vib.connect(vg); vg.connect(o.frequency);
      g.gain.setValueAtTime(0, t + dt); g.gain.linearRampToValueAtTime(0.18 * v, t + dt + 0.04); g.gain.setTargetAtTime(0, t + dt + d * 0.85, 0.06);
      o.connect(lp); lp.connect(g); g.connect(this.sfx); this.send(g, this.verbIn, 0.2);
      o.start(t + dt); o.stop(t + dt + d + 0.3); vib.start(t + dt); vib.stop(t + dt + d + 0.3);
    }
  }
  rainBed(t0, t1, v = 1) {
    const n = this.src(this.pink), hp = this.filt('highpass', 450), lp = this.filt('lowpass', 7000), g = this.g(0);
    g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(0.32 * v, t0 + 1); g.gain.setValueAtTime(0.32 * v, t1 - 1); g.gain.linearRampToValueAtTime(0, t1);
    n.connect(hp); hp.connect(lp); lp.connect(g); g.connect(this.sfx);
    n.start(t0, this.rng.next()); n.stop(t1 + 0.05);
    const r = this.src(this.brown), rl = this.filt('lowpass', 500), rg = this.g(0);
    rg.gain.setValueAtTime(0, t0); rg.gain.linearRampToValueAtTime(0.05 * v, t0 + 1); rg.gain.setValueAtTime(0.05 * v, t1 - 1); rg.gain.linearRampToValueAtTime(0, t1);
    r.connect(rl); rl.connect(rg); rg.connect(this.sfx); r.start(t0, this.rng.next()); r.stop(t1 + 0.05);
  }
  // music-bus automation helpers
  duckTo(t, v, tc = 0.05) { this.duck.gain.setTargetAtTime(v, t, tc); }
  filterTo(t, f, tc = 0.2) { this.mfilt.frequency.setTargetAtTime(f, t, tc); }
}

// ============================================================================
//  The score
// ============================================================================
const CH = { // royal road progression in G (IV–V–iii–vi) + roots
  C: { pad: [60, 64, 67], root: 36 }, D: { pad: [62, 66, 69], root: 38 },
  Bm: { pad: [59, 62, 66], root: 35 }, Em: { pad: [64, 67, 71], root: 40 },
};
const PROG = ['C', 'D', 'Bm', 'Em'];
const HOOK = [ // [bar offset, beat, midi, beats]
  [0, 0, 76, 1], [0, 1, 79, 0.5], [0, 1.5, 81, 0.5], [0, 2, 83, 1], [0, 3, 81, 0.5], [0, 3.5, 79, 0.5],
  [1, 0, 81, 1.5], [1, 1.5, 79, 0.5], [1, 2, 78, 1], [1, 3, 74, 1],
  [2, 0, 74, 0.5], [2, 0.5, 76, 0.5], [2, 1, 78, 1], [2, 2, 83, 1], [2, 3, 81, 0.5], [2, 3.5, 78, 0.5],
  [3, 0, 79, 1], [3, 1, 76, 1], [3, 2, 76, 2],
  [4, 0, 76, 1], [4, 1, 79, 0.5], [4, 1.5, 81, 0.5], [4, 2, 83, 1], [4, 3, 86, 1],
  [5, 0, 86, 0.5], [5, 0.5, 84, 0.5], [5, 1, 83, 1], [5, 2, 81, 1], [5, 3, 78, 1],
  [6, 0, 79, 1], [6, 1, 81, 0.5], [6, 1.5, 83, 0.5], [6, 2, 81, 1], [6, 3, 78, 1],
  [7, 0, 76, 4],
];
const PENTA = [64, 67, 69, 71, 74, 76, 79, 81, 83, 86, 88]; // E minor pentatonic

function grooveBar(A, bar, chord, o = {}) {
  const t0 = bt(bar), c = CH[chord];
  const full = o.full ?? true;
  // drums
  for (let s = 0; s < 16; s++) {
    const t = t0 + s * BEAT / 4;
    const kickSteps = full ? [0, 6, 8, 11] : [0, 8];
    if (kickSteps.includes(s)) A.kick(t, s === 0 ? 1 : 0.85);
    if (full && (s === 4 || s === 12)) A.snare(t, 1);
    if (!full && s === 12) A.snare(t, 0.8);
    if (o.hats !== false) { if (s % 2 === 0) A.hat(t, s % 4 === 0 ? 0.9 : 0.6, s === 14 && full, (s % 4 - 1.5) * 0.15); else if (full) A.hat(t, 0.3, false, 0.3); }
  }
  // bass: 8ths on root with octave pops
  for (let e = 0; e < 8; e++) {
    const m = c.root + 12 + (e === 7 && full ? 12 : 0);
    A.bass(t0 + e * BEAT / 2, m, BEAT / 2 * 0.9, full ? 1 : 0.7);
  }
  if (o.guitar !== false && full) for (let e = 0; e < 8; e++) A.chug(t0 + e * BEAT / 2, c.root + 24, BEAT / 2, 1, e === 0);
  if (o.pad !== false) A.pad(t0, c.pad, BAR, o.padV ?? 1);
  if (o.crash) A.crash(t0, 0.8);
}
function playHook(A, startBar, from = 0, to = 8, oct = 0, v = 1) {
  let prev = null;
  for (const [b, beat, m, len] of HOOK) {
    if (b < from || b >= to) continue;
    const t = bt(startBar + b - from, beat);
    A.lead(t, m + oct, len * BEAT * 0.98, v, prev && Math.abs(prev - m) <= 2 ? prev + oct : null);
    prev = m;
  }
}
function arpBar(A, bar, chord, v = 0.6) {
  const p = CH[chord].pad.map(m => m + 12);
  const seq = [p[0], p[1], p[2], p[1] + 12, p[2], p[1], p[0] + 12, p[1]];
  for (let k = 0; k < 16; k++) A.pluck(bt(bar) + k * BEAT / 4, seq[k % 8], v * (k % 4 === 0 ? 1 : 0.6), 0, (k % 2 ? 0.4 : -0.4));
}
function voiceBlips(A, t0, text, cps, f) {
  const arr = Array.from(text);
  arr.forEach((ch, i) => { if (!'，。？！……—'.includes(ch)) A.blip(t0 + i / cps, f, 1); });
}

function buildScore(A) {
  // ---------------------------------------------------------- ambience
  A.rainBed(0.0, 3.4, 0.35);
  A.rainBed(7.9, 89.0, 0.8);
  A.rainBed(88.0, 104.2, 0.6);

  // ============================================== ACT 0: app + title cards
  A.pad(0.2, [52, 59, 66, 67], 3.0, 0.6, 900);
  voiceBlips({ blip: (t) => A.key(t, 1) }, 0.7, '今晚，谁才是外卖之王？', 7.5, 0);
  A.beep(2.6, 880, 0.8, 0.06, 'sine'); A.beep(2.68, 1320, 0.8, 0.08, 'sine');
  A.riser(2.5, 0.7, 0.6);
  for (const t of [3.2, 4.8, 6.4]) { A.boom(t, 0.9); A.taiko(t, 0.7, 55); }
  A.pad(3.2, [40, 52, 59, 67], 4.8, 0.9, 1200);
  A.choir(4.8, [64, 71], 3.2, 0.5);
  A.whoosh(4.75, 0.35, 0.5, -0.8, -0.2); A.whoosh(4.75, 0.35, 0.5, 0.8, 0.2);
  A.glitch(7.45, 0.55, 1); A.riser(7.2, 0.8, 0.9); A.revCymbal(7.3, 0.7, 1);
  A.boom(8.0, 1.1); A.thunder(8.02, 0.9, true); A.braam(8.0, 28, 3.2, 1); A.crash(8.0, 0.6);

  // ============================================== ACT 1: city, tower, intros
  // bars 5-8 (8.0-14.4): intro groove (half-time), guzheng melody
  for (let b = 5; b <= 8; b++) grooveBar(A, b, PROG[(b - 5) % 4], { full: false, hats: b >= 7, guitar: false, padV: 0.8 });
  const gz = [[0, 0, 76], [0, 1.5, 79], [0, 2, 81], [0, 3, 83], [1, 0, 86, -2], [1, 2, 83], [1, 3, 81],
    [2, 0, 79], [2, 1, 81], [2, 1.5, 79], [2, 2, 76], [3, 0, 74, 2], [3, 2, 76]];
  for (const [b, beat, m, bend] of gz) A.pluck(bt(5 + b, beat), m, 0.9, bend ?? 0, 0.2);
  A.beep(11.55, 660, 0.6, 0.05, 'sine'); A.beep(11.65, 990, 0.6, 0.05, 'sine'); A.beep(11.75, 1320, 0.6, 0.08, 'sine');
  for (const t of [12.0, 12.8, 13.6]) A.tick(t, 1.2, t < 13.5);
  A.thunder(13.6, 1, true);
  // bars 9-16 (14.4-27.2): character themes over a building groove
  for (let b = 9; b <= 16; b++) grooveBar(A, b, PROG[(b - 9) % 4], { full: false, hats: true, guitar: false, padV: 0.9 });
  for (let b = 13; b <= 16; b++) for (let e = 0; e < 8; e++) A.chug(bt(b) + e * BEAT / 2, CH[PROG[(b - 9) % 4]].root + 24, BEAT / 2, 0.6, e === 0);
  for (let b = 9; b <= 16; b++) arpBar(A, b, PROG[(b - 9) % 4], 0.35);
  for (const t of [14.4, 20.8]) { A.boom(t, 0.8); A.crash(t, 0.7); }
  for (const t of [14.95, 21.35]) { A.whoosh(t - 0.25, 0.3, 0.8, 0.8, 0); A.taiko(t, 0.9, 80); A.shing(t + 0.05, 0.6); }
  for (const t of [17.6, 24.0]) { A.shing(t + 0.15, 1); A.boom(t, 0.5); }
  voiceBlips(A, 19.2, '三十分钟？我十五分钟就够了。', 16, 520);
  voiceBlips(A, 25.6, '饿了么？那就……追上我。', 16, 360);
  A.duckTo(19.15, 0.65); A.duckTo(20.75, 1); A.duckTo(25.55, 0.65); A.duckTo(27.1, 1);

  // ============================================== ACT 2: face-off, VS, order, launch
  A.rumble(27.2, 3.2, 1.2); A.crackle(27.2, 3.2, 0.7);
  for (const [b, beat] of [[17, 0], [17, 1.5], [17, 2], [17, 3], [18, 0], [18, 1], [18, 1.5], [18, 2], [18, 2.5], [18, 3], [18, 3.25], [18, 3.5], [18, 3.75]]) A.taiko(bt(b, beat), 0.8, 65);
  A.pad(27.2, [40, 47, 52, 53], 3.2, 0.9, 700);
  A.braam(27.2, 28, 3.0, 0.7);
  A.boom(30.4, 1.2); A.crash(30.4, 1); A.braam(30.4, 31, 1.6, 1);
  A.whoosh(30.4, 0.3, 0.8, -1, 1); A.clang(30.55, 1.2); A.taiko(30.8, 1.1, 60);
  A.pad(30.4, [43, 50, 55, 62], 1.6, 1, 1500);
  A.ding(32.07, 1.1, 84); A.ding(32.07, 0.6, 79);
  A.tick(32.85, 1.4); A.beep(32.9, 1320, 1, 0.08, 'sine'); A.beep(33.0, 1760, 1, 0.12, 'sine'); A.boing(33.32, 0.7);
  for (let k = 0; k < 4; k++) A.tick(32.0 + k * 0.4, 0.5, false);
  A.boom(33.6, 1.2); A.clang(33.6, 0.8); A.crash(33.6, 0.8);
  A.riser(34.0, 1.2, 1.1); A.revCymbal(34.4, 0.8, 1);
  A.motor(34.4, 0.9, 140, 760, 1.4, -0.3, 0.3); A.motor(34.45, 0.9, 120, 700, 1.2, 0.3, -0.3);
  A.splash(34.45, 1); A.sparks(34.45, 0.5, 0.6);
  A.taiko(34.45, 1, 70);
  for (let k = 0; k < 8; k++) A.snare(bt(21, 2) + k * BEAT / 4, 0.4 + k * 0.08);

  // ============================================== ACT 3: street chase (bars 22-34)
  A.boom(35.2, 1.3); A.crash(35.2, 1.1); A.braam(35.2, 28, 2, 0.8);
  for (let b = 22; b <= 33; b++) grooveBar(A, b, PROG[(b - 22) % 4], { full: true, crash: (b - 22) % 4 === 0 });
  playHook(A, 26, 0, 8, 0, 1);
  for (let b = 30; b <= 33; b++) arpBar(A, b, PROG[(b - 22) % 4], 0.3);
  A.motor(35.2, 3.2, 420, 520, 0.7, -0.2, 0.2);
  A.pass(38.75, 1.1, 1); A.pass(39.25, 1, 1); A.splash(38.8, 0.8); A.splash(39.3, 0.7);
  for (let k = 0; k < 6; k++) A.beep(40.0 + k * 0.25, 900 + k * 120, 0.5, 0.04, 'sine');
  A.ding(40.05, 0.4, 91);
  // coupon storm
  A.shing(41.75, 0.9); A.whoosh(41.85, 0.4, 0.9, 0.6, -0.6);
  for (let k = 0; k < 14; k++) { const tt = 41.85 + k * 0.1; A.whoosh(tt, 0.22, 0.35, 0.6, -0.8, 1500, 5000); if (k % 3 === 0) A.zap(tt + 0.3, 0.35, 2400); }
  A.crackle(42.4, 1.4, 0.6);
  // kangaroo blitz
  A.shing(44.85, 1); A.riser(44.9, 0.95, 0.8);
  A.boom(45.85, 1.3); A.clang(45.85, 0.8); A.sparks(45.85, 0.6, 1); A.whoosh(45.6, 0.5, 1, -0.6, 0.6);
  // grind
  A.clang(48.15, 1.3); A.scrape(48.0, 1.5, 1.2); A.crackle(48.0, 1.5, 1);
  voiceBlips(A, 49.6, '补贴再多，也买不到速度！', 16, 560);
  voiceBlips(A, 51.2, '可惜……我两样都有。', 16, 360);
  A.duckTo(49.55, 0.7); A.duckTo(52.75, 1);
  // ramp + impact frame
  A.riser(52.8, 1.6, 1.2); A.motor(52.9, 1.4, 300, 900, 1, -0.2, 0.4);
  for (let k = 0; k < 16; k++) A.snare(bt(33) + k * BEAT / 4, 0.35 + k * 0.04);
  A.boom(54.4, 1.4); A.crash(54.4, 1.2); A.whoosh(54.4, 0.8, 1.2, -1, 1, 200, 3000); A.braam(54.4, 33, 1.6, 1);

  // ============================================== ACT 4: rooftops (bars 35-46)
  // slow-mo moon jump: muffled music + choir
  A.filterTo(55.95, 500, 0.15); A.filterTo(58.9, 20000, 0.08);
  A.choir(56.0, [64, 71, 76], 3.2, 1.2);
  A.pad(56.0, [52, 59, 64, 67], 3.2, 1, 1000);
  for (let b = 35; b <= 36; b++) { A.kick(bt(b), 0.6); A.kick(bt(b, 2), 0.4); }
  A.heartbeat(56.4, 0.7); A.heartbeat(57.6, 0.7); A.heartbeat(58.8, 0.7);
  A.whoosh(56.2, 2.6, 0.6, -0.6, 0.6, 200, 900);
  A.riser(58.4, 0.8, 0.9);
  A.boom(59.2, 1.3); A.crash(59.2, 1.1);
  for (let b = 37; b <= 44; b++) { grooveBar(A, b, PROG[(b - 37) % 4], { full: true, crash: (b - 37) % 4 === 0 }); arpBar(A, b, PROG[(b - 37) % 4], 0.28); }
  playHook(A, 37, 0, 4, 12, 0.9);
  A.splash(59.9, 0.6); A.boom(60.6, 0.4); A.sparks(60.6, 0.4, 0.5); A.boom(61.7, 0.4); A.sparks(61.7, 0.4, 0.5);
  // billboard
  A.crackle(62.4, 1.6, 0.5); A.motor(62.4, 1.6, 500, 640, 0.8, -0.8, 0.8);
  // Y ultimate
  A.shing(64.0, 1.2); A.boom(64.0, 0.9); A.braam(64.0, 28, 1, 0.8);
  A.whoosh(64.85, 0.5, 1, -0.5, 0.5); A.riser(64.9, 2.0, 0.9);
  A.choir(64.9, [64, 71, 76], 2.0, 0.8);
  A.boom(66.95, 1.4); A.crash(66.95, 1.1); A.clang(66.95, 0.7);
  // B ultimate
  A.shing(67.2, 1.2); A.boom(67.2, 0.9); A.braam(67.2, 31, 1, 0.8);
  for (const tt of [68.1, 68.65, 69.2, 69.75]) A.zap(tt, 1, 1600);
  // sky clash
  A.boom(70.4, 1.5); A.thunder(70.4, 1.2, true); A.crackle(70.4, 1.6, 1); A.braam(70.4, 28, 1.6, 1.1); A.crash(70.4, 1.2);
  // montage (bars 45-46): a hit on every beat
  for (let k = 0; k < 8; k++) {
    const tt = 72.0 + k * 0.4;
    A.kick(tt, 1); A.tom(tt, 0.8, 90 + (k % 4) * 25); if (k % 2) A.snare(tt, 0.7);
    A.bass(tt, 40 + (k % 4 === 3 ? 3 : 0), 0.35, 1);
  }
  A.motor(72.0, 0.4, 600, 900, 0.8); A.shing(72.4, 0.7); A.tick(72.8, 1.4); A.tick(73.0, 1); A.motor(73.2, 0.4, 300, 1200, 1);
  A.motor(73.6, 0.4, 600, 900, 0.8); A.motor(74.0, 0.4, 400, 1400, 0.9); A.shing(74.4, 0.7); A.tick(74.8, 1.4); A.tick(75.0, 1);
  A.riser(74.4, 0.8, 0.8);

  // ============================================== ACT 5: showdown (bars 47-54)
  A.boom(75.2, 1.2); A.crash(75.2, 0.8);
  A.screech(75.5, 1.2, 0.9); A.sparks(75.6, 1.1, 0.8);
  A.motor(75.2, 1.4, 700, 200, 0.9, -0.8, -0.2); A.motor(75.2, 1.4, 650, 180, 0.9, 0.8, 0.2);
  A.thunder(77.2, 1.3, true);
  A.pad(75.2, [40, 47, 52, 55], 9.6, 1, 900);
  A.choir(76.8, [64, 67, 71], 6.4, 1);
  for (let b = 47; b <= 52; b++) {
    A.taiko(bt(b), 1, 62); A.taiko(bt(b, 1.5), 0.6, 70); A.taiko(bt(b, 2), 0.9, 62); A.taiko(bt(b, 3.5), 0.5, 78);
    A.bass(bt(b), 28, BAR * 0.95, 0.6);
  }
  for (const tt of [78.4, 79.2]) A.heartbeat(tt, 1.1);
  voiceBlips(A, 80.0, '这一单——', 8, 520); A.boom(80.0, 0.9); A.clang(80.05, 0.6);
  voiceBlips(A, 81.6, '——是我的！', 10, 360); A.boom(81.6, 0.9); A.clang(81.65, 0.6);
  A.braam(83.2, 28, 1.6, 1.2); A.riser(83.2, 1.6, 0.8); A.crackle(83.2, 1.6, 0.8); A.glitch(84.4, 0.4, 0.8);
  A.whoosh(83.2, 1.2, 0.8, -1, 1, 150, 1200);
  // charge: snare roll + motors
  for (let k = 0; k < 16; k++) A.snare(84.8 + k * 0.1, 0.4 + k * 0.04);
  A.motor(84.8, 1.6, 300, 1300, 1.3, -0.9, -0.1); A.motor(84.8, 1.6, 280, 1250, 1.3, 0.9, 0.1);
  A.riser(84.8, 1.6, 1.3); A.revCymbal(85.6, 0.8, 1.1);
  A.filterTo(85.9, 2500, 0.15);
  // CLASH
  A.filterTo(86.38, 20000, 0.01);
  A.boom(86.4, 1.6); A.boom(86.42, 1.2); A.clang(86.4, 1.6); A.thunder(86.4, 1.2, true); A.crash(86.4, 1.4); A.gong(86.4, 1.2);
  A.crackle(86.4, 0.6, 1.2);
  // silence after the white-out
  A.duckTo(87.0, 0.0, 0.05); A.sfx.gain.setTargetAtTime(0.0, 87.05, 0.06); A.wet.gain.setTargetAtTime(0.0, 87.05, 0.06);
  A.wet.gain.setTargetAtTime(1, 88.0, 0.3);
  A.sfx.gain.setTargetAtTime(0.9, 87.95, 0.3);
  A.duckTo(87.8, 1, 0.3);
  A.tinnitus(87.1, 2.6, 1.2);

  // ============================================== ACT 6: twist
  A.pad(88.0, [40, 47, 52], 3.0, 0.6, 600);
  A.ding(89.65, 1.3, 84); A.ding(89.68, 0.5, 72);
  A.beep(90.15, 1046, 0.9, 0.08, 'sine'); A.beep(90.25, 1568, 0.9, 0.14, 'sine');
  A.duckTo(91.15, 1, 0.01);
  A.boom(91.2, 0.9); A.braam(91.2, 33, 0.8, 0.8); A.boing(91.3, 0.9); A.boing(91.42, 0.7);
  // reveal
  A.thunder(93.15, 1.4, true); A.thunder(94.75, 1.2, true);
  A.braam(93.15, 29, 2.8, 1.1);       // F against E: sinister minor second
  A.pad(93.15, [40, 41, 52, 53], 2.9, 1, 800);
  A.crackle(93.2, 2.6, 0.6);
  A.whoosh(95.0, 0.5, 0.8, 0, 0, 300, 2000);
  A.shing(96.0, 1.2); A.zap(96.1, 1, 1400); A.zap(96.6, 0.7, 2000); A.boom(96.0, 0.8);
  voiceBlips(A, 97.6, '你们两个……太慢了。', 16, 720);
  A.taiko(97.9, 1, 75); A.whoosh(97.7, 0.3, 0.7, 0.8, 0.2);
  for (let k = 0; k < 4; k++) A.pluck(bt(61, k * 0.75), [76, 77, 76, 71][k], 0.8, k === 1 ? -1 : 0);
  // Akira slide
  A.motor(99.2, 0.6, 500, 1100, 1.3, -0.9, 0.2); A.screech(99.65, 1.0, 1.1); A.sparks(99.65, 0.8, 1); A.whoosh(99.25, 0.5, 1, -1, 0.4);
  A.boom(99.7, 0.7);

  // ============================================== ACT 7: title + stinger
  A.boom(100.8, 1.1); A.revCymbal(100.4, 0.4, 0.8);
  A.pad(100.8, [52, 59, 66, 67], 3.2, 0.8, 1000);
  A.choir(101.6, [64, 71], 2.4, 0.6);
  A.riser(102.8, 1.2, 1.2);
  A.boom(104.0, 1.6); A.crash(104.0, 1.3); A.gong(104.0, 1); A.braam(104.0, 28, 2, 1.1);
  for (let b = 65; b <= 67; b++) grooveBar(A, b, PROG[(b - 65) % 4], { full: true });
  playHook(A, 65, 4, 7, 0, 1);
  A.lead(bt(68), 76, BAR * 2, 1.1);
  A.pad(bt(68), [52, 59, 64, 67, 71], BAR * 2, 1.2, 2200);
  A.choir(bt(68), [64, 71, 76], BAR * 2, 1);
  A.kick(bt(68), 1.2); A.crash(bt(68), 1.2); A.taiko(bt(68), 1.2, 55); A.gong(bt(68), 1.1);
  A.bass(bt(68), 40, BAR * 1.5, 1);
  // chibi stinger (G major, bouncy)
  A.boing(110.45, 0.8);
  const ch = [[0, 0, 67], [0, 0.5, 71], [0, 1, 74], [0, 1.5, 71], [0, 2, 72], [0, 2.5, 74], [0, 3, 76], [0, 3.5, 74],
    [1, 0, 72], [1, 0.5, 71], [1, 1, 69], [1, 1.5, 67], [1, 2, 69], [1, 3, 67]];
  for (const [b, beat, m] of ch) A.pizz(bt(69 + b, beat), m, 1);
  for (let k = 0; k < 8; k++) { A.pizz(bt(69) + k * BEAT, [43, 50][k % 2], 0.7); }
  voiceBlips({ blip: (t) => A.key(t, 0.8) }, 110.9, '奶茶……洒了一半。', 8, 0);
  A.boing(112.4, 0.8); A.blip(112.5, 900, 1.2); A.blip(112.6, 1000, 1.2); A.blip(112.7, 1100, 1.2);
  A.boom(113.6, 0.7); A.clang(113.62, 0.5); A.sadTrombone(113.9, 1.2);
  A.ding(116.85, 0.6, 79);
  A.pad(116.8, [55, 62, 67, 71], 2.2, 0.5, 1400);
}

// Records score events instead of building nodes; nodes are then created
// just-in-time in chunks (OfflineAudioContext.suspend) to keep the live graph small.
const IMMEDIATE = new Set(['duckTo', 'filterTo', 'g', 'osc', 'filt', 'pan', 'src', 'shaper', 'adsr', 'send', 'stop', 'makeIR', 'noise', 'ksBuffer']);
function recorder(M) {
  const q = [];
  return new Proxy(M, {
    get(target, prop) {
      if (prop === '__q') return q;
      const v = target[prop];
      if (typeof v === 'function') {
        if (IMMEDIATE.has(prop)) return v.bind(target);
        return (...args) => { q.push([args[0], prop, args]); };
      }
      return v;
    },
  });
}

const AudioEngine = {
  async render(onProgress) {
    const ctx = new OfflineAudioContext(2, Math.ceil(DURATION * SR), SR);
    const M = new Mixer(ctx);
    const R = recorder(M);
    buildScore(R);
    const q = R.__q.sort((a, b) => a[0] - b[0]);
    let qi = 0;
    const flush = (until) => { while (qi < q.length && q[qi][0] < until) { const [, name, args] = q[qi++]; M[name](...args); } };
    const CHUNK = 2, LEAD = 0.75;
    flush(CHUNK + LEAD);
    for (let T = CHUNK; T < DURATION; T += CHUNK) {
      ctx.suspend(T).then(() => { flush(T + CHUNK + LEAD); if (onProgress) onProgress(T / DURATION); ctx.resume(); });
    }
    return await ctx.startRendering();
  },
  toWav(buf) {
    const n = buf.length, ch = buf.numberOfChannels, out = new DataView(new ArrayBuffer(44 + n * ch * 2));
    const ws = (o, s) => { for (let i = 0; i < s.length; i++) out.setUint8(o + i, s.charCodeAt(i)); };
    ws(0, 'RIFF'); out.setUint32(4, 36 + n * ch * 2, true); ws(8, 'WAVE'); ws(12, 'fmt ');
    out.setUint32(16, 16, true); out.setUint16(20, 1, true); out.setUint16(22, ch, true); out.setUint32(24, buf.sampleRate, true);
    out.setUint32(28, buf.sampleRate * ch * 2, true); out.setUint16(32, ch * 2, true); out.setUint16(34, 16, true);
    ws(36, 'data'); out.setUint32(40, n * ch * 2, true);
    const data = []; for (let c = 0; c < ch; c++) data.push(buf.getChannelData(c));
    let o = 44;
    for (let i = 0; i < n; i++) for (let c = 0; c < ch; c++) { const v = Math.max(-1, Math.min(1, data[c][i])); out.setInt16(o, v < 0 ? v * 0x8000 : v * 0x7fff, true); o += 2; }
    return new Uint8Array(out.buffer);
  },
};
