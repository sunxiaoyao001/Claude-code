import {useCurrentFrame} from 'remotion';
import {blink} from '../anim';
import {C, F} from '../theme';

// 填空框：没有 fill 时虚线框闪烁；有 fill 时显示该字
export const Blank: React.FC<{size?: number; fill?: React.ReactNode; color?: string; fillScale?: number; border?: string}> = ({
	size = 132,
	fill,
	color = C.amber,
	fillScale = 1,
	border,
}) => {
	const frame = useCurrentFrame();
	const empty = fill === undefined || fill === null || fill === '';
	return (
		<span
			style={{
				display: 'inline-flex',
				alignItems: 'center',
				justifyContent: 'center',
				width: size,
				height: size,
				marginLeft: size * 0.08,
				verticalAlign: 'middle',
				borderRadius: size * 0.16,
				border: `${Math.max(3, size * 0.03)}px ${empty ? 'dashed' : 'solid'} ${border ?? color}`,
				opacity: empty ? 0.35 + 0.65 * blink(frame, 36) : 1,
				background: empty ? 'transparent' : 'rgba(255,178,63,0.08)',
				position: 'relative',
				top: -size * 0.06,
			}}
		>
			<span style={{display: 'inline-block', color, fontFamily: F.serif, fontWeight: 800, transform: `scale(${fillScale})`}}>{fill}</span>
		</span>
	);
};
