// The three inks. Scenes describe geometry once; each ink decides how it is drawn.
import {
  bbox,
  clamp,
  Contours,
  H,
  P,
  resample,
  rng,
  rot,
  scanIntervals,
  strSeed,
  TAU,
  trimPath,
  W,
} from './core';

export const C = {
  paper: '#EDE6D5',
  blue: '#1B3ED2',
  cyan: '#45F0DD',
  black: '#07080A',
  graphite: '#16161A',
  white: '#FFFFFF',
};

export type InkKind = 'paper' | 'blue' | 'holo';
export type Light = number | ((x: number, y: number) => number);

export interface LineOpts {
  id: string | number;
  w?: number;
  closed?: boolean;
  hidden?: boolean;
  accent?: boolean;
  alpha?: number;
  /** drawn fraction of the path, 0..1 */
  draw?: number;
  /** extra wobble multiplier for pencil */
  wobble?: number;
}

export interface FillOpts {
  id: string | number;
  accent?: boolean;
  light?: Light;
  /** drawn fraction of the hatch lines (one line at a time) */
  draw?: number;
  /** drawn fraction of the cross-hatching */
  cross?: number;
  density?: number;
  solid?: number;
  origin?: P;
  clipX?: [number, number];
}

export interface TextOpts {
  size?: number;
  weight?: number;
  track?: number;
  align?: CanvasTextAlign;
  accent?: boolean;
  alpha?: number;
}

const GRID = 60;

type Ctx = CanvasRenderingContext2D;

const makeCanvas = (w: number, h: number) => {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
};

const pathOf = (ctx: Ctx, contours: Contours) => {
  ctx.beginPath();
  for (const c of contours) {
    if (c.length < 2) continue;
    ctx.moveTo(c[0][0], c[0][1]);
    for (let i = 1; i < c.length; i++) ctx.lineTo(c[i][0], c[i][1]);
    ctx.closePath();
  }
};

/** Hatch rows: lines at `angle` with spacing `pitch`, clipped (even-odd) to the contours. */
export const hatchRows = (contours: Contours, angle: number, pitch: number, origin: P = [0, 0]) => {
  const rotated = contours.map((c) => c.map((p) => rot([p[0] - origin[0], p[1] - origin[1]], -angle)));
  const bb = bbox(rotated);
  const rows: [P, P][][] = [];
  if (!isFinite(bb.y0)) return rows;
  for (let k = Math.ceil(bb.y0 / pitch - 0.5); (k + 0.5) * pitch <= bb.y1; k++) {
    const y = (k + 0.5) * pitch;
    const segs = scanIntervals(rotated, y).map(([x0, x1]) => {
      const a = rot([x0, y], angle);
      const b = rot([x1, y], angle);
      return [
        [a[0] + origin[0], a[1] + origin[1]],
        [b[0] + origin[0], b[1] + origin[1]],
      ] as [P, P];
    });
    if (segs.length) rows.push(segs);
  }
  return rows;
};

/** Visit the rows drawn so far: full rows, then the partial one. */
const eachDrawn = (rows: [P, P][][], p: number, f: (a: P, b: P, i: number) => void) => {
  const n = rows.length;
  if (!n || p <= 0) return;
  const done = p >= 1 ? n : Math.floor(p * n);
  for (let i = 0; i < done; i++) for (const [a, b] of rows[i]) f(a, b, i);
  if (done < n) {
    const frac = p * n - done;
    const row = rows[done];
    const total = row.reduce((s, [a, b]) => s + Math.hypot(b[0] - a[0], b[1] - a[1]), 0);
    let left = total * frac;
    for (const [a, b] of row) {
      const l = Math.hypot(b[0] - a[0], b[1] - a[1]);
      if (left <= 0) break;
      const u = Math.min(1, left / l);
      f(a, [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u], done);
      left -= l;
    }
  }
};

export abstract class Ink {
  abstract kind: InkKind;
  ctx!: Ctx;
  t = 0;

  abstract begin(main: Ctx, t: number): void;
  end() {}
  abstract line(pts: P[], o: LineOpts): void;
  abstract fill(contours: Contours, o: FillOpts): void;
  abstract color(accent?: boolean): string;

  /** Outline plus fill. */
  shape(contours: Contours, o: LineOpts & { fill?: FillOpts | false }) {
    if (o.fill) this.fill(contours, o.fill);
    contours.forEach((c, i) => this.line(c, { ...o, id: `${o.id}:${i}`, closed: true }));
  }

  /** Big type: fill cut to the letters plus a doubled outline. */
  bigType(contours: Contours, o: { id: string | number; accent?: boolean; draw?: number; fill?: number; light?: Light; origin?: P; w?: number }) {
    const fillP = o.fill ?? 1;
    if (fillP > 0) this.fill(contours, { id: `${o.id}f`, accent: o.accent, draw: fillP, light: o.light ?? 0.75, density: 1.1, origin: o.origin });
    contours.forEach((c, i) => {
      this.line(c, { id: `${o.id}a${i}`, closed: true, accent: o.accent, draw: o.draw, w: o.w ?? 2.8 });
      if (this.kind === 'paper') {
        const off = c.map((p) => [p[0] + 1.6, p[1] - 1.1] as P);
        this.line(off, { id: `${o.id}b${i}`, closed: true, accent: o.accent, draw: o.draw, w: (o.w ?? 2.8) * 0.7, alpha: 0.75 });
      }
    });
  }

  text(s: string, x: number, y: number, o: TextOpts = {}) {
    if (!s) return;
    const ctx = this.ctx;
    const size = o.size ?? 26;
    const track = o.track ?? 0.2;
    ctx.save();
    ctx.font = `${o.weight ?? 700} ${size}px Geist`;
    (ctx as any).letterSpacing = `${track * size}px`;
    ctx.textAlign = o.align ?? 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = this.textColor(o.accent);
    ctx.globalAlpha = o.alpha ?? 1;
    // canvas letter-spacing also trails the last glyph; shift so alignment is optical
    const shift = o.align === 'center' ? (track * size) / 2 : o.align === 'right' ? track * size : 0;
    ctx.fillText(s, x + shift, y);
    ctx.restore();
  }

  textWidth(s: string, o: TextOpts = {}) {
    const ctx = this.ctx;
    const size = o.size ?? 26;
    ctx.save();
    ctx.font = `${o.weight ?? 700} ${size}px Geist`;
    (ctx as any).letterSpacing = `${(o.track ?? 0.2) * size}px`;
    const w = ctx.measureText(s).width - (o.track ?? 0.2) * size;
    ctx.restore();
    return w;
  }

  textColor(accent?: boolean) {
    return this.color(accent);
  }

  /** Solid area (for things that are meant to read as filled, like eyes or a lit bar). */
  solid(contours: Contours, o: { accent?: boolean; alpha?: number } = {}) {
    const ctx = this.ctx;
    ctx.save();
    ctx.fillStyle = this.color(o.accent);
    ctx.globalAlpha = o.alpha ?? 1;
    pathOf(ctx, contours);
    ctx.fill('evenodd');
    ctx.restore();
  }

  protected grid(ctx: Ctx, color: string, minor: number, major: number) {
    ctx.save();
    ctx.strokeStyle = color;
    for (const pass of [0, 1]) {
      ctx.globalAlpha = pass ? major : minor;
      ctx.lineWidth = pass ? 1.5 : 1;
      ctx.beginPath();
      for (let x = 0; x <= W; x += GRID) {
        const k = Math.round((x - 960) / GRID);
        if ((k % 5 === 0) !== !!pass) continue;
        ctx.moveTo(x + 0.5, 0);
        ctx.lineTo(x + 0.5, H);
      }
      for (let y = 0; y <= H; y += GRID) {
        const k = Math.round((y - 540) / GRID);
        if ((k % 5 === 0) !== !!pass) continue;
        ctx.moveTo(0, y + 0.5);
        ctx.lineTo(W, y + 0.5);
      }
      ctx.stroke();
    }
    ctx.restore();
  }
}

// ====================================================================== PAPER
export class PaperInk extends Ink {
  kind: InkKind = 'paper';
  private layer: HTMLCanvasElement;
  private lctx: Ctx;
  private paper: HTMLCanvasElement;
  private tooth: CanvasPattern;
  private main!: Ctx;

  constructor(paperImage?: CanvasImageSource) {
    super();
    this.layer = makeCanvas(W, H);
    this.lctx = this.layer.getContext('2d')!;
    this.paper = makeCanvas(W, H);
    const pc = this.paper.getContext('2d')!;
    if (paperImage) pc.drawImage(paperImage, 0, 0, W, H);
    else drawPaper(pc);
    const tooth = makeCanvas(256, 256);
    drawTooth(tooth.getContext('2d')!);
    this.tooth = this.lctx.createPattern(tooth, 'repeat')!;
  }

  color(accent?: boolean) {
    return accent ? C.blue : C.graphite;
  }

  begin(main: Ctx, t: number) {
    this.t = t;
    this.main = main;
    main.drawImage(this.paper, 0, 0);
    main.save();
    main.globalCompositeOperation = 'multiply';
    this.grid(main, C.blue, 0.13, 0.26);
    main.restore();
    this.lctx.setTransform(1, 0, 0, 1, 0, 0);
    this.lctx.globalCompositeOperation = 'source-over';
    this.lctx.globalAlpha = 1;
    this.lctx.clearRect(0, 0, W, H);
    this.ctx = this.lctx;
  }

  end() {
    const l = this.lctx;
    l.save();
    l.globalCompositeOperation = 'destination-out';
    l.fillStyle = this.tooth;
    l.fillRect(0, 0, W, H);
    l.restore();
    this.main.save();
    this.main.globalCompositeOperation = 'multiply';
    this.main.drawImage(this.layer, 0, 0);
    this.main.restore();
    this.ctx = this.main;
  }

  line(pts: P[], o: LineOpts) {
    const closed = !!o.closed;
    let src = pts;
    let isClosed = closed;
    if (o.draw !== undefined && o.draw < 1) {
      if (o.draw <= 0) return;
      src = trimPath(pts, o.draw, closed);
      isClosed = false;
    }
    if (src.length < 2) return;
    const ctx = this.ctx;
    const w = o.w ?? 3.2;
    const seed = strSeed(o.id);
    const boil = Math.floor(this.t * 8);
    const { pts: rs, nrm, arc, total } = resample(src, 4, isClosed);
    if (rs.length < 2 || total < 0.5) return;
    ctx.save();
    ctx.strokeStyle = this.color(o.accent);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    if (o.hidden) ctx.setLineDash([10, 9]);
    const wob = o.wobble ?? 1;
    const passes = [
      { w: o.hidden ? w * 0.55 : w, a: 0.9, amp: 1 },
      { w: (o.hidden ? w * 0.55 : w) * 0.5, a: 0.4, amp: 2.3 },
    ];
    passes.forEach((pass, j) => {
      const r = rng(seed * 7919 + boil * 104729 + j * 31);
      let l1 = 150 + 90 * r();
      let l2 = 44 + 24 * r();
      if (isClosed) {
        l1 = total / Math.max(1, Math.round(total / l1));
        l2 = total / Math.max(1, Math.round(total / l2));
      }
      const p1 = r() * TAU;
      const p2 = r() * TAU;
      const a1 = 1.15 * pass.amp * wob;
      const a2 = 0.45 * pass.amp * wob;
      // taper the wobble to zero at open ends so joined lines meet
      ctx.beginPath();
      for (let k = 0; k < rs.length; k++) {
        const s = arc[k];
        const taper = isClosed ? 1 : clamp(Math.min(s, total - s) / 20);
        const off = (a1 * Math.sin((TAU * s) / l1 + p1) + a2 * Math.sin((TAU * s) / l2 + p2)) * taper;
        const x = rs[k][0] + nrm[k][0] * off;
        const y = rs[k][1] + nrm[k][1] * off;
        if (k) ctx.lineTo(x, y);
        else ctx.moveTo(x, y);
      }
      if (isClosed) ctx.closePath();
      ctx.lineWidth = pass.w;
      ctx.globalAlpha = pass.a * (o.alpha ?? 1);
      ctx.stroke();
    });
    ctx.restore();
  }

  fill(contours: Contours, o: FillOpts) {
    const ctx = this.ctx;
    const density = o.density ?? 1;
    const pitch = 11 / density;
    const color = this.color(o.accent);
    const seed = strSeed(o.id);
    const boil = Math.floor(this.t * 8);
    ctx.save();
    if (o.clipX) {
      ctx.beginPath();
      ctx.rect(o.clipX[0], -10, o.clipX[1] - o.clipX[0], H + 20);
      ctx.clip();
    }
    if (o.solid) {
      ctx.fillStyle = color;
      ctx.globalAlpha = 0.88 * o.solid;
      pathOf(ctx, contours);
      ctx.fill('evenodd');
    }
    ctx.strokeStyle = color;
    ctx.lineCap = 'round';
    const passes: [number, number][] = [[-Math.PI / 4, o.draw ?? 1]];
    if (o.cross) passes.push([Math.PI / 4, o.cross]);
    passes.forEach(([angle, p], j) => {
      if (p <= 0) return;
      const rows = hatchRows(contours, angle, pitch, o.origin);
      ctx.beginPath();
      eachDrawn(rows, p, (a, b, i) => {
        const l = Math.hypot(b[0] - a[0], b[1] - a[1]);
        const n = Math.max(1, Math.round(l / 10));
        const nx = -(b[1] - a[1]) / (l || 1);
        const ny = (b[0] - a[0]) / (l || 1);
        const r = rng(seed * 131 + i * 977 + boil * 7 + j * 3);
        const ph = r() * TAU;
        const lam = 70 + r() * 70;
        const amp = 0.35 + r() * 0.35;
        // pencil hatches start a touch late and lift early
        const s0 = r() * 1.5;
        for (let k = 0; k <= n; k++) {
          const u = k / n;
          const off = amp * Math.sin((u * l) / lam * TAU + ph);
          const x = a[0] + (b[0] - a[0]) * u + nx * off + (k === 0 ? (b[0] - a[0]) / (l || 1) * s0 : 0);
          const y = a[1] + (b[1] - a[1]) * u + ny * off + (k === 0 ? (b[1] - a[1]) / (l || 1) * s0 : 0);
          if (k) ctx.lineTo(x, y);
          else ctx.moveTo(x, y);
        }
      });
      ctx.lineWidth = density > 2 ? 2.8 : o.accent ? 1.8 : 1.5;
      ctx.globalAlpha = density > 2 ? 0.9 : 0.75;
      ctx.stroke();
    });
    ctx.restore();
  }
}

const drawPaper = (ctx: Ctx) => {
  ctx.fillStyle = C.paper;
  ctx.fillRect(0, 0, W, H);
  const img = ctx.getImageData(0, 0, W, H);
  const d = img.data;
  const r = rng(11);
  // fine grain: low-amplitude luminance noise plus a soft lower-frequency mottle
  const mw = 64;
  const mh = 36;
  const mott = new Float32Array((mw + 1) * (mh + 1)).map(() => r() - 0.5);
  for (let y = 0; y < H; y++) {
    const my = (y / H) * mh;
    const y0 = Math.floor(my);
    const fy = my - y0;
    for (let x = 0; x < W; x++) {
      const mx = (x / W) * mw;
      const x0 = Math.floor(mx);
      const fx = mx - x0;
      const m =
        mott[y0 * (mw + 1) + x0] * (1 - fx) * (1 - fy) +
        mott[y0 * (mw + 1) + x0 + 1] * fx * (1 - fy) +
        mott[(y0 + 1) * (mw + 1) + x0] * (1 - fx) * fy +
        mott[(y0 + 1) * (mw + 1) + x0 + 1] * fx * fy;
      const n = (r() - 0.5) * 9 + m * 7;
      const i = (y * W + x) * 4;
      d[i] = clamp(d[i] + n, 0, 255);
      d[i + 1] = clamp(d[i + 1] + n, 0, 255);
      d[i + 2] = clamp(d[i + 2] + n * 0.9, 0, 255);
    }
  }
  ctx.putImageData(img, 0, 0);
  // drawn fibres
  ctx.lineCap = 'round';
  for (let k = 0; k < 900; k++) {
    const x = r() * W;
    const y = r() * H;
    const a = r() * TAU;
    const l = 4 + r() * 14;
    ctx.strokeStyle = r() < 0.5 ? 'rgba(90,80,60,0.08)' : 'rgba(255,255,250,0.22)';
    ctx.lineWidth = 0.6 + r() * 0.6;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(x + Math.cos(a + 0.6) * l * 0.5, y + Math.sin(a + 0.6) * l * 0.5, x + Math.cos(a) * l, y + Math.sin(a) * l);
    ctx.stroke();
  }
};

const drawTooth = (ctx: Ctx) => {
  const img = ctx.createImageData(256, 256);
  const r = rng(5);
  for (let i = 0; i < 256 * 256; i++) {
    const v = r();
    const a = v > 0.62 ? (v - 0.62) / 0.38 : 0;
    img.data[i * 4 + 3] = Math.round(255 * Math.pow(a, 0.8) * 0.85);
  }
  ctx.putImageData(img, 0, 0);
};

// ====================================================================== BLUEPRINT
export class BlueprintInk extends Ink {
  kind: InkKind = 'blue';

  color(accent?: boolean) {
    return accent ? C.cyan : C.white;
  }

  begin(main: Ctx, t: number) {
    this.t = t;
    this.ctx = main;
    main.fillStyle = C.blue;
    main.fillRect(0, 0, W, H);
    this.grid(main, C.white, 0.13, 0.26);
  }

  line(pts: P[], o: LineOpts) {
    let src = pts;
    let closed = !!o.closed;
    if (o.draw !== undefined && o.draw < 1) {
      if (o.draw <= 0) return;
      src = trimPath(pts, o.draw, closed);
      closed = false;
    }
    if (src.length < 2) return;
    const ctx = this.ctx;
    ctx.save();
    ctx.strokeStyle = this.color(o.accent);
    ctx.lineCap = o.hidden ? 'butt' : 'round';
    ctx.lineJoin = 'round';
    ctx.globalAlpha = o.alpha ?? 1;
    ctx.lineWidth = o.hidden ? Math.max(1.6, (o.w ?? 3.5) * 0.55) : o.w ?? 3.5;
    if (o.hidden) ctx.setLineDash([12, 9]);
    ctx.beginPath();
    ctx.moveTo(src[0][0], src[0][1]);
    for (let i = 1; i < src.length; i++) ctx.lineTo(src[i][0], src[i][1]);
    if (closed) ctx.closePath();
    ctx.stroke();
    ctx.restore();
  }

  fill(contours: Contours, o: FillOpts) {
    const ctx = this.ctx;
    const density = o.density ?? 1;
    ctx.save();
    if (o.clipX) {
      ctx.beginPath();
      ctx.rect(o.clipX[0], -10, o.clipX[1] - o.clipX[0], H + 20);
      ctx.clip();
    }
    const color = this.color(o.accent);
    if (o.solid) {
      ctx.fillStyle = color;
      ctx.globalAlpha = o.solid;
      pathOf(ctx, contours);
      ctx.fill('evenodd');
      ctx.globalAlpha = 1;
    }
    // darker surfaces get tighter hatching
    const light = typeof o.light === 'number' ? o.light : 0.6;
    const pitch = (5 + 7 * clamp(light)) / density;
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.2;
    ctx.globalAlpha = 0.75;
    const passes: [number, number][] = [[-Math.PI / 4, o.draw ?? 1]];
    if (o.cross) passes.push([Math.PI / 4, o.cross]);
    for (const [angle, p] of passes) {
      ctx.beginPath();
      eachDrawn(hatchRows(contours, angle, pitch, o.origin), p, (a, b) => {
        ctx.moveTo(a[0], a[1]);
        ctx.lineTo(b[0], b[1]);
      });
      ctx.stroke();
    }
    ctx.restore();
  }
}

// ====================================================================== HOLOGRAM
export const SCAN = 8;

export class HoloInk extends Ink {
  kind: InkKind = 'holo';

  color(accent?: boolean) {
    return accent ? C.white : C.cyan;
  }

  begin(main: Ctx, t: number) {
    this.t = t;
    this.ctx = main;
    main.fillStyle = C.black;
    main.fillRect(0, 0, W, H);
    this.grid(main, C.cyan, 0.13, 0.26);
  }

  line(pts: P[], o: LineOpts) {
    let src = pts;
    let closed = !!o.closed;
    if (o.draw !== undefined && o.draw < 1) {
      if (o.draw <= 0) return;
      src = trimPath(pts, o.draw, closed);
      closed = false;
    }
    if (src.length < 2) return;
    const ctx = this.ctx;
    const w = o.w ?? 4;
    ctx.save();
    ctx.lineCap = o.hidden ? 'butt' : 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(src[0][0], src[0][1]);
    for (let i = 1; i < src.length; i++) ctx.lineTo(src[i][0], src[i][1]);
    if (closed) ctx.closePath();
    const a = o.alpha ?? 1;
    if (o.hidden) {
      ctx.setLineDash([10, 9]);
      ctx.strokeStyle = C.cyan;
      ctx.globalAlpha = 0.6 * a;
      ctx.lineWidth = Math.max(1.4, w * 0.4);
      ctx.stroke();
    } else if (o.accent) {
      ctx.strokeStyle = C.white;
      ctx.globalAlpha = a;
      ctx.lineWidth = w * 0.8;
      ctx.stroke();
    } else {
      ctx.strokeStyle = C.cyan;
      ctx.globalAlpha = a;
      ctx.lineWidth = w;
      ctx.stroke();
      ctx.strokeStyle = C.white;
      ctx.lineWidth = w * 0.3;
      ctx.stroke();
    }
    ctx.restore();
  }

  /** Horizontal scan lines on an 8 px pitch whose thickness follows how lit the surface is. */
  fill(contours: Contours, o: FillOpts) {
    const ctx = this.ctx;
    const bb = bbox(contours);
    if (!isFinite(bb.y0)) return;
    const light = o.light ?? 0.7;
    const p = o.draw ?? 1;
    ctx.save();
    if (o.clipX) {
      ctx.beginPath();
      ctx.rect(o.clipX[0], -10, o.clipX[1] - o.clipX[0], H + 20);
      ctx.clip();
    }
    ctx.fillStyle = this.color(o.accent);
    const k0 = Math.ceil(bb.y0 / SCAN - 0.5);
    const k1 = Math.floor(bb.y1 / SCAN - 0.5);
    const n = k1 - k0 + 1;
    const maxT = SCAN - 2;
    ctx.beginPath();
    for (let k = k0; k <= k1; k++) {
      const idx = k - k0;
      let rowP = 1;
      if (p < 1) {
        rowP = clamp(p * n - idx);
        if (rowP <= 0) continue;
      }
      const y = (k + 0.5) * SCAN;
      for (const [x0, x1raw] of scanIntervals(contours, y)) {
        const x1 = x0 + (x1raw - x0) * rowP;
        if (x1 - x0 < 0.5) continue;
        if (typeof light === 'number') {
          const th = 0.7 + (maxT - 0.7) * clamp(light);
          ctx.rect(x0, y - th / 2, x1 - x0, th);
        } else {
          const steps = Math.max(1, Math.ceil((x1 - x0) / 5));
          const top: P[] = [];
          const bot: P[] = [];
          for (let s = 0; s <= steps; s++) {
            const x = x0 + ((x1 - x0) * s) / steps;
            const th = 0.5 + (maxT - 0.5) * clamp(light(x, y));
            top.push([x, y - th / 2]);
            bot.push([x, y + th / 2]);
          }
          ctx.moveTo(top[0][0], top[0][1]);
          for (const q of top) ctx.lineTo(q[0], q[1]);
          for (let s = bot.length - 1; s >= 0; s--) ctx.lineTo(bot[s][0], bot[s][1]);
          ctx.closePath();
        }
      }
    }
    ctx.globalAlpha = o.solid ? 1 : 0.95;
    ctx.fill();
    ctx.restore();
  }
}
