/**
 * 0:33 陷阱：竞价曲线 + 决策面板
 *  ① 曲线快速补齐到“他 100 / 你 95”
 *  ② 你的选择：放弃亏 95，加价到 105 赢了只亏 5 → 继续加价
 *  ③ 他的选择：放弃亏 100，加价到 110 只亏 10 → 继续加价
 *  ④ 理性的灾难：曲线越加越快冲向 245，Shepard 无限上升音，面板数字飞速滚动
 */
import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';
import {Check} from '../components/Props';
import {ease, envelope, prog} from '../lib/anim';
import {bidOf, bidderOf, decision, standing} from '../math/auction';
import {BID_AT, bidIndexAt, FACE, FINAL_K} from '../timeline';
import {C, FONT} from '../theme';

const T0 = 1010;
const T1 = 1652;

// 曲线几何
const X0 = 150;
const X1 = 960;
const YB = 860; // 0 元
const YT = 340; // 260 元
const MAXV = 260;
const xk = (k: number) => X0 + (k / 50) * (X1 - X0);
const yv = (v: number) => YB - (v / MAXV) * (YB - YT);

const Chart: React.FC<{frame: number}> = ({frame}) => {
  const k = bidIndexAt(frame);
  // 阶梯线：每个人的出价保持到他下一次加价
  const pts = (who: 'you' | 'him') => {
    const out: string[] = [];
    let cur = 0;
    for (let i = 1; i <= k; i++) {
      const prev = cur;
      if (bidderOf(i) === who) cur = bidOf(i);
      if (cur === 0) continue;
      if (prev !== cur && prev !== 0) out.push(`${xk(i).toFixed(1)},${yv(prev).toFixed(1)}`);
      out.push(`${xk(i).toFixed(1)},${yv(cur).toFixed(1)}`);
    }
    return out.join(' ');
  };
  const s = standing(k);
  const newest = k > 0 ? prog(frame, BID_AT[k], BID_AT[k] + 6, ease.back) : 0;
  const lossZone = prog(frame, 1020, 1040);
  return (
    <svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
      {/* 亏损区 */}
      <rect x={X0} y={YT} width={X1 - X0} height={yv(FACE) - YT} fill={C.red} opacity={0.08 * lossZone} />
      <text x={X0 + 16} y={YT + 34} style={{fontFamily: FONT.sans, fontWeight: 900, fontSize: 26}} fill={C.red} opacity={0.8 * lossZone}>
        亏损区：出价 &gt; 面值
      </text>
      {/* 坐标 */}
      {[0, 50, 100, 150, 200, 250].map((v) => (
        <g key={v}>
          <line x1={X0} x2={X1} y1={yv(v)} y2={yv(v)} stroke={C.ink} strokeOpacity={v === 0 ? 0.3 : 0.07} />
          <text x={X0 - 14} y={yv(v)} textAnchor="end" dominantBaseline="central" style={{fontFamily: FONT.num, fontSize: 22}} fill={C.inkDim}>
            {v}
          </text>
        </g>
      ))}
      {/* 面值线 */}
      <line x1={X0} x2={X1} y1={yv(FACE)} y2={yv(FACE)} stroke={C.coop} strokeWidth={3} strokeDasharray="12 8" />
      <text x={X1} y={yv(FACE) - 12} textAnchor="end" style={{fontFamily: FONT.sans, fontWeight: 900, fontSize: 24}} fill={C.coop}>
        面值 ¥100
      </text>
      {/* 两条出价线 */}
      <polyline points={pts('him')} fill="none" stroke={C.blue} strokeWidth={6} strokeLinejoin="round" strokeLinecap="round" />
      <polyline points={pts('you')} fill="none" stroke={C.gold} strokeWidth={6} strokeLinejoin="round" strokeLinecap="round" />
      {/* 最新一口 */}
      {k > 0 ? (
        <g transform={`translate(${xk(k)}, ${yv(bidOf(k))}) scale(${newest})`}>
          <circle r={14} fill={bidderOf(k) === 'you' ? C.gold : C.blue} />
          <circle r={26} fill="none" stroke={bidderOf(k) === 'you' ? C.gold : C.blue} strokeWidth={3} opacity={0.5} />
          <text x={-22} y={-30} textAnchor="end" style={{fontFamily: FONT.num, fontWeight: 700, fontSize: 40}} fill={bidderOf(k) === 'you' ? C.goldHot : C.blueHot}>
            {bidderOf(k) === 'you' ? '你' : '他'} {bidOf(k)}
          </text>
        </g>
      ) : null}
      {/* 拍卖师收入 */}
      <g transform={`translate(${X0 + 16}, ${YT + 80})`} opacity={lossZone}>
        <text style={{fontFamily: FONT.sans, fontWeight: 700, fontSize: 24}} fill={C.inkDim}>
          拍卖师已收
        </text>
        <text y={52} style={{fontFamily: FONT.num, fontWeight: 700, fontSize: 52}} fill={C.amber}>
          ¥{s.revenue}
        </text>
      </g>
    </svg>
  );
};

type Option = {title: string; value: string; note: string};

const OptionCard: React.FC<{opt: Option; color: string; x: number; p: number; chosen: number; dim: number}> = ({opt, color, x, p, chosen, dim}) => (
  <div
    style={{
      position: 'absolute',
      left: x,
      top: 940,
      width: 430,
      height: 250,
      borderRadius: 24,
      border: `${chosen > 0.5 ? 4 : 2}px solid ${chosen > 0.5 ? color : C.inkFaint}`,
      background: chosen > 0.5 ? `linear-gradient(160deg, ${color}2e, rgba(14,12,16,0.92) 70%)` : C.panel,
      boxShadow: chosen > 0.5 ? `0 0 ${60 * chosen}px ${color}66` : '0 12px 40px rgba(0,0,0,0.45)',
      padding: '22px 28px',
      opacity: p * (1 - 0.55 * dim),
      transform: `translateY(${(1 - p) * 40}px) scale(${1 + 0.04 * chosen})`,
    }}
  >
    <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between'}}>
      <div style={{fontFamily: FONT.sans, fontWeight: 900, fontSize: 36, color}}>{opt.title}</div>
      {chosen > 0.05 ? <Check color={color} size={48} p={chosen} /> : null}
    </div>
    <div style={{fontFamily: FONT.num, fontWeight: 700, fontSize: 100, lineHeight: 1.1, color}}>{opt.value}</div>
    <div style={{fontFamily: FONT.sans, fontWeight: 700, fontSize: 26, color: C.inkDim}}>{opt.note}</div>
  </div>
);

const yuan = (v: number) => (v >= 0 ? `+${v}` : `−${Math.abs(v)}`);

const Panel: React.FC<{frame: number}> = ({frame}) => {
  // 视角：谁在纠结
  type View = {head: string; quit: Option; raise: Option; choose: number; quitAt: number; raiseAt: number};
  let view: View | null = null;
  if (frame >= 1096 && frame < 1332) {
    const d = decision(95, 100);
    view = {
      head: '你的选择 · 你 95　他 100',
      quit: {title: '放弃', value: yuan(d.quit), note: '已经出的 95 元，白白亏掉'},
      raise: {title: '加价到 105', value: yuan(d.raiseAndWin), note: '如果赢了，只亏 5 元'},
      choose: prog(frame, 1268, 1282, ease.out),
      quitAt: 1100,
      raiseAt: 1182,
    };
  } else if (frame >= 1332 && frame < 1430) {
    const d = decision(100, 105);
    view = {
      head: '他的选择 · 他 100　你 105',
      quit: {title: '放弃', value: yuan(d.quit), note: '已经出的 100 元，白白亏掉'},
      raise: {title: '加价到 110', value: yuan(d.raiseAndWin), note: '如果赢了，只亏 10 元'},
      choose: prog(frame, 1388, 1400, ease.out),
      quitAt: 1336,
      raiseAt: 1350,
    };
  } else if (frame >= 1430 && frame < 1516) {
    view = {
      head: '规律',
      quit: {title: '放弃', value: '全亏', note: '亏掉自己全部的出价'},
      raise: {title: '加价', value: '少亏', note: '赢了，只亏超出面值的部分'},
      choose: prog(frame, 1470, 1484, ease.out),
      quitAt: 1432,
      raiseAt: 1440,
    };
  } else if (frame >= 1516) {
    const k = Math.max(22, Math.min(FINAL_K, bidIndexAt(frame)));
    const s = standing(k);
    const mine = Math.min(s.you, s.him);
    const theirs = Math.max(s.you, s.him);
    const d = decision(mine, theirs);
    const who = s.you < s.him ? '你' : '他';
    view = {
      head: `${who}的选择 · ${mine} vs ${theirs}`,
      quit: {title: '放弃', value: yuan(d.quit), note: `亏掉 ${mine} 元`},
      raise: {title: `加价到 ${theirs + 5}`, value: yuan(d.raiseAndWin), note: '赢了，少亏一点'},
      choose: 1,
      quitAt: 1516,
      raiseAt: 1516,
    };
  }
  if (!view) return null;
  const o = envelope(frame, 1096, T1, 8, 6);
  return (
    <AbsoluteFill style={{opacity: o}}>
      <div style={{position: 'absolute', top: 886, left: 0, right: 0, textAlign: 'center', fontFamily: FONT.sans, fontWeight: 900, fontSize: 30, color: C.ink, letterSpacing: '0.06em'}}>
        {view.head}
      </div>
      <OptionCard opt={view.quit} color={C.red} x={90} p={prog(frame, view.quitAt, view.quitAt + 10, ease.out)} chosen={0} dim={view.choose} />
      <OptionCard opt={view.raise} color={C.gold} x={560} p={prog(frame, view.raiseAt, view.raiseAt + 10, ease.out)} chosen={view.choose} dim={0} />
    </AbsoluteFill>
  );
};

export const TrapScene: React.FC = () => {
  const frame = useCurrentFrame();
  if (frame < T0 || frame >= T1) return null;
  const o = envelope(frame, T0, T1, 10, 8);
  const panic = prog(frame, 1516, 1540) * (0.6 + 0.4 * Math.sin(frame * 0.8));
  return (
    <AbsoluteFill style={{opacity: o}}>
      <div style={{position: 'absolute', top: 278, left: 0, right: 0, textAlign: 'center', fontFamily: FONT.mono, fontWeight: 700, fontSize: 24, letterSpacing: '0.4em', color: C.hud, opacity: prog(frame, 1014, 1030)}}>
        ESCALATION · 竞价曲线
      </div>
      <Chart frame={frame} />
      <Panel frame={frame} />
      {panic > 0 ? (
        <AbsoluteFill
          style={{
            boxShadow: `inset 0 0 ${160 * panic}px ${C.red}aa`,
            opacity: interpolate(frame, [1516, 1530, 1640, 1652], [0, 1, 1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}),
          }}
        />
      ) : null}
    </AbsoluteFill>
  );
};
