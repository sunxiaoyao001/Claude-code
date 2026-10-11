import React, {useMemo} from 'react';
import * as THREE from 'three';
import {NOISE_GLSL} from './eyeGlsl';

export type EyeLook = {
  pupil?: number; // pupil angular radius (rad)
  irisInner?: string;
  irisOuter?: string;
  detail?: number; // fibre frequency multiplier for macro shots
  emissive?: number;
};

const sharedGeo = new THREE.SphereGeometry(1, 96, 64);

export const makeEyeMaterial = () => {
  const m = new THREE.MeshPhysicalMaterial({
    roughness: 0.12,
    metalness: 0,
    clearcoat: 1,
    clearcoatRoughness: 0.03,
    specularIntensity: 0.9,
  });
  const uniforms = {
    uPupil: {value: 0.2},
    uIrisR: {value: 0.52},
    uIrisIn: {value: new THREE.Color('#7d5329')},
    uIrisOut: {value: new THREE.Color('#33261a')},
    uDetail: {value: 1},
    uGlow: {value: 0},
  };
  m.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vEyeObj;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvEyeObj = position;');
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
        varying vec3 vEyeObj;
        uniform float uPupil; uniform float uIrisR; uniform vec3 uIrisIn; uniform vec3 uIrisOut; uniform float uDetail; uniform float uGlow;
        ${NOISE_GLSL}`,
      )
      .replace(
        '#include <map_fragment>',
        `
        vec3 en = normalize(vEyeObj);
        float th = acos(clamp(en.z, -1.0, 1.0));
        float az = atan(en.y, en.x);
        vec2 ring = vec2(cos(az), sin(az));
        float rad = th / uIrisR;
        // sclera with faint vessels towards the corners
        float vv = fbm3(en * 9.0 * uDetail + 3.1);
        float vessel = smoothstep(0.035, 0.0, abs(vv - 0.52)) * smoothstep(0.75, 1.5, th);
        vec3 sclera = mix(vec3(0.62, 0.55, 0.52), vec3(0.80, 0.77, 0.74), smoothstep(1.4, 0.55, th));
        sclera = mix(sclera, vec3(0.72, 0.28, 0.25), vessel * 0.55);
        sclera *= mix(1.0, 0.6, smoothstep(0.7, 1.5, abs(atan(en.x, en.z))));
        // iris: radial fibres, collarette, crypts, limbal ring
        float fib = fbm3(vec3(ring * 26.0 * uDetail, rad * 2.2));
        float fib2 = vnoise3(vec3(ring * 70.0 * uDetail, rad * 6.0));
        float crypt = smoothstep(0.62, 0.78, fbm3(vec3(ring * 9.0, rad * 5.0 + 1.7)));
        vec3 iris = mix(uIrisIn, uIrisOut, smoothstep(0.32, 0.85, rad + (fib - 0.5) * 0.35));
        iris *= 0.42 + 0.55 * fib * (0.7 + 0.6 * fib2);
        float coll = smoothstep(0.06, 0.0, abs(rad - (0.42 + (fib - 0.5) * 0.12)));
        iris += vec3(0.32, 0.22, 0.10) * coll * 0.9;
        iris *= 1.0 - crypt * 0.45;
        iris *= mix(1.0, 0.18, smoothstep(0.82, 1.0, rad));
        float pr = uPupil / uIrisR;
        float pupilEdge = smoothstep(pr + 0.015, pr - 0.01, rad + (fib2 - 0.5) * 0.02);
        vec3 col = mix(iris, vec3(0.006, 0.006, 0.008), pupilEdge);
        float limbus = smoothstep(0.96, 1.06, rad);
        col = mix(col, sclera, limbus);
        // lid occlusion shadow on the upper eyeball
        col *= mix(1.0, 0.45, smoothstep(0.05, 0.55, en.y));
        diffuseColor.rgb = col;
        `,
      )
      .replace(
        '#include <emissivemap_fragment>',
        `#include <emissivemap_fragment>
        totalEmissiveRadiance += uGlow * vec3(1.0, 0.7, 0.35) * (1.0 - smoothstep(0.9, 1.05, rad)) * (1.0 - pupilEdge);`,
      );
  };
  return {material: m, uniforms};
};

type Props = JSX.IntrinsicElements['group'] & {
  radius: number;
  look?: EyeLook;
  /** point to look at, in the parent's local space */
  gaze?: THREE.Vector3Tuple;
};

export const Eyeball: React.FC<Props> = ({radius, look = {}, gaze, position, ...rest}) => {
  const {material, uniforms} = useMemo(() => makeEyeMaterial(), []);
  uniforms.uPupil.value = look.pupil ?? 0.2;
  uniforms.uDetail.value = look.detail ?? 1;
  uniforms.uGlow.value = look.emissive ?? 0;
  if (look.irisInner) uniforms.uIrisIn.value.set(look.irisInner);
  if (look.irisOuter) uniforms.uIrisOut.value.set(look.irisOuter);

  const quat = useMemo(() => new THREE.Quaternion(), []);
  if (gaze && position) {
    const p = position as THREE.Vector3Tuple;
    const dir = new THREE.Vector3(gaze[0] - p[0], gaze[1] - p[1], gaze[2] - p[2]).normalize();
    quat.setFromUnitVectors(new THREE.Vector3(0, 0, 1), dir);
  } else quat.identity();

  return (
    <group position={position} {...rest}>
      <mesh geometry={sharedGeo} material={material} scale={radius} quaternion={quat} />
    </group>
  );
};
