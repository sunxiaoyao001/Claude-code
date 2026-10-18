// 《囚徒困境》时间轴（秒）。没有口播，节奏全靠这里；配乐脚本 scripts/make-audio-pd.ts 也读这个文件。
// 本文件不依赖其他模块。

export const PD_FPS = 30;

export const PD_SCENES = [
	{id: 'hook', sec: 6},
	{id: 'setup', sec: 6.5},
	{id: 'matrix', sec: 32.5}, // 规则 → A 的算盘 → 掉进陷阱（同一张表，画面连续）
	{id: 'title', sec: 5},
	{id: 'life', sec: 9},
	{id: 'way', sec: 13},
	{id: 'end', sec: 8},
] as const;

export type PdSceneId = (typeof PD_SCENES)[number]['id'];

// 各镜头内部的节拍（相对镜头开头，单位秒）
export const CUES = {
	hook: {lampA: 0, line1: 0.18, line1b: 0.72, lampB: 1.3, line2: 1.45, drop: 2.7, big1: 3.0, big2: 3.7},
	setup: {t1: 0.3, t2: 1.8, t3: 3.5, chip1: 4.1, chip2: 4.45},
	matrix: {
		title: 0.2, grid: 0.6, c1: 1.4, c2: 3.0, c3: 4.6, c4: 6.2,
		head: 9.7, case1: 11.1, cmp1: 12.5, case2: 15.1, cmp2: 16.5, concl: 19.1,
		mirror: 23.2, converge: 25.0, slam: 26.0, glow: 29.0, glow2: 29.8,
	},
	title: {t1: 0.25, sub: 1.8, tag: 2.8},
	life: {c1: 0, c2: 3, c3: 6},
	way: {q: 0.2, tour: 2.2, champ: 4.4, rule1: 6.4, rule2: 7.2, rounds: 4.6, chips: 9.8},
	end: {l1: 0.3, l1b: 1.0, l2: 2.6, l2b: 3.3, cta: 5.0},
} as const;

export const sceneStartSec = (id: PdSceneId) => {
	let t = 0;
	for (const s of PD_SCENES) {
		if (s.id === id) return t;
		t += s.sec;
	}
	throw new Error(`找不到镜头 ${id}`);
};

export const PD_TOTAL_SEC = PD_SCENES.reduce((sum, s) => sum + s.sec, 0);
export const PD_TOTAL_FRAMES = Math.round(PD_TOTAL_SEC * PD_FPS);

// 秒 → 帧
export const fr = (sec: number) => Math.round(sec * PD_FPS);
