import React, {useMemo} from 'react';
import {AbsoluteFill, Sequence, useCurrentFrame} from 'remotion';
import * as THREE from 'three';
import {Stage} from '../three/Stage';
import {Rig} from '../three/Rig';
import {Studio} from '../three/Lights';
import {Dust} from '../three/Dust';
import {Neurons} from '../three/Neurons';
import {Ring} from '../three/Ring';
import {CameraModel} from '../three/CameraModel';
import {MirrorPOV} from '../three/Views';
import {PrintParams, applyPrint, useFaceTexture, usePrintMaterial} from '../three/FacePrint';
import {Chapter} from '../ui/Chapter';
import {C, FONT} from '../theme';
import {E, clamp, map, track, track3, wobble} from '../lib/anim';
import {LABELS} from '../copy';

/** A card showing the rendered face with a given processing state. */
const Card: React.FC<
  JSX.IntrinsicElements['group'] & {tex: THREE.Texture; params: PrintParams; w?: number}
> = ({tex, params, w = 0.9, ...group}) => {
  const mat = usePrintMaterial();
  applyPrint(mat, params);
  mat.uniforms.uMap.value = tex;
  return (
    <group {...group}>
      <mesh material={mat}>
        <planeGeometry args={[w, w * 1.25]} />
      </mesh>
    </group>
  );
};

/** A translucent cortical layer the image passes through. */
const Layer: React.FC<{z: number; hit: number; color: string}> = ({z, hit, color}) => {
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        uniforms: {uC: {value: new THREE.Color(color)}, uHit: {value: 0}},
        vertexShader: /* glsl */ `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
        fragmentShader: /* glsl */ `
          uniform vec3 uC; uniform float uHit; varying vec2 vUv;
          float h(vec2 p){ return fract(sin(dot(p, vec2(41.3, 289.1))) * 9631.7); }
          void main(){
            vec2 p = vUv * vec2(1.6, 1.9);
            // hexagonal "columns" of cortex
            vec2 g = p * 22.0; vec2 r = vec2(1.0, 1.732); vec2 hh = r * 0.5;
            vec2 a = mod(g, r) - hh; vec2 b = mod(g - hh, r) - hh;
            vec2 gv = dot(a, a) < dot(b, b) ? a : b;
            float cell = smoothstep(0.42, 0.5, length(gv));
            vec2 c = vUv - 0.5;
            float edge = smoothstep(0.5, 0.46, max(abs(c.x), abs(c.y)));
            float frame = (1.0 - smoothstep(0.0, 0.01, abs(max(abs(c.x), abs(c.y)) - 0.49)));
            float ring = exp(-pow((length(c) - uHit * 0.75) * 14.0, 2.0)) * (1.0 - uHit) * step(0.001, uHit);
            vec3 col = uC * (0.04 * edge + 0.12 * cell * edge + 0.9 * frame) + uC * ring * 2.5;
            gl_FragColor = vec4(col, 1.0);
          }`,
      }),
    [color],
  );
  mat.uniforms.uHit.value = hit;
  return (
    <mesh position={[0, 0.0, z]} material={mat}>
      <planeGeometry args={[1.25, 1.5]} />
    </mesh>
  );
};

const PASSES = [
  {key: LABELS.passEdge, color: '#5fd4ff'},
  {key: LABELS.passSym, color: '#b48cff'},
  {key: LABELS.passSmooth, color: '#ff9fd0'},
  {key: LABELS.passGlow, color: '#ffc879'},
];
const LZ = [-2.4, -1.6, -0.8, 0.0];
const PASS_AT = [96, 150, 200, 250];

const RetouchInner: React.FC<{f: number}> = ({f}) => {
  const t = f / 30;
  const face = useFaceTexture({flip: true, mood: 'neutral', bg: '#07090f'});
  // card travels through the four layers
  const z = track(
    f,
    [
      [0, -3.6],
      [PASS_AT[0], LZ[0]],
      [PASS_AT[1], LZ[1]],
      [PASS_AT[2], LZ[2]],
      [PASS_AT[3], LZ[3]],
      [300, 0.55],
    ],
    E.soft,
  );
  const after = (i: number) => clamp((f - PASS_AT[i]) / 14);
  const edge = after(0) * (1 - clamp((f - PASS_AT[1] + 6) / 16));
  const params: PrintParams = {
    sym: 0.55 * after(1),
    smooth: 0.95 * after(2),
    warm: 1.0 * after(3),
    edge,
    beauty: 0.0001,
    mid: 0.5,
  };
  const cam = track3(
    f,
    [
      [0, [2.4, 0.7, 1.6]],
      [150, [1.7, 0.35, 1.9]],
      [300, [0.0, 0.05, 2.25]],
    ],
    E.inOut,
  );
  const target = track3(f, [
    [0, [0, 0, -1.4]],
    [150, [0, 0, -0.6]],
    [300, [0, 0.0, 0.4]],
  ]);
  return (
    <>
      <Rig position={[cam[0] + 0.01 * wobble(t, 2), cam[1], cam[2]]} target={target} fov={34} />
      <Neurons t={t} position={[0, 0, -3.5]} count={30} intensity={0.6} seed={9} />
      {LZ.map((lz, i) => (
        <Layer key={i} z={lz} hit={f > PASS_AT[i] ? clamp((f - PASS_AT[i]) / 24) : 0} color={PASSES[i].color} />
      ))}
      <Card tex={face.texture} params={params} position={[0, 0, z]} w={0.8} />
      {face.portal}
      <Dust count={700} box={[4, 3, 6]} center={[0, 0, -1.2]} color="#ffd9e8" size={0.012} />
    </>
  );
};

const Retouch: React.FC = () => {
  const f = useCurrentFrame();
  const active = PASS_AT.reduce((acc, at, i) => (f >= at - 6 ? i : acc), -1);
  return (
    <AbsoluteFill>
      <Stage post={{bloom: 1.25, threshold: 0.5, vignette: 0.7, noise: 0.04}} fog={['#04060b', 3, 9]}>
        <Studio mood="lab" intensity={0.5} />
        <RetouchInner f={f} />
      </Stage>
      {/* processing pipeline readout */}
      <div style={{position: 'absolute', left: 110, top: 300, opacity: map(f, [40, 60], [0, 1]) * map(f, [290, 306], [1, 0])}}>
        {PASSES.map((p, i) => {
          const on = i === active;
          const done = i < active;
          return (
            <div key={i} style={{display: 'flex', alignItems: 'center', gap: 18, marginBottom: 26, opacity: on ? 1 : done ? 0.55 : 0.25, transform: `translateX(${on ? 10 : 0}px)`}}>
              <div style={{width: 10, height: 10, borderRadius: 5, background: p.color, boxShadow: on ? `0 0 16px ${p.color}` : 'none'}} />
              <div style={{fontFamily: FONT.mono, fontSize: 20, color: p.color, letterSpacing: '0.2em'}}>{String(i + 1).padStart(2, '0')}</div>
              <div style={{fontFamily: FONT.sans, fontWeight: 700, fontSize: on ? 40 : 32, color: C.text, letterSpacing: '0.2em'}}>{p.key}</div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

/* -------------------------------------------------------- Epley & Whitchurch lineup */
const LEVELS = [-0.6, -0.4, -0.2, 0, 0.2, 0.4, 0.6];
const TICKS = ['−30%', '−20%', '−10%', LABELS.real0, '+10%', '+20%', '+30%'];
const PICK = 5;

const LineupInner: React.FC<{f: number; sel: number}> = ({f, sel}) => {
  const t = f / 30;
  const face = useFaceTexture({flip: true, mood: 'neutral', bg: '#0b0d12'});
  const spread = map(f, [0, 30], [0, 1], E.out);
  return (
    <>
      <Rig position={[0.02 * wobble(t, 3), 0.02, 3.35]} target={[0, 0.0, 0]} fov={30} />
      {LEVELS.map((b, i) => {
        const x = (i - 3) * 0.45 * spread;
        const z = -Math.abs(i - 3) * 0.08;
        const d = Math.abs(sel - i);
        const lift = Math.max(0, 1 - d) * 0.06;
        return (
          <group key={i} position={[x, lift, z]} rotation={[0, -x * 0.12, 0]}>
            <Card tex={face.texture} params={{beauty: b * 0.95 + 0.0001, border: 0.05, mid: 0.5, bright: 0.85 + Math.max(0, 1 - d) * 0.25}} w={0.41} />
          </group>
        );
      })}
      {/* selection light */}
      <group position={[(sel - 3) * 0.45 * spread, 0.06, 0.05]}>
        <Ring radius={0.33} thickness={0.004} color="#ffc879" strength={map(f, [36, 50], [0, 1])} pulse={f / 22} rotation={[0, 0, 0]} />
      </group>
      {face.portal}
      <Dust count={500} box={[5, 2.5, 2]} center={[0, 0, -0.6]} color="#ffe2c4" size={0.012} />
    </>
  );
};

const Lineup: React.FC = () => {
  const f = useCurrentFrame();
  // the selector wanders, hesitates, then lands on an enhanced version
  const sel = track(
    f,
    [
      [0, 0],
      [40, 0],
      [80, 3],
      [100, 2.6],
      [125, 4.3],
      [140, PICK],
    ],
    E.inOut,
  );
  const picked = map(f, [140, 152], [0, 1], E.out);
  return (
    <AbsoluteFill>
      <Stage post={{bloom: 1.0, threshold: 0.6, vignette: 0.65}}>
        <Studio mood="neutral" intensity={0.7} />
        <LineupInner f={f} sel={sel} />
      </Stage>
      {/* tick labels (fixed layout: cards are spaced evenly on screen) */}
      <div style={{position: 'absolute', left: 0, right: 0, top: 742, display: 'flex', justifyContent: 'center'}}>
        {TICKS.map((tk, i) => (
          <div
            key={i}
            style={{
              width: 271,
              textAlign: 'center',
              fontFamily: i === 3 ? FONT.sans : FONT.mono,
              fontWeight: i === 3 ? 700 : 400,
              fontSize: 22,
              letterSpacing: '0.1em',
              color: i === PICK && picked > 0.5 ? C.gold : i === 3 ? C.text : C.textDim,
              opacity: map(f, [10, 30], [0, 1]),
            }}
          >
            {tk}
          </div>
        ))}
      </div>
      <div
        style={{
          position: 'absolute',
          left: 960 + (PICK - 3) * 271 - 200,
          width: 400,
          top: 270,
          textAlign: 'center',
          fontFamily: FONT.sans,
          fontWeight: 900,
          fontSize: 44,
          letterSpacing: '0.12em',
          color: C.gold,
          opacity: picked,
          transform: `translateY(${(1 - picked) * 16}px)`,
          textShadow: `0 0 30px ${C.amber}88`,
        }}
      >
        {LABELS.pickSelf}
      </div>
    </AbsoluteFill>
  );
};

/* -------------------------------------------------------- the mirror, retouched */
const Retouched: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / 30;
  const scan = map(f, [10, 90], [1.6, -1.2], E.inOut);
  const smooth = map(f, [20, 90], [0, 0.85], E.inOut);
  return (
    <AbsoluteFill>
      <Stage post={{bloom: 1.25, threshold: 0.52, vignette: 0.55, noise: 0.03}} exposure={1.06}>
        <MirrorPOV mirrorW={0.62} mirrorH={0.9} mirrorZ={1.05} fov={22 - map(f, [0, 140], [0, 2])} sweep={scan} smooth={smooth} rim={['#ffc879', 0.35 * smooth]} camOffset={[0.003 * wobble(t, 1), 0.002 * wobble(t, 2), 0]} />
      </Stage>
      <AbsoluteFill style={{background: 'radial-gradient(ellipse at 50% 40%, rgba(255,200,130,0.18), rgba(0,0,0,0) 60%)', mixBlendMode: 'screen', opacity: smooth}} />
    </AbsoluteFill>
  );
};

/* -------------------------------------------------------- the camera has no filter */
const NoFilter: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / 30;
  const cam = track3(
    f,
    [
      [0, [2.6, 0.9, 3.6]],
      [100, [0.6, 0.2, 2.7]],
      [140, [0.1, 0.02, 2.2]],
    ],
    E.inOut,
  );
  const shut = map(f, [104, 110, 118], [1, 0.0, 1]);
  const flash = map(f, [109, 111, 124], [0, 1, 0]);
  return (
    <AbsoluteFill>
      <Stage post={{bloom: 1.1, threshold: 0.6, vignette: 0.7, noise: 0.04, ca: 0.001}}>
        <Rig position={cam} target={[0, 0.05, 0.6]} fov={30} />
        <Studio mood="product" intensity={0.9} />
        <CameraModel rotation={[0.05 * Math.sin(t), -0.35 + map(f, [0, 140], [0, 0.35], E.inOut), 0]} aperture={shut} flash={flash} />
        <Dust count={500} box={[5, 3, 5]} center={[0, 0, 0]} color="#cfe6ff" size={0.012} />
      </Stage>
      <AbsoluteFill style={{background: 'white', opacity: flash * 0.9}} />
    </AbsoluteFill>
  );
};

export const S6Beauty: React.FC = () => {
  const f = useCurrentFrame();
  const cut = (at: number) => clamp(1 - Math.abs(f - at) / 6);
  return (
    <AbsoluteFill style={{background: C.ink}}>
      <Sequence from={0} durationInFrames={312}>
        <Retouch />
      </Sequence>
      <Sequence from={308} durationInFrames={176}>
        <Lineup />
      </Sequence>
      <Sequence from={480} durationInFrames={146}>
        <Retouched />
      </Sequence>
      <Sequence from={622} durationInFrames={138}>
        <NoFilter />
      </Sequence>
      <AbsoluteFill style={{background: '#ffe9d0', opacity: (cut(310) + cut(482) + cut(624)) * 0.45, mixBlendMode: 'screen'}} />
      <AbsoluteFill style={{background: 'black', opacity: map(f, [0, 10], [1, 0])}} />
      <Sequence from={0} durationInFrames={130}>
        <Chapter index={4} name={LABELS.ch[3]} />
      </Sequence>
    </AbsoluteFill>
  );
};

