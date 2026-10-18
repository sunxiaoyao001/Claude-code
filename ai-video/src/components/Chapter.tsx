import {useCurrentFrame} from 'remotion';
import {progress} from '../anim';
import {C, F} from '../theme';

export const Chapter: React.FC<{no: string; title: string}> = ({no, title}) => {
	const frame = useCurrentFrame();
	const p = progress(frame, 4, 20);
	return (
		<div
			style={{
				position: 'absolute',
				left: 88,
				top: 70,
				display: 'flex',
				alignItems: 'center',
				gap: 18,
				opacity: p,
				transform: `translateX(${(1 - p) * -24}px)`,
			}}
		>
			<span style={{fontFamily: F.mono, fontSize: 26, fontWeight: 600, color: C.amber, letterSpacing: 2}}>{no}</span>
			<span style={{width: 44 * p, height: 2, background: C.dim}} />
			<span style={{fontFamily: F.sans, fontSize: 26, fontWeight: 500, color: C.muted, letterSpacing: 3}}>{title}</span>
		</div>
	);
};
