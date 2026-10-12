import React from 'react';

// Classic LED clock digits, segment by segment (a b c d e f g).
const MAP: Record<string, string> = {
  '0': 'abcdef',
  '1': 'bc',
  '2': 'abdeg',
  '3': 'abcdg',
  '4': 'bcfg',
  '5': 'acdfg',
  '6': 'acdefg',
  '7': 'abc',
  '8': 'abcdefg',
  '9': 'abcdfg',
};

const Digit: React.FC<{ch: string; x: number; w: number; h: number; on: string; off: string; t: number}> = ({ch, x, w, h, on, off, t}) => {
  const segs = MAP[ch] ?? '';
  const hh = h / 2;
  const skew = 0.1;
  const poly = (pts: [number, number][]) => pts.map(([px, py]) => `${x + px - py * skew},${py}`).join(' ');
  const S: Record<string, [number, number][]> = {
    a: [[t, 0], [w - t, 0], [w - 2 * t, t], [2 * t, t]],
    b: [[w, t], [w, hh - t / 2], [w - t, hh - t / 2 - t / 2], [w - t, 2 * t]],
    c: [[w, hh + t / 2], [w, h - t], [w - t, h - 2 * t], [w - t, hh + t]],
    d: [[2 * t, h - t], [w - 2 * t, h - t], [w - t, h], [t, h]],
    e: [[0, hh + t / 2], [t, hh + t], [t, h - 2 * t], [0, h - t]],
    f: [[0, t], [t, 2 * t], [t, hh - t], [0, hh - t / 2]],
    g: [[t, hh], [2 * t, hh - t / 2], [w - 2 * t, hh - t / 2], [w - t, hh], [w - 2 * t, hh + t / 2], [2 * t, hh + t / 2]],
  };
  return (
    <g>
      {Object.entries(S).map(([k, pts]) => (
        <polygon key={k} points={poly(pts)} fill={segs.includes(k) ? on : off} />
      ))}
    </g>
  );
};

export const SevenSeg: React.FC<{text: string; height?: number; on?: string; off?: string; colon?: boolean}> = ({
  text,
  height = 80,
  on = '#ff2a1f',
  off = 'rgba(255,40,30,0.07)',
  colon = true,
}) => {
  const w = height * 0.52;
  const t = height * 0.11;
  const gap = height * 0.2;
  let x = 0;
  const parts: React.ReactNode[] = [];
  for (const ch of text) {
    if (ch === ':') {
      parts.push(
        <g key={`c${x}`} opacity={colon ? 1 : 0.12}>
          <rect x={x + gap * 0.2} y={height * 0.28} width={t} height={t} fill={on} />
          <rect x={x + gap * 0.2 - height * 0.06} y={height * 0.66} width={t} height={t} fill={on} />
        </g>,
      );
      x += t + gap * 0.6;
    } else {
      parts.push(<Digit key={`d${x}`} ch={ch} x={x} w={w} h={height} on={on} off={off} t={t} />);
      x += w + gap;
    }
  }
  return (
    <svg width={x} height={height} viewBox={`0 0 ${x} ${height}`} style={{overflow: 'visible'}}>
      {parts}
    </svg>
  );
};
