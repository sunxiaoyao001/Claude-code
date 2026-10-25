import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";

// The camera never holds still: a slow drift plus a push-pull of at most 1.5% (about 0.5–1% per
// second), so prints sized for a 1.015 zoom never break the 1.5x resolution budget.
export const BREATH_MAX_ZOOM = 1.015;

// Periods divide the 2688-frame cut (168, 336, 672 f at 30 fps), so the breath is continuous across
// the whole film and the last frame flows back into frame 0 when the video loops. 1.5% every 2.8 s
// averages 0.54%/s, inside the 0.5–1.5%/s brief.
const ZOOM_PERIOD_S = 5.6;
const DRIFT_X_PERIOD_S = 11.2;
const DRIFT_Y_PERIOD_S = 22.4;

// `phase` is the scene's start in the full film, so every scene breathes on the same clock.
export const Breath: React.FC<{ readonly children: React.ReactNode; readonly originX?: number; readonly originY?: number; readonly phase?: number }> = ({
  children,
  originX = 540,
  originY = 760,
  phase = 0,
}) => {
  const { fps } = useVideoConfig();
  const s = (useCurrentFrame() + phase) / fps;
  const zoom = 1 + ((BREATH_MAX_ZOOM - 1) / 2) * (1 - Math.cos((2 * Math.PI * s) / ZOOM_PERIOD_S));
  const driftX = 6 * Math.sin((2 * Math.PI * s) / DRIFT_X_PERIOD_S);
  const driftY = 3 * Math.sin((2 * Math.PI * s) / DRIFT_Y_PERIOD_S);
  return (
    <AbsoluteFill style={{ transformOrigin: `${originX}px ${originY}px`, scale: zoom, translate: `${driftX}px ${driftY}px` }}>{children}</AbsoluteFill>
  );
};
