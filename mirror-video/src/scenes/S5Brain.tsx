import React, {useMemo} from 'react';
import {AbsoluteFill, Sequence, useCurrentFrame} from 'remotion';
import * as THREE from 'three';
import {Stage} from '../three/Stage';
import {Rig} from '../three/Rig';
import {Studio} from '../three/Lights';
import {Head} from '../three/Head';
import {Dust} from '../three/Dust';
import {Ring} from '../three/Ring';
import {Brain, BRAIN} from '../three/Brain';
import {Nerve} from '../three/Nerve';
import {Eyeball} from '../three/Eye';
import {EyeCut, Ray} from '../three/EyeCut';
import {Callout} from '../three/Callout';
import {Neurons} from '../three/Neurons';
import {Print, usePrintMaterial, applyPrint, useFaceTexture} from '../three/FacePrint';
import {Chapter} from '../ui/Chapter';
import {C, FONT} from '../theme';
import {E, clamp, lerp, map, track, track3, wobble} from '../lib/anim';
import {LABELS} from '../copy';
import {MID, MOLE} from './S3Flip';

const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

/* ---------------------------------------------------------------- E1: into the eye */
const IntoEye: React.FC = () => {
  const f = useCurrentFrame();
  const eye = [0.0652, 0.2113, 0.1958] as const;
  const p = map(f, [0, 62], [0, 1], E.expoIn);
  const cam: [number, number, number] = [lerp(MID + 0.02, eye[0], E.inOut(clamp(f / 40))), lerp(0.2, eye[1], E.inOut(clamp(f / 40))), lerp(1.25, eye[2] + 0.045, p)];
  const glow = map(f, [0, 20], [1, 0]);
  return (
    <AbsoluteFill>
      <Stage post={{bloom: 1.2, threshold: 0.5, vignette: 0.7}}>
        <Rig position={cam} target={[eye[0], eye[1], eye[2]]} fov={lerp(28, 18, p)} near={0.002} />
        <Studio mood="mirror" intensity={0.9} />
        <Head gaze={[cam[0], cam[1], cam[2] + 0.4]} eye={{pupil: lerp(0.2, 0.42, p), detail: 1.6}} rim={['#ffb35c', 1.4 * glow]} />
      </Stage>
      <AbsoluteFill style={{background: '#ffd9a0', opacity: glow * 0.6, mixBlendMode: 'screen'}} />
      <AbsoluteFill style={{background: 'black', opacity: map(f, [50, 64], [0, 1])}} />
    </AbsoluteFill>
  );
};

/* ---------------------------------------------------------------- E2: optics of the eye */
const RetinaImage: React.FC<{t: number; alpha: number}> = ({t, alpha}) => {
  const printMat = usePrintMaterial();
  applyPrint(printMat, {mode: 'retina', t, alpha, bright: 1.3});
  const face = useFaceTexture({mood: 'neutral', bg: '#000000', w: 384, h: 480});
  printMat.uniforms.uMap.value = face.texture;
  return (
    <>
      <mesh material={printMat} renderOrder={9}>
        <sphereGeometry args={[0.93, 48, 48, Math.PI - 0.62, 1.24, Math.PI / 2 - 0.72, 1.44]} />
      </mesh>
      {face.portal}
    </>
  );
};

const Optics: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / 30;
  const cam = track3(
    f,
    [
      [0, [-1.6, 0.35, 5.6]],
      [55, [-0.9, 0.25, 4.4]],
      [95, [-0.55, 0.12, 1.25]],
      [125, [-0.2, 0.05, 0.95]],
    ],
    E.inOut,
  );
  const target = track3(f, [
    [0, [-1.4, 0, 0]],
    [55, [-0.6, 0, 0]],
    [95, [0.7, -0.05, -0.1]],
    [125, [0.95, 0, -0.05]],
  ]);
  const rays = map(f, [8, 40], [0, 1], E.inOut);
  // nodal point of the eye: rays cross here and land upside-down on the retina
  const N = V(-0.62, 0, 0);
  const objX = -3.6;
  const ys = [0.95, 0.55, 0.0, -0.55, -0.95];
  const nerve = map(f, [100, 125], [0, 1]);
  return (
    <AbsoluteFill>
      <Stage post={{bloom: 1.1, threshold: 0.55, vignette: 0.65}} fog={['#04060b', 6, 14]}>
        <Rig position={cam} target={target} fov={32} />
        <Studio mood="lab" intensity={0.85} />
        <pointLight position={[-1.5, 1.5, 2]} intensity={6} color="#fff0dc" distance={8} decay={2} />
        <EyeCut nerveGlow={nerve} />
        {/* the face out in the world, upright */}
        <group position={[objX, -0.12 * 2.3, 0]} scale={2.3} rotation={[0, Math.PI / 2, 0]}>
          <Head ghost opacity={0.99} rim={['#ffc879', 2.2]} gaze={[0, 0.2, 3]} />
        </group>
        {ys.map((y, i) => {
          const a = V(objX + 0.55, y, 0);
          const dir = N.clone().sub(a).normalize();
          // intersect with retina sphere (r = .95) beyond the nodal point
          const o = N.clone();
          const b0 = o.dot(dir);
          const c0 = o.lengthSq() - 0.95 * 0.95;
          const s = -b0 + Math.sqrt(b0 * b0 - c0);
          const b = o.clone().add(dir.clone().multiplyScalar(s));
          const col = y > 0 ? '#ffc879' : y < 0 ? '#5fd4ff' : '#ffffff';
          return (
            <group key={i}>
              <Ray a={a} b={N} p={clamp(rays * 1.6)} color={col} width={0.007} />
              <Ray a={N} b={b} p={clamp(rays * 1.6 - 0.6)} color={col} width={0.007} />
            </group>
          );
        })}
        {/* the image that lands on the retina: rotated 180°, sampled by photoreceptors */}
        <RetinaImage t={t} alpha={map(f, [40, 62], [0, 1])} />
        <Callout position={[0.93, -0.55, 0]} text={LABELS.retina} sub="RETINA" dx={-150} dy={110} p={map(f, [50, 66], [0, 1]) * map(f, [92, 100], [1, 0])} color={C.gold} />
        <Dust count={500} box={[8, 4, 6]} center={[-1, 0, 0]} color="#bfe6ff" size={0.012} />
      </Stage>
      <AbsoluteFill style={{background: 'black', opacity: map(f, [0, 10], [1, 0]) + map(f, [118, 128], [0, 1])}} />
    </AbsoluteFill>
  );
};

/* ---------------------------------------------------------------- B1: the visual pathway */
const PATH = {
  onL: [V(0.27, -0.3, 1.0), V(0.2, -0.38, 0.8), V(0.08, -0.45, 0.55), BRAIN.chiasm],
  onR: [V(-0.27, -0.3, 1.0), V(-0.2, -0.38, 0.8), V(-0.08, -0.45, 0.55), BRAIN.chiasm],
  trL: [BRAIN.chiasm, V(0.1, -0.44, 0.3), V(0.2, -0.38, 0.12), BRAIN.lgnL],
  trR: [BRAIN.chiasm, V(-0.1, -0.44, 0.3), V(-0.2, -0.38, 0.12), BRAIN.lgnR],
};
const radiation = (side: 1 | -1, k: number) => {
  const o = (k - 2) * 0.035;
  return [
    side > 0 ? BRAIN.lgnL : BRAIN.lgnR,
    V(side * (0.3 + o * 0.5), -0.24 + o, -0.22),
    V(side * (0.26 + o * 0.3), -0.12 + o, -0.55),
    V(side * (0.13 + o * 0.2), -0.03 + o * 0.6, -0.8),
  ];
};
const ventral = (side: 1 | -1) => [
  side > 0 ? BRAIN.v1L : BRAIN.v1R,
  V(side * 0.22, -0.25, -0.7),
  V(side * 0.3, -0.38, -0.52),
  side > 0 ? BRAIN.ffaL : BRAIN.ffaR,
];

const Pathway: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / 30;
  const cam = track3(
    f,
    [
      [0, [-1.9, 1.05, 2.5]],
      [130, [-2.6, 0.55, 0.2]],
      [215, [-2.5, -0.35, -0.9]],
      [310, [-2.0, -1.25, 0.15]],
    ],
    E.inOut,
  );
  const target = track3(f, [
    [0, [0, -0.25, 0.45]],
    [130, [0, -0.2, -0.25]],
    [215, [-0.1, -0.2, -0.55]],
    [310, [-0.25, -0.38, -0.35]],
  ]);
  const pOn = map(f, [12, 60], [0, 1.2]);
  const pTr = map(f, [55, 95], [0, 1.2]);
  const pRad = map(f, [90, 150], [0, 1.2]);
  const pVen = map(f, [175, 255], [0, 1.2]);
  const xray = track(f, [
    [0, 0.85],
    [140, 0.8],
    [190, 0.35],
    [310, 0.3],
  ]);
  const v1 = map(f, [140, 170], [0, 1], E.out);
  const ffa = map(f, [240, 270], [0, 1], E.out);
  // ventral wave: a travelling blob of activity from V1 to FFA
  const wv = clamp(pVen);
  const ven = new THREE.CatmullRomCurve3(ventral(-1)).getPoint(wv);
  const acts = [
    {pos: BRAIN.v1R, radius: 0.16, strength: v1 * 1.1, color: '#5fd4ff'},
    {pos: BRAIN.v1L, radius: 0.16, strength: v1 * 0.9, color: '#5fd4ff'},
    {pos: ven, radius: 0.12, strength: f > 175 && f < 270 ? 1.2 : 0, color: '#b48cff'},
    {pos: BRAIN.ffaR, radius: 0.14, strength: ffa * 1.5, color: '#ffc879'},
  ];
  return (
    <AbsoluteFill>
      <Stage post={{bloom: 1.25, threshold: 0.5, vignette: 0.7, noise: 0.04}}>
        <Rig position={[cam[0] + 0.01 * wobble(t, 1), cam[1], cam[2]]} target={target} fov={34} />
        <Studio mood="lab" intensity={0.9} />
        <Brain t={t} xray={xray} acts={acts} spark={ffa * 0.6} />
        <Eyeball position={[BRAIN.eyeL.x, BRAIN.eyeL.y, BRAIN.eyeL.z]} radius={0.12} gaze={[BRAIN.eyeL.x, BRAIN.eyeL.y, 4]} look={{pupil: 0.24}} />
        <Eyeball position={[BRAIN.eyeR.x, BRAIN.eyeR.y, BRAIN.eyeR.z]} radius={0.12} gaze={[BRAIN.eyeR.x, BRAIN.eyeR.y, 4]} look={{pupil: 0.24}} />
        <Nerve points={PATH.onL} radius={0.024} progress={pOn} t={t} />
        <Nerve points={PATH.onR} radius={0.024} progress={pOn} t={t} />
        <Nerve points={PATH.trL} radius={0.02} progress={pTr} t={t} />
        <Nerve points={PATH.trR} radius={0.02} progress={pTr} t={t} />
        {[0, 1, 2, 3, 4].map((k) => (
          <React.Fragment key={k}>
            <Nerve points={radiation(1, k)} radius={0.008} progress={pRad - k * 0.04} t={t} base={0.4} />
            <Nerve points={radiation(-1, k)} radius={0.008} progress={pRad - k * 0.04} t={t} base={0.4} />
          </React.Fragment>
        ))}
        <Nerve points={ventral(-1)} radius={0.012} progress={pVen} t={t} color="#4a3a7a" pulseColor="#ffd6a0" base={0.3} />
        <Callout position={BRAIN.chiasm.toArray() as [number, number, number]} text={LABELS.chiasm} sub="OPTIC CHIASM" dx={-130} dy={90} p={map(f, [48, 64], [0, 1]) * map(f, [120, 130], [1, 0])} />
        <Callout position={BRAIN.lgnR.toArray() as [number, number, number]} text={LABELS.lgn} sub="LGN" dx={-140} dy={-80} p={map(f, [88, 104], [0, 1]) * map(f, [150, 160], [1, 0])} />
        <Callout position={BRAIN.v1R.toArray() as [number, number, number]} text={LABELS.v1} sub="PRIMARY VISUAL CORTEX" dx={150} dy={-110} p={map(f, [150, 168], [0, 1]) * map(f, [228, 238], [1, 0])} />
        <Callout position={BRAIN.ffaR.toArray() as [number, number, number]} text={LABELS.ffa} sub="FUSIFORM FACE AREA" dx={-170} dy={110} p={map(f, [255, 272], [0, 1])} color={C.gold} />
        <Dust count={700} box={[5, 3, 5]} center={[0, -0.2, 0]} color="#9fd8ff" size={0.012} />
      </Stage>
    </AbsoluteFill>
  );
};

/* ---------------------------------------------------------------- B2: template matching in the FFA */
const Match: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / 30;
  // photo face arrives, fails to match, is pushed out
  const inP = map(f, [0, 34], [0, 1], E.out);
  const outP = map(f, [104, 124], [0, 1], E.in);
  const photoX = lerp(1.6, 0, inP) - outP * 1.8;
  const jitter = f > 40 && f < 104 ? Math.sin(f * 1.7) * 0.004 * map(f, [40, 60], [0, 1]) : 0;
  const bad = map(f, [40, 52], [0, 1]) * (1 - outP);
  // mirror face arrives and locks in
  const mIn = map(f, [124, 156], [0, 1], E.out);
  const mirX = lerp(-1.6, 0, mIn);
  const lock = map(f, [154, 166], [0, 1], E.out);
  const burst = map(f, [154, 160, 190], [0, 1, 0.25]);
  const camZ = track(f, [
    [0, 1.9],
    [230, 1.6],
  ]);
  const moleL: [number, number, number] = [MOLE[0], MOLE[1], MOLE[2] + 0.004];
  return (
    <AbsoluteFill>
      <Stage post={{bloom: 1.3, threshold: 0.45, vignette: 0.75, noise: 0.04}} fog={['#03050a', 2.5, 8]}>
        <Rig position={[MID + 0.03 * Math.sin(t * 0.5), 0.17, camZ]} target={[MID, 0.13, 0]} fov={28} />
        <Neurons t={t} position={[0, 0, -2.2]} count={30} intensity={0.9} />
        {/* the stored template: your mirror face */}
        <Head flip ghost opacity={0.99} rim={['#ffc879', 1.6 + burst * 2]} gaze={[0, 0.18, 3]} />
        {/* incoming photo version: same person, not reversed */}
        {photoX > -1.7 && photoX < 1.65 ? (
          <group position={[photoX + jitter, 0, 0.004]}>
            <Head ghost opacity={0.99} rim={[bad > 0.5 ? '#ff6a5a' : '#7fdcff', 1.9]} gaze={[0, 0.18, 3]}>
              <Ring position={moleL} rotation={[0, -0.5, 0]} radius={0.032} color="#ff5a4a" strength={bad} pulse={f / 20} />
            </Head>
          </group>
        ) : null}
        <group>
          {/* template's own mole (on the other side) */}
          <group scale={[-1, 1, 1]}>
            <Ring position={moleL} rotation={[0, -0.5, 0]} radius={0.032} color={lock > 0 ? '#ffc879' : '#ff5a4a'} strength={Math.max(bad, lock)} pulse={f / 20} />
          </group>
        </group>
        {mIn > 0 ? (
          <group position={[mirX, 0, 0.004]}>
            <Head flip ghost opacity={0.99} rim={['#ffd9a0', 1.8 * (1 - lock * 0.5)]} gaze={[0, 0.18, 3]} />
          </group>
        ) : null}
        <Dust count={600} box={[4, 3, 4]} center={[0, 0.1, -0.5]} color={lock > 0 ? '#ffd7a6' : '#9fd8ff'} size={0.012} />
      </Stage>
      <div style={{position: 'absolute', left: 150, top: 420}}>
        <span
          style={{
            fontFamily: FONT.sans,
            fontWeight: 900,
            fontSize: 72,
            letterSpacing: '0.3em',
            color: C.alert,
            opacity: bad,
            textShadow: `0 0 30px ${C.alert}88`,
            display: 'inline-block',
            transform: `translateX(${jitter * 3000}px)`,
          }}
        >
          {LABELS.mismatch}
        </span>
      </div>
      <div style={{position: 'absolute', left: 150, top: 420}}>
        <span style={{fontFamily: FONT.sans, fontWeight: 900, fontSize: 72, letterSpacing: '0.3em', color: C.gold, opacity: lock, textShadow: `0 0 40px ${C.amber}aa`, display: 'inline-block', transform: `scale(${1.15 - lock * 0.15})`}}>
          {LABELS.match}
        </span>
      </div>
      <div style={{position: 'absolute', left: 120, top: 980 - 70, fontFamily: FONT.mono, fontSize: 20, letterSpacing: '0.2em', color: C.gold, opacity: map(f, [10, 24], [0, 0.85])}}>
        {LABELS.template}
      </div>
      <AbsoluteFill style={{background: 'radial-gradient(circle at 50% 45%, rgba(255,214,150,0.55), rgba(0,0,0,0) 55%)', opacity: burst, mixBlendMode: 'screen'}} />
    </AbsoluteFill>
  );
};

/* ---------------------------------------------------------------- B3: Mita, Dermer & Knight 1977 */
const Experiment: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / 30;
  const you = map(f, [18, 34], [0, 1], E.out);
  const friend = map(f, [100, 116], [0, 1], E.out);
  const youFade = map(f, [92, 104], [1, 0.35]);
  const term = map(f, [124, 146], [0, 1], E.out);
  const glowFrame = (x: number, color: string, a: number) =>
    a > 0.001 ? (
      <group position={[x, 0.02, -0.14]} rotation={[0, x < 0 ? 0.12 : -0.12, 0]}>
        {[
          [0, 0.37, 0.6, 0.012],
          [0, -0.37, 0.6, 0.012],
          [0.3, 0, 0.012, 0.75],
          [-0.3, 0, 0.012, 0.75],
        ].map(([px, py, sx, sy], i) => (
          <mesh key={i} position={[px, py, 0]} scale={[sx, sy, 1]}>
            <planeGeometry />
            <meshBasicMaterial color={new THREE.Color(color).multiplyScalar(5)} transparent opacity={a} toneMapped={false} blending={THREE.AdditiveBlending} depthWrite={false} />
          </mesh>
        ))}
        <mesh scale={[0.66, 0.8, 1]} position={[0, 0, -0.01]}>
          <planeGeometry />
          <meshBasicMaterial color={new THREE.Color(color).multiplyScalar(0.6)} transparent opacity={a * 0.35} toneMapped={false} blending={THREE.AdditiveBlending} depthWrite={false} />
        </mesh>
      </group>
    ) : null;
  const tag = (x: number, text: string, color: string, a: number) => (
    <div style={{position: 'absolute', left: x - 260, width: 520, top: 128, textAlign: 'center', opacity: a, transform: `translateY(${(1 - a) * 14}px)`}}>
      <div style={{fontFamily: FONT.sans, fontWeight: 700, fontSize: 36, letterSpacing: '0.18em', color}}>{text}</div>
    </div>
  );
  return (
    <AbsoluteFill>
      <Stage post={{bloom: 1.0, threshold: 0.7, vignette: 0.7}}>
        <Rig position={[0.02 * wobble(t, 2), 0.02, 2.3 - map(f, [0, 200], [0, 0.15])]} target={[0, 0.0, 0]} fov={30} />
        <Studio mood="neutral" intensity={0.9} />
        <spotLight position={[0, 2, 2]} angle={0.7} penumbra={0.8} intensity={6} color="#fff4e6" />
        <Print position={[-0.42, 0.02, 0]} rotation={[0, 0.12 + 0.02 * Math.sin(t), 0.02]} flip mood="neutral" params={{border: 0.06}} />
        <Print position={[0.42, 0.02, 0]} rotation={[0, -0.12 + 0.02 * Math.sin(t + 1), -0.02]} mood="neutral" params={{border: 0.06}} />
        {glowFrame(-0.42, C.gold, you * youFade)}
        {glowFrame(0.42, C.ice, friend)}
        <Dust count={400} box={[3, 2, 2]} center={[0, 0, -0.4]} color="#ffe2c4" size={0.012} />
      </Stage>
      <div style={{position: 'absolute', left: 0, right: 0, top: 72, display: 'flex', justifyContent: 'center', gap: 640}}>
        <div style={{fontFamily: FONT.mono, fontSize: 24, letterSpacing: '0.24em', color: C.gold, opacity: map(f, [4, 16], [0, 1])}}>{LABELS.mirrorVer}</div>
        <div style={{fontFamily: FONT.mono, fontSize: 24, letterSpacing: '0.24em', color: C.ice, opacity: map(f, [4, 16], [0, 1])}}>{LABELS.trueVer}</div>
      </div>
      {tag(960 - 420, LABELS.you, C.gold, you * youFade)}
      {tag(960 + 420, LABELS.friend, C.ice, friend)}
      <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center', pointerEvents: 'none'}}>
        <div
          style={{
            fontFamily: FONT.serif,
            fontWeight: 900,
            fontSize: 110,
            letterSpacing: '0.2em',
            color: C.text,
            opacity: term,
            transform: `scale(${1.25 - term * 0.25})`,
            filter: term < 1 ? `blur(${(1 - term) * 14}px)` : undefined,
            textShadow: '0 0 60px rgba(0,0,0,0.95), 0 0 120px rgba(0,0,0,0.9)',
          }}
        >
          {LABELS.exposure}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

export const S5Brain: React.FC = () => {
  const f = useCurrentFrame();
  const cut = (at: number) => clamp(1 - Math.abs(f - at) / 6);
  return (
    <AbsoluteFill style={{background: C.ink}}>
      <Sequence from={0} durationInFrames={66}>
        <IntoEye />
      </Sequence>
      <Sequence from={62} durationInFrames={130}>
        <Optics />
      </Sequence>
      <Sequence from={188} durationInFrames={316}>
        <Pathway />
      </Sequence>
      <Sequence from={500} durationInFrames={226}>
        <Match />
      </Sequence>
      <Sequence from={722} durationInFrames={208}>
        <Experiment />
      </Sequence>
      <AbsoluteFill style={{background: '#dff4ff', opacity: (cut(190) + cut(502) + cut(724)) * 0.5, mixBlendMode: 'screen'}} />
      <Sequence from={64} durationInFrames={130}>
        <Chapter index={3} name={LABELS.ch[2]} />
      </Sequence>
    </AbsoluteFill>
  );
};
