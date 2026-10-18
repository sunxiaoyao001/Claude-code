import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';
import {progress, rise, visible} from '../anim';
import {Blank} from '../components/Blank';
import {scene} from '../script';
import {C, F} from '../theme';

const S = scene('detective');

const PAGE = {left: 160, top: 190, width: 820, height: 620};
const TARGET = {x: 566, y: 700}; // 「凶手就是——＿」空格的位置

const CLUES = [
	{x: 1180, y: 170, no: '01', text: '泥地里 42 码的鞋印'},
	{x: 1330, y: 340, no: '02', text: '管家：那晚我一直在厨房'},
	{x: 1180, y: 510, no: '03', text: '被撕掉一半的火车票'},
	{x: 1330, y: 680, no: '04', text: '上周刚改过的遗嘱'},
];

const FAUX = [0.92, 0.86, 0.95, 0.6, 0.9, 0.82, 0.97, 0.7, 0.88, 0.55];

export const S5Detective: React.FC = () => {
	const frame = useCurrentFrame();
	const c = S.cues;

	const phaseA = visible(frame, c.book - 4, c.same + 12, 14);
	const phaseB = progress(frame, c.same, 20);

	return (
		<AbsoluteFill>
			{/* A. 侦探小说 */}
			<AbsoluteFill style={{opacity: phaseA}}>
				<div
					style={{
						position: 'absolute',
						...PAGE,
						transform: `rotate(-1.2deg) translateY(${(1 - progress(frame, c.book, 20)) * 40}px)`,
						background: C.paper,
						borderRadius: 10,
						boxShadow: '0 40px 100px rgba(0,0,0,0.6)',
						padding: '54px 60px',
						boxSizing: 'border-box',
					}}
				>
					<div style={{fontFamily: F.serif, fontSize: 30, fontWeight: 700, color: C.ink, letterSpacing: 6}}>第十二章　真相</div>
					<div style={{marginTop: 30, display: 'flex', flexDirection: 'column', gap: 22}}>
						{FAUX.map((w, i) => (
							<div key={i} style={{height: 14, width: `${w * 100}%`, borderRadius: 7, background: 'rgba(43,38,31,0.18)'}} />
						))}
					</div>
					<div
						style={{
							position: 'absolute',
							left: 60,
							bottom: 66,
							fontFamily: F.serif,
							fontSize: 52,
							fontWeight: 800,
							color: C.ink,
							whiteSpace: 'nowrap',
							opacity: progress(frame, c.lastline, 14),
						}}
					>
						凶手就是——
						<Blank size={84} color={C.ink} border="#B4492F" />
					</div>
				</div>

				<svg width={1920} height={1080} style={{position: 'absolute', inset: 0}}>
					{CLUES.map((cl, i) => {
						const p = progress(frame, c.clues + 18 + i * 9, 26);
						const sx = cl.x;
						const sy = cl.y + 52;
						const d = `M ${sx} ${sy} C ${sx - 220} ${sy}, ${TARGET.x + 260} ${TARGET.y}, ${TARGET.x + 50} ${TARGET.y}`;
						return <path key={i} d={d} fill="none" stroke={C.amber} strokeWidth={3} strokeDasharray="1200" strokeDashoffset={1200 * (1 - p)} opacity={0.75} />;
					})}
				</svg>

				{CLUES.map((cl, i) => (
					<div
						key={cl.no}
						style={{
							position: 'absolute',
							left: cl.x,
							top: cl.y,
							width: 470,
							height: 104,
							boxSizing: 'border-box',
							padding: '16px 26px',
							borderRadius: 16,
							background: 'rgba(29,32,40,0.95)',
							border: `1px solid ${C.line}`,
							borderLeft: `4px solid ${C.amber}`,
							...rise(frame, c.clues + i * 9, 16),
						}}
					>
						<div style={{fontFamily: F.mono, fontSize: 20, color: C.amber, letterSpacing: 3}}>线索 {cl.no}</div>
						<div style={{fontFamily: F.sans, fontSize: 32, color: C.text, marginTop: 4}}>{cl.text}</div>
					</div>
				))}
			</AbsoluteFill>

			{/* B. 冰山 */}
			<AbsoluteFill style={{opacity: phaseB}}>
				<Iceberg frame={frame} />
			</AbsoluteFill>
		</AbsoluteFill>
	);
};

const WATER = 400;

const Iceberg: React.FC<{frame: number}> = ({frame}) => {
	const c = S.cues;
	const surface = progress(frame, c.surface, 16);
	const understand = progress(frame, c.understand, 24);
	const wave = Array.from({length: 49}, (_, i) => {
		const x = i * 40;
		const y = WATER + Math.sin(i * 0.7 + frame / 10) * 4;
		return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
	}).join(' ');
	const labels = [
		{text: '语法', x: 800, y: 520, at: c.skills},
		{text: '常识', x: 1110, y: 560, at: c.skills + 14},
		{text: '推理', x: 950, y: 660, at: c.reason},
	];
	return (
		<AbsoluteFill>
			<svg width={1920} height={1080} style={{position: 'absolute', inset: 0}}>
				<defs>
					<linearGradient id="sea" x1="0" y1="0" x2="0" y2="1">
						<stop offset="0" stopColor="#1B4A63" stopOpacity={0.55} />
						<stop offset="1" stopColor={C.bg} stopOpacity={0.2} />
					</linearGradient>
					<linearGradient id="ice" x1="0" y1="0" x2="0" y2="1">
						<stop offset="0" stopColor="#5B8CA6" stopOpacity={0.75} />
						<stop offset="1" stopColor="#173447" stopOpacity={0.5} />
					</linearGradient>
				</defs>
				<rect x={0} y={WATER} width={1920} height={1080 - WATER} fill="url(#sea)" />
				<path
					d="M 890 400 L 1060 400 L 1260 520 L 1350 700 L 1210 860 L 930 910 L 660 800 L 600 620 L 700 480 Z"
					fill="url(#ice)"
					stroke="rgba(140,200,230,0.35)"
					strokeWidth={2}
				/>
				<path
					d="M 890 400 L 935 290 L 972 250 L 1012 300 L 1060 400 Z"
					fill={C.text}
					opacity={0.92}
					style={{filter: surface > 0 ? `drop-shadow(0 0 ${30 * surface}px rgba(255,178,63,0.7))` : 'none'}}
				/>
				<path d={wave} fill="none" stroke="rgba(160,210,235,0.7)" strokeWidth={3} />
			</svg>

			<div style={{position: 'absolute', left: 0, right: 0, top: 168, textAlign: 'center', fontFamily: F.sans, fontSize: 40, fontWeight: 700, color: C.amber, letterSpacing: 4}}>
				猜下一个字
			</div>
			<div style={{position: 'absolute', left: 1090, top: 300, opacity: surface, fontFamily: F.mono, fontSize: 24, color: C.muted, letterSpacing: 2}}>
				← 只是露出水面的部分
			</div>

			{labels.map((l) => (
				<div
					key={l.text}
					style={{
						position: 'absolute',
						left: l.x,
						top: l.y,
						...rise(frame, l.at, 14, 24, 'translate(-50%, -50%)'),
						fontFamily: F.sans,
						fontSize: 44,
						fontWeight: 600,
						color: C.text,
						letterSpacing: 4,
					}}
				>
					{l.text}
				</div>
			))}
			<div
				style={{
					position: 'absolute',
					left: 960,
					top: 790,
					transform: `translate(-50%, -50%) scale(${interpolate(understand, [0, 1], [0.9, 1])})`,
					opacity: understand,
					fontFamily: F.serif,
					fontSize: 54,
					fontWeight: 800,
					color: C.amber,
					letterSpacing: 4,
					whiteSpace: 'nowrap',
					textShadow: '0 0 40px rgba(255,178,63,0.5)',
				}}
			>
				对世界的某种「理解」
			</div>
		</AbsoluteFill>
	);
};
