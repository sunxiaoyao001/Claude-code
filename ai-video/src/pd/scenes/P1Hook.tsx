import {AbsoluteFill, interpolate, random, useCurrentFrame} from 'remotion';
import {progress} from '../../anim';
import {Sfx} from '../../components/Sfx';
import {Cctv} from '../components/Cctv';
import {Figure} from '../components/Figure';
import {SlamText} from '../components/SlamText';
import {mixRgb, rgb, Spotlight} from '../components/Spotlight';
import {CUES, fr} from '../timeline';
import {P, PF} from '../theme';

const K = CUES.hook;

export const P1Hook: React.FC = () => {
	const frame = useCurrentFrame();
	const drop = fr(K.drop);

	// 2.7 秒：两盏灯一起变红，闪白 + 震屏
	const red = progress(frame, drop, 5);
	const colA = mixRgb(rgb(P.a), rgb(P.red), red);
	const colB = mixRgb(rgb(P.b), rgb(P.red), red);
	const shake = frame >= drop && frame < drop + 14 ? (1 - (frame - drop) / 14) * 22 : 0;
	const sx = (random(`hx${frame}`) - 0.5) * shake;
	const sy = (random(`hy${frame}`) - 0.5) * shake;
	const flash = interpolate(frame, [drop, drop + 2, drop + 9], [0, 0.9, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
	const textOut = 1 - progress(frame, drop, 5);
	const scrim = progress(frame, drop, 10) * 0.62;
	const push = 1 + (0.06 * frame) / fr(6);

	return (
		<AbsoluteFill>
			<AbsoluteFill style={{transform: `translate(${sx}px, ${sy}px) scale(${push})`, transformOrigin: '50% 60%'}}>
				<Spotlight x={300} color={colA} onAt={fr(K.lampA)} seed="A" />
				<Spotlight x={780} color={colB} onAt={fr(K.lampB)} seed="B" />
				<Figure x={300} bottom={1330} rim={`rgb(${colA})`} lit={progress(frame, fr(K.lampA), 6)} />
				<Figure x={780} bottom={1330} rim={`rgb(${colB})`} lit={progress(frame, fr(K.lampB), 6)} flip />
			</AbsoluteFill>

			<Cctv opacity={textOut} />

			{/* 0.2 秒：出卖他，你就能自由 */}
			<div style={{position: 'absolute', top: 300, left: 0, right: 0, textAlign: 'center', opacity: textOut, transform: `translate(${sx}px, ${sy}px)`}}>
				<SlamText text="出卖他，" at={fr(K.line1)} size={156} color={P.red} glow="rgba(255,77,77,0.65)" font={PF.serif} weight={900} />
				<div style={{marginTop: 6}}>
					<SlamText text="你就能自由。" at={fr(K.line1b)} size={96} color={P.text} font={PF.serif} weight={800} glitch={false} from={1.4} />
				</div>
			</div>

			{/* 1.45 秒：但他，也在这么想 */}
			<div style={{position: 'absolute', top: 1385, left: 0, right: 0, textAlign: 'center', opacity: textOut}}>
				<SlamText text="但他，也在这么想。" at={fr(K.line2)} size={78} color={P.b} font={PF.sans} weight={800} glow="rgba(76,201,240,0.55)" from={1.5} />
			</div>

			{/* 2.7 秒之后 */}
			<AbsoluteFill style={{background: `rgba(4,4,7,${scrim})`}} />
			<div style={{position: 'absolute', top: 690, left: 0, right: 0, textAlign: 'center'}}>
				<SlamText text="最聪明的选择" at={fr(K.big1)} size={112} color={P.text} font={PF.serif} weight={900} />
				<div style={{marginTop: 30}}>
					<SlamText text="换来最差的结局" at={fr(K.big2)} size={112} color={P.red} font={PF.serif} weight={900} glow="rgba(255,77,77,0.6)" />
				</div>
			</div>
			<AbsoluteFill style={{background: '#FFF', opacity: flash, mixBlendMode: 'overlay'}} />

			<Sfx name="clunk" at={fr(K.lampA)} />
			<Sfx name="hum" at={fr(K.lampA)} frames={drop - fr(K.lampA)} />
			<Sfx name="slam" at={fr(K.line1)} />
			<Sfx name="whoosh" at={fr(K.line1b) - 3} volume={0.6} />
			<Sfx name="clunk" at={fr(K.lampB)} volume={0.85} />
			<Sfx name="swell" at={drop - 72} volume={0.9} />
			<Sfx name="heartbeat" at={fr(1.75)} />
			<Sfx name="heartbeat" at={fr(2.25)} volume={1.1} />
			<Sfx name="impact" at={drop} />
			<Sfx name="glitch" at={drop} />
			<Sfx name="braam" at={fr(K.big1)} volume={0.8} />
			<Sfx name="braam" at={fr(K.big2)} />
		</AbsoluteFill>
	);
};
