/**
 * 世界篇两幕
 *  1:08 文化：Henrich 等在 15 个小型社会做同一个实验
 *       马奇根加（秘鲁）给 15%～25% 几乎都被接受 → 拉马莱拉（印尼）平均给 58%
 *       → 奥族 / 格瑙族（巴布亚新几内亚）连给太多都会被拒（研究者的解释：大礼 = 人情债）
 *  1:22 独裁者博弈：对方不能拒绝 → Engel 2011 元分析：平均 28%，36% 一分不给
 *       → 最后通牒里的“三四成”= 良心（≈28%）+ 对方的“不”
 */
import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';
import {Globe} from '../components/Globe';
import {KineticText} from '../components/KineticText';
import {Check} from '../components/Props';
import {SplitBar, Verdict} from '../components/Split';
import {Stamp, Token} from '../components/Token';
import {Kicker} from '../components/ui';
import {countUp, ease, envelope, keyframes, lerp, prog} from '../lib/anim';
import {ENGEL_2011, HENRICH} from '../math/ultimatum';
import {C, FONT} from '../theme';

/* ============================================================
 * 文化
 * ========================================================== */
const PLACES = {
  machi: {lat: -12, lon: -72.5, label: '马奇根加', color: C.coop},
  lama: {lat: -8.4, lon: 123.4, label: '拉马莱拉', color: C.gold},
  png: {lat: -3.6, lon: 142.4, label: '奥族 · 格瑙族', color: C.red},
};

/** 地球仪转向：慢转 → 秘鲁 → 印尼 → 巴布亚新几内亚 */
const lonAt = (f: number) =>
  keyframes(
    [
      {f: 2040, lon: 10},
      {f: 2128, lon: -72},
      {f: 2196, lon: -72},
      {f: 2220, lon: 123},
      {f: 2280, lon: 123},
      {f: 2300, lon: 142},
      {f: 2460, lon: 150},
    ],
    f,
    (a, b, t) => ({lon: lerp(a.lon, b.lon, t)}),
  ).lon;

/** 0～100% 的刻度轨道：区间段 + 标记 */
const Track: React.FC<{
  p: number;
  segs?: {a: number; b: number; color: string; label?: string}[];
  marks?: {v: number; color: string; label: string}[];
}> = ({p, segs = [], marks = []}) => {
  const W = 800;
  const X = (v: number) => (v / 100) * W;
  return (
    <svg width={W} height={110} viewBox={`0 0 ${W} 110`} style={{overflow: 'visible'}}>
      <rect x={0} y={52} width={W} height={14} rx={7} fill={C.inkFaint} />
      {[0, 50, 100].map((v) => (
        <g key={v}>
          <line x1={X(v)} x2={X(v)} y1={44} y2={74} stroke={C.ink} strokeOpacity={0.45} strokeWidth={2} />
          <text x={X(v)} y={102} textAnchor={v === 0 ? 'start' : v === 100 ? 'end' : 'middle'} style={{fontFamily: FONT.num, fontWeight: 500, fontSize: 22}} fill={C.inkDim}>
            {v}%
          </text>
        </g>
      ))}
      {segs.map((s, i) => (
        <g key={i}>
          <rect x={X(s.a)} y={48} width={(X(s.b) - X(s.a)) * p} height={22} rx={11} fill={s.color} style={{filter: `drop-shadow(0 0 10px ${s.color})`}} />
          {s.label ? (
            <text x={(X(s.a) + X(s.b)) / 2} y={34} textAnchor="middle" style={{fontFamily: FONT.sans, fontWeight: 900, fontSize: 28}} fill={s.color} opacity={p}>
              {s.label}
            </text>
          ) : null}
        </g>
      ))}
      {marks.map((m, i) => {
        const x = X(m.v * p + 50 * (1 - p));
        return (
          <g key={i} opacity={Math.min(1, p * 2)}>
            <path d={`M ${x - 13} 30 L ${x + 13} 30 L ${x} 50 Z`} fill={m.color} />
            <circle cx={x} cy={59} r={13} fill={m.color} stroke="#fff" strokeWidth={3} />
            <text x={x} y={20} textAnchor="middle" style={{fontFamily: FONT.sans, fontWeight: 900, fontSize: 30}} fill={m.color}>
              {m.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
};

/** 地点信息卡 */
const Card: React.FC<{o: number; title: string; color: string; sub: string; right?: React.ReactNode; children: React.ReactNode}> = ({o, title, color, sub, right, children}) => {
  if (o <= 0) return null;
  return (
    <div
      style={{
        position: 'absolute',
        left: 110,
        width: 860,
        top: 968,
        height: 232,
        borderRadius: 26,
        background: C.panel,
        border: `2px solid ${color}66`,
        padding: '22px 30px 0',
        boxSizing: 'border-box',
        opacity: o,
        transform: `translateY(${(1 - o) * 24}px)`,
      }}
    >
      <div style={{display: 'flex', alignItems: 'baseline', gap: 18}}>
        <span style={{fontFamily: FONT.serif, fontWeight: 900, fontSize: 46, color}}>{title}</span>
        <span style={{fontFamily: FONT.sans, fontWeight: 700, fontSize: 26, color: C.inkDim}}>{sub}</span>
        <span style={{flex: 1}} />
        {right}
      </div>
      <div style={{marginTop: 10}}>{children}</div>
    </div>
  );
};

/** 礼物盒图标 */
const Gift: React.FC<{size: number}> = ({size}) => (
  <svg width={size} height={size} viewBox="-40 -40 80 80">
    <rect x={-28} y={-6} width={56} height={38} rx={4} fill="none" stroke={C.gold} strokeWidth={5} />
    <rect x={-33} y={-18} width={66} height={14} rx={3} fill="none" stroke={C.gold} strokeWidth={5} />
    <line x1={0} y1={-18} x2={0} y2={32} stroke={C.red} strokeWidth={6} />
    <path d="M 0 -18 C -18 -40 -34 -22 0 -18 C 34 -22 18 -40 0 -18" fill="none" stroke={C.red} strokeWidth={5} />
  </svg>
);

export const CultureScene: React.FC = () => {
  const frame = useCurrentFrame();
  if (frame < 2040 || frame >= 2460) return null;
  const o = envelope(frame, 2040, 2460, 12, 10);
  const lon0 = lonAt(frame);
  const segA = envelope(frame, 2130, 2214, 10, 8);
  const segB = envelope(frame, 2214, 2298, 10, 8);
  const segC = envelope(frame, 2298, 2384, 10, 8);
  const segD = envelope(frame, 2384, 2460, 10, 6);
  const pins = [
    {...PLACES.machi, on: prog(frame, 2126, 2138), focus: 1 - 0.85 * prog(frame, 2196, 2206)},
    {...PLACES.lama, on: prog(frame, 2212, 2224), focus: 1 - 0.85 * prog(frame, 2282, 2292)},
    {...PLACES.png, on: prog(frame, 2296, 2308), focus: 1},
  ];
  return (
    <AbsoluteFill style={{opacity: o}}>
      <Kicker en="HENRICH ET AL. · 15 SOCIETIES" zh="公平感，因文化而异" opacity={prog(frame, 2044, 2060)} y={268} color={C.coop} />
      <div style={{position: 'absolute', left: 140, top: 380, opacity: prog(frame, 2042, 2062)}}>
        <Globe lon0={lon0} lat0={-8} R={250} pins={pins} frame={frame} />
      </div>
      <Card
        o={segA}
        title="马奇根加人"
        color={C.coop}
        sub="秘鲁 · 亚马逊雨林"
        right={
          <span style={{display: 'flex', alignItems: 'center', gap: 6, fontFamily: FONT.sans, fontWeight: 900, fontSize: 30, color: C.coop}}>
            <Check color={C.coop} size={36} p={prog(frame, 2150, 2160)} />
            几乎都被接受
          </span>
        }
      >
        <Track p={prog(frame, 2138, 2160, ease.out)} segs={[{a: HENRICH.machiguenga.low, b: HENRICH.machiguenga.high, color: C.coop, label: '通常只给 15%～25%'}]} />
      </Card>
      <Card o={segB} title="拉马莱拉人" color={C.gold} sub="印尼 · 捕鲸村落" right={<span style={{fontFamily: FONT.sans, fontWeight: 900, fontSize: 30, color: C.gold}}>比一半还多</span>}>
        <Track p={prog(frame, 2222, 2246, ease.out)} marks={[{v: HENRICH.lamalera.mean, color: C.gold, label: `平均 ${HENRICH.lamalera.mean}%`}]} />
      </Card>
      <Card o={segC} title="奥族 · 格瑙族" color={C.red} sub="巴布亚新几内亚" right={<span style={{fontFamily: FONT.mono, fontWeight: 700, fontSize: 20, color: C.inkDim}}>示意</span>}>
        <Track
          p={prog(frame, 2306, 2326, ease.out)}
          segs={[
            {a: 0, b: 20, color: C.red, label: '太少 ×'},
            {a: 60, b: 100, color: C.red, label: '太多也 ×'},
          ]}
        />
      </Card>
      {segD > 0 ? (
        <div
          style={{
            position: 'absolute',
            left: 110,
            width: 860,
            top: 968,
            height: 232,
            borderRadius: 26,
            background: C.panel,
            border: `2px solid ${C.gold}66`,
            opacity: segD,
            display: 'flex',
            alignItems: 'center',
            gap: 26,
            padding: '0 40px',
            boxSizing: 'border-box',
          }}
        >
          <div style={{transform: `scale(${interpolate(prog(frame, 2386, 2400, ease.back), [0, 1], [0.5, 1])})`}}>
            <Gift size={130} />
          </div>
          <div>
            <div style={{fontFamily: FONT.sans, fontWeight: 700, fontSize: 26, color: C.inkDim}}>研究者的解释</div>
            <div style={{fontFamily: FONT.serif, fontWeight: 900, fontSize: 56, color: C.ink, marginTop: 4}}>
              收了<span style={{color: C.gold}}>大礼</span> = 欠下<span style={{color: C.red}}>人情</span>
            </div>
          </div>
        </div>
      ) : null}
    </AbsoluteFill>
  );
};

/* ============================================================
 * 独裁者博弈
 * ========================================================== */
const BX = 330; // 对比条起点
const PPU = 13; // 每 1% 的长度

export const DictatorScene: React.FC = () => {
  const frame = useCurrentFrame();
  if (frame < 2460 || frame >= 2820) return null;
  const o = envelope(frame, 2460, 2820, 10, 10);
  const kind = envelope(frame, 2464, 2552, 8, 8);
  const rule = envelope(frame, 2552, 2638, 10, 8);
  const lock = prog(frame, 2556, 2566, ease.out);
  const data = envelope(frame, 2638, 2820, 10, 10);
  const donut = prog(frame, 2648, 2676, ease.out) * (1 - prog(frame, 2716, 2726));
  const split = prog(frame, 2724, 2744, ease.inOut);
  const formula = prog(frame, 2736, 2750);
  const dict = countUp(frame, 2642, 2668, 0, ENGEL_2011.mean);
  const ultEnd = 40;
  return (
    <AbsoluteFill style={{opacity: o}}>
      {/* ① 因为善良？ */}
      {kind > 0 ? (
        <AbsoluteFill style={{opacity: kind}}>
          <div style={{position: 'absolute', left: 0, right: 0, top: 440, display: 'flex', justifyContent: 'center'}}>
            <KineticText text="因为<g>善良</g>？" frame={frame - 2470} duration={82} size={150} font={FONT.serif} weight={900} mode="slam" stagger={2.4} />
          </div>
          <div style={{position: 'absolute', left: 160, top: 760, opacity: prog(frame, 2480, 2494)}}>
            <SplitBar keep={50} w={760} state="accept" stateP={prog(frame, 2494, 2510)} />
          </div>
        </AbsoluteFill>
      ) : null}
      {/* ② 换规则：对方不能拒绝 */}
      <Kicker en="DICTATOR GAME" zh="独裁者博弈" opacity={envelope(frame, 2554, 2820, 10, 10)} y={268} color={C.blue} />
      {rule > 0 ? (
        <AbsoluteFill style={{opacity: rule}}>
          <svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
            {[
              {x: 330, ch: '你', color: C.gold, role: '独裁者', at: 2556},
              {x: 750, ch: '他', color: C.blue, role: '只能收下', at: 2562},
            ].map((t) => {
              const p = prog(frame, t.at, t.at + 14, ease.back);
              return (
                <g key={t.ch} transform={`translate(${t.x}, 540) scale(${p})`}>
                  <Token ch={t.ch} color={t.color} r={70} spin={frame * 0.4} />
                  <text y={122} textAnchor="middle" style={{fontFamily: FONT.sans, fontWeight: 900, fontSize: 30}} fill={t.color}>
                    {t.role}
                  </text>
                </g>
              );
            })}
          </svg>
          <div style={{position: 'absolute', left: 0, right: 0, top: 760, display: 'flex', justifyContent: 'center', gap: 60}}>
            <Verdict kind="accept" p={1} active={0.4} />
            <div style={{position: 'relative', opacity: 1 - 0.55 * lock}}>
              <Verdict kind="reject" p={1} />
              <svg width={300} height={110} style={{position: 'absolute', inset: 0}}>
                <line x1={20} y1={98} x2={20 + 260 * lock} y2={98 - 86 * lock} stroke={C.red} strokeWidth={8} strokeLinecap="round" />
              </svg>
            </div>
          </div>
          <div style={{position: 'absolute', left: 540, width: 480, top: 900, display: 'flex', justifyContent: 'center'}}>
            <Stamp text="不能拒绝" sub="NO VETO" color={C.red} p={lock} rotate={-7} />
          </div>
        </AbsoluteFill>
      ) : null}
      {/* ③ 元分析数据 + ④ 拆解 */}
      {data > 0 ? (
        <AbsoluteFill style={{opacity: data}}>
          <svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
            <defs>
              <linearGradient id="ult-fuzzy" x1="0" x2="1">
                <stop offset="0%" stopColor={C.blue} stopOpacity={0.9} />
                <stop offset="100%" stopColor={C.blue} stopOpacity={0.15} />
              </linearGradient>
              <linearGradient id="ult-fuzzy-red" x1="0" x2="1">
                <stop offset="0%" stopColor={C.red} stopOpacity={0.95} />
                <stop offset="100%" stopColor={C.red} stopOpacity={0.25} />
              </linearGradient>
            </defs>
            {/* 行：最后通牒 */}
            <text x={100} y={482} style={{fontFamily: FONT.sans, fontWeight: 900, fontSize: 34}} fill={C.ink}>
              最后通牒
            </text>
            <rect x={BX} y={450} width={PPU * ultEnd} height={44} rx={10} fill={C.inkFaint} />
            <rect x={BX} y={450} width={PPU * 30 * prog(frame, 2640, 2660, ease.out)} height={44} rx={10} fill={C.blue} opacity={1 - split} />
            <rect x={BX + PPU * 30} y={450} width={PPU * 10 * prog(frame, 2654, 2666)} height={44} fill="url(#ult-fuzzy)" opacity={1 - split} />
            {/* 拆解：0～28 良心（青），28～40 对方的“不”（红） */}
            {split > 0 ? (
              <g opacity={split}>
                <rect x={BX} y={450} width={PPU * ENGEL_2011.mean} height={44} rx={10} fill={C.coop} />
                <rect x={BX + PPU * ENGEL_2011.mean} y={450} width={PPU * (ultEnd - ENGEL_2011.mean)} height={44} fill="url(#ult-fuzzy-red)" />
                <text x={BX + (PPU * ENGEL_2011.mean) / 2} y={432} textAnchor="middle" style={{fontFamily: FONT.sans, fontWeight: 900, fontSize: 30}} fill={C.coop}>
                  良心
                </text>
                <text x={BX + PPU * (ENGEL_2011.mean + ultEnd) * 0.5} y={432} textAnchor="middle" style={{fontFamily: FONT.sans, fontWeight: 900, fontSize: 30}} fill={C.red}>
                  对方的“不”
                </text>
              </g>
            ) : null}
            <text x={BX + PPU * ultEnd + 16} y={484} style={{fontFamily: FONT.sans, fontWeight: 900, fontSize: 32}} fill={C.blueHot} opacity={prog(frame, 2660, 2670)}>
              三四成
            </text>
            {/* 行：独裁者 */}
            <text x={100} y={602} style={{fontFamily: FONT.sans, fontWeight: 900, fontSize: 34}} fill={C.ink}>
              独裁者
            </text>
            <rect x={BX} y={570} width={PPU * ultEnd} height={44} rx={10} fill={C.inkFaint} />
            <rect x={BX} y={570} width={PPU * dict} height={44} rx={10} fill={split > 0 ? C.coop : C.blue} />
            <text x={BX + PPU * dict + 16} y={606} style={{fontFamily: FONT.num, fontWeight: 700, fontSize: 44}} fill={C.ink}>
              {Math.round(dict)}%
            </text>
            {/* 28% 对齐线 */}
            <line
              x1={BX + PPU * ENGEL_2011.mean}
              x2={BX + PPU * ENGEL_2011.mean}
              y1={440}
              y2={626}
              stroke={C.ink}
              strokeWidth={2}
              strokeDasharray="6 6"
              opacity={split}
            />
            <text x={BX} y={666} style={{fontFamily: FONT.sans, fontWeight: 700, fontSize: 24}} fill={C.inkDim}>
              平均给对方的比例
            </text>
            {/* 环形图：36% 一分不给，17% 五五开 */}
            {donut > 0 ? (
              <g transform="translate(540, 870)" opacity={donut}>
                <circle r={120} fill="none" stroke={C.inkFaint} strokeWidth={36} />
                <circle
                  r={120}
                  fill="none"
                  stroke={C.red}
                  strokeWidth={36}
                  pathLength={100}
                  strokeDasharray={`${ENGEL_2011.giveNothing * donut} 100`}
                  transform="rotate(-90)"
                  style={{filter: `drop-shadow(0 0 12px ${C.red})`}}
                />
                <circle
                  r={120}
                  fill="none"
                  stroke={C.coop}
                  strokeWidth={36}
                  pathLength={100}
                  strokeDasharray={`0 ${ENGEL_2011.giveNothing} ${ENGEL_2011.equalSplit * donut} 100`}
                  transform="rotate(-90)"
                />
                <text y={20} textAnchor="middle" style={{fontFamily: FONT.num, fontWeight: 700, fontSize: 78}} fill={C.red}>
                  {Math.round(ENGEL_2011.giveNothing * donut)}%
                </text>
                <text y={66} textAnchor="middle" style={{fontFamily: FONT.sans, fontWeight: 900, fontSize: 28}} fill={C.ink}>
                  一分不给
                </text>
                <text x={176} y={-60} style={{fontFamily: FONT.sans, fontWeight: 900, fontSize: 28}} fill={C.coop}>
                  {ENGEL_2011.equalSplit}% 五五开
                </text>
              </g>
            ) : null}
            <text x={540} y={1128} textAnchor="middle" style={{fontFamily: FONT.mono, fontWeight: 700, fontSize: 20}} fill={C.inkDim}>
              ENGEL 2011 · 616 组实验 · 20,813 名“独裁者” · 最后通牒为典型值
            </text>
          </svg>
          {formula > 0 ? (
            <div style={{position: 'absolute', left: 0, right: 0, top: 790, display: 'flex', justifyContent: 'center'}}>
              <KineticText text={'公平 = <c>良心</c> + <r>对方的“不”</r>'} frame={frame - 2736} duration={84} size={76} font={FONT.serif} weight={900} mode="slam" stagger={1.8} maxWidth={960} />
            </div>
          ) : null}
        </AbsoluteFill>
      ) : null}
    </AbsoluteFill>
  );
};
