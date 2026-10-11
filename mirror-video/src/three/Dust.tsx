import React, {useMemo} from 'react';
import {useCurrentFrame} from 'remotion';
import * as THREE from 'three';
import {rng} from '../lib/anim';

/**
 * Floating dust motes catching the light — gives the dark space depth and air.
 * Fully deterministic: positions are a function of the frame.
 */
export const Dust: React.FC<{
  count?: number;
  box?: [number, number, number];
  center?: [number, number, number];
  color?: string;
  size?: number;
  speed?: number;
  seed?: number;
  opacity?: number;
}> = ({count = 900, box = [8, 5, 8], center = [0, 0, 0], color = '#ffd9a8', size = 0.018, speed = 1, seed = 7, opacity = 1}) => {
  const frame = useCurrentFrame();
  const {geometry, material} = useMemo(() => {
    const r = rng(seed);
    const pos = new Float32Array(count * 3);
    const vel = new Float32Array(count * 3);
    const rnd = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (r() - 0.5) * box[0];
      pos[i * 3 + 1] = (r() - 0.5) * box[1];
      pos[i * 3 + 2] = (r() - 0.5) * box[2];
      vel[i * 3] = (r() - 0.5) * 0.02;
      vel[i * 3 + 1] = (r() * 0.6 + 0.2) * 0.012;
      vel[i * 3 + 2] = (r() - 0.5) * 0.02;
      rnd[i] = r();
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('vel', new THREE.BufferAttribute(vel, 3));
    g.setAttribute('rnd', new THREE.BufferAttribute(rnd, 1));
    const m = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uT: {value: 0},
        uBox: {value: new THREE.Vector3(...box)},
        uColor: {value: new THREE.Color(color)},
        uSize: {value: size},
        uOpacity: {value: opacity},
      },
      vertexShader: /* glsl */ `
        attribute vec3 vel; attribute float rnd;
        uniform float uT; uniform vec3 uBox; uniform float uSize;
        varying float vA;
        void main(){
          vec3 p = position + vel * uT * 30.0;
          p.x += sin(uT * 0.4 + rnd * 40.0) * 0.06;
          p = mod(p + uBox * 0.5, uBox) - uBox * 0.5;
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          gl_Position = projectionMatrix * mv;
          float tw = 0.55 + 0.45 * sin(uT * (1.0 + rnd * 2.0) + rnd * 30.0);
          vA = tw * (0.35 + rnd * 0.65);
          gl_PointSize = uSize * (0.5 + rnd) * 1080.0 / -mv.z;
          // fade near the box edges so wrap-around is invisible
          vec3 e = abs(p) / (uBox * 0.5);
          vA *= 1.0 - smoothstep(0.75, 1.0, max(max(e.x, e.y), e.z));
        }`,
      fragmentShader: /* glsl */ `
        uniform vec3 uColor; uniform float uOpacity; varying float vA;
        void main(){
          vec2 c = gl_PointCoord - 0.5; float d = length(c);
          float a = smoothstep(0.5, 0.0, d); a *= a;
          gl_FragColor = vec4(uColor * a * vA * uOpacity, 1.0);
        }`,
    });
    return {geometry: g, material: m};
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [count, box.join(","), center.join(","), color, size, seed, opacity]);
  material.uniforms.uT.value = (frame / 30) * speed;
  return <points geometry={geometry} material={material} position={center} frustumCulled={false} />;
};
