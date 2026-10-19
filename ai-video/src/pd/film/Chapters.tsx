// 点题、结论、生活里的三个例子、重复博弈的一整面墙、结尾
import {BEAT, E16, E8, ORANGE_AT, ORANGE_PAUSE, OPP, ROUNDS, T, TFT} from '../score';
import {C, collapse, FAMILY, fx, knifeLine, lerp, lin, RIGHT, snap, steps, track} from '../sys';
import {COUPLE_H, SLAB} from './Matrix';
import {Clock, Figure, hipOnGround, hipOnSeat, mixPose, Monitor, POSES, Rise, Rocket, Table, Tag} from './Picto';
import {Reveal} from './Type';

// ———————————————— 点题：灯光铺满纸面的那一拍 ————————————————
export const TitleCard: React.FC<{t: number}> = ({t}) => {
	if (t < T.title - E8 || t > T.r3) return null;
	const q = snap(t, T.r3 - E8, E8);
	const p = (dt: number) => snap(t, T.title + dt, E16);
	const bridge = (dt: number) => snap(t, T.stripIn + dt, E16);
	return (
		<g>
			<Reveal text="这就是博弈论里最有名的难题：" x={fx(0)} y={300} size={34} weight={500} color={C.mute} p={p(E16)} q={q} />
			<Reveal text="囚徒" x={fx(0)} y={520} size={196} weight={800} color={C.ink} p={p(2 * E16)} q={q} optical />
			<Reveal text="困境" x={fx(0) + 2 * 196 * 0.98 - 4} y={520} size={196} weight={800} color={C.ink} p={p(3 * E16)} q={q} />
			<Reveal text="The Prisoner's Dilemma" x={fx(0)} y={584} size={30} weight={600} color={C.ink} p={p(BEAT + E16)} q={q} />
			<Reveal text="先把条件，" x={fx(0)} y={662} size={52} weight={800} color={C.ink} p={bridge(0)} q={q} optical />
			<Reveal text="画成一张表。" x={fx(0) + 5 * 52} y={662} size={52} weight={800} color={C.ink} p={bridge(E16)} q={q} />
		</g>
	);
};

// ———————————————— 结论：一个用小人写成的等式 ————————————————
export const InsightCard: React.FC<{t: number}> = ({t}) => {
	if (t < T.insight - E8 || t > T.cases[0]) return null;
	const q = snap(t, T.cases[0] - E8, E8);
	const p = (dt: number) => snap(t, T.insight + dt, E16);
	const h = 124;
	const rows = [
		{g: 420, label: '各判 5 年', tin: T.insight + 0.5},
		{g: 652, label: '各判 1 年', tin: T.insight + 1.0},
	];
	return (
		<g>
			<Reveal text="所以，" x={fx(0)} y={300} size={34} weight={500} color={C.mute} p={p(E16)} q={q} />
			<Reveal text="个人理性" x={fx(0)} y={420} size={96} weight={800} color={C.ink} p={p(2 * E16)} q={q} optical />
			<Reveal text="≠" x={fx(0)} y={536} size={96} weight={800} color={C.ink} p={p(3 * E16)} q={q} />
			<Reveal text="集体理性。" x={fx(0)} y={652} size={96} weight={800} color={C.ink} p={p(4 * E16)} q={q} optical />
			{rows.map((r, i) => {
				const pin = snap(t, r.tin, E8);
				const cx = 760;
				return (
					<g key={i}>
						<Rise x={560} y={r.g - h - 30} w={RIGHT - 560} h={h + 30} p={pin} q={q}>
							{i === 0 ? (
								<>
									<Figure x={cx - 92} y={hipOnGround(r.g, h)} h={h} pose="point" color={C.ink} />
									<Figure x={cx + 92} y={hipOnGround(r.g, h)} h={h} dir={-1} pose="point" color={C.b} />
								</>
							) : (
								<>
									<Figure x={cx - 0.33 * h} y={hipOnGround(r.g, h)} h={h} pose="shake" color={C.ink} />
									<Figure x={cx + 0.33 * h} y={hipOnGround(r.g, h)} h={h} dir={-1} pose="shake" color={C.b} />
								</>
							)}
						</Rise>
						<rect x={600} y={r.g} width={(RIGHT - 600) * lin(t, r.tin - E8, r.tin) * (1 - q)} height={1} fill={C.ink} />
						<Reveal text={r.label} x={600} y={r.g + 30} size={22} weight={600} color={C.mute} p={snap(t, r.tin + E16, E16)} q={q} />
					</g>
				);
			})}
		</g>
	);
};

// ———————————————— 生活里：画面等分三格，平行案例 ————————————————
const CASES = [
	{title: '价格战', l1: '都降价，', l2: '谁也没多赚。', note: 'A 店 · B 店 — 利润趋近 0'},
	{title: '内卷', l1: '都加班，', l2: '排名没变，人更累。', note: 'A · B — 工时 8 → 14 h'},
	{title: '军备竞赛', l1: '都扩军，', l2: '谁也没更安全。', note: 'A 国 · B 国 — 安全感不变'},
];
const CASE_Y = [264, 672, 1080];
const CASE_H = 384;

const MiniMatrix: React.FC<{x: number; y: number; t: number; t0: number}> = ({x, y, t, t0}) => {
	const lines = lin(t, t0, t0 + E8);
	const climb = (n: number) => steps(t, t0 + 0.25, t0 + 0.25 + 5 * E16, 5) * n;
	const cell = 132;
	const h = 60; // 5 年
	return (
		<g>
			<rect x={x} y={y} width={2 * cell} height={2 * cell} fill="none" stroke={C.gridPaper} strokeWidth={1} />
			<rect x={x + cell - 1} y={y} width={2} height={2 * cell * lines} fill={C.ink} />
			<rect x={x} y={y + cell - 1} width={2 * cell * lines} height={2} fill={C.ink} />
			{/* 都揭发：各 5 年 */}
			<rect x={x + cell + 12} y={y + 2 * cell - 10 - climb(h)} width={52} height={climb(h)} fill={C.ink} />
			<rect x={x + cell + 70} y={y + 2 * cell - 10 - climb(h)} width={52} height={climb(h)} fill={C.voice2} />
			<Reveal text="5 · 5" x={x + cell + 12} y={y + cell + 34} size={24} weight={700} color={C.ink} p={snap(t, t0 + 0.875, E16)} />
		</g>
	);
};

// 每个例子一幅象形图（右侧 200 宽）
const CasePicto: React.FC<{k: number; y: number; t: number}> = ({k, y, t}) => {
	const g = y + 300;
	const h = 140;
	if (k === 0)
		// 价格战：两家店各举一块价签
		return (
			<>
				<Figure x={762} y={hipOnGround(g, h)} h={h} pose="holdUp" color={C.ink} />
				<Tag x={742} y={g - h * 1.05 - 46} s={44} color={C.ink} paper={C.paper} />
				<Figure x={882} y={hipOnGround(g, h)} h={h} dir={-1} pose="holdUp" color={C.b} />
				<Tag x={846} y={g - h * 1.05 - 46} s={44} color={C.b} paper={C.paper} />
			</>
		);
	if (k === 1)
		// 内卷：深夜十一点，两个人都还在电脑前
		return (
			<>
				<Clock x={822} y={g - 196} r={20} color={C.ink} hour={11} />
				<Table x={772} y={g - 70} w={100} legH={70} color={C.ink} t={8} />
				<Monitor x={772} y={g - 70 - 44} w={46} color={C.ink} paper={C.paper} />
				<Monitor x={826} y={g - 70 - 44} w={46} color={C.b} paper={C.paper} dir={-1} />
				<Figure x={742} y={hipOnSeat(g - 46, 118)} h={118} pose="typing" color={C.ink} />
				<Figure x={902} y={hipOnSeat(g - 46, 118)} h={118} dir={-1} pose="typing" color={C.b} />
			</>
		);
	// 军备竞赛：各自堆起导弹
	const n = (lag: number) => Math.min(3, Math.max(0, Math.floor((t - T.cases[2] - 0.25 - lag) / E8) + 1));
	return (
		<>
			{Array.from({length: n(0)}, (_, i) => (
				<Rocket key={`a${i}`} x={772 + i * 26} ground={g} s={56} color={C.ink} />
			))}
			{Array.from({length: n(E16)}, (_, i) => (
				<Rocket key={`b${i}`} x={872 - i * 26} ground={g} s={56} color={C.b} />
			))}
			<Figure x={728} y={hipOnGround(g, h)} h={h} pose="stand" color={C.ink} />
			<Figure x={916} y={hipOnGround(g, h)} h={h} dir={-1} pose="stand" color={C.b} />
		</>
	);
};

export const Cases: React.FC<{t: number}> = ({t}) => {
	if (t < T.cases[0] - E8 || t >= T.wallIn) return null;
	// 页面从下往上擦过来，盖住之前的一切
	const wipe = snap(t, T.cases[0], E8);
	return (
		<g>
			<rect x={0} y={1920 * (1 - wipe)} width={1080} height={1920 * wipe} fill={C.page} />
			{CASES.map((cs, k) => {
				const t0 = T.cases[k];
				const y = CASE_Y[k];
				const paper = snap(t, t0, E8);
				if (paper <= 0) return null;
				const tx = fx(2) + 40;
				return (
					<g key={cs.title}>
						<rect x={fx(0)} y={y} width={RIGHT - fx(0)} height={CASE_H * paper} fill={C.paper} />
						<MiniMatrix x={fx(0) + 24} y={y + 60} t={t} t0={t0} />
						<Reveal text={cs.title} x={tx} y={y + 132} size={72} weight={800} color={C.ink} p={snap(t, t0 + E16, E16)} optical />
						<Reveal text={cs.l1} x={tx} y={y + 204} size={34} weight={500} color={C.ink} p={snap(t, t0 + E8, E16)} />
						<Reveal text={cs.l2} x={tx} y={y + 250} size={34} weight={500} color={C.ink} p={snap(t, t0 + E8 + E16, E16)} />
						<rect x={tx} y={y + 304} width={(RIGHT - 24 - tx) * snap(t, t0 + BEAT, E8)} height={1} fill={C.ink} />
						<Reveal text={cs.note} x={tx} y={y + 334} size={19} weight={500} color={C.mute} p={snap(t, t0 + BEAT + E16, E16)} />
						<Reveal text={`例 0${k + 1}`} x={tx} y={y + 52} size={19} weight={600} color={C.mute} p={snap(t, t0 + E16, E16)} />
						<Rise x={700} y={y + 40} w={236} h={262} p={snap(t, t0 + 0.25, E8)}>
							<CasePicto k={k} y={y} t={t} />
						</Rise>
					</g>
				);
			})}
		</g>
	);
};

// ———————————————— 重复博弈：16 轮，一整面墙 ————————————————
const MINI = 192;
const GUT = 24;
const WALL = {x: fx(0), y: 552};
export const roundXY = (k: number) => ({x: WALL.x + (k % 4) * (MINI + GUT), y: WALL.y + Math.floor(k / 4) * (MINI + GUT)});
// 合作模块在第 k 轮的位置（"都沉默"那格的底部）
const slot = (k: number) => {
	const {x, y} = roundXY(k);
	return {x: x + 8, y: y + 82, w: 80, h: 8};
};
// 橙色在墙上的连续位置：线性、不吸附；第 4 轮停半拍（回头看一眼），第 5 轮只是路过
const depart = (k: number) => (k === 3 ? ORANGE_PAUSE[1] : ORANGE_AT[k]);
export const orangeOnWall = (t: number) => {
	if (t <= ORANGE_AT[0]) return {...slot(0), k: 0};
	for (let k = 1; k < ROUNDS; k++) {
		if (t <= depart(k - 1)) return {...slot(k - 1), k: k - 1};
		if (t <= ORANGE_AT[k]) {
			const p = lin(t, depart(k - 1), ORANGE_AT[k]);
			const s0 = slot(k - 1);
			const s1 = slot(k);
			return {x: lerp(s0.x, s1.x, p), y: lerp(s0.y, s1.y, p), w: 80, h: 8, k: k - 1 + p};
		}
	}
	return {...slot(ROUNDS - 1), k: ROUNDS - 1};
};
const WALL_CAM = track([
	[0, [WALL.x, WALL.y, fx(0), 744, Math.log(4)]],
	[T.wallPull, [WALL.x, WALL.y, WALL.x, WALL.y, 0], BEAT],
]);
const wallCutAt = (k: number) => {
	// 按到第 16 轮的距离排序，每个十六分切两块
	const order = Array.from({length: ROUNDS}, (_, i) => i).sort((a, b) => {
		const d = (i: number) => Math.hypot((i % 4) - 3, Math.floor(i / 4) - 3);
		return d(a) - d(b);
	});
	return T.wallCut + Math.floor(order.indexOf(k) / 2) * E16;
};

export const Wall: React.FC<{t: number}> = ({t}) => {
	if (t < T.wallIn - E8 || t >= T.heroIn) return null;
	const wipe = snap(t, T.wallIn, E8);
	const out = 1 - snap(t, T.heroIn, E8); // 结尾：页面向上收走，露出主矩阵
	const [wx, wy, sx, sy, ls] = WALL_CAM(t);
	const s = Math.exp(ls);
	const m = `matrix(${s} 0 0 ${s} ${sx - wx * s} ${sy - wy * s})`;
	const o = orangeOnWall(t);
	return (
		<g>
			<rect x={0} y={1920 * (1 - wipe)} width={1080} height={1920 * wipe * out} fill={C.page} />
			<g transform={m}>
				{Array.from({length: ROUNDS}, (_, k) => {
					const {x, y} = roundXY(k);
					// 第 1 轮先在；其余在拉远时按距离依次出现
					const tin = k === 0 ? T.wallIn : T.wallPull - BEAT + Math.floor(Math.hypot(k % 4, Math.floor(k / 4)) * 2) * E16 * 0.5;
					const pin = snap(t, tin, E8);
					const tk = wallCutAt(k);
					const kc = Math.max(0.0001, collapse(t, tk));
					if (pin <= 0 || t >= tk + E8) return null;
					const visited = ORANGE_AT[k] !== undefined && t >= ORANGE_AT[k] && TFT[k] === 'C' && OPP[k] === 'C';
					const tr = kc < 1 ? `translate(0 ${y + 96}) scale(1 ${kc}) translate(0 ${-(y + 96)})` : undefined;
					const kl = knifeLine(t, tk);
					return (
						<g key={k}>
							<g transform={tr}>
								<rect x={x} y={y} width={MINI} height={MINI * pin} fill={C.paper} />
								{visited ? <rect x={x + 8} y={y + 82} width={80} height={8} fill={C.voice2} /> : null}
								{k === 3 && t >= T.betray ? <rect x={x + 96} y={y} width={96 * snap(t, T.betray, E16)} height={96} fill={C.ink} /> : null}
								{k === 4 && t >= T.retaliate ? <rect x={x} y={y + 96} width={96 * snap(t, T.retaliate, E16)} height={96} fill={C.ink} /> : null}
								<rect x={x + 95} y={y} width={2} height={MINI * pin} fill={C.ink} />
								<rect x={x} y={y + 95} width={MINI * pin} height={2} fill={C.ink} />
								<Reveal text={String(k + 1).padStart(2, '0')} x={x} y={y - 10} size={19} weight={600} color={C.ink} p={snap(t, tin + E16, E16)} />
							</g>
							{kl > 0 ? <rect x={x} y={y + 95} width={MINI * kl} height={2} fill={C.ink} /> : null}
						</g>
					);
				})}
				{/* 橙色：唯一不吸附的东西 */}
				{t < T.heroIn ? <rect x={o.x} y={o.y} width={o.w} height={o.h} fill={C.signal} /> : null}
			</g>
			{/* 读数 */}
			{t >= T.wallPull && t < T.wallCut ? (
				<text x={o.x + 90} y={o.y + 8} fontFamily={FAMILY} fontSize={18} fontWeight={600} fill={C.signal} style={{fontVariantNumeric: 'tabular-nums'}}>
					{`R ${(o.k + 1).toFixed(2).padStart(5, '0')} · ${t >= ORANGE_PAUSE[0] && t < ORANGE_PAUSE[1] ? 'hold' : 'off grid'}`}
				</text>
			) : null}
			{/* 墙下的说明，像美术馆的标签 */}
			{t >= T.wallPull ? (
				<g>
					<rect x={fx(0)} y={1414} width={(4 * MINI + 3 * GUT) * snap(t, T.wallPull + E8, E8) * out} height={1} fill={C.ink} />
					<Reveal text="第 01–16 轮 · 行 = 一报还一报 · 列 = 对手" x={fx(0)} y={1442} size={19} weight={500} color={C.ink} p={snap(t, T.wallPull + E8 + E16, E16)} q={1 - out} />
				</g>
			) : null}
		</g>
	);
};

// ———————————————— 结尾：橙色回到主矩阵，最后只剩它和一个问题 ————————————————
export const EndingOrange: React.FC<{t: number}> = ({t}) => {
	if (t < T.heroIn) return null;
	const end = orangeOnWall(T.heroIn);
	// 先从墙上的位置线性地回到主矩阵"都沉默"那格（一路长大），落在第 35 小节的强拍上
	const p = lin(t, T.heroIn + E8, T.land);
	const x = lerp(end.x, SLAB.x, p);
	const y = lerp(end.y, SLAB.y, p);
	const w = lerp(end.w, SLAB.w, p);
	const h = lerp(end.h, SLAB.h, p);
	const onGrid = t >= T.land;
	return (
		<g>
			<rect x={x} y={y} width={w} height={h} fill={C.signal} />
			{/* 落回网格：读数压印在橙色里（墨字叠印在信号色上），旁边那格还在 */}
			{onGrid && t < T.land + 1.5 ? (
				<Reveal text="row 0.00 · on grid" x={SLAB.x + 12} y={SLAB.y + 18} size={16} weight={700} color={C.ink} p={snap(t, T.land + E16, E16)} q={snap(t, T.land + 1.5, E8)} />
			) : null}
			{t >= T.coupleIn - E8 ? <Couple t={t} /> : null}
			{t >= T.stop - E16 ? <Reveal text="合作" x={SLAB.x + SLAB.w + 18} y={SLAB.y + 22} size={28} weight={800} color={C.signal} p={snap(t, T.stop, E16)} /> : null}
		</g>
	);
};

// 橙色木板上的两个人：落定后站上去（捂着嘴），最后放大、走近、握手
const Couple: React.FC<{t: number}> = ({t}) => {
	const g = snap(t, T.grow, BEAT / 2);
	const h = lerp(COUPLE_H, 170, g);
	const cx = SLAB.x + SLAB.w / 2;
	const gap = lerp(70, 0.33 * 170, g);
	const sh = snap(t, T.shake, E8);
	const pose = mixPose(POSES.silent, POSES.shake, sh);
	return (
		<Rise x={SLAB.x - 40} y={SLAB.y - 190} w={SLAB.w + 80} h={190} p={snap(t, T.coupleIn, E8)}>
			<Figure x={cx - gap} y={hipOnGround(SLAB.y, h)} h={h} pose={pose} color={C.ink} />
			<Figure x={cx + gap} y={hipOnGround(SLAB.y, h)} h={h} dir={-1} pose={pose} color={C.b} />
		</Rise>
	);
};
