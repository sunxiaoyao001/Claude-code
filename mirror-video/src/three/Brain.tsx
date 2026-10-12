import React, {useMemo} from 'react';
import * as THREE from 'three';
import {createNoise3D} from 'simplex-noise';
import {mergeVertices} from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import {rng} from '../lib/anim';

/*
 * Procedural human brain. Coordinates: x = subject's left (+) / right (−),
 * y = up, z = anterior (front). Overall length ≈ 1.7 units (≈ 17 cm).
 *
 * Gyri and sulci come from the zero-isolines of domain-warped simplex noise,
 * carved into two hemispheres shaped with frontal/occipital poles, a temporal
 * lobe, the Sylvian fissure and a flattened medial wall. Cerebellum has fine folia.
 */

export const BRAIN = {
  // landmarks used by the visual pathway (brain-local)
  eyeL: new THREE.Vector3(0.27, -0.3, 1.12),
  eyeR: new THREE.Vector3(-0.27, -0.3, 1.12),
  chiasm: new THREE.Vector3(0, -0.47, 0.42),
  lgnL: new THREE.Vector3(0.24, -0.26, -0.02),
  lgnR: new THREE.Vector3(-0.24, -0.26, -0.02),
  v1L: new THREE.Vector3(0.1, -0.02, -0.86),
  v1R: new THREE.Vector3(-0.1, -0.02, -0.86),
  ffaL: new THREE.Vector3(0.34, -0.43, -0.3),
  ffaR: new THREE.Vector3(-0.34, -0.43, -0.3),
};

type Built = {hemi: THREE.BufferGeometry; hemi2: THREE.BufferGeometry; cereb: THREE.BufferGeometry; stem: THREE.BufferGeometry};

let cache: Built | null = null;

const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

const buildHemisphere = (noise0: (x: number, y: number, z: number) => number, off = 0) => {
  const noise = (x: number, y: number, z: number) => noise0(x + off, y - off * 0.7, z + off * 0.3);
  let g: THREE.BufferGeometry = new THREE.IcosahedronGeometry(1, 72);
  g.deleteAttribute('normal');
  g.deleteAttribute('uv');
  g = mergeVertices(g, 1e-5);
  const pos = g.attributes.position as THREE.BufferAttribute;
  const col = new Float32Array(pos.count * 3);
  const sul = new Float32Array(pos.count);
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const ux = v.x;
    const uy = v.y;
    const uz = v.z;
    // base ellipsoid for the LEFT hemisphere (x > 0); medial wall at x≈0
    let x = ux * 0.36;
    let y = uy * 0.5;
    let z = uz * 0.86;
    // flat medial surface
    if (ux < 0) x *= 0.22;
    // flatter, lower base; frontal lobe base lifts (orbital surface)
    if (uy < 0) y *= 0.78 - 0.18 * smooth(0.2, 0.9, uz);
    // temporal lobe hangs down & out in the middle-front
    const temporal = smooth(0.1, -0.6, uy) * Math.exp(-Math.pow((uz - 0.1) / 0.45, 2)) * smooth(-0.2, 0.6, ux);
    y -= temporal * 0.1;
    x += temporal * 0.05;
    // occipital pole slightly pointed, frontal pole rounded & tall
    z *= 1 + 0.06 * smooth(-0.3, -1, uz) * (1 - Math.abs(uy));
    y *= 1 + 0.08 * smooth(0.2, 1, uz);
    // Sylvian (lateral) fissure: deep groove from the front-bottom sweeping back and up
    const sylvY = -0.08 + (0.25 - uz) * 0.18;
    const sylv = Math.exp(-Math.pow((uy - sylvY) / 0.07, 2)) * smooth(0.55, -0.3, uz) * smooth(0.0, 0.6, ux) * smooth(-0.75, -0.3, uz) ;
    // gyri: isolines of domain-warped noise
    const f = 3.7;
    const wx = noise(ux * 1.3 + 11, uy * 1.3, uz * 1.3) * 0.35;
    const wy = noise(ux * 1.3, uy * 1.3 + 23, uz * 1.3) * 0.35;
    const wz = noise(ux * 1.3, uy * 1.3, uz * 1.3 + 37) * 0.35;
    const n = noise(ux * f + wx, uy * f * 1.15 + wy, uz * f * 0.9 + wz);
    const n2 = noise(ux * f * 2.1 + 5, uy * f * 2.1, uz * f * 2.1);
    const g1 = Math.abs(n);
    // narrow cracks between plump, rounded gyri
    const sulcus = Math.pow(1 - smooth(0.0, 0.3, g1), 1.6); // 1 inside a sulcus
    const minor = (1 - smooth(0.0, 0.1, Math.abs(n2))) * 0.35;
    // the medial wall is smoother
    const medial = ux < 0 ? 0.5 : 1;
    const depth = (0.042 * sulcus + 0.006 * minor) * medial + 0.07 * sylv;
    // round the gyral crowns a little
    const crown = 0.008 * smooth(0.2, 0.8, g1);
    const nrm = new THREE.Vector3(x / 0.36 ** 2, y / 0.5 ** 2, z / 0.86 ** 2).normalize();
    x += nrm.x * (crown - depth);
    y += nrm.y * (crown - depth);
    z += nrm.z * (crown - depth);
    pos.setXYZ(i, x, y, z);
    const cav = Math.min(1, sulcus * 0.9 + minor * 0.4 + sylv);
    sul[i] = cav;
    // living-tissue palette: pale pink crowns, deep wine sulci
    const base = [0.9, 0.72, 0.66];
    const deep = [0.42, 0.15, 0.15];
    col[i * 3] = base[0] + (deep[0] - base[0]) * cav;
    col[i * 3 + 1] = base[1] + (deep[1] - base[1]) * cav;
    col[i * 3 + 2] = base[2] + (deep[2] - base[2]) * cav;
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  g.setAttribute('sulcus', new THREE.BufferAttribute(sul, 1));
  g.computeVertexNormals();
  return g;
};

const buildCerebellum = (noise: (x: number, y: number, z: number) => number) => {
  let g: THREE.BufferGeometry = new THREE.IcosahedronGeometry(1, 48);
  g.deleteAttribute('normal');
  g.deleteAttribute('uv');
  g = mergeVertices(g, 1e-5);
  const pos = g.attributes.position as THREE.BufferAttribute;
  const col = new Float32Array(pos.count * 3);
  const sul = new Float32Array(pos.count);
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    let x = v.x * 0.31;
    let y = v.y * 0.15;
    let z = v.z * 0.21;
    // two lobes with a midline notch
    const notch = Math.exp(-Math.pow(v.x / 0.12, 2)) * 0.05 * smooth(-0.2, 0.6, v.z);
    // folia: fine curved lamellae
    const wob = noise(v.x * 2, v.y * 2, v.z * 2) * 0.25;
    const fol = Math.abs(Math.sin((v.y + wob + v.z * 0.35) * 26));
    const groove = 1 - smooth(0.0, 0.35, fol);
    const d = 0.012 * groove + notch;
    const n = new THREE.Vector3(x, y, z).normalize();
    x -= n.x * d;
    y -= n.y * d;
    z -= n.z * d;
    pos.setXYZ(i, x, y, z);
    sul[i] = groove;
    col[i * 3] = 0.84 - 0.45 * groove;
    col[i * 3 + 1] = 0.62 - 0.45 * groove;
    col[i * 3 + 2] = 0.58 - 0.42 * groove;
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  g.setAttribute('sulcus', new THREE.BufferAttribute(sul, 1));
  g.computeVertexNormals();
  return g;
};

const buildStem = () => {
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, -0.15, -0.08),
    new THREE.Vector3(0, -0.4, -0.18),
    new THREE.Vector3(0, -0.62, -0.26),
    new THREE.Vector3(0, -0.84, -0.3),
  ]);
  const g = new THREE.TubeGeometry(curve, 48, 0.085, 32, false);
  const pos = g.attributes.position as THREE.BufferAttribute;
  const col = new Float32Array(pos.count * 3);
  const sul = new Float32Array(pos.count);
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i);
    // pons bulge
    const k = Math.exp(-Math.pow((y + 0.42) / 0.1, 2)) * 0.04;
    const p = new THREE.Vector3(pos.getX(i), 0, pos.getZ(i) + 0.2);
    p.normalize();
    pos.setX(i, pos.getX(i) + p.x * k);
    pos.setZ(i, pos.getZ(i) + p.z * k);
    col[i * 3] = 0.8;
    col[i * 3 + 1] = 0.62;
    col[i * 3 + 2] = 0.56;
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  g.setAttribute('sulcus', new THREE.BufferAttribute(sul, 1));
  g.computeVertexNormals();
  return g;
};

export const getBrain = (): Built => {
  if (cache) return cache;
  const noise = createNoise3D(rng(1234));
  const hemi = buildHemisphere(noise);
  const hemi2 = buildHemisphere(noise, 17.3);
  const cereb = buildCerebellum(noise);
  const stem = buildStem();
  cache = {hemi, hemi2, cereb, stem};
  return cache;
};

export type Activation = {pos: THREE.Vector3; radius: number; strength: number; color: string};

const MAXA = 4;

export const makeBrainMaterial = () => {
  const uniforms = {
    uT: {value: 0},
    uXray: {value: 0},
    uActP: {value: Array.from({length: MAXA}, () => new THREE.Vector3())},
    uActR: {value: new Array(MAXA).fill(0.1)},
    uActS: {value: new Array(MAXA).fill(0)},
    uActC: {value: Array.from({length: MAXA}, () => new THREE.Color())},
    uSpark: {value: 0},
    uRimC: {value: new THREE.Color('#5fd4ff')},
  };
  const m = new THREE.MeshPhysicalMaterial({
    vertexColors: true,
    roughness: 0.42,
    metalness: 0,
    clearcoat: 0.7,
    clearcoatRoughness: 0.28,
    sheen: 0.4,
    sheenRoughness: 0.6,
    sheenColor: new THREE.Color('#ffb0a0'),
    transparent: true,
    depthWrite: true,
  });
  m.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nattribute float sulcus; varying float vSul; varying vec3 vBrain;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvSul = sulcus; vBrain = (modelMatrix * vec4(position, 1.0)).xyz;');
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
        varying float vSul; varying vec3 vBrain;
        uniform float uT; uniform float uXray; uniform float uSpark; uniform vec3 uRimC;
        uniform vec3 uActP[${MAXA}]; uniform float uActR[${MAXA}]; uniform float uActS[${MAXA}]; uniform vec3 uActC[${MAXA}];
        float bh(vec3 p){ p = fract(p * 0.3183 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
        float bn(vec3 x){ vec3 i = floor(x); vec3 f = fract(x); f = f*f*(3.0-2.0*f);
          return mix(mix(mix(bh(i), bh(i+vec3(1,0,0)), f.x), mix(bh(i+vec3(0,1,0)), bh(i+vec3(1,1,0)), f.x), f.y),
                     mix(mix(bh(i+vec3(0,0,1)), bh(i+vec3(1,0,1)), f.x), mix(bh(i+vec3(0,1,1)), bh(i+vec3(1,1,1)), f.x), f.y), f.z); }`,
      )
      .replace(
        '#include <emissivemap_fragment>',
        `#include <emissivemap_fragment>
        {
          vec3 act = vec3(0.0);
          for (int k = 0; k < ${MAXA}; k++) {
            float d = distance(vBrain, uActP[k]);
            float a = exp(-pow(d / max(uActR[k], 1e-3), 2.0)) * uActS[k];
            // neurons firing: flickering speckle concentrated on the gyral crowns
            float fl = bn(vBrain * 60.0 + vec3(0.0, uT * 9.0, uT * 4.0));
            float fl2 = bn(vBrain * 140.0 - vec3(uT * 12.0));
            act += uActC[k] * a * (0.45 + 1.4 * pow(fl * fl2, 1.5)) * (1.0 - vSul * 0.6);
          }
          float sp = pow(bn(vBrain * 90.0 + uT * 20.0), 18.0) * uSpark;
          totalEmissiveRadiance += act * 2.2 + vec3(0.6, 0.85, 1.0) * sp * 3.0;
        }`,
      )
      .replace(
        '#include <opaque_fragment>',
        `
        {
          float fr = pow(1.0 - abs(dot(normalize(normal), normalize(vViewPosition))), 2.2);
          vec3 xr = uRimC * (0.15 + 1.6 * fr) * (0.35 + 0.65 * (1.0 - vSul));
          outgoingLight = mix(outgoingLight, outgoingLight * 0.25 + xr + totalEmissiveRadiance * 0.8, uXray);
          diffuseColor.a = mix(1.0, 0.18 + 0.75 * fr, uXray);
        }
        #include <opaque_fragment>`,
      );
  };
  return {material: m, uniforms};
};

type Props = JSX.IntrinsicElements['group'] & {
  t: number;
  xray?: number;
  acts?: Activation[];
  spark?: number;
  rimColor?: string;
  cerebellum?: boolean;
};

export const Brain: React.FC<Props> = ({t, xray = 0, acts = [], spark = 0, rimColor = '#5fd4ff', cerebellum = true, ...group}) => {
  const geo = useMemo(() => getBrain(), []);
  const {material, uniforms} = useMemo(() => makeBrainMaterial(), []);
  uniforms.uT.value = t;
  uniforms.uXray.value = xray;
  uniforms.uSpark.value = spark;
  uniforms.uRimC.value.set(rimColor);
  for (let k = 0; k < MAXA; k++) {
    const a = acts[k];
    uniforms.uActS.value[k] = a ? a.strength : 0;
    if (a) {
      uniforms.uActP.value[k].copy(a.pos);
      uniforms.uActR.value[k] = a.radius;
      uniforms.uActC.value[k].set(a.color);
    }
  }
  material.depthWrite = xray < 0.5;
  return (
    <group {...group}>
      {/* activations are given in brain-local space; the material reads world space,
          so the brain group itself must stay at identity inside its parent transform */}
      <mesh geometry={geo.hemi} material={material} position={[0.012, 0, 0]} renderOrder={2} />
      <mesh geometry={geo.hemi2} material={material} position={[-0.012, 0, 0]} scale={[-1, 1, 1]} renderOrder={2} />
      {cerebellum ? (
        <>
          <mesh geometry={geo.cereb} material={material} position={[0, -0.36, -0.56]} rotation={[0.3, 0, 0]} renderOrder={2} />
          <mesh geometry={geo.stem} material={material} renderOrder={2} />
        </>
      ) : null}
    </group>
  );
};
