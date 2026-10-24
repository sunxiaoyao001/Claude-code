// 01 起源（18–30 秒）：
// 烛光里写字的人，窗外下雪 → 镜头一路扎进桌上那张纸（那张纸就是下一屏整页原文的缩小版）→
// 灰色的字一行行变成能读的俄文，"белого медведя"被标成群青 → 镜头扎进两个词中间的那道缝，整屏变蓝 →
// 一只巨大的白熊在雪里慢慢走 → 一只秒表，每转一圈（= 一分钟）弹出一只白熊。
import {Chair, Figure, hipOnSeat, mixPose, POSES, Table} from '../../pd/film/Picto';
import {BEAT, E16, E8, T} from '../score';
import {C, collapse, FAMILY, knifeLine, lerp, lin, snap, textWidth} from '../sys';
import {Bear, stepsAt} from './Bear';
import {cam, CropMarks, type Pt, Slit, STAGE, zoomS} from './Kit';
import {Reveal} from './Type';

const PAGE_THEME = {bg: C.paper, ink: C.ink, lead: C.mute, rule: C.ink, faint: C.gridPage};
const BLUE_LEAD = '#C7D0FF';

// 雪：确定的伪随机，线性落下（例外的运动）
const FLAKES = Array.from({length: 70}, (_, i) => ({x: ((i * 73) % 101) / 101, y: ((i * 37) % 89) / 89, r: 1.6 + ((i * 11) % 5) * 0.7, v: 0.07 + ((i * 7) % 5) * 0.02}));
const Snow: React.FC<{t: number; x: number; y: number; w: number; h: number; color: string; n?: number}> = ({t, x, y, w, h, color, n = 70}) => (
	<g fill={color}>
		{FLAKES.slice(0, n).map((f, i) => (
			<circle key={i} cx={x + f.x * w + Math.sin(t * 0.8 + i) * 4} cy={y + ((f.y + t * f.v) % 1) * h} r={f.r} />
		))}
	</g>
);

// 一大块"夜"，中间挖掉一个圆（烛光）
const night = (cx: number, cy: number, r: number) =>
	`M -3000 -3000 H 4080 V 4920 H -3000 Z M ${cx - r} ${cy} A ${r} ${r} 0 1 0 ${cx + r} ${cy} A ${r} ${r} 0 1 0 ${cx - r} ${cy} Z`;

// ———————— 那一页原文（整屏 1080 × 1920 的坐标；桌上那张纸是它缩小 K 倍）————————
const RU = ['Попробуйте задать себе', 'задачу: не вспоминать', 'про белого медведя, и', 'увидите, что он,', 'проклятый, будет', 'поминутно припоминаться.'];
const RU_SIZE = 38;
const LH = 52;
const BODY_Y = 812; // 第一行基线
const LINES_N = 14;
const REAL0 = 4; // 原句从第 5 行开始
const HL = {line: 2, before: 'про ', word: 'белого медведя', gapAfter: 'белого'};
const ML = 96; // 左边距
const MR = 984;
// 其余的字：一行行灰色的"词"（远看的一页俄文）；原句那几行先也是灰条，宽度 = 那一行字的宽度
const FILL: [number, number][][] = Array.from({length: LINES_N}, (_, i) => {
	const words: [number, number][] = [];
	let x = ML;
	let k = i * 7 + 3;
	const end = i === LINES_N - 1 ? 620 : i === REAL0 - 1 ? 760 : MR;
	while (x < end - 40) {
		const w = Math.min(34 + ((k * 37) % 92), end - x);
		words.push([x, w]);
		x += w + 14;
		k++;
	}
	return words;
});
const lineY = (i: number) => BODY_Y + i * LH;
const hlBox = () => {
	const x = ML + textWidth(HL.before, RU_SIZE, 500);
	const w = textWidth(HL.word, RU_SIZE, 500);
	const base = lineY(REAL0 + HL.line);
	// 镜头扎进去的点：两个词中间那道缝的正中
	const gx = x + textWidth(HL.gapAfter, RU_SIZE, 500) + textWidth(' ', RU_SIZE, 500) / 2;
	return {x: x - 7, y: base - 36, w: w + 14, h: 48, base, tx: x, gap: [gx, base - 12] as Pt};
};

// resolve(i) = 第 i 行原句从灰条变成字的进度；hl = 标记的进度；grow(i) = 第 i 行写出来的进度
const PageArt: React.FC<{resolve: (i: number) => number; hl: number; grow: (i: number) => number}> = ({resolve, hl, grow}) => {
	const hb = hlBox();
	return (
		<g>
			<text x={ML} y={576} fontFamily={FAMILY} fontSize={17} fontWeight={600} fill={C.mute} style={{letterSpacing: '0.18em'}}>
				ЗИМНИЕ ЗАМЕТКИ О ЛЕТНИХ ВПЕЧАТЛЕНИЯХ
			</text>
			<rect x={ML} y={592} width={MR - ML} height={1} fill={C.ink} />
			<text x={ML} y={690} fontFamily={FAMILY} fontSize={64} fontWeight={700} fill={C.ink}>
				VI
			</text>
			<text x={ML} y={730} fontFamily={FAMILY} fontSize={18} fontWeight={600} fill={C.ink} style={{letterSpacing: '0.18em'}}>
				ОПЫТ О БУРЖУА
			</text>
			{FILL.map((words, i) => {
				const real = i - REAL0;
				const g = grow(i);
				if (g <= 0) return null;
				if (real >= 0 && real < RU.length) {
					const r = resolve(real);
					const w = textWidth(RU[real], RU_SIZE, 500);
					// 灰条先塌成一道线，字再从线里升起来
					const k = 1 - snap(r, 0.5, 0.5);
					return (
						<g key={i}>
							{k > 0 ? <rect x={ML} y={lineY(i) - 22 + 8 * (1 - k)} width={w * g} height={16 * k + 0.001} fill={C.voice2} /> : null}
							{r > 0.5 ? <Reveal text={RU[real]} x={ML} y={lineY(i)} size={RU_SIZE} weight={500} color={C.ink} p={snap(r, 1, 0.5)} /> : null}
						</g>
					);
				}
				return words.map(([x, w], j) => <rect key={`${i}-${j}`} x={x} y={lineY(i) - 22} width={w * g} height={16} fill={C.voice2} />);
			})}
			{hl > 0 ? (
				<g>
					<rect x={hb.x} y={hb.y} width={hb.w * hl} height={hb.h} fill={C.signal} />
					<svg x={hb.x} y={hb.y - 4} width={hb.w * hl} height={hb.h + 8} overflow="hidden">
						<text x={hb.tx - hb.x} y={hb.base - hb.y + 4} fontFamily={FAMILY} fontSize={RU_SIZE} fontWeight={500} fill={C.paper}>
							{HL.word}
						</text>
					</svg>
				</g>
			) : null}
			<text x={540} y={1576} textAnchor="middle" fontFamily={FAMILY} fontSize={18} fontWeight={600} fill={C.mute} style={{letterSpacing: '0.12em'}}>
				— 1863 —
			</text>
		</g>
	);
};

// ———————— 烛光里的屋子 ————————
const H = 400; // 写字的人的身高
const FLOOR = 1450;
const SEAT = FLOOR - 0.187 * H; // 脚刚好踩在地上
const HIP: Pt = [292, hipOnSeat(SEAT, H)];
const TOP = SEAT - 0.155 * H; // 桌面：落笔时手正好搁在上面
const K = 0.08; // 桌上那张纸 = 整页缩小 K 倍
const SHEET: Pt = [HIP[0] + 0.374 * H + 8, TOP - 1920 * K - 10]; // 纸的左上角（立在一个小书架上）
const SHEET_C: Pt = [SHEET[0] + 540 * K, SHEET[1] + 960 * K];
const CANDLE = SHEET[0] + 1080 * K + 112;
const FLAME: Pt = [CANDLE, TOP - 100];
// 烛光：一个落在舞台正中的圆（从火苗里张开）
const LIGHT = {c: [540, 1180] as Pt, r: 380};
const WIN = {x: 330, y: 880, w: 160, h: 200};

export const Room: React.FC<{t: number}> = ({t}) => {
	if (t < T.y1863 || t >= T.notebook) return null;
	// 镜头：每拍推近一点，最后半拍扎进纸里，纸刚好铺满整屏
	const creep = 1 + 0.045 * snap(t, T.y1863 + 1, E8) + 0.045 * snap(t, T.y1863 + 2, E8);
	const dive = snap(t, T.zoomPaper, E8);
	const s = zoomS(dive, creep, 1 / K);
	const m = cam(SHEET_C[0], SHEET_C[1], lerp(SHEET_C[0], 540, dive), lerp(SHEET_C[1], 960, dive), s);
	// 烛光：火柴一划，一个圆从火苗里张开；之后每拍微微呼吸一下
	const ignite = snap(t, T.y1863 + E16, E16);
	const k = Math.floor(t);
	const breathe = (k % 2 ? 1 - snap(t, k + 1, E16) : snap(t, k + 1, E16)) * 12;
	const R = (LIGHT.r + breathe) * ignite;
	const L: Pt = [lerp(FLAME[0], LIGHT.c[0], ignite), lerp(FLAME[1], LIGHT.c[1], ignite)];
	// 写字：手每个八分音符起落一次
	const w8 = Math.floor(t / E8);
	const pose = mixPose(w8 % 2 ? POSES.writeB : POSES.write, w8 % 2 ? POSES.write : POSES.writeB, snap(t, (w8 + 1) * E8, E16));
	// 纸上的字一行行写出来（写字的人写到哪里，灰条长到哪里）
	const grow = (i: number) => lin(t, T.y1863 + 0.3 + i * 0.16, T.y1863 + 0.46 + i * 0.16);
	const flick = Math.floor(t / E16) % 2;
	return (
		<g transform={m}>
			<circle cx={L[0]} cy={L[1]} r={Math.max(0.01, R)} fill={C.page} />
			{/* 墙上的窗：外面是夜，在下雪 */}
			<Slit x={WIN.x} y={WIN.y} w={WIN.w} h={WIN.h} t={t} t0={T.y1863 + E8} d={E16}>
				<rect x={WIN.x} y={WIN.y} width={WIN.w} height={WIN.h} fill={C.night} />
				<svg x={WIN.x} y={WIN.y} width={WIN.w} height={WIN.h} overflow="hidden">
					<Snow t={t} x={0} y={0} w={WIN.w} h={WIN.h} color={C.paper} n={30} />
				</svg>
				<rect x={WIN.x} y={WIN.y} width={WIN.w} height={WIN.h} fill="none" stroke={C.ink} strokeWidth={8} />
				<rect x={WIN.x + WIN.w / 2 - 2} y={WIN.y} width={4} height={WIN.h} fill={C.ink} />
				<rect x={WIN.x} y={WIN.y + WIN.h * 0.42} width={WIN.w} height={4} fill={C.ink} />
				<rect x={WIN.x - 14} y={WIN.y + WIN.h} width={WIN.w + 28} height={8} fill={C.ink} />
			</Slit>
			{/* 光里的东西：墨色的人和家具 */}
			<rect x={0} y={FLOOR} width={1080} height={4} fill={C.ink} />
			<Table x={HIP[0] + 96} y={TOP} w={440} legH={FLOOR - TOP} color={C.ink} />
			<Chair x={HIP[0] - 8} seatY={SEAT} dir={1} color={C.ink} s={(FLOOR - SEAT) / 80} />
			<Figure x={HIP[0]} y={HIP[1]} h={H} pose={pose} color={C.ink} />
			{/* 小书架 + 立着的纸 */}
			<path d={`M ${SHEET[0] + 1080 * K - 6} ${SHEET[1] + 30} L ${SHEET[0] + 1080 * K + 30} ${TOP}`} stroke={C.ink} strokeWidth={6} strokeLinecap="round" />
			<rect x={SHEET[0] - 6} y={TOP - 10} width={1080 * K + 12} height={10} fill={C.ink} />
			<rect x={SHEET[0]} y={SHEET[1]} width={1080 * K} height={1920 * K} fill={C.paper} />
			<g transform={`translate(${SHEET[0]} ${SHEET[1]}) scale(${K})`}>
				<PageArt resolve={() => 0} hl={0} grow={grow} />
			</g>
			<rect x={SHEET[0]} y={SHEET[1]} width={1080 * K} height={1920 * K} fill="none" stroke={C.ink} strokeWidth={1.5} vectorEffect="non-scaling-stroke" opacity={dive < 0.9 ? 1 : 0} />
			{/* 蜡烛：火苗每个十六分音符跳一下 */}
			<rect x={CANDLE - 20} y={TOP - 12} width={40} height={12} fill={C.ink} />
			<rect x={CANDLE - 8} y={TOP - 70} width={16} height={58} fill={C.ink} />
			<path
				d={
					flick
						? `M ${CANDLE} ${TOP - 124} C ${CANDLE + 15} ${TOP - 102} ${CANDLE + 14} ${TOP - 84} ${CANDLE} ${TOP - 76} C ${CANDLE - 14} ${TOP - 84} ${CANDLE - 13} ${TOP - 104} ${CANDLE} ${TOP - 124} Z`
						: `M ${CANDLE + 2} ${TOP - 118} C ${CANDLE + 15} ${TOP - 100} ${CANDLE + 14} ${TOP - 84} ${CANDLE} ${TOP - 76} C ${CANDLE - 14} ${TOP - 84} ${CANDLE - 12} ${TOP - 100} ${CANDLE + 2} ${TOP - 118} Z`
				}
				fill={C.ink}
			/>
			{/* 夜：一大块，中间挖掉烛光那个圆 */}
			<path d={night(L[0], L[1], Math.max(0.01, R))} fill={C.night} fillRule="evenodd" />
		</g>
	);
};

// ———————— 整页原文 ————————
export const Manuscript: React.FC<{t: number}> = ({t}) => {
	if (t < T.notebook || t >= T.zoomBlue) return null;
	const hb = hlBox();
	// 镜头扎进"白熊"两个词之间的那道缝（缝要比整屏宽，字才会全部飞出画外）
	const dive = snap(t, T.zoomBlue, E8);
	const s = zoomS(dive, 1, 150);
	const m = dive > 0 ? cam(hb.gap[0], hb.gap[1], lerp(hb.gap[0], 540, dive), lerp(hb.gap[1], 960, dive), s) : undefined;
	const resolve = (i: number) => lin(t, T.notebook + E16 + i * E16, T.notebook + E16 + i * E16 + E8);
	// 标记：像荧光笔一样匀速划过去（例外，线性）
	const hl = lin(t, T.highlight, T.highlight + E8);
	return (
		<g>
			<rect width={1080} height={1920} fill={C.paper} />
			<g transform={m}>
				<PageArt resolve={resolve} hl={hl} grow={() => 1} />
			</g>
			<CropMarks t={t} tin={T.notebook + E8} tout={T.zoomBlue - E8} label="FIG. 1 — 原文，1863" theme={PAGE_THEME} y0={520} y1={1610} />
		</g>
	);
};

// ———————— 群青：巨大的白熊在雪里慢慢走 ————————
const BLUE_GROUND = 1440;
export const BlueBear: React.FC<{t: number}> = ({t}) => {
	if (t < T.zoomBlue || t >= T.quote2 + E16) return null;
	const t0 = T.quote1 + E16;
	const x = lerp(330, 720, lin(t, t0, T.quote2));
	const len = 760;
	const k = Math.max(1e-4, collapse(t, T.quote2 - E16));
	const kl = knifeLine(t, T.quote2 - E16);
	const mid = 1180;
	return (
		<g>
			<g transform={k < 1 ? `translate(0 ${mid}) scale(1 ${k}) translate(0 ${-mid})` : undefined}>
				<Snow t={t} x={0} y={STAGE.y0 - 20} w={1080} h={BLUE_GROUND - STAGE.y0 + 40} color={C.paper} />
				<rect x={0} y={BLUE_GROUND} width={1080 * lin(t, T.zoomBlue, T.zoomBlue + E8)} height={3} fill={C.paper} />
				<Slit x={x - len / 2} y={BLUE_GROUND - len * 0.56} w={len} h={len * 0.56} t={t} t0={t0} d={E16} line={C.paper}>
					<Bear x={x} y={BLUE_GROUND} len={len} step={stepsAt(t, t0, E8)} bg={C.signal} />
				</Slit>
				<Reveal text="белый медведь" x={96} y={BLUE_GROUND + 48} size={22} weight={600} color={C.paper} p={snap(t, T.quote1 + 1, E16)} />
				<Reveal text="俄语里的“白熊”，就是北极熊" x={96} y={BLUE_GROUND + 80} size={20} weight={500} color={BLUE_LEAD} p={snap(t, T.quote1 + 1 + E16, E16)} />
			</g>
			{kl > 0 ? <rect x={0} y={mid - 1} width={1080 * kl} height={2} fill={C.paper} /> : null}
		</g>
	);
};

// ———————— 群青：秒表，每转一圈 = 一分钟，弹出一只白熊 ————————
export const Stopwatch: React.FC<{t: number}> = ({t}) => {
	if (t < T.quote2 || t >= T.later) return null;
	const cx = 540;
	const cy = 1110;
	const R = 270;
	const start = T.quote2 + E8; // 表盘画完，指针开始走
	const draw = lin(t, T.quote2, start);
	const turn = Math.max(0, t - start); // 每拍一圈（线性：播放头）
	const a = (deg: number) => ((deg - 90) * Math.PI) / 180;
	const tip = (deg: number, r: number): Pt => [cx + Math.cos(a(deg)) * r, cy + Math.sin(a(deg)) * r];
	// 每过一圈表盘震一下
	const kick = turn > 0 ? 1 + 0.035 * (1 - snap(t, start + Math.floor(turn) + E16, E16)) : 1;
	const bears = [0, 1, 2].map((i) => ({t0: start + i * BEAT, deg: [-60, 60, 120][i]}));
	const sweep = (turn % 1) * 360;
	return (
		<g>
			<g transform={`translate(${cx} ${cy}) scale(${kick}) translate(${-cx} ${-cy})`}>
				<circle cx={cx} cy={cy} r={R} fill="none" stroke={C.paper} strokeWidth={4} strokeDasharray={2 * Math.PI * R} strokeDashoffset={2 * Math.PI * R * (1 - draw)} transform={`rotate(-90 ${cx} ${cy})`} />
				{/* 按钮 */}
				<rect x={cx - 22} y={cy - R - 46 * draw} width={44} height={46 * draw} fill={C.paper} />
				<rect x={cx - 40} y={cy - R - 62 * draw} width={80} height={16 * draw} fill={C.paper} />
				{Array.from({length: 60}, (_, i) => {
					if (i / 60 >= draw) return null;
					const big = i % 5 === 0;
					const [x1, y1] = tip(i * 6, R - (big ? 36 : 18));
					const [x2, y2] = tip(i * 6, R - 8);
					return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={C.paper} strokeWidth={big ? 4 : 1.5} />;
				})}
				{/* 这一圈已经走过的扇形 */}
				{turn > 0 && sweep > 0.5 ? <path d={`M ${cx} ${cy} L ${tip(0, R - 52).join(' ')} A ${R - 52} ${R - 52} 0 ${sweep > 180 ? 1 : 0} 1 ${tip(sweep, R - 52).join(' ')} Z`} fill="#3553FF" /> : null}
				{turn > 0 ? <line x1={cx} y1={cy} x2={tip(sweep, R - 46)[0]} y2={tip(sweep, R - 46)[1]} stroke={C.paper} strokeWidth={6} strokeLinecap="round" /> : null}
				<circle cx={cx} cy={cy} r={12 * draw} fill={C.paper} />
				<text x={cx} y={cy + 118} textAnchor="middle" fontFamily={FAMILY} fontSize={34} fontWeight={700} fill={C.paper} style={{fontVariantNumeric: 'tabular-nums'}} opacity={draw >= 1 ? 1 : 0}>
					{`${String(Math.floor(turn)).padStart(2, '0')}:${String(Math.floor((turn % 1) * 60)).padStart(2, '0')}`}
				</text>
			</g>
			{bears.map((b, i) => {
				if (t < b.t0) return null;
				// 从表心弹出去，落在表盘外面，然后原地踏步
				const p = snap(t, b.t0 + E16, E16);
				const [bx, by] = tip(b.deg, lerp(0, R + 128, p));
				const len = lerp(40, 168, p);
				return (
					<g key={i}>
						<Bear x={bx} y={by + len * 0.27} len={len} step={stepsAt(t, b.t0 + E16, E8)} bg={C.signal} />
						<Reveal text={`第 ${i + 1} 分钟`} x={bx - 40} y={by + len * 0.27 + 36} size={20} weight={600} color={BLUE_LEAD} p={snap(t, b.t0 + E8, E16)} />
					</g>
				);
			})}
		</g>
	);
};
