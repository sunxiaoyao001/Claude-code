// 01 起源（1863，陀思妥耶夫斯基的那句话）和 02 实验（1987，韦格纳的白熊实验）
import {Chair, Figure, hipOnSeat, mixPose, POSES, Table} from '../../pd/film/Picto';
import {BEAT, E16, E32, E8, GRID, gridTime, RINGS, T} from '../score';
import {C, FAMILY, fx, lerp, lin, measure, snap, steps, textWidth} from '../sys';
import {Act, CX, CY, Floor, GROUND, Pop} from './Act';
import {BearModule} from './Bear';
import {Reveal} from './Type';

// 新一幕在上一幕被切掉之后升起：刀切在整点，升起完成在 +3/8 拍
const IN = 0.375;

// ———————— 1863：伏案写字的人 ————————
export const Writer: React.FC<{t: number}> = ({t}) => {
	const h = 250;
	const seatY = 1290;
	// 每个八分音符，笔动一下
	const k = Math.floor(t / E8);
	const pose = mixPose(k % 2 ? POSES.writeB : POSES.write, k % 2 ? POSES.write : POSES.writeB, snap(t, (k + 1) * E8, E16));
	return (
		<Act t={t} tin={T.y1863 + IN} tout={T.notebook}>
			<Floor />
			{/* 整幅放大 1.4 倍，以地面中点为基准 */}
			<g transform={`translate(${CX - 40} ${GROUND}) scale(1.4) translate(${-(CX - 40)} ${-GROUND})`}>
				<Table x={470} y={1250} w={300} legH={GROUND - 1250} color={C.ink} />
				<Chair x={382} seatY={seatY} dir={1} color={C.ink} />
				<Figure x={392} y={hipOnSeat(seatY, h)} h={h} pose={pose} color={C.ink} />
				{/* 摊开的本子、蜡烛 */}
				<rect x={512} y={1240} width={120} height={10} fill={C.ink} />
				<rect x={700} y={1196} width={12} height={54} fill={C.ink} />
				<path d="M 706 1160 C 716 1176 716 1188 706 1192 C 696 1188 696 1176 706 1160 Z" fill={C.ink} />
			</g>
		</Act>
	);
};

// ———————— 那一页：原文（俄文），"白熊"两个词被标成信号色；白熊从字里冒出来 ————————
const RU = ['Попробуйте задать себе', 'задачу: не вспоминать', 'про белого медведя, и', 'увидите, что он,', 'проклятый, будет', 'поминутно припоминаться.'];
const RU_SIZE = 27;
const RU_X = 540;
const RU_Y = 930;
const RU_LH = 48;
const HL = {line: 2, before: 'про ', word: 'белого медведя'};
const BOOK = {x0: 120, x1: 888, y0: 836, y1: 1380, gutter: 504};

const phraseBox = () => {
	const x = RU_X + textWidth(HL.before, RU_SIZE, 500);
	const w = textWidth(HL.word, RU_SIZE, 500);
	const base = RU_Y + HL.line * RU_LH;
	return {x, w, base};
};

export const Notebook: React.FC<{t: number}> = ({t}) => {
	const pb = phraseBox();
	const hl = lin(t, T.quote1 + E16, T.quote1 + E8 + E16);
	// 每分钟都会冒出来：从那个词里冒出三只白熊，一拍一只
	const pops = [
		{x: 600, y: 696, s: 112},
		{x: 772, y: 740, s: 96},
		{x: 452, y: 712, s: 88},
	];
	const outside = pops.map((p, i) => {
		const t0 = T.quote2 + E16 + i * BEAT;
		if (t < t0 - E16) return null;
		const m = snap(t, t0, E16);
		const x = lerp(pb.x + pb.w / 2 - 20, p.x, m);
		const y = lerp(pb.base - 40, p.y, m);
		const s = lerp(40, p.s, m);
		return <BearModule key={i} x={x} y={y} s={s} t={t} />;
	});
	return (
		<Act t={t} tin={T.notebook + IN} tout={T.later} outside={outside}>
			{/* 书页 */}
			<rect x={BOOK.x0} y={BOOK.y0} width={BOOK.x1 - BOOK.x0} height={BOOK.y1 - BOOK.y0} fill={C.page} />
			<rect x={BOOK.gutter - 1} y={BOOK.y0} width={2} height={(BOOK.y1 - BOOK.y0) * lin(t, T.notebook + E8, T.notebook + BEAT)} fill={C.ink} />
			{/* 左页：看不清的字，一行一行画出来 */}
			{Array.from({length: 10}, (_, i) => {
				const w = [300, 284, 312, 260, 296, 308, 270, 290, 236, 180][i];
				const p = lin(t, T.notebook + E8 + i * E32, T.notebook + E8 + i * E32 + E16);
				return <rect key={i} x={160} y={906 + i * 44} width={w * p} height={12} fill={C.voice2} />;
			})}
			{/* 右页：原文 */}
			{RU.map((line, i) => (
				<Reveal key={i} text={line} x={RU_X} y={RU_Y + i * RU_LH} size={RU_SIZE} weight={500} color={C.ink} p={snap(t, T.notebook + BEAT + i * E32, E16)} />
			))}
			{/* "белого медведя"：标成信号色，字镂空成纸色 */}
			{hl > 0 ? (
				<g>
					<rect x={pb.x - 5} y={pb.base - 24} width={(pb.w + 10) * hl} height={33} fill={C.signal} />
					<svg x={pb.x - 5} y={pb.base - 30} width={(pb.w + 10) * hl} height={42} overflow="hidden">
						<text x={5} y={30} fontFamily={FAMILY} fontSize={RU_SIZE} fontWeight={500} fill={C.paper}>
							{HL.word}
						</text>
					</svg>
				</g>
			) : null}
			<Reveal text="«Зимние заметки о летних впечатлениях», 1863" x={BOOK.x0} y={1420} size={19} weight={500} color={C.mute} p={snap(t, T.notebook + 1.5, E16)} />
		</Act>
	);
};

// ———————— 一百多年后：一条时间线，从 1863 画到 1987 ————————
export const Timeline: React.FC<{t: number}> = ({t}) => {
	const x0 = 150;
	const x1 = 858;
	const y = CY + 20;
	const draw = lin(t, T.later + IN, T.later + IN + 1.25);
	const xAt = (yr: number) => x0 + ((yr - 1863) / (1987 - 1863)) * (x1 - x0);
	return (
		<Act t={t} tin={T.later + IN} tout={T.lab}>
			<rect x={x0} y={y - 1} width={(x1 - x0) * draw} height={2} fill={C.ink} />
			{Array.from({length: 13}, (_, i) => 1870 + i * 10)
				.filter((yr) => yr < 1987)
				.map((yr) => {
					const x = xAt(yr);
					return x <= x0 + (x1 - x0) * draw ? <rect key={yr} x={x} y={y - 12} width={1} height={12} fill={C.ink} /> : null;
				})}
			<BearModule x={x0} y={y - 112} s={88} t={t} />
			<Reveal text="1863" x={x0} y={y + 48} size={30} weight={700} color={C.ink} p={snap(t, T.later + IN + E16, E16)} />
			{draw >= 1 ? <BearModule x={x1 - 88} y={y - 112} s={88} t={t} /> : null}
			<Reveal text="1987" x={x1} y={y + 48} size={30} weight={700} color={C.ink} p={snap(t, T.later + IN + 1.5, E16)} anchor="end" />
			<Reveal text="124 年" x={(x0 + x1) / 2 - 40} y={y + 48} size={24} weight={500} color={C.mute} p={snap(t, T.later + IN + 1.5 + E16, E16)} />
		</Act>
	);
};

// ———————— 1987：一个人坐在桌前，桌上一台录音机、一只铃 ————————
const LAB = {seatY: 1290, h: 250, chairX: 352, sitX: 362, tableX: 440, tableW: 330, tableY: 1258};
export const Lab: React.FC<{t: number}> = ({t}) => {
	const press = snap(t, T.bell + E8, E16) * (1 - snap(t, T.bell + E8 + E8, E16));
	const pose = mixPose(POSES.sitHands, POSES.pressBell, press);
	// 说话：三道弧，每个八分音符多一道
	const talk = t >= T.lab + IN && t < T.grid;
	const arcs = talk ? (Math.floor((t - T.lab) / E8) % 3) + 1 : 0;
	// 墙上的 5:00 计时，一秒一秒往下走
	const left = Math.max(0, 300 - Math.max(0, Math.floor(t - (T.lab + IN))));
	const timer = `${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`;
	const rule = snap(t, T.rule + E16, E16);
	const think = snap(t, T.bell + E8, E32);
	return (
		<Act t={t} tin={T.lab + IN} tout={T.grid}>
			<Floor />
			<Table x={LAB.tableX} y={LAB.tableY} w={LAB.tableW} legH={GROUND - LAB.tableY} color={C.ink} />
			<Chair x={LAB.chairX} seatY={LAB.seatY} dir={1} color={C.ink} />
			<Figure x={LAB.sitX} y={hipOnSeat(LAB.seatY, LAB.h)} h={LAB.h} pose={pose} color={C.ink} />
			{/* 录音机 */}
			<rect x={520} y={1206} width={104} height={52} fill={C.ink} />
			<circle cx={546} cy={1232} r={14} fill={C.paper} />
			<circle cx={598} cy={1232} r={14} fill={C.paper} />
			<circle cx={546} cy={1232} r={4} fill={C.ink} />
			<circle cx={598} cy={1232} r={4} fill={C.ink} />
			{/* 铃 */}
			<rect x={676} y={1250} width={60} height={8} fill={C.ink} />
			<path d="M 682 1250 A 24 24 0 0 1 730 1250 Z" fill={C.ink} />
			<rect x={702} y={1218} width={8} height={10} fill={C.ink} />
			{/* 说的话 → 录音机 */}
			{Array.from({length: arcs}, (_, i) => (
				<path key={i} d={`M ${470 + i * 14} ${1150 - 10 - i * 6} A ${16 + i * 10} ${16 + i * 10} 0 0 1 ${470 + i * 14} ${1150 + 10 + i * 6}`} fill="none" stroke={C.ink} strokeWidth={3} />
			))}
			{/* 计时 */}
			<rect x={692} y={846} width={180} height={1} fill={C.ink} />
			<text x={692} y={904} fontFamily={FAMILY} fontSize={52} fontWeight={700} fill={C.ink} style={{fontVariantNumeric: 'tabular-nums'}}>
				{timer}
			</text>
			<text x={692} y={936} fontFamily={FAMILY} fontSize={20} fontWeight={500} fill={C.mute}>
				独自 · 5 分钟
			</text>
			{/* 规则：一只白熊，被一道墨线划掉 */}
			<Pop x={404} y={830} w={160} h={160} p={rule}>
				<BearModule x={408} y={834} s={150} t={t} crossed={lin(t, T.rule + E8, T.rule + E8 + E16)} />
			</Pop>
			{/* 想到了：头顶冒出一只 */}
			{think > 0 ? (
				<Pop x={208} y={940} w={120} h={120} p={think}>
					<BearModule x={212} y={944} s={112} t={t} />
				</Pop>
			) : null}
		</Act>
	);
};

// ———————— 5 分钟压成 6 秒：1 行 = 1 分钟，1 格 = 10 秒；按铃的那一格变成白熊 ————————
const G = {x0: 168, y0: 812, cell: 112, gap: 12};
const cellXY = (r: number, c: number) => ({x: G.x0 + c * (G.cell + G.gap), y: G.y0 + r * (G.cell + G.gap)});
const RING_CELLS = RINGS.map((s) => ({sec: s, r: Math.floor(s / 60), c: Math.floor((s % 60) / GRID.secPerCell)}));
const PLAY0 = gridTime(0);
const PLAY1 = gridTime(300);
export const expSec = (t: number) => lin(t, PLAY0, PLAY1) * 300;

export const Grid: React.FC<{t: number}> = ({t}) => {
	const sec = expSec(t);
	const rowW = GRID.cols * G.cell + (GRID.cols - 1) * G.gap;
	// 48.5：除了白熊，其他格子都被收掉
	const clear = (r: number, c: number) => snap(t, T.gridEnd + E8 + ((4 - r) + (5 - c)) * E32 * 0.5, E16);
	return (
		<Act t={t} tin={T.grid + IN} tout={T.stranger}>
			{Array.from({length: GRID.rows}, (_, r) => (
				<Reveal key={`lab${r}`} text={`${r + 1} 分`} x={96} y={G.y0 + r * (G.cell + G.gap) + 66} size={22} weight={600} color={C.mute} p={snap(t, T.grid + IN + r * E32, E16)} />
			))}
			{Array.from({length: GRID.rows}, (_, r) =>
				Array.from({length: GRID.cols}, (_, c) => {
					const {x, y} = cellXY(r, c);
					const start = r * 60 + c * GRID.secPerCell;
					const passed = sec >= start + GRID.secPerCell;
					const ring = RING_CELLS.find((q) => q.r === r && q.c === c);
					if (ring && sec >= ring.sec) return <BearModule key={`${r}${c}`} x={x} y={y} s={G.cell} t={t} />;
					const k = 1 - clear(r, c);
					if (k <= 0) return null;
					const hh = G.cell * k;
					return <rect key={`${r}${c}`} x={x} y={y + (G.cell - hh) / 2} width={G.cell} height={hh} fill={passed ? C.voice2 : C.gridPaper} />;
				}),
			)}
			{/* 播放头：线性走过每一行 */}
			{sec > 0 && sec < 300
				? (() => {
						const r = Math.floor(sec / 60);
						const x = G.x0 + ((sec % 60) / 60) * rowW;
						return <rect x={x - 1} y={G.y0 + r * (G.cell + G.gap) - 6} width={2} height={G.cell + 12} fill={C.ink} />;
					})()
				: null}
			<rect x={G.x0} y={1452} width={rowW * snap(t, T.gridEnd + 1, E16)} height={1} fill={C.ink} />
			<Reveal text="7 次 · 每一行都有" x={G.x0} y={1480} size={22} weight={600} color={C.ink} p={snap(t, T.gridEnd + 1 + E16, E16)} />
		</Act>
	);
};

// 上半页的大数字：实验时钟 0:00 → 5:00（等宽数字）
export const ExpClock: React.FC<{t: number}> = ({t}) => {
	const tin = T.grid + IN;
	if (t < tin - E16 || t > T.stranger) return null;
	const size = 250;
	const h = measure('0', size, 700).actualBoundingBoxAscent;
	const up = steps(t, tin - E16, tin - E16 + E8, 4);
	const down = snap(t, T.stranger, E16);
	const off = (1 - up) * (h + 40) + down * (h + 40);
	const s = Math.floor(expSec(t));
	const txt = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
	return (
		<svg x={0} y={744 - h - 36} width={1080} height={h + 44} overflow="hidden">
			<text x={fx(0)} y={h + 36 + off} fontFamily={FAMILY} fontSize={size} fontWeight={700} fill={C.ink} style={{letterSpacing: `${-0.02 * size}px`, fontVariantNumeric: 'tabular-nums'}}>
				{txt}
			</text>
		</svg>
	);
};

// ———————— 反弹：接下来 5 分钟，可以随便想的时候 ————————
const N1 = 16; // 先忍过的人（示意）
const N2 = 10; // 一开始就能想的人（示意）
const BAR_S = 36;
const BAR_G = 6;
export const Rebound: React.FC<{t: number}> = ({t}) => {
	const rows = [
		{y: 960, n: N1, label: '先忍了 5 分钟的人：'},
		{y: 1170, n: N2, label: '一开始就能随便想的人：'},
	];
	const fill0 = T.rebound + E8;
	const extra0 = N2;
	const bx = 168 + extra0 * (BAR_S + BAR_G) - 3;
	const bw = (N1 - N2) * (BAR_S + BAR_G) - BAR_G + 6;
	const br = snap(t, T.name + E16, E16);
	return (
		<Act t={t} tin={T.stranger + IN} tout={T.why - E16}>
			{rows.map((row, i) => (
				<g key={i}>
					<Reveal text={row.label} x={168} y={row.y - 22} size={26} weight={700} color={C.ink} p={snap(t, T.stranger + IN + i * E16, E16)} />
					<rect x={168} y={row.y + BAR_S + 10} width={(N1 * (BAR_S + BAR_G) - BAR_G) * lin(t, T.stranger + IN, T.stranger + IN + E8)} height={1} fill={C.gridPaper} />
					{Array.from({length: row.n}, (_, k) => {
						const tk = fill0 + k * E32;
						if (t < tk) return null;
						return <BearModule key={k} x={168 + k * (BAR_S + BAR_G)} y={row.y} s={BAR_S} t={t} />;
					})}
				</g>
			))}
			{/* 多出来的那一截：反弹 */}
			{br > 0 ? (
				<g>
					<rect x={bx} y={rows[0].y - 64} width={bw * br} height={2} fill={C.ink} />
					<rect x={bx} y={rows[0].y - 64} width={2} height={14} fill={C.ink} />
					{br >= 1 ? <rect x={bx + bw - 2} y={rows[0].y - 64} width={2} height={14} fill={C.ink} /> : null}
				</g>
			) : null}
			<Reveal text="反弹" x={bx} y={rows[0].y - 76} size={30} weight={800} color={C.ink} p={snap(t, T.name + E8, E16)} />
			<Reveal text="■ = 想起一次白熊（示意）" x={168} y={1420} size={20} weight={500} color={C.mute} p={snap(t, T.rebound + 1, E16)} />
		</Act>
	);
};
