// Fullscreen triangle-strip quad. uUvMatrix maps centred screen coordinates (y down) to centred
// texture coordinates, folding in cover-crop, rotation and mirroring (see core/camera/viewTransform).
// Shaders live in .ts modules because .frag/.glsl are not on the code-package upload whitelist;
// file names avoid extra dots so the mini program require() resolves them as .js.
export const FULLSCREEN_VERT = `
attribute vec2 aPos;
uniform mat2 uUvMatrix;
varying vec2 vUv;

void main() {
  vec2 screen = vec2(aPos.x, -aPos.y) * 0.5;
  vUv = uUvMatrix * screen + 0.5;
  gl_Position = vec4(aPos, 0.0, 1.0);
}
`;
