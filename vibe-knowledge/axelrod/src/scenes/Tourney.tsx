/**
 * 0:24 大赛：
 *  ① 连玩 200 次：两行出招珠串像跑马灯一样滚过
 *  ② 1980 年，阿克塞尔罗德发出邀请（CRT 打字）
 *  ③ 14 位专家的程序 + 1 个随机程序飞入环形赛场
 *  ④ 两两对战：105 条循环赛连线依次点亮，对决闪光在线上穿梭
 */
import React, {useMemo} from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';
import {Terminal} from '../components/Terminal';
import {ease, envelope, hash, prog} from '../lib/anim';
import {playMatch} from '../math/ipd';
import {C, FONT, MOVE_COLOR} from '../theme';

const T0 = 720;
const T1 = 1112;

/* ---------- ① 200 回合跑马灯 ---------- */
const Ticker: React.FC<{frame: number}> = ({frame}) => {
  const o = envelope(frame, 724, 812, 10, 10);
  const match = useMemo(() => playMatch('tft', 'random', 200, 3), []);
  if (o <= 0) return null;
  const round = Math.max(1, Math.min(200, Math.floor(interpolate(frame, [730, 800], [1, 200], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: ease.inOut}))));
  const pitch = 34;
  const headX = 900;
  return (
    <AbsoluteFill style={{opacity: o}}>
      <div style={{position: 'absolute', top: 330, left: 0, right: 0, textAlign: 'center'}}>
        <div style={{fontFamily: FONT.mono, fontWeight: 700, fontSize: 26, letterSpacing: '0.4em', color: C.inkDim}}>ROUND</div>
        <div style={{fontFamily: FONT.num, fontWeight: 700, fontSize: 200, lineHeight: 1, color: C.ink, textShadow: `0 0 50px ${C.coop}55`}}>
          {String(round).padStart(3, '0')}
          <span style={{fontSize: 80, color: C.inkDim}}> / 200</span>
        </div>
      </div>
      <svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
        <defs>
          <linearGradient id="tick-fade" x1="0" x2="1">
            <stop offset="0%" stopColor="#000" stopOpacity={1} />
            <stop offset="18%" stopColor="#000" stopOpacity={0} />
          </linearGradient>
        </defs>
        {(['a', 'b'] as const).map((row, k) => (
          <g key={row}>
            <text x={130} y={700 + k * 80} textAnchor="end" dominantBaseline="central" style={{fontFamily: FONT.sans, fontWeight: 900, fontSize: 32}} fill={k ? C.blue : C.gold}>
              {k ? '他' : '你'}
            </text>
            {match[row].slice(0, round).map((m, i) => {
              const x = headX - (round - 1 - i) * pitch;
              if (x < 150) return null;
              const fade = Math.min(1, (x - 150) / 160);
              return <circle key={i} cx={x} cy={700 + k * 80} r={13} fill={MOVE_COLOR[m]} opacity={fade} />;
            })}
          </g>
        ))}
        <line x1={headX + 26} y1={660} x2={headX + 26} y2={820} stroke={C.ink} strokeOpacity={0.5} strokeWidth={2} strokeDasharray="4 6" />
      </svg>
    </AbsoluteFill>
  );
};

/* ---------- ② 邀请函 ---------- */
const Invitation: React.FC<{frame: number}> = ({frame}) => {
  const o = envelope(frame, 806, 892, 8, 10);
  if (o <= 0) return null;
  return (
    <AbsoluteFill style={{opacity: o}}>
      <div style={{position: 'absolute', top: 300, left: 0, right: 0, textAlign: 'center'}}>
        <div
          style={{
            fontFamily: FONT.num,
            fontWeight: 700,
            fontSize: 230,
            lineHeight: 1,
            color: 'transparent',
            WebkitTextStroke: `3px ${C.gold}`,
            textShadow: `0 0 60px ${C.gold}44`,
            transform: `scale(${interpolate(prog(frame, 808, 830, ease.out), [0, 1], [1.2, 1])})`,
          }}
        >
          1980
        </div>
        <div style={{fontFamily: FONT.mono, fontWeight: 700, fontSize: 26, letterSpacing: '0.3em', color: C.inkDim, marginTop: 10}}>ROBERT AXELROD</div>
        <div style={{fontFamily: FONT.sans, fontWeight: 900, fontSize: 46, color: C.ink, marginTop: 8, letterSpacing: '0.08em'}}>
          罗伯特·阿克塞尔罗德 <span style={{fontWeight: 500, fontSize: 30, color: C.inkDim}}>政治学家</span>
        </div>
      </div>
      <Terminal
        frame={frame}
        x={150}
        y={760}
        w={780}
        h={330}
        title="INVITATION.TXT"
        boot={814}
        typeAt={824}
        cps={1.1}
        fontSize={36}
        lineNumbers={false}
        lines={[{text: '致各位博弈论专家：'}, {text: '请交一个程序，参加'}, {text: '囚徒困境循环赛。', color: C.coop}]}
      />
    </AbsoluteFill>
  );
};

/* ---------- ③④ 环形赛场 ---------- */
const ENTRANTS = ['Grofman', 'Rapoport', 'Davis', 'Feld', 'Shubik', 'Joss', 'Nydegger', 'Tullock', 'Friedman', '匿名', 'Tideman', 'Downing', 'Stein', 'Graaskamp', 'RANDOM'];
const CX = 540;
const CY = 790;
const RX = 360;
const RY = 400;
const slot = (i: number) => {
  const a = -Math.PI / 2 + (i / ENTRANTS.length) * Math.PI * 2;
  return {x: CX + RX * Math.cos(a), y: CY + RY * Math.sin(a)};
};
const arriveAt = (i: number) => (ENTRANTS[i] === 'RANDOM' ? 978 : 896 + i * 4);

const Ring: React.FC<{frame: number}> = ({frame}) => {
  const o = envelope(frame, 890, T1, 8, 8);
  if (o <= 0) return null;
  const pairs: [number, number][] = [];
  for (let i = 0; i < ENTRANTS.length; i++) for (let j = i + 1; j < ENTRANTS.length; j++) pairs.push([i, j]);
  const linesIn = (k: number) => prog(frame, 980 + (k / pairs.length) * 46, 992 + (k / pairs.length) * 46, ease.out);
  const question = prog(frame, 1052, 1066, ease.back);
  return (
    <AbsoluteFill style={{opacity: o}}>
      <svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
        <ellipse cx={CX} cy={CY} rx={RX} ry={RY} fill="none" stroke={C.ink} strokeOpacity={0.1} strokeWidth={2} strokeDasharray="4 10" />
        {/* 循环赛连线 */}
        {pairs.map(([i, j], k) => {
          const p = linesIn(k);
          if (p <= 0) return null;
          const a = slot(i);
          const b = slot(j);
          const hot = hash(k * 3.1 + Math.floor(frame / 6)) > 0.93;
          return (
            <line
              key={k}
              x1={a.x}
              y1={a.y}
              x2={a.x + (b.x - a.x) * p}
              y2={a.y + (b.y - a.y) * p}
              stroke={hot ? C.coop : C.hud}
              strokeOpacity={hot ? 0.75 : 0.16}
              strokeWidth={hot ? 3 : 1.5}
            />
          );
        })}
        {/* 在线上穿梭的对决光点 */}
        {frame > 995
          ? Array.from({length: 10}).map((_, k) => {
              const pair = pairs[Math.floor(hash(k * 7.7 + Math.floor((frame + k * 5) / 18)) * pairs.length)];
              const a = slot(pair[0]);
              const b = slot(pair[1]);
              const t = ((frame + k * 5) % 18) / 18;
              return <circle key={k} cx={a.x + (b.x - a.x) * t} cy={a.y + (b.y - a.y) * t} r={6} fill={k % 3 ? C.coopHot : C.redHot} />;
            })
          : null}
      </svg>
      {/* 中央计数 */}
      <div style={{position: 'absolute', left: CX - 220, width: 440, top: CY - 100, textAlign: 'center'}}>
        {frame < 1052 ? (
          <>
            <div style={{fontFamily: FONT.num, fontWeight: 700, fontSize: 120, lineHeight: 1, color: C.ink}}>
              14<span style={{color: C.inkDim, fontSize: 70}}>{frame >= 976 ? ' + 1' : ''}</span>
            </div>
            <div style={{fontFamily: FONT.sans, fontWeight: 700, fontSize: 30, color: C.inkDim, marginTop: 10, letterSpacing: '0.12em'}}>
              {frame >= 976 ? '两两对战 · 每场 200 回合' : '个参赛程序'}
            </div>
          </>
        ) : (
          <div
            style={{
              fontFamily: FONT.serif,
              fontWeight: 900,
              fontSize: 220,
              lineHeight: 1,
              color: C.gold,
              textShadow: `0 0 60px ${C.gold}88`,
              transform: `scale(${question})`,
            }}
          >
            ?
          </div>
        )}
      </div>
      {/* 参赛程序 */}
      {ENTRANTS.map((name, i) => {
        const at = arriveAt(i);
        const p = prog(frame, at, at + 12, ease.out);
        if (p <= 0) return null;
        const s = slot(i);
        const from = {x: CX + (s.x - CX) * 2.4, y: CY + (s.y - CY) * 2.4};
        const jitter = frame > 1052 ? (hash(frame * 0.7 + i) - 0.5) * 6 : 0;
        const isRandom = name === 'RANDOM';
        return (
          <div
            key={name}
            style={{
              position: 'absolute',
              left: from.x + (s.x - from.x) * p - 80 + jitter,
              top: from.y + (s.y - from.y) * p - 26,
              width: 160,
              height: 52,
              borderRadius: 26,
              border: `2px solid ${isRandom ? C.inkDim : C.hud}`,
              background: 'rgba(10,14,18,0.9)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontFamily: name === '匿名' ? FONT.sans : FONT.mono,
              fontWeight: 700,
              fontSize: 22,
              color: isRandom ? C.inkDim : C.ink,
              opacity: p,
              boxShadow: `0 0 18px ${C.hud}33`,
            }}
          >
            {name}
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

export const TourneyScene: React.FC = () => {
  const frame = useCurrentFrame();
  if (frame < T0 || frame >= T1) return null;
  return (
    <AbsoluteFill>
      <Ticker frame={frame} />
      <Invitation frame={frame} />
      <Ring frame={frame} />
    </AbsoluteFill>
  );
};
