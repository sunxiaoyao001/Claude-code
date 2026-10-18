import {AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig} from 'remotion';
import {pop, progress, rise, visible} from '../anim';
import {Blank} from '../components/Blank';
import {ProbBars} from '../components/ProbBars';
import {scene} from '../script';
import {C, F} from '../theme';

const S = scene('game');

const POEM_BARS = [
	{label: '光', p: 0.972},
	{label: '下', p: 0.009},
	{label: '中', p: 0.006},
	{label: '亮', p: 0.004},
	{label: '夜', p: 0.003},
];

const WEATHER_BARS = [
	{label: '好', p: 0.31},
	{label: '不错', p: 0.19},
	{label: '热', p: 0.16},
	{label: '冷', p: 0.12},
	{label: '棒', p: 0.08},
	{label: '差', p: 0.05},
];

const TOKENS_ZH = ['人工', '智能', '正在', '改变', '世界'];
const TOKENS_EN = ['un', 'believ', 'able'];

const Prompt: React.FC<{text: string; children: React.ReactNode}> = ({text, children}) => (
	<div style={{fontFamily: F.serif, fontWeight: 700, fontSize: 116, color: C.text, letterSpacing: 6, whiteSpace: 'nowrap'}}>
		{text}
		{children}
	</div>
);

const Footnote: React.FC<{opacity: number}> = ({opacity}) => (
	<div style={{position: 'absolute', right: 88, bottom: 170, opacity, fontFamily: F.mono, fontSize: 22, color: C.dim, letterSpacing: 1}}>
		* 概率为示意数值
	</div>
);

const TokenChips: React.FC<{tokens: string[]; split: number; font: string; size: number}> = ({tokens, split, font, size}) => (
	<div style={{display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 22 * split}}>
		{tokens.map((t, i) => (
			<div
				key={t}
				style={{
					fontFamily: font,
					fontSize: size,
					fontWeight: 600,
					color: C.text,
					padding: `${8 + split * 6}px ${split * 22}px`,
					borderRadius: 14,
					border: `2px solid rgba(255,178,63,${0.9 * split})`,
					background: i % 2 ? `rgba(255,178,63,${0.06 * split})` : `rgba(255,255,255,${0.05 * split})`,
				}}
			>
				{t}
			</div>
		))}
	</div>
);

export const S2Game: React.FC = () => {
	const frame = useCurrentFrame();
	const {fps} = useVideoConfig();
	const c = S.cues;

	// —— 第一题：床前明月 ——
	const poemShift = progress(frame, c.bars, 24); // 题目左移，让出位置给柱状图
	const poemOut = progress(frame, c.next, 18);
	const humanGuess = frame >= c.guang && frame < c.bars ? '光' : undefined;
	const aiGuess = frame >= c.top + 14 ? '光' : undefined;
	const guessPop = pop(frame, fps, humanGuess ? c.guang : c.top + 14);

	// —— 第二题：今天天气真 ——
	const weatherIn = progress(frame, c.weather, 20);
	const weatherShift = progress(frame, c.wbars, 24);
	const weatherOut = progress(frame, c.token, 18);

	// —— token ——
	const split = progress(frame, c.split, 26);

	return (
		<AbsoluteFill>
			{/* 第一题 */}
			<AbsoluteFill
				style={{
					alignItems: 'center',
					justifyContent: 'center',
					opacity: (1 - poemOut) * progress(frame, c.poem - 6, 14),
					transform: `translateX(${-poemOut * 80}px)`,
				}}
			>
				<div style={{position: 'absolute', top: 400, left: interpolate(poemShift, [0, 1], [960, 520]), transform: 'translateX(-50%)'}}>
					<Prompt text="床前明月">
						<Blank fill={humanGuess ?? aiGuess} color={humanGuess ? C.text : C.amber} border={humanGuess ? C.text : undefined} fillScale={guessPop} />
					</Prompt>
					<div style={{...rise(frame, c.bars + 10, 16), marginTop: 24, textAlign: 'center', fontFamily: F.sans, fontSize: 28, color: C.muted, letterSpacing: 4}}>
						下一个字是什么？
					</div>
				</div>
				<div style={{position: 'absolute', left: 1000, top: 250, opacity: poemShift}}>
					<ProbBars items={POEM_BARS} start={c.bars + 8} highlight={c.top} />
				</div>
			</AbsoluteFill>

			{/* 第二题 */}
			<AbsoluteFill style={{opacity: weatherIn * (1 - weatherOut), transform: `translateX(${(1 - weatherIn) * 80 - weatherOut * 80}px)`}}>
				<div style={{position: 'absolute', top: 400, left: interpolate(weatherShift, [0, 1], [960, 500]), transform: 'translateX(-50%)'}}>
					<Prompt text="今天天气真">
						<Blank />
					</Prompt>
				</div>
				<div style={{position: 'absolute', left: 1040, top: 200, opacity: weatherShift}}>
					<ProbBars items={WEATHER_BARS} start={c.wbars + 8} rowHeight={70} labelWidth={150} width={780} />
				</div>
				<div
					style={{
						position: 'absolute',
						top: 590,
						left: 500,
						...rise(frame, c.summary, 16, 24, 'translateX(-50%)'),
						whiteSpace: 'nowrap',
					}}
				>
					<div style={{fontFamily: F.sans, fontSize: 34, fontWeight: 500, color: C.amber, padding: '12px 34px', border: `2px solid ${C.amber}`, borderRadius: 40, letterSpacing: 3}}>
						每说一个字 = 做一道填空题
					</div>
				</div>
			</AbsoluteFill>

			<Footnote opacity={Math.max(poemShift * (1 - poemOut), weatherShift * (1 - weatherOut))} />

			{/* token 说明 */}
			<AbsoluteFill style={{alignItems: 'center', justifyContent: 'center', opacity: visible(frame, c.token + 6, S.durationInFrames + 20)}}>
				<div style={{marginTop: -80, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 60}}>
					<div style={{display: 'flex', alignItems: 'baseline', gap: 22}}>
						<span style={{fontFamily: F.mono, fontSize: 64, fontWeight: 700, color: C.amber}}>token</span>
						<span style={{fontFamily: F.sans, fontSize: 40, color: C.muted}}>（词元）</span>
					</div>
					<TokenChips tokens={TOKENS_ZH} split={split} font={F.sans} size={72} />
					<TokenChips tokens={TOKENS_EN} split={split} font={F.mono} size={64} />
					<div style={{...rise(frame, c.callit, 16), fontFamily: F.sans, fontSize: 36, color: C.text, letterSpacing: 2}}>
						本视频里，统一叫它<span style={{color: C.amber}}>「字」</span>
					</div>
				</div>
				<div style={{position: 'absolute', right: 88, bottom: 170, fontFamily: F.mono, fontSize: 22, color: C.dim, opacity: split}}>
					* 切分方式因模型而异，此处为示意
				</div>
			</AbsoluteFill>
		</AbsoluteFill>
	);
};
