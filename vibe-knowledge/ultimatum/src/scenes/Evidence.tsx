/**
 * 中段三幕：理论 vs 现实
 *  0:30 真实实验：99 : 1 被现实打脸 → 出价分布（示意）：最常见五五开、平均三四成、
 *       低于 2 成约一半被拒 → 宁可 0 : 0，也不让对方占便宜
 *  0:46 脑扫描：Sanfey 等（Science 2003）不公平出价激活前脑岛，被拒绝的那些反应更强
 *  0:58 黑猩猩：Jensen、Call & Tomasello（Science 2007）只要分到一点就接受 → “理性人”
 */
import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';
import {Brain} from '../components/Brain';
import {KineticText} from '../components/KineticText';
import {Check, Cross} from '../components/Props';
import {SplitBar, SplitNote, Verdict} from '../components/Split';
import {Stamp, Token} from '../components/Token';
import {Kicker} from '../components/ui';
import {ease, envelope, hash, prog} from '../lib/anim';
import {OFFER_BINS} from '../math/ultimatum';
import {C, FONT} from '../theme';

/* ============================================================
 * 真实实验
 * ========================================================== */

/** 99 : 1 被一刀划掉 */
const Smash: React.FC<{frame: number}> = ({frame}) => {
  const o = envelope(frame, 903, 996, 4, 8);
  if (o <= 0) return null;
  const slash = prog(frame, 911, 917, ease.out);
  const k = frame - 912;
  const shake = k >= 0 && k < 18 ? (hash(frame) - 0.5) * 24 * (1 - k / 18) : 0;
  const x1 = 190;
  const y1 = 760;
  const x2 = 890;
  const y2 = 560;
  return (
    <AbsoluteFill style={{opacity: o}}>
      <div style={{position: 'absolute', left: 0, right: 0, top: 470, textAlign: 'center', transform: `translateX(${shake}px)`}}>
        <div style={{fontFamily: FONT.sans, fontWeight: 900, fontSize: 40, color: C.inkDim, letterSpacing: '0.24em'}}>理论预测</div>
        <div
          style={{
            fontFamily: FONT.num,
            fontWeight: 700,
            fontSize: 240,
            lineHeight: 1.1,
            color: slash > 0 ? 'rgba(246,188,72,0.32)' : C.gold,
            textShadow: slash > 0 ? 'none' : `0 0 60px ${C.gold}55`,
          }}
        >
          99 : 1
        </div>
      </div>
      <svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
        {slash > 0 ? (
          <line
            x1={x1}
            y1={y1}
            x2={x1 + (x2 - x1) * slash}
            y2={y1 + (y2 - y1) * slash}
            stroke={C.red}
            strokeWidth={16}
            strokeLinecap="round"
            style={{filter: `drop-shadow(0 0 18px ${C.red})`}}
          />
        ) : null}
      </svg>
      <div style={{position: 'absolute', left: 0, right: 0, top: 880, display: 'flex', justifyContent: 'center'}}>
        <Stamp text="被现实打脸" sub="REALITY CHECK" color={C.red} p={prog(frame, 913, 921, ease.out)} rotate={-6} />
      </div>
    </AbsoluteFill>
  );
};

/* ---------- 出价分布（示意） ---------- */
const BASE = 1050; // 柱状图基线
const PX = 13; // 每 1% 的柱高
const REJ_H = 500; // 拒绝率 100% 对应的高度
const BAR_W = 86;
const bx = (i: number) => 180 + 120 * i;
/** 把“给对方的比例”映射到横轴（相邻区间中点之间线性插值） */
const xOf = (v: number) => {
  const mids = OFFER_BINS.map((b) => b.mid);
  if (v <= mids[0]) return bx(0);
  for (let i = 0; i < mids.length - 1; i++) {
    if (v <= mids[i + 1]) return bx(i) + ((v - mids[i]) / (mids[i + 1] - mids[i])) * 120;
  }
  return bx(mids.length - 1);
};

const Histogram: React.FC<{frame: number}> = ({frame}) => {
  const o = envelope(frame, 994, 1254, 8, 10);
  if (o <= 0) return null;
  const mode = prog(frame, 1026, 1040, ease.back) * (1 - prog(frame, 1160, 1170));
  const avg = prog(frame, 1080, 1096, ease.out) * (1 - prog(frame, 1160, 1170));
  const rej = prog(frame, 1164, 1200, ease.inOut);
  const rejOn = prog(frame, 1162, 1174);
  // 拒绝率折线：按绘制进度截断
  const pts = OFFER_BINS.map((b, i) => ({x: bx(i), y: BASE - b.reject * REJ_H}));
  const drawn: string[] = [];
  const total = pts.length - 1;
  for (let i = 0; i < pts.length; i++) {
    const t = i / total;
    if (t <= rej) drawn.push(`${pts[i].x},${pts[i].y}`);
    else {
      const prev = pts[i - 1];
      const u = (rej - (i - 1) / total) * total;
      if (u > 0) drawn.push(`${prev.x + (pts[i].x - prev.x) * u},${prev.y + (pts[i].y - prev.y) * u}`);
      break;
    }
  }
  return (
    <AbsoluteFill style={{opacity: o}}>
      <Kicker en="REAL EXPERIMENTS" zh="真人是怎么分的？" opacity={prog(frame, 994, 1006)} y={268} color={C.gold} />
      <svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
        {/* 网格 */}
        {[10, 20, 30].map((v) => (
          <line key={v} x1={120} x2={960} y1={BASE - v * PX} y2={BASE - v * PX} stroke={C.inkFaint} strokeWidth={1.5} strokeDasharray="2 10" />
        ))}
        {/* 平均：三四成 */}
        {avg > 0 ? (
          <g opacity={avg}>
            <rect x={xOf(30)} y={BASE - 460 * avg} width={xOf(40) - xOf(30)} height={460 * avg} fill={C.gold} opacity={0.14} />
            <line x1={xOf(30)} x2={xOf(30)} y1={BASE} y2={BASE - 460 * avg} stroke={C.gold} strokeWidth={2} strokeDasharray="6 6" />
            <line x1={xOf(40)} x2={xOf(40)} y1={BASE} y2={BASE - 460 * avg} stroke={C.gold} strokeWidth={2} strokeDasharray="6 6" />
            <text x={(xOf(30) + xOf(40)) / 2} y={BASE - 522} textAnchor="middle" style={{fontFamily: FONT.sans, fontWeight: 700, fontSize: 28}} fill={C.inkDim}>
              平均
            </text>
            <text x={(xOf(30) + xOf(40)) / 2} y={BASE - 476} textAnchor="middle" style={{fontFamily: FONT.sans, fontWeight: 900, fontSize: 40}} fill={C.goldHot}>
              三四成
            </text>
          </g>
        ) : null}
        {/* 柱 */}
        {OFFER_BINS.map((b, i) => {
          const grow = prog(frame, 994 + i * 3, 1016 + i * 3, ease.out);
          const h = b.share * PX * grow;
          const isMode = b.mid === 50;
          const low = b.mid < 20;
          const fill = low && rejOn > 0 ? C.red : isMode ? C.gold : C.blue;
          const dim = low ? 0 : 0.65 * rejOn;
          return (
            <g key={b.label} opacity={1 - dim}>
              <rect
                x={bx(i) - BAR_W / 2}
                y={BASE - h}
                width={BAR_W}
                height={h}
                rx={8}
                fill={fill}
                opacity={isMode || (low && rejOn > 0) ? 1 : 0.62}
                style={isMode ? {filter: `drop-shadow(0 0 ${22 * mode}px ${C.gold})`} : undefined}
              />
              <text x={bx(i)} y={BASE - h - 14} textAnchor="middle" style={{fontFamily: FONT.num, fontWeight: 700, fontSize: 30}} fill={isMode ? C.goldHot : C.ink} opacity={grow}>
                {b.share}%
              </text>
              <text x={bx(i)} y={BASE + 40} textAnchor="middle" style={{fontFamily: FONT.num, fontWeight: 500, fontSize: 26}} fill={low && rejOn > 0 ? C.redHot : C.inkDim}>
                {b.label}
              </text>
            </g>
          );
        })}
        <line x1={110} x2={970} y1={BASE} y2={BASE} stroke={C.ink} strokeOpacity={0.5} strokeWidth={3} />
        {/* 拒绝率折线（示意） */}
        {rej > 0 ? (
          <g>
            <polyline points={drawn.join(' ')} fill="none" stroke={C.red} strokeWidth={6} strokeLinejoin="round" strokeLinecap="round" style={{filter: `drop-shadow(0 0 10px ${C.red})`}} />
            {pts.map((p, i) =>
              i / total <= rej ? <circle key={i} cx={p.x} cy={p.y} r={i < 2 ? 12 : 8} fill={C.red} stroke="#fff" strokeWidth={i < 2 ? 3 : 2} /> : null,
            )}
            <text x={206} y={BASE - 352} style={{fontFamily: FONT.sans, fontWeight: 900, fontSize: 26}} fill={C.redHot} opacity={prog(frame, 1180, 1192)}>
              红线 = 被拒绝的比例
            </text>
          </g>
        ) : null}
        {/* 底注 */}
        <text x={120} y={BASE + 92} style={{fontFamily: FONT.sans, fontWeight: 700, fontSize: 24}} fill={C.inkDim}>
          横轴：给对方的比例（%）
        </text>
        <text x={960} y={BASE + 92} textAnchor="end" style={{fontFamily: FONT.mono, fontWeight: 700, fontSize: 20}} fill={C.inkDim}>
          示意 · 多项实验的典型结果
        </text>
      </svg>
      {/* 最常见：五五开 */}
      {mode > 0 ? (
        <div
          style={{
            position: 'absolute',
            left: bx(5) - 150,
            width: 300,
            top: 414,
            textAlign: 'center',
            opacity: Math.min(1, mode),
            transform: `translateY(${(1 - Math.min(1, mode)) * 20}px)`,
          }}
        >
          <div style={{fontFamily: FONT.sans, fontWeight: 700, fontSize: 28, color: C.inkDim}}>最常见</div>
          <div style={{fontFamily: FONT.serif, fontWeight: 900, fontSize: 64, color: C.gold, lineHeight: 1.15, textShadow: `0 0 30px ${C.gold}66`}}>五五开</div>
        </div>
      ) : null}
      {/* 低于 2 成：约一半被拒 */}
      {rejOn > 0 ? (
        <div
          style={{
            position: 'absolute',
            left: 110,
            width: 340,
            top: 448,
            textAlign: 'center',
            opacity: prog(frame, 1176, 1190),
            transform: `scale(${interpolate(prog(frame, 1176, 1190, ease.back), [0, 1], [0.8, 1])})`,
          }}
        >
          <div style={{fontFamily: FONT.sans, fontWeight: 700, fontSize: 30, color: C.redHot}}>低于 2 成的出价</div>
          <div style={{fontFamily: FONT.serif, fontWeight: 900, fontSize: 58, color: C.red, lineHeight: 1.2, textShadow: `0 0 30px ${C.red}66`}}>约一半被拒</div>
        </div>
      ) : null}
    </AbsoluteFill>
  );
};

/** 宁可 0 : 0：他放弃 15，让你损失 85 */
const Refuse: React.FC<{frame: number}> = ({frame}) => {
  const o = envelope(frame, 1252, 1380, 8, 10);
  if (o <= 0) return null;
  const zero = prog(frame, 1316, 1328, ease.back);
  const cost = prog(frame, 1334, 1348, ease.out);
  return (
    <AbsoluteFill style={{opacity: o}}>
      <div style={{position: 'absolute', left: 260, top: 560}}>
        <SplitNote frame={frame} w={560} share={0.85} cutAt={1258} splitAt={1264} rejectAt={1298} />
      </div>
      <div style={{position: 'absolute', left: 0, right: 0, top: 900, display: 'flex', justifyContent: 'center'}}>
        <Verdict kind="reject" p={prog(frame, 1282, 1294, ease.back)} active={prog(frame, 1290, 1298)} />
      </div>
      {zero > 0 ? (
        <div style={{position: 'absolute', left: 0, right: 0, top: 590, textAlign: 'center', transform: `scale(${zero})`}}>
          <div style={{fontFamily: FONT.num, fontWeight: 700, fontSize: 180, lineHeight: 1, color: C.red, textShadow: `0 0 70px ${C.red}88`}}>
            0 <span style={{color: C.inkDim, fontSize: 110}}>:</span> 0
          </div>
        </div>
      ) : null}
      {cost > 0 ? (
        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: 1050,
            textAlign: 'center',
            opacity: cost,
            transform: `translateY(${(1 - cost) * 20}px)`,
            fontFamily: FONT.sans,
            fontWeight: 900,
            fontSize: 40,
            color: C.ink,
          }}
        >
          他放弃 <span style={{fontFamily: FONT.num, fontWeight: 700, fontSize: 60, color: C.blue}}>15</span> 元
          <span style={{color: C.inkFaint, margin: '0 18px'}}>/</span>
          让你损失 <span style={{fontFamily: FONT.num, fontWeight: 700, fontSize: 60, color: C.gold}}>85</span> 元
        </div>
      ) : null}
    </AbsoluteFill>
  );
};

export const RealityScene: React.FC = () => {
  const frame = useCurrentFrame();
  if (frame < 900 || frame >= 1380) return null;
  return (
    <AbsoluteFill>
      <Smash frame={frame} />
      <Histogram frame={frame} />
      <Refuse frame={frame} />
    </AbsoluteFill>
  );
};

/* ============================================================
 * 脑扫描
 * ========================================================== */
export const BrainScene: React.FC = () => {
  const frame = useCurrentFrame();
  if (frame < 1380 || frame >= 1740) return null;
  const q = envelope(frame, 1382, 1468, 8, 8);
  const lab = envelope(frame, 1468, 1740, 12, 10);
  // 两次扫描，每次 40 帧
  const scan = frame >= 1472 && frame < 1552 ? ((frame - 1472) % 40) / 40 : -1;
  const insula = interpolate(frame, [1554, 1568, 1636, 1650], [0, 0.62, 0.62, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const rej = prog(frame, 1638, 1650, ease.out);
  return (
    <AbsoluteFill>
      {q > 0 ? (
        <div style={{position: 'absolute', left: 0, right: 0, top: 520, display: 'flex', justifyContent: 'center', opacity: q}}>
          <KineticText
            text={'跟钱\n<r>过不去</r>？'}
            frame={frame - 1384}
            duration={86}
            size={150}
            font={FONT.serif}
            weight={900}
            mode="slam"
            stagger={2.4}
            lineHeight={1.15}
          />
        </div>
      ) : null}
      {lab > 0 ? (
        <AbsoluteFill style={{opacity: lab}}>
          <Kicker en="fMRI · SANFEY ET AL. · 2003" zh="回应者的大脑" opacity={1} y={268} color={C.scan} />
          <div style={{position: 'absolute', left: 220, top: 404, opacity: prog(frame, 1470, 1484)}}>
            <SplitBar keep={90} w={640} state={rej > 0 ? 'reject' : 'pending'} stateP={rej} />
          </div>
          <div style={{position: 'absolute', left: 210, top: 584}}>
            <Brain frame={frame} insula={insula} scan={scan} w={660} note="拒绝时 · 反应更强" noteP={prog(frame, 1644, 1656)} />
          </div>
        </AbsoluteFill>
      ) : null}
    </AbsoluteFill>
  );
};

/* ============================================================
 * 黑猩猩
 * ========================================================== */
const DINGS = [1840, 1858, 1876];

export const ChimpScene: React.FC = () => {
  const frame = useCurrentFrame();
  if (frame < 1740 || frame >= 2040) return null;
  const o = envelope(frame, 1740, 2040, 12, 10);
  const tk = prog(frame, 1746, 1764, ease.back);
  const tray = prog(frame, 1772, 1792, ease.out);
  const human = prog(frame, 1832, 1846, ease.out);
  const chimp = prog(frame, 1836, 1850, ease.out);
  const stamp = prog(frame, 1918, 1926, ease.out);
  // 托盘里 10 颗葡萄干：左 8（提议者）右 2（回应者）
  const raisins = Array.from({length: 10}).map((_, i) => ({x: i < 8 ? 264 + i * 56 : 760 + (i - 8) * 56, mine: i < 8}));
  const row: React.CSSProperties = {
    position: 'absolute',
    left: 130,
    width: 820,
    height: 92,
    borderRadius: 24,
    display: 'flex',
    alignItems: 'center',
    padding: '0 30px',
    background: C.panel,
  };
  return (
    <AbsoluteFill style={{opacity: o}}>
      <Kicker en="JENSEN · CALL · TOMASELLO · 2007" zh="黑猩猩也来分钱" opacity={prog(frame, 1744, 1758)} y={268} color={C.amber} />
      <svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
        <g transform={`translate(540, 520) scale(${tk})`}>
          <Token ch="猩" color={C.amber} r={92} spin={frame * 0.4} glow={0.7 + 0.3 * stamp} />
        </g>
        <g opacity={tray} transform={`translate(0, ${(1 - tray) * 30})`}>
          <rect x={190} y={672} width={700} height={116} rx={26} fill="rgba(22,15,8,0.88)" stroke={C.amber} strokeOpacity={0.6} strokeWidth={3} />
          <line x1={708} x2={708} y1={684} y2={776} stroke={C.ink} strokeOpacity={0.5} strokeWidth={3} strokeDasharray="6 6" />
          {raisins.map((r, i) => (
            <g key={i} transform={`translate(${r.x}, 730) rotate(${(hash(i * 3.3) - 0.5) * 50})`}>
              <ellipse rx={21} ry={15} fill="#5b2e17" stroke={r.mine ? C.gold : C.blue} strokeWidth={3} />
              <ellipse cx={-6} cy={-5} rx={7} ry={4} fill="#b06c3e" opacity={0.8} />
            </g>
          ))}
          <text x={460} y={836} textAnchor="middle" style={{fontFamily: FONT.sans, fontWeight: 900, fontSize: 30}} fill={C.gold}>
            提议者 <tspan style={{fontFamily: FONT.num, fontSize: 40}}>8</tspan>
          </text>
          <text x={788} y={836} textAnchor="middle" style={{fontFamily: FONT.sans, fontWeight: 900, fontSize: 30}} fill={C.blue}>
            回应者 <tspan style={{fontFamily: FONT.num, fontSize: 40}}>2</tspan>
          </text>
        </g>
      </svg>
      {/* 人类 vs 黑猩猩 */}
      <div style={{...row, top: 892, opacity: human, transform: `translateX(${(1 - human) * -40}px)`, border: `2px solid ${C.inkFaint}`}}>
        <div style={{width: 170, fontFamily: FONT.sans, fontWeight: 900, fontSize: 40, color: C.ink}}>人类</div>
        <div style={{width: 170, fontFamily: FONT.num, fontWeight: 700, fontSize: 46, color: C.inkDim}}>8 : 2</div>
        <div style={{flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 14}}>
          <Cross color={C.red} size={46} />
          <span style={{fontFamily: FONT.sans, fontWeight: 900, fontSize: 40, color: C.red}}>常常拒绝</span>
        </div>
      </div>
      <div
        style={{
          ...row,
          top: 1004,
          opacity: chimp,
          transform: `translateX(${(1 - chimp) * 40}px) scale(${1 + 0.03 * stamp})`,
          border: `${2 + stamp}px solid ${stamp > 0 ? C.amber : C.inkFaint}`,
          boxShadow: stamp > 0 ? `0 0 ${50 * stamp}px ${C.amber}66` : 'none',
        }}
      >
        <div style={{width: 170, fontFamily: FONT.sans, fontWeight: 900, fontSize: 40, color: C.amber}}>黑猩猩</div>
        <div style={{width: 170, fontFamily: FONT.num, fontWeight: 700, fontSize: 46, color: C.inkDim}}>8 : 2</div>
        <div style={{flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6}}>
          {DINGS.map((d) => (
            <div key={d} style={{opacity: prog(frame, d, d + 4), transform: `scale(${interpolate(prog(frame, d, d + 10, ease.back), [0, 1], [0.4, 1])})`}}>
              <Check color={C.coop} size={46} p={prog(frame, d, d + 8)} />
            </div>
          ))}
          <span style={{fontFamily: FONT.sans, fontWeight: 900, fontSize: 40, color: C.coop, marginLeft: 8}}>几乎全接受</span>
        </div>
      </div>
      <div style={{position: 'absolute', left: 0, right: 0, top: 440, display: 'flex', justifyContent: 'center'}}>
        <Stamp text="理性人" sub="RATIONAL MAXIMIZER" color={C.amber} p={stamp} rotate={-8} size={1.15} />
      </div>
    </AbsoluteFill>
  );
};
