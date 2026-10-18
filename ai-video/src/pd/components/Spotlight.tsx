import {interpolate, random, useCurrentFrame} from 'remotion';

// 审讯灯：灯罩 + 光锥 + 地面光斑 + 光里飘的灰尘
// on: 0~1；onAt: 开灯的帧（开灯瞬间有日光灯式的闪烁）
export const Spotlight: React.FC<{
	x: number;
	color: string; // 'r,g,b'
	onAt: number;
	top?: number;
	bottom?: number;
	width?: number;
	intensity?: number;
	seed?: string;
	fixture?: boolean; // 是否画灯罩和吊线
}> = ({x, color, onAt, top = 150, bottom = 1330, width = 560, intensity = 1, seed = 'a', fixture = true}) => {
	const frame = useCurrentFrame();
	const d = frame - onAt;
	if (d < 0) return null;
	const flicker = [1, 0.35, 1, 0.25, 0.85, 1][d] ?? 1;
	const breath = 0.94 + 0.06 * Math.sin(frame / 7 + x);
	const on = flicker * breath * intensity;
	const h = bottom - top;
	const left = x - width / 2;
	const topW = 54;
	const clip = `polygon(${width / 2 - topW / 2}px 0, ${width / 2 + topW / 2}px 0, ${width}px ${h}px, 0 ${h}px)`;
	return (
		<>
			{/* 光锥 */}
			<div
				style={{
					position: 'absolute',
					left,
					top,
					width,
					height: h,
					clipPath: clip,
					background: `linear-gradient(180deg, rgba(${color},0.55) 0%, rgba(${color},0.22) 45%, rgba(${color},0.06) 100%)`,
					filter: 'blur(8px)',
					opacity: on,
					mixBlendMode: 'screen',
				}}
			/>
			{/* 地面光斑 */}
			<div
				style={{
					position: 'absolute',
					left: x - width * 0.6,
					top: bottom - 70,
					width: width * 1.2,
					height: 140,
					borderRadius: '50%',
					background: `radial-gradient(ellipse at center, rgba(${color},0.45), transparent 70%)`,
					opacity: on,
					filter: 'blur(6px)',
				}}
			/>
			{/* 灰尘 */}
			<svg width={width} height={h} style={{position: 'absolute', left, top, opacity: on, overflow: 'visible'}}>
				{Array.from({length: 34}, (_, i) => {
					const ry = random(`${seed}y${i}`);
					const yy = ((ry * h - frame * (0.4 + random(`${seed}v${i}`) * 0.8)) % h + h) % h;
					const spread = (topW / 2 + (width / 2 - topW / 2) * (yy / h)) * 0.85;
					const xx = width / 2 + (random(`${seed}x${i}`) * 2 - 1) * spread + Math.sin(frame / 20 + i) * 6;
					const r = 1.2 + random(`${seed}r${i}`) * 2.6;
					const tw = 0.35 + 0.65 * Math.abs(Math.sin(frame / (12 + i) + i));
					return <circle key={i} cx={xx} cy={yy} r={r} fill={`rgba(${color},1)`} opacity={tw * 0.8} />;
				})}
			</svg>
			{/* 灯罩 */}
			{fixture ? (
				<svg width={140} height={90} style={{position: 'absolute', left: x - 70, top: top - 62, overflow: 'visible'}}>
					<line x1={70} y1={-200} x2={70} y2={20} stroke="#2A2E37" strokeWidth={4} />
					<path d="M 40 20 L 100 20 L 128 70 L 12 70 Z" fill="#1B1E25" stroke="#2E333D" strokeWidth={2} />
					<ellipse cx={70} cy={70} rx={52} ry={9} fill={`rgba(${color},${0.9 * on})`} />
					<ellipse cx={70} cy={70} rx={80} ry={22} fill={`rgba(${color},${0.35 * on})`} style={{filter: 'blur(10px)'}} />
				</svg>
			) : null}
		</>
	);
};

export const rgb = (hex: string) => {
	const n = parseInt(hex.slice(1), 16);
	return `${(n >> 16) & 255},${(n >> 8) & 255},${n & 255}`;
};

export const mixRgb = (a: string, b: string, t: number) => {
	const pa = a.split(',').map(Number);
	const pb = b.split(',').map(Number);
	return pa.map((v, i) => Math.round(interpolate(t, [0, 1], [v, pb[i]]))).join(',');
};
