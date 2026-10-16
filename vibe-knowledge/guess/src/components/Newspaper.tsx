/**
 * 报纸卡片：风格化的报头 + 年份 + 一行数据（不模仿任何报纸的真实版式与标志）
 */
import React from 'react';
import {C, FONT} from '../theme';

const INK = '#1d1813';

export type Stat = {label: string; value: string; hot?: boolean};

export const Newspaper: React.FC<{
  masthead: string;
  place: string;
  year: string;
  title: string;
  stats: Stat[];
  p: number;
  focus?: number;
  w?: number;
}> = ({masthead, place, year, title, stats, p, focus = 1, w = 860}) => {
  if (p <= 0) return null;
  return (
    <div
      style={{
        width: w,
        borderRadius: 10,
        background: `linear-gradient(170deg, #f1e8d4, ${C.paper} 55%, #d9cdb1)`,
        boxShadow: `0 24px 60px rgba(0,0,0,0.55), 0 0 ${50 * focus}px rgba(246,188,72,${0.25 * focus})`,
        padding: '22px 34px 26px',
        boxSizing: 'border-box',
        color: INK,
        opacity: Math.min(1, p) * (0.45 + 0.55 * focus),
        transform: `translateX(${(1 - Math.min(1, p)) * 120}px) rotate(${(1 - Math.min(1, p)) * 6 - 1.5}deg) scale(${0.94 + 0.06 * focus})`,
      }}
    >
      {/* 报头 */}
      <div style={{display: 'flex', alignItems: 'baseline', justifyContent: 'space-between'}}>
        <span style={{fontFamily: FONT.serif, fontWeight: 900, fontSize: 46, letterSpacing: '0.08em'}}>{masthead}</span>
        <span style={{fontFamily: FONT.num, fontWeight: 700, fontSize: 40}}>{year}</span>
      </div>
      <div style={{height: 3, background: INK, marginTop: 6}} />
      <div style={{height: 1, background: INK, marginTop: 4, opacity: 0.7}} />
      <div style={{display: 'flex', justifyContent: 'space-between', marginTop: 10, fontFamily: FONT.sans, fontWeight: 700, fontSize: 24, opacity: 0.75}}>
        <span>{place}</span>
        <span>读者大赛</span>
      </div>
      <div style={{fontFamily: FONT.serif, fontWeight: 900, fontSize: 40, marginTop: 10}}>{title}</div>
      {/* 数据行 */}
      <div style={{display: 'flex', gap: 14, marginTop: 16}}>
        {stats.map((s, i) => (
          <div
            key={i}
            style={{
              flex: 1,
              borderRadius: 10,
              padding: '10px 14px',
              background: s.hot ? INK : 'rgba(29,24,19,0.08)',
              color: s.hot ? C.gold : INK,
              border: `2px solid ${s.hot ? INK : 'rgba(29,24,19,0.25)'}`,
            }}
          >
            <div style={{fontFamily: FONT.sans, fontWeight: 700, fontSize: 22, opacity: 0.8}}>{s.label}</div>
            <div style={{fontFamily: FONT.num, fontWeight: 700, fontSize: 54, lineHeight: 1.1}}>{s.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
};
