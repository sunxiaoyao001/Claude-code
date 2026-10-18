// 人物剪影（半身）：顶光打在头肩，轮廓光从上往下渐弱
export const Figure: React.FC<{x: number; bottom: number; rim: string; lit: number; scale?: number; flip?: boolean}> = ({
	x,
	bottom,
	rim,
	lit,
	scale = 1,
	flip = false,
}) => {
	const w = 300 * scale;
	const h = 390 * scale;
	const id = `fig${Math.round(x)}${flip ? 'f' : ''}`;
	const body =
		'M 150 22 C 196 22 214 58 212 98 C 210 140 186 170 168 178 L 170 198 C 230 210 284 248 292 390 L 8 390 C 16 248 70 210 130 198 L 132 178 C 114 170 90 140 88 98 C 86 58 104 22 150 22 Z';
	return (
		<svg
			width={w}
			height={h}
			viewBox="0 0 300 390"
			style={{
				position: 'absolute',
				left: x - w / 2,
				top: bottom - h,
				overflow: 'visible',
				transform: flip ? 'scaleX(-1)' : undefined,
				filter: lit > 0 ? `drop-shadow(0 -6px ${16 * lit}px ${rim})` : undefined,
			}}
		>
			<defs>
				<linearGradient id={`${id}fill`} x1="0" y1="0" x2="0" y2="1">
					<stop offset="0" stopColor="#1B1E26" />
					<stop offset="1" stopColor="#08090C" />
				</linearGradient>
				<radialGradient id={`${id}top`} cx="0.5" cy="0.02" r="0.75">
					<stop offset="0" stopColor={rim} stopOpacity={0.55 * lit} />
					<stop offset="0.45" stopColor={rim} stopOpacity={0.12 * lit} />
					<stop offset="1" stopColor={rim} stopOpacity={0} />
				</radialGradient>
				<linearGradient id={`${id}rim`} x1="0" y1="0" x2="0" y2="1">
					<stop offset="0" stopColor={rim} stopOpacity={0.3 + 0.7 * lit} />
					<stop offset="0.55" stopColor={rim} stopOpacity={0.15 + 0.45 * lit} />
					<stop offset="1" stopColor={rim} stopOpacity={0.05} />
				</linearGradient>
			</defs>
			<path d={body} fill={`url(#${id}fill)`} />
			<path d={body} fill={`url(#${id}top)`} />
			<path d={body} fill="none" stroke={`url(#${id}rim)`} strokeWidth={4} />
		</svg>
	);
};
