import { whiteNoise } from "@remotion/effects/white-noise";
import React from "react";
import { AbsoluteFill, random, Solid, useCurrentFrame, useVideoConfig } from "remotion";
import { COLORS } from "../theme";

// The film's one filter, over the whole frame: it reads as a print struck from a worn reel.
// - grain: fresh white noise every frame (rendered at half size, so each grain is ~2 px), overlaid;
// - dust: a few dark specks per frame, at random places, gone the next frame;
// - hair: now and then a short curled fibre sits on the gate for a few frames;
// - scratch: now and then one thin vertical scratch runs down the frame for ten-odd frames.
// Exposure never changes (no flicker), and nothing moves the image (no gate weave).

const DUST_PER_FRAME = 5;

// `clean`: no hair or scratch (the cover frame and the loop seam stay clean).
const Dust: React.FC<{ readonly frame: number; readonly clean: boolean }> = ({ frame, clean }) => {
  const specks = Array.from({ length: DUST_PER_FRAME }, (_, i) => {
    const keep = random(`dust-keep-${frame}-${i}`) < 0.55;
    if (!keep) return null;
    const x = random(`dust-x-${frame}-${i}`) * 1080;
    const y = random(`dust-y-${frame}-${i}`) * 1920;
    const r = 0.8 + random(`dust-r-${frame}-${i}`) * 2.2;
    const light = random(`dust-l-${frame}-${i}`) < 0.25;
    return <ellipse key={i} cx={x} cy={y} rx={r} ry={r * (0.6 + random(`dust-e-${frame}-${i}`) * 0.6)} fill={light ? COLORS.printWhite : COLORS.ink} opacity={light ? 0.45 : 0.7} />;
  });
  // A hair: one every ~2.4 s, held for 6 frames.
  const hairSlot = Math.floor(frame / 72);
  const hairOn = !clean && frame % 72 < 6 && random(`hair-on-${hairSlot}`) < 0.7;
  const hx = 120 + random(`hair-x-${hairSlot}`) * 840;
  const hy = 220 + random(`hair-y-${hairSlot}`) * 1300;
  const hs = 0.7 + random(`hair-s-${hairSlot}`) * 0.8;
  // A scratch: one every ~3.2 s, held for 14 frames, drifting a few pixels.
  const scratchSlot = Math.floor(frame / 96);
  const scratchOn = !clean && frame % 96 < 14 && random(`scr-on-${scratchSlot}`) < 0.6;
  const sx = 80 + random(`scr-x-${scratchSlot}`) * 920 + (frame % 96) * 0.4;
  return (
    <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
      {specks}
      {hairOn ? (
        <path
          d={`M ${hx} ${hy} c ${18 * hs} ${-10 * hs} ${30 * hs} ${8 * hs} ${44 * hs} ${2 * hs} s ${20 * hs} ${-16 * hs} ${36 * hs} ${-6 * hs}`}
          stroke={COLORS.ink}
          strokeWidth={1.4}
          fill="none"
          opacity={0.55}
        />
      ) : null}
      {scratchOn ? <line x1={sx} y1={0} x2={sx + 3} y2={1920} stroke={COLORS.printWhite} strokeWidth={1} opacity={0.18} /> : null}
    </svg>
  );
};

export const FilmLook: React.FC = () => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const clean = frame < 12 || frame > durationInFrames - 13;
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <div style={{ position: "absolute", left: 0, top: 0, width: 540, height: 960, scale: 2, transformOrigin: "0 0", mixBlendMode: "overlay", opacity: 0.22 }}>
        <Solid width={540} height={960} color="#808080" effects={[whiteNoise({ amount: 1, seed: frame })]} />
      </div>
      <Dust frame={frame} clean={clean} />
    </AbsoluteFill>
  );
};
