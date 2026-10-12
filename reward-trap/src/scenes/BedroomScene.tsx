import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';
import {noise2D} from '../lib/noise';
import {C, ease} from '../theme';
import {SevenSeg} from '../components/SevenSeg';
import {CLIP_TINT, type ClipId} from '../components/phone/contents';
import {Dust} from '../components/Atmosphere';
import {lerp} from '../lib/math';

// 02:47. Someone lies on their back, phone held over their face; the screen is the only warm thing in the room.
const SEQ: ClipId[] = ['cat', 'ocean', 'neon', 'fireworks', 'aurora', 'paint', 'galaxy', 'ad', 'rain', 'cat', 'fireworks'];

// face profile (upright, facing +x), rotated -90° so the face points at the ceiling
const HEAD =
  'M80 0 C128 0 170 30 182 80 C186 92 187 104 182 114 C180 120 181 126 184 132 C192 146 202 160 207 168 C210 174 206 180 198 182 C192 184 186 184 184 188 C185 194 190 197 190 202 C190 206 186 208 183 210 C186 213 189 217 187 222 C185 228 179 230 178 234 C180 242 186 248 184 256 C182 266 174 272 164 274 C148 278 132 280 124 292 L118 360 L28 360 C22 320 10 290 4 240 C-4 180 0 90 30 40 C44 16 60 0 80 0 Z';
// just the lit contour: forehead → nose → lips → chin
const FACE_EDGE =
  'M128 6 C152 16 174 44 182 80 C186 92 187 104 182 114 C180 120 181 126 184 132 C192 146 202 160 207 168 C210 174 206 180 198 182 C192 184 186 184 184 188 C185 194 190 197 190 202 C190 206 186 208 183 210 C186 213 189 217 187 222 C185 228 179 230 178 234 C180 242 186 248 184 256 C182 266 174 272 164 274';
const HAIR =
  'M104 2 C84 -32 30 -56 -12 -36 C-46 -16 -58 60 -50 140 C-44 204 -30 262 -2 326 L34 334 C12 272 4 212 6 160 C8 100 22 40 62 12 C78 4 92 0 104 2 Z';

const minutesAt = (frame: number) => {
  // 02:47 holds, then the night slips away: an hour gone in three seconds.
  const p = interpolate(frame, [100, 205], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: ease.inOut});
  return 2 * 60 + 47 + Math.floor(p * 64);
};

export const BedroomScene: React.FC = () => {
  const frame = useCurrentFrame();
  return <BedroomView frame={frame} />;
};

/** `sleeping`: the same room, hours earlier — phone charging across the room, eyes closed. */
export const BedroomView: React.FC<{frame: number; sleeping?: boolean}> = ({frame, sleeping = false}) => {
  // swipe rhythm speeds up during the time-lapse
  const lapse = interpolate(frame, [100, 205], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: ease.inOut});
  const swipeClock = frame < 100 ? frame / 34 : 100 / 34 + (frame - 100) / lerp(34, 4, lapse);
  const idx = Math.floor(swipeClock);
  const f = swipeClock - idx;
  const ta = CLIP_TINT[SEQ[idx % SEQ.length]];
  const tb = CLIP_TINT[SEQ[(idx + 1) % SEQ.length]];
  const k = Math.min(1, f * 6);
  const tint: [number, number, number] = sleeping ? [110, 140, 220] : [lerp(ta[0], tb[0], k), lerp(ta[1], tb[1], k), lerp(ta[2], tb[2], k)];
  const flick = sleeping ? 0.18 : 0.85 + 0.15 * Math.exp(-f * 8) + noise2D('flick', frame * 0.2, 0) * 0.04;
  const [r, g, b] = tint;
  const mins = sleeping ? 23 * 60 + 28 + Math.floor(frame / 60) : minutesAt(frame);
  const hh = String(Math.floor(mins / 60)).padStart(2, '0');
  const mm = String(mins % 60).padStart(2, '0');
  const colon = frame % 30 < 18 || (!sleeping && lapse > 0.05);

  const push = interpolate(frame, [0, 220], [1.0, 1.12], {easing: ease.soft});
  const cam = {x: noise2D('bedcam', frame * 0.008, 0) * 5, y: noise2D('bedcam2', 0, frame * 0.008) * 4};
  const moon = sleeping ? 0 : interpolate(frame, [0, 100, 205, 220], [0, 0.04, 1, 1], {easing: ease.inOut}) * 160;
  const thumbTwitch = Math.max(0, Math.sin(swipeClock * Math.PI * 2)) * 3;
  const L = flick;

  return (
    <AbsoluteFill style={{background: '#03040a', overflow: 'hidden'}}>
      <AbsoluteFill style={{transform: `translate(${cam.x}px, ${cam.y}px) scale(${push})`, transformOrigin: '520px 470px', willChange: 'transform'}}>
        <svg width={1920} height={1080} viewBox="0 0 1920 1080">
          <defs>
            <linearGradient id="bed-wall" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#05070f" />
              <stop offset="1" stopColor="#0a0e1c" />
            </linearGradient>
            <radialGradient id="bed-spill" cx="0.5" cy="0.5" r="0.5">
              <stop offset="0" stopColor={`rgb(${r},${g},${b})`} stopOpacity={0.3 * L} />
              <stop offset="0.5" stopColor={`rgb(${r},${g},${b})`} stopOpacity={0.09 * L} />
              <stop offset="1" stopColor={`rgb(${r},${g},${b})`} stopOpacity="0" />
            </radialGradient>
            <linearGradient id="bed-cone" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor={`rgb(${r},${g},${b})`} stopOpacity={0.55 * L} />
              <stop offset="1" stopColor={`rgb(${r},${g},${b})`} stopOpacity="0" />
            </linearGradient>
            <linearGradient id="bed-duvet" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#1b2236" />
              <stop offset="0.25" stopColor="#0f1424" />
              <stop offset="1" stopColor="#05070d" />
            </linearGradient>
            <linearGradient id="bed-pillow" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor={`rgb(${40 + r * 0.25},${44 + g * 0.25},${60 + b * 0.25})`} />
              <stop offset="0.5" stopColor="#141a2a" />
              <stop offset="1" stopColor="#070a12" />
            </linearGradient>
            <linearGradient id="bed-skin" x1="1" y1="0" x2="0" y2="0">
              <stop offset="0" stopColor={`rgb(${110 + r * 0.42},${80 + g * 0.38},${78 + b * 0.38})`} />
              <stop offset="0.16" stopColor={`rgb(${50 + r * 0.12},${34 + g * 0.1},${33 + b * 0.1})`} />
              <stop offset="0.45" stopColor="#170f0f" />
              <stop offset="1" stopColor="#070505" />
            </linearGradient>
            <filter id="bed-blur20">
              <feGaussianBlur stdDeviation="20" />
            </filter>
            <filter id="bed-blur6">
              <feGaussianBlur stdDeviation="6" />
            </filter>
            <filter id="bed-blur2">
              <feGaussianBlur stdDeviation="2" />
            </filter>
            <filter id="bed-glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="10" result="b" />
              <feMerge>
                <feMergeNode in="b" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          <rect width={1920} height={1080} fill="url(#bed-wall)" />
          {/* moonlight through the blinds, sliding as the night passes */}
          <g filter="url(#bed-blur6)" opacity={0.9}>
            {new Array(7).fill(0).map((_, i) => (
              <polygon
                key={i}
                points={`${980 + i * 46 - moon},${90 + i * 40} ${1500 + i * 46 - moon},${30 + i * 40} ${1500 + i * 46 - moon},${54 + i * 40} ${980 + i * 46 - moon},${114 + i * 40}`}
                fill="#7f9cff"
                opacity={0.075}
              />
            ))}
          </g>
          {/* screen light thrown on wall and ceiling */}
          <ellipse cx={500} cy={300} rx={760} ry={440} fill="url(#bed-spill)" />
          {/* headboard */}
          <rect x={70} y={330} width={70} height={520} rx={14} fill="#0a0d18" />
          <rect x={70} y={330} width={70} height={520} rx={14} fill={`rgb(${r},${g},${b})`} opacity={0.06 * L} />
          {/* mattress & bed */}
          <rect x={120} y={760} width={1900} height={90} fill="#080b14" />
          <rect x={120} y={840} width={1900} height={240} fill="#04050a" />
          {/* pillow */}
          <path d="M150 770 C146 700 200 652 330 646 C480 640 660 652 760 676 C820 690 836 730 826 770 Z" fill="url(#bed-pillow)" />
          {/* head, profile up, sunk into the pillow */}
          <g transform="translate(236 706) rotate(-90) scale(1.32)">
            <path d={HAIR} fill="#050407" />
            <path d={HEAD} fill="url(#bed-skin)" />
            <path d="M78 150 C64 156 62 182 76 192 C88 198 96 180 88 168" stroke="#241718" strokeWidth={3} fill="none" opacity={0.75} />
            <path d={FACE_EDGE} stroke={`rgb(${215 + r * 0.15},${205 + g * 0.15},${210 + b * 0.15})`} strokeWidth={3} fill="none" opacity={0.7 * L} filter="url(#bed-blur2)" />
            <path d={FACE_EDGE} stroke={`rgb(${r},${g},${b})`} strokeWidth={14} fill="none" opacity={0.32 * L} filter="url(#bed-blur6)" />
            {sleeping ? (
              <path d="M160 110 Q170 116 178 110" stroke="#0d0909" strokeWidth={2.4} fill="none" strokeLinecap="round" />
            ) : (
              <>
                {/* open eye catching the screen */}
                <path d="M160 108 Q170 102 178 110 Q170 116 160 108 Z" fill="#0d0909" />
                <circle cx={171} cy={108} r={2.2} fill={`rgb(${r},${g},${b})`} opacity={0.95 * L} />
              </>
            )}
          </g>
          {/* duvet over the body */}
          <path
            d="M560 660 C620 600 700 592 780 596 C900 600 1000 626 1120 640 C1260 652 1380 600 1480 598 C1580 596 1680 640 1800 650 C1880 656 1920 660 1960 664 L1960 860 L560 860 Z"
            fill="url(#bed-duvet)"
          />
          <path d="M760 598 C900 606 1000 630 1120 642 C1260 654 1380 604 1480 600" stroke={`rgb(${r},${g},${b})`} strokeWidth={3} fill="none" opacity={0.12 * L} filter="url(#bed-blur2)" />
          {[0, 1, 2, 3].map((i) => (
            <path key={i} d={`M${820 + i * 230} ${640 + (i % 2) * 12} C${880 + i * 230} ${700 + i * 6} ${900 + i * 230} ${760} ${860 + i * 230} ${840}`} stroke="#000" strokeWidth={10} fill="none" opacity={0.25} filter="url(#bed-blur6)" />
          ))}
          {sleeping ? null : (
          <g>
          {/* raised arm: elbow on the mattress, forearm up to the hand */}
          <path d="M850 676 C838 610 712 450 640 352 C630 338 610 336 600 348 C592 360 596 374 606 388 C670 480 774 620 796 690 Z" fill="#0f0b0b" />
          <path d="M640 352 C712 450 838 610 850 676" stroke={`rgb(${r},${g},${b})`} strokeWidth={3} fill="none" opacity={0.16 * L} filter="url(#bed-blur2)" />
          {/* light cone from screen to face */}
          <polygon points="400,330 600,318 600,470 330,500" fill="url(#bed-cone)" filter="url(#bed-blur20)" />
          {/* phone, screen facing down at the face */}
          <g transform={`translate(500 ${322 - thumbTwitch * 0.3}) rotate(-5)`}>
            <rect x={-104} y={-7} width={208} height={14} rx={6} fill="#15171d" />
            <rect x={-104} y={-7} width={208} height={3} rx={1.5} fill="#6a707b" opacity={0.6} />
            <rect x={-98} y={4} width={196} height={4} rx={2} fill={`rgb(${r},${g},${b})`} filter="url(#bed-glow)" opacity={L} />
          </g>
          {/* hand: palm under the far end, fingers over the edge, thumb along the glass */}
          <path d="M570 304 C580 296 600 296 612 304 C622 312 624 326 618 338 C612 350 598 356 588 354 C576 352 568 340 570 328 Z" fill="#0f0a0a" />
          {[0, 1, 2].map((i) => (
            <ellipse key={i} cx={578 + i * 13} cy={308 - i * 1.5} rx={7} ry={5.5} fill="#130d0d" />
          ))}
          <path d={`M584 338 C566 ${340 - thumbTwitch} 540 ${338 - thumbTwitch} 522 ${334 - thumbTwitch} C516 334 516 342 524 344 C548 350 570 350 588 348 Z`} fill="#1c1313" />
          <path d={`M522 ${334 - thumbTwitch} C540 ${338 - thumbTwitch} 566 ${340 - thumbTwitch} 584 338`} stroke={`rgb(${r},${g},${b})`} strokeWidth={2} fill="none" opacity={0.5 * L} />
          </g>
          )}
          {sleeping ? (
            <g>
              {/* dresser across the room, phone resting on its charging stand */}
              <rect x={1540} y={560} width={300} height={28} rx={4} fill="#0e1019" />
              <rect x={1552} y={588} width={276} height={320} fill="#07080e" />
              <g transform="translate(1690 470) rotate(-12)">
                <rect x={-34} y={-62} width={68} height={124} rx={12} fill="#111318" stroke="#2a2d35" strokeWidth={2} />
                <rect x={-29} y={-56} width={58} height={112} rx={9} fill="#0b1020" />
                <rect x={-12} y={-6} width={22} height={11} rx={2.5} fill="none" stroke="#34c759" strokeWidth={1.6} opacity={0.75} />
                <rect x={-10} y={-4} width={12} height={7} rx={1} fill="#34c759" opacity={0.75} />
                <rect x={-34} y={-62} width={68} height={124} rx={12} fill="#34c759" opacity={0.05} />
              </g>
              <path d="M1660 558 L1676 532 L1712 532 L1726 558 Z" fill="#15171d" />
              <ellipse cx={1690} cy={470} rx={90} ry={110} fill="#34c759" opacity={0.05} filter="url(#bed-blur20)" />
            </g>
          ) : null}
          {/* nightstand + LED clock */}
          <rect x={1300} y={718} width={360} height={30} rx={4} fill="#0d0f17" />
          <rect x={1320} y={748} width={320} height={200} fill="#07080e" />
          <rect x={1378} y={630} width={232} height={90} rx={12} fill="#050507" stroke="#16181f" strokeWidth={2} />
          <ellipse cx={1494} cy={724} rx={170} ry={18} fill="#ff2a1f" opacity={0.12} filter="url(#bed-blur6)" />
        </svg>
        <div style={{position: 'absolute', left: 1402, top: 648, filter: 'drop-shadow(0 0 10px rgba(255,40,30,0.9)) drop-shadow(0 0 26px rgba(255,40,30,0.5))'}}>
          <SevenSeg text={`${hh}:${mm}`} height={54} colon={colon} />
        </div>
        <Dust seed="beddust" count={50} opacity={0.35} speed={0.4} color={`${r},${g},${b}`} />
      </AbsoluteFill>
      <AbsoluteFill style={{background: 'radial-gradient(ellipse 80% 75% at 40% 50%, rgba(0,0,0,0) 45%, rgba(0,0,0,0.75) 100%)'}} />
      <AbsoluteFill style={{background: C.void, opacity: interpolate(frame, [0, 12], [0.8, 0], {extrapolateRight: 'clamp'})}} />
    </AbsoluteFill>
  );
};
