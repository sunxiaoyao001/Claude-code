/**
 * 后期层：闪白 / 色散、倒带扫描线、胶片颗粒、暗角、顶部章节进度条
 */
import React, {useMemo} from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {ease, hash, prog} from '../lib/anim';
import {rewindAmount} from '../lib/world';
import {IMPACTS, SCENES} from '../timeline';
import {C, FONT} from '../theme';

/* ---------------- 闪白 ---------------- */
export const FlashLayer: React.FC = () => {
  const frame = useCurrentFrame();
  let flash = 0;
  for (const im of IMPACTS) {
    const d = frame - im.f;
    if (d >= 0 && d < 16) flash = Math.max(flash, im.flash * Math.exp(-d / 2.6));
  }
  if (flash < 0.01) return null;
  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(70% 55% at 50% 45%, rgba(255,250,238,${flash}), rgba(255,214,150,${flash * 0.65}))`,
        mixBlendMode: 'screen',
      }}
    />
  );
};

/* ---------------- 倒带 ---------------- */
export const RewindOverlay: React.FC = () => {
  const frame = useCurrentFrame();
  const rw = rewindAmount(frame);
  if (rw < 0.01) return null;
  return (
    <AbsoluteFill>
      <AbsoluteFill
        style={{
          backgroundImage: 'repeating-linear-gradient(0deg, rgba(255,255,255,0.06) 0 2px, transparent 2px 6px)',
          backgroundPosition: `0 ${frame * 9}px`,
          opacity: rw,
        }}
      />
      {/* 横向撕裂条 */}
      {Array.from({length: 5}).map((_, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: hash(frame * 1.7 + i * 13) * 1920,
            height: 6 + hash(i * 5 + frame) * 30,
            background: 'rgba(140,220,255,0.18)',
            transform: `translateX(${(hash(i + frame * 2.3) - 0.5) * 120}px)`,
            opacity: rw,
          }}
        />
      ))}
      <div
        style={{
          position: 'absolute',
          top: 300,
          right: 90,
          fontFamily: FONT.mono,
          fontWeight: 700,
          fontSize: 44,
          color: C.hud,
          letterSpacing: '0.1em',
          opacity: rw * (Math.floor(frame / 4) % 2 ? 1 : 0.6),
          textShadow: `0 0 18px ${C.hud}`,
        }}
      >
        ◀◀ REWIND
      </div>
    </AbsoluteFill>
  );
};

/* ---------------- 胶片颗粒 ---------------- */
export const Grain: React.FC = () => {
  const frame = useCurrentFrame();
  const tile = useMemo(() => {
    const c = document.createElement('canvas');
    c.width = 256;
    c.height = 256;
    const ctx = c.getContext('2d')!;
    const img = ctx.createImageData(256, 256);
    let s = 1234567;
    for (let i = 0; i < img.data.length; i += 4) {
      s = (s * 1103515245 + 12345) & 0x7fffffff;
      const v = (s >> 16) & 255;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
      img.data[i + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
    return c.toDataURL('image/png');
  }, []);
  // 每 3 帧换一次偏移、颗粒放大 2 倍：保留胶片质感，同时控制码率（抖音会二次压缩，细颗粒反而糊）
  const k = Math.floor(frame / 3);
  return (
    <AbsoluteFill
      style={{
        backgroundImage: `url(${tile})`,
        backgroundSize: '512px 512px',
        backgroundPosition: `${Math.floor(hash(k) * 512)}px ${Math.floor(hash(k + 99) * 512)}px`,
        imageRendering: 'auto',
        opacity: 0.05,
        mixBlendMode: 'overlay',
      }}
    />
  );
};

/* ---------------- 暗角 + 上下压暗（抖音 UI 安全区） ---------------- */
export const Vignette: React.FC = () => (
  <AbsoluteFill>
    <AbsoluteFill style={{background: 'radial-gradient(85% 60% at 50% 46%, transparent 55%, rgba(0,0,0,0.6) 100%)'}} />
    <AbsoluteFill
      style={{
        background:
          'linear-gradient(180deg, rgba(0,0,0,0.65) 0%, transparent 13%, transparent 80%, rgba(0,0,0,0.7) 100%)',
      }}
    />
  </AbsoluteFill>
);

/* ---------------- 顶部章节进度条 ---------------- */
const CHAPTERS = [
  {name: '规则', from: SCENES.cast.from, to: SCENES.question.from},
  {name: '抉择', from: SCENES.question.from, to: SCENES.twist.from},
  {name: '反转', from: SCENES.twist.from, to: SCENES.proof.from},
  {name: '证明', from: SCENES.proof.from, to: SCENES.caveat.from},
  {name: '启示', from: SCENES.caveat.from, to: SCENES.outro.from + SCENES.outro.dur},
];

export const TopBar: React.FC = () => {
  const frame = useCurrentFrame();
  const o = prog(frame, SCENES.cast.from, SCENES.cast.from + 16, ease.out);
  if (o <= 0) return null;
  const cur = CHAPTERS.findIndex((c) => frame >= c.from && frame < c.to);
  const W = 860;
  const gap = 10;
  const segW = (W - gap * (CHAPTERS.length - 1)) / CHAPTERS.length;
  return (
    <div style={{position: 'absolute', left: 110, top: 186, width: W, opacity: o}}>
      <div style={{display: 'flex', gap}}>
        {CHAPTERS.map((c, i) => {
          const p = prog(frame, c.from, c.to);
          return (
            <div key={i} style={{width: segW, height: 5, borderRadius: 3, background: 'rgba(244,238,227,0.16)', overflow: 'hidden'}}>
              <div style={{width: `${p * 100}%`, height: '100%', background: i === cur ? C.gold : 'rgba(244,238,227,0.7)'}} />
            </div>
          );
        })}
      </div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          marginTop: 16,
          fontFamily: FONT.sans,
          fontWeight: 700,
          fontSize: 26,
          color: C.inkDim,
          letterSpacing: '0.08em',
        }}
      >
        <span>
          <span style={{fontFamily: FONT.mono, color: C.gold}}>{String(Math.max(0, cur) + 1).padStart(2, '0')}</span>
          <span style={{margin: '0 12px', opacity: 0.4}}>/</span>
          <span style={{color: C.ink}}>{CHAPTERS[Math.max(0, cur)].name}</span>
        </span>
        <span>
          <span style={{fontFamily: FONT.mono, fontWeight: 700, color: C.ink}}>VIBE</span> 知识大赏 · 博弈论
        </span>
      </div>
    </div>
  );
};
