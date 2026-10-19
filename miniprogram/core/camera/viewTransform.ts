// Maps the camera frame onto the viewfinder like CSS `object-fit: cover`, with optional rotation and
// horizontal mirroring. Pure math so it can be unit-tested; the result feeds uUvMatrix in the shaders.
//
// Coordinates are centred and normalised to [-0.5, 0.5], y pointing down (texture row 0 = top).
// texture = R(-rotation) * Mirror * Crop * screen

export type FrameRotation = 0 | 90 | 180 | 270;

export interface ViewTransformInput {
  frameWidth: number;
  frameHeight: number;
  viewWidth: number;
  viewHeight: number;
  /** Clockwise rotation applied to the frame for display. */
  rotation: FrameRotation;
  mirror: boolean;
}

export interface ViewTransform {
  /** Column-major 2x2 matrix for gl.uniformMatrix2fv. */
  matrix: Float32Array;
  /** Fraction of the displayed frame that stays visible on each axis (1 = no crop). */
  visibleX: number;
  visibleY: number;
}

export const ROTATIONS: readonly FrameRotation[] = [0, 90, 180, 270];

export function nextRotation(rotation: FrameRotation): FrameRotation {
  return ROTATIONS[(ROTATIONS.indexOf(rotation) + 1) % ROTATIONS.length] ?? 0;
}

export function computeViewTransform(input: ViewTransformInput): ViewTransform {
  const { frameWidth, frameHeight, viewWidth, viewHeight, rotation, mirror } = input;
  const quarterTurn = rotation === 90 || rotation === 270;
  const shownWidth = quarterTurn ? frameHeight : frameWidth;
  const shownHeight = quarterTurn ? frameWidth : frameHeight;

  const shownAspect = shownWidth / shownHeight;
  const viewAspect = viewWidth / viewHeight;
  const visibleX = shownAspect > viewAspect ? viewAspect / shownAspect : 1;
  const visibleY = shownAspect > viewAspect ? 1 : shownAspect / viewAspect;

  // Displayed-frame coordinate d = (mx * visibleX * sx, visibleY * sy)
  const mx = mirror ? -visibleX : visibleX;
  const my = visibleY;

  // Inverse rotation (display -> texture). Clockwise display rotation by r means texture = R(-r) * d.
  // 90: t = (dy, -dx); 180: t = (-dx, -dy); 270: t = (-dy, dx).
  let a: number; // texture.x from screen.x
  let b: number; // texture.y from screen.x
  let c: number; // texture.x from screen.y
  let d: number; // texture.y from screen.y
  switch (rotation) {
    case 90:
      a = 0; b = -mx; c = my; d = 0;
      break;
    case 180:
      a = -mx; b = 0; c = 0; d = -my;
      break;
    case 270:
      a = 0; b = mx; c = -my; d = 0;
      break;
    default:
      a = mx; b = 0; c = 0; d = my;
  }

  // Column-major: first column holds the coefficients applied to screen.x.
  return { matrix: new Float32Array([a, b, c, d]), visibleX, visibleY };
}

/** Applies the matrix on the CPU; used by tests and for sanity checks. */
export function mapScreenToTexture(transform: ViewTransform, sx: number, sy: number): [number, number] {
  const [a = 0, b = 0, c = 0, d = 0] = transform.matrix;
  return [a * sx + c * sy, b * sx + d * sy];
}
