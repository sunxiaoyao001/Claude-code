import React, {useMemo} from 'react';
import {AbsoluteFill, Sequence, useCurrentFrame} from 'remotion';
import * as THREE from 'three';
import {Stage} from '../three/Stage';
import {Rig} from '../three/Rig';
import {Studio} from '../three/Lights';
import {Head} from '../three/Head';
import {Dust} from '../three/Dust';
import {archShape} from '../three/Mirror';
import {Chapter} from '../ui/Chapter';
import {C, FONT} from '../theme';
import {E, clamp, map, rng, track} from '../lib/anim';
import {LABELS} from '../copy';

const N = 16;
const GAP = 1.25;

/** One remembered mirror moment: bronze arch, a pane of glass, your reversed face behind it. */
const MirrorMoment: React.FC<{i: number; z: number; mood: string; t: number; camZ: number}> = ({i, z, mood, t, camZ}) => {
  const {frameGeo, glassGeo} = useMemo(() => {
    const outer = archShape(0.98, 1.36);
    const hole = archShape(0.88, 1.26);
    outer.holes.push(new THREE.Path(hole.getPoints(80)));
    const fg = new THREE.ExtrudeGeometry(outer, {depth: 0.03, bevelEnabled: true, bevelThickness: 0.012, bevelSize: 0.01, bevelSegments: 4, curveSegments: 80});
    const gg = new THREE.ShapeGeometry(archShape(0.9, 1.28), 48);
    return {frameGeo: fg, glassGeo: gg};
  }, []);
  const frameMat = useMemo(() => new THREE.MeshPhysicalMaterial({color: '#a07848', metalness: 1, roughness: 0.3, clearcoat: 0.3}), []);
  const glassMat = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: '#ffffff',
        roughness: 0.04,
        metalness: 0,
        transparent: true,
        opacity: 0.045,
        clearcoat: 1,
        envMapIntensity: 1.2,
        depthWrite: false,
      }),
    [],
  );
  const r = rng(i * 97 + 3);
  const yaw = (r() - 0.5) * 0.5;
  const tilt = (r() - 0.5) * 0.12;
  const sway = Math.sin(t * 0.8 + i) * 0.04;
  return (
    <group position={[0, 0, z]} rotation={[0, 0, (r() - 0.5) * 0.04]}>
      <mesh geometry={frameGeo} material={frameMat} position={[0, 0.12, 0]} />
      <mesh geometry={glassGeo} material={glassMat} position={[0, 0.12, 0.035]} />
      {/* your reflection: the reversed face, a different moment each time */}
      {(() => {
        // as we fly in, the reflection dissolves into a glowing outline and lets us through
        const d = z - 0.42 - camZ; // negative = ahead of camera
        const near = clamp((d + 1.15) / 0.55); // 0 far .. 1 at the face
        if (near >= 0.98) return null;
        return near > 0.02 ? (
          <Head flip ghost opacity={0.99} position={[0, -0.12, -0.42]} rotation={[tilt, yaw + sway, 0]} rim={['#ffc879', 2.2 * (1 - near)]} gaze={[0, 0.2, 3]} />
        ) : (
          <Head flip position={[0, -0.12, -0.42]} rotation={[tilt, yaw + sway, 0]} gaze={[0, 0.2, 3]} tint={mood} />
        );
      })()}
    </group>
  );
};

const Tunnel: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / 30;
  // accelerate through the corridor of mornings and nights
  const camZ = track(
    f,
    [
      [0, 1.7],
      [70, 0.9],
      [300, -GAP * 11.2],
    ],
    E.inOut,
  );
  const moods = ['#ffe2c4', '#ffffff', '#ffd2a8', '#e8f0ff', '#fff0dc', '#ffc9a0'];
  const count = Math.round(map(f, [40, 280], [1, 3000], (x) => x * x * (3 - 2 * x)));
  const counterA = map(f, [30, 46], [0, 1], E.out) * map(f, [286, 300], [1, 0]);
  return (
    <AbsoluteFill>
      <Stage post={{bloom: 1.15, threshold: 0.55, vignette: 0.75, noise: 0.04, ca: 0.0015}} fog={['#05060b', 2.2, 7.5]}>
        <Rig position={[Math.sin(t * 0.7) * 0.06, 0.16 + Math.sin(t * 0.5) * 0.03, camZ]} target={[Math.sin(t * 0.7 + 0.4) * 0.03, 0.12, camZ - 3]} fov={40} roll={Math.sin(t * 0.6) * 0.05} />
        <Studio mood="mirror" intensity={0.9} />
        <pointLight position={[0.4, 0.8, camZ - 0.6]} intensity={2.5} color="#ffd8b0" distance={4} decay={2} />
        {Array.from({length: N}).map((_, i) => {
          const z = -i * GAP;
          if (z > camZ + 0.6 || z < camZ - 9) return null;
          return <MirrorMoment key={i} i={i} z={z} mood={moods[i % moods.length]} t={t} camZ={camZ} />;
        })}
        <Dust count={1600} box={[4, 3, 24]} center={[0, 0.2, -8]} color="#ffd7a6" size={0.012} />
      </Stage>
      <div style={{position: 'absolute', right: 120, top: 96, textAlign: 'right', opacity: counterA}}>
        <div style={{fontFamily: FONT.sans, fontWeight: 500, fontSize: 26, letterSpacing: '0.3em', color: C.textDim}}>{LABELS.perYear}</div>
        <div style={{fontFamily: FONT.mono, fontWeight: 600, fontSize: 96, color: C.gold, letterSpacing: '-0.02em', textShadow: `0 0 40px ${C.amber}66`}}>
          ×{count.toLocaleString('en-US')}
          {count >= 3000 ? '+' : ''}
        </div>
      </div>
    </AbsoluteFill>
  );
};

/** Many reversed faces fall together into one stored "self" template. */
const Merge: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / 30;
  const p = map(f, [0, 70], [0, 1], E.inOut);
  const glow = map(f, [50, 90], [0, 1], E.out);
  const push = map(f, [70, 125], [0, 1], E.in);
  const ring = 9;
  const camZ = 2.1 - push * 1.75;
  return (
    <AbsoluteFill>
      <Stage post={{bloom: 1.4, threshold: 0.45, vignette: 0.7, noise: 0.04}} fog={['#05060b', 2.5, 9]}>
        <Rig position={[0.05 * (1 - push), 0.2 - 0.01 * push, camZ]} target={[-0.075 * push, 0.21, 0]} fov={30 - push * 6} />
        <Studio mood="mirror" intensity={0.9} />
        {Array.from({length: ring}).map((_, i) => {
          const a = (i / ring) * Math.PI * 2 + t * 0.2;
          const rad = 1.25 * (1 - p);
          const x = Math.cos(a) * rad * 1.3;
          const y = Math.sin(a) * rad * 0.75;
          const z = -0.6 * (1 - p) - Math.abs(Math.sin(a)) * 0.3 * (1 - p);
          return (
            <Head
              key={i}
              flip
              ghost={p > 0.6}
              position={[x, y, z]}
              rotation={[0, -x * 0.25, 0]}
              rim={['#ffc879', 1.4 * p]}
              opacity={p > 0.6 ? 0.99 : 1}
              gaze={[0, 0.2, 3]}
            />
          );
        })}
        <Head flip gaze={[0.0, 0.2, 3]} rim={['#ffb35c', 1.6 * glow]} tint={glow > 0 ? '#ffe7c8' : '#ffffff'} emissive="#ff9a40" emissiveIntensity={0.08 * glow} />
        <Head flip ghost position={[0, 0, 0.003]} rim={['#ffc879', 2.2 * glow]} opacity={0.99} gaze={[0, 0.2, 3]} />
        <Dust count={900} box={[4, 3, 4]} center={[0, 0.2, 0]} color="#ffd7a6" size={0.014} speed={1 + p * 2} />
      </Stage>
      <AbsoluteFill style={{background: 'radial-gradient(circle at 46% 42%, rgba(255,230,190,1), rgba(255,190,110,0.6) 30%, rgba(4,6,11,0) 70%)', opacity: map(f, [104, 124], [0, 1], E.in)}} />
    </AbsoluteFill>
  );
};

export const S4Tunnel: React.FC = () => {
  const f = useCurrentFrame();
  const flashA = clamp(1 - Math.abs(f - 300) / 8);
  return (
    <AbsoluteFill style={{background: C.ink}}>
      <Sequence from={0} durationInFrames={304}>
        <Tunnel />
      </Sequence>
      <Sequence from={296} durationInFrames={124}>
        <Merge />
      </Sequence>
      <AbsoluteFill style={{background: '#ffe9cc', opacity: flashA * 0.7, mixBlendMode: 'screen'}} />
      <AbsoluteFill style={{background: '#fff3e2', opacity: map(f, [0, 12], [0.9, 0])}} />
      <Sequence from={0} durationInFrames={130}>
        <Chapter index={2} name={LABELS.ch[1]} />
      </Sequence>
    </AbsoluteFill>
  );
};
