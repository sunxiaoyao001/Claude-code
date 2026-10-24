// 工具箱：整屏的底（纸 / 夜 / 群青）和它们之间的擦除、镜头、夜的遮罩、裁切标记、开缝入场、翻牌。
import {E16, E32, groundAt, GROUNDS, T} from '../score';
import {C, collapse, FAMILY, knifeLine, lerp, lin, snap, THEMES, type Theme} from '../sys';

export type Pt = [number, number];
export const pts = (poly: Pt[]) => poly.map((p) => p.join(',')).join(' ');

// 舞台：上面那句话以下的整片区域（左右出血）
export const STAGE = {y0: 640, y1: 1552, cx: 540, cy: 1096};

// ———————— 整屏的底 ————————
// 每次换底的方式：down = 从上往下擦，up = 从下往上擦，cut = 直接切（前面已经被镜头"扎"满了），knife = 一道刀线后塌掉
const HOW: Record<number, 'down' | 'up' | 'cut' | 'knife'> = {
	[T.y1863]: 'down',
	[T.notebook]: 'cut',
	[T.zoomBlue]: 'cut',
	[T.later]: 'up',
	[T.why]: 'down',
	[T.how]: 'up',
	[T.now]: 'down',
	[T.golden]: 'knife',
};
export const Background: React.FC<{t: number}> = ({t}) => <rect width={1080} height={1920} fill={THEMES[groundAt(t)].bg} />;

// 换底：新的底擦进来时盖住旧的画面（画在场景之上、文字之下）；刀切时旧的底连同上面的东西一起塌向中线
export const Cover: React.FC<{t: number}> = ({t}) => {
	const out: React.ReactNode[] = [];
	// 正在进来的那一块（提前一个十六分开始擦）
	const next = GROUNDS.find(([t0]) => t0 > t && t >= t0 - E16);
	if (next) {
		const [t0, g] = next;
		const how = HOW[t0] ?? 'down';
		const p = snap(t, t0, E16);
		if (how === 'down') out.push(<rect key="in" width={1080} height={1920 * p} fill={THEMES[g].bg} />);
		if (how === 'up') out.push(<rect key="in" y={1920 * (1 - p)} width={1080} height={1920 * p} fill={THEMES[g].bg} />);
	}
	const kn = GROUNDS.find(([t0]) => HOW[t0] === 'knife' && knifeLine(t, t0) > 0);
	if (kn) {
		const idx = GROUNDS.indexOf(kn);
		out.push(<rect key="line" x={0} y={959} width={1080 * knifeLine(t, kn[0])} height={2} fill={THEMES[GROUNDS[idx - 1][1]].ink} />);
	}
	return <g>{out}</g>;
};
// 刀切换底时，旧的底（场景自己负责把上面的东西一起塌掉）
export const KnifePlate: React.FC<{t: number}> = ({t}) => {
	const last = [...GROUNDS].reverse().find(([t0]) => t0 <= t && t < t0 + E16 && HOW[t0] === 'knife');
	if (!last) return null;
	const prev = GROUNDS[GROUNDS.indexOf(last) - 1][1];
	const k = Math.max(1e-4, collapse(t, last[0]));
	return <rect y={960 - 960 * k} width={1080} height={1920 * k} fill={THEMES[prev].bg} />;
};

// ———————— 镜头：world 点 (wx, wy) 放到屏幕 (sx, sy)，缩放 s ————————
export const cam = (wx: number, wy: number, sx: number, sy: number, s: number) => `matrix(${s} 0 0 ${s} ${sx - wx * s} ${sy - wy * s})`;
// 对数插值的缩放（扎进去的时候速度均匀）
export const zoomS = (p: number, s0: number, s1: number) => Math.exp(lerp(Math.log(s0), Math.log(s1), p));

// ———————— 夜：一张墨色遮罩，光是挖掉的多边形 ————————
export const Dark: React.FC<{id: string; holes: Pt[][]; circles?: [number, number, number][]; x?: number; y?: number; w?: number; h?: number; color?: string}> = ({
	id,
	holes,
	circles = [],
	x = 0,
	y = 0,
	w = 1080,
	h = 1920,
	color = C.night,
}) => (
	<g>
		<defs>
			<mask id={id} maskUnits="userSpaceOnUse" x={0} y={0} width={1080} height={1920}>
				<rect width={1080} height={1920} fill="white" />
				{holes.map((p, i) => (
					<polygon key={i} points={pts(p)} fill="black" />
				))}
				{circles.map(([cx, cy, r], i) => (
					<circle key={`c${i}`} cx={cx} cy={cy} r={r} fill="black" />
				))}
			</mask>
		</defs>
		<rect x={x} y={y} width={w} height={h} fill={color} mask={`url(#${id})`} />
	</g>
);

// ———————— 裁切标记：舞台四角的十字，左上角一个图号（印刷品的细节）————————
export const CropMarks: React.FC<{t: number; tin: number; tout: number; label: string; theme: Theme; y0?: number; y1?: number}> = ({t, tin, tout, label, theme, y0 = STAGE.y0, y1 = STAGE.y1}) => {
	if (t < tin - E16 || t > tout) return null;
	const p = lin(t, tin - E16, tin + E16) * (1 - snap(t, tout, E16));
	const L = 28 * p;
	const corners: Pt[] = [
		[40, y0],
		[1040, y0],
		[40, y1],
		[1040, y1],
	];
	return (
		<g fill={theme.rule}>
			{corners.map(([x, y], i) => (
				<g key={i}>
					<rect x={x - L / 2} y={y} width={L} height={1} />
					<rect x={x} y={y - L / 2} width={1} height={L} />
				</g>
			))}
			{p > 0.5 ? (
				<text x={56} y={y0 + 26} fontFamily={FAMILY} fontSize={17} fontWeight={600} fill={theme.lead} style={{letterSpacing: '0.04em'}}>
					{label}
				</text>
			) : null}
		</g>
	);
};

// ———————— 开缝入场：一道细线，然后从中线向上下打开（刀切的反向）————————
export const Slit: React.FC<{x: number; y: number; w: number; h: number; t: number; t0: number; d?: number; line?: string; children: React.ReactNode}> = ({x, y, w, h, t, t0, d = E32, line = C.ink, children}) => {
	if (t < t0 - d) return null;
	const p = snap(t, t0, d);
	const k = Math.max(1e-4, p);
	const mid = y + h / 2;
	return (
		<g>
			<g transform={k < 1 ? `translate(0 ${mid}) scale(1 ${k}) translate(0 ${-mid})` : undefined}>{children}</g>
			{p < 1 ? <rect x={x - 6} y={mid - 1} width={w + 12} height={2} fill={line} /> : null}
		</g>
	);
};

// ———————— 翻牌：沿竖轴压扁到 0、换内容、再展开 ————————
export const flipScale = (t: number, t0: number, d = E16) => {
	if (t < t0 - d || t >= t0 + d) return {k: 1, after: t >= t0};
	const a = snap(t, t0, d);
	const b = snap(t, t0 + d, d);
	return t < t0 ? {k: Math.max(1e-4, 1 - a), after: false} : {k: Math.max(1e-4, b), after: true};
};
export const FlipX: React.FC<{cx: number; k: number; children: React.ReactNode}> = ({cx, k, children}) => (
	<g transform={k < 1 ? `translate(${cx} 0) scale(${k} 1) translate(${-cx} 0)` : undefined}>{children}</g>
);

// 集合：一组元素按距离错开塌缩（涟漪式删除）
export const rippleK = (t: number, t0: number, dist: number, maxDist: number, spread = 0.5) => Math.max(1e-4, collapse(t, t0 + (dist / maxDist) * spread));

// 一幕的刀切退场：tk 前一道横向刀线划过，tk 之后整幕塌向这条线
export const Knife: React.FC<{t: number; tk: number; mid: number; line?: string; children: React.ReactNode}> = ({t, tk, mid, line = C.ink, children}) => {
	if (t >= tk + E16) return null;
	const k = Math.max(1e-4, collapse(t, tk));
	const kl = knifeLine(t, tk);
	return (
		<g>
			<g transform={k < 1 ? `translate(0 ${mid}) scale(1 ${k}) translate(0 ${-mid})` : undefined}>{children}</g>
			{kl > 0 ? <rect x={0} y={mid - 1} width={1080 * kl} height={2} fill={line} /> : null}
		</g>
	);
};
