import { fillTextBox, fitText } from "@remotion/layout-utils";
import React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { splitGroups } from "../text";
import { CLAMP, COLORS, EASE, FONTS, SAFE, SUBTITLE_MOTION, TYPE } from "../theme";

// Subtitles are left-aligned in the safe column between the left margin and the right UI band.
export const SUBTITLE_WIDTH = SAFE.right - SAFE.margin;

const enStyle = (fontSize: number): React.CSSProperties => ({
  fontFamily: FONTS.italicEn,
  fontStyle: "italic",
  fontWeight: 400,
  fontSize,
  lineHeight: 1.25,
  // Paper white at 78%: brighter than silver, so the English line still reads on a phone, while
  // staying clearly secondary to the Chinese line.
  color: COLORS.printWhite,
});
export const EN_OPACITY = 0.78;

// The English line may wrap to two lines; shrink it (never below 30 px) if two lines are not enough.
const fitEnglish = (en: string) => {
  for (let size = TYPE.subtitleEn; size >= 30; size -= 2) {
    const box = fillTextBox({ maxBoxWidth: SUBTITLE_WIDTH, maxLines: 2 });
    const overflow = en
      .split(" ")
      .some((w) => box.add({ text: w + " ", fontFamily: FONTS.italicEn, fontSize: size, additionalStyles: { fontStyle: "italic" } }).exceedsBox);
    if (!overflow) return size;
  }
  return 30;
};

type Props = {
  readonly zh: string;
  readonly en: string;
  readonly durationInFrames: number;
  // Already on screen at the first frame (frame-0 cover, loop return).
  readonly isStatic?: boolean;
  // Skip the exit when the line runs to the last frame of the film.
  readonly holdToEnd?: boolean;
  // Chinese size override (the cover line is larger).
  readonly size?: number;
};

// Rendered inside a <Sequence>, so frame 0 is the line's own start.
export const Subtitle: React.FC<Props> = ({ zh, en, durationInFrames, isStatic = false, holdToEnd = false, size = TYPE.subtitleZh }) => {
  const frame = useCurrentFrame();
  const { riseLines, enterFrames, exitFrames, wordStaggerFrames } = SUBTITLE_MOTION;
  const chunks = splitGroups(zh);
  const plain = chunks.map((c) => c.text).join("");
  // ≤ 14 characters always fit one line at 56 px; fitText is the guard if a line ever grows.
  const zhSize = Math.min(
    size,
    fitText({ text: plain, withinWidth: SUBTITLE_WIDTH, fontFamily: FONTS.sansZh, fontWeight: "700" }).fontSize,
  );
  const enSize = fitEnglish(en);

  const exitStart = durationInFrames - exitFrames;
  const exit = holdToEnd
    ? 0
    : interpolate(frame, [exitStart, durationInFrames], [0, 1], { ...CLAMP, easing: EASE.inOut });

  const rise = (index: number) => {
    if (isStatic) return 1;
    const start = index * wordStaggerFrames;
    return interpolate(frame, [start, start + enterFrames], [0, 1], { ...CLAMP, easing: EASE.out });
  };

  return (
    <div
      style={{
        position: "absolute",
        left: SAFE.margin,
        width: SUBTITLE_WIDTH,
        top: SAFE.subtitleCenterY,
        translate: `0 calc(-50% + ${-6 * exit}px)`,
        opacity: 1 - exit,
      }}
    >
      {/* Local darkening behind the text block only; the photograph itself is never masked. */}
      <div
        style={{
          position: "absolute",
          left: -SAFE.margin,
          right: -40,
          top: -60,
          bottom: -60,
          background: "radial-gradient(ellipse 70% 60% at 35% 50%, rgba(14,14,16,0.62), rgba(14,14,16,0) 100%)",
        }}
      />
      <div style={{ position: "relative", fontFamily: FONTS.sansZh, fontSize: zhSize, lineHeight: 1.3, color: COLORS.printWhite, fontWeight: 500 }}>
        {chunks.map((c, i) => {
          const p = rise(i);
          if (c.keyword) {
            // The keyword is stamped, not raised: it lands oversized and tilted, presses flat in 8
            // frames, and keeps an inked edge (the composition's #ink filter).
            const s = isStatic ? 1 : interpolate(frame, [i * wordStaggerFrames, i * wordStaggerFrames + 8], [0, 1], { ...CLAMP, easing: EASE.out });
            return (
              <span key={i} style={{ display: "inline-block", verticalAlign: "bottom", whiteSpace: "pre" }}>
                <span
                  style={{
                    display: "inline-block",
                    color: COLORS.vermilion,
                    fontWeight: 700,
                    opacity: Math.min(1, s * 3),
                    scale: 1.45 - 0.45 * s,
                    rotate: `${-5 * (1 - s)}deg`,
                    filter: "url(#ink)",
                  }}
                >
                  {c.text}
                </span>
              </span>
            );
          }
          return (
            <span key={i} style={{ display: "inline-block", overflow: "hidden", verticalAlign: "bottom", whiteSpace: "pre" }}>
              <span
                style={{
                  display: "inline-block",
                  translate: `0 ${(1 - p) * riseLines}px`,
                  opacity: p,
                  color: c.keyword ? COLORS.vermilion : undefined,
                  fontWeight: c.keyword ? 700 : 500,
                }}
              >
                {c.text}
              </span>
            </span>
          );
        })}
      </div>
      <div
        style={{
          position: "relative",
          marginTop: 10,
          ...enStyle(enSize),
          opacity: EN_OPACITY * rise(chunks.length),
          translate: `0 ${(1 - rise(chunks.length)) * riseLines}px`,
        }}
      >
        {en}
      </div>
    </div>
  );
};
