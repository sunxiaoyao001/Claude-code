// Typed subset of the WebGL1 API that this project uses.
// miniprogram-api-typings types the context as `any`, and pulling in the DOM lib would also expose
// browser globals (window, document) that do not exist in the mini program runtime. Methods are added
// here only when the renderer starts using them, which also keeps WebGL2-only calls out by construction.

export type GLShader = { readonly __brand: 'WebGLShader' };
export type GLProgramHandle = { readonly __brand: 'WebGLProgram' };
export type GLBuffer = { readonly __brand: 'WebGLBuffer' };
export type GLTexture = { readonly __brand: 'WebGLTexture' };
export type GLUniformLocation = { readonly __brand: 'WebGLUniformLocation' };

export interface GLShaderPrecisionFormat {
  readonly rangeMin: number;
  readonly rangeMax: number;
  readonly precision: number;
}

export interface WebGL1 {
  readonly VERTEX_SHADER: number;
  readonly FRAGMENT_SHADER: number;
  readonly COMPILE_STATUS: number;
  readonly LINK_STATUS: number;
  readonly ARRAY_BUFFER: number;
  readonly STATIC_DRAW: number;
  readonly FLOAT: number;
  readonly TRIANGLE_STRIP: number;
  readonly TEXTURE_2D: number;
  readonly TEXTURE0: number;
  readonly TEXTURE_MIN_FILTER: number;
  readonly TEXTURE_MAG_FILTER: number;
  readonly TEXTURE_WRAP_S: number;
  readonly TEXTURE_WRAP_T: number;
  readonly LINEAR: number;
  readonly CLAMP_TO_EDGE: number;
  readonly RGBA: number;
  readonly UNSIGNED_BYTE: number;
  readonly COLOR_BUFFER_BIT: number;
  readonly UNPACK_FLIP_Y_WEBGL: number;
  readonly MAX_TEXTURE_SIZE: number;
  readonly MAX_RENDERBUFFER_SIZE: number;
  readonly MAX_VIEWPORT_DIMS: number;
  readonly HIGH_FLOAT: number;
  readonly RENDERER: number;
  readonly VENDOR: number;
  readonly VERSION: number;

  getParameter(pname: number): unknown;
  getShaderPrecisionFormat(shaderType: number, precisionType: number): GLShaderPrecisionFormat | null;
  getSupportedExtensions(): string[] | null;
  getExtension(name: string): unknown;
  isContextLost(): boolean;

  createShader(type: number): GLShader | null;
  shaderSource(shader: GLShader, source: string): void;
  compileShader(shader: GLShader): void;
  getShaderParameter(shader: GLShader, pname: number): unknown;
  getShaderInfoLog(shader: GLShader): string | null;
  deleteShader(shader: GLShader | null): void;

  createProgram(): GLProgramHandle | null;
  attachShader(program: GLProgramHandle, shader: GLShader): void;
  linkProgram(program: GLProgramHandle): void;
  getProgramParameter(program: GLProgramHandle, pname: number): unknown;
  getProgramInfoLog(program: GLProgramHandle): string | null;
  deleteProgram(program: GLProgramHandle | null): void;
  useProgram(program: GLProgramHandle | null): void;
  getAttribLocation(program: GLProgramHandle, name: string): number;
  getUniformLocation(program: GLProgramHandle, name: string): GLUniformLocation | null;

  uniform1i(location: GLUniformLocation | null, x: number): void;
  uniform1f(location: GLUniformLocation | null, x: number): void;
  uniformMatrix2fv(location: GLUniformLocation | null, transpose: boolean, value: Float32Array): void;

  createBuffer(): GLBuffer | null;
  bindBuffer(target: number, buffer: GLBuffer | null): void;
  bufferData(target: number, data: Float32Array, usage: number): void;
  deleteBuffer(buffer: GLBuffer | null): void;
  enableVertexAttribArray(index: number): void;
  vertexAttribPointer(index: number, size: number, type: number, normalized: boolean, stride: number, offset: number): void;

  createTexture(): GLTexture | null;
  bindTexture(target: number, texture: GLTexture | null): void;
  activeTexture(texture: number): void;
  texParameteri(target: number, pname: number, param: number): void;
  pixelStorei(pname: number, param: number | boolean): void;
  texImage2D(
    target: number, level: number, internalformat: number, width: number, height: number,
    border: number, format: number, type: number, pixels: ArrayBufferView | null,
  ): void;
  texSubImage2D(
    target: number, level: number, xoffset: number, yoffset: number, width: number, height: number,
    format: number, type: number, pixels: ArrayBufferView,
  ): void;
  deleteTexture(texture: GLTexture | null): void;

  viewport(x: number, y: number, width: number, height: number): void;
  clearColor(r: number, g: number, b: number, a: number): void;
  clear(mask: number): void;
  drawArrays(mode: number, first: number, count: number): void;
  readPixels(x: number, y: number, width: number, height: number, format: number, type: number, pixels: ArrayBufferView): void;
}
