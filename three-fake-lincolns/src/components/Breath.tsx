import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";

// The camera never holds still: a slow drift plus a push-pull of at most 1.5% (about 0.5–1% per
// second), so prints sized for a 1.015 zoom never break the 1.5x resolution budget.
export const BREATH_MAX_ZOOM = 1.015;

export const Breath: React.FC<{ readonly children: React.ReactNode; readonly originX?: number; readonly originY?: number; readonly phase?: number }> = ({
  children,
  originX = 540,
  originY = 760,
  phase = 0,
}) => {
  const frame = useCurrentFrame() + phase;
  const { fps } = useVideoConfig();
  const zoom = 1 + ((BREATH_MAX_ZOOM - 1) / 2) * (1 - Math.cos((2 * Math.PI * frame) / (6.4 * fps)));
  const driftX = 6 * Math.sin((2 * Math.PI * frame) / (9.6 * fps));
  const driftY = 3 * Math.sin((2 * Math.PI * frame) / (12.8 * fps));
  return (
    <AbsoluteFill style={{ transformOrigin: `${originX}px ${originY}px`, scale: zoom, translate: `${driftX}px ${driftY}px` }}>{children}</AbsoluteFill>
  );
};
