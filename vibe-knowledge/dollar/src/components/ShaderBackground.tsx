/**
 * GLSL 背景 + Three.js 三维浮尘
 * ------------------------------------------------------------
 * 1) 全屏片元着色器：域扭曲 fBm 烟雾 + 顶部体积光 + 拍卖台聚光光斑，
 *    色调与能量由时间轴 MOODS 驱动，开枪时 uFlash 整屏闪白。
 * 2) 900 颗三维尘埃粒子：透视投影、加法混合，随 2D 镜头做视差漂移。
 * 以半分辨率渲染（dpr 0.5）再放大——烟雾本来就是柔焦的，渲染开销降到 1/4。
 */
import {ThreeCanvas} from '@remotion/three';
import React, {useMemo} from 'react';
import {useCurrentFrame, useVideoConfig} from 'remotion';
import * as THREE from 'three';
import {keyframes} from '../lib/anim';
import {IMPACTS, MOODS} from '../timeline';

const bgVert = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

const bgFrag = /* glsl */ `
precision highp float;
varying vec2 vUv;
uniform float uTime;
uniform vec3 uTint;
uniform float uEnergy;
uniform float uFlash;
uniform vec2 uCam;
uniform float uAspect;

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
             mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}
float fbm(vec2 p) {
  float v = 0.0, a = 0.5;
  mat2 r = mat2(0.8, -0.6, 0.6, 0.8);
  for (int i = 0; i < 4; i++) { v += a * noise(p); p = r * p * 2.03 + 11.7; a *= 0.5; }
  return v;
}

void main() {
  vec2 uv = vUv;
  vec2 p = (uv - 0.5) * vec2(uAspect, 1.0);

  // 域扭曲烟雾：两层 fBm 互相推挤，缓慢横向漂移
  vec2 q = p * 2.4 + vec2(uTime * 0.035, -uTime * 0.018) + uCam * 0.25;
  vec2 w = vec2(fbm(q + uTime * 0.04), fbm(q + vec2(5.2, 1.3) - uTime * 0.03));
  float smoke = fbm(q + 1.8 * w);
  smoke = smoothstep(0.25, 0.95, smoke);

  // 顶光：从画面上方斜射下来的光柱，被烟雾调制
  float shaftX = p.x + (1.0 - uv.y) * 0.18 - 0.05;
  float shaft = exp(-shaftX * shaftX * 9.0) * smoothstep(0.05, 0.85, uv.y);
  shaft *= 0.55 + 0.9 * smoke;

  // 画面中部的柔光（数据面板背后）
  vec2 fp = vec2(p.x, (uv.y - 0.55) * 2.6);
  float floorGlow = exp(-dot(fp, fp) * 3.0);

  // 拍卖台：聚光灯打在画面上半部的圆形光斑
  vec2 sp = vec2(p.x, (uv.y - 0.72) * 1.6);
  float stage = exp(-dot(sp, sp) * 7.0);

  vec3 col = vec3(0.018, 0.014, 0.012);
  col += uTint * smoke * (0.05 + 0.13 * uEnergy);
  col += mix(vec3(1.0, 0.86, 0.66), uTint, 0.35) * shaft * (0.05 + 0.11 * uEnergy);
  col += uTint * floorGlow * (0.06 + 0.12 * uEnergy);
  col += mix(vec3(1.0, 0.9, 0.75), uTint, 0.3) * stage * (0.06 + 0.1 * uEnergy);

  // 暗角
  float vig = smoothstep(1.05, 0.2, length(p * vec2(1.25, 0.82)));
  col *= mix(0.25, 1.0, vig);

  // 开枪闪白（偏暖）
  col += vec3(1.0, 0.93, 0.82) * uFlash;
  gl_FragColor = vec4(col, 1.0);
}
`;

const dustVert = /* glsl */ `
attribute float aSeed;
uniform float uTime;
uniform vec2 uCam;
varying float vAlpha;
void main() {
  vec3 p = position;
  // 缓慢上升 + 横向摆动，越界后循环（纯时间函数，逐帧确定）
  p.y = mod(p.y + uTime * (0.08 + aSeed * 0.12) + 6.0, 12.0) - 6.0;
  p.x += sin(uTime * 0.4 + aSeed * 40.0) * 0.18;
  p.xy -= uCam * (0.25 + (p.z + 6.0) * 0.06);
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  float size = 1.6 + aSeed * 4.4;
  gl_PointSize = size * (12.0 / -mv.z);
  vAlpha = 0.25 + 0.75 * fract(aSeed * 13.7 + uTime * 0.15);
}
`;

const dustFrag = /* glsl */ `
precision highp float;
uniform vec3 uTint;
uniform float uEnergy;
varying float vAlpha;
void main() {
  vec2 c = gl_PointCoord - 0.5;
  float d = length(c);
  float a = smoothstep(0.5, 0.0, d);
  a *= a * vAlpha * (0.35 + 0.65 * uEnergy);
  gl_FragColor = vec4(mix(vec3(1.0, 0.9, 0.72), uTint, 0.45) * a, a);
}
`;

const DUST = 900;

const Scene: React.FC<{frame: number; fps: number}> = ({frame, fps}) => {
  const t = frame / fps;

  const mood = keyframes(MOODS, frame, (a, b, k) => ({
    tint: a.tint.map((v, i) => v + (b.tint[i] - v) * k) as [number, number, number],
    energy: a.energy + (b.energy - a.energy) * k,
  }));
  // 缓慢漂移的“虚拟镜头”，让浮尘产生视差
  const cam = {x: 540 + Math.sin(t * 0.21) * 60, y: 820 + Math.cos(t * 0.17) * 40};
  const flash = IMPACTS.reduce((acc, im) => {
    const d = frame - im.f;
    return d >= 0 && d < 20 ? Math.max(acc, im.flash * 0.55 * Math.exp(-d / 3)) : acc;
  }, 0);

  const bgMat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: bgVert,
        fragmentShader: bgFrag,
        depthTest: false,
        depthWrite: false,
        uniforms: {
          uTime: {value: 0},
          uTint: {value: new THREE.Vector3()},
          uEnergy: {value: 0},
          uFlash: {value: 0},
          uCam: {value: new THREE.Vector2()},
          uAspect: {value: 1080 / 1920},
        },
      }),
    [],
  );

  const dust = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(DUST * 3);
    const seed = new Float32Array(DUST);
    for (let i = 0; i < DUST; i++) {
      const h = (n: number) => {
        const x = Math.sin((i + 1) * 12.9898 + n * 78.233) * 43758.5453;
        return x - Math.floor(x);
      };
      pos[i * 3] = (h(1) - 0.5) * 9;
      pos[i * 3 + 1] = (h(2) - 0.5) * 12;
      pos[i * 3 + 2] = -6 + h(3) * 8.5;
      seed[i] = h(4);
    }
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
    const mat = new THREE.ShaderMaterial({
      vertexShader: dustVert,
      fragmentShader: dustFrag,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uTime: {value: 0},
        uCam: {value: new THREE.Vector2()},
        uTint: {value: new THREE.Vector3()},
        uEnergy: {value: 0},
      },
    });
    return {geo, mat};
  }, []);

  // 每帧把时间轴状态写入 uniform（Remotion 每帧都会重渲染）
  const camOff = new THREE.Vector2((cam.x - 540) / 540, -(cam.y - 820) / 820);
  bgMat.uniforms.uTime.value = t;
  bgMat.uniforms.uTint.value.set(...mood.tint);
  bgMat.uniforms.uEnergy.value = mood.energy;
  bgMat.uniforms.uFlash.value = flash;
  bgMat.uniforms.uCam.value.copy(camOff);
  dust.mat.uniforms.uTime.value = t;
  dust.mat.uniforms.uCam.value.copy(camOff);
  dust.mat.uniforms.uTint.value.set(...mood.tint);
  dust.mat.uniforms.uEnergy.value = mood.energy;

  return (
    <>
      <mesh frustumCulled={false} renderOrder={-1} material={bgMat}>
        <planeGeometry args={[2, 2]} />
      </mesh>
      <points frustumCulled={false} geometry={dust.geo} material={dust.mat} />
    </>
  );
};

export const ShaderBackground: React.FC = () => {
  const frame = useCurrentFrame();
  const {width, height, fps} = useVideoConfig();
  return (
    <ThreeCanvas
      width={width}
      height={height}
      dpr={0.5}
      camera={{fov: 60, position: [0, 0, 5], near: 0.1, far: 50}}
      gl={{antialias: false, alpha: false, preserveDrawingBuffer: true}}
      style={{position: 'absolute', inset: 0}}
    >
      <Scene frame={frame} fps={fps} />
    </ThreeCanvas>
  );
};
