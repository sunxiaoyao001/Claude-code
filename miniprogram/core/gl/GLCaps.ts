// One-shot probe of WebGL1 limits that later decide render tiers and capture size (CLAUDE.md §4).
import type { WebGL1 } from './webgl1';

export interface GLCaps {
  maxTextureSize: number;
  maxRenderbufferSize: number;
  maxViewport: [number, number];
  /** GLSL ES 1.0 makes fragment highp optional; sin-free hashes and LUT lookups need it. */
  fragmentHighp: boolean;
  vendor: string;
  renderer: string;
  version: string;
  extensions: string[];
}

// WEBGL_debug_renderer_info constants (the extension object only exposes them once enabled).
const UNMASKED_VENDOR_WEBGL = 0x9245;
const UNMASKED_RENDERER_WEBGL = 0x9246;

function asNumber(value: unknown, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

export function probeCaps(gl: WebGL1): GLCaps {
  const viewport = gl.getParameter(gl.MAX_VIEWPORT_DIMS) as ArrayLike<number> | null;
  const highp = gl.getShaderPrecisionFormat(gl.FRAGMENT_SHADER, gl.HIGH_FLOAT);
  const extensions = gl.getSupportedExtensions() ?? [];
  const debugInfo = extensions.includes('WEBGL_debug_renderer_info')
    ? gl.getExtension('WEBGL_debug_renderer_info')
    : null;

  return {
    maxTextureSize: asNumber(gl.getParameter(gl.MAX_TEXTURE_SIZE)),
    maxRenderbufferSize: asNumber(gl.getParameter(gl.MAX_RENDERBUFFER_SIZE)),
    maxViewport: [asNumber(viewport?.[0]), asNumber(viewport?.[1])],
    fragmentHighp: (highp?.precision ?? 0) > 0,
    vendor: asString(gl.getParameter(debugInfo ? UNMASKED_VENDOR_WEBGL : gl.VENDOR)),
    renderer: asString(gl.getParameter(debugInfo ? UNMASKED_RENDERER_WEBGL : gl.RENDERER)),
    version: asString(gl.getParameter(gl.VERSION)),
    extensions,
  };
}
