import React from 'react';
import {AbsoluteFill, Sequence, useCurrentFrame} from 'remotion';
import * as THREE from 'three';
import {useThree} from '@react-three/fiber';
import {Stage} from '../three/Stage';
import {Rig} from '../three/Rig';
import {Studio} from '../three/Lights';
import {Head} from '../three/Head';
import {Dust} from '../three/Dust';
import {FlashPhoto, MirrorPOV} from '../three/Views';
import {Ray} from '../three/EyeCut';
import {Callout} from '../three/Callout';
import {applyPrint, useFaceTexture, usePrintMaterial} from '../three/FacePrint';
import {Viewfinder} from '../ui/Viewfinder';
import {Chapter} from '../ui/Chapter';
import {C, FONT} from '../theme';
import {E, clamp, lerp, map, track3, wobble} from '../lib/anim';
import {LABELS} from '../copy';
import {MID} from './S3Flip';

/** 8-blade iris wipe drawn over the frame: the shutter closing and opening. */
const IrisWipe: React.FC<{close: number; rot?: number}> = ({close, rot = 0}) => {
  if (close <= 0.001) return null;
  const R = 1150;
  const r = R * (1 - close);
  const pts: string[] = [];
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + rot;
    pts.push(`${960 + Math.cos(a) * r},${540 + Math.sin(a) * r}`);
  }
  const blades = Array.from({length: 8}).map((_, i) => {
    const a = (i / 8) * Math.PI * 2 + rot;
    const b = ((i + 1) / 8) * Math.PI * 2 + rot;
    return (
      <path
        key={i}
        d={`M ${960 + Math.cos(a) * r} ${540 + Math.sin(a) * r} L ${960 + Math.cos(a + 0.9) * 2400} ${540 + Math.sin(a + 0.9) * 2400} L ${960 + Math.cos(b + 0.9) * 2400} ${540 + Math.sin(b + 0.9) * 2400} L ${960 + Math.cos(b) * r} ${540 + Math.sin(b) * r} Z`}
        fill={i % 2 ? '#101114' : '#16171b'}
        stroke="#2a2c33"
        strokeWidth={2}
      />
    );
  });
  return (
    <svg width={1920} height={1080} style={{position: 'absolute', inset: 0}}>
      {blades}
      <polygon points={pts.join(' ')} fill="none" stroke="rgba(160,200,255,0.25)" strokeWidth={2} />
    </svg>
  );
};

/* ------------------------------------------------ C1: one eye, one instant */
const Freeze: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / 30;
  const shutter = map(f, [38, 46], [0, 1], E.in) * map(f, [48, 58], [1, 0], E.out);
  const frozen = f >= 47;
  const tt = frozen ? 47 / 30 : t;
  const flash = map(f, [47, 48, 60], [0, 1, 0]);
  const away = map(f, [120, 166], [0, 1], E.in);
  return (
    <AbsoluteFill style={{background: '#020305'}}>
      <AbsoluteFill style={{transform: `scale(${1 - away * 0.35}) rotate(${away * -4}deg)`, opacity: 1 - away * 0.6, filter: frozen ? 'saturate(0.75) contrast(1.06)' : undefined}}>
        <Stage shadows post={{bloom: 0.35, threshold: 0.9, vignette: 0.4, noise: frozen ? 0.12 : 0.06, ca: 0.001}}>
          <FlashPhoto dist={0.8} fov={46} flash={frozen ? 1 : 0.25} headRot={[-0.05, 0.12 * Math.sin(tt * 1.3), 0.03 * Math.sin(tt * 0.9)]} open={frozen ? 0.55 : 1} />
        </Stage>
        <Viewfinder opacity={0.9 * (1 - away)} faceBox={{x: 750, y: 240, w: 420, h: 520}} info={frozen ? '1/125 s   ƒ2.2   ISO 800' : 'ISO 800   1/125   ƒ2.2'} />
        <AbsoluteFill style={{background: 'white', opacity: flash}} />
      </AbsoluteFill>
      <IrisWipe close={shutter} rot={shutter * 0.5} />
      <div
        style={{
          position: 'absolute',
          right: 120,
          top: 120,
          fontFamily: FONT.mono,
          fontWeight: 600,
          fontSize: 88,
          color: C.ice,
          opacity: map(f, [52, 64], [0, 1]) * (1 - away),
          textShadow: `0 0 30px ${C.ice}66`,
        }}
      >
        1/125 s
      </div>
    </AbsoluteFill>
  );
};

/* ------------------------------------------------ C2: dolly zoom, 150 cm → 30 cm */
const Bar: React.FC<{a: THREE.Vector3; b: THREE.Vector3; color: string; o?: number}> = ({a, b, color, o = 1}) => (
  <>
    <Ray a={a} b={b} color={color} width={0.0016} opacity={o} />
    <Ray a={a.clone().add(new THREE.Vector3(0, 0.012, 0))} b={a.clone().add(new THREE.Vector3(0, -0.012, 0))} color={color} width={0.0016} opacity={o} />
    <Ray a={b.clone().add(new THREE.Vector3(0, 0.012, 0))} b={b.clone().add(new THREE.Vector3(0, -0.012, 0))} color={color} width={0.0016} opacity={o} />
  </>
);

const Dolly: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / 30;
  // distance from the face (in head units, 1 unit ≈ 40 cm)
  const p = map(f, [24, 210], [0, 1], E.inOut);
  const dCm = lerp(150, 30, p);
  const d = dCm / 40;
  const faceZ = 0.22;
  const fov = (2 * Math.atan(0.34 / d) * 180) / Math.PI;
  const guides = map(f, [10, 30], [0, 1]);
  const result = map(f, [214, 232], [0, 1], E.out);
  return (
    <AbsoluteFill>
      <Stage post={{bloom: 0.6, threshold: 0.8, vignette: 0.55, noise: 0.04}}>
        <Rig position={[MID + 0.002 * wobble(t, 2), 0.14, faceZ + d]} target={[MID, 0.13, 0]} fov={fov} near={0.01} />
        <Studio mood="neutral" intensity={1} />
        <Head gaze={[MID, 0.14, faceZ + d]} />
        <Bar a={new THREE.Vector3(MID - 0.044, 0.112, 0.265)} b={new THREE.Vector3(MID + 0.044, 0.112, 0.265)} color="#ffc879" o={guides} />
        <Bar a={new THREE.Vector3(MID - 0.186, 0.16, 0.06)} b={new THREE.Vector3(MID + 0.186, 0.16, 0.06)} color="#9fdcff" o={guides * 0.9} />
      </Stage>
      {/* distance readout */}
      <div style={{position: 'absolute', left: 110, top: 120, opacity: map(f, [6, 20], [0, 1])}}>
        <div style={{fontFamily: FONT.mono, fontSize: 22, letterSpacing: '0.24em', color: C.textDim}}>CAMERA → FACE</div>
        <div style={{fontFamily: FONT.mono, fontWeight: 600, fontSize: 104, color: dCm < 60 ? C.alert : C.text, lineHeight: 1.1}}>
          {Math.round(dCm)}
          <span style={{fontSize: 44, marginLeft: 10}}>cm</span>
        </div>
        <div style={{marginTop: 18, width: 360, height: 4, background: 'rgba(255,255,255,0.15)', position: 'relative'}}>
          <div style={{position: 'absolute', left: 0, top: 0, height: 4, width: 360 * (dCm / 150), background: dCm < 60 ? C.alert : C.ice}} />
        </div>
        <div style={{fontFamily: FONT.mono, fontSize: 20, color: C.textDim, marginTop: 10, letterSpacing: '0.1em'}}>FOV {fov.toFixed(0)}°</div>
      </div>
      <div style={{position: 'absolute', right: 120, top: 150, textAlign: 'right', opacity: result, transform: `translateY(${(1 - result) * 14}px)`}}>
        <div style={{fontFamily: FONT.sans, fontWeight: 900, fontSize: 70, color: C.gold, letterSpacing: '0.06em', textShadow: `0 0 30px ${C.amber}66`}}>{LABELS.nose}</div>
      </div>
    </AbsoluteFill>
  );
};

/* ------------------------------------------------ C3: the mirror image is twice as far, seen with two eyes */
const MirrorGeometry: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / 30;
  const mZ = 0.9; // mirror plane
  const eyeL = new THREE.Vector3(-0.0925, 0.2195, 0.2);
  const eyeR = new THREE.Vector3(0.0652, 0.2113, 0.2);
  const target = new THREE.Vector3(MID, 0.2, 2 * mZ - 0.25); // a point on the virtual face (its nose)
  const hit = (e: THREE.Vector3) => {
    const s = (mZ - e.z) / (target.z - e.z);
    return e.clone().lerp(target, s);
  };
  const rays = map(f, [20, 60], [0, 1], E.inOut);
  const cam = track3(
    f,
    [
      [0, [2.6, 2.2, 0.2]],
      [180, [2.1, 2.6, 1.6]],
    ],
    E.inOut,
  );
  const ghostA = map(f, [8, 30], [0, 1]);
  return (
    <AbsoluteFill>
      <Stage post={{bloom: 1.1, threshold: 0.55, vignette: 0.6}}>
        <Rig position={cam} target={[0, 0.0, 0.95]} fov={34} />
        <Studio mood="neutral" intensity={0.85} />
        <Head gaze={[MID, 0.2, 2 * mZ - 0.25]} />
        {/* the virtual image: where your brain places the face, behind the glass */}
        <group position={[0, 0, 2 * mZ]} rotation={[0, Math.PI, 0]}>
          <Head flip ghost opacity={0.99} rim={['#ffc879', 2.0 * ghostA]} gaze={[MID, 0.2, 2 * mZ - 0.2]} />
        </group>
        {/* glass pane of the mirror seen edge-on from above */}
        <mesh position={[0, 0.12, mZ]}>
          <boxGeometry args={[1.2, 1.4, 0.012]} />
          <meshPhysicalMaterial color="#9fd0c0" roughness={0.05} transparent opacity={0.28} clearcoat={1} depthWrite={false} />
        </mesh>
        {/* floor grid for scale */}
        <gridHelper args={[6, 30, '#1d3346', '#11202d']} position={[0, -0.55, 0.9]} />
        {[eyeL, eyeR].map((e, i) => {
          const h = hit(e);
          return (
            <group key={i}>
              <Ray a={e} b={h} p={rays} color={i ? '#ffc879' : '#5fd4ff'} width={0.004} />
              <Ray a={h} b={target} p={clamp(rays * 1.4 - 0.4)} color={i ? '#ffc879' : '#5fd4ff'} width={0.003} opacity={0.45} />
            </group>
          );
        })}
        <Callout position={[MID, 0.42, 2 * mZ]} text={LABELS.virtualImg} dx={110} dy={-60} p={map(f, [40, 56], [0, 1])} color={C.gold} />
        <Callout position={[0.5, -0.5, mZ]} text={LABELS.doubleDist} sub="d + d" dx={140} dy={60} p={map(f, [70, 86], [0, 1])} color={C.ice} />
        <Callout position={[eyeR.x, eyeR.y, eyeR.z]} text={LABELS.twoEyes} dx={-150} dy={-80} p={map(f, [100, 116], [0, 1])} color={C.neuron} />
        {/* distance markers on the floor */}
        <Ray a={new THREE.Vector3(0.45, -0.55, 0.22)} b={new THREE.Vector3(0.45, -0.55, mZ)} color="#9fdcff" width={0.004} p={map(f, [60, 80], [0, 1])} />
        <Ray a={new THREE.Vector3(0.45, -0.55, mZ)} b={new THREE.Vector3(0.45, -0.55, 2 * mZ - 0.22)} color="#ffc879" width={0.004} p={map(f, [74, 94], [0, 1])} />
        <Dust count={500} box={[5, 3, 5]} center={[0, 0.2, 0.9]} color="#bfe6ff" size={0.012} />
      </Stage>
      <div style={{position: 'absolute', left: 0, right: 0, top: 70, textAlign: 'center', fontFamily: FONT.mono, fontSize: 22, letterSpacing: '0.3em', color: C.textDim, opacity: map(f, [10, 24], [0, 1]) * (t > 0 ? 1 : 1)}}>
        TOP VIEW
      </div>
    </AbsoluteFill>
  );
};

/* ------------------------------------------------ C4: continuous mirror vs a random frame */
const LayerCam: React.FC<{layers: number[]}> = ({layers}) => {
  const camera = useThree((s) => s.camera);
  React.useLayoutEffect(() => {
    layers.forEach((l) => camera.layers.enable(l));
  });
  return null;
};

const Snap: React.FC<{yaw: number; open: number; roll: number; x: number; y: number; s: number; red: number}> = ({yaw, open, roll, x, y, s, red}) => {
  const mat = usePrintMaterial();
  applyPrint(mat, {border: 0.06, tint: red > 0 ? '#ffd0c8' : '#ffffff'});
  const face = useFaceTexture({mood: 'photo', yaw, open, w: 320, h: 400});
  mat.uniforms.uMap.value = face.texture;
  const ref = React.useRef<THREE.Group>(null);
  React.useLayoutEffect(() => {
    ref.current?.traverse((o) => o.layers.set(2));
  });
  return (
    <group ref={ref} position={[x, y, 0.95]} scale={s} rotation={[0, 0, roll]}>
      <mesh material={mat}>
        <planeGeometry args={[0.16, 0.2]} />
      </mesh>
      {red > 0 ? (
        <mesh position={[0, 0, -0.001]}>
          <planeGeometry args={[0.175, 0.215]} />
          <meshBasicMaterial color={new THREE.Color('#ff5a4a').multiplyScalar(3)} toneMapped={false} transparent opacity={red} />
        </mesh>
      ) : null}
      {face.portal}
    </group>
  );
};

const SHOTS = [40, 82, 124, 166, 208];
const Continuous: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / 30;
  // natural motion: sway, nod, blinks
  const yawAt = (ft: number) => 0.22 * Math.sin(ft / 30 * 1.1) + 0.06 * Math.sin(ft / 30 * 2.7);
  const nodAt = (ft: number) => 0.05 * Math.sin(ft / 30 * 0.8 + 1);
  const blinkAt = (ft: number) => {
    const blinks = [30, 124, 190];
    let o = 1;
    for (const b of blinks) o = Math.min(o, clamp(Math.abs(ft - b) / 4));
    return o;
  };
  const flashes = SHOTS.map((s) => map(f, [s, s + 1, s + 6], [0, 1, 0])).reduce((a, b) => a + b, 0);
  const bad = 2; // the third snap lands mid-blink
  return (
    <AbsoluteFill>
      <Stage post={{bloom: 1.05, threshold: 0.55, vignette: 0.55, noise: 0.04}}>
        <MirrorPOV mirrorW={0.62} mirrorH={0.9} mirrorZ={1.05} fov={26} headRot={[nodAt(f), yawAt(f), 0]} open={blinkAt(f)} camOffset={[0, 0.03, 0]} />
        <LayerCam layers={[2]} />
        {SHOTS.map((s, i) => {
          if (f < s) return null;
          const k = map(f, [s, s + 16], [0, 1], E.out);
          const slotX = (i - 2) * 0.078;
          const x = lerp(0, slotX, k);
          const y = lerp(0.19, 0.302, k);
          const sc = lerp(1.25, 0.36, k);
          return (
            <Snap key={i} yaw={-yawAt(s)} open={blinkAt(s)} roll={(i - 2) * 0.03 * k} x={x} y={y} s={sc} red={i === bad ? map(f, [s + 20, s + 30], [0, 1]) : 0} />
          );
        })}
      </Stage>
      <AbsoluteFill style={{background: 'white', opacity: Math.min(0.75, flashes * 0.75)}} />
      <div
        style={{
          position: 'absolute',
          left: 960 - 150,
          width: 300,
          top: 326,
          textAlign: 'center',
          fontFamily: FONT.sans,
          fontWeight: 900,
          fontSize: 38,
          letterSpacing: '0.12em',
          color: C.alert,
          opacity: map(f, [SHOTS[bad] + 26, SHOTS[bad] + 38], [0, 1]),
          textShadow: '0 2px 18px rgba(0,0,0,0.9)',
        }}
      >
        {LABELS.frameRandom}
      </div>
      <div style={{position: 'absolute', left: 110, top: 420, fontFamily: FONT.mono, fontSize: 22, letterSpacing: '0.24em', color: C.gold, opacity: map(f, [4, 16], [0, 0.9])}}>
        MIRROR · LIVE ●
      </div>
    </AbsoluteFill>
  );
};

export const S7Camera: React.FC = () => {
  const f = useCurrentFrame();
  const cut = (at: number) => clamp(1 - Math.abs(f - at) / 6);
  return (
    <AbsoluteFill style={{background: C.ink}}>
      <Sequence from={0} durationInFrames={172}>
        <Freeze />
      </Sequence>
      <Sequence from={168} durationInFrames={304}>
        <Dolly />
      </Sequence>
      <Sequence from={468} durationInFrames={184}>
        <MirrorGeometry />
      </Sequence>
      <Sequence from={648} durationInFrames={282}>
        <Continuous />
      </Sequence>
      <AbsoluteFill style={{background: '#eaf4ff', opacity: (cut(170) + cut(470) + cut(650)) * 0.45, mixBlendMode: 'screen'}} />
      <AbsoluteFill style={{background: 'white', opacity: map(f, [0, 14], [0.95, 0])}} />
      <Sequence from={10} durationInFrames={130}>
        <Chapter index={5} name={LABELS.ch[4]} />
      </Sequence>
    </AbsoluteFill>
  );
};

