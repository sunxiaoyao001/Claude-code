/**
 * 真相两幕
 *  1:08 错在哪：数学 ✓ / “别人都和他一样理性” ✗ → 100 个人的层级分布（示意，平均 1.5 层）
 *       → 赢家只比大家多想一步 → 想少了被看穿、想多了脱离人群
 *  1:24 凯恩斯 1936：报纸选美（第 1 / 2 / 3 层的选择）→ 股市：“别人会买” → 泡沫破裂
 */
import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';
import {Corner, Faces} from '../components/Faces';
import {KineticText} from '../components/KineticText';
import {Check, Cross} from '../components/Props';
import {Kicker} from '../components/ui';
import {ease, envelope, prog} from '../lib/anim';
import {LEVEL_SHARE, TAU} from '../math/guess';
import {C, FONT} from '../theme';

/* ============================================================
 * 错在哪
 * ========================================================== */
const LEVEL_COLORS = ['#6f7d8c', C.blue, C.coop, C.gold, C.violet, C.ink];
const LEVEL_NAMES = ['第 0 层', '第 1 层', '第 2 层', '第 3 层', '第 4 层', '5 层+'];
/** 100 个格子按层级顺序排开 */
const CELLS: number[] = LEVEL_SHARE.flatMap((n, lvl) => Array.from({length: n}, () => lvl));

const Question: React.FC<{frame: number}> = ({frame}) => {
  const o = envelope(frame, 2044, 2210, 10, 8);
  if (o <= 0) return null;
  const q = prog(frame, 2048, 2062, ease.back);
  const cards = prog(frame, 2132, 2146, ease.out);
  return (
    <AbsoluteFill style={{opacity: o}}>
      <svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
        <g transform={`translate(540, 520) scale(${q})`}>
          <circle r={120} fill="rgba(244,238,227,0.1)" stroke={C.ink} strokeWidth={6} style={{filter: `drop-shadow(0 0 30px ${C.ink})`}} />
          <text y={62} textAnchor="middle" style={{fontFamily: FONT.num, fontWeight: 700, fontSize: 170}} fill={C.ink}>
            0
          </text>
          <text x={128} y={-60} style={{fontFamily: FONT.serif, fontWeight: 900, fontSize: 140}} fill={C.red} opacity={prog(frame, 2056, 2066)}>
            ?
          </text>
        </g>
      </svg>
      {frame < 2132 ? (
        <div style={{position: 'absolute', top: 720, left: 0, right: 0, display: 'flex', justifyContent: 'center'}}>
          <KineticText text="错在哪？" frame={frame - 2050} duration={82} size={130} font={FONT.serif} weight={900} mode="slam" stagger={2.4} />
        </div>
      ) : null}
      {cards > 0 ? (
        <div style={{position: 'absolute', left: 110, right: 110, top: 720, display: 'flex', flexDirection: 'column', gap: 24, opacity: cards}}>
          {[
            {ok: true, a: '数学', b: '一层层推到 0，没有错'},
            {ok: false, a: '假设', b: '别人都和他一样理性'},
          ].map((r, i) => {
            const p = prog(frame, 2134 + i * 18, 2148 + i * 18, ease.out);
            const col = r.ok ? C.coop : C.red;
            return (
              <div
                key={i}
                style={{
                  height: 120,
                  borderRadius: 24,
                  border: `3px solid ${col}`,
                  background: C.panel,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 20,
                  padding: '0 30px',
                  opacity: p,
                  transform: `translateX(${(1 - p) * (i ? 40 : -40)}px)`,
                  boxShadow: `0 0 ${30 * p}px ${col}44`,
                }}
              >
                {r.ok ? <Check color={col} size={60} p={p} /> : <Cross color={col} size={56} />}
                <span style={{fontFamily: FONT.sans, fontWeight: 900, fontSize: 44, color: col}}>{r.a}</span>
                <span style={{fontFamily: FONT.sans, fontWeight: 700, fontSize: 38, color: C.ink}}>{r.b}</span>
              </div>
            );
          })}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};

const Crowd: React.FC<{frame: number}> = ({frame}) => {
  const o = envelope(frame, 2208, 2372, 10, 8);
  if (o <= 0) return null;
  const win = prog(frame, 2290, 2304, ease.out);
  const SIZE = 38;
  const GAP = 6;
  const W = 10 * (SIZE + GAP) - GAP;
  return (
    <AbsoluteFill style={{opacity: o}}>
      <Kicker en="COGNITIVE HIERARCHY" zh="100 个人会想几层？" opacity={prog(frame, 2212, 2226)} y={268} color={C.hud} />
      <div style={{position: 'absolute', left: (1080 - W) / 2, top: 420, width: W, height: W}}>
        {CELLS.map((lvl, i) => {
          const p = prog(frame, 2216 + i * 0.35, 2224 + i * 0.35, ease.back);
          const hot = lvl === 2 || lvl === 3;
          const dim = win > 0 && !hot ? 0.55 * win : 0;
          return (
            <div
              key={i}
              style={{
                position: 'absolute',
                left: (i % 10) * (SIZE + GAP),
                top: Math.floor(i / 10) * (SIZE + GAP),
                width: SIZE,
                height: SIZE,
                borderRadius: SIZE / 2,
                background: LEVEL_COLORS[lvl],
                opacity: Math.min(1, p) * (1 - dim),
                transform: `scale(${Math.min(1, p) * (hot ? 1 + 0.12 * win : 1)})`,
                boxShadow: hot && win > 0 ? `0 0 ${18 * win}px ${LEVEL_COLORS[lvl]}` : 'none',
              }}
            />
          );
        })}
      </div>
      {/* 图例 */}
      <div style={{position: 'absolute', left: 90, right: 90, top: 884, display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '10px 26px', opacity: prog(frame, 2240, 2254)}}>
        {LEVEL_SHARE.map((n, lvl) => (
          <div key={lvl} style={{display: 'flex', alignItems: 'center', gap: 8, fontFamily: FONT.sans, fontWeight: 700, fontSize: 26, color: C.ink}}>
            <span style={{width: 20, height: 20, borderRadius: 10, background: LEVEL_COLORS[lvl], display: 'inline-block'}} />
            {LEVEL_NAMES[lvl]} <span style={{fontFamily: FONT.num, color: LEVEL_COLORS[lvl]}}>{n}%</span>
          </div>
        ))}
      </div>
      <div style={{position: 'absolute', left: 0, right: 0, top: 1000, textAlign: 'center', opacity: prog(frame, 2250, 2264)}}>
        <span style={{fontFamily: FONT.sans, fontWeight: 900, fontSize: 40, color: C.ink}}>
          平均只想 <span style={{fontFamily: FONT.num, fontSize: 60, color: C.gold}}>{TAU}</span> 层
        </span>
        <span style={{fontFamily: FONT.sans, fontWeight: 900, fontSize: 40, color: C.goldHot, marginLeft: 36, opacity: win}}>→ 赢家在第 2～3 层</span>
      </div>
      <div style={{position: 'absolute', left: 0, right: 0, top: 1100, textAlign: 'center', fontFamily: FONT.mono, fontWeight: 700, fontSize: 20, color: C.inkDim, opacity: prog(frame, 2250, 2264)}}>
        示意 · 泊松分布 τ = 1.5（CAMERER、HO & CHONG 2004）
      </div>
    </AbsoluteFill>
  );
};

/** 想少了 / 多想一步 / 想多了 */
const Zones: React.FC<{frame: number}> = ({frame}) => {
  const o = envelope(frame, 2368, 2524, 10, 8);
  if (o <= 0) return null;
  const X0 = 110;
  const W = 860;
  const lvlX = (l: number) => X0 + (l / 6) * W;
  const pointer = interpolate(frame, [2380, 2404, 2412, 2434, 2442, 2458], [0.5, 0.5, 5.5, 5.5, 2.5, 2.5], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: ease.inOut});
  const best = prog(frame, 2450, 2462, ease.back);
  const zones = [
    {a: 0, b: 2, color: C.red, top: '想少了', bottom: '被人看穿'},
    {a: 2, b: 3.5, color: C.gold, top: '多想一步', bottom: '赢'},
    {a: 3.5, b: 6, color: C.blue, top: '想多了', bottom: '脱离人群'},
  ];
  return (
    <AbsoluteFill style={{opacity: o}}>
      <Kicker en="ONE STEP AHEAD" zh="想几层才对？" opacity={prog(frame, 2372, 2386)} y={268} color={C.gold} />
      <svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
        {zones.map((z, i) => {
          const p = prog(frame, 2376 + i * 8, 2392 + i * 8, ease.out);
          const hot = i === 1 ? best : 0;
          return (
            <g key={i} opacity={p}>
              <rect x={lvlX(z.a) + 4} y={640} width={(lvlX(z.b) - lvlX(z.a) - 8) * p} height={70} rx={14} fill={z.color} opacity={0.25 + 0.5 * hot + (i === 1 ? 0.15 : 0)} />
              <rect x={lvlX(z.a) + 4} y={640} width={(lvlX(z.b) - lvlX(z.a) - 8) * p} height={70} rx={14} fill="none" stroke={z.color} strokeWidth={3 + 3 * hot} />
              <text x={(lvlX(z.a) + lvlX(z.b)) / 2} y={610} textAnchor="middle" style={{fontFamily: FONT.sans, fontWeight: 900, fontSize: 38}} fill={z.color}>
                {z.top}
              </text>
              <text x={(lvlX(z.a) + lvlX(z.b)) / 2} y={765} textAnchor="middle" style={{fontFamily: FONT.sans, fontWeight: 700, fontSize: 32}} fill={C.ink} opacity={0.85}>
                {z.bottom}
              </text>
            </g>
          );
        })}
        {[0, 1, 2, 3, 4, 5].map((l) => (
          <text key={l} x={lvlX(l + 0.5)} y={830} textAnchor="middle" style={{fontFamily: FONT.num, fontWeight: 500, fontSize: 26}} fill={C.inkDim} opacity={prog(frame, 2390, 2402)}>
            {l === 5 ? 'L5+' : `L${l}`}
          </text>
        ))}
        {/* 指针 */}
        <g transform={`translate(${lvlX(pointer)}, 560)`} opacity={prog(frame, 2380, 2392)}>
          <path d="M -18 -30 L 18 -30 L 0 0 Z" fill={C.ink} />
        </g>
        {/* 人群在这里 */}
        <g opacity={prog(frame, 2396, 2408)}>
          <rect x={lvlX(0.6)} y={880} width={lvlX(2.4) - lvlX(0.6)} height={10} rx={5} fill={C.blue} opacity={0.6} />
          <text x={(lvlX(0.6) + lvlX(2.4)) / 2} y={930} textAnchor="middle" style={{fontFamily: FONT.sans, fontWeight: 700, fontSize: 28}} fill={C.blueHot}>
            大多数人在这里
          </text>
        </g>
      </svg>
      {best > 0 ? (
        <div style={{position: 'absolute', left: 0, right: 0, top: 980, textAlign: 'center', transform: `scale(${best})`}}>
          <span style={{fontFamily: FONT.serif, fontWeight: 900, fontSize: 84, color: C.gold, textShadow: `0 0 40px ${C.gold}66`}}>比大家多想一步</span>
        </div>
      ) : null}
    </AbsoluteFill>
  );
};

export const WhyScene: React.FC = () => {
  const frame = useCurrentFrame();
  if (frame < 2040 || frame >= 2524) return null;
  return (
    <AbsoluteFill>
      <Question frame={frame} />
      <Crowd frame={frame} />
      <Zones frame={frame} />
    </AbsoluteFill>
  );
};

/* ============================================================
 * 凯恩斯的选美比赛
 * ========================================================== */
const PICKS = [
  {at: 2612, color: C.gold, label: '第 1 层：你觉得最美的', idx: [2, 7, 13, 18, 22, 27]},
  {at: 2650, color: C.blue, label: '第 2 层：大家觉得最美的', idx: [4, 9, 11, 16, 20, 25]},
  {at: 2690, color: C.violet, label: '第 3 层：大家以为大家会选的', idx: [0, 9, 14, 16, 23, 29]},
];

const Beauty: React.FC<{frame: number}> = ({frame}) => {
  const o = envelope(frame, 2524, 2774, 10, 10);
  if (o <= 0) return null;
  const head = 1 - prog(frame, 2590, 2600);
  const grid = prog(frame, 2602, 2628);
  const cur = [...PICKS].reverse().find((pk) => frame >= pk.at);
  const highlight = new Map<number, {color: string; p: number}>();
  if (cur) for (const i of cur.idx) highlight.set(i, {color: cur.color, p: prog(frame, cur.at, cur.at + 10, ease.out)});
  return (
    <AbsoluteFill style={{opacity: o}}>
      {head > 0 ? (
        <div style={{position: 'absolute', left: 0, right: 0, top: 330, textAlign: 'center', opacity: prog(frame, 2526, 2542) * head}}>
          <div
            style={{
              fontFamily: FONT.num,
              fontWeight: 700,
              fontSize: 230,
              lineHeight: 1,
              color: 'transparent',
              WebkitTextStroke: `3px ${C.violet}`,
              textShadow: `0 0 60px ${C.violet}44`,
              transform: `scale(${interpolate(prog(frame, 2526, 2550, ease.out), [0, 1], [1.2, 1])})`,
            }}
          >
            1936
          </div>
          <div style={{fontFamily: FONT.mono, fontWeight: 700, fontSize: 26, letterSpacing: '0.3em', color: C.inkDim, marginTop: 10}}>JOHN MAYNARD KEYNES</div>
          <div style={{fontFamily: FONT.sans, fontWeight: 900, fontSize: 46, color: C.ink, marginTop: 8}}>
            凯恩斯 <span style={{fontWeight: 500, fontSize: 30, color: C.inkDim}}>《就业、利息和货币通论》</span>
          </div>
          <div style={{fontFamily: FONT.serif, fontWeight: 900, fontSize: 56, color: C.violetHot, marginTop: 40}}>报纸上的“选美比赛”</div>
        </div>
      ) : null}
      {grid > 0 ? (
        <>
          <div style={{position: 'absolute', left: 0, right: 0, top: 350, textAlign: 'center', height: 50, opacity: grid}}>
            {cur ? (
              <span key={cur.at} style={{fontFamily: FONT.sans, fontWeight: 900, fontSize: 40, color: cur.color, opacity: prog(frame, cur.at, cur.at + 8)}}>
                {cur.label}
              </span>
            ) : (
              <span style={{fontFamily: FONT.sans, fontWeight: 900, fontSize: 40, color: C.ink}}>100 张照片，选出 6 张</span>
            )}
          </div>
          <div style={{position: 'absolute', left: 121, top: 430, opacity: grid}}>
            <Faces cols={6} rows={5} size={128} gap={14} highlight={highlight} p={grid} />
            {cur
              ? cur.idx.map((i) => (
                  <div key={`${cur.at}-${i}`} style={{position: 'absolute', left: (i % 6) * 142 + 100, top: Math.floor(i / 6) * 142 - 8, opacity: prog(frame, cur.at + 4, cur.at + 12)}}>
                    <Corner color={cur.color} />
                  </div>
                ))
              : null}
          </div>
        </>
      ) : null}
    </AbsoluteFill>
  );
};

/** 股价：人人都以为别人会买 → 泡沫 → 破裂 */
const Bubble: React.FC<{frame: number}> = ({frame}) => {
  const o = envelope(frame, 2770, 2944, 10, 10);
  if (o <= 0) return null;
  const draw = prog(frame, 2774, 2846, ease.inOut);
  const crash = prog(frame, 2850, 2862, ease.in);
  const X0 = 140;
  const X1 = 860;
  const YB = 1000;
  const price = (u: number) => 60 + 460 * Math.pow(u, 2.6) + 22 * Math.sin(u * 23) * u;
  const pts: string[] = [];
  const N = 60;
  for (let i = 0; i <= N; i++) {
    const u = i / N;
    if (u > draw) break;
    pts.push(`${(X0 + u * (X1 - X0)).toFixed(1)},${(YB - price(u)).toFixed(1)}`);
  }
  const peak = {x: X1, y: YB - price(1)};
  const crashEnd = {x: X1 + 80 * crash, y: peak.y + (YB - 70 - peak.y) * crash};
  const tags = [
    {u: 0.45, at: 2792},
    {u: 0.7, at: 2810},
    {u: 0.88, at: 2828},
  ];
  return (
    <AbsoluteFill style={{opacity: o}}>
      <Kicker en="THE STOCK MARKET" zh="股市里的“选美”" opacity={prog(frame, 2774, 2788)} y={268} color={C.violet} />
      <svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
        <line x1={X0 - 20} x2={X1 + 120} y1={YB} y2={YB} stroke={C.inkFaint} strokeWidth={2} />
        <line x1={X0 - 20} x2={X0 - 20} y1={YB} y2={YB - 560} stroke={C.inkFaint} strokeWidth={2} />
        <polyline points={pts.join(' ')} fill="none" stroke={crash > 0 ? C.red : C.violet} strokeWidth={8} strokeLinecap="round" strokeLinejoin="round" style={{filter: `drop-shadow(0 0 12px ${crash > 0 ? C.red : C.violet})`}} />
        {crash > 0 ? <line x1={peak.x} y1={peak.y} x2={crashEnd.x} y2={crashEnd.y} stroke={C.red} strokeWidth={8} strokeLinecap="round" style={{filter: `drop-shadow(0 0 12px ${C.red})`}} /> : null}
        {tags.map((tg, i) => {
          const p = prog(frame, tg.at, tg.at + 10, ease.back);
          if (p <= 0 || crash > 0.5) return null;
          const x = X0 + tg.u * (X1 - X0);
          const y = YB - price(tg.u);
          return (
            <g key={i} transform={`translate(${x - 30}, ${y - 70}) scale(${p})`}>
              <rect x={-150} y={-34} width={240} height={52} rx={26} fill={C.panel} stroke={C.violet} strokeWidth={2} />
              <text x={-30} y={2} textAnchor="middle" style={{fontFamily: FONT.sans, fontWeight: 900, fontSize: 26}} fill={C.violetHot}>
                “别人会买”
              </text>
            </g>
          );
        })}
      </svg>
      {crash > 0 ? (
        <div style={{position: 'absolute', left: 0, right: 0, top: 380, textAlign: 'center', transform: `scale(${interpolate(crash, [0, 1], [1.5, 1])})`, opacity: crash}}>
          <span style={{fontFamily: FONT.serif, fontWeight: 900, fontSize: 150, color: C.red, textShadow: `0 0 60px ${C.red}88`}}>泡沫</span>
        </div>
      ) : null}
      <div style={{position: 'absolute', left: 0, right: 0, top: 1040, textAlign: 'center', fontFamily: FONT.mono, fontWeight: 700, fontSize: 20, color: C.inkDim, opacity: prog(frame, 2780, 2792)}}>
        示意
      </div>
    </AbsoluteFill>
  );
};

export const KeynesScene: React.FC = () => {
  const frame = useCurrentFrame();
  if (frame < 2520 || frame >= 2944) return null;
  return (
    <AbsoluteFill>
      <Beauty frame={frame} />
      <Bubble frame={frame} />
    </AbsoluteFill>
  );
};
