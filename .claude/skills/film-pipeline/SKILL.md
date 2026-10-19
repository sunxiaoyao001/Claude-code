---
name: film-pipeline
description: Project knowledge for the WeChat mini-program film camera — render pipeline order, WebGL1/GLSL ES 1.0 rules, LUT packing and lookup, halation/grain/leak/vignette recipes, preview vs capture pass plans, CameraPack schema and series-delta merge rules, and platform limits found in P0 research. Use when writing or reviewing anything under miniprogram/core/gl, core/pack, core/camera, core/stamp, pack-tools, or shader files.
---

# Film Pipeline (project skill)

Source of truth for the product spec is `CLAUDE.md`. This skill condenses the rendering/pack parts plus the P0 research findings in `docs/research/`. Tags like "(decided: C-xx)" point to the approved item in `docs/research/conflicts.md` (all approved 2026-10-19 and written back into CLAUDE.md v6).

## 1. Hard platform constraints (verified in P0)

- **WebGL1 / GLSL ES 1.0 only.** No `#version 300 es`, `texture()`, `textureLod`, `texelFetch`, bitwise ops, `out` variables. Loop bounds must be constant expressions. Back-port anything taken from the `shader-dev` skill (it is written for WebGL2).
- **Fragment `highp` is optional.** Probe once: `gl.getShaderPrecisionFormat(gl.FRAGMENT_SHADER, gl.HIGH_FLOAT).precision > 0`. Never use `fract(sin(x) * 43758.5453)` hashes.
- **No float render targets assumed.** All FBOs are RGBA8. Add ±0.5/255 dither in the final pass to hide banding from low-res halation buffers.
- **NPOT textures**: `CLAMP_TO_EDGE`, `LINEAR`, no mipmaps (camera frames ≈480×640, LUT 198×198).
- **Query limits at startup** (`MAX_TEXTURE_SIZE`, `MAX_RENDERBUFFER_SIZE`, `MAX_VIEWPORT_DIMS`) into a `GLCaps` object; capture size never exceeds them (tile if it must).
- **Camera frames**: `onCameraFrame` gives RGBA `ArrayBuffer`, size decided by the system (medium is commonly 480×640, not 720p). Allocate with `texImage2D` once, then `texSubImage2D`; never keep the buffer after the callback.
- **takePhoto**: output size is device-dependent; Android returns JPG, iOS returns PNG. Request `quality: 'original'`, read real size via `wx.getImageInfo`, fall back to `'high'`. Output long edge = min(measured takePhoto long edge, tier cap 2048/3072/4096, GL limits) (decided: C-04).
- **Export**: `canvasToTempFilePath` is documented for `type="2d"` canvases only. Plan: offscreen WebGL → `readPixels` (flip Y) → 2D canvas `putImageData` → draw date stamp/border on the same 2D canvas → `canvasToTempFilePath({ fileType: 'jpg', quality: 0.92 })`; first task of M2 is a real-device spike of this chain (decided: C-08).
- **Color**: treat everything as sRGB; there is no gamut API. (decided: C-07)
- **Storage**: user files + cache ≤ 200MB total; `setStorage` ≤ 1MB/key, 10MB total. (decided: C-14)
- **Fonts**: `wx.loadFontFace` accepts https or Data URL only; Canvas 2D needs `scopes: ['native']`. Preferred: draw seven-segment digits with paths. (decided: C-12)
- **Vibration**: `wx.vibrateShort` types are `heavy | medium | light` only. (decided: C-10)

## 2. Pipeline order

Composite order (CLAUDE.md §4, unchanged): **vignette → 3D LUT → halation → grain → light leak → border/date stamp (2D)**.

Implementation detail from research: the halation **highlight mask is extracted from the pre-LUT image** (LUTs often compress highlights, which makes post-LUT thresholds unstable); the blurred halo is still composited after the LUT.

Random elements (light leak, darkroom per-shot variables, capture grain seed) are rolled **at capture time**. Preview shows the base look. (decided: C-23)

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

**Degrade rule (decided: C-13):** decide preview halation from render cost / dropped-frame ratio and the `wx.getDeviceBenchmarkInfo` tier, not from the camera's delivered fps.

## 4. LUT format and lookup

- Build time (`pack-tools/`, run with `node --experimental-strip-types`): `.cube` (33³, R fastest, then G, then B) → `lib/lutTiles.mts` packs it into a **198×198 RGB PNG of 6×6 tiles** (33 used) → `lib/png.mts` encodes with Node's zlib (no colour chunks). `cube2png.mts` converts real LUTs; `gen-placeholder-luts.mts` generates the placeholder looks from `lib/looks.mts`.
- Why PNG, not a raw `.bin`: PNG is certainly on the code-package upload whitelist (unlisted files work in DevTools but are silently dropped on upload), the platform decodes it natively, and deflate makes it 8–15 KB instead of 107 KB.
- Runtime: `GLRenderer.loadImage('/assets/luts/<id>.png')` (the canvas's own `createImage()`) → `uploadImage()`. `UNPACK_FLIP_Y_WEBGL = false`, so PNG row 0 is v = 0. Blue slice `s` sits at tile `(col = s % 6, row = floor(s / 6))`; inside a tile `x = r`, `y = g`. (decided: C-06)
- The dev panel's 导出自检 runs an identity LUT through the composite on the device and reports the max error, which also proves the platform decodes PNGs without colour management.

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

Covered by `tests/lutLookup.test.ts` (CPU port of this function vs the generating look, < 3/255) and `scripts/gl-check.mjs` (same on a real WebGL1 GPU, < 4/255).

## 5. Effect recipes

**Vignette** (aspect-corrected radial):
```glsl
vec2 p = (vUv - 0.5) * vec2(uAspect, 1.0);
float d = length(p) * 1.414 / max(uAspect, 1.0); // ~1.0 at the corners
float v = 1.0 - smoothstep(0.8 - uVignetteSoftness, 0.8, d);
col *= mix(1.0 - uVignetteStrength, 1.0, v);
```
Note: `smoothstep(e0, e1, x)` is undefined in GLSL when `e0 >= e1`; the reversed-edge form used in `shader-dev/techniques/camera-effects.md` must not be copied.

**Halation** (`extractFrag.ts` + `blurFrag.ts`, defaults after Film-Standalone, MIT):
- Extract from the PRE-LUT source at 1/4 (and for capture also 1/8) resolution, 4 taps one source texel apart, mask `smoothstep(t-0.1, t+0.1, luma)` (t ≈ 0.85), tint `(1.0, 0.35, 0.08)`.
- Blur H then V with the 9-tap kernel folded into 5 bilinear taps; `uStep = dir * (R / 4) / targetSize` where R = 8 px (small) or 24 px (wide) × `halation.radius` × frameHeight/1080, expressed in target pixels.
- Composite: `halo = (small * w0 + wide * w1) * strength`, screen blend. Capture weights 0.6/0.4; preview uses the small chain only (1.0/0.0) and only while the governor allows it.
- Reference numbers (gl-check, 1080px frame, 30px highlight, strength 1): rgb(32,11,2) 4 px outside, rgb(6,2,1) at 12 px. Looks that need a CineStill-style ring raise `strength` and `radius`.

**Grain** (sin-free hash value noise; needs highp, see `compositeFrag.ts`): position is `frame` (0..1 inside the output frame, y down) scaled by `aspect × 1080 / grain.size`, plus `seed × (13.1, 7.7)`. Being frame-relative, the viewfinder (≈640 px) and the capture (3000 px+) show the same grain structure. Weight `mix(1, sin(π·luma), lumaWeight)`. gl-check compares GPU mean/std with the TypeScript reference (Δmean < 0.75/255, std ±15%). Without highp the shader falls back to mediump and grain gets coarser (decided: C-15; a noise-texture fallback is not built yet).

**Light leak** (procedural, no texture asset): `rollShot()` picks a side, a centre just outside the frame, radius 0.35–0.7 of the frame height, opacity within the look's range and a colour from amber / red-orange / violet. Shader: `exp(-2r²)` blob × edge weight, screen blend. Leaks only appear in captures.

**Dither**: ±0.5/255 hash noise last, hides banding from the 8-bit halo buffers.

**Darkroom series (H)**: per-shot random hue shift ±15°, fog lift, contrast fade — all drawn from ranges in the pack (M4).

## 6. CameraPack schema and merge

Pack JSON uses nested filter keys (as in the CLAUDE.md §5 example): `filter.grain.intensity`, `filter.lightLeak.probability`, etc. The flat names in §4 (`grainSize`, `leakProbability`) map onto these.

```ts
type SeriesId =
  | 'jp-color' | 'street-bw' | 'ccd' | 'instant'
  | 'medium-format' | 'cine-slide' | 'toy' | 'darkroom'; // proposal, finalise in M3

// FilterParams: source of truth is miniprogram/core/pack/FilterParams.ts (with validateFilterParams()
// ranges and the SUNNY_FUN reference look).

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
- **No share-to-unlock or invite rewards** (WeChat inducement rules). (decided: C-01)
- Paid unlocks must use mini-program virtual payment on all platforms incl. iOS and need server-side signing. (decided: C-02, C-03)

## 8. References

- Research notes: `docs/research/01`–`05`, `skills-notes.md`, `conflicts.md`
- Installed skills: `shader-dev` (techniques/post-processing, multipass-buffer, webgl-pitfalls), `wechat-miniprogram`, `vitest`
- Upstream code read in P0: artzox/Film-Standalone (halation), mattdesl/glsl-lut and three.js LUTPass (2D LUT), JanLohse/spectral_film_lut (LUT generation)
