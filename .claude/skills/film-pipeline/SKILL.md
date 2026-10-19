---
name: film-pipeline
description: Project knowledge for the WeChat mini-program film camera — render pipeline order, WebGL1/GLSL ES 1.0 rules, LUT packing and lookup, halation/grain/leak/vignette recipes, preview vs capture pass plans, CameraPack schema and series-delta merge rules, and platform limits found in P0 research. Use when writing or reviewing anything under miniprogram/core/gl, core/pack, core/camera, core/stamp, pack-tools, or shader files.
---

# Film Pipeline (project skill)

Source of truth for the product spec is `CLAUDE.md`. This skill condenses the rendering/pack parts plus the P0 research findings in `docs/research/`. Items marked **[pending C-xx]** depend on a decision listed in `docs/research/conflicts.md`; until decided, implement behind a flag or keep the CLAUDE.md wording.

## 1. Hard platform constraints (verified in P0)

- **WebGL1 / GLSL ES 1.0 only.** No `#version 300 es`, `texture()`, `textureLod`, `texelFetch`, bitwise ops, `out` variables. Loop bounds must be constant expressions. Back-port anything taken from the `shader-dev` skill (it is written for WebGL2).
- **Fragment `highp` is optional.** Probe once: `gl.getShaderPrecisionFormat(gl.FRAGMENT_SHADER, gl.HIGH_FLOAT).precision > 0`. Never use `fract(sin(x) * 43758.5453)` hashes.
- **No float render targets assumed.** All FBOs are RGBA8. Add ±0.5/255 dither in the final pass to hide banding from low-res halation buffers.
- **NPOT textures**: `CLAMP_TO_EDGE`, `LINEAR`, no mipmaps (camera frames ≈480×640, LUT 198×198).
- **Query limits at startup** (`MAX_TEXTURE_SIZE`, `MAX_RENDERBUFFER_SIZE`, `MAX_VIEWPORT_DIMS`) into a `GLCaps` object; capture size never exceeds them (tile if it must).
- **Camera frames**: `onCameraFrame` gives RGBA `ArrayBuffer`, size decided by the system (medium is commonly 480×640, not 720p). Allocate with `texImage2D` once, then `texSubImage2D`; never keep the buffer after the callback.
- **takePhoto**: output size is device-dependent; Android returns JPG, iOS returns PNG. Request `quality: 'original'`, read real size via `wx.getImageInfo`, fall back to `'high'`. **[pending C-04]** for the output long-edge cap.
- **Export**: `canvasToTempFilePath` is documented for `type="2d"` canvases only. Plan: offscreen WebGL → `readPixels` (flip Y) → 2D canvas `putImageData` → draw date stamp/border on the same 2D canvas → `canvasToTempFilePath({ fileType: 'jpg', quality: 0.92 })`. **[pending C-08]** spike in M2.
- **Color**: treat everything as sRGB; there is no gamut API. **[pending C-07]**
- **Storage**: user files + cache ≤ 200MB total; `setStorage` ≤ 1MB/key, 10MB total. **[pending C-14]**
- **Fonts**: `wx.loadFontFace` accepts https or Data URL only; Canvas 2D needs `scopes: ['native']`. Preferred: draw seven-segment digits with paths. **[pending C-12]**
- **Vibration**: `wx.vibrateShort` types are `heavy | medium | light` only. **[pending C-10]**

## 2. Pipeline order

Composite order (CLAUDE.md §4, unchanged): **vignette → 3D LUT → halation → grain → light leak → border/date stamp (2D)**.

Implementation detail from research: the halation **highlight mask is extracted from the pre-LUT image** (LUTs often compress highlights, which makes post-LUT thresholds unstable); the blurred halo is still composited after the LUT.

Random elements (light leak, darkroom per-shot variables, capture grain seed) are rolled **at capture time**. Preview shows the base look. **[pending C-23]**

## 3. Pass plans

**Preview (per camera frame, ~480×640):**
1. Upload frame → `uFrame`.
2. If halation enabled for the current tier: extract @1/4 → blur H → blur V (single radius).
3. One composite pass: vignette → LUT → halation (screen) → grain (seed locked for 333 ms) → dither.

**Capture (full resolution, same shaders, different uniforms):**
1. Decode photo → texture (respect `GLCaps`).
2. Halation: extract @1/4 → blur H/V (small radius) → downsample @1/8 → blur H/V (large radius); sum with weights.
3. Composite pass with a fresh grain seed and the rolled leak (texture, flip, offset, opacity) if `random() < leakProbability`.
4. `readPixels` → 2D canvas → date stamp + border → JPG → `USER_DATA_PATH` → `ShotStore`.

**Degrade rule [pending C-13]:** decide preview halation from render cost / dropped-frame ratio and the `wx.getDeviceBenchmarkInfo` tier, not from the camera's delivered fps.

## 4. LUT format and lookup

- Build time: `.cube` (33³, R fastest, then G, then B) → raw binary `33*33*33*3 = 107,811` bytes, same ordering, values `round(v*255)`.
- Runtime (`LutLoader`): unpack into a **198×198 RGBA texture of 6×6 tiles** (33 tiles used). Blue slice `s` goes to tile `(col = s % 6, row = floor(s / 6))`; inside a tile `x = r`, `y = g`. Upload with `UNPACK_FLIP_Y_WEBGL = false`. **[pending C-06]**

```glsl
// GLSL ES 1.0 — 33^3 LUT packed as 6x6 tiles (198x198).
const float LUT_N = 33.0;
const float LUT_TILES = 6.0;
const float LUT_TEX = 198.0; // LUT_N * LUT_TILES

vec2 lutTileOrigin(float s) {
  float row = floor((s + 0.5) / LUT_TILES); // +0.5 guards 30.0/6.0 -> 4.9999
  float col = s - row * LUT_TILES;
  return vec2(col, row) * LUT_N;
}

vec3 lut3d(sampler2D lut, vec3 c) {
  c = clamp(c, 0.0, 1.0);
  float b = c.b * (LUT_N - 1.0);
  float s0 = floor(b);
  float s1 = min(s0 + 1.0, LUT_N - 1.0);
  vec2 rg = c.rg * (LUT_N - 1.0) + 0.5; // texel centres, never crosses a tile edge
  vec3 a = texture2D(lut, (lutTileOrigin(s0) + rg) / LUT_TEX).rgb;
  vec3 d = texture2D(lut, (lutTileOrigin(s1) + rg) / LUT_TEX).rgb;
  return mix(a, d, b - s0);
}
```

Test against a TypeScript trilinear reference on a known `.cube` (identity cube must round-trip within 1/255).

## 5. Effect recipes

**Vignette** (aspect-corrected radial):
```glsl
vec2 p = (vUv - 0.5) * vec2(uAspect, 1.0);
float d = length(p) * 1.414 / max(uAspect, 1.0); // ~1.0 at the corners
float v = 1.0 - smoothstep(0.8 - uVignetteSoftness, 0.8, d);
col *= mix(1.0 - uVignetteStrength, 1.0, v);
```
Note: `smoothstep(e0, e1, x)` is undefined in GLSL when `e0 >= e1`; the reversed-edge form used in `shader-dev/techniques/camera-effects.md` must not be copied.

**Halation** (defaults from Film-Standalone, MIT):
```glsl
// extract @1/4 res, input = pre-LUT image
float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
float m = smoothstep(uThreshold - 0.1, uThreshold + 0.1, l); // uThreshold ~0.85
gl_FragColor = vec4(c * m * vec3(1.0, 0.35, 0.08), 1.0);      // red-biased
// blur: separable 9-tap, weights 0.2270, 0.1945, 0.1216, 0.0540, 0.0162,
//       step = uDir * uRadiusPx / uTexSize (radius scales with output size)
// composite (after LUT): col = 1.0 - (1.0 - col) * (1.0 - halo * uHalationStrength); // screen
```

**Grain** (no static noise texture; needs highp — fallback **[pending C-15]**):
```glsl
float hash12(vec2 p) { // Dave Hoskins, hash without sine
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}
float grainNoise(vec2 px, float cell, float seed) { // value noise, seed in [0, 100)
  vec2 q = px / cell + seed;
  vec2 i = floor(q);
  vec2 f = fract(q);
  f = f * f * (3.0 - 2.0 * f);
  float a = hash12(i);
  float b = hash12(i + vec2(1.0, 0.0));
  float c = hash12(i + vec2(0.0, 1.0));
  float d = hash12(i + vec2(1.0, 1.0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y) - 0.5;
}
// cell is relative to image height so preview (640px) and capture (3000px+) match
float cell = max(uGrainSize * uImageHeight / 1080.0, 1.0);
float n = grainNoise(gl_FragCoord.xy, cell, uSeed);
float lum = dot(col, vec3(0.2126, 0.7152, 0.0722));
float w = mix(1.0, sin(3.14159265 * lum), uGrainLumaWeight); // midtones heaviest
col += n * uGrainIntensity * w;
```

**Light leak**: CC0/procedural PNG, screen blend, radial edge mask `smoothstep(0.35, 0.95, length(vUv - 0.5) * 1.414)`; per-shot random choice, flip, offset, opacity.

**Darkroom series (H)**: per-shot random hue shift ±15°, fog lift, contrast fade — all drawn from ranges in the pack, applied in the composite pass.

## 6. CameraPack schema and merge

Pack JSON uses nested filter keys (as in the CLAUDE.md §5 example): `filter.grain.intensity`, `filter.lightLeak.probability`, etc. The flat names in §4 (`grainSize`, `leakProbability`) map onto these.

```ts
type SeriesId =
  | 'jp-color' | 'street-bw' | 'ccd' | 'instant'
  | 'medium-format' | 'cine-slide' | 'toy' | 'darkroom'; // proposal, finalise in M3

interface FilterParams {
  lut: { id: string; intensity: number };
  vignette: { strength: number; softness: number };
  halation: { strength: number; threshold: number; radius: number };
  grain: { size: number; intensity: number; lumaWeight: number; colored: boolean };
  lightLeak: { probability: number; opacityMin: number; opacityMax: number };
  frame: { aspectRatio: string; border: string };
  dateStamp: { enabled: boolean };
  darkroom?: { hueShiftDeg: number; fog: number; contrastFade: number };
}

interface CameraPack {
  id: string; name: string; tagline: string; series: SeriesId;
  inspiredBy: string;            // required: real camera + film/process
  free: boolean;
  tags?: string[];               // e.g. 'seasonal'
  collab?: string;
  filter?: DeepPartial<FilterParams>;
  ui?: DeepPartial<UiParams>;    // shutterStyle, themeColor, skin overrides
  assets?: { lut: string; sha256: string; bytes: number };
}
```

Merge rules (`CameraPack.ts`, unit-tested):
- `resolved = deepMerge(SeriesProfile[pack.series], pack)`; plain objects merge recursively, arrays and primitives **replace**.
- Series profiles are complete; after merge, validate that every `FilterParams` leaf is a finite number/string in range, else reject the pack (never render a half-specified camera).
- Adding a camera = one CDN asset bundle + one registry entry; no code change.

## 7. Monetisation guardrails (affects `Entitlement.ts`)

- Free tier (sunny-fun / moonlight / m3-hp5 + daily trial shots) is always real.
- Rewarded video: page-level singleton (create per page); grant 72h only when `onClose(res).isEnded`; error 1004 (no fill) needs a graceful fallback.
- **No share-to-unlock or invite rewards** (WeChat inducement rules). **[pending C-01]**
- Paid unlocks must use mini-program virtual payment on all platforms incl. iOS and need server-side signing. **[pending C-02, C-03]**

## 8. References

- Research notes: `docs/research/01`–`05`, `skills-notes.md`, `conflicts.md`
- Installed skills: `shader-dev` (techniques/post-processing, multipass-buffer, webgl-pitfalls), `wechat-miniprogram`, `vitest`
- Upstream code read in P0: artzox/Film-Standalone (halation), mattdesl/glsl-lut and three.js LUTPass (2D LUT), JanLohse/spectral_film_lut (LUT generation)
