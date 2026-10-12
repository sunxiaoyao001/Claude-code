import React, {useMemo} from 'react';
import * as THREE from 'three';
import {mergeGeometries} from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import {rng} from '../lib/anim';

/**
 * A field of pyramidal-ish neurons: soma, branching dendrites and one long axon.
 * Built once as merged tube geometry; a shader runs action potentials along
 * every branch (attribute `along` = distance from the soma).
 */
const buildNeuron = (r: () => number, origin: THREE.Vector3, scale: number) => {
  const parts: THREE.BufferGeometry[] = [];
  const addBranch = (start: THREE.Vector3, dir: THREE.Vector3, len: number, rad: number, depth: number, along0: number) => {
    const pts: THREE.Vector3[] = [start.clone()];
    const d = dir.clone();
    let p = start.clone();
    const segs = 6;
    for (let i = 0; i < segs; i++) {
      d.add(new THREE.Vector3(r() - 0.5, r() - 0.5, r() - 0.5).multiplyScalar(0.6)).normalize();
      p = p.clone().add(d.clone().multiplyScalar(len / segs));
      pts.push(p);
    }
    const curve = new THREE.CatmullRomCurve3(pts);
    const g = new THREE.TubeGeometry(curve, 14, rad, 5, false);
    // taper + along attribute
    const pos = g.attributes.position as THREE.BufferAttribute;
    const along = new Float32Array(pos.count);
    const ring = 6;
    for (let i = 0; i < pos.count; i++) {
      const seg = Math.floor(i / ring) / 14;
      along[i] = along0 + seg * len;
      const c = curve.getPoint(seg);
      const v = new THREE.Vector3().fromBufferAttribute(pos, i).sub(c).multiplyScalar(1 - seg * 0.7).add(c);
      pos.setXYZ(i, v.x, v.y, v.z);
    }
    g.setAttribute('along', new THREE.BufferAttribute(along, 1));
    g.deleteAttribute('uv');
    parts.push(g);
    if (depth > 0) {
      const n = depth > 1 ? 2 : 1 + Math.round(r());
      for (let k = 0; k < n; k++) {
        const t = 0.45 + r() * 0.45;
        addBranch(curve.getPoint(t), d.clone().add(new THREE.Vector3(r() - 0.5, r() - 0.5, r() - 0.5)).normalize(), len * 0.62, rad * 0.62, depth - 1, along0 + len * t);
      }
    }
  };
  const somaR = 0.05 * scale;
  const soma = new THREE.IcosahedronGeometry(somaR, 2);
  soma.deleteAttribute('uv');
  soma.setAttribute('along', new THREE.BufferAttribute(new Float32Array(soma.attributes.position.count), 1));
  soma.translate(origin.x, origin.y, origin.z);
  parts.push(soma);
  const nd = 4 + Math.floor(r() * 3);
  for (let i = 0; i < nd; i++) {
    const dir = new THREE.Vector3(r() - 0.5, r() * 0.8 + 0.1, r() - 0.5).normalize();
    addBranch(origin, dir, (0.35 + r() * 0.3) * scale, 0.012 * scale, 2, 0);
  }
  // axon
  addBranch(origin, new THREE.Vector3(r() - 0.5, -1, r() - 0.5).normalize(), 1.4 * scale, 0.009 * scale, 1, 0);
  return parts;
};

export const Neurons: React.FC<
  JSX.IntrinsicElements['group'] & {count?: number; spread?: [number, number, number]; t: number; color?: string; pulse?: string; intensity?: number; seed?: number}
> = ({count = 26, spread = [6, 3.5, 5], t, color = '#2a3f66', pulse = '#7fdcff', intensity = 1, seed = 5, ...group}) => {
  const {geo, mat} = useMemo(() => {
    const r = rng(seed);
    const parts: THREE.BufferGeometry[] = [];
    for (let i = 0; i < count; i++) {
      const o = new THREE.Vector3((r() - 0.5) * spread[0], (r() - 0.5) * spread[1], (r() - 0.5) * spread[2]);
      parts.push(...buildNeuron(r, o, 0.8 + r() * 0.6));
    }
    const g = mergeGeometries(parts.map((p) => (p.index ? p.toNonIndexed() : p)));
    const m = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: {uT: {value: 0}, uC: {value: new THREE.Color(color)}, uP: {value: new THREE.Color(pulse)}, uI: {value: 1}},
      vertexShader: /* glsl */ `
        attribute float along; varying float vA; varying float vF; varying vec3 vN; varying vec3 vV; varying float vD;
        void main(){
          vA = along;
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz);
          vD = -mv.z;
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: /* glsl */ `
        uniform float uT; uniform vec3 uC; uniform vec3 uP; uniform float uI;
        varying float vA; varying vec3 vN; varying vec3 vV; varying float vD;
        void main(){
          float rim = pow(1.0 - abs(dot(vN, vV)), 1.5);
          float spike = pow(max(0.0, sin(vA * 9.0 - uT * 5.0)), 24.0);
          vec3 col = uC * (0.35 + 1.2 * rim) + uP * spike * 2.5;
          float fog = exp(-max(0.0, vD - 1.5) * 0.35);
          gl_FragColor = vec4(col * fog * uI, 1.0);
        }`,
    });
    return {geo: g, mat: m};
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [count, spread.join(','), color, pulse, seed]);
  mat.uniforms.uT.value = t;
  mat.uniforms.uI.value = intensity;
  return (
    <group {...group}>
      <mesh geometry={geo} material={mat} frustumCulled={false} />
    </group>
  );
};
