// Final pass, fixed order (CLAUDE.md §4): [chromatic aberration on the fetch] -> vignette -> 3D LUT ->
// halation (screen) -> grain -> light leak (screen) -> scanlines -> dither. Every position-dependent effect uses `frame` (0..1 inside the output frame, y down),
// so the viewfinder and the full-resolution capture produce the same picture at any size.
//
// highp is needed by the grain hash and the LUT coordinates; GL_FRAGMENT_PRECISION_HIGH is defined by
// GLSL ES 1.0 wherever fragment highp exists. Devices without it still render, with coarser grain.
export const COMPOSITE_FRAG = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif

uniform sampler2D uFrame;
uniform sampler2D uLut;
uniform sampler2D uHalo;
uniform sampler2D uHaloWide;
uniform float uLutIntensity;
uniform float uOutAspect;     // output width / height
uniform vec2 uVignette;       // strength, softness
uniform vec3 uHalation;       // strength, weight of uHalo, weight of uHaloWide
uniform vec4 uGrain;          // size (px @1080), intensity, luma weight, seed
uniform float uGrainColored;  // 1 = independent noise per channel (digital sensor noise)
uniform vec2 uFx;             // chromatic aberration (fraction of the half-frame), scanline strength
uniform vec4 uLeak;           // centre.xy in frame coords (may lie outside), radius, opacity
uniform vec3 uLeakColor;
uniform float uDitherSeed;
varying vec2 vUv;
varying vec2 vTarget;

// 33^3 LUT packed as 6x6 tiles in a 198x198 texture: blue picks the tile, red/green address inside it.
const float LUT_N = 33.0;
const float LUT_TILES = 6.0;
const float LUT_TEX = 198.0;

vec2 lutTileOrigin(float slice) {
  float row = floor((slice + 0.5) / LUT_TILES);
  float col = slice - row * LUT_TILES;
  return vec2(col, row) * LUT_N;
}

vec3 lut3d(vec3 c) {
  c = clamp(c, 0.0, 1.0);
  float b = c.b * (LUT_N - 1.0);
  float s0 = floor(b);
  float s1 = min(s0 + 1.0, LUT_N - 1.0);
  vec2 rg = c.rg * (LUT_N - 1.0) + 0.5;
  vec3 a = texture2D(uLut, (lutTileOrigin(s0) + rg) / LUT_TEX).rgb;
  vec3 d = texture2D(uLut, (lutTileOrigin(s1) + rg) / LUT_TEX).rgb;
  return mix(a, d, b - s0);
}

// Dave Hoskins, "Hash without Sine": stable across GPUs, unlike fract(sin(x) * 43758.5).
float hash12(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

float valueNoise(vec2 q) {
  vec2 i = floor(q);
  vec2 f = fract(q);
  f = f * f * (3.0 - 2.0 * f);
  float a = hash12(i);
  float b = hash12(i + vec2(1.0, 0.0));
  float c = hash12(i + vec2(0.0, 1.0));
  float d = hash12(i + vec2(1.0, 1.0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

void main() {
  vec2 frame = vec2(vTarget.x, 1.0 - vTarget.y);
  vec3 color;
  if (uFx.x > 0.0) {
    // Lateral fringing: red and blue sampled at radially scaled positions. vUv - 0.5 is the frame-centred
    // offset already carried through crop/rotation, so the scaling is radial in the output frame.
    vec2 offset = vUv - 0.5;
    color = vec3(
      texture2D(uFrame, 0.5 + offset * (1.0 + uFx.x)).r,
      texture2D(uFrame, vUv).g,
      texture2D(uFrame, 0.5 + offset * (1.0 - uFx.x)).b);
  } else {
    color = texture2D(uFrame, vUv).rgb;
  }

  // Vignette: aspect-corrected radial falloff, ~1.0 at the corners.
  vec2 centred = (frame - 0.5) * vec2(uOutAspect, 1.0);
  float dist = length(centred) * 1.414 / max(uOutAspect, 1.0);
  float vig = 1.0 - smoothstep(0.8 - uVignette.y, 0.8, dist);
  color *= mix(1.0 - uVignette.x, 1.0, vig);

  color = mix(color, lut3d(color), uLutIntensity);

  vec3 halo = (texture2D(uHalo, vTarget).rgb * uHalation.y + texture2D(uHaloWide, vTarget).rgb * uHalation.z) * uHalation.x;
  color = 1.0 - (1.0 - color) * (1.0 - clamp(halo, 0.0, 1.0));

  // Grain: cells sized relative to the frame height; strongest in the midtones (sin-shaped weight).
  vec2 grainPos = vec2(frame.x * uOutAspect, frame.y) * (1080.0 / uGrain.x) + uGrain.w * vec2(13.1, 7.7);
  vec3 noise = vec3(valueNoise(grainPos) - 0.5);
  if (uGrainColored > 0.5) {
    noise.g = valueNoise(grainPos + vec2(57.3, 21.9)) - 0.5;
    noise.b = valueNoise(grainPos + vec2(-33.1, 91.7)) - 0.5;
  }
  float luma = dot(color, vec3(0.2126, 0.7152, 0.0722));
  float weight = mix(1.0, sin(3.14159265 * clamp(luma, 0.0, 1.0)), uGrain.z);
  color += noise * uGrain.y * weight;

  // Light leak: soft warm blob entering from outside the frame, stronger towards the edges.
  vec2 toLeak = (frame - uLeak.xy) * vec2(uOutAspect, 1.0);
  float r = length(toLeak) / max(uLeak.z, 0.001);
  float edge = smoothstep(0.3, 0.9, length(frame - 0.5) * 1.414);
  vec3 leak = uLeakColor * exp(-2.0 * r * r) * mix(0.6, 1.0, edge) * uLeak.w;
  color = 1.0 - (1.0 - clamp(color, 0.0, 1.0)) * (1.0 - clamp(leak, 0.0, 1.0));

  // Scanlines: a fixed count per frame height, so preview and capture show the same pattern.
  float scan = 0.5 + 0.5 * cos(frame.y * 320.0 * 6.2831853);
  color *= 1.0 - uFx.y * 0.5 * scan;

  // +-0.5/255 dither hides banding from the 8-bit halation buffers.
  color += (hash12(gl_FragCoord.xy + uDitherSeed) - 0.5) / 255.0;
  gl_FragColor = vec4(clamp(color, 0.0, 1.0), 1.0);
}
`;
