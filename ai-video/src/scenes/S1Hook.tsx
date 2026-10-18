import {AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig} from 'remotion';
import {pop, progress, rise, typed} from '../anim';
import {Caret, ChatWindow, UserBubble} from '../components/Chat';
import {scene} from '../script';
import {C, F} from '../theme';

const S = scene('hook');
export const POEM = '秋风翻过旧书页，\n银杏把阳光一片片还给大地。\n远处有人在晒柿子，\n整条街都是甜的。';

const HEAD = Array.from('它只会猜下一个字');

export const S1Hook: React.FC = () => {
	const frame = useCurrentFrame();
	const {fps} = useVideoConfig();
	const {freeze, reveal, ask} = S.cues;

	const text = typed(POEM, Math.min(frame, freeze), 26, 9);
	const dim = progress(frame, freeze, 24);
	const enter = rise(frame, 0, 20, 40);

	return (
		<AbsoluteFill style={{alignItems: 'center', justifyContent: 'center'}}>
			<div
				style={{
					...enter,
					opacity: enter.opacity * interpolate(dim, [0, 1], [1, 0.22]),
					filter: `blur(${dim * 5}px)`,
					transform: `${enter.transform} scale(${1 - dim * 0.05})`,
					marginTop: -60,
				}}
			>
				<ChatWindow>
					<UserBubble style={rise(frame, 8, 14)}>写一首关于秋天的短诗</UserBubble>
					<div style={{fontFamily: F.serif, fontSize: 40, lineHeight: 1.75, color: C.text, whiteSpace: 'pre-wrap', minHeight: 300}}>
						{text}
						<Caret height={42} />
					</div>
				</ChatWindow>
			</div>

			{/* 定格后：大标题 */}
			<div style={{position: 'absolute', top: 330, left: 0, right: 0, textAlign: 'center'}}>
				<div style={{fontFamily: F.serif, fontWeight: 800, fontSize: 150, letterSpacing: 8, color: C.text}}>
					{HEAD.map((ch, i) => {
						const p = pop(frame, fps, reveal + i * 3);
						return (
							<span
								key={i}
								style={{
									display: 'inline-block',
									opacity: Math.min(1, p * 1.5),
									transform: `translateY(${(1 - p) * 50}px) scale(${0.6 + p * 0.4})`,
									color: i >= 4 ? C.amber : C.text,
									textShadow: i >= 4 ? '0 0 50px rgba(255,178,63,0.45)' : 'none',
								}}
							>
								{ch}
							</span>
						);
					})}
					<span style={{opacity: frame > reveal + 30 ? 1 : 0}}>
						<Caret height={120} />
					</span>
				</div>
				<div style={{...rise(frame, ask, 16), marginTop: 36, fontFamily: F.sans, fontSize: 52, fontWeight: 400, color: C.muted, letterSpacing: 6}}>
					你信吗？
				</div>
			</div>
		</AbsoluteFill>
	);
};
