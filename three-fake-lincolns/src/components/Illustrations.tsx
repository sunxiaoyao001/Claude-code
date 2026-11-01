import React from "react";
import { IMG } from "../assets";
import { COLORS } from "../theme";
import { Drawing, Ink, InkLabel, useInk } from "./LineArt";

// Content illustrations in the archivist's line style (all frames scene-local render frames).

// ---- The sitter's outline, traced from the Met photograph itself (scripts/prepare_images.py) ------
const SILHOUETTE = IMG.metSitter.silhouette ?? [];
const sitter = (left: number, top: number, size: number) =>
  SILHOUETTE.length ? `M ${SILHOUETTE.map(([u, v]) => `${(left + u * size).toFixed(1)} ${(top + v * size).toFixed(1)}`).join(" L ")} Z` : "";

// ---- A head-and-shoulders bust (unused fallback when no traced outline exists) -------------------
const bust = (cx: number, top: number, s = 1) => {
  const hx = 30 * s;
  const hy = 34 * s;
  const y = top + hy;
  const n = top + 64 * s;
  const b = top + 140 * s;
  return [
    `M ${cx - hx} ${y} A ${hx} ${hy} 0 1 1 ${cx + hx} ${y} A ${hx} ${hy} 0 1 1 ${cx - hx} ${y}`,
    `M ${cx - 14 * s} ${n} L ${cx - 14 * s} ${n + 12 * s} C ${cx - 60 * s} ${n + 20 * s} ${cx - 74 * s} ${n + 40 * s} ${cx - 78 * s} ${b}`,
    `M ${cx + 14 * s} ${n} L ${cx + 14 * s} ${n + 12 * s} C ${cx + 60 * s} ${n + 20 * s} ${cx + 74 * s} ${n + 40 * s} ${cx + 78 * s} ${b}`,
    `M ${cx - 78 * s} ${b} L ${cx + 78 * s} ${b}`,
  ].join(" ");
};

// ---- Wet-plate camera and the double exposure (darkroom schematic) --------------------------------
// The camera is drawn first; at each shutter release a bundle of rays runs from the sitter through
// the lens onto the same plate. The second exposure is the "ghost": dashed, in vermilion.
const LENS = { x: 566, y: 385 };
const PLATE_X = 806;
export const CameraDiagram: React.FC<{ readonly drawFrom: number; readonly exp1: number; readonly exp2: number }> = ({ drawFrom, exp1, exp2 }) => {
  const zig = (y0: number, y1: number, dir: 1 | -1) => {
    const pts: string[] = [];
    for (let i = 0; i <= 8; i++) {
      const x = 600 + i * 25;
      const y = y0 + ((y1 - y0) * i) / 8 + (i % 2 ? dir * 8 : 0);
      pts.push(`${i === 0 ? "M" : "L"} ${x} ${y}`);
    }
    return pts.join(" ");
  };
  const folds = Array.from({ length: 7 }, (_, i) => {
    const x = 625 + i * 25;
    const top = 340 + (-22 * (i + 1)) / 8 + (i % 2 === 0 ? -8 : 0);
    const bot = 430 + (22 * (i + 1)) / 8 + (i % 2 === 0 ? 8 : 0);
    return `M ${x} ${top} L ${x} ${bot}`;
  }).join(" ");
  const ray = (ax: number, ay: number, by: number) => `M ${ax} ${ay} L ${LENS.x} ${LENS.y} L ${PLATE_X} ${by}`;
  return (
    <Drawing>
      {/* sitter (exposure 1) and the same sitter again (exposure 2) */}
      <Ink d={SILHOUETTE.length ? sitter(110, 290, 170) : bust(200, 300)} from={drawFrom} duration={24} />
      <InkLabel x={200} y={480} text="EXP. 1" from={exp1} anchor="middle" color={COLORS.printWhite} />
      <Ink d={SILHOUETTE.length ? sitter(236, 268, 162) : bust(330, 282, 0.95)} from={exp2 - 6} duration={14} color={COLORS.vermilion} dash="7 6" opacity={0.9} />
      <InkLabel x={330} y={480} text="EXP. 2" from={exp2} anchor="middle" color={COLORS.vermilion} />
      {/* camera: lens barrel, front standard, bellows, rear standard with the plate, tripod */}
      <Ink d={`M 540 360 H 590 V 410 H 540 Z M 540 362 C 532 372 532 398 540 408`} from={drawFrom + 4} duration={14} />
      <Ink d={`M 590 336 V 434 M 600 336 V 434`} from={drawFrom + 8} duration={10} />
      <Ink d={`${zig(340, 318, -1)} ${zig(430, 452, 1)}`} from={drawFrom + 10} duration={18} opacity={0.7} />
      <Ink d={folds} from={drawFrom + 14} duration={14} opacity={0.35} width={1.5} />
      <Ink d={`M 800 312 H 842 V 458 H 800 Z M ${PLATE_X} 318 V 452`} from={drawFrom + 12} duration={14} />
      <Ink d={`M 720 452 L 650 560 M 720 452 L 790 560 M 720 452 L 720 560`} from={drawFrom + 16} duration={12} opacity={0.6} />
      <InkLabel x={842} y={300} text="PLATE" from={drawFrom + 24} anchor="end" />
      {/* rays: the image lands upside down on the plate */}
      <Ink d={`${ray(200, 300, 446)} ${ray(200, 440, 324)}`} from={exp1} duration={10} width={1.5} opacity={0.6} />
      <Ink d={`${ray(330, 282, 450)} ${ray(330, 415, 330)}`} from={exp2} duration={10} width={1.5} color={COLORS.vermilion} dash="7 6" opacity={0.9} />
    </Drawing>
  );
};

// ---- Magic lantern with its cone of light (twist) -------------------------------------------------
// The cone's two outer edges run from the lens to the far corners of the projected image (its top
// left and bottom right); the part over the image itself is masked out.
export const MagicLantern: React.FC<{ readonly from: number; readonly target: { readonly left: number; readonly top: number; readonly right: number; readonly bottom: number } }> = ({
  from,
  target,
}) => {
  const lens = { x: 330, y: 1062 };
  return (
    <Drawing>
      <mask id="lantern-cone" maskUnits="userSpaceOnUse" x={0} y={0} width={1080} height={1920}>
        <rect x={0} y={0} width={1080} height={1920} fill="white" />
        <rect x={target.left} y={target.top} width={target.right - target.left} height={target.bottom - target.top} fill="black" />
      </mask>
      <g mask="url(#lantern-cone)">
        <Ink d={`M ${lens.x} ${lens.y - 14} L ${target.left} ${target.top} M ${lens.x} ${lens.y + 14} L ${target.right} ${target.bottom}`} from={from + 14} duration={16} width={1.5} opacity={0.35} />
      </g>
      {/* body, chimney with its cap, lens tube, feet */}
      <Ink d="M 110 1030 H 262 V 1140 H 110 Z M 128 1048 H 244 V 1122 H 128 Z" from={from} duration={18} />
      <Ink d="M 166 1030 V 984 H 206 V 1030 M 156 984 H 216 L 206 966 H 166 Z" from={from + 6} duration={14} />
      <Ink d={`M 262 1050 L ${lens.x} ${lens.y - 22} L ${lens.x} ${lens.y + 22} L 262 1110`} from={from + 8} duration={12} />
      <Ink d={`M ${lens.x} ${lens.y - 22} C ${lens.x + 10} ${lens.y - 10} ${lens.x + 10} ${lens.y + 10} ${lens.x} ${lens.y + 22}`} from={from + 12} duration={8} />
      <Ink d="M 124 1140 V 1156 M 248 1140 V 1156" from={from + 12} duration={6} opacity={0.6} />
      <InkLabel x={110} y={1190} text="MAGIC LANTERN" from={from + 16} />
    </Drawing>
  );
};

// ---- A ruler of 100 years, one tick per year (centenary) ------------------------------------------
export const CenturyRuler: React.FC<{ readonly from: number; readonly duration: number; readonly left: number; readonly right: number; readonly y: number }> = ({ from, duration, left, right, y }) => {
  const p = useInk(from, duration);
  const span = right - left;
  const shown = Math.floor(p * 100 + 1e-6);
  const ticks: string[] = [];
  for (let i = 0; i <= shown; i++) {
    const x = left + (span * i) / 100;
    const h = i % 10 === 0 ? 26 : i % 5 === 0 ? 16 : 10;
    ticks.push(`M ${x} ${y} V ${y - h}`);
  }
  return (
    <Drawing>
      <Ink d={`M ${left} ${y} H ${right}`} from={from} duration={duration} width={1.5} opacity={0.7} />
      {p > 0 ? <path d={ticks.join(" ")} stroke={COLORS.printWhite} strokeWidth={1.5} opacity={0.75} fill="none" /> : null}
      <InkLabel x={left} y={y + 34} text="1926" from={from} />
      <InkLabel x={right} y={y + 34} text="2026" from={from + duration - 6} anchor="end" color={COLORS.printWhite} />
      {p >= 1 ? <circle cx={right} cy={y - 34} r={5} fill={COLORS.vermilion} /> : null}
    </Drawing>
  );
};

// ---- An engraved double-rule frame with notched corners (title card) -----------------------------
export const EngravedFrame: React.FC<{ readonly from: number; readonly x: number; readonly y: number; readonly w: number; readonly h: number }> = ({ from, x, y, w, h }) => {
  const notch = (inset: number, r: number) => {
    const x0 = x + inset;
    const y0 = y + inset;
    const x1 = x + w - inset;
    const y1 = y + h - inset;
    return [
      `M ${x0 + r} ${y0} H ${x1 - r} A ${r} ${r} 0 0 0 ${x1} ${y0 + r}`,
      `V ${y1 - r} A ${r} ${r} 0 0 0 ${x1 - r} ${y1}`,
      `H ${x0 + r} A ${r} ${r} 0 0 0 ${x0} ${y1 - r}`,
      `V ${y0 + r} A ${r} ${r} 0 0 0 ${x0 + r} ${y0}`,
    ].join(" ");
  };
  return (
    <Drawing>
      <Ink d={notch(0, 22)} from={from} duration={24} width={1.5} opacity={0.6} />
      <Ink d={notch(9, 14)} from={from + 4} duration={24} width={1} opacity={0.4} color={COLORS.silver} />
    </Drawing>
  );
};
