import React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { CLAMP, COLORS, EASE } from "../theme";
import { Drawing, Ink, InkLabel, useInk } from "./LineArt";

// The engraver's sketchbook: line illustrations in the style of a 19th-century steel engraving
// (hatching, guilloché, fine double rules). Every piece draws itself on with the pen (Ink) and then
// keeps a small physical motion of its own: a timer hand turns, a flame leans, a loupe glides, a
// rosette rotates. Coordinates are canvas pixels; `from` is a scene-local render frame. Silver and
// print white only, vermilion for at most one accent per piece.

const f1 = (n: number) => n.toFixed(1);
const polyline = (pts: readonly (readonly [number, number])[]) => pts.map(([x, y], i) => `${i ? "L" : "M"}${f1(x)} ${f1(y)}`).join("");
const ellipse = (cx: number, cy: number, rx: number, ry: number, rot = 0, a0 = 0, a1 = 2 * Math.PI, n = 72) => {
  const pts: [number, number][] = [];
  const c = Math.cos(rot);
  const s = Math.sin(rot);
  for (let i = 0; i <= n; i++) {
    const a = a0 + ((a1 - a0) * i) / n;
    const x = rx * Math.cos(a);
    const y = ry * Math.sin(a);
    pts.push([cx + x * c - y * s, cy + x * s + y * c]);
  }
  return polyline(pts);
};
// Parallel hatching inside an axis-aligned box, at an angle (degrees), clipped to the box.
const hatch = (x: number, y: number, w: number, h: number, angle: number, gap: number) => {
  const t = (angle * Math.PI) / 180;
  const dx = Math.cos(t);
  const dy = Math.sin(t);
  const nx = -dy;
  const ny = dx;
  const cx = x + w / 2;
  const cy = y + h / 2;
  const reach = Math.hypot(w, h) / 2;
  const out: string[] = [];
  for (let o = -reach; o <= reach; o += gap) {
    const px = cx + nx * o;
    const py = cy + ny * o;
    // clip the infinite line px + dx*s, py + dy*s to the box
    let s0 = -Infinity;
    let s1 = Infinity;
    for (const [p, d, lo, hi] of [
      [px, dx, x, x + w],
      [py, dy, y, y + h],
    ] as const) {
      if (Math.abs(d) < 1e-9) {
        if (p < lo || p > hi) s0 = Infinity;
        continue;
      }
      const a = (lo - p) / d;
      const b = (hi - p) / d;
      s0 = Math.max(s0, Math.min(a, b));
      s1 = Math.min(s1, Math.max(a, b));
    }
    if (s1 > s0) out.push(`M${f1(px + dx * s0)} ${f1(py + dy * s0)}L${f1(px + dx * s1)} ${f1(py + dy * s1)}`);
  }
  return out.join("");
};

// ---- guilloché ---------------------------------------------------------------------------------
type Ring = readonly [count: number, r0: number, a1: number, k1: number, a2: number, k2: number, phase: number];
const rosettePath = (cx: number, cy: number, scale: number, rings: readonly Ring[]) =>
  rings
    .map(([count, r0, a1, k1, a2, k2, phase]) => {
      const paths: string[] = [];
      for (let j = 0; j < count; j++) {
        const pts: [number, number][] = [];
        for (let i = 0; i <= 540; i++) {
          const th = (i / 540) * 2 * Math.PI;
          const r = scale * (r0 + a1 * Math.sin(k1 * th + j * phase) + a2 * Math.sin(k2 * th - j * phase * 0.6));
          pts.push([cx + r * Math.cos(th), cy + r * Math.sin(th)]);
        }
        paths.push(polyline(pts));
      }
      return paths.join("");
    })
    .join("");
const ROSETTE_RINGS: readonly Ring[] = [
  [14, 100, 8, 18, 3.5, 5, 0.33],
  [10, 64, 5, 24, 2.4, 7, 0.42],
  [7, 33, 3, 12, 1.6, 4, 0.6],
];
const ROSETTE_UNIT = rosettePath(0, 0, 1, ROSETTE_RINGS);

// A banknote rosette of radius `r`, turning `turns` times over `period` frames (whole turns keep a
// loop seamless).
export const Rosette: React.FC<{ readonly cx: number; readonly cy: number; readonly r: number; readonly opacity?: number; readonly turns?: number; readonly period?: number; readonly color?: string; readonly width?: number }> = ({
  cx,
  cy,
  r,
  opacity = 0.1,
  turns = 0,
  period = 1,
  color = COLORS.silver,
  width = 1,
}) => {
  const frame = useCurrentFrame();
  const angle = (360 * turns * frame) / period;
  return (
    <g transform={`translate(${cx} ${cy}) rotate(${angle}) scale(${r / 108})`} opacity={opacity}>
      <path d={ROSETTE_UNIT} stroke={color} strokeWidth={(width * 108) / r} fill="none" />
    </g>
  );
};

// Interfering sine lines across the frame, as on the border of a banknote; the waves travel `cycles`
// times over `period` frames.
export const GuillocheBand: React.FC<{ readonly y: number; readonly lines?: number; readonly gap?: number; readonly left?: number; readonly right?: number; readonly opacity?: number; readonly cycles?: number; readonly period?: number }> = ({
  y,
  lines = 9,
  gap = 5,
  left = 60,
  right = 1020,
  opacity = 0.14,
  cycles = 3,
  period = 1,
}) => {
  const frame = useCurrentFrame();
  const ph = (2 * Math.PI * cycles * frame) / period;
  const paths: string[] = [];
  for (let j = 0; j < lines; j++) {
    const pts: [number, number][] = [];
    for (let x = left; x <= right; x += 6) {
      const u = (x - left) / (right - left);
      const yy = y + j * gap + 14 * Math.sin(u * 2 * Math.PI * 7 + ph + j * 0.38) * Math.sin(u * Math.PI) + 6 * Math.sin(u * 2 * Math.PI * 19 - ph * 2 - j * 0.7);
      pts.push([x, yy]);
    }
    paths.push(polyline(pts));
  }
  return <path d={paths.join("")} stroke={COLORS.silver} strokeWidth={0.9} fill="none" opacity={opacity} />;
};

// The film-wide pattern layer, behind everything: a large rosette turning once over the whole film in
// the empty lower third and a banknote band under the chapter bar. Both are exactly periodic over the
// film, so the last frame is the first.
export const PatternField: React.FC<{ readonly period: number }> = ({ period }) => (
  <Drawing>
    <Rosette cx={540} cy={1760} r={430} opacity={0.075} turns={1} period={period} />
    <Rosette cx={540} cy={1760} r={200} opacity={0.06} turns={-2} period={period} />
    <GuillocheBand y={1508} lines={7} gap={5} opacity={0.12} cycles={6} period={period} />
  </Drawing>
);

// ---- the engraver's tools (fake No.1 is an engraving) ---------------------------------------------
// A burin cutting hatch lines into a small copper plate, one line per few frames; the tool rides the
// end of the line it is cutting.
export const BurinPlate: React.FC<{ readonly x: number; readonly y: number; readonly from: number; readonly lines?: number }> = ({ x, y, from, lines = 14 }) => {
  const frame = useCurrentFrame();
  const W = 250;
  const H = 150;
  const per = 5;
  const cut = interpolate(frame, [from + 10, from + 10 + lines * per], [0, lines], CLAMP);
  const strokes: string[] = [];
  let tip = { x: x + 24, y: y + 24 };
  for (let i = 0; i < Math.ceil(cut); i++) {
    const p = Math.min(1, cut - i);
    const x0 = x + 26 + i * 15;
    const y0 = y + 22;
    const x1 = x0 - 36;
    const y1 = y + H - 22;
    const ex = x0 + (x1 - x0) * p;
    const ey = y0 + (y1 - y0) * p;
    strokes.push(`M${f1(x0)} ${f1(y0)}L${f1(ex)} ${f1(ey)}`);
    tip = { x: ex, y: ey };
  }
  const knob = { x: tip.x + 132, y: tip.y - 78 };
  return (
    <Drawing>
      <Ink d={`M${x} ${y}h${W}v${H}h${-W}Z M${x + 8} ${y + 8}h${W - 16}v${H - 16}h${-W + 16}Z`} from={from} duration={12} width={1.4} opacity={0.65} />
      <path d={strokes.join("")} stroke={COLORS.printWhite} strokeWidth={1.2} opacity={0.6} fill="none" />
      {frame >= from + 8 ? (
        <g opacity={0.8} stroke={COLORS.printWhite} fill="none" strokeWidth={1.6}>
          {/* the steel shaft (two lines), the ferrule, then the mushroom-shaped wooden handle with its flat cut */}
          <path d={`M${f1(tip.x)} ${f1(tip.y)}L${f1(knob.x - 40)} ${f1(knob.y + 20)} M${f1(tip.x + 4)} ${f1(tip.y + 4)}L${f1(knob.x - 36)} ${f1(knob.y + 26)}`} />
          <path d={`M${f1(knob.x - 42)} ${f1(knob.y + 16)}l10 16`} strokeWidth={4} />
          <path d={ellipse(knob.x - 6, knob.y + 6, 34, 26, -0.52, Math.PI * 0.62, Math.PI * 2.38, 40)} />
          <path d={hatch(knob.x - 26, knob.y - 14, 34, 34, 35, 5)} stroke={COLORS.silver} strokeWidth={0.7} opacity={0.6} />
        </g>
      ) : null}
      <InkLabel x={x} y={y + H + 30} text="burin · copper" from={from + 14} />
    </Drawing>
  );
};

// A quill resting in an inkwell (the 1837 speech).
export const QuillInkwell: React.FC<{ readonly x: number; readonly y: number; readonly from: number }> = ({ x, y, from }) => {
  const frame = useCurrentFrame();
  const sway = 2.5 * Math.sin(((frame - from) / 45) * Math.PI);
  const shaft = `M${x + 45} ${y - 20} C ${x + 80} ${y - 90} ${x + 120} ${y - 150} ${x + 180} ${y - 200}`;
  const barbs: string[] = [];
  for (let i = 0; i < 20; i++) {
    const u = 0.3 + (i / 20) * 0.7;
    const bx = x + 45 + 135 * u;
    const by = y - 20 - 180 * u + 14 * Math.sin(u * Math.PI);
    const len = 26 * Math.sin(u * Math.PI) + 5;
    barbs.push(`M${f1(bx)} ${f1(by)}l${f1(-len * 0.9)} ${f1(-len * 0.35)} M${f1(bx)} ${f1(by)}l${f1(len * 0.35)} ${f1(len * 0.9)}`);
  }
  return (
    <Drawing>
      <g transform={`rotate(${sway} ${x + 45} ${y - 20})`}>
        <Ink d={shaft} from={from + 8} duration={14} width={1.6} opacity={0.8} />
        <Ink d={barbs.join("")} from={from + 14} duration={16} width={0.9} opacity={0.55} color={COLORS.silver} />
      </g>
      <Ink
        d={`M${x - 10} ${y + 60} q0 -42 30 -46 h50 q30 4 30 46 q0 14 -14 14 h-82 q-14 0 -14 -14 Z M${x + 26} ${y + 14} v-18 h38 v18 ${ellipse(x + 45, y - 4, 22, 6)} ${ellipse(x + 45, y + 74, 55, 8, 0, 0, Math.PI, 24)}`}
        from={from}
        duration={14}
        width={1.5}
        opacity={0.8}
      />
      <Ink d={hatch(x - 8, y + 22, 106, 50, 60, 6)} from={from + 6} duration={10} width={0.7} opacity={0.3} color={COLORS.silver} />
    </Drawing>
  );
};

// A chain whose middle link breaks open (emancipation), the halves drifting apart.
export const BrokenChain: React.FC<{ readonly x: number; readonly y: number; readonly from: number; readonly links?: number }> = ({ x, y, from, links = 9 }) => {
  const frame = useCurrentFrame();
  const split = interpolate(frame, [from + 24, from + 44], [0, 1], { ...CLAMP, easing: EASE.out });
  const mid = Math.floor(links / 2);
  const parts: string[] = [];
  const broken: string[] = [];
  for (let i = 0; i < links; i++) {
    const side = i < mid ? -1 : i > mid ? 1 : 0;
    const cx = x + i * 52 + side * 26 * split;
    const cy = y + side * 6 * split;
    if (i === mid) {
      broken.push(ellipse(cx - 6 * split, cy, 34, 14, 0, 0.35, Math.PI - 0.35, 30), ellipse(cx + 6 * split, cy, 34, 14, 0, Math.PI + 0.35, 2 * Math.PI - 0.35, 30));
    } else if (i % 2 === 0) {
      parts.push(ellipse(cx, cy, 34, 14));
    } else {
      parts.push(`M${f1(cx - 30)} ${f1(cy)}L${f1(cx + 30)} ${f1(cy)}`, ellipse(cx, cy, 32, 5));
    }
  }
  return (
    <Drawing>
      <Ink d={parts.join("")} from={from} duration={20} width={1.6} opacity={0.75} />
      <Ink d={broken.join("")} from={from + 10} duration={12} width={1.8} opacity={0.95} color={COLORS.vermilion} />
    </Drawing>
  );
};

// A reading loupe gliding along a path of points (frames `from`..`to`).
export const Loupe: React.FC<{ readonly path: readonly (readonly [number, number])[]; readonly from: number; readonly to: number; readonly r?: number }> = ({ path, from, to, r = 64 }) => {
  const frame = useCurrentFrame();
  const draw = useInk(from, 12);
  if (draw <= 0) return null;
  const u = interpolate(frame, [from, to], [0, path.length - 1], { ...CLAMP, easing: EASE.inOut });
  const i = Math.min(path.length - 2, Math.floor(u));
  const k = u - i;
  const cx = path[i][0] + (path[i + 1][0] - path[i][0]) * k;
  const cy = path[i][1] + (path[i + 1][1] - path[i][1]) * k;
  return (
    <Drawing>
      <g opacity={0.85 * draw} fill="none" stroke={COLORS.printWhite}>
        <circle cx={cx} cy={cy} r={r} strokeWidth={3} />
        <circle cx={cx} cy={cy} r={r - 9} strokeWidth={1} opacity={0.6} />
        <path d={ellipse(cx - r * 0.35, cy - r * 0.35, r * 0.32, r * 0.12, -0.8, 0.2, 2.2, 20)} strokeWidth={1.2} opacity={0.6} />
        <path d={`M${f1(cx + r * 0.7)} ${f1(cy + r * 0.7)}l${r * 0.9} ${r * 0.9}`} strokeWidth={9} strokeLinecap="round" />
        <path d={`M${f1(cx + r * 0.7)} ${f1(cy + r * 0.7)}l${r * 0.9} ${r * 0.9}`} strokeWidth={4} stroke={COLORS.ink} strokeLinecap="round" />
      </g>
    </Drawing>
  );
};

// ---- the portrait studio and the darkroom --------------------------------------------------------
// A posing stand: the iron head-rest that held sitters still through a long exposure.
export const PosingStand: React.FC<{ readonly x: number; readonly y: number; readonly from: number; readonly h?: number }> = ({ x, y, from, h = 420 }) => (
  <Drawing>
    <Ink d={`M${x} ${y} V${y - h} M${x - 70} ${y + 30} L${x} ${y} L${x + 70} ${y + 30} M${x} ${y} V${y + 36}`} from={from} duration={16} width={2} opacity={0.75} />
    <Ink d={`M${x - 44} ${y - h + 10} Q ${x - 50} ${y - h - 40} ${x} ${y - h - 44} Q ${x + 50} ${y - h - 40} ${x + 44} ${y - h + 10}`} from={from + 10} duration={12} width={2} opacity={0.75} />
    <Ink d={`${ellipse(x, y - h * 0.45, 9, 9)} M${x + 9} ${y - h * 0.45} h26`} from={from + 16} duration={8} width={1.4} opacity={0.6} />
    <Ink d={hatch(x - 4, y - h, 8, h, 90, 3)} from={from + 8} duration={10} width={0.6} opacity={0.3} color={COLORS.silver} />
    <InkLabel x={x} y={y + 74} text="head rest" from={from + 20} anchor="middle" />
  </Drawing>
);

// The darkroom safelight hanging from the ceiling, its light hatched as an engraver would draw it.
export const Safelight: React.FC<{ readonly x: number; readonly y: number; readonly from: number; readonly cordTop?: number }> = ({ x, y, from, cordTop = 0 }) => {
  const frame = useCurrentFrame();
  const swing = 2 * Math.sin(((frame - from) / 70) * Math.PI);
  const rays: string[] = [];
  for (let i = -6; i <= 6; i++) {
    rays.push(`M${x + i * 6} ${y + 46} L${x + i * 30} ${y + 230}`);
  }
  return (
    <Drawing>
      <g transform={`rotate(${swing} ${x} ${cordTop})`}>
        <Ink d={`M${x} ${cordTop} V${y} ${ellipse(x, cordTop, 10, 4)}`} from={from} duration={8} width={1.2} opacity={0.6} />
        <Ink d={`M${x - 16} ${y} h32 l34 40 h-100 Z`} from={from + 6} duration={10} width={1.8} opacity={0.85} />
        <Ink d={ellipse(x, y + 46, 22, 10, 0, 0, Math.PI, 20)} from={from + 12} duration={6} width={2.2} opacity={1} color={COLORS.vermilion} />
        <Ink d={rays.join("")} from={from + 14} duration={14} width={0.8} opacity={0.32} color={COLORS.vermilion} dash="3 9" />
      </g>
    </Drawing>
  );
};

// A darkroom timer: 60 ticks, a hand sweeping round while the print develops, the elapsed time
// filled in vermilion.
export const DarkroomTimer: React.FC<{ readonly x: number; readonly y: number; readonly r?: number; readonly from: number; readonly runFrom: number; readonly runTo: number }> = ({ x, y, r = 78, from, runFrom, runTo }) => {
  const frame = useCurrentFrame();
  const p = interpolate(frame, [runFrom, runTo], [0, 1], CLAMP);
  const a = -Math.PI / 2 + p * 2 * Math.PI;
  const ticks: string[] = [];
  for (let i = 0; i < 60; i++) {
    const t = (i / 60) * 2 * Math.PI;
    const l = i % 5 === 0 ? 12 : 5;
    ticks.push(`M${f1(x + (r - 4) * Math.cos(t))} ${f1(y + (r - 4) * Math.sin(t))}L${f1(x + (r - 4 - l) * Math.cos(t))} ${f1(y + (r - 4 - l) * Math.sin(t))}`);
  }
  const arc = p > 0.002 ? `M${x} ${y - (r - 26)} A ${r - 26} ${r - 26} 0 ${p > 0.5 ? 1 : 0} 1 ${f1(x + (r - 26) * Math.cos(a))} ${f1(y + (r - 26) * Math.sin(a))}` : "";
  const draw = useInk(from + 14, 6);
  return (
    <Drawing>
      <Ink d={`${ellipse(x, y, r, r)} ${ellipse(x, y, r + 8, r + 8)} M${x - 14} ${y - r - 8} h28 v-14 h-28 Z`} from={from} duration={16} width={1.6} opacity={0.8} />
      <Ink d={ticks.join("")} from={from + 6} duration={14} width={1.2} opacity={0.65} />
      {draw > 0 ? (
        <g opacity={draw}>
          {arc ? <path d={arc} stroke={COLORS.vermilion} strokeWidth={8} fill="none" opacity={0.75} /> : null}
          <path d={`M${x} ${y} L${f1(x + (r - 18) * Math.cos(a))} ${f1(y + (r - 18) * Math.sin(a))}`} stroke={COLORS.printWhite} strokeWidth={2.4} strokeLinecap="round" />
          <circle cx={x} cy={y} r={4} fill={COLORS.printWhite} />
        </g>
      ) : null}
      <InkLabel x={x} y={y + r + 44} text="develop" from={from + 16} anchor="middle" />
    </Drawing>
  );
};

// Two chemist's bottles, labelled.
export const ChemicalBottles: React.FC<{ readonly x: number; readonly y: number; readonly from: number }> = ({ x, y, from }) => {
  const bottle = (bx: number, h: number) =>
    `M${bx - 16} ${y - h} h32 v18 q30 10 30 46 v${h - 64} q0 6 -6 6 h-80 q-6 0 -6 -6 v${-(h - 64)} q0 -36 30 -46 Z`;
  return (
    <Drawing>
      <Ink d={`${bottle(x, 170)} ${bottle(x + 120, 140)}`} from={from} duration={18} width={1.6} opacity={0.75} />
      <Ink d={`${hatch(x - 42, y - 96, 26, 92, 90, 4)} ${hatch(x + 78, y - 70, 26, 66, 90, 4)}`} from={from + 10} duration={12} width={0.7} opacity={0.35} color={COLORS.silver} />
      <Ink d={`M${x - 26} ${y - 70} h52 v34 h-52 Z M${x + 94} ${y - 56} h52 v30 h-52 Z`} from={from + 12} duration={10} width={1.1} opacity={0.7} />
      <InkLabel x={x} y={y - 46} text="dev" from={from + 18} anchor="middle" color={COLORS.printWhite} />
      <InkLabel x={x + 120} y={y - 34} text="fix" from={from + 20} anchor="middle" color={COLORS.printWhite} />
    </Drawing>
  );
};

// ---- the trial ----------------------------------------------------------------------------------
// The scales of justice: they draw on tipped, then settle level with a damped swing.
export const Scales: React.FC<{ readonly x: number; readonly y: number; readonly from: number; readonly settleAt: number }> = ({ x, y, from, settleAt }) => {
  const frame = useCurrentFrame();
  const t = Math.max(0, frame - settleAt);
  const tilt = frame < settleAt ? 9 : 9 * Math.exp(-t / 14) * Math.cos(t / 4.2);
  const rad = (tilt * Math.PI) / 180;
  const arm = 190;
  const end = (s: number) => ({ x: x + s * arm * Math.cos(rad), y: y - 210 + s * arm * Math.sin(rad) });
  const L = end(-1);
  const R = end(1);
  const pan = (p: { x: number; y: number }) => `M${f1(p.x)} ${f1(p.y)} L${f1(p.x - 56)} ${f1(p.y + 120)} M${f1(p.x)} ${f1(p.y)} L${f1(p.x + 56)} ${f1(p.y + 120)} ${ellipse(p.x, p.y + 120, 64, 12, 0, 0, Math.PI, 24)} M${f1(p.x - 64)} ${f1(p.y + 120)} h128`;
  return (
    <Drawing>
      <Ink d={`M${x} ${y} V${y - 236} M${x - 80} ${y} h160 M${x - 54} ${y - 12} h108 ${ellipse(x, y - 246, 10, 10)}`} from={from} duration={16} width={2} opacity={0.8} />
      <Ink d={`M${f1(L.x)} ${f1(L.y)} L${f1(R.x)} ${f1(R.y)}`} from={from + 8} duration={10} width={2.4} opacity={0.85} />
      <Ink d={`${pan(L)} ${pan(R)}`} from={from + 14} duration={14} width={1.4} opacity={0.7} />
      <Ink d={hatch(x - 6, y - 230, 12, 226, 90, 3)} from={from + 10} duration={10} width={0.6} opacity={0.3} color={COLORS.silver} />
    </Drawing>
  );
};

// A courthouse front: pediment and fluted columns, faint, behind the case card.
export const Courthouse: React.FC<{ readonly x: number; readonly y: number; readonly w: number; readonly from: number }> = ({ x, y, w, from }) => {
  const cols = 6;
  const h = 300;
  const parts: string[] = [`M${x} ${y - h - 20} L${x + w / 2} ${y - h - 110} L${x + w} ${y - h - 20} Z M${x - 10} ${y - h - 20} h${w + 20} v14 h${-w - 20} Z`, `M${x - 20} ${y} h${w + 40} M${x - 10} ${y - 10} h${w + 20}`];
  const flutes: string[] = [];
  for (let i = 0; i < cols; i++) {
    const cx = x + 30 + (i * (w - 60)) / (cols - 1);
    parts.push(`M${f1(cx - 18)} ${y - 10} V${y - h - 6} M${f1(cx + 18)} ${y - 10} V${y - h - 6} M${f1(cx - 24)} ${y - h - 6} h48`);
    for (let k = -2; k <= 2; k++) flutes.push(`M${f1(cx + k * 6)} ${y - 16} V${y - h}`);
  }
  return (
    <Drawing>
      <Ink d={parts.join("")} from={from} duration={22} width={1.3} opacity={0.4} />
      <Ink d={flutes.join("")} from={from + 10} duration={16} width={0.6} opacity={0.25} color={COLORS.silver} />
    </Drawing>
  );
};

// A field camera on its tripod: box, bellows, brass lens.
export const PlateCamera: React.FC<{ readonly x: number; readonly y: number; readonly from: number; readonly legs?: number }> = ({ x, y, from, legs = 230 }) => {
  const bellows: string[] = [];
  for (let i = 0; i < 7; i++) {
    const bx = x + 70 + i * 14;
    bellows.push(`M${bx} ${y - 58 + i * 3} L${bx + 7} ${y - 50 + i * 3} L${bx + 14} ${y - 58 + i * 3} M${bx} ${y + 58 - i * 3} L${bx + 7} ${y + 50 - i * 3} L${bx + 14} ${y + 58 - i * 3}`);
  }
  return (
    <Drawing>
      <Ink d={`M${x} ${y - 70} h70 v140 h-70 Z M${x + 168} ${y - 38} h30 v76 h-30 Z M${x + 198} ${y - 18} h34 v36 h-34 Z`} from={from} duration={16} width={1.7} opacity={0.8} />
      <Ink d={bellows.join("")} from={from + 8} duration={14} width={1.1} opacity={0.6} />
      <Ink d={`M${x + 100} ${y + 72} L${x + 40} ${y + 72 + legs} M${x + 110} ${y + 72} V${y + 82 + legs} M${x + 120} ${y + 72} L${x + 190} ${y + 72 + legs}`} from={from + 12} duration={14} width={1.5} opacity={0.7} />
      <Ink d={hatch(x + 4, y - 66, 62, 132, 45, 8)} from={from + 14} duration={10} width={0.6} opacity={0.3} color={COLORS.silver} />
    </Drawing>
  );
};

// ---- cut and paste (the Grant composite) ---------------------------------------------------------
export const ScissorsPaste: React.FC<{ readonly x: number; readonly y: number; readonly from: number }> = ({ x, y, from }) => {
  const frame = useCurrentFrame();
  const snip = 10 * Math.abs(Math.sin(((frame - from) / 9) * Math.PI)) * (frame > from + 16 ? 1 : 0);
  const blade = (s: number) => `M${x} ${y} L${x + 170} ${y + s * 10} M${x} ${y} ${ellipse(x - 44, y - s * 26, 26, 16, s * 0.4)}`;
  return (
    <Drawing>
      <g transform={`rotate(${-snip} ${x} ${y})`}>
        <Ink d={blade(-1)} from={from} duration={14} width={1.8} opacity={0.8} />
      </g>
      <g transform={`rotate(${snip} ${x} ${y})`}>
        <Ink d={blade(1)} from={from + 4} duration={14} width={1.8} opacity={0.8} />
      </g>
      <Ink d={ellipse(x, y, 5, 5)} from={from + 10} duration={4} width={1.5} opacity={0.8} />
      <Ink d={`M${x + 250} ${y + 30} h90 v-74 q0 -10 -10 -10 h-70 q-10 0 -10 10 Z ${ellipse(x + 295, y - 54, 45, 9)} M${x + 300} ${y - 54} L${x + 340} ${y - 160}`} from={from + 10} duration={16} width={1.5} opacity={0.75} />
      <Ink d={hatch(x + 252, y - 40, 86, 66, 120, 6)} from={from + 16} duration={10} width={0.6} opacity={0.3} color={COLORS.silver} />
      <InkLabel x={x + 295} y={y + 66} text="paste" from={from + 20} anchor="middle" />
    </Drawing>
  );
};

// ---- the stage (the twist) ------------------------------------------------------------------------
// A theatre proscenium framing the projection: a scalloped valance, tasselled curtains drawn back
// on both sides, their folds breathing.
export const Proscenium: React.FC<{ readonly left: number; readonly top: number; readonly right: number; readonly bottom: number; readonly from: number }> = ({ left, top, right, bottom, from }) => {
  const frame = useCurrentFrame();
  const breathe = Math.sin(((frame - from) / 60) * Math.PI);
  const swags: string[] = [];
  const n = 6;
  const w = (right - left + 120) / n;
  for (let i = 0; i < n; i++) {
    const x0 = left - 60 + i * w;
    swags.push(`M${f1(x0)} ${top - 40} Q ${f1(x0 + w / 2)} ${top + 26} ${f1(x0 + w)} ${top - 40}`);
    swags.push(`M${f1(x0 + 8)} ${top - 40} Q ${f1(x0 + w / 2)} ${top + 10} ${f1(x0 + w - 8)} ${top - 40}`);
  }
  const curtain = (side: -1 | 1) => {
    const edge = side < 0 ? left - 70 : right + 70;
    const out: string[] = [];
    for (let k = 0; k < 5; k++) {
      const x0 = edge + side * k * 14;
      const bulge = side * (24 + 6 * breathe) * (1 - k * 0.12);
      out.push(`M${f1(x0)} ${top - 40} C ${f1(x0 - bulge)} ${f1(top + (bottom - top) * 0.3)} ${f1(x0 + bulge * 1.6)} ${f1(top + (bottom - top) * 0.6)} ${f1(x0 + side * 10)} ${bottom + 120}`);
    }
    const tie = top + (bottom - top) * 0.62;
    out.push(`M${f1(edge - side * 6)} ${f1(tie)} q ${side * 40} 10 ${side * 70} -4`);
    out.push(`${ellipse(edge + side * 70, tie + 14, 8, 8)} M${edge + side * 70} ${f1(tie + 22)} v34 M${edge + side * 64} ${f1(tie + 56)} h12`);
    return out.join("");
  };
  return (
    <Drawing>
      <Ink d={swags.join("")} from={from} duration={18} width={1.5} opacity={0.6} />
      <Ink d={`M${left - 90} ${top - 44} h${right - left + 180}`} from={from} duration={14} width={2.2} opacity={0.7} />
      <Ink d={curtain(-1)} from={from + 6} duration={20} width={1.2} opacity={0.55} />
      <Ink d={curtain(1)} from={from + 6} duration={20} width={1.2} opacity={0.55} />
    </Drawing>
  );
};

// ---- Rosabelle --------------------------------------------------------------------------------------
// An engraved rose on a long stem, the bloom turning slowly open.
export const Rose: React.FC<{ readonly x: number; readonly y: number; readonly from: number; readonly s?: number }> = ({ x, y, from, s = 1 }) => {
  const frame = useCurrentFrame();
  const open = interpolate(frame, [from + 10, from + 60], [0.85, 1.05], { ...CLAMP, easing: EASE.inOut });
  const spiral: [number, number][] = [];
  for (let i = 0; i <= 120; i++) {
    const th = (i / 120) * 4 * Math.PI;
    const r = s * (2 + 1.3 * th) * open;
    spiral.push([x + r * Math.cos(th), y + r * Math.sin(th) * 0.85]);
  }
  // three rings of petals, each a scalloped closed curve, slightly offset like a bloom seen from
  // above and to the side
  const ringPath = (R: number, lobes: number, depth: number, rot: number, dy: number) => {
    const pts: [number, number][] = [];
    for (let i = 0; i <= 240; i++) {
      const th = (i / 240) * 2 * Math.PI;
      const r = s * open * R * (1 + depth * Math.abs(Math.cos((lobes * (th + rot)) / 2)) - depth);
      pts.push([x + r * Math.cos(th), y + dy * s + r * Math.sin(th) * 0.82]);
    }
    return polyline(pts);
  };
  const petals = [ringPath(28, 3, 0.22, 0.4, 2), ringPath(46, 5, 0.2, 0.1, 5), ringPath(66, 6, 0.18, 0.7, 9)];
  const stem = `M${x} ${y + 62 * s} C ${x + 20 * s} ${y + 160 * s} ${x - 30 * s} ${y + 240 * s} ${x - 10 * s} ${y + 340 * s}`;
  const leaf = (lx: number, ly: number, rot: number) => `${ellipse(lx, ly, 34 * s, 12 * s, rot)} M${f1(lx - 34 * s * Math.cos(rot))} ${f1(ly - 34 * s * Math.sin(rot))} L${f1(lx + 34 * s * Math.cos(rot))} ${f1(ly + 34 * s * Math.sin(rot))}`;
  return (
    <Drawing>
      <Ink d={polyline(spiral)} from={from} duration={22} width={1.3} opacity={0.75} />
      <Ink d={petals.join("")} from={from + 10} duration={20} width={1.2} opacity={0.6} />
      <Ink d={`${stem} ${leaf(x + 34 * s, y + 170 * s, -0.5)} ${leaf(x - 40 * s, y + 250 * s, 0.6)}`} from={from + 16} duration={18} width={1.3} opacity={0.65} />
    </Drawing>
  );
};

// ---- the séances ------------------------------------------------------------------------------------
// A candle in a holder; the flame leans and straightens (its shape moves, its brightness never does).
export const Candle: React.FC<{ readonly x: number; readonly y: number; readonly from: number; readonly h?: number; readonly seed?: number }> = ({ x, y, from, h = 130, seed = 0 }) => {
  const frame = useCurrentFrame();
  const lean = 7 * Math.sin((frame + seed * 17) / 11) + 3 * Math.sin((frame + seed * 5) / 4.3);
  const top = y - h;
  const flame = `M${x} ${top - 8} C ${x - 14} ${top - 22} ${f1(x - 8 + lean * 0.4)} ${top - 46} ${f1(x + lean)} ${top - 66} C ${f1(x + 10 + lean * 0.4)} ${top - 44} ${x + 14} ${top - 22} ${x} ${top - 8} Z`;
  return (
    <Drawing>
      <Ink d={`M${x - 20} ${y} V${top} q 6 -6 20 -4 q 14 -2 20 4 V${y} M${x - 20} ${top + 10} q -4 18 2 30`} from={from} duration={14} width={1.6} opacity={0.8} />
      <Ink d={`${ellipse(x, y + 8, 64, 12)} ${ellipse(x + 76, y + 2, 14, 10)} M${x} ${top - 2} v-8`} from={from + 6} duration={12} width={1.4} opacity={0.7} />
      <Ink d={hatch(x - 18, top + 4, 14, h - 8, 90, 3.5)} from={from + 10} duration={10} width={0.6} opacity={0.3} color={COLORS.silver} />
      {frame >= from + 12 ? <path d={flame} stroke={COLORS.printWhite} strokeWidth={1.6} fill={COLORS.printWhite} fillOpacity={0.12} opacity={0.9} /> : null}
    </Drawing>
  );
};

export const Crescent: React.FC<{ readonly x: number; readonly y: number; readonly r: number; readonly from: number }> = ({ x, y, r, from }) => (
  <Drawing>
    <Ink d={`${ellipse(x, y, r, r, 0, 0.9, 2 * Math.PI - 0.9 + 2 * Math.PI * 0, 60)} ${ellipse(x + r * 0.42, y - r * 0.12, r * 0.8, r * 0.8, 0, 1.25, 2 * Math.PI - 1.25, 50)}`} from={from} duration={20} width={1.6} opacity={0.7} />
    <Ink d={hatch(x - r, y - r, r * 0.9, 2 * r, 30, 6)} from={from + 10} duration={12} width={0.6} opacity={0.18} color={COLORS.silver} />
  </Drawing>
);

// ---- the centenary ----------------------------------------------------------------------------------
// A pocket watch whose hands race round while a hundred years go by.
export const PocketWatch: React.FC<{ readonly x: number; readonly y: number; readonly r?: number; readonly from: number; readonly runFrom: number; readonly runTo: number }> = ({ x, y, r = 92, from, runFrom, runTo }) => {
  const frame = useCurrentFrame();
  const p = interpolate(frame, [runFrom, runTo], [0, 1], { ...CLAMP, easing: EASE.inOut });
  const minute = -Math.PI / 2 + p * 2 * Math.PI * 12;
  const hour = -Math.PI / 2 + p * 2 * Math.PI;
  const ticks: string[] = [];
  for (let i = 0; i < 12; i++) {
    const t = (i / 12) * 2 * Math.PI;
    ticks.push(`M${f1(x + (r - 10) * Math.cos(t))} ${f1(y + (r - 10) * Math.sin(t))}L${f1(x + (r - 24) * Math.cos(t))} ${f1(y + (r - 24) * Math.sin(t))}`);
  }
  const draw = useInk(from + 16, 6);
  return (
    <Drawing>
      <Ink d={`${ellipse(x, y, r, r)} ${ellipse(x, y, r + 10, r + 10)} M${x - 12} ${y - r - 10} h24 v-16 h-24 Z ${ellipse(x, y - r - 46, 20, 20)}`} from={from} duration={18} width={1.7} opacity={0.8} />
      <Ink d={ticks.join("")} from={from + 8} duration={12} width={1.8} opacity={0.75} />
      <Ink d={ellipse(x, y + r * 0.45, r * 0.2, r * 0.2)} from={from + 10} duration={10} width={1} opacity={0.5} />
      {draw > 0 ? (
        <g opacity={draw} stroke={COLORS.printWhite} strokeLinecap="round">
          <path d={`M${x} ${y} L${f1(x + (r - 30) * Math.cos(minute))} ${f1(y + (r - 30) * Math.sin(minute))}`} strokeWidth={2} />
          <path d={`M${x} ${y} L${f1(x + (r - 52) * Math.cos(hour))} ${f1(y + (r - 52) * Math.sin(hour))}`} strokeWidth={3.4} />
          <circle cx={x} cy={y} r={4} fill={COLORS.vermilion} stroke="none" />
        </g>
      ) : null}
    </Drawing>
  );
};

// ---- ornament -----------------------------------------------------------------------------------------
// A laurel spray along a gentle arc (golden line, credits).
export const Laurel: React.FC<{ readonly x: number; readonly y: number; readonly len: number; readonly from: number; readonly flip?: boolean }> = ({ x, y, len, from, flip = false }) => {
  const s = flip ? -1 : 1;
  const leaves: string[] = [];
  const stemPts: [number, number][] = [];
  for (let i = 0; i <= 40; i++) {
    const u = i / 40;
    stemPts.push([x + s * len * u, y - 60 * Math.sin(u * Math.PI * 0.9)]);
  }
  for (let i = 1; i < 12; i++) {
    const u = i / 12;
    const px = x + s * len * u;
    const py = y - 60 * Math.sin(u * Math.PI * 0.9);
    const size = 22 * (1 - u * 0.5);
    leaves.push(ellipse(px + s * size * 0.6, py - size * 0.7, size, size * 0.38, s * -0.9));
    leaves.push(ellipse(px + s * size * 0.6, py + size * 0.7, size, size * 0.38, s * 0.9));
  }
  return (
    <Drawing>
      <Ink d={polyline(stemPts)} from={from} duration={16} width={1.3} opacity={0.6} />
      <Ink d={leaves.join("")} from={from + 6} duration={22} width={1} opacity={0.5} />
    </Drawing>
  );
};
