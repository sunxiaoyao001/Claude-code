import React, {useMemo} from 'react';
import {AbsoluteFill, Sequence, useCurrentFrame} from 'remotion';
import * as THREE from 'three';
import {Stage} from '../three/Stage';
import {Rig} from '../three/Rig';
import {Studio} from '../three/Lights';
import {Mirror} from '../three/Mirror';
import {Head} from '../three/Head';
import {Dust} from '../three/Dust';
import {Ring} from '../three/Ring';
import {Chapter} from '../ui/Chapter';
import {C, FONT} from '../theme';
import {E, map, track, track3, wobble} from '../lib/anim';
import {LABELS} from '../copy';
import {EYE_Y} from '../three/Views';

export const MID = -0.0125; // facial midline (head-local x)
export const MOLE: [number, number, number] = [-0.1238, 0.0679, 0.2343];

const Tag: React.FC<{x: number; y: number; text: string; color?: string; p: number; size?: number; align?: 'center' | 'left'}> = ({
  x,
  y,
  text,
  color = C.text,
  p,
  size = 34,
  align = 'center',
}) => (
  <div
    style={{
      position: 'absolute',
      left: align === 'center' ? x - 300 : x,
      top: y,
      width: 600,
      textAlign: align,
      fontFamily: FONT.sans,
      fontWeight: 700,
      fontSize: size,
      letterSpacing: '0.2em',
      color,
      opacity: p,
      transform: `translateY(${(1 - p) * 14}px)`,
      textShadow: '0 2px 18px rgba(0,0,0,0.9)',
    }}
  >
    {text}
  </div>
);

/** A — the head and its reflection face each other; camera swings round. */
const ShotA: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / 30;
  const cam = track3(
    f,
    [
      [0, [-1.3, 0.38, 0.42]],
      [80, [-1.0, 0.34, 1.05]],
      [176, [-0.62, 0.3, 1.28]],
    ],
    E.inOut,
  );
  const target = track3(f, [
    [0, [0.42, 0.2, 0.25]],
    [176, [0.08, 0.17, 0.3]],
  ]);
  const ring = map(f, [96, 120], [0, 1], E.out);
  return (
    <AbsoluteFill>
      <Stage post={{bloom: 1.0, threshold: 0.55, vignette: 0.6}} fog={['#04060b', 3, 8]}>
        <Rig position={[cam[0] + 0.004 * wobble(t, 3), cam[1] + 0.004 * wobble(t, 5), cam[2]]} target={target} fov={32} />
        <Studio mood="mirror" intensity={0.7} envRotation={Math.PI / 2} />
        <pointLight position={[0.15, 0.6, 0.35]} intensity={2.6} color="#ffd8b0" distance={3} decay={2} />
        <pointLight position={[0.1, 0.1, -0.5]} intensity={1.2} color="#ffb070" distance={3} decay={2} />
        <pointLight position={[-1.2, 0.8, -0.6]} intensity={2.5} color="#9fc8ff" distance={4} decay={2} />
        <Head position={[-0.42, 0, 0]} rotation={[0, Math.PI / 2, 0]} gaze={[0, EYE_Y, 1.48]}>
          <Ring position={[MOLE[0] - 0.006, MOLE[1], MOLE[2] - 0.01]} rotation={[0, -0.55, 0]} radius={0.028} strength={ring} pulse={(f - 96) / 30} />
        </Head>
        <Mirror position={[0.42, 0.16, 0.42]} rotation={[0, -Math.PI / 2, 0]} width={1.15} height={1.5} frame="bronze" sweep={map(f, [10, 150], [-1, 1.8])} />
        <Dust count={900} box={[4, 3, 4]} center={[0, 0.2, 0.3]} color="#ffd7a6" size={0.014} />
      </Stage>
    </AbsoluteFill>
  );
};

/** B — front view; the mirrored face turns over into the photo version; the mole jumps sides. */
const ShotB: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / 30;
  const flipP = map(f, [62, 92], [0, 1], E.inOut);
  const sx = Math.cos(Math.PI * flipP) * -1; // -1 (mirror) -> +1 (photo)
  const roll = Math.sin(Math.PI * flipP);
  const ring = map(f, [12, 30], [0, 1], E.out);
  const isMirror = flipP < 0.5;
  const mirrorLab = map(f, [8, 22], [0, 1], E.out) * map(f, [56, 66], [1, 0]);
  const photoLab = map(f, [92, 108], [0, 1], E.out);
  const seam = Math.sin(Math.PI * flipP);
  return (
    <AbsoluteFill>
      <Stage post={{bloom: 1.0, threshold: 0.6, vignette: 0.55}}>
        <Rig position={[0.004 * wobble(t, 1), 0.17, 1.55]} target={[0, 0.13, 0]} fov={24} />
        <Studio mood={isMirror ? 'mirror' : 'neutral'} intensity={0.9} />
        <Head flipScale={sx} rotation={[0, roll * 0.55, 0]} gaze={[0, 0.17, 1.55]}>
          <Ring position={[MOLE[0] - 0.006, MOLE[1], MOLE[2] + 0.004]} rotation={[0, -0.5, 0]} radius={0.03} strength={ring} pulse={f / 26} />
        </Head>
        {/* light plane that the face turns through */}
        <mesh position={[0, 0.1, 0.32]} scale={[0.012 + seam * 0.03, 1.4, 1]}>
          <planeGeometry />
          <meshBasicMaterial color={new THREE.Color('#ffe2b8').multiplyScalar(4 * seam)} transparent opacity={seam} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
        </mesh>
        <Dust count={500} box={[3, 2, 2]} center={[0, 0.2, 0]} color={isMirror ? '#ffd7a6' : '#cfe6ff'} size={0.012} />
      </Stage>
      <Tag x={960} y={66} text={LABELS.inMirror} color={C.gold} p={mirrorLab} size={40} />
      <Tag x={960} y={66} text={LABELS.inPhoto} color={C.ice} p={photoLab} size={40} />
    </AbsoluteFill>
  );
};

/** C — fold the face along its midline: the halves don't line up. */
const ShotC: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / 30;
  const line = map(f, [6, 30], [0, 1], E.expoOut);
  const ghost = map(f, [34, 70], [0, 1], E.inOut);
  const marks = map(f, [70, 92], [0, 1], E.out);
  // the ghost is the face mirrored about its own midline
  const zoom = track(f, [
    [0, 1.45],
    [170, 1.12],
  ]);
  const eyeL = [-0.0925, 0.2195];
  const eyeR = [0.0652, 0.2113];
  return (
    <AbsoluteFill>
      <Stage post={{bloom: 1.1, threshold: 0.6, vignette: 0.55}}>
        <Rig position={[MID + 0.003 * wobble(t, 2), 0.16, zoom]} target={[MID, 0.14, 0]} fov={22} />
        <Studio mood="neutral" intensity={0.9} />
        <Head gaze={[MID, 0.16, 1.4]} />
        {ghost > 0.001 ? (
          <group position={[2 * MID, 0, 0.002]}>
            <Head flip ghost opacity={0.99} rim={['#5fd4ff', 2.4 * ghost]} gaze={[MID, 0.16, 1.4]} renderOrder={5} />
          </group>
        ) : null}
        {/* the fold line */}
        <mesh position={[MID, 0.12, 0.34]} scale={[0.0035, 0.75 * line, 1]}>
          <planeGeometry />
          <meshBasicMaterial color={new THREE.Color('#bff0ff').multiplyScalar(5)} transparent opacity={line} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
        </mesh>
        {/* eye-level guides: 3 mm apart in the real scan */}
        {[eyeL, eyeR].map(([x, y], i) => (
          <mesh key={i} position={[MID, y, 0.3]} scale={[0.36 * marks, 0.0018, 1]}>
            <planeGeometry />
            <meshBasicMaterial color={new THREE.Color(i ? '#ffc879' : '#5fd4ff').multiplyScalar(4)} transparent opacity={marks} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
          </mesh>
        ))}
      </Stage>
    </AbsoluteFill>
  );
};

/** Head with one half kept and mirrored across the midline (LL or RR composite). */
const HalfHead: React.FC<{side: 'L' | 'R'; offset: number}> = ({side, offset}) => {
  // character's left half is +x (head faces +z)
  const planes = useMemo(() => {
    const keepPlus = side === 'L';
    const xw = offset + MID;
    // Plane(normal, constant) keeps points with n·p + c >= 0
    const keep = keepPlus ? new THREE.Plane(new THREE.Vector3(1, 0, 0), -xw) : new THREE.Plane(new THREE.Vector3(-1, 0, 0), xw);
    const other = keepPlus ? new THREE.Plane(new THREE.Vector3(-1, 0, 0), xw) : new THREE.Plane(new THREE.Vector3(1, 0, 0), -xw);
    return {keep: [keep], other: [other]};
  }, [side, offset]);
  return (
    <group position={[offset, 0, 0]}>
      <Head clippingPlanes={planes.keep} gaze={[MID - offset * 0.2, 0.18, 2.6]} />
      <group position={[2 * MID, 0, 0]}>
        <Head flip clippingPlanes={planes.other} gaze={[MID - offset * 0.2, 0.18, 2.6]} />
      </group>
    </group>
  );
};

/** D — left+left, original, right+right. */
const ShotD: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / 30;
  const spread = map(f, [0, 40], [0, 1], E.inOut);
  const lab = (d: number) => map(f, [d, d + 16], [0, 1], E.out);
  const camZ = track(f, [
    [0, 2.05],
    [160, 2.3],
  ]);
  const off = 0.7 * spread;
  return (
    <AbsoluteFill>
      <Stage post={{bloom: 0.9, threshold: 0.65, vignette: 0.6}}>
        <Rig position={[0.004 * wobble(t, 4), 0.1, camZ]} target={[0, 0.08, 0]} fov={30} />
        <Studio mood="neutral" intensity={0.95} />
        <HalfHead side="R" offset={-off} />
        <Head position={[0, 0, 0]} gaze={[MID, 0.18, 2.6]} />
        <HalfHead side="L" offset={off} />
        <Dust count={500} box={[4, 2.5, 2]} center={[0, 0.1, -0.4]} color="#cfe6ff" size={0.012} />
      </Stage>
      <AbsoluteFill style={{background: 'linear-gradient(180deg, rgba(4,6,11,0) 55%, rgba(4,6,11,0.92) 82%)'}} />
      <Tag x={960 - 560} y={900} text={LABELS.rightRight} p={lab(40)} color={C.ice} />
      <Tag x={960} y={900} text={LABELS.original} p={lab(30)} color={C.text} />
      <Tag x={960 + 560} y={900} text={LABELS.leftLeft} p={lab(50)} color={C.gold} />
    </AbsoluteFill>
  );
};

/** E — real and reflected side by side; then the camera dives into the glass. */
const ShotE: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / 30;
  const cam = track3(
    f,
    [
      [0, [-0.02, 0.26, 2.0]],
      [80, [0.1, 0.23, 1.72]],
      [140, [0.62, 0.17, 0.62]],
    ],
    E.inOut,
  );
  const target = track3(f, [
    [0, [0.22, 0.15, 0.05]],
    [80, [0.3, 0.16, 0.05]],
    [140, [1.1, 0.16, -0.25]],
  ]);
  const lab = map(f, [10, 26], [0, 1], E.out) * map(f, [84, 96], [1, 0]);
  const flash = map(f, [124, 140], [0, 1], E.in);
  return (
    <AbsoluteFill>
      <Stage post={{bloom: 1.1, threshold: 0.55, vignette: 0.6}} fog={['#04060b', 3, 8]}>
        <Rig position={[cam[0] + 0.003 * wobble(t, 6), cam[1], cam[2]]} target={target} fov={32} />
        <Studio mood="mirror" intensity={0.8} />
        <pointLight position={[0.0, 0.6, 0.7]} intensity={2.2} color="#ffd8b0" distance={3} decay={2} />
        <Head position={[-0.22, 0, 0]} rotation={[0, 0.746, 0]} gaze={[1.0, EYE_Y, 1.72]} />
        <Mirror position={[0.719, 0.15, 0.283]} rotation={[0, -1.234, 0]} width={0.9} height={1.45} frame="bronze" sweep={map(f, [0, 120], [-0.8, 1.6])} />
        <Dust count={700} box={[4, 3, 4]} center={[0.3, 0.2, 0]} color="#ffd7a6" size={0.014} />
      </Stage>
      <Tag x={560} y={150} text={LABELS.real} p={lab} color={C.ice} />
      <Tag x={1380} y={150} text={LABELS.mirrored} p={lab} color={C.gold} />
      <AbsoluteFill style={{background: 'radial-gradient(circle at 60% 45%, #fff6ea, #ffd39a 40%, rgba(255,180,100,0.0) 80%)', opacity: flash}} />
    </AbsoluteFill>
  );
};

const Cut: React.FC<{at: number; len?: number}> = ({at, len = 8}) => {
  const f = useCurrentFrame();
  const a = map(f, [at - len / 2, at, at + len], [0, 1, 0]);
  return <AbsoluteFill style={{background: '#fff4e2', opacity: a * 0.55, mixBlendMode: 'screen', pointerEvents: 'none'}} />;
};

export const S3Flip: React.FC = () => {
  // local cut points (scene starts at global 330)
  const A = [0, 178];
  const B = [176, 330];
  const Cc = [328, 490];
  const D = [488, 650];
  const Ee = [648, 780];
  return (
    <AbsoluteFill style={{background: C.ink}}>
      <Sequence from={A[0]} durationInFrames={A[1] - A[0]}>
        <ShotA />
      </Sequence>
      <Sequence from={B[0]} durationInFrames={B[1] - B[0]}>
        <ShotB />
      </Sequence>
      <Sequence from={Cc[0]} durationInFrames={Cc[1] - Cc[0]}>
        <ShotC />
      </Sequence>
      <Sequence from={D[0]} durationInFrames={D[1] - D[0]}>
        <ShotD />
      </Sequence>
      <Sequence from={Ee[0]} durationInFrames={Ee[1] - Ee[0]}>
        <ShotE />
      </Sequence>
      <Cut at={177} />
      <Cut at={329} />
      <Cut at={489} />
      <Cut at={649} />
      <Sequence from={0} durationInFrames={140}>
        <Chapter index={1} name={LABELS.ch[0]} />
      </Sequence>
    </AbsoluteFill>
  );
};
