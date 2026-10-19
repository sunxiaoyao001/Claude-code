// Film pipeline orchestration (CLAUDE.md §4). One instance per GLRenderer.
//   Preview: [extract @1/4 -> blur H -> blur V] (when halation is on) -> composite into the frame rect.
//   Capture: extract @1/4 -> blur H/V (small radius) + extract @1/8 -> blur H/V (wide radius) -> composite.
// Grain seed, leak and dither come from ShotRandom; preview keeps leaks off (rolled at capture only).
import type { FilterParams } from '../pack/FilterParams';
import { parseAspect } from '../pack/FilterParams';
import type { GLRenderer, RenderTarget, Viewport } from './GLRenderer';
import { BLUR_FRAG } from './shaders/blurFrag';
import { COMPOSITE_FRAG } from './shaders/compositeFrag';
import { EXTRACT_FRAG } from './shaders/extractFrag';
import { FULLSCREEN_VERT } from './shaders/fullscreenVert';
import { RAW_FRAG } from './shaders/rawFrag';
import type { ShotRandom } from './shotRandom';
import type { GLTexture } from './webgl1';

// Halation blur radii in pixels at a 1080px frame height (scaled by FilterParams.halation.radius).
const HALO_RADIUS_PX = 8;
const HALO_WIDE_RADIUS_PX = 24;
const REFERENCE_HEIGHT = 1080;
// --bg-0 (#0D0D0F) for the letterbox around the frame rect.
const BACKGROUND: [number, number, number] = [13 / 255, 13 / 255, 15 / 255];

const COMPOSITE_UNIFORMS = [
  'uFrame', 'uLut', 'uHalo', 'uHaloWide', 'uUvMatrix', 'uLutIntensity', 'uOutAspect', 'uVignette',
  'uHalation', 'uGrain', 'uLeak', 'uLeakColor', 'uDitherSeed',
];

export interface SourceImage {
  texture: GLTexture;
  width: number;
  height: number;
}

export interface PreviewOptions {
  /** Frame rect inside the canvas, in canvas pixels (GL origin bottom-left). */
  frameRect: Viewport;
  uvMatrix: Float32Array;
  halation: boolean;
  grainSeed: number;
  /** Dev switch: show the unprocessed frame instead of the look. */
  raw: boolean;
  grayscale: boolean;
}

interface HaloChain {
  a: RenderTarget;
  b: RenderTarget;
}

export class Pipeline {
  private params: FilterParams | null = null;
  private lut: GLTexture | null = null;
  private previewHalo: HaloChain | null = null;
  private black: GLTexture;

  constructor(private readonly renderer: GLRenderer) {
    // 1x1 black stands in for halo textures when halation is off.
    this.black = renderer.createTexture();
    renderer.uploadRGBA(this.black, 1, 1, new Uint8Array([0, 0, 0, 255]).buffer);
  }

  get ready(): boolean {
    return this.params !== null && this.lut !== null;
  }

  setLook(params: FilterParams, lut: GLTexture): void {
    this.params = params;
    this.lut = lut;
  }

  renderPreview(source: SourceImage, options: PreviewOptions): void {
    const { renderer } = this;
    const { frameRect } = options;
    renderer.bindTarget(null);
    renderer.clear(...BACKGROUND);

    if (options.raw || !this.params || !this.lut) {
      renderer.bindTarget(null, frameRect);
      const raw = renderer.program('raw', FULLSCREEN_VERT, RAW_FRAG, ['uFrame', 'uUvMatrix', 'uGrayscale']);
      renderer.draw(raw, [['uFrame', source.texture]], (u) => {
        renderer.gl.uniformMatrix2fv(u('uUvMatrix'), false, options.uvMatrix);
        renderer.gl.uniform1f(u('uGrayscale'), options.grayscale ? 1 : 0);
      });
      return;
    }

    let halo = this.black;
    if (options.halation && this.params.halation.strength > 0) {
      const chain = this.ensurePreviewHalo(frameRect.width, frameRect.height);
      this.renderHalo(source, options.uvMatrix, chain, this.haloRadius(HALO_RADIUS_PX, frameRect.height) / 4);
      halo = chain.a.texture;
    }

    renderer.bindTarget(null, frameRect);
    this.composite(source, options.uvMatrix, frameRect.width / frameRect.height, halo, this.black, [1, 0],
      { seed: 0, grainSeed: options.grainSeed, ditherSeed: options.grainSeed, leak: null });
  }

  /** Renders the full look into the renderer's canvas, sized outWidth x outHeight. */
  renderCapture(source: SourceImage, uvMatrix: Float32Array, outWidth: number, outHeight: number, shot: ShotRandom): void {
    const { renderer, params } = this;
    if (!params || !this.lut) throw new Error('pipeline has no look');
    renderer.resize(outWidth, outHeight);

    const quarter = this.createChain(Math.ceil(outWidth / 4), Math.ceil(outHeight / 4));
    const eighth = this.createChain(Math.ceil(outWidth / 8), Math.ceil(outHeight / 8));
    try {
      this.renderHalo(source, uvMatrix, quarter, this.haloRadius(HALO_RADIUS_PX, outHeight) / 4);
      this.renderHalo(source, uvMatrix, eighth, this.haloRadius(HALO_WIDE_RADIUS_PX, outHeight) / 8);
      renderer.bindTarget(null, { x: 0, y: 0, width: outWidth, height: outHeight });
      this.composite(source, uvMatrix, outWidth / outHeight, quarter.a.texture, eighth.a.texture, [0.6, 0.4], shot);
    } finally {
      this.deleteChain(quarter);
      this.deleteChain(eighth);
    }
  }

  destroy(): void {
    this.deleteChain(this.previewHalo);
    this.previewHalo = null;
    this.renderer.deleteTexture(this.black);
  }

  private haloRadius(basePx: number, frameHeight: number): number {
    return basePx * (this.params?.halation.radius ?? 1) * (frameHeight / REFERENCE_HEIGHT);
  }

  private renderHalo(source: SourceImage, uvMatrix: Float32Array, chain: HaloChain, radiusInTarget: number): void {
    const { renderer, params } = this;
    if (!params) return;
    const extract = renderer.program('extract', FULLSCREEN_VERT, EXTRACT_FRAG, ['uSource', 'uSourceTexel', 'uThreshold', 'uUvMatrix']);
    const blur = renderer.program('blur', FULLSCREEN_VERT, BLUR_FRAG, ['uInput', 'uStep', 'uUvMatrix']);
    const { gl } = renderer;

    renderer.bindTarget(chain.a);
    renderer.draw(extract, [['uSource', source.texture]], (u) => {
      gl.uniformMatrix2fv(u('uUvMatrix'), false, uvMatrix);
      gl.uniform2f(u('uSourceTexel'), 1 / source.width, 1 / source.height);
      gl.uniform1f(u('uThreshold'), params.halation.threshold);
    });

    const scale = Math.max(radiusInTarget, 1) / 4;
    renderer.bindTarget(chain.b);
    renderer.draw(blur, [['uInput', chain.a.texture]], (u) => gl.uniform2f(u('uStep'), scale / chain.a.width, 0));
    renderer.bindTarget(chain.a);
    renderer.draw(blur, [['uInput', chain.b.texture]], (u) => gl.uniform2f(u('uStep'), 0, scale / chain.b.height));
  }

  private composite(
    source: SourceImage, uvMatrix: Float32Array, outAspect: number,
    halo: GLTexture, haloWide: GLTexture, haloWeights: [number, number], shot: ShotRandom,
  ): void {
    const { renderer, params, lut } = this;
    if (!params || !lut) return;
    const { gl } = renderer;
    const program = renderer.program('composite', FULLSCREEN_VERT, COMPOSITE_FRAG, COMPOSITE_UNIFORMS);
    const leak = shot.leak;
    renderer.draw(program, [['uFrame', source.texture], ['uLut', lut], ['uHalo', halo], ['uHaloWide', haloWide]], (u) => {
      gl.uniformMatrix2fv(u('uUvMatrix'), false, uvMatrix);
      gl.uniform1f(u('uLutIntensity'), params.lut.intensity);
      gl.uniform1f(u('uOutAspect'), outAspect);
      gl.uniform2f(u('uVignette'), params.vignette.strength, params.vignette.softness);
      gl.uniform3f(u('uHalation'), params.halation.strength, haloWeights[0], haloWeights[1]);
      gl.uniform4f(u('uGrain'), params.grain.size, params.grain.intensity, params.grain.lumaWeight, shot.grainSeed);
      gl.uniform4f(u('uLeak'), leak?.x ?? 0, leak?.y ?? 0, leak?.radius ?? 1, leak?.opacity ?? 0);
      gl.uniform3f(u('uLeakColor'), ...(leak?.color ?? [0, 0, 0]));
      gl.uniform1f(u('uDitherSeed'), shot.ditherSeed);
    });
  }

  private ensurePreviewHalo(frameWidth: number, frameHeight: number): HaloChain {
    const width = Math.ceil(frameWidth / 4);
    const height = Math.ceil(frameHeight / 4);
    const current = this.previewHalo;
    if (current && current.a.width === width && current.a.height === height) return current;
    this.deleteChain(current);
    this.previewHalo = this.createChain(width, height);
    return this.previewHalo;
  }

  private createChain(width: number, height: number): HaloChain {
    return { a: this.renderer.createTarget(width, height), b: this.renderer.createTarget(width, height) };
  }

  private deleteChain(chain: HaloChain | null): void {
    if (!chain) return;
    this.renderer.deleteTarget(chain.a);
    this.renderer.deleteTarget(chain.b);
  }
}

/** Output frame size for a source image cropped (cover) to the look's aspect ratio. */
export function captureSize(sourceWidth: number, sourceHeight: number, aspect: string): { width: number; height: number } {
  const ratio = parseAspect(aspect);
  const sourceRatio = sourceWidth / sourceHeight;
  if (sourceRatio > ratio) return { width: Math.round(sourceHeight * ratio), height: sourceHeight };
  return { width: sourceWidth, height: Math.round(sourceWidth / ratio) };
}
