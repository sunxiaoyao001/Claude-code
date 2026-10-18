// 主作品：白纸上的 2×2 收益矩阵。行 = A 的选择，列 = B 的选择；1 个基线单位 = 1 年刑期。
import {BEAT, CELL_BUILD, E16, E8, T, YEARS} from '../score';
import {C, collapse, knifeLine, lin, lerp, snap, steps} from '../sys';
import {Reveal} from './Type';

// ———————— 作品网格（世界坐标，镜头不动时 = 屏幕坐标）————————
export const S = {x0: 72, x1: 936, y0: 768, y1: 1488, head: 816, strip: 168, midX: 552, midY: 1152};
export const cellX = (c: number) => S.strip + c * 384;
export const cellY = (r: number) => S.head + r * 336;
export const MOD = 24; // 1 年
export const SLAB = {x: cellX(0) + 24, y: cellY(0) + 288, w: 336, h: 24}; // 合作：两人各 1 年，共用一块
export const LABEL = (r: number, c: number, who: 0 | 1) => ({x: cellX(c) + (who ? 200 : 24), y: cellY(r) + 64});
const ROW_MID = [984, 1320];
const COL_MID = [360, 744];

type Del = {tk: number; axis: 'v' | 'h'; mid: number} | null;
const groupT = (t: number, d: Del) => {
	if (!d) return undefined;
	const k = Math.max(0.0001, collapse(t, d.tk));
	if (k >= 1) return undefined;
	return d.axis === 'v' ? `translate(0 ${d.mid}) scale(1 ${k}) translate(0 ${-d.mid})` : `translate(${d.mid} 0) scale(${k} 1) translate(${-d.mid} 0)`;
};
const gone = (t: number, d: Del) => !!d && t >= d.tk + E8;

const DISMANTLE: Record<string, number> = {r1c1: T.dismantle, r1c0: T.dismantle + E16, r0c1: T.dismantle + E16, r0c0: T.dismantle + E8};
const FINAL: Record<string, number> = {r0c0: T.finalCut, r0c1: T.finalCut, r1c0: T.finalCut, r1c1: T.finalCut + E16};
const FRAME_DEL = {H: T.dismantle + 3 * E16, E: T.finalCut + E8};

export type Phase = 'H' | 'R' | 'E';
export const phaseOf = (t: number): Phase => (t < T.r1 ? 'H' : t < T.wallIn ? 'R' : 'E');

// 一格里的内容：数字标签 + 刑期色块
const Cell: React.FC<{r: number; c: number; t: number}> = ({r, c, t}) => {
	const key = `r${r}c${c}`;
	const ph = phaseOf(t);
	const X = cellX(c);
	const Y = cellY(r);
	const [ya, yb] = YEARS[r][c];
	const built = ph === 'R' ? CELL_BUILD[key] : -1;
	if (ph === 'R' && t < built - E16) return null;
	let del: Del = null;
	if (ph === 'H') del = {tk: DISMANTLE[key], axis: 'v', mid: Y + 168};
	if (ph === 'E') del = {tk: FINAL[key], axis: 'v', mid: Y + 168};
	if (ph === 'R' && r === 0) del = {tk: T.knifeRow, axis: 'v', mid: ROW_MID[0]};
	if (ph === 'R' && r === 1 && c === 0) del = {tk: T.knifeCol, axis: 'h', mid: COL_MID[0]};
	if (gone(t, del)) return null;

	// 开场：镜头贴着的三个数字各自一格一格爬上来；"年"字等拉远后才出现
	const climb = (t0: number) => steps(t, t0 - E16, t0 - E16 + BEAT, 4);
	const hookA = ph === 'H' && key === 'r1c0' ? climb(T.a0) : ph === 'H' && key === 'r1c1' ? climb(T.five) : 1;
	const hookB = ph === 'H' && key === 'r0c1' ? climb(T.b0) : 1;
	const pA = built < 0 ? hookA : snap(t, built, E16);
	const pB = built < 0 ? hookB : snap(t, built + E16, E16);
	const sufA = ph === 'H' ? snap(t, T.pull + E16 * (r * 2 + c), E16) : pA;
	const sufB = ph === 'H' ? snap(t, T.pull + E16 * (r * 2 + c + 1), E16) : pB;
	const bar = (years: number) => (built < 0 ? years * MOD : years * MOD * steps(t, built, built + years * E16, Math.max(1, years)));
	const coop = r === 0 && c === 0;
	const la = LABEL(r, c, 0);
	const lb = LABEL(r, c, 1);
	const bottom = Y + 312;
	return (
		<g transform={groupT(t, del)}>
			{/* 年份模块的细线（作品网格） */}
			{Array.from({length: 10}, (_, k) => {
				const p = built < 0 ? 1 : lin(t, built - E8 + k * 0.02, built + k * 0.02);
				return p > 0 ? <rect key={k} x={X + 24} y={bottom - (k + 1) * MOD} width={336 * p} height={1} fill={C.gridPaper} /> : null;
			})}
			{!coop && ya > 0 ? <rect x={X + 24} y={bottom - bar(ya)} width={160} height={bar(ya)} fill={C.ink} /> : null}
			{!coop && yb > 0 ? <rect x={X + 200} y={bottom - bar(yb)} width={160} height={bar(yb)} fill={C.voice2} /> : null}
			<Reveal text={String(ya)} x={la.x} y={la.y} size={48} weight={700} color={C.ink} p={pA} optical />
			<Reveal text="年" x={la.x + (ya >= 10 ? 60 : 34)} y={la.y} size={20} weight={500} color={C.mute} p={sufA} />
			<Reveal text={String(yb)} x={lb.x} y={lb.y} size={48} weight={700} color={C.b} p={pB} optical />
			<Reveal text="年" x={lb.x + (yb >= 10 ? 60 : 34)} y={lb.y} size={20} weight={500} color={C.mute} p={sufB} />
		</g>
	);
};

// 刀线
const Knife: React.FC<{t: number; tk: number; x1: number; y1: number; x2: number; y2: number}> = ({t, tk, x1, y1, x2, y2}) => {
	const p = knifeLine(t, tk);
	if (p <= 0) return null;
	return <line x1={x1} y1={y1} x2={lerp(x1, x2, p)} y2={lerp(y1, y2, p)} stroke={C.ink} strokeWidth={2} />;
};

export const Matrix: React.FC<{t: number}> = ({t}) => {
	const ph = phaseOf(t);
	// 纸：开场就在；生活例子和重复博弈期间被别的版面盖住；结尾擦回又擦走
	const sheetH = ph === 'E' ? (S.y1 - S.y0) * (snap(t, T.heroIn, E8) - snap(t, T.finalCut + 3 * E16, E8)) : S.y1 - S.y0;

	// ———— 两块"人"→ 两条坐标轴（规则一、二）————
	const blockA = [288, 1224, 160, 240];
	const blockB = [672, 1224, 160, 240];
	const stripR = [S.x0, S.head, S.strip - S.x0, S.y1 - S.head];
	const headR = [S.strip, S.y0, S.x1 - S.strip, S.head - S.y0];
	const morph = (from: number[], to: number[], p: number) => from.map((v, i) => lerp(v, to[i], p));
	let aRect: number[] | null = null;
	let bRect: number[] | null = null;
	if (ph === 'R' && t < T.morphA) {
		const rise = snap(t, T.blockA, E8);
		if (rise > 0) aRect = [blockA[0], blockA[1] + blockA[3] * (1 - rise), blockA[2], blockA[3] * rise];
	}
	if (ph === 'R' && t >= T.morphA - BEAT / 2 && t < T.morphA) aRect = morph(blockA, stripR, snap(t, T.morphA, BEAT / 2));
	if (ph === 'R' && t < T.morphB) {
		const rise = snap(t, T.blockB, E8);
		if (rise > 0) bRect = [blockB[0], blockB[1] + blockB[3] * (1 - rise), blockB[2], blockB[3] * rise];
	}
	if (ph === 'R' && t >= T.morphB - BEAT / 2 && t < T.morphB) bRect = morph(blockB, headR, snap(t, T.morphB, BEAT / 2));
	const axesOn = ph !== 'R' || t >= T.morphA; // 行轴（墨）
	const headOn = ph !== 'R' || t >= T.morphB; // 列轴（灰）

	// 轴的删除
	const stripDel = (r: number): Del =>
		ph === 'H' ? {tk: FRAME_DEL.H, axis: 'v', mid: ROW_MID[r]} : ph === 'E' ? {tk: FRAME_DEL.E, axis: 'v', mid: ROW_MID[r]} : r === 0 ? {tk: T.knifeRow, axis: 'v', mid: ROW_MID[0]} : null;
	const headDel = (c: number): Del =>
		ph === 'H' ? {tk: FRAME_DEL.H, axis: 'v', mid: 792} : ph === 'E' ? {tk: FRAME_DEL.E, axis: 'v', mid: 792} : c === 0 ? {tk: T.knifeCol, axis: 'h', mid: COL_MID[0]} : null;
	const labelP = (i: number) => (ph === 'R' ? snap(t, T.labels + i * E16, E16) : 1);

	// ———— 十字线：竖线 = 规则一里的那道墙；横线 = 规则二 ————
	const vGrow = ph === 'R' ? lin(t, T.wallLine - E8, T.wallLine) : 1;
	const hGrow = ph === 'R' ? lin(t, T.cross - E8, T.cross) : 1;
	const lineOut = ph === 'H' ? lin(t, FRAME_DEL.H, FRAME_DEL.H + E8) : ph === 'E' ? lin(t, FRAME_DEL.E, FRAME_DEL.E + E8) : 0;

	// ———— 规则四：浅灰底衬、描边 ————
	const underH = ph === 'R' ? snap(t, T.under1, E8) - snap(t, T.underOut, E8) : 0;
	const underX = lerp(cellX(0), cellX(1), snap(t, T.under2, E8 * 2));
	const outline = (tEnd: number) => (ph === 'R' ? lin(t, tEnd - BEAT / 2, tEnd) : 0);

	// ———— 橙色：合作（唯一的例外）————
	let slab: React.ReactNode = null;
	if (ph !== 'E') {
		const del: Del = ph === 'H' ? {tk: DISMANTLE.r0c0, axis: 'v', mid: cellY(0) + 168} : null;
		const rise = ph === 'R' ? snap(t, T.c00, E16) : 1;
		const nudge = ph === 'R' ? 16 * (lin(t, T.twitch, T.twitch + E16) - snap(t, T.twitch + E8, E16)) : 0;
		if (rise > 0 && !gone(t, del))
			slab = (
				<g transform={groupT(t, del)}>
					<rect x={SLAB.x + nudge} y={SLAB.y + SLAB.h * (1 - rise)} width={SLAB.w} height={SLAB.h * rise} fill={C.signal} />
				</g>
			);
	}

	return (
		<g>
			<rect x={S.x0} y={S.y0} width={S.x1 - S.x0} height={Math.max(0, sheetH)} fill={C.paper} />
			{underH > 0 ? <rect x={underX} y={S.head} width={384} height={(S.y1 - S.head) * underH} fill={C.under} /> : null}

			{/* 行轴（A，墨） */}
			{aRect ? <rect x={aRect[0]} y={aRect[1]} width={aRect[2]} height={aRect[3]} fill={C.ink} /> : null}
			{axesOn
				? [0, 1].map((r) =>
						gone(t, stripDel(r)) ? null : (
							<g key={`s${r}`} transform={groupT(t, stripDel(r))}>
								<rect x={S.x0} y={cellY(r) - (r ? 1 : 0)} width={S.strip - S.x0} height={336 + 1} fill={C.ink} />
								<g transform={`rotate(-90 ${120} ${ROW_MID[r]})`}>
									<Reveal text={r ? 'A · 揭发' : 'A · 沉默'} x={120 - 46} y={ROW_MID[r] + 8} size={24} weight={600} color={C.paper} p={labelP(2 + r)} />
								</g>
							</g>
						),
					)
				: null}
			{/* 列轴（B，灰） */}
			{bRect ? <rect x={bRect[0]} y={bRect[1]} width={bRect[2]} height={bRect[3]} fill={C.voice2} /> : null}
			{headOn
				? [0, 1].map((c) =>
						gone(t, headDel(c)) ? null : (
							<g key={`h${c}`} transform={groupT(t, headDel(c))}>
								<rect x={cellX(c) - (c ? 1 : 0)} y={S.y0} width={384 + 1} height={S.head - S.y0} fill={C.voice2} />
								<Reveal text={c ? 'B · 揭发' : 'B · 沉默'} x={cellX(c) + 24} y={801} size={24} weight={600} color={C.ink} p={labelP(c)} />
							</g>
						),
					)
				: null}

			{/* 十字线（分段，跟着各自的行/列一起被删除） */}
			{vGrow > 0 && lineOut < 1
				? (
						[
							[S.y0, S.head, null],
							[S.head, S.midY, stripDel(0) && ph === 'R' ? stripDel(0) : null],
							[S.midY, S.y1, null],
						] as [number, number, Del][]
					).map(([a, b, d], i) => {
						const yEnd = S.y0 + (S.y1 - S.y0) * vGrow;
						if (yEnd <= a || gone(t, d)) return null;
						const y2 = Math.min(b, yEnd);
						const shrink = lineOut;
						return (
							<g key={`v${i}`} transform={groupT(t, d)}>
								<rect x={S.midX - 1} y={lerp(a, (a + y2) / 2, shrink)} width={2} height={(y2 - a) * (1 - shrink)} fill={C.ink} />
							</g>
						);
					})
				: null}
			{hGrow > 0 && lineOut < 1
				? (
						[
							[S.x0, S.strip, null],
							[S.strip, S.midX, ph === 'R' ? headDel(0) : null],
							[S.midX, S.x1, null],
						] as [number, number, Del][]
					).map(([a, b, d], i) => {
						const xEnd = S.x0 + (S.x1 - S.x0) * hGrow;
						if (xEnd <= a || gone(t, d)) return null;
						const x2 = Math.min(b, xEnd);
						const shrink = lineOut;
						return (
							<g key={`hl${i}`} transform={groupT(t, d)}>
								<rect x={lerp(a, (a + x2) / 2, shrink)} y={S.midY - 1} width={(x2 - a) * (1 - shrink)} height={2} fill={i === 0 ? C.paper : C.ink} />
							</g>
						);
					})
				: null}

			{/* 四格 */}
			{[0, 1].map((r) => [0, 1].map((c) => <Cell key={`${r}${c}`} r={r} c={c} t={t} />))}

			{/* 规则四的描边：A 的更优选择 */}
			{[
				[1, 0, T.outline1, {tk: T.knifeCol, axis: 'h', mid: COL_MID[0]} as Del],
				[1, 1, T.outline2, null],
			].map(([r, c, te, d]) => {
				const p = outline(te as number);
				const del = d as Del;
				if (p <= 0 || gone(t, del) || (ph === 'R' && t >= T.title)) return null;
				const X = cellX(c as number);
				const Y = cellY(r as number);
				const per = 2 * (384 + 336);
				return (
					<g key={`o${r}${c}`} transform={groupT(t, del)}>
						<rect x={X + 6} y={Y + 6} width={372} height={324} fill="none" stroke={C.ink} strokeWidth={4} strokeDasharray={per} strokeDashoffset={per * (1 - p)} />
					</g>
				);
			})}

			{slab}

			{/* 刀线 */}
			{ph === 'H'
				? Object.entries(DISMANTLE).map(([k, tk]) => {
						const X = cellX(Number(k[3]));
						const Y = cellY(Number(k[1]));
						return <Knife key={k} t={t} tk={tk} x1={X} y1={Y + 168} x2={X + 384} y2={Y + 168} />;
					})
				: null}
			{ph === 'E'
				? Object.entries(FINAL).map(([k, tk]) => {
						const X = cellX(Number(k[3]));
						const Y = cellY(Number(k[1]));
						return <Knife key={k} t={t} tk={tk} x1={X} y1={Y + 168} x2={X + 384} y2={Y + 168} />;
					})
				: null}
			{ph === 'R' ? <Knife t={t} tk={T.knifeRow} x1={S.x0} y1={ROW_MID[0]} x2={S.x1} y2={ROW_MID[0]} /> : null}
			{ph === 'R' ? <Knife t={t} tk={T.knifeCol} x1={COL_MID[0]} y1={S.y0} x2={COL_MID[0]} y2={S.y1} /> : null}
		</g>
	);
};

// 橙色旁边的坐标读数：被删掉的那一行里，只有它不在网格上了
export const Readout: React.FC<{t: number}> = ({t}) => {
	if (t < T.readout || t > T.title) return null;
	// 推进那两秒让开；拉回之后再出现
	const away = t >= T.push - BEAT && t < T.back + E8;
	const p = away ? 0 : snap(t, t >= T.back ? T.back + E8 + E16 : T.readout, E16);
	const q = t < T.push ? snap(t, T.push - BEAT, E8) : snap(t, T.title - E8, E8);
	return <Reveal text="row 0.50 · off grid" x={SLAB.x + SLAB.w + 18} y={SLAB.y + 20} size={20} weight={600} color={C.signal} p={p} q={q} />;
};
