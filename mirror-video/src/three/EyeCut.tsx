import React, {useMemo} from 'react';
import * as THREE from 'three';
import {NOISE_GLSL} from './eyeGlsl';

/**
 * Anatomical cut-away eyeball. Optical axis along +x (light enters at −x,
 * retina at +x). Front half (z > 0) is cut away so we can see inside.
 */
export const EyeCut: React.FC<JSX.IntrinsicElements['group'] & {cut?: number; nerveGlow?: number}> = ({cut = 1, nerveGlow = 0, ...group}) => {
  const planes = useMemo(() => [new THREE.Plane(new THREE.Vector3(0, 0, -1), 0)], []);
  // planes are world-space: keep the cut through the group's origin (scenes keep EyeCut at z = 0)
  planes[0].constant = 0.0001 + (1 - cut) * 3;
  const mats = useMemo(() => {
    const sclera = new THREE.MeshPhysicalMaterial({color: '#f2ece4', roughness: 0.35, clearcoat: 0.6, clearcoatRoughness: 0.2, side: THREE.DoubleSide, sheen: 0.4, sheenColor: new THREE.Color('#ffd9cc')});
    const choroid = new THREE.MeshStandardMaterial({color: '#4a1410', roughness: 0.6, side: THREE.BackSide});
    const retina = new THREE.MeshPhysicalMaterial({color: '#d9774f', roughness: 0.45, clearcoat: 0.5, side: THREE.BackSide});
    retina.onBeforeCompile = (s) => {
      s.vertexShader = s.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vOP;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvOP = position;');
      s.fragmentShader = s.fragmentShader
        .replace('#include <common>', `#include <common>\nvarying vec3 vOP;\n${NOISE_GLSL}`)
        .replace(
          '#include <map_fragment>',
          `#include <map_fragment>
          {
            // retinal vessels radiating from the optic disc (slightly nasal of the pole)
            vec3 disc = normalize(vec3(0.95, 0.12, 0.0));
            vec3 p = normalize(vOP);
            float dd = acos(clamp(dot(p, disc), -1.0, 1.0));
            vec3 t1 = normalize(cross(disc, vec3(0.0, 0.0, 1.0)));
            vec3 t2 = cross(disc, t1);
            float ang = atan(dot(p, t2), dot(p, t1));
            float warp = fbm3(p * 6.0) * 1.2;
            float v = abs(sin(ang * 4.0 + warp + dd * 2.0));
            float vessel = smoothstep(0.08, 0.0, v) * smoothstep(1.4, 0.15, dd);
            float v2 = abs(sin(ang * 9.0 - warp * 1.6 + dd * 5.0));
            vessel = max(vessel, smoothstep(0.05, 0.0, v2) * smoothstep(1.0, 0.3, dd) * 0.6);
            diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.45, 0.06, 0.05), vessel * 0.85);
            diffuseColor.rgb = mix(diffuseColor.rgb, vec3(1.0, 0.86, 0.62), smoothstep(0.12, 0.06, dd));
            // macula: darker spot on the axis
            float mac = acos(clamp(dot(p, vec3(1.0, 0.0, 0.0)), -1.0, 1.0));
            diffuseColor.rgb *= mix(0.6, 1.0, smoothstep(0.03, 0.14, mac));
          }`,
        );
    };
    const glass = new THREE.MeshPhysicalMaterial({color: '#e8f4ff', roughness: 0.02, metalness: 0, transparent: true, opacity: 0.22, clearcoat: 1, clearcoatRoughness: 0, envMapIntensity: 2.2, depthWrite: false, side: THREE.DoubleSide});
    const lens = new THREE.MeshPhysicalMaterial({color: '#fff2c8', roughness: 0.05, transparent: true, opacity: 0.4, clearcoat: 1, envMapIntensity: 2, depthWrite: false});
    const iris = new THREE.MeshStandardMaterial({color: '#5a3a1e', roughness: 0.7, side: THREE.DoubleSide});
    const nerve = new THREE.MeshStandardMaterial({color: '#e8d8c4', roughness: 0.55, emissive: new THREE.Color('#5fd4ff'), emissiveIntensity: 0});
    for (const m of [sclera, choroid, retina, iris]) m.clippingPlanes = planes;
    return {sclera, choroid, retina, glass, lens, iris, nerve};
  }, [planes]);
  mats.nerve.emissiveIntensity = nerveGlow * 2;
  const geos = useMemo(() => {
    const shell = new THREE.SphereGeometry(1, 96, 64);
    // cornea: spherical cap bulging forward along −x
    const cornea = new THREE.SphereGeometry(0.55, 64, 32, 0, Math.PI * 2, 0, 0.95);
    cornea.rotateZ(Math.PI / 2);
    cornea.translate(-0.53, 0, 0);
    const lensG = new THREE.SphereGeometry(1, 64, 32);
    lensG.scale(0.17, 0.36, 0.36);
    const irisG = new THREE.RingGeometry(0.17, 0.5, 64);
    irisG.rotateY(Math.PI / 2);
    const nerveCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0.92, 0.12, 0),
      new THREE.Vector3(1.25, 0.15, 0),
      new THREE.Vector3(1.8, 0.1, 0),
      new THREE.Vector3(2.6, 0.0, 0),
    ]);
    const nerveG = new THREE.TubeGeometry(nerveCurve, 48, 0.16, 32, false);
    return {shell, cornea, lensG, irisG, nerveG};
  }, []);
  return (
    <group {...group}>
      <mesh geometry={geos.shell} material={mats.sclera} />
      <mesh geometry={geos.shell} material={mats.choroid} scale={0.975} />
      <mesh geometry={geos.shell} material={mats.retina} scale={0.955} />
      <mesh geometry={geos.cornea} material={mats.glass} />
      <mesh geometry={geos.irisG} material={mats.iris} position={[-0.84, 0, 0]} />
      <mesh geometry={geos.lensG} material={mats.lens} position={[-0.68, 0, 0]} />
      <mesh geometry={geos.nerveG} material={mats.nerve} />
    </group>
  );
};

/** Straight glowing ray segment between two points. */
export const Ray: React.FC<{a: THREE.Vector3; b: THREE.Vector3; color?: string; width?: number; p?: number; opacity?: number}> = ({
  a,
  b,
  color = '#ffd28a',
  width = 0.008,
  p = 1,
  opacity = 1,
}) => {
  const end = a.clone().lerp(b, Math.max(0.0001, p));
  const mid = a.clone().add(end).multiplyScalar(0.5);
  const len = a.distanceTo(end);
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
  return (
    <mesh position={mid} quaternion={q} renderOrder={8}>
      <cylinderGeometry args={[width, width, len, 6, 1, true]} />
      <meshBasicMaterial color={new THREE.Color(color).multiplyScalar(3)} transparent opacity={opacity} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
    </mesh>
  );
};
