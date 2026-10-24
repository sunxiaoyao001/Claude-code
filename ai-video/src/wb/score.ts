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
	countEnd: 11.0, // 0：时间到，全部定住
	reflow: 11.5, // 到处乱冒的白熊飞回去，拼成一只大白熊
	// 片名
	title: 14.0,
	// 01 起源：1863
	y1863: 18.0, // 烛光下写字的人，窗外下雪
	zoomPaper: 21.0, // 镜头扎进桌上那张纸
	notebook: 21.0,
	highlight: 23.0, // "белого медведя" 被标成群青
	zoomBlue: 24.0, // 镜头扎进那块群青，整屏变蓝
	quote1: 24.0,
	quote2: 27.0,
	// 02 实验：1987
	later: 30.0,
	lab: 33.0,
	rule: 36.0,
	bell: 39.0,
	grid: 42.0, // 5 分钟压成 5.5 秒
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
	// 04 生活里（夜里，各有一盏灯）
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

// ———————— 唯一的缓动曲线 cubic-bezier(.7, 0, .2, 1)（画面和声音共用）————————
const cubicBezier = (x1: number, y1: number, x2: number, y2: number) => {
	const bx = (u: number) => 3 * (1 - u) * (1 - u) * u * x1 + 3 * (1 - u) * u * u * x2 + u * u * u;
	const by = (u: number) => 3 * (1 - u) * (1 - u) * u * y1 + 3 * (1 - u) * u * u * y2 + u * u * u;
	return (t: number) => {
		if (t <= 0) return 0;
		if (t >= 1) return 1;
		let lo = 0;
		let hi = 1;
		let u = t;
		for (let i = 0; i < 30; i++) {
			const x = bx(u);
			if (Math.abs(x - t) < 1e-6) break;
			if (x < t) lo = u;
			else hi = u;
			u = (lo + hi) / 2;
		}
		return by(u);
	};
};
export const ease = cubicBezier(0.7, 0, 0.2, 1);
const easeTo = (t: number, t1: number, d: number) => ease(Math.max(0, Math.min(1, (t - (t1 - d)) / d)));

// ———————— 屏幕上的话（每屏一句，不超过 20 字）————————
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

export const chunkTime = (line: Line, i: number) => line.at?.[i] ?? line.t0 + i * E16 + E16;
export const chunks = (s: string) => (s ? s.split('|') : []);

// ———————— 背景：整屏的纸、夜、群青（文字颜色跟着它走）————————
export type Ground = 'page' | 'night' | 'blue';
export const GROUNDS: [number, Ground][] = [
	[0, 'page'],
	[T.y1863, 'night'],
	[T.notebook, 'page'],
	[T.zoomBlue, 'blue'],
	[T.later, 'page'],
	[T.why, 'night'],
	[T.how, 'page'],
	[T.now, 'blue'],
	[T.golden, 'page'],
];
export const groundAt = (t: number): Ground => {
	let g: Ground = 'page';
	for (const [t0, k] of GROUNDS) if (t >= t0) g = k;
	return g;
};

// ———————— 大数字位（上半页左下）————————
export type NumItem = {text: string; tin: number; tout: number};
export const NUMERALS: NumItem[] = [
	{text: '1863', tin: T.y1863, tout: T.zoomPaper - E8},
	{text: '1987', tin: T.lab, tout: T.bell},
	{text: '1994', tin: T.workers, tout: T.workerB},
];

// ———————— 种子随机数（画面和声音得到同一串数）————————
const rng = (seed: number) => () => {
	seed |= 0;
	seed = (seed + 0x6d2b79f5) | 0;
	let r = Math.imul(seed ^ (seed >>> 15), 1 | seed);
	r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
	return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
};

// ———————— 白熊的剪影（站立）：给"马赛克大白熊"取格子用 ————————
// 熊的坐标：身长 100（尾 −50 … 鼻 +53），地面 y = 0，向上为负
const BODY_SEGS: [number, number][][] = [
	[[-44, -44], [-40, -52], [-30, -55], [-18, -54]],
	[[-18, -54], [-2, -53], [10, -52], [20, -50]],
	[[20, -50], [27, -49], [31, -47], [35, -45]],
	[[35, -45], [38, -47], [42, -47], [45, -45]],
	[[45, -45], [48, -43], [51, -40], [53, -38]],
	[[53, -38], [54, -36], [52, -34], [49, -34]],
	[[49, -34], [45, -33], [41, -33], [38, -32]],
	[[38, -32], [34, -31], [31, -28], [28, -25]],
	[[28, -25], [26, -20], [22, -18], [16, -18]],
	[[16, -18], [-6, -18], [-6, -18], [-28, -18]],
	[[-28, -18], [-36, -18], [-44, -22], [-47, -30]],
	[[-47, -30], [-49, -36], [-48, -41], [-44, -44]],
];
const BODY_POLY: [number, number][] = BODY_SEGS.flatMap(([p0, p1, p2, p3]) =>
	Array.from({length: 8}, (_, i) => {
		const u = i / 8;
		const a = (1 - u) ** 3;
		const b = 3 * (1 - u) ** 2 * u;
		const c = 3 * (1 - u) * u * u;
		const d = u ** 3;
		return [a * p0[0] + b * p1[0] + c * p2[0] + d * p3[0], a * p0[1] + b * p1[1] + c * p2[1] + d * p3[1]] as [number, number];
	}),
);
const insidePoly = (x: number, y: number) => {
	let inside = false;
	for (let i = 0, j = BODY_POLY.length - 1; i < BODY_POLY.length; j = i++) {
		const [xi, yi] = BODY_POLY[i];
		const [xj, yj] = BODY_POLY[j];
		if (yi > y !== yj > y && x < xi + ((y - yi) * (xj - xi)) / (yj - yi)) inside = !inside;
	}
	return inside;
};
const inBear = (x: number, y: number) => insidePoly(x, y) || (((x >= -39 && x <= -23) || (x >= 11 && x <= 27)) && y >= -26 && y <= 0);

// 马赛克：每格 52 px，熊身长约 886 px，脚落在 y = 1440
export const MOSAIC = {cell: 52, k: 8.6, ground: 1440, cx: 540};
export const MOSAIC_CELLS: {x: number; y: number; d: number}[] = (() => {
	const cells: {x: number; y: number; d: number}[] = [];
	const x0 = MOSAIC.cx - 1.5 * MOSAIC.k;
	for (let c = -12; c <= 12; c++)
		for (let r = 1; r <= 13; r++) {
			const cx = MOSAIC.cx + c * MOSAIC.cell;
			const cy = MOSAIC.ground - (r - 0.5) * MOSAIC.cell;
			if (inBear((cx - x0) / MOSAIC.k, (cy - MOSAIC.ground) / MOSAIC.k)) cells.push({x: cx - MOSAIC.cell / 2, y: cy - MOSAIC.cell / 2, d: Math.hypot(cx - 560, cy - 1180)});
		}
	return cells;
})();

// ———————— 钩子：10 秒里白熊越冒越多（每格一只，越往后越密）————————
// 落在三十二分音符上（不在拍上：它是例外）
export type Pop = {t: number; x: number; y: number; s: number; cell: number};
export const POPS: Pop[] = (() => {
	const r = rng(1863);
	const n = MOSAIC_CELLS.length;
	const order = Array.from({length: n}, (_, i) => i);
	for (let i = n - 1; i > 0; i--) {
		const j = Math.floor(r() * (i + 1));
		[order[i], order[j]] = [order[j], order[i]];
	}
	const out: Pop[] = [];
	for (let i = 0; i < n; i++) {
		const u = (i + 1) / n;
		const t = Math.round((2.25 + 8.6 * Math.pow(u, 0.55)) / E32) * E32;
		const s = Math.round(i < 6 ? 150 + r() * 110 : i < 24 ? 90 + r() * 90 : 46 + r() * 70);
		// 只在舞台里冒（上面那句话不许挡）
		const x = 24 + r() * (1080 - 48 - s);
		const y = (i < 6 ? 700 : 646) + r() * (1540 - (i < 6 ? 700 : 646) - s);
		out.push({t, x: Math.round(x), y: Math.round(y), s, cell: order[i]});
	}
	return out;
})();

// ———————— 实验：5 分钟（压成 5.5 秒），1 行 = 1 分钟，1 格 = 1 秒 ————————
export const GRID = {rows: 5, cols: 60};
// 约 5 分钟 7 次，每分钟至少一次（示意）
export const RINGS = [17, 48, 101, 152, 199, 247, 283];
export const gridTime = (sec: number) => T.grid + 0.5 + (sec / 300) * (T.gridEnd - T.grid - 0.5);
// 铃声落在那一格变色的那一帧上
export const ringTime = (sec: number) => Math.ceil(gridTime(sec) * FPS - 1e-9) / FPS;
export const PER_MIN = [0, 1, 2, 3, 4].map((m) => RINGS.filter((s) => Math.floor(s / 60) === m).length);

// ———————— 原理：检查员每次打手电（落在拍上，后来越来越快）————————
export const CHECKS: number[] = (() => {
	const c: number[] = [T.reveal + 1, T.reveal + 2];
	for (let k = 0; k < 3; k++) c.push(T.answer + k);
	for (let k = 0; k < 6; k++) c.push(T.onlyB + k * E8);
	for (let k = 0; k < 10; k++) c.push(T.control + k * E16);
	return c;
})();
// 脑子被白熊塞满：17 × 16 的小方块，从手电最后照到的地方一圈圈铺开
export const SWARM = {cols: 17, rows: 16, s: 56, x0: 64, y0: 640, from: [700, 1000] as [number, number], t0: T.control + 2.5};
export const swarmTime = (c: number, r: number) => {
	const x = SWARM.x0 + c * SWARM.s + SWARM.s / 2;
	const y = SWARM.y0 + r * SWARM.s + SWARM.s / 2;
	return SWARM.t0 + Math.round((Math.hypot(x - SWARM.from[0], y - SWARM.from[1]) / 1100) * 1.25 * 24) / 24;
};
// 然后沿对角线一波一波换成别的念头
export const morphTime = (c: number, r: number) => T.anything + E8 + Math.round(((c + r) / (SWARM.cols + SWARM.rows)) * 1.5 * 24) / 24;

// ———————— 画面里要和声音对上的时刻 ————————
// 时间尺：1863 → 1987，缓动着飞过去；每过一个整十年"嗒"一下
export const RULER = {fly0: T.later + E8, fly1: T.later + 2.5, y0: 1863, y1: 1987};
export const yearAt = (t: number) => RULER.y0 + (RULER.y1 - RULER.y0) * easeTo(t, RULER.fly1, RULER.fly1 - RULER.fly0);
const decadeTimes = () => {
	const out: number[] = [];
	for (let dec = 1870; dec <= 1980; dec += 10) {
		let lo = RULER.fly0;
		let hi = RULER.fly1;
		for (let i = 0; i < 40; i++) {
			const mid = (lo + hi) / 2;
			if (yearAt(mid) < dec) lo = mid;
			else hi = mid;
		}
		out.push(Math.round(hi * FPS) / FPS);
	}
	return out;
};
// 实验室：一想到白熊就按铃
export const PRESSES = [T.bell + E8, T.bell + 2 + E8];
// 反弹：两管白熊一只只落下（先忍过的那一管落得快）
export const TUBE_N = [16, 10];
const TUBE_EVERY = [E32, 0.2];
export const dropTime = (tube: number, k: number) => Math.round((T.rebound + E8 + k * TUBE_EVERY[tube]) * FPS) / FPS;
export const LID_UP = T.rebound + E16;
// 弹簧：压板落下、往下压两次、松手弹起
export const SPRING = {land: T.why + E16, presses: [T.why + 0.75, T.why + 1.25], launch: T.why + 2, apex: T.why + 2.5, settle: T.why + 2.75};
// 屏保一样的白熊：45° 匀速反弹；每段路都是三十二分音符的整数倍，撞墙都落在格子上
export const BOUNCE_BOX = {x0: 66, y0: 650, x1: 1016, y1: 1520, s: 150, speed: 640, t0: T.how + E16};
export const BOUNCE: [number, number][] = (() => {
	const b = BOUNCE_BOX;
	const out: [number, number][] = [[b.x0, 730]];
	let [x, y] = out[0];
	let dx = 1;
	let dy = 1;
	for (let i = 0; i < 6; i++) {
		const tx = dx > 0 ? b.x1 - b.s - x : x - b.x0;
		const ty = dy > 0 ? b.y1 - b.s - y : y - b.y0;
		const d = Math.min(tx, ty);
		x += dx * d;
		y += dy * d;
		out.push([x, y]);
		if (tx <= ty) dx = -dx;
		if (ty <= tx) dy = -dy;
	}
	return out;
})();
export const BOUNCE_HITS: number[] = (() => {
	const out: number[] = [];
	let acc = BOUNCE_BOX.t0;
	for (let i = 1; i < BOUNCE.length - 1; i++) {
		acc += Math.abs(BOUNCE[i][0] - BOUNCE[i - 1][0]) / BOUNCE_BOX.speed;
		if (acc < T.method1) out.push(acc);
	}
	return out;
})();
// 替身：小汽车从左开到右，车头经过白熊时把它换掉
export const DRIVE = {t0: T.car + 0.75, t1: T.car + 2.5, len: 330, from: -30, to: 1110 + 330};
export const CAR_BEARS = [
	{x: 285, t0: T.car + E8},
	{x: 810, t0: T.car + 1 + E8},
].map((b) => ({...b, hit: DRIVE.t0 + ((b.x - DRIVE.from) / (DRIVE.to - DRIVE.from)) * (DRIVE.t1 - DRIVE.t0)}));
// 反弹小了很多：两行白熊一格格亮起来
export const ROWS_N = [16, 11];
export const rowDrop = (r: number, k: number) => Math.round((T.smaller + E8 + k * E32 + r * E16) * FPS) / FPS;
// 办法二：推开 → 它滑回来 → 落回原地
export const PUSH = T.method2 + 0.625;
export const BACK = T.method2 + 1.5;
export const LAND = T.method2 + 2;
// 尾声：站起来，走出去
export const RISE = T.leave + E8;
export const WALK0 = T.leave + 1;
// 柱状图：七只白熊飞过去
export const FLY = T.gridEnd + E8 + E16;

// ———————— 拟音事件（全部由画面时间推出来）————————
export type Foley = 'clack' | 'tss' | 'snick' | 'slap' | 'slide' | 'thunk' | 'snap' | 'thump' | 'stamp' | 'bell' | 'tick' | 'tink' | 'whoosh';
export type Ev = {t: number; kind: Foley; gain?: number; dur?: number; note?: number};

export const events = (): Ev[] => {
	const ev: Ev[] = [];
	const add = (t: number, kind: Foley, gain = 1, extra: Partial<Ev> = {}) => ev.push({t, kind, gain, ...extra});

	// 文字：每一块落位一声铅字（导语轻、陈述重）
	for (const line of LINES) {
		const nl = chunks(line.lead).length;
		const all = [...chunks(line.lead), ...line.bold.flatMap(chunks)];
		all.forEach((_, i) => add(chunkTime(line, i), 'clack', i < nl ? 0.28 : 0.45));
	}
	for (const n of NUMERALS) for (let k = 0; k < 4; k++) add(n.tin + (k + 1) * E32 - E16, 'thunk', 0.45);

	// 钩子：钟每拍一声；倒计时每换一个数字，刀片切过；白熊每冒一次：前几只是桌铃，后面变成越来越密的钟琴
	add(0, 'tick', 0.9);
	for (let k = 0; k <= 10; k++) {
		add(T.count0 + k, 'tick', k === 10 ? 1.1 : 0.8);
		if (k > 0) add(T.count0 + k - E32, 'snick', 0.35);
	}
	POPS.forEach((p, i) => (i < 6 ? add(p.t, 'bell', 0.85) : add(p.t, 'tink', Math.max(0.25, 0.8 - i * 0.006), {note: i})));
	add(T.countEnd, 'stamp', 1);
	add(T.reflow + E16, 'whoosh', 0.8, {dur: 1.0});
	add(T.reflow + 1.25, 'thump', 0.7);
	add(T.title, 'slap', 0.7);
	// 起源：火柴一划，烛光张开；写字沙沙；镜头扎进纸里；字一行行落定；标出那两个词；扎进群青；巨熊的脚步；秒表
	add(T.y1863 - E16, 'slide', 0.6, {dur: E16});
	add(T.y1863 + E16, 'snap', 0.7);
	for (let k = 0; k < 4; k++) add(T.y1863 + 0.5 + k * E8, 'tss', 0.16, {dur: E32});
	add(T.zoomPaper - E8, 'whoosh', 0.7, {dur: E8});
	for (let i = 0; i < 6; i++) add(T.notebook + E8 + E16 + i * E16, 'clack', 0.3);
	add(T.highlight, 'tss', 0.6, {dur: E8});
	add(T.zoomBlue - E8, 'whoosh', 0.8, {dur: E8});
	add(T.quote1 + E16, 'thump', 0.5);
	for (let k = 0; k < 5; k++) add(T.quote1 + E16 + (k + 1) * E8, 'thump', 0.2);
	add(T.quote2 - E16, 'snick', 0.6);
	add(T.quote2, 'tss', 0.35, {dur: E8});
	for (let k = 0; k < 5; k++) add(T.quote2 + E8 + E8 + k * E8, 'tick', 0.3);
	for (let k = 0; k < 3; k++) add(T.quote2 + E8 + k, 'bell', 0.75);
	// 实验：时间尺一路飞过去（每过十年一声），到站盖章；实验室：门关上；说话；规则；按铃
	add(T.later - E16, 'slide', 0.5, {dur: E16});
	add(RULER.fly0, 'whoosh', 0.8, {dur: 2.0});
	for (const d of decadeTimes()) add(d, 'tick', 0.45);
	add(RULER.fly1, 'stamp', 0.7);
	add(T.lab, 'snick', 0.6);
	add(T.lab + E8, 'slap', 0.6);
	add(T.lab + 1, 'thump', 0.7);
	for (const s of [T.lab + 2, T.rule, T.rule + 1, T.rule + 2, T.bell + 1]) add(s, 'tss', 0.2, {dur: E32});
	add(T.rule + E8, 'slap', 0.7);
	add(T.rule + E8 + E16, 'snick', 0.8);
	PRESSES.forEach((p, i) => {
		add(p - E8 + E16, 'tink', 0.5, {note: 7 + i});
		add(p, 'bell', 1);
	});
	// 5 分钟：格子立起来；铃；收掉；七只白熊飞成柱状图；虚线
	add(T.grid, 'snick', 0.6);
	add(T.grid + E16, 'slide', 0.4, {dur: 0.375});
	for (const s of RINGS) add(ringTime(s), 'bell', 0.7);
	add(T.gridEnd + E8, 'slide', 0.5, {dur: 0.5});
	RINGS.forEach((_, i) => add(FLY + i * E32, 'tink', 0.45, {note: 10 + i}));
	PER_MIN.forEach((_, m) => add(FLY + 1 + m * E32, 'snap', 0.45));
	add(T.gridEnd + 1.5, 'tss', 0.4, {dur: E8});
	// 反弹：两根管子；盖子压下去；盖子被顶飞；白熊一只只落下；括号盖章
	add(T.stranger, 'snick', 0.6);
	add(T.stranger + E8, 'slap', 0.5);
	add(T.stranger + E8 + E8 + E16, 'thump', 0.6);
	add(LID_UP, 'whoosh', 0.7, {dur: E16});
	add(LID_UP + E16, 'snap', 0.6);
	for (let k = 0; k < TUBE_N[0]; k++) add(dropTime(0, k), 'tink', 0.32, {note: 20 + k});
	for (let k = 0; k < TUBE_N[1]; k++) add(dropTime(1, k), 'tink', 0.26, {note: k});
	add(T.name + E8, 'stamp', 0.8);
	// 原理：压板落下、压两下、松手弹起；两个人走进来；卡片翻；手电扫；检查（铃）；塞满；换念头
	add(T.why - E16, 'slide', 0.8, {dur: E16});
	add(SPRING.land, 'thump', 0.6);
	SPRING.presses.forEach((p) => add(p, 'thunk', 0.55));
	add(SPRING.launch, 'whoosh', 0.7, {dur: E8});
	add(SPRING.apex, 'tink', 0.6, {note: 9});
	add(SPRING.settle, 'thump', 0.3);
	add(T.workers, 'snick', 0.6);
	for (let k = 0; k < 2; k++) add(T.workers + E16 + (k + 1) * E8, 'slap', 0.25);
	add(T.workerA + E16, 'slap', 0.5);
	for (let k = 1; k <= 11; k++) add(T.workerA + k, 'snap', 0.4);
	add(T.workerB + E8 + E16, 'tss', 0.4, {dur: E16});
	for (const s of [T.workerB + 1 + E8, T.workerB + 2 + E8, T.reveal + E8]) add(s - E8, 'whoosh', 0.3, {dur: E8});
	add(T.reveal + E16, 'slap', 0.4);
	CHECKS.forEach((c, i) => {
		add(c - E32, 'tss', 0.3, {dur: E32});
		if (c < T.control) add(c, 'bell', c >= T.onlyB ? 0.5 : 0.8);
		else add(c, 'tink', 0.6, {note: 30 + i});
	});
	add(T.tired + E8, 'snick', 0.5);
	add(T.tired + E8 + E16, 'thump', 0.7);
	add(SWARM.t0, 'whoosh', 0.7, {dur: 1.25});
	add(T.anything + E8, 'whoosh', 0.5, {dur: 1.5});
	// 生活里：每一幕一束光亮起来，一个念头冒出来
	add(T.sleep, 'snick', 0.6);
	for (const t of [T.sleep, T.person, T.cake]) {
		add(t + E8, 'snap', 0.6);
		add(t + E8 + E16, 'bell', 0.65);
	}
	for (let k = 1; k < 3; k++) {
		add(T.sleep + k, 'tick', 0.45);
		add(T.sleep + k + E8 - E16, 'slide', 0.25, {dur: E16});
	}
	for (const t of [T.person, T.cake, T.notYou]) add(t, 'snick', 0.5);
	add(T.cake + E8, 'thunk', 0.5);
	add(T.notYou + E16, 'tss', 0.35, {dur: 0.75});
	add(T.notYou + 1 + E8, 'tss', 0.4, {dur: E16});
	add(T.notYou + 1 + E8 + E16, 'bell', 0.5);
	// 办法：屏保一样来回弹；替身；小汽车开过去；反弹变小；推开、它又回来；趴下
	add(T.how - E16, 'slide', 0.6, {dur: E16});
	add(BOUNCE_BOX.t0, 'tink', 0.5, {note: 5});
	for (const h of BOUNCE_HITS) add(h, 'bell', 0.45);
	add(T.method1, 'snick', 0.6);
	add(T.method1 + E8, 'bell', 0.5);
	add(T.method1 + 1 - E16, 'tss', 0.4, {dur: E16});
	add(T.method1 + 1 + E8, 'snap', 0.7);
	add(T.car, 'snick', 0.6);
	add(T.car + E16, 'slide', 0.3, {dur: E16});
	add(DRIVE.t0, 'whoosh', 0.7, {dur: DRIVE.t1 - DRIVE.t0});
	for (const b of CAR_BEARS) {
		add(b.t0, 'bell', 0.5);
		add(b.hit, 'snick', 0.7);
		add(b.hit + E16, 'snap', 0.4);
	}
	add(T.smaller, 'snick', 0.6);
	ROWS_N.forEach((n, r) => {
		for (let k = 0; k < n; k++) add(rowDrop(r, k), 'tink', 0.28, {note: r * 20 + k});
	});
	add(T.smaller + 2 + E16, 'stamp', 0.5);
	add(T.method2, 'snick', 0.6);
	add(PUSH, 'slide', 0.5, {dur: E8});
	add(BACK, 'slide', 0.5, {dur: E8});
	add(LAND, 'snap', 0.7);
	add(T.stay + E8, 'thump', 0.4);
	add(T.stay + 1 - E8, 'tss', 0.3, {dur: E8});
	// 尾声：整屏群青，它趴着；站起来；走远（脚步越来越轻）；刀切回纸面；空格子；最后一声铃
	add(T.now - E16, 'slide', 0.6, {dur: E16});
	add(T.now + E8, 'thump', 0.4);
	add(RISE, 'snap', 0.5);
	for (let k = 0; k < 4; k++) add(WALK0 + (k + 1) * E8, 'thump', 0.3 - k * 0.06);
	add(T.golden, 'snick', 0.8);
	add(T.golden + E8, 'whoosh', 0.35, {dur: 0.75});
	add(T.stop, 'bell', 0.85);
	add(T.stop + E8, 'clack', 0.25);
	return ev.sort((a, b) => a.t - b.t);
};
