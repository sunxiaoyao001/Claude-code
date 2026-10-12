import React from 'react';
import {AbsoluteFill, Sequence, useCurrentFrame} from 'remotion';
import * as THREE from 'three';
import {Stage} from '../three/Stage';
import {Rig} from '../three/Rig';
import {Studio} from '../three/Lights';
import {Head} from '../three/Head';
import {Dust} from '../three/Dust';
import {Mirror} from '../three/Mirror';
import {Beam} from '../three/Beam';
import {FlashPhoto, MirrorPOV} from '../three/Views';
import {applyPrint, useFaceTexture, usePrintMaterial} from '../three/FacePrint';
import {Chapter} from '../ui/Chapter';
import {C, FONT} from '../theme';
import {E, clamp, map, track, track3, wobble} from '../lib/anim';
import {LABELS} from '../copy';
import {MID} from './S3Flip';

/** The living face: moving, blinking, turning in soft natural light. */
const Living: React.FC<{f: number; orbit?: number; fov?: number; dist?: number}> = ({f, orbit = 0, fov = 26, dist = 1.55}) => {
  const t = f / 30;
  const yaw = 0.28 * Math.sin(t * 0.7) + 0.05 * Math.sin(t * 2.1);
  const nod = 0.04 * Math.sin(t * 0.9 + 0.5);
  const blinks = [40, 150, 260, 380];
  let open = 1;
  for (const b of blinks) open = Math.min(open, clamp(Math.abs(f - b) / 4));
  const a = orbit;
  const cam: [number, number, number] = [Math.sin(a) * dist + MID, 0.2 + 0.01 * wobble(t, 4), Math.cos(a) * dist];
  return (
    <>
      <Rig position={cam} target={[MID, 0.13, 0]} fov={fov} />
      <Studio mood="neutral" intensity={0.95} />
      <directionalLight position={[-1.5, 1.2, -1.5]} intensity={2.4} color="#ffd2a0" />
      <directionalLight position={[1.6, 0.5, -1.2]} intensity={1.6} color="#9fd3ff" />
      <Head rotation={[nod, yaw, 0]} gaze={[cam[0] * 0.8, 0.2, cam[2]]} open={open} />
      <Dust count={600} box={[4, 3, 4]} center={[0, 0.2, 0]} color="#ffe2c4" size={0.013} />
    </>
  );
};

/* ------------------------------------------------ E1: three versions of you */
const Triptych: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / 30;
  const hi = map(f, [96, 116], [0, 1], E.out);
  const panel = (i: number, children: React.ReactNode, label: string, color: string, dim: number) => {
    const inP = map(f, [i * 8, i * 8 + 22], [0, 1], E.out);
    return (
      <div
        style={{
          position: 'absolute',
          left: 60 + i * 610,
          top: 130,
          width: 580,
          height: 720,
          overflow: 'hidden',
          borderRadius: 6,
          opacity: inP * (1 - dim * 0.65),
          transform: `translateY(${(1 - inP) * 40}px) scale(${1 + (i === 2 ? hi * 0.03 : 0)})`,
          boxShadow: i === 2 ? `0 0 0 ${2 + hi * 2}px ${hi > 0 ? C.gold : 'rgba(255,255,255,0.1)'}, 0 0 ${60 * hi}px ${C.amber}55` : '0 0 0 1px rgba(255,255,255,0.12)',
          filter: dim > 0 ? `saturate(${1 - dim * 0.7})` : undefined,
        }}
      >
        <div style={{position: 'absolute', left: -670, top: -180, width: 1920, height: 1080}}>{children}</div>
        <div style={{position: 'absolute', left: 0, right: 0, top: 0, height: 120, background: 'linear-gradient(180deg, rgba(4,6,11,0.75), rgba(4,6,11,0))'}} />
        <div style={{position: 'absolute', left: 0, right: 0, top: 22, textAlign: 'center', fontFamily: FONT.sans, fontWeight: 700, fontSize: 34, letterSpacing: '0.2em', color, textShadow: '0 2px 16px rgba(0,0,0,0.9)'}}>{label}</div>
      </div>
    );
  };
  return (
    <AbsoluteFill style={{background: C.ink}}>
      {panel(
        0,
        <Stage post={{bloom: 1.0, threshold: 0.55, vignette: 0.3}}>
          <MirrorPOV mirrorW={0.62} mirrorH={0.9} mirrorZ={1.05} fov={24} />
        </Stage>,
        LABELS.inMirror,
        C.gold,
        hi,
      )}
      {panel(
        1,
        <Stage shadows post={{bloom: 0.3, threshold: 0.9, vignette: 0.3, noise: 0.1}}>
          <FlashPhoto dist={0.75} fov={46} open={0.7} />
        </Stage>,
        LABELS.inPhoto,
        C.ice,
        hi,
      )}
      {panel(
        2,
        <Stage post={{bloom: 0.9, threshold: 0.6, vignette: 0.3}}>
          <Living f={f + 30} orbit={0.25 * Math.sin(t * 0.5)} fov={28} />
        </Stage>,
        LABELS.inOthers,
        C.text,
        0,
      )}
    </AbsoluteFill>
  );
};

/* ------------------------------------------------ E2: dynamic, three-dimensional, alive */
const Alive: React.FC = () => {
  const f = useCurrentFrame();
  const orbit = track(f, [
    [0, -0.7],
    [150, 0.55],
  ]);
  return (
    <AbsoluteFill>
      <Stage post={{bloom: 1.0, threshold: 0.58, vignette: 0.6, noise: 0.03}}>
        <Living f={f + 120} orbit={orbit} fov={24} dist={1.45} />
        <Beam position={[-0.9, 2.4, -0.6]} rotation={[0, 0, -0.35]} length={4} radius={1.0} opacity={0.08} />
      </Stage>
    </AbsoluteFill>
  );
};

/* ------------------------------------------------ E3: tip — flip your selfie */
const FlipCard: React.FC<{f: number}> = ({f}) => {
  const mat = usePrintMaterial();
  applyPrint(mat, {border: 0.05});
  const face = useFaceTexture({mood: 'neutral', bg: '#0e1118'});
  mat.uniforms.uMap.value = face.texture;
  const p = map(f, [26, 60], [0, 1], E.inOut);
  return (
    <>
      <group rotation={[0, Math.PI * p, 0]} position={[0, 0.05, 0]}>
        <mesh material={mat}>
          <planeGeometry args={[0.72, 0.9]} />
        </mesh>
      </group>
      {face.portal}
    </>
  );
};

const Tip: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / 30;
  const glow = map(f, [56, 72], [0, 1]);
  return (
    <AbsoluteFill>
      <Stage post={{bloom: 1.0, threshold: 0.6, vignette: 0.6}}>
        <Rig position={[0.03 * wobble(t, 2), 0.05, 1.9]} target={[0, 0.05, 0]} fov={34} />
        <Studio mood="neutral" />
        <FlipCard f={f} />
        <mesh position={[0, 0.05, -0.12]}>
          <planeGeometry args={[0.95, 1.15]} />
          <meshBasicMaterial color={new THREE.Color(C.gold).multiplyScalar(0.7)} transparent opacity={glow * 0.25} toneMapped={false} blending={THREE.AdditiveBlending} depthWrite={false} />
        </mesh>
        <Dust count={400} box={[3, 2, 2]} center={[0, 0, -0.5]} color="#ffe2c4" size={0.012} />
      </Stage>
      {/* rotation arrow drawn as a light arc */}
      <svg width={1920} height={1080} style={{position: 'absolute', inset: 0, opacity: map(f, [10, 24], [0, 1]) * map(f, [70, 84], [1, 0.3])}}>
        <path d="M 640 190 Q 960 110 1280 190" stroke={C.gold} strokeWidth={3} fill="none" strokeDasharray="640" strokeDashoffset={640 * (1 - map(f, [18, 56], [0, 1]))} />
        <path d="M 1262 168 L 1284 192 L 1252 200" stroke={C.gold} strokeWidth={3} fill="none" opacity={map(f, [50, 56], [0, 1])} />
      </svg>
    </AbsoluteFill>
  );
};

/* ------------------------------------------------ E4: the question */
const Question: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / 30;
  const cam = track3(
    f,
    [
      [0, [1.1, 0.5, 3.0]],
      [130, [0.75, 0.35, 2.55]],
    ],
    E.soft,
  );
  const q = map(f, [8, 30], [0, 1], E.out);
  const a = map(f, [26, 44], [0, 1], E.out);
  const b = map(f, [34, 52], [0, 1], E.out);
  const hint = map(f, [52, 70], [0, 1], E.out);
  const pulse = 0.5 + 0.5 * Math.sin(t * 5);
  const lines = LABELS.ctaQ.split('\n');
  const option = (text: string, color: string, p: number) => (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '18px 34px',
        marginRight: 26,
        border: `2px solid ${color}`,
        borderRadius: 999,
        fontFamily: FONT.sans,
        fontWeight: 700,
        fontSize: 34,
        letterSpacing: '0.12em',
        color,
        background: 'rgba(4,6,11,0.55)',
        opacity: p,
        transform: `translateY(${(1 - p) * 18}px)`,
        boxShadow: `0 0 30px ${color}33`,
      }}
    >
      {text}
    </div>
  );
  return (
    <AbsoluteFill>
      <Stage post={{bloom: 1.2, threshold: 0.5, vignette: 0.7, noise: 0.04}} fog={['#04060b', 3, 9]}>
        <Rig position={cam} target={[0.52, 0.2, 0]} fov={30} />
        <Studio mood="mirror" intensity={0.8} />
        <Head layer={1} position={[0.95, -0.02, 0.85]} rotation={[0, Math.PI + 0.12 * Math.sin(t * 0.6), 0]} gaze={[-cam[0] + 0.95, cam[1] + 0.02, cam[2] + 0.85]} />
        <pointLight position={[1.25, 0.55, 0.25]} intensity={2.2} color="#ffd4a0" distance={3} decay={2} />
        <Mirror position={[0.95, 0.15, 0]} width={0.95} height={1.9} frame="bronze" sweep={map(f, [20, 120], [-1.0, 1.8])} />
        <Beam position={[1.5, 2.6, 0.9]} rotation={[0, 0, 0.25]} length={4} radius={1.2} opacity={0.1} />
        <Dust count={1200} box={[7, 4, 7]} center={[0.5, 0.3, 0.5]} color="#ffd7a6" size={0.016} />
      </Stage>
      <div style={{position: 'absolute', left: 140, top: 250}}>
        {lines.map((ln, i) => (
          <div
            key={i}
            style={{
              fontFamily: FONT.serif,
              fontWeight: 900,
              fontSize: 76,
              lineHeight: 1.28,
              letterSpacing: '0.04em',
              color: C.text,
              opacity: q,
              transform: `translateY(${(1 - q) * 24}px)`,
              textShadow: '0 6px 40px rgba(0,0,0,0.9)',
            }}
          >
            {ln}
          </div>
        ))}
        <div style={{marginTop: 48}}>
          {option(LABELS.ctaA, C.gold, a)}
          {option(LABELS.ctaB, C.ice, b)}
        </div>
        <div style={{marginTop: 46, display: 'flex', alignItems: 'center', gap: 18, opacity: hint}}>
          <div style={{width: 14, height: 14, borderRadius: 7, background: C.gold, boxShadow: `0 0 ${10 + pulse * 18}px ${C.gold}`}} />
          <div style={{fontFamily: FONT.sans, fontWeight: 500, fontSize: 34, letterSpacing: '0.3em', color: C.gold}}>{LABELS.ctaHint}</div>
        </div>
      </div>
      <div style={{position: 'absolute', left: 140, bottom: 34, fontFamily: FONT.mono, fontSize: 15, letterSpacing: '0.08em', color: 'rgba(244,241,234,0.35)', opacity: map(f, [60, 80], [0, 1])}}>
        {LABELS.credit}
      </div>
      <AbsoluteFill style={{background: 'black', opacity: map(f, [112, 130], [0, 1])}} />
    </AbsoluteFill>
  );
};

export const S8End: React.FC = () => {
  const f = useCurrentFrame();
  const cut = (at: number) => clamp(1 - Math.abs(f - at) / 6);
  return (
    <AbsoluteFill style={{background: C.ink}}>
      <Sequence from={0} durationInFrames={156}>
        <Triptych />
      </Sequence>
      <Sequence from={152} durationInFrames={152}>
        <Alive />
      </Sequence>
      <Sequence from={300} durationInFrames={92}>
        <Tip />
      </Sequence>
      <Sequence from={388} durationInFrames={132}>
        <Question />
      </Sequence>
      <AbsoluteFill style={{background: '#fff1dc', opacity: (cut(154) + cut(302) + cut(390)) * 0.45, mixBlendMode: 'screen'}} />
      <Sequence from={4} durationInFrames={130}>
        <Chapter index={6} name={LABELS.ch[5]} />
      </Sequence>
    </AbsoluteFill>
  );
};
