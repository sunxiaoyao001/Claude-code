// 04 生活里（失眠、忘不掉的人、甜食）· 05 办法（找替身、别赶它走）· 尾声（它自己走了）
import {Figure, hipOnGround, hipOnSeat, mixPose, POSES} from '../../pd/film/Picto';
import {E16, E32, E8, T} from '../score';
import {C, fx, lerp, lin, SHEET, snap, steps} from '../sys';
import {Act, CX, CY, Floor, GROUND, Pop} from './Act';
import {BearModule, stepsAt} from './Bear';
import {Reveal} from './Type';

const IN = 0.375;
const H = 250;

// 白熊方块从下方裁切升起（它是"冒出来"的念头）
const Thought: React.FC<{t: number; t0: number; x: number; y: number; s: number; icon: 'bear' | 'clock' | 'person' | 'cake'}> = ({t, t0, x, y, s, icon}) => (
	<Pop x={x - 4} y={y - 4} w={s + 8} h={s + 8} p={snap(t, t0, E32)}>
		<BearModule x={x} y={y} s={s} t={t} icon={icon} />
	</Pop>
);

// ———— 失眠：床上的人每拍翻一次身；窗外一弯月亮；脑子里是一只钟 ————
export const Sleep: React.FC<{t: number}> = ({t}) => {
	// 翻来覆去：每拍在伸直和蜷起之间换一次
	const k = Math.floor(t - T.sleep);
	const curl = snap(t, T.sleep + k, E16);
	const pose = k % 2 ? mixPose(POSES.slump, POSES.stand, curl) : mixPose(POSES.stand, POSES.slump, curl);
	return (
		<Act t={t} tin={T.sleep + IN} tout={T.person}>
			<Floor />
			{/* 床 */}
			<rect x={290} y={1268} width={14} height={GROUND - 1268} fill={C.ink} />
			<rect x={760} y={1312} width={14} height={GROUND - 1312} fill={C.ink} />
			<rect x={304} y={1330} width={456} height={14} fill={C.ink} />
			<rect x={312} y={1300} width={84} height={26} fill={C.ink} />
			{/* 躺着的人（转 90°，头枕在枕头上） */}
			<g transform={`rotate(-90 ${500} ${1290})`}>
				<Figure x={500} y={1290} h={H} pose={pose} color={C.ink} />
			</g>
			<rect x={452} y={1282} width={300} height={44} fill={C.voice2} />
			{/* 窗和月亮 */}
			<rect x={700} y={828} width={170} height={170} fill="none" stroke={C.ink} strokeWidth={6} />
			<circle cx={792} cy={900} r={40} fill={C.ink} />
			<circle cx={810} cy={888} r={36} fill={C.paper} />
			<Thought t={t} t0={T.sleep + E8 + E16} x={300} y={880} s={170} icon="clock" />
		</Act>
	);
};

// ———— 忘不掉一个人：坐在长凳上的人，脑子里是另一个人 ————
export const Person: React.FC<{t: number}> = ({t}) => (
	<Act t={t} tin={T.person + IN} tout={T.cake}>
		<Floor />
		<rect x={250} y={1300} width={260} height={14} fill={C.ink} />
		<rect x={268} y={1314} width={12} height={GROUND - 1314} fill={C.ink} />
		<rect x={480} y={1314} width={12} height={GROUND - 1314} fill={C.ink} />
		<Figure x={380} y={hipOnSeat(1300, H)} h={H} pose="slump" color={C.ink} />
		<Thought t={t} t0={T.person + E8 + E16} x={500} y={850} s={190} icon="person" />
	</Act>
);

// ———— 别吃甜的：捂着嘴的人，脑子里是一块蛋糕 ————
export const Cake: React.FC<{t: number}> = ({t}) => (
	<Act t={t} tin={T.cake + IN} tout={T.notYou}>
		<Floor />
		<Figure x={360} y={hipOnGround(GROUND, H + 30)} h={H + 30} pose="silent" color={C.ink} />
		<Thought t={t} t0={T.cake + E8 + E16} x={500} y={850} s={190} icon="cake" />
	</Act>
);

// ———— 这是大脑的设计：一个侧脸的轮廓（沿长度画出来），白熊在里面 ————
const HEAD =
	'M 330 1420 L 330 1290 C 260 1250 236 1150 250 1060 C 270 920 380 840 510 840 C 650 840 740 930 748 1040 ' +
	'C 752 1080 760 1100 790 1150 C 800 1166 790 1178 768 1180 L 760 1182 C 766 1210 760 1226 744 1230 ' +
	'C 752 1250 748 1270 726 1276 C 700 1282 680 1290 676 1330 L 676 1420';
export const Head: React.FC<{t: number}> = ({t}) => {
	const per = 2400;
	const draw = lin(t, T.notYou + IN, T.notYou + IN + 1);
	return (
		<Act t={t} tin={T.notYou + IN} tout={T.how}>
			<path d={HEAD} fill="none" stroke={C.ink} strokeWidth={6} strokeLinejoin="round" strokeDasharray={per} strokeDashoffset={per * (1 - draw)} />
			<Thought t={t} t0={T.notYou + 1.5} x={410} y={960} s={180} icon="bear" />
			<Reveal text="一直开着的监控" x={392} y={1196} size={22} weight={600} color={C.mute} p={snap(t, T.notYou + 1.5 + E16, E16)} />
		</Act>
	);
};

// ———— 办法一：给白熊找个替身（一辆小汽车，墨色）————
const Car: React.FC<{x: number; y: number}> = ({x, y}) => (
	<g fill={C.ink}>
		<rect x={x} y={y - 72} width={240} height={46} />
		<path d={`M ${x + 46} ${y - 72} L ${x + 76} ${y - 116} L ${x + 168} ${y - 116} L ${x + 200} ${y - 72} Z`} />
		<rect x={x + 88} y={y - 106} width={34} height={26} fill={C.paper} />
		<rect x={x + 130} y={y - 106} width={36} height={26} fill={C.paper} />
		<circle cx={x + 58} cy={y - 24} r={24} />
		<circle cx={x + 182} cy={y - 24} r={24} />
		<circle cx={x + 58} cy={y - 24} r={9} fill={C.paper} />
		<circle cx={x + 182} cy={y - 24} r={9} fill={C.paper} />
	</g>
);

export const Method1: React.FC<{t: number}> = ({t}) => {
	// 汽车三步开到中间（每步一个八分音符）；白熊缩小，退到角落
	const drive = steps(t, T.car + E8 - E8, T.car + E8 + 2 * E8, 3);
	const carX = lerp(640, 400, drive);
	const shrink = snap(t, T.car + 2, E8);
	const bs = lerp(190, 84, shrink);
	const bx = lerp(470, 820, shrink);
	const by = lerp(880, 800, shrink);
	return (
		<Act t={t} tin={T.how + IN} tout={T.smaller}>
			<Floor />
			<Figure x={230} y={hipOnGround(GROUND, H)} h={H} pose={t < T.method1 ? 'think' : 'stand'} color={C.ink} />
			<BearModule x={bx} y={by} s={bs} t={t} />
			{t >= T.method1 ? (
				<Pop x={360} y={1260} w={560} h={150} p={snap(t, T.method1 + E8 + E16, E16)}>
					<Car x={carX} y={GROUND} />
				</Pop>
			) : null}
		</Act>
	);
};

// 反弹变小（示意）：硬压 vs 找替身
const N_HARD = 16;
const N_SUB = 11;
export const Smaller: React.FC<{t: number}> = ({t}) => {
	const s = 36;
	const g = 6;
	const rows = [
		{y: 960, n: N_HARD, label: '硬压之后：'},
		{y: 1170, n: N_SUB, label: '找了替身之后：'},
	];
	return (
		<Act t={t} tin={T.smaller + IN} tout={T.method2}>
			{rows.map((row, i) => (
				<g key={i}>
					<Reveal text={row.label} x={168} y={row.y - 22} size={26} weight={700} color={C.ink} p={snap(t, T.smaller + IN + i * E16, E16)} />
					{Array.from({length: row.n}, (_, k) => (t >= T.smaller + IN + E16 + k * E32 ? <BearModule key={k} x={168 + k * (s + g)} y={row.y} s={s} t={t} /> : null))}
				</g>
			))}
			<Reveal text="■ = 想起一次白熊（示意）" x={168} y={1420} size={20} weight={500} color={C.mute} p={snap(t, T.smaller + 1, E16)} />
		</Act>
	);
};

// ———— 办法二：别赶它走。推开 → 它又回来 → 不推了，它落回网格，趴下 ————
export const Method2: React.FC<{t: number}> = ({t}) => {
	const t0 = T.method2;
	// 推：例外的运动（线性、不吸附）
	const away = lin(t, t0 + IN + 0.25, t0 + IN + 0.75);
	const back = lin(t, t0 + 1.25, t0 + 1.75);
	const loose = 470 + 200 * away - 170 * back;
	const settle = snap(t, t0 + 2, E16);
	const gx = fx(2) + 24;
	const x = lerp(loose, gx, settle);
	const pushing = t < t0 + 1.75;
	const pose = pushing ? POSES.push : mixPose(POSES.stand, POSES.sitFloor, snap(t, T.stay + E8, E16));
	const sitY = lerp(hipOnGround(GROUND, H), GROUND - 0.04 * H, snap(t, T.stay + E8, E16));
	const rest = snap(t, T.stay + E8, E8);
	return (
		<Act t={t} tin={t0 + IN} tout={T.now}>
			<Floor />
			<Figure x={240} y={sitY} h={H} pose={pose} color={C.ink} />
			<BearModule x={x} y={GROUND - 190 - 8} s={190} t={t} rest={rest} />
			{settle > 0 && t < T.stay ? (
				<Reveal text="on grid" x={gx} y={GROUND - 190 - 24} size={20} weight={600} color={C.signal} p={settle} q={snap(t, T.stay, E16)} />
			) : null}
		</Act>
	);
};

// ———— 尾声：它趴着；站起来；一步一步走出画面（线性离开，网格在它身后合上）————
export const Ending: React.FC<{t: number}> = ({t}) => {
	const s = 300;
	const y = CY - s / 2 - 20;
	const rest = 1 - snap(t, T.leave + E8, E8);
	const out = lin(t, T.leave + 1, T.golden);
	const x = lerp(CX - s / 2, SHEET.x1 + 200, out);
	const step = t >= T.leave + 1 ? stepsAt(t, T.leave + 1, E8) : 0;
	const grid = lin(t, T.golden, T.golden + 1);
	return (
		<g>
			<Act t={t} tin={T.now + IN} tout={999} outside={null}>
				{/* 空网格：它走后，6 栏在纸上画出来 */}
				{Array.from({length: 7}, (_, i) => {
					const gx = SHEET.x0 + 24 + i * ((SHEET.x1 - SHEET.x0 - 48) / 6);
					return <rect key={i} x={gx} y={SHEET.y0 + 24} width={1} height={(SHEET.y1 - SHEET.y0 - 48) * lin(grid, i / 9, i / 9 + 0.4)} fill={C.gridPaper} />;
				})}
			</Act>
			{t >= T.now + IN - E16 && out < 1 ? (
				<Pop x={SHEET.x0} y={y - 4} w={1080 - SHEET.x0} h={s + 8} p={snap(t, T.now + IN, E16)}>
					<BearModule x={x} y={y} s={s} t={t} rest={rest} step={step} />
				</Pop>
			) : null}
			{/* 参考 */}
			<rect x={fx(0)} y={1300} width={(SHEET.x1 - 24 - fx(0)) * lin(t, T.golden + E8, T.golden + 1)} height={1} fill={C.ink} />
			{[
				'参考：陀思妥耶夫斯基《冬天记的夏天印象》，1863',
				'Wegner, Schneider, Carter & White, JPSP, 1987',
				'Wegner, Psychological Review, 1994 · American Psychologist, 2011',
				'后续研究：这个效应确实存在，但强度因人、因情境而异。图中数据为示意。',
			].map((line, i) => (
				<Reveal key={i} text={line} x={fx(0) + 24} y={1340 + i * 30} size={19} weight={500} color={i === 3 ? C.mute : C.ink} p={snap(t, T.golden + 1 + i * E16, E16)} />
			))}
		</g>
	);
};
