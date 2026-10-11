/**
 * 屏幕空间叠层：钩子 / 登场 / 抛问题 / 直觉陷阱 / 反转 / 拆解 / 边界
 * （证明段与结尾段较复杂，见 Proof.tsx、Outro.tsx）
 */
import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';
import {Chip, Headline, Kicker} from '../components/ui';
import {KineticText} from '../components/KineticText';
import {countUp, ease, envelope, hash, prog} from '../lib/anim';
import {turnOf} from '../lib/world';
import {bingAfterKillingJia, bingAfterKillingYi} from '../math/truel';
import {C, FONT, PLAYERS} from '../theme';

/* ============================================================
 * 0:00 钩子 —— 三行字在 3 秒内把反常识结论砸到观众脸上
 * ========================================================== */
export const HookOverlay: React.FC = () => {
  const frame = useCurrentFrame();
  if (frame >= 152) return null;
  const lines = [
    {text: '三个枪手决斗', at: 2, size: 96, color: C.ink},
    {text: '枪法<r>最烂</r>的那个', at: 40, size: 96, color: C.ink},
    {text: '活下来的概率<g>最大</g>', at: 86, size: 104, color: C.ink},
  ];
  const out = prog(frame, 136, 150, ease.in);
  return (
    <AbsoluteFill style={{opacity: 1 - out}}>
      <div
        style={{
          position: 'absolute',
          top: 300,
          left: 0,
          right: 0,
          textAlign: 'center',
          fontFamily: FONT.mono,
          fontWeight: 700,
          fontSize: 26,
          letterSpacing: '0.5em',
          color: C.red,
          opacity: envelope(frame, 0, 150, 6, 6) * (Math.floor(frame / 5) % 2 ? 1 : 0.55),
        }}
      >
        ● THE TRUEL
      </div>
      <div style={{position: 'absolute', top: 1130, left: 0, right: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14}}>
        {lines.map((l, i) =>
          frame >= l.at ? (
            <KineticText
              key={i}
              text={l.text}
              frame={frame - l.at}
              duration={400}
              size={l.size}
              font={FONT.serif}
              weight={900}
              mode="slam"
              stagger={1.6}
              letterSpacing="0.04em"
              lineHeight={1.15}
              style={{opacity: i < 2 && frame > 86 ? 0.82 : 1}}
            />
          ) : (
            <div key={i} style={{height: l.size * 1.15}} />
          ),
        )}
      </div>
    </AbsoluteFill>
  );
};

/* ============================================================
 * 0:05 登场 + 规则
 * ========================================================== */
export const CastOverlay: React.FC = () => {
  const frame = useCurrentFrame();
  if (frame < 150 || frame >= 572) return null;
  const titleO = envelope(frame, 158, 418, 12, 12);
  const ruleO = envelope(frame, 420, 570, 10, 10);
  const turn = turnOf(frame);
  const order = ['bing', 'yi', 'jia'] as const;
  return (
    <AbsoluteFill>
      <div style={{position: 'absolute', top: 300, left: 0, right: 0, textAlign: 'center', opacity: titleO}}>
        <div style={{fontFamily: FONT.mono, fontWeight: 700, fontSize: 24, letterSpacing: '0.5em', color: C.gold}}>
          GAME THEORY · THE TRUEL
        </div>
        <div
          style={{
            fontFamily: FONT.serif,
            fontWeight: 900,
            fontSize: 92,
            color: C.ink,
            letterSpacing: '0.18em',
            marginTop: 8,
            transform: `scale(${interpolate(prog(frame, 158, 200, ease.out), [0, 1], [1.12, 1])})`,
            textShadow: '0 4px 30px rgba(0,0,0,0.8)',
          }}
        >
          三人决斗
        </div>
      </div>
      {/* 开枪顺序 */}
      <div style={{position: 'absolute', top: 310, left: 0, right: 0, textAlign: 'center', opacity: ruleO}}>
        <div style={{fontFamily: FONT.sans, fontWeight: 700, fontSize: 30, letterSpacing: '0.3em', color: C.inkDim}}>开枪顺序</div>
        <div style={{display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 26, marginTop: 14}}>
          {order.map((id, i) => {
            const active = turn?.who === id;
            return (
              <React.Fragment key={id}>
                <div
                  style={{
                    fontFamily: FONT.serif,
                    fontWeight: 900,
                    fontSize: 96,
                    color: active ? PLAYERS[id].color : C.inkDim,
                    transform: `scale(${active ? 1.12 : 0.92})`,
                    textShadow: active ? `0 0 40px ${PLAYERS[id].color}` : 'none',
                  }}
                >
                  {PLAYERS[id].name}
                </div>
                {i < 2 ? <div style={{fontFamily: FONT.sans, fontSize: 56, color: C.inkFaint}}>→</div> : null}
              </React.Fragment>
            );
          })}
          {/* 循环箭头：甲之后又轮到丙 */}
          <svg width={56} height={56} viewBox="-28 -28 56 56">
            <path d="M 16 -12 A 20 20 0 1 0 20 6" fill="none" stroke={C.inkFaint} strokeWidth={5} strokeLinecap="round" />
            <path d="M 8 -18 L 18 -12 L 10 -2" fill="none" stroke={C.inkFaint} strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </div>
    </AbsoluteFill>
  );
};

/* ============================================================
 * 0:19 抛问题 —— 你是丙，第一枪打谁？
 * ========================================================== */
export const QuestionOverlay: React.FC = () => {
  const frame = useCurrentFrame();
  if (frame < 600 || frame >= 760) return null;
  const chipsO = 1 - prog(frame, 744, 758);
  const timer = prog(frame, 672, 740);
  return (
    <AbsoluteFill>
      <Headline text="第一枪，你打谁？" from={604} to={758} y={300} size={92} stagger={2} />
      <div
        style={{
          position: 'absolute',
          top: 460,
          left: 0,
          right: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 18,
          opacity: chipsO,
        }}
      >
        <div style={{display: 'flex', gap: 18}}>
          <Chip label="A" text="打甲" color={C.red} appear={632} frame={frame} width={270} />
          <Chip label="B" text="打乙" color={C.blue} appear={642} frame={frame} width={270} />
          <Chip label="C" text="？？" color={C.gold} appear={652} frame={frame} dashed width={270} />
        </div>
        {/* 思考倒计时 */}
        <div style={{display: 'flex', alignItems: 'center', gap: 16, marginTop: 12, opacity: prog(frame, 666, 674)}}>
          <div style={{fontFamily: FONT.mono, fontWeight: 700, fontSize: 26, color: C.inkDim, letterSpacing: '0.2em'}}>THINK</div>
          <div style={{width: 360, height: 6, borderRadius: 3, background: C.inkFaint, overflow: 'hidden'}}>
            <div style={{width: `${(1 - timer) * 100}%`, height: '100%', background: C.gold}} />
          </div>
          <div style={{fontFamily: FONT.num, fontWeight: 700, fontSize: 40, color: C.gold, width: 30}}>
            {Math.max(1, 3 - Math.floor(timer * 3))}
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

/* ============================================================
 * 0:25 直觉陷阱 —— 两个假设 + 存活率暴跌
 * ========================================================== */
const CaseTag: React.FC<{frame: number; from: number; to: number; no: string; text: string; color: string}> = ({
  frame,
  from,
  to,
  no,
  text,
  color,
}) => {
  const o = envelope(frame, from, to, 10, 10);
  if (o <= 0) return null;
  return (
    <div
      style={{
        position: 'absolute',
        top: 300,
        left: 0,
        right: 0,
        display: 'flex',
        justifyContent: 'center',
        opacity: o,
        transform: `translateY(${(1 - prog(frame, from, from + 12, ease.out)) * -20}px)`,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 20,
          padding: '16px 34px',
          borderRadius: 999,
          border: `2px solid ${color}`,
          background: 'rgba(12,9,7,0.85)',
        }}
      >
        <span style={{fontFamily: FONT.mono, fontWeight: 700, fontSize: 26, color, letterSpacing: '0.2em'}}>{no}</span>
        <span style={{fontFamily: FONT.sans, fontWeight: 900, fontSize: 44, color: C.ink, letterSpacing: '0.06em'}}>{text}</span>
      </div>
    </div>
  );
};

const SurvivalReadout: React.FC<{frame: number; from: number; to: number; value: number}> = ({frame, from, to, value}) => {
  const o = envelope(frame, from, to, 8, 8);
  if (o <= 0) return null;
  const v = countUp(frame, from + 4, from + 30, 100, value * 100);
  const shake = frame - from < 34 && frame - from > 26 ? (hash(frame) - 0.5) * 10 : 0;
  return (
    <div
      style={{
        position: 'absolute',
        top: 1078,
        left: 0,
        right: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 28,
        opacity: o,
        transform: `translateX(${shake}px)`,
      }}
    >
      <div style={{textAlign: 'right'}}>
        <div style={{fontFamily: FONT.sans, fontWeight: 900, fontSize: 40, color: C.ink, letterSpacing: '0.1em'}}>丙的存活率</div>
        <div style={{width: 260, height: 8, borderRadius: 4, background: C.inkFaint, marginTop: 14, overflow: 'hidden', marginLeft: 'auto'}}>
          <div style={{width: `${v}%`, height: '100%', background: C.red, boxShadow: `0 0 16px ${C.red}`}} />
        </div>
      </div>
      <div
        style={{
          fontFamily: FONT.num,
          fontWeight: 700,
          fontSize: 164,
          lineHeight: 1,
          color: C.red,
          textShadow: `0 0 60px ${C.red}88`,
          minWidth: 300,
        }}
      >
        {v.toFixed(0)}
        <span style={{fontSize: 86}}>%</span>
      </div>
    </div>
  );
};

export const IntuitionOverlay: React.FC = () => {
  const frame = useCurrentFrame();
  if (frame < 750 || frame >= 1392) return null;
  return (
    <AbsoluteFill>
      <CaseTag frame={frame} from={758} to={1052} no="CASE 01" text="先打最强的甲" color={C.red} />
      <CaseTag frame={frame} from={1078} to={1270} no="CASE 02" text="先打乙" color={C.blue} />
      <SurvivalReadout frame={frame} from={996} to={1052} value={bingAfterKillingJia} />
      <SurvivalReadout frame={frame} from={1210} to={1270} value={bingAfterKillingYi} />
      <Headline text={'打得越准\n<r>死得越快</r>'} from={1272} to={1380} y={330} size={150} stagger={2.6} lineHeight={1.1} />
    </AbsoluteFill>
  );
};

/* ============================================================
 * 0:46 反转 —— 朝天开枪
 * ========================================================== */
export const TwistOverlay: React.FC = () => {
  const frame = useCurrentFrame();
  if (frame < 1384 || frame >= 1652) return null;
  const chipsO = envelope(frame, 1388, 1458, 8, 6);
  const crossA = prog(frame, 1400, 1412, ease.out);
  const crossB = prog(frame, 1410, 1422, ease.out);
  const cGlow = 0.5 + 0.5 * Math.sin(frame * 0.4);
  return (
    <AbsoluteFill>
      <div style={{position: 'absolute', top: 330, left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: 18, opacity: chipsO}}>
        <Chip label="A" text="打甲" color={C.red} appear={1386} frame={frame} crossed={crossA} width={270} />
        <Chip label="B" text="打乙" color={C.blue} appear={1388} frame={frame} crossed={crossB} width={270} />
        <Chip label="C" text="？？" color={C.gold} appear={1390} frame={frame} dashed glow={prog(frame, 1424, 1436) * cGlow} width={270} />
      </div>
      <GoldRain frame={frame} start={1462} />
      <Headline text="<g>朝天开枪</g>" from={1462} to={1646} y={330} size={196} stagger={3} kicker="FIRE  INTO  THE  AIR" />
    </AbsoluteFill>
  );
};

/** 子弹冲出画面顶端后洒下的金色火花 */
const GoldRain: React.FC<{frame: number; start: number}> = ({frame, start}) => {
  const d = frame - start;
  if (d < 0 || d > 170) return null;
  return (
    <AbsoluteFill>
      {Array.from({length: 110}).map((_, i) => {
        const delay = hash(i * 7.1) * 50;
        const t = (d - delay) / 30;
        if (t < 0) return null;
        const x0 = 690 + (hash(i * 3.3) - 0.5) * 140;
        const vx = (hash(i * 1.9) - 0.5) * 900;
        const vy = 200 + hash(i * 5.7) * 500;
        const x = x0 + vx * (1 - Math.exp(-t * 1.6)) * 0.7;
        const y = -20 + vy * t * 0.9 + 240 * t * t;
        const life = 1 - Math.min(1, t / (1.8 + hash(i) * 1.6));
        if (life <= 0 || y > 1950) return null;
        const size = 3 + hash(i * 9.2) * 6;
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: x,
              top: y,
              width: size,
              height: size * (2.4 + t),
              borderRadius: size,
              background: i % 4 === 0 ? '#fff4d6' : C.gold,
              boxShadow: `0 0 ${size * 3}px ${C.gold}`,
              opacity: life * (0.6 + 0.4 * Math.sin(frame * 0.8 + i)),
              transform: `rotate(${Math.atan2(vy, vx) * 0}deg)`,
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
};

/* ============================================================
 * 0:55 拆解 —— 威胁评估
 * ========================================================== */
export const LogicOverlay: React.FC = () => {
  const frame = useCurrentFrame();
  if (frame < 1650 || frame >= 2134) return null;
  const hudO = envelope(frame, 1656, 2046, 12, 10);
  return (
    <AbsoluteFill>
      <Kicker en="THREAT ANALYSIS" zh="威胁评估" opacity={hudO} y={300} color={C.hud} />
      <Headline text={'弱者最大的武器\n是<g>不被当成威胁</g>'} from={2050} to={2134} y={330} size={100} stagger={1.6} lineHeight={1.25} />
    </AbsoluteFill>
  );
};

/* ============================================================
 * 1:33 边界 —— 只剩两人时示弱失效
 * ========================================================== */
export const CaveatOverlay: React.FC = () => {
  const frame = useCurrentFrame();
  if (frame < 2790 || frame >= 3030) return null;
  const o = envelope(frame, 2800, 3024, 12, 6);
  const p = prog(frame, 2800, 2816, ease.back);
  return (
    <AbsoluteFill>
      <div style={{position: 'absolute', top: 290, left: 0, right: 0, textAlign: 'center', opacity: o}}>
        <div style={{fontFamily: FONT.mono, fontWeight: 700, fontSize: 24, letterSpacing: '0.42em', color: C.red}}>ENDGAME</div>
        <div
          style={{
            fontFamily: FONT.num,
            fontWeight: 700,
            fontSize: 150,
            lineHeight: 1.05,
            color: C.ink,
            letterSpacing: '0.06em',
            transform: `scale(${0.7 + 0.3 * p})`,
          }}
        >
          <span style={{color: C.gold}}>1</span>
          <span style={{fontSize: 90, margin: '0 26px', color: C.inkDim}}>V</span>
          <span style={{color: C.red}}>1</span>
        </div>
      </div>
    </AbsoluteFill>
  );
};
