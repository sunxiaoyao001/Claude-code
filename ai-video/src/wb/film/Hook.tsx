// 钩子（0–18 秒）：10 秒挑战。巨大的倒计时每拍被刀片切成 8 条、左右错开滑走，新的数字从两边插回来；
// 白熊越冒越多（94 只），时间到全部定住，然后按离中心的远近一圈圈飞回去，拼成一只由小白熊组成的大白熊——片名。
import {BEAT, E16, E32, E8, MOSAIC, MOSAIC_CELLS, POPS, T} from '../score';
import {C, FAMILY, fx, lerp, lin, measure, snap} from '../sys';
import {BearModule, stepsAt} from './Bear';
import {CropMarks, rippleK, Slit, STAGE} from './Kit';
import {Reveal} from './Type';

const SIZE = 760;
const STRIPS = 8;
const MAXD = Math.max(...MOSAIC_CELLS.map((c) => c.d));

// ———— 倒计时：刀片切条的换字 ————
const Countdown: React.FC<{t: number}> = ({t}) => {
	if (t > T.reflow + E8) return null;
	const h = measure('0', SIZE, 800).actualBoundingBoxAscent;
	const base = STAGE.cy + h / 2;
	const top = base - h - 6;
	const sh = (h + 12) / STRIPS;
	const out: React.ReactNode[] = [];
	for (let k = 0; k <= 10; k++) {
		// 第一个数字从第 0 帧就切进来
		const tk = k === 0 ? 0.5 : T.count0 + k;
		const next = k < 10 ? T.count0 + k + BEAT : T.reflow;
		if (t < tk - E8 - 0.5 || t > next + E8) continue;
		for (let i = 0; i < STRIPS; i++) {
			const lag = (STRIPS - 1 - i) * E32 * 0.5;
			const pin = snap(t, tk - lag, E16);
			const pout = snap(t, next - lag + E16, E16);
			if (pin <= 0 || pout >= 1) continue;
			const side = i % 2 ? 1 : -1;
			const dx = (1 - pin) * side * 1100 - pout * side * 1100;
			// 条与条之间多叠 1 px，免得出现发丝缝
			const y = Math.round(top + i * sh);
			const y2 = Math.round(top + (i + 1) * sh);
			out.push(
				<svg key={`${k}-${i}`} x={0} y={y} width={1080} height={y2 - y + 1} overflow="hidden">
					<text
						x={540 + dx}
						y={base - y}
						textAnchor="middle"
						fontFamily={FAMILY}
						fontSize={SIZE}
						fontWeight={800}
						fill={C.ink}
						style={{letterSpacing: `${-0.03 * SIZE}px`, fontVariantNumeric: 'tabular-nums'}}
					>
						{10 - k}
					</text>
				</svg>,
			);
		}
	}
	return <g>{out}</g>;
};

// ———— 进度：10 格，每秒一格，线性填满（播放头）————
const Progress: React.FC<{t: number}> = ({t}) => {
	if (t > T.reflow + E16) return null;
	const q = snap(t, T.reflow + E16, E16);
	const w = (936 - 144 - 9 * 8) / 10;
	return (
		<g>
			{Array.from({length: 10}, (_, i) => {
				const x = 144 + i * (w + 8);
				const draw = lin(t, i * 0.05, i * 0.05 + E16);
				const fill = lin(t, T.count0 + i, T.count0 + i + 1);
				return (
					<g key={i}>
						<rect x={x} y={1496} width={w * draw * (1 - q)} height={4} fill={C.gridPage} />
						{fill > 0 ? <rect x={x} y={1496} width={w * fill * (1 - q)} height={4} fill={C.ink} /> : null}
					</g>
				);
			})}
			<text x={96} y={1503} fontFamily={FAMILY} fontSize={18} fontWeight={700} fill={C.ink} style={{fontVariantNumeric: 'tabular-nums'}} opacity={q < 1 ? 1 : 0}>
				{`00:${String(Math.max(0, Math.min(10, Math.floor(t - T.count0 + 1e-6)))).padStart(2, '0')}`}
			</text>
		</g>
	);
};

// ———— 白熊：冒出来（开缝）→ 时间到定住 → 飞回马赛克，继续走 ————
const walkClock = (t: number) => (t < T.countEnd ? t : t < T.reflow + 1.25 ? T.countEnd : t - (T.reflow + 1.25 - T.countEnd));
export const Pops: React.FC<{t: number}> = ({t}) => {
	if (t >= T.y1863 + E16) return null;
	const tw = walkClock(t);
	return (
		<g>
			{POPS.map((p, i) => {
				if (t < p.t - E32) return null;
				const cell = MOSAIC_CELLS[p.cell];
				const delay = (cell.d / MAXD) * 0.75;
				const r = snap(t, T.reflow + E8 + delay, E8);
				const s = lerp(p.s, MOSAIC.cell - 4, r);
				const x = lerp(p.x, cell.x + 2, r);
				const y = lerp(p.y, cell.y + 2, r);
				// 片名结束：从外圈往里一块块塌掉
				const k = t > T.y1863 - 1 ? rippleK(t, T.y1863 - 0.75, MAXD - cell.d, MAXD, 0.5) : 1;
				const mid = y + s / 2;
				return (
					<g key={i} transform={k < 1 ? `translate(0 ${mid}) scale(1 ${k}) translate(0 ${-mid})` : undefined}>
						<Slit x={x} y={y} w={s} h={s} t={t} t0={p.t}>
							<BearModule x={x} y={y} s={s} t={t} step={stepsAt(tw, p.t, E8)} />
						</Slit>
					</g>
				);
			})}
		</g>
	);
};

// 拼好之后：一条细线 + 读数
const Tally: React.FC<{t: number}> = ({t}) => {
	const t0 = T.reflow + 1.25;
	if (t < t0 || t > T.y1863) return null;
	const q = snap(t, T.y1863 - 0.75, E16);
	return (
		<g>
			<rect x={96} y={1462} width={888 * lin(t, t0, t0 + E8) * (1 - q)} height={1} fill={C.ink} />
			<Reveal text="你刚才想起的每一次" x={96} y={1500} size={20} weight={600} color={C.mute} p={snap(t, t0 + E16, E16)} q={q} />
			<Reveal text={`× ${POPS.length}`} x={984} y={1512} size={52} weight={800} color={C.ink} p={snap(t, t0 + E8, E16)} q={q} anchor="end" />
		</g>
	);
};

export const HookScene: React.FC<{t: number}> = ({t}) => {
	if (t >= T.y1863) return null;
	return (
		<g>
			<CropMarks t={t} tin={E8} tout={T.y1863 - E8} label="FIG. 0 — 10 秒挑战" theme={{bg: C.page, ink: C.ink, lead: C.mute, rule: C.ink, faint: C.gridPage}} />
			<Countdown t={t} />
			<Progress t={t} />
			<Tally t={t} />
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
			<Reveal text="越不让想，越会想起。" x={fx(0)} y={640 - 4} size={40} weight={800} color={C.ink} p={p(BEAT + E16)} q={q} optical />
		</g>
	);
};
