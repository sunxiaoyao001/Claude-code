import {AbsoluteFill, interpolate, random, useCurrentFrame, useVideoConfig} from 'remotion';
import {easeInOut, pop, progress, rise, typed, visible} from '../anim';
import {Caret, ChatWindow, UserBubble} from '../components/Chat';
import {ProbBars} from '../components/ProbBars';
import {scene} from '../script';
import {C, F} from '../theme';
import {Sfx, Typing} from '../components/Sfx';
import {POEM} from './S1Hook';

const S = scene('outro');

const LAST = [
	{label: '甜', p: 0.64},
	{label: '香', p: 0.21},
	{label: '暖', p: 0.09},
];

const MiniBars: React.FC<{seed: number; frame: number}> = ({seed, frame}) => {
	const hs = [0, 1, 2].map((j) => 0.25 + 0.75 * Math.abs(Math.sin(frame / (9 + random(`${seed}-${j}`) * 10) + random(`p${seed}-${j}`) * 6)));
	const top = Math.max(...hs);
	return (
		<div style={{display: 'flex', alignItems: 'flex-end', gap: 5, height: 46}}>
			{hs.map((h, j) => (
				<div key={j} style={{width: 12, height: 46 * h, borderRadius: 3, background: h === top ? C.amber : C.bar}} />
			))}
		</div>
	);
};

const QUESTION = ['一个只会猜下一个字的东西，', '到底算不算真的「懂」？'];

export const S8Outro: React.FC = () => {
	const frame = useCurrentFrame();
	const {fps} = useVideoConfig();
	const c = S.cues;

	const zoom = progress(frame, c.zoom, 30, easeInOut);
	const field = progress(frame, c.field, 30, easeInOut);
	const question = progress(frame, c.question, 24);
	const dong = pop(frame, fps, c.dong + 8, 10);

	return (
		<AbsoluteFill>
			<Typing at={8} chars={Array.from(POEM).length} cps={9} volume={0.6} />
			<Sfx name="whoosh" at={c.zoom} volume={0.6} />
			<Sfx name="ding" at={c.zoom + 46} />
			<Sfx name="whoosh" at={c.field} volume={0.5} />
			<Sfx name="swell" at={c.question - 40} />
			<Sfx name="chime" at={c.dong + 8} />
			<Sfx name="pop" at={c.end} />

			{/* 对话框继续逐字输出 */}
			<AbsoluteFill style={{alignItems: 'center', justifyContent: 'center', opacity: 1 - zoom}}>
				<div style={{marginTop: -60, transform: `scale(${1 + zoom * 0.6})`}}>
					<ChatWindow>
						<UserBubble>写一首关于秋天的短诗</UserBubble>
						<div style={{fontFamily: F.serif, fontSize: 40, lineHeight: 1.75, color: C.text, whiteSpace: 'pre-wrap', minHeight: 300}}>
							{typed(POEM, frame, 8, 9)}
							<Caret height={42} />
						</div>
					</ChatWindow>
				</div>
			</AbsoluteFill>

			{/* 特写：最后一个字背后的猜测 */}
			<AbsoluteFill style={{opacity: visible(frame, c.zoom + 8, c.field + 24, 14), transform: `scale(${1 - field * 0.5})`}}>
				<div style={{position: 'absolute', left: 0, right: 0, top: 230, display: 'flex', justifyContent: 'center'}}>
					<ProbBars items={LAST} start={c.zoom + 20} highlight={c.zoom + 46} width={720} rowHeight={60} labelWidth={110} labelSize={38} maxP={1} />
				</div>
				<div style={{position: 'absolute', left: 0, right: 0, top: 520, textAlign: 'center', fontFamily: F.serif, fontSize: 120, fontWeight: 800, color: C.text, letterSpacing: 8}}>
					整条街都是<span style={{color: C.amber, textShadow: '0 0 50px rgba(255,178,63,0.5)'}}>甜</span>
				</div>
			</AbsoluteFill>

			{/* 拉远：满屏的猜测 */}
			<AbsoluteFill style={{opacity: field * interpolate(question, [0, 1], [1, 0.16])}}>
				<div style={{position: 'absolute', inset: '90px 70px 150px', display: 'grid', gridTemplateColumns: 'repeat(16, 1fr)', rowGap: 26, alignContent: 'center', justifyItems: 'center'}}>
					{Array.from({length: 16 * 8}, (_, i) => (
						<div key={i} style={{opacity: progress(frame, c.field + random(`a${i}`) * 26, 10)}}>
							<MiniBars seed={i} frame={frame} />
						</div>
					))}
				</div>
			</AbsoluteFill>

			{/* 结尾提问 */}
			<AbsoluteFill style={{alignItems: 'center', justifyContent: 'center', opacity: question}}>
				<div style={{marginTop: -60, textAlign: 'center'}}>
					{QUESTION.map((line, i) => (
						<div
							key={i}
							style={{
								...rise(frame, c.question + 30 + i * 50, 20, 30),
								fontFamily: F.serif,
								fontWeight: 800,
								fontSize: i === 0 ? 76 : 96,
								color: i === 0 ? C.muted : C.text,
								letterSpacing: 6,
								marginTop: i === 0 ? 0 : 26,
							}}
						>
							{i === 1 ? (
								<>
									到底算不算真的「
									<span style={{display: 'inline-block', color: C.amber, transform: `scale(${1 + dong * 0.15})`, textShadow: `0 0 ${50 * dong}px rgba(255,178,63,0.6)`}}>懂</span>
									」？
								</>
							) : (
								line
							)}
						</div>
					))}
					<div style={{...rise(frame, c.end, 18), marginTop: 70, display: 'inline-block', fontFamily: F.sans, fontSize: 38, fontWeight: 500, color: C.bg, background: C.amber, padding: '14px 44px', borderRadius: 44, letterSpacing: 4}}>
						评论区聊聊你的看法
					</div>
				</div>
			</AbsoluteFill>
		</AbsoluteFill>
	);
};
