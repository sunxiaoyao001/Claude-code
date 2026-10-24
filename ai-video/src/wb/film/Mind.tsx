// 03 原理（60–90 秒，整屏是夜 = 脑子里）：
// 先是一只装在弹簧上的白熊：越往下压，弹得越高（问题）→ 两个"工人"走进来：找事的举着卡片，每拍翻一张；
// 检查的打着手电在黑暗里扫——要检查，就得先带着白熊的样子，于是每照一次，白熊就出现一次 →
// 找事的累得坐下，检查的越照越快，照到的白熊都留了下来 → 白熊从光里一圈圈铺满整个脑子，再一波波换成别的念头。
import {Figure, hipOnGround, mixPose, type Pose, POSES} from '../../pd/film/Picto';
import {CHECKS, E16, E32, E8, morphTime, SWARM, swarmTime, T} from '../score';
import {C, lerp, snap, steps, track} from '../sys';
import {BearModule, type Icon, stepsAt} from './Bear';
import {CropMarks, flipScale, FlipX, Knife, type Pt, pts, Slit} from './Kit';
import {Reveal} from './Type';

const NIGHT = {bg: C.night, ink: C.paper, lead: '#8A9099', rule: '#5C626C', faint: '#22262D'};

// ———————— 问题：弹簧上的白熊，压下去，再松手 ————————
const SPR = {x: 540, base: 1452, rest: 300, w: 120, coils: 8, s: 180};
const springH = track([
	[0, [SPR.rest]],
	[T.why + 0.75, [214], E16],
	[T.why + 1.25, [128], E16],
	[T.why + 2.5, [612], E8],
	[T.why + 2.75, [236], E16],
	[T.why + 3, [SPR.rest], E16],
]);
export const Spring: React.FC<{t: number}> = ({t}) => {
	if (t < T.why || t >= T.workers + E16) return null;
	const [h] = springH(t);
	const top = SPR.base - h;
	const n = SPR.coils * 2;
	const zig: Pt[] = [[SPR.x, SPR.base]];
	for (let i = 0; i < n; i++) zig.push([SPR.x + (i % 2 ? 1 : -1) * (SPR.w / 2), SPR.base - (h * (i + 0.5)) / n]);
	zig.push([SPR.x, top]);
	// 压板：落下来贴住白熊，跟着往下压；松手时一下飞走
	const down = snap(t, T.why + E16, E16);
	const away = snap(t, T.why + 2, E16);
	const plateY = lerp(lerp(600, top - SPR.s, down), -260, away);
	const enter = snap(t, T.why + E16, E16);
	return (
		<Knife t={t} tk={T.workers} mid={1100} line={C.paper}>
			<rect x={SPR.x - 120 * enter} y={SPR.base} width={240 * enter} height={10} fill={C.paper} />
			<polyline points={pts(zig)} fill="none" stroke={C.paper} strokeWidth={7} strokeLinejoin="round" strokeLinecap="round" opacity={enter > 0 ? 1 : 0} />
			<Slit x={SPR.x - SPR.s / 2} y={top - SPR.s} w={SPR.s} h={SPR.s} t={t} t0={T.why + E16} d={E16} line={C.paper}>
				<BearModule x={SPR.x - SPR.s / 2} y={top - SPR.s} s={SPR.s} t={t} />
			</Slit>
			{away < 1 && down > 0 ? (
				<g fill={C.paper}>
					<rect x={SPR.x - 150} y={plateY - 24} width={300} height={24} />
					{plateY - 24 > 640 ? <rect x={SPR.x - 6} y={640} width={12} height={plateY - 24 - 640} /> : null}
				</g>
			) : null}
			{/* 静止时的高度：一道虚线，好看出弹过了头 */}
			{Array.from({length: 18}, (_, i) => (
				<rect key={i} x={160 + i * 44} y={SPR.base - SPR.rest - SPR.s - 1} width={22 * snap(t, T.why + E8 + i * 0.01, E16)} height={2} fill="#5C626C" />
			))}
		</Knife>
	);
};

// ———————— 两个工人 ————————
const H = 340;
const FLOOR = 1430;
const HIP = hipOnGround(FLOOR, H);
const A_X = 230;
const B_X = 850;
const IN = T.workers + E16;
// 检查的：一只手举手电，另一只手举着白熊的样子
const TORCH_POSE: Pose = {lean: 4, tilt: -4, aF: [90, 92], aB: [-8, -3], lF: [5, 0], lB: [-5, 0]};
const CHECKER: Pose = {...TORCH_POSE, aB: [166, 176]};
const rad = (d: number) => (d * Math.PI) / 180;
const hand = (P: Pose, arm: 'aF' | 'aB'): Pt => {
	const sx = Math.sin(rad(180 - P.lean)) * 0.27;
	const sy = Math.cos(rad(180 - P.lean)) * 0.27;
	const mx = sx + Math.sin(rad(P[arm][0])) * 0.17;
	const my = sy + Math.cos(rad(P[arm][0])) * 0.17;
	return [mx + Math.sin(rad(P[arm][1])) * 0.16, my + Math.cos(rad(P[arm][1])) * 0.16];
};
const toScreen = (x: number, y: number, dir: 1 | -1, [hx, hy]: Pt): Pt => [x + dir * hx * H, y + hy * H];
const TORCH = toScreen(B_X, HIP, -1, hand(TORCH_POSE, 'aF'));
const TIP: Pt = [TORCH[0] - 30, TORCH[1]];

const walk = (t: number, from: number, to: number) => {
	const p = steps(t, IN, IN + 1, 2);
	const k = stepsAt(t, IN, E8);
	const pose = p < 1 ? mixPose(Math.floor(k) % 2 ? POSES.walkB : POSES.walkA, Math.floor(k) % 2 ? POSES.walkA : POSES.walkB, k % 1) : POSES.stand;
	return {x: lerp(from, to, p), pose};
};

// 卡片上的"别的事"：杯子、书、手机、音符
const CardIcon: React.FC<{k: number; x: number; y: number}> = ({k, x, y}) => {
	if (k === 0)
		return (
			<g fill={C.ink}>
				<rect x={x - 22} y={y - 20} width={36} height={42} />
				<circle cx={x + 20} cy={y} r={11} fill="none" stroke={C.ink} strokeWidth={6} />
			</g>
		);
	if (k === 1)
		return (
			<g fill={C.ink}>
				<path d={`M ${x - 38} ${y - 18} L ${x - 3} ${y - 10} L ${x - 3} ${y + 24} L ${x - 38} ${y + 16} Z`} />
				<path d={`M ${x + 38} ${y - 18} L ${x + 3} ${y - 10} L ${x + 3} ${y + 24} L ${x + 38} ${y + 16} Z`} />
			</g>
		);
	if (k === 2)
		return (
			<g>
				<rect x={x - 18} y={y - 30} width={36} height={60} rx={6} fill={C.ink} />
				<rect x={x - 12} y={y - 22} width={24} height={38} fill={C.paper} />
			</g>
		);
	return (
		<g fill={C.ink}>
			<rect x={x + 6} y={y - 30} width={6} height={46} />
			<path d={`M ${x + 12} ${y - 30} L ${x + 30} ${y - 22} L ${x + 30} ${y - 12} L ${x + 12} ${y - 20} Z`} />
			<ellipse cx={x - 2} cy={y + 18} rx={13} ry={10} />
		</g>
	);
};

// ———————— 手电：照到哪里，哪里就亮；检查一次，白熊出现一次 ————————
const cellXY = (c: number, r: number): Pt => [SWARM.x0 + c * SWARM.s, SWARM.y0 + r * SWARM.s];
// 越照越快时找到的白熊：落在之后那张"满脑子白熊"的格子上
const FOUND_CELLS: Pt[] = [
	[4, 2],
	[11, 1],
	[2, 5],
	[8, 4],
	[14, 3],
	[6, 7],
	[16, 5],
	[1, 2],
	[9, 1],
	[5, 4],
	[16, 1],
	[3, 8],
	[10, 7],
	[7, 2],
	[13, 4],
	[0, 6],
];
const FAST = CHECKS.filter((c) => c >= T.onlyB);
const FOUND_S = 100;
const CENTER: Pt = [470, 960];
const SWEEP = track([
	[0, [300, 860]],
	[T.workerB + 1, [300, 860], E8],
	[T.workerB + 1 + E8, [640, 780], E8],
	[T.workerB + 2 + E8, [180, 1060], E8],
	[T.reveal + E8, CENTER, E8],
]);
const beamPoly = (to: Pt, w: number, over = 60): Pt[] => {
	const dx = to[0] - TIP[0];
	const dy = to[1] - TIP[1];
	const L = Math.hypot(dx, dy) || 1;
	const ux = dx / L;
	const uy = dy / L;
	const fx = to[0] + ux * over;
	const fy = to[1] + uy * over;
	return [
		[TIP[0] - uy * 9, TIP[1] + ux * 9],
		[TIP[0] + uy * 9, TIP[1] - ux * 9],
		[fx + uy * w, fy - ux * w],
		[fx - uy * w, fy + ux * w],
	];
};
type Beam = {on: number; to: Pt; w: number; bear: number; s: number};
const beamAt = (t: number): Beam => {
	// 扫三下：什么也没有
	if (t >= T.workerB + E8 && t < T.reveal + E8) return {on: snap(t, T.workerB + E8 + E16, E16), to: SWEEP(t) as Pt, w: 150, bear: 0, s: 0};
	// 停在中间；带着白熊的样子去检查：一检查，白熊就在光里
	if (t >= T.reveal + E8 && t < T.answer) {
		const c = CHECKS.find((x) => x < T.answer && t >= x - E32 && t < x + 0.75);
		return {on: 1, to: CENTER, w: 150, bear: c === undefined ? 0 : snap(t, c, E32) * (1 - snap(t, c + 0.75, E16)), s: 190};
	}
	// 每检查一次：手电一亮，白熊就在
	if (t >= T.answer - E32 && t < T.tired) {
		const c = CHECKS.find((x) => x >= T.answer && x < T.tired && t >= x - E32 && t < x + 0.625);
		if (c === undefined) return {on: 0, to: CENTER, w: 170, bear: 0, s: 210};
		return {on: snap(t, c, E32) * (1 - snap(t, c + 0.625, E32)), to: CENTER, w: 170, bear: snap(t, c, E32), s: 210};
	}
	// 只剩检查的：一遍遍地照，照到的白熊留下来
	if (t >= T.onlyB - E32 && t < SWARM.t0) {
		const i = FAST.findIndex((c, j) => t >= c - E32 && t < (FAST[j + 1] ?? c + E8) - E32);
		if (i < 0) return {on: 0, to: CENTER, w: 90, bear: 0, s: FOUND_S};
		const [x, y] = cellXY(...FOUND_CELLS[i]);
		return {on: 1, to: [x + SWARM.s / 2, y + SWARM.s / 2], w: 90, bear: 0, s: FOUND_S};
	}
	return {on: 0, to: CENTER, w: 150, bear: 0, s: 190};
};

export const Mind: React.FC<{t: number}> = ({t}) => {
	if (t < IN || t >= T.sleep + E16) return null;
	const a = walk(t, -140, A_X);
	const b = walk(t, 1220, B_X);
	// A：举卡片；累了，坐到地上，卡片掉下来
	const tired = snap(t, T.tired + E8 + E16, E16);
	const aPose = t < T.workerA ? a.pose : mixPose(mixPose(POSES.stand, POSES.holdCard, snap(t, T.workerA + E16, E16)), {...POSES.sitFloor, tilt: 22, lean: 14}, tired);
	const aY = lerp(HIP, FLOOR - 0.06 * H, tired);
	const aHand = toScreen(A_X, HIP, 1, hand(POSES.holdCard, 'aF'));
	const cardOn = t >= T.workerA + E16;
	const flipK = Math.max(0, Math.floor(t - (T.workerA + 1)) + 1);
	const fl = flipScale(t, T.workerA + flipK, E32);
	const icon = Math.min(flipK, 11) % 4;

	// B：举手电；要检查，先把白熊的样子举起来
	const bPose = t < T.workerB ? b.pose : mixPose(mixPose(POSES.stand, TORCH_POSE, snap(t, T.workerB + E16, E16)), CHECKER, snap(t, T.reveal + E16, E16));
	const bRef = toScreen(B_X, HIP, -1, hand(CHECKER, 'aB'));
	const beam = beamAt(t);
	const people = t < SWARM.t0 + 1.25;
	return (
		<Knife t={t} tk={T.sleep} mid={1088} line={C.paper}>
			<CropMarks t={t} tin={IN + E8} tout={SWARM.t0} label="FIG. 3 — 脑子里的两个工人" theme={NIGHT} y0={790} />
			{/* 手电的光 */}
			{beam.on > 0 ? <polygon points={pts(beamPoly(beam.to, beam.w * beam.on, 60 * beam.on))} fill={C.page} /> : null}
			{beam.bear > 0 ? (
				<BearModule x={beam.to[0] - (beam.s * beam.bear) / 2} y={beam.to[1] - (beam.s * beam.bear) / 2} s={beam.s * beam.bear} t={t} step={stepsAt(t, T.reveal, E8)} />
			) : null}
			{people ? (
				<g>
					<rect x={72} y={FLOOR} width={936 * snap(t, IN + E16, E16)} height={2} fill="#3A3F48" />
					<Figure x={a.x} y={t < T.workerA ? HIP : aY} h={H} pose={aPose} color={C.paper} />
					<Figure x={b.x} y={HIP} h={H} dir={-1} pose={bPose} color={C.paper} />
					{t >= T.workerB ? <rect x={TIP[0]} y={TORCH[1] - 10} width={36 * snap(t, T.workerB + E16, E16)} height={20} fill={C.paper} /> : null}
					<Reveal text="找事的" x={A_X - 44} y={FLOOR + 50} size={26} weight={700} color={C.paper} p={snap(t, IN + 1, E16)} />
					<Reveal text="operating process" x={A_X - 44} y={FLOOR + 80} size={18} weight={500} color="#8A9099" p={snap(t, IN + 1 + E32, E16)} />
					<Reveal text="检查的" x={B_X - 44} y={FLOOR + 50} size={26} weight={700} color={C.paper} p={snap(t, IN + 1 + E16, E16)} />
					<Reveal text="monitoring process" x={B_X - 44} y={FLOOR + 80} size={18} weight={500} color="#8A9099" p={snap(t, IN + 1 + E16 + E32, E16)} />
					{/* A 的卡片：每拍翻一张"别的事" */}
					{cardOn ? (
						<Knife t={t} tk={T.tired + E8} mid={aHand[1] - 80} line={C.paper}>
							<Slit x={aHand[0] - 100} y={aHand[1] - 150} w={200} h={140} t={t} t0={T.workerA + E16} d={E32} line={C.paper}>
								<FlipX cx={aHand[0]} k={fl.k}>
									<rect x={aHand[0] - 100} y={aHand[1] - 150} width={200} height={140} fill={C.paper} />
									<CardIcon k={fl.after ? icon : (icon + 3) % 4} x={aHand[0]} y={aHand[1] - 80} />
								</FlipX>
							</Slit>
						</Knife>
					) : null}
					{/* B 举着的"白熊的样子" */}
					<Slit x={bRef[0] - 50} y={bRef[1] - 104} w={100} h={100} t={t} t0={T.reveal + E16} d={E32} line={C.paper}>
						<rect x={bRef[0] - 54} y={bRef[1] - 108} width={108} height={108} fill={C.paper} />
						<BearModule x={bRef[0] - 48} y={bRef[1] - 102} s={96} t={t} />
					</Slit>
				</g>
			) : null}
			<Swarm t={t} />
		</Knife>
	);
};

// ———————— 照到的白熊留下来 → 铺满整个脑子 → 换成别的念头 ————————
const ICONS: Icon[] = ['clock', 'person', 'cake', 'bear'];
const iconOf = (c: number, r: number): Icon => ICONS[(c + 2 * r) % 4];
const Swarm: React.FC<{t: number}> = ({t}) => {
	const out: React.ReactNode[] = [];
	const S = SWARM.s - 4;
	// 先画铺满的格子（被找到的那几格留给下面的"找到的白熊"）
	if (t >= SWARM.t0 - E32) {
		for (let r = 0; r < SWARM.rows; r++)
			for (let c = 0; c < SWARM.cols; c++) {
				if (FOUND_CELLS.some(([fc, fr]) => fc === c && fr === r)) continue;
				const ts = swarmTime(c, r);
				if (t < ts - E32) continue;
				const [x, y] = cellXY(c, r);
				const tm = morphTime(c, r);
				const f = flipScale(t, tm, E32);
				const icon: Icon = f.after ? iconOf(c, r) : 'bear';
				out.push(
					<Slit key={`${c}-${r}`} x={x + 2} y={y + 2} w={S} h={S} t={t} t0={ts} d={E32} line={C.paper}>
						<FlipX cx={x + 2 + S / 2} k={f.k}>
							<BearModule x={x + 2} y={y + 2} s={S} t={t} icon={icon} step={icon === 'bear' ? stepsAt(t, ts, E8) : 0} />
						</FlipX>
					</Slit>,
				);
			}
	}
	// 越照越快时找到的白熊：留在原处；格子铺过来时缩成一格
	FAST.forEach((c, i) => {
		if (t < c) return;
		const [cc, rr] = FOUND_CELLS[i];
		const [x, y] = cellXY(cc, rr);
		const shrink = snap(t, swarmTime(cc, rr), E16);
		const s = lerp(FOUND_S, S, shrink);
		const cx = x + SWARM.s / 2;
		const cy = y + SWARM.s / 2;
		const f = flipScale(t, morphTime(cc, rr), E32);
		const icon: Icon = f.after ? iconOf(cc, rr) : 'bear';
		const pop = snap(t, c + E32, E32);
		out.push(
			<FlipX key={`f${i}`} cx={cx} k={f.k}>
				<BearModule x={cx - (s * pop) / 2} y={cy - (s * pop) / 2} s={s * pop} t={t} icon={icon} step={icon === 'bear' ? stepsAt(t, c, E8) : 0} />
			</FlipX>,
		);
	});
	return <g>{out}</g>;
};
