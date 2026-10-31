import React from "react";
import { measureText } from "@remotion/layout-utils";
import { interpolate, useCurrentFrame } from "remotion";
import { CLAMP, COLORS, EASE, FONTS, SAFE, TYPE } from "../theme";

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

// Three archive slots along the bottom of the safe area, one per fake. The current slot fills as its
// chapter plays; a vermilion dot marks the playhead.
export const ArchiveProgress: React.FC<{
  readonly bounds: readonly number[];
  readonly labels: readonly string[];
  readonly barFrames: number;
  // [from, to]: the playhead rewinds to the start over these frames (end of film = frame 0).
  readonly rewind: readonly [number, number];
}> = ({ bounds, labels, barFrames, rewind }) => {
  const now = useCurrentFrame();
  const frame = now < rewind[0] ? now : interpolate(now, rewind, [rewind[0], 0], { ...CLAMP, easing: EASE.inOut });
  // Advance one bar at a time, each step eased over 12 frames (no constant-speed creep).
  const stepped = (f: number) => {
    const bar = Math.floor(f / barFrames);
    return (bar + interpolate(f - bar * barFrames, [0, 12], [0, 1], { ...CLAMP, easing: EASE.inOut })) * barFrames;
  };
  const gap = 18;
  const total = SAFE.right - SAFE.margin;
  const slotW = (total - gap * (labels.length - 1)) / labels.length;
  const y = SAFE.bottom - 20;
  return (
    <>
      {labels.map((label, i) => {
        const from = bounds[i];
        const to = bounds[i + 1];
        const f = now < rewind[0] ? stepped(frame) : frame;
        const p = Math.min(1, Math.max(0, (f - from) / (to - from)));
        const current = frame >= from && frame < to;
        // During the rewind the bar moves smoothly instead of stepping per bar.
        const left = SAFE.margin + i * (slotW + gap);
        return (
          <React.Fragment key={label}>
            <div style={{ ...monoLabel, position: "absolute", left, top: y - 38, color: current ? COLORS.printWhite : COLORS.silver, opacity: current ? 0.9 : 0.45 }}>{label}</div>
            <div style={{ position: "absolute", left, top: y, width: slotW, height: 2, backgroundColor: COLORS.silver, opacity: 0.3 }} />
            <div style={{ position: "absolute", left, top: y, width: slotW * p, height: 2, backgroundColor: COLORS.silver, opacity: 0.8 }} />
            {current ? <div style={{ position: "absolute", left: left + slotW * p - 4, top: y - 3, width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.vermilion }} /> : null}
          </React.Fragment>
        );
      })}
    </>
  );
};

// Short provenance line under a real image, e.g. "LIBRARY OF CONGRESS · c.1865".
export const SourceCaption: React.FC<{ readonly text: string; readonly left: number; readonly top: number; readonly opacity?: number }> = ({
  text,
  left,
  top,
  opacity = 1,
}) => {
  // Never let a caption run into the right-hand UI band (x > SAFE.right).
  const { width } = measureText({ text: text.toUpperCase(), fontFamily: FONTS.mono, fontSize: TYPE.label, letterSpacing: TYPE.monoTracking, fontWeight: "400" });
  const x = Math.max(SAFE.margin, Math.min(left, SAFE.right - width));
  return <div style={{ ...monoLabel, position: "absolute", left: x, top, color: COLORS.silver, opacity }}>{text}</div>;
};

// Fixed corner mark on reconstructions and schematics.
export const IllustrativeMark: React.FC = () => (
  <div
    style={{
      position: "absolute",
      right: 1080 - SAFE.right,
      top: SAFE.bottom - 128,
      fontFamily: FONTS.sansZh,
      fontWeight: 700,
      fontSize: TYPE.subtitleEn,
      color: COLORS.printWhite,
      border: `1px solid ${COLORS.silver}`,
      padding: "4px 10px",
    }}
  >
    示意
  </div>
);
