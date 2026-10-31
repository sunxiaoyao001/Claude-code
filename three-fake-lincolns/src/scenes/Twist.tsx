import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { fitWidth, IMG, region } from "../assets";
import { Breath, BREATH_MAX_ZOOM, Dolly } from "../components/Breath";
import { PhotoPrint, rectToCrop, toWindow, usePrint } from "../components/PhotoPrint";
import { ManilaTag, MonoText, PenMark } from "../components/Props";
import { MagicLantern } from "../components/Illustrations";
import { EMPTY_SLOT } from "./Question";
import { SourceCaption } from "../components/SeriesChrome";
import { useTime } from "../time";
import { CLAMP, COLORS, EASE } from "../theme";

const SLIDE = region("houdiniLincolnGhost", "slide");
// The scan caps the slide's width (1.5x budget); the projector light fills the rest of the frame.
const SLIDE_W = Math.floor(fitWidth("houdiniLincolnGhost", SLIDE, 700, BREATH_MAX_ZOOM));
const SLIDE_H = Math.round((SLIDE_W * ((SLIDE[3] - SLIDE[1]) * IMG.houdiniLincolnGhost.height)) / ((SLIDE[2] - SLIDE[0]) * IMG.houdiniLincolnGhost.width));
const LEFT = Math.round(540 - SLIDE_W / 2 - 30);
const TOP = 390;

// As the lamp settles, a tag names the man in the slide (F13, F20), so the next line's "胡迪尼" lands.
const HoudiniTag: React.FC<{ readonly from: number }> = ({ from }) => {
  const frame = useCurrentFrame();
  const g = usePrint();
  const p = interpolate(frame, [from - 10, from], [0, 1], { ...CLAMP, easing: EASE.land });
  if (frame < from - 10) return null;
  const at = toWindow(g, 0.08, 0.84);
  return (
    <ManilaTag left={at.x} top={at.y - (1 - p) * 40} height={52} tilt={-1.5} style={{ opacity: p }}>
      <MonoText>HARRY HOUDINI</MonoText>
    </ManilaTag>
  );
};

const GhostHeadMark: React.FC<{ readonly from: number }> = ({ from }) => {
  const g = usePrint();
  const r = region("houdiniLincolnGhost", "ghostHead");
  const a = toWindow(g, r[0], r[1]);
  const b = toWindow(g, r[2], r[3]);
  return <PenMark kind="circle" left={a.x} top={a.y} width={b.x - a.x} height={b.y - a.y} from={from} durationInFrames={20} seed={13} />;
};

// 1920: the one heavy punch. A projector viewfinder opens onto Houdini's own fake, in the scan's
// original colour (the only colour moment in the film).
export const Twist: React.FC = () => {
  const frame = useCurrentFrame();
  const t = useTime();
  // The punch is the very first frame: the viewfinder opens out of the empty No.003 slot of the
  // previous shot (already the slot's full size), reaches the whole slide in 8 frames, the lamp is
  // at full on frame 1920, and the colour is cut in hard (the frame before is black and white).
  const open = interpolate(frame, [0, 8], [0, 1], { ...CLAMP, easing: EASE.out });
  const restore = 1;
  const lamp = interpolate(frame, [0, t(24), t(48)], [1, 0.85, 0.22], { ...CLAMP, easing: EASE.inOut });
  const cx = LEFT + SLIDE_W / 2;
  const cy = TOP + SLIDE_H / 2;
  const lerp = (a: number, b: number) => a + (b - a) * open;
  const winL = lerp(EMPTY_SLOT.left, LEFT - 40);
  const winT = lerp(EMPTY_SLOT.top, TOP - 40);
  const winR = lerp(EMPTY_SLOT.left + EMPTY_SLOT.width, LEFT + SLIDE_W + 40);
  const winB = lerp(EMPTY_SLOT.top + EMPTY_SLOT.height, TOP + SLIDE_H + 40);
  // No glow: the light is the projected rectangle itself. The screen margin around the slide is lit
  // at full on 1920 and settles to a dim rim; a faint wedge of beam runs back to the lantern's lens.
  const lens = { x: 330, y: 1062 };
  return (
    <AbsoluteFill>
      <Breath phase={t(1920)} originX={cx} originY={cy}>
        <Dolly from={0.97} start={20} end={96} originX={cx} originY={cy}>
        <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
          <polygon
            points={`${lens.x},${lens.y - 14} ${winL},${winT} ${winR},${winT} ${winR},${winB} ${lens.x},${lens.y + 14}`}
            fill={COLORS.printWhite}
            opacity={0.035 + 0.05 * lamp}
          />
        </svg>
        <div style={{ position: "absolute", left: winL, top: winT, width: winR - winL, height: winB - winT, backgroundColor: COLORS.printWhite, opacity: 0.12 + 0.88 * lamp }} />
        <div style={{ position: "absolute", inset: 0, clipPath: `inset(${winT}px ${1080 - winR}px ${1920 - winB}px ${winL}px)` }}>
          <PhotoPrint
            src={IMG.houdiniLincolnGhost.file}
            imgW={IMG.houdiniLincolnGhost.width}
            imgH={IMG.houdiniLincolnGhost.height}
            width={SLIDE_W}
            crop={rectToCrop(SLIDE)}
            left={LEFT}
            top={TOP}
            border={0}
            colorRestore={restore}
            style={{ backgroundColor: COLORS.ink, boxShadow: "none" }}
          >
            <HoudiniTag from={t(24)} />
            <GhostHeadMark from={t(48)} />
          </PhotoPrint>
        </div>
        <MagicLantern from={t(28)} target={{ left: LEFT - 40, top: TOP - 40, right: LEFT + SLIDE_W + 40, bottom: TOP + SLIDE_H + 40 }} />
        {/* The caption sits on the dark table above the projected image, out of the light and the beam. */}
        <SourceCaption text={IMG.houdiniLincolnGhost.caption} left={950} top={TOP - 40 - 44} opacity={open} />
        </Dolly>
      </Breath>
    </AbsoluteFill>
  );
};
