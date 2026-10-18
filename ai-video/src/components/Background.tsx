import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {C} from '../theme';

const Grain: React.FC = () => {
	const frame = useCurrentFrame();
	return (
		<svg width="100%" height="100%" style={{position: 'absolute', inset: 0, opacity: 0.07, mixBlendMode: 'overlay'}}>
			<filter id="grain">
				<feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves={2} seed={Math.floor(frame / 2) % 12} />
				<feColorMatrix type="saturate" values="0" />
			</filter>
			<rect width="100%" height="100%" filter="url(#grain)" />
		</svg>
	);
};

export const Background: React.FC = () => {
	const dotMask = 'radial-gradient(ellipse 70% 65% at 50% 45%, black 20%, transparent 85%)';
	return (
		<AbsoluteFill style={{backgroundColor: C.bg}}>
			<AbsoluteFill
				style={{background: 'radial-gradient(1100px 650px at 50% 40%, rgba(255,178,63,0.055), transparent 70%)'}}
			/>
			<AbsoluteFill
				style={{
					backgroundImage: 'radial-gradient(rgba(255,255,255,0.075) 1.3px, transparent 1.3px)',
					backgroundSize: '38px 38px',
					maskImage: dotMask,
					WebkitMaskImage: dotMask,
				}}
			/>
			<AbsoluteFill style={{background: 'radial-gradient(ellipse at center, transparent 55%, rgba(0,0,0,0.6) 100%)'}} />
			<Grain />
		</AbsoluteFill>
	);
};
