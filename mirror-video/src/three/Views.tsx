import React from 'react';
import * as THREE from 'three';
import {Head} from './Head';
import {Mirror} from './Mirror';
import {Rig, Vec3} from './Rig';
import {Studio} from './Lights';
import {Dust} from './Dust';

/** eye height of the scan in head-local units */
export const EYE_Y = 0.214;

/**
 * First-person mirror: the camera sits where the eyes are; the head itself is on
 * layer 1, so the camera only ever sees it *in the reflection* — exactly what you
 * see when you look into a mirror.
 */
export const MirrorPOV: React.FC<{
  mirrorZ?: number;
  camOffset?: Vec3;
  fov?: number;
  headRot?: Vec3;
  open?: number;
  mirrorW?: number;
  mirrorH?: number;
  dust?: boolean;
  glow?: number;
  sweep?: number;
  frame?: 'bronze' | 'black' | 'none';
  smooth?: number;
  rim?: [string, number];
}> = ({mirrorZ = 1.25, camOffset = [0, 0, 0], fov = 20, headRot = [0, 0, 0], open = 1, mirrorW = 1.0, mirrorH = 1.9, dust = true, glow = 0, sweep = -10, frame = 'bronze', smooth = 0, rim}) => {
  const cam: Vec3 = [camOffset[0], EYE_Y + camOffset[1], 0.2 + camOffset[2]];
  // look at the reflection of your own eyes
  const gaze: THREE.Vector3Tuple = [0, EYE_Y, 2 * mirrorZ - 0.2];
  return (
    <>
      <Rig position={cam} target={[cam[0] * 0.3, EYE_Y - 0.03, mirrorZ]} fov={fov} />
      <Studio mood="mirror" />
      <Head layer={1} rotation={headRot} gaze={gaze} open={open} smooth={smooth} rim={rim} />
      <Mirror position={[0, EYE_Y - 0.02, mirrorZ]} rotation={[0, Math.PI, 0]} width={mirrorW} height={mirrorH} frame={frame} glow={glow} sweep={sweep} />
      {/* warm practicals behind the viewer, seen as bokeh in the mirror */}
      {[
        [1.6, 0.9, -3.2, 0.05, '#ffb36b'],
        [-1.5, 1.1, -3.6, 0.04, '#ffd7a0'],
        [1.1, -0.2, -4.2, 0.035, '#ff9f60'],
        [-0.9, 0.3, -3.0, 0.03, '#ffe2b8'],
      ].map(([x, y, z, r, c], i) => (
        <mesh key={i} position={[x as number, y as number, z as number]}>
          <sphereGeometry args={[r as number, 16, 12]} />
          <meshBasicMaterial color={new THREE.Color(c as string).multiplyScalar(4)} toneMapped={false} />
        </mesh>
      ))}
      {dust ? <Dust count={500} box={[3, 2.4, 3.4]} center={[0, 0.2, 0.6]} color="#ffcf9a" size={0.012} /> : null}
    </>
  );
};

/**
 * Phone-flash selfie: close, wide, on-axis hard light, a wall right behind.
 */
export const FlashPhoto: React.FC<{
  dist?: number;
  fov?: number;
  camY?: number;
  headRot?: Vec3;
  flash?: number;
  open?: number;
}> = ({dist = 0.78, fov = 46, camY = 0.13, headRot = [0, 0, 0], flash = 1, open = 1}) => {
  const camZ = 0.25 + dist;
  return (
    <>
      <Rig position={[0.0, camY, camZ]} target={[0, 0.16, 0]} fov={fov} />
      <Studio mood="photo" intensity={0.55} />
      <spotLight
        position={[0.02, camY + 0.05, camZ]}
        target-position={[0, 0.15, 0]}
        angle={0.9}
        penumbra={0.4}
        intensity={5.2 * flash}
        decay={1.6}
        distance={0}
        color="#f3f8ff"
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-bias={-0.0004}
      />
      <Head castShadow rotation={headRot} gaze={[0.02, camY, camZ]} open={open} />
      <mesh position={[0, 0.1, -0.55]} receiveShadow>
        <planeGeometry args={[6, 4]} />
        <meshStandardMaterial color="#7d8590" roughness={0.92} />
      </mesh>
    </>
  );
};
