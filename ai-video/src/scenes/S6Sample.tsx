import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';
import {easeInOut, progress, rise, visible} from '../anim';
import {ProbBars} from '../components/ProbBars';
import {scene} from '../script';
import {C, F} from '../theme';
import {Sfx} from '../components/Sfx';

const S = scene('sample');

const BASE = [
	{label: '金黄', p: 0.42, color: C.amber},
	{label: '萧瑟', p: 0.23, color: '#E58A4E'},
	{label: '丰收', p: 0.18, color: '#C9B37E'},
	{label: '凉爽', p: 0.11, color: '#7D8799'},
	{label: '寂寥', p: 0.055, color: '#5A6070'},
	{label: '番茄炒蛋', p: 0.005, color: C.red},
];

const ANSWERS = ['金黄', '萧瑟', '丰收'];

// 温度采样：p_i ∝ p_i^(1/T)
const withTemperature = (T: number) => {
	const w = BASE.map((b) => Math.pow(b.p, 1 / T));
	const sum = w.reduce((a, b) => a + b, 0);
	return BASE.map((b, i) => ({...b, p: w[i] / sum}));
};

// 转盘：每段的起止角度（顺时针，从正上方开始）
const SEGMENTS = (() => {
	let a = 0;
	return BASE.map((b) => {
		const seg = {from: a, to: a + b.p * 360};
		a = seg.to;
		return seg;
	});
})();

const arc = (cx: number, cy: number, r0: number, r1: number, a0: number, a1: number) => {
	const rad = (a: number) => ((a - 90) * Math.PI) / 180;
	const pt = (r: number, a: number) => `${cx + r * Math.cos(rad(a))} ${cy + r * Math.sin(rad(a))}`;
	const large = a1 - a0 > 180 ? 1 : 0;
	return `M ${pt(r1, a0)} A ${r1} ${r1} 0 ${large} 1 ${pt(r1, a1)} L ${pt(r0, a1)} A ${r0} ${r0} 0 ${large} 0 ${pt(r0, a0)} Z`;
};

const SPIN = 46;
const spinStart = (k: number) => S.cues.spin + 8 + k * 60;
const restAngle = (k: number) => {
	if (k < 0) return 0;
	const seg = SEGMENTS[k];
	const mid = (seg.from + seg.to) / 2;
	return 720 * (k + 1) + (360 - mid);
};

export const S6Sample: React.FC = () => {
	const frame = useCurrentFrame();
	const c = S.cues;

	const toBars = progress(frame, c.bars, 26, easeInOut);
	const wheelOn = visible(frame, c.spin, c.temp + 14, 14);
	const tempOn = progress(frame, c.temp + 6, 18);

	const T = interpolate(frame, [c.low, c.low + 30, c.high, c.high + 40], [1, 0.3, 0.3, 2.5], {
		extrapolateLeft: 'clamp',
		extrapolateRight: 'clamp',
		easing: easeInOut,
	});
	const weird = progress(frame, c.weird, 14);
	const items = withTemperature(T).map((it) => ({
		...it,
		color: it.label === '番茄炒蛋' ? (weird > 0 ? C.red : C.bar) : it.label === '金黄' ? C.amber : C.bar,
	}));

	// 转盘角度
	let k = -1;
	for (let i = 0; i < 3; i++) if (frame >= spinStart(i)) k = i;
	const rot =
		k < 0
			? 0
			: interpolate(frame, [spinStart(k), spinStart(k) + SPIN], [restAngle(k - 1), restAngle(k)], {
					extrapolateRight: 'clamp',
					easing: (t) => 1 - Math.pow(1 - t, 3),
				});
	const landed = k >= 0 && frame >= spinStart(k) + SPIN ? ANSWERS[k] : null;

	const sliderX = interpolate(T, [0.2, 3], [0, 1]);

	return (
		<AbsoluteFill>
			<Sfx name="pop" at={6} />
			{ANSWERS.map((_, i) => (
				<Sfx key={i} name="pop" at={c.three + i * 10} />
			))}
			<Sfx name="whoosh" at={c.bars} volume={0.5} />
			{[0, 1, 2].map((k) => (
				<Sfx key={`s${k}`} name="spin" at={spinStart(k)} />
			))}
			{[0, 1, 2].map((k) => (
				<Sfx key={`d${k}`} name="ding" at={spinStart(k) + SPIN} volume={0.6} />
			))}
			<Sfx name="pop" at={c.temp + 6} />
			<Sfx name="slideDown" at={c.low} />
			<Sfx name="slideUp" at={c.high} />
			<Sfx name="error" at={c.weird} />

			{/* 同一个问题，三次回答 */}
			<div style={{position: 'absolute', left: 0, right: 0, top: 180, display: 'flex', justifyContent: 'center', opacity: 1 - toBars}}>
				<div style={{...rise(frame, 6, 16), fontFamily: F.sans, fontSize: 38, color: C.text, background: 'rgba(255,255,255,0.08)', padding: '14px 32px', borderRadius: 24}}>
					用一个词形容秋天
				</div>
			</div>
			<div
				style={{
					position: 'absolute',
					left: 0,
					right: 0,
					top: interpolate(toBars, [0, 1], [380, 150]),
					display: 'flex',
					justifyContent: 'center',
					gap: interpolate(toBars, [0, 1], [50, 24]),
					transform: `scale(${interpolate(toBars, [0, 1], [1, 0.5])})`,
					opacity: 1 - toBars,
				}}
			>
				{ANSWERS.map((a, i) => (
					<div
						key={a}
						style={{
							...rise(frame, c.three + i * 10, 16),
							width: 400,
							height: 240,
							borderRadius: 24,
							background: 'rgba(29,32,40,0.92)',
							border: `1px solid ${C.line}`,
							display: 'flex',
							flexDirection: 'column',
							alignItems: 'center',
							justifyContent: 'center',
							gap: 14,
						}}
					>
						<div style={{fontFamily: F.mono, fontSize: 24, color: C.muted, letterSpacing: 3}}>第 {i + 1} 次问</div>
						<div style={{fontFamily: F.serif, fontSize: 84, fontWeight: 800, color: C.text, letterSpacing: 6}}>{a}</div>
					</div>
				))}
			</div>

			{/* 概率柱 */}
			<div style={{position: 'absolute', left: 150, top: 250, opacity: toBars}}>
				<div style={{fontFamily: F.sans, fontSize: 30, color: C.muted, letterSpacing: 3, marginBottom: 22, marginLeft: 30}}>
					用一个词形容秋天：<span style={{color: C.text}}>＿＿</span>
				</div>
				<ProbBars items={items} start={c.bars + 10} highlight={c.bars + 34} width={860} rowHeight={72} labelWidth={210} labelSize={40} maxP={1} />
				<div
					style={{
						position: 'absolute',
						left: 230,
						top: 560,
						opacity: weird,
						fontFamily: F.sans,
						fontSize: 26,
						fontWeight: 700,
						color: C.red,
					}}
				>
					↑ 跑偏了
				</div>
			</div>

			{/* 转盘 */}
			<div style={{position: 'absolute', left: 1180, top: 230, width: 560, height: 560, opacity: wheelOn}}>
				<svg width={560} height={560} viewBox="0 0 560 560">
					<g transform={`rotate(${rot} 280 280)`}>
						{SEGMENTS.map((s, i) => (
							<path key={i} d={arc(280, 280, 120, 250, s.from, s.to)} fill={BASE[i].color} stroke={C.bg} strokeWidth={3} />
						))}
						{SEGMENTS.slice(0, 4).map((s, i) => {
							const mid = (((s.from + s.to) / 2 - 90) * Math.PI) / 180;
							return (
								<text
									key={i}
									x={280 + 186 * Math.cos(mid)}
									y={280 + 186 * Math.sin(mid)}
									textAnchor="middle"
									dominantBaseline="central"
									fill={C.bg}
									style={{fontFamily: F.sans, fontSize: 30, fontWeight: 700}}
									transform={`rotate(${(s.from + s.to) / 2} ${280 + 186 * Math.cos(mid)} ${280 + 186 * Math.sin(mid)})`}
								>
									{BASE[i].label}
								</text>
							);
						})}
					</g>
					<path d="M 262 12 L 298 12 L 280 52 Z" fill={C.text} />
				</svg>
				<div style={{position: 'absolute', left: 0, right: 0, top: 230, textAlign: 'center'}}>
					<div style={{fontFamily: F.mono, fontSize: 22, color: C.muted, letterSpacing: 2}}>抽中</div>
					<div style={{fontFamily: F.serif, fontSize: 56, fontWeight: 800, color: C.amber, minHeight: 70}}>{landed ?? '…'}</div>
				</div>
			</div>

			{/* 温度旋钮 */}
			<div style={{position: 'absolute', left: 1200, top: 360, width: 560, opacity: tempOn}}>
				<div style={{fontFamily: F.sans, fontSize: 34, color: C.muted, letterSpacing: 3}}>
					温度 <span style={{fontFamily: F.mono, color: C.text, fontSize: 52, fontWeight: 700, marginLeft: 14}}>T = {T.toFixed(1)}</span>
				</div>
				<div style={{position: 'relative', marginTop: 40, height: 14, borderRadius: 7, background: 'linear-gradient(90deg, #5B8CA6, #FFB23F 55%, #FF5A4E)'}}>
					<div
						style={{
							position: 'absolute',
							top: -17,
							left: `calc(${sliderX * 100}% - 24px)`,
							width: 48,
							height: 48,
							borderRadius: 24,
							background: C.text,
							boxShadow: '0 6px 20px rgba(0,0,0,0.5)',
						}}
					/>
				</div>
				<div style={{display: 'flex', justifyContent: 'space-between', marginTop: 30, fontFamily: F.sans, fontSize: 30}}>
					<span style={{color: frame >= c.low && frame < c.high ? C.text : C.dim}}>稳重</span>
					<span style={{color: frame >= c.high ? C.text : C.dim}}>有创意 · 易跑偏</span>
				</div>
			</div>
		</AbsoluteFill>
	);
};
