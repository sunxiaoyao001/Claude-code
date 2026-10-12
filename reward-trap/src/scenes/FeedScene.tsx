import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';
import {Backdrop} from '../components/Look';
import {C, ease} from '../theme';
import {CLIP_TINT, type ClipId} from '../components/phone/contents';
import {Phone} from '../components/phone/Phone';
import {Feed} from '../components/phone/FeedUI';
import {Thumb, feedPositionAt, tapOverlay, thumbPoseAt, type Swipe} from '../components/phone/Thumb';
import {Bokeh, Dust} from '../components/Atmosphere';
import {GoldBurst, RewardTrace, type BurstEvent, type Spike} from '../components/Dopamine';
import {handheld, lerp} from '../lib/math';

export const FEED_ITEMS: ClipId[] = ['ad', 'ocean', 'rain', 'cat', 'neon', 'fireworks', 'aurora', 'galaxy', 'paint', 'ad', 'ocean', 'cat', 'neon', 'aurora', 'fireworks', 'galaxy', 'paint'];
const SWIPES: Swipe[] = [40, 108, 160, 262, 304, 334, 358, 378, 394, 407, 418, 427, 435, 442].map((at) => ({at}));
const REWARD: Record<ClipId, number> = {ad: 0.04, ocean: 0.42, rain: 0.1, cat: 0.82, neon: 0.22, fireworks: 0.58, aurora: 0.66, galaxy: 0.3, paint: 0.46};

// Each swipe: a small anticipatory rise, then the phasic response to whatever lands.
const SPIKES: Spike[] = SWIPES.flatMap((s, i) => [
  {at: s.at - 2, mag: 0.1},
  {at: s.at + 9, mag: REWARD[FEED_ITEMS[i + 1]] ?? 0.2},
]);

const PX = 690;
const PY = 545;
const PHONE_SCALE = 0.94;

const TAPS = [205, 212];

export const FeedScene: React.FC = () => {
  const frame = useCurrentFrame();
  const pos = feedPositionAt(frame, SWIPES);
  const a = CLIP_TINT[FEED_ITEMS[Math.floor(pos)]] ?? CLIP_TINT.ad;
  const b = CLIP_TINT[FEED_ITEMS[Math.min(FEED_ITEMS.length - 1, Math.floor(pos) + 1)]] ?? a;
  const f = pos - Math.floor(pos);
  const tint: [number, number, number] = [lerp(a[0], b[0], f), lerp(a[1], b[1], f), lerp(a[2], b[2], f)];

  const thumb = tapOverlay(frame, thumbPoseAt(frame, SWIPES), TAPS, 205, 430);
  const liked = interpolate(frame, [TAPS[0], TAPS[0] + 10], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});

  // Camera: slow settle, then the frenzy pushes in.
  const settle = interpolate(frame, [0, 300], [0.93, 1], {extrapolateRight: 'clamp', easing: ease.soft});
  const frenzy = interpolate(frame, [290, 450], [0, 1], {extrapolateLeft: 'clamp', easing: ease.in});
  const cam = handheld(frame, 5 + frenzy * 7, 0.015 + frenzy * 0.03, 'feedcam');
  const camScale = settle * (1 + frenzy * 0.16);
  let kick = 0;
  for (const s of SWIPES) {
    const t = frame - s.at;
    if (t >= 0 && t < 14) kick = Math.max(kick, Math.exp(-t / 4) * (t < 2 ? t / 2 : 1));
  }
  const tiltY = -11 + Math.sin(frame * 0.012) * 3 + frenzy * 4;
  const tiltX = 5 + kick * 0.8;

  const bursts: BurstEvent[] = [
    {at: 171, x: PX, y: PY - 80, count: 90, power: 1.9, seed: 'cat', life: 90, size: 1.3},
    {at: 207, x: PX, y: PY - 60, count: 26, power: 0.7, seed: 'tap1'},
    {at: 313, x: PX, y: PY - 80, count: 36, power: 0.9, seed: 'fw'},
    {at: 343, x: PX, y: PY - 80, count: 50, power: 1.4, seed: 'au'},
    {at: 387, x: PX, y: PY - 80, count: 26, power: 0.8, seed: 'pt'},
    {at: 427, x: PX, y: PY - 80, count: 40, power: 1.1, seed: 'c2'},
  ];
  const traceIn = interpolate(frame, [8, 34], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});

  return (
    <AbsoluteFill style={{background: C.void, overflow: 'hidden'}}>
      <Backdrop bg={`radial-gradient(ellipse 70% 80% at 40% 50%, #101627 0%, ${C.void} 72%)`} />
      <AbsoluteFill
        style={{
          transform: `translate(${cam.x}px, ${cam.y}px) rotate(${cam.r}deg) scale(${camScale})`,
          transformOrigin: `${PX}px ${PY}px`,
          willChange: 'transform',
        }}
      >
        <Bokeh seed="feedbk" count={22} colors={[tint, [90, 120, 255], tint]} opacity={0.35} />
        {/* floor bounce of the screen light */}
        <div
          style={{
            position: 'absolute',
            left: PX - 520,
            top: PY + 330,
            width: 1040,
            height: 260,
            borderRadius: '50%',
            background: `radial-gradient(ellipse, rgba(${tint[0]},${tint[1]},${tint[2]},0.22) 0%, rgba(${tint[0]},${tint[1]},${tint[2]},0) 70%)`,
          }}
        />
        <RewardTrace frame={frame} spikes={SPIKES} x={1130} y={330} w={640} h={330} windowFrames={170} opacity={traceIn} label="多巴胺" uid="feedtrace" />
        <div
          style={{
            position: 'absolute',
            left: PX - 210,
            top: PY - 437 + kick * 4,
            transform: `perspective(2200px) rotateY(${tiltY}deg) rotateX(${tiltX}deg) scale(${PHONE_SCALE})`,
          }}
        >
          <Phone
            tint={tint}
            glow={0.95}
            tiltX={tiltX}
            tiltY={tiltY}
            overlay={
              <>
                <TapHearts frame={frame} taps={TAPS} x={205} y={420} />
                <Thumb x={thumb.x} y={thumb.y} lift={thumb.lift} press={thumb.press} light={tint} uid="feedthumb" />
              </>
            }
          >
            <Feed items={FEED_ITEMS} position={pos} t={frame} liked={{3: liked, 11: 1}} uid="feed" />
          </Phone>
        </div>
        <GoldBurst frame={frame} events={bursts} />
        <Dust seed="feeddust" count={70} opacity={0.5} />
      </AbsoluteFill>
      {/* out-of-focus foreground motes for depth */}
      <Bokeh seed="feedfg" count={5} colors={[tint]} opacity={0.18} sizeRange={[260, 420]} drift={2.5} />
      <AbsoluteFill style={{background: 'radial-gradient(ellipse at 50% 50%, rgba(0,0,0,0) 55%, rgba(0,0,0,0.55) 100%)', opacity: 0.45 + frenzy * 0.55, willChange: 'transform'}} />
    </AbsoluteFill>
  );
};

/** Double-tap like: a big heart punches in at the finger, small hearts scatter. */
const TapHearts: React.FC<{frame: number; taps: number[]; x: number; y: number}> = ({frame, taps, x, y}) => (
  <>
    {taps.map((t, k) => {
      const age = frame - t;
      if (age < 0 || age > 34) return null;
      const pop = age < 6 ? interpolate(age, [0, 6], [0.2, 1.25], {easing: ease.out}) : interpolate(age, [6, 12], [1.25, 1], {extrapolateRight: 'clamp'});
      const rise = age > 14 ? (age - 14) * 4 : 0;
      const op = age > 18 ? 1 - (age - 18) / 16 : 1;
      const size = 120 - k * 18;
      return (
        <svg
          key={t}
          width={size}
          height={size}
          viewBox="0 0 24 24"
          style={{position: 'absolute', left: x - size / 2 + k * 26, top: y - size / 2 - rise - k * 18, transform: `scale(${pop}) rotate(${k ? 12 : -10}deg)`, opacity: op, filter: 'drop-shadow(0 6px 18px rgba(255,45,85,0.55))'}}
        >
          <defs>
            <linearGradient id={`th${k}`} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#ff6b8a" />
              <stop offset="1" stopColor="#ff1f4e" />
            </linearGradient>
          </defs>
          <path d="M12 21.3s-7.6-4.7-10-9.4C.4 8.6 2.2 4.6 5.9 4.2c2.3-.2 4.1 1 5.3 2.8 1.2-1.8 3-3 5.3-2.8 3.7.4 5.5 4.4 3.9 7.7-2.4 4.7-10.4 9.4-10.4 9.4z" fill={`url(#th${k})`} />
          <path d="M6.2 6.6c-1.5.4-2.4 1.8-2.2 3.4" stroke="#fff" strokeWidth="1.1" fill="none" opacity={0.6} strokeLinecap="round" />
        </svg>
      );
    })}
  </>
);
