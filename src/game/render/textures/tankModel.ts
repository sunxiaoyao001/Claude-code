import type { TeamId } from '../../sim/types';
import { hex, TEAM, type RGB } from '../palette';
import type { FaceInfo, Prim } from './boxRenderer';

const TRACK = hex('#2b2a27');
const WHEEL = hex('#3b3a35');

function trackDetail(ctx: CanvasRenderingContext2D, f: FaceInfo) {
  if (f.index !== 2 && f.index !== 3) return;
  // road wheels + track links on the outer faces
  ctx.fillStyle = `rgba(0,0,0,0.25)`;
  for (let i = 0; i < 6; i++) {
    const u = 0.1 + i * 0.16;
    const [x, y] = f.map(u, 0.45);
    const [x2, y2] = f.map(u + 0.06, 0.45);
    const r = Math.max(2, Math.hypot(x2 - x, y2 - y));
    ctx.beginPath();
    ctx.ellipse(x, y, r, r * 1.1, 0, 0, Math.PI * 2);
    ctx.fillStyle = `rgb(${WHEEL.map((c) => c * f.light).join(',')})`;
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.45)';
    ctx.lineWidth = 1;
    ctx.stroke();
  }
  ctx.strokeStyle = 'rgba(0,0,0,0.3)';
  ctx.lineWidth = 1;
  for (let i = 0; i <= 28; i++) {
    const a = f.map(i / 28, 0.88);
    const b = f.map(i / 28, 1);
    ctx.beginPath();
    ctx.moveTo(a[0], a[1]);
    ctx.lineTo(b[0], b[1]);
    ctx.stroke();
  }
}

function deckDetail(ctx: CanvasRenderingContext2D, f: FaceInfo) {
  if (f.index !== 4) return;
  // engine grille at the rear
  ctx.strokeStyle = 'rgba(0,0,0,0.28)';
  ctx.lineWidth = 1;
  for (let i = 0; i < 6; i++) {
    const a = f.map(0.04 + i * 0.03, 0.25);
    const b = f.map(0.04 + i * 0.03, 0.75);
    ctx.beginPath();
    ctx.moveTo(a[0], a[1]);
    ctx.lineTo(b[0], b[1]);
    ctx.stroke();
  }
}

function bandDetail(accent: RGB) {
  return (ctx: CanvasRenderingContext2D, f: FaceInfo) => {
    if (f.index !== 2 && f.index !== 3) return;
    const p = [f.map(0.55, 0.35), f.map(0.75, 0.35), f.map(0.75, 0.75), f.map(0.55, 0.75)];
    ctx.fillStyle = `rgb(${accent.map((c) => Math.min(255, c * f.light * 1.1)).join(',')})`;
    ctx.beginPath();
    ctx.moveTo(p[0][0], p[0][1]);
    for (let i = 1; i < 4; i++) ctx.lineTo(p[i][0], p[i][1]);
    ctx.closePath();
    ctx.fill();
  };
}

export function tankHullModel(team: TeamId, wreck: boolean): Prim[] {
  const T = TEAM[team];
  const body: RGB = wreck ? hex('#3a3633') : T.tank;
  const dark: RGB = wreck ? hex('#24211f') : T.tankDark;
  const track = wreck ? hex('#1e1c1a') : TRACK;
  return [
    { kind: 'box', c: [0, 1.22, 0.45], h: [2.85, 0.38, 0.43], color: track, detail: trackDetail },
    { kind: 'box', c: [0, -1.22, 0.45], h: [2.85, 0.38, 0.43], color: track, detail: trackDetail },
    { kind: 'box', c: [-0.05, 0, 0.72], h: [2.6, 0.9, 0.36], color: dark },
    { kind: 'box', c: [-0.15, 0, 1.08], h: [2.45, 1.6, 0.17], color: body, detail: deckDetail },
    { kind: 'box', c: [2.45, 0, 0.95], h: [0.42, 1.45, 0.2], pitch: 0.55, color: body },
    // stowage boxes & fenders
    { kind: 'box', c: [-1.0, 1.42, 1.32], h: [0.6, 0.16, 0.1], color: dark },
    { kind: 'box', c: [-1.0, -1.42, 1.32], h: [0.6, 0.16, 0.1], color: dark },
    { kind: 'box', c: [-2.55, 0.6, 1.22], h: [0.1, 0.18, 0.08], color: hex('#1e1e1c') },
    { kind: 'box', c: [-2.55, -0.6, 1.22], h: [0.1, 0.18, 0.08], color: hex('#1e1e1c') },
  ];
}

export function tankTurretModel(team: TeamId, wreck: boolean): Prim[] {
  const T = TEAM[team];
  const body: RGB = wreck ? hex('#3d3936') : T.tank;
  const dark: RGB = wreck ? hex('#26231f') : T.tankDark;
  const accent: RGB = wreck ? hex('#2e2a27') : T.accent;
  return [
    { kind: 'box', c: [-0.15, 0, 1.6], h: [1.3, 1.05, 0.36], color: body, detail: bandDetail(accent) },
    { kind: 'box', c: [1.05, 0, 1.55], h: [0.35, 0.9, 0.3], pitch: 0.35, color: body },
    { kind: 'box', c: [-1.55, 0, 1.62], h: [0.32, 0.85, 0.27], color: dark },
    { kind: 'box', c: [1.45, 0, 1.6], h: [0.22, 0.32, 0.2], color: dark },
    { kind: 'box', c: [3.05, 0, 1.62], h: [1.55, 0.085, 0.085], color: dark },
    { kind: 'box', c: [4.55, 0, 1.62], h: [0.14, 0.13, 0.12], color: hex('#252423') },
    { kind: 'ell', c: [-0.55, 0.5, 2.05], h: [0.3, 0.3, 0.16], color: dark },
    { kind: 'box', c: [-0.2, -0.55, 2.0], h: [0.18, 0.14, 0.08], color: hex('#1f2224') },
    { kind: 'box', c: [-1.2, 0.75, 2.6], h: [0.012, 0.012, 0.65], color: hex('#1b1b1b'), noEdge: true },
  ];
}
