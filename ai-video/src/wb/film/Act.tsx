// 下半页那张纸是舞台。一幕：tin 时从纸的下沿裁切升起；tout 时一道横向刀线划过，整幕塌向中线。
import {E16} from '../score';
import {C, collapse, knifeLine, SHEET, snap} from '../sys';

export const CX = (SHEET.x0 + SHEET.x1) / 2; // 504
export const CY = (SHEET.y0 + SHEET.y1) / 2; // 1128
export const GROUND = 1408; // 纸上的地面
export const SW = SHEET.x1 - SHEET.x0;
export const SH = SHEET.y1 - SHEET.y0;

export const Act: React.FC<{
	t: number;
	tin: number; // 升起完成的时刻
	tout: number; // 刀切的时刻
	mid?: number; // 塌向哪条中线
	outside?: React.ReactNode; // 不受纸面裁切的部分（跟着一起被切掉）
	children?: React.ReactNode;
}> = ({t, tin, tout, mid = CY, outside, children}) => {
	if (t < tin - E16 || t >= tout + E16) return null;
	const p = snap(t, tin, E16);
	const k = Math.max(1e-4, collapse(t, tout));
	const kl = knifeLine(t, tout);
	return (
		<g>
			<g transform={k < 1 ? `translate(0 ${mid}) scale(1 ${k}) translate(0 ${-mid})` : undefined}>
				<svg x={SHEET.x0} y={SHEET.y0} width={SW} height={SH} overflow="hidden">
					<g transform={`translate(${-SHEET.x0} ${-SHEET.y0 + (1 - p) * SH})`}>{children}</g>
				</svg>
				{p >= 1 ? outside : null}
			</g>
			{kl > 0 ? <rect x={SHEET.x0} y={mid - 1} width={SW * kl} height={2} fill={C.ink} /> : null}
		</g>
	);
};

// 纸上的地面线（1px）
export const Floor: React.FC<{y?: number}> = ({y = GROUND}) => <rect x={SHEET.x0 + 24} y={y} width={SW - 48} height={2} fill={C.ink} />;

// 一个元素自己从下方裁切升起
export const Pop: React.FC<{x: number; y: number; w: number; h: number; p: number; q?: number; children: React.ReactNode}> = ({x, y, w, h, p, q = 0, children}) => {
	if (p <= 0 || q >= 1) return null;
	const dy = (1 - p) * h - q * h;
	return (
		<svg x={x} y={y} width={w} height={h} overflow="hidden">
			<g transform={`translate(${-x} ${-y + dy})`}>{children}</g>
		</svg>
	);
};
