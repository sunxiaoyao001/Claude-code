/**
 * 0:05 囚徒困境：两位玩家 + 2×2 收益矩阵
 *  逐格点亮 → “背叛占优”的红箭头 → 双双背叛的困境（本可以各拿 3 分）
 */
import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';
import {Kicker} from '../components/ui';
import {Token} from '../components/Token';
import {ease, envelope, prog} from '../lib/anim';
import type {Move} from '../math/ipd';
import {C, FONT, MOVE_COLOR} from '../theme';

const T0 = 150;
const T1 = 724;

// 矩阵几何：行 = 你，列 = 他
const GX = 250;
const GY = 744;
const CW = 300;
const CH = 196;

type Cell = {me: Move; op: Move; a: number; b: number; at: number; tone: string};
const CELLS: Cell[] = [
  {me: 'C', op: 'C', a: 3, b: 3, at: 323, tone: C.coop},
  {me: 'D', op: 'D', a: 1, b: 1, at: 401, tone: C.red},
  {me: 'D', op: 'C', a: 5, b: 0, at: 479, tone: C.red},
  {me: 'C', op: 'D', a: 0, b: 5, at: 500, tone: C.red},
];
const cellPos = (me: Move, op: Move) => ({x: GX + (op === 'C' ? 0 : CW), y: GY + (me === 'C' ? 0 : CH)});

/** 当前两位玩家的选择（随讲解变化） */
const choiceAt = (f: number): [Move | null, Move | null] => {
  if (f < 240) return [null, null];
  if (f < 321) {
    // 来回切换，表现“正在选”
    const k = Math.floor((f - 240) / 12) % 2;
    return [k ? 'D' : 'C', k ? 'C' : 'D'];
  }
  if (f < 399) return ['C', 'C'];
  if (f < 477) return ['D', 'D'];
  if (f < 498) return ['D', 'C'];
  if (f < 565) return ['C', 'D'];
  if (f < 643) return [Math.floor((f - 565) / 20) % 2 ? 'D' : 'C', null];
  return ['D', 'D'];
};

const activeCell = (f: number): Cell | null => {
  const [a, b] = choiceAt(f);
  if (!a || !b || f < 321) return null;
  return CELLS.find((c) => c.me === a && c.op === b) ?? null;
};

const ChoiceChip: React.FC<{m: Move | null; x: number; y: number}> = ({m, x, y}) => (
  <div
    style={{
      position: 'absolute',
      left: x - 90,
      top: y,
      width: 180,
      height: 64,
      borderRadius: 32,
      border: `3px solid ${m ? MOVE_COLOR[m] : C.inkFaint}`,
      background: m ? `${MOVE_COLOR[m]}22` : 'rgba(14,12,10,0.7)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: FONT.sans,
      fontWeight: 900,
      fontSize: 34,
      letterSpacing: '0.1em',
      color: m ? MOVE_COLOR[m] : C.inkDim,
      boxShadow: m ? `0 0 30px ${MOVE_COLOR[m]}55` : 'none',
    }}
  >
    {m === 'C' ? '合作' : m === 'D' ? '背叛' : '？'}
  </div>
);

export const DilemmaScene: React.FC = () => {
  const frame = useCurrentFrame();
  if (frame < T0 || frame >= T1) return null;
  const o = envelope(frame, T0, T1, 12, 10);
  const [me, op] = choiceAt(frame);
  const act = activeCell(frame);
  const avatarIn = prog(frame, 168, 190, ease.back);
  const gridIn = prog(frame, 300, 322, ease.out);
  const dom = envelope(frame, 565, 645, 10, 8);
  const trap = prog(frame, 645, 660, ease.out);

  return (
    <AbsoluteFill style={{opacity: o}}>
      <Kicker en="PRISONER'S DILEMMA" zh="囚徒困境" opacity={prog(frame, 160, 176)} y={290} color={C.coop} />

      {/* 两位玩家 */}
      <svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
        <g transform={`translate(250, 500) scale(${avatarIn})`}>
          <Token ch="你" color={C.gold} r={62} spin={frame * 0.4} />
        </g>
        <g transform={`translate(830, 500) scale(${avatarIn})`}>
          <Token ch="他" color={C.blue} r={62} spin={-frame * 0.4} />
        </g>
        <text x={540} y={512} textAnchor="middle" style={{fontFamily: FONT.num, fontWeight: 700, fontSize: 56}} fill={C.inkFaint} opacity={avatarIn}>
          VS
        </text>
      </svg>
      {frame >= 236 ? (
        <>
          <ChoiceChip m={me} x={250} y={598} />
          <ChoiceChip m={op} x={830} y={598} />
        </>
      ) : null}

      {/* 收益矩阵 */}
      <div style={{position: 'absolute', inset: 0, opacity: gridIn, transform: `translateY(${(1 - gridIn) * 40}px)`}}>
        <svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
          {/* 表头 */}
          {(['C', 'D'] as Move[]).map((m, i) => (
            <text key={`col${m}`} x={GX + CW * i + CW / 2} y={GY - 22} textAnchor="middle" style={{fontFamily: FONT.sans, fontWeight: 900, fontSize: 30}} fill={MOVE_COLOR[m]}>
              他{m === 'C' ? '合作' : '背叛'}
            </text>
          ))}
          {(['C', 'D'] as Move[]).map((m, i) => (
            <text key={`row${m}`} x={GX - 22} y={GY + CH * i + CH / 2} textAnchor="end" dominantBaseline="central" style={{fontFamily: FONT.sans, fontWeight: 900, fontSize: 30}} fill={MOVE_COLOR[m]}>
              你{m === 'C' ? '合作' : '背叛'}
            </text>
          ))}
          {/* 格子 */}
          {CELLS.map((c, i) => {
            const {x, y} = cellPos(c.me, c.op);
            const p = prog(frame, c.at, c.at + 10, ease.back);
            const isAct = act === c;
            const isTrapDD = c.me === 'D' && c.op === 'D' && trap > 0;
            const isTrapCC = c.me === 'C' && c.op === 'C' && trap > 0;
            const tone = isTrapCC ? C.gold : c.tone;
            return (
              <g key={i}>
                <rect
                  x={x + 6}
                  y={y + 6}
                  width={CW - 12}
                  height={CH - 12}
                  rx={18}
                  fill={isAct || isTrapDD ? `${tone}26` : 'rgba(16,14,12,0.78)'}
                  stroke={isAct || isTrapDD || isTrapCC ? tone : C.inkFaint}
                  strokeWidth={isAct || isTrapDD ? 4 : 2}
                  strokeDasharray={isTrapCC ? '10 8' : undefined}
                />
                {p > 0 ? (
                  <g transform={`translate(${x + CW / 2}, ${y + CH / 2 + 4}) scale(${p})`}>
                    <text x={-18} textAnchor="end" dominantBaseline="central" style={{fontFamily: FONT.num, fontWeight: 700, fontSize: 92}} fill={C.gold}>
                      {c.a}
                    </text>
                    <text x={0} textAnchor="middle" dominantBaseline="central" style={{fontFamily: FONT.num, fontWeight: 500, fontSize: 64}} fill={C.inkDim}>
                      :
                    </text>
                    <text x={18} textAnchor="start" dominantBaseline="central" style={{fontFamily: FONT.num, fontWeight: 700, fontSize: 92}} fill={C.blue}>
                      {c.b}
                    </text>
                  </g>
                ) : null}
              </g>
            );
          })}
          {/* 背叛占优：同一列里，从“合作”行指向“背叛”行 */}
          {dom > 0
            ? (['C', 'D'] as Move[]).map((col, i) => {
                const x = GX + CW * i + CW - 46;
                const y1 = GY + CH / 2 + 30;
                const y2 = GY + CH + CH / 2 - 30;
                const p = prog(frame, 570 + i * 22, 586 + i * 22, ease.out);
                const label = col === 'C' ? '5 > 3' : '1 > 0';
                return (
                  <g key={col} opacity={dom}>
                    <line x1={x} y1={y1} x2={x} y2={y1 + (y2 - y1) * p} stroke={C.red} strokeWidth={8} strokeLinecap="round" />
                    {p > 0.95 ? <path d={`M ${x - 16} ${y2 - 18} L ${x} ${y2 + 2} L ${x + 16} ${y2 - 18}`} fill="none" stroke={C.red} strokeWidth={8} strokeLinecap="round" strokeLinejoin="round" /> : null}
                    <g transform={`translate(${x - 70}, ${(y1 + y2) / 2})`} opacity={p}>
                      <rect x={-62} y={-26} width={124} height={52} rx={26} fill="rgba(30,8,6,0.92)" stroke={C.red} strokeWidth={2} />
                      <text textAnchor="middle" dominantBaseline="central" y={2} style={{fontFamily: FONT.num, fontWeight: 700, fontSize: 32}} fill={C.redHot}>
                        {label}
                      </text>
                    </g>
                  </g>
                );
              })
            : null}
        </svg>
        {/* 困境：本可以各拿 3 分 */}
        {trap > 0 ? (
          <div
            style={{
              position: 'absolute',
              left: GX + 20,
              top: GY + 2 * CH + 22,
              opacity: trap,
              transform: `translateY(${(1 - trap) * 12}px)`,
              fontFamily: FONT.sans,
              fontWeight: 900,
              fontSize: 30,
              color: C.gold,
              letterSpacing: '0.06em',
              padding: '8px 22px',
              borderRadius: 999,
              border: `2px dashed ${C.gold}`,
              background: 'rgba(20,14,6,0.85)',
            }}
          >
            本可以各拿 3 分
          </div>
        ) : null}
      </div>
      {/* 选择时的高光扫过 */}
      {act ? (
        <div
          style={{
            position: 'absolute',
            left: cellPos(act.me, act.op).x + 6,
            top: cellPos(act.me, act.op).y + 6,
            width: CW - 12,
            height: CH - 12,
            borderRadius: 18,
            boxShadow: `0 0 ${interpolate(Math.sin(frame * 0.3), [-1, 1], [20, 50])}px ${act.tone}88`,
            pointerEvents: 'none',
          }}
        />
      ) : null}
    </AbsoluteFill>
  );
};
