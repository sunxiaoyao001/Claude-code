// 主作品：白纸上的 2×2 收益矩阵。行 = A 的选择，列 = B 的选择；1 个基线单位 = 1 年刑期。
// 象形图让它变成一张"人的信息图"：每人坐在自己那摞刑期上；刑期为 0 的人在数字"0"里往外走；
// 合作那块橙色上站着两个人。
import {BEAT, CELL_BUILD, E16, E8, T, YEARS} from '../score';
import {C, collapse, knifeLine, lerp, lin, measure, seg, snap, steps} from '../sys';
import {Bars, Chair, Figure, hipOnGround, hipOnSeat, Lamp, mixPose, POSES, Rise, Table} from './Picto';
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
const FIG_H = 118; // 矩阵里的小人（坐着约 70 高，正好装进 5 年的块）
export const COUPLE_H = 120;

type Del = {tk: number; axis: 'v' | 'h'; mid: number} | null;
const groupT = (t: number, d: Del) => {
	if (!d) return undefined;
	const k = Math.max(0.0001, collapse(t, d.tk));
	if (k >= 1) return undefined;
	return d.axis === 'v' ? `translate(0 ${d.mid}) scale(1 ${k}) translate(0 ${-d.mid})` : `translate(${d.mid} 0) scale(${k} 1) translate(${-d.mid} 0)`;
};
const gone = (t: number, d: Del) => !!d && t >= d.tk + E8;

const FINAL: Record<string, number> = {r0c0: T.finalCut, r0c1: T.finalCut, r1c0: T.finalCut, r1c1: T.finalCut + E16};
const FRAME_DEL = T.finalCut + E8;

// R = 序幕与规则（矩阵一格一格建起来），E = 结尾（墙之后擦回来的矩阵）
export type Phase = 'R' | 'E';
export const phaseOf = (t: number): Phase => (t < T.wallIn ? 'R' : 'E');

// 走路：每一拍换一次步子（精确缓动，落在拍上）
export const walkPose = (t: number) => {
	const k = Math.floor(t / BEAT);
	const p = snap(t, (k + 1) * BEAT, E8);
	const a = k % 2 ? POSES.walkB : POSES.walkA;
	const b = k % 2 ? POSES.walkA : POSES.walkB;
	return mixPose(a, b, p);
};

// 数字"0"的空心里，一个往外走的小人（刑期 0 = 自由）
const ZeroWalker: React.FC<{x: number; y: number; color: string; t: number; dir?: 1 | -1}> = ({x, y, color, t, dir = 1}) => {
	const m = measure('0', 48, 700);
	const asc = m.actualBoundingBoxAscent;
	const inkW = m.actualBoundingBoxLeft + m.actualBoundingBoxRight;
	const h = asc * 0.56;
	return <Figure x={x + inkW / 2 - dir * h * 0.02} y={y - asc * 0.5 + h * 0.06} h={h} dir={dir} pose={walkPose(t)} color={color} />;
};

// 一格里的内容：数字标签 + 刑期色块 + 坐在色块上的人
const Cell: React.FC<{r: number; c: number; t: number}> = ({r, c, t}) => {
	const key = `r${r}c${c}`;
	const ph = phaseOf(t);
	const X = cellX(c);
	const Y = cellY(r);
	const [ya, yb] = YEARS[r][c];
	const built = ph === 'R' ? CELL_BUILD[key] : -1;
	if (ph === 'R' && t < built - E16) return null;
	let del: Del = null;
	if (ph === 'E') del = {tk: FINAL[key], axis: 'v', mid: Y + 168};
	if (ph === 'R' && r === 0) del = {tk: T.knifeRow, axis: 'v', mid: ROW_MID[0]};
	if (ph === 'R' && r === 1 && c === 0) del = {tk: T.knifeCol, axis: 'h', mid: COL_MID[0]};
	if (gone(t, del)) return null;

	const pA = built < 0 ? 1 : snap(t, built, E16);
	const pB = built < 0 ? 1 : snap(t, built + E16, E16);
	const bar = (years: number) => (built < 0 ? years * MOD : years * MOD * steps(t, built, built + years * E16, Math.max(1, years)));
	const coop = r === 0 && c === 0;
	const la = LABEL(r, c, 0);
	const lb = LABEL(r, c, 1);
	const bottom = Y + 312;
	// 关在刑期里的人：反白（墨块里是纸色，灰块里是深灰），坐在块底，随块一起长出来
	const sitter = (years: number, xBar: number, color: string) => {
		if (coop || years <= 0) return null;
		const hgt = bar(years);
		if (hgt < 4) return null;
		return (
			<svg x={xBar} y={bottom - hgt} width={160} height={hgt} overflow="hidden">
				<g transform={`translate(${-xBar} ${-(bottom - hgt)})`}>
					<Figure x={xBar + 50} y={hipOnSeat(bottom - 4, FIG_H)} h={FIG_H} pose="slump" color={color} />
				</g>
			</svg>
		);
	};
	return (
		<g transform={groupT(t, del)}>
			{/* 年份模块的细线（作品网格） */}
			{Array.from({length: 10}, (_, k) => {
				const p = built < 0 ? 1 : lin(t, built - E8 + k * 0.02, built + k * 0.02);
				return p > 0 ? <rect key={k} x={X + 24} y={bottom - (k + 1) * MOD} width={336 * p} height={1} fill={C.gridPaper} /> : null;
			})}
			{!coop && ya > 0 ? <rect x={X + 24} y={bottom - bar(ya)} width={160} height={bar(ya)} fill={C.ink} /> : null}
			{!coop && yb > 0 ? <rect x={X + 200} y={bottom - bar(yb)} width={160} height={bar(yb)} fill={C.voice2} /> : null}
			{sitter(ya, X + 24, C.paper)}
			{sitter(yb, X + 200, C.b)}
			<Reveal text={String(ya)} x={la.x} y={la.y} size={48} weight={700} color={C.ink} p={pA} optical>
				{ya === 0 ? <ZeroWalker x={la.x} y={la.y} color={C.ink} t={t} /> : null}
			</Reveal>
			<Reveal text="年" x={la.x + (ya >= 10 ? 60 : 34)} y={la.y} size={20} weight={500} color={C.mute} p={pA} />
			<Reveal text={String(yb)} x={lb.x} y={lb.y} size={48} weight={700} color={C.b} p={pB} optical>
				{yb === 0 ? <ZeroWalker x={lb.x} y={lb.y} color={C.b} t={t} dir={-1} /> : null}
			</Reveal>
			<Reveal text="年" x={lb.x + (yb >= 10 ? 60 : 34)} y={lb.y} size={20} weight={500} color={C.mute} p={pB} />
		</g>
	);
};

// 刀线
const Knife: React.FC<{t: number; tk: number; x1: number; y1: number; x2: number; y2: number}> = ({t, tk, x1, y1, x2, y2}) => {
	const p = knifeLine(t, tk);
	if (p <= 0) return null;
	return <line x1={x1} y1={y1} x2={lerp(x1, x2, p)} y2={lerp(y1, y2, p)} stroke={C.ink} strokeWidth={2} />;
};

// 序幕：两间审讯室（A 墨，B 灰），中间隔一道墙。夜里只有灯下看得见（见 Intro.tsx）。
// 几何按 A 那一半写，B 沿中线镜像。
export const ROOM = {ground: 1408, lampX: 340, lampY: 1000, shadeW: 100, coneHW: 290, seatY: 1290, chairX: 214, sitX: 224, sitH: 210, tableX: 290, tableW: 140, tableY: 1258, copX: 486, copH: 240};
export const SHADE_H = ROOM.shadeW * 0.42;
const mirror = (side: 0 | 1) => (x: number) => (side ? 2 * S.midX - x : x);
// 灯：线沿长度垂下来（线性），灯罩在拍上落定
export const lampState = (t: number, side: 0 | 1) => {
	const t0 = side ? T.lampB : T.lampA;
	return {cord: lin(t, t0 - E8, t0), shade: snap(t, t0, E16)};
};
// 被审的人：坐下 → 想 → 在沉默和揭发之间来回 → 想
const sitterPose = (t: number, side: 0 | 1) => {
	const think = side ? T.thinkB : T.thinkA;
	let p = mixPose(POSES.sit, POSES.sitThink, snap(t, think, E8));
	T.torn.forEach((tt, i) => (p = mixPose(p, i % 2 ? POSES.sitPoint : POSES.sitSilent, snap(t, tt, E8))));
	return mixPose(p, POSES.sitThink, snap(t, T.flood, E8));
};
// 警察：从墙那边（暗处）两步走进灯下，站定，俯身指着他
const copState = (t: number, side: 0 | 1) => {
	const t0 = side ? T.copB : T.copA;
	const press = side ? T.pressB : T.pressA;
	const walk = steps(t, t0 - BEAT, t0, 2);
	const x = lerp(S.midX + 70, ROOM.copX, walk);
	const k = Math.floor(seg(t, t0 - BEAT, t0) * 2);
	const stride = snap(t, t0 - BEAT + (k + 1) * E8, E8);
	let pose = walk < 1 ? mixPose(k % 2 ? POSES.walkB : POSES.walkA, k % 2 ? POSES.walkA : POSES.walkB, stride) : POSES.stand;
	if (walk >= 1) pose = mixPose(POSES.stand, POSES.interrogate, snap(t, press, E8));
	return {on: t >= t0 - BEAT, x, pose};
};

const Room: React.FC<{t: number; side: 0 | 1}> = ({t, side}) => {
	const mx = mirror(side);
	const color = side ? C.b : C.ink;
	const dir: 1 | -1 = side ? -1 : 1;
	const {cord, shade} = lampState(t, side);
	const G = ROOM.ground;
	const lampX = mx(ROOM.lampX);
	const cop = copState(t, side);
	const [rx0, rx1] = side ? [S.midX, S.x1] : [S.x0, S.midX];
	return (
		<g>
			<clipPath id={`pd-room-${side}`}>
				<rect x={rx0} y={S.y0} width={rx1 - rx0} height={S.y1 - S.y0} />
			</clipPath>
			<g clipPath={`url(#pd-room-${side})`}>
				{cord > 0 ? <rect x={lampX - 2} y={S.y0} width={4} height={(ROOM.lampY - S.y0) * cord} fill={color} /> : null}
				<Rise x={lampX - 60} y={ROOM.lampY - 4} w={120} h={SHADE_H + 8} p={shade}>
					<Lamp x={lampX} top={ROOM.lampY} y={ROOM.lampY} w={ROOM.shadeW} color={color} />
				</Rise>
				<Table x={Math.min(mx(ROOM.tableX), mx(ROOM.tableX + ROOM.tableW))} y={ROOM.tableY} w={ROOM.tableW} legH={G - ROOM.tableY} color={color} />
				<Chair x={mx(ROOM.chairX)} seatY={ROOM.seatY} dir={dir} color={color} />
				<Figure x={mx(ROOM.sitX)} y={hipOnSeat(ROOM.seatY, ROOM.sitH)} h={ROOM.sitH} dir={dir} pose={sitterPose(t, side)} color={color} />
				{cop.on ? <Figure x={mx(cop.x)} y={hipOnGround(G, ROOM.copH)} h={ROOM.copH} dir={side ? 1 : -1} pose={cop.pose} color={C.ink} cap /> : null}
				<rect x={side ? S.midX : S.x0 + 24} y={G} width={side ? S.x1 - 24 - S.midX : S.midX - S.x0 - 24} height={2} fill={color} />
			</g>
		</g>
	);
};

export const Matrix: React.FC<{t: number}> = ({t}) => {
	const ph = phaseOf(t);
	// 纸：开场就在；生活例子和重复博弈期间被别的版面盖住；结尾擦回又擦走
	const sheetH = ph === 'E' ? (S.y1 - S.y0) * (snap(t, T.heroIn, E8) - snap(t, T.finalCut + 3 * E16, E8)) : S.y1 - S.y0;

	// ———— 序幕：审讯室（夜里在灯下）→ 点题后被刀切 → 坐标轴擦入 ————
	const roomsOn = ph === 'R' && t >= T.cut + E8 && t < T.knifeScene + E8;
	const roomsDel: Del = {tk: T.knifeScene, axis: 'v', mid: 1220};
	const axesOn = ph !== 'R' || t >= T.stripIn - E8; // 行轴（墨）
	const headOn = ph !== 'R' || t >= T.headIn - E8; // 列轴（灰）
	const stripWipe = (r: number) => (ph === 'R' ? snap(t, T.stripIn + r * E16, E8) : 1);
	const headWipe = (c: number) => (ph === 'R' ? snap(t, T.headIn + c * E16, E8) : 1);

	// 轴的删除
	const stripDel = (r: number): Del => (ph === 'E' ? {tk: FRAME_DEL, axis: 'v', mid: ROW_MID[r]} : r === 0 ? {tk: T.knifeRow, axis: 'v', mid: ROW_MID[0]} : null);
	const headDel = (c: number): Del => (ph === 'E' ? {tk: FRAME_DEL, axis: 'v', mid: 792} : c === 0 ? {tk: T.knifeCol, axis: 'h', mid: COL_MID[0]} : null);
	const labelP = (i: number) => (ph === 'R' ? snap(t, T.labels + i * E16, E16) : 1);

	// ———— 十字线：竖线 = 序幕里那道刀线留下的墙；横线 = 坐标轴擦入时 ————
	const vGrow = ph === 'R' ? lin(t, T.wallLine - E8, T.wallLine) : 1;
	const hGrow = ph === 'R' ? lin(t, T.cross - E8, T.cross) : 1;
	const lineOut = ph === 'E' ? lin(t, FRAME_DEL, FRAME_DEL + E8) : 0;

	// ———— 规则四：浅灰底衬、描边 ————
	const underH = ph === 'R' ? snap(t, T.under1, E8) - snap(t, T.underOut, E8) : 0;
	const underX = lerp(cellX(0), cellX(1), snap(t, T.under2, E8 * 2));
	const outline = (tEnd: number) => (ph === 'R' ? lin(t, tEnd - BEAT / 2, tEnd) : 0);

	// ———— 推进：铁栏一根一根落进"都揭发"那格 ————
	const barsGrow = ph === 'R' ? lin(t, T.barsDown, T.barsDown + 4 * E16) - lin(t, T.barsUp, T.barsUp + 2 * E16) : 0;

	// ———— 橙色：合作（唯一的例外），上面站着两个人 ————
	let slab: React.ReactNode = null;
	if (ph !== 'E') {
		const rise = snap(t, T.c00, E16);
		const people = snap(t, T.c00 + E8, E8);
		const nudge = 16 * (lin(t, T.twitch, T.twitch + E16) - snap(t, T.twitch + E8, E16));
		if (rise > 0)
			slab = (
				<g>
					<g transform={`translate(${nudge} 0)`}>
						<Rise x={SLAB.x} y={SLAB.y - COUPLE_H - 10} w={SLAB.w} h={COUPLE_H + 10} p={people}>
							<Figure x={SLAB.x + SLAB.w / 2 - 70} y={hipOnGround(SLAB.y, COUPLE_H)} h={COUPLE_H} pose="silent" color={C.ink} />
							<Figure x={SLAB.x + SLAB.w / 2 + 70} y={hipOnGround(SLAB.y, COUPLE_H)} h={COUPLE_H} dir={-1} pose="silent" color={C.b} />
						</Rise>
						<rect x={SLAB.x} y={SLAB.y + SLAB.h * (1 - rise)} width={SLAB.w} height={SLAB.h * rise} fill={C.signal} />
					</g>
				</g>
			);
	}

	return (
		<g>
			<rect x={S.x0} y={S.y0} width={S.x1 - S.x0} height={Math.max(0, sheetH)} fill={C.paper} />
			{underH > 0 ? <rect x={underX} y={S.head} width={384} height={(S.y1 - S.head) * underH} fill={C.under} /> : null}

			{roomsOn ? (
				<g transform={groupT(t, roomsDel)}>
					<Room t={t} side={0} />
					<Room t={t} side={1} />
				</g>
			) : null}
			{ph === 'R' ? <Knife t={t} tk={T.knifeScene} x1={S.x0} y1={1220} x2={S.x1} y2={1220} /> : null}

			{/* 行轴（A，墨） */}
			{axesOn
				? [0, 1].map((r) =>
						gone(t, stripDel(r)) ? null : (
							<g key={`s${r}`} transform={groupT(t, stripDel(r))}>
								<rect x={S.x0} y={cellY(r) - (r ? 1 : 0)} width={S.strip - S.x0} height={(336 + 1) * stripWipe(r)} fill={C.ink} />
								<g transform={`rotate(-90 ${120} ${ROW_MID[r]})`}>
									<Reveal text={r ? 'A · 揭发' : 'A · 沉默'} x={120 - 46} y={ROW_MID[r] + 8} size={24} weight={600} color={C.paper} p={labelP(2 + r)} />
								</g>
							</g>
						),
					)
				: null}
			{/* 列轴（B，灰） */}
			{headOn
				? [0, 1].map((c) =>
						gone(t, headDel(c)) ? null : (
							<g key={`h${c}`} transform={groupT(t, headDel(c))}>
								<rect x={cellX(c) - (c ? 1 : 0)} y={S.y0} width={(384 + 1) * headWipe(c)} height={S.head - S.y0} fill={C.voice2} />
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
							[S.head, S.midY, ph === 'R' ? stripDel(0) : null],
							[S.midY, S.y1, null],
						] as [number, number, Del][]
					).map(([a, b, d], i) => {
						const yEnd = S.y0 + (S.y1 - S.y0) * vGrow;
						if (yEnd <= a || gone(t, d)) return null;
						const y2 = Math.min(b, yEnd);
						return (
							<g key={`v${i}`} transform={groupT(t, d)}>
								<rect x={S.midX - 1} y={lerp(a, (a + y2) / 2, lineOut)} width={2} height={(y2 - a) * (1 - lineOut)} fill={C.ink} />
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
						return (
							<g key={`hl${i}`} transform={groupT(t, d)}>
								<rect x={lerp(a, (a + x2) / 2, lineOut)} y={S.midY - 1} width={(x2 - a) * (1 - lineOut)} height={2} fill={i === 0 ? C.paper : C.ink} />
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
				if (p <= 0 || gone(t, del) || (ph === 'R' && t >= T.insight)) return null;
				const X = cellX(c as number);
				const Y = cellY(r as number);
				const per = 2 * (384 + 336);
				return (
					<g key={`o${r}${c}`} transform={groupT(t, del)}>
						<rect x={X + 6} y={Y + 6} width={372} height={324} fill="none" stroke={C.ink} strokeWidth={4} strokeDasharray={per} strokeDashoffset={per * (1 - p)} />
					</g>
				);
			})}

			{barsGrow > 0 ? <Bars x={cellX(1) + 14} y={cellY(1) + 10} w={356} h={316} n={8} sw={5} color={C.ink} grow={barsGrow} /> : null}

			{slab}

			{/* 刀线 */}
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
	if (t < T.readout || t > T.insight) return null;
	// 推进那两秒让开；拉回之后再出现
	const away = t >= T.push - BEAT && t < T.back + E8;
	const p = away ? 0 : snap(t, t >= T.back ? T.back + E8 + E16 : T.readout, E16);
	const q = t < T.push ? snap(t, T.push - BEAT, E8) : snap(t, T.insight - E8, E8);
	return <Reveal text="row 0.50 · off grid" x={SLAB.x + SLAB.w + 18} y={SLAB.y + 20} size={20} weight={600} color={C.signal} p={p} q={q} />;
};
