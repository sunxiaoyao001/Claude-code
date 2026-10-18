// 生成配乐和音效：node scripts/make-audio.ts
// 全部由代码合成，没有版权问题。配乐按 src/script.ts 的镜头时间分段编排，
// 改了文案（时间轴变了）之后重新运行一次，配乐就会重新对齐。
//   public/audio/music.mp3     背景音乐（96 BPM，C 大调，Fmaj7 → G → Em7 → Am7）
//   public/audio/sfx/*.wav     音效（在各个镜头里按帧触发）
import {execFileSync} from 'node:child_process';
import {mkdirSync, rmSync} from 'node:fs';
import {FPS, SCENES, TOTAL_FRAMES} from '../src/script.ts';
import {
	SFX,
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
	mtof,
	padNote,
	pingPong,
	reverb,
	stereo,
	writeWav,
} from './synth.ts';

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

// ———————————————————— 输出 ————————————————————

mkdirSync('public/audio/sfx', {recursive: true});
for (const [name, make] of Object.entries(SFX)) writeWav(`public/audio/sfx/${name}.wav`, make());
console.log(`音效 ${Object.keys(SFX).length} 个 → public/audio/sfx/`);

const music = makeMusic();
writeWav('public/audio/music.wav', music);
execFileSync('npx', ['remotion', 'ffmpeg', '-y', '-loglevel', 'error', '-i', 'public/audio/music.wav', '-c:a', 'libmp3lame', '-b:a', '192k', 'public/audio/music.mp3'], {stdio: 'inherit'});
rmSync('public/audio/music.wav');
console.log(`配乐 ${T.toFixed(1)} 秒 → public/audio/music.mp3`);
