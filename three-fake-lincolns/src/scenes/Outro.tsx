import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { Breath } from "../components/Breath";
import { MonoText } from "../components/Props";
import { useTime } from "../time";
import { SCENES } from "../timeline";
import { CLAMP, COLORS, EASE } from "../theme";
import { CoverPrints } from "./BorrowedBody";
import { ContactSheet } from "./Golden";

// Scene-local frames: 0 = 2544. An index card with the credits is pushed over the table (fully
// readable 2556–2604), then pulled away to reveal the cover already laid out underneath. The breath
// and the "?" tag run on the film's own clock, so the last frame flows into frame 0.
const BASE = SCENES.outro.from;
const CARD = { left: 76, top: 250, width: 870 } as const;

const CREDITS: readonly { readonly head?: string; readonly lines: readonly string[] }[] = [
  { head: "IMAGES", lines: ["LIBRARY OF CONGRESS", "2003654314 · 2003679757 · 2007681056", "96520658 · 96518779 · 2018682515", "2018667429 · 2018667065 · 2007684716"] },
  { lines: ["W. H. MUMLER (PD) · WIKIMEDIA COMMONS", "THE MET 287722 (CC0)", "DIFFERENCE MAP: COMPUTED FROM LOC SCANS"] },
  { head: "MUSIC & SOUND", lines: ["ORIGINAL SCORE AND EFFECTS", "PIANO: SALAMANDER GRAND, A. HOLM (CC BY 3.0)"] },
  { head: "FONTS (OFL)", lines: ["NOTO SERIF SC · NOTO SANS SC", "EB GARAMOND · IBM PLEX MONO"] },
  { lines: ["FULL SOURCES IN THE DESCRIPTION"] },
];

const CreditsCard: React.FC<{ readonly left: number; readonly lift: number }> = ({ left, lift }) => (
  <div
    style={{
      position: "absolute",
      left,
      top: CARD.top,
      width: CARD.width,
      padding: "40px 36px 36px",
      boxSizing: "border-box",
      backgroundColor: COLORS.printWhite,
      rotate: `${-0.6 + lift * 1.5}deg`,
      boxShadow: `0 ${10 + lift * 24}px ${26 + lift * 40}px rgba(0,0,0,0.55), 0 1px 3px rgba(0,0,0,0.5)`,
    }}
  >
    <div style={{ position: "absolute", left: 0, right: 0, top: 18, height: 3, backgroundColor: COLORS.vermilion }} />
    {CREDITS.map((block, i) => (
      <div key={i} style={{ marginTop: i === 0 ? 0 : 18, display: "flex", flexDirection: "column", gap: 4 }}>
        {block.head ? <MonoText style={{ opacity: 0.6 }}>{block.head}</MonoText> : null}
        {block.lines.map((line) => (
          <MonoText key={line}>{line}</MonoText>
        ))}
      </div>
    ))}
  </div>
);

export const Outro: React.FC = () => {
  const frame = useCurrentFrame();
  const t = useTime();
  const cardIn = interpolate(frame, [0, t(12)], [0, 1], { ...CLAMP, easing: EASE.spring });
  const cardOut = interpolate(frame, [t(60), t(72)], [0, 1], { ...CLAMP, easing: EASE.inOut });
  // The camera settles on the cover as the card leaves (ease-out, so it arrives at rest).
  const settle = interpolate(frame, [t(60), t(72)], [0.985, 1], { ...CLAMP, easing: EASE.out });
  return (
    <AbsoluteFill>
      <Breath phase={t(BASE)}>
        {frame < t(12) ? (
          <ContactSheet dim={0.6} />
        ) : (
          <AbsoluteFill style={{ transformOrigin: "540px 760px", scale: settle }}>
            <CoverPrints phase={t(BASE)} />
          </AbsoluteFill>
        )}
        {cardOut < 1 ? <CreditsCard left={CARD.left + (1 - cardIn) * 1000 - cardOut * 1150} lift={Math.max(1 - cardIn, cardOut) * 0.8} /> : null}
      </Breath>
    </AbsoluteFill>
  );
};
