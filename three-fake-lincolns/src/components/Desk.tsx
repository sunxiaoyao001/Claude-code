import React from "react";
import { AbsoluteFill, Solid, useVideoConfig } from "remotion";
import { noise } from "@remotion/effects/noise";
import { vignette } from "@remotion/effects/vignette";
import { COLORS } from "../theme";

// The archive table: dark paper, a static fibre texture and a soft falloff toward the edges.
export const Desk: React.FC<{ readonly children?: React.ReactNode }> = ({ children }) => {
  const { width, height } = useVideoConfig();
  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.darkPaper }}>
      <Solid width={width} height={height} color={COLORS.darkPaper} effects={[noise({ amount: 0.035, seed: 7 }), vignette({ amount: 0.45 })]} />
      {children}
    </AbsoluteFill>
  );
};
