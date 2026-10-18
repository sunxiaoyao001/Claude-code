import {AbsoluteFill, interpolate, random, useCurrentFrame} from 'remotion';
import {progress, rise, typed, visible} from '../anim';
import {Caret, ChatWindow, UserBubble} from '../components/Chat';
import {scene} from '../script';
import {C, F} from '../theme';

const S = scene('hallucinate');

const INTRO = '李明远教授的代表作有：';
const BOOKS = ['1.《语言的边界》（2009）', '2.《沉默的算法》（2015）', '3.《认知与机器》（2021）'];

const stampAt = (i: number) => S.cues.stamp + 4 + i * 9;

const Magnifier: React.FC = () => (
	<svg width={36} height={36} viewBox="0 0 24 24" fill="none" stroke={C.muted} strokeWidth={2.4} strokeLinecap="round">
		<circle cx={10.5} cy={10.5} r={6.5} />
		<line x1={15.5} y1={15.5} x2={21} y2={21} />
	</svg>
);

export const S7Hallucinate: React.FC = () => {
	const frame = useCurrentFrame();
	const c = S.cues;

	// 盖章时的屏幕抖动
	let shake = 0;
	for (let i = 0; i < BOOKS.length; i++) {
		const d = frame - stampAt(i);
		if (d >= 0 && d < 10) shake = (1 - d / 10) * 10;
	}
	const sx = (random(`x${frame}`) - 0.5) * shake;
	const sy = (random(`y${frame}`) - 0.5) * shake;

	// 回答逐行打出
	const cps = 16;
	const full = [INTRO, ...BOOKS].join('\n');
	const shown = typed(full, frame, c.answer + 6, cps).split('\n');
	const typingDone = shown.join('\n').length >= full.length;

	const sidePanelA = visible(frame, c.like, c.search + 10, 14);
	const searchOn = progress(frame, c.search, 18);

	return (
		<AbsoluteFill>
			<div style={{position: 'absolute', left: 130, top: 160, ...rise(frame, c.ask - 10, 18, 24, `translate(${sx}px, ${sy}px)`)}}>
				<ChatWindow width={1000} height={660}>
					<UserBubble>李明远教授写过哪些书？</UserBubble>
					<div style={{fontFamily: F.sans, fontSize: 38, lineHeight: 1.5, color: C.text}}>
						{shown.map((line, i) => (
							<div key={i} style={{position: 'relative', marginBottom: i === 0 ? 14 : 8}}>
								{line}
								{i === shown.length - 1 && frame >= c.answer && !typingDone ? <Caret height={38} /> : null}
								{i > 0 && frame >= stampAt(i - 1) ? <Stamp start={stampAt(i - 1)} frame={frame} /> : null}
							</div>
						))}
						{frame >= c.answer ? null : <Caret height={38} />}
					</div>
				</ChatWindow>
				<div style={{marginTop: 18, fontFamily: F.mono, fontSize: 20, color: C.dim}}>* 李明远为虚构人物，书名均为编造，仅作演示</div>
			</div>

			{/* 右侧：它在做什么 */}
			<div style={{position: 'absolute', left: 1220, top: 200, width: 580, opacity: sidePanelA}}>
				<div style={{fontFamily: F.mono, fontSize: 22, color: C.muted, letterSpacing: 3, marginBottom: 26}}>它其实在做什么</div>
				<div style={{...rise(frame, c.like, 16), fontFamily: F.sans, fontSize: 36, fontWeight: 600, color: C.amber, marginBottom: 22}}>
					✓ 猜：什么话听起来像对的
				</div>
				<div style={{...rise(frame, c.db, 16), fontFamily: F.sans, fontSize: 36, color: C.muted, textDecoration: 'line-through', textDecorationColor: C.red}}>
					✗ 查：数据库里的事实
				</div>
				<div
					style={{
						marginTop: 80,
						opacity: progress(frame, stampAt(2) + 10, 14),
						transform: `scale(${interpolate(progress(frame, stampAt(2) + 10, 14), [0, 1], [1.3, 1])})`,
						transformOrigin: 'left center',
					}}
				>
					<div style={{fontFamily: F.serif, fontSize: 96, fontWeight: 900, color: C.red, letterSpacing: 6}}>AI 幻觉</div>
					<div style={{fontFamily: F.mono, fontSize: 26, color: C.muted, letterSpacing: 4}}>HALLUCINATION</div>
				</div>
			</div>

			{/* 右侧：联网搜索 + 核实 */}
			<div style={{position: 'absolute', left: 1220, top: 200, width: 580, opacity: searchOn}}>
				<div style={{fontFamily: F.mono, fontSize: 22, color: C.muted, letterSpacing: 3, marginBottom: 26}}>先查资料，再回答</div>
				<div style={{display: 'flex', alignItems: 'center', gap: 16, padding: '18px 26px', borderRadius: 40, background: 'rgba(255,255,255,0.07)', border: `1px solid ${C.line}`}}>
					<Magnifier />
					<span style={{fontFamily: F.sans, fontSize: 32, color: C.text}}>{typed('李明远 教授 著作', frame, c.search + 14, 10)}</span>
				</div>
				<div style={{marginTop: 26, display: 'flex', flexDirection: 'column', gap: 18}}>
					{[0, 1, 2].map((i) => (
						<div key={i} style={{...rise(frame, c.search + 40 + i * 8, 14), padding: '18px 24px', borderRadius: 16, background: 'rgba(29,32,40,0.9)', border: `1px solid ${C.line}`}}>
							<div style={{height: 14, width: `${60 - i * 8}%`, borderRadius: 7, background: 'rgba(91,140,166,0.7)'}} />
							<div style={{marginTop: 12, height: 10, width: `${88 - i * 5}%`, borderRadius: 5, background: 'rgba(255,255,255,0.12)'}} />
						</div>
					))}
				</div>
				<div
					style={{
						...rise(frame, c.verify, 16),
						marginTop: 44,
						display: 'inline-flex',
						alignItems: 'center',
						gap: 16,
						padding: '14px 30px',
						borderRadius: 40,
						border: `2px solid ${C.green}`,
						fontFamily: F.sans,
						fontSize: 34,
						fontWeight: 600,
						color: C.green,
					}}
				>
					✓ 重要信息，自己再核实一遍
				</div>
			</div>
		</AbsoluteFill>
	);
};

const Stamp: React.FC<{start: number; frame: number}> = ({start, frame}) => {
	const p = progress(frame, start, 7);
	return (
		<div
			style={{
				position: 'absolute',
				left: 560,
				top: -4,
				transform: `rotate(-9deg) scale(${interpolate(p, [0, 1], [2.4, 1])})`,
				opacity: p,
				fontFamily: F.sans,
				fontSize: 30,
				fontWeight: 900,
				color: C.red,
				border: `4px solid ${C.red}`,
				borderRadius: 10,
				padding: '0 16px',
				letterSpacing: 4,
				background: 'rgba(255,90,78,0.08)',
			}}
		>
			查无此书
		</div>
	);
};
