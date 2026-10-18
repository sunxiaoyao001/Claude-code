// 《囚徒困境》配乐和新增音效：node scripts/make-audio-pd.ts
// 配乐按 src/pd/timeline.ts 的节拍编排，改了时间轴之后重新运行即可。
//   public/audio/pd-music.mp3
//   public/audio/sfx/{clunk,hum,slam,heartbeat,glitch,braam,thud,lock,metal,cash,shimmer}.wav
import {execFileSync} from 'node:child_process';
import {mkdirSync, rmSync} from 'node:fs';
import {CUES, PD_TOTAL_SEC, sceneStartSec} from '../src/pd/timeline.ts';
import {
	SR,
	type Stereo,
	TAU,
	addMono,
	bassNote,
	bellNote,
	biquad,
	clap,
	epNote,
	hat,
	kick,
	mixInto,
	mono,
	mtof,
	noise,
	padNote,
	peakNormalize,
	pingPong,
	reverb,
	rnd,
	stereo,
	sweepFilter,
	toStereo,
	woodTick,
	writeWav,
} from './synth.ts';

// ———————————————————— 新音效 ————————————————————

const SFX: Record<string, () => Stereo> = {
	// 审讯灯"咔哒"开灯
	clunk: () => {
		const out = mono(0.6);
		const hp = biquad('hp', 3000);
		const bz = biquad('lp', 900);
		let ph = 0;
		for (let i = 0; i < out.length; i++) {
			const t = i / SR;
			ph += (TAU * (95 - 35 * Math.min(1, t / 0.1))) / SR;
			const click = hp(noise()) * Math.exp(-t * 500);
			const thump = Math.sin(ph) * Math.exp(-t * 22) * 0.9;
			const ring = (Math.sin(TAU * 1240 * t) + 0.6 * Math.sin(TAU * 2710 * t)) * Math.exp(-t * 18) * 0.12;
			const buzz = t > 0.02 && t < 0.2 ? bz(Math.sign(Math.sin(TAU * 120 * t))) * 0.18 * Math.exp(-(t - 0.02) * 14) : 0;
			out[i] = click + thump + ring + buzz;
		}
		const s = toStereo(out);
		mixInto(s, reverb(s, 0.6, 0.4, 0.25));
		return peakNormalize(s, 0.55);
	},
	// 灯的电流声
	hum: () => {
		const len = 3.2;
		const out = mono(len);
		const lp = biquad('lp', 2200);
		for (let i = 0; i < out.length; i++) {
			const t = i / SR;
			const env = Math.min(1, t / 0.08) * Math.min(1, (len - t) / 0.3);
			const am = 0.85 + 0.15 * Math.sin(TAU * 7 * t);
			out[i] = (Math.sin(TAU * 100 * t) * 0.6 + Math.sin(TAU * 150 * t) * 0.3 + Math.sin(TAU * 200 * t) * 0.15 + lp(noise()) * 0.08) * env * am;
		}
		return peakNormalize(toStereo(out), 0.1);
	},
	// 文字砸下来的重击
	slam: () => {
		const out = mono(1.2);
		const bp = biquad('bp', 700, 0.6);
		let ph = 0;
		for (let i = 0; i < out.length; i++) {
			const t = i / SR;
			ph += (TAU * (40 + 40 * Math.exp(-t * 12))) / SR;
			out[i] = Math.sin(ph) * Math.exp(-t * 4.5) + bp(noise()) * Math.exp(-t * 16) * 0.7;
		}
		const s = toStereo(out);
		mixInto(s, reverb(s, 0.82, 0.3, 0.45));
		return peakNormalize(s, 0.65);
	},
	// 心跳（咚—咚）
	heartbeat: () => {
		const out = mono(0.5);
		const lp = biquad('lp', 160);
		for (let i = 0; i < out.length; i++) {
			const t = i / SR;
			const b1 = Math.sin(TAU * 58 * t) * Math.exp(-t * 20);
			const t2 = t - 0.17;
			const b2 = t2 > 0 ? Math.sin(TAU * 50 * t2) * Math.exp(-t2 * 16) * 0.75 : 0;
			out[i] = lp((b1 + b2) * 1.4);
		}
		return peakNormalize(toStereo(out), 0.7);
	},
	// 数字故障
	glitch: () => {
		const len = 0.45;
		const s = stereo(len);
		let t = 0;
		while (t < len - 0.03) {
			const d = 0.015 + rnd() * 0.045;
			const f = 180 + rnd() * 2200;
			const kind = rnd();
			const seg = mono(d);
			for (let i = 0; i < seg.length; i++) {
				const tt = i / SR;
				const v = kind < 0.4 ? Math.sign(Math.sin(TAU * f * tt)) : kind < 0.75 ? Math.round(noise() * 3) / 3 : Math.sin(TAU * f * tt * (1 + tt * 30));
				seg[i] = v * 0.6;
			}
			addMono(s, seg, t, 0.5 + rnd() * 0.5, rnd() * 2 - 1);
			t += d + (rnd() < 0.3 ? rnd() * 0.03 : 0);
		}
		return peakNormalize(s, 0.3);
	},
	// 电影感低音"嗡"
	braam: () => {
		const len = 2.2;
		const s = stereo(len);
		for (const [n, g] of [
			[33, 1],
			[45, 0.8],
			[52, 0.5],
			[57, 0.35],
		] as const) {
			for (const det of [-9, 0, 9]) {
				const f = mtof(n) * Math.pow(2, det / 1200);
				const v = mono(len);
				let ph = rnd();
				for (let i = 0; i < v.length; i++) {
					ph = (ph + f / SR) % 1;
					v[i] = (2 * ph - 1) * g;
				}
				const filt = sweepFilter(v, 'lp', (t) => 180 + 1400 * Math.exp(-t * 2.2) * Math.min(1, t / 0.04), 0.9);
				for (let i = 0; i < filt.length; i++) {
					const t = i / SR;
					filt[i] *= Math.min(1, t / 0.03) * Math.exp(-t * 1.3);
				}
				addMono(s, filt, 0, 0.25, det / 12);
			}
		}
		mixInto(s, reverb(s, 0.85, 0.35, 0.35));
		return peakNormalize(s, 0.6);
	},
	// 墙落地 / 方块堆叠
	thud: () => {
		const out = mono(0.5);
		const lp = biquad('lp', 450);
		for (let i = 0; i < out.length; i++) {
			const t = i / SR;
			out[i] = Math.sin(TAU * 68 * t) * Math.exp(-t * 14) + lp(noise()) * Math.exp(-t * 22) * 0.6;
		}
		return peakNormalize(toStereo(out), 0.5);
	},
	// 格子填进去时的"咔嗒"
	lock: () => {
		const s = stereo(0.35);
		addMono(s, woodTick(2300), 0, 1, -0.1);
		addMono(s, woodTick(1700), 0.045, 0.8, 0.1);
		const ping = mono(0.3);
		for (let i = 0; i < ping.length; i++) {
			const t = i / SR;
			ping[i] = Math.sin(TAU * 2400 * t) * Math.exp(-t * 22) * 0.35;
		}
		addMono(s, ping, 0.045);
		return peakNormalize(s, 0.32);
	},
	// 铁栏杆砸下
	metal: () => {
		const len = 2.4;
		const out = mono(len);
		const partials = [
			[187, 1.2, 0.5],
			[441, 1.8, 0.45],
			[812, 2.6, 0.35],
			[1323, 3.4, 0.25],
			[1907, 4.5, 0.18],
			[2734, 6, 0.12],
		];
		const bp = biquad('bp', 1500, 0.7);
		for (let i = 0; i < out.length; i++) {
			const t = i / SR;
			let v = 0;
			for (const [f, d, a] of partials) v += Math.sin(TAU * f * t + f) * Math.exp(-t * d) * a;
			v += bp(noise()) * Math.exp(-t * 30) * 0.8;
			v += Math.sin(TAU * 52 * t) * Math.exp(-t * 6) * 0.7;
			out[i] = v;
		}
		const s = toStereo(out);
		mixInto(s, reverb(s, 0.86, 0.3, 0.5));
		return peakNormalize(s, 0.7);
	},
	// 降价
	cash: () => {
		const out = mono(0.18);
		let ph = 0;
		for (let i = 0; i < out.length; i++) {
			const t = i / SR;
			ph += (TAU * (1250 - 550 * Math.min(1, t / 0.12))) / SR;
			out[i] = (Math.sin(ph) + 0.25 * Math.sin(ph * 2)) * Math.min(1, t / 0.002) * Math.exp(-t * 20);
		}
		return peakNormalize(toStereo(out), 0.28);
	},
	// 闪光
	shimmer: () => {
		const s = stereo(2.6);
		[84, 88, 91, 95, 98, 100].forEach((n, i) => addMono(s, bellNote(mtof(n), 2, 2.8, 2), i * 0.045, 0.4, -0.6 + i * 0.24));
		mixInto(s, reverb(s, 0.9, 0.2, 0.8));
		return peakNormalize(s, 0.3);
	},
};

// ———————————————————— 配乐 ————————————————————

const T = PD_TOTAL_SEC;
const at = (scene: Parameters<typeof sceneStartSec>[0], cue: number) => sceneStartSec(scene) + cue;
const M = {
	drop: at('hook', CUES.hook.drop),
	setup: sceneStartSec('setup'),
	matrix: sceneStartSec('matrix'),
	reason: at('matrix', CUES.matrix.head),
	concl: at('matrix', CUES.matrix.concl),
	slam: at('matrix', CUES.matrix.slam),
	title: sceneStartSec('title'),
	titleHit: at('title', CUES.title.t1),
	life: sceneStartSec('life'),
	way: sceneStartSec('way'),
	champ: at('way', CUES.way.champ),
	end: sceneStartSec('end'),
	resolve: at('end', CUES.end.l2b),
};

const BPM = 110;
const BEAT = 60 / BPM;
const BAR = BEAT * 4;
const G0 = M.drop; // 2.7 秒变红的那一下正好是第一小节的强拍

type Chord = {root: number; notes: number[]};
const CH: Record<string, Chord> = {
	Am: {root: 45, notes: [57, 60, 64, 69]},
	Am9: {root: 45, notes: [57, 60, 64, 71]},
	F: {root: 41, notes: [57, 60, 65, 69]},
	E: {root: 40, notes: [56, 59, 64, 68]},
	Dm: {root: 38, notes: [57, 62, 65, 69]},
	C: {root: 36, notes: [55, 60, 64, 67]},
	G: {root: 43, notes: [55, 59, 62, 67]},
	Cfin: {root: 36, notes: [55, 60, 64, 67, 72]},
};
const nBars = Math.ceil((T - G0) / BAR) + 1;
const barStart = (k: number) => G0 + k * BAR;
const endBar = Math.ceil((M.end - G0) / BAR);
const chordOf = (k: number): Chord => {
	const t = barStart(k);
	if (k >= endBar) return [CH.F, CH.G][k - endBar] ?? CH.Cfin;
	if (t >= M.way) return [CH.C, CH.G, CH.Am, CH.F][k % 4];
	if (t >= M.life) return [CH.Am, CH.F, CH.C, CH.G][k % 4];
	if (t >= M.title - 0.3) return CH.Am9;
	if (t >= M.slam - 0.1) return CH.Am;
	if (t >= M.reason) return [CH.Am, CH.F, CH.Dm, CH.E][k % 4];
	return [CH.Am, CH.Am, CH.F, CH.E][k % 4];
};
const finalBar = endBar + 2;

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
// 从一串 [时间, 目标值, 过渡秒数] 生成包络
const auto = (initial: number, ...steps: [number, number, number?][]): Auto => {
	const out: Auto = [[0, initial]];
	for (const [t, v, fade = 0.8] of steps) {
		out.push([t - fade / 2, autoAt(out, t - fade / 2)], [t + fade / 2, v]);
	}
	return out;
};
const applyAuto = (s: Stereo, a: Auto) => {
	for (let i = 0; i < s.L.length; i++) {
		const g = autoAt(a, i / SR);
		s.L[i] *= g;
		s.R[i] *= g;
	}
	return s;
};

const BREATH = M.slam - 0.4; // 铁栏落下前的静音
const END = T;
const A = {
	drone: auto(0, [0.25, 0.4, 0.5], [G0, 0.25, 0.3], [M.setup + 1, 0, 3], [M.slam, 0.45, 0.1], [M.title + 0.5, 0.25, 1.5], [M.life, 0, 1.5]),
	pad: auto(0, [G0, 0.65, 0.1], [M.matrix, 0.85], [BREATH, 0, 0.3], [M.slam, 1, 0.1], [M.title - 0.3, 0, 0.4], [M.titleHit, 1, 0.6], [M.life, 0.75], [M.way, 1], [END - 1.2, 0, 2.2]),
	cutoff: auto(1000, [M.matrix, 1100, 2], [M.reason, 1100, 1], [M.concl, 2400, 6], [M.slam, 850, 0.2], [M.titleHit, 1500, 1.5], [M.life, 1900, 1], [M.way, 2700, 2], [M.end, 2300, 2]),
	pulse: auto(0, [G0, 0.8, 0.1], [M.reason, 1], [BREATH, 0, 0.25], [M.slam + 1, 0, 0.1]),
	groove: auto(0, [M.life, 1, 0.3], [M.way, 0.8, 1], [M.end, 0, 1.5]),
	hold: auto(0, [M.end + 1, 0.7, 2], [END - 1, 0, 2]),
	clock: auto(0, [0.3, 0.5, 0.2], [G0, 0.8, 0.1], [M.reason, 0.4], [BREATH, 0, 0.2]),
	kick: auto(0, [M.matrix, 0.6, 0.3], [M.reason, 1, 0.3], [BREATH, 0, 0.15], [M.life, 1, 0.2], [M.way, 0.7, 0.5], [M.end, 0, 1]),
	hats: auto(0, [M.reason, 0.7, 0.5], [M.concl, 1, 1], [BREATH, 0, 0.15], [M.life, 1, 0.2], [M.way, 0.7, 0.5], [M.end, 0, 1]),
	clap: auto(0, [M.reason + 4, 0.8, 0.5], [BREATH, 0, 0.15], [M.life, 1, 0.2], [M.way, 0.6, 0.5], [M.end, 0, 1]),
	arp8: auto(0, [M.matrix, 0.6, 1], [M.reason, 0.9], [BREATH, 0, 0.2], [M.life, 0.9, 0.3], [M.way, 1, 0.5], [M.end + 2, 0.5, 2], [END - 2, 0, 2]),
	arp16: auto(0, [M.concl, 0.8, 3], [BREATH, 0, 0.2], [M.way + 2, 0.7, 2], [M.end, 0, 2]),
	bells: auto(0, [M.titleHit, 1, 0.3], [M.life, 0, 1], [M.champ, 0.9, 1], [END - 0.5, 0, 1]),
};

const makeMusic = (): Stereo => {
	const len = T;

	const kickTimes: number[] = [];
	const K = kick();
	const H = hat();
	const HO = hat(true);
	const CL = clap();
	const drums = stereo(len);
	for (let t = G0 - BEAT; t > 0; t -= BEAT) {
		const ck = autoAt(A.clock, t);
		if (ck > 0) addMono(drums, woodTick(1700), t, 0.32 * ck, 0.3);
	}
	for (let k = 0; k < nBars; k++) {
		const b = barStart(k);
		for (let beat = 0; beat < 4; beat++) {
			const t = b + beat * BEAT;
			const kg = autoAt(A.kick, t);
			const four = t >= M.reason && t < M.slam; // 推演段：四拍底鼓
			const groove = t >= M.life;
			const hit = four ? true : groove ? beat === 0 || beat === 2 : beat === 0;
			if (kg > 0 && hit) {
				addMono(drums, K, t, 0.36 * kg);
				kickTimes.push(t);
			}
			if (groove && beat === 2 && kg > 0) addMono(drums, K, t + BEAT * 0.5, 0.22 * kg);
			const cg = autoAt(A.clap, t);
			if (cg > 0 && (beat === 1 || beat === 3)) addMono(drums, CL, t, 0.28 * cg, -0.1);
			// 时钟滴答（四分音符）
			const ck = autoAt(A.clock, t);
			if (ck > 0) addMono(drums, woodTick(beat === 0 ? 2100 : 1700), t, 0.32 * ck, 0.3);
			for (let s = 0; s < 4; s++) {
				const ts = t + s * (BEAT / 4);
				const hg = autoAt(A.hats, ts);
				if (hg <= 0) continue;
				if (s === 2) addMono(drums, beat === 3 && k % 2 ? HO : H, ts, 0.18 * hg, 0.25);
				else addMono(drums, H, ts, 0.07 * hg, 0.25);
			}
		}
	}
	const kickEnv = new Float32Array(Math.ceil(len * SR));
	for (const kt of kickTimes) {
		const o = Math.round(kt * SR);
		for (let i = 0; i < 0.35 * SR && o + i < kickEnv.length; i++) kickEnv[o + i] = Math.max(kickEnv[o + i], Math.exp(-(i / SR) * 10));
	}
	const pump = (i: number) => 1 - 0.38 * kickEnv[Math.min(kickEnv.length - 1, i)];

	// 低音持续音（开场、陷阱之后、点题）
	const drone = stereo(len);
	for (let i = 0; i < drone.L.length; i++) {
		const t = i / SR;
		const v = (Math.sin(TAU * 55 * t) * 0.6 + Math.sin(TAU * 82.41 * t) * 0.25 + Math.sin(TAU * 110 * t + Math.sin(TAU * 0.3 * t)) * 0.12) * (0.8 + 0.2 * Math.sin(TAU * 0.25 * t)) * 0.3;
		drone.L[i] = v;
		drone.R[i] = v;
	}
	applyAuto(drone, A.drone);

	// 垫音
	const pad = stereo(len);
	for (let k = 0; k < nBars; k++) {
		if (k > finalBar) break;
		const ch = chordOf(k);
		const held = k === finalBar;
		const dur = held ? len - barStart(k) + 1 : BAR;
		ch.notes.forEach((n, i) => addMono(pad, padNote(mtof(n), dur, held ? 1 : 0.35, held ? 2 : 0.7), barStart(k), 0.1, i % 2 ? 0.4 : -0.4));
	}
	{
		let yl = 0, yr = 0, yl2 = 0, yr2 = 0;
		const hpL = biquad('hp', 150);
		const hpR = biquad('hp', 150);
		for (let i = 0; i < pad.L.length; i++) {
			const a = Math.exp((-TAU * autoAt(A.cutoff, i / SR)) / SR);
			yl = (1 - a) * pad.L[i] + a * yl;
			yr = (1 - a) * pad.R[i] + a * yr;
			yl2 = (1 - a) * yl + a * yl2;
			yr2 = (1 - a) * yr + a * yr2;
			pad.L[i] = hpL(yl2) * pump(i);
			pad.R[i] = hpR(yr2) * pump(i);
		}
	}
	applyAuto(pad, A.pad);

	// 贝斯：紧张段是八分音符的"脉搏"，律动段是切分，结尾长音
	const pulse = stereo(len);
	const groove = stereo(len);
	const hold = stereo(len);
	for (let k = 0; k < nBars; k++) {
		const ch = chordOf(k);
		const b = barStart(k);
		for (let e = 0; e < 8; e++) addMono(pulse, bassNote(mtof(ch.root), BEAT * 0.38), b + e * (BEAT / 2), e % 2 ? 0.08 : 0.11);
		for (const [beat, d] of [
			[0, 1.25],
			[1.5, 0.45],
			[2, 1.25],
			[3.5, 0.4],
		] as const)
			addMono(groove, bassNote(mtof(ch.root), d * BEAT), b + beat * BEAT, 0.16);
		if (k >= endBar && k <= finalBar) addMono(hold, bassNote(mtof(ch.root), k === finalBar ? len - b : BAR), b, 0.16);
	}
	for (const s of [pulse, groove]) {
		for (let i = 0; i < s.L.length; i++) {
			s.L[i] *= pump(i);
			s.R[i] *= pump(i);
		}
	}
	applyAuto(pulse, A.pulse);
	applyAuto(groove, A.groove);
	applyAuto(hold, A.hold);

	// 琶音
	const arp8 = stereo(len);
	const arp16 = stereo(len);
	const pat8 = [0, 2, 1, 3, 2, 1, 3, 2];
	for (let k = 0; k < Math.min(nBars, finalBar + 1); k++) {
		const ch = chordOf(k);
		const b = barStart(k);
		for (let e = 0; e < 8; e++) addMono(arp8, epNote(mtof(ch.notes[pat8[e]] + 12), 4.5, 0.9, 2), b + e * (BEAT / 2), 0.15 * (e % 2 ? 0.75 : 1), e % 2 ? 0.35 : -0.35);
		for (let s = 0; s < 16; s++) addMono(arp16, epNote(mtof(ch.notes[s % 4] + 24), 8, 0.5, 1.3), b + s * (BEAT / 4), 0.07 * (s % 4 ? 0.7 : 1), ((s % 4) - 1.5) / 3);
	}
	applyAuto(arp8, A.arp8);
	applyAuto(arp16, A.arp16);
	const arps = stereo(len);
	mixInto(arps, arp8);
	mixInto(arps, arp16);
	mixInto(arps, pingPong(arps, BEAT * 0.75, 0.32, 0.28));

	// 钟声：点题、出路、结尾
	const bells = stereo(len);
	{
		const notes = [76, 72, 69, 71];
		notes.forEach((n, i) => addMono(bells, bellNote(mtof(n), 3), M.titleHit + 0.6 + i * BEAT * 2, 0.08, i % 2 ? 0.4 : -0.4));
		const hope = [79, 76, 72, 74, 76, 79, 84, 79];
		let i = 0;
		for (let t = M.champ + 0.3; t < END - 1.5; t += BEAT * 2) addMono(bells, bellNote(mtof(hope[i++ % hope.length]), 3, 2, 2), t, 0.06, i % 2 ? 0.45 : -0.45);
		applyAuto(bells, A.bells);
	}

	const bus = stereo(len);
	for (const s of [drone, pad, pulse, groove, hold, arps, drums, bells]) mixInto(bus, s);
	const send = stereo(len);
	mixInto(send, pad, 0.5);
	mixInto(send, arps, 0.55);
	mixInto(send, bells, 1);
	mixInto(send, drums, 0.12);
	mixInto(bus, reverb(send, 0.86, 0.35, 0.85));

	// 纯配乐视频，响度比上一个视频高一点：RMS 约 -17 dBFS
	let sum = 0;
	for (let i = 0; i < bus.L.length; i++) sum += bus.L[i] * bus.L[i] + bus.R[i] * bus.R[i];
	const g = Math.pow(10, -17 / 20) / Math.sqrt(sum / (bus.L.length * 2));
	for (let i = 0; i < bus.L.length; i++) {
		bus.L[i] = Math.tanh(bus.L[i] * g * 1.15) / 1.15;
		bus.R[i] = Math.tanh(bus.R[i] * g * 1.15) / 1.15;
	}
	const tail = Math.floor(0.4 * SR);
	for (let i = 0; i < tail; i++) {
		const j = bus.L.length - 1 - i;
		bus.L[j] *= i / tail;
		bus.R[j] *= i / tail;
	}
	return bus;
};

mkdirSync('public/audio/sfx', {recursive: true});
for (const [name, make] of Object.entries(SFX)) writeWav(`public/audio/sfx/${name}.wav`, make());
console.log(`新增音效 ${Object.keys(SFX).length} 个 → public/audio/sfx/`);

const music = makeMusic();
writeWav('public/audio/pd-music.wav', music);
execFileSync('npx', ['remotion', 'ffmpeg', '-y', '-loglevel', 'error', '-i', 'public/audio/pd-music.wav', '-c:a', 'libmp3lame', '-b:a', '192k', 'public/audio/pd-music.mp3'], {stdio: 'inherit'});
rmSync('public/audio/pd-music.wav');
console.log(`配乐 ${T.toFixed(1)} 秒 → public/audio/pd-music.mp3`);
