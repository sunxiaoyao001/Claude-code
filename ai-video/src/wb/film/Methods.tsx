// 05 办法（102–120 秒）· 尾声（120–132 秒）：
// 那怎么办？白熊像屏保一样在屏幕里来回弹 → 办法一：给它找个替身（一辆红色小汽车，全片唯一的第二种颜色）——
// 白熊一冒出来，小汽车就开过去把它换掉；反弹小了很多 → 办法二：别赶它走——推开它，它又弹回来；不推了，它就趴下 →
// 整屏群青：它趴着，待了一会儿，站起来自己走了 → 一刀切回纸面：只剩一只由空格子拼成的白熊，最后一声铃，格子也收起来。
import {Figure, hipOnGround, mixPose, POSES} from '../../pd/film/Picto';
import {BACK, BOUNCE, BOUNCE_BOX, BOUNCE_HITS, CAR_BEARS, DRIVE, E16, E32, E8, LAND, MOSAIC, MOSAIC_CELLS, PUSH, rowDrop, ROWS_N, T, WALK0, RISE} from '../score';
import {C, FAMILY, lerp, lin, snap} from '../sys';
import {Bear, BearModule, stepsAt} from './Bear';
import {Knife, type Pt, pts, rippleK, Slit} from './Kit';
import {Reveal} from './Type';

export const CAR = '#F0452B';

// ———————— 那怎么办？白熊像屏保一样来回弹（例外：匀速直线）————————
const BOX = BOUNCE_BOX;
const BS = BOUNCE_BOX.s;
const bounceAt = (t: number): {p: Pt; trail: Pt[]} => {
	let left = Math.max(0, t - BOX.t0) * BOX.speed;
	const trail: Pt[] = [BOUNCE[0]];
	for (let i = 1; i < BOUNCE.length; i++) {
		const [ax, ay] = BOUNCE[i - 1];
		const [bx, by] = BOUNCE[i];
		const d = Math.abs(bx - ax);
		if (left <= d) {
			const u = d > 0 ? left / d : 1;
			const p: Pt = [ax + (bx - ax) * u, ay + (by - ay) * u];
			trail.push(p);
			return {p, trail};
		}
		left -= d;
		trail.push(BOUNCE[i]);
	}
	return {p: BOUNCE[BOUNCE.length - 1], trail};
};
export const Bounce: React.FC<{t: number}> = ({t}) => {
	if (t < T.how || t >= T.method1 + E16) return null;
	const {p, trail} = bounceAt(t);
	const hits = BOUNCE_HITS;
	return (
		<Knife t={t} tk={T.method1} mid={1100}>
			<rect x={BOX.x0} y={BOX.y0} width={BOX.x1 - BOX.x0} height={BOX.y1 - BOX.y0} fill="none" stroke={C.ink} strokeWidth={2} strokeDasharray="6 10" opacity={t >= T.how + E16 ? 1 : 0} />
			<polyline points={pts(trail.map(([x, y]) => [x + BS / 2, y + BS / 2] as Pt))} fill="none" stroke={C.ink} strokeWidth={2} />
			{/* 每撞一次墙：原地留下一个空框，一圈方形的波纹 */}
			{hits.map((th, i) => {
				if (t < th) return null;
				const [gx, gy] = BOUNCE[i + 1];
				const w = lin(t, th, th + E8);
				return (
					<g key={i}>
						<rect x={gx + 1} y={gy + 1} width={BS - 2} height={BS - 2} fill="none" stroke={C.voice2} strokeWidth={2} />
						{w < 1 ? <rect x={gx - 40 * w} y={gy - 40 * w} width={BS + 80 * w} height={BS + 80 * w} fill="none" stroke={C.signal} strokeWidth={4 * (1 - w)} /> : null}
						<text x={gx + 8} y={gy + BS + 26} fontFamily={FAMILY} fontSize={18} fontWeight={700} fill={C.mute}>
							{`0${i + 1}`}
						</text>
					</g>
				);
			})}
			<Slit x={p[0]} y={p[1]} w={BS} h={BS} t={t} t0={BOX.t0} d={E32}>
				<BearModule x={p[0]} y={p[1]} s={BS} t={t} step={stepsAt(t, BOX.t0, E16)} />
			</Slit>
		</Knife>
	);
};

// ———————— 小汽车（侧面，平涂）————————
const Car: React.FC<{x: number; y: number; len: number; color: string; bg: string}> = ({x, y, len, color, bg}) => {
	const k = len / 240;
	return (
		<g transform={`translate(${x} ${y}) scale(${k})`} fill={color}>
			<rect x={0} y={-74} width={240} height={48} />
			<path d="M 44 -74 L 76 -118 L 170 -118 L 204 -74 Z" />
			<rect x={88} y={-108} width={34} height={26} fill={bg} />
			<rect x={130} y={-108} width={38} height={26} fill={bg} />
			<circle cx={58} cy={-24} r={25} />
			<circle cx={182} cy={-24} r={25} />
			<circle cx={58} cy={-24} r={9} fill={bg} />
			<circle cx={182} cy={-24} r={9} fill={bg} />
		</g>
	);
};
const CarModule: React.FC<{x: number; y: number; s: number}> = ({x, y, s}) => (
	<g>
		<rect x={x} y={y} width={s} height={s} fill={CAR} />
		<Car x={x + s * 0.11} y={y + s * 0.8} len={s * 0.78} color={C.paper} bg={CAR} />
	</g>
);

// ———————— 办法一：替身 ————————
export const Method1: React.FC<{t: number}> = ({t}) => {
	if (t < T.method1 + E16 || t >= T.car + E16) return null;
	const s = 230;
	const y = 900;
	const ax = 120;
	const bx = 730;
	const arrow = lin(t, T.method1 + 1 - E16, T.method1 + 1);
	return (
		<Knife t={t} tk={T.car} mid={1080}>
			<Slit x={ax} y={y} w={s} h={s} t={t} t0={T.method1 + E8} d={E16}>
				<BearModule x={ax} y={y} s={s} t={t} step={stepsAt(t, T.method1 + E8, E8)} />
			</Slit>
			<Reveal text="白熊" x={ax} y={y + s + 44} size={26} weight={700} color={C.ink} p={snap(t, T.method1 + E8 + E16, E16)} />
			{arrow > 0 ? (
				<g>
					<rect x={ax + s + 30} y={y + s / 2 - 3} width={(bx - ax - s - 60) * arrow} height={6} fill={C.ink} />
					{arrow >= 1 ? <path d={`M ${bx - 30} ${y + s / 2} L ${bx - 56} ${y + s / 2 - 18} L ${bx - 56} ${y + s / 2 + 18} Z`} fill={C.ink} /> : null}
					<Reveal text="一来，就换成" x={ax + s + 40} y={y + s / 2 - 22} size={22} weight={600} color={C.mute} p={snap(t, T.method1 + 1 + E16, E16)} />
				</g>
			) : null}
			<Slit x={bx} y={y} w={s} h={s} t={t} t0={T.method1 + 1 + E8} d={E16}>
				<CarModule x={bx} y={y} s={s} />
			</Slit>
			<Reveal text="替身：一辆红色小汽车" x={bx} y={y + s + 44} size={26} weight={700} color={C.ink} p={snap(t, T.method1 + 1 + E8 + E16, E16)} />
		</Knife>
	);
};

// ———————— 白熊一来，小汽车就开过去把它换掉 ————————
const ROAD = 1400;
const CAR_LEN = DRIVE.len;
const carFront = (t: number) => lerp(DRIVE.from, DRIVE.to, lin(t, DRIVE.t0, DRIVE.t1));
export const Method1Drive: React.FC<{t: number}> = ({t}) => {
	if (t < T.car + E16 || t >= T.smaller + E16) return null;
	const s = 170;
	const fx = carFront(t);
	return (
		<Knife t={t} tk={T.smaller} mid={1200}>
			<rect x={0} y={ROAD} width={1080 * lin(t, T.car + E16, T.car + E8)} height={4} fill={C.ink} />
			{Array.from({length: 14}, (_, i) => (
				<rect key={i} x={20 + i * 80} y={ROAD + 34} width={40 * lin(t, T.car + E16 + i * 0.01, T.car + E8 + i * 0.01)} height={4} fill={C.voice2} />
			))}
			{CAR_BEARS.map((b, i) => (
				<Knife key={i} t={t} tk={b.hit} mid={ROAD - s / 2} line={CAR}>
					<Slit x={b.x - s / 2} y={ROAD - s} w={s} h={s} t={t} t0={b.t0} d={E32}>
						<BearModule x={b.x - s / 2} y={ROAD - s} s={s} t={t} step={stepsAt(t, b.t0, E8)} />
					</Slit>
				</Knife>
			))}
			{t >= DRIVE.t0 ? <Car x={fx - CAR_LEN} y={ROAD} len={CAR_LEN} color={CAR} bg={C.page} /> : null}
			{/* 车开过去之后，原地留下一个小小的红方块（替身）*/}
			{CAR_BEARS.map((b, i) => (
				<Slit key={`c${i}`} x={b.x - 40} y={ROAD - 80} w={80} h={80} t={t} t0={b.hit + E16} d={E32} line={CAR}>
					<CarModule x={b.x - 40} y={ROAD - 80} s={80} />
				</Slit>
			))}
		</Knife>
	);
};

// ———————— 反弹小了很多（示意）————————
const RS = 46;
const RG = 6;
const ROWS = [
	{y: 940, n: ROWS_N[0], label: '只是硬忍，之后'},
	{y: 1180, n: ROWS_N[1], label: '有了替身，之后'},
];
export const Smaller: React.FC<{t: number}> = ({t}) => {
	if (t < T.smaller + E16 || t >= T.method2 + E16) return null;
	const x0 = 96;
	const br = snap(t, T.smaller + 2 + E16, E16);
	const bx = x0 + ROWS[1].n * (RS + RG) - RG / 2;
	const bw = (ROWS[0].n - ROWS[1].n) * (RS + RG);
	return (
		<Knife t={t} tk={T.method2} mid={1120}>
			{ROWS.map((row, r) => (
				<g key={r}>
					<Reveal text={row.label} x={x0} y={row.y - 26} size={26} weight={700} color={C.ink} p={snap(t, T.smaller + E16 + r * E32, E16)} />
					<rect x={x0} y={row.y + RS + 12} width={16 * (RS + RG) * lin(t, T.smaller + E16, T.smaller + E8)} height={1} fill={C.voice2} />
					{Array.from({length: row.n}, (_, k) => (
						<Slit key={k} x={x0 + k * (RS + RG)} y={row.y} w={RS} h={RS} t={t} t0={rowDrop(r, k)} d={E32}>
							<BearModule x={x0 + k * (RS + RG)} y={row.y} s={RS} t={t} />
						</Slit>
					))}
					{r === 1 ? (
						<g>
							{Array.from({length: ROWS[0].n - row.n}, (_, k) => (
								<rect
									key={k}
									x={x0 + (row.n + k) * (RS + RG)}
									y={row.y}
									width={RS}
									height={RS}
									fill="none"
									stroke={C.voice2}
									strokeWidth={2}
									strokeDasharray="5 5"
									opacity={t >= T.smaller + 2 ? 1 : 0}
								/>
							))}
						</g>
					) : null}
				</g>
			))}
			{br > 0 ? (
				<g>
					<rect x={bx} y={ROWS[1].y + RS + 30} width={bw * br} height={3} fill={C.ink} />
					<rect x={bx} y={ROWS[1].y + RS + 18} width={3} height={14} fill={C.ink} />
					{br >= 1 ? <rect x={bx + bw - 3} y={ROWS[1].y + RS + 18} width={3} height={14} fill={C.ink} /> : null}
				</g>
			) : null}
			<Reveal text="反弹小了很多" x={bx} y={ROWS[1].y + RS + 80} size={34} weight={800} color={C.ink} p={snap(t, T.smaller + 2 + E8, E16)} />
			<Reveal text="■ = 想起一次白熊（示意）" x={x0} y={1500} size={20} weight={500} color={C.mute} p={snap(t, T.smaller + 1, E16)} />
		</Knife>
	);
};

// ———————— 办法二：别赶它走 ————————
const P2 = {x: 330, floor: 1430, h: 360};
const M2 = {x: 520, s: 190};
export const Method2: React.FC<{t: number}> = ({t}) => {
	if (t < T.method2 + E16 || t >= T.now) return null;
	// 推：人前倾，方块被推出去；它又滑回来，"啪"地落在原地
	const push = snap(t, PUSH, E16) * (1 - snap(t, PUSH + E8 + E16, E16));
	const out = snap(t, PUSH + E8, E8) * (1 - snap(t, BACK + E8, E8));
	const x = M2.x + out * 380;
	// 不推了：人坐下，白熊趴下
	const sit = snap(t, T.stay + E8, E16);
	const rest = snap(t, T.stay + 1, E8);
	const pose = mixPose(mixPose(POSES.stand, POSES.push, push), POSES.sitFloor, sit);
	const y = lerp(hipOnGround(P2.floor, P2.h), P2.floor - 0.06 * P2.h, sit);
	return (
		<g>
			<rect x={72} y={P2.floor} width={936 * lin(t, T.method2 + E16, T.method2 + E8)} height={3} fill={C.ink} />
			<Slit x={P2.x - 120} y={P2.floor - P2.h} w={240} h={P2.h} t={t} t0={T.method2 + E8} d={E16}>
				<Figure x={P2.x} y={y} h={P2.h} pose={pose} color={C.ink} />
			</Slit>
			<Slit x={M2.x} y={P2.floor - M2.s} w={M2.s} h={M2.s} t={t} t0={T.method2 + E8 + E16} d={E16}>
				<BearModule x={x} y={P2.floor - M2.s} s={M2.s} t={t} rest={rest} step={rest > 0 ? 0 : stepsAt(t, T.method2, E8)} />
			</Slit>
			{/* 推出去的轨迹和弹回来的箭头 */}
			{t >= PUSH && t < LAND + E8 ? (
				<g>
					<rect x={M2.x + M2.s + 10} y={P2.floor - M2.s - 40} width={Math.max(0, x - M2.x)} height={3} fill={C.voice2} />
				</g>
			) : null}
			<Reveal text="赶它走" x={M2.x + 200} y={P2.floor - M2.s - 60} size={26} weight={700} color={C.mute} p={snap(t, PUSH + E16, E16)} q={snap(t, LAND, E16)} />
			<Reveal text="它又回来" x={M2.x + 200} y={P2.floor - M2.s - 60} size={26} weight={700} color={C.ink} p={snap(t, LAND + E16, E16)} q={snap(t, T.stay, E16)} />
			<Reveal text="让它待着" x={M2.x + 220} y={P2.floor - M2.s - 60} size={26} weight={700} color={C.ink} p={snap(t, T.stay + E8 + E16, E16)} q={snap(t, T.now - E16, E16)} />
			{/* 待一会儿：一圈细线慢慢走满 */}
			{t >= T.stay + 1
				? (() => {
						const u = Math.min(0.999, lin(t, T.stay + 1, T.now));
						const cx = M2.x + M2.s / 2;
						const cy = P2.floor - M2.s / 2;
						const r = 150;
						const a = -Math.PI / 2 + u * Math.PI * 2;
						return (
							<g>
								<circle cx={cx} cy={cy} r={r} fill="none" stroke={C.gridPage} strokeWidth={2} />
								<path d={`M ${cx} ${cy - r} A ${r} ${r} 0 ${u > 0.5 ? 1 : 0} 1 ${cx + Math.cos(a) * r} ${cy + Math.sin(a) * r}`} fill="none" stroke={C.ink} strokeWidth={3} />
							</g>
						);
					})()
				: null}
		</g>
	);
};

// ———————— 尾声：整屏群青，它趴着；站起来，自己走了 ————————
const FLAKES = Array.from({length: 60}, (_, i) => ({x: ((i * 73) % 101) / 101, y: ((i * 37) % 89) / 89, r: 1.6 + ((i * 11) % 5) * 0.7, v: 0.06 + ((i * 7) % 5) * 0.02}));
const G_END = 1440;
export const Leave: React.FC<{t: number}> = ({t}) => {
	if (t < T.now || t >= T.golden) return null;
	const rest = 1 - snap(t, RISE, E8);
	const walk = lin(t, WALK0, T.golden);
	const x = lerp(470, 1500, walk);
	const breathe = rest > 0.5 ? 1 + 0.012 * Math.sin(((t - T.now) * Math.PI * 2) / 2) : 1;
	return (
		<g>
			<g fill={C.paper}>
				{FLAKES.map((f, i) => (
					<circle key={i} cx={f.x * 1080 + Math.sin(t * 0.8 + i) * 4} cy={640 + ((f.y + t * f.v) % 1) * (G_END - 640)} r={f.r} />
				))}
			</g>
			<rect x={0} y={G_END} width={1080 * lin(t, T.now, T.now + E8)} height={3} fill={C.paper} />
			<Slit x={x - 380} y={G_END - 420} w={760} h={420} t={t} t0={T.now + E8} d={E16} line={C.paper}>
				<g transform={`translate(${x} ${G_END}) scale(1 ${breathe}) translate(${-x} ${-G_END})`}>
					<Bear x={x} y={G_END} len={760} rest={rest} step={stepsAt(t, WALK0, E8)} bg={C.signal} />
				</g>
			</Slit>
		</g>
	);
};

// ———————— 最后：一只由空格子拼成的白熊（它已经走了）；最后一声铃，格子收起来 ————————
const MAXD = Math.max(...MOSAIC_CELLS.map((c) => c.d));
export const Outline: React.FC<{t: number}> = ({t}) => {
	if (t < T.golden + E16) return null;
	const refs = ['Wegner, Schneider, Carter & White (1987). JPSP 53(1), 5–13.', 'Wegner (1994). Psychological Review 101(1), 34–52.', 'Wegner (2011). American Psychologist 66(8), 671–680.'];
	return (
		<g>
			{MOSAIC_CELLS.map((c, i) => {
				const tin = T.golden + E8 + (c.d / MAXD) * 0.75;
				if (t < tin - E32) return null;
				const k = t > T.stop - E16 ? rippleK(t, T.stop, MAXD - c.d, MAXD, 0.5) : 1;
				if (k < 0.01) return null;
				const mid = c.y + MOSAIC.cell / 2;
				return (
					<g key={i} transform={k < 1 ? `translate(0 ${mid}) scale(1 ${k}) translate(0 ${-mid})` : undefined}>
						<Slit x={c.x + 2} y={c.y + 2} w={MOSAIC.cell - 4} h={MOSAIC.cell - 4} t={t} t0={tin} d={E32}>
							<rect x={c.x + 3} y={c.y + 3} width={MOSAIC.cell - 6} height={MOSAIC.cell - 6} fill="none" stroke={C.voice2} strokeWidth={2} />
						</Slit>
					</g>
				);
			})}
			<rect x={96} y={MOSAIC.ground + 8} width={888 * snap(t, T.golden + E8, E16)} height={2} fill={C.ink} />
			{refs.map((r, i) => (
				<Reveal key={i} text={r} x={96} y={1500 + i * 26} size={17} weight={500} color={C.mute} p={snap(t, T.stop + E8 + i * E32, E16)} />
			))}
			<Reveal text="参考" x={96} y={1474} size={17} weight={700} color={C.ink} p={snap(t, T.stop + E8, E16)} />
			<text x={984} y={1474} textAnchor="end" fontFamily={FAMILY} fontSize={17} fontWeight={700} fill={C.ink} opacity={t >= T.stop + E8 ? 1 : 0}>
				白熊效应 · White Bear Effect
			</text>
		</g>
	);
};
