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

// Top-right chapter tag. When the chapter changes, only the part that differs is rewritten: the old
// tail is backspaced two characters a frame, then the new tail is typed one character a frame, so
// "ARCHIVE No.002" never retypes its own prefix.
export const ArchiveTag: React.FC<{ readonly entries: readonly ArchiveEntry[] }> = ({ entries }) => {
  const frame = useCurrentFrame();
  const index = entries.reduce((found, e, i) => (frame >= e.from ? i : found), -1);
  if (index < 0) return null;
  const current = entries[index];
  const prev = index > 0 ? entries[index - 1].text : "";
  let common = 0;
  while (common < prev.length && common < current.text.length && prev[common] === current.text[common]) common++;
  const k = frame - current.from;
  const eraseFrames = Math.ceil((prev.length - common) / 2);
  const text =
    current.from === 0
      ? current.text
      : k < eraseFrames
        ? prev.slice(0, Math.max(common, prev.length - 2 * (k + 1)))
        : current.text.slice(0, Math.min(current.text.length, common + (k - eraseFrames) + 1));
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
      {text}
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
  // Paper white at 70% (not silver): a provenance line has to stay readable on a phone.
  return <div style={{ ...monoLabel, position: "absolute", left: x, top, color: COLORS.printWhite, opacity: 0.7 * opacity }}>{text}</div>;
};

// Mark on reconstructions and schematics. By default the fixed corner mark of a schematic scene;
// `left`/`top` pin a smaller one to the thing it qualifies (e.g. the developing animation only).
export const IllustrativeMark: React.FC<{ readonly text?: string; readonly left?: number; readonly top?: number; readonly opacity?: number }> = ({
  text = "示意",
  left,
  top,
  opacity = 1,
}) => {
  const pinned = left !== undefined && top !== undefined;
  return (
    <div
      style={{
        position: "absolute",
        ...(pinned ? { left, top } : { right: 1080 - SAFE.right, top: SAFE.bottom - 128 }),
        fontFamily: FONTS.sansZh,
        fontWeight: 700,
        fontSize: pinned ? TYPE.label : TYPE.subtitleEn,
        color: COLORS.printWhite,
        border: `1px solid ${COLORS.silver}`,
        padding: pinned ? "2px 8px" : "4px 10px",
        whiteSpace: "nowrap",
        opacity,
      }}
    >
      {text}
    </div>
  );
};
