// Separable Gaussian: the 9-tap kernel folded into 5 bilinear samples (offsets 1.38 and 3.23 texels).
// uStep = direction * (radius / 4) / targetSize, so the kernel spans about ±radius target pixels.
export const BLUR_FRAG = `
precision mediump float;
uniform sampler2D uInput;
uniform vec2 uStep;
varying vec2 vTarget;

void main() {
  vec3 sum = texture2D(uInput, vTarget).rgb * 0.2270270270;
  sum += (texture2D(uInput, vTarget + uStep * 1.3846153846).rgb + texture2D(uInput, vTarget - uStep * 1.3846153846).rgb) * 0.3162162162;
  sum += (texture2D(uInput, vTarget + uStep * 3.2307692308).rgb + texture2D(uInput, vTarget - uStep * 3.2307692308).rgb) * 0.0702702703;
  gl_FragColor = vec4(sum, 1.0);
}
`;
