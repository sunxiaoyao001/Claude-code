import {interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';

// 逐字砸入：放大 → 落定，带模糊和 RGB 错位
export const SlamText: React.FC<{
	text: string;
	at: number;
	size: number;
	color: string;
	font: string;
	weight?: number;
	stagger?: number;
	glow?: string;
	glitch?: boolean;
	letterSpacing?: number;
	from?: number; // 起始放大倍数
}> = ({text, at, size, color, font, weight = 800, stagger = 2, glow, glitch = true, letterSpacing = 4, from = 1.9}) => {
	const frame = useCurrentFrame();
	const {fps} = useVideoConfig();
	const chars = Array.from(text);
	const d = frame - at;
	const split = glitch ? 16 * Math.exp(-Math.max(0, d) / 3.5) * (d >= 0 && d < 16 ? 1 : 0) : 0;
	const line = (offset: number, c: string, alpha: number) => (
		<div
			style={{
				position: offset === 0 ? 'relative' : 'absolute',
				left: offset,
				top: 0,
				whiteSpace: 'nowrap',
				fontFamily: font,
				fontWeight: weight,
				fontSize: size,
				letterSpacing,
				color: c,
				opacity: alpha,
				mixBlendMode: offset === 0 ? 'normal' : 'screen',
				textShadow: offset === 0 && glow ? `0 0 ${size * 0.35}px ${glow}` : 'none',
			}}
		>
			{chars.map((ch, i) => {
				const p = spring({frame: frame - at - i * stagger, fps, config: {damping: 13, stiffness: 210, mass: 0.6}});
				const blur = interpolate(p, [0, 1], [14, 0]);
				return (
					<span
						key={i}
						style={{
							display: 'inline-block',
							opacity: Math.min(1, p * 2),
							transform: `scale(${interpolate(p, [0, 1], [from, 1])})`,
							filter: blur > 0.3 ? `blur(${blur}px)` : undefined,
						}}
					>
						{ch}
					</span>
				);
			})}
		</div>
	);
	return (
		<div style={{position: 'relative', display: 'inline-block'}}>
			{split > 0.5 ? line(-split, 'rgb(255,60,80)', 0.7) : null}
			{split > 0.5 ? line(split, 'rgb(60,200,255)', 0.7) : null}
			{line(0, color, 1)}
		</div>
	);
};
