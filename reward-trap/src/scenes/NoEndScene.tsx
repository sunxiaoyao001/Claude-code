import React from 'react';
import {AbsoluteFill, interpolate, random, useCurrentFrame} from 'remotion';
import {Backdrop} from '../components/Look';
import {C, F, ease} from '../theme';
import {Bokeh, Dust} from '../components/Atmosphere';
import {CLIPS, CLIP_TINT, type ClipId} from '../components/phone/contents';
import {HeartIcon, CommentIcon} from '../components/phone/FeedUI';
import {prog} from '../lib/math';

const ORDER: ClipId[] = ['cat', 'ocean', 'neon', 'fireworks', 'aurora', 'galaxy', 'rain'];

/** A book reaching its last page and closing. */
const Book: React.FC<{frame: number}> = ({frame}) => {
  const close = prog(frame, 92, 30, ease.inOut);
  const endText = prog(frame, 40, 20, ease.out);
  const pageTurn = prog(frame, 14, 26, ease.inOut);
  return (
    <div style={{position: 'absolute', left: 250, top: 300, width: 620, height: 420, perspective: 1600}}>
      <div style={{position: 'absolute', inset: 0, transform: 'rotateX(48deg) rotateZ(-8deg)', transformStyle: 'preserve-3d'}}>
        {/* page block */}
        <div style={{position: 'absolute', left: 310, top: 0, width: 300, height: 410, background: 'linear-gradient(90deg, #d8cdb8 0%, #f1e9d8 8%, #efe6d3 100%)', borderRadius: '2px 8px 8px 2px', boxShadow: '0 30px 60px rgba(0,0,0,0.6)'}}>
          <div style={{position: 'absolute', left: 34, top: 40, right: 30}}>
            {new Array(9).fill(0).map((_, i) => (
              <div key={i} style={{height: 6, borderRadius: 3, background: 'rgba(60,45,30,0.22)', marginBottom: 16, width: `${i === 8 ? 40 : 88 + (i % 3) * 4}%`}} />
            ))}
          </div>
          <div style={{position: 'absolute', left: 0, right: 0, bottom: 56, textAlign: 'center', fontFamily: F.serif, fontWeight: 900, fontSize: 40, color: '#3b2a1a', opacity: endText, letterSpacing: '0.3em'}}>
            — 完 —
          </div>
        </div>
        {/* left page */}
        <div style={{position: 'absolute', left: 10, top: 0, width: 300, height: 410, background: 'linear-gradient(90deg, #efe6d3 0%, #f1e9d8 92%, #d8cdb8 100%)', borderRadius: '8px 2px 2px 8px'}}>
          <div style={{position: 'absolute', left: 30, top: 40, right: 34}}>
            {new Array(12).fill(0).map((_, i) => (
              <div key={i} style={{height: 6, borderRadius: 3, background: 'rgba(60,45,30,0.22)', marginBottom: 16, width: `${90 + (i % 2) * 6}%`}} />
            ))}
          </div>
        </div>
        {/* a page turning onto the left */}
        {pageTurn < 1 ? (
          <div style={{position: 'absolute', left: 310, top: 0, width: 300, height: 410, transformOrigin: '0 50%', transform: `rotateY(${-pageTurn * 180}deg)`, background: 'linear-gradient(90deg, #e9dfc9, #f4ecdc)', borderRadius: '2px 8px 8px 2px', backfaceVisibility: 'hidden', boxShadow: '-10px 0 30px rgba(0,0,0,0.15)'}} />
        ) : null}
        {/* the cover swings shut */}
        <div
          style={{
            position: 'absolute',
            left: 310,
            top: -6,
            width: 306,
            height: 422,
            transformOrigin: '0 50%',
            transform: `rotateY(${-180 + close * 180}deg) translateZ(2px)`,
            background: 'linear-gradient(135deg, #5a1c22 0%, #3a1015 60%, #24090c 100%)',
            borderRadius: '2px 10px 10px 2px',
            boxShadow: '0 14px 24px rgba(0,0,0,0.55)',
            opacity: close > 0 ? 1 : 0,
          }}
        >
          <div style={{position: 'absolute', inset: 18, border: '2px solid rgba(220,180,110,0.5)', borderRadius: 6}} />
        </div>
      </div>
    </div>
  );
};

/** A TV finishing an episode: credits roll, then 剧终 and standby. */
const TV: React.FC<{frame: number}> = ({frame}) => {
  const roll = interpolate(frame, [10, 96], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const fin = prog(frame, 96, 16, ease.out);
  const off = prog(frame, 128, 10, ease.in);
  return (
    <div style={{position: 'absolute', left: 1080, top: 250, width: 640, height: 420}}>
      <div style={{position: 'absolute', left: 0, top: 0, width: 640, height: 370, borderRadius: 12, background: '#0b0c0f', boxShadow: '0 20px 30px rgba(0,0,0,0.6), inset 0 0 0 2px #23252b'}}>
        <div style={{position: 'absolute', left: 14, top: 14, right: 14, bottom: 14, borderRadius: 4, overflow: 'hidden', background: '#000'}}>
          <div style={{position: 'absolute', inset: 0, opacity: 1 - off}}>
            <div style={{position: 'absolute', left: 0, right: 0, top: 340 - roll * 760, textAlign: 'center', fontFamily: F.sans, color: 'rgba(255,255,255,0.75)', fontSize: 18, lineHeight: '34px', opacity: 1 - fin}}>
              {['导演', '编剧', '摄影', '剪辑', '音乐', '美术', '灯光', '录音', '制片', '出品'].map((r, i) => (
                <div key={r}>
                  <span style={{opacity: 0.55, marginRight: 18}}>{r}</span>
                  {['林 远', '周 简', '陈 默', '许 宁', '韩 川', '宋 晚', '叶 青', '高 原', '吴 桥', '某某影业'][i]}
                </div>
              ))}
            </div>
            <div style={{position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', opacity: fin}}>
              <div style={{fontFamily: F.serif, fontWeight: 900, fontSize: 64, color: '#f2efe8', letterSpacing: '0.3em'}}>剧终</div>
              <div style={{fontFamily: F.sans, fontSize: 18, color: 'rgba(255,255,255,0.5)', marginTop: 12, letterSpacing: '0.2em'}}>第 12 集 · 全剧完</div>
            </div>
          </div>
          <div style={{position: 'absolute', inset: 0, background: 'linear-gradient(120deg, rgba(255,255,255,0.06), rgba(255,255,255,0) 40%)'}} />
        </div>
        <div style={{position: 'absolute', right: 26, bottom: 4, width: 6, height: 6, borderRadius: 3, background: off > 0.5 ? '#ff3b30' : '#2a2a2a', boxShadow: off > 0.5 ? '0 0 8px #ff3b30' : undefined}} />
      </div>
      <div style={{position: 'absolute', left: 270, top: 370, width: 100, height: 40, background: 'linear-gradient(#1a1b20, #0b0c0f)', clipPath: 'polygon(30% 0, 70% 0, 100% 100%, 0 100%)'}} />
    </div>
  );
};

/** The feed as an endless tower of videos rising into the dark (three columns, receding to a point). */
const Tower: React.FC<{frame: number; tilt: number; speed: number}> = ({frame, tilt, speed}) => {
  const cardW = 440;
  const cardH = 780;
  const gap = 44;
  const scroll = (frame * speed) % (cardH + gap);
  const shift = Math.floor((frame * speed) / (cardH + gap));
  const count = 22;
  const column = (cx: number, z: number, op: number, seed: number) =>
    new Array(count).fill(0).map((_, i) => {
      const id = ORDER[(i + shift + seed) % ORDER.length];
      const [r, g, b] = CLIP_TINT[id];
      const y = -i * (cardH + gap) + scroll;
      const fog = Math.max(0, 1 - i / count) * op;
      const Clip = CLIPS[id];
      return (
        <div
          key={`${seed}-${i}`}
          style={{
            position: 'absolute',
            left: cx - cardW / 2,
            top: y,
            width: cardW,
            height: cardH,
            borderRadius: 38,
            overflow: 'hidden',
            opacity: fog,
            transform: `translateZ(${z}px)`,
            background: `linear-gradient(160deg, rgb(${r * 0.8},${g * 0.8},${b * 0.8}), rgb(${r * 0.25},${g * 0.25},${b * 0.25}))`,
          }}
        >
          {i < 3 && seed === 0 ? (
            <div style={{width: 390, height: 844, transform: `scale(${cardH / 844})`, transformOrigin: 'top left'}}>
              <Clip t={frame + i * 20} id={`tw${seed}${i}${id}`} />
            </div>
          ) : null}
          <div style={{position: 'absolute', right: 16, bottom: 130, display: 'flex', flexDirection: 'column', gap: 16, alignItems: 'center'}}>
            <HeartIcon size={38} />
            <CommentIcon size={38} />
          </div>
        </div>
      );
    });
  return (
    <AbsoluteFill style={{perspective: 1000, perspectiveOrigin: '50% 62%'}}>
      <div style={{position: 'absolute', left: 960, top: 170, width: 0, height: cardH, transformStyle: 'preserve-3d', transform: `rotateX(${tilt}deg)`, transformOrigin: '0 100%'}}>
        {column(-560, -260, 0.45, 3)}
        {column(560, -260, 0.45, 5)}
        {column(0, 0, 1, 0)}
      </div>
    </AbsoluteFill>
  );
};

export const NoEndScene: React.FC = () => {
  const frame = useCurrentFrame();
  const cuesOut = prog(frame, 140, 26, ease.inOut);
  const towerIn = prog(frame, 150, 30, ease.out);
  const tilt = interpolate(frame, [160, 310], [0, 68], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: ease.inOut});
  const speed = interpolate(frame, [150, 300, 420], [6, 26, 40], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: ease.in});
  const label = prog(frame, 300, 24, ease.out);
  return (
    <AbsoluteFill style={{background: C.void, overflow: 'hidden'}}>
      <Backdrop bg={`radial-gradient(ellipse 80% 70% at 50% 35%, #101528 0%, #05070f 55%, ${C.void} 100%)`} />
      {/* stars that appear as we look up */}
      <AbsoluteFill style={{opacity: prog(frame, 200, 60)}}>
        {new Array(120).fill(0).map((_, i) => (
          <div key={i} style={{position: 'absolute', left: random(`ns${i}`) * 1920, top: random(`nsy${i}`) * 700, width: 2, height: 2, borderRadius: 1, background: '#fff', opacity: 0.2 + 0.6 * Math.abs(Math.sin(frame * 0.05 + i))}} />
        ))}
      </AbsoluteFill>
      <Bokeh seed="nebk" count={14} colors={[[90, 120, 255], [255, 140, 90]]} opacity={0.2} />
      {cuesOut < 1 ? (
        <AbsoluteFill style={{opacity: 1 - cuesOut, transform: `translateY(${cuesOut * 160}px) scale(${1 - cuesOut * 0.1})`, filter: cuesOut > 0.01 ? `blur(${cuesOut * 8}px)` : undefined}}>
          <Book frame={frame} />
          <TV frame={frame} />
          <div style={{position: 'absolute', left: 0, right: 0, top: 790, display: 'flex', justifyContent: 'space-around', padding: '0 300px', fontFamily: F.sans, fontSize: 28, color: C.inkDim, letterSpacing: '0.2em'}}>
            <span style={{opacity: prog(frame, 60, 20)}}>最后一页</span>
            <span style={{opacity: prog(frame, 100, 20)}}>片尾</span>
          </div>
        </AbsoluteFill>
      ) : null}
      {towerIn > 0 ? (
        <AbsoluteFill style={{opacity: towerIn}}>
          <Tower frame={frame} tilt={tilt} speed={speed} />
          <AbsoluteFill style={{background: 'linear-gradient(to bottom, rgba(5,7,15,0.95) 0%, rgba(5,7,15,0) 40%)'}} />
        </AbsoluteFill>
      ) : null}
      <div style={{position: 'absolute', left: 1360, top: 330, opacity: label, transform: `translateX(${(1 - label) * 20}px)`, borderLeft: '2px solid rgba(255,190,110,0.7)', paddingLeft: 24}}>
        <div style={{fontFamily: F.mono, fontSize: 22, color: C.gold, letterSpacing: '0.3em'}}>INFINITE SCROLL</div>
        <div style={{fontFamily: F.serif, fontWeight: 900, fontSize: 64, color: C.ink, marginTop: 10}}>无限下滑</div>
        <div style={{fontFamily: F.sans, fontSize: 28, color: C.inkDim, marginTop: 16, letterSpacing: '0.08em', lineHeight: 1.6}}>
          2006 年 · Aza Raskin 设计
          <br />
          没有尽头，也就没有停下的理由
        </div>
      </div>
      <div style={{position: 'absolute', left: 960 - 80, top: 60, width: 160, textAlign: 'center', fontFamily: F.serif, fontWeight: 900, fontSize: 96, color: C.goldHi, opacity: prog(frame, 250, 30) * (1 - label * 0.4), textShadow: '0 0 40px rgba(255,160,50,0.7)'}}>∞</div>
      <Dust seed="nedust" count={50} opacity={0.4} />
    </AbsoluteFill>
  );
};
