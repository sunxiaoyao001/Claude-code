// 《白熊效应》视觉系统：冷灰的纸、墨、两档浅灰、一个信号色（群青）。
// 群青只给一样东西：那只白熊——一块群青方块，白熊从里面镂空出来。
import {E16} from './score';

export const W = 1080;
export const H = 1920;

export const C = {
	page: '#E9ECEF',
	paper: '#FFFFFF',
	ink: '#0E0F12',
	signal: '#1F3FFF',
	gridPage: '#DCE0E5',
	gridPaper: '#E3E6EA',
	voice2: '#C9CED4', // 第二声部（浅灰块）
	mute: '#6E7480', // 注释文字
	b: '#8A9099', // 另一个人
	night: '#14161A', // 脑子里（暗）
	dim: '#2A2E35', // 暗处的线
};

export const FAMILY = '"Inter Tight", "Noto Sans SC", sans-serif';

// 画面网格：6 栏 × 124，栏距 24，左边距 72（右侧留 144 给抖音的按钮），基线 24
export const FM = 72;
export const FG = 24;
export const FCW = 124;
export const fx = (i: number) => FM + i * (FCW + FG);
export const RIGHT = fx(5) + FCW; // 936
// 下半页的纸（舞台）
export const SHEET = {x0: 72, x1: 936, y0: 768, y1: 1488};

export const tracking = (size: number) => (size >= 90 ? -0.02 * size : 0);

// ———————— 两条曲线：精确缓动 + 线性 ————————
export const clamp = (x: number, a = 0, b = 1) => Math.max(a, Math.min(b, x));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const seg = (t: number, a: number, b: number) => clamp((t - a) / (b - a));

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
export const E = cubicBezier(0.7, 0, 0.2, 1);

// 吸附：t1 时刻落位，提前 d 秒起步（默认一个十六分 = 0.25 秒）
export const snap = (t: number, t1: number, d = E16) => E(seg(t, t1 - d, t1));
export const lin = seg;
// 一格一格：n 级台阶，每级一个精确缓动
export const steps = (t: number, a: number, b: number, n: number) => {
	const p = seg(t, a, b) * n;
	const i = Math.floor(p);
	if (i >= n) return 1;
	return (i + E(p - i)) / n;
};
// 多段吸附轨道：keys = [[到达时刻, 值数组, 时长], ...]
export const track = (keys: [number, number[], number?][]) => (t: number) => {
	let v = keys[0][1];
	for (let i = 1; i < keys.length; i++) {
		const [t1, v1, d = E16] = keys[i];
		if (t < t1 - d) break;
		const p = snap(t, t1, d);
		v = v1.map((x, j) => lerp(v[j], x, p));
		if (p < 1) break;
	}
	return v;
};

// 删除 = 刀切：刀线在 [tk − 三十二分, tk] 内划过，元素在 [tk, tk + 十六分] 内塌向中线
export const KNIFE = 0.125;
export const knifeLine = (t: number, tk: number) => (t >= tk - KNIFE && t < tk + E16 ? lin(t, tk - KNIFE, tk) : 0);
export const collapse = (t: number, tk: number) => 1 - snap(t, tk + E16, E16);

// ———————— 文字测量（canvas，与 SVG 渲染同一字体）————————
let ctx: CanvasRenderingContext2D | null = null;
export const measure = (text: string, size: number, weight: number) => {
	if (!ctx) ctx = document.createElement('canvas').getContext('2d');
	const g = ctx!;
	g.font = `${weight} ${size}px ${FAMILY}`;
	(g as unknown as {letterSpacing: string}).letterSpacing = `${tracking(size)}px`;
	return g.measureText(text);
};
export const textWidth = (text: string, size: number, weight: number) => measure(text, size, weight).width;
export const leftBearing = (text: string, size: number, weight: number) => -measure(Array.from(text)[0] ?? '', size, weight).actualBoundingBoxLeft;
