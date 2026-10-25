import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { CLAMP, EASE } from "../theme";

export type CameraKey = { readonly at: number; readonly scale: number; readonly x: number; readonly y: number };

// The archivist never holds still: a slow push of `breathPerSec` (fraction per second) on top of
// keyed moves. Keys are local frames; easing between keys is the house ease-in-out.
export const Camera: React.FC<{
  readonly keys?: readonly CameraKey[];
  readonly breathPerSec?: number;
  readonly originX?: number;
  readonly originY?: number;
  readonly children: React.ReactNode;
}> = ({ keys = [], breathPerSec = 0.01, originX = 540, originY = 760, children }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const k = keys.length ? keys : [{ at: 0, scale: 1, x: 0, y: 0 }];
  const at = k.map((key) => key.at);
  const pick = (f: (key: CameraKey) => number) =>
    k.length === 1 ? f(k[0]) : interpolate(frame, at, k.map(f), { ...CLAMP, easing: EASE.inOut });
  const breath = 1 + breathPerSec * (frame / fps);
  return (
    <AbsoluteFill
      style={{
        transformOrigin: `${originX}px ${originY}px`,
        scale: pick((key) => key.scale) * breath,
        translate: `${pick((key) => key.x)}px ${pick((key) => key.y)}px`,
      }}
    >
      {children}
    </AbsoluteFill>
  );
};
