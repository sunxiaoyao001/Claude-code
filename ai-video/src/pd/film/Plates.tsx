// 上半页的小插图：每一句话旁边一幅象形图，像展签上的示意图。
import {BEAT, E8, PLATES, type Plate} from '../score';
import {C, FAMILY, collapse, knifeLine, lerp, lin, snap} from '../sys';
import {walkPose} from './Matrix';
import {Bars, Door, Figure, hipOnGround, hipOnSeat, Loop, mixPose, Monitor, Podium, type Pose, POSES, Rise} from './Picto';
import {Reveal} from './Type';

const SPOT = {
	rule: {x0: 516, x1: 936, g: 632, h: 168},
	wall: {x0: 640, x1: 936, g: 476, h: 150},
};

type Ctx = {t: number; x0: number; x1: number; g: number; h: number; pl: Plate};

const at = (pl: Plate, name: string) => pl.poses?.find((p) => p.name === name)?.t ?? 999;

// 关在铁栏后面的人，旁边一个大大的刑期；铁栏一根一根落下（每根一个三十二分）
export const JAIL_BARS = 6;
const jail = ({t, x1, g, h, pl}: Ctx, color: string) => (
	<>
		<Figure x={x1 - 96} y={hipOnSeat(g, h * 0.85)} h={h * 0.85} dir={-1} pose="slump" color={color} />
		<Bars x={x1 - 186} y={g - h - 10} w={166} h={h + 10} n={JAIL_BARS} sw={6} color={color} grow={lin(t, pl.tin + E8, pl.tin + E8 + (JAIL_BARS * E8) / 4)} />
		<text x={x1 - 214} y={g - 14} textAnchor="end" fontFamily={FAMILY} fontSize={60} fontWeight={800} fill={color} style={{letterSpacing: '-1px'}}>
			10 年
		</text>
	</>
);

const SCENES: Record<string, (c: Ctx) => React.ReactNode> = {
	// 序幕：揭发他，你走——他坐 10 年
	jailB: (c) => jail(c, C.b),
	// 反过来：他揭发你，你坐 10 年
	jailA: (c) => jail(c, C.ink),
	// 你会怎么选：两个选项，一个框在它们之间来回跳（和下面两个人换姿势同一拍）
	choice: ({t, x0, x1, g, h, pl}) => {
		const w = (x1 - x0 - 24) / 2;
		const cells = [x0, x0 + w + 24];
		const fh = h * 0.84;
		let bx = cells[0];
		let sel = -1;
		for (const ps of pl.poses ?? []) {
			const k = ps.name === 'silent' ? 0 : 1;
			const p = snap(t, ps.t, E8);
			bx = lerp(bx, cells[k], p);
			if (p >= 1) sel = k;
		}
		const first = pl.poses?.[0]?.t ?? 0;
		const draw = lin(t, first - E8, first);
		const top = g - h - 36;
		const bh = h + 32;
		const per = 2 * (w + bh);
		return (
			<>
				{(['沉默', '揭发'] as const).map((label, k) => (
					<g key={label}>
						<text x={cells[k] + 16} y={top + 38} fontFamily={FAMILY} fontSize={28} fontWeight={800} fill={sel === k || sel < 0 ? C.ink : C.mute}>
							{label}
						</text>
						<Figure x={cells[k] + w / 2 + 20} y={hipOnGround(g, fh)} h={fh} pose={k ? 'point' : 'silent'} color={sel === k || sel < 0 ? C.ink : C.mute} />
					</g>
				))}
				{draw > 0 ? (
					<rect x={bx + 1.5} y={top + 1.5} width={w - 3} height={bh - 3} fill="none" stroke={C.ink} strokeWidth={3} strokeDasharray={per} strokeDashoffset={per * (1 - draw)} />
				) : null}
			</>
		);
	},
	// 博弈不止一次：两人面对面，头顶一个循环箭头
	again: ({t, x0, x1, g, h, pl}) => {
		const cx = (x0 + x1) / 2;
		const fh = h * 0.8;
		return (
			<>
				<Figure x={cx - 92} y={hipOnGround(g, fh)} h={fh} pose="stand" color={C.ink} />
				<Figure x={cx + 92} y={hipOnGround(g, fh)} h={fh} dir={-1} pose="stand" color={C.b} />
				<Loop x={cx} y={g - fh * 0.62} r={34} p={lin(t, pl.tin + E8, pl.tin + E8 + BEAT)} color={C.ink} sw={6} />
			</>
		);
	},
	// 冠军：一报还一报站上领奖台
	podium: ({x0, x1, g, h}) => {
		const w = 78;
		const px = (x0 + x1) / 2 - 1.5 * w;
		const hs: [number, number, number] = [62, 42, 26];
		const fh = h * 0.7;
		return (
			<>
				<Podium x={px} ground={g} w={w} hs={hs} color={C.ink} second={C.voice2} paper={C.paper} />
				<Figure x={px + 1.5 * w} y={hipOnGround(g - hs[0], fh)} h={fh} pose="cheer" color={C.ink} />
				<Figure x={px + 0.5 * w} y={hipOnGround(g - hs[1], fh)} h={fh} pose="stand" color={C.b} />
				<Figure x={px + 2.5 * w} y={hipOnGround(g - hs[2], fh)} h={fh} pose="stand" color={C.b} />
			</>
		);
	},
	// 人生是一场重复博弈：两个人并肩往前走，脚下的刻度一拍一拍往后退
	together: ({t, x0, x1, g, h}) => {
		const fh = h * 0.85;
		const k = Math.floor(t / BEAT);
		const shift = (k + snap(t, (k + 1) * BEAT, E8)) * 36;
		const ticks = [];
		for (let x = x0 + 36 - (shift % 36); x < x1; x += 36) ticks.push(<rect key={x} x={x} y={g - 10} width={2} height={10} fill={C.ink} />);
		return (
			<>
				{ticks}
				<Figure x={x0 + 196} y={hipOnGround(g, fh)} h={fh} pose={walkPose(t)} color={C.ink} />
				<Figure x={x0 + 264} y={hipOnGround(g, fh)} h={fh} pose={walkPose(t + BEAT)} color={C.b} />
			</>
		);
	},
	// 两人互相指着对方
	mutual: ({x0, x1, g, h}) => (
		<>
			<Figure x={x0 + 90} y={hipOnGround(g, h)} h={h} pose="point" color={C.ink} />
			<Figure x={x1 - 90} y={hipOnGround(g, h)} h={h} dir={-1} pose="point" color={C.b} />
		</>
	),
	// 1 格 = 1 年：一个人坐在一格上
	unit: ({t, x0, g, h, pl}) => (
		<>
			<rect x={x0 + 120} y={g - 24} width={64} height={24} fill={C.ink} />
			<Figure x={x0 + 170} y={hipOnSeat(g - 24, h * 0.8)} h={h * 0.8} pose="slump" color={C.ink} />
			<Reveal text="= 1 年" x={x0 + 230} y={g - 4} size={30} weight={700} color={C.ink} p={snap(t, pl.tin + E8, E8)} />
		</>
	),
	// 两人都捂着嘴
	bothSilent: ({x0, x1, g, h}) => (
		<>
			<Figure x={x0 + 120} y={hipOnGround(g, h)} h={h} pose="silent" color={C.ink} />
			<Figure x={x1 - 120} y={hipOnGround(g, h)} h={h} dir={-1} pose="silent" color={C.b} />
		</>
	),
	// 你揭发，他沉默：你走出门，他坐在铁栏后
	aWalks: ({t, x0, x1, g, h}) => (
		<>
			<Figure x={x0 + 86} y={hipOnSeat(g, h * 0.85)} h={h * 0.85} pose="slump" color={C.b} />
			<Bars x={x0 + 20} y={g - h - 10} w={150} h={h + 10} n={5} sw={6} color={C.b} />
			<Figure x={x0 + 260} y={hipOnGround(g, h)} h={h} pose={walkPose(t)} color={C.ink} />
			<Door x={x1 - 96} ground={g} w={80} h={h + 20} color={C.ink} />
		</>
	),
	// 反过来
	bWalks: ({t, x0, x1, g, h}) => (
		<>
			<Door x={x0 + 10} ground={g} w={80} h={h + 20} color={C.b} />
			<Figure x={x0 + 190} y={hipOnGround(g, h)} h={h} dir={-1} pose={walkPose(t)} color={C.b} />
			<Figure x={x1 - 70} y={hipOnSeat(g, h * 0.85)} h={h * 0.85} dir={-1} pose="slump" color={C.ink} />
			<Bars x={x1 - 170} y={g - h - 10} w={150} h={h + 10} n={5} sw={6} color={C.ink} />
		</>
	),
	// A 揭发
	aPoints: ({x0, x1, g, h}) => (
		<>
			<Figure x={x0 + 110} y={hipOnGround(g, h)} h={h} pose="point" color={C.ink} />
			<Figure x={x1 - 110} y={hipOnGround(g, h)} h={h} dir={-1} pose="silent" color={C.b} />
		</>
	),
	// 被删掉的，是合作：握手
	handshake: ({x0, x1, g, h}) => {
		const cx = (x0 + x1) / 2;
		return (
			<>
				<Figure x={cx - 0.33 * h} y={hipOnGround(g, h)} h={h} pose="shake" color={C.ink} />
				<Figure x={cx + 0.33 * h} y={hipOnGround(g, h)} h={h} dir={-1} pose="shake" color={C.b} />
			</>
		);
	},
	// B 也揭发
	bPoints: ({x0, x1, g, h}) => (
		<>
			<Figure x={x0 + 110} y={hipOnGround(g, h)} h={h} pose="silent" color={C.ink} />
			<Figure x={x1 - 110} y={hipOnGround(g, h)} h={h} dir={-1} pose="point" color={C.b} />
		</>
	),
	// 走进了同一格
	cell: ({x0, x1, g, h}) => (
		<>
			<Figure x={x0 + 150} y={hipOnSeat(g, h * 0.85)} h={h * 0.85} pose="slump" color={C.ink} />
			<Figure x={x1 - 150} y={hipOnSeat(g, h * 0.85)} h={h * 0.85} dir={-1} pose="slump" color={C.b} />
			<Bars x={x0 + 60} y={g - h - 10} w={x1 - x0 - 120} h={h + 10} n={8} sw={6} color={C.ink} />
		</>
	),
	// 两台电脑对战
	monitors: ({x0, x1, g}) => (
		<>
			<Monitor x={x0 + 10} y={g - 104} w={116} color={C.ink} paper={C.page} />
			<Monitor x={x1 - 126} y={g - 104} w={116} color={C.b} paper={C.page} dir={-1} />
			<text x={(x0 + x1) / 2} y={g - 50} textAnchor="middle" fontFamily={FAMILY} fontSize={34} fontWeight={800} fill={C.ink}>
				vs
			</text>
		</>
	),
	// 一报还一报：先伸手
	tft: ({x0, x1, g, h}) => {
		const cx = (x0 + x1) / 2;
		return (
			<>
				<Figure x={cx - 0.33 * h} y={hipOnGround(g, h)} h={h} pose="shake" color={C.ink} />
				<Figure x={cx + 0.33 * h} y={hipOnGround(g, h)} h={h} dir={-1} pose="shake" color={C.b} />
			</>
		);
	},
	// 被背叛 → 还击 → 原谅（动作落在拍子上）
	betray: ({t, x0, x1, g, h, pl}) => {
		const cx = (x0 + x1) / 2;
		const s = snap(t, at(pl, 'strike'), E8);
		const f = snap(t, at(pl, 'forgive'), E8);
		const aPose: Pose = mixPose(mixPose(POSES.shake, POSES.point, s), POSES.shake, f);
		const bPose: Pose = mixPose(POSES.point, POSES.shake, f);
		const gap = lerp(0.62, 0.33, f) * h;
		return (
			<>
				<Figure x={cx - gap} y={hipOnGround(g, h)} h={h} pose={aPose} color={C.ink} />
				<Figure x={cx + gap} y={hipOnGround(g, h)} h={h} dir={-1} pose={bPose} color={C.b} />
			</>
		);
	},
	// 一次性的交易：转身就走
	walkAway: ({t, x0, x1, g, h}) => (
		<>
			<Figure x={x0 + 70} y={hipOnSeat(g, h * 0.85)} h={h * 0.85} pose="slump" color={C.b} />
			<Figure x={x1 - 90} y={hipOnGround(g, h)} h={h} pose={walkPose(t)} color={C.ink} />
		</>
	),
};

export const Plates: React.FC<{t: number}> = ({t}) => (
	<g>
		{PLATES.map((pl, i) => {
			if (t < pl.tin - E8 || t > pl.tout + E8) return null;
			const sp = SPOT[pl.spot];
			const p = snap(t, pl.tin, E8);
			const q = snap(t, pl.tout, E8);
			const ctx: Ctx = {t, x0: sp.x0, x1: sp.x1, g: sp.g, h: sp.h, pl};
			const box = {x: sp.x0 - 10, y: sp.g - sp.h - 40, w: sp.x1 - sp.x0 + 20, h: sp.h + 44};
			// 握手那幅被刀切掉
			const k = pl.knife ? collapse(t, pl.knife) : 1;
			const kl = pl.knife ? knifeLine(t, pl.knife) : 0;
			const mid = sp.g - sp.h / 2;
			if (pl.knife && t >= pl.knife + E8) return null;
			return (
				<g key={i}>
					<g transform={k < 1 ? `translate(0 ${mid}) scale(1 ${Math.max(0.0001, k)}) translate(0 ${-mid})` : undefined}>
						<Rise x={box.x} y={box.y} w={box.w} h={box.h} p={p} q={q}>
							{SCENES[pl.scene](ctx)}
						</Rise>
						<rect x={sp.x0} y={sp.g} width={(sp.x1 - sp.x0) * lin(t, pl.tin - E8, pl.tin) * (1 - q)} height={1} fill={C.ink} />
					</g>
					{kl > 0 ? <rect x={sp.x0} y={mid - 1} width={(sp.x1 - sp.x0) * kl} height={2} fill={C.ink} /> : null}
				</g>
			);
		})}
	</g>
);
