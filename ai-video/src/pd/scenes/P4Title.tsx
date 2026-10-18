import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';
import {progress, rise} from '../../anim';
import {Sfx} from '../../components/Sfx';
import {SlamText} from '../components/SlamText';
import {CUES, fr} from '../timeline';
import {P, PF} from '../theme';

const K = CUES.title;

export const P4Title: React.FC = () => {
	const frame = useCurrentFrame();
	const t1 = fr(K.t1);
	const sweep = interpolate(frame, [t1 + 18, t1 + 48], [-400, 1300], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
	const grid = progress(frame, 0, 30) * 0.5;
	return (
		<AbsoluteFill>
			{/* 背景里淡淡的 2×2 格子，呼应前面的矩阵 */}
			<svg width={1080} height={1920} style={{position: 'absolute', inset: 0, opacity: grid * 0.25}}>
				<rect x={140} y={430} width={800} height={800} rx={40} fill="none" stroke={P.muted} strokeWidth={2} />
				<line x1={540} y1={430} x2={540} y2={1230} stroke={P.muted} strokeWidth={2} />
				<line x1={140} y1={830} x2={940} y2={830} stroke={P.muted} strokeWidth={2} />
			</svg>
			<div style={{position: 'absolute', left: 0, right: 0, top: 470, textAlign: 'center', lineHeight: 1.05}}>
				<SlamText text="囚徒" at={t1} size={260} color={P.text} font={PF.serif} weight={900} stagger={4} letterSpacing={20} from={1.5} />
				<div>
					<SlamText text="困境" at={t1 + 8} size={260} color={P.text} font={PF.serif} weight={900} stagger={4} letterSpacing={20} from={1.5} glow="rgba(255,77,77,0.35)" />
				</div>
				{/* 扫光 */}
				<div
					style={{
						position: 'absolute',
						left: sweep,
						top: -40,
						width: 260,
						height: 640,
						transform: 'skewX(-18deg)',
						background: 'linear-gradient(90deg, transparent, rgba(255,240,210,0.55), transparent)',
						mixBlendMode: 'overlay',
						filter: 'blur(6px)',
					}}
				/>
			</div>
			<div style={{position: 'absolute', left: 0, right: 0, top: 1110, textAlign: 'center', ...rise(frame, fr(K.sub), 14)}}>
				<span style={{fontFamily: PF.sans, fontSize: 60, fontWeight: 700, color: P.a}}>个人理性</span>
				<span style={{fontFamily: PF.sans, fontSize: 70, fontWeight: 800, color: P.red, margin: '0 22px'}}>≠</span>
				<span style={{fontFamily: PF.sans, fontSize: 60, fontWeight: 700, color: P.b}}>集体理性</span>
			</div>
			<div style={{position: 'absolute', left: 0, right: 0, top: 1240, textAlign: 'center', ...rise(frame, fr(K.tag), 14)}}>
				<span style={{fontFamily: PF.mono, fontSize: 32, color: P.muted, letterSpacing: 4}}>博弈论 · 1950 · 兰德公司</span>
			</div>

			<Sfx name="braam" at={t1} />
			<Sfx name="shimmer" at={t1 + 18} />
			<Sfx name="pop" at={fr(K.sub)} />
			<Sfx name="tick" at={fr(K.tag)} />
		</AbsoluteFill>
	);
};
