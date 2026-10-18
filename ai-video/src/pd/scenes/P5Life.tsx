import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';
import {easeInOut, easeOut, progress} from '../../anim';
import {Sfx} from '../../components/Sfx';
import {CUES, fr} from '../timeline';
import {P, PF} from '../theme';

const K = CUES.life;
const CARD = fr(3);

// 价格战：两家店轮流降价，利润越来越薄
const PriceWar: React.FC<{t: number}> = ({t}) => {
	const steps = [99, 79, 59, 39];
	const at = (k: number, lag: number) => fr(0.35 + k * 0.55 + lag);
	const price = (lag: number) => steps[steps.filter((_, k) => t >= at(k, lag)).length - 1] ?? 99;
	const profit = interpolate(t, [fr(0.3), fr(2.4)], [1, 0.08], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
	const tag = (name: string, color: string, lag: number) => {
		const k = steps.filter((_, i) => t >= at(i, lag)).length - 1;
		const bump = k > 0 ? 1 - progress(t, at(k, lag), 8) : 0;
		return (
			<div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14}}>
				<div style={{fontFamily: PF.sans, fontSize: 36, fontWeight: 700, color}}>{name}</div>
				<div
					style={{
						width: 250,
						height: 150,
						borderRadius: 24,
						border: `4px solid ${color}`,
						background: `${color}1A`,
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'center',
						fontFamily: PF.mono,
						fontWeight: 800,
						fontSize: 78,
						color: P.text,
						transform: `translateY(${bump * 18}px)`,
					}}
				>
					¥{price(lag)}
				</div>
				<div style={{fontFamily: PF.sans, fontSize: 44, color: P.red, opacity: bump}}>↓</div>
			</div>
		);
	};
	return (
		<div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 30}}>
			<div style={{display: 'flex', gap: 90}}>
				{tag('A 店', P.a, 0)}
				{tag('B 店', P.b, 0.27)}
			</div>
			<div style={{width: 600}}>
				<div style={{fontFamily: PF.sans, fontSize: 32, color: P.muted, marginBottom: 10}}>两家的利润</div>
				<div style={{height: 26, borderRadius: 13, background: 'rgba(255,255,255,0.08)'}}>
					<div style={{height: 26, width: `${profit * 100}%`, borderRadius: 13, background: profit < 0.3 ? P.red : P.green}} />
				</div>
			</div>
		</div>
	);
};

// 内卷：都加班，排名不变，人越来越累
const Involution: React.FC<{t: number}> = ({t}) => {
	const h = interpolate(t, [fr(0.3), fr(2.3)], [8, 14], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: easeInOut});
	const bar = (name: string, color: string, rank: string, extra: number) => (
		<div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12}}>
			<div style={{fontFamily: PF.mono, fontSize: 30, color: P.muted}}>排名 {rank}</div>
			<div style={{height: 300, width: 120, display: 'flex', alignItems: 'flex-end'}}>
				<div style={{width: 120, height: ((h + extra) / 15) * 300, borderRadius: 16, background: `linear-gradient(180deg, ${color}, ${color}55)`}} />
			</div>
			<div style={{fontFamily: PF.mono, fontSize: 40, fontWeight: 800, color: P.text}}>{(h + extra).toFixed(0)}h</div>
			<div style={{fontFamily: PF.sans, fontSize: 32, fontWeight: 700, color}}>{name}</div>
		</div>
	);
	return (
		<div style={{display: 'flex', alignItems: 'flex-end', gap: 70}}>
			{bar('A', P.a, '第 1', 0.3)}
			{bar('B', P.b, '第 2', 0)}
			<div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, marginLeft: 10, marginBottom: 60}}>
				<div style={{fontFamily: PF.sans, fontSize: 34, color: P.muted}}>疲惫值</div>
				<div style={{fontFamily: PF.mono, fontSize: 64, fontWeight: 800, color: P.red}}>{Math.round(interpolate(h, [8, 14], [20, 96]))}%</div>
			</div>
		</div>
	);
};

// 军备竞赛：都加码，安全感不变
const Arms: React.FC<{t: number}> = ({t}) => {
	const n = (lag: number) => Math.min(5, Math.max(0, Math.floor((t - fr(0.3 + lag)) / fr(0.4)) + 1));
	const stack = (color: string, count: number, name: string) => (
		<div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14}}>
			<div style={{height: 330, display: 'flex', flexDirection: 'column-reverse', gap: 10}}>
				{Array.from({length: count}, (_, i) => (
					<div key={i} style={{width: 150, height: 56, borderRadius: 12, background: `${color}33`, border: `3px solid ${color}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: PF.sans, fontSize: 28, fontWeight: 700, color}}>
						武器 +1
					</div>
				))}
			</div>
			<div style={{fontFamily: PF.sans, fontSize: 34, fontWeight: 700, color}}>{name}</div>
		</div>
	);
	const wobble = Math.sin(t / 3) * 4;
	return (
		<div style={{display: 'flex', alignItems: 'flex-end', gap: 50}}>
			{stack(P.a, n(0), 'A 国')}
			<div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 90}}>
				<div style={{fontFamily: PF.sans, fontSize: 30, color: P.muted}}>安全感</div>
				<svg width={200} height={120} viewBox="0 0 200 120">
					<path d="M 20 110 A 80 80 0 0 1 180 110" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth={16} strokeLinecap="round" />
					<line x1={100} y1={110} x2={100} y2={44} stroke={P.text} strokeWidth={6} strokeLinecap="round" transform={`rotate(${wobble} 100 110)`} />
				</svg>
				<div style={{fontFamily: PF.sans, fontSize: 34, fontWeight: 800, color: P.red}}>没变</div>
			</div>
			{stack(P.b, n(0.2), 'B 国')}
		</div>
	);
};

const CARDS = [
	{no: '01', title: '价格战', line: '都降价，谁也没多赚', Body: PriceWar},
	{no: '02', title: '内卷', line: '都加班，排名没变，人更累了', Body: Involution},
	{no: '03', title: '军备竞赛', line: '都扩军，谁也没更安全', Body: Arms},
];

export const P5Life: React.FC = () => {
	const frame = useCurrentFrame();
	const starts = [fr(K.c1), fr(K.c2), fr(K.c3)];
	return (
		<AbsoluteFill>
			<div style={{position: 'absolute', left: 0, right: 0, top: 250, textAlign: 'center', opacity: progress(frame, 0, 12)}}>
				<span style={{fontFamily: PF.sans, fontSize: 46, fontWeight: 600, color: P.muted, letterSpacing: 4}}>生活里的囚徒困境</span>
			</div>
			{CARDS.map((card, i) => {
				const s = starts[i];
				const t = frame - s;
				if (t < -2 || t > CARD + 10) return null;
				const enter = progress(frame, s, 12, easeOut);
				const exit = i < CARDS.length - 1 ? progress(frame, s + CARD - 8, 10, easeInOut) : 0;
				const x = (1 - enter) * 420 - exit * 520;
				return (
					<div
						key={card.no}
						style={{
							position: 'absolute',
							left: 125,
							top: 360,
							width: 830,
							height: 1000,
							borderRadius: 40,
							background: 'linear-gradient(180deg, rgba(28,31,40,0.96), rgba(16,18,24,0.96))',
							border: `1px solid ${P.line}`,
							boxShadow: '0 40px 100px rgba(0,0,0,0.6)',
							transform: `translateX(${x}px) rotate(${(1 - enter) * 4 - exit * 4}deg)`,
							opacity: Math.min(enter * 1.5, 1 - exit),
							display: 'flex',
							flexDirection: 'column',
							alignItems: 'center',
							padding: '50px 40px',
							boxSizing: 'border-box',
						}}
					>
						<div style={{fontFamily: PF.mono, fontSize: 30, color: P.muted, letterSpacing: 4}}>例 {card.no}</div>
						<div style={{fontFamily: PF.serif, fontWeight: 900, fontSize: 120, color: P.text, marginTop: 6, letterSpacing: 8}}>{card.title}</div>
						<div style={{flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
							<card.Body t={t} />
						</div>
						<div style={{fontFamily: PF.sans, fontWeight: 700, fontSize: 50, color: P.text, textAlign: 'center', lineHeight: 1.4}}>{card.line}</div>
					</div>
				);
			})}
			{starts.map((s, i) => (
				<Sfx key={i} name="whoosh" at={s} volume={0.7} />
			))}
			{[0, 1, 2, 3].map((k) => (
				<Sfx key={`a${k}`} name="cash" at={starts[0] + fr(0.35 + k * 0.55)} volume={0.5} />
			))}
			<Sfx name="count" at={starts[1] + fr(0.3)} volume={0.6} />
			{[0, 1, 2, 3, 4].map((k) => (
				<Sfx key={`m${k}`} name="thud" at={starts[2] + fr(0.3 + k * 0.4)} volume={0.45} />
			))}
		</AbsoluteFill>
	);
};
