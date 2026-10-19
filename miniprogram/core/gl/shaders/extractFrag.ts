// Halation pass 1: soft-knee highlight mask from the PRE-LUT image, red-biased like light scattering
// back from the film base (weights after Film-Standalone, MIT). Rendered at 1/4 or 1/8 resolution, so
// four taps one source texel apart average the area a single target texel covers.
export const EXTRACT_FRAG = `
precision mediump float;
uniform sampler2D uSource;
uniform vec2 uSourceTexel;
uniform float uThreshold;
varying vec2 vUv;

void main() {
  vec3 c = 0.25 * (
    texture2D(uSource, vUv + vec2(-uSourceTexel.x, -uSourceTexel.y)).rgb +
    texture2D(uSource, vUv + vec2(uSourceTexel.x, -uSourceTexel.y)).rgb +
    texture2D(uSource, vUv + vec2(-uSourceTexel.x, uSourceTexel.y)).rgb +
    texture2D(uSource, vUv + vec2(uSourceTexel.x, uSourceTexel.y)).rgb);
  float luma = dot(c, vec3(0.2126, 0.7152, 0.0722));
  float mask = smoothstep(uThreshold - 0.1, uThreshold + 0.1, luma);
  gl_FragColor = vec4(c * mask * vec3(1.0, 0.35, 0.08), 1.0);
}
`;
