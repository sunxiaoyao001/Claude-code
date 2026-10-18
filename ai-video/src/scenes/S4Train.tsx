import {AbsoluteFill, interpolate, random, useCurrentFrame} from 'remotion';
import {easeInOut, progress, rise, visible} from '../anim';
import {Blank} from '../components/Blank';
import {Knob} from '../components/Knob';
import {scene} from '../script';
import {C, F} from '../theme';

const S = scene('train');

// 6 条跑道，每条两段文字，间隔半个周期，互不重叠
const SNIPPETS = [
	'床前明月光，疑是地上霜。',
	'def add(a, b): return a + b',
	'今日沪深两市小幅收涨',
	'鸡蛋冷水下锅，水开后煮八分钟',
	'The quick brown fox jumps',
	'牛顿第一定律，又称惯性定律',
	'甄士隐梦幻识通灵',
	'明天有小到中雨，记得带伞',
	'光合作用产生氧气和葡萄糖',
	'SELECT * FROM books;',
	'请问附近有好吃的面馆吗？',
	'1 光年约等于 9.46 万亿公里',
];
const LANES = 6;
const SPAN = 1300;

const COLS = 8;
const ROWS = 5;
const KNOB = 70;
const GAP = 22;

const Counter: React.FC<{frame: number; start: number}> = ({frame, start}) => {
	const p = progress(frame, start, 70, easeInOut);
	const n = Math.floor(interpolate(p, [0, 1], [0, 12_000_000_000_000]));
	return <span>{n.toLocaleString('en-US')}</span>;
};

export const S4Train: React.FC = () => {
	const frame = useCurrentFrame();
	const c = S.cues;

	const phaseA = visible(frame, 0, c.quiz + 10, 14);
	const stream = progress(frame, c.feed, 20);
	const phaseB = visible(frame, c.quiz, c.assistant + 6, 14);
	const phaseC = progress(frame, c.assistant, 16);

	// 旋钮被拧：从中心向外的波纹
	const twistP = (i: number) => {
		const x = (i % COLS) - (COLS - 1) / 2;
		const y = Math.floor(i / COLS) - (ROWS - 1) / 2;
		const delay = Math.sqrt(x * x + y * y) * 3;
		return progress(frame, c.twist + 6 + delay, 18, easeInOut);
	};
	const zoomOut = progress(frame, c.knobs, 34, easeInOut);
	const wrong = frame >= c.wrong && frame < c.twist + 40;
	const right = frame >= c.twist + 40;

	return (
		<AbsoluteFill>
			{/* A. 海量文字流进模型 */}
			<AbsoluteFill style={{opacity: phaseA}}>
				{SNIPPETS.map((t, i) => {
					const lane = i % LANES;
					const y = 200 + lane * 66;
					const speed = 5 + random(`s${lane}`) * 4;
					const x = ((Math.max(0, frame - c.feed) * speed + random(`o${lane}`) * SPAN + (i >= LANES ? SPAN / 2 : 0)) % SPAN) - 300;
					const fade = interpolate(x, [-300, -100, 760, 1010], [0, 1, 1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
					return (
						<div
							key={i}
							style={{
								position: 'absolute',
								left: x,
								top: y,
								whiteSpace: 'nowrap',
								fontFamily: /[a-z]{3}/i.test(t) ? F.mono : F.serif,
								fontSize: 28,
								color: C.muted,
								opacity: fade * 0.85 * stream,
							}}
						>
							{t}
						</div>
					);
				})}
				<div
					style={{
						position: 'absolute',
						left: 1120,
						top: 240,
						width: 360,
						height: 360,
						borderRadius: 40,
						background: 'linear-gradient(160deg, #23262F, #15171C)',
						border: `2px solid rgba(255,178,63,${0.35 + 0.25 * Math.sin(frame / 8)})`,
						boxShadow: '0 30px 90px rgba(0,0,0,0.6), 0 0 60px rgba(255,178,63,0.12)',
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'center',
						flexDirection: 'column',
						gap: 10,
					}}
				>
					<div style={{fontFamily: F.sans, fontSize: 46, fontWeight: 700, color: C.text, letterSpacing: 6}}>模型</div>
					<div style={{fontFamily: F.mono, fontSize: 22, color: C.dim}}>LANGUAGE MODEL</div>
				</div>
				<div style={{position: 'absolute', left: 0, right: 0, top: 680, display: 'flex', justifyContent: 'center', gap: 40}}>
					{[
						['训练读过的文字', '十几万亿个 token'],
						['一个人不吃不睡地读', '要读几万年'],
					].map(([k, v], i) => (
						<div
							key={k}
							style={{
								...rise(frame, c.years + i * 10, 16),
								padding: '18px 34px',
								borderRadius: 18,
								background: 'rgba(255,255,255,0.05)',
								border: `1px solid ${C.line}`,
								display: 'flex',
								alignItems: 'baseline',
								gap: 20,
							}}
						>
							<span style={{fontFamily: F.sans, fontSize: 28, color: C.muted}}>{k}</span>
							<span style={{fontFamily: F.sans, fontSize: 40, fontWeight: 700, color: C.amber}}>{v}</span>
						</div>
					))}
				</div>
			</AbsoluteFill>

			{/* B. 遮字猜 → 拧旋钮 */}
			<AbsoluteFill style={{opacity: phaseB}}>
				<div
					style={{
						position: 'absolute',
						left: 520,
						top: 360,
						transform: 'translateX(-50%)',
						opacity: 1 - zoomOut,
						textAlign: 'center',
					}}
				>
					<div style={{fontFamily: F.serif, fontWeight: 700, fontSize: 96, color: C.text, letterSpacing: 6, whiteSpace: 'nowrap'}}>
						白日依山
						<Blank size={112} fill={wrong ? '海' : right ? '尽' : undefined} color={wrong ? C.red : right ? C.green : C.amber} />
					</div>
					<div style={{marginTop: 26, height: 44, fontFamily: F.sans, fontSize: 32, fontWeight: 500, letterSpacing: 2, color: wrong ? C.red : C.green}}>
						{wrong ? '✗ 猜错了' : right ? '✓ 猜对了' : ''}
					</div>
				</div>

				<div
					style={{
						position: 'absolute',
						left: 1330,
						top: 440,
						transform: `translate(-50%, -50%) translateX(${-370 * zoomOut}px) scale(${1 - 0.78 * zoomOut})`,
						display: 'grid',
						gridTemplateColumns: `repeat(${COLS}, ${KNOB}px)`,
						gap: GAP,
						padding: 36,
						borderRadius: 36,
						border: `2px solid ${wrong ? C.red : 'rgba(255,255,255,0.1)'}`,
						background: 'rgba(22,24,30,0.85)',
					}}
				>
					{Array.from({length: COLS * ROWS}, (_, i) => {
						const base = (random(`k${i}`) - 0.5) * 300;
						const delta = (random(`d${i}`) - 0.5) * 70;
						const tp = twistP(i);
						return <Knob key={i} size={KNOB} angle={base + delta * tp} glow={tp > 0 && tp < 1 ? 1 : 0} />;
					})}
				</div>
				<div style={{position: 'absolute', left: 1330, top: 700, ...rise(frame, c.twist + 4, 14, 24, 'translateX(-50%)'), opacity: progress(frame, c.twist + 4, 14) * (1 - zoomOut)}}>
					<span style={{fontFamily: F.sans, fontSize: 28, color: C.amber, letterSpacing: 2}}>每个旋钮拧一点点</span>
				</div>

				{/* 拉远：满屏旋钮 */}
				<svg width={1920} height={1080} style={{position: 'absolute', inset: 0, opacity: zoomOut * 0.55}}>
					{Array.from({length: 46 * 22}, (_, i) => {
						const col = i % 46;
						const row = Math.floor(i / 46);
						const cx = 40 + col * 41.5;
						const cy = 60 + row * 44;
						const a = random(`f${i}`) * Math.PI * 2 + Math.sin(frame / 14 + i) * 0.4;
						return (
							<g key={i}>
								<circle cx={cx} cy={cy} r={12} fill="none" stroke="rgba(255,255,255,0.22)" strokeWidth={2} />
								<line x1={cx} y1={cy} x2={cx + Math.sin(a) * 10} y2={cy - Math.cos(a) * 10} stroke="rgba(255,255,255,0.4)" strokeWidth={2.5} strokeLinecap="round" />
							</g>
						);
					})}
				</svg>
				<div style={{position: 'absolute', left: 0, right: 0, top: 330, textAlign: 'center', opacity: zoomOut}}>
					<div
						style={{
							display: 'inline-block',
							padding: '30px 64px',
							borderRadius: 28,
							background: 'rgba(12,13,17,0.88)',
							border: `1px solid ${C.line}`,
						}}
					>
						<div style={{fontFamily: F.sans, fontSize: 30, color: C.muted, letterSpacing: 4}}>旋钮（参数）</div>
						<div style={{fontFamily: F.sans, fontSize: 92, fontWeight: 800, color: C.amber, letterSpacing: 4, marginTop: 6}}>几千亿个</div>
						<div style={{...rise(frame, c.count, 14), marginTop: 24, fontFamily: F.sans, fontSize: 30, color: C.muted, letterSpacing: 2}}>
							已刷填空题
							<span style={{fontFamily: F.mono, fontSize: 46, fontWeight: 700, color: C.text, marginLeft: 20}}>
								<Counter frame={frame} start={c.count + 4} />
							</span>
							<span style={{marginLeft: 12}}>道</span>
						</div>
					</div>
				</div>
			</AbsoluteFill>

			{/* C. 上一门"助手课" */}
			<AbsoluteFill style={{opacity: phaseC}}>
				<div style={{position: 'absolute', left: 0, right: 0, top: 170, display: 'flex', justifyContent: 'center'}}>
					<div style={{...rise(frame, c.assistant, 16), fontFamily: F.sans, fontSize: 34, fontWeight: 500, color: C.bg, background: C.amber, padding: '10px 34px', borderRadius: 40, letterSpacing: 3}}>
						最后一课：怎么当好一个助手
					</div>
				</div>
				<div style={{position: 'absolute', left: 0, right: 0, top: 290, display: 'flex', justifyContent: 'center', gap: 56}}>
					{[
						{tag: '上课前', q: '怎么煮鸡蛋？', a: '怎么煮鸡蛋好吃？怎么煮鸡蛋不破？怎么煮鸡蛋……', at: c.assistant + 30, ok: false},
						{tag: '上课后', q: '怎么煮鸡蛋？', a: '冷水下锅，水开后再煮 8～10 分钟，捞出过一下凉水，壳就好剥了。', at: c.after, ok: true},
					].map((card, i) => {
						const n = Math.max(0, Math.floor(((frame - card.at) / 30) * 16));
						const answer = Array.from(card.a).slice(0, n).join('');
						const verdict = card.ok ? progress(frame, c.after + 50, 14) : progress(frame, c.chain, 14);
						return (
							<div
								key={card.tag}
								style={{
									...rise(frame, c.assistant + 8 + i * 8, 18),
									width: 700,
									height: 420,
									borderRadius: 26,
									padding: '30px 38px',
									background: 'rgba(29,32,40,0.92)',
									border: `2px solid ${verdict > 0 ? (card.ok ? C.green : C.red) : C.line}`,
									position: 'relative',
								}}
							>
								<div style={{fontFamily: F.mono, fontSize: 24, color: C.muted, letterSpacing: 3}}>{card.tag}</div>
								<div style={{display: 'flex', justifyContent: 'flex-end', marginTop: 18}}>
									<div style={{fontFamily: F.sans, fontSize: 32, color: C.text, background: 'rgba(255,255,255,0.08)', padding: '12px 24px', borderRadius: '18px 18px 4px 18px'}}>
										{card.q}
									</div>
								</div>
								<div style={{marginTop: 24, fontFamily: F.sans, fontSize: 34, lineHeight: 1.6, color: card.ok ? C.text : C.muted}}>{answer}</div>
								<div
									style={{
										position: 'absolute',
										right: 30,
										bottom: 26,
										opacity: verdict,
										transform: `scale(${0.8 + 0.2 * verdict})`,
										fontFamily: F.sans,
										fontSize: 30,
										fontWeight: 700,
										color: card.ok ? C.green : C.red,
									}}
								>
									{card.ok ? '✓ 回答问题' : '✗ 自顾自地接龙'}
								</div>
							</div>
						);
					})}
				</div>
			</AbsoluteFill>
		</AbsoluteFill>
	);
};
