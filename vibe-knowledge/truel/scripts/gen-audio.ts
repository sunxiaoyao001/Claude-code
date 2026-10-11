/**
 * 程序化声音设计：npm run audio
 * ------------------------------------------------------------
 * 不依赖任何采样素材，全部用 DSP 现场合成，零版权风险：
 *   - 14 个音效（枪声、峡谷回声、重低音、上升音、心跳、倒带、金光闪烁……）
 *   - 一条与时间轴对齐的 114 秒配乐（D 小调氛围铺底 + 八音盒旋律 + 拨弦琶音 + 风声）
 * 输出：public/audio/*.wav（配乐另外转成 score.mp3 以减小体积）
 */
import {execFileSync} from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import {FPS, SCENES, TOTAL_FRAMES} from '../src/timeline';

const SR = 44100;
const OUT = path.resolve('public/audio');
fs.mkdirSync(OUT, {recursive: true});

/* ================= 基础 DSP ================= */
type Stereo = {L: Float32Array; R: Float32Array};
const stereo = (sec: number): Stereo => ({L: new Float32Array(Math.ceil(sec * SR)), R: new Float32Array(Math.ceil(sec * SR))});

let seed = 1337;
const rnd = () => {
  seed = (seed + 0x6d2b79f5) >>> 0;
  let t = seed;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const white = () => rnd() * 2 - 1;
const TAU = Math.PI * 2;
const mtof = (m: number) => 440 * Math.pow(2, (m - 69) / 12);

/** 一阶低通 */
const lp1 = () => {
  let y = 0;
  return (x: number, fc: number) => {
    const a = 1 - Math.exp((-TAU * fc) / SR);
    y += a * (x - y);
    return y;
  };
};
/** 一阶高通 */
const hp1 = () => {
  const l = lp1();
  return (x: number, fc: number) => x - l(x, fc);
};
/** RBJ 带通（恒定 0dB 峰值） */
const bp = () => {
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  return (x: number, fc: number, q: number) => {
    const w = (TAU * Math.min(fc, SR * 0.45)) / SR;
    const alpha = Math.sin(w) / (2 * q);
    const a0 = 1 + alpha;
    const b0 = alpha / a0, b2 = -alpha / a0;
    const a1 = (-2 * Math.cos(w)) / a0, a2 = (1 - alpha) / a0;
    const y = b0 * x + b2 * x2 - a1 * y1 - a2 * y2;
    x2 = x1; x1 = x; y2 = y1; y1 = y;
    return y;
  };
};

/** Schroeder 混响（4 梳状 + 2 全通，左右声道错开） */
const reverb = (buf: Stereo, wet: number, size = 1, damp = 0.35) => {
  const combs = [1116, 1188, 1277, 1356];
  const aps = [556, 441];
  const run = (input: Float32Array, spread: number) => {
    const out = new Float32Array(input.length);
    for (const c of combs) {
      const n = Math.round((c + spread) * size);
      const line = new Float32Array(n);
      let idx = 0, filt = 0;
      for (let i = 0; i < input.length; i++) {
        const y = line[idx];
        filt = y * (1 - damp) + filt * damp;
        line[idx] = input[i] + filt * 0.84;
        idx = (idx + 1) % n;
        out[i] += y * 0.25;
      }
    }
    for (const a of aps) {
      const n = Math.round((a + spread) * size);
      const line = new Float32Array(n);
      let idx = 0;
      for (let i = 0; i < out.length; i++) {
        const b = line[idx];
        const x = out[i];
        line[idx] = x + b * 0.5;
        out[i] = b - x * 0.5;
        idx = (idx + 1) % n;
      }
    }
    return out;
  };
  const mono = new Float32Array(buf.L.length);
  for (let i = 0; i < mono.length; i++) mono[i] = (buf.L[i] + buf.R[i]) * 0.5;
  const wl = run(mono, 0);
  const wr = run(mono, 23);
  for (let i = 0; i < mono.length; i++) {
    buf.L[i] = buf.L[i] * (1 - wet * 0.5) + wl[i] * wet;
    buf.R[i] = buf.R[i] * (1 - wet * 0.5) + wr[i] * wet;
  }
};

/** 延迟回声（可指定每次回声的增益与低通，模拟峡谷） */
const echoes = (buf: Stereo, taps: {t: number; g: number; fc: number; pan: number}[]) => {
  const L = Float32Array.from(buf.L);
  const R = Float32Array.from(buf.R);
  for (const tap of taps) {
    const d = Math.round(tap.t * SR);
    const fl = lp1();
    const fr = lp1();
    for (let i = d; i < buf.L.length; i++) {
      buf.L[i] += fl(L[i - d], tap.fc) * tap.g * (1 - Math.max(0, tap.pan));
      buf.R[i] += fr(R[i - d], tap.fc) * tap.g * (1 + Math.min(0, tap.pan));
    }
  }
};

const normalize = (buf: Stereo, peakDb = -1) => {
  let peak = 1e-9;
  for (let i = 0; i < buf.L.length; i++) peak = Math.max(peak, Math.abs(buf.L[i]), Math.abs(buf.R[i]));
  const g = Math.pow(10, peakDb / 20) / peak;
  for (let i = 0; i < buf.L.length; i++) {
    buf.L[i] *= g;
    buf.R[i] *= g;
  }
};

const fadeEdges = (buf: Stereo, inSec = 0.0003, outSec = 0.05) => {
  const n = buf.L.length;
  const a = Math.round(inSec * SR);
  const b = Math.round(outSec * SR);
  for (let i = 0; i < a; i++) {
    buf.L[i] *= i / a;
    buf.R[i] *= i / a;
  }
  for (let i = 0; i < b; i++) {
    const g = i / b;
    buf.L[n - 1 - i] *= g;
    buf.R[n - 1 - i] *= g;
  }
};

const writeWav = (file: string, buf: Stereo) => {
  const n = buf.L.length;
  const data = Buffer.alloc(44 + n * 4);
  data.write('RIFF', 0);
  data.writeUInt32LE(36 + n * 4, 4);
  data.write('WAVE', 8);
  data.write('fmt ', 12);
  data.writeUInt32LE(16, 16);
  data.writeUInt16LE(1, 20);
  data.writeUInt16LE(2, 22);
  data.writeUInt32LE(SR, 24);
  data.writeUInt32LE(SR * 4, 28);
  data.writeUInt16LE(4, 32);
  data.writeUInt16LE(16, 34);
  data.write('data', 36);
  data.writeUInt32LE(n * 4, 40);
  for (let i = 0; i < n; i++) {
    data.writeInt16LE(Math.round(Math.max(-1, Math.min(1, buf.L[i])) * 32767), 44 + i * 4);
    data.writeInt16LE(Math.round(Math.max(-1, Math.min(1, buf.R[i])) * 32767), 46 + i * 4);
  }
  fs.writeFileSync(file, data);
};

const save = (name: string, buf: Stereo, peakDb = -1) => {
  normalize(buf, peakDb);
  fadeEdges(buf);
  writeWav(path.join(OUT, `${name}.wav`), buf);
  console.log(`  ${name}.wav  ${(buf.L.length / SR).toFixed(2)}s`);
};

/* ================= 音效 ================= */

/** 枪声：瞬态 + 火药爆裂体 + 低频冲击 + 空气撕裂声，外加峡谷回声 */
const gunshotCore = (len: number) => {
  const b = stereo(len);
  const lpBody = lp1();
  const crack = bp();
  const hp = hp1();
  for (let i = 0; i < b.L.length; i++) {
    const t = i / SR;
    const n = white();
    const transient = t < 0.004 ? hp(n, 1500) * (1 - t / 0.004) : 0;
    const body = lpBody(n, 9000 * Math.exp(-t / 0.03) + 900) * Math.exp(-t / 0.05);
    const f = 45 + 95 * Math.exp(-t / 0.03);
    const thump = Math.tanh(2.2 * Math.sin(TAU * f * t)) * Math.exp(-t / 0.11) * 0.9;
    const cr = crack(n, 2600, 1.4) * Math.exp(-t / 0.018) * 2.2;
    const s = transient * 1.2 + body * 1.1 + thump + cr;
    b.L[i] = s;
    b.R[i] = s;
  }
  return b;
};

const gunshot = () => {
  const b = gunshotCore(2.2);
  echoes(b, [
    {t: 0.21, g: 0.32, fc: 2500, pan: -0.4},
    {t: 0.46, g: 0.18, fc: 1500, pan: 0.5},
  ]);
  reverb(b, 0.32, 1.2, 0.45);
  return b;
};

const gunshotSky = () => {
  const b = gunshotCore(4.2);
  echoes(b, [
    {t: 0.32, g: 0.42, fc: 2400, pan: -0.6},
    {t: 0.7, g: 0.3, fc: 1600, pan: 0.6},
    {t: 1.15, g: 0.2, fc: 1100, pan: -0.5},
    {t: 1.7, g: 0.12, fc: 800, pan: 0.5},
    {t: 2.4, g: 0.07, fc: 600, pan: 0},
  ]);
  reverb(b, 0.45, 1.5, 0.5);
  return b;
};

/** 电影感重低音 */
const boom = () => {
  const b = stereo(3.2);
  const lpN = lp1();
  for (let i = 0; i < b.L.length; i++) {
    const t = i / SR;
    const f = 32 + 30 * Math.exp(-t / 0.25);
    const env = Math.min(1, t / 0.004) * Math.exp(-t / 0.9);
    const sub = Math.tanh(1.6 * Math.sin(TAU * f * t)) * env;
    const knock = Math.sin(TAU * 110 * t) * Math.exp(-t / 0.05) * 0.5;
    const rumble = lpN(white(), 260) * Math.exp(-t / 0.6) * 2.5;
    const s = sub + knock + rumble;
    b.L[i] = s;
    b.R[i] = s;
  }
  reverb(b, 0.25, 1.6, 0.6);
  return b;
};

/** 上升音：带通扫频噪声 + 正弦扫频，结尾戛然而止 */
const riser = () => {
  const len = 1.6;
  const b = stereo(len);
  const f1 = bp();
  const f2 = bp();
  let ph = 0;
  for (let i = 0; i < b.L.length; i++) {
    const t = i / SR;
    const k = t / len;
    const fc = 300 * Math.pow(20, k);
    const env = Math.pow(k, 2.2);
    ph += (TAU * (180 + 1100 * k * k)) / SR;
    const tone = Math.sin(ph) * 0.25 * env;
    b.L[i] = f1(white(), fc, 3) * env * 2 + tone;
    b.R[i] = f2(white(), fc * 1.03, 3) * env * 2 + tone;
  }
  reverb(b, 0.2);
  return b;
};

/** 风声掠过：左右声像扫动 */
const whoosh = () => {
  const len = 0.9;
  const b = stereo(len);
  const f = bp();
  for (let i = 0; i < b.L.length; i++) {
    const t = i / SR;
    const k = t / len;
    const env = Math.sin(Math.PI * Math.pow(k, 0.7)) ** 2;
    const fc = 350 + 2400 * Math.sin(Math.PI * k);
    const s = f(white(), fc, 1.2) * env * 1.6;
    b.L[i] = s * (1 - k * 0.8);
    b.R[i] = s * (0.2 + k * 0.8);
  }
  reverb(b, 0.18);
  return b;
};

/** 左轮转轮“咔哒”：两次金属撞击 */
const click = () => {
  const b = stereo(0.35);
  const hits = [0, 0.045];
  const fs1 = [bp(), bp()];
  for (let i = 0; i < b.L.length; i++) {
    const t = i / SR;
    let s = 0;
    hits.forEach((h, k) => {
      const d = t - h;
      if (d < 0) return;
      s += fs1[k](white(), 3400 + k * 600, 7) * Math.exp(-d / 0.006) * 3;
      s += Math.sin(TAU * (2300 + k * 400) * d) * Math.exp(-d / 0.018) * 0.35;
      s += Math.sin(TAU * 170 * d) * Math.exp(-d / 0.02) * 0.3;
    });
    b.L[i] = s;
    b.R[i] = s;
  }
  reverb(b, 0.15, 0.6);
  return b;
};

/** 瞄准锁定：两声电子提示音 */
const lock = () => {
  const b = stereo(0.4);
  const beeps = [
    {t: 0, f: 1760, d: 0.05},
    {t: 0.075, f: 2350, d: 0.09},
  ];
  for (let i = 0; i < b.L.length; i++) {
    const t = i / SR;
    let s = 0;
    for (const bb of beeps) {
      const d = t - bb.t;
      if (d < 0 || d > bb.d + 0.04) continue;
      const env = Math.min(1, d / 0.004) * (d < bb.d ? 1 : Math.exp(-(d - bb.d) / 0.01));
      s += (Math.sin(TAU * bb.f * d) + 0.18 * Math.sin(TAU * bb.f * 3 * d)) * env * 0.5;
    }
    b.L[i] = s;
    b.R[i] = s;
  }
  reverb(b, 0.2, 0.7);
  return b;
};

/** 徽章碎裂：一簇金属 / 玻璃泛音 + 高频噪声 */
const shatter = () => {
  const b = stereo(1.4);
  const pings = Array.from({length: 26}, () => ({
    t: rnd() * 0.18,
    f: 2200 + rnd() * 5200,
    d: 0.05 + rnd() * 0.3,
    pan: rnd() * 2 - 1,
    g: 0.2 + rnd() * 0.5,
  }));
  const hp = hp1();
  for (let i = 0; i < b.L.length; i++) {
    const t = i / SR;
    const nz = hp(white(), 3000) * Math.exp(-t / 0.12) * 0.9;
    let l = nz;
    let r = nz;
    for (const p of pings) {
      const d = t - p.t;
      if (d < 0) continue;
      const s = Math.sin(TAU * p.f * d) * Math.exp(-d / p.d) * p.g;
      l += s * (1 - p.pan) * 0.5;
      r += s * (1 + p.pan) * 0.5;
    }
    b.L[i] = l;
    b.R[i] = r;
  }
  reverb(b, 0.35, 1.1);
  return b;
};

/** 心跳：lub-dub */
const heartbeat = () => {
  const b = stereo(0.9);
  const beats = [
    {t: 0, f: 62, g: 1},
    {t: 0.22, f: 54, g: 0.7},
  ];
  const lp = lp1();
  for (let i = 0; i < b.L.length; i++) {
    const t = i / SR;
    let s = 0;
    for (const bt of beats) {
      const d = t - bt.t;
      if (d < 0) continue;
      const f = bt.f + 30 * Math.exp(-d / 0.02);
      s += Math.sin(TAU * f * d) * Math.min(1, d / 0.008) * Math.exp(-d / 0.09) * bt.g;
    }
    const y = lp(s, 400);
    b.L[i] = y;
    b.R[i] = y;
  }
  return b;
};

/** 怀表滴答 */
const tick = () => {
  const b = stereo(0.25);
  const f = bp();
  for (let i = 0; i < b.L.length; i++) {
    const t = i / SR;
    const s = f(white(), 4200, 9) * Math.exp(-t / 0.004) * 3 + Math.sin(TAU * 1250 * t) * Math.exp(-t / 0.02) * 0.4;
    b.L[i] = s;
    b.R[i] = s;
  }
  reverb(b, 0.25, 0.8);
  return b;
};

/** 倒带：磁带高速回卷的啾啾声 */
const rewind = () => {
  const len = 1.1;
  const b = stereo(len);
  const f = bp();
  let ph = 0;
  for (let i = 0; i < b.L.length; i++) {
    const t = i / SR;
    const k = t / len;
    const freq = 300 * Math.pow(10, k) * (1 + 0.25 * Math.sin(TAU * 17 * t));
    ph += (TAU * freq) / SR;
    const saw = 2 * (ph / TAU - Math.floor(ph / TAU + 0.5));
    const env = Math.sin(Math.PI * k) ** 0.6;
    const s = f(saw * 0.6 + white() * 0.25, freq * 1.5, 2) * env * 2;
    b.L[i] = s;
    b.R[i] = s * 0.9;
  }
  reverb(b, 0.15);
  return b;
};

/** 金光闪烁：D 大调高音簇 */
const shimmer = () => {
  const b = stereo(3);
  const notes = [86, 90, 93, 98, 102, 105].map((m, k) => ({f: mtof(m), t: k * 0.045 + rnd() * 0.02, pan: rnd() * 2 - 1}));
  for (let i = 0; i < b.L.length; i++) {
    const t = i / SR;
    let l = 0;
    let r = 0;
    for (const n of notes) {
      const d = t - n.t;
      if (d < 0) continue;
      const env = Math.min(1, d / 0.02) * Math.exp(-d / 0.9) * (0.8 + 0.2 * Math.sin(TAU * 6 * d));
      const s = Math.sin(TAU * n.f * d) * env * 0.3;
      l += s * (1 - n.pan) * 0.5;
      r += s * (1 + n.pan) * 0.5;
    }
    b.L[i] = l;
    b.R[i] = r;
  }
  reverb(b, 0.55, 1.6, 0.25);
  return b;
};

/** 数据雨：模拟进行时越来越密的提示音（与点阵点亮曲线一致） */
const blips = () => {
  const len = 6;
  const b = stereo(len + 0.5);
  const scale = [74, 77, 79, 81, 84, 86, 89, 91, 93]; // D 小调五声
  // 点亮曲线 n(t) = N·(t/T)^2.2 → 提示音时刻取其反函数的均匀采样
  const count = 140;
  for (let k = 0; k < count; k++) {
    const t0 = len * Math.pow(k / count, 1 / 2.2);
    const f = mtof(scale[Math.floor(rnd() * scale.length)]);
    const pan = rnd() * 1.6 - 0.8;
    const g = 0.25 + 0.2 * rnd();
    const start = Math.round(t0 * SR);
    for (let i = 0; i < 0.06 * SR; i++) {
      const d = i / SR;
      const s = Math.sin(TAU * f * d) * Math.min(1, d / 0.002) * Math.exp(-d / 0.018) * g;
      if (start + i < b.L.length) {
        b.L[start + i] += s * (1 - pan) * 0.5;
        b.R[start + i] += s * (1 + pan) * 0.5;
      }
    }
  }
  reverb(b, 0.3, 0.9);
  return b;
};

/** 界面弹出 */
const pop = () => {
  const b = stereo(0.3);
  for (let i = 0; i < b.L.length; i++) {
    const t = i / SR;
    const f = 380 + 600 * (1 - Math.exp(-t / 0.012));
    const s = Math.sin(TAU * f * t) * Math.min(1, t / 0.003) * Math.exp(-t / 0.07);
    b.L[i] = s;
    b.R[i] = s;
  }
  reverb(b, 0.2, 0.7);
  return b;
};

/* ================= 配乐 ================= */
const sec = (f: number) => f / FPS;
const LEN = sec(TOTAL_FRAMES) + 2;

const score = () => {
  const b = stereo(LEN);

  /** 铺底和弦：加法合成的锯齿波 + 低通，带起音与释音 */
  const pad = (t0: number, t1: number, midi: number[], gain: number, cutoff: number) => {
    const a = 0.9;
    const r = 1.2;
    const start = Math.floor(t0 * SR);
    const end = Math.min(b.L.length, Math.floor((t1 + r) * SR));
    midi.forEach((m, vi) => {
      const f = mtof(m);
      const fl = lp1();
      const fr = lp1();
      const det = [0.996, 1.004];
      const ph = [rnd() * TAU, rnd() * TAU];
      for (let i = start; i < end; i++) {
        const t = i / SR - t0;
        const env = Math.min(1, t / a) * (i / SR > t1 ? Math.max(0, 1 - (i / SR - t1) / r) : 1);
        let sl = 0;
        let sr = 0;
        for (let h = 1; h <= 7; h++) {
          sl += Math.sin(ph[0] + TAU * f * det[0] * h * t) / h;
          sr += Math.sin(ph[1] + TAU * f * det[1] * h * t) / h;
        }
        const lfo = 0.85 + 0.15 * Math.sin(TAU * 0.13 * t + vi);
        b.L[i] += fl(sl, cutoff) * env * gain * lfo;
        b.R[i] += fr(sr, cutoff) * env * gain * lfo;
      }
    });
  };

  /** 八音盒：非谐泛音的钟琴音色 */
  const musicBox = (t0: number, midi: number, gain = 0.16, pan = 0) => {
    const f = mtof(midi);
    const parts = [
      {r: 1, a: 1, d: 1.6},
      {r: 2.0, a: 0.35, d: 0.7},
      {r: 3.01, a: 0.18, d: 0.35},
      {r: 4.16, a: 0.1, d: 0.2},
    ];
    const start = Math.floor(t0 * SR);
    for (let i = 0; i < 2.5 * SR && start + i < b.L.length; i++) {
      const t = i / SR;
      let s = 0;
      for (const p of parts) s += Math.sin(TAU * f * p.r * t) * p.a * Math.exp(-t / p.d);
      s *= Math.min(1, t / 0.002) * gain;
      b.L[start + i] += s * (1 - pan) * 0.5;
      b.R[start + i] += s * (1 + pan) * 0.5;
    }
  };

  /** 拨弦：Karplus-Strong */
  const pluck = (t0: number, midi: number, gain = 0.2, pan = 0) => {
    const f = mtof(midi);
    const n = Math.round(SR / f);
    // 激励噪声先做平滑，再对输出低通，去掉刺耳的高频
    const ex = lp1();
    const line = new Float32Array(n).map(() => ex(white(), 3000));
    const tone = lp1();
    const start = Math.floor(t0 * SR);
    let idx = 0;
    for (let i = 0; i < 1.6 * SR && start + i < b.L.length; i++) {
      const next = (idx + 1) % n;
      const y = line[idx];
      line[idx] = 0.5 * (line[idx] + line[next]) * 0.994;
      idx = next;
      const s = tone(y, 2400) * gain * 1.6;
      b.L[start + i] += s * (1 - pan) * 0.5;
      b.R[start + i] += s * (1 + pan) * 0.5;
    }
  };

  /** 低沉鼓点 */
  const drum = (t0: number, gain = 0.5) => {
    const start = Math.floor(t0 * SR);
    for (let i = 0; i < 0.5 * SR && start + i < b.L.length; i++) {
      const t = i / SR;
      const f = 48 + 40 * Math.exp(-t / 0.03);
      const s = Math.sin(TAU * f * t) * Math.min(1, t / 0.004) * Math.exp(-t / 0.16) * gain;
      b.L[start + i] += s;
      b.R[start + i] += s;
    }
  };

  const S = (k: keyof typeof SCENES) => sec(SCENES[k].from);
  const E = (k: keyof typeof SCENES) => sec(SCENES[k].from + SCENES[k].dur);

  // —— 和声进行（D 小调：i – VI – iv – V）——
  const Dm = [38, 45, 50, 53];
  const Bb = [34, 46, 50, 53];
  const Gm = [31, 43, 50, 55];
  const A = [33, 45, 49, 52];
  const DM = [38, 45, 50, 54, 57]; // D 大调：反转时的“亮”
  const F = [41, 48, 53, 57];
  const C = [36, 43, 48, 52];

  const prog4 = (t0: number, t1: number, chords: number[][], gain: number, cutoff: number) => {
    const step = (t1 - t0) / chords.length;
    chords.forEach((c, i) => pad(t0 + i * step, t0 + (i + 1) * step, c, gain, cutoff));
  };

  pad(0, S('cast'), Dm, 0.05, 500);
  prog4(S('cast'), E('cast'), [Dm, Bb, Gm, A], 0.045, 700);
  pad(S('question'), E('question'), A, 0.05, 420);
  prog4(S('intuition'), S('twist') - 1.2, [Dm, Bb, Gm, A, Dm, Bb, Gm, A], 0.05, 520);
  // 反转：先静默 2.5 秒（由 MUSIC_DUCK 压到 0），子弹冲天时 D 大调全开
  pad(sec(1455), E('twist'), DM, 0.06, 1500);
  prog4(S('logic'), E('logic'), [Dm, F, C, Gm], 0.045, 800);
  pad(S('proof'), E('proof'), Dm, 0.035, 600);
  pad(S('caveat'), E('caveat'), A, 0.05, 450);
  prog4(S('outro'), E('outro') - 3, [Bb, F, Gm], 0.05, 900);
  pad(E('outro') - 3, E('outro') + 0.5, DM, 0.055, 1100);

  // —— 八音盒旋律（原创）——
  const beat = 60 / 84;
  const castMelody = [69, 74, 76, 77, 76, 74, 73, 74, 69, 74, 77, 81, 79, 77, 76, 74];
  castMelody.forEach((m, i) => musicBox(S('cast') + 0.6 + i * beat, m, 0.14, Math.sin(i) * 0.4));
  const outroMelody = [77, 76, 74, 69, 70, 72, 74, 74, 77, 79, 81, 74];
  outroMelody.forEach((m, i) => musicBox(S('outro') + 0.4 + i * beat, m, 0.15, Math.sin(i * 1.3) * 0.4));
  [74, 78, 81, 86].forEach((m, i) => musicBox(E('outro') - 4 + i * 0.18, m, 0.16, (i - 1.5) * 0.3));

  // —— 鼓点：直觉陷阱段越来越急 ——
  for (let t = S('intuition'); t < S('twist') - 1.5; ) {
    drum(t, 0.45);
    const k = (t - S('intuition')) / (S('twist') - S('intuition'));
    t += 0.8 - 0.35 * k;
  }
  for (let t = S('caveat'); t < E('caveat') - 0.5; t += 0.5) drum(t, 0.35);

  // —— 拨弦琶音：模拟计算的“滴答感” ——
  const arp = [62, 65, 69, 72, 74, 72, 69, 65];
  for (let i = 0, t = S('proof') + 0.5; t < E('proof') - 0.5; i++, t += 0.25) {
    pluck(t, arp[i % arp.length], 0.16, Math.sin(i * 0.7) * 0.5);
  }
  for (let i = 0, t = S('logic') + 0.5; t < E('logic') - 0.5; i++, t += 0.5) {
    pluck(t, arp[(i * 3) % arp.length] - 12, 0.12, Math.sin(i) * 0.4);
  }

  // —— 风声：西部荒原的底噪 ——
  const wf = bp();
  const wl = lp1();
  for (let i = 0; i < b.L.length; i++) {
    const t = i / SR;
    const gust = 0.5 + 0.5 * Math.sin(TAU * 0.07 * t) * Math.sin(TAU * 0.031 * t + 1);
    const s = wf(wl(white(), 1200), 420 + 260 * gust, 0.8) * 0.06 * (0.4 + gust);
    b.L[i] += s;
    b.R[i] += s * 0.92;
  }

  reverb(b, 0.35, 1.8, 0.4);
  return b;
};

/* ================= 输出 ================= */
console.log('生成音效…');
const sfx: Record<string, () => Stereo> = {
  gunshot,
  gunshotSky,
  boom,
  riser,
  whoosh,
  click,
  lock,
  shatter,
  heartbeat,
  tick,
  rewind,
  shimmer,
  blips,
  pop,
};
for (const [name, fn] of Object.entries(sfx)) save(name, fn(), name.startsWith('gunshot') || name === 'boom' ? -0.5 : -3);

console.log('生成配乐…');
const sc = score();
normalize(sc, -3);
fadeEdges(sc, 0.01, 1.5);
const wavPath = path.join(OUT, 'score.wav');
writeWav(wavPath, sc);
try {
  // 用 Remotion 自带的 ffmpeg 压成 mp3，体积从 ~20MB 降到 ~3MB
  execFileSync('npx', ['remotion', 'ffmpeg', '-y', '-loglevel', 'error', '-i', wavPath, '-b:a', '224k', path.join(OUT, 'score.mp3')], {
    stdio: 'inherit',
  });
  fs.unlinkSync(wavPath);
  console.log('  score.mp3');
} catch {
  console.warn('  ffmpeg 不可用，保留 score.wav（请把 Soundtrack.tsx 中的文件名改为 score.wav）');
}
