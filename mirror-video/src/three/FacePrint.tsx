import React, {useMemo} from 'react';
import * as THREE from 'three';
import {createPortal, useFrame} from '@react-three/fiber';
import {Head} from './Head';
import {Studio, LightMood} from './Lights';

export const MID = -0.0125;

export type FaceTexOpts = {
  flip?: boolean;
  mood?: LightMood;
  w?: number;
  h?: number;
  bg?: string;
  yaw?: number;
  dist?: number;
  fov?: number;
  open?: number;
};

/**
 * Renders the real head into an offscreen texture every frame, so 2D image
 * processing (the brain's "retouch", the retinal mosaic, photo prints) works on
 * an actual rendered face rather than a drawing. Returns the texture plus a
 * portal element that must be placed somewhere in the R3F tree.
 */
export const useFaceTexture = ({flip = false, mood = 'neutral', w = 512, h = 640, bg = '#0b0d12', yaw = 0, dist = 1.45, fov = 24, open = 1}: FaceTexOpts) => {
  const fbo = useMemo(() => new THREE.WebGLRenderTarget(w, h, {samples: 4, type: THREE.HalfFloatType}), [w, h]);
  const scene = useMemo(() => new THREE.Scene(), []);
  const cam = useMemo(() => new THREE.PerspectiveCamera(fov, w / h, 0.01, 50), [fov, w, h]);
  const mx = flip ? -MID : MID;
  scene.background = new THREE.Color(bg);
  cam.position.set(mx, 0.15, dist);
  cam.lookAt(mx, 0.12, 0);
  cam.updateProjectionMatrix();
  cam.updateMatrixWorld();
  useFrame(({gl}) => {
    const prev = gl.getRenderTarget();
    gl.setRenderTarget(fbo);
    gl.clear();
    gl.render(scene, cam);
    gl.setRenderTarget(prev);
  }, -1);
  const portal = createPortal(
    <>
      <Studio mood={mood} />
      <Head flip={flip} rotation={[0, yaw, 0]} gaze={[mx, 0.15, dist]} open={open} />
    </>,
    scene,
  );
  return {texture: fbo.texture, portal};
};

const PRINT_FRAG = /* glsl */ `
  uniform sampler2D uMap; uniform float uBeauty; uniform float uMid; uniform vec2 uTexel;
  uniform float uMode; uniform float uT; uniform vec3 uTint; uniform float uBright; uniform float uScan;
  uniform float uDesat; uniform float uBorder; uniform float uAlpha;
  uniform float uSym; uniform float uSmooth; uniform float uWarm; uniform float uEdge;
  varying vec2 vUv;
  float h21(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  vec3 tapc(vec2 uv){ return texture2D(uMap, uv).rgb; }
  vec3 symAt(vec2 uv, float k){
    vec3 c = tapc(uv);
    vec3 m = tapc(vec2(2.0 * uMid - uv.x, uv.y));
    return mix(c, 0.5 * (c + m), k);
  }
  vec3 beauty(vec2 uv){
    float sym = uSym >= 0.0 ? uSym : clamp(uBeauty * 0.9, 0.0, 0.6);
    float smo = uSmooth >= 0.0 ? uSmooth : clamp(uBeauty * 1.1, 0.0, 1.0);
    float warm = uWarm >= 0.0 ? uWarm : clamp(uBeauty, 0.0, 1.0);
    vec3 c = tapc(uv);
    if (uBeauty < 0.0) {
      // the other direction: exaggerate asymmetry, harsher contrast, colder
      float k = -uBeauty;
      vec3 m = tapc(vec2(2.0 * uMid - uv.x, uv.y));
      c = c + (c - m) * k * 0.9;
      c = mix(c, (c - 0.45) * 1.25 + 0.45, k);
      c *= mix(vec3(1.0), vec3(0.94, 0.99, 1.08), k);
      return max(c, vec3(0.0));
    }
    vec3 base = symAt(uv, sym);
    if (smo > 0.0) {
      vec3 acc = base; float wsum = 1.0;
      for (int i = 0; i < 16; i++) {
        float a = float(i) * 2.3999632;
        float r = (1.0 + float(i) * 0.35) * 2.2;
        vec2 o = vec2(cos(a), sin(a)) * r * uTexel;
        vec3 sp = symAt(uv + o, sym);
        float w = exp(-dot(sp - base, sp - base) * 28.0);
        acc += sp * w; wsum += w;
      }
      base = mix(base, acc / wsum, smo);
    }
    float l = dot(base, vec3(0.299, 0.587, 0.114));
    base = mix(base, base * vec3(1.07, 1.0, 0.93) + 0.035 * smoothstep(0.05, 0.6, l), warm);
    base = mix(base, pow(max(base, vec3(0.0)), vec3(0.9)), warm * 0.6);
    // edge detection pass (V1-like): Sobel magnitude glowing in cyan
    if (uEdge > 0.0) {
      vec2 tx = uTexel * 1.5;
      float g00 = dot(tapc(uv + tx * vec2(-1, -1)), vec3(0.33)); float g10 = dot(tapc(uv + tx * vec2(0, -1)), vec3(0.33)); float g20 = dot(tapc(uv + tx * vec2(1, -1)), vec3(0.33));
      float g01 = dot(tapc(uv + tx * vec2(-1, 0)), vec3(0.33)); float g21 = dot(tapc(uv + tx * vec2(1, 0)), vec3(0.33));
      float g02 = dot(tapc(uv + tx * vec2(-1, 1)), vec3(0.33)); float g12 = dot(tapc(uv + tx * vec2(0, 1)), vec3(0.33)); float g22 = dot(tapc(uv + tx * vec2(1, 1)), vec3(0.33));
      float gx = g20 + 2.0 * g21 + g22 - g00 - 2.0 * g01 - g02;
      float gy = g02 + 2.0 * g12 + g22 - g00 - 2.0 * g10 - g20;
      float e = clamp(length(vec2(gx, gy)) * 4.0, 0.0, 1.0);
      base = mix(base, base * 0.25 + vec3(0.37, 0.83, 1.0) * e * 1.6, uEdge);
    }
    return base;
  }
  void main(){
    vec2 uv = vUv;
    // photo-paper border
    vec2 b = step(vec2(uBorder), uv) * step(uv, vec2(1.0 - uBorder));
    float inside = b.x * b.y;
    vec2 iuv = (uv - uBorder) / (1.0 - 2.0 * uBorder);
    vec3 col;
    if (uMode < 0.5) {
      col = beauty(iuv);
    } else {
      // retina: image arrives rotated 180°, sampled by a hexagonal photoreceptor mosaic
      vec2 ruv = vec2(1.0) - iuv;
      vec2 g = ruv * vec2(64.0, 80.0);
      vec2 r = vec2(1.0, 1.732);
      vec2 h = r * 0.5;
      vec2 a = mod(g, r) - h; vec2 bb = mod(g - h, r) - h;
      vec2 gv = dot(a, a) < dot(bb, bb) ? a : bb;
      vec2 id = g - gv;
      vec3 s = tapc(id / vec2(64.0, 80.0));
      float d = length(gv);
      float dot1 = smoothstep(0.48, 0.18, d);
      float fl = 0.75 + 0.25 * sin(uT * 6.0 + h21(id) * 40.0);
      col = s * dot1 * 1.6 * fl + s * 0.12;
    }
    float lum = dot(col, vec3(0.299, 0.587, 0.114));
    col = mix(col, vec3(lum), uDesat);
    col *= uTint * uBright;
    // scanning light bar
    col += vec3(0.6, 0.85, 1.0) * exp(-pow((iuv.y - uScan) * 30.0, 2.0)) * 0.5 * step(-1.0, uScan);
    vec3 paper = vec3(0.93, 0.92, 0.89);
    vec3 outc = mix(paper, col, inside);
    gl_FragColor = vec4(outc, uAlpha);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

export type PrintParams = {
  beauty?: number;
  mode?: 'photo' | 'retina';
  tint?: string;
  bright?: number;
  scan?: number;
  desat?: number;
  border?: number;
  alpha?: number;
  t?: number;
  mid?: number;
  sym?: number;
  smooth?: number;
  warm?: number;
  edge?: number;
};

export const usePrintMaterial = () =>
  useMemo(
    () =>
      new THREE.ShaderMaterial({
        transparent: true,
        side: THREE.DoubleSide,
        toneMapped: false,
        uniforms: {
          uMap: {value: null},
          uBeauty: {value: 0},
          uMid: {value: 0.5},
          uTexel: {value: new THREE.Vector2(1 / 512, 1 / 640)},
          uMode: {value: 0},
          uT: {value: 0},
          uTint: {value: new THREE.Color('#ffffff')},
          uBright: {value: 1},
          uScan: {value: -10},
          uDesat: {value: 0},
          uBorder: {value: 0},
          uAlpha: {value: 1},
          uSym: {value: -1},
          uSmooth: {value: -1},
          uWarm: {value: -1},
          uEdge: {value: 0},
        },
        vertexShader: /* glsl */ `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
        fragmentShader: PRINT_FRAG,
      }),
    [],
  );

export const applyPrint = (m: THREE.ShaderMaterial, p: PrintParams) => {
  const u = m.uniforms;
  u.uBeauty.value = p.beauty ?? 0;
  u.uMode.value = p.mode === 'retina' ? 1 : 0;
  u.uTint.value.set(p.tint ?? '#ffffff');
  u.uBright.value = p.bright ?? 1;
  u.uScan.value = p.scan ?? -10;
  u.uDesat.value = p.desat ?? 0;
  u.uBorder.value = p.border ?? 0;
  u.uAlpha.value = p.alpha ?? 1;
  u.uT.value = p.t ?? 0;
  u.uMid.value = p.mid ?? 0.5;
  u.uSym.value = p.sym ?? -1;
  u.uSmooth.value = p.smooth ?? -1;
  u.uWarm.value = p.warm ?? -1;
  u.uEdge.value = p.edge ?? 0;
};

/** A physical photo print: the rendered face on slightly curved paper with a white border. */
export const Print: React.FC<
  JSX.IntrinsicElements['group'] & {
    params?: PrintParams;
    flip?: boolean;
    mood?: LightMood;
    w?: number;
    curl?: number;
    open?: number;
    yaw?: number;
  }
> = ({params = {}, flip = false, mood = 'neutral', w = 0.5, curl = 0.04, open = 1, yaw = 0, ...group}) => {
  const mat = usePrintMaterial();
  applyPrint(mat, params);
  const {texture, portal} = useFaceTexture({flip, mood, open, yaw});
  mat.uniforms.uMap.value = texture;
  const geo = useMemo(() => {
    const g = new THREE.PlaneGeometry(w, w * 1.25, 24, 24);
    const p = g.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i) / (w / 2);
      p.setZ(i, -curl * x * x * w);
    }
    g.computeVertexNormals();
    return g;
  }, [w, curl]);
  return (
    <group {...group}>
      <mesh geometry={geo} material={mat} />
      {portal}
    </group>
  );
};
