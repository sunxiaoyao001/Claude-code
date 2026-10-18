import {useCurrentFrame} from 'remotion';
import {P, PF} from '../theme';

// 监控画面：REC 闪烁 + 时间码 + 扫描线 + 四角取景框
export const Cctv: React.FC<{opacity: number}> = ({opacity}) => {
	const frame = useCurrentFrame();
	const sec = 47 * 60 + 12 + Math.floor(frame / 30);
	const tc = `23:${String(Math.floor(sec / 60) % 60).padStart(2, '0')}:${String(sec % 60).padStart(2, '0')}:${String(frame % 30).padStart(2, '0')}`;
	const corner = (x: number, y: number, rot: number) => (
		<path d="M 0 60 L 0 0 L 60 0" fill="none" stroke="rgba(243,239,232,0.55)" strokeWidth={4} transform={`translate(${x} ${y}) rotate(${rot})`} />
	);
	return (
		<div style={{position: 'absolute', inset: 0, opacity, pointerEvents: 'none'}}>
			<div
				style={{
					position: 'absolute',
					inset: 0,
					backgroundImage: 'repeating-linear-gradient(0deg, rgba(255,255,255,0.035) 0px, rgba(255,255,255,0.035) 2px, transparent 2px, transparent 5px)',
					transform: `translateY(${(frame * 2) % 5}px)`,
				}}
			/>
			<svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
				{corner(70, 200, 0)}
				{corner(1010, 200, 90)}
				{corner(1010, 1500, 180)}
				{corner(70, 1500, 270)}
			</svg>
			<div style={{position: 'absolute', left: 104, top: 232, display: 'flex', alignItems: 'center', gap: 14, fontFamily: PF.mono, fontSize: 30, fontWeight: 700, color: P.text, letterSpacing: 2}}>
				<span style={{width: 20, height: 20, borderRadius: 10, background: P.red, opacity: Math.floor(frame / 12) % 2 ? 0.25 : 1, boxShadow: `0 0 14px ${P.red}`}} />
				REC
			</div>
			<div style={{position: 'absolute', right: 104, top: 232, fontFamily: PF.mono, fontSize: 28, color: 'rgba(243,239,232,0.8)', letterSpacing: 2}}>{tc}</div>
			<div style={{position: 'absolute', right: 104, top: 278, fontFamily: PF.mono, fontSize: 24, color: 'rgba(243,239,232,0.55)', letterSpacing: 3}}>审讯室 · CAM 02</div>
		</div>
	);
};
