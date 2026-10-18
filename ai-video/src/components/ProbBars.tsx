import {interpolate, useCurrentFrame} from 'remotion';
import {easeOut} from '../anim';
import {C, F} from '../theme';

export type Candidate = {label: string; p: number; color?: string};

// 候选字概率柱：start 帧开始逐条长出；highlight 帧之后最高的一条变琥珀色
export const ProbBars: React.FC<{
	items: Candidate[];
	start: number;
	highlight?: number;
	width?: number;
	rowHeight?: number;
	labelWidth?: number;
	labelSize?: number;
	stagger?: number;
	maxP?: number;
	grow?: number;
}> = ({items, start, highlight, width = 760, rowHeight = 76, labelWidth = 120, labelSize = 44, stagger = 4, maxP, grow = 22}) => {
	const frame = useCurrentFrame();
	const top = Math.max(...items.map((i) => i.p));
	const scaleMax = maxP ?? top;
	const barMax = width - labelWidth - 150;
	const hl = highlight !== undefined ? interpolate(frame, [highlight, highlight + 10], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}) : 0;
	return (
		<div style={{width, display: 'flex', flexDirection: 'column', gap: 10}}>
			{items.map((item, i) => {
				const g = interpolate(frame, [start + i * stagger, start + i * stagger + grow], [0, 1], {
					extrapolateLeft: 'clamp',
					extrapolateRight: 'clamp',
					easing: easeOut,
				});
				const isTop = item.p === top;
				const lit = isTop ? hl : 0;
				const fill = item.color ?? (lit > 0 ? C.amber : C.bar);
				return (
					<div key={item.label} style={{height: rowHeight, display: 'flex', alignItems: 'center', opacity: Math.min(1, g * 2)}}>
						<div
							style={{
								width: labelWidth,
								fontFamily: F.sans,
								fontWeight: 600,
								fontSize: labelSize,
								color: lit > 0 ? C.amber : C.text,
								textAlign: 'right',
								paddingRight: 28,
								whiteSpace: 'nowrap',
							}}
						>
							{item.label}
						</div>
						<div style={{position: 'relative', width: barMax, height: rowHeight * 0.5}}>
							<div style={{position: 'absolute', inset: 0, borderRadius: 8, background: 'rgba(255,255,255,0.035)'}} />
							<div
								style={{
									position: 'absolute',
									left: 0,
									top: 0,
									bottom: 0,
									width: Math.max(4, (item.p / scaleMax) * barMax * g),
									borderRadius: 8,
									background: fill,
									opacity: item.color ? 1 : lit > 0 ? 1 : 0.9,
									boxShadow: lit > 0 ? `0 0 ${30 * lit}px rgba(255,178,63,${0.45 * lit})` : 'none',
								}}
							/>
						</div>
						<div
							style={{
								width: 150,
								paddingLeft: 22,
								fontFamily: F.mono,
								fontSize: 30,
								fontWeight: 500,
								color: lit > 0 ? C.amber : C.muted,
							}}
						>
							{(item.p * 100 * g).toFixed(1)}%
						</div>
					</div>
				);
			})}
		</div>
	);
};
