import { whiteNoise } from "@remotion/effects/white-noise";
import React from "react";
import { AbsoluteFill, random, Solid, useCurrentFrame, useVideoConfig } from "remotion";
import { useTime } from "../time";
import { GOLDEN, SCENES, SILENCE } from "../timeline";
import { COLORS } from "../theme";

// The film's one filter, over the whole frame: it reads as a print struck from a worn reel.
// - grain: fresh white noise every frame (rendered at half size, so each grain is ~2 px), overlaid;
// - hair: now and then a short curled fibre sits on the gate for a few frames.
// No per-frame dust: specks that jump every frame read as a dirty phone screen (and as flicker).
// No scratches: a line across the whole frame would run through the subtitles and the header.
// Exposure never changes (no flicker), and nothing moves the image (no gate weave).

// `clean`: no hair (the cover frame and the loop seam stay clean).
const Hair: React.FC<{ readonly frame: number; readonly clean: boolean }> = ({ frame, clean }) => {
  // A hair: at most one every ~2.4 s, at a random moment in its window, held for 6 frames.
  const hairSlot = Math.floor(frame / 72);
  const hairStart = Math.floor(random(`hair-t-${hairSlot}`) * 60);
  const hairOn = !clean && frame % 72 >= hairStart && frame % 72 < hairStart + 6 && random(`hair-on-${hairSlot}`) < 0.6;
  const hx = 120 + random(`hair-x-${hairSlot}`) * 840;
  const hy = 220 + random(`hair-y-${hairSlot}`) * 1300;
  const hs = 0.7 + random(`hair-s-${hairSlot}`) * 0.8;
  return (
    <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
      {hairOn ? (
        <path
          d={`M ${hx} ${hy} c ${18 * hs} ${-10 * hs} ${30 * hs} ${8 * hs} ${44 * hs} ${2 * hs} s ${20 * hs} ${-16 * hs} ${36 * hs} ${-6 * hs}`}
          stroke={COLORS.ink}
          strokeWidth={1.4}
          fill="none"
          opacity={0.55}
        />
      ) : null}
    </svg>
  );
};

export const FilmLook: React.FC = () => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const t = useTime();
  // No hair on the cover, the loop seam, the twist and the golden line.
  const clean =
    frame < 12 || frame > durationInFrames - 13 || (frame >= t(SILENCE.from) && frame < t(SCENES.code.from)) || (frame >= t(GOLDEN.from) && frame < t(GOLDEN.to));
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <div style={{ position: "absolute", left: 0, top: 0, width: 540, height: 960, scale: 2, transformOrigin: "0 0", mixBlendMode: "overlay", opacity: 0.22 }}>
        <Solid width={540} height={960} color="#808080" effects={[whiteNoise({ amount: 1, seed: frame })]} />
      </div>
      <Hair frame={frame} clean={clean} />
    </AbsoluteFill>
  );
};
