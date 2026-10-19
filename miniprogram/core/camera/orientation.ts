// Maps a photo's EXIF orientation (wx.getImageInfo) onto the renderer's rotation + mirror.
// Image decoders may or may not apply EXIF themselves. For quarter turns this is detectable (decoded
// width/height swap); for the rest we assume they do, as current WebKit/Chromium-based decoders do.
import type { FrameRotation } from './viewTransform';

export type ExifOrientation =
  | 'up' | 'up-mirrored' | 'down' | 'down-mirrored'
  | 'left' | 'left-mirrored' | 'right' | 'right-mirrored';

export interface ResolvedOrientation {
  rotation: FrameRotation;
  mirror: boolean;
  /** Size of the upright image after rotation. */
  width: number;
  height: number;
}

// Display = Mirror * Rotate(cw) * stored (see viewTransform); derived per EXIF definition.
const EXIF: Record<ExifOrientation, { rotation: FrameRotation; mirror: boolean }> = {
  up: { rotation: 0, mirror: false },
  'up-mirrored': { rotation: 0, mirror: true },
  down: { rotation: 180, mirror: false },
  'down-mirrored': { rotation: 180, mirror: true },
  right: { rotation: 90, mirror: false },
  'right-mirrored': { rotation: 270, mirror: true },
  left: { rotation: 270, mirror: false },
  'left-mirrored': { rotation: 90, mirror: true },
};

export function resolveOrientation(
  orientation: ExifOrientation,
  rawWidth: number,
  rawHeight: number,
  decodedWidth: number,
  decodedHeight: number,
): ResolvedOrientation {
  const upright = { rotation: 0 as FrameRotation, mirror: false, width: decodedWidth, height: decodedHeight };
  const mapped = EXIF[orientation] ?? EXIF.up;
  const quarterTurn = mapped.rotation === 90 || mapped.rotation === 270;

  if (!quarterTurn) return upright;
  const decoderRotated = rawWidth !== rawHeight && decodedWidth === rawHeight && decodedHeight === rawWidth;
  if (decoderRotated) return upright;
  return { ...mapped, width: decodedHeight, height: decodedWidth };
}
