// 序幕：凌晨，探照灯下两个人在逃 → 光柱罩住他们 → 一道刀线落下，灯灭 → 夜色收进纸里，
// 两间黑屋子各亮一盏灯 → 点题时，灯光铺满纸面。
// 夜 = 一张墨色的遮罩；光 = 遮罩上挖掉的多边形。光里的东西照常画在纸上（墨、灰），光外一片墨。
import {E16, E8, T} from '../score';
import {C, collapse, lerp, lin, snap, steps, track} from '../sys';
import {lampState, ROOM, S, SHADE_H} from './Matrix';
import {Figure, hipOnGround, hipRunning, mixPose, type Pose, POSES} from './Picto';

type Pt = [number, number];
const G = ROOM.ground;

// ———————— 探照灯：光源在右上角画外，每拍追一次，最后罩住两个人 ————————
const APEX = {x: 1040, y: -160, hw: 16};
// 地面上光斑的中心和半宽；罩住两人时光斑张开一点（光柱是斜的，中心偏左一点才能罩住头）
const beamX = track([
	[0, [800, 270]],
	[T.beam1, [717, 270]],
	[T.beam2, [635, 270]],
	[T.caught, [S.midX - 26, 330]],
]);
const beamPoly = (t: number): Pt[] => {
	const [cx, hw] = beamX(t);
	// 刀线落下后，光柱向刀线塌缩（灯灭）
	const k = collapse(t, T.cut);
	const sq = (x: number) => S.midX + (x - S.midX) * k;
	return [
		[sq(APEX.x - APEX.hw), APEX.y],
		[sq(APEX.x + APEX.hw), APEX.y],
		[sq(cx + hw), G],
		[sq(cx - hw), G],
	];
};
const beamOn = (t: number) => t < T.cut + E8;

// ———————— 两个人：每个八分音符一步，腾空跑；被罩住时转身、举手 ————————
const RUN_H = 320;
const GAP = 250;
const runX = (t: number) => 800 - (800 - S.midX) * steps(t, 0, T.caught, 6);
const runPose = (t: number): Pose => {
	const k = Math.floor(t / E8);
	const p = snap(t, (k + 1) * E8, E8);
	return mixPose(k % 2 ? POSES.runB : POSES.runA, k % 2 ? POSES.runA : POSES.runB, p);
};

// 在主矩阵的世界里画（遮罩之下）：光柱本身是一块纸，人在光里
export const Chase: React.FC<{t: number}> = ({t}) => {
	if (!beamOn(t)) return null;
	const poly = beamPoly(t);
	const c = snap(t, T.caught, E16);
	const pose = mixPose(runPose(t), POSES.surrender, c);
	const dir: 1 | -1 = t >= T.caught - E16 ? 1 : -1;
	const y = lerp(hipRunning(G, RUN_H), hipOnGround(G, RUN_H), c);
	const xa = runX(t) - GAP / 2;
	return (
		<g>
			<polygon points={poly.map((p) => p.join(',')).join(' ')} fill={C.paper} />
			<Figure x={xa} y={y} h={RUN_H} dir={dir} pose={pose} color={C.ink} />
			<Figure x={xa + GAP} y={y} h={RUN_H} dir={dir} pose={pose} color={C.b} />
		</g>
	);
};

// ———————— 两盏灯的光：一个梯形，从灯罩铺到地面；点题时铺满这一半纸 ————————
const clipX = (poly: Pt[], xmin: number, xmax: number): Pt[] => {
	const clip = (pts: Pt[], inside: (p: Pt) => boolean, x: number) => {
		const out: Pt[] = [];
		for (let i = 0; i < pts.length; i++) {
			const a = pts[i];
			const b = pts[(i + 1) % pts.length];
			if (inside(a)) out.push(a);
			if (inside(a) !== inside(b)) out.push([x, a[1] + ((b[1] - a[1]) * (x - a[0])) / (b[0] - a[0])]);
		}
		return out;
	};
	return clip(
		clip(poly, (p) => p[0] >= xmin, xmin),
		(p) => p[0] <= xmax,
		xmax,
	);
};
const cone = (t: number, side: 0 | 1): Pt[] | null => {
	const t0 = side ? T.lampB : T.lampA;
	if (t < t0) return null;
	const lx = side ? 2 * S.midX - ROOM.lampX : ROOM.lampX;
	const top = ROOM.lampY + SHADE_H;
	const hw0 = ROOM.shadeW / 2;
	// 开灯：光沿长度铺下来（线性，一个十六分）
	const reach = lin(t, t0, t0 + E16);
	const yb = lerp(top, G, reach);
	const hwb = lerp(hw0, ROOM.coneHW, reach);
	let poly: Pt[] = [
		[lx - hw0, top],
		[lx + hw0, top],
		[lx + hwb, yb],
		[lx - hwb, yb],
	];
	const [x0, x1] = side ? [S.midX, S.x1] : [S.x0, S.midX];
	const f = snap(t, T.flood, E8);
	if (f > 0) {
		const to: Pt[] = [
			[x0, S.y0],
			[x1, S.y0],
			[x1, S.y1],
			[x0, S.y1],
		];
		poly = poly.map((p, i) => [lerp(p[0], to[i][0], f), lerp(p[1], to[i][1], f)]);
	}
	return clipX(poly, x0, x1);
};

// 夜的范围：开场满屏；刀线之后收进下半页那张纸
const nightRect = (t: number) => {
	const p = snap(t, T.page, E8);
	return {x: lerp(0, S.x0, p), y: lerp(0, S.y0, p), w: lerp(1080, S.x1 - S.x0, p), h: lerp(1920, S.y1 - S.y0, p)};
};

// 屏幕坐标里画（序幕时主镜头是单位矩阵）
export const Night: React.FC<{t: number}> = ({t}) => {
	if (t >= T.flood) return null;
	const lights: Pt[][] = [];
	if (beamOn(t)) lights.push(beamPoly(t));
	for (const side of [0, 1] as const) {
		const c = cone(t, side);
		if (c && c.length > 2) lights.push(c);
	}
	const r = nightRect(t);
	// 刀线：竖着划过光柱，之后留下来当墙
	const wall = lin(t, T.cut - E16, T.cut);
	return (
		<g>
			<defs>
				<mask id="pd-night" maskUnits="userSpaceOnUse" x={0} y={0} width={1080} height={1920}>
					<rect width={1080} height={1920} fill="white" />
					{lights.map((poly, i) => (
						<polygon key={i} points={poly.map((p) => p.join(',')).join(' ')} fill="black" />
					))}
				</mask>
				<clipPath id="pd-night-clip">
					<rect x={r.x} y={r.y} width={r.w} height={r.h} />
				</clipPath>
			</defs>
			<g mask="url(#pd-night)">
				<rect x={r.x} y={r.y} width={r.w} height={r.h} fill={C.ink} />
				<g clipPath="url(#pd-night-clip)" fill={C.paper}>
					{/* 地平线：开场一个八分音符里画出来，之后成了两间屋子的地面 */}
					<rect x={0} y={G} width={1080 * lin(t, 0, E8)} height={1} />
					{wall > 0 ? <rect x={S.midX - 1} y={S.y0} width={2} height={(S.y1 - S.y0) * wall} /> : null}
					{([0, 1] as const).map((side) => {
						const {cord, shade} = lampState(t, side);
						const lx = side ? 2 * S.midX - ROOM.lampX : ROOM.lampX;
						const w = ROOM.shadeW;
						return (
							<g key={side}>
								{cord > 0 ? <rect x={lx - 2} y={S.y0} width={4} height={(ROOM.lampY - S.y0) * cord} /> : null}
								{shade > 0 ? (
									<path
										d={`M ${lx - w * 0.22} ${ROOM.lampY} L ${lx + w * 0.22} ${ROOM.lampY} L ${lx + w / 2} ${ROOM.lampY + SHADE_H * shade} L ${lx - w / 2} ${ROOM.lampY + SHADE_H * shade} Z`}
									/>
								) : null}
							</g>
						);
					})}
				</g>
			</g>
		</g>
	);
};
