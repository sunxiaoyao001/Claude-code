import React, {useMemo} from 'react';
import * as THREE from 'three';
import {useThree} from '@react-three/fiber';
import {ThreeCanvas} from '@remotion/three';
import {random} from 'remotion';
import {W, H} from '../theme';
import {useBrainParts} from './useBrain';
import {useStudioEnvironment, useTissueMaterial} from './BrainModel';
import type {BrainParts} from './buildBrain';

// ---------------------------------------------------------------------------------------------
// Anatomy of the reward circuit (model space, see geometry.ts axes). Mirrored for both sides.
export const VTA = new THREE.Vector3(0.035, -0.27, -0.1);
export const NAC = new THREE.Vector3(0.1, -0.16, 0.22);
export const PFC = new THREE.Vector3(0.2, 0.14, 0.62);

const mirror = (v: THREE.Vector3, s: number) => new THREE.Vector3(v.x * s, v.y, v.z);
const curve = (pts: [number, number, number][], s: number) =>
  new THREE.CatmullRomCurve3(pts.map(([x, y, z]) => new THREE.Vector3(x * s, y, z)), false, 'centripetal');

export const PATHWAYS = (s: number) => ({
  mesolimbic: curve([[0.035, -0.27, -0.1], [0.05, -0.27, -0.02], [0.075, -0.24, 0.08], [0.095, -0.2, 0.16], [0.1, -0.16, 0.22]], s),
  cortical: [
    curve([[0.035, -0.27, -0.1], [0.05, -0.22, 0.02], [0.08, -0.08, 0.2], [0.13, 0.05, 0.42], [0.2, 0.14, 0.62]], s),
    curve([[0.035, -0.27, -0.1], [0.045, -0.2, 0.02], [0.06, -0.02, 0.22], [0.08, 0.2, 0.42], [0.1, 0.32, 0.55]], s),
    curve([[0.035, -0.27, -0.1], [0.06, -0.24, 0.04], [0.12, -0.14, 0.24], [0.2, -0.04, 0.46], [0.26, 0.0, 0.62]], s),
  ],
});

// Additive light that leaves canvas alpha untouched: over a transparent canvas the browser's
// premultiplied compositing turns it into pure emitted light, with no dark fringes.
export const GLOW = {
  blending: THREE.CustomBlending,
  blendEquation: THREE.AddEquation,
  blendSrc: THREE.SrcAlphaFactor,
  blendDst: THREE.OneFactor,
  blendSrcAlpha: THREE.ZeroFactor,
  blendDstAlpha: THREE.OneFactor,
  transparent: true,
  depthWrite: false,
  toneMapped: false,
} as const;

// ---------------------------------------------------------------------------------------------
let glowTex: THREE.Texture | null = null;
const getGlowTexture = () => {
  if (glowTex) return glowTex;
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d')!;
  const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grd.addColorStop(0, 'rgba(255,255,255,1)');
  grd.addColorStop(0.15, 'rgba(255,255,255,0.75)');
  grd.addColorStop(0.4, 'rgba(255,255,255,0.22)');
  grd.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, 128, 128);
  glowTex = new THREE.CanvasTexture(c);
  return glowTex;
};

const XRAY_VERT = /* glsl */ `
attribute float crown;
varying vec3 vN;
varying vec3 vV;
varying vec3 vModel;
varying vec3 vWorld;
varying float vCrown;
void main() {
  vec4 world = modelMatrix * vec4(position, 1.0);
  vec4 mv = viewMatrix * world;
  vN = normalize(normalMatrix * normal);
  vV = normalize(-mv.xyz);
  vModel = position;
  vWorld = world.xyz;
  vCrown = crown;
  gl_Position = projectionMatrix * mv;
}`;

const XRAY_FRAG = /* glsl */ `
uniform vec3 uRim;
uniform vec3 uFill;
uniform float uOpacity;
uniform float uScanY;
uniform float uScanOn;
uniform vec3 uPfcColor;
uniform float uPfc;
varying vec3 vN;
varying vec3 vV;
varying vec3 vModel;
varying vec3 vWorld;
varying float vCrown;
void main() {
  if (uScanOn > 0.5 && vWorld.y < uScanY) discard;
  float f = 1.0 - abs(dot(normalize(vN), normalize(vV)));
  float fres = pow(f, 2.4);
  float sulcus = 1.0 - vCrown;
  vec3 col = uRim * (fres * 1.25) + uFill * (0.035 + 0.18 * sulcus * (0.35 + fres));
  float pfcMask = smoothstep(0.32, 0.62, vModel.z) * smoothstep(-0.32, 0.05, vModel.y);
  col += uPfcColor * pfcMask * uPfc * (0.22 + 0.9 * fres + 0.35 * sulcus);
  float line = exp(-pow((vWorld.y - uScanY) / 0.012, 2.0)) * uScanOn;
  col += vec3(0.75, 0.95, 1.0) * line * 2.2;
  gl_FragColor = vec4(col * uOpacity, 1.0);
}`;

const makeXray = (rim: string, fill: string) =>
  new THREE.ShaderMaterial({
    vertexShader: XRAY_VERT,
    fragmentShader: XRAY_FRAG,
    uniforms: {
      uRim: {value: new THREE.Color(rim)},
      uFill: {value: new THREE.Color(fill)},
      uOpacity: {value: 1},
      uScanY: {value: 10},
      uScanOn: {value: 0},
      uPfcColor: {value: new THREE.Color('#5b8cff')},
      uPfc: {value: 0},
    },
    ...GLOW,
    blendSrc: THREE.OneFactor,
    side: THREE.DoubleSide,
  });

const POINT_VERT = /* glsl */ `
attribute float aSize;
attribute float aAlpha;
attribute vec3 aColor;
varying float vAlpha;
varying vec3 vColor;
uniform float uScale;
void main() {
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = aSize * uScale / -mv.z;
  vAlpha = aAlpha;
  vColor = aColor;
}`;
const POINT_FRAG = /* glsl */ `
varying float vAlpha;
varying vec3 vColor;
void main() {
  vec2 c = gl_PointCoord - 0.5;
  float d = length(c) * 2.0;
  float core = smoothstep(0.42, 0.0, d);
  float halo = exp(-d * d * 5.0) * 0.55;
  float a = (core * 1.2 + halo) * vAlpha;
  if (a < 0.004) discard;
  vec3 col = mix(vColor, vec3(1.0, 0.95, 0.82), core * 0.3);
  gl_FragColor = vec4(col * a, 1.0);
}`;

// ---------------------------------------------------------------------------------------------
export type BrainStageProps = {
  frame: number;
  yaw: number;
  pitch?: number;
  scale?: number;
  position?: [number, number, number];
  camZ?: number;
  camY?: number;
  fov?: number;
  /** 0 = living tissue, 1 = fully scanned into x-ray */
  scan?: number;
  /** pathway reveal 0..1 (tube growth); particles flow once > 0 */
  flow?: number;
  flowSpeed?: number;
  vta?: number;
  nac?: number;
  pfc?: number;
  pfcColor?: string;
  structures?: number;
  xrayRim?: string;
  xrayFill?: string;
  tissueOpacity?: number;
  burst?: number;
};

const goldA = new THREE.Color('#ff9a2e');
const goldB = new THREE.Color('#ffcf6e');

const Pathway: React.FC<{c: THREE.CatmullRomCurve3; reveal: number; width: number; color: string; strength: number}> = ({
  c,
  reveal,
  width,
  color,
  strength,
}) => {
  const tubes = useMemo(() => {
    const segs = 160;
    const core = new THREE.TubeGeometry(c, segs, width, 8, false);
    const halo = new THREE.TubeGeometry(c, segs, width * 3.2, 10, false);
    return {core, halo, segs};
  }, [c, width]);
  const coreCount = tubes.core.index!.count;
  const haloCount = tubes.halo.index!.count;
  const r = Math.max(0, Math.min(1, reveal));
  tubes.core.setDrawRange(0, Math.floor((coreCount / 6) * r) * 6);
  tubes.halo.setDrawRange(0, Math.floor((haloCount / 6) * r) * 6);
  return (
    <group>
      <mesh geometry={tubes.core}>
        <meshBasicMaterial color={color} opacity={0.55 * strength} {...GLOW} />
      </mesh>
      <mesh geometry={tubes.halo}>
        <meshBasicMaterial color={color} opacity={0.12 * strength} {...GLOW} />
      </mesh>
    </group>
  );
};

const Particles: React.FC<{curves: THREE.CatmullRomCurve3[]; frame: number; amount: number; speed: number; seed: string; burst: number}> = ({
  curves,
  frame,
  amount,
  speed,
  seed,
  burst,
}) => {
  const perCurve = 46;
  const total = perCurve * curves.length;
  const {geo, mat} = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(total * 3), 3));
    g.setAttribute('aSize', new THREE.BufferAttribute(new Float32Array(total), 1));
    g.setAttribute('aAlpha', new THREE.BufferAttribute(new Float32Array(total), 1));
    g.setAttribute('aColor', new THREE.BufferAttribute(new Float32Array(total * 3), 3));
    const m = new THREE.ShaderMaterial({
      vertexShader: POINT_VERT,
      fragmentShader: POINT_FRAG,
      uniforms: {uScale: {value: 4.4}},
      ...GLOW,
      blendSrc: THREE.OneFactor,
    });
    return {geo: g, mat: m};
  }, [total]);
  const pos = geo.attributes.position.array as Float32Array;
  const size = geo.attributes.aSize.array as Float32Array;
  const alpha = geo.attributes.aAlpha.array as Float32Array;
  const col = geo.attributes.aColor.array as Float32Array;
  const tmp = new THREE.Vector3();
  const c3 = new THREE.Color();
  curves.forEach((cv, ci) => {
    for (let k = 0; k < perCurve; k++) {
      const i = ci * perCurve + k;
      const off = random(`${seed}${ci}o${k}`);
      const sp = speed * (0.75 + 0.5 * random(`${seed}${ci}s${k}`));
      const t = (((off + frame * sp) % 1) + 1) % 1;
      cv.getPointAt(t, tmp);
      const j = 0.012;
      pos[i * 3] = tmp.x + (random(`${seed}${ci}x${k}`) - 0.5) * j;
      pos[i * 3 + 1] = tmp.y + (random(`${seed}${ci}y${k}`) - 0.5) * j;
      pos[i * 3 + 2] = tmp.z + (random(`${seed}${ci}z${k}`) - 0.5) * j;
      const tail = Math.min(1, t * 6) * Math.min(1, (1 - t) * 4);
      size[i] = (7 + 9 * random(`${seed}${ci}r${k}`)) * (1 + burst * 0.6);
      alpha[i] = amount * tail * (0.55 + 0.45 * Math.sin(frame * 0.3 + k));
      c3.copy(goldA).lerp(goldB, random(`${seed}${ci}c${k}`));
      col[i * 3] = c3.r;
      col[i * 3 + 1] = c3.g;
      col[i * 3 + 2] = c3.b;
    }
  });
  geo.attributes.position.needsUpdate = true;
  geo.attributes.aSize.needsUpdate = true;
  geo.attributes.aAlpha.needsUpdate = true;
  geo.attributes.aColor.needsUpdate = true;
  return <points geometry={geo} material={mat} frustumCulled={false} />;
};

const GlowNode: React.FC<{p: THREE.Vector3; size: number; color: string; strength: number}> = ({p, size, color, strength}) => {
  const tex = getGlowTexture();
  if (strength <= 0.001) return null;
  return (
    <group position={p}>
      <mesh>
        <sphereGeometry args={[size * 0.16, 24, 16]} />
        <meshBasicMaterial color={color} opacity={Math.min(1, strength)} {...GLOW} />
      </mesh>
      <sprite scale={[size, size, 1]}>
        <spriteMaterial map={tex} color={color} opacity={0.85 * strength} {...GLOW} />
      </sprite>
      <sprite scale={[size * 3, size * 3, 1]}>
        <spriteMaterial map={tex} color={color} opacity={0.22 * strength} {...GLOW} />
      </sprite>
    </group>
  );
};

const Inner: React.FC<BrainStageProps & {parts: BrainParts}> = (props) => {
  const {
    parts,
    frame,
    yaw,
    pitch = 0.1,
    scale = 1,
    position = [0, 0, 0],
    scan = 0,
    flow = 0,
    flowSpeed = 0.012,
    vta = 0,
    nac = 0,
    pfc = 0,
    pfcColor = '#5b8cff',
    structures = 0,
    xrayRim = '#6fc8ff',
    xrayFill = '#2f6fff',
    tissueOpacity = 1,
    burst = 0,
  } = props;
  useStudioEnvironment(0.55);
  const {gl} = useThree();
  gl.localClippingEnabled = true;
  const tissue = useTissueMaterial();
  const xray = useMemo(() => makeXray(xrayRim, xrayFill), [xrayRim, xrayFill]);
  const ghost = useMemo(() => makeXray('#7aa8ff', '#3a5bd6'), []);
  const scanY = 0.72 - scan * 1.72;
  const plane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, -1, 0), 0), []);
  plane.constant = scanY;
  tissue.clippingPlanes = scan > 0 && scan < 1 ? [plane] : null;
  tissue.transparent = tissueOpacity < 1;
  tissue.opacity = tissueOpacity;
  const showTissue = scan < 1 && tissueOpacity > 0.01;
  const showXray = scan > 0;
  xray.uniforms.uScanY.value = scanY;
  xray.uniforms.uScanOn.value = scan > 0 && scan < 1 ? 1 : 0;
  xray.uniforms.uOpacity.value = Math.min(1, scan * 3);
  xray.uniforms.uPfc.value = pfc;
  (xray.uniforms.uPfcColor.value as THREE.Color).set(pfcColor);
  ghost.uniforms.uOpacity.value = structures * 0.8;

  const pathsR = useMemo(() => PATHWAYS(1), []);
  const pathsL = useMemo(() => PATHWAYS(-1), []);
  const allCurves = useMemo(
    () => [pathsR.mesolimbic, pathsL.mesolimbic, ...pathsR.cortical, ...pathsL.cortical],
    [pathsR, pathsL],
  );
  const pulse = 0.8 + 0.2 * Math.sin(frame * 0.25);
  const tex = getGlowTexture();

  return (
    <>
      <ambientLight intensity={0.12} color="#8aa0ff" />
      <hemisphereLight args={['#6d7cff', '#2a0a12', 0.4]} />
      <directionalLight position={[-2.5, 3, 3]} intensity={2.6} color="#fff1e6" />
      <directionalLight position={[3, 1.5, -3]} intensity={3.2} color="#62d2ff" />
      <directionalLight position={[-3, -0.5, -2.5]} intensity={2.2} color="#ff5fa2" />
      <group position={position} rotation={[pitch, 0, 0]}>
        <group rotation={[0, yaw, 0]} scale={scale}>
          {showTissue ? (
            <group>
              <mesh geometry={parts.hemiR} material={tissue} />
              <mesh geometry={parts.hemiL} material={tissue} />
              <mesh geometry={parts.cerebellum} material={tissue} />
              <mesh geometry={parts.stem} material={tissue} />
            </group>
          ) : null}
          {showXray ? (
            <group>
              <mesh geometry={parts.hemiR} material={xray} renderOrder={2} />
              <mesh geometry={parts.hemiL} material={xray} renderOrder={2} />
              <mesh geometry={parts.cerebellum} material={xray} renderOrder={2} />
              <mesh geometry={parts.stem} material={xray} renderOrder={2} />
            </group>
          ) : null}
          {structures > 0.01 ? (
            <group>
              {[1, -1].map((s) => (
                <group key={s}>
                  <mesh position={[0.075 * s, -0.04, -0.08]} scale={[0.07, 0.06, 0.1]} material={ghost}>
                    <sphereGeometry args={[1, 32, 24]} />
                  </mesh>
                  <mesh position={[0.16 * s, -0.05, 0.1]} scale={[0.055, 0.09, 0.17]} material={ghost}>
                    <sphereGeometry args={[1, 32, 24]} />
                  </mesh>
                  <mesh position={[0.1 * s, 0.05, 0.12]} scale={[0.04, 0.06, 0.16]} material={ghost}>
                    <sphereGeometry args={[1, 32, 24]} />
                  </mesh>
                </group>
              ))}
            </group>
          ) : null}
          {flow > 0 ? (
            <group>
              {allCurves.map((c, i) => (
                <Pathway key={i} c={c} reveal={flow * 1.15 - (i >= 2 ? 0.15 : 0)} width={i < 2 ? 0.0045 : 0.0032} color="#ff9a2e" strength={Math.min(1, flow * 2)} />
              ))}
              <Particles curves={allCurves} frame={frame} amount={Math.min(1, Math.max(0, flow * 1.6 - 0.35))} speed={flowSpeed} seed="dp" burst={burst} />
            </group>
          ) : null}
          {[1, -1].map((s) => (
            <group key={s}>
              <GlowNode p={mirror(VTA, s)} size={0.24} color="#ffb547" strength={vta * pulse} />
              <GlowNode p={mirror(NAC, s)} size={0.28 + burst * 0.3} color="#ff9a2e" strength={nac * pulse} />
            </group>
          ))}
        </group>
      </group>
      {scan > 0 && scan < 1 ? (
        <sprite position={[0, scanY, 0]} scale={[3.4, 0.09, 1]}>
          <spriteMaterial map={tex} color="#9fe6ff" opacity={0.65} {...GLOW} />
        </sprite>
      ) : null}
    </>
  );
};

export const BrainStage: React.FC<BrainStageProps> = (props) => {
  const parts = useBrainParts();
  const {camZ = 4.4, camY = 0.05, fov = 30} = props;
  if (!parts) return null;
  return (
    <ThreeCanvas width={W} height={H} camera={{position: [0, camY, camZ], fov}} gl={{antialias: true, alpha: true}}>
      <Inner {...props} parts={parts} />
    </ThreeCanvas>
  );
};

/** Project a model-space point of the brain to screen pixels (matches BrainStage transforms). */
export const projectBrainPoint = (
  p: THREE.Vector3,
  {yaw, pitch = 0.1, scale = 1, position = [0, 0, 0], camZ = 4.4, camY = 0.05, fov = 30}: BrainStageProps,
) => {
  const v = p.clone().multiplyScalar(scale);
  v.applyEuler(new THREE.Euler(0, yaw, 0));
  v.applyEuler(new THREE.Euler(pitch, 0, 0));
  v.add(new THREE.Vector3(...position));
  const cam = new THREE.PerspectiveCamera(fov, W / H, 0.1, 100);
  cam.position.set(0, camY, camZ);
  cam.updateMatrixWorld();
  cam.updateProjectionMatrix();
  v.project(cam);
  return {x: (v.x * 0.5 + 0.5) * W, y: (-v.y * 0.5 + 0.5) * H, z: v.z};
};
