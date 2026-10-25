import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { fitWidth, IMG, region, type ImageKey, type Rect } from "../assets";
import { Breath, BREATH_MAX_ZOOM } from "../components/Breath";
import { PhotoPrint, rectToCrop, toWindow, usePrint } from "../components/PhotoPrint";
import { ManilaTag, MonoText, PenMark } from "../components/Props";
import { SourceCaption } from "../components/SeriesChrome";
import { useTime } from "../time";
import { SCENES } from "../timeline";
import { CLAMP, COLORS, EASE, FONTS, SAFE, TYPE } from "../theme";

// Scene-local frames: 0 = 1584. Three 1864 originals land one per beat, then the 1902 composite
// made from them (F12). Each part of the composite is marked together with the original it came from.
const BASE = SCENES.grant.from;
type MarkKind = "circle" | "box" | "underline";
type Part = {
  readonly key: ImageKey;
  readonly crop: string;
  readonly width: number;
  readonly tilt: number;
  readonly at: number;
  readonly area: string;
  readonly kind: MarkKind;
  readonly part: string;
  readonly label: string;
  // LoC call number of the original (F12)
  readonly callNo: string;
};
const PARTS: readonly Part[] = [
  { key: "grantColdHarbor", crop: "photo", width: 180, tilt: -1.4, at: 0, area: "head", kind: "circle", part: "head", label: "格兰特的头", callNo: "LC-B8175-2" },
  { key: "mccookHorseback", crop: "photo", width: 270, tilt: 0.8, at: 24, area: "horseAndBody", kind: "box", part: "horseAndBody", label: "麦库克的马和身子", callNo: "LC-B817-7204" },
  { key: "confederatePrisoners", crop: "photo", width: 300, tilt: -0.5, at: 48, area: "camp", kind: "underline", part: "background", label: "战俘当背景", callNo: "LOT 4181" },
];
const MARK_AT = [96, 120, 144];
const SRC_BORDER = 8;
const GAP = 14;
const ROW_TOP = 236;
const widthOf = (p: Part) => Math.floor(fitWidth(p.key, region(p.key, p.crop), p.width, BREATH_MAX_ZOOM));
const heightOf = (key: ImageKey, crop: Rect, w: number) => Math.round((w * (crop[3] - crop[1]) * IMG[key].height) / ((crop[2] - crop[0]) * IMG[key].width));
const ROW_W = PARTS.reduce((sum, p) => sum + widthOf(p) + SRC_BORDER * 2, 0) + GAP * (PARTS.length - 1);
const ROW_LEFT = Math.round((SAFE.margin + SAFE.right) / 2 - ROW_W / 2);
const ROW_BOTTOM = ROW_TOP + Math.max(...PARTS.map((p) => heightOf(p.key, region(p.key, p.crop), widthOf(p)))) + SRC_BORDER * 2;

const MOUNT = region("grantCityPoint", "mount");
const COMP_W = Math.floor(fitWidth("grantCityPoint", MOUNT, 620, BREATH_MAX_ZOOM));
const COMP_BORDER = 12;
const COMP_LEFT = Math.round((SAFE.margin + SAFE.right) / 2 - COMP_W / 2 - COMP_BORDER);
const COMP_TOP = 560;
const COMP_AT = 72;

// A region of an image, in pixels of a print's visible window.
const RegionMark: React.FC<{ readonly k: ImageKey; readonly area: string; readonly kind: MarkKind; readonly from: number; readonly seed: number }> = ({ k, area, kind, from, seed }) => {
  const g = usePrint();
  const r = region(k, area);
  const a = toWindow(g, r[0], r[1]);
  const b = toWindow(g, r[2], r[3]);
  return <PenMark kind={kind} left={a.x} top={a.y} width={b.x - a.x} height={b.y - a.y} from={from} durationInFrames={14} seed={seed} />;
};

// Screen position of a composite region (for the labels outside the print's clip).
const compositePoint = (u: number, v: number) => {
  const scale = COMP_W / ((MOUNT[2] - MOUNT[0]) * IMG.grantCityPoint.width);
  return {
    x: COMP_LEFT + COMP_BORDER + (u - MOUNT[0]) * IMG.grantCityPoint.width * scale,
    y: COMP_TOP + COMP_BORDER + (v - MOUNT[1]) * IMG.grantCityPoint.height * scale,
  };
};

const LABEL_POS = (() => {
  const head = region("grantCityPoint", "head");
  const body = region("grantCityPoint", "horseAndBody");
  const bg = region("grantCityPoint", "background");
  const h = compositePoint(head[2], head[1]);
  const b = compositePoint(body[2], body[3]);
  const g = compositePoint(bg[0], bg[1]);
  const bodyLeft = compositePoint(body[0], body[3]).x;
  return [
    { left: h.x + 26, top: h.y - 44 },
    { left: bodyLeft, top: b.y + 8 },
    { left: g.x + 8, top: g.y - 70 },
  ];
})();

export const Grant: React.FC = () => {
  const frame = useCurrentFrame();
  const t = useTime();
  // While a part is being marked, the other two originals step back.
  const active = (i: number) =>
    interpolate(frame, [t(MARK_AT[i]), t(MARK_AT[i]) + 6, t(MARK_AT[i] + 24) - 2, t(MARK_AT[i] + 24) + 4], [0, 1, 1, i === 2 ? 1 : 0], CLAMP);
  const dimFor = (j: number) => Math.max(...PARTS.map((_, i) => (i === j ? 0 : active(i))));
  const compIn = interpolate(frame, [t(COMP_AT) - 12, t(COMP_AT)], [0, 1], { ...CLAMP, easing: EASE.out });
  let x = ROW_LEFT;
  return (
    <AbsoluteFill>
      <Breath phase={t(BASE)}>
        {PARTS.map((p, i) => {
          const w = widthOf(p);
          const left = x;
          x += w + SRC_BORDER * 2 + GAP;
          // Each original falls onto the table and lands on its beat.
          const land = interpolate(frame, [t(p.at) - 10, t(p.at)], [0, 1], { ...CLAMP, easing: EASE.out });
          return (
            <PhotoPrint
              key={p.key}
              src={IMG[p.key].file}
              imgW={IMG[p.key].width}
              imgH={IMG[p.key].height}
              width={w}
              crop={rectToCrop(region(p.key, p.crop))}
              left={left}
              top={ROW_TOP - (1 - land) * 700}
              tilt={p.tilt}
              border={SRC_BORDER}
              lift={(1 - land) * 0.8}
              style={{ filter: `brightness(${1 - 0.55 * dimFor(i)})` }}
            >
              <RegionMark k={p.key} area={p.area} kind={p.kind} from={t(MARK_AT[i])} seed={31 + i} />
            </PhotoPrint>
          );
        })}
        <SourceCaption text="LIBRARY OF CONGRESS · 1864 / CA. 1902" left={ROW_LEFT} top={ROW_BOTTOM + 16} />
        <PhotoPrint
          src={IMG.grantCityPoint.file}
          imgW={IMG.grantCityPoint.width}
          imgH={IMG.grantCityPoint.height}
          width={COMP_W}
          crop={rectToCrop(MOUNT)}
          left={COMP_LEFT}
          top={COMP_TOP + (1 - compIn) * 1400}
          tilt={0.4}
          border={COMP_BORDER}
          lift={(1 - compIn) * 0.8}
        >
          {PARTS.map((p, i) => (
            <RegionMark key={p.part} k="grantCityPoint" area={p.part} kind={p.kind} from={t(MARK_AT[i])} seed={41 + i} />
          ))}
        </PhotoPrint>
        {PARTS.map((p, i) =>
          frame >= t(MARK_AT[i]) + 6 ? (
            <ManilaTag
              key={p.label}
              left={LABEL_POS[i].left}
              top={LABEL_POS[i].top}
              height={96}
              tilt={i === 1 ? 1.2 : -1}
              style={{ flexDirection: "column", alignItems: "flex-start", justifyContent: "center", gap: 2 }}
            >
              <span style={{ fontFamily: FONTS.sansZh, fontWeight: 700, fontSize: TYPE.subtitleEn, lineHeight: 1.2, color: COLORS.ink }}>{p.label}</span>
              <MonoText style={{ opacity: 0.7 }}>{p.callNo}</MonoText>
            </ManilaTag>
          ) : null,
        )}
      </Breath>
    </AbsoluteFill>
  );
};
