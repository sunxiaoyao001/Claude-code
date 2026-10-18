import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';
import {progress, rise, visible} from '../anim';
import {Caret} from '../components/Chat';
import {ProbBars} from '../components/ProbBars';
import {scene} from '../script';
import {C, F} from '../theme';
import {Sfx} from '../components/Sfx';

const S = scene('loop');

// 每一步：选中的 token + 两个落选候选（概率为示意）
const STEPS: [string, number, string, number, string, number][] = [
	['因为', 0.62, '这是', 0.18, '天空', 0.11],
	['阳光', 0.58, '太阳光', 0.24, '光', 0.09],
	['中的', 0.55, '里的', 0.31, '包含', 0.06],
	['蓝光', 0.71, '蓝色光', 0.15, '短波', 0.05],
	['波长', 0.83, '频率', 0.07, '能量', 0.04],
	['较短', 0.64, '更短', 0.22, '短', 0.08],
	['，', 0.77, '、', 0.12, '。', 0.05],
	['更容易', 0.52, '容易', 0.29, '最容易', 0.1],
	['被', 0.88, '在', 0.05, '让', 0.03],
	['空气', 0.61, '大气', 0.27, '空中', 0.06],
	['分子', 0.74, '中的', 0.14, '颗粒', 0.07],
	['散射', 0.9, '反射', 0.05, '弹开', 0.02],
	['到', 0.58, '向', 0.27, '往', 0.09],
	['四面八方', 0.66, '各个方向', 0.21, '周围', 0.08],
	['，', 0.81, '。', 0.11, '、', 0.04],
	['所以', 0.69, '因此', 0.19, '于是', 0.07],
	['我们', 0.47, '天空', 0.33, '抬头', 0.1],
	['抬头', 0.42, '看到', 0.36, '往上', 0.12],
	['看到', 0.71, '望去', 0.17, '看', 0.08],
	['的', 0.76, '，', 0.14, '时', 0.06],
	['天空', 0.85, '天', 0.08, '整个天空', 0.05],
	['是', 0.63, '呈现', 0.21, '就是', 0.1],
	['蓝色', 0.67, '蓝的', 0.22, '淡蓝', 0.07],
	['的', 0.79, '。', 0.15, '！', 0.03],
	['。', 0.93, '！', 0.04, '，', 0.02],
];

// 每个 token 被接到句尾的帧
const appendAt = (() => {
	const c = S.cues;
	const at = [c.append, c.loop];
	let t = c.loop;
	for (let i = 2; i < STEPS.length; i++) {
		t += Math.round(interpolate(i, [2, 10, STEPS.length], [12, 6, 5]));
		at.push(t);
	}
	return at;
})();

// 每一步候选柱开始出现的帧
const guessAt = (i: number) => {
	const c = S.cues;
	if (i === 0) return c.first;
	if (i === 1) return c.second;
	return appendAt[i - 1];
};

export const S3Loop: React.FC = () => {
	const frame = useCurrentFrame();
	const c = S.cues;

	const appended = appendAt.filter((f) => frame >= f).length;
	const current = Math.min(appended, STEPS.length - 1);
	const done = appended >= STEPS.length;
	const showPanel = frame >= c.first && !(done && frame > appendAt[STEPS.length - 1] + 10);
	const fast = current >= 2;
	const step = STEPS[current];
	const items = [
		{label: step[0], p: step[1]},
		{label: step[2], p: step[3]},
		{label: step[4], p: step[5]},
	];
	const gStart = guessAt(current);
	const counter = frame >= c.first ? Math.min(STEPS.length, appended + (done ? 0 : 1)) : 0;

	// "再看着这句更长的话"：把问题 + 已写出的字框起来
	const context = visible(frame, c.reread, c.second + 24, 10);

	return (
		<AbsoluteFill>
			<Sfx name="pop" at={c.q} />
			<Sfx name="tick" at={c.first + 30} />
			<Sfx name="tick" at={c.second + 30} />
			<Sfx name="pop" at={c.reread} volume={0.6} />
			{appendAt.map((f, i) => (
				<Sfx key={i} name="blip" at={f} volume={i < 2 ? 0.9 : 0.5} />
			))}
			<Sfx name="pop" at={c.notfx} />

			{/* 计数器 */}
			<div style={{position: 'absolute', top: 66, right: 88, fontFamily: F.mono, fontSize: 30, color: C.muted, opacity: progress(frame, c.first, 12)}}>
				第 <span style={{color: C.amber, fontSize: 44, fontWeight: 700}}>{String(counter).padStart(2, '0')}</span> 次猜
			</div>

			<div style={{position: 'absolute', left: 260, right: 260, top: 175}}>
				<div
					style={{
						position: 'absolute',
						left: -36,
						right: -36,
						top: -26,
						height: 268,
						borderRadius: 22,
						border: `2px dashed ${C.amber}`,
						background: 'rgba(255,178,63,0.05)',
						opacity: context,
					}}
				>
					<div style={{position: 'absolute', left: 24, top: -18, padding: '0 12px', background: C.bg, fontFamily: F.sans, fontSize: 26, color: C.amber, letterSpacing: 2}}>
						它看的是：问题 + 已经写出的字
					</div>
				</div>
				{/* 问题 */}
				<div style={{display: 'flex', justifyContent: 'flex-end', ...rise(frame, c.q, 16)}}>
					<div style={{fontFamily: F.sans, fontSize: 38, color: C.text, background: 'rgba(255,255,255,0.08)', padding: '16px 30px', borderRadius: '22px 22px 6px 22px'}}>
						天空为什么是蓝的？
					</div>
				</div>

				{/* 回答 */}
				<div
					style={{
						position: 'relative',
						marginTop: 46,
						minHeight: 180,
						fontFamily: F.sans,
						fontSize: 54,
						lineHeight: 1.65,
						fontWeight: 500,
						color: C.text,
						opacity: progress(frame, c.first, 12),
					}}
				>
					{STEPS.slice(0, appended).map((s, i) => {
						const p = progress(frame, appendAt[i], fast ? 6 : 14);
						const flash = interpolate(frame - appendAt[i], [0, fast ? 10 : 24], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
						return (
							<span
								key={i}
								style={{
									display: 'inline-block',
									transform: `translateY(${(1 - p) * 70}px)`,
									opacity: p,
									color: flash > 0.02 ? C.amber : C.text,
									textShadow: flash > 0.02 ? `0 0 ${24 * flash}px rgba(255,178,63,0.7)` : 'none',
								}}
							>
								{s[0]}
							</span>
						);
					})}
					<Caret height={56} />
					{/* 不是特效 */}
					<div
						style={{
							...rise(frame, c.notfx, 16),
							marginTop: 28,
							display: 'inline-flex',
							gap: 18,
							alignItems: 'center',
							fontFamily: F.sans,
							fontSize: 30,
							color: C.amber,
							border: `2px solid ${C.amber}`,
							borderRadius: 40,
							padding: '8px 26px',
						}}
					>
						<span style={{textDecoration: 'line-through', color: C.muted}}>打字特效</span>
						<span>每个字都是现猜的</span>
					</div>
				</div>
			</div>

			{/* 候选面板 */}
			<div
				style={{
					position: 'absolute',
					left: 0,
					right: 0,
					top: 600,
					display: 'flex',
					flexDirection: 'column',
					alignItems: 'center',
					opacity: showPanel ? progress(frame, c.first, 12) : 1 - progress(frame, appendAt[STEPS.length - 1] + 10, 14),
				}}
			>
				<div style={{fontFamily: F.mono, fontSize: 24, color: C.dim, letterSpacing: 3, marginBottom: 14}}>NEXT TOKEN · 下一个字的候选</div>
				<div key={current}>
					<ProbBars
						items={items}
						start={gStart + (fast ? 0 : 6)}
						highlight={fast ? gStart + 2 : gStart + 30}
						width={900}
						rowHeight={58}
						labelWidth={220}
						labelSize={36}
						stagger={fast ? 0 : 4}
						maxP={1}
						grow={fast ? 4 : 22}
					/>
				</div>
			</div>
		</AbsoluteFill>
	);
};
