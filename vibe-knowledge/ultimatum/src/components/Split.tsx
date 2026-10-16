/**
 * 分钱：被一刀切开的钞票 + 分配条
 *  SplitNote：光刀从上到下划过 → 两半分开（左金 = 你，右蓝 = 他）→ 被拒绝时碎裂成灰
 *  SplitBar：横向分配条，拖动柄标出“你留多少 / 给他多少”，可显示接受或拒绝
 */
import React from 'react';
import {interpolate} from 'remotion';
import {ease, hash, prog} from '../lib/anim';
import {C, FONT} from '../theme';
import {Banknote} from './Props';

type NoteProps = {
  frame: number;
  w?: number;
  /** 你留下的比例（0~1） */
  share: number;
  cutAt: number;
  splitAt: number;
  rejectAt?: number;
  showLabels?: boolean;
};

export const SplitNote: React.FC<NoteProps> = ({frame, w = 600, share, cutAt, splitAt, rejectAt = 1e9, showLabels = true}) => {
  const h = w * 0.46;
  const cut = prog(frame, cutAt, cutAt + 7, ease.out);
  const split = prog(frame, splitAt, splitAt + 14, ease.out);
  const gap = 70 * split;
  const rej = prog(frame, rejectAt, rejectAt + 26);
  const shake = rej > 0 && rej < 0.3 ? (hash(frame) - 0.5) * 16 : 0;
  const halfStyle = (side: 'L' | 'R'): React.CSSProperties => ({
    position: 'absolute',
    left: 0,
    top: 0,
    clipPath: side === 'L' ? `inset(0 ${(1 - share) * 100}% 0 0)` : `inset(0 0 0 ${share * 100}%)`,
    transform: `translateX(${(side === 'L' ? -1 : 1) * gap + shake}px) rotate(${(side === 'L' ? -1 : 1) * split * 2}deg)`,
    opacity: 1 - prog(rej, 0.15, 0.6),
  });
  const tint = (side: 'L' | 'R'): React.CSSProperties => ({
    position: 'absolute',
    inset: 0,
    background: side === 'L' ? C.gold : C.blue,
    mixBlendMode: 'soft-light',
    opacity: 0.55 * split,
    borderRadius: w * 0.04,
  });
  const cx = share * w;
  return (
    <div style={{position: 'relative', width: w, height: h}}>
      {(['L', 'R'] as const).map((side) => (
        <div key={side} style={halfStyle(side)}>
          <Banknote frame={frame} w={w} />
          <div style={tint(side)} />
        </div>
      ))}
      {/* 光刀 */}
      {cut > 0 && split < 1 ? (
        <div
          style={{
            position: 'absolute',
            left: cx - 3,
            top: -40,
            width: 6,
            height: (h + 80) * cut,
            borderRadius: 3,
            background: '#fff',
            boxShadow: `0 0 20px #fff, 0 0 50px ${C.goldHot}`,
            opacity: 1 - split,
          }}
        />
      ) : null}
      {/* 碎裂成灰 */}
      {rej > 0
        ? Array.from({length: 80}).map((_, i) => {
            const x0 = hash(i * 3.1) * w;
            const y0 = hash(i * 7.3) * h;
            const side = x0 < cx ? -1 : 1;
            const t = rej;
            const x = x0 + side * gap + (hash(i * 1.7) - 0.5) * 160 * t;
            const y = y0 + 420 * t * t + (hash(i * 5.9) - 0.5) * 40 * t;
            const s = 6 + hash(i * 2.3) * 18;
            return (
              <div
                key={i}
                style={{
                  position: 'absolute',
                  left: x,
                  top: y,
                  width: s,
                  height: s * 0.7,
                  background: i % 4 === 0 ? C.red : i % 2 ? '#14594a' : '#0f3b33',
                  transform: `rotate(${hash(i) * 360 + t * 300}deg)`,
                  opacity: Math.min(1, t * 6) * (1 - prog(t, 0.6, 1)),
                }}
              />
            );
          })
        : null}
      {/* 份额标签 */}
      {showLabels && split > 0 ? (
        <>
          <div
            style={{
              position: 'absolute',
              left: cx / 2 - 120 - gap,
              width: 240,
              top: -96,
              textAlign: 'center',
              opacity: split * (1 - rej),
              fontFamily: FONT.num,
              fontWeight: 700,
              fontSize: 64,
              color: C.gold,
            }}
          >
            <span style={{fontFamily: FONT.sans, fontWeight: 900, fontSize: 34, marginRight: 10}}>你</span>
            {Math.round(share * 100)}
          </div>
          <div
            style={{
              position: 'absolute',
              left: cx + (w - cx) / 2 - 120 + gap,
              width: 240,
              top: -96,
              textAlign: 'center',
              opacity: split * (1 - rej),
              fontFamily: FONT.num,
              fontWeight: 700,
              fontSize: 64,
              color: C.blue,
            }}
          >
            <span style={{fontFamily: FONT.sans, fontWeight: 900, fontSize: 34, marginRight: 10}}>他</span>
            {Math.round((1 - share) * 100)}
          </div>
        </>
      ) : null}
    </div>
  );
};

type BarProps = {
  /** 你留下的金额（0~100） */
  keep: number;
  w?: number;
  h?: number;
  state?: 'pending' | 'accept' | 'reject';
  stateP?: number;
  leftLabel?: string;
  rightLabel?: string;
};

export const SplitBar: React.FC<BarProps> = ({keep, w = 860, h = 64, state = 'pending', stateP = 0, leftLabel = '你', rightLabel = '他'}) => {
  const give = 100 - keep;
  const x = (keep / 100) * w;
  const rejected = state === 'reject' ? stateP : 0;
  const accepted = state === 'accept' ? stateP : 0;
  return (
    <div style={{position: 'relative', width: w, height: h + 90}}>
      <div style={{position: 'absolute', left: 0, top: 0, width: Math.max(x, 140), fontFamily: FONT.num, fontWeight: 700, fontSize: 48, color: C.gold, whiteSpace: 'nowrap'}}>
        <span style={{fontFamily: FONT.sans, fontWeight: 900, fontSize: 28, marginRight: 8}}>{leftLabel}</span>
        {Math.round(keep)}
      </div>
      <div style={{position: 'absolute', right: 0, top: 0, textAlign: 'right', fontFamily: FONT.num, fontWeight: 700, fontSize: 48, color: C.blue, whiteSpace: 'nowrap'}}>
        <span style={{fontFamily: FONT.sans, fontWeight: 900, fontSize: 28, marginRight: 8}}>{rightLabel}</span>
        {Math.round(give)}
      </div>
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 74,
          width: w,
          height: h,
          borderRadius: h / 2,
          overflow: 'hidden',
          background: C.inkFaint,
          boxShadow: accepted > 0 ? `0 0 ${40 * accepted}px ${C.coop}88` : rejected > 0 ? `0 0 ${40 * rejected}px ${C.red}88` : 'none',
          outline: accepted > 0 ? `3px solid ${C.coop}` : rejected > 0 ? `3px solid ${C.red}` : 'none',
        }}
      >
        <div style={{position: 'absolute', left: 0, top: 0, bottom: 0, width: x, background: `linear-gradient(90deg, #b07a1c, ${C.gold})`, opacity: 1 - 0.7 * rejected}} />
        <div style={{position: 'absolute', left: x, top: 0, bottom: 0, right: 0, background: `linear-gradient(90deg, ${C.blue}, #3b6f99)`, opacity: 1 - 0.7 * rejected}} />
        {rejected > 0 ? (
          <svg width={w} height={h} style={{position: 'absolute', inset: 0}}>
            <path d={`M ${w * 0.2} 0 L ${w * 0.28} ${h * 0.5} L ${w * 0.24} ${h} M ${w * 0.62} 0 L ${w * 0.56} ${h * 0.55} L ${w * 0.66} ${h}`} stroke={C.red} strokeWidth={5} fill="none" opacity={rejected} />
          </svg>
        ) : null}
      </div>
      {/* 拖动柄 */}
      <div
        style={{
          position: 'absolute',
          left: x - 24,
          top: 74 + h / 2 - 24,
          width: 48,
          height: 48,
          borderRadius: 24,
          background: '#fff',
          boxShadow: `0 0 24px rgba(255,255,255,0.8)`,
          opacity: 1 - rejected,
        }}
      />
    </div>
  );
};

/** 接受 / 拒绝 按钮 */
export const Verdict: React.FC<{kind: 'accept' | 'reject'; p: number; active?: number; size?: number}> = ({kind, p, active = 0, size = 1}) => {
  const col = kind === 'accept' ? C.coop : C.red;
  return (
    <div
      style={{
        width: 300 * size,
        height: 110 * size,
        borderRadius: 55 * size,
        border: `${3 * size}px solid ${col}`,
        background: active > 0 ? `${col}33` : 'rgba(14,12,16,0.85)',
        boxShadow: active > 0 ? `0 0 ${50 * active}px ${col}88` : 'none',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16 * size,
        fontFamily: FONT.sans,
        fontWeight: 900,
        fontSize: 46 * size,
        color: col,
        opacity: Math.min(1, p),
        transform: `scale(${interpolate(Math.min(1, p), [0, 1], [0.7, 1]) * (1 + 0.06 * active)})`,
        letterSpacing: '0.12em',
      }}
    >
      {kind === 'accept' ? '接受' : '拒绝'}
    </div>
  );
};
