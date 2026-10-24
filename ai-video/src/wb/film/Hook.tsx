// 钩子：10 秒挑战。纸上一个巨大的倒计时，白熊在画面各处冒出来（不吸附、落在反拍上），
// 时间到，它们排成一行——数一数。然后点题。
import {BEAT, E16, E32, E8, POPS, T} from '../score';
import {C, collapse, FAMILY, fx, knifeLine, lerp, lin, measure, SHEET, snap, steps} from '../sys';
import {Act, CX, CY} from './Act';
import {BearModule, stepsAt} from './Bear';
import {Reveal} from './Type';

const COUNT_SIZE = 560;
const ROW = {x: 96, y: 1348, s: 96, gap: 12};
const slot = (i: number) => ({x: ROW.x + i * (ROW.s + ROW.gap), y: ROW.y, s: ROW.s});

// 倒计时：每拍一个数字，从下面一格一格爬上来，旧的向上翻走
const Countdown: React.FC<{t: number}> = ({t}) => {
	const h = measure('0', COUNT_SIZE, 700).actualBoundingBoxAscent;
	const base = CY + h / 2;
	const out: React.ReactNode[] = [];
	for (let k = 0; k <= 10; k++) {
		const tk = T.count0 + k;
		const next = k < 10 ? tk + BEAT : T.reflow;
		if (t < tk - E16 || t > next) continue;
		const up = steps(t, tk - E16, tk, 2);
		const down = snap(t, next, E16);
		// 进出都要完全离开纸面：从纸的下沿以下爬上来，翻到纸的上沿以上
		const travel = Math.max(base - SHEET.y0, SHEET.y1 - (base - h)) + 30;
		const off = (1 - up) * travel - down * travel;
		out.push(
			<text
				key={k}
				x={CX}
				y={base + off}
				textAnchor="middle"
				fontFamily={FAMILY}
				fontSize={COUNT_SIZE}
				fontWeight={700}
				fill={C.ink}
				style={{letterSpacing: `${-0.02 * COUNT_SIZE}px`, fontVariantNumeric: 'tabular-nums'}}
			>
				{10 - k}
			</text>,
		);
	}
	return (
		<svg x={SHEET.x0} y={SHEET.y0} width={SHEET.x1 - SHEET.x0} height={SHEET.y1 - SHEET.y0} overflow="hidden">
			<g transform={`translate(${-SHEET.x0} ${-SHEET.y0})`}>{out}</g>
		</svg>
	);
};

// 底部 10 格进度：每秒一格，线性填满（播放头）
const Progress: React.FC<{t: number}> = ({t}) => {
	if (t > T.reflow) return null;
	const draw = lin(t, 0, E8);
	const w = (816 - 9 * 8) / 10;
	return (
		<g>
			{Array.from({length: 10}, (_, i) => {
				const x = 96 + i * (w + 8);
				const fill = lin(t, T.count0 + i, T.count0 + i + 1);
				return (
					<g key={i}>
						<rect x={x} y={1446} width={w * lin(draw, i / 10, (i + 1) / 10)} height={6} fill={C.gridPaper} />
						{fill > 0 ? <rect x={x} y={1446} width={w * fill} height={6} fill={C.ink} /> : null}
					</g>
				);
			})}
		</g>
	);
};

// 白熊们：冒出来的时候从方块底边裁切升起；时间到后，按出现顺序排进一行
export const Pops: React.FC<{t: number}> = ({t}) => {
	if (t >= T.title + E16) return null;
	const k = Math.max(1e-4, collapse(t, T.title));
	const mid = ROW.y + ROW.s / 2;
	const kl = knifeLine(t, T.title);
	return (
		<g>
			<g transform={k < 1 ? `translate(0 ${mid}) scale(1 ${k}) translate(0 ${-mid})` : undefined}>
				{POPS.map((p, i) => {
					if (t < p.t - E32) return null;
					const r = snap(t, T.reflow + i * E32 + E8, E8);
					const sl = slot(i);
					const x = lerp(p.x, sl.x, r);
					const y = lerp(p.y, sl.y, r);
					const s = lerp(p.s, sl.s, r);
					const show = snap(t, p.t, E32);
					return (
						<svg key={i} x={x} y={y} width={s} height={s} overflow="hidden">
							<g transform={`translate(0 ${(1 - show) * s})`}>
								<BearModule x={0} y={0} s={s} t={t} snow={p.snow && r < 1} step={p.snow ? stepsAt(t, p.t, E8) : 0} />
							</g>
						</svg>
					);
				})}
				{/* 数一数 */}
				<Reveal text="× 7" x={slot(7).x + 6} y={ROW.y + 66} size={46} weight={800} color={C.ink} p={snap(t, T.reflow + 1.25, E16)} />
			</g>
			{kl > 0 ? <rect x={SHEET.x0} y={mid - 1} width={(SHEET.x1 - SHEET.x0) * kl} height={2} fill={C.ink} /> : null}
		</g>
	);
};

export const HookScene: React.FC<{t: number}> = ({t}) => {
	if (t >= T.reflow + E16) return null;
	return (
		<g>
			<Countdown t={t} />
			<Progress t={t} />
		</g>
	);
};

// ———————— 片名 ————————
export const TitleCard: React.FC<{t: number}> = ({t}) => {
	if (t < T.title - E16 || t > T.y1863) return null;
	const q = snap(t, T.y1863, E16);
	const p = (dt: number) => snap(t, T.title + dt, E16);
	return (
		<g>
			<Reveal text="这个现象，叫——" x={fx(0)} y={300} size={34} weight={500} color={C.mute} p={p(E16)} q={q} />
			<Reveal text="白熊效应" x={fx(0)} y={520} size={196} weight={800} color={C.ink} p={p(2 * E16)} q={q} optical />
			<Reveal text="White Bear Effect" x={fx(0)} y={584} size={30} weight={600} color={C.ink} p={p(BEAT)} q={q} />
			<Reveal text="越不让想，越会想起。" x={fx(0)} y={662} size={52} weight={800} color={C.ink} p={p(BEAT + E16)} q={q} optical />
		</g>
	);
};

export const TitleBear: React.FC<{t: number}> = ({t}) => {
	const s = 336;
	return (
		<Act t={t} tin={T.title + E8} tout={T.y1863}>
			<BearModule x={CX - s / 2} y={CY - s / 2} s={s} t={t} step={stepsAt(t, T.title + E8, BEAT)} />
		</Act>
	);
};
