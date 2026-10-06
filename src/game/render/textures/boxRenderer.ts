import { ISO_H, ISO_W, ISO_Z } from '../iso';
import { rgbStr, type RGB } from '../palette';

/**
 * Tiny software renderer for "voxel diorama" sprites: oriented boxes and
 * ellipsoids are projected with the game's isometric projection, back-face
 * culled, depth sorted and Lambert shaded onto a Canvas2D context.
 * Everything visual in the game (soldiers, tanks, walls, props) is built from it.
 */

export type V3 = [number, number, number];

export interface FaceDetail {
  (ctx: CanvasRenderingContext2D, face: FaceInfo): void;
}

export interface FaceInfo {
  /** 0:+x 1:-x 2:+y 3:-y 4:+z 5:-z (in primitive-local axes). */
  index: number;
  /** Screen quad corners (u,v): (0,0) (1,0) (1,1) (0,1). */
  pts: [number, number][];
  /** Shaded base colour for this face. */
  color: RGB;
  /** Lighting factor applied. */
  light: number;
  /** Map face-local (u, v) in [0,1] to screen coordinates. */
  map: (u: number, v: number) => [number, number];
}

export interface Prim {
  kind: 'box' | 'ell';
  c: V3;
  h: V3;
  yaw?: number;
  pitch?: number;
  roll?: number;
  pivot?: V3;
  color: RGB;
  /** Per-face colour override (index as in FaceInfo). */
  faceColor?: Partial<Record<number, RGB>>;
  detail?: FaceDetail;
  /** Skip edge strokes (soft things like cloth). */
  noEdge?: boolean;
  /** Extra brightness multiplier. */
  glow?: number;
  alpha?: number;
}

export interface RenderOpts {
  yaw: number;
  /** Texture resolution multiplier. */
  scale: number;
  /** Screen position of the model origin inside the canvas. */
  ox: number;
  oy: number;
  ambient?: number;
  edge?: number;
}

const V = normalize([1, 1, ISO_W / ISO_Z]);
// light from the screen's upper-left
const L = normalize([-0.25, 0.65, 0.9]);

function normalize(v: V3): V3 {
  const l = Math.hypot(v[0], v[1], v[2]) || 1;
  return [v[0] / l, v[1] / l, v[2] / l];
}

function rot(p: V3, yaw: number, pitch: number, roll: number): V3 {
  let [x, y, z] = p;
  if (roll) {
    const c = Math.cos(roll);
    const s = Math.sin(roll);
    const y2 = y * c - z * s;
    z = y * s + z * c;
    y = y2;
  }
  if (pitch) {
    // positive pitch tips the +x end downward
    const c = Math.cos(pitch);
    const s = Math.sin(pitch);
    const x2 = x * c + z * s;
    z = -x * s + z * c;
    x = x2;
  }
  if (yaw) {
    const c = Math.cos(yaw);
    const s = Math.sin(yaw);
    const x2 = x * c - y * s;
    y = x * s + y * c;
    x = x2;
  }
  return [x, y, z];
}

const FACES: { idx: number[]; n: V3 }[] = [
  { idx: [1, 3, 7, 5], n: [1, 0, 0] },
  { idx: [2, 0, 4, 6], n: [-1, 0, 0] },
  { idx: [3, 2, 6, 7], n: [0, 1, 0] },
  { idx: [0, 1, 5, 4], n: [0, -1, 0] },
  { idx: [4, 5, 7, 6], n: [0, 0, 1] },
  { idx: [0, 2, 3, 1], n: [0, 0, -1] },
];

interface DrawItem {
  depth: number;
  draw: () => void;
}

const dot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

export function project(p: V3, o: RenderOpts): [number, number] {
  return [(p[0] - p[1]) * ISO_W * o.scale + o.ox, ((p[0] + p[1]) * ISO_H - p[2] * ISO_Z) * o.scale + o.oy];
}

export function lightFactor(n: V3, ambient = 0.5) {
  return ambient + (1 - ambient) * Math.max(0, dot(n, L)) * 1.12;
}

function toWorld(prim: Prim, local: V3, o: RenderOpts): V3 {
  const pv = prim.pivot ?? prim.c;
  const rel: V3 = [local[0] + prim.c[0] - pv[0], local[1] + prim.c[1] - pv[1], local[2] + prim.c[2] - pv[2]];
  const r = rot(rel, prim.yaw ?? 0, prim.pitch ?? 0, prim.roll ?? 0);
  const m: V3 = [r[0] + pv[0], r[1] + pv[1], r[2] + pv[2]];
  return rot(m, o.yaw, 0, 0);
}

function boxItems(ctx: CanvasRenderingContext2D, prim: Prim, o: RenderOpts, out: DrawItem[]) {
  const [hx, hy, hz] = prim.h;
  const corners: V3[] = [];
  for (let i = 0; i < 8; i++) {
    corners.push(toWorld(prim, [i & 1 ? hx : -hx, i & 2 ? hy : -hy, i & 4 ? hz : -hz], o));
  }
  const scr = corners.map((c) => project(c, o));
  const ambient = o.ambient ?? 0.5;
  FACES.forEach((f, fi) => {
    const nl = rot(rot(f.n, prim.yaw ?? 0, prim.pitch ?? 0, prim.roll ?? 0), o.yaw, 0, 0);
    if (dot(nl, V) <= 1e-4) return;
    const cen = f.idx.reduce<V3>((a, i) => [a[0] + corners[i][0] / 4, a[1] + corners[i][1] / 4, a[2] + corners[i][2] / 4], [0, 0, 0]);
    const light = lightFactor(nl, ambient) * (prim.glow ?? 1);
    const base = prim.faceColor?.[fi] ?? prim.color;
    const col: RGB = [base[0] * light, base[1] * light, base[2] * light];
    const pts = f.idx.map((i) => scr[i]) as [number, number][];
    out.push({
      depth: dot(cen, V),
      draw: () => {
        ctx.globalAlpha = prim.alpha ?? 1;
        ctx.beginPath();
        ctx.moveTo(pts[0][0], pts[0][1]);
        for (let k = 1; k < 4; k++) ctx.lineTo(pts[k][0], pts[k][1]);
        ctx.closePath();
        ctx.fillStyle = rgbStr(col);
        ctx.fill();
        if (prim.detail) {
          const map = (u: number, v: number): [number, number] => {
            const ax = pts[0][0] + (pts[1][0] - pts[0][0]) * u;
            const ay = pts[0][1] + (pts[1][1] - pts[0][1]) * u;
            const bx = pts[3][0] + (pts[2][0] - pts[3][0]) * u;
            const by = pts[3][1] + (pts[2][1] - pts[3][1]) * u;
            return [ax + (bx - ax) * v, ay + (by - ay) * v];
          };
          ctx.save();
          ctx.clip();
          prim.detail(ctx, { index: fi, pts, color: col, light, map });
          ctx.restore();
        }
        if (!prim.noEdge && (o.edge ?? 1) > 0) {
          ctx.strokeStyle = rgbStr([col[0] * 0.72, col[1] * 0.72, col[2] * 0.72]);
          ctx.lineWidth = 0.6 * (o.edge ?? 1) * Math.max(1, o.scale * 0.6);
          ctx.lineJoin = 'round';
          ctx.stroke();
        }
        ctx.globalAlpha = 1;
      },
    });
  });
}

function ellItems(ctx: CanvasRenderingContext2D, prim: Prim, o: RenderOpts, out: DrawItem[]) {
  const c = toWorld(prim, [0, 0, 0], o);
  const [sx, sy] = project(c, o);
  const r = Math.max(prim.h[0], prim.h[1]);
  const rx = r * ISO_W * Math.SQRT2 * o.scale;
  const ry = Math.hypot(r * ISO_H * Math.SQRT2, prim.h[2] * ISO_Z) * o.scale;
  const base = prim.color;
  const g = prim.glow ?? 1;
  out.push({
    depth: dot(c, V),
    draw: () => {
      ctx.globalAlpha = prim.alpha ?? 1;
      const grad = ctx.createRadialGradient(sx - rx * 0.35, sy - ry * 0.4, rx * 0.1, sx, sy, Math.max(rx, ry) * 1.05);
      grad.addColorStop(0, rgbStr([Math.min(255, base[0] * 1.25 * g), Math.min(255, base[1] * 1.25 * g), Math.min(255, base[2] * 1.25 * g)]));
      grad.addColorStop(0.6, rgbStr([base[0] * 0.92 * g, base[1] * 0.92 * g, base[2] * 0.92 * g]));
      grad.addColorStop(1, rgbStr([base[0] * 0.6 * g, base[1] * 0.6 * g, base[2] * 0.6 * g]));
      ctx.beginPath();
      ctx.ellipse(sx, sy, rx, ry, 0, 0, Math.PI * 2);
      ctx.fillStyle = grad;
      ctx.fill();
      if (!prim.noEdge) {
        ctx.strokeStyle = rgbStr([base[0] * 0.5, base[1] * 0.5, base[2] * 0.5]);
        ctx.lineWidth = 0.5 * Math.max(1, o.scale * 0.6);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    },
  });
}

/** Render a set of primitives (one model) with painter's sorting. */
export function renderModel(ctx: CanvasRenderingContext2D, prims: Prim[], o: RenderOpts) {
  const items: DrawItem[] = [];
  for (const p of prims) {
    if (p.kind === 'box') boxItems(ctx, p, o, items);
    else ellItems(ctx, p, o, items);
  }
  items.sort((a, b) => a.depth - b.depth);
  for (const it of items) it.draw();
}

/** Bounding box of drawn pixels (alpha > 0) to trim sprite frames. */
export function alphaBounds(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const data = ctx.getImageData(0, 0, w, h).data;
  let x0 = w;
  let y0 = h;
  let x1 = -1;
  let y1 = -1;
  for (let y = 0; y < h; y++) {
    const row = y * w * 4;
    for (let x = 0; x < w; x++) {
      if (data[row + x * 4 + 3] > 8) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
    }
  }
  if (x1 < 0) return { x: 0, y: 0, w: 1, h: 1 };
  return { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
}

let outlineCanvas: HTMLCanvasElement | null = null;

/** Add a 1px dark silhouette outline around everything drawn in `src` (readability at small sizes). */
export function outline(src: HTMLCanvasElement, color = 'rgba(14,16,18,0.85)', px = 1) {
  const w = src.width;
  const h = src.height;
  if (!outlineCanvas) outlineCanvas = document.createElement('canvas');
  const oc = outlineCanvas;
  oc.width = w;
  oc.height = h;
  const octx = oc.getContext('2d')!;
  octx.clearRect(0, 0, w, h);
  octx.drawImage(src, 0, 0);
  octx.globalCompositeOperation = 'source-in';
  octx.fillStyle = color;
  octx.fillRect(0, 0, w, h);
  octx.globalCompositeOperation = 'source-over';
  const ctx = src.getContext('2d')!;
  ctx.save();
  ctx.globalCompositeOperation = 'destination-over';
  for (const [dx, dy] of [
    [-px, 0],
    [px, 0],
    [0, -px],
    [0, px],
    [-px, -px],
    [px, px],
    [-px, px],
    [px, -px],
  ])
    ctx.drawImage(oc, dx, dy);
  ctx.restore();
}
