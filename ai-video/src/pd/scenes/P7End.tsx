import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';
import {progress, rise} from '../../anim';
import {Sfx} from '../../components/Sfx';
import {Figure} from '../components/Figure';
import {SlamText} from '../components/SlamText';
import {mixRgb, rgb, Spotlight} from '../components/Spotlight';
import {CUES, fr} from '../timeline';
import {P, PF} from '../theme';

const K = CUES.end;

export const P7End: React.FC = () => {
	const frame = useCurrentFrame();
	const warm = progress(frame, fr(K.l2b), 30);
	const colA = mixRgb(rgb(P.a), rgb(P.gold), warm);
	const colB = mixRgb(rgb(P.b), rgb(P.gold), warm);
	const near = interpolate(warm, [0, 1], [0, 40]);
	const bob = Math.sin(frame / 6) * 6;
	return (
		<AbsoluteFill>
			<div style={{position: 'absolute', inset: 0, opacity: 0.85}}>
				<Spotlight x={330 + near} color={colA} onAt={-20} top={1090} bottom={1470} width={360} intensity={0.75} seed="EA" fixture={false} />
				<Spotlight x={750 - near} color={colB} onAt={-20} top={1090} bottom={1470} width={360} intensity={0.75} seed="EB" fixture={false} />
				<Figure x={330 + near} bottom={1470} rim={`rgb(${colA})`} lit={0.85} scale={0.58} />
				<Figure x={750 - near} bottom={1470} rim={`rgb(${colB})`} lit={0.85} scale={0.58} flip />
			</div>

			<div style={{position: 'absolute', left: 0, right: 0, top: 260, textAlign: 'center'}}>
				<div style={{...rise(frame, fr(K.l1), 14), fontFamily: PF.sans, fontSize: 56, fontWeight: 600, color: P.muted}}>一次性的交易里，</div>
				<div style={{marginTop: 10}}>
					<SlamText text="背叛最理性" at={fr(K.l1b)} size={104} color={P.text} font={PF.serif} weight={900} glitch={false} from={1.4} />
				</div>
				<div style={{...rise(frame, fr(K.l2), 14), marginTop: 70, fontFamily: PF.sans, fontSize: 56, fontWeight: 600, color: P.muted}}>但人生，</div>
				<div style={{marginTop: 10}}>
					<SlamText text="是一场重复博弈" at={fr(K.l2b)} size={112} color={P.gold} font={PF.serif} weight={900} glow="rgba(255,210,122,0.6)" glitch={false} from={1.5} />
				</div>
			</div>

			{/* 互动 */}
			<div style={{position: 'absolute', left: 0, right: 0, top: 960, display: 'flex', justifyContent: 'center', ...rise(frame, fr(K.cta), 16)}}>
				<div style={{display: 'flex', alignItems: 'center', gap: 18, padding: '18px 40px', borderRadius: 60, background: 'rgba(255,255,255,0.08)', border: `2px solid ${P.line}`}}>
					<svg width={56} height={56} viewBox="0 0 24 24" style={{transform: `translateY(${bob}px)`}}>
						<path d="M4 5h16a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H10l-4 4v-4H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z" fill={P.gold} />
						<circle cx={8.5} cy={10.5} r={1.3} fill={P.bg} />
						<circle cx={12} cy={10.5} r={1.3} fill={P.bg} />
						<circle cx={15.5} cy={10.5} r={1.3} fill={P.bg} />
					</svg>
					<span style={{fontFamily: PF.sans, fontSize: 48, fontWeight: 700, color: P.text}}>你身边，有哪些囚徒困境？</span>
				</div>
			</div>

			<Sfx name="pop" at={fr(K.l1)} volume={0.6} />
			<Sfx name="slam" at={fr(K.l1b)} volume={0.5} />
			<Sfx name="pop" at={fr(K.l2)} volume={0.6} />
			<Sfx name="shimmer" at={fr(K.l2b)} />
			<Sfx name="chime" at={fr(K.cta)} volume={0.8} />
		</AbsoluteFill>
	);
};
