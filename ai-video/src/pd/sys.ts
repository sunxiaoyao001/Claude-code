// 《囚徒困境》视觉系统：色板、网格、字体、两条曲线。
import {E8} from './score';

export const W = 1080;
export const H = 1920;

// 纸、墨、三档浅灰、一个信号色（囚服橙）。没有渐变、阴影、颗粒。
export const C = {
	page: '#F2F0EA',
	paper: '#FFFFFF',
	ink: '#141414',
	signal: '#FF5A00',
	gridPage: '#E6E3DC', // 页面上的网格
	gridPaper: '#E4E1DA', // 纸面上的网格
	voice2: '#D3CFC6', // 第二声部（B 的刑期）
	under: '#EEEBE4', // 纸上的浅灰底衬
	mute: '#7C786F', // 注释文字
	b: '#8F8B82', // B 的数字
};

export const FAMILY = '"Inter Tight", "Noto Sans SC", sans-serif';

// 画面网格：6 栏 × 124，栏距 24，左边距 72（右侧留 144 给抖音的按钮），基线 24
export const FM = 72;
export const FG = 24;
export const FCW = 124;
export const fx = (i: number) => FM + i * (FCW + FG);
export const RIGHT = fx(5) + FCW; // 936

// ≥ 90 px 时字距 −2%
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

// 吸附：t1 时刻落位，提前 d 秒起步
export const snap = (t: number, t1: number, d = E8) => E(seg(t, t1 - d, t1));
// 线性（画线、"例外"）
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
		const [t1, v1, d = E8] = keys[i];
		if (t < t1 - d) break;
		const p = snap(t, t1, d);
		v = v1.map((x, j) => lerp(v[j], x, p));
		if (p < 1) break;
	}
	return v;
};

// 删除 = 刀切：刀线在 [tk − 十六分, tk] 内划过，元素在 [tk, tk + 八分] 内塌向中线
export const knifeLine = (t: number, tk: number) => (t >= tk - 0.125 && t < tk + E8 ? lin(t, tk - 0.125, tk) : 0);
export const collapse = (t: number, tk: number) => 1 - snap(t, tk + E8, E8);

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
// 光学齐左：减去第一个字形的左侧空白
export const leftBearing = (text: string, size: number, weight: number) => -measure(Array.from(text)[0] ?? '', size, weight).actualBoundingBoxLeft;
