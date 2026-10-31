import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { useTime } from "../time";
import { CLAMP, EASE, swing } from "../theme";

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
  const zoom = 1 + (BREATH_MAX_ZOOM - 1) * swing(s, ZOOM_PERIOD_S);
  const driftX = 6 * (2 * swing(s, DRIFT_X_PERIOD_S) - 1);
  const driftY = 3 * (2 * swing(s, DRIFT_Y_PERIOD_S) - 1);
  return (
    <AbsoluteFill style={{ transformOrigin: `${originX}px ${originY}px`, scale: zoom, translate: `${driftX}px ${driftY}px` }}>{children}</AbsoluteFill>
  );
};

// A camera move inside a shot: a dolly-in (and optional pan) that ends at scale 1. Scale never goes
// above 1, so prints sized for the breath never exceed the 1.5x resolution budget; the move only
// ever starts wider and settles in. Frames are scene-local base frames (converted with useTime).
export const Dolly: React.FC<{
  readonly children: React.ReactNode;
  readonly from: number;
  readonly to?: number;
  readonly start?: number;
  readonly end: number;
  readonly originX?: number;
  readonly originY?: number;
  readonly panX?: readonly [number, number];
}> = ({ children, from, to = 1, start = 0, end, originX = 540, originY = 760, panX = [0, 0] }) => {
  const frame = useCurrentFrame();
  const t = useTime();
  if (from > 1 || to > 1) {
    throw new Error("Dolly scale must stay at or below 1 (resolution budget)");
  }
  const p = interpolate(frame, [t(start), t(end)], [0, 1], { ...CLAMP, easing: EASE.inOut });
  const scale = from + (to - from) * p;
  const x = panX[0] + (panX[1] - panX[0]) * p;
  return <AbsoluteFill style={{ transformOrigin: `${originX}px ${originY}px`, scale, translate: `${x}px 0` }}>{children}</AbsoluteFill>;
};
