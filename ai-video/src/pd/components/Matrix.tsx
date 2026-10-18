import {interpolate} from 'remotion';
import {P, PF} from '../theme';

// 收益矩阵：行 = A 的选择，列 = B 的选择；格子里左上是 A 的刑期，右下是 B 的刑期
export const CELL_W = 330;
export const CELL_H = 270;
export const LABEL_W = 130;
export const HEAD_H = 92;
export const GAP = 16;
export const MX = 110; // 矩阵左上角
export const MY = 560;

export const cellRect = (row: number, col: number) => ({
	x: MX + LABEL_W + col * (CELL_W + GAP),
	y: MY + HEAD_H + row * (CELL_H + GAP),
	w: CELL_W,
	h: CELL_H,
});

// [row][col]
export const VALUES = [
	[
		['1 年', '1 年'],
		['10 年', '释放'],
	],
	[
		['释放', '10 年'],
		['5 年', '5 年'],
	],
];

export type CellState = {
	appear: number; // 0~1
	dim?: number; // 0~1，越大越暗
	glow?: number; // 0~1
	glowColor?: string;
	emphA?: number; // 0~1 放大 A 的数字
	emphB?: number;
	check?: number; // 0~1 在 A 的数字旁打勾
	red?: number; // 0~1 变成"牢房"红
};

export const Matrix: React.FC<{
	cells: CellState[][]; // [row][col]
	labels: number; // 0~1
	rowHL?: [number, number];
	colHL?: [number, number];
}> = ({cells, labels, rowHL = [0, 0], colHL = [0, 0]}) => (
	<>
		{/* 列标题：B */}
		{['沉默', '揭发'].map((t, col) => {
			const r = cellRect(0, col);
			const hl = colHL[col];
			return (
				<div
					key={`c${col}`}
					style={{
						position: 'absolute',
						left: r.x,
						top: MY,
						width: CELL_W,
						height: HEAD_H - 14,
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'center',
						gap: 12,
						opacity: labels,
						borderRadius: 16,
						background: `rgba(76,201,240,${0.08 + 0.22 * hl})`,
						border: `2px solid rgba(76,201,240,${0.25 + 0.75 * hl})`,
						boxShadow: hl > 0 ? `0 0 ${30 * hl}px rgba(76,201,240,${0.5 * hl})` : 'none',
					}}
				>
					<span style={{fontFamily: PF.mono, fontWeight: 800, fontSize: 40, color: P.b}}>B</span>
					<span style={{fontFamily: PF.sans, fontWeight: 700, fontSize: 42, color: P.text}}>{t}</span>
				</div>
			);
		})}
		{/* 行标题：A */}
		{['沉默', '揭发'].map((t, row) => {
			const r = cellRect(row, 0);
			const hl = rowHL[row];
			return (
				<div
					key={`r${row}`}
					style={{
						position: 'absolute',
						left: MX,
						top: r.y,
						width: LABEL_W - 16,
						height: CELL_H,
						display: 'flex',
						flexDirection: 'column',
						alignItems: 'center',
						justifyContent: 'center',
						gap: 8,
						opacity: labels,
						borderRadius: 16,
						background: `rgba(255,178,63,${0.08 + 0.22 * hl})`,
						border: `2px solid rgba(255,178,63,${0.25 + 0.75 * hl})`,
						boxShadow: hl > 0 ? `0 0 ${30 * hl}px rgba(255,178,63,${0.5 * hl})` : 'none',
					}}
				>
					<span style={{fontFamily: PF.mono, fontWeight: 800, fontSize: 40, color: P.a}}>A</span>
					<span style={{fontFamily: PF.sans, fontWeight: 700, fontSize: 40, color: P.text, writingMode: 'vertical-rl', letterSpacing: 6}}>{t}</span>
				</div>
			);
		})}
		{/* 格子 */}
		{cells.map((rowCells, row) =>
			rowCells.map((s, col) => {
				const r = cellRect(row, col);
				const [va, vb] = VALUES[row][col];
				const glowColor = s.glowColor ?? P.a;
				const red = s.red ?? 0;
				const glow = s.glow ?? 0;
				const border = red > 0 ? P.red : glow > 0 ? glowColor : 'rgba(255,255,255,0.12)';
				return (
					<div
						key={`${row}${col}`}
						style={{
							position: 'absolute',
							left: r.x,
							top: r.y,
							width: r.w,
							height: r.h,
							borderRadius: 22,
							overflow: 'hidden',
							opacity: s.appear * (1 - 0.72 * (s.dim ?? 0)),
							transform: `scale(${interpolate(s.appear, [0, 1], [0.86, 1])})`,
							background: red > 0 ? `rgba(255,77,77,${0.16 * red})` : P.surface,
							border: `3px solid ${border}`,
							boxShadow:
								red > 0
									? `0 0 ${60 * red}px rgba(255,77,77,${0.55 * red}), inset 0 0 40px rgba(255,77,77,${0.25 * red})`
									: glow > 0
										? `0 0 ${50 * glow}px ${glowColor}88, inset 0 0 30px ${glowColor}22`
										: '0 20px 50px rgba(0,0,0,0.4)',
						}}
					>
						<svg width={r.w} height={r.h} style={{position: 'absolute', inset: 0}}>
							<line x1={r.w - 30} y1={30} x2={30} y2={r.h - 30} stroke="rgba(255,255,255,0.1)" strokeWidth={2} />
						</svg>
						<div
							style={{
								position: 'absolute',
								left: 28,
								top: 22,
								fontFamily: PF.sans,
								fontWeight: 800,
								fontSize: 62,
								color: P.a,
								transformOrigin: 'left top',
								transform: `scale(${1 + 0.22 * (s.emphA ?? 0)})`,
								textShadow: s.emphA ? `0 0 ${30 * s.emphA}px rgba(255,178,63,0.8)` : 'none',
							}}
						>
							{va}
							{s.check ? <span style={{marginLeft: 10, fontSize: 48, color: P.green, opacity: s.check}}>✓</span> : null}
						</div>
						<div
							style={{
								position: 'absolute',
								right: 28,
								bottom: 20,
								fontFamily: PF.sans,
								fontWeight: 800,
								fontSize: 62,
								color: P.b,
								transformOrigin: 'right bottom',
								transform: `scale(${1 + 0.22 * (s.emphB ?? 0)})`,
								textShadow: s.emphB ? `0 0 ${30 * s.emphB}px rgba(76,201,240,0.8)` : 'none',
							}}
						>
							{vb}
						</div>
					</div>
				);
			}),
		)}
	</>
);

// 铁栏杆：从上往下落进某个格子
export const JailBars: React.FC<{row: number; col: number; p: number}> = ({row, col, p}) => {
	const r = cellRect(row, col);
	const drop = interpolate(p, [0, 1], [-r.h - 40, 0]);
	return (
		<div style={{position: 'absolute', left: r.x, top: r.y, width: r.w, height: r.h, overflow: 'hidden', borderRadius: 22, pointerEvents: 'none'}}>
			<div style={{position: 'absolute', left: 0, top: drop, width: r.w, height: r.h}}>
				{Array.from({length: 6}, (_, i) => (
					<div
						key={i}
						style={{
							position: 'absolute',
							left: 22 + i * ((r.w - 56) / 5),
							top: 0,
							width: 12,
							height: r.h,
							borderRadius: 6,
							background: 'linear-gradient(90deg, #3A3F4A, #9AA3B2 45%, #4A505C)',
							boxShadow: '0 0 10px rgba(0,0,0,0.6)',
						}}
					/>
				))}
				<div style={{position: 'absolute', left: 0, top: 34, width: r.w, height: 14, background: 'linear-gradient(180deg, #4A505C, #9AA3B2, #3A3F4A)'}} />
			</div>
		</div>
	);
};
