import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { fitWidth, IMG, region } from "../assets";
import { Breath, BREATH_MAX_ZOOM } from "../components/Breath";
import { PhotoPrint, rectToCrop } from "../components/PhotoPrint";
import { MonoText, TypedMono } from "../components/Props";
import { SourceCaption } from "../components/SeriesChrome";
import { useTime } from "../time";
import { SCENES, TYPED } from "../timeline";
import { CLAMP, COLORS, EASE, SAFE, TYPE } from "../theme";

// Scene-local frames: 0 = 2304. Only Houdini's half of the slide, so "he" cannot be read as the
// Lincoln ghost; the dates are typed below (F14, F19, F20).
const BASE = SCENES.centenary.from;
const HALF = region("houdiniLincolnGhost", "houdiniHalf");
const W = Math.floor(fitWidth("houdiniLincolnGhost", HALF, 420, BREATH_MAX_ZOOM));
const H = Math.round((W * (HALF[3] - HALF[1]) * IMG.houdiniLincolnGhost.height) / ((HALF[2] - HALF[0]) * IMG.houdiniLincolnGhost.width));
const BORDER = 12;
const LEFT = Math.round((SAFE.margin + SAFE.right) / 2 - W / 2 - BORDER);
const TOP = 280;
const BOTTOM = TOP + H + BORDER * 2;

export const Centenary: React.FC = () => {
  const frame = useCurrentFrame();
  const t = useTime();
  const inP = interpolate(frame, [0, t(16)], [0, 1], { ...CLAMP, easing: EASE.spring });
  return (
    <AbsoluteFill>
      <Breath phase={t(BASE)}>
        <PhotoPrint
          src={IMG.houdiniLincolnGhost.file}
          imgW={IMG.houdiniLincolnGhost.width}
          imgH={IMG.houdiniLincolnGhost.height}
          width={W}
          crop={rectToCrop(HALF)}
          left={LEFT + (1 - inP) * 900}
          top={TOP}
          tilt={-0.7}
          border={BORDER}
        />
        <SourceCaption text={IMG.houdiniLincolnGhost.caption} left={LEFT} top={BOTTOM + 16} opacity={inP} />
        <div style={{ position: "absolute", left: 153, top: BOTTOM + 84 }}>
          <MonoText color={COLORS.silver}>HARRY HOUDINI</MonoText>
          <div style={{ marginTop: 8 }}>
            <TypedMono typed={TYPED.centenary} sceneFrom={BASE} size={TYPE.subtitleZh} color={COLORS.printWhite} />
          </div>
        </div>
      </Breath>
    </AbsoluteFill>
  );
};
