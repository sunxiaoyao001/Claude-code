import React from "react";
import { AbsoluteFill, Solid, useCurrentFrame, useVideoConfig } from "remotion";
import { noise } from "@remotion/effects/noise";
import { vignette } from "@remotion/effects/vignette";
import { COLORS, SAFE, swing } from "../theme";

// Print-shop marks on the table: corner crop marks around the safe area and two registration
// targets. Thin, silver, low contrast; they frame the composition like a sheet on a light table.
const CropMark: React.FC<{ readonly x: number; readonly y: number; readonly dx: 1 | -1; readonly dy: 1 | -1 }> = ({ x, y, dx, dy }) => (
  <>
    <div style={{ position: "absolute", left: dx > 0 ? x - 34 : x + 10, top: y, width: 24, height: 1, backgroundColor: COLORS.silver }} />
    <div style={{ position: "absolute", left: x, top: dy > 0 ? y - 34 : y + 10, width: 1, height: 24, backgroundColor: COLORS.silver }} />
  </>
);

const Registration: React.FC<{ readonly x: number; readonly y: number }> = ({ x, y }) => (
  <div style={{ position: "absolute", left: x - 11, top: y - 11, width: 22, height: 22 }}>
    <div style={{ position: "absolute", inset: 3, border: `1px solid ${COLORS.silver}`, borderRadius: "50%" }} />
    <div style={{ position: "absolute", left: 11, top: 0, width: 1, height: 22, backgroundColor: COLORS.silver }} />
    <div style={{ position: "absolute", left: 0, top: 11, width: 22, height: 1, backgroundColor: COLORS.silver }} />
  </div>
);

// The archive table: dark paper with fibre texture, lit by one overhead lamp whose pool of light
// drifts very slowly (same bezier swing as the camera breath), falling off into ink at the edges.
export const Desk: React.FC = () => {
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();
  const s = frame / fps;
  const lx = 500 + 40 * (2 * swing(s, 22.4) - 1);
  const ly = 700 + 30 * (2 * swing(s + 5.6, 44.8) - 1);
  const top = SAFE.top + 8;
  const bottom = SAFE.bottom - 36;
  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.ink }}>
      <Solid width={width} height={height} color={COLORS.darkPaper} effects={[noise({ amount: 0.035, seed: 7 }), vignette({ amount: 0.45 })]} />
      <AbsoluteFill
        style={{
          background: `radial-gradient(ellipse 62% 44% at ${lx}px ${ly}px, rgba(236,230,218,0.11) 0%, rgba(236,230,218,0.04) 40%, rgba(14,14,16,0) 68%), radial-gradient(ellipse 85% 62% at 50% 40%, rgba(14,14,16,0) 50%, rgba(14,14,16,0.7) 100%)`,
        }}
      />
      <AbsoluteFill style={{ opacity: 0.28 }}>
        <CropMark x={SAFE.margin - 16} y={top} dx={1} dy={1} />
        <CropMark x={SAFE.right + 16} y={top} dx={-1} dy={1} />
        <CropMark x={SAFE.margin - 16} y={bottom} dx={1} dy={-1} />
        <CropMark x={SAFE.right + 16} y={bottom} dx={-1} dy={-1} />
        <Registration x={36} y={760} />
        <Registration x={1044} y={760} />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
