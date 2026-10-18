import {AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig} from 'remotion';
import {easeInOut, pop, progress, rise} from '../../anim';
import {Sfx} from '../../components/Sfx';
import {Figure} from '../components/Figure';
import {SlamText} from '../components/SlamText';
import {rgb, Spotlight} from '../components/Spotlight';
import {CUES, fr} from '../timeline';
import {P, PF} from '../theme';

const K = CUES.setup;

export const P2Setup: React.FC = () => {
	const frame = useCurrentFrame();
	const {fps} = useVideoConfig();
	const apart = progress(frame, 0, 24, easeInOut);
	const ax = interpolate(apart, [0, 1], [300, 250]);
	const bx = interpolate(apart, [0, 1], [780, 830]);
	const wall = progress(frame, 4, 18, easeInOut);

	return (
		<AbsoluteFill>
			<Spotlight x={ax} color={rgb(P.a)} onAt={-20} seed="A2" />
			<Spotlight x={bx} color={rgb(P.b)} onAt={-20} seed="B2" />
			<Figure x={ax} bottom={1330} rim={P.a} lit={1} />
			<Figure x={bx} bottom={1330} rim={P.b} lit={1} flip />
			{/* 隔离墙 */}
			<div
				style={{
					position: 'absolute',
					left: 522,
					width: 36,
					top: interpolate(wall, [0, 1], [1360, 760]),
					height: interpolate(wall, [0, 1], [0, 600]),
					borderRadius: 6,
					background: 'linear-gradient(90deg, #22262E, #3A3F4A 50%, #1C1F26)',
					boxShadow: '0 0 30px rgba(0,0,0,0.8)',
				}}
			/>
			<div style={{position: 'absolute', left: 0, right: 0, top: 1380, textAlign: 'center', ...rise(frame, 16, 14)}}>
				<span style={{fontFamily: PF.mono, fontSize: 30, color: P.muted, letterSpacing: 6}}>× 无法串供 ×</span>
			</div>

			<div style={{position: 'absolute', left: 0, right: 0, top: 270, textAlign: 'center'}}>
				<SlamText text="两个嫌疑人被抓" at={fr(K.t1)} size={88} color={P.text} font={PF.serif} weight={900} glitch={false} from={1.4} />
				<div style={{...rise(frame, fr(K.t2), 14), marginTop: 22, fontFamily: PF.sans, fontSize: 56, fontWeight: 500, color: P.muted, letterSpacing: 2}}>
					分开审讯，互不知情
				</div>
				<div style={{...rise(frame, fr(K.t3), 14), marginTop: 60, fontFamily: PF.sans, fontSize: 52, fontWeight: 600, color: P.text}}>
					每人只能选一个：
				</div>
				<div style={{marginTop: 30, display: 'flex', justifyContent: 'center', gap: 34}}>
					{[
						{t: '沉默', at: fr(K.chip1), bg: 'rgba(79,209,139,0.12)', bd: P.green, c: P.green},
						{t: '揭发对方', at: fr(K.chip2), bg: 'rgba(255,77,77,0.85)', bd: P.red, c: '#fff'},
					].map((chip) => {
						const p = pop(frame, fps, chip.at, 11);
						return (
							<div
								key={chip.t}
								style={{
									opacity: Math.min(1, p * 2),
									transform: `scale(${0.6 + 0.4 * p})`,
									fontFamily: PF.sans,
									fontSize: 60,
									fontWeight: 800,
									color: chip.c,
									background: chip.bg,
									border: `4px solid ${chip.bd}`,
									borderRadius: 60,
									padding: '14px 48px',
									letterSpacing: 4,
								}}
							>
								{chip.t}
							</div>
						);
					})}
				</div>
			</div>

			<Sfx name="thud" at={4} />
			<Sfx name="pop" at={fr(K.t1)} />
			<Sfx name="pop" at={fr(K.t2)} volume={0.6} />
			<Sfx name="pop" at={fr(K.chip1)} />
			<Sfx name="slam" at={fr(K.chip2)} volume={0.6} />
		</AbsoluteFill>
	);
};
