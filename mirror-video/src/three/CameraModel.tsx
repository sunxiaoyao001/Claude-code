import React, {useMemo} from 'react';
import * as THREE from 'three';
import {RoundedBox} from '@react-three/drei';
import {NOISE_GLSL} from './eyeGlsl';

/*
 * A brand-free mirrorless camera with a fast prime lens. Lens axis = +z.
 * Units: body is ~1.3 wide. The aperture is an 8-blade iris diaphragm drawn in a
 * shader so the blades can really close for the shutter moment.
 */

const ribbedCylinder = (r: number, len: number, ribs: number, depth: number) => {
  const g = new THREE.CylinderGeometry(r, r, len, ribs * 4, 8, true);
  const p = g.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i);
    const z = p.getZ(i);
    const a = Math.atan2(z, x);
    const k = 1 + depth * (Math.cos(a * ribs) > 0.2 ? 1 : 0);
    p.setX(i, x * k);
    p.setZ(i, z * k);
  }
  g.computeVertexNormals();
  g.rotateX(Math.PI / 2);
  return g;
};

const leatherMat = () => {
  const m = new THREE.MeshPhysicalMaterial({color: '#151517', roughness: 0.72, metalness: 0.0, clearcoat: 0.15, clearcoatRoughness: 0.6});
  m.onBeforeCompile = (s) => {
    s.vertexShader = s.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vLP;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvLP = position;');
    s.fragmentShader = s.fragmentShader
      .replace('#include <common>', `#include <common>\nvarying vec3 vLP;\n${NOISE_GLSL}`)
      .replace(
        '#include <normal_fragment_maps>',
        `#include <normal_fragment_maps>
        {
          // pebbled leatherette
          float e = 0.002;
          float h0 = vnoise3(vLP * 140.0);
          float hx = vnoise3((vLP + vec3(e, 0.0, 0.0)) * 140.0);
          float hy = vnoise3((vLP + vec3(0.0, e, 0.0)) * 140.0);
          normal = normalize(normal + vec3(h0 - hx, h0 - hy, 0.0) * 0.9);
        }`,
      );
  };
  return m;
};

const apertureMat = () =>
  new THREE.ShaderMaterial({
    uniforms: {uOpen: {value: 1}, uRot: {value: 0}},
    transparent: true,
    vertexShader: /* glsl */ `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */ `
      uniform float uOpen; uniform float uRot; varying vec2 vUv;
      void main(){
        vec2 p = (vUv - 0.5) * 2.0;
        float r = length(p);
        float a = atan(p.y, p.x) + uRot;
        float N = 8.0;
        float seg = 6.2831853 / N;
        float la = mod(a, seg) - seg * 0.5;
        // curved-blade polygon: distance to the blade edge
        float poly = r * cos(la) * (1.0 - 0.06 * cos(la * 2.0));
        float open = mix(0.0, 0.82, uOpen);
        float blade = smoothstep(open - 0.01, open + 0.01, poly);
        // blade sheen and overlap lines
        float edge = smoothstep(0.012, 0.0, abs(la)) * blade;
        vec3 metal = vec3(0.07, 0.075, 0.085) + vec3(0.13, 0.145, 0.17) * pow(max(0.0, sin(a * 8.0 + r * 5.0)), 6.0);
        metal += vec3(0.35) * edge;
        float hole = 1.0 - blade;
        if (r > 1.0) discard;
        // through the opening: rear elements catching a faint blue-green coating glint
        vec3 deep = vec3(0.01, 0.02, 0.035) + vec3(0.05, 0.12, 0.1) * smoothstep(0.5, 0.0, r);
        gl_FragColor = vec4(mix(metal, deep, hole), 1.0);
      }`,
  });

export const CameraModel: React.FC<
  JSX.IntrinsicElements['group'] & {
    aperture?: number; // 1 open .. 0 closed
    flash?: number;
  }
> = ({aperture = 1, flash = 0, ...group}) => {
  const m = useMemo(() => {
    const metal = new THREE.MeshPhysicalMaterial({color: '#2b2c30', metalness: 0.9, roughness: 0.32, clearcoat: 0.4, clearcoatRoughness: 0.3});
    const silver = new THREE.MeshPhysicalMaterial({color: '#c9ccd2', metalness: 1, roughness: 0.18});
    const rubber = new THREE.MeshStandardMaterial({color: '#0d0d0e', roughness: 0.85});
    const black = new THREE.MeshStandardMaterial({color: '#050506', roughness: 0.4});
    const blackIn = new THREE.MeshStandardMaterial({color: '#08080a', roughness: 0.5, side: THREE.BackSide});
    const glass = new THREE.MeshPhysicalMaterial({
      color: '#000000',
      roughness: 0.03,
      metalness: 0.0,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      clearcoat: 1,
      clearcoatRoughness: 0.0,
      iridescence: 1,
      iridescenceIOR: 1.6,
      iridescenceThicknessRange: [180, 520],
      envMapIntensity: 2.4,
    });
    const leather = leatherMat();
    const aperture = apertureMat();
    const flashM = new THREE.MeshStandardMaterial({color: '#dfe6ee', emissive: new THREE.Color('#ffffff'), emissiveIntensity: 0, roughness: 0.2, toneMapped: false});
    return {metal, silver, rubber, black, blackIn, glass, leather, aperture, flashM};
  }, []);
  m.aperture.uniforms.uOpen.value = aperture;
  m.aperture.uniforms.uRot.value = (1 - aperture) * 0.6;
  m.flashM.emissiveIntensity = flash * 30;
  const g = useMemo(() => {
    const focus = ribbedCylinder(0.43, 0.26, 60, 0.035);
    const front = new THREE.SphereGeometry(0.62, 64, 32, 0, Math.PI * 2, 0, 0.62);
    front.rotateX(Math.PI / 2);
    return {focus, front};
  }, []);
  return (
    <group {...group}>
      {/* body */}
      <RoundedBox args={[1.32, 0.86, 0.36]} radius={0.06} smoothness={6} material={m.leather} />
      <RoundedBox args={[1.34, 0.2, 0.38]} radius={0.05} smoothness={6} position={[0, 0.36, 0]} material={m.metal} />
      {/* EVF hump */}
      <RoundedBox args={[0.42, 0.22, 0.42]} radius={0.06} smoothness={6} position={[0, 0.5, -0.02]} material={m.metal} />
      {/* grip */}
      <RoundedBox args={[0.3, 0.8, 0.26]} radius={0.12} smoothness={6} position={[0.52, -0.02, 0.2]} material={m.leather} />
      {/* shutter button + dial */}
      <mesh position={[0.5, 0.49, 0.18]} material={m.silver}>
        <cylinderGeometry args={[0.055, 0.055, 0.05, 32]} />
      </mesh>
      <mesh position={[0.3, 0.51, -0.02]} material={m.metal}>
        <cylinderGeometry args={[0.1, 0.1, 0.07, 48]} />
      </mesh>
      {/* flash / AF-assist window */}
      <mesh position={[-0.46, 0.3, 0.185]} material={m.flashM}>
        <boxGeometry args={[0.16, 0.06, 0.02]} />
      </mesh>
      {/* mount */}
      <mesh position={[0, 0, 0.2]} rotation={[Math.PI / 2, 0, 0]} material={m.silver}>
        <cylinderGeometry args={[0.36, 0.36, 0.05, 64]} />
      </mesh>
      {/* lens barrel */}
      <mesh position={[0, 0, 0.35]} rotation={[Math.PI / 2, 0, 0]} material={m.metal}>
        <cylinderGeometry args={[0.38, 0.4, 0.26, 64]} />
      </mesh>
      <mesh geometry={g.focus} position={[0, 0, 0.6]} material={m.rubber} />
      <mesh position={[0, 0, 0.84]} rotation={[Math.PI / 2, 0, 0]} material={m.metal}>
        <cylinderGeometry args={[0.45, 0.43, 0.22, 64, 1, true]} />
      </mesh>
      <mesh position={[0, 0, 0.955]} material={m.silver}>
        <torusGeometry args={[0.43, 0.012, 12, 96]} />
      </mesh>
      {/* inside: black tube, aperture iris, front element */}
      <mesh position={[0, 0, 0.86]} rotation={[Math.PI / 2, 0, 0]} material={m.blackIn}>
        <cylinderGeometry args={[0.42, 0.42, 0.2, 64, 1, true]} />
      </mesh>
      <mesh position={[0, 0, 0.78]} material={m.aperture}>
        <planeGeometry args={[0.82, 0.82]} />
      </mesh>
      <mesh position={[0, 0, 0.48]} material={m.black}>
        <circleGeometry args={[0.4, 48]} />
      </mesh>
      <mesh geometry={g.front} position={[0, 0, 0.3]} material={m.glass} />
    </group>
  );
};
