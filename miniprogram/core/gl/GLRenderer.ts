// WebGL1 context wrapper (CLAUDE.md §3): program compilation, textures, render targets and the
// fullscreen quad. It owns no look logic; core/gl/Pipeline.ts drives the passes. One instance per
// canvas: GL objects cannot be shared between the on-screen viewfinder and the offscreen capture canvas.
import { probeCaps, type GLCaps } from './GLCaps';
import type { GLBuffer, GLFramebuffer, GLImageSource, GLProgramHandle, GLShader, GLTexture, GLUniformLocation, WebGL1 } from './webgl1';

/** A canvas node from SelectorQuery or wx.createOffscreenCanvas({ type: 'webgl' }). */
export interface WebGLCanvasNode {
  width: number;
  height: number;
  getContext(type: 'webgl'): unknown;
  createImage(): LoadableImage;
}

export interface LoadableImage extends GLImageSource {
  src: string;
  onload: (() => void) | null;
  onerror: ((error: unknown) => void) | null;
}

export interface CompiledProgram {
  handle: GLProgramHandle;
  aPos: number;
  uniforms: Map<string, GLUniformLocation | null>;
}

export interface RenderTarget {
  framebuffer: GLFramebuffer;
  texture: GLTexture;
  width: number;
  height: number;
}

export interface Viewport {
  x: number;
  y: number;
  width: number;
  height: number;
}

// Two triangles as a strip covering clip space.
const QUAD = new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]);

export class GLRenderer {
  readonly caps: GLCaps;
  private readonly quad: GLBuffer;
  private readonly programs = new Map<string, CompiledProgram>();
  private readonly textureSizes = new Map<GLTexture, string>();

  /** Returns null when WebGL is unavailable. */
  static create(canvas: WebGLCanvasNode, width: number, height: number): GLRenderer | null {
    canvas.width = width;
    canvas.height = height;
    const gl = canvas.getContext('webgl') as WebGL1 | null;
    if (!gl) return null;
    try {
      return new GLRenderer(gl, canvas);
    } catch {
      return null;
    }
  }

  private constructor(
    readonly gl: WebGL1,
    private readonly canvas: WebGLCanvasNode,
  ) {
    this.caps = probeCaps(gl);
    this.quad = this.must(gl.createBuffer(), 'buffer');
    gl.bindBuffer(gl.ARRAY_BUFFER, this.quad);
    gl.bufferData(gl.ARRAY_BUFFER, QUAD, gl.STATIC_DRAW);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
  }

  get width(): number {
    return this.canvas.width;
  }

  get height(): number {
    return this.canvas.height;
  }

  get isContextLost(): boolean {
    return this.gl.isContextLost();
  }

  /** Resizes the drawing buffer (offscreen capture canvas reused across shots). */
  resize(width: number, height: number): void {
    if (this.canvas.width !== width) this.canvas.width = width;
    if (this.canvas.height !== height) this.canvas.height = height;
  }

  /** Compiles once per key; later calls return the cached program. */
  program(key: string, vertSource: string, fragSource: string, uniformNames: string[]): CompiledProgram {
    const cached = this.programs.get(key);
    if (cached) return cached;
    const { gl } = this;
    const vert = this.compileShader(gl.VERTEX_SHADER, vertSource);
    const frag = this.compileShader(gl.FRAGMENT_SHADER, fragSource);
    const handle = this.must(gl.createProgram(), 'program');
    gl.attachShader(handle, vert);
    gl.attachShader(handle, frag);
    gl.linkProgram(handle);
    gl.deleteShader(vert);
    gl.deleteShader(frag);
    if (!gl.getProgramParameter(handle, gl.LINK_STATUS)) {
      const log = gl.getProgramInfoLog(handle) ?? '';
      gl.deleteProgram(handle);
      throw new Error(`program "${key}" link failed: ${log}`);
    }
    const uniforms = new Map<string, GLUniformLocation | null>();
    for (const name of uniformNames) uniforms.set(name, gl.getUniformLocation(handle, name));
    const compiled = { handle, aPos: gl.getAttribLocation(handle, 'aPos'), uniforms };
    this.programs.set(key, compiled);
    return compiled;
  }

  createTexture(): GLTexture {
    const { gl } = this;
    const texture = this.must(gl.createTexture(), 'texture');
    gl.bindTexture(gl.TEXTURE_2D, texture);
    // NPOT everywhere (frames, LUT tiles, render targets): WebGL1 requires CLAMP_TO_EDGE, no mipmaps.
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return texture;
  }

  /** Copies RGBA pixels into `texture`; reallocates only when the size changes. */
  uploadRGBA(texture: GLTexture, width: number, height: number, data: ArrayBuffer): void {
    const { gl } = this;
    const pixels = new Uint8Array(data);
    const size = `${width}x${height}`;
    gl.bindTexture(gl.TEXTURE_2D, texture);
    if (this.textureSizes.get(texture) !== size) {
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
      this.textureSizes.set(texture, size);
    } else {
      gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
    }
  }

  uploadImage(texture: GLTexture, image: GLImageSource): void {
    const { gl } = this;
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
    this.textureSizes.set(texture, `${image.width}x${image.height}`);
  }

  /** Decodes an image (package path or local file) with this canvas's own createImage(). */
  loadImage(src: string): Promise<LoadableImage> {
    return new Promise((resolve, reject) => {
      const image = this.canvas.createImage();
      image.onload = () => resolve(image);
      image.onerror = (error) => reject(new Error(`image load failed: ${src} ${String(error)}`));
      image.src = src;
    });
  }

  createTarget(width: number, height: number): RenderTarget {
    const { gl } = this;
    const texture = this.createTexture();
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    const framebuffer = this.must(gl.createFramebuffer(), 'framebuffer');
    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
    const status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    if (status !== gl.FRAMEBUFFER_COMPLETE) {
      gl.deleteFramebuffer(framebuffer);
      gl.deleteTexture(texture);
      throw new Error(`render target ${width}x${height} incomplete (0x${status.toString(16)})`);
    }
    return { framebuffer, texture, width, height };
  }

  deleteTarget(target: RenderTarget | null): void {
    if (!target) return;
    this.gl.deleteFramebuffer(target.framebuffer);
    this.gl.deleteTexture(target.texture);
  }

  /** Renders into `target`, or into the canvas within `viewport` when target is null. */
  bindTarget(target: RenderTarget | null, viewport?: Viewport): void {
    const { gl } = this;
    gl.bindFramebuffer(gl.FRAMEBUFFER, target ? target.framebuffer : null);
    const view = target
      ? { x: 0, y: 0, width: target.width, height: target.height }
      : viewport ?? { x: 0, y: 0, width: this.canvas.width, height: this.canvas.height };
    gl.viewport(view.x, view.y, view.width, view.height);
  }

  clear(r: number, g: number, b: number): void {
    const { gl } = this;
    gl.clearColor(r, g, b, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
  }

  /** Binds `textures` to units 0..n under the given sampler names, sets uniforms, draws the quad. */
  draw(program: CompiledProgram, textures: Array<[string, GLTexture]>, setUniforms: (uniform: (name: string) => GLUniformLocation | null) => void): void {
    const { gl } = this;
    gl.useProgram(program.handle);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.quad);
    gl.enableVertexAttribArray(program.aPos);
    gl.vertexAttribPointer(program.aPos, 2, gl.FLOAT, false, 0, 0);
    const uniform = (name: string) => program.uniforms.get(name) ?? null;
    textures.forEach(([name, texture], unit) => {
      gl.activeTexture(gl.TEXTURE0 + unit);
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.uniform1i(uniform(name), unit);
    });
    setUniforms(uniform);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  /** Reads back an RGBA region of the current framebuffer (origin bottom-left, per GL). */
  readPixels(x: number, y: number, width: number, height: number, out: Uint8Array): void {
    const { gl } = this;
    gl.readPixels(x, y, width, height, gl.RGBA, gl.UNSIGNED_BYTE, out);
  }

  /** Blocks until the GPU has finished, so timings include GPU work. Dev panel only. */
  syncGpu(): void {
    this.readPixels(0, 0, 1, 1, new Uint8Array(4));
  }

  deleteTexture(texture: GLTexture | null): void {
    if (texture) this.textureSizes.delete(texture);
    this.gl.deleteTexture(texture);
  }

  destroy(): void {
    const { gl } = this;
    for (const program of this.programs.values()) gl.deleteProgram(program.handle);
    this.programs.clear();
    gl.deleteBuffer(this.quad);
  }

  private compileShader(type: number, source: string): GLShader {
    const { gl } = this;
    const shader = this.must(gl.createShader(type), 'shader');
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      const log = gl.getShaderInfoLog(shader) ?? '';
      gl.deleteShader(shader);
      throw new Error(`shader compile failed: ${log}`);
    }
    return shader;
  }

  private must<T>(value: T | null, what: string): T {
    if (value === null) throw new Error(`WebGL could not create ${what}`);
    return value;
  }
}
