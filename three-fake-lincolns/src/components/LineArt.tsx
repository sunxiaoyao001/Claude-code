import React, { useId } from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { CLAMP, COLORS, EASE } from "../theme";

// Line art drawn by the archivist's pen: every stroke draws itself on (stroke-dashoffset driven
// by the frame), in silver or print white, with vermilion only for emphasis. Coordinates are
// canvas pixels (1080 × 1920); frames are scene-local render frames.

export const useInk = (from: number, duration: number) => {
  const frame = useCurrentFrame();
  return interpolate(frame, [from, from + duration], [0, 1], { ...CLAMP, easing: EASE.inOut });
};

type StrokeProps = {
  readonly d: string;
  readonly from: number;
  readonly duration?: number;
  readonly color?: string;
  readonly width?: number;
  readonly opacity?: number;
  // A dash pattern such as "8 7"; the dashed line still draws on progressively.
  readonly dash?: string;
  readonly fill?: string;
  readonly fillOpacity?: number;
};

// One pen stroke. With `dash`, a solid draw-on copy masks the dashed line.
export const Ink: React.FC<StrokeProps> = ({ d, from, duration = 18, color = COLORS.printWhite, width = 2, opacity = 0.8, dash, fill, fillOpacity = 0 }) => {
  const p = useInk(from, duration);
  const id = useId().replace(/:/g, "");
  if (p <= 0) return null;
  const common = { fill: "none", strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  return (
    <g opacity={opacity}>
      {fill ? <path d={d} fill={fill} fillOpacity={fillOpacity * p} stroke="none" /> : null}
      {dash ? (
        <>
          <mask id={`m${id}`} maskUnits="userSpaceOnUse" x={0} y={0} width={1080} height={1920}>
            <path d={d} {...common} stroke="white" strokeWidth={width + 6} pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - p} />
          </mask>
          <path d={d} {...common} stroke={color} strokeWidth={width} strokeDasharray={dash} mask={`url(#m${id})`} />
        </>
      ) : (
        <path d={d} {...common} stroke={color} strokeWidth={width} pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - p} />
      )}
    </g>
  );
};

// Full-canvas SVG layer for a drawing.
export const Drawing: React.FC<{ readonly children: React.ReactNode; readonly opacity?: number }> = ({ children, opacity = 1 }) => (
  <svg width={1080} height={1920} viewBox="0 0 1080 1920" style={{ position: "absolute", inset: 0, overflow: "visible", opacity }}>
    {children}
  </svg>
);

// Small mono caption inside a drawing (24 px, the house label size).
export const InkLabel: React.FC<{ readonly x: number; readonly y: number; readonly text: string; readonly from: number; readonly color?: string; readonly anchor?: "start" | "middle" | "end" }> = ({
  x,
  y,
  text,
  from,
  color = COLORS.silver,
  anchor = "start",
}) => {
  const p = useInk(from, 8);
  if (p <= 0) return null;
  return (
    <text x={x} y={y + (1 - p) * 6} fill={color} opacity={p} fontFamily="IBM Plex Mono" fontSize={24} letterSpacing="0.12em" textAnchor={anchor}>
      {text.toUpperCase()}
    </text>
  );
};
