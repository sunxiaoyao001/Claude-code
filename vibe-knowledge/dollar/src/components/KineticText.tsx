/**
 * 逐字动画文本：字幕和大标题共用
 * - rise：自下而上浮现 + 去模糊（字幕）
 * - slam：放大砸入 + 动态模糊（钩子 / 重点句）
 */
import React from 'react';
import {interpolate} from 'remotion';
import {ease, prog} from '../lib/anim';
import {lineWidthEm, parseMarkup} from '../lib/markup';
import {C} from '../theme';

type Props = {
  text: string;
  frame: number; // 相对入场的帧
  duration: number; // 总时长（用于出场）
  size: number;
  maxWidth?: number; // 超宽时自动缩小字号
  font: string;
  weight?: number;
  color?: string;
  mode?: 'rise' | 'slam';
  stagger?: number;
  lineHeight?: number;
  letterSpacing?: string;
  glow?: boolean;
  align?: 'center' | 'left';
  exit?: number;
  style?: React.CSSProperties;
};

export const KineticText: React.FC<Props> = ({
  text,
  frame,
  duration,
  size,
  maxWidth,
  font,
  weight = 700,
  color = C.ink,
  mode = 'rise',
  stagger = 0.9,
  lineHeight = 1.32,
  letterSpacing = '0.04em',
  glow = true,
  align = 'center',
  exit = 7,
  style,
}) => {
  const lines = parseMarkup(text);
  const out = prog(frame, duration - exit, duration, ease.in);
  let idx = 0;

  return (
    <div
      style={{
        fontFamily: font,
        fontWeight: weight,
        color,
        lineHeight,
        letterSpacing,
        textAlign: align,
        opacity: 1 - out,
        transform: `translateY(${-14 * out}px)`,
        filter: out > 0 ? `blur(${out * 6}px)` : undefined,
        ...style,
      }}
    >
      {lines.map((line, li) => {
        const em = lineWidthEm(line) * 1.04;
        const fs = maxWidth ? Math.min(size, maxWidth / Math.max(1, em)) : size;
        return (
          <div key={li} style={{fontSize: fs, whiteSpace: 'nowrap'}}>
            {line.map((seg, si) => (
              <span key={si}>
                {[...seg.text].map((ch, ci) => {
                  const i = idx++;
                  const t = frame - i * stagger;
                  const p = prog(t, 0, mode === 'slam' ? 7 : 9, ease.out);
                  const segColor = seg.color ?? undefined;
                  const shadow = glow
                    ? seg.color
                      ? `0 0 ${fs * 0.5}px ${seg.color}88, 0 2px 0 rgba(0,0,0,.55)`
                      : `0 2px 0 rgba(0,0,0,.55), 0 0 ${fs * 0.6}px rgba(0,0,0,.85)`
                    : undefined;
                  const tr =
                    mode === 'slam'
                      ? `scale(${interpolate(p, [0, 1], [1.9, 1])}) translateY(${interpolate(p, [0, 1], [-10, 0])}px)`
                      : `translateY(${interpolate(p, [0, 1], [fs * 0.42, 0])}px)`;
                  return (
                    <span
                      key={ci}
                      style={{
                        display: 'inline-block',
                        color: segColor,
                        fontWeight: seg.strong ? Math.max(weight, 900) : undefined,
                        opacity: p,
                        transform: tr,
                        filter: p < 1 ? `blur(${(1 - p) * (mode === 'slam' ? 14 : 8)}px)` : undefined,
                        textShadow: shadow,
                        whiteSpace: 'pre',
                      }}
                    >
                      {ch}
                    </span>
                  );
                })}
              </span>
            ))}
          </div>
        );
      })}
    </div>
  );
};
