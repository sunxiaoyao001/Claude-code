/**
 * 程序化声音设计：npm run audio
 * ------------------------------------------------------------
 * 不依赖任何采样素材，全部用 DSP 现场合成，零版权风险：
 *   - 14 个音效（数字落下、套娃镜头拉远、泡沫破裂、盖章、心跳、叮、硬币、重低音……）
 *   - 一条与时间轴对齐的 115 秒配乐（D 小调铺底 + 系列八音盒主题 + 每想一层就往下走的琶音
 *     + 凯恩斯段的三拍子 + 结尾转 F 大调）
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

/** 硬币：两声金属“叮” */
const coin = () => {
  const b = stereo(1.1);
  const hits = [
    {t: 0, f: 1975.5},
    {t: 0.075, f: 2637},
  ];
  const parts = [
    {r: 1, a: 1, d: 0.45},
    {r: 2.76, a: 0.45, d: 0.2},
    {r: 5.4, a: 0.22, d: 0.08},
  ];
  for (let i = 0; i < b.L.length; i++) {
    const t = i / SR;
    let s = 0;
    for (const h of hits) {
      const d = t - h.t;
      if (d < 0) continue;
      for (const p of parts) s += Math.sin(TAU * h.f * p.r * d) * p.a * Math.exp(-d / p.d);
      s += white() * Math.exp(-d / 0.002) * 0.4;
    }
    b.L[i] = s * 0.5;
    b.R[i] = s * 0.5;
  }
  reverb(b, 0.25, 0.8);
  return b;
};

/** 盖章：沉闷的一声“咚” */
const stamp = () => {
  const b = stereo(0.9);
  const lpN = lp1();
  for (let i = 0; i < b.L.length; i++) {
    const t = i / SR;
    const s = Math.sin(TAU * (45 + 60 * Math.exp(-t / 0.02)) * t) * Math.exp(-t / 0.1) + lpN(white(), 700) * Math.exp(-t / 0.05) * 1.6;
    b.L[i] = s;
    b.R[i] = s;
  }
  reverb(b, 0.22, 0.9, 0.5);
  return b;
};

/** 失败蜂鸣：两条略微失谐的低频锯齿 */
const buzz = () => {
  const b = stereo(0.7);
  const lp = lp1();
  const saw = (x: number) => 2 * (x - Math.floor(x + 0.5));
  for (let i = 0; i < b.L.length; i++) {
    const t = i / SR;
    const env = Math.min(1, t / 0.01) * (t < 0.42 ? 1 : Math.exp(-(t - 0.42) / 0.04));
    const s = lp((saw(110 * t) + saw(116 * t)) * 0.5, 1200) * env;
    b.L[i] = s;
    b.R[i] = s;
  }
  reverb(b, 0.15, 0.7);
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

/** 数字落到数轴上：木琴般短促的“哒” */
const drop = () => {
  const b = stereo(0.6);
  const f = mtof(76);
  const click = bp();
  for (let i = 0; i < b.L.length; i++) {
    const t = i / SR;
    let s = Math.sin(TAU * f * t) * Math.exp(-t / 0.07) + Math.sin(TAU * f * 3.9 * t) * 0.3 * Math.exp(-t / 0.02);
    s += click(white(), 3200, 3) * Math.exp(-t / 0.004) * 1.5;
    s *= Math.min(1, t / 0.0015);
    b.L[i] = s;
    b.R[i] = s;
  }
  reverb(b, 0.25, 0.8);
  return b;
};

/** 套娃镜头拉远：低频“呼——”+ 慢慢张开的滤波噪声 + 下滑的正弦 */
const zoom = () => {
  const len = 2.4;
  const b = stereo(len);
  const f1 = bp();
  const f2 = bp();
  let ph = 0;
  for (let i = 0; i < b.L.length; i++) {
    const t = i / SR;
    const k = t / len;
    const env = Math.sin(Math.PI * Math.pow(k, 0.6)) ** 1.5;
    const fc = 200 + 1600 * Math.pow(k, 1.4);
    ph += (TAU * (180 - 110 * k)) / SR;
    const tone = Math.sin(ph) * 0.35 * env;
    b.L[i] = (f1(white(), fc, 1.4) * 1.8 + tone) * env;
    b.R[i] = (f2(white(), fc * 1.05, 1.4) * 1.8 + tone) * env;
  }
  reverb(b, 0.35, 1.4, 0.4);
  return b;
};

/** 泡沫破裂：玻璃般的碎响 + 急速下滑的音 + 低频闷响 */
const crash = () => {
  const len = 1.9;
  const b = stereo(len);
  const hp = bp();
  const lpN = lp1();
  let ph = 0;
  for (let i = 0; i < b.L.length; i++) {
    const t = i / SR;
    const shards = hp(white(), 5200, 1.2) * Math.exp(-t / 0.18) * 2.2;
    ph += (TAU * (900 * Math.exp(-t / 0.35) + 60)) / SR;
    const fall = Math.sin(ph) * 0.5 * Math.exp(-t / 0.6);
    const thump = Math.sin(TAU * (42 + 50 * Math.exp(-t / 0.03)) * t) * Math.exp(-t / 0.25) + lpN(white(), 300) * Math.exp(-t / 0.4);
    const s = shards + fall + thump;
    b.L[i] = s * 0.9 + shards * 0.1;
    b.R[i] = s * 0.9 - shards * 0.1;
  }
  reverb(b, 0.3, 1.3, 0.35);
  return b;
};

/** 叮：清亮的“通过”钟音 */
const ding = () => {
  const b = stereo(1.4);
  const f = mtof(88);
  const parts = [
    {r: 1, a: 1, d: 0.7},
    {r: 2, a: 0.3, d: 0.35},
    {r: 3, a: 0.12, d: 0.2},
    {r: 4.2, a: 0.06, d: 0.1},
  ];
  for (let i = 0; i < b.L.length; i++) {
    const t = i / SR;
    let s = 0;
    for (const p of parts) s += Math.sin(TAU * f * p.r * t) * p.a * Math.exp(-t / p.d);
    s *= Math.min(1, t / 0.002) * 0.5;
    b.L[i] = s;
    b.R[i] = s;
  }
  reverb(b, 0.35, 1.0, 0.3);
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

  // —— 和声（D 小调；金句与片尾转到 F 大调）——
  const Dm = [38, 45, 50, 53];
  const Bb = [34, 46, 50, 53];
  const Gm = [31, 43, 50, 55];
  const A = [33, 45, 49, 52];
  const F = [29, 41, 48, 57];
  const C = [36, 43, 48, 52];
  const FM = [41, 48, 53, 57, 60, 65]; // 结尾的“亮”

  const progN = (t0: number, t1: number, chords: number[][], gain: number, cutoff: number) => {
    const step = (t1 - t0) / chords.length;
    chords.forEach((c, i) => pad(t0 + i * step, t0 + (i + 1) * step, c, gain, cutoff));
  };
  const arpeggio = (t0: number, t1: number, every: number, notes: number[], gain: number) => {
    for (let i = 0, t = t0; t < t1; i++, t += every) pluck(t, notes[i % notes.length], gain, Math.sin(i * 0.7) * 0.5);
  };
  const melody = (t0: number, notes: number[], beat: number, gain = 0.14) =>
    notes.forEach((m, i) => (m > 0 ? musicBox(t0 + i * beat, m, gain, Math.sin(i * 1.3) * 0.4) : null));

  const zero = sec(950); // 一直想下去 → 0
  const punch = sec(3110); // 金句
  const crashAt = sec(2850); // 泡沫破裂

  // 钩子：紧张的脉冲
  pad(0, S('rules'), Dm, 0.05, 520);
  for (let t = 0.2; t < S('rules') - 0.3; t += 0.5) drum(t, 0.3);

  // 规则：好奇 + 系列八音盒主题；倒数时只剩铺底
  progN(S('rules'), sec(470), [Dm, Bb, F, C], 0.045, 700);
  melody(S('rules') + 0.6, [74, 77, 81, 79, 77, 76, 74, 0, 69, 72, 74], 0.7, 0.12);
  pad(sec(470), E('rules'), A, 0.04, 500);

  // 推理：每想一层，琶音就整体往下走一级；最后越来越快地坠向 0
  pad(S('reason'), zero - 0.15, Dm, 0.04, 600);
  const levelArp = [
    {f: 556, notes: [86, 81, 77, 74]},
    {f: 634, notes: [81, 77, 74, 69]},
    {f: 714, notes: [77, 74, 69, 65]},
    {f: 794, notes: [74, 69, 65, 62]},
  ];
  for (const la of levelArp) la.notes.forEach((m, i) => musicBox(sec(la.f) + i * 0.16, m, 0.12, (i - 1.5) * 0.3));
  for (let i = 0, t = sec(870); t < zero - 0.1; i++) {
    pluck(t, 72 - i * 1.4, 0.09, Math.sin(i) * 0.5);
    t += Math.max(0.06, 0.32 - i * 0.022);
  }
  // 0：空灵的五度
  pad(zero, sec(1230), [38, 45, 62, 69, 74], 0.05, 1600);
  melody(zero + 0.1, [86, 93], 0.5, 0.12);

  // 实验：轻快、好奇
  progN(S('lab'), E('lab'), [F, C, Dm, C], 0.04, 900);
  arpeggio(S('lab') + 0.3, E('lab') - 0.3, 0.375, [65, 69, 72, 69], 0.07);

  // 报纸：鼓点进来
  progN(S('papers'), E('papers'), [Dm, Bb, F, C], 0.045, 900);
  for (let t = S('papers') + 0.2; t < E('papers') - 0.3; t += 0.5) drum(t, 0.28);
  arpeggio(S('papers') + 0.25, E('papers') - 0.3, 0.25, [62, 65, 69, 74, 69, 65], 0.065);

  // 错在哪：先暗后亮（“多想一步”转向 F 大调）
  progN(S('why'), sec(2290), [Gm, Dm, A], 0.045, 600);
  for (let t = S('why') + 0.4; t < sec(2290); t += 1) drum(t, 0.3);
  progN(sec(2290), E('why'), [F, C, Bb, F], 0.045, 950);
  arpeggio(sec(2290) + 0.2, E('why') - 0.3, 0.375, [65, 69, 72, 77], 0.07);

  // 凯恩斯：三拍子的八音盒华尔兹 → 泡沫越涨越急 → 破裂后只剩低音
  progN(S('keynes'), sec(2770), [Dm, A, Dm, Bb], 0.04, 800);
  for (let i = 0, t = S('keynes') + 0.3; t < sec(2770); i++, t += 0.42) {
    const bar = Math.floor(i / 3);
    const root = [62, 57, 62, 58][bar % 4];
    musicBox(t, i % 3 === 0 ? root : root + (i % 3 === 1 ? 7 : 12), i % 3 === 0 ? 0.11 : 0.07, i % 3 === 1 ? -0.3 : 0.3);
  }
  pad(sec(2770), crashAt - 0.05, A, 0.05, 1200);
  for (let i = 0, t = sec(2774); t < crashAt - 0.1; i++) {
    pluck(t, 62 + (i % 8) * 2, 0.08, Math.sin(i) * 0.4);
    t += Math.max(0.08, 0.3 - i * 0.012);
  }
  pad(crashAt + 0.5, E('keynes'), [26, 38, 45], 0.05, 380);

  // 升华：逐渐推高，金句落在 F 大调
  progN(S('meaning'), punch - 0.1, [Dm, Bb, C], 0.05, 800);
  for (let t = S('meaning') + 0.3; t < punch - 0.3; ) {
    const k = (t - S('meaning')) / (punch - S('meaning'));
    drum(t, 0.26 + 0.2 * k);
    t += 0.75 - 0.35 * k;
  }
  pad(punch, E('meaning'), FM, 0.06, 1400);
  melody(punch + 0.05, [77, 81, 84, 89], 0.18, 0.15);

  // 片尾：F 大调收束 + 八音盒尾声
  pad(S('outro'), E('outro') + 0.5, FM, 0.055, 1300);
  melody(S('outro') + 0.3, [72, 77, 81, 84, 81, 77, 72], 0.6, 0.14);

  // —— 底噪：房间里的空气声 ——
  const nl = lp1();
  const nr = lp1();
  for (let i = 0; i < b.L.length; i++) {
    b.L[i] += nl(white(), 1800) * 0.03;
    b.R[i] += nr(white(), 1800) * 0.03;
  }

  reverb(b, 0.35, 1.8, 0.4);
  return b;
};

/* ================= 输出 ================= */
console.log('生成音效…');
const sfx: Record<string, () => Stereo> = {
  drop,
  pop,
  tick,
  ding,
  boom,
  stamp,
  riser,
  shimmer,
  buzz,
  whoosh,
  zoom,
  coin,
  heartbeat,
  crash,
};
const PEAK: Record<string, number> = {boom: -0.5, stamp: -0.5, crash: -1, buzz: -6, ding: -4, drop: -4};
for (const [name, fn] of Object.entries(sfx)) save(name, fn(), PEAK[name] ?? -3);

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
