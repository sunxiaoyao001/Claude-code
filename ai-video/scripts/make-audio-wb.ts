// 《白熊效应》声音：node scripts/make-audio-wb.ts → public/audio/wb-mix.mp3
// 画面和声音共用 src/wb/score.ts。60 BPM、3/4 拍的圆舞曲：一小节 = 一屏。
// 白熊每出现一次，就是一声桌铃（实验里受试者每想到一次就按一下铃）——它是唯一会"唱"的东西。
// 拟音沿用印刷车间的材料声：铅字、裁纸刀、纸张、数字落位、橡皮章；倒计时是钟的滴答。
import {execFileSync} from 'node:child_process';
import {rmSync} from 'node:fs';
import {BEAT, DUR, E16, events, T, type Ev} from '../src/wb/score.ts';
import {SR, type Stereo, TAU, addMono, biquad, mixInto, mono, mtof, noise, padNote, reverb, stereo, sweepFilter, writeWav} from './synth.ts';

const env = (t: number, a: number, d: number) => Math.min(1, t / a) * Math.exp(-t / d);

// ———————————————— 拟音 ————————————————
const clack = () => {
	const out = mono(0.09);
	const hp = biquad('hp', 3000);
	const lp = biquad('lp', 1200);
	for (let i = 0; i < out.length; i++) {
		const t = i / SR;
		out[i] =
			hp(noise()) * env(t, 0.0003, 0.0018) * 0.9 +
			Math.sin(TAU * 3300 * t) * env(t, 0.0005, 0.035) * 0.22 +
			Math.sin(TAU * 5100 * t) * env(t, 0.0005, 0.022) * 0.14 +
			Math.sin(TAU * 190 * t) * env(t, 0.001, 0.03) * 0.35 +
			lp(noise()) * env(t, 0.0005, 0.018) * 0.3;
	}
	return out;
};
const tss = (dur: number) => {
	const len = dur + 0.06;
	const src = mono(len);
	for (let i = 0; i < src.length; i++) src[i] = noise();
	const f = sweepFilter(src, 'bp', (t) => 5200 + 2600 * (t / len), 0.9);
	for (let i = 0; i < f.length; i++) {
		const t = i / SR;
		f[i] *= Math.min(1, t / 0.015) * Math.min(1, Math.max(0, (len - t) / 0.05)) * 0.5;
	}
	return f;
};
const snick = () => {
	const len = 0.16;
	const src = mono(len);
	for (let i = 0; i < src.length; i++) src[i] = noise();
	const sw = sweepFilter(src, 'bp', (t) => 900 * Math.pow(7, Math.min(1, t / 0.05)), 1.4);
	const out = mono(len);
	for (let i = 0; i < out.length; i++) {
		const t = i / SR;
		out[i] =
			sw[i] * env(t, 0.002, 0.03) * 0.8 +
			(Math.sin(TAU * 2830 * t) + 0.7 * Math.sin(TAU * 4410 * t)) * env(t, 0.0008, 0.045) * 0.22 +
			Math.sin(TAU * 120 * t) * env(t, 0.001, 0.03) * 0.3;
	}
	return out;
};
const slap = () => {
	const out = mono(0.18);
	const lp = biquad('lp', 2800);
	for (let i = 0; i < out.length; i++) {
		const t = i / SR;
		out[i] = lp(noise()) * env(t, 0.0008, 0.05) * 0.9 + Math.sin(TAU * 90 * t) * env(t, 0.002, 0.06) * 0.5;
	}
	return out;
};
const slide = (dur: number) => {
	const len = dur + 0.08;
	const src = mono(len);
	for (let i = 0; i < src.length; i++) src[i] = noise();
	const f = sweepFilter(src, 'bp', (t) => 900 + 1400 * Math.sin((Math.PI * t) / len), 0.6);
	for (let i = 0; i < f.length; i++) f[i] *= Math.pow(Math.sin((Math.PI * i) / f.length), 1.5) * 0.45;
	return f;
};
const thunk = () => {
	const out = mono(0.14);
	let ph = 0;
	for (let i = 0; i < out.length; i++) {
		const t = i / SR;
		ph += (TAU * (150 + 90 * Math.exp(-t * 60))) / SR;
		out[i] =
			Math.sin(ph) * env(t, 0.001, 0.05) * 0.8 +
			Math.sin(TAU * 620 * t) * env(t, 0.0005, 0.03) * 0.45 +
			Math.sin(TAU * 1240 * t) * env(t, 0.0005, 0.012) * 0.2 +
			noise() * env(t, 0.0003, 0.0025) * 0.5;
	}
	return out;
};
const snapS = () => {
	const out = mono(0.07);
	const hp = biquad('hp', 2000);
	for (let i = 0; i < out.length; i++) {
		const t = i / SR;
		out[i] = hp(noise()) * env(t, 0.0003, 0.003) * 0.7 + Math.sin(TAU * 230 * t) * env(t, 0.001, 0.022) * 0.45;
	}
	return out;
};
const thump = () => {
	const out = mono(0.6);
	const lp = biquad('lp', 300);
	for (let i = 0; i < out.length; i++) {
		const t = i / SR;
		out[i] = Math.sin(TAU * 58 * t) * env(t, 0.004, 0.22) + lp(noise()) * env(t, 0.002, 0.05) * 0.4;
	}
	return out;
};
const stamp = () => {
	const out = mono(0.3);
	const lp = biquad('lp', 1800);
	const hit = (tt: number, g: number) => (tt < 0 ? 0 : (Math.sin(TAU * 85 * tt) * env(tt, 0.001, 0.09) + Math.sin(TAU * 420 * tt) * env(tt, 0.001, 0.03) * 0.5) * g);
	for (let i = 0; i < out.length; i++) {
		const t = i / SR;
		out[i] = hit(t, 1) + hit(t - 0.028, 0.25) + lp(noise()) * env(t, 0.0008, 0.04) * 0.6;
	}
	return out;
};
// 桌铃：G6 上的几个不谐和泛音，两个略微错开的基音让它"颤"一下
const bell = () => {
	const len = 1.8;
	const out = mono(len);
	const hp = biquad('hp', 4000);
	const f = mtof(91);
	for (let i = 0; i < out.length; i++) {
		const t = i / SR;
		out[i] =
			(Math.sin(TAU * f * t) * 0.6 + Math.sin(TAU * (f + 2.5) * t) * 0.4) * env(t, 0.0015, 0.9) +
			Math.sin(TAU * f * 2.74 * t) * env(t, 0.001, 0.32) * 0.42 +
			Math.sin(TAU * f * 5.15 * t) * env(t, 0.001, 0.12) * 0.2 +
			hp(noise()) * env(t, 0.0002, 0.003) * 0.5;
	}
	return out;
};
// 钟的滴答：木头的短促一下
const tickS = () => {
	const out = mono(0.06);
	const bp = biquad('bp', 2400, 3);
	for (let i = 0; i < out.length; i++) {
		const t = i / SR;
		out[i] = bp(noise()) * env(t, 0.0003, 0.006) * 1.6 + Math.sin(TAU * 1250 * t) * env(t, 0.0005, 0.012) * 0.5;
	}
	return out;
};

// ———————————————— 乐器 ————————————————
const kick = () => {
	const out = mono(0.4);
	let ph = 0;
	for (let i = 0; i < out.length; i++) {
		const t = i / SR;
		ph += (TAU * (46 + 60 * Math.exp(-t * 30))) / SR;
		out[i] = Math.sin(ph) * env(t, 0.002, 0.16) + noise() * env(t, 0.0003, 0.002) * 0.15;
	}
	return out;
};
const hat = () => {
	const out = mono(0.06);
	const hp = biquad('hp', 8000);
	for (let i = 0; i < out.length; i++) out[i] = hp(noise()) * env(i / SR, 0.0005, 0.012);
	return out;
};
const bassNote = (f: number, dur: number) => {
	const out = mono(dur + 0.05);
	const lp = biquad('lp', 700, 0.8);
	for (let i = 0; i < out.length; i++) {
		const t = i / SR;
		const v = Math.sin(TAU * f * t) + 0.45 * Math.sin(TAU * 2 * f * t) + 0.2 * Math.sin(TAU * 3 * f * t);
		out[i] = lp(v * Math.min(1, t / 0.006) * Math.exp(-t * 1.6) * Math.min(1, Math.max(0, (dur + 0.05 - t) / 0.05)));
	}
	return out;
};
// 木琴：基音 + 约 4 倍泛音
const marimba = (f: number, decay = 0.35) => {
	const out = mono(1.4);
	for (let i = 0; i < out.length; i++) {
		const t = i / SR;
		out[i] = Math.sin(TAU * f * t) * env(t, 0.002, decay) + Math.sin(TAU * f * 3.93 * t) * env(t, 0.001, 0.03) * 0.3;
	}
	return out;
};
// 钟琴（八音盒）
const glock = (f: number, len = 1.6) => {
	const out = mono(len);
	for (let i = 0; i < out.length; i++) {
		const t = i / SR;
		out[i] = (Math.sin(TAU * f * t) + 0.35 * Math.sin(TAU * f * 2.76 * t) * Math.exp(-t * 6) + 0.18 * Math.sin(TAU * f * 5.4 * t) * Math.exp(-t * 12)) * env(t, 0.001, 0.6);
	}
	return out;
};

// ———————————————— 编曲：C 大调的圆舞曲，Fmaj7 → Em7 → Dm7 → Cmaj7，一小节一个和弦 ————————————————
const LEN = DUR + 2;
const CHORDS = [
	{root: 41, tones: [53, 57, 60, 64]}, // Fmaj7
	{root: 40, tones: [52, 55, 59, 62]}, // Em7
	{root: 38, tones: [50, 53, 57, 60]}, // Dm7
	{root: 36, tones: [48, 52, 55, 59]}, // Cmaj7
];
const BAR = 3 * BEAT;
const chordAt = (t: number) => CHORDS[Math.floor(t / BAR) % 4];
// 旋律：四小节一句（四分音符，0 = 休止）
const MELODY = [81, 84, 88, 86, 0, 83, 84, 81, 77, 76, 0, 79];

type Seg = [number, number];
const on = (t: number, segs: Seg[]) => segs.some(([a, b]) => t >= a && t < b);
const STOP = T.stop;
// 钩子：只有钟、低音和白熊的铃；时间到后静两秒；片名时圆舞曲进来。
// 原理那一段：圆舞曲撤掉，只剩心跳一样的底鼓、每拍一个低音和十六分的"检查"；
// 生活里：只剩长和弦；办法：圆舞曲和旋律回来；129 秒强拍全部停下，只留最后一声铃。
const LAYER: Record<string, Seg[]> = {
	drone: [[0, T.countEnd]],
	bass: [
		[T.title, T.why],
		[T.how, STOP],
	],
	pulse: [[T.why, T.anything]],
	waltz: [
		[T.title, T.why],
		[T.how, T.golden],
	],
	musicbox: [[T.y1863, T.later]],
	melody: [
		[T.title, T.y1863],
		[T.method1, T.method2],
		[T.now, STOP],
	],
	hats: [[T.later, T.why]],
	heart: [[T.why, T.anything]],
	checker: [[T.workerB, T.anything]],
	pads: [
		[T.anything, T.how],
		[T.golden, STOP],
	],
	rise: [[T.rebound, T.name]],
	ostinato: [[T.why, T.anything]],
};

const makeMix = (): Stereo => {
	const music = stereo(LEN);
	const drums = stereo(LEN);
	const K = kick();
	const HT = hat();
	const TK = tickS();
	const beats = Math.floor(STOP / BEAT);
	for (let b = 0; b < beats; b++) {
		const t = b * BEAT;
		const inBar = b % 3;
		const ch = chordAt(t);
		// 低音：圆舞曲的"嘭"在第一拍
		if (on(t, LAYER.bass) && inBar === 0) addMono(music, bassNote(mtof(ch.root), 1.6), t, 0.15);
		// 原理：每拍一个低音（像脉搏）
		if (on(t, LAYER.pulse)) addMono(music, bassNote(mtof(ch.root), 0.8), t, inBar === 0 ? 0.14 : 0.09);
		// 圆舞曲：第二、三拍的和弦
		if (on(t, LAYER.waltz) && inBar > 0)
			ch.tones.slice(1).forEach((n, j) => addMono(music, marimba(mtof(n + 12)), t, inBar === 1 ? 0.07 : 0.055, (j - 1) * 0.35));
		// 旋律
		if (on(t, LAYER.melody)) {
			const n = MELODY[b % MELODY.length];
			if (n) addMono(music, glock(mtof(n)), t, 0.1, 0.15);
		}
		// 心跳：第一拍"咚—咚"
		if (on(t, LAYER.heart) && inBar === 0) {
			addMono(drums, K, t, 0.36);
			addMono(drums, K, t + E16, 0.2);
		}
		for (const e of [0, 0.5]) {
			const te = t + e;
			if (on(te, LAYER.hats)) addMono(drums, HT, te, e ? 0.12 : 0.07, 0.25);
			if (on(te, LAYER.musicbox)) addMono(music, glock(mtof(chordAt(te).tones[(b * 2 + e * 2) % 4] + 24), 1), te, 0.045, (e ? 0.3 : -0.3));
			// 原理：中音区的八分音型（根、五、三、五），让手机喇叭也听得见这一段
			if (on(te, LAYER.ostinato)) addMono(music, marimba(mtof(chordAt(te).tones[[0, 2, 1, 2][(b * 2 + e * 2) % 4]] + 12), 0.25), te, e ? 0.06 : 0.08, e ? 0.25 : -0.25);
		}
		for (const e of [0, 0.25, 0.5, 0.75]) {
			const te = t + e;
			if (on(te, LAYER.checker)) addMono(drums, TK, te, e === 0 ? 0.1 : 0.05, 0.3);
		}
	}
	// 钩子里的持续低音
	for (const [a, b] of LAYER.drone) {
		addMono(music, padNote(mtof(41), b - a, 0.25, 0.6), a, 0.06, -0.2);
		addMono(music, padNote(mtof(48), b - a, 0.4, 0.6), a, 0.045, 0.2);
		addMono(music, padNote(mtof(64), b - a, 0.6, 0.6), a, 0.018, 0);
	}
	// 长和弦（生活里、结尾）
	for (const [a, b] of LAYER.pads) {
		for (let t = a; t < b - 0.01; t += BAR) {
			const ch = chordAt(t);
			const d = Math.min(BAR, b - t);
			ch.tones.forEach((n, j) => addMono(music, padNote(mtof(n), d + 0.4, 0.4, 0.8), t, 0.03, (j - 1.5) * 0.3));
			addMono(music, bassNote(mtof(ch.root), d), t, 0.1);
		}
	}
	// 反弹：十六分音符一路往上
	for (const [a, b] of LAYER.rise) {
		let k = 0;
		for (let t = a; t < b - 0.01; t += E16) {
			const ch = chordAt(t);
			const n = ch.tones[k % 4] + 12 * (1 + Math.floor(k / 4) % 3);
			addMono(music, marimba(mtof(n), 0.2), t, 0.06, ((k % 4) - 1.5) * 0.25);
			k++;
		}
	}

	const mix = stereo(LEN);
	mixInto(mix, drums);
	mixInto(mix, music);
	mixInto(mix, reverb(music, 0.78, 0.35, 0.22));
	// 129 秒强拍：音乐全部停下（只剩最后一声铃，来自拟音）
	const stopI = Math.floor(STOP * SR);
	for (let i = stopI; i < mix.L.length; i++) {
		const g = Math.max(0, 1 - (i - stopI) / (0.004 * SR));
		mix.L[i] *= g;
		mix.R[i] *= g;
	}

	const foley = stereo(LEN);
	const make: Record<Ev['kind'], (e: Ev) => Float32Array> = {
		clack: () => clack(),
		tss: (e) => tss(e.dur ?? 0.25),
		snick: () => snick(),
		slap: () => slap(),
		slide: (e) => slide(e.dur ?? 0.25),
		thunk: () => thunk(),
		snap: () => snapS(),
		thump: () => thump(),
		stamp: () => stamp(),
		bell: () => bell(),
		tick: () => tickS(),
	};
	const LEVEL: Record<Ev['kind'], number> = {clack: 0.45, tss: 0.35, snick: 0.55, slap: 0.5, slide: 0.4, thunk: 0.6, snap: 0.45, thump: 0.8, stamp: 0.75, bell: 0.32, tick: 0.55};
	// 铃单独走一条带一点空间的总线，其余拟音全干
	const bells = stereo(LEN);
	events().forEach((e, i) => {
		if (e.kind === 'bell') addMono(bells, bell(), e.t, (e.gain ?? 1) * LEVEL.bell, ((i * 5) % 7) / 10 - 0.3);
		else addMono(foley, make[e.kind](e), e.t, (e.gain ?? 1) * LEVEL[e.kind], ((i * 7) % 5) / 10 - 0.2);
	});
	mixInto(mix, foley);
	mixInto(mix, bells);
	mixInto(mix, reverb(bells, 0.8, 0.3, 0.25));
	return mix;
};

const mix = makeMix();
// 响度：按 −14 LUFS 校准（RMS 目标由 ebur128 实测换算），柔和限幅
const N = Math.floor(DUR * SR);
let sum = 0;
for (let i = 0; i < N; i++) sum += mix.L[i] * mix.L[i] + mix.R[i] * mix.R[i];
const g = Math.pow(10, -17.3 / 20) / Math.sqrt(sum / (N * 2));
for (let i = 0; i < mix.L.length; i++) {
	mix.L[i] = Math.tanh(mix.L[i] * g * 1.2) / 1.2;
	mix.R[i] = Math.tanh(mix.R[i] * g * 1.2) / 1.2;
}
writeWav('public/audio/wb-mix.wav', {L: mix.L.slice(0, N), R: mix.R.slice(0, N)});
execFileSync('npx', ['remotion', 'ffmpeg', '-y', '-loglevel', 'error', '-i', 'public/audio/wb-mix.wav', '-c:a', 'libmp3lame', '-b:a', '256k', 'public/audio/wb-mix.mp3'], {stdio: 'inherit'});
rmSync('public/audio/wb-mix.wav');
console.log(`声音 ${DUR} 秒（配乐 + ${events().length} 个拟音事件）→ public/audio/wb-mix.mp3`);
