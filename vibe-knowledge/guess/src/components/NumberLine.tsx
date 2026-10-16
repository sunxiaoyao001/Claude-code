/**
 * 数轴：全片的主舞台
 *  Axis：0～100 的刻度轴（可从左到右画出来）
 *  Marker：竖直标记（白 = 平均数，金 = 目标 2/3）
 *  stackDots：把同一格里的数字往上叠成一列（点状直方图）
 * 全部画在 1080×1920 的整屏 SVG 坐标里，方便和其它元素组合。
 */
import React from 'react';
import {C, FONT} from '../theme';

export const X0 = 100;
export const X1 = 980;
/** 数值 → 横坐标 */
export const ax = (v: number) => X0 + (Math.max(0, Math.min(100, v)) / 100) * (X1 - X0);

export const Axis: React.FC<{y: number; p?: number; opacity?: number; labelEvery?: number}> = ({y, p = 1, opacity = 1, labelEvery = 10}) => {
  if (p <= 0) return null;
  const xEnd = X0 + (X1 - X0) * p;
  const ticks: React.ReactNode[] = [];
  for (let v = 0; v <= 100; v += 5) {
    const x = ax(v);
    if (x > xEnd + 0.5) break;
    const major = v % 50 === 0;
    const mid = v % 10 === 0;
    ticks.push(
      <g key={v}>
        <line x1={x} x2={x} y1={y - (major ? 16 : mid ? 11 : 6)} y2={y + (major ? 16 : mid ? 11 : 6)} stroke={C.ink} strokeOpacity={major ? 0.85 : mid ? 0.5 : 0.25} strokeWidth={major ? 3 : 2} />
        {v % labelEvery === 0 ? (
          <text x={x} y={y + 48} textAnchor="middle" style={{fontFamily: FONT.num, fontWeight: major ? 700 : 500, fontSize: major ? 30 : 24}} fill={major ? C.ink : C.inkDim}>
            {v}
          </text>
        ) : null}
      </g>,
    );
  }
  return (
    <g opacity={opacity}>
      <line x1={X0 - 10} x2={xEnd + 10} y1={y} y2={y} stroke={C.ink} strokeOpacity={0.6} strokeWidth={3} strokeLinecap="round" />
      {ticks}
    </g>
  );
};

/** 竖直标记：顶部三角 + 标签；p 控制从轴线向上长出 */
export const Marker: React.FC<{
  v: number;
  y: number;
  h: number;
  color: string;
  label?: string;
  sub?: string;
  p: number;
  width?: number;
  labelSize?: number;
}> = ({v, y, h, color, label, sub, p, width = 4, labelSize = 40}) => {
  if (p <= 0) return null;
  const x = ax(v);
  const top = y - h * Math.min(1, p);
  return (
    <g opacity={Math.min(1, p * 1.5)}>
      <line x1={x} x2={x} y1={y + 18} y2={top} stroke={color} strokeWidth={width} strokeLinecap="round" style={{filter: `drop-shadow(0 0 10px ${color})`}} />
      <path d={`M ${x - 14} ${top - 18} L ${x + 14} ${top - 18} L ${x} ${top} Z`} fill={color} />
      {label ? (
        <text x={x} y={top - 30} textAnchor="middle" style={{fontFamily: FONT.num, fontWeight: 700, fontSize: labelSize}} fill={color}>
          {label}
        </text>
      ) : null}
      {sub ? (
        <text x={x} y={top - 30 - labelSize} textAnchor="middle" style={{fontFamily: FONT.sans, fontWeight: 900, fontSize: 26}} fill={color} opacity={0.85}>
          {sub}
        </text>
      ) : null}
    </g>
  );
};

/** 叠点：同一格（bin）里的数字往上叠，返回每个数的行号 */
export const stackDots = (values: number[], bin = 2) => {
  const count = new Map<number, number>();
  return values.map((v) => {
    const b = Math.round(v / bin);
    const row = count.get(b) ?? 0;
    count.set(b, row + 1);
    return {v, row};
  });
};
