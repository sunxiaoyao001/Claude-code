import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { Breath } from "../components/Breath";
import { MonoText } from "../components/Props";
import { useTime } from "../time";
import { SCENES } from "../timeline";
import { CLAMP, COLORS, EASE, TYPE } from "../theme";
import { COVER_ORIGIN, COVER_SCALE, CoverPrints } from "./BorrowedBody";
import { ContactSheet, GOLDEN_DIM } from "./Golden";

// Scene-local frames: 0 = 2568. An index card with the credits is pushed over the table (fully
// readable 2580–2628), then pulled away to reveal the cover already laid out underneath. The breath
// and the "?" tag run on the film's own clock, so the last frame flows into frame 0.
// The card is set at 36 px (the English subtitle size), so it reads on a phone; the item numbers and
// the full licences are in the description and the pinned comment.
const BASE = SCENES.outro.from;
// Wide enough to cover the contact sheet (76–950, tilted) while the cover is swapped in under it.
const CARD = { left: 68, top: 246, width: 890 } as const;
const CARD_TYPE = TYPE.subtitleEn;

const CREDITS: readonly string[] = [
  "LIBRARY OF CONGRESS · 9 ITEMS",
  "W. H. MUMLER (PD) · COMMONS",
  "THE MET 287722 · CC0",
  "PIANO · SALAMANDER GRAND",
  "A. HOLM · CC BY 3.0",
  "FULL LIST IN DESCRIPTION",
];

const CreditsCard: React.FC<{ readonly left: number; readonly lift: number }> = ({ left, lift }) => (
  <div
    style={{
      position: "absolute",
      left,
      top: CARD.top,
      width: CARD.width,
      padding: "56px 44px 44px",
      boxSizing: "border-box",
      backgroundColor: COLORS.printWhite,
      rotate: `${-0.6 + lift * 1.5}deg`,
      boxShadow: `0 ${10 + lift * 24}px ${26 + lift * 40}px rgba(0,0,0,0.55), 0 1px 3px rgba(0,0,0,0.5)`,
      display: "flex",
      flexDirection: "column",
      gap: 14,
    }}
  >
    <div style={{ position: "absolute", left: 0, right: 0, top: 22, height: 3, backgroundColor: COLORS.vermilion }} />
    <MonoText size={CARD_TYPE} style={{ opacity: 0.55 }}>
      SOURCES
    </MonoText>
    {CREDITS.map((line) => (
      <MonoText key={line} size={CARD_TYPE}>
        {line}
      </MonoText>
    ))}
  </div>
);

export const Outro: React.FC = () => {
  const frame = useCurrentFrame();
  const t = useTime();
  const cardIn = interpolate(frame, [0, t(12)], [0, 1], { ...CLAMP, easing: EASE.spring });
  const cardOut = interpolate(frame, [t(60), t(72)], [0, 1], { ...CLAMP, easing: EASE.inOut });
  // As the card leaves, the camera eases back to the cover's opening framing (COVER_SCALE) and
  // arrives at rest, so the last frame is frame 0.
  const settle = interpolate(frame, [t(56), t(74)], [1, COVER_SCALE], { ...CLAMP, easing: EASE.inOut });
  return (
    <AbsoluteFill>
      <Breath phase={t(BASE)}>
        {frame < t(12) ? (
          <ContactSheet dim={GOLDEN_DIM} markFrom={-100} />
        ) : (
          <AbsoluteFill style={{ transformOrigin: `${COVER_ORIGIN.x}px ${COVER_ORIGIN.y}px`, scale: settle }}>
            <CoverPrints phase={t(BASE)} />
          </AbsoluteFill>
        )}
        {cardOut < 1 ? <CreditsCard left={CARD.left + (1 - cardIn) * 1000 - cardOut * 1150} lift={Math.max(1 - cardIn, cardOut) * 0.8} /> : null}
      </Breath>
    </AbsoluteFill>
  );
};
