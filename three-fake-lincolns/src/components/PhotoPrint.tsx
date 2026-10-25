import React, { createContext, useContext } from "react";
import { CanvasImage, staticFile, useCurrentFrame } from "remotion";
import { MIN_SOURCE_PER_DISPLAY } from "../assets";
import { photoGrade } from "../grade";
import { BREATH_MAX_ZOOM } from "./Breath";
import { COLORS } from "../theme";

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
  // Lifting a print off the table lengthens and softens its shadow.
  const shadow = `0 ${6 + lift * 24}px ${14 + lift * 40}px rgba(0,0,0,${0.42 - lift * 0.1}), 0 1px 3px rgba(0,0,0,0.5)`;

  return (
    <div
      style={{
        position: "absolute",
        left,
        top,
        padding: border,
        backgroundColor: COLORS.printWhite,
        boxShadow: shadow,
        rotate: `${tilt}deg`,
        ...style,
      }}
    >
      <PrintContext.Provider value={geometry}>
        <div style={{ position: "relative", width, height, overflow: "hidden", backgroundColor: COLORS.printWhite }}>
          <CanvasImage
            src={staticFile(src)}
            width={Math.round(imgW * scale)}
            height={Math.round(imgH * scale)}
            fit="fill"
            style={{ position: "absolute", left: -crop.x0 * imgW * scale, top: -crop.y0 * imgH * scale }}
            effects={photoGrade({ frame, develop, colorRestore })}
          />
          {layers}
        </div>
        {children ? <div style={{ position: "absolute", left: border, top: border, width, height }}>{children}</div> : null}
      </PrintContext.Provider>
    </div>
  );
};
