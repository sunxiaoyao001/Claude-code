// 02 实验（30–60 秒）：
// 一把时间尺从 1863 飞到 1987（里程表滚动，白熊骑在播放头上）→ 实验室：主试关门离开，被试对着麦克风自言自语，
// 墙上贴出规则，一想到白熊就按铃 → 5 分钟压成 5.5 秒：一格一秒，铃响的那一秒变成白熊 →
// 白熊落成每分钟的柱子 → 反弹：被压住的那一管，盖子一掀，白熊涌得更高。
import {Chair, Figure, hipOnSeat, mixPose, type Pose, POSES, Table} from '../../pd/film/Picto';
import {dropTime, E16, E32, E8, FLY, GRID, gridTime, LID_UP, PER_MIN, PRESSES, RINGS, ringTime, RULER, T, TUBE_N, yearAt} from '../score';
import {C, FAMILY, fx, lerp, lin, measure, snap, steps, textWidth} from '../sys';
import {BearModule, stepsAt} from './Bear';
import {Knife, Slit} from './Kit';
import {Reveal} from './Type';

// ———————— 时间尺：1863 → 1987 ————————
const RY = 1262; // 尺子的线
const PXY = 40; // 1 年 = 40 px
const ODO = {size: 240, base: 1010};
const FLY0 = RULER.fly0;
const FLY1 = RULER.fly1;

// 里程表：每一位是一条竖着的数字带，低位转满一圈时高位才跟着进一格
const Odometer: React.FC<{year: number; p: number}> = ({year, p}) => {
	const dw = textWidth('0', ODO.size, 800);
	const asc = measure('0', ODO.size, 800).actualBoundingBoxAscent;
	const lh = asc * 1.3;
	const x0 = 540 - 2 * dw;
	return (
		<g>
			{[3, 2, 1, 0].map((d, i) => {
				const q = 10 ** d;
				const v = d === 0 ? year : Math.floor(year / q) + Math.min(1, Math.max(0, (year % q) - (q - 1)));
				const base = Math.floor(v + 1e-9);
				const f = v - base;
				// 入场：每一位从下面升上来，左边的先到
				const rise = (1 - snap(p, 0.5 + i * 0.125, 0.5)) * lh;
				return (
					<svg key={d} x={x0 + i * dw} y={ODO.base - asc - 14} width={dw} height={asc + 28} overflow="hidden">
						{[0, 1].map((j) => (
							<text
								key={j}
								x={0}
								y={asc + 14 + (j - f) * lh + rise}
								fontFamily={FAMILY}
								fontSize={ODO.size}
								fontWeight={800}
								fill={C.ink}
								style={{fontVariantNumeric: 'tabular-nums'}}
							>
								{(base + j) % 10}
							</text>
						))}
					</svg>
				);
			})}
		</g>
	);
};

export const Ruler: React.FC<{t: number}> = ({t}) => {
	if (t < T.later || t >= T.lab + E16) return null;
	const Y = yearAt(t);
	const draw = snap(t, T.later + E16, E16);
	const xOf = (yr: number) => 540 + (yr - Y) * PXY;
	const ticks: React.ReactNode[] = [];
	for (let yr = Math.ceil(Y - 15); yr <= Math.floor(Y + 15); yr++) {
		const x = xOf(yr);
		if (Math.abs(x - 540) > 540 * draw) continue;
		const dec = yr % 10 === 0;
		const h = dec ? 52 : yr % 5 === 0 ? 30 : 14;
		ticks.push(<rect key={yr} x={x - (dec ? 1.5 : 1)} y={RY} width={dec ? 3 : 2} height={h} fill={C.ink} />);
		if (dec)
			ticks.push(
				<text key={`l${yr}`} x={x} y={RY + 92} textAnchor="middle" fontFamily={FAMILY} fontSize={26} fontWeight={700} fill={C.ink} style={{fontVariantNumeric: 'tabular-nums'}}>
					{yr}
				</text>,
			);
	}
	const flag = (yr: number, label: string) => {
		const x = xOf(yr);
		if (x < -300 || x > 1380) return null;
		return (
			<g key={yr}>
				<rect x={x - 1} y={RY + 108} width={2} height={44} fill={C.ink} />
				<text x={x + 12} y={RY + 148} fontFamily={FAMILY} fontSize={22} fontWeight={600} fill={C.mute}>
					{label}
				</text>
			</g>
		);
	};
	// 到站：1987 被一个框"盖章"
	const stamp = snap(t, FLY1 + E16, E16);
	const dw = textWidth('0', ODO.size, 800);
	const asc = measure('0', ODO.size, 800).actualBoundingBoxAscent;
	const sk = lerp(1.14, 1, stamp);
	const flying = t >= FLY0 && t < FLY1;
	return (
		<Knife t={t} tk={T.lab} mid={1150}>
			<Odometer year={Y} p={lin(t, T.later, T.later + E8 + E16)} />
			{t >= FLY1 ? (
				<g transform={`translate(540 ${ODO.base - asc / 2}) scale(${sk}) translate(-540 ${-(ODO.base - asc / 2)})`}>
					<rect x={540 - 2 * dw - 30} y={ODO.base - asc - 30} width={4 * dw + 60} height={asc + 60} fill="none" stroke={C.ink} strokeWidth={6} />
				</g>
			) : null}
			<rect x={540 - 540 * draw} y={RY - 1} width={1080 * draw} height={3} fill={C.ink} />
			{ticks}
			{flag(1863, '陀思妥耶夫斯基')}
			{flag(1987, '韦格纳的实验')}
			{/* 播放头：白熊骑在上面，一路小跑 */}
			<Slit x={480} y={RY - 140} w={120} h={120} t={t} t0={T.later + E8} d={E16}>
				<BearModule x={480} y={RY - 140} s={120} t={t} step={flying ? stepsAt(t, FLY0, E16) : 0} />
			</Slit>
			<path d={`M ${528} ${RY - 18} L ${552} ${RY - 18} L ${540} ${RY - 2} Z`} fill={C.ink} opacity={draw >= 1 ? 1 : 0} />
		</Knife>
	);
};

// ———————— 实验室 ————————
const LAB = {floor: 1480, h: 330, hipX: 330, top: 1346};
const SEAT = LAB.floor - 0.187 * LAB.h;
const HIPY = hipOnSeat(SEAT, LAB.h);
const DOOR = {x: 72, w: 140, h: 372};
const BELL = 470;
const MIC = 568;
const REC = {x: 632, w: 184};
// 按铃：身子前倾，手正好落在铃的按钮上
const PRESS: Pose = {lean: 20, tilt: 10, aF: [98, 104], aB: [40, 86], lF: [88, 4], lB: [84, 0]};
const NOD: Pose = {...POSES.sitHands, tilt: 12};
// 想到什么就说什么：每拍一句（蓝色的是白熊）
const SAYS: [number, string, boolean?][] = [
	[T.lab + 1, '嗯……'],
	[T.lab + 2, '窗外那棵树'],
	[T.rule, '明天的报告'],
	[T.rule + 1, '有点饿'],
	[T.rule + 2, '晚饭吃什么'],
	[T.bell, '白熊', true],
	[T.bell + 1, '……'],
	[T.bell + 2, '又是白熊', true],
];

export const Lab: React.FC<{t: number}> = ({t}) => {
	if (t < T.lab + E16 || t >= T.grid + E16) return null;
	const t0 = T.lab + E8;
	// 姿势：说话时每个八分音符点一下头；按铃时前倾
	const w8 = Math.floor(t / E8);
	const talking = t >= T.lab + 1 && t < T.grid;
	let pose: Pose = talking ? mixPose(w8 % 2 ? NOD : POSES.sitHands, w8 % 2 ? POSES.sitHands : NOD, snap(t, (w8 + 1) * E8, E16)) : POSES.sitHands;
	let push = 0;
	for (const pt of PRESSES) push = Math.max(push, snap(t, pt, E16) * (1 - snap(t, pt + E8 + E16, E16)));
	if (push > 0) pose = mixPose(pose, PRESS, push);
	// 主试：站在门口，转身走掉，门在他身后关上
	const shut = snap(t, T.lab + 1, E16);
	const step = stepsAt(t, T.lab + E8, E8);
	// 录音机的两个盘：匀速转（机器）
	const spin = Math.max(0, t - (T.lab + E8)) * 220;
	const say = [...SAYS].reverse().find(([ts]) => t >= ts - E32);
	const sayIdx = say ? SAYS.indexOf(say) : -1;
	const thinking = PRESSES.map((pt) => ({tin: pt - E8, tout: pt + 1 - E16})).find((w) => t >= w.tin - E32 && t < w.tout + E16);
	return (
		<Knife t={t} tk={T.grid} mid={1150}>
			{/* 地面 */}
			<rect x={72} y={LAB.floor} width={936 * lin(t, T.lab + E16, T.lab + E8)} height={3} fill={C.ink} />
			{/* 门 */}
			<Slit x={DOOR.x} y={LAB.floor - DOOR.h} w={DOOR.w} h={DOOR.h} t={t} t0={t0} d={E16}>
				<g>
					<rect x={DOOR.x} y={LAB.floor - DOOR.h} width={8} height={DOOR.h} fill={C.ink} />
					<rect x={DOOR.x + DOOR.w - 8} y={LAB.floor - DOOR.h} width={8} height={DOOR.h} fill={C.ink} />
					<rect x={DOOR.x} y={LAB.floor - DOOR.h} width={DOOR.w} height={8} fill={C.ink} />
					{shut < 1 ? <Figure x={DOOR.x + 78 - 10 * step} y={LAB.floor - 0.45 * 300} h={300} dir={-1} pose={step % 2 < 1 ? POSES.walkA : POSES.walkB} color={C.ink} /> : null}
					{/* 门扇：从铰链那边转过来盖住门洞 */}
					<rect x={DOOR.x + 8} y={LAB.floor - DOOR.h + 8} width={Math.max(14, (DOOR.w - 16) * shut)} height={DOOR.h - 8} fill={C.gridPage} stroke={C.ink} strokeWidth={4} />
					{shut >= 1 ? <circle cx={DOOR.x + DOOR.w - 30} cy={LAB.floor - DOOR.h / 2} r={7} fill={C.ink} /> : null}
				</g>
			</Slit>
			{/* 椅子、人、桌子 */}
			<Slit x={240} y={1150} w={620} h={330} t={t} t0={t0 + E32} d={E16}>
				<Chair x={LAB.hipX - 8} seatY={SEAT} dir={1} color={C.ink} s={(LAB.floor - SEAT) / 80} />
				<Figure x={LAB.hipX} y={HIPY} h={LAB.h} pose={pose} color={C.ink} />
				<Table x={410} y={LAB.top} w={440} legH={LAB.floor - LAB.top} color={C.ink} />
			</Slit>
			{/* 铃 */}
			<Slit x={BELL - 40} y={LAB.top - 60} w={80} h={60} t={t} t0={t0 + E16} d={E32}>
				<rect x={BELL - 32} y={LAB.top - 10} width={64} height={10} fill={C.ink} />
				<path d={`M ${BELL - 26} ${LAB.top - 10} A 26 26 0 0 1 ${BELL + 26} ${LAB.top - 10} Z`} fill={C.ink} />
				<rect x={BELL - 4} y={LAB.top - 48 + 6 * push} width={8} height={12} fill={C.ink} />
			</Slit>
			{/* 铃响：三道弧向外扩开 */}
			{PRESSES.map((pt, i) => {
				const r = lin(t, pt, pt + E8);
				if (r <= 0 || r >= 1) return null;
				return (
					<g key={i} fill="none" stroke={C.ink} strokeLinecap="round">
						{[0, 1, 2].map((k) => {
							const rr = 30 + (r * 60 + k * 18);
							return <path key={k} d={`M ${BELL - rr * 0.7} ${LAB.top - 30 - rr * 0.7} A ${rr} ${rr} 0 0 1 ${BELL + rr * 0.7} ${LAB.top - 30 - rr * 0.7}`} strokeWidth={4 * (1 - r)} />;
						})}
					</g>
				);
			})}
			{/* 麦克风：台式支架，头朝着人 */}
			<Slit x={MIC - 40} y={LAB.top - 140} w={80} h={140} t={t} t0={t0 + E16 + E32} d={E32}>
				<rect x={MIC - 28} y={LAB.top - 8} width={56} height={8} fill={C.ink} />
				<rect x={MIC - 3} y={LAB.top - 100} width={6} height={92} fill={C.ink} />
				<g transform={`rotate(-58 ${MIC} ${LAB.top - 100})`}>
					<rect x={MIC - 12} y={LAB.top - 146} width={24} height={50} rx={12} fill={C.ink} />
				</g>
			</Slit>
			{/* 录音机：两个盘在转，录音灯每拍亮一下 */}
			<Slit x={REC.x} y={LAB.top - 90} w={REC.w} h={90} t={t} t0={t0 + E8} d={E32}>
				<rect x={REC.x} y={LAB.top - 88} width={REC.w} height={88} fill={C.ink} />
				{[REC.x + 48, REC.x + REC.w - 48].map((cx, i) => (
					<g key={i} transform={`rotate(${spin} ${cx} ${LAB.top - 46})`}>
						<circle cx={cx} cy={LAB.top - 46} r={28} fill={C.paper} />
						{[0, 120, 240].map((a) => (
							<rect key={a} x={cx - 2.5} y={LAB.top - 46 - 24} width={5} height={18} fill={C.ink} transform={`rotate(${a} ${cx} ${LAB.top - 46})`} />
						))}
						<circle cx={cx} cy={LAB.top - 46} r={7} fill={C.ink} />
					</g>
				))}
				<rect x={REC.x + 48} y={LAB.top - 20} width={REC.w - 96} height={3} fill={C.paper} />
				{talking && t % 1 < E8 ? <circle cx={REC.x + REC.w - 14} cy={LAB.top - 76} r={5} fill={C.paper} /> : null}
			</Slit>
			{/* 说的话 → 麦克风：三道小弧，每个十六分音符多一道 */}
			{talking
				? Array.from({length: (Math.floor(t / E16) % 3) + 1}, (_, i) => (
						<path key={i} d={`M ${404 + i * 18} ${1250 - 12 - i * 6} A ${18 + i * 10} ${18 + i * 10} 0 0 1 ${404 + i * 18} ${1250 + 12 + i * 6}`} fill="none" stroke={C.ink} strokeWidth={3} strokeLinecap="round" />
					))
				: null}
			{/* 说出口的那句话 */}
			{say && t < T.grid - E16
				? (() => {
						const [ts, text, bear] = say;
						const w = textWidth(text, 28, 700) + 36;
						return (
							<Slit key={sayIdx} x={392} y={1124} w={w} h={60} t={t} t0={ts} d={E32}>
								<rect x={392} y={1124} width={w} height={60} fill={bear ? C.signal : C.gridPage} />
								<path d={`M 404 1184 L 428 1184 L 398 1214 Z`} fill={bear ? C.signal : C.gridPage} />
								<text x={410} y={1164} fontFamily={FAMILY} fontSize={28} fontWeight={700} fill={bear ? C.paper : C.ink}>
									{text}
								</text>
							</Slit>
						);
					})()
				: null}
			{/* 想到了：头顶冒出一只白熊 */}
			{thinking ? (
				<g>
					{[
						[326, 1214, 6],
						[306, 1182, 9],
					].map(([x, y, r], i) => (
						<circle key={i} cx={x} cy={y} r={r * snap(t, thinking.tin + i * E32, E32) * (1 - snap(t, thinking.tout, E16))} fill={C.ink} />
					))}
					<Knife t={t} tk={thinking.tout} mid={1040}>
						<Slit x={186} y={984} w={112} h={112} t={t} t0={thinking.tin + E16} d={E32}>
							<BearModule x={186} y={984} s={112} t={t} step={stepsAt(t, thinking.tin + E16, E8)} />
						</Slit>
					</Knife>
				</g>
			) : null}
			{/* 墙上的规则 */}
			<Slit x={600} y={796} w={400} h={260} t={t} t0={T.rule + E8} d={E16}>
				<rect x={600} y={796} width={400} height={260} fill={C.paper} stroke={C.ink} strokeWidth={2} />
				<text x={624} y={834} fontFamily={FAMILY} fontSize={20} fontWeight={700} fill={C.ink} style={{letterSpacing: '0.08em'}}>
					规则
				</text>
				<text x={976} y={834} textAnchor="end" fontFamily={FAMILY} fontSize={20} fontWeight={600} fill={C.mute}>
					01
				</text>
				<BearModule x={724} y={856} s={152} t={t} step={stepsAt(t, T.rule + E8, E8)} crossed={lin(t, T.rule + E8 + E32, T.rule + E8 + E16)} />
			</Slit>
		</Knife>
	);
};

// ———————— 5 分钟压成 5.5 秒：1 行 = 1 分钟，1 格 = 1 秒 ————————
const GX0 = 132;
const GX1 = 1008;
const PITCH = (GX1 - GX0) / GRID.cols;
const CW = 10;
const ROW0 = 846;
const ROW_H = 60;
const ROW_P = 124;
const rowY = (r: number) => ROW0 + r * ROW_P;
const cellX = (c: number) => GX0 + c * PITCH + (PITCH - CW) / 2;
export const expSec = (t: number) => lin(t, gridTime(0), gridTime(300)) * 300;
const RING_AT = RINGS.map((s) => ({s, r: Math.floor(s / 60), c: s % 60}));
// 柱状图：每分钟一根，白熊一只只摞起来
const HB = 1404;
const HS = 92;
const HX = (m: number) => 1080 / 2 - 2 * 184 - HS / 2 + m * 184;
const histSlot = (i: number) => {
	const m = RING_AT[i].r;
	const k = RING_AT.slice(0, i).filter((q) => q.r === m).length;
	return {x: HX(m), y: HB - (k + 1) * (HS + 8)};
};

export const Grid: React.FC<{t: number}> = ({t}) => {
	if (t < T.grid || t >= T.stranger + E16) return null;
	const sec = expSec(t);
	const playing = sec > 0 && sec < 300;
	const pr = Math.min(4, Math.floor(sec / 60));
	return (
		<Knife t={t} tk={T.stranger} mid={1150}>
			{/* 行号 */}
			{Array.from({length: GRID.rows}, (_, r) => (
				<Reveal
					key={`l${r}`}
					text={`0${r + 1}`}
					x={72}
					y={rowY(r) + 40}
					size={22}
					weight={700}
					color={pr === r && playing ? C.ink : C.mute}
					p={snap(t, T.grid + E16 + r * E32, E16)}
					q={snap(t, T.gridEnd + E8 + E16, E16)}
				/>
			))}
			{/* 格子：从左往右一列列立起来；放完之后（除了白熊）从右往左塌掉 */}
			{Array.from({length: GRID.rows}, (_, r) =>
				Array.from({length: GRID.cols}, (_, c) => {
					const s = r * 60 + c;
					const up = snap(t, T.grid + E16 + (c / 60) * 0.375 + r * E32 * 0.5, E16);
					const down = snap(t, T.gridEnd + E8 + ((59 - c) / 60) * 0.25 + (4 - r) * E32 * 0.25, E16);
					const k = up * (1 - down);
					if (k <= 0) return null;
					const ring = RING_AT.find((q) => q.s === s);
					const lit = ring && sec >= s;
					const passed = sec >= s + 1;
					const now = playing && Math.floor(sec) === s;
					const h = ROW_H * k;
					const y = rowY(r) + (ROW_H - h) / 2;
					if (lit) return <rect key={s} x={cellX(c) - 2} y={rowY(r) - 22 + (ROW_H + 22) * (1 - k)} width={CW + 4} height={(ROW_H + 22) * k} fill={C.signal} />;
					return <rect key={s} x={cellX(c)} y={y} width={CW} height={h} fill={now ? C.ink : passed ? C.voice2 : C.gridPage} />;
				}),
			)}
			{/* 播放头 */}
			{playing ? <rect x={GX0 + (sec % 60) * PITCH - 1} y={rowY(pr) - 30} width={3} height={ROW_H + 48} fill={C.ink} /> : null}
			{/* 铃响的那一秒：上面弹出一只白熊，一圈波纹；放完之后它们飞去柱状图 */}
			{RING_AT.map((q, i) => {
				const tr = ringTime(q.s);
				if (t < tr - E32) return null;
				const gx = cellX(q.c) + CW / 2 - 24;
				const gy = rowY(q.r) - 22 - 54;
				const f = snap(t, FLY + i * E32, E8);
				const slot = histSlot(i);
				const x = lerp(gx, slot.x, f);
				const y = lerp(gy, slot.y, f);
				const s = lerp(48, HS, f);
				const wave = lin(t, tr, tr + E8);
				return (
					<g key={i}>
						{wave > 0 && wave < 1 ? <circle cx={gx + 24} cy={gy + 24} r={24 + wave * 56} fill="none" stroke={C.signal} strokeWidth={4 * (1 - wave)} /> : null}
						<Slit x={x} y={y} w={s} h={s} t={t} t0={tr} d={E32} line={C.signal}>
							<BearModule x={x} y={y} s={s} t={t} step={stepsAt(t, tr, E8)} />
						</Slit>
					</g>
				);
			})}
			{/* 柱状图的底线、每分钟的标签、"每分钟 1 次"那条线 */}
			{t >= FLY - E16 ? (
				<g>
					<rect x={HX(0) - 32} y={HB + 4} width={(HX(4) + HS + 32 - (HX(0) - 32)) * snap(t, FLY, E16)} height={3} fill={C.ink} />
					{PER_MIN.map((n, m) => (
						<g key={m}>
							<Reveal text={`第 ${m + 1} 分钟`} x={HX(m) + 4} y={HB + 44} size={20} weight={600} color={C.mute} p={snap(t, FLY + E16 + m * E32, E16)} />
							<Reveal text={`× ${n}`} x={HX(m) + 4} y={HB - n * (HS + 8) - 18} size={26} weight={800} color={C.ink} p={snap(t, FLY + 1 + m * E32, E16)} />
						</g>
					))}
					{Array.from({length: 29}, (_, i) => {
						const x = HX(0) - 32 + i * 30;
						const d = snap(t, T.gridEnd + 1.5 + i * 0.008, E16);
						return d > 0 ? <rect key={i} x={x} y={HB - HS - 12} width={16 * d} height={3} fill={C.ink} /> : null;
					})}
					{/* 图例：虚线 = 每分钟 1 次 */}
					{[0, 1].map((i) => (
						<rect key={i} x={GX1 - 150 + i * 26} y={HB + 76} width={16 * snap(t, T.gridEnd + 1.75, E16)} height={3} fill={C.ink} />
					))}
					<Reveal text="每分钟 1 次" x={GX1} y={HB + 86} size={22} weight={700} color={C.ink} p={snap(t, T.gridEnd + 1.75, E16)} anchor="end" />
				</g>
			) : null}
		</Knife>
	);
};

// 上半页的大数字：实验时钟 0:00 → 5:00（等宽数字，一格一格爬上来）
export const ExpClock: React.FC<{t: number}> = ({t}) => {
	const tin = T.grid + E16;
	if (t < tin - E16 || t > T.stranger) return null;
	const size = 226;
	const h = measure('0', size, 700).actualBoundingBoxAscent;
	const up = steps(t, tin - E16, tin - E16 + E8, 4);
	const down = snap(t, T.stranger, E16);
	const off = (1 - up) * (h + 40) + down * (h + 40);
	const s = Math.floor(expSec(t) + 1e-6);
	const txt = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
	return (
		<svg x={0} y={744 - h - 36} width={1080} height={h + 44} overflow="hidden">
			<text x={fx(0)} y={h + 36 + off} fontFamily={FAMILY} fontSize={size} fontWeight={700} fill={C.ink} style={{letterSpacing: `${-0.02 * size}px`, fontVariantNumeric: 'tabular-nums'}}>
				{txt}
			</text>
		</svg>
	);
};

// ———————— 反弹：接下来 5 分钟，可以随便想了 ————————
const TS = 76; // 管子里一只白熊的大小
const TG = 6;
const TUBE_W = 2 * TS + TG + 12;
const TUBE_FLOOR = 1406;
const TUBE_TOP = TUBE_FLOOR - 8 * (TS + TG) - 12;
const TUBES = [
	{x: 210, n: TUBE_N[0], label: '先忍了 5 分钟的人', sub: '后 5 分钟：可以想了'},
	{x: 700, n: TUBE_N[1], label: '一开始就能随便想的人', sub: '5 分钟：随便想'},
];
const slotXY = (tx: number, k: number) => ({x: tx + 6 + (k % 2) * (TS + TG), y: TUBE_FLOOR - (Math.floor(k / 2) + 1) * (TS + TG)});

export const Rebound: React.FC<{t: number}> = ({t}) => {
	if (t < T.stranger + E16 || t >= T.why) return null;
	const t0 = T.stranger + E16;
	const lidUp = snap(t, LID_UP + E16, E16);
	const topB = slotXY(TUBES[1].x, TUBES[1].n - 1).y;
	const topA = slotXY(TUBES[0].x, TUBES[0].n - 1).y;
	const br = snap(t, T.name + E8, E16);
	return (
		<g>
			{TUBES.map((tb, i) => (
				<g key={i}>
					<Slit x={tb.x} y={TUBE_TOP} w={TUBE_W} h={TUBE_FLOOR - TUBE_TOP} t={t} t0={t0 + E16 + i * E32} d={E16}>
						<rect x={tb.x} y={TUBE_TOP} width={2} height={TUBE_FLOOR - TUBE_TOP} fill={C.ink} />
						<rect x={tb.x + TUBE_W - 2} y={TUBE_TOP} width={2} height={TUBE_FLOOR - TUBE_TOP} fill={C.ink} />
						<rect x={tb.x - 20} y={TUBE_FLOOR} width={TUBE_W + 40} height={4} fill={C.ink} />
						{Array.from({length: 8}, (_, j) => (
							<rect key={j} x={tb.x + TUBE_W - 14} y={TUBE_FLOOR - (j + 1) * (TS + TG)} width={12} height={2} fill={C.ink} />
						))}
					</Slit>
					<Reveal text={tb.label} x={tb.x + TUBE_W / 2 - textWidth(tb.label, 24, 700) / 2} y={TUBE_FLOOR + 48} size={24} weight={700} color={C.ink} p={snap(t, t0 + E8 + i * E32, E16)} />
					<Reveal text={tb.sub} x={tb.x + TUBE_W / 2 - textWidth(tb.sub, 20, 500) / 2} y={TUBE_FLOOR + 80} size={20} weight={500} color={C.mute} p={snap(t, t0 + E8 + E16 + i * E32, E16)} />
					{/* 白熊一只只落进管子 */}
					{Array.from({length: tb.n}, (_, k) => {
						const td = dropTime(i, k);
						if (t < td - E16) return null;
						const {x, y} = slotXY(tb.x, k);
						const fall = snap(t, td, E16);
						const yy = lerp(TUBE_TOP - TS - 40, y, fall);
						return (
							<svg key={k} x={tb.x} y={TUBE_TOP} width={TUBE_W} height={TUBE_FLOOR - TUBE_TOP} overflow="hidden">
								<BearModule x={x - tb.x} y={yy - TUBE_TOP} s={TS} t={t} step={stepsAt(t, td, E8)} />
							</svg>
						);
					})}
				</g>
			))}
			{/* 先忍着的那一管：一块盖子压在底上；可以想了，盖子一下被顶飞 */}
			{lidUp < 1 && t >= t0 + E8 ? (
				<g transform={`translate(0 ${-lidUp * 900})`}>
					<Slit x={TUBES[0].x + 4} y={TUBE_FLOOR - 22} w={TUBE_W - 8} h={18} t={t} t0={t0 + E8 + E16} d={E32}>
						<rect x={TUBES[0].x + 4} y={TUBE_FLOOR - 22} width={TUBE_W - 8} height={18} fill={C.ink} />
						<rect x={TUBES[0].x + TUBE_W / 2 - 4} y={TUBE_FLOOR - 160} width={8} height={138} fill={C.ink} />
						<path d={`M ${TUBES[0].x + TUBE_W / 2 - 22} ${TUBE_FLOOR - 64} L ${TUBES[0].x + TUBE_W / 2 + 22} ${TUBE_FLOOR - 64} L ${TUBES[0].x + TUBE_W / 2} ${TUBE_FLOOR - 30} Z`} fill={C.ink} />
					</Slit>
				</g>
			) : null}
			{/* 多出来的那一截：反弹 */}
			{br > 0 ? (
				<g>
					{Array.from({length: 22}, (_, i) => (
						<rect key={i} x={TUBES[0].x - 20 + i * 30} y={topB - 4} width={16 * snap(t, T.name + i * 0.01, E16)} height={2} fill={C.ink} />
					))}
					<rect x={TUBES[0].x + TUBE_W + 20} y={topA} width={3} height={(topB - topA) * br} fill={C.ink} />
					<rect x={TUBES[0].x + TUBE_W + 10} y={topA} width={22} height={3} fill={C.ink} />
					{br >= 1 ? <rect x={TUBES[0].x + TUBE_W + 10} y={topB - 3} width={22} height={3} fill={C.ink} /> : null}
				</g>
			) : null}
			<Reveal text="反弹" x={TUBES[0].x + TUBE_W + 44} y={(topA + topB) / 2 + 22} size={64} weight={800} color={C.ink} p={snap(t, T.name + E8 + E16, E16)} />
			<Reveal text="■ = 想起一次白熊（示意）" x={72} y={1520} size={20} weight={500} color={C.mute} p={snap(t, T.rebound + 1, E16)} />
		</g>
	);
};
