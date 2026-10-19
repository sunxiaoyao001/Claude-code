// 象形图：网格上构建的小人和道具。圆头、等粗线条、圆头端点、平涂，没有阴影和渐变。
// 小人以髋部为原点，身高 h；dir = 1 面朝右，-1 面朝左。角度 0° = 垂直向下，正值 = 朝面向的方向转。
import {lerp} from '../sys';

export type Pose = {lean: number; tilt: number; aF: [number, number]; aB: [number, number]; lF: [number, number]; lB: [number, number]};

export const POSES = {
	stand: {lean: 0, tilt: 0, aF: [6, 2], aB: [-6, -2], lF: [5, 0], lB: [-5, 0]},
	walkA: {lean: 6, tilt: 0, aF: [32, 55], aB: [-32, -18], lF: [26, 4], lB: [-26, -14]},
	walkB: {lean: 6, tilt: 0, aF: [-28, -14], aB: [30, 52], lF: [-24, -12], lB: [24, 4]},
	point: {lean: 5, tilt: 0, aF: [86, 90], aB: [-10, -4], lF: [10, 0], lB: [-8, 0]},
	silent: {lean: 0, tilt: -4, aF: [70, 205], aB: [-8, -3], lF: [5, 0], lB: [-5, 0]},
	think: {lean: 3, tilt: 8, aF: [48, 192], aB: [-8, -3], lF: [5, 0], lB: [-5, 0]},
	sit: {lean: 2, tilt: 0, aF: [25, 70], aB: [15, 60], lF: [88, 4], lB: [84, 0]},
	slump: {lean: 24, tilt: 24, aF: [18, 24], aB: [8, 14], lF: [88, 4], lB: [84, 0]},
	sitSilent: {lean: 2, tilt: -4, aF: [70, 205], aB: [15, 60], lF: [88, 4], lB: [84, 0]},
	sitPoint: {lean: 6, tilt: 0, aF: [86, 90], aB: [15, 60], lF: [88, 4], lB: [84, 0]},
	shake: {lean: 6, tilt: 0, aF: [58, 78], aB: [-8, -3], lF: [8, 0], lB: [-6, 0]},
	holdUp: {lean: 0, tilt: -6, aF: [165, 178], aB: [-8, -3], lF: [5, 0], lB: [-5, 0]},
	typing: {lean: 14, tilt: 10, aF: [52, 86], aB: [46, 80], lF: [88, 4], lB: [84, 0]},
	// 跑：腾空的两步（髋部用 hipRunning）
	runA: {lean: 14, tilt: 0, aF: [50, 125], aB: [-55, 25], lF: [65, -5], lB: [-28, -95]},
	runB: {lean: 14, tilt: 0, aF: [-55, 25], aB: [50, 125], lF: [-28, -95], lB: [65, -5]},
	// 审讯：俯身，手指着坐着的人
	interrogate: {lean: 16, tilt: 4, aF: [80, 86], aB: [-8, -4], lF: [6, 0], lB: [-8, 0]},
	sitThink: {lean: 6, tilt: 10, aF: [48, 192], aB: [15, 60], lF: [88, 4], lB: [84, 0]},
	// 被探照灯罩住：举起双手（侧面看是一个 V）
	surrender: {lean: -4, tilt: -8, aF: [145, 168], aB: [-145, -168], lF: [6, 0], lB: [-6, 0]},
	// 领奖台上：双手举过头
	cheer: {lean: 0, tilt: -6, aF: [150, 165], aB: [-150, -165], lF: [5, 0], lB: [-5, 0]},
} satisfies Record<string, Pose>;
export type PoseName = keyof typeof POSES;

export const mixPose = (a: Pose, b: Pose, p: number): Pose => ({
	lean: lerp(a.lean, b.lean, p),
	tilt: lerp(a.tilt, b.tilt, p),
	aF: [lerp(a.aF[0], b.aF[0], p), lerp(a.aF[1], b.aF[1], p)],
	aB: [lerp(a.aB[0], b.aB[0], p), lerp(a.aB[1], b.aB[1], p)],
	lF: [lerp(a.lF[0], b.lF[0], p), lerp(a.lF[1], b.lF[1], p)],
	lB: [lerp(a.lB[0], b.lB[0], p), lerp(a.lB[1], b.lB[1], p)],
});

const rad = (d: number) => (d * Math.PI) / 180;
const step = (x: number, y: number, ang: number, len: number) => [x + Math.sin(rad(ang)) * len, y + Math.cos(rad(ang)) * len] as const;

// 站在地面 groundY 上时，髋部的高度
export const hipOnGround = (groundY: number, h: number) => groundY - 0.45 * h;
// 坐在台面 seatY 上时
export const hipOnSeat = (seatY: number, h: number) => seatY - 0.04 * h;
// 跑起来时（两脚交替经过地面）
export const hipRunning = (groundY: number, h: number) => groundY - 0.36 * h;

// cap = 警帽（平顶、带帽檐），跟着头一起倾斜
export const Figure: React.FC<{x: number; y: number; h: number; dir?: 1 | -1; pose: Pose | PoseName; color: string; cap?: boolean}> = ({
	x,
	y,
	h,
	dir = 1,
	pose,
	color,
	cap = false,
}) => {
	const P: Pose = typeof pose === 'string' ? POSES[pose] : pose;
	const sw = 0.078;
	const neck = step(0, 0, 180 - P.lean, 0.3);
	const sh = step(0, 0, 180 - P.lean, 0.27);
	const head = step(neck[0], neck[1], 180 - P.lean - P.tilt, 0.125);
	const limb = (o: readonly [number, number], [u, l]: [number, number], a: number, b: number) => {
		const m = step(o[0], o[1], u, a);
		const e = step(m[0], m[1], l, b);
		return `M ${o[0]} ${o[1]} L ${m[0]} ${m[1]} L ${e[0]} ${e[1]}`;
	};
	return (
		<g transform={`translate(${x} ${y}) scale(${dir * h} ${h})`}>
			<g fill="none" stroke={color} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
				<path d={limb([0, 0], P.lB, 0.23, 0.22)} />
				<path d={limb(sh, P.aB, 0.17, 0.16)} />
				<path d={`M 0 0 L ${neck[0]} ${neck[1]}`} />
				<path d={limb([0, 0], P.lF, 0.23, 0.22)} />
				<path d={limb(sh, P.aF, 0.17, 0.16)} />
			</g>
			<circle cx={head[0]} cy={head[1]} r={0.088} fill={color} />
			{cap ? (
				<g transform={`rotate(${P.lean + P.tilt} ${head[0]} ${head[1]})`} fill={color}>
					<rect x={head[0] - 0.1} y={head[1] - 0.15} width={0.19} height={0.085} />
					<rect x={head[0] - 0.02} y={head[1] - 0.075} width={0.15} height={0.03} />
				</g>
			) : null}
		</g>
	);
};

// 裁切揭示：内容从 groundY 下方升起（p: 0→1），离场时向上（q: 0→1）
export const Rise: React.FC<{x: number; y: number; w: number; h: number; p: number; q?: number; children: React.ReactNode}> = ({x, y, w, h, p, q = 0, children}) => {
	if (p <= 0 || q >= 1) return null;
	const dy = (1 - p) * h - q * h;
	return (
		<svg x={x} y={y} width={w} height={h} overflow="hidden">
			<g transform={`translate(${-x} ${-y + dy})`}>{children}</g>
		</svg>
	);
};

// ———————— 道具（全部是平涂的矩形、线和圆）————————
export const Lamp: React.FC<{x: number; top: number; y: number; color: string; w?: number}> = ({x, top, y, color, w = 84}) => (
	<g>
		<rect x={x - 2} y={top} width={4} height={y - top} fill={color} />
		<path d={`M ${x - w * 0.22} ${y} L ${x + w * 0.22} ${y} L ${x + w / 2} ${y + w * 0.42} L ${x - w / 2} ${y + w * 0.42} Z`} fill={color} />
	</g>
);
export const Table: React.FC<{x: number; y: number; w: number; legH: number; color: string; t?: number}> = ({x, y, w, legH, color, t = 12}) => (
	<g fill={color}>
		<rect x={x} y={y} width={w} height={t} />
		<rect x={x + w / 2 - t / 2} y={y} width={t} height={legH} />
		<rect x={x + w / 2 - w * 0.18} y={y + legH - t} width={w * 0.36} height={t} />
	</g>
);
// 椅子：面朝 dir，靠背在身后
export const Chair: React.FC<{x: number; seatY: number; dir: 1 | -1; color: string; s?: number}> = ({x, seatY, dir, color, s = 1}) => (
	<g fill={color}>
		<rect x={x - 34 * s} y={seatY} width={68 * s} height={10 * s} />
		<rect x={dir === 1 ? x - 34 * s : x + 24 * s} y={seatY - 70 * s} width={10 * s} height={150 * s} />
		<rect x={dir === 1 ? x + 24 * s : x - 34 * s} y={seatY} width={10 * s} height={80 * s} />
	</g>
);
export const Bars: React.FC<{x: number; y: number; w: number; h: number; n?: number; color: string; sw?: number; grow?: number}> = ({x, y, w, h, n = 5, color, sw = 6, grow = 1}) => (
	<g fill={color}>
		<rect x={x} y={y} width={w} height={sw} />
		{Array.from({length: n}, (_, i) => (
			<rect key={i} x={x + (i * (w - sw)) / (n - 1)} y={y} width={sw} height={h * Math.min(1, Math.max(0, grow * n - i))} />
		))}
		{grow >= 1 ? <rect x={x} y={y + h - sw} width={w} height={sw} /> : null}
	</g>
);
export const Door: React.FC<{x: number; ground: number; w: number; h: number; color: string; open?: boolean}> = ({x, ground, w, h, color, open = true}) => (
	<g fill={color}>
		<rect x={x} y={ground - h} width={8} height={h} />
		<rect x={x + w - 8} y={ground - h} width={8} height={h} />
		<rect x={x} y={ground - h} width={w} height={8} />
		{open ? <path d={`M ${x + w - 8} ${ground - h} L ${x + w + w * 0.45} ${ground - h + 16} L ${x + w + w * 0.45} ${ground - 6} L ${x + w - 8} ${ground}`} fill={color} opacity={0.18} /> : null}
	</g>
);
export const Tag: React.FC<{x: number; y: number; s: number; color: string; paper: string; text?: string}> = ({x, y, s, color, paper, text = '¥'}) => (
	<g>
		<path d={`M ${x} ${y + s * 0.3} L ${x + s * 0.3} ${y} L ${x + s * 1.3} ${y} L ${x + s * 1.3} ${y + s * 0.8} L ${x + s * 0.3} ${y + s * 0.8} L ${x} ${y + s * 0.5} Z`} fill={color} />
		<circle cx={x + s * 0.3} cy={y + s * 0.4} r={s * 0.08} fill={paper} />
		<text x={x + s * 0.55} y={y + s * 0.62} fontSize={s * 0.5} fontWeight={800} fill={paper} fontFamily='"Inter Tight", sans-serif'>
			{text}
		</text>
	</g>
);
export const Monitor: React.FC<{x: number; y: number; w: number; color: string; paper: string; dir?: 1 | -1}> = ({x, y, w, color, paper, dir = 1}) => (
	<g>
		<rect x={x} y={y} width={w} height={w * 0.66} fill={color} />
		<rect x={x + w * 0.08} y={y + w * 0.08} width={w * 0.84} height={w * 0.5} fill={paper} />
		<rect x={x + w * 0.44} y={y + w * 0.66} width={w * 0.12} height={w * 0.16} fill={color} />
		<rect x={x + w * 0.26} y={y + w * 0.82} width={w * 0.48} height={w * 0.07} fill={color} />
		{/* 屏幕上的一个小人头：面朝对手 */}
		<circle cx={x + w * (dir === 1 ? 0.62 : 0.38)} cy={y + w * 0.3} r={w * 0.09} fill={color} />
	</g>
);
export const Clock: React.FC<{x: number; y: number; r: number; color: string; hour?: number}> = ({x, y, r, color, hour = 11}) => {
	const a = rad((hour % 12) * 30);
	return (
		<g>
			<circle cx={x} cy={y} r={r} fill="none" stroke={color} strokeWidth={r * 0.16} />
			<line x1={x} y1={y} x2={x + Math.sin(a) * r * 0.5} y2={y - Math.cos(a) * r * 0.5} stroke={color} strokeWidth={r * 0.16} strokeLinecap="round" />
			<line x1={x} y1={y} x2={x} y2={y - r * 0.72} stroke={color} strokeWidth={r * 0.12} strokeLinecap="round" />
		</g>
	);
};
export const Rocket: React.FC<{x: number; ground: number; s: number; color: string}> = ({x, ground, s, color}) => (
	<g fill={color}>
		<rect x={x - s * 0.18} y={ground - s * 1.2} width={s * 0.36} height={s * 0.9} />
		<path d={`M ${x - s * 0.18} ${ground - s * 1.2} L ${x} ${ground - s * 1.55} L ${x + s * 0.18} ${ground - s * 1.2} Z`} />
		<path d={`M ${x - s * 0.18} ${ground - s * 0.55} L ${x - s * 0.4} ${ground - s * 0.3} L ${x - s * 0.18} ${ground - s * 0.3} Z`} />
		<path d={`M ${x + s * 0.18} ${ground - s * 0.55} L ${x + s * 0.4} ${ground - s * 0.3} L ${x + s * 0.18} ${ground - s * 0.3} Z`} />
	</g>
);
export const Arrow: React.FC<{x1: number; y1: number; x2: number; y2: number; color: string; sw?: number}> = ({x1, y1, x2, y2, color, sw = 6}) => {
	const a = Math.atan2(y2 - y1, x2 - x1);
	const L = sw * 3.2;
	return (
		<g>
			<line x1={x1} y1={y1} x2={x2 - Math.cos(a) * L * 0.6} y2={y2 - Math.sin(a) * L * 0.6} stroke={color} strokeWidth={sw} />
			<path d={`M ${x2} ${y2} L ${x2 - Math.cos(a - 0.5) * L} ${y2 - Math.sin(a - 0.5) * L} L ${x2 - Math.cos(a + 0.5) * L} ${y2 - Math.sin(a + 0.5) * L} Z`} fill={color} />
		</g>
	);
};
// 领奖台：左 2、中 1、右 3
export const Podium: React.FC<{x: number; ground: number; w: number; hs: [number, number, number]; color: string; second: string; paper: string}> = ({
	x,
	ground,
	w,
	hs,
	color,
	second,
	paper,
}) => (
	<g>
		{[1, 0, 2].map((rank, i) => (
			<g key={rank}>
				<rect x={x + i * w} y={ground - hs[rank]} width={w + 1} height={hs[rank]} fill={rank === 0 ? color : second} />
				<text
					x={x + i * w + w / 2}
					y={ground - hs[rank] + Math.min(28, hs[rank] - 5)}
					textAnchor="middle"
					fontSize={22}
					fontWeight={800}
					fill={rank === 0 ? paper : color}
					fontFamily='"Inter Tight", sans-serif'
				>
					{rank + 1}
				</text>
			</g>
		))}
	</g>
);
// 循环箭头：沿弧长画出来（p: 0→1），画完箭头落下
export const Loop: React.FC<{x: number; y: number; r: number; p: number; color: string; sw?: number}> = ({x, y, r, p, color, sw = 6}) => {
	if (p <= 0) return null;
	const a0 = -Math.PI * 0.75;
	const sweep = Math.PI * 1.6;
	const a1 = a0 + sweep * p;
	const pt = (a: number) => [x + Math.cos(a) * r, y + Math.sin(a) * r] as const;
	const [sx, sy] = pt(a0);
	const [ex, ey] = pt(a1);
	const large = sweep * p > Math.PI ? 1 : 0;
	const L = sw * 3;
	const tx = -Math.sin(a1);
	const ty = Math.cos(a1);
	return (
		<g>
			<path d={`M ${sx} ${sy} A ${r} ${r} 0 ${large} 1 ${ex} ${ey}`} fill="none" stroke={color} strokeWidth={sw} />
			{p >= 1 ? (
				<path
					d={`M ${ex + tx * L} ${ey + ty * L} L ${ex - ty * L * 0.6} ${ey + tx * L * 0.6} L ${ex + ty * L * 0.6} ${ey - tx * L * 0.6} Z`}
					fill={color}
				/>
			) : null}
		</g>
	);
};
