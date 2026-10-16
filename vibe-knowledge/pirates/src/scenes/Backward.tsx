/**
 * 0:26 倒着想（逆向归纳）
 *  一张从下往上长出来的表：1 人 → 2 人 → 3 人 → 4 人 → 5 人
 *  每一行：提方案的人（金框）、被收买的人（蓝框，比他下一轮多 1 枚）、投票结果；
 *  下一行的 0，就是上一行用 1 枚金币买到的那一票（弧形箭头 +1）
 *  最后：98 : 0 : 1 : 0 : 1，金币柱一边倒
 */
import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {CoinStack} from '../components/Coins';
import {Pirate} from '../components/Pirate';
import {ease, envelope, prog} from '../lib/anim';
import {FINAL, PIRATES, ROWS, needed} from '../math/pirates';
import {C, FONT} from '../theme';

const COLX = [300, 440, 580, 720, 860];
const rowY = (n: number) => 1040 - (n - 1) * 120; // n 个人那一行
const CW = 112;
const CH = 84;

/** 每一行的时间点：出现 / 收买 / 揭晓（投票） */
const ROW_T: Record<number, {show: number; bribe: number[]; done: number}> = {
  1: {show: 872, bribe: [], done: 880},
  2: {show: 952, bribe: [], done: 990},
  3: {show: 1032, bribe: [1112], done: 1192},
  4: {show: 1272, bribe: [1352], done: 1432},
  5: {show: 1512, bribe: [1672, 1690], done: 1756},
};

/** n 个人时，第 j 号海盗（1～5）的数额；不在场返回 null */
const cell = (n: number, j: number) => {
  const first = PIRATES - n + 1;
  if (j < first) return null;
  return ROWS[n - 1][j - first];
};

const Row: React.FC<{n: number; frame: number; dim: number}> = ({n, frame, dim}) => {
  const t = ROW_T[n];
  const p = prog(frame, t.show, t.show + 12, ease.out);
  if (p <= 0) return null;
  const y = rowY(n);
  const first = PIRATES - n + 1;
  const done = prog(frame, t.done, t.done + 10, ease.back);
  const yes = ROWS[n - 1].filter((v, i) => i === 0 || v > 0).length;
  // 被收买的人：按出场顺序对应 bribe 时间
  const bribed = ROWS[n - 1].map((v, i) => ({j: first + i, v})).filter((c, i) => i > 0 && c.v > 0);
  return (
    <g opacity={Math.min(1, p) * (1 - 0.7 * dim)}>
      <text x={60} y={y - 4} style={{fontFamily: FONT.sans, fontWeight: 900, fontSize: 36}} fill={C.ink}>
        {n} 人
      </text>
      <text x={60} y={y + 30} style={{fontFamily: FONT.sans, fontWeight: 700, fontSize: 24}} fill={done > 0 ? C.coop : C.inkDim}>
        {done > 0 ? `${yes} 票 ✓` : `需 ${needed(n)} 票`}
      </text>
      {COLX.map((x, k) => {
        const j = k + 1;
        const v = cell(n, j);
        if (v === null) {
          return (
            <text key={j} x={x} y={y + 12} textAnchor="middle" style={{fontFamily: FONT.num, fontWeight: 500, fontSize: 34}} fill={C.inkFaint}>
              —
            </text>
          );
        }
        const proposer = j === first;
        const bi = bribed.findIndex((b) => b.j === j);
        const bribeAt = bi >= 0 ? t.bribe[bi] ?? t.done : -1;
        const isBribed = bi >= 0 && frame >= bribeAt;
        const known = proposer ? frame >= t.done || n <= 2 : isBribed || frame >= t.done;
        const label = known ? String(v) : '?';
        const border = proposer ? C.gold : isBribed ? C.blue : C.inkFaint;
        const color = proposer ? C.goldHot : isBribed ? C.blueHot : v === 0 && known ? C.inkDim : C.ink;
        const glow = isBribed ? prog(frame, bribeAt, bribeAt + 10) : proposer && n === 5 ? prog(frame, t.done, t.done + 14) : 0;
        const vote = done > 0 ? (proposer || v > 0 ? 'yes' : 'no') : null;
        return (
          <g key={j}>
            <rect
              x={x - CW / 2}
              y={y - CH / 2}
              width={CW}
              height={CH}
              rx={14}
              fill={proposer ? 'rgba(246,188,72,0.14)' : isBribed ? 'rgba(116,189,235,0.14)' : C.panel}
              stroke={border}
              strokeWidth={proposer || isBribed ? 3 : 1.5}
              style={glow > 0 ? {filter: `drop-shadow(0 0 ${14 * glow}px ${border})`} : undefined}
            />
            <text x={x} y={y + 18} textAnchor="middle" style={{fontFamily: FONT.num, fontWeight: 700, fontSize: 50}} fill={color}>
              {label}
            </text>
            {vote ? (
              <g transform={`translate(${x + CW / 2 - 8}, ${y - CH / 2 + 4}) scale(${Math.min(1, done)})`}>
                <circle r={15} fill={vote === 'yes' ? '#0d2a24' : '#2a0f0d'} stroke={vote === 'yes' ? C.coop : C.red} strokeWidth={2.5} />
                {vote === 'yes' ? (
                  <path d="M -7 0 L -2 5 L 8 -5" fill="none" stroke={C.coop} strokeWidth={3.5} strokeLinecap="round" strokeLinejoin="round" />
                ) : (
                  <path d="M -5 -5 L 5 5 M 5 -5 L -5 5" fill="none" stroke={C.red} strokeWidth={3.5} strokeLinecap="round" />
                )}
              </g>
            ) : null}
          </g>
        );
      })}
    </g>
  );
};

/** 弧形箭头：下一行的 0 → 这一行的 1 */
const BribeArrow: React.FC<{n: number; j: number; at: number; frame: number}> = ({n, j, at, frame}) => {
  const p = prog(frame, at - 6, at + 8, ease.inOut);
  if (p <= 0) return null;
  const x = COLX[j - 1];
  const yLow = rowY(n - 1);
  const yUp = rowY(n);
  const d = `M ${x + 44} ${yLow - 30} C ${x + 100} ${yLow - 50} ${x + 100} ${yUp + 50} ${x + 50} ${yUp + 30}`;
  return (
    <g opacity={Math.min(1, p * 1.5)}>
      <path d={d} fill="none" stroke={C.blue} strokeWidth={4} strokeLinecap="round" pathLength={1} strokeDasharray={`${p} 1`} />
      <text x={x + 102} y={(yLow + yUp) / 2 + 10} style={{fontFamily: FONT.num, fontWeight: 700, fontSize: 30}} fill={C.blueHot} opacity={p}>
        +1
      </text>
    </g>
  );
};

/** 收尾：98 : 0 : 1 : 0 : 1 的金币柱 */
const Finale: React.FC<{frame: number}> = ({frame}) => {
  const o = envelope(frame, 1852, 2010, 10, 8);
  if (o <= 0) return null;
  const grow = prog(frame, 1858, 1900, ease.out);
  return (
    <svg width={1080} height={1920} style={{position: 'absolute', inset: 0, opacity: o}}>
      <text x={540} y={500} textAnchor="middle" style={{fontFamily: FONT.num, fontWeight: 700, fontSize: 96}} fill={C.gold} opacity={prog(frame, 1854, 1866)}>
        98 : 0 : 1 : 0 : 1
      </text>
      {COLX.map((x, k) => {
        const v = FINAL[k];
        const p = prog(frame, 1856 + k * 3, 1870 + k * 3, ease.back);
        return (
          <g key={k}>
            <CoinStack x={x} y={1000} amount={v} unit={5} w={84} slice={11} p={grow} />
            <text x={x} y={v > 0 ? 1000 - Math.ceil(v / 5) * 11 * grow - 34 : 960} textAnchor="middle" style={{fontFamily: FONT.num, fontWeight: 700, fontSize: v > 50 ? 84 : 46}} fill={v > 50 ? C.goldHot : v > 0 ? C.blueHot : C.inkDim}>
              {v}
            </text>
            <g transform={`translate(${x}, 1100) scale(${p})`}>
              <Pirate n={k + 1} r={44} captain={k === 0 ? 1 : 0} color={v > 0 && k > 0 ? C.blue : C.seaHot} />
            </g>
          </g>
        );
      })}
      <g opacity={prog(frame, 1880, 1894)}>
        <text x={COLX[0] - 34} y={600} textAnchor="start" style={{fontFamily: FONT.sans, fontWeight: 900, fontSize: 30}} fill={C.redHot}>
          ↓ 最可能被扔下海的人
        </text>
      </g>
    </svg>
  );
};

export const BackwardScene: React.FC = () => {
  const frame = useCurrentFrame();
  if (frame < 780 || frame >= 2010) return null;
  const o = envelope(frame, 780, 2010, 10, 10);
  const table = 1 - prog(frame, 1846, 1858);
  const zerosHot = prog(frame, 1592, 1604) * (1 - prog(frame, 1666, 1676));
  return (
    <AbsoluteFill style={{opacity: o}}>
      <div style={{position: 'absolute', top: 250, left: 0, right: 0, textAlign: 'center', fontFamily: FONT.mono, fontWeight: 700, fontSize: 24, letterSpacing: '0.4em', color: C.hud, opacity: prog(frame, 784, 798) * table}}>
        BACKWARD INDUCTION · 逆向归纳
      </div>
      {table > 0 ? (
        <svg width={1080} height={1920} style={{position: 'absolute', inset: 0, opacity: table}}>
          {/* 表头：1～5 号 */}
          {COLX.map((x, k) => {
            const p = prog(frame, 790 + k * 3, 804 + k * 3, ease.back);
            const isCaptain = k === 0 && frame >= 1756;
            return (
              <g key={k} transform={`translate(${x}, 420) scale(${p})`}>
                <Pirate n={k + 1} r={38} captain={isCaptain ? 1 : 0} />
              </g>
            );
          })}
          {/* 倒着想：自下而上的箭头 */}
          <g opacity={prog(frame, 792, 804)}>
            <line x1={1010} x2={1010} y1={1090} y2={1090 - 560 * prog(frame, 794, 840, ease.inOut)} stroke={C.gold} strokeWidth={5} strokeLinecap="round" />
            <path d={`M 1010 ${1080 - 560 * prog(frame, 794, 840, ease.inOut)} l -14 22 l 28 0 Z`} fill={C.gold} />
            <text x={1040} y={1140} textAnchor="end" style={{fontFamily: FONT.sans, fontWeight: 900, fontSize: 30}} fill={C.goldHot}>
              倒着想
            </text>
          </g>
          {/* 4 人方案里拿 0 的 3 号、5 号：高亮 */}
          {zerosHot > 0
            ? [3, 5].map((j) => (
                <rect key={j} x={COLX[j - 1] - CW / 2 - 8} y={rowY(4) - CH / 2 - 8} width={CW + 16} height={CH + 16} rx={18} fill="none" stroke={C.blue} strokeWidth={4} opacity={zerosHot * (0.6 + 0.4 * Math.sin(frame * 0.4))} />
              ))
            : null}
          {[1, 2, 3, 4, 5].map((n) => (
            <Row key={n} n={n} frame={frame} dim={n < 5 && frame >= 1756 ? prog(frame, 1756, 1770) : 0} />
          ))}
          <BribeArrow n={3} j={5} at={1112} frame={frame} />
          <BribeArrow n={4} j={4} at={1352} frame={frame} />
          <BribeArrow n={5} j={3} at={1672} frame={frame} />
          <BribeArrow n={5} j={5} at={1690} frame={frame} />
        </svg>
      ) : null}
      <Finale frame={frame} />
    </AbsoluteFill>
  );
};
