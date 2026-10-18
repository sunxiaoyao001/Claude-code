import {AbsoluteFill, useCurrentFrame, useVideoConfig} from 'remotion';
import {pop, progress, rise, visible} from '../../anim';
import {Sfx} from '../../components/Sfx';
import {SlamText} from '../components/SlamText';
import {CUES, fr} from '../timeline';
import {P, PF} from '../theme';

const K = CUES.way;

// 10 轮对局：对手第 4 轮背叛，一报还一报第 5 轮还击，第 6 轮原谅
const OPP = 'CCCDCCCCCC';
const TFT = 'CCCCDCCCCC';
const ROUNDS = OPP.length;
const SQ = 54;
const SG = 8;
const GX = 300;
const GY = 680;
const roundAt = (k: number) => fr(K.rounds + k * 0.45);

// pos：0 = 一报还一报那行上方，1 = 两行之间，2 = 对手那行下方
const NOTES: {round: number; pos: 0 | 1 | 2; text: string; color: string}[] = [
	{round: 3, pos: 2, text: '背叛', color: P.red},
	{round: 4, pos: 0, text: '还击', color: P.a},
	{round: 5, pos: 1, text: '原谅', color: P.green},
];

const CHIPS = [
	{t: '善良', d: '从不先背叛'},
	{t: '会还击', d: '被背叛就回敬'},
	{t: '肯原谅', d: '对方回头就合作'},
	{t: '不嫉妒', d: '不求赢过对方'},
];

export const P6Way: React.FC = () => {
	const frame = useCurrentFrame();
	const {fps} = useVideoConfig();
	const q = visible(frame, fr(K.q), fr(K.tour) + 4, 10);
	const gridOn = progress(frame, fr(K.tour) + 6, 14);

	return (
		<AbsoluteFill>
			{/* 但如果，博弈不止一次呢？ */}
			<div style={{position: 'absolute', left: 0, right: 0, top: 600, textAlign: 'center', opacity: q}}>
				<SlamText text="但如果，" at={fr(K.q)} size={84} color={P.muted} font={PF.serif} weight={800} glitch={false} from={1.3} />
				<div style={{marginTop: 20}}>
					<SlamText text="博弈不止一次呢？" at={fr(K.q) + 12} size={104} color={P.text} font={PF.serif} weight={900} />
				</div>
			</div>

			<div style={{position: 'absolute', left: 0, right: 0, top: 260, textAlign: 'center', ...rise(frame, fr(K.tour), 14)}}>
				<span style={{fontFamily: PF.sans, fontSize: 46, fontWeight: 600, color: P.muted, letterSpacing: 2}}>1980 年 · 一场电脑策略对战赛</span>
			</div>
			<div style={{position: 'absolute', left: 0, right: 0, top: 350, textAlign: 'center'}}>
				<div style={{...rise(frame, fr(K.champ), 12), fontFamily: PF.sans, fontSize: 44, color: P.text, letterSpacing: 4}}>冠军策略只有一句话</div>
				<div style={{marginTop: 8}}>
					<SlamText text="一报还一报" at={fr(K.champ) + 10} size={132} color={P.a} font={PF.serif} weight={900} glow="rgba(255,178,63,0.55)" />
				</div>
			</div>

			{/* 对局格子 */}
			<div style={{position: 'absolute', left: 0, top: 0, opacity: gridOn}}>
				{['一报还一报', '对手'].map((name, row) => (
					<div
						key={name}
						style={{
							position: 'absolute',
							left: 100,
							top: GY + 60 + row * (SQ + 70),
							width: GX - 120,
							height: SQ,
							display: 'flex',
							alignItems: 'center',
							justifyContent: 'flex-end',
							fontFamily: PF.sans,
							fontSize: 32,
							fontWeight: 700,
							color: row === 0 ? P.a : P.b,
						}}
					>
						{name}
					</div>
				))}
				{Array.from({length: ROUNDS}, (_, k) => {
					const p = pop(frame, fps, roundAt(k), 12);
					return [TFT, OPP].map((seq, row) => {
						const c = seq[k] === 'C';
						return (
							<div
								key={`${k}${row}`}
								style={{
									position: 'absolute',
									left: GX + k * (SQ + SG),
									top: GY + 60 + row * (SQ + 70),
									width: SQ,
									height: SQ,
									borderRadius: 12,
									background: c ? P.green : P.red,
									opacity: Math.min(1, p * 2),
									transform: `scale(${0.4 + 0.6 * p})`,
									boxShadow: `0 0 18px ${c ? 'rgba(79,209,139,0.45)' : 'rgba(255,77,77,0.6)'}`,
								}}
							/>
						);
					});
				})}
				{NOTES.map((n) => (
					<div
						key={n.text}
						style={{
							position: 'absolute',
							left: GX + n.round * (SQ + SG) + SQ / 2,
							top: [GY + 6, GY + 60 + SQ + 14, GY + 60 + 2 * SQ + 70 + 8][n.pos],
							...rise(frame, roundAt(n.round) + 4, 10, 16, 'translateX(-50%)'),
							fontFamily: PF.sans,
							fontSize: 30,
							fontWeight: 800,
							color: n.color,
							whiteSpace: 'nowrap',
						}}
					>
						{n.text}
					</div>
				))}
				<div style={{position: 'absolute', left: GX, top: GY + 60 + 2 * SQ + 140, display: 'flex', gap: 30, fontFamily: PF.sans, fontSize: 28, color: P.muted, whiteSpace: 'nowrap'}}>
					<span>
						<span style={{color: P.green}}>■</span> 合作
					</span>
					<span>
						<span style={{color: P.red}}>■</span> 背叛
					</span>
				</div>
			</div>

			{/* 规则 */}
			<div style={{position: 'absolute', left: 110, right: 110, top: 1070}}>
				<div style={{...rise(frame, fr(K.rule1), 12), fontFamily: PF.sans, fontSize: 48, fontWeight: 700, color: P.text}}>① 第一轮，先合作</div>
				<div style={{...rise(frame, fr(K.rule2), 12), marginTop: 18, fontFamily: PF.sans, fontSize: 48, fontWeight: 700, color: P.text}}>② 之后，对方怎么做，你就怎么做</div>
			</div>

			{/* 冠军的四个特点 */}
			<div style={{position: 'absolute', left: 110, top: 1250, width: 840, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18}}>
				{CHIPS.map((c, i) => {
					const p = pop(frame, fps, fr(K.chips) + i * 5, 12);
					return (
						<div
							key={c.t}
							style={{
								opacity: Math.min(1, p * 2),
								transform: `scale(${0.7 + 0.3 * p})`,
								padding: '14px 24px',
								borderRadius: 20,
								background: 'rgba(255,178,63,0.08)',
								border: `2px solid rgba(255,178,63,0.6)`,
							}}
						>
							<div style={{fontFamily: PF.sans, fontSize: 44, fontWeight: 800, color: P.a}}>{c.t}</div>
							<div style={{fontFamily: PF.sans, fontSize: 28, color: P.muted, marginTop: 2}}>{c.d}</div>
						</div>
					);
				})}
			</div>

			<Sfx name="whoosh" at={fr(K.q)} volume={0.6} />
			<Sfx name="pop" at={fr(K.tour)} />
			<Sfx name="braam" at={fr(K.champ) + 10} volume={0.7} />
			<Sfx name="shimmer" at={fr(K.champ) + 12} volume={0.8} />
			{Array.from({length: ROUNDS}, (_, k) => (
				<Sfx key={k} name={OPP[k] === 'D' || TFT[k] === 'D' ? 'error' : 'blip'} at={roundAt(k)} volume={0.6} />
			))}
			<Sfx name="pop" at={fr(K.rule1)} volume={0.7} />
			<Sfx name="pop" at={fr(K.rule2)} volume={0.7} />
			{CHIPS.map((_, i) => (
				<Sfx key={`c${i}`} name="pop" at={fr(K.chips) + i * 5} volume={0.6} />
			))}
		</AbsoluteFill>
	);
};
