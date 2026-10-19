import {chunks, chunkTime, E16, E8, type Line} from '../score';
import {C, FAMILY, FM, leftBearing, snap, textWidth, tracking} from '../sys';

// 一段文字从基线下方的裁切框里升起（p: 0→1），离场时向上翻走（q: 0→1）
export const Reveal: React.FC<{
	text: string;
	x: number;
	y: number; // 基线
	size: number;
	weight: number;
	color: string;
	p: number;
	q?: number;
	optical?: boolean; // 光学齐左
	children?: React.ReactNode; // 跟着文字一起升起、一起被裁切的图形（世界坐标）
}> = ({text, x, y, size, weight, color, p, q = 0, optical = false, children}) => {
	if (p <= 0 || q >= 1) return null;
	const w = textWidth(text, size, weight) + size * 0.25;
	const ox = optical ? leftBearing(text, size, weight) : 0;
	const top = y - size * 1.02;
	const h = size * 1.32;
	const dy = (1 - p) * size * 1.05 - q * size * 1.3;
	return (
		<svg x={x - ox - 6} y={top} width={w + 12} height={h} overflow="hidden">
			<text
				x={6}
				y={y - top + dy}
				fontFamily={FAMILY}
				fontWeight={weight}
				fontSize={size}
				fill={color}
				style={{letterSpacing: `${tracking(size)}px`, fontKerning: 'normal'}}
			>
				{text}
			</text>
			{children ? <g transform={`translate(${-(x - ox - 6)} ${-top + dy})`}>{children}</g> : null}
		</svg>
	);
};

// 中文与拉丁字母/数字相邻时，块与块之间补 1/4 字宽
const CJK = /[\u3000-\u9fff\uff00-\uffef]/;
const LATIN = /[A-Za-z0-9=<>≠]/;
const gapBetween = (a: string, b: string, size: number) => {
	const x = Array.from(a).pop() ?? '';
	const y = Array.from(b)[0] ?? '';
	return (CJK.test(x) && LATIN.test(y)) || (LATIN.test(x) && CJK.test(y)) ? size * 0.25 : 0;
};

// 版面里的一句话：灰色导语 + 粗体陈述，逐块（十六分音符）揭示
// night = 序幕夜里那一句：墨底上的纸色字
const KIND = {
	page: {lead: {size: 34, y: 300, color: C.mute}, bold: {size: 64, y: 380, lh: 76, color: C.ink}},
	hook: {lead: {size: 40, y: 312, color: C.mute}, bold: {size: 108, y: 432, lh: 120, color: C.ink}},
	question: {lead: {size: 34, y: 1288, color: C.mute}, bold: {size: 64, y: 1372, lh: 80, color: C.ink}},
	night: {lead: {size: 40, y: 312, color: C.b}, bold: {size: 108, y: 432, lh: 120, color: C.paper}},
} as const;

export const Statement: React.FC<{line: Line; t: number; x?: number}> = ({line, t, x = FM}) => {
	if (t < line.t0 - E8 || t > line.t1 + E8) return null;
	const k = KIND[line.kind ?? 'page'];
	const boldSize = line.size ?? k.bold.size;
	const q = snap(t, line.t1, E8);
	const out: React.ReactNode[] = [];
	let i = 0;
	let cx = x;
	const lead = chunks(line.lead);
	lead.forEach((c, j) => {
		if (j > 0) cx += gapBetween(lead[j - 1], c, k.lead.size);
		out.push(<Reveal key={`l${i}`} text={c} x={cx} y={k.lead.y} size={k.lead.size} weight={500} color={k.lead.color} p={snap(t, chunkTime(line, i), E16)} q={q} />);
		cx += textWidth(c, k.lead.size, 500);
		i++;
	});
	const y0 = line.size ? k.bold.y + (line.size - k.bold.size) * 0.8 : k.bold.y;
	line.bold.forEach((row, r) => {
		cx = x;
		const cs = chunks(row);
		cs.forEach((c, j) => {
			if (j > 0) cx += gapBetween(cs[j - 1], c, boldSize);
			out.push(
				<Reveal
					key={`b${i}`}
					text={c}
					x={cx}
					y={y0 + r * (line.size ? line.size * 1.18 : k.bold.lh)}
					size={boldSize}
					weight={800}
					color={k.bold.color}
					p={snap(t, chunkTime(line, i), E16)}
					q={q}
					optical={j === 0}
				/>,
			);
			cx += textWidth(c, boldSize, 800) - (j === 0 ? leftBearing(c, boldSize, 800) : 0);
			i++;
		});
	});
	return <g>{out}</g>;
};
