// 版面家具：注释行（顶部细线 + 三栏小字）、小节计数、技术注释、大数字位
import {BAR, BEAT, E16, E32, E8, NUMERALS, T} from '../score';
import {C, FAMILY, fx, lin, measure, RIGHT, snap, steps, textWidth} from '../sys';
import {Reveal} from './Type';

// ———— 注释行 ————
const CAPS: {tin: number; cells: [string, string, string]}[] = [
	{tin: 0, cells: ['挑战', '10 秒', '别想白熊']},
	{tin: T.title, cells: ['白熊效应', 'White Bear Effect', '心理学 · 思维抑制']},
	{tin: T.y1863, cells: ['白熊效应', '01 · 起源', '1863']},
	{tin: T.later, cells: ['白熊效应', '02 · 实验', '1987']},
	{tin: T.why, cells: ['白熊效应', '03 · 原理', '1994']},
	{tin: T.anything, cells: ['白熊效应', '04 · 生活里', '同一个机制']},
	{tin: T.how, cells: ['白熊效应', '05 · 办法', '2011']},
	{tin: T.now, cells: ['白熊效应', '尾声', '']},
];

export const CaptionRow: React.FC<{t: number}> = ({t}) => {
	const out: React.ReactNode[] = [];
	out.push(<rect key="rule" x={fx(0)} y={216} width={(RIGHT - fx(0)) * lin(t, 0, E8)} height={1} fill={C.ink} />);
	[0, 2, 4].forEach((col, ci) => {
		CAPS.forEach((cap, i) => {
			const text = cap.cells[ci];
			const prev = i > 0 ? CAPS[i - 1].cells[ci] : null;
			if (!text || text === prev) return;
			let j = i + 1;
			while (CAPS[j] && CAPS[j].cells[ci] === text) j++;
			const tout = CAPS[j] ? CAPS[j].tin : 999;
			const tin = cap.tin + (i === 0 ? E16 + ci * E32 : E16 + ci * E32);
			out.push(<Reveal key={`${ci}-${i}`} text={text} x={fx(col)} y={244} size={22} weight={500} color={C.ink} p={snap(t, tin, E16)} q={snap(t, tout, E16)} />);
		});
	});
	return <g>{out}</g>;
};

// ———— 小节计数（右上角）：3/4 拍 ————
export const BarCounter: React.FC<{t: number}> = ({t}) => {
	const tt = Math.min(t, T.stop);
	const bar = Math.floor(tt / BAR) + 1;
	const beat = Math.floor((tt % BAR) / BEAT) + 1;
	return (
		<g opacity={t >= E16 ? 1 : 0}>
			<text x={1008} y={244} textAnchor="end" fontFamily={FAMILY} fontSize={18} fontWeight={600} fill={C.ink} style={{fontVariantNumeric: 'tabular-nums'}}>
				{`bar ${String(bar).padStart(2, '0')}.${beat}`}
			</text>
			<text x={1008} y={268} textAnchor="end" fontFamily={FAMILY} fontSize={18} fontWeight={500} fill={C.mute}>
				♩ = 60 · 3/4
			</text>
		</g>
	);
};

// ———— 技术注释（第 5 栏，上半页底部）————
const NOTES: {tin: number; tout: number; lines: string[]}[] = [
	{tin: T.y1863 + E8, tout: T.quote1, lines: ['Ф. М. Достоевский', '1821–1881', '《冬天记的夏天印象》']},
	{tin: T.lab + E8, tout: T.grid, lines: ['Daniel M. Wegner', '1948–2013', 'JPSP 53(1): 5–13']},
	{tin: T.grid + E8, tout: T.stranger, lines: ['1 行 = 1 分钟', '1 格 = 10 秒', '■ = 按了一次铃（示意）']},
	{tin: T.workers + E8, tout: T.reveal, lines: ['Ironic Process Theory', 'Psychological Review', '101(1): 34–52']},
	{tin: T.method1 + E8, tout: T.method2, lines: ['Wegner et al. 1987', '实验二：专注于', '一个具体的替身']},
	{tin: T.method2 + E8, tout: T.now, lines: ['Wegner 2011', 'Setting Free the Bears', 'American Psychologist']},
];
export const Notes: React.FC<{t: number}> = ({t}) => {
	const n = NOTES.find((x) => t >= x.tin - E16 && t <= x.tout);
	if (!n) return null;
	const q = snap(t, n.tout, E16);
	const p = snap(t, n.tin, E16) * (1 - q);
	const x = fx(4);
	return (
		<g>
			<rect x={x} y={652} width={(RIGHT - x) * p} height={1} fill={C.ink} />
			{n.lines.map((s, i) => (
				<Reveal key={i} text={s} x={x} y={680 + i * 26} size={20} weight={500} color={C.ink} p={snap(t, n.tin + E32 + i * E32, E16)} q={q} />
			))}
		</g>
	);
};

// ———— 大数字位：年份一格一格爬上来，和下面的纸边对齐 ————
const NUM_SIZE = 226;
const NUM_BASE = 744;
export const Numeral: React.FC<{t: number}> = ({t}) => {
	const out: React.ReactNode[] = [];
	const h = measure('0', NUM_SIZE, 700).actualBoundingBoxAscent;
	for (const n of NUMERALS) {
		if (t < n.tin - E16 || t > n.tout) continue;
		const up = steps(t, n.tin - E16, n.tin - E16 + E8, 4);
		const down = snap(t, n.tout, E16);
		const off = (1 - up) * (h + 40) + down * (h + 40);
		const x = fx(0) + measure(n.text[0], NUM_SIZE, 700).actualBoundingBoxLeft;
		out.push(
			<svg key={n.text} x={0} y={NUM_BASE - h - 36} width={1080} height={h + 44} overflow="hidden">
				<text x={x} y={h + 36 + off} fontFamily={FAMILY} fontSize={NUM_SIZE} fontWeight={700} fill={C.ink} style={{letterSpacing: `${-0.02 * NUM_SIZE}px`, fontVariantNumeric: 'tabular-nums'}}>
					{n.text}
				</text>
			</svg>,
		);
	}
	return <g>{out}</g>;
};

// 宽度（给别的组件对齐用）
export const numeralWidth = (s: string) => textWidth(s, NUM_SIZE, 700);
