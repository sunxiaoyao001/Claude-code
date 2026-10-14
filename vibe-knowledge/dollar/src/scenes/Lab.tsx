/**
 * 1:04 真实实验：
 *  ① 1971 · 马丁·舒比克设计“美元拍卖”，真实实验里成交价常常超过面值（示意曲线）
 *  ② 哈佛商学院巴泽曼教授的课堂：拍卖 20 美元；12～16 美元放缓，然后冲过 20；
 *     流传最广的一次拍到 204 美元（标注为广为流传的课堂轶事）
 */
import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';
import {Banknote} from '../components/Props';
import {ease, envelope, prog} from '../lib/anim';
import {C, FONT} from '../theme';

const T0 = 1920;
const T1 = 2334;

const Shubik: React.FC<{frame: number}> = ({frame}) => {
  const o = envelope(frame, 1924, 2090, 10, 8);
  if (o <= 0) return null;
  const draw = prog(frame, 2018, 2070, ease.inOut);
  // 示意：出价曲线越过“$1”面值线
  const pts: string[] = [];
  for (let i = 0; i <= 40; i++) {
    const t = i / 40;
    if (t > draw) break;
    const x = 170 + t * 740;
    const v = 0.05 + 1.9 * Math.pow(t, 1.7);
    pts.push(`${x.toFixed(1)},${(1150 - v * 150).toFixed(1)}`);
  }
  return (
    <AbsoluteFill style={{opacity: o}}>
      <div style={{position: 'absolute', top: 290, left: 0, right: 0, textAlign: 'center'}}>
        <div
          style={{
            fontFamily: FONT.num,
            fontWeight: 700,
            fontSize: 230,
            lineHeight: 1,
            color: 'transparent',
            WebkitTextStroke: `3px ${C.gold}`,
            textShadow: `0 0 60px ${C.gold}44`,
            transform: `scale(${interpolate(prog(frame, 1926, 1950, ease.out), [0, 1], [1.2, 1])})`,
          }}
        >
          1971
        </div>
        <div style={{fontFamily: FONT.mono, fontWeight: 700, fontSize: 26, letterSpacing: '0.3em', color: C.inkDim, marginTop: 8}}>MARTIN SHUBIK</div>
        <div style={{fontFamily: FONT.sans, fontWeight: 900, fontSize: 46, color: C.ink, marginTop: 6, letterSpacing: '0.06em'}}>
          马丁·舒比克 <span style={{fontWeight: 500, fontSize: 30, color: C.inkDim}}>耶鲁大学 · 经济学家</span>
        </div>
        <div style={{fontFamily: FONT.mono, fontWeight: 700, fontSize: 22, letterSpacing: '0.2em', color: C.gold, marginTop: 14}}>“THE DOLLAR AUCTION GAME”</div>
      </div>
      <svg width={1080} height={1920} style={{position: 'absolute', inset: 0, opacity: prog(frame, 2014, 2026)}}>
        <line x1={170} x2={910} y1={1000} y2={1000} stroke={C.coop} strokeWidth={3} strokeDasharray="12 8" />
        <text x={910} y={986} textAnchor="end" style={{fontFamily: FONT.sans, fontWeight: 900, fontSize: 24}} fill={C.coop}>
          面值 $1
        </text>
        <line x1={170} x2={910} y1={1150} y2={1150} stroke={C.inkFaint} strokeWidth={2} />
        <polyline points={pts.join(' ')} fill="none" stroke={C.red} strokeWidth={7} strokeLinecap="round" strokeLinejoin="round" />
        <text x={170} y={1186} style={{fontFamily: FONT.mono, fontSize: 20}} fill={C.inkDim}>
          示意：实验中的出价走势
        </text>
      </svg>
    </AbsoluteFill>
  );
};

/** 巴泽曼的 20 美元课堂：出价指针 */
const bazPrice = (f: number) => {
  if (f < 2176) return interpolate(f, [2100, 2176], [1, 12], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: ease.out});
  if (f < 2214) return interpolate(f, [2176, 2214], [12, 16], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  return interpolate(f, [2214, 2250], [16, 24], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: ease.in});
};

const Bazerman: React.FC<{frame: number}> = ({frame}) => {
  const o = envelope(frame, 2088, T1, 10, 8);
  if (o <= 0) return null;
  const price = bazPrice(frame);
  const record = prog(frame, 2256, 2268, ease.back);
  const X0 = 140;
  const X1 = 940;
  const px = (v: number) => X0 + (Math.min(v, 30) / 30) * (X1 - X0);
  return (
    <AbsoluteFill style={{opacity: o}}>
      <div style={{position: 'absolute', top: 284, left: 0, right: 0, textAlign: 'center'}}>
        <div style={{fontFamily: FONT.mono, fontWeight: 700, fontSize: 24, letterSpacing: '0.36em', color: C.hud}}>HARVARD BUSINESS SCHOOL</div>
        <div style={{fontFamily: FONT.sans, fontWeight: 900, fontSize: 46, color: C.ink, marginTop: 8, letterSpacing: '0.06em'}}>
          马克斯·巴泽曼 <span style={{fontWeight: 500, fontSize: 30, color: C.inkDim}}>课堂实验</span>
        </div>
      </div>
      <div style={{position: 'absolute', left: 300, top: 420, opacity: 1 - 0.6 * record}}>
        <Banknote frame={frame} w={480} value="$20" corner="20" label="二十" color={C.hud} spin={Math.sin(frame * 0.04) * 8} />
      </div>
      {/* 出价刻度 */}
      <svg width={1080} height={1920} style={{position: 'absolute', inset: 0, opacity: 1 - record}}>
        <rect x={px(12)} y={760} width={px(16) - px(12)} height={60} fill={C.amber} opacity={0.18} />
        <text x={(px(12) + px(16)) / 2} y={876} textAnchor="middle" style={{fontFamily: FONT.sans, fontWeight: 900, fontSize: 24}} fill={C.amber}>
          犹豫区 $12～16
        </text>
        <line x1={X0} x2={X1} y1={790} y2={790} stroke={C.inkFaint} strokeWidth={4} />
        <line x1={px(20)} x2={px(20)} y1={740} y2={840} stroke={C.coop} strokeWidth={4} />
        <text x={px(20)} y={872} textAnchor="middle" style={{fontFamily: FONT.sans, fontWeight: 900, fontSize: 24}} fill={C.coop}>
          面值 $20
        </text>
        {[0, 10, 20, 30].map((v) => (
          <text key={v} x={px(v)} y={830} textAnchor="middle" style={{fontFamily: FONT.num, fontSize: 22}} fill={C.inkDim}>
            {v}
          </text>
        ))}
        <line x1={X0} x2={px(price)} y1={790} y2={790} stroke={price > 20 ? C.red : C.gold} strokeWidth={8} strokeLinecap="round" />
        <circle cx={px(price)} cy={790} r={16} fill={price > 20 ? C.red : C.gold} />
        <text x={px(price)} y={720} textAnchor="middle" style={{fontFamily: FONT.num, fontWeight: 700, fontSize: 56}} fill={price > 20 ? C.redHot : C.goldHot}>
          ${Math.round(price)}
        </text>
      </svg>
      {/* 流传最广的纪录 */}
      {record > 0 ? (
        <div style={{position: 'absolute', left: 0, right: 0, top: 700, textAlign: 'center', transform: `scale(${record})`}}>
          <div style={{fontFamily: FONT.num, fontWeight: 700, fontSize: 230, lineHeight: 1, color: C.red, textShadow: `0 0 80px ${C.red}88`}}>$204</div>
          <div style={{display: 'inline-block', marginTop: 10, padding: '6px 22px', borderRadius: 999, border: `3px solid ${C.red}`, fontFamily: FONT.num, fontWeight: 700, fontSize: 40, color: C.redHot}}>
            ≈ 面值 × 10
          </div>
          <div style={{fontFamily: FONT.mono, fontSize: 20, color: C.inkDim, marginTop: 16, letterSpacing: '0.06em'}}>* 广为流传的课堂纪录，未见原始出处</div>
        </div>
      ) : null}
    </AbsoluteFill>
  );
};

export const LabScene: React.FC = () => {
  const frame = useCurrentFrame();
  if (frame < T0 || frame >= T1) return null;
  return (
    <AbsoluteFill>
      <Shubik frame={frame} />
      <Bazerman frame={frame} />
    </AbsoluteFill>
  );
};
