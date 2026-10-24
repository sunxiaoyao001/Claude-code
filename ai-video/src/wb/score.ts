// 《白熊效应》总谱：画面和声音共用的一份时间数据。
// 60 BPM、3/4 拍、24 fps：1 拍 = 1 秒 = 24 帧，1 小节 = 3 秒 = 一屏。八分 = 12 帧，十六分 = 6 帧，三十二分 = 3 帧。
// 本文件不依赖任何模块：Remotion 画面和 scripts/make-audio-wb.ts 都直接引用它。

export const FPS = 24;
export const BPM = 60;
export const BEAT = 1;
export const E8 = 0.5;
export const E16 = 0.25;
export const E32 = 0.125;
export const BAR = 3;
export const DUR = 132;
export const FRAMES = DUR * FPS;

// ———————— 关键时刻（秒）————————
export const T = {
	// 钩子：10 秒挑战
	count0: 1.0, // 倒计时 10；每拍减一
	countEnd: 11.0, // 0：时间到
	reflow: 12.0, // 到处乱冒的白熊排成一行：数一数
	// 片名
	title: 14.0,
	// 01 起源：1863
	y1863: 18.0,
	notebook: 21.0,
	quote1: 24.0,
	quote2: 27.0,
	// 02 实验：1987
	later: 30.0,
	lab: 33.0,
	rule: 36.0,
	bell: 39.0,
	grid: 42.0, // 5 分钟压成 6 秒
	gridEnd: 48.0,
	stranger: 51.0,
	rebound: 54.0,
	name: 57.0,
	// 03 原理：1994
	why: 60.0,
	workers: 63.0,
	workerA: 66.0,
	workerB: 69.0,
	reveal: 72.0,
	answer: 75.0,
	tired: 78.0,
	onlyB: 81.0,
	control: 84.0,
	anything: 87.0,
	// 04 生活里
	sleep: 90.0,
	person: 93.0,
	cake: 96.0,
	notYou: 99.0,
	// 05 办法
	how: 102.0,
	method1: 105.0,
	car: 108.0,
	smaller: 111.0,
	method2: 114.0,
	stay: 117.0,
	// 结尾
	now: 120.0,
	leave: 123.0,
	golden: 126.0,
	stop: 129.0,
} as const;

// ———————— 屏幕上的话（每屏一句，不超过 20 字）————————
// lead = 灰色小字导语，bold = 粗体陈述（可多行）；'|' 分出逐块揭示的单位
export type Line = {t0: number; t1: number; lead: string; bold: string[]; kind?: 'page' | 'hook'; at?: number[]};
const L = (t0: number, t1: number, lead: string, bold: string[], kind?: 'page' | 'hook', at?: number[]): Line => ({t0, t1, lead, bold, kind, at});
export const LINES: Line[] = [
	// 钩子
	L(0, 3, '接下来 10 秒，', ['请不要想', '一只白熊。'], 'hook', [0.125, 0.5, 1.0]),
	L(3, 6, '', ['也别想它', '毛茸茸的样子。'], 'hook'),
	L(6, 9, '', ['更别想它', '在雪地里慢慢走。'], 'hook'),
	L(9, 11, '', ['千万，', '别想。'], 'hook'),
	L(11, 14, '时间到。', ['你刚才，', '想了几次？'], 'hook'),
	// 01 起源
	L(18, 21, '1863 年，俄国作家', ['陀思妥耶夫斯基']),
	L(21, 24, '在一篇游记里，', ['随手写下一句话：']),
	L(24, 27, '', ['“试着不去想', '一只北极熊，”']),
	L(27, 30, '', ['“那该死的东西，', '每分钟都会冒出来。”']),
	// 02 实验
	L(30, 33, '一百多年后，', ['有人把它', '做成了实验。']),
	L(33, 36, '1987 年，心理学家韦格纳', ['请人独自坐 5 分钟，', '想到什么就说什么。']),
	L(36, 39, '规则只有一条：', ['不要想白熊。']),
	L(39, 42, '可一旦想到了，', ['就按一下铃。']),
	L(42, 48, '结果——', ['铃声一直在响。']),
	L(48, 51, '平均下来，', ['每分钟至少一次。']),
	L(51, 54, '更奇怪的是，', ['接下来的 5 分钟。']),
	L(54, 57, '允许随便想白熊时，', ['刚才拼命忍住的人，', '反而想得更多。']),
	L(57, 60, '这叫', ['“反弹效应”。']),
	// 03 原理
	L(60, 63, '', ['为什么越压，', '弹得越高？'], 'hook'),
	L(63, 66, '1994 年，韦格纳的解释：', ['脑子里，', '有两个“工人”。']),
	L(66, 69, '一个负责', ['找别的事来想。']),
	L(69, 72, '另一个负责检查：', ['“有没有在想白熊？”']),
	L(72, 75, '可是，要检查，', ['就得先想一下白熊。']),
	L(75, 78, '', ['每检查一次，', '白熊就出现一次。'], 'hook'),
	L(78, 81, '人一累、一紧张，', ['找事的那个先停了。']),
	L(81, 84, '只剩检查的那个，', ['一遍遍地喊：白熊！']),
	L(84, 87, '所以，', ['越想控制，', '越会失控。']),
	L(87, 90, '这只白熊，', ['可以是任何东西。']),
	// 04 生活里
	L(90, 93, '', ['越想睡，', '越睡不着。']),
	L(93, 96, '', ['越想忘记一个人，', '越记得清楚。']),
	L(96, 99, '', ['越告诉自己别吃，', '越想吃。']),
	L(99, 102, '这不是你没出息，', ['是大脑的设计。']),
	// 05 办法
	L(102, 105, '', ['那怎么办？'], 'hook'),
	L(105, 108, '办法一：', ['给白熊，', '找个替身。']),
	L(108, 111, '白熊一来，', ['就去想一辆', '红色小汽车。']),
	L(111, 114, '韦格纳发现，', ['这样，反弹', '会小很多。']),
	L(114, 117, '办法二：', ['别赶它走。']),
	L(117, 120, '', ['让它来，', '让它待一会儿。']),
	// 结尾
	L(120, 123, '现在，', ['你可以想白熊了。']),
	L(123, 126, '', ['它待了一会儿，', '自己就走了。']),
	L(126, 132.5, '越想忘记，越会记得——', ['放过它，', '它才会走。'], 'hook'),
];

// 第 i 个揭示单位落位的时刻：默认每块晚一个十六分
export const chunkTime = (line: Line, i: number) => line.at?.[i] ?? line.t0 + i * E16 + E16;
export const chunks = (s: string) => (s ? s.split('|') : []);

// ———————— 大数字位（上半页左下）————————
export type NumItem = {text: string; tin: number; tout: number};
export const NUMERALS: NumItem[] = [
	{text: '1863', tin: T.y1863, tout: T.quote1},
	{text: '1987', tin: T.lab, tout: T.bell},
	{text: '1994', tin: T.workers, tout: T.workerB},
];

// ———————— 钩子：10 秒里，白熊在画面各处冒出来（不吸附，落在反拍上）————————
// x, y = 方块左上角；s = 边长；snow = 带雪地；walk = 在走
export type Pop = {t: number; x: number; y: number; s: number; snow?: boolean};
export const POPS: Pop[] = [
	{t: 2.375, x: 676, y: 600, s: 150},
	{t: 3.625, x: 132, y: 846, s: 196},
	{t: 4.875, x: 716, y: 1138, s: 132},
	{t: 6.375, x: 380, y: 1196, s: 236, snow: true},
	{t: 7.625, x: 100, y: 1300, s: 120},
	{t: 9.375, x: 772, y: 842, s: 112},
	{t: 10.625, x: 326, y: 798, s: 100},
];

// ———————— 实验：5 分钟（压成 6 秒），1 行 = 1 分钟，每 10 秒一格；铃响的时刻（实验里的秒数，示意）————————
export const GRID = {rows: 5, cols: 6, secPerCell: 10};
// 约 5 分钟 7 次，每分钟至少一次（示意）
export const RINGS = [17, 48, 101, 152, 199, 247, 283];
// 格子升起后播放头才走：42.5 → 48.0
export const gridTime = (sec: number) => T.grid + 0.5 + (sec / 300) * (T.gridEnd - T.grid - 0.5);
// 铃声落在格子变成白熊的那一帧上
export const ringTime = (sec: number) => Math.ceil(gridTime(sec) * FPS - 1e-9) / FPS;

// ———————— 原理：检查员每次打手电（落在拍上，后来变成八分）————————
export const CHECKS: number[] = (() => {
	const c: number[] = [T.reveal + 1, T.reveal + 2];
	for (let k = 0; k < 3; k++) c.push(T.answer + k);
	for (let k = 0; k < 6; k++) c.push(T.onlyB + k * E8);
	for (let k = 0; k < 6; k++) c.push(T.control + k * E8);
	return c;
})();

// ———————— 拟音事件（全部由画面时间推出来）————————
export type Foley = 'clack' | 'tss' | 'snick' | 'slap' | 'slide' | 'thunk' | 'snap' | 'thump' | 'stamp' | 'bell' | 'tick';
export type Ev = {t: number; kind: Foley; gain?: number; dur?: number; note?: number};

export const events = (): Ev[] => {
	const ev: Ev[] = [];
	const add = (t: number, kind: Foley, gain = 1, extra: Partial<Ev> = {}) => ev.push({t, kind, gain, ...extra});

	// 文字：每一块落位一声铅字（导语轻、陈述重）
	for (const line of LINES) {
		const nl = chunks(line.lead).length;
		const all = [...chunks(line.lead), ...line.bold.flatMap(chunks)];
		all.forEach((_, i) => add(chunkTime(line, i), 'clack', i < nl ? 0.3 : 0.5));
	}
	// 大数字：爬四级
	for (const n of NUMERALS) for (let k = 0; k < 4; k++) add(n.tin + (k + 1) * E32, 'thunk', 0.5);

	// 钩子：倒计时每拍一声钟；白熊每冒一次一声铃；时间到盖章；排成一行
	add(0, 'slap', 0.8);
	add(0, 'tick', 0.9);
	for (let k = 0; k <= 10; k++) add(T.count0 + k, 'tick', k === 10 ? 1.1 : 0.8);
	for (const p of POPS) add(p.t, 'bell', 0.9);
	add(T.countEnd, 'stamp', 0.9);
	POPS.forEach((_, i) => add(T.reflow + i * E32 * 0.5 + E8, 'snap', 0.35));
	add(T.title, 'snick', 0.9);
	add(T.title + E16, 'slap', 0.7);
	// 起源：书页摊开，那句话被标出来，白熊从字里冒出来
	add(T.y1863 - E16, 'snick', 0.7);
	add(T.notebook, 'slap', 0.8);
	add(T.quote1 + E8, 'tss', 0.6, {dur: E8});
	for (let k = 0; k < 3; k++) add(T.quote2 + E16 + k, 'bell', 0.7);
	// 实验：桌上的录音机和铃；按铃；5 分钟的格子；对比
	add(T.lab, 'slap', 0.7);
	add(T.rule + E8, 'snick', 0.8);
	add(T.bell + E8, 'bell', 1);
	add(T.grid, 'slap', 0.7);
	for (const s of RINGS) add(ringTime(s), 'bell', 0.75);
	add(T.rebound + E8, 'slide', 0.5, {dur: E8});
	add(T.name + E8, 'stamp', 0.8);
	// 原理：脑子暗下来；两个人走进来；举起想法卡；打手电（每次都有一声铃）
	add(T.why - E16, 'slide', 0.8, {dur: E16});
	for (let k = 0; k < 4; k++) add(T.workers + E8 + k * E8, 'slap', 0.25);
	for (let k = 0; k < 3; k++) add(T.workerA + E16 + k, 'snap', 0.6);
	for (const c of CHECKS) {
		add(c - E32, 'tss', 0.35, {dur: E32});
		add(c, 'bell', c >= T.onlyB ? 0.55 : 0.8);
	}
	add(T.tired + E8, 'thump', 0.7);
	add(T.anything, 'slide', 0.7, {dur: E8});
	// 生活里：三幅小图，最后收成一只白熊
	for (const t of [T.sleep, T.person, T.cake]) {
		add(t + E16, 'slap', 0.6);
		add(t + E8 + E16, 'bell', 0.7);
	}
	add(T.notYou + E8, 'snap', 0.7);
	// 办法：汽车开进来；反弹变小；不再推它；它躺下
	for (let k = 0; k < 3; k++) add(T.car + E8 + k * E8, 'slap', 0.3);
	add(T.smaller + E8, 'slide', 0.5, {dur: E8});
	add(T.method2 + 1, 'thump', 0.5);
	add(T.method2 + 2, 'snap', 0.7);
	add(T.stay + E8, 'thump', 0.4);
	// 结尾：它站起来，走出画面；最后一声铃
	add(T.leave + E8, 'snap', 0.5);
	add(T.golden, 'snick', 0.6);
	add(T.stop, 'bell', 0.8);
	return ev.sort((a, b) => a.t - b.t);
};
