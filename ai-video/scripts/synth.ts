// 音频合成小工具：振荡器、滤波器、混响、乐器、音效。
// 被 make-audio.ts（AI 猜字）和 make-audio-pd.ts（囚徒困境）共用。
import {writeFileSync} from 'node:fs';

export const SR = 44100;
export const TAU = Math.PI * 2;
const FPS = 30;

// ———————————————————— 基础工具 ————————————————————

let seed = 20261018;
export const rnd = () => {
	seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
	return seed / 4294967296;
};
export const noise = () => rnd() * 2 - 1;
export const mtof = (n: number) => 440 * Math.pow(2, (n - 69) / 12);
export const clamp = (x: number, a: number, b: number) => Math.min(b, Math.max(a, x));

export type Stereo = {L: Float32Array; R: Float32Array};
export const stereo = (sec: number): Stereo => ({L: new Float32Array(Math.ceil(sec * SR)), R: new Float32Array(Math.ceil(sec * SR))});
export const mono = (sec: number) => new Float32Array(Math.ceil(sec * SR));

// 等功率声像：pan -1（左）… 1（右）
export const panGains = (pan: number) => {
	const a = ((pan + 1) / 4) * Math.PI;
	return [Math.cos(a), Math.sin(a)] as const;
};

export const addMono = (dst: Stereo, src: Float32Array, at: number, gain = 1, pan = 0) => {
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
export const biquad = (type: 'lp' | 'hp' | 'bp', fc: number, q = 0.707) => {
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
export const sweepFilter = (src: Float32Array, type: 'lp' | 'hp' | 'bp', fcAt: (t: number) => number, q = 0.9) => {
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
export const reverb = (input: Stereo, room = 0.84, damp = 0.3, wet = 0.3): Stereo => {
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
export const pingPong = (input: Stereo, delaySec: number, feedback: number, wet: number): Stereo => {
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

export const mixInto = (dst: Stereo, src: Stereo, gain = 1) => {
	for (let i = 0; i < dst.L.length && i < src.L.length; i++) {
		dst.L[i] += src.L[i] * gain;
		dst.R[i] += src.R[i] * gain;
	}
};

export const writeWav = (path: string, s: Stereo) => {
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

export const peakNormalize = (s: Stereo, peak: number) => {
	let m = 1e-9;
	for (let i = 0; i < s.L.length; i++) m = Math.max(m, Math.abs(s.L[i]), Math.abs(s.R[i]));
	const g = peak / m;
	for (let i = 0; i < s.L.length; i++) {
		s.L[i] *= g;
		s.R[i] *= g;
	}
	return s;
};

export const toStereo = (m: Float32Array, pan = 0): Stereo => {
	const s = {L: new Float32Array(m.length), R: new Float32Array(m.length)};
	addMono(s, m, 0, 1, pan);
	return s;
};

// ———————————————————— 乐器 ————————————————————

// 带限锯齿波表（谐波按 1/n^1.3 衰减，听起来比纯锯齿更暖）
export const TABLE = 4096;
export const SAW = (() => {
	const t = new Float32Array(TABLE + 1);
	for (let h = 1; h <= 20; h++) for (let i = 0; i <= TABLE; i++) t[i] += Math.sin((TAU * h * i) / TABLE) / Math.pow(h, 1.3);
	let m = 0;
	for (const v of t) m = Math.max(m, Math.abs(v));
	return t.map((v) => v / m);
})();

export const padNote = (freq: number, dur: number, attack = 0.5, release = 0.9) => {
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
export const epNote = (freq: number, decay = 4, len = 1.2, bright = 2.2) => {
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
export const bellNote = (freq: number, len = 3, decay = 2.2, ratio = 3.5) => {
	const out = mono(len);
	for (let i = 0; i < out.length; i++) {
		const t = i / SR;
		const idx = 2.6 * Math.exp(-t * 3);
		const env = Math.min(1, t / 0.002) * Math.exp(-t * decay);
		out[i] = Math.sin(TAU * freq * t + Math.sin(TAU * freq * ratio * t) * idx) * env;
	}
	return out;
};

export const bassNote = (freq: number, dur: number) => {
	const out = mono(dur + 0.08);
	for (let i = 0; i < out.length; i++) {
		const t = i / SR;
		const env = Math.min(1, t / 0.008) * (0.6 + 0.4 * Math.exp(-t * 6)) * (t > dur ? Math.max(0, 1 - (t - dur) / 0.08) : 1);
		out[i] = (Math.sin(TAU * freq * t) + 0.35 * Math.sin(TAU * 2 * freq * t) + 0.12 * Math.sin(TAU * 3 * freq * t)) * env;
	}
	const lp = biquad('lp', 700);
	return out.map(lp);
};

export const kick = () => {
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

export const hat = (open = false) => {
	const out = mono(open ? 0.3 : 0.08);
	const hp = biquad('hp', 7500);
	for (let i = 0; i < out.length; i++) out[i] = hp(noise()) * Math.exp(-(i / SR) * (open ? 14 : 60));
	return out;
};

export const clap = () => {
	const out = mono(0.35);
	const bp = biquad('bp', 1700, 0.8);
	for (let i = 0; i < out.length; i++) {
		const t = i / SR;
		const bursts = [0, 0.011, 0.022].reduce((a, o) => a + (t >= o ? Math.exp(-(t - o) * (o === 0.022 ? 16 : 120)) : 0), 0);
		out[i] = bp(noise()) * bursts * 0.9 + Math.sin(TAU * 190 * t) * Math.exp(-t * 35) * 0.25;
	}
	return out;
};

// ———————————————————— 音效 ————————————————————

export const tickSound = (pitch = 2400, amp = 1) => {
	const out = mono(0.03);
	const hp = biquad('hp', 2500);
	for (let i = 0; i < out.length; i++) {
		const t = i / SR;
		out[i] = (hp(noise()) * Math.exp(-t * 420) * 0.8 + Math.sin(TAU * pitch * t) * Math.exp(-t * 260) * 0.35) * amp;
	}
	return out;
};

export const woodTick = (pitch = 1700) => {
	const out = mono(0.04);
	const hp = biquad('hp', 1500);
	for (let i = 0; i < out.length; i++) {
		const t = i / SR;
		out[i] = Math.sin(TAU * pitch * t) * Math.exp(-t * 320) * 0.8 + hp(noise()) * Math.exp(-t * 500) * 0.5;
	}
	return out;
};

export const SFX: Record<string, () => Stereo> = {
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

export function glide(f0: number, f1: number) {
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

