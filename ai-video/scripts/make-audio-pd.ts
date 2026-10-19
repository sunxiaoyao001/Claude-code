// 《囚徒困境》声音：node scripts/make-audio-pd.ts → public/audio/pd-mix.mp3
// 画面和声音共用 src/pd/score.ts：每一次落位都是一声拟音，每一条规则加一件乐器。
// 拟音是印刷车间的材料声，干、近、不加混响：铅字、裁纸刀、纸张、数字落位、毛毡、橡皮章。
// 序幕里，脚步是纸拍，探照灯追一拍是一次纸滑，被罩住是盖章，开灯是木块。
import {execFileSync} from 'node:child_process';
import {rmSync} from 'node:fs';
import {BAR, BEAT, DUR, E16, events, ORANGE_AT, ORANGE_PAUSE, ROUNDS, T, type Ev} from '../src/pd/score.ts';
import {SR, type Stereo, TAU, addMono, biquad, mixInto, mono, mtof, noise, reverb, stereo, sweepFilter, writeWav} from './synth.ts';

// ———————————————— 拟音 ————————————————
const env = (t: number, a: number, d: number) => Math.min(1, t / a) * Math.exp(-t / d);

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

// ———————————————— 乐器 ————————————————
const kick = () => {
	const out = mono(0.35);
	let ph = 0;
	for (let i = 0; i < out.length; i++) {
		const t = i / SR;
		ph += (TAU * (48 + 75 * Math.exp(-t * 35))) / SR;
		out[i] = Math.sin(ph) * env(t, 0.001, 0.12) + noise() * env(t, 0.0003, 0.0025) * 0.3;
	}
	return out;
};
const snare = () => {
	const out = mono(0.25);
	const bp = biquad('bp', 1900, 0.7);
	for (let i = 0; i < out.length; i++) {
		const t = i / SR;
		out[i] = bp(noise()) * env(t, 0.0008, 0.06) * 1.1 + Math.sin(TAU * 185 * t) * env(t, 0.001, 0.03) * 0.4;
	}
	return out;
};
const hat = () => {
	const out = mono(0.06);
	const hp = biquad('hp', 8000);
	for (let i = 0; i < out.length; i++) out[i] = hp(noise()) * env(i / SR, 0.0005, 0.012);
	return out;
};
const tick = () => {
	const out = mono(0.05);
	for (let i = 0; i < out.length; i++) {
		const t = i / SR;
		out[i] = Math.sin(TAU * 2500 * t) * env(t, 0.0003, 0.008) + noise() * env(t, 0.0002, 0.002) * 0.3;
	}
	return out;
};
// 电贝斯：八分音符根音脉冲（motorik）
const bassNote = (f: number, dur: number) => {
	const out = mono(dur + 0.05);
	const lp = biquad('lp', 900, 0.8);
	for (let i = 0; i < out.length; i++) {
		const t = i / SR;
		const v = Math.sin(TAU * f * t) + 0.5 * Math.sin(TAU * 2 * f * t) + 0.25 * Math.sin(TAU * 3 * f * t) + 0.12 * Math.sin(TAU * 4 * f * t);
		out[i] = lp(v * Math.min(1, t / 0.004) * Math.exp(-t * 3) * Math.min(1, Math.max(0, (dur + 0.05 - t) / 0.03)));
	}
	return out;
};
// 木琴：基音 + 约 4 倍泛音，很快衰减
const marimba = (f: number) => {
	const out = mono(0.5);
	for (let i = 0; i < out.length; i++) {
		const t = i / SR;
		out[i] = Math.sin(TAU * f * t) * env(t, 0.002, 0.12) + Math.sin(TAU * f * 3.93 * t) * env(t, 0.001, 0.02) * 0.35;
	}
	return out;
};
// 钟琴
const glock = (f: number, len = 1.2) => {
	const out = mono(len);
	for (let i = 0; i < out.length; i++) {
		const t = i / SR;
		out[i] = (Math.sin(TAU * f * t) + 0.35 * Math.sin(TAU * f * 2.76 * t) * Math.exp(-t * 6) + 0.2 * Math.sin(TAU * f * 5.4 * t) * Math.exp(-t * 12)) * env(t, 0.001, 0.45);
	}
	return out;
};
// 软方波主旋律（垫在钟琴下面）
const squareLead = (f: number, dur: number) => {
	const out = mono(dur + 0.08);
	const lp = biquad('lp', 1800);
	for (let i = 0; i < out.length; i++) {
		const t = i / SR;
		let v = 0;
		for (let h = 1; h <= 9; h += 2) v += Math.sin(TAU * f * h * t) / h;
		out[i] = lp(v) * Math.min(1, t / 0.01) * Math.min(1, Math.max(0, (dur + 0.08 - t) / 0.06)) * 0.5;
	}
	return out;
};
// 锯齿琶音
const sawNote = (f: number, dur: number) => {
	const out = mono(dur + 0.02);
	let ph = 0;
	for (let i = 0; i < out.length; i++) {
		const t = i / SR;
		ph = (ph + f / SR) % 1;
		out[i] = (2 * ph - 1) * Math.min(1, t / 0.003) * Math.exp(-t * 9);
	}
	return out;
};

// ———————————————— 编曲：A 多利亚，120 BPM，一条规则加一件乐器 ————————————————
const LEN = DUR + 1.5;
const CHORDS = [
	{root: 45, tones: [57, 60, 64, 67]}, // Am7
	{root: 38, tones: [57, 62, 66, 69]}, // D
	{root: 45, tones: [57, 60, 64, 67]}, // Am7
	{root: 43, tones: [55, 59, 62, 67]}, // G
];
const chordAt = (t: number) => CHORDS[Math.floor(t / BAR) % 4];
const DORIAN = [69, 71, 72, 74, 76, 78, 79, 81, 83, 84, 86, 88];

type Seg = [number, number]; // [开始, 结束)
const on = (t: number, segs: Seg[]) => segs.some(([a, b]) => t >= a && t < b);
const STOP = T.stop;
// 序幕：追逐是四拍底鼓 + 十六分镲 + 八度贝斯（0–1.5）；被罩住时一切硬停两拍；
// 灯亮后只剩审讯室的钟（每拍一声滴答）和一个低音；警察开口时木琴的八分音型进来，
// "你会怎么选"时变成十六分、钟变成八分；11.5 留半小节空白；12 点题，乐队和主旋律一起进。
// 之后：规则一加木琴，规则二加锯齿琶音；38–40 几乎无声；40 推进时全编制；结论只剩贝斯和旋律；
// 例外独唱时（55.5–58）鼓全部撤掉；冠军出现时（58）鼓和旋律回来；78 秒强拍硬停。
const CHASE: Seg = [0, T.caught];
const ROOM_IN = T.copA - BEAT; // 警察起步
const LAYER: Record<string, Seg[]> = {
	hats: [
		[ROOM_IN, 11.5],
		[12, 55.5],
		[58, STOP],
	],
	hats16: [CHASE],
	tick: [
		[T.lampA, T.choose],
		[38, 40],
	],
	tick8: [[T.choose, 11.5]],
	kick: [
		[12, 38],
		[40, 55.5],
		[58, 76],
	],
	kick4: [CHASE],
	snare: [
		CHASE,
		[12, 38],
		[40, 44],
		[48, 55.5],
		[58, 76],
	],
	bass: [
		[12, 38],
		[40, 54],
		[58, STOP],
	],
	bassOct: [CHASE],
	chaseArp: [CHASE],
	bassLow: [[ROOM_IN, 11.5]],
	ostinato: [[ROOM_IN, T.choose]],
	ostinato16: [[T.choose, 11.5]],
	marimba: [
		[16, 38],
		[40, 44],
		[48, STOP],
	],
	arp: [
		[26, 38],
		[40, 44],
		[48, 54],
		[60, 76],
	],
	lead: [
		[12, 16],
		[44, 48],
		[58, 68],
	],
	pedal: [
		[T.lampA, ROOM_IN],
		[38, 40],
		[55.5, 58],
	],
};

// 橙色在墙上的连续轮次（与画面同一算法）
const roundAt = (t: number) => {
	for (let j = 1; j < ROUNDS; j++) {
		const dep = j - 1 === 3 ? ORANGE_PAUSE[1] : ORANGE_AT[j - 1];
		if (t <= dep) return j - 1;
		if (t <= ORANGE_AT[j]) return j - 1 + (t - dep) / (ORANGE_AT[j] - dep);
	}
	return ROUNDS - 1;
};

const makeMix = (): Stereo => {
	const drums = stereo(LEN);
	const tonal = stereo(LEN);
	const K = kick();
	const SN = snare();
	const H = hat();
	const TK = tick();
	const beats = Math.floor(STOP / BEAT);
	for (let b = 0; b < beats; b++) {
		const t = b * BEAT;
		const inBar = b % 4;
		if (on(t, LAYER.kick) && (inBar === 0 || inBar === 2)) addMono(drums, K, t, 0.36);
		if (on(t + BEAT / 2, LAYER.kick) && inBar === 2) addMono(drums, K, t + BEAT / 2, 0.24);
		if (on(t, LAYER.kick4)) addMono(drums, K, t, 0.32);
		if (on(t, LAYER.snare) && (inBar === 1 || inBar === 3)) addMono(drums, SN, t, 0.36, -0.08);
		if (on(t, LAYER.tick)) addMono(drums, TK, t, 0.24, 0.2);
		for (const e of [0, 0.5]) {
			const te = t + e * BEAT;
			if (on(te, LAYER.tick8)) addMono(drums, TK, te, e ? 0.2 : 0.26, 0.2);
			if (on(te, LAYER.hats)) addMono(drums, H, te, (e ? 0.17 : 0.12) * (te < 12 ? 0.7 : 1), 0.25);
		}
		for (const e of [0, 0.25, 0.5, 0.75]) {
			const te = t + e * BEAT;
			if (on(te, LAYER.hats16)) addMono(drums, H, te, e === 0.5 ? 0.2 : 0.13, 0.25);
		}
	}
	// 贝斯：八分音符根音
	for (let k = 0; k < STOP / (BEAT / 2); k++) {
		const t = k * (BEAT / 2);
		if (on(t, LAYER.bass)) addMono(tonal, bassNote(mtof(chordAt(t).root), BEAT / 2 - 0.03), t, 0.12);
	}
	// 追逐：八度跳的贝斯；审讯室：每拍一个很轻的根音
	for (let k = 0; k < STOP / (BEAT / 2); k++) {
		const t = k * (BEAT / 2);
		if (on(t, LAYER.bassOct)) addMono(tonal, bassNote(mtof(45 + (k % 2) * 12), BEAT / 2 - 0.03), t, 0.11);
		if (on(t, LAYER.bassLow) && k % 2 === 0) addMono(tonal, bassNote(mtof(chordAt(t).root), BEAT - 0.06), t, 0.09);
	}
	for (const [a, b] of LAYER.pedal) addMono(tonal, bassNote(mtof(45), b - a), a, 0.12);
	// 审讯室的木琴：八分音型（根、五、三、五），"你会怎么选"时加倍成十六分
	const ost = [0, 2, 1, 2];
	for (let k = 0; k < STOP / E16; k++) {
		const t = k * E16;
		const o8 = on(t, LAYER.ostinato) && k % 2 === 0;
		const o16 = on(t, LAYER.ostinato16);
		if (!o8 && !o16) continue;
		const ch = chordAt(t);
		const i = o16 ? k : k / 2;
		addMono(tonal, marimba(mtof(ch.tones[ost[i % 4]] + 12)), t, o16 ? (k % 2 ? 0.09 : 0.13) : 0.13, i % 2 ? 0.25 : -0.25);
	}
	// 追逐：十六分的锯齿脉冲（八分上重音），给手机喇叭一点中频的"跑"
	{
		const ca = stereo(LEN);
		for (let k = 0; k < STOP / E16; k++) {
			const t = k * E16;
			if (!on(t, LAYER.chaseArp)) continue;
			addMono(ca, sawNote(mtof(k % 4 === 2 ? 64 : 57), E16), t, k % 2 ? 0.1 : 0.17, k % 2 ? 0.2 : -0.2);
		}
		mixInto(tonal, {L: sweepFilter(ca.L, 'lp', () => 2600, 0.8), R: sweepFilter(ca.R, 'lp', () => 2600, 0.8)});
	}
	// 木琴：十六分音符的多利亚音型
	const pat = [0, 2, 1, 3, 2, 0, 3, 1];
	for (let k = 0; k < STOP / E16; k++) {
		const t = k * E16;
		if (!on(t, LAYER.marimba)) continue;
		const ch = chordAt(t);
		addMono(tonal, marimba(mtof(ch.tones[pat[k % 8]] + 12)), t, k % 2 ? 0.12 : 0.17, k % 2 ? 0.3 : -0.3);
	}
	// 锯齿琶音：规则四里滤波一点点打开
	const arp = stereo(LEN);
	for (let k = 0; k < STOP / E16; k++) {
		const t = k * E16;
		if (!on(t, LAYER.arp)) continue;
		addMono(arp, sawNote(mtof(chordAt(t).tones[k % 4] + 12), E16), t, 0.07, ((k % 4) - 1.5) / 3);
	}
	const cutoff = (t: number) => (t < 32 ? 500 + 2600 * Math.max(0, (t - 26) / 6) : 2600);
	mixInto(tonal, {L: sweepFilter(arp.L, 'lp', cutoff, 0.9), R: sweepFilter(arp.R, 'lp', cutoff, 0.9)});
	// 主旋律：钟琴 + 软方波
	const MOTIF: [number, number][] = [
		[69, 1], [72, 0.5], [74, 0.5], [76, 1], [79, 1],
		[76, 0.5], [74, 0.5], [72, 1], [74, 1], [69, 1],
		[69, 1], [72, 0.5], [74, 0.5], [78, 1], [76, 1],
		[74, 0.5], [72, 0.5], [71, 1], [72, 1], [69, 1],
	];
	for (const [a, b] of LAYER.lead) {
		let t = a;
		let i = 0;
		while (t < b - 0.01) {
			const [n, d] = MOTIF[i % MOTIF.length];
			addMono(tonal, glock(mtof(n + 12)), t, 0.13, 0.15);
			addMono(tonal, squareLead(mtof(n), d * BEAT * 0.9), t, 0.08, -0.15);
			t += d * BEAT;
			i++;
		}
	}
	// 规则三：每一格刑期长一级，钟琴上行一个音（画面就是乐谱）
	for (const e of events()) if (e.kind === 'snap' && e.note !== undefined) addMono(tonal, glock(mtof(DORIAN[e.note % DORIAN.length]), 0.6), e.t, 0.11, 0.1);

	// ———— 例外独唱：一条正弦，跟着橙色的位置滑动；回到主矩阵时滑回起点 ————
	const sine = stereo(LEN);
	{
		let ph = 0;
		const t0 = ORANGE_AT[0];
		const t1 = T.land;
		for (let i = Math.floor(t0 * SR); i < Math.floor(t1 * SR); i++) {
			const t = i / SR;
			const k = t > T.heroIn ? (ROUNDS - 1) * (1 - (t - T.heroIn) / (t1 - T.heroIn)) : roundAt(t);
			const f = 330 * Math.pow(2, k / 15) * (1 + 0.004 * Math.sin(TAU * 5 * t));
			ph += (TAU * f) / SR;
			const a = Math.min(1, (t - t0) / 0.2) * Math.min(1, (t1 - t) / 0.05);
			const v = Math.sin(ph) * a * 0.09;
			sine.L[i] += v;
			sine.R[i] += v;
		}
	}
	mixInto(tonal, sine);

	// 音乐：一点点空间；拟音：完全干声
	const music = stereo(LEN);
	mixInto(music, drums);
	mixInto(music, tonal);
	mixInto(music, reverb(tonal, 0.7, 0.4, 0.18));
	// 第 78 秒强拍：全部硬停
	const stopI = Math.floor(STOP * SR);
	for (let i = stopI; i < music.L.length; i++) {
		const g = Math.max(0, 1 - (i - stopI) / (0.004 * SR));
		music.L[i] *= g;
		music.R[i] *= g;
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
	};
	const LEVEL: Record<Ev['kind'], number> = {clack: 0.5, tss: 0.35, snick: 0.6, slap: 0.55, slide: 0.4, thunk: 0.75, snap: 0.45, thump: 0.9, stamp: 0.8};
	events().forEach((e, i) => addMono(foley, make[e.kind](e), e.t, (e.gain ?? 1) * LEVEL[e.kind], ((i * 7) % 5) / 10 - 0.2));

	const mix = stereo(LEN);
	mixInto(mix, music);
	mixInto(mix, foley);
	return mix;
};

const mix = makeMix();
// 响度：按 −14 LUFS 校准（RMS 目标由 ebur128 实测换算），柔和限幅
const N = Math.floor(DUR * SR);
let sum = 0;
for (let i = 0; i < N; i++) sum += mix.L[i] * mix.L[i] + mix.R[i] * mix.R[i];
const g = Math.pow(10, -15.3 / 20) / Math.sqrt(sum / (N * 2));
for (let i = 0; i < mix.L.length; i++) {
	mix.L[i] = Math.tanh(mix.L[i] * g * 1.2) / 1.2;
	mix.R[i] = Math.tanh(mix.R[i] * g * 1.2) / 1.2;
}
writeWav('public/audio/pd-mix.wav', {L: mix.L.slice(0, N), R: mix.R.slice(0, N)});
execFileSync('npx', ['remotion', 'ffmpeg', '-y', '-loglevel', 'error', '-i', 'public/audio/pd-mix.wav', '-c:a', 'libmp3lame', '-b:a', '256k', 'public/audio/pd-mix.mp3'], {stdio: 'inherit'});
rmSync('public/audio/pd-mix.wav');
console.log(`声音 ${DUR} 秒（配乐 + ${events().length} 个拟音事件）→ public/audio/pd-mix.mp3`);
