// WebGL1 renderer for the viewfinder canvas: program compilation, the camera-frame texture and the
// fullscreen draw. M1 draws the raw frame; the film pipeline (M2) plugs in more programs and passes.
import { probeCaps, type GLCaps } from './GLCaps';
import { FULLSCREEN_VERT } from './shaders/fullscreenVert';
import { RAW_FRAG } from './shaders/rawFrag';
import type { GLBuffer, GLProgramHandle, GLShader, GLTexture, GLUniformLocation, WebGL1 } from './webgl1';

/** The canvas node returned by SelectorQuery `fields({ node: true })` for `<canvas type="webgl">`. */
export interface WebGLCanvasNode {
  width: number;
  height: number;
  getContext(type: 'webgl'): unknown;
}

export interface DrawOptions {
  uvMatrix: Float32Array;
  grayscale: boolean;
}

interface CompiledProgram {
  handle: GLProgramHandle;
  aPos: number;
  uniforms: Map<string, GLUniformLocation | null>;
}

// Two triangles as a strip covering clip space.
const QUAD = new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]);

export class GLRenderer {
  readonly caps: GLCaps;
  private readonly quad: GLBuffer;
  private readonly frameTexture: GLTexture;
  private readonly raw: CompiledProgram;
  private frameWidth = 0;
  private frameHeight = 0;

  /** Returns null when WebGL is unavailable; the native camera preview then stays visible. */
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
    private readonly gl: WebGL1,
    private readonly canvas: WebGLCanvasNode,
  ) {
    this.caps = probeCaps(gl);
    this.quad = this.must(gl.createBuffer(), 'buffer');
    gl.bindBuffer(gl.ARRAY_BUFFER, this.quad);
    gl.bufferData(gl.ARRAY_BUFFER, QUAD, gl.STATIC_DRAW);
    this.frameTexture = this.createTexture();
    this.raw = this.compile(FULLSCREEN_VERT, RAW_FRAG, ['uFrame', 'uUvMatrix', 'uGrayscale']);
  }

  get isContextLost(): boolean {
    return this.gl.isContextLost();
  }

  /** Copies an RGBA frame into the frame texture; reallocates only when the size changes. */
  uploadFrame(width: number, height: number, data: ArrayBuffer): void {
    const { gl } = this;
    const pixels = new Uint8Array(data);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.frameTexture);
    if (width !== this.frameWidth || height !== this.frameHeight) {
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
      this.frameWidth = width;
      this.frameHeight = height;
    } else {
      gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
    }
  }

  drawFrame(options: DrawOptions): void {
    const { gl, raw } = this;
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    gl.useProgram(raw.handle);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.quad);
    gl.enableVertexAttribArray(raw.aPos);
    gl.vertexAttribPointer(raw.aPos, 2, gl.FLOAT, false, 0, 0);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.frameTexture);
    gl.uniform1i(raw.uniforms.get('uFrame') ?? null, 0);
    gl.uniformMatrix2fv(raw.uniforms.get('uUvMatrix') ?? null, false, options.uvMatrix);
    gl.uniform1f(raw.uniforms.get('uGrayscale') ?? null, options.grayscale ? 1 : 0);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  /** Blocks until the GPU has finished, so timings include GPU work. Dev panel only: it stalls the pipeline. */
  syncGpu(): void {
    const { gl } = this;
    gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(4));
  }

  destroy(): void {
    const { gl } = this;
    gl.deleteTexture(this.frameTexture);
    gl.deleteBuffer(this.quad);
    gl.deleteProgram(this.raw.handle);
  }

  private createTexture(): GLTexture {
    const { gl } = this;
    const texture = this.must(gl.createTexture(), 'texture');
    gl.bindTexture(gl.TEXTURE_2D, texture);
    // Camera frames are NPOT: WebGL1 requires CLAMP_TO_EDGE and no mipmaps.
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    return texture;
  }

  private compile(vertSource: string, fragSource: string, uniformNames: string[]): CompiledProgram {
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
      throw new Error(`program link failed: ${log}`);
    }
    const uniforms = new Map<string, GLUniformLocation | null>();
    for (const name of uniformNames) uniforms.set(name, gl.getUniformLocation(handle, name));
    return { handle, aPos: gl.getAttribLocation(handle, 'aPos'), uniforms };
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
