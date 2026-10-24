// 04 生活里（90–102 秒，还是夜）：三个夜里的小场景，各有一束光——月光照在床上、路灯照着长凳、冰箱的灯照着人；
// 光一亮，脑子里就冒出那个"白熊"（一只钟、一个人、一块蛋糕）。最后一个侧脸：里面那个检查的工人一直开着手电。
import {Figure, hipOnGround, hipOnSeat, mixPose, POSES} from '../../pd/film/Picto';
import {E16, E32, E8, T} from '../score';
import {C, FAMILY, lin, snap} from '../sys';
import {BearModule, type Icon, stepsAt} from './Bear';
import {Knife, type Pt, pts, Slit} from './Kit';
import {Reveal} from './Type';

const FLOOR = 1440;
// 夜：一大块，中间挖掉一束光（多边形）
const nightHole = (poly: Pt[]) => `M -40 600 H 1120 V 1600 H -40 Z M ${poly.map((p) => p.join(' ')).join(' L ')} Z`;
const shrinkPoly = (poly: Pt[], k: number, [ox, oy]: Pt): Pt[] => poly.map(([x, y]) => [ox + (x - ox) * k, oy + (y - oy) * k]);

// 冒出来的念头：一只方块从中线打开
const Thought: React.FC<{t: number; t0: number; x: number; y: number; s: number; icon: Icon}> = ({t, t0, x, y, s, icon}) => (
	<Slit x={x} y={y} w={s} h={s} t={t} t0={t0} d={E32} line={C.paper}>
		<BearModule x={x} y={y} s={s} t={t} icon={icon} step={stepsAt(t, t0, E8)} />
	</Slit>
);
// 念头和人之间的三个小点
const Dots: React.FC<{t: number; t0: number; from: Pt; to: Pt}> = ({t, t0, from, to}) => (
	<g fill={C.paper}>
		{[0, 1, 2].map((i) => {
			const u = (i + 1) / 4;
			return <circle key={i} cx={from[0] + (to[0] - from[0]) * u} cy={from[1] + (to[1] - from[1]) * u} r={(5 + i * 2.5) * snap(t, t0 + i * E32 * 0.5, E32)} />;
		})}
	</g>
);

// ———— 失眠：月光照在床上；床头的钟一拍跳一大截；人每拍翻一次身 ————
const MOON_LIGHT: Pt[] = [
	[700, 830],
	[900, 830],
	[760, FLOOR],
	[380, FLOOR],
];
export const Sleep: React.FC<{t: number}> = ({t}) => {
	if (t < T.sleep + E16 || t >= T.person + E16) return null;
	const on = snap(t, T.sleep + E16 + E16, E16);
	const k = Math.max(0, Math.floor(t - T.sleep));
	const curl = snap(t, T.sleep + k + E8, E16);
	const pose = k % 2 ? mixPose(POSES.slump, POSES.stand, curl) : mixPose(POSES.stand, POSES.slump, curl);
	const mins = [14, 37, 58, 59][Math.min(3, k)];
	const hour = k >= 3 ? 3 : 2;
	return (
		<Knife t={t} tk={T.person} mid={1150} line={C.paper}>
			<polygon points={pts(shrinkPoly(MOON_LIGHT, on, [800, 830]))} fill={C.page} />
			{/* 床、枕头、被子、躺着的人（墨色，只有光里看得见轮廓）*/}
			<g>
				<rect x={196} y={1236} width={16} height={FLOOR - 1236} fill={C.ink} />
				<rect x={212} y={1330} width={560} height={16} fill={C.ink} />
				<rect x={756} y={1346} width={16} height={FLOOR - 1346} fill={C.ink} />
				<rect x={222} y={1296} width={96} height={30} fill={C.ink} />
				<g transform={`rotate(-90 ${430} ${1300})`}>
					<Figure x={430} y={1300} h={250} pose={pose} color={C.ink} />
				</g>
				<rect x={384} y={1290} width={370} height={40} fill={C.ink} />
			</g>
			<path d={nightHole(shrinkPoly(MOON_LIGHT, on, [800, 830]))} fill={C.night} fillRule="evenodd" />
			{/* 白线：床的轮廓（在暗处也看得见）*/}
			<g fill={C.paper}>
				<rect x={196} y={1236} width={4} height={FLOOR - 1236} />
				<rect x={196} y={1236} width={16} height={4} />
				<rect x={212} y={1342} width={560} height={4} />
				<rect x={768} y={1346} width={4} height={FLOOR - 1346} />
			</g>
			<rect x={72} y={FLOOR} width={936} height={2} fill="#3A3F48" />
			{/* 窗和月亮 */}
			<rect x={700} y={710} width={200} height={120} fill="none" stroke={C.paper} strokeWidth={5} />
			<rect x={798} y={710} width={4} height={120} fill={C.paper} />
			<circle cx={750} cy={770} r={30} fill={C.paper} />
			<circle cx={764} cy={760} r={27} fill={C.night} />
			{/* 床头柜上的电子钟：一拍就过去二十分钟 */}
			<rect x={850} y={1300} width={150} height={FLOOR - 1300} fill="none" stroke={C.paper} strokeWidth={4} />
			<rect x={860} y={1242} width={130} height={58} fill="#2A2E35" />
			<text x={925} y={1284} textAnchor="middle" fontFamily={FAMILY} fontSize={34} fontWeight={700} fill={C.paper} style={{fontVariantNumeric: 'tabular-nums'}}>
				{`0${hour}:${String(mins).padStart(2, '0')}`}
			</text>
			<Dots t={t} t0={T.sleep + E8} from={[330, 1240]} to={[300, 1060]} />
			<Thought t={t} t0={T.sleep + E8 + E16} x={190} y={850} s={190} icon="clock" />
		</Knife>
	);
};

// ———— 忘不掉一个人：路灯下的长凳，一个人坐着 ————
const LAMP_X = 700;
const LAMP_LIGHT: Pt[] = [
	[LAMP_X - 46, 812],
	[LAMP_X + 46, 812],
	[LAMP_X + 250, FLOOR],
	[LAMP_X - 250, FLOOR],
];
export const Person: React.FC<{t: number}> = ({t}) => {
	if (t < T.person + E16 || t >= T.cake + E16) return null;
	const on = snap(t, T.person + E16 + E16, E16);
	const light = LAMP_LIGHT.map(([x, y]) => [x, 812 + (y - 812) * on] as Pt);
	return (
		<Knife t={t} tk={T.cake} mid={1150} line={C.paper}>
			<polygon points={pts(light)} fill={C.page} />
			<g fill={C.ink}>
				<rect x={560} y={1330} width={300} height={14} />
				<rect x={574} y={1344} width={12} height={FLOOR - 1344} />
				<rect x={834} y={1344} width={12} height={FLOOR - 1344} />
				<rect x={560} y={1240} width={12} height={90} />
			</g>
			<Figure x={680} y={hipOnSeat(1330, 270)} h={270} pose={{...POSES.slump, tilt: 30}} color={C.ink} />
			<path d={nightHole(light)} fill={C.night} fillRule="evenodd" />
			{/* 路灯：白线 */}
			<rect x={LAMP_X - 4} y={760} width={8} height={FLOOR - 760} fill={C.paper} />
			<path d={`M ${LAMP_X - 50} 812 L ${LAMP_X + 50} 812 L ${LAMP_X + 30} 776 L ${LAMP_X - 30} 776 Z`} fill={C.paper} />
			<rect x={72} y={FLOOR} width={936} height={2} fill="#3A3F48" />
			<Dots t={t} t0={T.person + E8} from={[640, 1150]} to={[420, 1000]} />
			<Thought t={t} t0={T.person + E8 + E16} x={190} y={820} s={190} icon="person" />
		</Knife>
	);
};

// ———— 别吃了：半夜打开冰箱，冰箱的光照着人 ————
const FRIDGE = {x: 600, y: 940, w: 230, h: FLOOR - 940};
export const Cake: React.FC<{t: number}> = ({t}) => {
	if (t < T.cake + E16 || t >= T.notYou + E16) return null;
	const open = snap(t, T.cake + E16 + E16, E16);
	const light: Pt[] = [
		[FRIDGE.x, FRIDGE.y + 20],
		[FRIDGE.x, FLOOR],
		[FRIDGE.x - 520 * open, FLOOR],
		[FRIDGE.x - 40 * open, FRIDGE.y + 20],
	];
	return (
		<Knife t={t} tk={T.notYou} mid={1150} line={C.paper}>
			<polygon points={pts(light)} fill={C.page} />
			<Figure x={360} y={hipOnGround(FLOOR, 330)} h={330} pose={POSES.silent} color={C.ink} />
			<path d={nightHole(light)} fill={C.night} fillRule="evenodd" />
			{/* 冰箱：开着的门，里面的格子 */}
			<rect x={FRIDGE.x} y={FRIDGE.y} width={FRIDGE.w} height={FRIDGE.h} fill={C.page} />
			<rect x={FRIDGE.x} y={FRIDGE.y} width={FRIDGE.w} height={FRIDGE.h} fill="none" stroke={C.paper} strokeWidth={6} />
			{[0.3, 0.55, 0.8].map((u) => (
				<rect key={u} x={FRIDGE.x + 12} y={FRIDGE.y + FRIDGE.h * u} width={FRIDGE.w - 24} height={4} fill="#8A9099" />
			))}
			<path
				d={`M ${FRIDGE.x + FRIDGE.w} ${FRIDGE.y} L ${FRIDGE.x + FRIDGE.w + 150 * open} ${FRIDGE.y + 40 * open} L ${FRIDGE.x + FRIDGE.w + 150 * open} ${FLOOR - 40 * open} L ${FRIDGE.x + FRIDGE.w} ${FLOOR} Z`}
				fill={C.night}
				stroke={C.paper}
				strokeWidth={5}
			/>
			<rect x={72} y={FLOOR} width={936} height={2} fill="#3A3F48" />
			<Dots t={t} t0={T.cake + E8} from={[340, 1100]} to={[290, 960]} />
			<Thought t={t} t0={T.cake + E8 + E16} x={150} y={760} s={190} icon="cake" />
		</Knife>
	);
};

// ———— 这是大脑的设计：一个侧脸（沿长度画出来），里面那个检查的工人一直打着手电 ————
const HEAD =
	'M 330 1480 L 330 1330 C 250 1286 222 1170 238 1066 C 262 908 388 816 538 816 C 700 816 802 922 812 1048 ' +
	'C 816 1094 826 1118 860 1176 C 872 1194 860 1208 834 1210 L 826 1212 C 832 1244 826 1262 808 1266 ' +
	'C 818 1290 812 1312 788 1318 C 758 1326 734 1334 730 1380 L 730 1480';
export const Head: React.FC<{t: number}> = ({t}) => {
	if (t < T.notYou + E16 || t >= T.how) return null;
	const per = 2600;
	const draw = lin(t, T.notYou + E16, T.notYou + 1);
	const on = snap(t, T.notYou + 1 + E8, E16);
	const tip: Pt = [606, 1112];
	const to: Pt = [430, 960];
	const beam: Pt[] = [
		[tip[0], tip[1] - 5],
		[tip[0], tip[1] + 5],
		[to[0] - 30 * on, to[1] + 90 * on],
		[to[0] - 30 * on, to[1] - 90 * on],
	];
	return (
		<g>
			<path d={HEAD} fill="none" stroke={C.paper} strokeWidth={6} strokeLinejoin="round" strokeDasharray={per} strokeDashoffset={per * (1 - draw)} />
			{on > 0 ? <polygon points={pts(beam)} fill={C.page} /> : null}
			{t >= T.notYou + 1 ? <Figure x={640} y={hipOnGround(1200, 150)} h={150} dir={-1} pose={{lean: 4, tilt: -4, aF: [90, 92], aB: [-8, -3], lF: [5, 0], lB: [-5, 0]}} color={C.paper} /> : null}
			{t >= T.notYou + 1 ? <rect x={tip[0]} y={tip[1] - 6} width={16} height={12} fill={C.paper} /> : null}
			{t >= T.notYou + 1 ? <rect x={540} y={1200} width={180} height={3} fill="#5C626C" /> : null}
			<Thought t={t} t0={T.notYou + 1 + E8 + E16} x={300} y={890} s={140} icon="bear" />
			<Reveal text="监控，一直开着" x={238} y={1540} size={24} weight={700} color={C.paper} p={snap(t, T.notYou + 2, E16)} />
		</g>
	);
};
