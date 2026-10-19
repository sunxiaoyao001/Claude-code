// M1 passthrough: shows the camera frame untouched. uGrayscale is a dev-panel switch that proves the
// WebGL layer (not the native camera preview underneath) is what is on screen.
export const RAW_FRAG = `
precision mediump float;
uniform sampler2D uFrame;
uniform float uGrayscale;
varying vec2 vUv;

void main() {
  vec3 color = texture2D(uFrame, vUv).rgb;
  float luma = dot(color, vec3(0.2126, 0.7152, 0.0722));
  gl_FragColor = vec4(mix(color, vec3(luma), uGrayscale), 1.0);
}
`;
