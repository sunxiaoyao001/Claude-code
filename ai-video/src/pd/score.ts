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
	// 序幕：一个情景（夜）
	chase: 0, // 第 0 帧：探照灯下，两个人在逃
	beam1: 0.5, // 光柱追两拍
	beam2: 1.0,
	caught: 1.5, // 光柱罩住两人：转身、举手
	cut: 2.5, // 定格两拍后，一道刀线竖着划下：灯灭
	page: 3.0, // 夜色收进下半页的纸里（落定），版面出现
	lampA: 3.0, // A 的屋子亮灯
	lampB: 3.5, // B 的屋子亮灯
	copA: 4.5, // 警察从暗处走进 A 的灯下（4.0 起步）
	pressA: 5.0, // 俯身，指着 A
	thinkA: 6.0,
	copB: 8.0, // 隔壁：同样的警察，同样的话
	pressB: 8.5,
	thinkB: 9.5,
	choose: 10.0, // 你会怎么选？
	torn: [10.5, 11.0, 11.5], // 两人在沉默和揭发之间来回
	// 点题：灯光铺满纸面，审讯室变成表格
	flood: 12.0,
	title: 12.0,
	wallLine: 2.5, // 刀线留下来，成了两间屋子之间的墙
	knifeScene: 13.75, // 审讯室被刀切掉，换成坐标轴
	stripIn: 14.0,
	headIn: 14.25,
	cross: 14.0,
	frameLines: 14.25,
	labels: 14.5,
	// 规则 01–03
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
	barsDown: 40.0, // 推进时铁栏落下
	barsUp: 41.75,
	insight: 44.0, // 结论：个人理性 ≠ 集体理性
	cases: [48.0, 49.5, 51.0],
	wallIn: 54.0,
	wallPull: 56.0,
	betray: 62.5,
	retaliate: 63.0,
	wallCut: 68.0,
	heroIn: 69.0,
	land: 70.0,
	coupleIn: 70.25, // 两个小人站上橙色木板
	grow: 76.75, // 最后：两人放大、走近
	shake: 77.25, // 握手
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
// at = 每一块落位的时刻（不写就每块晚一个十六分）；kind 'night' = 夜里的字（纸色）
export type Line = {t0: number; t1: number; lead: string; bold: string[]; kind?: 'page' | 'hook' | 'question' | 'night'; size?: number; at?: number[]};
export const LINES: Line[] = [
	// 序幕：一个情景
	{t0: 0, t1: 2.375, lead: '凌晨 2 点，', bold: ['你和同伙，', '被抓了。'], kind: 'night', at: [0.125, 0.25, T.caught]},
	{t0: 2.875, t1: 4.375, lead: '警察把你们', bold: ['分开|审讯。']},
	{t0: 4.5, t1: 7.875, lead: '然后对你说：', bold: ['“揭发他，', '你就能走。”']},
	{t0: 8.0, t1: 9.875, lead: '可是隔壁，', bold: ['他听到的，', '是同一句话。']},
	{t0: 10.0, t1: 11.875, lead: '', bold: ['你会', '怎么选？'], kind: 'hook'},
	// 规则 01–03
	{t0: 16.5, t1: 17.875, lead: '规则一 · 刑期', bold: ['1 格|= 1 年。']},
	{t0: 18.0, t1: 19.875, lead: '都沉默：', bold: ['各判|1 年。']},
	{t0: 20.0, t1: 21.875, lead: '你揭发，他沉默：', bold: ['你走，', '他坐|10 年。']},
	{t0: 22.0, t1: 23.875, lead: '反过来：', bold: ['你坐|10 年。']},
	{t0: 24.0, t1: 25.875, lead: '都揭发：', bold: ['各判|5 年。']},
	{t0: 26.5, t1: 28.875, lead: '规则二 · 站在 A 的角度', bold: ['如果|B 沉默，', '揭发|更好。']},
	{t0: 29.0, t1: 30.875, lead: '如果 B 揭发：', bold: ['揭发|还是|更好。']},
	{t0: 31.0, t1: 33.875, lead: '所以，不管 B 怎么选，', bold: ['揭发|都更|划算。']},
	{t0: 34.0, t1: 35.875, lead: '被删掉的，', bold: ['是|合作。']},
	{t0: 36.5, t1: 37.875, lead: '规则三', bold: ['B 也是|这么想的。']},
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

// 第 i 个揭示单位（导语和陈述连续编号）落位的时刻：默认每块晚一个十六分
export const chunkTime = (line: Line, i: number) => line.at?.[i] ?? line.t0 + i * E16 + E16;
export const chunks = (s: string) => (s ? s.split('|') : []);

// ———————— 大数字位（上半页）————————
// 序幕里是两个巨大的 0（刑期 0 年），空心里有个往外走的人：墨 = 你，灰 = 他
export type NumItem = {text: string; tin: number; tout: number; labels?: [string, string]; voice?: 'b'; walker?: 1 | -1; suffix?: string};
export const NUMERALS: NumItem[] = [
	{text: '0', tin: 5.0, tout: 7.875, walker: 1, suffix: '年'},
	{text: '0', tin: 8.25, tout: 9.875, voice: 'b', walker: -1, suffix: '年'},
	{text: '01', tin: T.r3, tout: T.r4},
	{text: '02', tin: T.r4, tout: T.under1},
	{text: '0<1', tin: T.under1, tout: T.under2, labels: ['揭发', '沉默']},
	{text: '5<10', tin: T.under2, tout: T.underOut, labels: ['揭发', '沉默']},
	{text: '02', tin: T.underOut, tout: T.r5},
	{text: '03', tin: T.r5, tout: T.push - BEAT},
	{text: '03', tin: T.back + E16, tout: T.insight},
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

// ———————— 上半页的小插图（象形图）————————
// spot: 'rule' = 规则页右侧（地面 y 632），'wall' = 重复博弈和结尾的陈述右侧（地面 y 470）
export type Plate = {tin: number; tout: number; scene: string; spot: 'rule' | 'wall'; knife?: number; poses?: {t: number; name: string}[]};
export const PLATES: Plate[] = [
	// 序幕：条件的另一半——他坐 10 年；然后反过来；最后是两个选项
	{tin: 5.5, tout: 7.875, scene: 'jailB', spot: 'rule'},
	{tin: 8.75, tout: 9.875, scene: 'jailA', spot: 'rule'},
	{
		tin: 10.25,
		tout: 11.875,
		scene: 'choice',
		spot: 'rule',
		poses: [
			{t: T.torn[0], name: 'silent'},
			{t: T.torn[1], name: 'point'},
			{t: T.torn[2], name: 'silent'},
		],
	},
	{tin: 16.75, tout: 17.875, scene: 'unit', spot: 'rule'},
	{tin: 18.125, tout: 19.875, scene: 'bothSilent', spot: 'rule'},
	{tin: 20.125, tout: 21.875, scene: 'aWalks', spot: 'rule'},
	{tin: 22.125, tout: 23.875, scene: 'bWalks', spot: 'rule'},
	{tin: 24.125, tout: 25.875, scene: 'mutual', spot: 'rule'},
	{tin: 31.125, tout: 33.875, scene: 'aPoints', spot: 'rule'},
	{tin: 34.125, tout: 35.875, scene: 'handshake', spot: 'rule', knife: 35.0},
	{tin: 36.625, tout: 37.875, scene: 'bPoints', spot: 'rule'},
	{tin: 38.125, tout: 39.375, scene: 'cell', spot: 'rule'},
	{tin: 42.375, tout: 43.875, scene: 'bothSilent', spot: 'rule'},
	{tin: 54.625, tout: 55.875, scene: 'again', spot: 'wall'},
	{tin: 56.125, tout: 57.875, scene: 'monitors', spot: 'wall'},
	{tin: 58.125, tout: 59.875, scene: 'tft', spot: 'wall'},
	{
		tin: 62.625,
		tout: 64.875,
		scene: 'betray',
		spot: 'wall',
		poses: [
			{t: 63.0, name: 'strike'},
			{t: 63.5, name: 'forgive'},
		],
	},
	{tin: 65.125, tout: 67.875, scene: 'podium', spot: 'wall'},
	{tin: 70.125, tout: 72.875, scene: 'walkAway', spot: 'wall'},
	{tin: 73.125, tout: 75.875, scene: 'together', spot: 'wall'},
];

// ———————— 拟音事件（全部由画面时间推出来）————————
export type Foley = 'clack' | 'tss' | 'snick' | 'slap' | 'slide' | 'thunk' | 'snap' | 'thump' | 'stamp';
export type Ev = {t: number; kind: Foley; gain?: number; dur?: number; note?: number};

export const events = (): Ev[] => {
	const ev: Ev[] = [];
	const add = (t: number, kind: Foley, gain = 1, extra: Partial<Ev> = {}) => ev.push({t, kind, gain, ...extra});

	// 序幕 · 追逐：第 0 帧一记闷响；每一步一声（纸拍）；光柱每拍追一次（滑）
	add(T.chase, 'thump', 0.7);
	add(T.chase, 'snick', 0.6);
	for (let k = 1; k <= 6; k++) {
		add(k * E8, 'slap', 0.34);
		add(k * E8, 'snap', 0.3);
	}
	for (const tb of [T.beam1, T.beam2, T.caught]) add(tb - E8, 'slide', 0.55, {dur: E8});
	// 被罩住：盖章，所有声音停两拍
	add(T.caught, 'stamp', 1.25);
	// 刀线竖着划下，光柱塌成一条线；夜色收进纸里
	add(T.cut - E16, 'snick', 1.15);
	add(T.cut, 'thump', 0.6);
	add(T.page - E8, 'slide', 0.6, {dur: E8});
	// 两盏灯：线垂下（笔）、灯罩落定（块）、光铺下来（笔）
	for (const t0 of [T.lampA, T.lampB]) {
		add(t0 - E8, 'tss', 0.5, {dur: E8});
		add(t0, 'snap', 0.9);
		add(t0, 'thunk', 0.45);
	}
	// 警察从暗处走进灯下（两步），俯身；被审的人想一想
	for (const [tc, tp, tk] of [
		[T.copA, T.pressA, T.thinkA],
		[T.copB, T.pressB, T.thinkB],
	]) {
		for (const k of [1, 2]) add(tc - BEAT + k * E8, 'slap', 0.24);
		add(tp, 'snap', 0.75);
		add(tk, 'snap', 0.5);
	}
	// 你会怎么选：两人一起在沉默和揭发之间换
	for (const tt of T.torn) add(tt, 'snap', 0.85);
	// 点题：灯光铺满纸面（纸拍），标题盖章
	add(T.flood - E8, 'slide', 0.7, {dur: E8});
	add(T.flood, 'slap', 1);
	add(T.title + E8, 'stamp', 0.7);

	// 文字：每一块落位一声铅字（导语轻、陈述重）
	for (const L of LINES) {
		const nl = chunks(L.lead).length;
		const all = [...chunks(L.lead), ...L.bold.flatMap(chunks)];
		all.forEach((_, i) => add(chunkTime(L, i), 'clack', i < nl ? 0.35 : 0.6));
	}
	// 大数字位：每次爬升四级
	for (const n of NUMERALS) for (let k = 0; k < 4; k++) add(n.tin + (k + 1) * E16, 'thunk', 0.55);

	// 审讯室被切掉，坐标轴擦入
	add(T.knifeScene - E16, 'snick', 0.9);
	add(T.stripIn - E8, 'slide', 0.5, {dur: E8});
	add(T.headIn - E8, 'slide', 0.5, {dur: E8});
	add(T.cross - E8, 'tss', 0.9, {dur: E8});
	add(T.frameLines - E8, 'tss', 0.6, {dur: E8});
	// 规则一：每格的刑期一格一格长出来（每级一声，音高沿 A 多利亚音阶上行）
	for (const [key, t0] of Object.entries(CELL_BUILD)) {
		const r = Number(key[1]);
		const c = Number(key[3]);
		const [a, b] = YEARS[r][c];
		const n = Math.max(a, b, 1);
		for (let k = 0; k < n; k++) add(t0 + k * E16, 'snap', 0.6, {note: k});
	}
	// 规则二：底衬、描边、比较
	add(T.under1 - E8, 'slide', 0.5, {dur: E8});
	add(T.outline1 - BEAT / 2, 'tss', 0.7, {dur: BEAT / 2});
	add(T.under2 - E8, 'slide', 0.6, {dur: E8});
	add(T.outline2 - BEAT / 2, 'tss', 0.7, {dur: BEAT / 2});
	add(T.knifeRow - E16, 'snick', 1.1);
	// 规则三：刀切一列；推进；拉回；橙色抽动一下
	add(T.knifeCol - E16, 'snick', 1.1);
	add(T.push - BEAT, 'slide', 0.7, {dur: BEAT});
	add(T.push, 'thump', 1.1);
	for (let k = 0; k < 8; k++) add(T.barsDown + k * E16 * 0.5, 'snap', 0.5);
	add(T.back - BEAT, 'slide', 0.6, {dur: BEAT});
	// 结论：一个等式，左右两边各落一幅图
	add(T.insight, 'stamp', 0.8);
	for (const k of [0, 1]) add(T.insight + 0.5 + k * BEAT, 'snap', 0.6);
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
	add(T.coupleIn, 'thunk', 0.6);
	add(T.grow, 'slide', 0.5, {dur: E8});
	add(T.shake, 'snap', 0.9);
	[T.finalCut, T.finalCut + E16, T.finalCut + E8].forEach((t) => add(t, 'snick', 0.7));
	add(T.stop, 'stamp', 1.2);
	for (const pl of PLATES) {
		add(pl.tin, 'clack', 0.45);
		// 铁栏一根一根落下
		if (pl.scene === 'jailA' || pl.scene === 'jailB') for (let k = 0; k < 6; k++) add(pl.tin + E8 + (k * E8) / 4, 'snap', k === 0 ? 0.55 : 0.4);
		for (const ps of pl.poses ?? []) add(ps.t, 'snap', 0.6);
		if (pl.knife) add(pl.knife - E16, 'snick', 0.8);
	}
	for (const t of T.cases) add(t + 0.25, 'snap', 0.5);
	return ev.sort((x, y) => x.t - y.t);
};
