import React, {useMemo} from 'react';
import * as THREE from 'three';
import {Reflector} from 'three/examples/jsm/objects/Reflector.js';
import {NOISE_GLSL} from './eyeGlsl';

/** Arched mirror outline (rounded bottom corners, semicircular top). */
export const archShape = (w: number, h: number, inset = 0) => {
  const hw = w / 2 - inset;
  const r = hw; // arch radius
  const bottom = -h / 2 + inset;
  const springLine = h / 2 - r - inset * 0; // where the arch starts
  const cr = Math.min(0.06, hw * 0.2);
  const s = new THREE.Shape();
  s.moveTo(-hw + cr, bottom);
  s.lineTo(hw - cr, bottom);
  s.quadraticCurveTo(hw, bottom, hw, bottom + cr);
  s.lineTo(hw, springLine);
  s.absarc(0, springLine, r, 0, Math.PI, false);
  s.lineTo(-hw, bottom + cr);
  s.quadraticCurveTo(-hw, bottom, -hw + cr, bottom);
  return s;
};

const MirrorShader = {
  name: 'RealMirror',
  uniforms: {
    color: {value: null},
    tDiffuse: {value: null},
    textureMatrix: {value: null},
    uTint: {value: new THREE.Color('#fff6ea')},
    uGlow: {value: 0},
    uGlowColor: {value: new THREE.Color('#ffc879')},
    uSmudge: {value: 0.35},
    uSize: {value: new THREE.Vector2(1, 2)},
    uDim: {value: 1},
    uSweep: {value: -10},
  },
  vertexShader: /* glsl */ `
    uniform mat4 textureMatrix;
    varying vec4 vUv; varying vec2 vLocal; varying vec3 vWorld; varying vec3 vN;
    void main(){
      vUv = textureMatrix * vec4(position, 1.0);
      vLocal = position.xy;
      vec4 w = modelMatrix * vec4(position, 1.0);
      vWorld = w.xyz;
      vN = normalize(mat3(modelMatrix) * vec3(0.0, 0.0, 1.0));
      gl_Position = projectionMatrix * viewMatrix * w;
    }`,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse; uniform vec3 uTint; uniform float uGlow; uniform vec3 uGlowColor;
    uniform float uSmudge; uniform vec2 uSize; uniform float uDim; uniform float uSweep;
    varying vec4 vUv; varying vec2 vLocal; varying vec3 vWorld; varying vec3 vN;
    ${NOISE_GLSL}
    void main(){
      vec3 base = texture2DProj(tDiffuse, vUv).rgb;
      // silvered glass: ~90% reflectance, faint warm cast
      vec3 col = base * uTint * 0.9 * uDim;
      // fingerprints / haze catch the light a little
      float sm = fbm3(vec3(vLocal * 7.0, 1.3));
      float sm2 = vnoise3(vec3(vLocal * 60.0, 4.2));
      col += vec3(0.02, 0.019, 0.017) * smoothstep(0.55, 0.85, sm) * uSmudge * (0.6 + sm2);
      // Fresnel: a touch of front-surface reflection at grazing angles
      vec3 V = normalize(cameraPosition - vWorld);
      float fr = pow(1.0 - abs(dot(V, vN)), 4.0);
      col += vec3(0.05, 0.06, 0.07) * fr;
      col += uGlowColor * uGlow;
      // a light sweep gliding across the glass
      float diag = (vLocal.x / uSize.x + vLocal.y / uSize.y * 0.6);
      float band = exp(-pow((diag - uSweep) * 9.0, 2.0)) + 0.35 * exp(-pow((diag - uSweep + 0.16) * 22.0, 2.0));
      col += vec3(1.0, 0.93, 0.85) * band * 0.22;
      gl_FragColor = vec4(col, 1.0);
    }`,
};

type Props = JSX.IntrinsicElements['group'] & {
  width?: number;
  height?: number;
  frame?: 'bronze' | 'black' | 'none';
  glow?: number;
  glowColor?: string;
  dim?: number;
  resolution?: number;
  sweep?: number;
};

export const Mirror: React.FC<Props> = ({
  width = 0.9,
  height = 1.7,
  frame = 'bronze',
  glow = 0,
  glowColor = '#ffc879',
  dim = 1,
  resolution = 1,
  sweep = -10,
  ...group
}) => {
  const parts = useMemo(() => {
    const shape = archShape(width, height);
    const surfaceGeo = new THREE.ShapeGeometry(shape, 64);
    const reflector = new Reflector(surfaceGeo, {
      textureWidth: Math.round(1920 * resolution),
      textureHeight: Math.round(1080 * resolution),
      clipBias: 0.002,
      shader: MirrorShader,
      multisample: 4,
    });
    (reflector.material as THREE.ShaderMaterial).uniforms.uSize.value.set(width, height);
    // the reflection also sees layer 1 (objects hidden from the main camera, e.g. a POV head)
    (reflector as unknown as {camera: THREE.Camera}).camera.layers.enable(1);

    // glass body: 6mm float glass seen on the edge is green
    const glassGeo = new THREE.ExtrudeGeometry(shape, {depth: 0.012, bevelEnabled: true, bevelThickness: 0.004, bevelSize: 0.006, bevelSegments: 3, curveSegments: 64});
    glassGeo.translate(0, 0, -0.018);
    const glassMat = new THREE.MeshPhysicalMaterial({color: '#6f9c8a', roughness: 0.06, metalness: 0.0, clearcoat: 1, clearcoatRoughness: 0.02, transmission: 0, ior: 1.5, specularIntensity: 1});

    // frame: an extruded ring with a soft bevel
    let frameGeo: THREE.ExtrudeGeometry | null = null;
    if (frame !== 'none') {
      const outer = archShape(width + 0.11, height + 0.11);
      const hole = archShape(width - 0.012, height - 0.012);
      outer.holes.push(new THREE.Path(hole.getPoints(96)));
      frameGeo = new THREE.ExtrudeGeometry(outer, {depth: 0.03, bevelEnabled: true, bevelThickness: 0.018, bevelSize: 0.016, bevelSegments: 6, curveSegments: 96});
      frameGeo.translate(0, 0, -0.03);
    }
    const frameMat = new THREE.MeshPhysicalMaterial(
      frame === 'black'
        ? {color: '#121214', metalness: 0.6, roughness: 0.32, clearcoat: 0.6, clearcoatRoughness: 0.2}
        : {color: '#9b7446', metalness: 1, roughness: 0.28, clearcoat: 0.3, clearcoatRoughness: 0.3},
    );
    return {reflector, glassGeo, glassMat, frameGeo, frameMat};
  }, [width, height, frame, resolution]);

  const u = (parts.reflector.material as THREE.ShaderMaterial).uniforms;
  u.uGlow.value = glow;
  u.uGlowColor.value.set(glowColor);
  u.uDim.value = dim;
  u.uSweep.value = sweep;

  return (
    <group {...group}>
      <primitive object={parts.reflector} />
      <mesh geometry={parts.glassGeo} material={parts.glassMat} />
      {parts.frameGeo ? <mesh geometry={parts.frameGeo} material={parts.frameMat} /> : null}
    </group>
  );
};
