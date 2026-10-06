import type { Role, TeamId } from '../../sim/types';
import { BOOT, GUNMETAL, hex, SKIN, TEAM, type RGB } from '../palette';
import type { Prim, V3 } from './boxRenderer';

export type SoldierPose =
  | 'idle'
  | 'aim'
  | 'walk0'
  | 'walk1'
  | 'walk2'
  | 'walk3'
  | 'crouch'
  | 'prone'
  | 'throw'
  | 'kneel'
  | 'downed'
  | 'dead'
  | 'rocket';

export const POSES: SoldierPose[] = ['idle', 'aim', 'walk0', 'walk1', 'walk2', 'walk3', 'crouch', 'prone', 'throw', 'kneel', 'downed', 'dead', 'rocket'];
/** Poses rendered with 16 directions (they're the ones that track targets). */
export const FINE_POSES = new Set<SoldierPose>(['aim', 'crouch', 'prone', 'rocket']);

const WHITE = hex('#e9e6df');
const MEDIC_RED = hex('#d23a32');
const OLIVE = hex('#55573f');
const TUBE = hex('#4f5a3c');

function weaponPrims(role: Role, at: V3, pitch: number, yaw = 0): Prim[] {
  const [x, y, z] = at;
  const p: Prim[] = [];
  const g = GUNMETAL;
  const len = role === 'mg' ? 0.46 : role === 'sniper' ? 0.56 : role === 'medic' || role === 'at' ? 0.3 : 0.4;
  const thick = role === 'mg' ? 0.055 : 0.042;
  p.push({ kind: 'box', c: [x, y, z], h: [len, 0.026, thick], pitch, yaw, pivot: [x - len * 0.5, y, z], color: g });
  // stock / furniture
  p.push({ kind: 'box', c: [x - len * 0.85, y, z - 0.02], h: [0.12, 0.03, 0.05], pitch, yaw, pivot: [x - len * 0.5, y, z], color: role === 'sniper' ? hex('#5a4632') : hex('#33363a') });
  if (role === 'mg') p.push({ kind: 'box', c: [x - 0.05, y, z - 0.09], h: [0.08, 0.05, 0.06], pitch, yaw, pivot: [x - len * 0.5, y, z], color: OLIVE });
  if (role === 'sniper') p.push({ kind: 'box', c: [x - 0.08, y, z + 0.07], h: [0.14, 0.025, 0.025], pitch, yaw, pivot: [x - len * 0.5, y, z], color: hex('#1c1d1f') });
  if (role === 'rifleman') p.push({ kind: 'box', c: [x - 0.02, y, z - 0.08], h: [0.04, 0.022, 0.06], pitch, yaw, pivot: [x - len * 0.5, y, z], color: g });
  return p;
}

interface Opts {
  team: TeamId;
  role: Role;
  pose: SoldierPose;
}

/** Build the primitive list for one soldier frame (model space: x forward, y left, z up). */
export function soldierModel({ team, role, pose }: Opts): Prim[] {
  const T = TEAM[team];
  const skin = SKIN[(team * 3 + role.length) % SKIN.length];
  const dead = pose === 'dead';
  const dim = (c: RGB): RGB => (dead ? [c[0] * 0.78, c[1] * 0.78, c[2] * 0.78] : c);
  const uni = dim(T.uniform);
  const uniD = dim(T.uniformDark);
  const vest = dim(T.vest);
  const helm = dim(T.helmet);
  const acc = dim(T.accent);
  const boot = BOOT;
  const P: Prim[] = [];

  const medicPack = (c: V3, pitch = 0): Prim => ({
    kind: 'box',
    c,
    h: [0.1, 0.18, 0.2],
    pitch,
    color: WHITE,
    detail: (ctx, f) => {
      if (f.index === 4 || f.index === 5) return;
      const [a, b] = [f.map(0.38, 0.2), f.map(0.62, 0.8)];
      const [c1, d1] = [f.map(0.15, 0.42), f.map(0.85, 0.58)];
      ctx.fillStyle = `rgb(${MEDIC_RED.join(',')})`;
      quad(ctx, a, [b[0], a[1]], b, [a[0], b[1]], f, 0.38, 0.62, 0.2, 0.8);
      quad(ctx, c1, [d1[0], c1[1]], d1, [c1[0], d1[1]], f, 0.15, 0.85, 0.42, 0.58);
    },
  });

  const backpack = (c: V3, pitch = 0): Prim =>
    role === 'medic' ? medicPack(c, pitch) : { kind: 'box', c, h: [0.09, 0.17, 0.19], pitch, color: dim(hex('#4b4b3a')) };

  const tubeOnBack = (c: V3, pitch: number): Prim => ({ kind: 'box', c, h: [0.5, 0.06, 0.06], pitch, color: TUBE });

  if (pose === 'prone' || pose === 'dead' || pose === 'downed') {
    // lying figure along +x (head forward). Downed: on the back, rotated a little; dead: sprawled
    const yawBody = pose === 'downed' ? 0.25 : pose === 'dead' ? -0.35 : 0;
    const z = 0.13;
    const body: Prim[] = [
      { kind: 'box', c: [0.05, 0, z + 0.03], h: [0.29, 0.2, 0.12], color: uni },
      { kind: 'box', c: [0.12, 0, z + 0.07], h: [0.17, 0.215, 0.1], color: vest },
      { kind: 'box', c: [-0.45, 0.11, z], h: [0.34, 0.075, 0.08], color: uniD, yaw: pose === 'dead' ? 0.25 : 0.05 },
      { kind: 'box', c: [-0.45, -0.11, z], h: [0.34, 0.075, 0.08], color: uniD, yaw: pose === 'downed' ? -0.2 : -0.05 },
      { kind: 'box', c: [-0.83, 0.12, z], h: [0.06, 0.07, 0.07], color: boot },
      { kind: 'box', c: [-0.83, -0.13, z], h: [0.06, 0.07, 0.07], color: boot },
      { kind: 'ell', c: [0.45, 0, z + 0.08], h: [0.115, 0.115, 0.115], color: skin },
      { kind: 'ell', c: [0.49, 0, z + 0.12], h: [0.15, 0.15, 0.1], color: helm },
    ];
    if (pose === 'prone') {
      body.push({ kind: 'box', c: [0.35, 0.2, z], h: [0.22, 0.05, 0.05], color: uni, yaw: -0.4 });
      body.push({ kind: 'box', c: [0.35, -0.2, z], h: [0.22, 0.05, 0.05], color: uni, yaw: 0.4 });
      P.push(...weaponPrims(role, [0.85, -0.06, z + 0.06], 0));
      if (role !== 'medic') body.push({ kind: 'box', c: [-0.12, 0, z + 0.2], h: [0.15, 0.16, 0.08], color: dim(hex('#4b4b3a')) });
    } else {
      // arms flung out
      body.push({ kind: 'box', c: [0.1, 0.38, z - 0.02], h: [0.06, 0.24, 0.045], color: uni, yaw: pose === 'dead' ? 0.6 : 0.2 });
      body.push({ kind: 'box', c: [0.05, -0.36, z - 0.02], h: [0.06, 0.22, 0.045], color: uni, yaw: -0.3 });
      // dropped weapon
      P.push(...weaponPrims(role, [0.15, pose === 'dead' ? -0.62 : 0.66, 0.05], 0, pose === 'dead' ? 0.9 : -0.5));
    }
    for (const b of body) {
      b.yaw = (b.yaw ?? 0) + yawBody;
      b.c = rotZ(b.c, yawBody);
    }
    P.push(...body);
    // shoulder patches
    P.push({ kind: 'box', c: rotZ([0.2, 0.24, z + 0.08], yawBody), h: [0.06, 0.03, 0.04], yaw: yawBody, color: acc });
    P.push({ kind: 'box', c: rotZ([0.2, -0.24, z + 0.08], yawBody), h: [0.06, 0.03, 0.04], yaw: yawBody, color: acc });
    return P;
  }

  // ---------------------------------------------------------------- upright & crouched
  const crouched = pose === 'crouch' || pose === 'kneel' || pose === 'rocket';
  const hip = crouched ? 0.52 : 0.93;
  const lean = pose === 'kneel' ? 0.45 : crouched ? 0.18 : pose.startsWith('walk') ? 0.1 : pose === 'throw' ? -0.12 : 0.03;
  const walkPhase = pose.startsWith('walk') ? Number(pose.slice(4)) : -1;
  const swing = walkPhase >= 0 ? Math.sin((walkPhase / 4) * Math.PI * 2) * 0.55 : 0;
  const bob = walkPhase >= 0 ? Math.abs(Math.cos((walkPhase / 4) * Math.PI * 2)) * 0.03 : 0;

  // legs
  if (crouched) {
    // right knee on the ground, left foot planted forward
    P.push({ kind: 'box', c: [0.17, 0.11, hip - 0.02], h: [0.2, 0.075, 0.075], pitch: 0.25, color: uniD });
    P.push({ kind: 'box', c: [0.33, 0.11, 0.25], h: [0.075, 0.07, 0.24], color: uniD });
    P.push({ kind: 'box', c: [0.37, 0.11, 0.04], h: [0.12, 0.075, 0.045], color: boot });
    P.push({ kind: 'box', c: [-0.02, -0.11, 0.33], h: [0.075, 0.075, 0.22], pitch: -0.75, color: uniD });
    P.push({ kind: 'box', c: [-0.24, -0.11, 0.08], h: [0.2, 0.07, 0.07], color: uniD });
    P.push({ kind: 'box', c: [-0.43, -0.11, 0.06], h: [0.06, 0.07, 0.05], color: boot });
  } else {
    for (const side of [1, -1]) {
      const a = side * swing;
      const pv: V3 = [0, side * 0.11, hip];
      P.push({ kind: 'box', c: [0, side * 0.11, hip / 2 + 0.04], h: [0.085, 0.075, hip / 2 - 0.02], pitch: -a, pivot: pv, color: uniD });
      P.push({ kind: 'box', c: [0.04, side * 0.11, 0.05], h: [0.13, 0.08, 0.05], pitch: -a, pivot: pv, color: boot });
    }
  }

  // torso group (leans around the hip)
  const torso: Prim[] = [];
  const tz = hip + 0.3 + bob;
  torso.push({ kind: 'box', c: [0, 0, tz], h: [0.13, 0.21, 0.3], color: uni });
  torso.push({ kind: 'box', c: [0.02, 0, tz + 0.04], h: [0.155, 0.225, 0.17], color: vest });
  torso.push({ kind: 'box', c: [0.17, 0.08, tz - 0.02], h: [0.03, 0.05, 0.06], color: dim(hex('#3a3a30')) });
  torso.push({ kind: 'box', c: [0.17, -0.08, tz - 0.02], h: [0.03, 0.05, 0.06], color: dim(hex('#3a3a30')) });
  torso.push({ kind: 'box', c: [0, 0, hip + 0.03], h: [0.135, 0.215, 0.035], color: dim(hex('#2b2a26')) });
  torso.push(backpack([-0.22, 0, tz + 0.02]));
  if (role === 'at' && pose !== 'rocket') torso.push(tubeOnBack([-0.3, 0.05, tz + 0.12], 0.9));
  if (role === 'at' && pose === 'rocket') torso.push({ kind: 'box', c: [-0.29, 0.05, tz], h: [0.07, 0.12, 0.12], color: TUBE });
  // head & helmet
  const hz = tz + 0.44;
  torso.push({ kind: 'ell', c: [0.02, 0, hz], h: [0.115, 0.115, 0.12], color: skin });
  torso.push({ kind: 'ell', c: [0, 0, hz + 0.07], h: [0.155, 0.155, 0.105], color: helm });
  torso.push({ kind: 'box', c: [-0.02, 0, hz + 0.16], h: [0.07, 0.03, 0.012], color: acc, noEdge: true });
  if (role === 'medic') torso.push({ kind: 'box', c: [0.02, 0, hz + 0.155], h: [0.025, 0.08, 0.012], color: MEDIC_RED, noEdge: true });

  // arms & weapon
  const shZ = tz + 0.24;
  const arm = (side: number, pitch: number, yaw: number, len = 0.29): Prim => ({
    kind: 'box',
    c: [0, side * 0.27, shZ - len],
    h: [0.06, 0.06, len],
    pitch,
    yaw,
    pivot: [0, side * 0.27, shZ],
    color: uni,
  });
  const patch = (side: number): Prim => ({ kind: 'box', c: [0, side * 0.285, shZ - 0.07], h: [0.065, 0.02, 0.05], color: acc, noEdge: true });

  if (pose === 'aim' || pose === 'crouch') {
    torso.push(arm(-1, -1.45, 0.35), arm(1, -1.25, -0.6, 0.27), patch(1), patch(-1));
    torso.push(...weaponPrims(role, [0.38, -0.06, shZ - 0.06], 0));
  } else if (pose === 'rocket') {
    torso.push(arm(-1, -1.5, 0.2, 0.25), arm(1, -1.5, -0.45, 0.25), patch(1), patch(-1));
    torso.push({ kind: 'box', c: [0.12, -0.17, shZ + 0.05], h: [0.6, 0.075, 0.075], color: TUBE });
    torso.push({ kind: 'ell', c: [0.78, -0.17, shZ + 0.05], h: [0.1, 0.1, 0.1], color: hex('#6d7350') });
    torso.push({ kind: 'box', c: [0.02, -0.12, shZ + 0.15], h: [0.06, 0.03, 0.04], color: GUNMETAL });
  } else if (pose === 'throw') {
    torso.push(arm(-1, 2.5, 0.2, 0.3), arm(1, -1.2, -0.3, 0.27), patch(1), patch(-1));
    torso.push({ kind: 'ell', c: [-0.32, -0.3, shZ + 0.48], h: [0.055, 0.055, 0.06], color: hex('#3d4a2a') });
    torso.push(...weaponPrims(role, [-0.05, 0.16, tz + 0.05], -0.9, 0.3));
  } else if (pose === 'kneel') {
    torso.push(arm(-1, -0.8, 0.2), arm(1, -0.8, -0.2), patch(1), patch(-1));
    torso.push(...weaponPrims(role, [-0.05, 0.2, tz - 0.1], 0.6, 1.3));
  } else {
    // idle / walk: low ready
    const sw = walkPhase >= 0 ? swing * 0.25 : 0;
    torso.push(arm(-1, -0.95 + sw, 0.35), arm(1, -0.75 - sw, -0.55, 0.27), patch(1), patch(-1));
    torso.push(...weaponPrims(role, [0.3, -0.05, shZ - 0.22], 0.42, -0.08));
  }
  // lean the whole upper body forward around the hip (rigid rotation about the hip axis)
  const lc = Math.cos(lean);
  const ls = Math.sin(lean);
  const hipRot = (v: V3): V3 => [v[0] * lc + (v[2] - hip) * ls, v[1], -v[0] * ls + (v[2] - hip) * lc + hip];
  for (const p of torso) {
    const pivot = p.pivot ?? p.c;
    const np = hipRot(pivot);
    p.c = [np[0] + (p.c[0] - pivot[0]), np[1] + (p.c[1] - pivot[1]), np[2] + (p.c[2] - pivot[2])];
    p.pivot = np;
    p.pitch = (p.pitch ?? 0) + lean;
  }
  P.push(...torso);
  return P;
}

function rotZ(c: V3, a: number): V3 {
  const co = Math.cos(a);
  const si = Math.sin(a);
  return [c[0] * co - c[1] * si, c[0] * si + c[1] * co, c[2]];
}

function quad(
  ctx: CanvasRenderingContext2D,
  _a: [number, number],
  _b: [number, number],
  _c: [number, number],
  _d: [number, number],
  f: { map: (u: number, v: number) => [number, number] },
  u0: number,
  u1: number,
  v0: number,
  v1: number,
) {
  const p0 = f.map(u0, v0);
  const p1 = f.map(u1, v0);
  const p2 = f.map(u1, v1);
  const p3 = f.map(u0, v1);
  ctx.beginPath();
  ctx.moveTo(p0[0], p0[1]);
  ctx.lineTo(p1[0], p1[1]);
  ctx.lineTo(p2[0], p2[1]);
  ctx.lineTo(p3[0], p3[1]);
  ctx.closePath();
  ctx.fill();
}
