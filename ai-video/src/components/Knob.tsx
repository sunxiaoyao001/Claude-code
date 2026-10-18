import {C} from '../theme';

// 旋钮：一个圆 + 一根指针
export const Knob: React.FC<{size: number; angle: number; glow?: number}> = ({size, angle, glow = 0}) => (
	<svg width={size} height={size} viewBox="0 0 100 100" style={{overflow: 'visible'}}>
		<circle cx={50} cy={50} r={44} fill={C.surface2} stroke={glow > 0 ? C.amber : 'rgba(255,255,255,0.18)'} strokeWidth={4} opacity={1} />
		{glow > 0 ? <circle cx={50} cy={50} r={48} fill="none" stroke={C.amber} strokeWidth={3} opacity={0.5 * glow} /> : null}
		<line
			x1={50}
			y1={50}
			x2={50}
			y2={14}
			stroke={glow > 0 ? C.amber : C.text}
			strokeWidth={7}
			strokeLinecap="round"
			transform={`rotate(${angle} 50 50)`}
		/>
		<circle cx={50} cy={50} r={6} fill={C.dim} />
	</svg>
);
