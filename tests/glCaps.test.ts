import { describe, expect, it } from 'vitest';
import { probeCaps } from '../miniprogram/core/gl/GLCaps';
import type { WebGL1 } from '../miniprogram/core/gl/webgl1';

// Only the members probeCaps touches; numeric enums use the real WebGL values.
function fakeGl(options: { highpPrecision: number; extensions: string[] }): WebGL1 {
  const params: Record<number, unknown> = {
    0x0d33: 4096, // MAX_TEXTURE_SIZE
    0x84e8: 8192, // MAX_RENDERBUFFER_SIZE
    0x0d3a: new Int32Array([8192, 8192]), // MAX_VIEWPORT_DIMS
    0x1f00: 'WebKit', // VENDOR
    0x1f01: 'WebKit WebGL', // RENDERER
    0x1f02: 'WebGL 1.0', // VERSION
    0x9245: 'Qualcomm', // UNMASKED_VENDOR_WEBGL
    0x9246: 'Adreno (TM) 650', // UNMASKED_RENDERER_WEBGL
  };
  const gl = {
    MAX_TEXTURE_SIZE: 0x0d33,
    MAX_RENDERBUFFER_SIZE: 0x84e8,
    MAX_VIEWPORT_DIMS: 0x0d3a,
    VENDOR: 0x1f00,
    RENDERER: 0x1f01,
    VERSION: 0x1f02,
    FRAGMENT_SHADER: 0x8b30,
    HIGH_FLOAT: 0x8df2,
    getParameter: (name: number) => params[name] ?? null,
    getShaderPrecisionFormat: () => ({ rangeMin: 127, rangeMax: 127, precision: options.highpPrecision }),
    getSupportedExtensions: () => options.extensions,
    getExtension: (name: string) => (options.extensions.includes(name) ? {} : null),
  };
  return gl as unknown as WebGL1;
}

describe('probeCaps', () => {
  it('reads limits and prefers the unmasked GPU name when available', () => {
    const caps = probeCaps(fakeGl({ highpPrecision: 23, extensions: ['WEBGL_debug_renderer_info', 'OES_standard_derivatives'] }));
    expect(caps).toMatchObject({
      maxTextureSize: 4096,
      maxRenderbufferSize: 8192,
      maxViewport: [8192, 8192],
      fragmentHighp: true,
      vendor: 'Qualcomm',
      renderer: 'Adreno (TM) 650',
    });
  });

  it('falls back to the masked renderer and reports missing highp', () => {
    const caps = probeCaps(fakeGl({ highpPrecision: 0, extensions: [] }));
    expect(caps.fragmentHighp).toBe(false);
    expect(caps.renderer).toBe('WebKit WebGL');
    expect(caps.extensions).toEqual([]);
  });
});
