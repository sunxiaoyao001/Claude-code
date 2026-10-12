import React, {useMemo} from 'react';
import * as THREE from 'three';

/** A nerve fibre bundle as a glowing tube with travelling action-potential pulses. */
export const Nerve: React.FC<{
  points: THREE.Vector3[];
  radius?: number;
  color?: string;
  pulseColor?: string;
  base?: number;
  /** head of the signal along the fibre, 0..1 (values > 1 = fully lit) */
  progress?: number;
  t?: number;
  trains?: number;
}> = ({points, radius = 0.018, color = '#3b6fa8', pulseColor = '#9fe8ff', base = 0.6, progress = -1, t = 0, trains = 0}) => {
  const {geo, mat} = useMemo(() => {
    const curve = new THREE.CatmullRomCurve3(points, false, 'centripetal');
    const g = new THREE.TubeGeometry(curve, 96, radius, 10, false);
    const m = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uC: {value: new THREE.Color(color)},
        uP: {value: new THREE.Color(pulseColor)},
        uBase: {value: base},
        uProg: {value: -1},
        uT: {value: 0},
        uTrains: {value: 0},
      },
      vertexShader: /* glsl */ `
        varying vec2 vUv; varying vec3 vN; varying vec3 vV;
        void main(){
          vUv = uv;
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz);
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: /* glsl */ `
        uniform vec3 uC; uniform vec3 uP; uniform float uBase; uniform float uProg; uniform float uT; uniform float uTrains;
        varying vec2 vUv; varying vec3 vN; varying vec3 vV;
        void main(){
          float rim = pow(1.0 - abs(dot(vN, vV)), 1.2);
          float x = vUv.x;
          float lit = smoothstep(uProg, uProg - 0.25, x) * step(0.0, uProg);
          float head = exp(-pow((x - uProg) * 22.0, 2.0)) * step(0.0, uProg) * step(uProg, 1.05);
          float train = pow(max(0.0, sin((x * 18.0 - uT * 7.0))), 30.0) * uTrains;
          vec3 col = uC * uBase * (0.35 + rim) + uP * (lit * 0.9 + head * 4.0 + train * 2.0) * (0.5 + rim);
          gl_FragColor = vec4(col, 1.0);
        }`,
    });
    return {geo: g, mat: m};
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [points.map((p) => p.toArray().join(',')).join(';'), radius, color, pulseColor]);
  mat.uniforms.uBase.value = base;
  mat.uniforms.uProg.value = progress;
  mat.uniforms.uT.value = t;
  mat.uniforms.uTrains.value = trains;
  return <mesh geometry={geo} material={mat} renderOrder={5} />;
};
