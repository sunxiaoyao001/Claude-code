import { Rng } from '../../core/rng';
import { Mat } from '../../sim/map/GameMap';
import type { Biome } from '../../sim/types';
import { hex, matColor, mix, shade, type RGB } from '../palette';
import type { FaceInfo, Prim } from './boxRenderer';

export const WALL_H = 2.7;

const line = (ctx: CanvasRenderingContext2D, a: [number, number], b: [number, number]) => {
  ctx.beginPath();
  ctx.moveTo(a[0], a[1]);
  ctx.lineTo(b[0], b[1]);
  ctx.stroke();
};

const fillQuad = (ctx: CanvasRenderingContext2D, f: FaceInfo, u0: number, u1: number, v0: number, v1: number) => {
  const p = [f.map(u0, v0), f.map(u1, v0), f.map(u1, v1), f.map(u0, v1)];
  ctx.beginPath();
  ctx.moveTo(p[0][0], p[0][1]);
  for (let i = 1; i < 4; i++) ctx.lineTo(p[i][0], p[i][1]);
  ctx.closePath();
  ctx.fill();
};

/** Surface pattern + optional window + damage for a 1m wall block face. */
function wallDetail(mat: Mat, opts: { window: boolean; damage: number; seed: number; biome: Biome }) {
  return (ctx: CanvasRenderingContext2D, f: FaceInfo) => {
    const rng = new Rng(opts.seed * 31 + f.index);
    if (f.index === 4) {
      // wall cap
      ctx.strokeStyle = 'rgba(0,0,0,0.18)';
      ctx.lineWidth = 1;
      const a = f.map(0.08, 0.08);
      const b = f.map(0.92, 0.08);
      const c = f.map(0.92, 0.92);
      const d = f.map(0.08, 0.92);
      ctx.beginPath();
      ctx.moveTo(a[0], a[1]);
      ctx.lineTo(b[0], b[1]);
      ctx.lineTo(c[0], c[1]);
      ctx.lineTo(d[0], d[1]);
      ctx.closePath();
      ctx.stroke();
      if (opts.biome === 'snow') {
        ctx.fillStyle = 'rgba(240,246,250,0.85)';
        fillQuad(ctx, f, 0.05, 0.95, 0.05, 0.95);
      }
      return;
    }
    if (f.index !== 0 && f.index !== 2) return;
    ctx.lineWidth = 1;
    if (mat === Mat.Brick) {
      ctx.strokeStyle = 'rgba(40,20,14,0.35)';
      const rows = 13;
      for (let r = 1; r < rows; r++) line(ctx, f.map(0, r / rows), f.map(1, r / rows));
      for (let r = 0; r < rows; r++) {
        const off = r % 2 ? 0.125 : 0;
        for (let u = off; u < 1; u += 0.25) line(ctx, f.map(u, r / rows), f.map(u, (r + 1) / rows));
      }
    } else if (mat === Mat.Concrete) {
      ctx.strokeStyle = 'rgba(0,0,0,0.16)';
      line(ctx, f.map(0, 0.36), f.map(1, 0.36));
      line(ctx, f.map(0, 0.72), f.map(1, 0.72));
      const g = ctx.createLinearGradient(...f.map(0.5, 0), ...f.map(0.5, 0.35));
      g.addColorStop(0, 'rgba(30,26,20,0.28)');
      g.addColorStop(1, 'rgba(30,26,20,0)');
      ctx.fillStyle = g;
      fillQuad(ctx, f, 0, 1, 0, 0.35);
    } else if (mat === Mat.Adobe) {
      for (let k = 0; k < 5; k++) {
        ctx.fillStyle = rng.chance(0.5) ? 'rgba(90,60,30,0.10)' : 'rgba(255,240,210,0.12)';
        const u = rng.range(0, 0.8);
        const v = rng.range(0, 0.85);
        fillQuad(ctx, f, u, u + rng.range(0.1, 0.3), v, v + rng.range(0.05, 0.15));
      }
      ctx.strokeStyle = 'rgba(80,50,25,0.22)';
      line(ctx, f.map(0, 0.9), f.map(1, 0.9));
    } else if (mat === Mat.Wood) {
      ctx.strokeStyle = 'rgba(30,18,8,0.45)';
      for (let r = 1; r < 10; r++) line(ctx, f.map(0, r / 10), f.map(1, r / 10));
      ctx.fillStyle = 'rgba(40,25,12,0.35)';
      fillQuad(ctx, f, 0, 0.07, 0, 1);
    } else if (mat === Mat.Stone) {
      ctx.strokeStyle = 'rgba(30,30,34,0.35)';
      let v = 0;
      while (v < 1) {
        const h = rng.range(0.12, 0.2);
        line(ctx, f.map(0, Math.min(1, v + h)), f.map(1, Math.min(1, v + h)));
        let u = rng.range(0, 0.3);
        while (u < 1) {
          line(ctx, f.map(u, v), f.map(u, Math.min(1, v + h)));
          u += rng.range(0.25, 0.45);
        }
        v += h;
      }
    }
    if (opts.window) {
      // frame, dark opening, sill and a glint
      ctx.fillStyle = 'rgba(50,44,38,0.9)';
      fillQuad(ctx, f, 0.16, 0.84, 0.34, 0.8);
      ctx.fillStyle = 'rgb(22,26,30)';
      fillQuad(ctx, f, 0.22, 0.78, 0.38, 0.76);
      ctx.fillStyle = 'rgba(120,150,170,0.25)';
      fillQuad(ctx, f, 0.22, 0.42, 0.55, 0.76);
      ctx.fillStyle = 'rgba(230,225,215,0.55)';
      fillQuad(ctx, f, 0.14, 0.86, 0.31, 0.35);
    }
    if (opts.damage > 0) {
      ctx.strokeStyle = 'rgba(20,16,12,0.6)';
      ctx.lineWidth = 1.2;
      for (let k = 0; k < 2 + opts.damage * 3; k++) {
        let u = rng.range(0.1, 0.9);
        let v = rng.range(0.4, 1);
        ctx.beginPath();
        ctx.moveTo(...f.map(u, v));
        for (let s = 0; s < 4; s++) {
          u += rng.range(-0.12, 0.12);
          v -= rng.range(0.05, 0.15);
          ctx.lineTo(...f.map(u, v));
        }
        ctx.stroke();
      }
      ctx.fillStyle = 'rgba(25,20,16,0.55)';
      for (let k = 0; k < opts.damage * 3; k++) {
        const u = rng.range(0.1, 0.8);
        const v = rng.range(0.2, 0.9);
        fillQuad(ctx, f, u, u + 0.12, v, v + 0.08);
      }
    }
  };
}

export function wallBlock(mat: Mat, biome: Biome, opts: { window: boolean; damage: number; seed: number }): Prim[] {
  const base = matColor(mat, biome);
  const rng = new Rng(opts.seed);
  const col = shade(base, rng.range(0.94, 1.05));
  return [
    {
      kind: 'box',
      c: [0, 0, WALL_H / 2],
      h: [0.5, 0.5, WALL_H / 2],
      color: col,
      faceColor: { 4: shade(col, 0.92) },
      detail: wallDetail(mat, { ...opts, biome }),
    },
  ];
}

export function lowWall(mat: Mat, biome: Biome, seed: number): Prim[] {
  const col = matColor(mat, biome);
  return [{ kind: 'box', c: [0, 0, 0.47], h: [0.5, 0.5, 0.47], color: col, detail: wallDetail(mat, { window: false, damage: 0, seed, biome }) }];
}

export function sandbags(biome: Biome, seed: number): Prim[] {
  const rng = new Rng(seed);
  const base = matColor(Mat.Sandbag, biome);
  const P: Prim[] = [];
  for (let row = 0; row < 3; row++) {
    const z = 0.13 + row * 0.27;
    const off = row % 2 ? 0.12 : -0.05;
    for (let i = 0; i < 2; i++)
      for (let j = 0; j < 2; j++) {
        const c: RGB = shade(base, rng.range(0.88, 1.06));
        P.push({ kind: 'box', c: [-0.24 + i * 0.48 + off * 0.3, -0.22 + j * 0.44, z], h: [0.23, 0.2, 0.12], yaw: rng.range(-0.08, 0.08), color: c });
      }
  }
  if (biome === 'snow') P.push({ kind: 'box', c: [0, 0, 0.86], h: [0.46, 0.42, 0.03], color: hex('#eef3f6'), noEdge: true });
  return P;
}

export function crate(seed: number): Prim[] {
  const rng = new Rng(seed);
  const col = shade(matColor(Mat.Crate, 'urban'), rng.range(0.9, 1.08));
  const planks = (ctx: CanvasRenderingContext2D, f: FaceInfo) => {
    ctx.strokeStyle = 'rgba(40,24,10,0.5)';
    ctx.lineWidth = 1;
    for (let k = 1; k < 4; k++) line(ctx, f.map(0, k / 4), f.map(1, k / 4));
    ctx.strokeStyle = 'rgba(40,24,10,0.65)';
    line(ctx, f.map(0, 0), f.map(1, 1));
  };
  if (rng.chance(0.5))
    return [
      { kind: 'box', c: [0, 0, 0.4], h: [0.42, 0.42, 0.4], color: col, detail: planks },
      { kind: 'box', c: [0.05, -0.05, 0.98], h: [0.24, 0.24, 0.18], yaw: 0.3, color: shade(col, 1.08), detail: planks },
    ];
  return [{ kind: 'box', c: [0, 0, 0.43], h: [0.44, 0.44, 0.43], color: col, detail: planks }];
}

export function barrier(alongX: boolean): Prim[] {
  const col = matColor(Mat.Barrier, 'urban');
  const yaw = alongX ? 0 : Math.PI / 2;
  const stripes = (ctx: CanvasRenderingContext2D, f: FaceInfo) => {
    if (f.index === 4 || f.index === 5) return;
    ctx.fillStyle = 'rgba(200,60,40,0.55)';
    fillQuad(ctx, f, 0.1, 0.3, 0.55, 0.85);
    fillQuad(ctx, f, 0.55, 0.75, 0.55, 0.85);
  };
  return [
    { kind: 'box', c: [0, 0, 0.18], h: [0.5, 0.32, 0.18], yaw, color: col },
    { kind: 'box', c: [0, 0, 0.62], h: [0.5, 0.15, 0.27], yaw, color: shade(col, 1.03), detail: stripes },
  ];
}

export function logs(): Prim[] {
  const col = matColor(Mat.Logs, 'snow');
  const ends = (ctx: CanvasRenderingContext2D, f: FaceInfo) => {
    if (f.index !== 0 && f.index !== 1) return;
    ctx.fillStyle = 'rgba(214,180,130,0.85)';
    const [x, y] = f.map(0.5, 0.5);
    const [x2, y2] = f.map(0.95, 0.5);
    ctx.beginPath();
    ctx.ellipse(x, y, Math.max(2, Math.hypot(x2 - x, y2 - y)), Math.max(2, Math.hypot(x2 - x, y2 - y)), 0, 0, Math.PI * 2);
    ctx.fill();
  };
  return [
    { kind: 'box', c: [0, -0.22, 0.17], h: [0.5, 0.16, 0.16], color: col, detail: ends },
    { kind: 'box', c: [0, 0.22, 0.17], h: [0.5, 0.16, 0.16], color: shade(col, 0.95), detail: ends },
    { kind: 'box', c: [0, 0, 0.47], h: [0.5, 0.16, 0.16], color: shade(col, 1.05), detail: ends },
    { kind: 'box', c: [0, 0, 0.66], h: [0.45, 0.4, 0.03], color: hex('#eef3f6'), noEdge: true },
  ];
}

export function rockModel(biome: Biome, seed: number): Prim[] {
  const rng = new Rng(seed);
  const base = matColor(Mat.Rock, biome);
  const P: Prim[] = [];
  // a big tilted core plus smaller slabs leaning on it
  const core = rng.range(0.42, 0.52);
  P.push({ kind: 'box', c: [0, 0, core * 0.95], h: [core, core * 0.85, core * 1.1], yaw: rng.range(0, Math.PI), pitch: rng.range(-0.25, 0.25), roll: rng.range(-0.25, 0.25), color: shade(base, rng.range(0.9, 1.05)) });
  const n = rng.int(3, 5);
  for (let i = 0; i < n; i++) {
    const s = rng.range(0.16, 0.32);
    const a = rng.range(0, Math.PI * 2);
    P.push({
      kind: 'box',
      c: [Math.cos(a) * rng.range(0.25, 0.42), Math.sin(a) * rng.range(0.25, 0.42), s * rng.range(0.6, 1.2)],
      h: [s * rng.range(1, 1.5), s, s * rng.range(0.7, 1.3)],
      yaw: rng.range(0, Math.PI),
      pitch: rng.range(-0.6, 0.6),
      roll: rng.range(-0.6, 0.6),
      color: shade(base, rng.range(0.78, 1.08)),
    });
  }
  if (biome === 'snow') P.push({ kind: 'box', c: [0, 0, 1.15], h: [0.32, 0.3, 0.06], yaw: rng.range(0, 3), color: hex('#f1f5f8'), noEdge: true });
  return P;
}

export function wreckModel(kind: 'car' | 'truck', alongX: boolean, seed: number): Prim[] {
  const rng = new Rng(seed);
  const yaw = alongX ? 0 : Math.PI / 2;
  const paint = rng.pick([hex('#5a3b2e'), hex('#4b4f52'), hex('#6d5a3a'), hex('#3d4a3f')]);
  const burnt = mix(paint, hex('#2a2522'), 0.45);
  const soot = (ctx: CanvasRenderingContext2D, f: FaceInfo) => {
    ctx.fillStyle = 'rgba(20,16,14,0.35)';
    fillQuad(ctx, f, rng.range(0, 0.4), rng.range(0.5, 1), 0.3, 1);
    ctx.fillStyle = 'rgba(140,70,30,0.25)';
    fillQuad(ctx, f, rng.range(0.1, 0.5), rng.range(0.6, 0.9), 0, 0.3);
  };
  const glass = (ctx: CanvasRenderingContext2D, f: FaceInfo) => {
    if (f.index === 4 || f.index === 5) return;
    ctx.fillStyle = 'rgba(18,20,22,0.85)';
    fillQuad(ctx, f, 0.12, 0.88, 0.25, 0.9);
  };
  const wheel = (x: number, y: number): Prim => ({ kind: 'ell', c: [x, y, 0.28], h: [0.28, 0.12, 0.28], color: hex('#1c1b1a') });
  const rot = (p: Prim): Prim => {
    const c = Math.cos(yaw);
    const s = Math.sin(yaw);
    p.c = [p.c[0] * c - p.c[1] * s, p.c[0] * s + p.c[1] * c, p.c[2]];
    if (p.pivot) p.pivot = [p.pivot[0] * c - p.pivot[1] * s, p.pivot[0] * s + p.pivot[1] * c, p.pivot[2]];
    p.yaw = (p.yaw ?? 0) + yaw;
    return p;
  };
  if (kind === 'car') {
    return [
      wheel(0.62, 0.42),
      wheel(-0.62, 0.42),
      wheel(0.62, -0.42),
      wheel(-0.62, -0.42),
      { kind: 'box', c: [0, 0, 0.52], h: [0.98, 0.46, 0.22], color: burnt, detail: soot },
      { kind: 'box', c: [-0.1, 0, 0.9], h: [0.52, 0.4, 0.17], color: shade(burnt, 0.9), detail: glass },
    ].map((p) => rot(p as Prim));
  }
  return [
    wheel(0.75, 0.48),
    wheel(-0.7, 0.48),
    wheel(0.75, -0.48),
    wheel(-0.7, -0.48),
    { kind: 'box', c: [0.62, 0, 0.75], h: [0.38, 0.5, 0.45], color: burnt, detail: glass },
    { kind: 'box', c: [-0.38, 0, 0.72], h: [0.62, 0.52, 0.3], color: shade(burnt, 0.85), detail: soot },
    { kind: 'box', c: [-0.38, 0, 1.12], h: [0.6, 0.5, 0.1], color: hex('#4a4c3a') },
  ].map((p) => rot(p as Prim));
}

export function rubbleModel(mat: Mat, biome: Biome, seed: number): Prim[] {
  const rng = new Rng(seed);
  const base = mat === Mat.None ? hex('#8a857c') : matColor(mat, biome);
  const P: Prim[] = [];
  const n = rng.int(7, 11);
  for (let i = 0; i < n; i++) {
    const s = rng.range(0.08, 0.2);
    P.push({
      kind: 'box',
      c: [rng.range(-0.35, 0.35), rng.range(-0.35, 0.35), s * rng.range(0.6, 1.8)],
      h: [s * rng.range(1, 1.8), s, s * rng.range(0.6, 1)],
      yaw: rng.range(0, Math.PI),
      pitch: rng.range(-0.4, 0.4),
      color: shade(mix(base, hex('#6e665c'), 0.3), rng.range(0.8, 1.1)),
    });
  }
  return P;
}

/** Hand-painted (non-box) props drawn straight to canvas, anchored at (ox, oy). */
export function drawTree(ctx: CanvasRenderingContext2D, mat: Mat, biome: Biome, seed: number, s: number, ox: number, oy: number) {
  const rng = new Rng(seed);
  ctx.save();
  ctx.translate(ox, oy);
  ctx.scale(s, s);
  if (mat === Mat.Pine) {
    const h = rng.range(78, 96);
    ctx.fillStyle = '#4a3324';
    ctx.fillRect(-3, -22, 6, 22);
    const tiers = 4;
    for (let t = 0; t < tiers; t++) {
      const y0 = -16 - t * (h / tiers) * 0.78;
      const w = 26 - t * 5;
      const tipY = y0 - h * 0.42;
      const g = ctx.createLinearGradient(-w, 0, w, 0);
      g.addColorStop(0, '#3f6a4d');
      g.addColorStop(0.55, '#2c4c38');
      g.addColorStop(1, '#1d3326');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(-w, y0);
      ctx.quadraticCurveTo(-w * 0.3, y0 + 5, 0, y0 + 3);
      ctx.quadraticCurveTo(w * 0.3, y0 + 5, w, y0);
      ctx.lineTo(0, tipY);
      ctx.closePath();
      ctx.fill();
      if (biome === 'snow') {
        ctx.fillStyle = 'rgba(244,248,251,0.92)';
        ctx.beginPath();
        ctx.moveTo(-w * 0.55, y0 - (y0 - tipY) * 0.35);
        ctx.lineTo(0, tipY);
        ctx.lineTo(w * 0.25, y0 - (y0 - tipY) * 0.45);
        ctx.quadraticCurveTo(0, y0 - (y0 - tipY) * 0.25, -w * 0.55, y0 - (y0 - tipY) * 0.35);
        ctx.fill();
      }
    }
  } else if (mat === Mat.Palm) {
    const h = rng.range(80, 100);
    const lean = rng.range(-14, 14);
    ctx.strokeStyle = '#7a5c3a';
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(lean * 0.2, -h * 0.5, lean, -h);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(60,40,20,0.5)';
    ctx.lineWidth = 1;
    for (let k = 1; k < 9; k++) {
      const t = k / 9;
      const x = lean * t * t;
      const y = -h * t;
      ctx.beginPath();
      ctx.moveTo(x - 3, y);
      ctx.lineTo(x + 3, y - 1);
      ctx.stroke();
    }
    for (let k = 0; k < 9; k++) {
      const a = (k / 9) * Math.PI * 2 + rng.range(-0.2, 0.2);
      const len = rng.range(26, 36);
      const ex = lean + Math.cos(a) * len;
      const ey = -h + Math.sin(a) * len * 0.45 + 10;
      ctx.strokeStyle = k % 2 ? '#4f7a33' : '#3d6428';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(lean, -h);
      ctx.quadraticCurveTo((lean + ex) / 2, -h - 12, ex, ey);
      ctx.stroke();
    }
  } else {
    // dead / burnt tree
    const h = rng.range(60, 80);
    ctx.strokeStyle = biome === 'snow' ? '#3c3530' : '#2f2925';
    ctx.lineCap = 'round';
    const branch = (x: number, y: number, a: number, len: number, w: number, depth: number) => {
      const ex = x + Math.cos(a) * len;
      const ey = y + Math.sin(a) * len;
      ctx.lineWidth = w;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(ex, ey);
      ctx.stroke();
      if (depth > 0) {
        branch(ex, ey, a - rng.range(0.3, 0.7), len * 0.7, w * 0.65, depth - 1);
        branch(ex, ey, a + rng.range(0.3, 0.7), len * 0.65, w * 0.6, depth - 1);
      }
    };
    branch(0, 0, -Math.PI / 2 + rng.range(-0.1, 0.1), h * 0.45, 6, 3);
  }
  ctx.restore();
}

export function drawBarrel(ctx: CanvasRenderingContext2D, s: number, ox: number, oy: number, seed: number) {
  const rng = new Rng(seed);
  const col = rng.pick(['#7a3328', '#4f5f3e', '#35506a', '#6b6a64']);
  ctx.save();
  ctx.translate(ox, oy);
  ctx.scale(s, s);
  const w = 9;
  const h = 18;
  const g = ctx.createLinearGradient(-w, 0, w, 0);
  g.addColorStop(0, col);
  g.addColorStop(0.35, '#d9d4c8');
  g.addColorStop(0.42, col);
  g.addColorStop(1, '#1d1c1a');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(0, 0, w, w * 0.5, 0, 0, Math.PI);
  ctx.lineTo(-w, -h);
  ctx.ellipse(0, -h, w, w * 0.5, 0, Math.PI, 0, true);
  ctx.closePath();
  ctx.globalAlpha = 1;
  ctx.fill();
  ctx.fillStyle = col;
  ctx.beginPath();
  ctx.ellipse(0, -h, w, w * 0.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.35)';
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.strokeStyle = 'rgba(0,0,0,0.25)';
  for (const y of [-5, -12]) {
    ctx.beginPath();
    ctx.ellipse(0, y, w, w * 0.5, 0, 0, Math.PI);
    ctx.stroke();
  }
  ctx.restore();
}
