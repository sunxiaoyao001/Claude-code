import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {P} from '../theme';

export const PdBackground: React.FC = () => {
	const frame = useCurrentFrame();
	return (
		<AbsoluteFill style={{backgroundColor: P.bg}}>
			<AbsoluteFill style={{background: 'radial-gradient(900px 1200px at 50% 40%, #11141C 0%, transparent 70%)'}} />
			<AbsoluteFill style={{background: 'radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,0.75) 100%)'}} />
			<svg width="100%" height="100%" style={{position: 'absolute', inset: 0, opacity: 0.08, mixBlendMode: 'overlay'}}>
				<filter id="pdgrain">
					<feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves={2} seed={Math.floor(frame / 2) % 10} />
					<feColorMatrix type="saturate" values="0" />
				</filter>
				<rect width="100%" height="100%" filter="url(#pdgrain)" />
			</svg>
		</AbsoluteFill>
	);
};
