import React, {useMemo} from 'react';
import * as THREE from 'three';

/** Fake volumetric light shaft: additive cone with soft falloff along and across. */
export const Beam: React.FC<
  JSX.IntrinsicElements['group'] & {length?: number; radius?: number; color?: string; opacity?: number}
> = ({length = 4, radius = 0.9, color = '#ffd9a8', opacity = 0.25, ...group}) => {
  const {geo, mat} = useMemo(() => {
    const g = new THREE.CylinderGeometry(0.02, radius, length, 64, 1, true);
    g.translate(0, -length / 2, 0);
    const m = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      uniforms: {uColor: {value: new THREE.Color(color)}, uOpacity: {value: opacity}, uLen: {value: length}},
      vertexShader: /* glsl */ `
        varying float vY; varying vec3 vN; varying vec3 vV;
        void main(){
          vY = position.y;
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz);
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: /* glsl */ `
        uniform vec3 uColor; uniform float uOpacity; uniform float uLen;
        varying float vY; varying vec3 vN; varying vec3 vV;
        void main(){
          float along = clamp(-vY / uLen, 0.0, 1.0);
          float edge = pow(abs(dot(vN, vV)), 1.6);
          float a = edge * (1.0 - along) * smoothstep(0.0, 0.08, along) * uOpacity;
          gl_FragColor = vec4(uColor * a, 1.0);
        }`,
    });
    return {geo: g, mat: m};
  }, [length, radius, color, opacity]);
  return (
    <group {...group}>
      <mesh geometry={geo} material={mat} />
    </group>
  );
};
