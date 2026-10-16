/**
 * 场景通用小部件：大标题、选项筹码、小标签
 */
import React from 'react';
import {useCurrentFrame} from 'remotion';
import {ease, envelope, prog} from '../lib/anim';
import {C, FONT} from '../theme';
import {KineticText} from './KineticText';

/** 屏幕空间的大标题（宋体重磅，砸入式） */
export const Headline: React.FC<{
  text: string;
  from: number;
  to: number;
  y: number;
  size: number;
  color?: string;
  mode?: 'slam' | 'rise';
  stagger?: number;
  lineHeight?: number;
  kicker?: string; // 标题上方的英文小字
  font?: string;
}> = ({text, from, to, y, size, color = C.ink, mode = 'slam', stagger = 2.2, lineHeight = 1.18, kicker, font = FONT.serif}) => {
  const frame = useCurrentFrame();
  if (frame < from || frame >= to) return null;
  const k = envelope(frame, from, to, 8, 8);
  return (
    <div style={{position: 'absolute', left: 60, right: 60, top: y, display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
      {kicker ? (
        <div
          style={{
            fontFamily: FONT.mono,
            fontWeight: 700,
            fontSize: 24,
            letterSpacing: '0.4em',
            color: C.inkDim,
            marginBottom: 18,
            opacity: k,
          }}
        >
          {kicker}
        </div>
      ) : null}
      <KineticText
        text={text}
        frame={frame - from}
        duration={to - from}
        size={size}
        maxWidth={960}
        font={font}
        weight={900}
        color={color}
        mode={mode}
        stagger={stagger}
        lineHeight={lineHeight}
        letterSpacing="0.02em"
      />
    </div>
  );
};

/** 选项筹码 */
export const Chip: React.FC<{
  label: string;
  text: string;
  color: string;
  appear: number;
  frame: number;
  dashed?: boolean;
  crossed?: number; // 0~1 划掉
  glow?: number;
  width?: number;
}> = ({label, text, color, appear, frame, dashed, crossed = 0, glow = 0, width = 290}) => {
  const p = prog(frame, appear, appear + 10, ease.back);
  return (
    <div
      style={{
        position: 'relative',
        width,
        height: 104,
        borderRadius: 52,
        border: `3px ${dashed ? 'dashed' : 'solid'} ${color}`,
        background: `linear-gradient(180deg, rgba(20,16,12,0.92), rgba(10,8,6,0.92))`,
        boxShadow: glow > 0 ? `0 0 ${50 * glow}px ${color}aa, inset 0 0 ${30 * glow}px ${color}55` : '0 10px 30px rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        gap: 18,
        padding: '0 26px',
        opacity: Math.min(1, p) * (1 - crossed * 0.55),
        transform: `translateY(${(1 - p) * 40}px) scale(${0.9 + 0.1 * p})`,
      }}
    >
      <div
        style={{
          width: 58,
          height: 58,
          borderRadius: 29,
          background: color,
          color: '#120d08',
          fontFamily: FONT.num,
          fontWeight: 700,
          fontSize: 36,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        {label}
      </div>
      <div style={{fontFamily: FONT.sans, fontWeight: 900, fontSize: 40, color: C.ink, whiteSpace: 'nowrap', letterSpacing: '0.04em'}}>
        {text}
      </div>
      {crossed > 0 ? (
        <div
          style={{
            position: 'absolute',
            left: 20,
            top: 50,
            height: 5,
            width: (width - 40) * crossed,
            background: C.red,
            borderRadius: 3,
            boxShadow: `0 0 12px ${C.red}`,
          }}
        />
      ) : null}
    </div>
  );
};

/** 小号 HUD 标签 */
export const Kicker: React.FC<{en: string; zh: string; color?: string; opacity: number; y: number}> = ({
  en,
  zh,
  color = C.gold,
  opacity,
  y,
}) => (
  <div style={{position: 'absolute', top: y, left: 0, right: 0, textAlign: 'center', opacity}}>
    <div style={{fontFamily: FONT.mono, fontWeight: 700, fontSize: 24, letterSpacing: '0.42em', color}}>{en}</div>
    <div style={{fontFamily: FONT.sans, fontWeight: 900, fontSize: 60, letterSpacing: '0.12em', color: C.ink, marginTop: 10}}>{zh}</div>
  </div>
);
