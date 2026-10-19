// Camera component option values (CLAUDE.md §2 camera boundaries).

export type FlashMode = 'off' | 'auto' | 'on';
export type DevicePosition = 'back' | 'front';
export type FrameSize = 'small' | 'medium' | 'large';
export type CameraResolution = 'low' | 'medium' | 'high';

const FLASH_CYCLE: readonly FlashMode[] = ['off', 'auto', 'on'];

export function nextFlashMode(mode: FlashMode): FlashMode {
  return FLASH_CYCLE[(FLASH_CYCLE.indexOf(mode) + 1) % FLASH_CYCLE.length] ?? 'off';
}

/** Front cameras behave like a mirror in the native preview; match that by default. */
export function defaultMirror(position: DevicePosition): boolean {
  return position === 'front';
}
