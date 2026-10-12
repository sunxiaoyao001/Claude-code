import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';
import {Backdrop} from '../components/Look';
import {C, F, ease} from '../theme';
import {Bokeh, Dust} from '../components/Atmosphere';
import {prog} from '../lib/math';

// 151 minutes a day (CNSA 2024 report) → 55,115 minutes a year → 38.3 days.
const MONTH_DAYS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
const FIRST_DOW = [1, 4, 4, 0, 2, 5, 0, 3, 6, 1, 4, 6]; // 2024-ish layout, Monday-first offsets
const LOST = 38;

export const StatScene: React.FC = () => {
  const frame = useCurrentFrame();

  // ---- act 1: the clock ----
  const sweep = prog(frame, 6, 96, ease.inOut); // 0..1 → 151 minutes
  const minutes = sweep * 151;
  const count = Math.round(minutes);
  const clockOut = prog(frame, 116, 26, ease.in);
  const clockIn = prog(frame, 0, 18, ease.out);

  // ---- act 2: the year ----
  const gridIn = prog(frame, 118, 30, ease.out);
  const fillStart = 150;

  return (
    <AbsoluteFill style={{background: C.void, overflow: 'hidden'}}>
      <Backdrop bg={`radial-gradient(ellipse 70% 70% at 50% 45%, #0e1322 0%, #06070d 55%, ${C.void} 100%)`} />
      <Bokeh seed="statbk" count={18} colors={[[255, 181, 71], [90, 120, 255]]} opacity={0.22} drift={0.5} />
      {clockOut < 1 ? (
        <AbsoluteFill
          style={{
            opacity: clockIn * (1 - clockOut),
            transform: `translateY(${-clockOut * 120}px) scale(${0.94 + clockIn * 0.06 - clockOut * 0.1})`,
            filter: clockOut > 0.01 ? `blur(${clockOut * 10}px)` : undefined,
          }}
        >
          <Clock x={640} y={500} r={290} minutes={minutes} />
          <div style={{position: 'absolute', left: 1040, top: 270, width: 760}}>
            <div style={{fontFamily: F.sans, fontSize: 32, color: C.inkDim, letterSpacing: '0.2em'}}>人均每天</div>
            <div
              style={{
                fontFamily: F.serif,
                fontWeight: 900,
                fontSize: 300,
                lineHeight: 1,
                marginTop: 10,
                background: 'linear-gradient(180deg, #fff1cf 0%, #ffc15a 55%, #ff8a1f 100%)',
                WebkitBackgroundClip: 'text',
                backgroundClip: 'text',
                color: 'transparent',
                filter: 'drop-shadow(0 0 30px rgba(255,150,40,0.35))',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {count}
            </div>
            <div style={{fontFamily: F.sans, fontWeight: 500, fontSize: 52, color: C.ink, letterSpacing: '0.12em', marginTop: 4}}>
              分钟 <span style={{color: C.inkFaint, fontWeight: 300}}>/ 天</span>
            </div>
          </div>
        </AbsoluteFill>
      ) : null}

      {gridIn > 0 ? (
        <AbsoluteFill style={{opacity: gridIn}}>
          <div style={{position: 'absolute', inset: 0, perspective: 1600, perspectiveOrigin: '50% 30%'}}>
            <div
              style={{
                position: 'absolute',
                left: 200,
                top: 215,
                width: 1400,
                height: 600,
                transform: `rotateX(${interpolate(frame, [118, 250], [48, 38], {extrapolateLeft: 'clamp'})}deg) rotateZ(${interpolate(frame, [118, 250], [-6, -2], {extrapolateLeft: 'clamp'})}deg) translateY(${(1 - gridIn) * 80}px)`,
                transformStyle: 'preserve-3d',
              }}
            >
              {MONTH_DAYS.map((days, m) => {
                const mx = (m % 6) * 238;
                const my = Math.floor(m / 6) * 300;
                let dayOfYear = MONTH_DAYS.slice(0, m).reduce((a, b) => a + b, 0);
                return (
                  <div key={m} style={{position: 'absolute', left: mx, top: my, width: 220, height: 280, transformStyle: 'preserve-3d'}}>
                    <div style={{fontFamily: F.sans, fontWeight: 500, fontSize: 24, color: 'rgba(238,241,248,0.55)', letterSpacing: '0.1em', marginBottom: 10}}>{m + 1}月</div>
                    {new Array(days).fill(0).map((__, d) => {
                      const cell = FIRST_DOW[m] + d;
                      const cx = (cell % 7) * 31;
                      const cy = 40 + Math.floor(cell / 7) * 38;
                      const doy = dayOfYear++;
                      const appear = prog(frame, 122 + doy * 0.08, 10, ease.out);
                      const lost = doy < LOST;
                      const lit = lost ? prog(frame, fillStart + doy * 1.6, 8, ease.out) : 0;
                      const rise = lost ? prog(frame, fillStart + LOST * 1.6 + 6, 30, ease.out) : 0;
                      return (
                        <div
                          key={d}
                          style={{
                            position: 'absolute',
                            left: cx,
                            top: cy,
                            width: 25,
                            height: 30,
                            borderRadius: 5,
                            opacity: appear,
                            background: lit > 0 ? `linear-gradient(180deg, rgba(255,226,160,${lit}) 0%, rgba(255,160,50,${lit}) 100%)` : 'rgba(150,170,220,0.12)',
                            border: lit > 0 ? 'none' : '1px solid rgba(160,180,230,0.16)',
                            boxShadow: lit > 0 ? `0 0 ${8 * lit}px rgba(255,160,50,${0.7 * lit})` : undefined,
                            transform: `translateZ(${rise * 26 + lit * 4}px)`,
                          }}
                        />
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
          <BigCount frame={frame} />
        </AbsoluteFill>
      ) : null}
      <div style={{position: 'absolute', right: 56, top: 44, fontFamily: F.sans, fontSize: 18, color: 'rgba(238,241,248,0.42)', letterSpacing: '0.06em'}}>
        数据：中国网络视听节目服务协会《中国网络视听发展研究报告（2024）》
      </div>
      <Dust seed="statdust" count={60} opacity={0.4} />
    </AbsoluteFill>
  );
};

const BigCount: React.FC<{frame: number}> = ({frame}) => {
  const t = prog(frame, 150, LOST * 1.6, ease.out);
  const n = Math.round(t * LOST);
  const show = prog(frame, 148, 14, ease.out);
  return (
    <div style={{position: 'absolute', right: 110, top: 700, textAlign: 'right', opacity: show, transform: `translateY(${(1 - show) * 20}px)`}}>
      <span
        style={{
          fontFamily: F.serif,
          fontWeight: 900,
          fontSize: 190,
          lineHeight: 1,
          background: 'linear-gradient(180deg, #fff1cf 0%, #ffc15a 55%, #ff8a1f 100%)',
          WebkitBackgroundClip: 'text',
          backgroundClip: 'text',
          color: 'transparent',
          filter: 'drop-shadow(0 0 30px rgba(255,150,40,0.45))',
        }}
      >
        {n}
      </span>
      <span style={{fontFamily: F.sans, fontWeight: 500, fontSize: 56, color: C.ink, marginLeft: 14, letterSpacing: '0.1em'}}>天</span>
    </div>
  );
};

/** A watch-face: brushed bezel, applied indices, swept-time glow. */
const Clock: React.FC<{x: number; y: number; r: number; minutes: number}> = ({x, y, r, minutes}) => {
  const minAng = (minutes / 60) * 360;
  const hourAng = (minutes / 720) * 360 + 0;
  const laps = Math.floor(minutes / 60);
  const rem = (minutes % 60) / 60;
  const sector = (frac: number, rad: number) => {
    if (frac <= 0) return '';
    if (frac >= 1) return `M${x} ${y - rad} A${rad} ${rad} 0 1 1 ${x - 0.01} ${y - rad} Z`;
    const a = frac * Math.PI * 2;
    const ex = x + Math.sin(a) * rad;
    const ey = y - Math.cos(a) * rad;
    return `M${x} ${y} L${x} ${y - rad} A${rad} ${rad} 0 ${frac > 0.5 ? 1 : 0} 1 ${ex} ${ey} Z`;
  };
  return (
    <svg width={1920} height={1080} style={{position: 'absolute', inset: 0}}>
      <defs>
        <radialGradient id="clk-dial" cx="0.45" cy="0.4" r="0.7">
          <stop offset="0" stopColor="#1d2232" />
          <stop offset="1" stopColor="#090b12" />
        </radialGradient>
        <linearGradient id="clk-bezel" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#e8eaee" />
          <stop offset="0.3" stopColor="#7a7f88" />
          <stop offset="0.55" stopColor="#d4d7dc" />
          <stop offset="0.8" stopColor="#50545c" />
          <stop offset="1" stopColor="#babec5" />
        </linearGradient>
        <radialGradient id="clk-sweep">
          <stop offset="0.2" stopColor="#ffb547" stopOpacity="0.05" />
          <stop offset="1" stopColor="#ffb547" stopOpacity="0.4" />
        </radialGradient>
        <radialGradient id="clk-drop">
          <stop offset="0.6" stopColor="#000" stopOpacity="0.6" />
          <stop offset="1" stopColor="#000" stopOpacity="0" />
        </radialGradient>
      </defs>
      <ellipse cx={x} cy={y + 40} rx={r + 60} ry={r + 50} fill="url(#clk-drop)" />
      <circle cx={x} cy={y} r={r + 22} fill="url(#clk-bezel)" />
      <circle cx={x} cy={y} r={r + 6} fill="#05060a" />
      <circle cx={x} cy={y} r={r} fill="url(#clk-dial)" />
      {new Array(laps).fill(0).map((_, i) => (
        <path key={i} d={sector(1, r - 8)} fill="url(#clk-sweep)" opacity={0.5 + i * 0.2} />
      ))}
      <path d={sector(rem, r - 8)} fill="url(#clk-sweep)" />
      {new Array(60).fill(0).map((_, i) => {
        const a = (i / 60) * Math.PI * 2;
        const major = i % 5 === 0;
        const r1 = r - 18;
        const r2 = r - (major ? 52 : 30);
        return (
          <line
            key={i}
            x1={x + Math.sin(a) * r1}
            y1={y - Math.cos(a) * r1}
            x2={x + Math.sin(a) * r2}
            y2={y - Math.cos(a) * r2}
            stroke={major ? '#e9ecf3' : 'rgba(233,236,243,0.4)'}
            strokeWidth={major ? 6 : 2}
            strokeLinecap="round"
          />
        );
      })}
      {/* hour hand */}
      <g transform={`rotate(${hourAng} ${x} ${y})`}>
        <path d={`M${x - 9} ${y + 30} L${x - 6} ${y - r * 0.5} L${x} ${y - r * 0.56} L${x + 6} ${y - r * 0.5} L${x + 9} ${y + 30} Z`} fill="#e9ecf3" />
      </g>
      {/* minute hand */}
      <g transform={`rotate(${minAng} ${x} ${y})`}>
        <path d={`M${x - 6} ${y + 40} L${x - 4} ${y - r * 0.82} L${x} ${y - r * 0.88} L${x + 4} ${y - r * 0.82} L${x + 6} ${y + 40} Z`} fill="#ffc15a" style={{filter: 'drop-shadow(0 0 10px rgba(255,170,60,0.8))'}} />
      </g>
      <circle cx={x} cy={y} r={14} fill="#e9ecf3" />
      <circle cx={x} cy={y} r={6} fill="#ffb547" />
      {/* crystal reflection */}
      <path d={`M${x - r * 0.8} ${y - r * 0.3} A${r} ${r} 0 0 1 ${x + r * 0.3} ${y - r * 0.85} L${x + r * 0.2} ${y - r * 0.7} A${r * 0.85} ${r * 0.85} 0 0 0 ${x - r * 0.65} ${y - r * 0.25} Z`} fill="#fff" opacity={0.06} />
    </svg>
  );
};
