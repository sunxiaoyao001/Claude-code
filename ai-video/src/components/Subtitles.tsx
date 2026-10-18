import {interpolate, useCurrentFrame} from 'remotion';
import type {TimedLine} from '../script';
import {C, F} from '../theme';

export const Subtitles: React.FC<{lines: TimedLine[]}> = ({lines}) => {
	const frame = useCurrentFrame();
	const line = lines.find((l) => frame >= l.from && frame < l.from + l.duration);
	if (!line) return null;
	const opacity = interpolate(frame - line.from, [0, 4], [0, 1], {extrapolateRight: 'clamp'});
	return (
		<div style={{position: 'absolute', left: 0, right: 0, bottom: 58, display: 'flex', justifyContent: 'center'}}>
			<div
				style={{
					opacity,
					fontFamily: F.sans,
					fontSize: 46,
					fontWeight: 500,
					color: C.text,
					letterSpacing: 1.5,
					padding: '8px 30px',
					borderRadius: 12,
					background: 'rgba(8,9,12,0.62)',
					textShadow: '0 2px 10px rgba(0,0,0,0.7)',
				}}
			>
				{line.text}
			</div>
		</div>
	);
};
