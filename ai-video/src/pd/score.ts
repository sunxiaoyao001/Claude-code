// 《囚徒困境》总谱：画面和声音共用的一份时间数据。
// 120 BPM、24 fps：1 拍 = 0.5 秒 = 12 帧，八分 = 6 帧，十六分 = 3 帧，所有落点都在整帧上。
// 本文件不依赖任何模块：Remotion 画面和 scripts/make-audio-pd.ts 都直接引用它。

export const FPS = 24;
export const BPM = 120;
export const BEAT = 0.5;
export const E8 = 0.25;
export const E16 = 0.125;
export const BAR = 2;
export const DUR = 80;
export const FRAMES = DUR * FPS;

// ———————— 关键时刻（秒）————————
export const T = {
	// 开场：镜头贴在矩阵里的数字上
	a0: 0, // A 的 0 年
	b0: 1.5, // 甩到 B 的 0 年
	five: 3.0, // 甩到"都揭发"的 5
	pull: 4.0, // 拉远落定（第 3 小节强拍，乐队进）
	// 规则 01–05
	dismantle: 8.0,
	r1: 8.5,
	blockA: 9.5,
	blockB: 10.0,
	wallLine: 10.5,
	r2: 12.0,
	morphA: 13.0,
	morphB: 13.5,
	cross: 14.0,
	frameLines: 14.25,
	labels: 14.5,
	r3: 16.0,
	c00: 18.0,
	c10: 20.0,
	c01: 22.0,
	c11: 24.0,
	r4: 26.0,
	under1: 27.0,
	outline1: 27.5,
	under2: 29.0,
	outline2: 29.5,
	underOut: 30.5,
	knifeRow: 32.0,
	readout: 32.5,
	r5: 36.0,
	knifeCol: 38.0,
	push: 40.0,
	back: 42.0,
	twitch: 42.5,
	title: 44.0,
	cases: [48.0, 49.5, 51.0],
	wallIn: 54.0,
	wallPull: 56.0,
	betray: 62.5,
	retaliate: 63.0,
	wallCut: 68.0,
	heroIn: 69.0,
	land: 70.0,
	finalCut: 76.0,
	question: 76.75,
	stop: 78.0,
} as const;

// ———————— 矩阵数据：[A 的刑期, B 的刑期]，行 = A，列 = B ————————
// 行 0 = A 沉默，行 1 = A 揭发；列 0 = B 沉默，列 1 = B 揭发
export const YEARS: [number, number][][] = [
	[
		[1, 1],
		[10, 0],
	],
	[
		[0, 10],
		[5, 5],
	],
];
export const CELL_BUILD: Record<string, number> = {r0c0: T.c00, r1c0: T.c10, r0c1: T.c01, r1c1: T.c11};

// ———————— 屏幕上的话（每一句都是版面的一部分）————————
// lead = 灰色小字导语，bold = 粗体陈述（可多行）；'|' 分出逐块揭示的单位
export type Line = {t0: number; t1: number; lead: string; bold: string[]; kind?: 'page' | 'hook' | 'question'; size?: number};
export const LINES: Line[] = [
	{t0: 0.125, t1: 1.25, lead: '如果你|出卖他，', bold: ['你就能|自由。'], kind: 'hook'},
	{t0: 1.625, t1: 2.875, lead: '可是|他，', bold: ['也在|这么想。'], kind: 'hook'},
	{t0: 4.25, t1: 7.875, lead: '两人各判 5 年——', bold: ['最聪明的|选择，', '换来|最差的|结局。']},
	{t0: 8.75, t1: 11.875, lead: '规则一', bold: ['两个|嫌疑人，', '分开|审讯。']},
	{t0: 12.5, t1: 15.875, lead: '规则二', bold: ['每人|只能选：', '沉默，|或|揭发。']},
	{t0: 16.5, t1: 17.875, lead: '规则三 · 警察的条件', bold: ['1 格|= 1 年。']},
	{t0: 18.0, t1: 19.875, lead: '都沉默：', bold: ['各判|1 年。']},
	{t0: 20.0, t1: 21.875, lead: '你揭发，他沉默：', bold: ['你走，', '他坐|10 年。']},
	{t0: 22.0, t1: 23.875, lead: '反过来：', bold: ['你坐|10 年。']},
	{t0: 24.0, t1: 25.875, lead: '都揭发：', bold: ['各判|5 年。']},
	{t0: 26.5, t1: 28.875, lead: '规则四 · 站在 A 的角度', bold: ['如果|B 沉默，', '揭发|更好。']},
	{t0: 29.0, t1: 30.875, lead: '如果 B 揭发：', bold: ['揭发|还是|更好。']},
	{t0: 31.0, t1: 33.875, lead: '所以，不管 B 怎么选，', bold: ['揭发|都更|划算。']},
	{t0: 34.0, t1: 35.875, lead: '被删掉的，', bold: ['是|合作。']},
	{t0: 36.5, t1: 37.875, lead: '规则五', bold: ['B 也是|这么想的。']},
	{t0: 38.0, t1: 39.875, lead: '于是，两个最聪明的人，', bold: ['走进了|同一格。']},
	{t0: 40.0, t1: 41.875, lead: '', bold: ['各判|5 年。'], kind: 'hook'},
	{t0: 42.0, t1: 43.875, lead: '明明都沉默，', bold: ['只要|1 年。']},
	{t0: 54.5, t1: 55.875, lead: '但如果——', bold: ['博弈|不止|一次？']},
	{t0: 56.0, t1: 57.875, lead: '1980 年，阿克塞尔罗德办了一场', bold: ['电脑|策略|对战赛。']},
	{t0: 58.0, t1: 59.875, lead: '总分第一的策略，叫', bold: ['一报|还一报。']},
	{t0: 60.0, t1: 62.375, lead: '规则只有两条：', bold: ['先|合作；', '之后他怎么做，|你就|怎么做。']},
	{t0: 62.5, t1: 64.875, lead: '所以第 4 轮被背叛，', bold: ['第 5 轮|还击，', '第 6 轮|就原谅。']},
	{t0: 65.0, t1: 67.875, lead: '冠军的四个特点：', bold: ['善良，|会还击，', '肯原谅，|不嫉妒。']},
	{t0: 70.0, t1: 72.875, lead: '一次性的交易里，', bold: ['背叛|最理性；']},
	{t0: 73.0, t1: 75.875, lead: '但人生，', bold: ['是一场|重复博弈。'], size: 88},
	{t0: 76.75, t1: 81, lead: '评论区见——', bold: ['你身边，', '有哪些|囚徒困境？'], kind: 'question'},
];

// 开场三个镜头底部的注释行
export const HOOK_NOTES: {tin: number; tout: number; text: string}[] = [
	{tin: 0.5, tout: 1.25, text: 'A 揭发 · B 沉默 → A 0 年'},
	{tin: 2.0, tout: 2.75, text: 'A 沉默 · B 揭发 → B 0 年'},
	{tin: 3.25, tout: 3.75, text: 'A 揭发 · B 揭发 → 各 5 年'},
];

// 第 i 个揭示单位（导语和陈述连续编号）落位的时刻：每块晚一个十六分
export const chunkTime = (line: Line, i: number) => line.t0 + i * E16 + E16;
export const chunks = (s: string) => (s ? s.split('|') : []);

// ———————— 大数字位（上半页）————————
export type NumItem = {text: string; tin: number; tout: number; labels?: [string, string]};
export const NUMERALS: NumItem[] = [
	{text: '5', tin: T.pull, tout: T.dismantle},
	{text: '01', tin: T.r1, tout: T.r2},
	{text: '02', tin: T.r2, tout: T.r3},
	{text: '03', tin: T.r3, tout: T.r4},
	{text: '04', tin: T.r4, tout: T.under1},
	{text: '0<1', tin: T.under1, tout: T.under2, labels: ['揭发', '沉默']},
	{text: '5<10', tin: T.under2, tout: T.underOut, labels: ['揭发', '沉默']},
	{text: '04', tin: T.underOut, tout: T.r5},
	{text: '05', tin: T.r5, tout: T.push - BEAT},
	{text: '05', tin: T.back + E16, tout: T.title},
];

// ———————— 重复博弈：16 轮 ————————
// 行 = 一报还一报（A），列 = 对手（B）；C = 合作，D = 背叛
export const TFT = 'CCCCDCCCCCCCCCCC';
export const OPP = 'CCCDCCCCCCCCCCCC';
export const ROUNDS = TFT.length;
// 橙色模块（合作）到达每一轮的时刻；第 4 轮停半拍（回头看一眼），第 5 轮只是路过
export const ORANGE_AT: number[] = (() => {
	const at = [56.0, 58.0, 60.0, 62.5, 63.0, 63.25];
	for (let k = 6; k < ROUNDS; k++) at.push(63.25 + (k - 5) * 0.375);
	return at;
})();
export const ORANGE_PAUSE: [number, number] = [62.5, 62.75];

// ———————— 拟音事件（全部由画面时间推出来）————————
export type Foley = 'clack' | 'tss' | 'snick' | 'slap' | 'slide' | 'thunk' | 'snap' | 'thump' | 'stamp';
export type Ev = {t: number; kind: Foley; gain?: number; dur?: number; note?: number};

export const events = (): Ev[] => {
	const ev: Ev[] = [];
	const add = (t: number, kind: Foley, gain = 1, extra: Partial<Ev> = {}) => ev.push({t, kind, gain, ...extra});

	// 开场：三个大数字各爬四级台阶；两次甩镜；5 落下；拉远
	for (const t0 of [T.a0, T.b0, T.five]) for (let k = 0; k < 4; k++) add(t0 + (k + 1) * E16 - E16, 'thunk', k === 0 ? 1 : 0.7);
	add(T.b0 - E8, 'slide', 0.8, {dur: E8});
	add(T.five - E8, 'slide', 0.8, {dur: E8});
	add(T.five, 'thump', 1);
	add(T.pull - BEAT, 'slide', 0.6, {dur: BEAT});

	// 文字：每一块落位一声铅字（导语轻、陈述重）
	for (const L of LINES) {
		const nl = chunks(L.lead).length;
		const all = [...chunks(L.lead), ...L.bold.flatMap(chunks)];
		all.forEach((_, i) => add(chunkTime(L, i), 'clack', i < nl ? 0.35 : 0.6));
	}
	// 大数字位：每次爬升四级
	for (const n of NUMERALS) for (let k = 0; k < 4; k++) add(n.tin + (k + 1) * E16, 'thunk', 0.55);

	// 拆解：按距离从"都揭发"那格向外，刀切
	[T.dismantle, T.dismantle + E16, T.dismantle + E16, T.dismantle + E8].forEach((t, i) => add(t, 'snick', i === 0 ? 0.9 : 0.6));
	add(T.dismantle + 3 * E16, 'tss', 0.5, {dur: E8});
	// 规则一：两块落下，一道墙
	add(T.blockA, 'snap', 1);
	add(T.blockB, 'snap', 0.9);
	add(T.wallLine - E8, 'tss', 0.9, {dur: E8});
	// 规则二：两块变成坐标轴，十字线，网格线
	add(T.morphA, 'slide', 0.6, {dur: BEAT / 2});
	add(T.morphB, 'slide', 0.6, {dur: BEAT / 2});
	add(T.cross - E8, 'tss', 0.9, {dur: E8});
	add(T.frameLines - E8, 'tss', 0.6, {dur: E8});
	// 规则三：每格的刑期一格一格长出来（每级一声，音高沿 A 多利亚音阶上行）
	for (const [key, t0] of Object.entries(CELL_BUILD)) {
		const r = Number(key[1]);
		const c = Number(key[3]);
		const [a, b] = YEARS[r][c];
		const n = Math.max(a, b, 1);
		for (let k = 0; k < n; k++) add(t0 + k * E16, 'snap', 0.6, {note: k});
	}
	// 规则四：底衬、描边、比较
	add(T.under1 - E8, 'slide', 0.5, {dur: E8});
	add(T.outline1 - BEAT / 2, 'tss', 0.7, {dur: BEAT / 2});
	add(T.under2 - E8, 'slide', 0.6, {dur: E8});
	add(T.outline2 - BEAT / 2, 'tss', 0.7, {dur: BEAT / 2});
	add(T.knifeRow - E16, 'snick', 1.1);
	// 规则五：刀切一列；推进；拉回；橙色抽动一下
	add(T.knifeCol - E16, 'snick', 1.1);
	add(T.push - BEAT, 'slide', 0.7, {dur: BEAT});
	add(T.push, 'thump', 1.1);
	add(T.back - BEAT, 'slide', 0.6, {dur: BEAT});
	// 点题
	add(T.title, 'stamp', 0.8);
	// 生活里：三张纸拍下
	for (const t of T.cases) add(t, 'slap', 0.9);
	for (const t of T.cases) for (let k = 0; k < 5; k++) add(t + 0.25 + k * E16, 'snap', 0.35, {note: k});
	// 重复博弈：纸面擦入，镜头拉远，背叛与还击各盖一下
	add(T.wallIn, 'slap', 1);
	add(T.wallPull - BEAT, 'slide', 0.7, {dur: BEAT});
	add(T.betray, 'stamp', 0.9);
	add(T.retaliate, 'stamp', 0.7);
	// 结尾：整面墙被刀切，主矩阵擦回，橙色落位，最后清空，盖章
	for (let k = 0; k < 8; k++) add(T.wallCut + k * E16, 'snick', 0.45);
	add(T.heroIn, 'slap', 0.9);
	add(T.land, 'thump', 1.1);
	[T.finalCut, T.finalCut + E16, T.finalCut + E8].forEach((t) => add(t, 'snick', 0.7));
	add(T.stop, 'stamp', 1.2);
	return ev.sort((x, y) => x.t - y.t);
};
