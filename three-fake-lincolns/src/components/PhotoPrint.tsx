import React, { createContext, useContext } from "react";
import { CanvasImage, interpolate, staticFile, useCurrentFrame } from "remotion";
import { MIN_SOURCE_PER_DISPLAY } from "../assets";
import { photoGrade } from "../grade";
import { BREATH_MAX_ZOOM } from "./Breath";
import { CLAMP, COLORS, EASE } from "../theme";

// A crop window in normalised image coordinates (0..1 on both axes).
export type Crop = { readonly x0: number; readonly y0: number; readonly x1: number; readonly y1: number };
export const FULL: Crop = { x0: 0, y0: 0, x1: 1, y1: 1 };
export const rectToCrop = (r: readonly number[]): Crop => ({ x0: r[0], y0: r[1], x1: r[2], y1: r[3] });

type PrintGeometry = {
  readonly src: string;
  readonly imgW: number;
  readonly imgH: number;
  // display pixels per source pixel
  readonly scale: number;
  readonly crop: Crop;
  readonly develop: number;
  readonly colorRestore: number;
};

const PrintContext = createContext<PrintGeometry | null>(null);

export const usePrint = () => {
  const ctx = useContext(PrintContext);
  if (!ctx) {
    throw new Error("usePrint() must be used inside <PhotoPrint>");
  }
  return ctx;
};

// Image-normalised (u, v) -> pixels inside the print's visible window.
export const toWindow = (g: PrintGeometry, u: number, v: number) => ({
  x: (u - g.crop.x0) * g.imgW * g.scale,
  y: (v - g.crop.y0) * g.imgH * g.scale,
});

type Props = {
  readonly src: string;
  readonly imgW: number;
  readonly imgH: number;
  // Width of the visible image window in px; height follows from the crop's aspect ratio.
  readonly width: number;
  readonly crop?: Crop;
  readonly left: number;
  readonly top: number;
  readonly tilt?: number;
  readonly border?: number;
  readonly develop?: number;
  readonly colorRestore?: number;
  readonly lift?: number;
  // Frame (scene-local) at which a gloss highlight sweeps across the paper, e.g. as it lands.
  readonly sheenAt?: number;
  // Rounded corners for mounted cards (cartes de visite).
  readonly radius?: number;
  // Image layers (overlays, second exposures): clipped to the print's window.
  readonly layers?: React.ReactNode;
  // Annotations (pen marks): positioned in window pixels but never clipped, so a circle near the
  // edge of a photo stays whole.
  readonly children?: React.ReactNode;
  readonly style?: React.CSSProperties;
};

// A physical print on the archive table: white border, slight tilt, real cast shadow.
export const PhotoPrint: React.FC<Props> = ({
  src,
  imgW,
  imgH,
  width,
  crop = FULL,
  left,
  top,
  tilt = 0,
  border = 16,
  develop = 1,
  colorRestore = 0,
  lift = 0,
  sheenAt,
  radius = 0,
  layers,
  children,
  style,
}) => {
  const frame = useCurrentFrame();
  const scale = width / ((crop.x1 - crop.x0) * imgW);
  // Hard guard for the client's rule: never show a source pixel larger than 1/1.5 of a screen
  // pixel, counting the camera breath. Scenes size prints with fitWidth(); this catches mistakes.
  if (scale * MIN_SOURCE_PER_DISPLAY * BREATH_MAX_ZOOM > 1 + 1e-6) {
    throw new Error(`${src}: displayed at ${(scale * 100).toFixed(1)}% of source, above the 1.5x budget`);
  }
  const height = (crop.y1 - crop.y0) * imgH * scale;
  const geometry: PrintGeometry = { src, imgW, imgH, scale, crop, develop, colorRestore };
  // The lamp is above and to the left: a tight contact shadow, a key shadow down and to the right
  // that grows and softens as the print is lifted, and a wide ambient shadow.
  const shadow = [
    "0 1px 2px rgba(0,0,0,0.55)",
    `${4 + lift * 22}px ${8 + lift * 28}px ${18 + lift * 44}px rgba(0,0,0,${0.46 - lift * 0.12})`,
    "0 0 42px rgba(0,0,0,0.22)",
  ].join(", ");
  // Gloss: one diagonal highlight travels across the paper (scene-local frames), plus a soft
  // highlight while the print is lifted toward the lamp.
  const sweep = sheenAt === undefined ? -1 : interpolate(frame, [sheenAt, sheenAt + 22], [-0.5, 1.5], { ...CLAMP, easing: EASE.inOut });
  const sheenBand = sweep > -0.5 && sweep < 1.5 ? `linear-gradient(115deg, rgba(236,230,218,0) ${sweep * 100 - 18}%, rgba(236,230,218,0.22) ${sweep * 100}%, rgba(236,230,218,0) ${sweep * 100 + 18}%)` : null;

  return (
    <div
      style={{
        position: "absolute",
        left,
        top,
        padding: border,
        backgroundColor: COLORS.printWhite,
        // Paper: a faint fall-off across the sheet, away from the lamp.
        backgroundImage: "linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(14,14,16,0.09) 100%)",
        boxShadow: shadow,
        borderRadius: radius,
        rotate: `${tilt}deg`,
        ...style,
      }}
    >
      <PrintContext.Provider value={geometry}>
        <div style={{ position: "relative", width, height, overflow: "hidden", backgroundColor: COLORS.printWhite, borderRadius: Math.max(0, radius - border) }}>
          <CanvasImage
            src={staticFile(src)}
            width={Math.round(imgW * scale)}
            height={Math.round(imgH * scale)}
            fit="fill"
            style={{ position: "absolute", left: -crop.x0 * imgW * scale, top: -crop.y0 * imgH * scale }}
            effects={photoGrade({ frame, develop, colorRestore })}
          />
          {layers}
          {/* Emulsion edge: a hairline and a little edge burning, as a darkroom print has. */}
          <div style={{ position: "absolute", inset: 0, boxShadow: "inset 0 0 0 1px rgba(14,14,16,0.3), inset 0 0 22px rgba(14,14,16,0.22)", borderRadius: Math.max(0, radius - border) }} />
        </div>
        {sheenBand || lift > 0.02 ? (
          <div
            style={{
              position: "absolute",
              inset: 0,
              borderRadius: radius,
              mixBlendMode: "screen",
              pointerEvents: "none",
              backgroundImage: [sheenBand, `linear-gradient(160deg, rgba(236,230,218,${0.1 * lift}) 0%, rgba(236,230,218,0) 55%)`].filter(Boolean).join(", "),
            }}
          />
        ) : null}
        {children ? <div style={{ position: "absolute", left: border, top: border, width, height }}>{children}</div> : null}
      </PrintContext.Provider>
    </div>
  );
};
