// Procedural score + sound design, locked to the scene timeline. No samples, no voice.
// Run: node --experimental-strip-types scripts/gen-audio.ts   → public/audio/score.mp3
import {writeFileSync, mkdirSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {SCENES, sceneStarts} from '../src/timeline.ts';

const SR = 48000;
const FPS = 30;
const {starts, total} = sceneStarts();
const DUR = total / FPS + 1.5;
const N = Math.ceil(DUR * SR);
const L = new Float32Array(N);
const R = new Float32Array(N);
const SL = new Float32Array(N); // reverb send
const SRt = new Float32Array(N);

const sceneAt = (id: string) => starts[SCENES.findIndex((s) => s.id === id)] / FPS;
const T = (id: string, localFrame: number) => sceneAt(id) + localFrame / FPS;

let seed = 1234567;
const rnd = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296);
const panLR = (p: number) => [Math.cos(((p + 1) * Math.PI) / 4), Math.sin(((p + 1) * Math.PI) / 4)];
const midi = (m: number) => 440 * Math.pow(2, (m - 69) / 12);

const put = (i: number, v: number, pan: number, send: number) => {
  if (i < 0 || i >= N) return;
  const [a, b] = panLR(pan);
  L[i] += v * a;
  R[i] += v * b;
  SL[i] += v * a * send;
  SRt[i] += v * b * send;
};

class SVF {
  ic1 = 0;
  ic2 = 0;
  run(x: number, fc: number, q: number) {
    const g = Math.tan((Math.PI * Math.min(fc, SR * 0.45)) / SR);
    const k = 1 / q;
    const a1 = 1 / (1 + g * (g + k));
    const a2 = g * a1;
    const a3 = g * a2;
    const v3 = x - this.ic2;
    const v1 = a1 * this.ic1 + a2 * v3;
    const v2 = this.ic2 + a2 * this.ic1 + a3 * v3;
    this.ic1 = 2 * v1 - this.ic1;
    this.ic2 = 2 * v2 - this.ic2;
    return {lp: v2, bp: v1, hp: x - k * v1 - v2};
  }
}
const blep = (t: number, dt: number) => {
  if (t < dt) {
    t /= dt;
    return t + t - t * t - 1;
  }
  if (t > 1 - dt) {
    t = (t - 1) / dt;
    return t * t + t + t + 1;
  }
  return 0;
};

/** Warm analog-ish pad: detuned band-limited saws through a breathing low-pass. */
const pad = (t0: number, dur: number, notes: number[], gain: number, opt: {cut?: number; cutEnd?: number; attack?: number; release?: number; send?: number; bright?: number} = {}) => {
  const {cut = 900, cutEnd = cut, attack = 2.5, release = 3, send = 0.55} = opt;
  const n0 = Math.floor(t0 * SR);
  const len = Math.floor(dur * SR);
  notes.forEach((m, vi) => {
    const f = midi(m);
    const det = [-0.11, 0, 0.09];
    const ph = det.map(() => rnd());
    const flt = new SVF();
    const pan = (vi / Math.max(1, notes.length - 1)) * 1.2 - 0.6;
    const lfoPh = rnd() * 6.28;
    for (let i = 0; i < len; i++) {
      const t = i / SR;
      let v = 0;
      det.forEach((d, k) => {
        const fr = f * Math.pow(2, d / 12);
        const dt = fr / SR;
        ph[k] += dt;
        if (ph[k] >= 1) ph[k] -= 1;
        v += 2 * ph[k] - 1 - blep(ph[k], dt);
      });
      v = v / 3 + Math.sin(2 * Math.PI * f * 0.5 * t) * 0.35;
      const c = (cut + (cutEnd - cut) * (t / dur)) * (1 + 0.25 * Math.sin(t * 0.35 + lfoPh));
      const y = flt.run(v, c, 0.8).lp;
      const e = Math.min(1, t / attack) * Math.min(1, (dur - t) / release);
      put(n0 + i, y * gain * Math.max(0, e) / Math.sqrt(notes.length), pan, send);
    }
  });
};

/** FM bell / chime. ratio 3.5 → glassy, 1.4 → warm, 2 → e-piano. */
const bell = (t0: number, f: number, gain: number, opt: {decay?: number; ratio?: number; index?: number; pan?: number; send?: number} = {}) => {
  const {decay = 1.6, ratio = 3.5, index = 2.2, pan = 0, send = 0.6} = opt;
  const n0 = Math.floor(t0 * SR);
  const len = Math.floor(decay * 4 * SR);
  for (let i = 0; i < len; i++) {
    const t = i / SR;
    const env = Math.exp(-t / decay) * Math.min(1, t / 0.004);
    const mod = Math.sin(2 * Math.PI * f * ratio * t) * index * Math.exp(-t / (decay * 0.35));
    const v = Math.sin(2 * Math.PI * f * t + mod) * env;
    put(n0 + i, v * gain, pan, send);
  }
};

/** Filtered-noise whoosh / riser (band-pass sweep). */
const whoosh = (t0: number, dur: number, f0: number, f1: number, gain: number, opt: {pan0?: number; pan1?: number; q?: number; send?: number; shape?: 'swell' | 'rise' | 'fall'} = {}) => {
  const {pan0 = 0, pan1 = 0, q = 1.2, send = 0.4, shape = 'swell'} = opt;
  const n0 = Math.floor(t0 * SR);
  const len = Math.floor(dur * SR);
  const flt = new SVF();
  for (let i = 0; i < len; i++) {
    const u = i / len;
    const fc = f0 * Math.pow(f1 / f0, u);
    const x = rnd() * 2 - 1;
    const y = flt.run(x, fc, q).bp;
    const env = shape === 'rise' ? Math.pow(u, 2.2) * Math.min(1, (1 - u) * 40) : shape === 'fall' ? Math.pow(1 - u, 1.8) * Math.min(1, u * 40) : Math.sin(Math.PI * u) ** 1.5;
    put(n0 + i, y * gain * env, pan0 + (pan1 - pan0) * u, send);
  }
};

/** Sub impact: pitch-dropping sine + a puff of low noise. */
const impact = (t0: number, gain: number, opt: {f0?: number; f1?: number; decay?: number; send?: number} = {}) => {
  const {f0 = 95, f1 = 32, decay = 0.9, send = 0.35} = opt;
  const n0 = Math.floor(t0 * SR);
  const len = Math.floor(decay * 3 * SR);
  const flt = new SVF();
  let ph = 0;
  for (let i = 0; i < len; i++) {
    const t = i / SR;
    const f = f1 + (f0 - f1) * Math.exp(-t / 0.12);
    ph += f / SR;
    const body = Math.sin(2 * Math.PI * ph) * Math.exp(-t / decay);
    const n = flt.run(rnd() * 2 - 1, 180, 0.7).lp * Math.exp(-t / 0.08) * 0.8;
    put(n0 + i, Math.tanh((body + n) * 1.4) * gain, 0, send);
  }
};

const tick = (t0: number, gain: number, f = 3200, pan = 0, send = 0.15) => {
  const n0 = Math.floor(t0 * SR);
  const len = Math.floor(0.05 * SR);
  const flt = new SVF();
  for (let i = 0; i < len; i++) {
    const t = i / SR;
    const v = flt.run(rnd() * 2 - 1, f, 3).bp * Math.exp(-t / 0.006) + Math.sin(2 * Math.PI * f * 0.5 * t) * Math.exp(-t / 0.01) * 0.4;
    put(n0 + i, v * gain, pan, send);
  }
};

const blip = (t0: number, f: number, gain: number, pan = 0, dur = 0.09, send = 0.4) => {
  const n0 = Math.floor(t0 * SR);
  const len = Math.floor(dur * 3 * SR);
  for (let i = 0; i < len; i++) {
    const t = i / SR;
    const v = Math.sin(2 * Math.PI * f * t) * Math.exp(-t / dur) * Math.min(1, t / 0.002);
    put(n0 + i, v * gain, pan, send);
  }
};

const pop = (t0: number, gain: number, f = 520, pan = 0) => {
  const n0 = Math.floor(t0 * SR);
  const len = Math.floor(0.12 * SR);
  for (let i = 0; i < len; i++) {
    const t = i / SR;
    const fr = f * (1 + 1.5 * Math.exp(-t / 0.012));
    const v = Math.sin(2 * Math.PI * fr * t) * Math.exp(-t / 0.03);
    put(n0 + i, v * gain, pan, 0.3);
  }
};

const heartbeat = (t0: number, gain: number) => {
  for (const [dt, g] of [[0, 1], [0.24, 0.7]] as const) {
    const n0 = Math.floor((t0 + dt) * SR);
    const len = Math.floor(0.35 * SR);
    let ph = 0;
    for (let i = 0; i < len; i++) {
      const t = i / SR;
      const f = 42 + 38 * Math.exp(-t / 0.03);
      ph += f / SR;
      put(n0 + i, Math.sin(2 * Math.PI * ph) * Math.exp(-t / 0.09) * gain * g, 0, 0.1);
    }
  }
};

/** Shepard–Risset glissando: an endlessly rising tone for an endless feed. */
const shepard = (t0: number, dur: number, gain: number, rate = 0.11) => {
  const n0 = Math.floor(t0 * SR);
  const len = Math.floor(dur * SR);
  const voices = 7;
  const phs = new Array(voices).fill(0);
  for (let i = 0; i < len; i++) {
    const t = i / SR;
    let v = 0;
    for (let k = 0; k < voices; k++) {
      const pos = (((k / voices + t * rate) % 1) + 1) % 1; // 0..1 across 7 octaves
      const f = 40 * Math.pow(2, pos * voices);
      phs[k] += f / SR;
      const amp = Math.exp(-Math.pow((pos - 0.5) / 0.18, 2));
      v += Math.sin(2 * Math.PI * phs[k]) * amp;
    }
    const e = Math.min(1, t / 2) * Math.min(1, (dur - t) / 1.2);
    put(n0 + i, (v / 2.2) * gain * e, Math.sin(t * 0.7) * 0.3, 0.5);
  }
};

const shatter = (t0: number, gain: number) => {
  whoosh(t0, 0.9, 9000, 2500, gain * 0.9, {q: 0.6, shape: 'fall', send: 0.6});
  for (let k = 0; k < 14; k++) {
    bell(t0 + rnd() * 0.12, 1800 + rnd() * 5200, gain * 0.25, {decay: 0.25 + rnd() * 0.5, ratio: 1.47 + rnd(), index: 3, pan: rnd() * 1.6 - 0.8, send: 0.7});
  }
  impact(t0, gain * 0.8, {f0: 120, f1: 45, decay: 0.5});
};

// ================================================================================================
// SCORE
const D = 50; // D3

// --- 1. eye: heartbeat in the dark, flicking light
impact(0.02, 0.55, {decay: 1.2});
pad(0, 6.4, [D - 24, D - 12, D - 5, D + 3], 0.16, {cut: 420, attack: 1.2, release: 1.5});
for (let t = 0.3; t < 5.0; t += 1.0 - Math.min(0.35, t * 0.06)) heartbeat(t, 0.32);
[8, 28, 46, 60, 72, 82, 91, 99, 106, 112, 117, 122, 126, 130, 133, 136, 139, 142, 145].forEach((f, i) =>
  whoosh(T('eye', f), 0.22, 1800, 5200, 0.05 + i * 0.004, {pan0: 0.3, pan1: -0.2, q: 2, send: 0.25}),
);
impact(T('eye', 151), 0.35, {f0: 70, f1: 30, decay: 1.4});

// --- 2. bedroom: the clock, then an hour slips away
pad(T('bedroom', 0), 7.6, [D - 24, D - 12, D - 2, D + 3, D + 7], 0.15, {cut: 600, cutEnd: 1500, attack: 2});
{
  let f = 4;
  let k = 0;
  while (f < 214) {
    tick(T('bedroom', f), 0.09, k % 2 ? 2600 : 3400, 0.55, 0.12);
    const lapse = Math.max(0, Math.min(1, (f - 100) / 105));
    f += 30 - 26 * Math.pow(lapse, 0.7);
    k++;
  }
}
whoosh(T('bedroom', 140), 74 / FPS, 300, 6000, 0.16, {shape: 'rise', send: 0.6});

// --- 3. title: the flash, the vortex, the name
impact(T('title', 0), 0.6, {decay: 1.6});
whoosh(T('title', 0), 2.2, 6000, 900, 0.12, {shape: 'fall', send: 0.8});
pad(T('title', 0), 6.6, [D - 12, D - 5, D, D + 3, D + 7, D + 14], 0.17, {cut: 1100, cutEnd: 2600, attack: 1.4});
for (let k = 0; k < 26; k++) bell(T('title', 4 + k * 2.2) + rnd() * 0.05, midi(D + 24 + [0, 3, 7, 10, 12, 15, 19][k % 7]), 0.035, {decay: 1.4, pan: rnd() * 1.6 - 0.8});
impact(T('title', 66), 0.45, {f0: 110, f1: 40, decay: 1.8});
[D + 12, D + 15, D + 19, D + 24].forEach((m, i) => bell(T('title', 68) + i * 0.03, midi(m), 0.09, {decay: 3.5, ratio: 2, index: 1.2, pan: i * 0.3 - 0.45, send: 0.8}));

// --- 4. stat: the clock sweeps 151 minutes; 38 days light up
pad(T('stat', 0), 8.4, [D - 26, D - 14, D - 2, D + 5], 0.15, {cut: 700, cutEnd: 1200});
for (let f = 6; f < 102; f += 3) tick(T('stat', f), 0.05 + (f / 102) * 0.05, 4200, -0.4, 0.1);
bell(T('stat', 103), midi(D + 19), 0.09, {decay: 2.5, ratio: 2, index: 1});
const penta = [0, 3, 5, 7, 10];
for (let d = 0; d < 38; d++) {
  const m = D + 12 + penta[d % 5] + 12 * Math.floor(d / 5) * 0.5;
  blip(T('stat', 150 + d * 1.6), midi(Math.round(m)), 0.045, (d / 38) * 1.2 - 0.6, 0.12, 0.5);
}
impact(T('stat', 212), 0.4, {f0: 90, f1: 38, decay: 1.2});

// --- 5. feed: a pulse, swipes, and the slot-machine sparkle of a good video
{
  const t0 = T('feed', 0);
  pad(t0, 15.4, [D - 24, D - 12, D - 5, D + 3, D + 10], 0.14, {cut: 800, cutEnd: 2400, attack: 1});
  for (let b = 0; b * 0.625 < 14.6; b++) {
    const t = t0 + b * 0.625;
    const n0 = Math.floor(t * SR);
    let ph = 0;
    for (let i = 0; i < 0.25 * SR; i++) {
      const tt = i / SR;
      ph += (48 + 60 * Math.exp(-tt / 0.02)) / SR;
      put(n0 + i, Math.sin(2 * Math.PI * ph) * Math.exp(-tt / 0.07) * 0.18 * (0.6 + 0.4 * Math.min(1, b / 8)), 0, 0.05);
    }
  }
  const sw = [40, 108, 160, 262, 304, 334, 358, 378, 394, 407, 418, 427, 435, 442];
  const items = ['ocean', 'rain', 'cat', 'neon', 'fireworks', 'aurora', 'galaxy', 'paint', 'ad', 'ocean', 'cat', 'neon', 'aurora', 'fireworks'];
  const rew: Record<string, number> = {ad: 0.04, ocean: 0.42, rain: 0.1, cat: 0.82, neon: 0.22, fireworks: 0.58, aurora: 0.66, galaxy: 0.3, paint: 0.46};
  sw.forEach((f, i) => {
    whoosh(T('feed', f), 0.28, 900, 7000, 0.09, {pan0: 0.4, pan1: -0.1, q: 1.6, send: 0.3});
    const r = rew[items[i]] ?? 0.2;
    if (r > 0.25) {
      const notes = r > 0.75 ? [D + 24, D + 28, D + 31, D + 36] : r > 0.5 ? [D + 24, D + 31, D + 36] : [D + 31];
      notes.forEach((m, k) => bell(T('feed', f + 9) + k * 0.045, midi(m), 0.05 + r * 0.06, {decay: 0.8 + r, pan: 0.2 + k * 0.15}));
    }
  });
  for (let k = 0; k < 18; k++) bell(T('feed', 171) + k * 0.05 + rnd() * 0.03, midi(D + 31 + penta[k % 5] + (k > 9 ? 12 : 0)), 0.045, {decay: 0.9, pan: rnd() * 1.4 - 0.7});
  pop(T('feed', 205), 0.2, 700, -0.1);
  pop(T('feed', 212), 0.2, 820, -0.1);
  whoosh(T('feed', 360), 90 / FPS, 400, 9000, 0.2, {shape: 'rise', send: 0.5});
}

// --- 6. brain: deep space, a CT sweep, gold rivers
{
  pad(T('brain', 0), 15.8, [D - 29, D - 17, D - 10, D - 5, D + 2, D + 7], 0.16, {cut: 500, cutEnd: 1600, attack: 2.5});
  whoosh(T('brain', 0), 1.8, 4000, 500, 0.14, {shape: 'fall', send: 0.7});
  impact(T('brain', 6), 0.4, {decay: 1.5});
  // scanning tone
  const n0 = Math.floor(T('brain', 150) * SR);
  const len = Math.floor((66 / FPS) * SR);
  for (let i = 0; i < len; i++) {
    const t = i / SR;
    const u = i / len;
    const f = 1400 - 900 * u;
    const v = Math.sin(2 * Math.PI * f * t) * (0.5 + 0.5 * Math.sin(2 * Math.PI * 14 * t)) * Math.sin(Math.PI * u);
    put(n0 + i, v * 0.05, 0.4 - u * 0.8, 0.5);
  }
  bell(T('brain', 222), midi(D + 7), 0.12, {decay: 3, ratio: 1.4, index: 1.5});
  for (let k = 0; k < 40; k++) bell(T('brain', 300) + k * 0.09 + rnd() * 0.04, midi(D + 24 + penta[Math.floor(rnd() * 5)] + 12 * Math.floor(rnd() * 2)), 0.022, {decay: 0.7, pan: rnd() * 1.6 - 0.8});
  [D + 12, D + 19, D + 24].forEach((m, i) => bell(T('brain', 356) + i * 0.04, midi(m), 0.09, {decay: 2.6, ratio: 2, index: 1.4, pan: i * 0.4 - 0.4}));
}

// --- 7. synapse: under water, vesicles open
{
  pad(T('synapse', 0), 12, [D - 22, D - 10, D - 3, D + 4, D + 9], 0.14, {cut: 700, cutEnd: 1100});
  const n0 = Math.floor(T('synapse', 0) * SR);
  const flt = new SVF();
  for (let i = 0; i < 11.5 * SR; i++) {
    const t = i / SR;
    const y = flt.run(rnd() * 2 - 1, 380 + 120 * Math.sin(t * 0.8), 2).bp;
    put(n0 + i, y * 0.07 * Math.min(1, t / 1.5) * Math.min(1, (11.5 - t) / 1.5), Math.sin(t * 0.4) * 0.4, 0.4);
  }
  [44, 82, 122, 186, 242].forEach((f, k) => {
    pop(T('synapse', f), 0.22, 300 + k * 40, k % 2 ? 0.3 : -0.3);
    for (let j = 0; j < 8; j++) bell(T('synapse', f + 4) + j * 0.06 + rnd() * 0.05, midi(D + 31 + penta[(j + k) % 5]), 0.025, {decay: 0.6, pan: rnd() * 1.4 - 0.7});
  });
  bell(T('synapse', 170), midi(D + 14), 0.08, {decay: 3, ratio: 2, index: 1});
}

// --- 8. uncertainty: certain coins go numb, maybe-coins keep you leaning in
{
  pad(T('uncertainty', 0), 8.5, [D - 22, D - 10, D - 5, D + 2], 0.13, {cut: 600});
  pad(T('uncertainty', 250), 7.5, [D - 17, D - 10, D - 5, D, D + 5], 0.16, {cut: 700, cutEnd: 2600, attack: 1.5});
  const A = [128, 150, 172, 194, 216, 238];
  const Ag = [1, 0.62, 0.4, 0.28, 0.22, 0.2];
  A.forEach((f, i) => {
    whoosh(T('uncertainty', f), 0.18, 1500, 4500, 0.05, {q: 2});
    bell(T('uncertainty', f + 7), midi(D + 31), 0.11 * Ag[i], {decay: 0.9});
    bell(T('uncertainty', f + 7.5), midi(D + 36), 0.07 * Ag[i], {decay: 0.7});
  });
  const B = [270, 292, 314, 336, 358, 380, 402, 424, 446];
  const W = [true, false, false, true, false, true, true, false, true];
  B.forEach((f, i) => {
    whoosh(T('uncertainty', f - 14), 0.55, 200, 1600, 0.07, {shape: 'rise', q: 3});
    whoosh(T('uncertainty', f), 0.18, 1500, 4500, 0.05, {q: 2});
    if (W[i]) {
      [D + 31, D + 36, D + 40].forEach((m, k) => bell(T('uncertainty', f + 7) + k * 0.04, midi(m), 0.1, {decay: 1.2, pan: k * 0.3 - 0.3}));
    } else {
      impact(T('uncertainty', f + 7), 0.12, {f0: 160, f1: 90, decay: 0.15, send: 0.1});
    }
  });
}

// --- 9. slot machine
{
  pad(T('slot', 0), 13.4, [D - 24, D - 12, D - 5, D + 4, D + 7], 0.13, {cut: 900, cutEnd: 1800});
  const pulls = [28, 112, 214];
  const stops = [
    [60, 72, 86],
    [140, 152, 196],
    [242, 256, 290],
  ];
  pulls.forEach((p, k) => {
    impact(T('slot', p), 0.22, {f0: 220, f1: 120, decay: 0.12, send: 0.1});
    tick(T('slot', p), 0.25, 1200, 0.5, 0.1);
    const end = stops[k][2];
    for (let f = p + 2; f < end; f += 1.6) {
      const active = stops[k].filter((s) => s > f).length;
      if (active > 0 && rnd() < 0.5 + active * 0.15) tick(T('slot', f), 0.035 * active, 2800 + rnd() * 1200, rnd() * 0.6 - 0.3, 0.05);
    }
    stops[k].forEach((s, r) => {
      impact(T('slot', s), 0.2, {f0: 300, f1: 140, decay: 0.08, send: 0.15});
      tick(T('slot', s), 0.2, 900, r * 0.4 - 0.4);
    });
  });
  whoosh(T('slot', 160), 36 / FPS, 300, 3000, 0.12, {shape: 'rise', q: 3});
  // jackpot
  impact(T('slot', 292), 0.5, {decay: 1.2});
  [0, 4, 7, 12, 16, 19, 24].forEach((iv, k) => bell(T('slot', 292) + k * 0.07, midi(D + 24 + iv), 0.1, {decay: 1.6, pan: k * 0.2 - 0.6, ratio: 3.5}));
  for (let k = 0; k < 50; k++) bell(T('slot', 296) + k * 0.035 + rnd() * 0.02, 2400 + rnd() * 2600, 0.025, {decay: 0.25, ratio: 1.41, index: 2.5, pan: rnd() * 1.6 - 0.8});
  [322, 366].forEach((f) => {
    impact(T('slot', f), 0.18, {f0: 220, f1: 120, decay: 0.12, send: 0.1});
    whoosh(T('slot', f), 0.3, 900, 7000, 0.09, {pan0: 0.4, pan1: -0.1});
  });
}

// --- 10. algorithm: data, a twin, a galaxy, a loop
{
  const t0 = T('algorithm', 0);
  pad(t0, 9.2, [D - 22, D - 10, D - 3, D + 2, D + 9], 0.13, {cut: 900});
  pad(T('algorithm', 268), 13.2, [D - 19, D - 7, D - 2, D + 5, D + 12], 0.16, {cut: 900, cutEnd: 3200, attack: 2});
  [10, 24, 36, 48, 62, 80, 92, 104, 114, 124, 136, 146].forEach((f, i) => {
    blip(T('algorithm', f), midi(D + 24 + penta[i % 5] + (i > 5 ? 12 : 0)), 0.05, -0.5, 0.06, 0.3);
    blip(T('algorithm', f + 44), midi(D + 12 + penta[i % 5]), 0.04, 0.5, 0.12, 0.4);
  });
  // arpeggiator under the loop, accelerating
  let tt = T('algorithm', 418);
  const tEnd = T('algorithm', 650);
  let k = 0;
  while (tt < tEnd) {
    const u = (tt - T('algorithm', 418)) / (tEnd - T('algorithm', 418));
    blip(tt, midi(D + 12 + penta[k % 5] + 12 * (Math.floor(k / 5) % 2)), 0.04 + u * 0.03, Math.sin(k) * 0.5, 0.07, 0.35);
    tt += 0.2 - 0.12 * u;
    k++;
  }
  whoosh(T('algorithm', 278), 2.2, 6000, 400, 0.12, {shape: 'fall', send: 0.8});
  for (let j = 0; j < 8; j++) whoosh(T('algorithm', 350 + j * 6), 0.5, 2000, 600, 0.04, {pan0: 0.5, pan1: -0.6});
  whoosh(T('algorithm', 540), 120 / FPS, 200, 9000, 0.22, {shape: 'rise', send: 0.6});
  impact(T('algorithm', 652), 0.5, {decay: 1.4});
}

// --- 11. no end: the last page, the credits — and then a sound that never stops rising
{
  pad(T('noend', 0), 5.4, [D - 24, D - 12, D - 5, D + 2, D + 7], 0.13, {cut: 1000});
  whoosh(T('noend', 14), 0.6, 2500, 900, 0.08, {q: 0.8});
  [D + 7, D + 12, D + 16].forEach((m, i) => bell(T('noend', 98) + i * 0.05, midi(m), 0.06, {decay: 2.5, ratio: 2, index: 0.8}));
  impact(T('noend', 120), 0.3, {f0: 140, f1: 60, decay: 0.3, send: 0.3});
  shepard(T('noend', 150), (420 - 150) / FPS + 0.6, 0.22);
}

// --- 12. brake: a tired heart, an accelerator that never lets go
{
  pad(T('brake', 0), 13, [D - 29, D - 17, D - 10, D - 7, D - 2], 0.17, {cut: 500, cutEnd: 300});
  for (let f = 6; f < 270; f += 40) heartbeat(T('brake', f), 0.3);
  for (let f = 10; f < 250; f += 20) tick(T('brake', f), 0.04, 3000, 0.6, 0.1);
  // wanting holds, liking sinks
  const n0 = Math.floor(T('brake', 290) * SR);
  const len = Math.floor(3.4 * SR);
  for (let i = 0; i < len; i++) {
    const t = i / SR;
    const u = i / len;
    const e = Math.min(1, t / 0.6) * Math.min(1, (3.4 - t) / 0.8);
    put(n0 + i, Math.sin(2 * Math.PI * midi(D + 19) * t) * 0.04 * e, -0.3, 0.6);
    put(n0 + i, Math.sin(2 * Math.PI * midi(D + 19) * Math.pow(2, -u * 1.4) * t) * 0.035 * e * (1 - u * 0.6), 0.3, 0.6);
  }
}

// --- 13. break free: the chain snaps, the harmony turns to major
{
  pad(T('breakfree', 0), 2.1, [D - 24, D - 12, D - 5, D + 3], 0.15, {cut: 700, release: 0.6});
  for (let f = 4; f < 58; f += 3) tick(T('breakfree', f), 0.05, 5200 + rnd() * 1500, rnd() * 1.2 - 0.6, 0.3);
  whoosh(T('breakfree', 26), 32 / FPS, 400, 7000, 0.16, {shape: 'rise'});
  shatter(T('breakfree', 58), 0.5);
  pad(T('breakfree', 58), 12.5, [D - 24, D - 12, D - 5, D + 4, D + 9, D + 14], 0.17, {cut: 1300, cutEnd: 2400, attack: 1.2});
  [124, 222, 326].forEach((f, i) => {
    [D + 14, D + 18, D + 21].forEach((m, k) => bell(T('breakfree', f) + k * 0.12, midi(m + i * 2), 0.06, {decay: 2.2, ratio: 2, index: 0.9, pan: k * 0.3 - 0.3}));
  });
  tick(T('breakfree', 344), 0.18, 1500, -0.4, 0.1);
  whoosh(T('breakfree', 352), 1, 4000, 300, 0.08, {shape: 'fall'});
}

// --- 14. outro: warm, a like, the comments arriving
{
  pad(T('outro', 0), 11.4, [D - 21, D - 9, D - 2, D + 2, D + 7, D + 11], 0.17, {cut: 1400, cutEnd: 900, attack: 1.2, release: 2.5});
  whoosh(T('outro', 0), 1.1, 600, 3000, 0.07, {shape: 'swell'});
  pop(T('outro', 48), 0.25, 900, -0.2);
  [D + 24, D + 28, D + 31].forEach((m, k) => bell(T('outro', 50) + k * 0.05, midi(m), 0.06, {decay: 1, pan: -0.3}));
  whoosh(T('outro', 80), 0.4, 500, 3500, 0.08, {pan0: -0.2, pan1: -0.2});
  for (let i = 0; i < 5; i++) pop(T('outro', 104 + i * 22), 0.12, 600 + i * 60, -0.3);
  for (let i = 0; i < 8; i++) pop(T('outro', 120 + i * 16), 0.06, 1200 + i * 90, i % 2 ? 0.5 : -0.5);
  for (let i = 0; i < 11; i++) tick(T('outro', 236 + i * 3), 0.05, 2400, -0.3, 0.05);
  [D + 2, D + 9, D + 14, D + 18, D + 21].forEach((m, k) => bell(T('outro', 150) + k * 0.16, midi(m), 0.05, {decay: 3.5, ratio: 2, index: 0.7, pan: k * 0.25 - 0.5, send: 0.8}));
}

// ================================================================================================
// Freeverb-style reverb on the send bus
const reverb = (inp: Float32Array, spread: number) => {
  const out = new Float32Array(N);
  const combs = [1116, 1188, 1277, 1356, 1422, 1491, 1557, 1617].map((d) => Math.round(((d + spread) * SR) / 44100));
  const aps = [556, 441, 341, 225].map((d) => Math.round(((d + spread) * SR) / 44100));
  const fb = 0.86;
  const damp = 0.28;
  for (const d of combs) {
    const buf = new Float32Array(d);
    let idx = 0;
    let store = 0;
    for (let i = 0; i < N; i++) {
      const y = buf[idx];
      store = y * (1 - damp) + store * damp;
      buf[idx] = inp[i] + store * fb;
      out[i] += y;
      idx = (idx + 1) % d;
    }
  }
  for (const d of aps) {
    const buf = new Float32Array(d);
    let idx = 0;
    for (let i = 0; i < N; i++) {
      const b = buf[idx];
      const x = out[i];
      buf[idx] = x + b * 0.5;
      out[i] = b - x;
      idx = (idx + 1) % d;
    }
  }
  return out;
};
const wetL = reverb(SL, 0);
const wetR = reverb(SRt, 23);

// master: sum, gentle glue, soft limit, fades
let peak = 0;
const mixL = new Float32Array(N);
const mixR = new Float32Array(N);
for (let i = 0; i < N; i++) {
  mixL[i] = L[i] + wetL[i] * 0.05;
  mixR[i] = R[i] + wetR[i] * 0.05;
  peak = Math.max(peak, Math.abs(mixL[i]), Math.abs(mixR[i]));
}
const pre = 0.92 / Math.max(peak * 0.6, 1e-6);
const fadeOut = (total / FPS) * SR;
const pcm = Buffer.alloc(N * 4);
for (let i = 0; i < N; i++) {
  const fo = Math.max(0, Math.min(1, (fadeOut - i) / (1.2 * SR)));
  const l = Math.tanh(mixL[i] * pre * 0.8) * 0.94 * fo;
  const r = Math.tanh(mixR[i] * pre * 0.8) * 0.94 * fo;
  pcm.writeInt16LE(Math.round(l * 32767), i * 4);
  pcm.writeInt16LE(Math.round(r * 32767), i * 4 + 2);
}
const header = Buffer.alloc(44);
header.write('RIFF', 0);
header.writeUInt32LE(36 + pcm.length, 4);
header.write('WAVE', 8);
header.write('fmt ', 12);
header.writeUInt32LE(16, 16);
header.writeUInt16LE(1, 20);
header.writeUInt16LE(2, 22);
header.writeUInt32LE(SR, 24);
header.writeUInt32LE(SR * 4, 28);
header.writeUInt16LE(4, 32);
header.writeUInt16LE(16, 34);
header.write('data', 36);
header.writeUInt32LE(pcm.length, 40);
mkdirSync('public/audio', {recursive: true});
const tmp = 'out/score.wav';
mkdirSync('out', {recursive: true});
writeFileSync(tmp, Buffer.concat([header, pcm]));
execFileSync('ffmpeg', ['-loglevel', 'error', '-y', '-i', tmp, '-af', 'loudnorm=I=-16:TP=-1.5:LRA=12', '-ar', '48000', '-codec:a', 'libmp3lame', '-b:a', '192k', 'public/audio/score.mp3']);
console.log(`score: ${DUR.toFixed(1)}s, peak ${peak.toFixed(3)} → public/audio/score.mp3`);
