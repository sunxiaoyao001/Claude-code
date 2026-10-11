import React, {useLayoutEffect, useMemo, useRef} from 'react';
import * as THREE from 'three';
import {useHeadAssets} from './assets';
import {APERTURE_GLSL, NOISE_GLSL} from './eyeGlsl';
import {EyeLook, Eyeball} from './Eye';

type Props = JSX.IntrinsicElements['group'] & {
  /** mirror the face left/right (what you see in a mirror) */
  flip?: boolean;
  tint?: string;
  roughness?: number;
  clippingPlanes?: THREE.Plane[];
  opacity?: number;
  emissive?: string;
  emissiveIntensity?: number;
  renderOrder?: number;
  wire?: boolean;
  /** 0 = closed lids, 1 = open */
  open?: number;
  /** head-local point both eyes look at */
  gaze?: THREE.Vector3Tuple;
  eye?: EyeLook;
  /** extra fresnel rim glow colour/strength (for x-ray / hologram looks) */
  rim?: [string, number];
  /** smooth skin "beauty" amount 0..1 (used by the brain-retouch sequence) */
  smooth?: number;
  /** render layer (1 = only visible in reflections) */
  layer?: number;
  castShadow?: boolean;
  /** continuous x-scale override for flip animations (1 = real, -1 = mirrored) */
  flipScale?: number;
  /** hologram contour: additive rim only, drawn over everything */
  ghost?: boolean;
};

const socketGeo = new THREE.SphereGeometry(1, 32, 24);
const socketMat = new THREE.MeshStandardMaterial({color: '#8a4a42', emissive: '#3a1714', roughness: 0.5, side: THREE.BackSide});

export const AP = {inner: -0.86, outer: 1.0, up: 0.3, low: 0.17, slit0: -0.07, slit1: -0.03};

export const Head: React.FC<Props> = ({
  flip = false,
  tint = '#ffffff',
  roughness = 0.5,
  clippingPlanes,
  opacity = 1,
  emissive = '#000000',
  emissiveIntensity = 0,
  renderOrder,
  wire = false,
  open = 1,
  gaze = [0, 0.2, 3],
  eye,
  rim,
  smooth = 0,
  layer = 0,
  castShadow = false,
  flipScale,
  ghost = false,
  children,
  ...group
}) => {
  const assets = useHeadAssets();
  const ref = useRef<THREE.Group>(null);
  useLayoutEffect(() => {
    ref.current?.traverse((o) => o.layers.set(layer));
  });
  const built = useMemo(() => {
    if (!assets) return null;
    const uniforms = {
      uEyeC0: {value: assets.eyeL.clone()},
      uEyeC1: {value: assets.eyeR.clone()},
      uEyeR: {value: assets.eyeRadius},
      uOpen: {value: 1},
      uAp: {value: new THREE.Vector4(AP.inner, AP.outer, AP.up, AP.low)},
      uSlit0: {value: AP.slit0},
      uSlit1: {value: AP.slit1},
      uRimColor: {value: new THREE.Color('#000000')},
      uRim: {value: 0},
      uSmooth: {value: 0},
      uRimPow: {value: 2.5},
      uGhost: {value: 0},
    };
    const m = new THREE.MeshPhysicalMaterial({
      map: assets.map,
      normalMap: assets.normal,
      normalScale: new THREE.Vector2(0.8, 0.8),
      roughness,
      metalness: 0,
      specularIntensity: 0.5,
      specularColorMap: assets.spec,
      sheen: 0.6,
      sheenRoughness: 0.75,
      sheenColor: new THREE.Color('#ff9a85'),
      clearcoat: 0.08,
      clearcoatRoughness: 0.45,
    });
    m.onBeforeCompile = (shader) => {
      Object.assign(shader.uniforms, uniforms);
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', '#include <common>\nvarying vec3 vObj;')
        .replace('#include <begin_vertex>', '#include <begin_vertex>\nvObj = transformed;');
      shader.fragmentShader = shader.fragmentShader
        .replace(
          '#include <common>',
          `#include <common>
          varying vec3 vObj;
          uniform vec3 uRimColor; uniform float uRim; uniform float uSmooth; uniform float uRimPow; uniform float uGhost;
          ${NOISE_GLSL}
          ${APERTURE_GLSL}`,
        )
        .replace(
          '#include <map_fragment>',
          `#include <map_fragment>
          if (uGhost > 0.5) {
            // hide the mouth / nostril cavities that would show through an x-ray outline
            vec2 tp = vec2(vMapUv.x, 1.0 - vMapUv.y) * 1024.0;
            if (tp.y > 880.0 && ((tp.x > 130.0 && tp.x < 360.0) || (tp.x > 660.0 && tp.x < 900.0))) discard;
          }
          {
            float t0, a0, t1, a1;
            float d0 = apertureD(vObj, uEyeC0, -1.0, uSlit0, t0, a0);
            float d1 = apertureD(vObj, uEyeC1, 1.0, uSlit1, t1, a1);
            if (min(d0, d1) < 0.0) discard;
            // lash line + waterline around the opening
            float d = min(d0, d1);
            float above = d0 < d1 ? a0 : a1;
            float tt = d0 < d1 ? t0 : t1;
            float edge = sin(3.14159 * clamp(tt, 0.0, 1.0));
            float isUpper = step(-0.002, above);
            float lash = (1.0 - smoothstep(0.0, mix(0.04, 0.11, isUpper), d)) * pow(edge, 0.3) * uOpen;
            lash *= mix(1.0, 0.75 + 0.5 * vnoise3(vObj * 900.0), isUpper);
            diffuseColor.rgb *= 1.0 - clamp(lash * mix(0.4, 0.95, isUpper), 0.0, 0.95);
            float water = (1.0 - smoothstep(0.0, 0.018, d)) * (1.0 - isUpper) * uOpen;
            diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.75, 0.42, 0.40), water * 0.6);
          }
          // brain "beauty pass": even out tone, lift and warm
          if (uSmooth > 0.0) {
            vec3 even = vec3(dot(diffuseColor.rgb, vec3(0.3, 0.55, 0.15)));
            vec3 target = mix(even * vec3(1.18, 0.98, 0.9), diffuseColor.rgb, 0.55) * 1.08;
            diffuseColor.rgb = mix(diffuseColor.rgb, target, uSmooth);
          }`,
        )
        .replace(
          '#include <normal_fragment_maps>',
          `#include <normal_fragment_maps>
          normal = normalize(mix(normal, nonPerturbedNormal, uSmooth * 0.85));`,
        )
        .replace(
          '#include <opaque_fragment>',
          `
          float fres = pow(clamp(1.0 - abs(dot(normal, normalize(vViewPosition))), 0.0, 1.0), 2.5);
          outgoingLight += vec3(0.55, 0.12, 0.06) * fres * 0.12 * diffuseColor.rgb;
          float gfres = clamp(1.0 - abs(dot(nonPerturbedNormal, normalize(vViewPosition))), 0.0, 1.0);
          outgoingLight += uRimColor * pow(gfres, uRimPow) * uRim;
          #include <opaque_fragment>`,
        );
    };
    return {material: m, uniforms};
  }, [assets, roughness]);

  if (!assets || !built) return null;
  const {material, uniforms} = built;
  material.color.set(tint);
  material.clippingPlanes = clippingPlanes ?? null;
  material.transparent = opacity < 1;
  material.opacity = opacity;
  material.depthWrite = opacity > 0.5;
  material.emissive.set(emissive);
  material.emissiveIntensity = emissiveIntensity;
  material.wireframe = wire;
  material.depthTest = !ghost;
  material.blending = ghost ? THREE.AdditiveBlending : THREE.NormalBlending;
  if (ghost) {
    material.transparent = true;
    material.depthWrite = false;
    material.color.set('#000000');
    material.sheen = 0;
    material.specularIntensity = 0;
    material.clearcoat = 0;
  }
  uniforms.uOpen.value = open;
  uniforms.uRim.value = rim ? rim[1] : 0;
  if (rim) uniforms.uRimColor.value.set(rim[0]);
  uniforms.uSmooth.value = smooth;
  uniforms.uRimPow.value = ghost ? 7 : 2.5;
  uniforms.uGhost.value = ghost ? 1 : 0;

  const eL = assets.eyeL.toArray() as THREE.Vector3Tuple;
  const eR = assets.eyeR.toArray() as THREE.Vector3Tuple;
  return (
    <group {...group} ref={ref}>
      <group scale={[flipScale ?? (flip ? -1 : 1), 1, 1]}>
        <mesh geometry={assets.geometry} material={material} renderOrder={renderOrder} castShadow={castShadow} />
        {opacity > 0.5 && !ghost ? (
          <>
            <Eyeball position={eL} radius={assets.eyeRadius} gaze={gaze} look={eye} />
            <Eyeball position={eR} radius={assets.eyeRadius} gaze={gaze} look={eye} />
            <mesh position={eL} scale={assets.eyeRadius * 1.12} material={socketMat} geometry={socketGeo} />
            <mesh position={eR} scale={assets.eyeRadius * 1.12} material={socketMat} geometry={socketGeo} />
          </>
        ) : null}
        {children}
      </group>
    </group>
  );
};
