import React from 'react';
import {AbsoluteFill, interpolate, random, useCurrentFrame} from 'remotion';
import {Backdrop} from '../components/Look';
import {C, F, ease} from '../theme';
import {Phone} from '../components/phone/Phone';
import {AppChrome, CommentIcon, HeartIcon} from '../components/phone/FeedUI';
import {Thumb, tapOverlay} from '../components/phone/Thumb';
import {Bokeh, Dust, LightLeak} from '../components/Atmosphere';
import {prog, springAt} from '../lib/math';

const COMMENTS = [
  {name: '夜猫子小林', text: '看到这条的时候，已经凌晨一点了…', likes: '2341', hue: 200},
  {name: '不想上班', text: '说好只刷十分钟，结果天都亮了', likes: '1876', hue: 20},
  {name: '认真生活中', text: '开了灰度模式，真的没那么想刷了', likes: '932', hue: 140},
  {name: '晚睡冠军', text: '原来停不下来，是有原因的', likes: '3105', hue: 280},
  {name: '早睡早起', text: '现在就放下手机，晚安', likes: '1288', hue: 330},
];
const BUBBLES = ['太真实了', '说的就是我', '凌晨三点 +1', '破防了', '我也是！', '已开灰度', '被说中了', '学到了'];

const LIKE_TAP = 48;

/** The closing poster: the question, set large. */
const EndCard: React.FC<{frame: number}> = ({frame}) => {
  const l1 = prog(frame, 24, 22, ease.out);
  const l2 = prog(frame, 38, 22, ease.out);
  const l3 = prog(frame, 150, 20, ease.out);
  const glow = 0.5 + 0.5 * Math.sin(frame * 0.08);
  return (
    <div style={{position: 'absolute', left: 1050, top: 300, width: 800}}>
      <div style={{fontFamily: F.serif, fontWeight: 900, fontSize: 104, lineHeight: 1.18, color: C.ink, opacity: l1, transform: `translateY(${(1 - l1) * 30}px)`, filter: l1 < 0.98 ? `blur(${(1 - l1) * 10}px)` : undefined}}>
        你最长一次，
      </div>
      <div
        style={{
          fontFamily: F.serif,
          fontWeight: 900,
          fontSize: 104,
          lineHeight: 1.18,
          opacity: l2,
          transform: `translateY(${(1 - l2) * 30}px)`,
          filter: l2 < 0.98 ? `blur(${(1 - l2) * 10}px)` : `drop-shadow(0 0 ${20 + glow * 20}px rgba(255,150,40,0.45))`,
          background: 'linear-gradient(180deg, #fff1cf 0%, #ffc15a 55%, #ff8a1f 100%)',
          WebkitBackgroundClip: 'text',
          backgroundClip: 'text',
          color: 'transparent',
        }}
      >
        刷了多久？
      </div>
      <div style={{marginTop: 46, display: 'flex', alignItems: 'center', gap: 18, opacity: l3, transform: `translateX(${(1 - l3) * -16}px)`}}>
        <svg width={60} height={24} viewBox="0 0 60 24">
          <path d="M58 12 H6 M16 2 L4 12 L16 22" stroke="#ffb547" strokeWidth={3} fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span style={{fontFamily: F.sans, fontWeight: 500, fontSize: 40, color: C.ink, letterSpacing: '0.12em'}}>评论区，聊聊你的故事</span>
      </div>
    </div>
  );
};
const COMMENT_TAP = 78;
const TYPE = '最长一次…大概四个小时';

/** The cover of this very film, playing on the phone. */
const Cover: React.FC<{t: number}> = ({t}) => (
  <div style={{position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 50% 38%, #2a1a0c 0%, #0b0806 60%, #000 100%)'}}>
    <svg width={390} height={844} style={{position: 'absolute', inset: 0}}>
      <defs>
        <radialGradient id="cov-glow">
          <stop offset="0" stopColor="#ffb547" stopOpacity="0.55" />
          <stop offset="1" stopColor="#ffb547" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx={195} cy={300} r={180 + Math.sin(t * 0.06) * 8} fill="url(#cov-glow)" />
      {/* a brain drawn in gold line */}
      <g transform="translate(195 300) scale(1.25)" fill="none" stroke="#ffcf7a" strokeWidth={2.4} strokeLinecap="round" opacity={0.9}>
        <path d="M-6 -78 C-40 -96 -86 -70 -88 -30 C-112 -14 -110 30 -84 44 C-84 72 -50 88 -22 74 C-14 88 -6 90 -6 90 Z" />
        <path d="M6 -78 C40 -96 86 -70 88 -30 C112 -14 110 30 84 44 C84 72 50 88 22 74 C14 88 6 90 6 90 Z" />
        <path d="M-60 -44 C-40 -50 -30 -30 -46 -18 M-70 10 C-48 0 -30 20 -50 34 M-30 -64 C-20 -40 -40 -30 -28 -10 M-36 50 C-28 36 -12 44 -16 60" />
        <path d="M60 -44 C40 -50 30 -30 46 -18 M70 10 C48 0 30 20 50 34 M30 -64 C20 -40 40 -30 28 -10 M36 50 C28 36 12 44 16 60" />
      </g>
    </svg>
    <div style={{position: 'absolute', left: 24, right: 24, top: 520, textAlign: 'center', fontFamily: F.serif, fontWeight: 900, fontSize: 34, color: '#fff3dc', lineHeight: 1.35, textShadow: '0 0 20px rgba(255,160,50,0.5)'}}>
      为什么你刷短视频
      <br />
      停不下来？
    </div>
    <div style={{position: 'absolute', left: 0, right: 0, top: 622, textAlign: 'center', fontFamily: F.serif, fontWeight: 600, fontSize: 20, color: '#ffbf5a', letterSpacing: '0.2em'}}>大脑的「奖励陷阱」</div>
  </div>
);

export const OutroScene: React.FC = () => {
  const frame = useCurrentFrame();
  const rise = prog(frame, 0, 34, ease.out);
  const liked = prog(frame, LIKE_TAP, 8, ease.out);
  const sheet = springAt(frame - COMMENT_TAP - 4, {stiffness: 180, damping: 22});
  const th = tapOverlay(frame, {x: 330, y: 760, lift: 1, press: 0}, frame < 66 ? [LIKE_TAP] : [COMMENT_TAP], frame < 66 ? 352 : 352, frame < 66 ? 470 : 548);
  const thumbOut = prog(frame, 96, 16, ease.in);
  const typed = Math.max(0, Math.floor((frame - 236) / 3));
  const caret = Math.floor(frame / 15) % 2 === 0;
  const dim = prog(frame, 300, 30, ease.inOut);

  return (
    <AbsoluteFill style={{background: C.void, overflow: 'hidden'}}>
      <Backdrop bg={`radial-gradient(ellipse 70% 70% at 50% 48%, #141022 0%, ${C.void} 80%)`} />
      <Bokeh seed="obk" count={22} colors={[[255, 181, 71], [255, 80, 120], [120, 160, 255]]} opacity={0.25} />
      <LightLeak color={[255, 160, 80]} x={0.5} y={0.45} size={1300} intensity={0.22} seed="ol" />
      {/* comment bubbles floating out of the screen */}
      {BUBBLES.map((b, i) => {
        const at = 120 + i * 16;
        const t = frame - at;
        if (t < 0) return null;
        // bubbles rise around the phone, never across the headline
        const side = i % 2 === 0 ? -1 : 1;
        const x = 640 + side * (270 + random(`bx${i}`) * 90) + Math.sin(t * 0.05 + i) * 14;
        const y = 860 - t * (2.6 + random(`bv${i}`) * 1.2);
        const a = Math.min(1, t / 10) * Math.max(0, 1 - t / 230);
        const s = 0.8 + random(`bs${i}`) * 0.5;
        return (
          <div
            key={b}
            style={{
              position: 'absolute',
              left: x,
              top: y,
              transform: `translate(-50%, -50%) scale(${s})`,
              opacity: a * (1 - dim * 0.6),
              padding: '14px 24px',
              borderRadius: '24px 24px 24px 6px',
              background: 'rgba(255,255,255,0.92)',
              color: '#1b1d24',
              fontFamily: F.sans,
              fontWeight: 500,
              fontSize: 28,
              boxShadow: '0 8px 16px rgba(0,0,0,0.35)',
              whiteSpace: 'nowrap',
            }}
          >
            {b}
          </div>
        );
      })}
      <EndCard frame={frame} />
      <div style={{position: 'absolute', left: 640 - 210, top: 540 - 437 + (1 - rise) * 200, opacity: rise, transform: `scale(1.0) perspective(2200px) rotateY(8deg)`}}>
        <Phone
          tint={[255, 170, 90]}
          glow={0.9}
          overlay={thumbOut < 1 ? <div style={{opacity: 1 - thumbOut}}><Thumb x={th.x} y={th.y + thumbOut * 200} lift={th.lift} press={th.press} uid="outthumb" /></div> : null}
        >
          <Cover t={frame} />
          {/* action rail */}
          <div style={{position: 'absolute', right: 12, bottom: 150, width: 56, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18}}>
            <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', transform: `scale(${1 + Math.sin(liked * Math.PI) * 0.4})`}}>
              <HeartIcon fill={liked > 0.5 ? '#ff2d55' : '#fff'} />
              <div style={{fontFamily: F.ui, fontWeight: 600, fontSize: 13, color: '#fff'}}>{liked > 0.5 ? '2.6w' : '2.6w'}</div>
            </div>
            <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
              <CommentIcon />
              <div style={{fontFamily: F.ui, fontWeight: 600, fontSize: 13, color: '#fff'}}>1.8w</div>
            </div>
          </div>
          {/* like burst */}
          {frame >= LIKE_TAP && frame < LIKE_TAP + 30
            ? new Array(10).fill(0).map((_, i) => {
                const a = (i / 10) * Math.PI * 2;
                const d = (frame - LIKE_TAP) * 3.2;
                return <div key={i} style={{position: 'absolute', left: 352 + Math.cos(a) * d - 4, top: 466 + Math.sin(a) * d - 4, width: 8, height: 8, borderRadius: 4, background: i % 2 ? '#ff2d55' : '#ffb547', opacity: 1 - (frame - LIKE_TAP) / 30}} />;
              })
            : null}
          <AppChrome time="23:58" battery={0.18} />
          {/* comment sheet */}
          <div style={{position: 'absolute', left: 0, right: 0, bottom: 0, height: 600, transform: `translateY(${(1 - sheet) * 620}px)`, borderRadius: '22px 22px 0 0', background: '#ffffff', boxShadow: '0 -20px 50px rgba(0,0,0,0.4)'}}>
            <div style={{width: 40, height: 5, borderRadius: 3, background: '#d9dbe0', margin: '10px auto 0'}} />
            <div style={{textAlign: 'center', fontFamily: F.sans, fontWeight: 700, fontSize: 16, color: '#1b1d24', marginTop: 12}}>1.8w 条评论</div>
            <div style={{padding: '14px 18px 0'}}>
              {COMMENTS.map((c, i) => {
                const a = prog(frame, 104 + i * 22, 14, ease.out);
                return (
                  <div key={c.name} style={{display: 'flex', gap: 12, marginBottom: 18, opacity: a, transform: `translateY(${(1 - a) * 18}px)`}}>
                    <div style={{width: 38, height: 38, borderRadius: 19, flexShrink: 0, background: `linear-gradient(135deg, hsl(${c.hue},70%,65%), hsl(${c.hue + 40},70%,45%))`}} />
                    <div style={{flex: 1}}>
                      <div style={{fontFamily: F.sans, fontSize: 13, color: '#8a8f99'}}>{c.name}</div>
                      <div style={{fontFamily: F.sans, fontSize: 16, color: '#1b1d24', marginTop: 3, lineHeight: 1.4}}>{c.text}</div>
                    </div>
                    <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', width: 36}}>
                      <svg width={18} height={18} viewBox="0 0 24 24">
                        <path d="M12 21.3s-7.6-4.7-10-9.4C.4 8.6 2.2 4.6 5.9 4.2c2.3-.2 4.1 1 5.3 2.8 1.2-1.8 3-3 5.3-2.8 3.7.4 5.5 4.4 3.9 7.7-2.4 4.7-10.4 9.4-10.4 9.4z" fill="none" stroke="#a3a8b2" strokeWidth={2} />
                      </svg>
                      <div style={{fontFamily: F.ui, fontSize: 11, color: '#a3a8b2'}}>{c.likes}</div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div style={{position: 'absolute', left: 14, right: 14, bottom: 26, height: 50, borderRadius: 25, background: '#f1f2f5', display: 'flex', alignItems: 'center', padding: '0 20px', boxShadow: `0 0 0 ${2 + dim * 2}px rgba(255,181,71,${0.35 + dim * 0.5})`}}>
              <span style={{fontFamily: F.sans, fontSize: 16, color: typed > 0 ? '#1b1d24' : '#9aa0aa'}}>
                {typed > 0 ? TYPE.slice(0, typed) : '说说你最长一次刷了多久…'}
              </span>
              {caret && frame > 150 ? <span style={{width: 2, height: 20, background: '#ff2d55', marginLeft: 2}} /> : null}
            </div>
          </div>
        </Phone>
      </div>
      <AbsoluteFill style={{background: '#000', opacity: interpolate(frame, [310, 330], [0, 0.85], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'})}} />
      <Dust seed="odust" count={40} opacity={0.35} />
    </AbsoluteFill>
  );
};
