/**
 * CRT 终端窗口：1980 年电脑大赛的视觉母题
 * 琥珀色磷光字、逐字打出、闪烁光标、行高亮、开机时的亮线展开
 */
import React from 'react';
import {interpolate} from 'remotion';
import {ease, prog} from '../lib/anim';
import {C, FONT} from '../theme';

export type TermLine = {text: string; color?: string; indent?: number};

type Props = {
  frame: number;
  x: number;
  y: number;
  w: number;
  h: number;
  title: string;
  lines: TermLine[];
  /** 开机（亮线展开）开始帧 */
  boot: number;
  /** 开始打字的帧、每帧打几个字 */
  typeAt: number;
  cps?: number;
  /** 行高亮强度（0~1），按行号返回 */
  highlight?: (i: number) => number;
  fontSize?: number;
  lineNumbers?: boolean;
  opacity?: number;
};

export const Terminal: React.FC<Props> = ({
  frame,
  x,
  y,
  w,
  h,
  title,
  lines,
  boot,
  typeAt,
  cps = 1.2,
  highlight,
  fontSize = 40,
  lineNumbers = true,
  opacity = 1,
}) => {
  // CRT 开机：先是一条横亮线，再纵向展开
  const lineOpen = prog(frame, boot, boot + 6, ease.out);
  const open = prog(frame, boot + 4, boot + 14, ease.out);
  if (lineOpen <= 0) return null;

  let budget = Math.max(0, (frame - typeAt) * cps);
  const totalChars = lines.reduce((a, l) => a + [...l.text].length, 0);
  const typingDone = budget >= totalChars;
  let cursorLine = 0;

  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y + (h / 2) * (1 - open),
        width: w,
        height: Math.max(4, h * open),
        opacity,
        borderRadius: 18,
        overflow: 'hidden',
        background: 'linear-gradient(180deg, rgba(22,16,8,0.94), rgba(10,8,5,0.94))',
        border: `2px solid rgba(255,181,71,${0.25 + 0.35 * open})`,
        boxShadow: `0 0 ${60 * open}px rgba(255,181,71,0.18), inset 0 0 80px rgba(255,160,40,0.08)`,
        transform: `scaleX(${interpolate(lineOpen, [0, 1], [0.05, 1])})`,
      }}
    >
      {/* 标题栏 */}
      <div
        style={{
          height: 54,
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '0 22px',
          borderBottom: '1px solid rgba(255,181,71,0.22)',
          fontFamily: FONT.mono,
          fontWeight: 700,
          fontSize: 22,
          letterSpacing: '0.12em',
          color: 'rgba(255,181,71,0.75)',
        }}
      >
        {[0, 1, 2].map((i) => (
          <div key={i} style={{width: 12, height: 12, borderRadius: 6, background: i === 0 ? C.red : 'rgba(255,181,71,0.45)'}} />
        ))}
        <span style={{marginLeft: 10}}>{title}</span>
      </div>
      {/* 正文 */}
      <div style={{padding: '26px 34px', fontFamily: FONT.mono, fontSize, lineHeight: 1.62}}>
        {lines.map((l, i) => {
          const chars = [...l.text];
          const shown = Math.min(chars.length, Math.floor(budget));
          if (budget > 0 && shown < chars.length) cursorLine = i;
          if (shown === chars.length && budget > 0) cursorLine = i;
          budget -= chars.length;
          const hl = highlight ? highlight(i) : 0;
          if (shown <= 0 && !(i === 0 && frame >= typeAt)) return <div key={i} style={{height: fontSize * 1.62}} />;
          return (
            <div
              key={i}
              style={{
                position: 'relative',
                display: 'flex',
                gap: 22,
                color: l.color ?? C.amber,
                textShadow: `0 0 ${10 + 14 * hl}px ${l.color ?? C.amber}${hl > 0.1 ? 'cc' : '77'}`,
                whiteSpace: 'pre',
              }}
            >
              {hl > 0.01 ? (
                <div
                  style={{
                    position: 'absolute',
                    left: -34,
                    right: -34,
                    top: 0,
                    bottom: 0,
                    background: `linear-gradient(90deg, ${l.color ?? C.amber}${Math.round(hl * 46)
                      .toString(16)
                      .padStart(2, '0')}, transparent 85%)`,
                    borderLeft: `6px solid ${l.color ?? C.amber}`,
                    opacity: hl,
                  }}
                />
              ) : null}
              {lineNumbers ? <span style={{opacity: 0.4, position: 'relative'}}>{i + 1}</span> : null}
              <span style={{position: 'relative', paddingLeft: (l.indent ?? 0) * fontSize}}>
                {chars.slice(0, shown).join('')}
                {i === cursorLine && Math.floor(frame / 8) % 2 === 0 && !(typingDone && frame - typeAt > totalChars / cps + 40) ? (
                  <span style={{display: 'inline-block', width: fontSize * 0.55, height: fontSize, background: C.amber, verticalAlign: 'middle', marginLeft: 4}} />
                ) : null}
              </span>
            </div>
          );
        })}
      </div>
      {/* 屏幕弧面高光 + 扫描线 */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          background:
            'repeating-linear-gradient(0deg, rgba(0,0,0,0.22) 0 2px, transparent 2px 4px), radial-gradient(120% 90% at 50% 40%, transparent 60%, rgba(0,0,0,0.45))',
        }}
      />
    </div>
  );
};
