import React from "react";
import { AbsoluteFill, Solid, useCurrentFrame, useVideoConfig } from "remotion";
import { noise } from "@remotion/effects/noise";
import { vignette } from "@remotion/effects/vignette";
import { COLORS, swing } from "../theme";

// A guilloché rosette, the engraver's security pattern (the cover print is an engraving): rings of
// interfering sine curves, printed faintly into the table surface.
const ROSETTE_C = { x: 540, y: 760 } as const;
const ring = (count: number, r0: number, a1: number, k1: number, a2: number, k2: number, phase: number) => {
  const paths: string[] = [];
  for (let j = 0; j < count; j++) {
    const pts: string[] = [];
    for (let i = 0; i <= 720; i++) {
      const th = (i / 720) * 2 * Math.PI;
      const r = r0 + a1 * Math.sin(k1 * th + j * phase) + a2 * Math.sin(k2 * th - j * phase * 0.6);
      pts.push(`${i ? "L" : "M"}${(ROSETTE_C.x + r * Math.cos(th)).toFixed(1)} ${(ROSETTE_C.y + r * Math.sin(th)).toFixed(1)}`);
    }
    paths.push(pts.join(""));
  }
  return paths.join(" ");
};
const ROSETTE = [ring(16, 520, 40, 18, 18, 5, 0.33), ring(12, 330, 26, 24, 12, 7, 0.42), ring(8, 170, 16, 12, 8, 4, 0.6)].join(" ");

// The archive table: dark paper with fibre texture, lit by one overhead lamp whose pool of light
// drifts very slowly (same bezier swing as the camera breath), falling off into ink at the edges.
export const Desk: React.FC = () => {
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();
  const s = frame / fps;
  const lx = 500 + 40 * (2 * swing(s, 22.4) - 1);
  const ly = 700 + 30 * (2 * swing(s + 5.6, 44.8) - 1);
  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.ink }}>
      <Solid width={width} height={height} color={COLORS.darkPaper} effects={[noise({ amount: 0.035, seed: 7 }), vignette({ amount: 0.45 })]} />
      <AbsoluteFill
        style={{
          background: `radial-gradient(ellipse 62% 44% at ${lx}px ${ly}px, rgba(236,230,218,0.11) 0%, rgba(236,230,218,0.04) 40%, rgba(14,14,16,0) 68%), radial-gradient(ellipse 85% 62% at 50% 40%, rgba(14,14,16,0) 50%, rgba(14,14,16,0.7) 100%)`,
        }}
      />
      <svg width={width} height={height} style={{ position: "absolute", inset: 0, opacity: 0.045, rotate: `${2.5 * (2 * swing(s, 44.8) - 1)}deg`, transformOrigin: `${ROSETTE_C.x}px ${ROSETTE_C.y}px` }}>
        <path d={ROSETTE} stroke={COLORS.silver} strokeWidth={0.9} fill="none" />
      </svg>
    </AbsoluteFill>
  );
};
