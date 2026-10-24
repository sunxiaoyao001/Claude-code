import React from "react";
import { useCurrentFrame } from "remotion";
import { COLORS, FONTS, SAFE, TYPE } from "../theme";

const monoLabel: React.CSSProperties = {
  fontFamily: FONTS.mono,
  fontWeight: 400,
  fontSize: TYPE.label,
  letterSpacing: TYPE.monoTracking,
  textTransform: "uppercase",
  whiteSpace: "nowrap",
};

const LABEL_TOP = SAFE.top + 8;

export const Watermark: React.FC<{ readonly handle: string }> = ({ handle }) => (
  <div style={{ ...monoLabel, position: "absolute", left: SAFE.margin, top: LABEL_TOP, color: COLORS.printWhite, opacity: 0.4, textTransform: "none" }}>
    {handle}
  </div>
);

export type ArchiveEntry = { readonly from: number; readonly text: string };

// Top-right chapter tag. When the chapter changes the new text is typed over, one character per frame.
export const ArchiveTag: React.FC<{ readonly entries: readonly ArchiveEntry[] }> = ({ entries }) => {
  const frame = useCurrentFrame();
  const current = [...entries].reverse().find((e) => frame >= e.from);
  if (!current) return null;
  const typed = current.from === 0 ? current.text.length : Math.min(current.text.length, frame - current.from + 1);
  return (
    <div
      style={{
        ...monoLabel,
        position: "absolute",
        right: 1080 - SAFE.right,
        top: LABEL_TOP,
        color: COLORS.silver,
        textAlign: "right",
      }}
    >
      {current.text.slice(0, typed)}
    </div>
  );
};

// One tick per bar along the bottom of the safe area; the current bar carries a vermilion dot.
export const ProgressTicks: React.FC<{ readonly bars: number; readonly barFrames: number }> = ({ bars, barFrames }) => {
  const frame = useCurrentFrame();
  const current = Math.min(bars - 1, Math.floor(frame / barFrames));
  const width = SAFE.right - SAFE.margin;
  const y = SAFE.bottom - 20;
  return (
    <div style={{ position: "absolute", left: SAFE.margin, top: y, width, height: 12 }}>
      {Array.from({ length: bars }, (_, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            left: (i / (bars - 1)) * width,
            top: 0,
            width: 1,
            height: 12,
            backgroundColor: COLORS.silver,
            opacity: i <= current ? 0.7 : 0.3,
          }}
        />
      ))}
      <div
        style={{
          position: "absolute",
          left: (current / (bars - 1)) * width - 4,
          top: -12,
          width: 8,
          height: 8,
          borderRadius: 4,
          backgroundColor: COLORS.vermilion,
        }}
      />
    </div>
  );
};

// Short provenance line under a real image, e.g. "LIBRARY OF CONGRESS · c.1865".
export const SourceCaption: React.FC<{ readonly text: string; readonly left: number; readonly top: number; readonly opacity?: number }> = ({
  text,
  left,
  top,
  opacity = 1,
}) => (
  <div style={{ ...monoLabel, position: "absolute", left, top, color: COLORS.silver, opacity }}>{text}</div>
);

// Fixed corner mark on reconstructions and schematics.
export const IllustrativeMark: React.FC = () => (
  <div
    style={{
      position: "absolute",
      right: 1080 - SAFE.right,
      top: SAFE.bottom - 72,
      fontFamily: FONTS.sansZh,
      fontWeight: 500,
      fontSize: TYPE.label,
      color: COLORS.printWhite,
      border: `1px solid ${COLORS.silver}`,
      padding: "4px 10px",
    }}
  >
    示意
  </div>
);
