import { Box, Circle, Underline } from "@remotion/rough-notation";
import React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { useTime } from "../time";
import type { Typed } from "../timeline";
import { CLAMP, COLORS, EASE, FONTS, TYPE } from "../theme";

// Archive tag in print white (palette colour); the punched hole and shadow make it read as a tag.
export const ManilaTag: React.FC<{
  readonly left: number;
  readonly top: number;
  readonly height: number;
  readonly tilt?: number;
  readonly children?: React.ReactNode;
  readonly style?: React.CSSProperties;
}> = ({ left, top, height, tilt = 0, children, style }) => (
  <div
    style={{
      position: "absolute",
      left,
      top,
      height,
      whiteSpace: "nowrap",
      paddingRight: 24,
      rotate: `${tilt}deg`,
      backgroundColor: COLORS.printWhite,
      boxShadow: "0 8px 18px rgba(0,0,0,0.45), 0 1px 2px rgba(0,0,0,0.4)",
      clipPath: `polygon(14px 0, 100% 0, 100% 100%, 14px 100%, 0 calc(100% - 14px), 0 14px)`,
      display: "flex",
      alignItems: "center",
      paddingLeft: 34,
      color: COLORS.ink,
      ...style,
    }}
  >
    <div
      style={{
        position: "absolute",
        left: 12,
        top: "50%",
        width: 10,
        height: 10,
        marginTop: -5,
        borderRadius: 5,
        backgroundColor: COLORS.darkPaper,
      }}
    />
    {children}
  </div>
);

// Vermilion seal pressed onto paper: overshoot-free press-in, then a short ink bloom.
export const Seal: React.FC<{
  readonly text: string;
  readonly left: number;
  readonly top: number;
  readonly size: number;
  readonly at: number;
}> = ({ text, left, top, size, at }) => {
  const frame = useCurrentFrame();
  const press = interpolate(frame, [at, at + 6], [0, 1], { ...CLAMP, easing: EASE.inOut });
  const bloom = interpolate(frame, [at + 4, at + 14], [0, 1], { ...CLAMP, easing: EASE.out });
  if (frame < at) return null;
  return (
    <div
      style={{
        position: "absolute",
        left,
        top,
        width: size,
        height: size,
        rotate: "-4deg",
        scale: 1.18 - 0.18 * press,
        opacity: 0.55 + 0.4 * press,
        border: `${Math.round(size * 0.06)}px solid ${COLORS.vermilion}`,
        color: COLORS.vermilion,
        fontFamily: FONTS.serifZh,
        fontWeight: 900,
        fontSize: size * 0.56,
        lineHeight: `${size * 0.88}px`,
        textAlign: "center",
        filter: `url(#ink) blur(${(1 - bloom) * 1.2}px)`,
      }}
    >
      {text}
    </div>
  );
};

// SVG filter that roughens seal edges like ink on fibrous paper. Mounted once per composition.
export const InkFilter: React.FC = () => (
  <svg width={0} height={0} style={{ position: "absolute" }}>
    <filter id="ink">
      <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves={2} seed={1926} />
      <feDisplacementMap in="SourceGraphic" scale={3} />
    </filter>
  </svg>
);

type MarkKind = "circle" | "box" | "underline";

// Red-pen annotation over an image region, in pixels of the print's visible window.
export const PenMark: React.FC<{
  readonly kind: MarkKind;
  readonly left: number;
  readonly top: number;
  readonly width: number;
  readonly height: number;
  readonly from: number;
  readonly durationInFrames?: number;
  readonly seed?: number;
}> = ({ kind, left, top, width, height, from, durationInFrames = 20, seed = 7 }) => {
  const frame = useCurrentFrame();
  const progress = interpolate(frame, [from, from + durationInFrames], [0, 1], { ...CLAMP, easing: EASE.ink });
  const box = <div style={{ width, height }} />;
  const common = { progress, color: COLORS.vermilion, seed, roughness: 1.4 } as const;
  return (
    <div style={{ position: "absolute", left, top, width, height }}>
      {kind === "circle" ? (
        <Circle {...common} strokeWidth={4} padding={{ left: 10, right: 10, top: 10, bottom: 10 }} iterations={1}>
          {box}
        </Circle>
      ) : kind === "box" ? (
        <Box {...common} strokeWidth={3} padding={{ left: 6, right: 6, top: 6, bottom: 6 }} iterations={1}>
          {box}
        </Box>
      ) : (
        <Underline {...common} strokeWidth={4} iterations={1}>
          {box}
        </Underline>
      )}
    </div>
  );
};

export const MonoText: React.FC<{ readonly children: React.ReactNode; readonly size?: number; readonly color?: string; readonly style?: React.CSSProperties }> = ({
  children,
  size = TYPE.label,
  color = COLORS.ink,
  style,
}) => (
  <span
    style={{
      fontFamily: FONTS.mono,
      fontWeight: 500,
      fontSize: size,
      letterSpacing: TYPE.monoTracking,
      textTransform: "uppercase",
      color,
      ...style,
    }}
  >
    {children}
  </span>
);

// How many characters of a typed line are visible, inside a scene that starts at base frame `sceneFrom`.
// Uses the same frame mapping as the keystroke sounds (timeline.ts), so each sound lands on its character.
export const useTypedCount = (typed: Typed, sceneFrom: number) => {
  const frame = useCurrentFrame();
  const t = useTime();
  let count = 0;
  for (let i = 0; i < typed.text.length; i++) {
    if (t(typed.from + i * typed.every) - t(sceneFrom) <= frame) count = i + 1;
  }
  return count;
};

// Typewriter text that keeps its final width from the start, so the tag around it never grows.
export const TypedMono: React.FC<{ readonly typed: Typed; readonly sceneFrom: number; readonly size?: number; readonly color?: string }> = ({
  typed,
  sceneFrom,
  size = TYPE.label,
  color = COLORS.ink,
}) => {
  const count = useTypedCount(typed, sceneFrom);
  return (
    <MonoText size={size} color={color} style={{ whiteSpace: "pre" }}>
      {typed.text.slice(0, count)}
      <span style={{ color: "transparent" }}>{typed.text.slice(count)}</span>
    </MonoText>
  );
};

// Rectangular archive stamp in vermilion ink (double rule), pressed down like the seal.
export const ArchiveStamp: React.FC<{ readonly label: string; readonly number: string; readonly left: number; readonly top: number; readonly at: number; readonly tilt?: number }> = ({
  label,
  number,
  left,
  top,
  at,
  tilt = -7,
}) => {
  const frame = useCurrentFrame();
  if (frame < at) return null;
  const press = interpolate(frame, [at, at + 6], [0, 1], { ...CLAMP, easing: EASE.inOut });
  return (
    <div
      style={{
        position: "absolute",
        left,
        top,
        rotate: `${tilt}deg`,
        scale: 1.25 - 0.25 * press,
        opacity: 0.5 + 0.42 * press,
        border: `3px solid ${COLORS.vermilion}`,
        outline: `1px solid ${COLORS.vermilion}`,
        outlineOffset: 4,
        padding: "8px 18px 6px",
        color: COLORS.vermilion,
        textAlign: "center",
        filter: "url(#ink)",
      }}
    >
      <div style={{ fontFamily: FONTS.mono, fontWeight: 500, fontSize: TYPE.label, letterSpacing: TYPE.monoTracking }}>{label}</div>
      <div style={{ fontFamily: FONTS.mono, fontWeight: 500, fontSize: TYPE.subtitleEn, letterSpacing: TYPE.monoTracking, lineHeight: 1.1 }}>{number}</div>
    </div>
  );
};
