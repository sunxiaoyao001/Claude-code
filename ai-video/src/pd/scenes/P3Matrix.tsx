import {AbsoluteFill, random, useCurrentFrame} from 'remotion';
import {easeInOut, progress, rise, visible} from '../../anim';
import {Sfx} from '../../components/Sfx';
import {cellRect, type CellState, CELL_H, JailBars, Matrix, MX, MY, LABEL_W, HEAD_H} from '../components/Matrix';
import {SlamText} from '../components/SlamText';
import {CUES, fr} from '../timeline';
import {P, PF} from '../theme';

const K = Object.fromEntries(Object.entries(CUES.matrix).map(([k, v]) => [k, fr(v)])) as Record<keyof typeof CUES.matrix, number>;

// 上方标题区：在 [a, b) 帧内显示
const Top: React.FC<{a: number; b: number; children: React.ReactNode}> = ({a, b, children}) => {
	const frame = useCurrentFrame();
	return (
		<div style={{position: 'absolute', left: 0, right: 0, top: 270, textAlign: 'center', opacity: visible(frame, a, b, 10), transform: `translateY(${(1 - progress(frame, a, 12)) * 24}px)`}}>
			{children}
		</div>
	);
};

// 下方结论区
const Bottom: React.FC<{a: number; b: number; children: React.ReactNode}> = ({a, b, children}) => {
	const frame = useCurrentFrame();
	return (
		<div style={{position: 'absolute', left: 0, right: 0, top: 1262, textAlign: 'center', opacity: visible(frame, a, b, 10), transform: `translateY(${(1 - progress(frame, a, 12)) * 24}px)`}}>
			{children}
		</div>
	);
};

const big = (color: string, size = 72): React.CSSProperties => ({fontFamily: PF.serif, fontWeight: 900, fontSize: size, color, letterSpacing: 3});
const mid = (color: string): React.CSSProperties => ({fontFamily: PF.sans, fontWeight: 700, fontSize: 54, color, letterSpacing: 2});

export const P3Matrix: React.FC = () => {
	const frame = useCurrentFrame();

	const appear = [
		[progress(frame, K.c1, 14), progress(frame, K.c3, 14)],
		[progress(frame, K.c2, 14), progress(frame, K.c4, 14)],
	];

	// A 的算盘：先看 B 沉默那一列，再看 B 揭发那一列
	const case1 = visible(frame, K.case1, K.case2 + 4, 10);
	const case2 = visible(frame, K.case2, K.concl + 4, 10);
	const concl = visible(frame, K.concl, K.mirror + 6, 12);
	const mirror = visible(frame, K.mirror, K.slam + 4, 12);
	const cmp1 = progress(frame, K.cmp1, 12) * case1;
	const cmp2 = progress(frame, K.cmp2, 12) * case2;
	const slam = progress(frame, K.slam, 8);
	const bars = progress(frame, K.slam, 9, easeInOut);
	const glow = progress(frame, K.glow, 18) * (0.75 + 0.25 * Math.sin(frame / 6));

	const cells: CellState[][] = [0, 1].map((row) =>
		[0, 1].map((col) => {
			// 推演时把另一列压暗
			const s: CellState = {appear: appear[row][col], dim: col === 0 ? case2 : case1};
			const amber = row === 1 ? Math.max(col === 0 ? cmp1 : cmp2, concl) : 0;
			const cyan = col === 1 ? mirror : 0;
			if (amber > 0 || cyan > 0) {
				s.glow = Math.max(amber, cyan);
				s.glowColor = amber >= cyan ? P.a : P.b;
			}
			if (row === 1) {
				s.emphA = col === 0 ? cmp1 : cmp2;
				s.check = s.emphA;
			}
			if (col === 1) s.emphB = mirror;
			if (row === 1 && col === 1) {
				s.red = slam;
				if (slam > 0) {
					s.emphA = slam;
					s.emphB = slam;
					s.check = 0;
				}
			} else {
				s.dim = Math.max(s.dim ?? 0, slam * 0.85);
			}
			// 最后：对角那格"都沉默"亮起金光
			if (row === 0 && col === 0 && glow > 0) {
				s.dim = Math.max(0, (s.dim ?? 0) - glow);
				s.glow = glow;
				s.glowColor = P.gold;
				s.emphA = glow * 0.6;
				s.emphB = glow * 0.6;
			}
			return s;
		}),
	);

	// 汇聚箭头
	const conv = progress(frame, K.converge, 22, easeInOut);
	const target = cellRect(1, 1);
	const tx = target.x + target.w / 2;
	const ty = target.y + target.h / 2;
	const aFrom = {x: MX + LABEL_W - 16, y: cellRect(1, 0).y + CELL_H / 2};
	const bFrom = {x: tx, y: MY + HEAD_H - 14};
	const arrowsOn = visible(frame, K.converge, K.slam + 10, 6);

	// 盖章时震屏
	const shakeAmt = frame >= K.slam && frame < K.slam + 14 ? (1 - (frame - K.slam) / 14) * 20 : 0;
	const sx = (random(`mx${frame}`) - 0.5) * shakeAmt;
	const sy = (random(`my${frame}`) - 0.5) * shakeAmt;

	return (
		<AbsoluteFill>
			<AbsoluteFill style={{transform: `translate(${sx}px, ${sy}px)`}}>
				<Matrix
					cells={cells}
					labels={progress(frame, K.grid, 14)}
					rowHL={[0, Math.max(concl, progress(frame, K.converge, 10) * arrowsOn)]}
					colHL={[case1, Math.max(case2, mirror)]}
				/>
				<JailBars row={1} col={1} p={bars} />
				{/* 汇聚箭头 */}
				<svg width={1080} height={1920} style={{position: 'absolute', inset: 0, opacity: arrowsOn}}>
					<defs>
						<marker id="ah-a" markerWidth="10" markerHeight="10" refX="6" refY="5" orient="auto">
							<path d="M0,0 L10,5 L0,10 z" fill={P.a} />
						</marker>
						<marker id="ah-b" markerWidth="10" markerHeight="10" refX="6" refY="5" orient="auto">
							<path d="M0,0 L10,5 L0,10 z" fill={P.b} />
						</marker>
					</defs>
					<line x1={aFrom.x} y1={aFrom.y} x2={aFrom.x + (tx - 70 - aFrom.x) * conv} y2={aFrom.y} stroke={P.a} strokeWidth={8} strokeLinecap="round" markerEnd="url(#ah-a)" />
					<line x1={bFrom.x} y1={bFrom.y} x2={bFrom.x} y2={bFrom.y + (ty - 60 - bFrom.y) * conv} stroke={P.b} strokeWidth={8} strokeLinecap="round" markerEnd="url(#ah-b)" />
				</svg>
			</AbsoluteFill>

			{/* 上方：每一步在说什么 */}
			<Top a={K.title} b={K.head}>
				<div style={big(P.text, 84)}>警察开出的条件</div>
				<div style={{...rise(frame, K.grid + 6, 12), marginTop: 18, fontFamily: PF.sans, fontSize: 40, color: P.muted}}>
					格子里：<span style={{color: P.a}}>A 的刑期</span> ／ <span style={{color: P.b}}>B 的刑期</span>
				</div>
			</Top>
			<Top a={K.head} b={K.case1}>
				<div style={big(P.a, 84)}>站在 A 的角度想</div>
			</Top>
			<Top a={K.case1} b={K.case2}>
				<div style={big(P.text, 84)}>
					如果 <span style={{color: P.b}}>B 沉默</span>……
				</div>
			</Top>
			<Top a={K.case2} b={K.concl}>
				<div style={big(P.text, 84)}>
					如果 <span style={{color: P.b}}>B 揭发</span>……
				</div>
			</Top>
			<Top a={K.concl} b={K.mirror}>
				<div style={big(P.text, 84)}>不管 B 怎么选</div>
			</Top>
			<Top a={K.mirror} b={K.slam}>
				<div style={big(P.b, 84)}>B 也是这么想的</div>
			</Top>
			<Top a={K.slam} b={K.glow}>
				<div style={big(P.red, 84)}>两人都揭发</div>
			</Top>
			<Top a={K.glow} b={K.c1 + fr(40)}>
				<div style={big(P.gold, 84)}>明明都沉默……</div>
			</Top>

			{/* 下方：结论 */}
			<Bottom a={K.cmp1} b={K.case2}>
				<div style={mid(P.text)}>
					我揭发 → <span style={{color: P.a}}>直接释放</span>（不用坐 1 年）
				</div>
			</Bottom>
			<Bottom a={K.cmp2} b={K.concl}>
				<div style={mid(P.text)}>
					我揭发 → <span style={{color: P.a}}>5 年</span>（不用坐 10 年）
				</div>
			</Bottom>
			<Bottom a={K.concl} b={K.mirror}>
				<SlamText text="揭发都更划算" at={K.concl + 8} size={96} color={P.a} font={PF.serif} weight={900} glow="rgba(255,178,63,0.5)" glitch={false} from={1.4} />
			</Bottom>
			<Bottom a={K.slam} b={K.glow}>
				<SlamText text="各判 5 年" at={K.slam + 4} size={110} color={P.red} font={PF.serif} weight={900} glow="rgba(255,77,77,0.6)" />
			</Bottom>
			<Bottom a={K.glow2} b={K.c1 + fr(40)}>
				<div style={big(P.gold, 96)}>只要各判 1 年</div>
			</Bottom>

			<Sfx name="pop" at={K.title} />
			{[K.c1, K.c2, K.c3, K.c4].map((f, i) => (
				<Sfx key={i} name="lock" at={f} />
			))}
			<Sfx name="whoosh" at={K.head} volume={0.6} />
			<Sfx name="pop" at={K.case1} />
			<Sfx name="ding" at={K.cmp1} volume={0.8} />
			<Sfx name="pop" at={K.case2} />
			<Sfx name="ding" at={K.cmp2} volume={0.8} />
			<Sfx name="braam" at={K.concl + 8} volume={0.6} />
			<Sfx name="whoosh" at={K.mirror} volume={0.6} />
			<Sfx name="riser" at={K.slam - 90} volume={0.7} />
			<Sfx name="metal" at={K.slam} />
			<Sfx name="impact" at={K.slam} volume={0.8} />
			<Sfx name="chime" at={K.glow} volume={0.8} />
		</AbsoluteFill>
	);
};

