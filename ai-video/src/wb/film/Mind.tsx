// 03 原理（Wegner 1994，讽刺性加工理论）：脑子里是暗的，有两个"工人"。
// 一个举起别的想法（卡片）；一个打着手电检查"有没有在想白熊"——手电照到哪里，白熊就在哪里。
// 暗 = 纸上的一张墨色遮罩；手电的光 = 遮罩上挖掉的多边形，白熊画在纸上，只在光里看得见。
import {Figure, hipOnGround, mixPose, type Pose, POSES} from '../../pd/film/Picto';
import {CHECKS, E16, E32, E8, T} from '../score';
import {C, collapse, knifeLine, lerp, lin, SHEET, snap, steps, track} from '../sys';
import {CX, GROUND, SH, SW} from './Act';
import {BearModule, type Icon} from './Bear';
import {Reveal} from './Type';

type Pt = [number, number];
const H = 230;
const A_X = 250;
const B_X = 790;
const HIP = hipOnGround(GROUND, H);
const TORCH: Pt = [B_X - 0.33 * H - 4, HIP - 0.27 * H + 2];

// 走进来：两步，每步一个八分音符
const walkIn = (t: number, from: number, to: number) => {
	const t0 = T.workers;
	const p = steps(t, t0, t0 + 2 * E8, 2);
	const k = Math.min(1, Math.floor(lin(t, t0, t0 + 2 * E8) * 2));
	const pose: Pose = p < 1 ? mixPose(k ? POSES.walkB : POSES.walkA, k ? POSES.walkA : POSES.walkB, snap(t, t0 + (k + 1) * E8, E8)) : POSES.stand;
	return {x: lerp(from, to, p), pose};
};

// 手电的目标：先扫三下（什么也没有），再停在中间；之后每次检查都换一个地方
const SWEEP = track([
	[0, [380, 960]],
	[T.workerB + E8, [380, 960]],
	[T.workerB + 1 + E8, [640, 900]],
	[T.workerB + 2 + E8, [430, 1060]],
	[T.reveal + E8, [CX, 1000]],
]);
const FOUND: Pt[] = [
	[330, 820],
	[560, 860],
	[180, 980],
	[420, 1030],
	[640, 1010],
	[250, 1160],
	[500, 1180],
	[120, 820],
	[700, 830],
	[360, 1270],
	[600, 1260],
	[760, 1000],
];
const FAST = CHECKS.filter((c) => c >= T.onlyB);
const SMALL = 110;
const BIG = 150;

const beamPoly = (to: Pt, w = 150, over = 70): Pt[] => {
	const [ax, ay] = TORCH;
	const dx = to[0] - ax;
	const dy = to[1] - ay;
	const L = Math.hypot(dx, dy) || 1;
	const ux = dx / L;
	const uy = dy / L;
	const nx = -uy;
	const ny = ux;
	const fx = to[0] + ux * over;
	const fy = to[1] + uy * over;
	return [
		[ax + nx * 7, ay + ny * 7],
		[ax - nx * 7, ay - ny * 7],
		[fx - nx * w, fy - ny * w],
		[fx + nx * w, fy + ny * w],
	];
};

// 某一时刻：手电开没开、照向哪里、光里有没有白熊
const beamAt = (t: number): {on: boolean; to: Pt; bear: boolean; s: number} => {
	if (t >= T.workerB && t < T.answer) {
		const [x, y] = SWEEP(t);
		const near = CHECKS.find((c) => c < T.answer && t >= c && t < c + 0.625);
		return {on: true, to: [x, y], bear: near !== undefined, s: BIG};
	}
	if (t >= T.answer && t < T.tired) {
		const c = CHECKS.find((x) => x >= T.answer && x < T.tired && t >= x - E32 && t < x + E8);
		return {on: c !== undefined, to: [CX, 1000], bear: c !== undefined && t >= c, s: BIG};
	}
	if (t >= T.onlyB - E32 && t < T.anything) {
		const i = FAST.findIndex((c) => t >= c - E32 && t < c + 0.375);
		if (i < 0) return {on: false, to: [CX, 1000], bear: false, s: SMALL};
		const [x, y] = FOUND[i];
		return {on: true, to: [x + SMALL / 2, y + SMALL / 2], bear: t >= FAST[i], s: SMALL};
	}
	return {on: false, to: [CX, 1000], bear: false, s: BIG};
};

// 卡片上的"别的想法"：杯子、书、手机（墨线画在纸卡上）
const CardIcon: React.FC<{k: number; x: number; y: number}> = ({k, x, y}) => {
	if (k === 0)
		return (
			<g fill={C.ink}>
				<rect x={x - 18} y={y - 16} width={30} height={34} />
				<circle cx={x + 16} cy={y} r={9} fill="none" stroke={C.ink} strokeWidth={5} />
			</g>
		);
	if (k === 1)
		return (
			<g fill={C.ink}>
				<path d={`M ${x - 30} ${y - 14} L ${x - 2} ${y - 8} L ${x - 2} ${y + 18} L ${x - 30} ${y + 12} Z`} />
				<path d={`M ${x + 30} ${y - 14} L ${x + 2} ${y - 8} L ${x + 2} ${y + 18} L ${x + 30} ${y + 12} Z`} />
			</g>
		);
	return (
		<g>
			<rect x={x - 14} y={y - 24} width={28} height={48} rx={5} fill={C.ink} />
			<rect x={x - 9} y={y - 17} width={18} height={30} fill={C.paper} />
		</g>
	);
};

export const Mind: React.FC<{t: number}> = ({t}) => {
	if (t < T.why - E16 || t >= T.sleep + E16) return null;
	const darkIn = snap(t, T.why, E16);
	const darkOut = snap(t, T.anything, E16);
	const dark = t < T.anything + E16;
	const beam = beamAt(t);
	const a = walkIn(t, 120, A_X);
	const b = walkIn(t, 960, B_X);
	const peopleOn = t >= T.workers - E16 && t < T.anything;
	// A：举卡片；累了就坐下
	const aPose = t < T.workerA ? a.pose : mixPose(mixPose(POSES.stand, POSES.holdCard, snap(t, T.workerA, E16)), POSES.sitFloor, snap(t, T.tired + E8, E16));
	const aY = lerp(HIP, GROUND - 0.04 * H, snap(t, T.tired + E8, E16));
	const card = t >= T.workerA + E16 && t < T.tired + E8 ? Math.floor(t - T.workerA - E16) % 3 : -1;
	const cardP = card >= 0 ? snap(t, T.workerA + E16 + Math.floor(t - T.workerA - E16), E32) : 0;
	// B：举起手电
	const bPose = t < T.workerB ? b.pose : mixPose(POSES.stand, POSES.point, snap(t, T.workerB, E16));
	const torchOn = t >= T.workerB;
	// 找到的白熊留在脑子里（画在遮罩之上）
	const found = FAST.map((c, i) => ({c, i})).filter(({c}) => t >= c + 0.375);
	// 点题时：遮罩撤掉，白熊排成 4 × 3，然后换成别的念头
	const reflow = (i: number) => snap(t, T.anything + E8 + i * E32 * 0.5, E8);
	const gridPos = (i: number): [number, number, number] => {
		const s = 120;
		const g = 16;
		const c = i % 4;
		const r = Math.floor(i / 4);
		return [CX - (4 * s + 3 * g) / 2 + c * (s + g), 920 + r * (s + g), s];
	};
	const ICONS: Icon[] = ['clock', 'person', 'cake', 'bear'];
	const iconAt = (i: number): Icon => (t >= T.anything + 1.25 + i * E32 * 0.5 ? ICONS[i % 4] : 'bear');
	const k = Math.max(1e-4, collapse(t, T.sleep));
	const kl = knifeLine(t, T.sleep);
	const mid = 1122;
	const overlayY = lerp(SHEET.y0, SHEET.y1, darkOut);
	const overlayH = SH * darkIn - (overlayY - SHEET.y0);
	return (
		<g>
			<g transform={k < 1 ? `translate(0 ${mid}) scale(1 ${k}) translate(0 ${-mid})` : undefined}>
				<defs>
					<mask id="wb-mind" maskUnits="userSpaceOnUse" x={0} y={0} width={1080} height={1920}>
						<rect width={1080} height={1920} fill="white" />
						{beam.on ? <polygon points={beamPoly(beam.to).map((p) => p.join(',')).join(' ')} fill="black" /> : null}
					</mask>
				</defs>
				{/* 光里的白熊（纸上） */}
				{beam.on && beam.bear ? <BearModule x={beam.to[0] - beam.s / 2} y={beam.to[1] - beam.s / 2} s={beam.s} t={t} /> : null}
				{dark && overlayH > 0 ? <rect x={SHEET.x0} y={overlayY} width={SW} height={overlayH} fill={C.night} mask="url(#wb-mind)" /> : null}
				{peopleOn ? (
					<g>
						<rect x={SHEET.x0 + 24} y={GROUND} width={SW - 48} height={2} fill={C.dim} />
						<Figure x={a.x} y={aY} h={H} pose={aPose} color={C.voice2} />
						<Figure x={b.x} y={HIP} h={H} dir={-1} pose={bPose} color={C.voice2} />
						{torchOn ? <rect x={TORCH[0] - 14} y={TORCH[1] - 7} width={20} height={14} fill={C.voice2} /> : null}
						<Reveal text="找事的" x={A_X - 36} y={GROUND + 44} size={24} weight={600} color={C.b} p={snap(t, T.workers + 1, E16)} />
						<Reveal text="检查的" x={B_X - 36} y={GROUND + 44} size={24} weight={600} color={C.b} p={snap(t, T.workers + 1 + E32, E16)} />
						{card >= 0 ? (
							<svg x={A_X - 70} y={HIP - 0.6 * H - 104} width={140} height={100} overflow="hidden">
								<g transform={`translate(${-(A_X - 70)} ${-(HIP - 0.6 * H - 104) + (1 - cardP) * 100})`}>
									<rect x={A_X - 60} y={HIP - 0.6 * H - 96} width={120} height={86} fill={C.paper} />
									<CardIcon k={card} x={A_X} y={HIP - 0.6 * H - 53} />
								</g>
							</svg>
						) : null}
					</g>
				) : null}
				{/* 被找到的白熊：留在脑子里；点题时排成一格一格，换成别的念头 */}
				{found.map(({i}) => {
					const [fx0, fy0] = FOUND[i];
					const [gx, gy, gs] = gridPos(i);
					const r = reflow(i);
					return <BearModule key={i} x={lerp(fx0, gx, r)} y={lerp(fy0, gy, r)} s={lerp(SMALL, gs, r)} t={t} icon={iconAt(i)} />;
				})}
			</g>
			{kl > 0 ? <rect x={SHEET.x0} y={mid - 1} width={SW * kl} height={2} fill={C.ink} /> : null}
		</g>
	);
};
