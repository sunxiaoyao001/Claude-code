'use strict';
// 声音：全部用 WebAudio 合成，没有音频文件

const Sound = {
  ctx: null,
  master: null,
  sfxBus: null,
  musicBus: null,
  noiseBuf: null,
  musicVol: 0.6,
  sfxVol: 0.8,

  init() {
    if (this.ctx) { this.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    try {
      this.ctx = new AC();
    } catch (e) { return; }
    const c = this.ctx;
    this.master = c.createGain();
    this.master.gain.value = 0.9;
    const comp = c.createDynamicsCompressor();
    comp.threshold.value = -14;
    comp.ratio.value = 4;
    this.master.connect(comp);
    comp.connect(c.destination);
    this.sfxBus = c.createGain();
    this.musicBus = c.createGain();
    this.sfxBus.connect(this.master);
    this.musicBus.connect(this.master);
    this.applyVolumes();
    const len = c.sampleRate;
    this.noiseBuf = c.createBuffer(1, len, c.sampleRate);
    const data = this.noiseBuf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  },

  resume() {
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
  },
  suspend() {
    if (this.ctx && this.ctx.state === 'running') this.ctx.suspend().catch(() => {});
  },

  setVolumes(music, sfx) {
    this.musicVol = music;
    this.sfxVol = sfx;
    this.applyVolumes();
  },
  applyVolumes() {
    if (!this.ctx) return;
    this.sfxBus.gain.value = this.sfxVol * 0.55;
    this.musicBus.gain.value = this.musicVol * 0.32;
  },

  tone(o) {
    const c = this.ctx;
    const t = c.currentTime + (o.delay || 0);
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = o.type || 'triangle';
    osc.frequency.setValueAtTime(o.f, t);
    if (o.f2) osc.frequency.exponentialRampToValueAtTime(o.f2, t + (o.slide || o.dur));
    const vol = o.vol == null ? 0.3 : o.vol;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + (o.attack || 0.006));
    g.gain.exponentialRampToValueAtTime(0.0001, t + o.dur);
    let node = osc;
    if (o.lp) {
      const f = c.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = o.lp;
      osc.connect(f);
      node = f;
    }
    node.connect(g);
    g.connect(o.bus || this.sfxBus);
    osc.start(t);
    osc.stop(t + o.dur + 0.05);
  },

  noise(o) {
    const c = this.ctx;
    const t = c.currentTime + (o.delay || 0);
    const src = c.createBufferSource();
    src.buffer = this.noiseBuf;
    const f = c.createBiquadFilter();
    f.type = o.filter || 'lowpass';
    f.frequency.setValueAtTime(o.freq || 1200, t);
    if (o.freq2) f.frequency.exponentialRampToValueAtTime(o.freq2, t + o.dur);
    f.Q.value = o.q || 0.8;
    const g = c.createGain();
    const vol = o.vol == null ? 0.25 : o.vol;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + (o.attack || 0.004));
    g.gain.exponentialRampToValueAtTime(0.0001, t + o.dur);
    src.connect(f);
    f.connect(g);
    g.connect(o.bus || this.sfxBus);
    src.start(t, Math.random() * 0.5);
    src.stop(t + o.dur + 0.05);
  },

  play(name, arg) {
    if (!this.ctx || this.ctx.state !== 'running') return;
    const fn = SFX[name];
    if (fn) fn(this, arg);
  },
};

const SFX = {
  jump: (s) => s.tone({ type: 'triangle', f: 330, f2: 620, dur: 0.14, vol: 0.28 }),
  airjump: (s) => { s.tone({ type: 'triangle', f: 520, f2: 980, dur: 0.14, vol: 0.24 }); s.tone({ type: 'sine', f: 1040, dur: 0.1, vol: 0.08, delay: 0.03 }); },
  walljump: (s) => { s.tone({ type: 'triangle', f: 400, f2: 760, dur: 0.12, vol: 0.24 }); s.noise({ freq: 2400, dur: 0.06, vol: 0.06, filter: 'highpass' }); },
  land: (s) => s.noise({ freq: 500, dur: 0.08, vol: 0.12 }),
  step: (s) => s.noise({ freq: 900, dur: 0.03, vol: 0.03 }),
  coin: (s) => { s.tone({ type: 'sine', f: 1046, dur: 0.07, vol: 0.2 }); s.tone({ type: 'sine', f: 1568, dur: 0.16, vol: 0.2, delay: 0.06 }); },
  gem: (s) => { [784, 988, 1175, 1568].forEach((f, i) => s.tone({ type: 'triangle', f, dur: 0.22, vol: 0.2, delay: i * 0.07 })); },
  heart: (s) => { [660, 880, 1320].forEach((f, i) => s.tone({ type: 'sine', f, dur: 0.18, vol: 0.2, delay: i * 0.06 })); },
  stomp: (s) => { s.tone({ type: 'square', f: 260, f2: 90, dur: 0.14, vol: 0.16, lp: 1800 }); s.noise({ freq: 700, dur: 0.08, vol: 0.12 }); },
  hurt: (s) => { s.tone({ type: 'sawtooth', f: 440, f2: 140, dur: 0.3, vol: 0.18, lp: 1600 }); },
  shield: (s) => { s.noise({ freq: 3000, dur: 0.18, vol: 0.1, filter: 'highpass' }); s.tone({ type: 'sine', f: 1200, f2: 500, dur: 0.25, vol: 0.12 }); },
  die: (s) => { [523, 392, 330, 262].forEach((f, i) => s.tone({ type: 'triangle', f, dur: 0.2, vol: 0.22, delay: i * 0.11 })); },
  dash: (s) => s.noise({ filter: 'bandpass', freq: 2600, freq2: 500, q: 1.4, dur: 0.2, vol: 0.3 }),
  pound: (s) => { s.tone({ type: 'sine', f: 140, f2: 40, dur: 0.3, vol: 0.4 }); s.noise({ freq: 600, dur: 0.18, vol: 0.2 }); },
  poundStart: (s) => s.tone({ type: 'triangle', f: 700, f2: 300, dur: 0.12, vol: 0.12 }),
  spring: (s) => { s.tone({ type: 'triangle', f: 180, f2: 820, dur: 0.28, vol: 0.28 }); s.tone({ type: 'sine', f: 360, f2: 1200, dur: 0.2, vol: 0.08, delay: 0.04 }); },
  orb: (s) => { s.tone({ type: 'sine', f: 600, f2: 1400, dur: 0.22, vol: 0.22 }); s.tone({ type: 'triangle', f: 1200, dur: 0.12, vol: 0.08, delay: 0.05 }); },
  bump: (s) => s.tone({ type: 'square', f: 140, f2: 110, dur: 0.07, vol: 0.12, lp: 900 }),
  break: (s) => { s.noise({ freq: 1400, freq2: 300, dur: 0.22, vol: 0.28 }); s.tone({ type: 'square', f: 120, f2: 60, dur: 0.12, vol: 0.1, lp: 600 }); },
  crumble: (s) => s.noise({ freq: 800, freq2: 200, dur: 0.25, vol: 0.12 }),
  checkpoint: (s) => { [523, 659, 784, 1046].forEach((f, i) => s.tone({ type: 'triangle', f, dur: 0.16, vol: 0.2, delay: i * 0.06 })); },
  shoot: (s) => s.tone({ type: 'square', f: 760, f2: 320, dur: 0.09, vol: 0.07, lp: 2400 }),
  enemyHop: (s) => s.tone({ type: 'sine', f: 240, f2: 420, dur: 0.1, vol: 0.06 }),
  crush: (s) => { s.tone({ type: 'sine', f: 90, f2: 40, dur: 0.35, vol: 0.4 }); s.noise({ freq: 400, dur: 0.25, vol: 0.25 }); },
  ice: (s) => s.noise({ filter: 'highpass', freq: 3000, dur: 0.15, vol: 0.12 }),
  bossHit: (s) => { s.tone({ type: 'square', f: 330, f2: 110, dur: 0.24, vol: 0.2, lp: 2200 }); s.noise({ freq: 1600, dur: 0.15, vol: 0.2 }); },
  bossRoar: (s) => { s.tone({ type: 'sawtooth', f: 90, f2: 60, dur: 0.6, vol: 0.18, lp: 500 }); },
  bossDie: (s) => { s.noise({ freq: 3000, freq2: 100, dur: 1.4, vol: 0.35 }); [392, 330, 262, 196, 131].forEach((f, i) => s.tone({ type: 'triangle', f, dur: 0.3, vol: 0.18, delay: i * 0.14 })); },
  warn: (s) => s.tone({ type: 'square', f: 880, dur: 0.08, vol: 0.06, lp: 2000 }),
  laser: (s) => { s.tone({ type: 'sawtooth', f: 200, f2: 1200, dur: 0.4, vol: 0.1, lp: 3000 }); s.noise({ filter: 'bandpass', freq: 1800, dur: 0.5, vol: 0.1 }); },
  win: (s) => { [523, 659, 784, 1046, 784, 1046].forEach((f, i) => s.tone({ type: i < 4 ? 'triangle' : 'sine', f, dur: i === 5 ? 0.6 : 0.16, vol: 0.24, delay: i * 0.1 })); },
  ui: (s) => s.tone({ type: 'sine', f: 720, dur: 0.05, vol: 0.12 }),
  uiMove: (s) => s.tone({ type: 'sine', f: 520, dur: 0.035, vol: 0.06 }),
  buy: (s) => { s.tone({ type: 'sine', f: 880, dur: 0.07, vol: 0.18 }); s.tone({ type: 'sine', f: 1318, dur: 0.18, vol: 0.18, delay: 0.07 }); s.tone({ type: 'triangle', f: 1760, dur: 0.18, vol: 0.1, delay: 0.14 }); },
  deny: (s) => s.tone({ type: 'square', f: 190, f2: 150, dur: 0.14, vol: 0.1, lp: 900 }),
  pause: (s) => s.tone({ type: 'sine', f: 600, f2: 400, dur: 0.1, vol: 0.12 }),
};

// —— 程序化音乐 ——
const SCALES = {
  major: [0, 2, 4, 5, 7, 9, 11],
  minor: [0, 2, 3, 5, 7, 8, 10],
  dorian: [0, 2, 3, 5, 7, 9, 10],
  lydian: [0, 2, 4, 6, 7, 9, 11],
  mixo: [0, 2, 4, 5, 7, 9, 10],
  harm: [0, 2, 3, 5, 7, 8, 11],
};

const TRACKS = {
  title: { bpm: 88, root: 60, mode: 'lydian', prog: [0, 4, 5, 3], seed: 7, style: 'calm' },
  meadow: { bpm: 112, root: 62, mode: 'major', prog: [0, 4, 5, 3], seed: 21, style: 'bright' },
  canyon: { bpm: 104, root: 57, mode: 'dorian', prog: [0, 3, 6, 4], seed: 42, style: 'groove' },
  frost: { bpm: 92, root: 64, mode: 'lydian', prog: [0, 1, 5, 4], seed: 77, style: 'calm' },
  night: { bpm: 118, root: 59, mode: 'minor', prog: [0, 5, 2, 6], seed: 93, style: 'groove' },
  boss: { bpm: 146, root: 57, mode: 'minor', prog: [0, 5, 6, 4], seed: 5, style: 'drive' },
  final: { bpm: 152, root: 55, mode: 'harm', prog: [0, 5, 3, 4], seed: 13, style: 'drive' },
  ending: { bpm: 84, root: 60, mode: 'major', prog: [0, 3, 4, 5], seed: 99, style: 'calm' },
};

const midiHz = (n) => 440 * Math.pow(2, (n - 69) / 12);

function buildSong(def) {
  const rng = mulberry32(def.seed * 9973 + 17);
  const scale = SCALES[def.mode];
  const deg = (d) => {
    const o = Math.floor(d / 7);
    const i = ((d % 7) + 7) % 7;
    return scale[i] + 12 * o;
  };
  const bars = [];
  const chordOf = (r) => [deg(r), deg(r + 2), deg(r + 4)];
  const genBar = (r, prevNote, isEnd) => {
    const notes = [];
    const chord = [r, r + 2, r + 4, r + 7];
    let cur = prevNote;
    for (let s = 0; s < 16; s += 2) {
      const strong = s % 8 === 0, mid = s % 4 === 0;
      const p = strong ? 0.88 : mid ? 0.6 : 0.38;
      if (rng() < p) {
        let d;
        if (strong || rng() < 0.4) {
          d = chord[Math.floor(rng() * chord.length)];
          while (d - cur > 4) d -= 7;
          while (cur - d > 4) d += 7;
        } else {
          d = cur + [-2, -1, -1, 1, 1, 2][Math.floor(rng() * 6)];
        }
        d = clamp(d, -3, 11);
        let len = rng() < 0.3 ? 4 : 2;
        if (isEnd && s >= 12) { d = r; len = 4; }
        notes.push({ s, d, len });
        cur = d;
        if (len === 4) s += 2;
      }
    }
    return { notes, cur };
  };
  let cur = 2;
  const a = [];
  for (let i = 0; i < def.prog.length; i++) {
    const b = genBar(def.prog[i], cur, i === def.prog.length - 1);
    a.push(b.notes);
    cur = b.cur;
  }
  const b2 = [];
  for (let i = 0; i < def.prog.length; i++) {
    if (i < 2) { b2.push(a[i]); continue; }
    const b = genBar(def.prog[i], cur, i === def.prog.length - 1);
    b2.push(b.notes);
    cur = b.cur;
  }
  const melody = a.concat(b2);
  const prog = def.prog.concat(def.prog);
  for (let i = 0; i < prog.length; i++) {
    bars.push({ chord: chordOf(prog[i]).map((x) => x + def.root), mel: melody[i].map((n) => ({ s: n.s, len: n.len, n: def.root + 12 + deg(n.d) })) });
  }
  return { def, bars, stepDur: 60 / def.bpm / 4 };
}

const Music = {
  song: null,
  name: null,
  bar: 0,
  step: 0,
  nextTime: 0,
  timer: null,
  gain: null,

  play(name) {
    if (!Sound.ctx) { this.name = name; return; }
    if (this.name === name && this.timer) return;
    this.stop();
    this.name = name;
    const def = TRACKS[name];
    if (!def) return;
    this.song = buildSong(def);
    const c = Sound.ctx;
    this.gain = c.createGain();
    this.gain.gain.setValueAtTime(0.0001, c.currentTime);
    this.gain.gain.exponentialRampToValueAtTime(1, c.currentTime + 0.6);
    this.gain.connect(Sound.musicBus);
    this.bar = 0;
    this.step = 0;
    this.nextTime = c.currentTime + 0.08;
    this.timer = setInterval(() => this.tick(), 30);
  },

  stop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    if (this.gain && Sound.ctx) {
      const g = this.gain;
      const t = Sound.ctx.currentTime;
      g.gain.cancelScheduledValues(t);
      g.gain.setValueAtTime(g.gain.value || 0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);
      setTimeout(() => g.disconnect(), 500);
    }
    this.gain = null;
    this.name = null;
  },

  resumeIfNeeded() {
    if (this.name && !this.timer && Sound.ctx) {
      const n = this.name;
      this.name = null;
      this.play(n);
    }
  },

  tick() {
    const c = Sound.ctx;
    if (!c || c.state !== 'running') return;
    if (this.nextTime < c.currentTime - 0.3) this.nextTime = c.currentTime + 0.05;
    while (this.nextTime < c.currentTime + 0.15) {
      this.playStep(this.nextTime);
      this.nextTime += this.song.stepDur;
      this.step++;
      if (this.step >= 16) { this.step = 0; this.bar = (this.bar + 1) % this.song.bars.length; }
    }
  },

  voice(t, freq, dur, type, vol, attack, lp) {
    const c = Sound.ctx;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type;
    o.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    let node = o;
    if (lp) {
      const f = c.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = lp;
      o.connect(f);
      node = f;
    }
    node.connect(g);
    g.connect(this.gain);
    o.start(t);
    o.stop(t + dur + 0.05);
  },

  drum(t, kind, vol) {
    const c = Sound.ctx;
    if (kind === 'kick') {
      const o = c.createOscillator();
      const g = c.createGain();
      o.type = 'sine';
      o.frequency.setValueAtTime(150, t);
      o.frequency.exponentialRampToValueAtTime(45, t + 0.14);
      g.gain.setValueAtTime(vol, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.2);
      o.connect(g);
      g.connect(this.gain);
      o.start(t);
      o.stop(t + 0.25);
      return;
    }
    const src = c.createBufferSource();
    src.buffer = Sound.noiseBuf;
    const f = c.createBiquadFilter();
    f.type = kind === 'hat' ? 'highpass' : 'bandpass';
    f.frequency.value = kind === 'hat' ? 7000 : 1800;
    const g = c.createGain();
    const dur = kind === 'hat' ? 0.04 : 0.12;
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f);
    f.connect(g);
    g.connect(this.gain);
    src.start(t, Math.random() * 0.5);
    src.stop(t + dur + 0.02);
  },

  playStep(t) {
    const song = this.song;
    const bar = song.bars[this.bar];
    const s = this.step;
    const sd = song.stepDur;
    const style = song.def.style;
    // 和弦铺底
    if (s === 0) {
      for (const n of bar.chord) this.voice(t, midiHz(n), sd * 16 * 0.98, 'triangle', style === 'drive' ? 0.05 : 0.07, 0.25, 1400);
    }
    // 贝斯
    const root = bar.chord[0] - 12;
    let bassHit = false;
    if (style === 'calm') bassHit = s === 0 || s === 8;
    else if (style === 'bright') bassHit = s === 0 || s === 6 || s === 8 || s === 14;
    else if (style === 'groove') bassHit = s === 0 || s === 3 || s === 8 || s === 10 || s === 14;
    else bassHit = s % 2 === 0;
    if (bassHit) {
      const oct = style === 'drive' && s % 4 === 2 ? 12 : 0;
      this.voice(t, midiHz(root + oct), sd * (style === 'calm' ? 7 : 1.8), 'triangle', 0.22, 0.01, 900);
    }
    // 旋律
    for (const m of bar.mel) {
      if (m.s === s) {
        const len = sd * m.len;
        this.voice(t, midiHz(m.n), len * 1.6, 'sine', 0.16, 0.005, 0);
        this.voice(t, midiHz(m.n + 12), len * 0.7, 'triangle', 0.04, 0.005, 3000);
      }
    }
    // 鼓
    if (style !== 'calm') {
      if (s === 0 || s === 8 || (style === 'drive' && (s === 4 || s === 12))) this.drum(t, 'kick', 0.5);
      if ((style === 'groove' || style === 'drive') && (s === 4 || s === 12)) this.drum(t, 'snare', 0.12);
      if (s % 4 === 2) this.drum(t, 'hat', 0.06);
      if (style === 'drive' && s % 2 === 1) this.drum(t, 'hat', 0.025);
    } else if (s === 0 && this.bar % 2 === 0) {
      this.drum(t, 'hat', 0.03);
    }
  },
};
