// 版面家具：注释行（顶部细线 + 三栏小字）、技术注释、小节计数、网格闪现、大数字位
import {BAR, BEAT, E16, E8, HOOK_NOTES, NUMERALS, T} from '../score';
import {C, FAMILY, FCW, fx, lin, measure, RIGHT, snap, steps, textWidth} from '../sys';
import {Reveal} from './Type';

// ———— 注释行 ————
const CAPS: {tin: number; cells: [string, string, string]}[] = [
	{tin: 0, cells: ['囚徒困境', "The Prisoner's Dilemma", '博弈论 · 1950']},
	{tin: T.r1, cells: ['囚徒困境', '规则 01 / 05', '两个人']},
	{tin: T.r2, cells: ['囚徒困境', '规则 02 / 05', '两个选择']},
	{tin: T.r3, cells: ['囚徒困境', '规则 03 / 05', '刑期 · 1 格 = 1 年']},
	{tin: T.r4, cells: ['囚徒困境', '规则 04 / 05', 'A 的算盘']},
	{tin: T.r5, cells: ['囚徒困境', '规则 05 / 05', 'B 也一样']},
	{tin: T.title, cells: ['囚徒困境', '一次博弈', 'Flood & Dresher · 1950']},
	{tin: T.cases[0], cells: ['囚徒困境', '生活里 · 3 例', '同一套规则']},
	{tin: T.wallIn, cells: ['囚徒困境', '重复博弈 · 16 轮', 'Axelrod · 1980']},
	{tin: T.wallCut, cells: ['囚徒困境', '一次 vs. 重复', '']},
	{tin: T.stop - 1, cells: ['囚徒困境', '完', '']},
];

export const CaptionRow: React.FC<{t: number}> = ({t}) => {
	const out: React.ReactNode[] = [];
	const line = lin(t, 0, BEAT);
	out.push(<rect key="rule" x={fx(0)} y={216} width={(RIGHT - fx(0)) * line} height={1} fill={C.ink} />);
	[0, 2, 4].forEach((col, ci) => {
		CAPS.forEach((cap, i) => {
			const text = cap.cells[ci];
			const prev = i > 0 ? CAPS[i - 1].cells[ci] : null;
			if (!text || text === prev) return;
			// 这一段文字一直持续到它被替换为止
			let j = i + 1;
			while (CAPS[j] && CAPS[j].cells[ci] === text) j++;
			const tout = CAPS[j] ? CAPS[j].tin : 999;
			const tin = cap.tin + (i === 0 ? E8 + ci * E16 : E16);
			const p = snap(t, tin, E16);
			const q = snap(t, tout, E8);
			out.push(<Reveal key={`${ci}-${i}`} text={text} x={fx(col)} y={244} size={22} weight={500} color={C.ink} p={p} q={q} />);
		});
	});
	return <g>{out}</g>;
};

// ———— 小节计数（右上角）————
export const BarCounter: React.FC<{t: number}> = ({t}) => {
	const tt = Math.min(t, T.stop);
	const bar = Math.floor(tt / BAR) + 1;
	const beat = Math.floor((tt % BAR) / BEAT) + 1;
	const s = `bar ${String(bar).padStart(2, '0')}.${beat}`;
	const p = snap(t, E8, E16);
	return (
		<g opacity={p > 0 ? 1 : 0}>
			<text x={1008} y={244} textAnchor="end" fontFamily={FAMILY} fontSize={18} fontWeight={600} fill={C.ink} style={{fontVariantNumeric: 'tabular-nums'}}>
				{s}
			</text>
			<text x={1008} y={268} textAnchor="end" fontFamily={FAMILY} fontSize={18} fontWeight={500} fill={C.mute}>
				♩ = 120
			</text>
		</g>
	);
};

// ———— 技术注释（第 5 栏，上半页底部）————
const NOTES: {tin: number; tout: number; lines: string[]}[] = [
	{tin: 4.5, tout: 7.875, lines: ['刑期 · 年', 'A 墨黑 · B 浅灰', '合作 · 橙']},
	{tin: 9.0, tout: 11.875, lines: ['嫌疑人 2', '隔离 1', '串供 0']},
	{tin: 12.75, tout: 15.875, lines: ['选择 2 × 2', '结局 4', '同时出手']},
	{tin: 16.75, tout: 25.875, lines: ['模块 160 × 24', '1 格 = 1 年', '最多 10 年']},
	{tin: 30.75, tout: 35.875, lines: ['视角 A', '比较 2 次', '删除 1 行']},
	{tin: 36.75, tout: 39.375, lines: ['视角 B', '删除 1 列', '剩下 1 格']},
	{tin: 42.375, tout: 43.875, lines: ['都揭发 5 + 5', '都沉默 1 + 1', '差 8 年']},
	{tin: 45.5, tout: 47.75, lines: ['Merrill Flood', 'Melvin Dresher', 'A. W. Tucker 命名']},
];
export const Notes: React.FC<{t: number}> = ({t}) => {
	const n = NOTES.find((x) => t >= x.tin - E8 && t <= x.tout + E8);
	if (!n) return null;
	const q = snap(t, n.tout, E8);
	const ruleP = snap(t, n.tin, E8) * (1 - q);
	const x = fx(4);
	return (
		<g>
			<rect x={x} y={652} width={(RIGHT - x) * ruleP} height={1} fill={C.ink} />
			{n.lines.map((s, i) => (
				<Reveal key={i} text={s} x={x} y={680 + i * 26} size={20} weight={500} color={C.ink} p={snap(t, n.tin + E16 + i * E16, E16)} q={q} />
			))}
		</g>
	);
};

// ———— 网格闪现：拆解之后，画面网格的 6 栏一栏一栏长出来再收起 ————
export const GridFlash: React.FC<{t: number}> = ({t}) => {
	if (t < T.dismantle || t > T.r1 + 1.5) return null;
	return (
		<g>
			{Array.from({length: 6}, (_, i) => {
				const p = snap(t, T.dismantle + (i + 1) * E16, E16) * (1 - snap(t, T.r1 + 0.75 + (5 - i) * E16 * 0.5, E8));
				if (p <= 0) return null;
				const top = 744 - (744 - 216) * p;
				return <rect key={i} x={fx(i)} y={top} width={FCW} height={(1488 - 216) * p} fill={C.gridPage} />;
			})}
		</g>
	);
};

// ———— 大数字位：规则编号一格一格爬上来，和下面的纸边对齐 ————
const NUM_SIZE = 330;
const NUM_BASE = 744;
export const Numeral: React.FC<{t: number}> = ({t}) => {
	const out: React.ReactNode[] = [];
	const h = measure('0', NUM_SIZE, 700).actualBoundingBoxAscent;
	for (const n of NUMERALS) {
		if (t < n.tin || t > n.tout) continue;
		const up = steps(t, n.tin, n.tin + BEAT, 4);
		const down = snap(t, n.tout, E8 * 2);
		const off = (1 - up) * (h + 40) + down * (h + 40);
		const tokens = n.text.length > 2 ? n.text.split(/(<)/) : [n.text];
		let x = fx(0) + measure(tokens[0][0], NUM_SIZE, 700).actualBoundingBoxLeft;
		const xs: number[] = [];
		const gap = tokens.length > 1 ? 28 : 0;
		for (const tk of tokens) {
			xs.push(x);
			x += textWidth(tk, NUM_SIZE, 700) + gap;
		}
		out.push(
			<svg key={n.text + n.tin} x={0} y={NUM_BASE - h - 36} width={1080} height={h + 44} overflow="hidden">
				{tokens.map((tk, i) => (
					<text
						key={i}
						x={xs[i]}
						y={h + 36 + off}
						fontFamily={FAMILY}
						fontSize={NUM_SIZE}
						fontWeight={700}
						fill={C.ink}
						style={{letterSpacing: `${-0.02 * NUM_SIZE}px`}}
					>
						{tk}
					</text>
				))}
			</svg>,
		);
		if (n.labels) {
			const q = snap(t, n.tout, E8);
			[0, 2].forEach((ti, li) =>
				out.push(
					<Reveal
						key={`lab${n.text}${li}`}
						text={n.labels![li]}
						x={xs[ti] + 8}
						y={NUM_BASE - h - 50}
						size={22}
						weight={600}
						color={C.mute}
						p={snap(t, n.tin + BEAT + li * E16, E16)}
						q={q}
					/>,
				),
			);
		}
	}
	return <g>{out}</g>;
};

// ———— 开场：镜头贴着数字时，底部一行注释（1px 细线 + 小字）————
export const HookNotes: React.FC<{t: number}> = ({t}) => {
	const n = HOOK_NOTES.find((x) => t >= x.tin - E8 && t <= x.tout);
	if (!n) return null;
	const q = snap(t, n.tout, E8);
	return (
		<g>
			<rect x={fx(0)} y={1412} width={(RIGHT - fx(0)) * lin(t, n.tin - E8, n.tin) * (1 - q)} height={1} fill={C.ink} />
			<Reveal text={n.text} x={fx(0)} y={1442} size={22} weight={600} color={C.ink} p={snap(t, n.tin + E16, E16)} q={q} />
		</g>
	);
};
