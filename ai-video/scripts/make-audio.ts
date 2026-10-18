// 生成配乐和音效：node scripts/make-audio.ts
// 全部由代码合成，没有版权问题。配乐按 src/script.ts 的镜头时间分段编排，
// 改了文案（时间轴变了）之后重新运行一次，配乐就会重新对齐。
//   public/audio/music.mp3     背景音乐（96 BPM，C 大调，Fmaj7 → G → Em7 → Am7）
//   public/audio/sfx/*.wav     音效（在各个镜头里按帧触发）
import {execFileSync} from 'node:child_process';
import {mkdirSync, rmSync, writeFileSync} from 'node:fs';
import {FPS, SCENES, TOTAL_FRAMES} from '../src/script.ts';

const SR = 44100;
const TAU = Math.PI * 2;

// ———————————————————— 基础工具 ————————————————————

let seed = 20261018;
const rnd = () => {
	seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
	return seed / 4294967296;
};
const noise = () => rnd() * 2 - 1;
const mtof = (n: number) => 440 * Math.pow(2, (n - 69) / 12);
const clamp = (x: number, a: number, b: number) => Math.min(b, Math.max(a, x));

type Stereo = {L: Float32Array; R: Float32Array};
const stereo = (sec: number): Stereo => ({L: new Float32Array(Math.ceil(sec * SR)), R: new Float32Array(Math.ceil(sec * SR))});
const mono = (sec: number) => new Float32Array(Math.ceil(sec * SR));

// 等功率声像：pan -1（左）… 1（右）
const panGains = (pan: number) => {
	const a = ((pan + 1) / 4) * Math.PI;
	return [Math.cos(a), Math.sin(a)] as const;
};

const addMono = (dst: Stereo, src: Float32Array, at: number, gain = 1, pan = 0) => {
	const [gl, gr] = panGains(pan);
	const o = Math.round(at * SR);
	for (let i = 0; i < src.length; i++) {
		const j = o + i;
		if (j < 0 || j >= dst.L.length) continue;
		dst.L[j] += src[i] * gain * gl;
		dst.R[j] += src[i] * gain * gr;
	}
};

// RBJ 双二阶滤波器
const biquad = (type: 'lp' | 'hp' | 'bp', fc: number, q = 0.707) => {
	const w = (TAU * clamp(fc, 20, SR / 2.2)) / SR;
	const cos = Math.cos(w);
	const alpha = Math.sin(w) / (2 * q);
	let b0: number, b1: number, b2: number;
	if (type === 'lp') [b0, b1, b2] = [(1 - cos) / 2, 1 - cos, (1 - cos) / 2];
	else if (type === 'hp') [b0, b1, b2] = [(1 + cos) / 2, -(1 + cos), (1 + cos) / 2];
	else [b0, b1, b2] = [alpha, 0, -alpha];
	const a0 = 1 + alpha;
	const a1 = -2 * cos;
	const a2 = 1 - alpha;
	let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
	return (x: number) => {
		const y = (b0 * x + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2) / a0;
		x2 = x1; x1 = x; y2 = y1; y1 = y;
		return y;
	};
};

// 扫频带通（每 32 个采样更新一次系数）
const sweepFilter = (src: Float32Array, type: 'lp' | 'hp' | 'bp', fcAt: (t: number) => number, q = 0.9) => {
	const out = new Float32Array(src.length);
	let state = {x1: 0, x2: 0, y1: 0, y2: 0};
	for (let i = 0; i < src.length; i += 32) {
		const fc = clamp(fcAt(i / SR), 20, SR / 2.2);
		const w = (TAU * fc) / SR;
		const cos = Math.cos(w);
		const alpha = Math.sin(w) / (2 * q);
		const [b0, b1, b2] =
			type === 'lp' ? [(1 - cos) / 2, 1 - cos, (1 - cos) / 2] : type === 'hp' ? [(1 + cos) / 2, -(1 + cos), (1 + cos) / 2] : [alpha, 0, -alpha];
		const a0 = 1 + alpha, a1 = -2 * cos, a2 = 1 - alpha;
		for (let j = i; j < Math.min(i + 32, src.length); j++) {
			const x = src[j];
			const y = (b0 * x + b1 * state.x1 + b2 * state.x2 - a1 * state.y1 - a2 * state.y2) / a0;
			state = {x1: x, x2: state.x1, y1: y, y2: state.y1};
			out[j] = y;
		}
	}
	return out;
};

// Freeverb（立体声混响）
const reverb = (input: Stereo, room = 0.84, damp = 0.3, wet = 0.3): Stereo => {
	const combs = [1116, 1188, 1277, 1356, 1422, 1491, 1557, 1617];
	const aps = [556, 441, 341, 225];
	const run = (x: Float32Array, spread: number) => {
		const out = new Float32Array(x.length);
		const cb = combs.map((n) => ({buf: new Float32Array(n + spread), i: 0, store: 0}));
		const ab = aps.map((n) => ({buf: new Float32Array(n + spread), i: 0}));
		for (let s = 0; s < x.length; s++) {
			const inp = x[s] * 0.015;
			let acc = 0;
			for (const c of cb) {
				const y = c.buf[c.i];
				c.store = y * (1 - damp) + c.store * damp;
				c.buf[c.i] = inp + c.store * room;
				c.i = (c.i + 1) % c.buf.length;
				acc += y;
			}
			for (const a of ab) {
				const b = a.buf[a.i];
				a.buf[a.i] = acc + b * 0.5;
				a.i = (a.i + 1) % a.buf.length;
				acc = b - acc;
			}
			out[s] = acc;
		}
		return out;
	};
	const l = run(input.L, 0);
	const r = run(input.R, 23);
	return {L: l.map((v) => v * wet), R: r.map((v) => v * wet)};
};

// 乒乓延迟
const pingPong = (input: Stereo, delaySec: number, feedback: number, wet: number): Stereo => {
	const d = Math.round(delaySec * SR);
	const L = new Float32Array(input.L.length);
	const R = new Float32Array(input.R.length);
	const lp1 = biquad('lp', 3500);
	const lp2 = biquad('lp', 3500);
	for (let i = 0; i < L.length; i++) {
		const inL = i >= d ? (input.L[i - d] + input.R[i - d]) * 0.5 + R[i - d] * feedback : 0;
		const inR = i >= d ? L[i - d] * feedback : 0;
		L[i] = lp1(inL);
		R[i] = lp2(inR);
	}
	return {L: L.map((v) => v * wet), R: R.map((v) => v * wet)};
};

const mixInto = (dst: Stereo, src: Stereo, gain = 1) => {
	for (let i = 0; i < dst.L.length && i < src.L.length; i++) {
		dst.L[i] += src.L[i] * gain;
		dst.R[i] += src.R[i] * gain;
	}
};

const writeWav = (path: string, s: Stereo) => {
	const n = s.L.length;
	const data = Buffer.alloc(44 + n * 4);
	data.write('RIFF', 0);
	data.writeUInt32LE(36 + n * 4, 4);
	data.write('WAVEfmt ', 8);
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
		data.writeInt16LE(Math.round(clamp(s.L[i], -1, 1) * 32767), 44 + i * 4);
		data.writeInt16LE(Math.round(clamp(s.R[i], -1, 1) * 32767), 46 + i * 4);
	}
	writeFileSync(path, data);
};

const peakNormalize = (s: Stereo, peak: number) => {
	let m = 1e-9;
	for (let i = 0; i < s.L.length; i++) m = Math.max(m, Math.abs(s.L[i]), Math.abs(s.R[i]));
	const g = peak / m;
	for (let i = 0; i < s.L.length; i++) {
		s.L[i] *= g;
		s.R[i] *= g;
	}
	return s;
};

const toStereo = (m: Float32Array, pan = 0): Stereo => {
	const s = {L: new Float32Array(m.length), R: new Float32Array(m.length)};
	addMono(s, m, 0, 1, pan);
	return s;
};

// ———————————————————— 乐器 ————————————————————

// 带限锯齿波表（谐波按 1/n^1.3 衰减，听起来比纯锯齿更暖）
const TABLE = 4096;
const SAW = (() => {
	const t = new Float32Array(TABLE + 1);
	for (let h = 1; h <= 20; h++) for (let i = 0; i <= TABLE; i++) t[i] += Math.sin((TAU * h * i) / TABLE) / Math.pow(h, 1.3);
	let m = 0;
	for (const v of t) m = Math.max(m, Math.abs(v));
	return t.map((v) => v / m);
})();

const padNote = (freq: number, dur: number, attack = 0.5, release = 0.9) => {
	const out = mono(dur + release);
	let ph1 = rnd() * TABLE, ph2 = rnd() * TABLE, ph3 = rnd() * TABLE;
	const inc = (freq * TABLE) / SR;
	const d1 = Math.pow(2, 7 / 1200), d2 = Math.pow(2, -7 / 1200);
	for (let i = 0; i < out.length; i++) {
		const t = i / SR;
		const env = t < attack ? t / attack : t < dur ? 1 : Math.max(0, 1 - (t - dur) / release);
		const s =
			SAW[Math.floor(ph1)] + SAW[Math.floor(ph2)] * 0.8 + SAW[Math.floor(ph3)] * 0.8;
		out[i] = s * env * env * 0.33;
		ph1 = (ph1 + inc) % TABLE;
		ph2 = (ph2 + inc * d1) % TABLE;
		ph3 = (ph3 + inc * d2) % TABLE;
	}
	return out;
};

// FM 电钢琴音色
const epNote = (freq: number, decay = 4, len = 1.2, bright = 2.2) => {
	const out = mono(len);
	for (let i = 0; i < out.length; i++) {
		const t = i / SR;
		const idx = bright * Math.exp(-t * 9);
		const mod = Math.sin(TAU * freq * t) * idx;
		const tine = Math.sin(TAU * freq * 4.0 * t) * 0.16 * Math.exp(-t * 22);
		const env = Math.min(1, t / 0.003) * Math.exp(-t * decay) * (t > len - 0.05 ? (len - t) / 0.05 : 1);
		out[i] = (Math.sin(TAU * freq * t + mod) + tine) * env;
	}
	return out;
};

// FM 钟声
const bellNote = (freq: number, len = 3, decay = 2.2, ratio = 3.5) => {
	const out = mono(len);
	for (let i = 0; i < out.length; i++) {
		const t = i / SR;
		const idx = 2.6 * Math.exp(-t * 3);
		const env = Math.min(1, t / 0.002) * Math.exp(-t * decay);
		out[i] = Math.sin(TAU * freq * t + Math.sin(TAU * freq * ratio * t) * idx) * env;
	}
	return out;
};

const bassNote = (freq: number, dur: number) => {
	const out = mono(dur + 0.08);
	for (let i = 0; i < out.length; i++) {
		const t = i / SR;
		const env = Math.min(1, t / 0.008) * (0.6 + 0.4 * Math.exp(-t * 6)) * (t > dur ? Math.max(0, 1 - (t - dur) / 0.08) : 1);
		out[i] = (Math.sin(TAU * freq * t) + 0.35 * Math.sin(TAU * 2 * freq * t) + 0.12 * Math.sin(TAU * 3 * freq * t)) * env;
	}
	const lp = biquad('lp', 700);
	return out.map(lp);
};

const kick = () => {
	const out = mono(0.5);
	let ph = 0;
	for (let i = 0; i < out.length; i++) {
		const t = i / SR;
		const f = 54 + 80 * Math.exp(-t * 30);
		ph += (TAU * f) / SR;
		out[i] = Math.sin(ph) * Math.exp(-t * 10) + noise() * 0.3 * Math.exp(-t * 400);
	}
	return out;
};

const hat = (open = false) => {
	const out = mono(open ? 0.3 : 0.08);
	const hp = biquad('hp', 7500);
	for (let i = 0; i < out.length; i++) out[i] = hp(noise()) * Math.exp(-(i / SR) * (open ? 14 : 60));
	return out;
};

const clap = () => {
	const out = mono(0.35);
	const bp = biquad('bp', 1700, 0.8);
	for (let i = 0; i < out.length; i++) {
		const t = i / SR;
		const bursts = [0, 0.011, 0.022].reduce((a, o) => a + (t >= o ? Math.exp(-(t - o) * (o === 0.022 ? 16 : 120)) : 0), 0);
		out[i] = bp(noise()) * bursts * 0.9 + Math.sin(TAU * 190 * t) * Math.exp(-t * 35) * 0.25;
	}
	return out;
};

// ———————————————————— 编曲 ————————————————————

const sceneStart: Record<string, number> = {};
{
	let acc = 0;
	for (const s of SCENES) {
		sceneStart[s.id] = acc / FPS;
		acc += s.durationInFrames;
	}
}
const cue = (id: string, name: string) => {
	const s = SCENES.find((x) => x.id === id)!;
	if (!(name in s.cues)) throw new Error(`缺少 cue ${id}.${name}`);
	return sceneStart[id] + s.cues[name] / FPS;
};

const T = TOTAL_FRAMES / FPS;
const BPM = 96;
const BEAT = 60 / BPM;
const BAR = BEAT * 4;

const C = {
	freeze: cue('hook', 'freeze'),
	reveal: cue('hook', 'reveal'),
	game: sceneStart.game,
	loop: sceneStart.loop,
	train: sceneStart.train,
	detective: sceneStart.detective,
	understand: cue('detective', 'understand'),
	sample: sceneStart.sample,
	hallucinate: sceneStart.hallucinate,
	stamp: cue('hallucinate', 'stamp'),
	outro: sceneStart.outro,
	field: cue('outro', 'field'),
	question: cue('outro', 'question'),
};

// 和弦：Fmaj7 → G → Em7 → Am7（王道进行），结尾落在 Cmaj9
const CHORDS = [
	{root: 41, notes: [53, 57, 60, 64]},
	{root: 43, notes: [55, 59, 62, 67]},
	{root: 40, notes: [52, 55, 59, 62]},
	{root: 45, notes: [57, 60, 64, 67]},
];
const FINAL = {root: 36, notes: [48, 55, 59, 62, 64]};
const finalBar = Math.ceil(C.question / BAR) + 2; // 结尾提问后再走 F、G 两小节，然后落到 C
const chordOf = (bar: number) => (bar >= finalBar ? FINAL : bar >= finalBar - 2 ? CHORDS[(bar - finalBar + 2) % 2] : CHORDS[bar % 4]);

// 各声部音量自动化：[时间(秒), 音量]，线性插值
type Auto = [number, number][];
const autoAt = (a: Auto, t: number) => {
	if (t <= a[0][0]) return a[0][1];
	for (let i = 1; i < a.length; i++) {
		if (t <= a[i][0]) {
			const [t0, v0] = a[i - 1];
			const [t1, v1] = a[i];
			return v0 + ((v1 - v0) * (t - t0)) / (t1 - t0 || 1);
		}
	}
	return a[a.length - 1][1];
};
const applyAuto = (s: Stereo, a: Auto) => {
	for (let i = 0; i < s.L.length; i++) {
		const g = autoAt(a, i / SR);
		s.L[i] *= g;
		s.R[i] *= g;
	}
	return s;
};
// 在 t 时刻用 fade 秒过渡到 v
const step = (t: number, v: number, fade = 1.2): Auto => [
	[t - fade / 2, NaN],
	[t + fade / 2, v],
];
const buildAuto = (initial: number, ...steps: Auto[]): Auto => {
	const out: Auto = [[0, initial]];
	for (const s of steps) {
		const prev = autoAt(out, s[0][0]);
		out.push([s[0][0], prev], s[1]);
	}
	return out;
};

const END = T - 0.05;
const AUTO = {
	pad: buildAuto(0, step(0.8, 1, 1.6), step(C.freeze, 0.3, 1.0), step(C.reveal, 1, 0.1), step(T - 3.5, 1, 0.1), step(END - 1.2, 0, 2.4)),
	bass: buildAuto(0, step(C.reveal, 0.8, 0.1), step(C.game, 1), step(C.detective, 0, 2), step(C.sample, 1, 2), step(C.question, 0.6, 2), step(END - 1.2, 0, 2.4)),
	arp8: buildAuto(0, step(1.0, 0.85, 2), step(C.freeze, 0, 1.0), step(C.game, 1, 1.5), step(C.loop, 0.55), step(C.train, 1), step(C.detective, 0.15, 2), step(C.sample, 1, 2), step(C.hallucinate, 0.8), step(C.question, 0, 2)),
	arp16: buildAuto(0, step(C.loop, 0.9), step(C.train, 0.35), step(C.detective, 0, 2), step(C.field, 0.8), step(C.question, 0, 2)),
	kick: buildAuto(0, step(C.game, 1, 0.2), step(C.detective, 0, 1), step(C.sample, 1, 0.2), step(C.question, 0, 0.6)),
	hat: buildAuto(0, step(C.game, 0.8), step(C.loop, 1), step(C.detective, 0, 1.5), step(C.sample, 0.9, 0.5), step(C.question, 0, 1)),
	clap: buildAuto(0, step(C.train, 1, 0.3), step(C.detective, 0, 1), step(C.hallucinate, 0.8, 0.5), step(C.question, 0, 1)),
	drone: buildAuto(0, step(C.detective + 0.5, 1, 3), step(C.sample, 0, 2.5)),
	bells: buildAuto(0, step(C.detective + 1, 1, 2), step(C.sample, 0, 2), step(C.question, 1, 1), step(END - 1, 0, 2)),
	padCutoff: buildAuto(900, step(C.reveal, 1700, 0.2), step(C.game, 2000), step(C.detective, 900, 2.5), step(C.understand, 2600, 2.5), step(C.sample, 2000, 2), step(C.question, 1400, 2)),
};

const makeMusic = (): Stereo => {
	const bars = Math.ceil(T / BAR) + 1;
	const len = T;

	// 底鼓的包络用来做"侧链"压缩，让垫音跟着鼓点呼吸
	const kickTimes: number[] = [];
	for (let b = 0; b < bars; b++) for (const beat of [0, 2]) kickTimes.push(b * BAR + beat * BEAT);
	const kickEnv = new Float32Array(Math.ceil(len * SR));
	for (const kt of kickTimes) {
		const o = Math.round(kt * SR);
		for (let i = 0; i < 0.4 * SR && o + i < kickEnv.length; i++) kickEnv[o + i] = Math.max(kickEnv[o + i], Math.exp(-(i / SR) * 9));
	}
	const pump = (t: number) => 1 - 0.35 * kickEnv[Math.min(kickEnv.length - 1, Math.floor(t * SR))] * autoAt(AUTO.kick, t);

	// 垫音
	const pad = stereo(len);
	for (let b = 0; b < bars; b++) {
		const ch = chordOf(b);
		const start = b * BAR;
		if (start >= len) break;
		const held = b === finalBar;
		if (b > finalBar) continue;
		const dur = held ? len - start + 1 : BAR;
		ch.notes.forEach((n, i) => {
			const note = padNote(mtof(n), dur, held ? 0.9 : 0.5, held ? 2.5 : 0.9);
			addMono(pad, note, start, 0.11, i % 2 ? 0.35 : -0.35);
		});
	}
	// 随段落开合的低通
	{
		let yl = 0, yr = 0, yl2 = 0, yr2 = 0;
		const hpL = biquad('hp', 160);
		const hpR = biquad('hp', 160);
		for (let i = 0; i < pad.L.length; i++) {
			const t = i / SR;
			const a = Math.exp((-TAU * autoAt(AUTO.padCutoff, t)) / SR);
			yl = (1 - a) * pad.L[i] + a * yl;
			yr = (1 - a) * pad.R[i] + a * yr;
			yl2 = (1 - a) * yl + a * yl2;
			yr2 = (1 - a) * yr + a * yr2;
			const p = pump(t);
			pad.L[i] = hpL(yl2) * p;
			pad.R[i] = hpR(yr2) * p;
		}
	}
	applyAuto(pad, AUTO.pad);

	// 贝斯
	const bass = stereo(len);
	const bassPattern: [number, number][] = [
		[0, 1.25],
		[1.5, 0.45],
		[2, 1.25],
		[3.5, 0.4],
	];
	for (let b = 0; b < bars; b++) {
		const ch = chordOf(b);
		if (b >= finalBar) {
			if (b === finalBar) addMono(bass, bassNote(mtof(ch.root), len - b * BAR), b * BAR, 0.15);
			continue;
		}
		for (const [beat, d] of bassPattern) addMono(bass, bassNote(mtof(ch.root), d * BEAT), b * BAR + beat * BEAT, 0.15);
	}
	for (let i = 0; i < bass.L.length; i++) {
		const p = pump(i / SR);
		bass.L[i] *= p;
		bass.R[i] *= p;
	}
	applyAuto(bass, AUTO.bass);

	// 琶音（八分音符 + 十六分音符两层）
	const arp8 = stereo(len);
	const arp16 = stereo(len);
	const pat8 = [0, 1, 2, 3, 1, 2, 3, 2];
	for (let b = 0; b < Math.min(bars, finalBar); b++) {
		const ch = chordOf(b);
		for (let k = 0; k < 8; k++) {
			const n = ch.notes[pat8[k]] + 12;
			addMono(arp8, epNote(mtof(n)), b * BAR + k * (BEAT / 2), 0.17 * (k % 2 ? 0.75 : 1), k % 2 ? 0.3 : -0.3);
		}
		for (let k = 0; k < 16; k++) {
			const n = ch.notes[k % 4] + 24;
			addMono(arp16, epNote(mtof(n), 7, 0.6, 1.4), b * BAR + k * (BEAT / 4), 0.09 * (k % 4 === 0 ? 1 : 0.7), ((k % 4) - 1.5) / 3);
		}
	}
	applyAuto(arp8, AUTO.arp8);
	applyAuto(arp16, AUTO.arp16);
	const arps = stereo(len);
	mixInto(arps, arp8);
	mixInto(arps, arp16);
	mixInto(arps, pingPong(arps, BEAT * 0.75, 0.35, 0.3));

	// 鼓
	const drums = stereo(len);
	const K = kick();
	const H = hat();
	const HO = hat(true);
	const CL = clap();
	const kg = (t: number) => autoAt(AUTO.kick, t);
	const hg = (t: number) => autoAt(AUTO.hat, t);
	const cg = (t: number) => autoAt(AUTO.clap, t);
	for (let b = 0; b < bars; b++) {
		for (const beat of [0, 2]) {
			const t = b * BAR + beat * BEAT;
			if (kg(t) > 0) addMono(drums, K, t, 0.18 * kg(t));
		}
		if (b % 2 === 1) {
			const t = b * BAR + 3.5 * BEAT;
			if (kg(t) > 0) addMono(drums, K, t, 0.18 * kg(t));
		}
		for (let s = 0; s < 16; s++) {
			const t = b * BAR + s * (BEAT / 4);
			const g = hg(t);
			if (g <= 0) continue;
			if (s % 4 === 2) addMono(drums, s === 14 && b % 4 === 3 ? HO : H, t, 0.2 * g, 0.25);
			else if (s % 2 === 1) addMono(drums, H, t, 0.07 * g, 0.25);
		}
		for (const beat of [1, 3]) {
			const t = b * BAR + beat * BEAT;
			if (cg(t) > 0) addMono(drums, CL, t, 0.26 * cg(t), -0.1);
		}
	}

	// 悬疑段：低音持续音
	const drone = stereo(len);
	{
		const a0 = Math.floor(C.detective * SR) - SR * 2;
		const a1 = Math.min(drone.L.length, Math.floor(C.sample * SR) + SR * 3);
		for (let i = Math.max(0, a0); i < a1; i++) {
			const t = i / SR;
			const trem = 0.75 + 0.25 * Math.sin(TAU * 0.18 * t);
			const v = (Math.sin(TAU * 55 * t) * 0.6 + Math.sin(TAU * 82.41 * t) * 0.3 + Math.sin(TAU * 110 * t) * 0.15) * trem * 0.1;
			drone.L[i] = v;
			drone.R[i] = v;
		}
		applyAuto(drone, AUTO.drone);
	}

	// 钟声点缀：悬疑段 + 结尾
	const bells = stereo(len);
	{
		const motif = [76, 71, 69, 74, 72, 67, 76, 79];
		let k = 0;
		for (let t = C.detective + 1.2; t < C.sample; t += BEAT * 3) addMono(bells, bellNote(mtof(motif[k++ % motif.length])), t, 0.09, k % 2 ? 0.5 : -0.5);
		const outro = [72, 76, 79, 84, 79, 76];
		k = 0;
		for (let t = C.question + 0.4; t < T - 1.5; t += BEAT * 2) addMono(bells, bellNote(mtof(outro[k++ % outro.length]), 3.5, 1.6, 2), t, 0.05, k % 2 ? 0.4 : -0.4);
		applyAuto(bells, AUTO.bells);
	}

	// 混音
	const bus = stereo(len);
	mixInto(bus, pad, 1);
	mixInto(bus, bass, 1);
	mixInto(bus, arps, 1);
	mixInto(bus, drums, 1);
	mixInto(bus, drone, 1);
	mixInto(bus, bells, 1);
	const send = stereo(len);
	mixInto(send, pad, 0.5);
	mixInto(send, arps, 0.6);
	mixInto(send, bells, 1);
	mixInto(send, drums, 0.15);
	mixInto(bus, reverb(send, 0.86, 0.35, 0.9));

	// 响度：RMS 约 -19 dBFS，柔和限幅
	let sum = 0;
	for (let i = 0; i < bus.L.length; i++) sum += bus.L[i] * bus.L[i] + bus.R[i] * bus.R[i];
	const rms = Math.sqrt(sum / (bus.L.length * 2));
	const g = Math.pow(10, -19 / 20) / rms;
	for (let i = 0; i < bus.L.length; i++) {
		bus.L[i] = Math.tanh(bus.L[i] * g * 1.1) / 1.1;
		bus.R[i] = Math.tanh(bus.R[i] * g * 1.1) / 1.1;
	}
	// 首尾防爆音
	const fadeIn = Math.floor(0.02 * SR);
	for (let i = 0; i < fadeIn; i++) {
		bus.L[i] *= i / fadeIn;
		bus.R[i] *= i / fadeIn;
	}
	return bus;
};

// ———————————————————— 音效 ————————————————————

const tickSound = (pitch = 2400, amp = 1) => {
	const out = mono(0.03);
	const hp = biquad('hp', 2500);
	for (let i = 0; i < out.length; i++) {
		const t = i / SR;
		out[i] = (hp(noise()) * Math.exp(-t * 420) * 0.8 + Math.sin(TAU * pitch * t) * Math.exp(-t * 260) * 0.35) * amp;
	}
	return out;
};

const woodTick = (pitch = 1700) => {
	const out = mono(0.04);
	const hp = biquad('hp', 1500);
	for (let i = 0; i < out.length; i++) {
		const t = i / SR;
		out[i] = Math.sin(TAU * pitch * t) * Math.exp(-t * 320) * 0.8 + hp(noise()) * Math.exp(-t * 500) * 0.5;
	}
	return out;
};

const SFX: Record<string, () => Stereo> = {
	// 单个打字声
	tick: () => peakNormalize(toStereo(tickSound()), 0.22),
	// 连续打字（约 12 字/秒，按需截断使用）
	typing: () => {
		const s = stereo(8);
		for (let t = 0.01; t < 7.9; t += (1 / 12) * (0.75 + rnd() * 0.5)) addMono(s, tickSound(2000 + rnd() * 900, 0.6 + rnd() * 0.4), t, 1, (rnd() - 0.5) * 0.4);
		return peakNormalize(s, 0.2);
	},
	// 逐字生成时每个字落下
	blip: () => {
		const out = mono(0.12);
		for (let i = 0; i < out.length; i++) {
			const t = i / SR;
			const f = 900 + 500 * Math.min(1, t / 0.02);
			out[i] = (Math.sin(TAU * f * t) + 0.2 * Math.sin(TAU * 2 * f * t)) * Math.min(1, t / 0.002) * Math.exp(-t * 38);
		}
		return peakNormalize(toStereo(out), 0.28);
	},
	// 元素弹出
	pop: () => {
		const out = mono(0.16);
		let ph = 0;
		for (let i = 0; i < out.length; i++) {
			const t = i / SR;
			const f = 480 + 320 * Math.min(1, t / 0.025);
			ph += (TAU * f) / SR;
			out[i] = Math.sin(ph) * Math.min(1, t / 0.002) * Math.exp(-t * 26) + noise() * Math.exp(-t * 600) * 0.15;
		}
		return peakNormalize(toStereo(out), 0.32);
	},
	// 转场
	whoosh: () => {
		const len = 0.75;
		const src = mono(len);
		for (let i = 0; i < src.length; i++) src[i] = noise();
		const f = sweepFilter(src, 'bp', (t) => 300 * Math.pow(10, Math.sin((Math.PI * t) / len) * 1.0), 1.1);
		const s = stereo(len);
		for (let i = 0; i < f.length; i++) {
			const t = i / SR;
			const env = Math.pow(Math.sin((Math.PI * t) / len), 2);
			const [gl, gr] = panGains(-0.6 + (1.2 * t) / len);
			s.L[i] = f[i] * env * gl;
			s.R[i] = f[i] * env * gr;
		}
		return peakNormalize(s, 0.3);
	},
	// 开场定格前的渐强
	riser: () => {
		const len = 3;
		const src = mono(len);
		for (let i = 0; i < src.length; i++) src[i] = noise();
		const f = sweepFilter(src, 'bp', (t) => 250 * Math.pow(22, t / len), 1.4);
		const out = mono(len);
		let ph = 0;
		for (let i = 0; i < out.length; i++) {
			const t = i / SR;
			const p = t / len;
			ph += (TAU * (180 * Math.pow(6, p) * (1 + 0.01 * Math.sin(TAU * 6 * t)))) / SR;
			out[i] = (f[i] * 0.9 + Math.sin(ph) * 0.18) * p * p;
		}
		const s = toStereo(out);
		mixInto(s, reverb(s, 0.7, 0.3, 0.4));
		return peakNormalize(s, 0.3);
	},
	// 揭晓重音
	impact: () => {
		const len = 3;
		const out = mono(len);
		let ph = 0;
		const bp = biquad('bp', 2200, 0.7);
		for (let i = 0; i < out.length; i++) {
			const t = i / SR;
			ph += (TAU * (32 + 50 * Math.exp(-t * 6))) / SR;
			const shimmer = [72, 76, 79, 84].reduce((a, n) => a + Math.sin(TAU * mtof(n) * t), 0) * 0.03 * Math.exp(-t * 1.4) * Math.min(1, t / 0.01);
			out[i] = Math.sin(ph) * Math.exp(-t * 2.2) * 0.9 + bp(noise()) * Math.exp(-t * 28) * 0.5 + shimmer;
		}
		const s = toStereo(out);
		mixInto(s, reverb(s, 0.88, 0.3, 0.6));
		return peakNormalize(s, 0.75);
	},
	// 猜错
	error: () => {
		const out = mono(0.42);
		const lp = biquad('lp', 2200);
		for (let i = 0; i < out.length; i++) {
			const t = i / SR;
			const [f, t0, t1] = t < 0.15 ? [330, 0, 0.14] : [262, 0.17, 0.4];
			if (t < t0 || t > t1) continue;
			const tt = t - t0;
			const env = Math.min(1, tt / 0.005) * Math.exp(-tt * 6) * Math.min(1, (t1 - t) / 0.02);
			out[i] = lp((Math.sin(TAU * f * tt) + Math.sin(TAU * 3 * f * tt) / 3 + Math.sin(TAU * 5 * f * tt) / 5) * env);
		}
		return peakNormalize(toStereo(out), 0.24);
	},
	// 猜对 / 选中
	ding: () => {
		const a = bellNote(mtof(84), 1.6, 3.2, 2);
		const b = bellNote(mtof(91), 1.6, 3.6, 2);
		const s = stereo(1.6);
		addMono(s, a, 0, 1, -0.2);
		addMono(s, b, 0.06, 0.6, 0.2);
		mixInto(s, reverb(s, 0.8, 0.3, 0.5));
		return peakNormalize(s, 0.26);
	},
	// 拧旋钮
	ratchet: () => {
		const s = stereo(0.7);
		for (let k = 0; k < 9; k++) addMono(s, woodTick(2600 + rnd() * 400), k * 0.055 + rnd() * 0.01, 0.6 + rnd() * 0.4, (rnd() - 0.5) * 0.8);
		return peakNormalize(s, 0.22);
	},
	// 盖章
	stamp: () => {
		const out = mono(0.6);
		let ph = 0;
		const lp = biquad('lp', 900);
		const hp = biquad('hp', 2500);
		for (let i = 0; i < out.length; i++) {
			const t = i / SR;
			ph += (TAU * (45 + 70 * Math.exp(-t * 30))) / SR;
			out[i] = Math.sin(ph) * Math.exp(-t * 13) * 0.8 + lp(noise()) * Math.exp(-t * 22) * 0.6 + hp(noise()) * Math.exp(-t * 90) * 0.25;
		}
		return peakNormalize(toStereo(out), 0.6);
	},
	// 转盘（与画面的 ease-out 转速一致）
	spin: () => {
		const D = 46 / FPS;
		const s = stereo(D + 0.2);
		let last = 0;
		for (let i = 0; i < D * SR; i += 32) {
			const t = i / SR;
			const rot = 900 * (1 - Math.pow(1 - t / D, 3));
			if (Math.floor(rot / 24) > last) {
				last = Math.floor(rot / 24);
				addMono(s, woodTick(1500 + rnd() * 300), t, 0.8, (rnd() - 0.5) * 0.3);
			}
		}
		return peakNormalize(s, 0.22);
	},
	// 计数器飞速滚动
	count: () => {
		const D = 70 / FPS;
		const s = stereo(D + 0.1);
		let last = 0;
		for (let i = 0; i < D * SR; i += 16) {
			const p = i / SR / D;
			const e = p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
			if (Math.floor(e * 45) > last) {
				last = Math.floor(e * 45);
				addMono(s, tickSound(3200 + rnd() * 500, 0.8), i / SR, 1, (rnd() - 0.5) * 0.5);
			}
		}
		return peakNormalize(s, 0.18);
	},
	// 揭示 / 收尾
	chime: () => {
		const s = stereo(3);
		[72, 76, 79, 84].forEach((n, i) => addMono(s, bellNote(mtof(n), 2.6, 2.4, 2), i * 0.09, 0.5, -0.4 + i * 0.27));
		mixInto(s, reverb(s, 0.88, 0.25, 0.7));
		return peakNormalize(s, 0.3);
	},
	// 温度旋钮：向上 / 向下滑
	slideUp: () => peakNormalize(toStereo(glide(280, 900)), 0.16),
	slideDown: () => peakNormalize(toStereo(glide(900, 280)), 0.16),
	// 翻书 / 纸张
	paper: () => {
		const len = 0.4;
		const src = mono(len);
		for (let i = 0; i < src.length; i++) src[i] = noise();
		const f = sweepFilter(src, 'bp', (t) => 1800 + 2500 * (t / len), 0.7);
		for (let i = 0; i < f.length; i++) {
			const t = i / SR;
			f[i] *= Math.min(1, t / 0.03) * Math.exp(-t * 9);
		}
		return peakNormalize(toStereo(f), 0.22);
	},
	// 渐起的空气声（冰山出现、最后提问）
	swell: () => {
		const len = 2.4;
		const src = mono(len);
		for (let i = 0; i < src.length; i++) src[i] = noise();
		const f = sweepFilter(src, 'lp', (t) => 400 + 3500 * Math.pow(t / len, 2), 0.8);
		const s = stereo(len);
		for (let i = 0; i < f.length; i++) {
			const t = i / SR;
			const env = Math.pow(t / len, 1.6) * Math.min(1, (len - t) / 0.25);
			s.L[i] = f[i] * env;
			s.R[i] = f[Math.max(0, i - 300)] * env;
		}
		mixInto(s, reverb(s, 0.8, 0.3, 0.5));
		return peakNormalize(s, 0.22);
	},
};

function glide(f0: number, f1: number) {
	const len = 0.55;
	const out = mono(len);
	let ph = 0;
	for (let i = 0; i < out.length; i++) {
		const t = i / SR;
		const p = t / len;
		ph += (TAU * f0 * Math.pow(f1 / f0, p)) / SR;
		out[i] = (Math.sin(ph) + 0.3 * Math.sin(ph * 2)) * Math.sin(Math.PI * p) * 0.8;
	}
	return out;
}

// ———————————————————— 输出 ————————————————————

mkdirSync('public/audio/sfx', {recursive: true});
for (const [name, make] of Object.entries(SFX)) writeWav(`public/audio/sfx/${name}.wav`, make());
console.log(`音效 ${Object.keys(SFX).length} 个 → public/audio/sfx/`);

const music = makeMusic();
writeWav('public/audio/music.wav', music);
execFileSync('npx', ['remotion', 'ffmpeg', '-y', '-loglevel', 'error', '-i', 'public/audio/music.wav', '-c:a', 'libmp3lame', '-b:a', '192k', 'public/audio/music.mp3'], {stdio: 'inherit'});
rmSync('public/audio/music.wav');
console.log(`配乐 ${T.toFixed(1)} 秒 → public/audio/music.mp3`);
