// 那只白熊：侧面的平涂剪影，从一块群青方块里镂空出来。它是全片唯一用信号色的东西。
// 熊的坐标：身长 100（尾 −50 … 鼻 +50），地面 y = 0，向上为负；面朝右。
import {E8} from '../score';
import {C, lerp, snap} from '../sys';

// 远侧的腿：白色里掺两成群青，算是"第二声部"
const FAR = '#D2D9FF';

const BODY =
	'M -44 -44 C -40 -52 -30 -55 -18 -54 C -2 -53 10 -52 20 -50 C 27 -49 31 -47 35 -45 C 38 -47 42 -47 45 -45 ' +
	'C 48 -43 51 -40 53 -38 C 54 -36 52 -34 49 -34 C 45 -33 41 -33 38 -32 C 34 -31 31 -28 28 -25 ' +
	'C 26 -20 22 -18 16 -18 L -28 -18 C -36 -18 -44 -22 -47 -30 C -49 -36 -48 -41 -44 -44 Z';

type Legs = {nf: number; ff: number; nb: number; fb: number};
const STEP_A: Legs = {nf: 22, ff: -14, nb: -18, fb: 16};
const STEP_B: Legs = {nf: -14, ff: 22, nb: 16, fb: -18};
const mixLegs = (a: Legs, b: Legs, p: number): Legs => ({nf: lerp(a.nf, b.nf, p), ff: lerp(a.ff, b.ff, p), nb: lerp(a.nb, b.nb, p), fb: lerp(a.fb, b.fb, p)});

// 走路：step = 已经迈出的步数（整数部分 = 迈完的步，小数部分 = 正在迈的那一步，已缓动）
export const stepsAt = (t: number, t0: number, period = E8) => {
	if (t <= t0) return 0;
	const k = Math.floor((t - t0) / period);
	return k + snap(t, t0 + (k + 1) * period, period);
};

const rad = (d: number) => (d * Math.PI) / 180;
// 一条腿：关节 (x, y)，角度从竖直向下算，正 = 向前；趴下时折到身体下面
const leg = (x: number, y: number, a: number, rest: number, front: boolean) => {
	const fold = front ? 84 : -84;
	const ang = lerp(a, fold, rest);
	const len = lerp(20, 12, rest);
	const ex = x + Math.sin(rad(ang)) * len;
	const ey = y + Math.cos(rad(ang)) * len;
	const paw = front || rest < 0.5 ? 4 : -2;
	return `M ${x} ${y} L ${ex} ${ey} L ${ex + paw} ${ey}`;
};

export const Bear: React.FC<{x: number; y: number; len: number; dir?: 1 | -1; step?: number; rest?: number; color?: string; far?: string; bg: string}> = ({
	x,
	y,
	len,
	dir = 1,
	step = 0,
	rest = 0,
	color = C.paper,
	far = FAR,
	bg,
}) => {
	const k = Math.floor(step);
	const f = step - k;
	const legs = k % 2 ? mixLegs(STEP_B, STEP_A, f) : mixLegs(STEP_A, STEP_B, f);
	// 迈步时身体微微起伏；趴下时身体落到地面
	const bob = Math.sin(f * Math.PI) * 1.2 * (1 - rest);
	const drop = rest * 15;
	const s = len / 100;
	return (
		<g transform={`translate(${x} ${y}) scale(${dir * s} ${s})`}>
			<g transform={`translate(0 ${drop - bob})`}>
				<g fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth={12}>
					<path d={leg(-29, -26, legs.fb, rest, false)} stroke={far} />
					<path d={leg(21, -27, legs.ff, rest, true)} stroke={far} />
				</g>
				<path d={BODY} fill={color} />
				<circle cx={36} cy={-47.5} r={3.6} fill={color} />
				<circle cx={-47} cy={-41} r={3.4} fill={color} />
				<g fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth={12} stroke={color}>
					<path d={leg(-33, -26, legs.nb, rest, false)} />
					<path d={leg(17, -27, legs.nf, rest, true)} />
				</g>
				<circle cx={44.5} cy={-41.5} r={1.5} fill={bg} />
				<circle cx={51.8} cy={-37.6} r={2.0} fill={bg} />
			</g>
		</g>
	);
};

// ———————— 群青方块：白熊（或别的"挥之不去的念头"）镂空在里面 ————————
export type Icon = 'bear' | 'clock' | 'person' | 'cake';

const IconArt: React.FC<{icon: Icon; s: number; t: number; step: number; rest: number}> = ({icon, s, step, rest}) => {
	const cx = s / 2;
	const g = s * 0.82;
	if (icon === 'bear') return <Bear x={cx} y={g} len={s * 0.78} step={step} rest={rest} bg={C.signal} />;
	if (icon === 'clock') {
		const r = s * 0.27;
		const cy = s * 0.5;
		return (
			<g>
				<circle cx={cx} cy={cy} r={r} fill="none" stroke={C.paper} strokeWidth={s * 0.055} />
				<line x1={cx} y1={cy} x2={cx} y2={cy - r * 0.62} stroke={C.paper} strokeWidth={s * 0.05} strokeLinecap="round" />
				<line x1={cx} y1={cy} x2={cx + r * 0.42} y2={cy + r * 0.22} stroke={C.paper} strokeWidth={s * 0.05} strokeLinecap="round" />
			</g>
		);
	}
	// 一个人：头像剪影（头 + 肩）
	if (icon === 'person')
		return (
			<g fill={C.paper}>
				<circle cx={cx} cy={s * 0.38} r={s * 0.15} />
				<path d={`M ${cx - s * 0.3} ${g} C ${cx - s * 0.3} ${s * 0.6} ${cx - s * 0.18} ${s * 0.56} ${cx} ${s * 0.56} C ${cx + s * 0.18} ${s * 0.56} ${cx + s * 0.3} ${s * 0.6} ${cx + s * 0.3} ${g} Z`} />
			</g>
		);
	// 蛋糕：两层 + 一根蜡烛
	const w1 = s * 0.56;
	const w2 = s * 0.4;
	return (
		<g fill={C.paper}>
			<rect x={cx - w1 / 2} y={g - s * 0.17} width={w1} height={s * 0.17} />
			<rect x={cx - w2 / 2} y={g - s * 0.31} width={w2} height={s * 0.12} />
			<rect x={cx - s * 0.018} y={g - s * 0.44} width={s * 0.036} height={s * 0.12} />
			<circle cx={cx} cy={g - s * 0.48} r={s * 0.028} />
		</g>
	);
};

// 雪：白色小点线性落下（例外的运动：不吸附）
const FLAKES = Array.from({length: 14}, (_, i) => ({x: ((i * 37) % 97) / 97, y: ((i * 61) % 89) / 89, r: 0.009 + ((i * 13) % 5) * 0.002}));

export const BearModule: React.FC<{
	x: number;
	y: number;
	s: number;
	t: number;
	icon?: Icon;
	step?: number;
	rest?: number;
	snow?: boolean;
	crossed?: number; // 0→1：一道墨线斜着划过（"不要想"）
}> = ({x, y, s, t, icon = 'bear', step = 0, rest = 0, snow = false, crossed = 0}) => (
	<g transform={`translate(${x} ${y})`}>
		<svg x={0} y={0} width={s} height={s} overflow="hidden">
			<rect width={s} height={s} fill={C.signal} />
			{snow ? (
				<g fill={C.paper}>
					<rect x={0} y={s * 0.82} width={s} height={Math.max(2, s * 0.012)} />
					{FLAKES.map((f, i) => (
						<circle key={i} cx={f.x * s} cy={((f.y + t * 0.18) % 1) * s * 0.82} r={f.r * s} />
					))}
				</g>
			) : null}
			<IconArt icon={icon} s={s} t={t} step={step} rest={rest} />
		</svg>
		{crossed > 0 ? <line x1={-s * 0.08} y1={s * 1.08} x2={lerp(-s * 0.08, s * 1.08, crossed)} y2={lerp(s * 1.08, -s * 0.08, crossed)} stroke={C.ink} strokeWidth={Math.max(3, s * 0.03)} /> : null}
	</g>
);
