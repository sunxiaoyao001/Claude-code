import { angleDiff } from '../../core/math';
import { GRENADE } from '../config';
import type { Agent, Contact, Grenade, Soldier, Tank } from '../entities';
import { protectionFrom } from '../map/cover';
import { Cell, CELL_INFO } from '../map/GameMap';
import { blastClear, structureOpacity } from '../nav/los';
import type { Simulation } from '../Simulation';
import type { TeamId } from '../types';

const cellBuf: number[] = [];

export function cellCenter(sim: Simulation, i: number) {
  return { x: (i % sim.map.w) + 0.5, y: Math.floor(i / sim.map.w) + 0.5 };
}

/** Live, non-downed enemy contacts, freshest/closest first. */
export function threats(sim: Simulation, s: Agent, maxAge = 12, includeTanks = true): Contact[] {
  const out: Contact[] = [];
  for (const c of s.contacts.values()) {
    if (sim.time - c.t > maxAge) continue;
    const e = sim.get(c.id);
    if (!e || !e.alive) continue;
    if (e.kind === 'soldier' && e.state === 'downed') continue;
    if (!includeTanks && c.isTank) continue;
    out.push(c);
  }
  out.sort((a, b) => {
    const va = a.visible ? 0 : 20;
    const vb = b.visible ? 0 : 20;
    return va + Math.hypot(a.x - s.x, a.y - s.y) - (vb + Math.hypot(b.x - s.x, b.y - s.y));
  });
  return out;
}

export function visibleThreats(sim: Simulation, s: Agent, includeTanks = false) {
  return threats(sim, s, 1, includeTanks).filter((c) => c.visible);
}

/** Is there a live frag grenade that would catch (x, y)? */
export function grenadeDangerAt(sim: Simulation, x: number, y: number, margin = 0.5): Grenade | null {
  for (const g of sim.grenades) {
    if (g.kind !== 'frag') continue;
    if (Math.hypot(g.x - x, g.y - y) < GRENADE.radius + margin && blastClear(sim.map, g.x, g.y, x, y)) return g;
  }
  return null;
}

export interface CoverQuery {
  threats: Contact[];
  mode: 'fight' | 'hide';
  radius: number;
  /** Optional attraction point (objective, advance direction). */
  toward?: { x: number; y: number; w: number };
  /** Require the cell to be at least this much closer to `toward` than the soldier. */
  minGain?: number;
  /** Stay away from this point (e.g. an enemy tank). */
  avoid?: { x: number; y: number; r: number };
  /** Search around this point instead of the soldier. */
  center?: { x: number; y: number };
}

/**
 * Score nearby cover cells against known threats. "fight" wants protection
 * plus a firing line on the main threat; "hide" wants full protection.
 */
export function findCover(sim: Simulation, s: Soldier, q: CoverQuery): number {
  if (q.threats.length === 0) return -1;
  const map = sim.map;
  const team = sim.teams[s.team];
  cellBuf.length = 0;
  const qc = q.center ?? s;
  sim.cover.query(qc.x, qc.y, q.radius, cellBuf);
  const main = q.threats[0];
  const mainAng = Math.atan2(main.y - s.y, main.x - s.x);
  let best = -1;
  let bestScore = -Infinity;
  const rng = sim.rng;
  const noise = (1 - s.skillDef.coverUse) * 2.5;
  for (const i of cellBuf) {
    const cx = (i % map.w) + 0.5;
    const cy = Math.floor(i / map.w) + 0.5;
    const ang = Math.atan2(main.y - cy, main.x - cx);
    if (sim.cover.facing(i, ang) === 0) continue;
    const taker = team.coverRes.get(i);
    if (taker !== undefined && taker !== s.id) continue;
    const d = Math.hypot(cx - s.x, cy - s.y);
    if (q.avoid && Math.hypot(cx - q.avoid.x, cy - q.avoid.y) < q.avoid.r) continue;
    if (grenadeDangerAt(sim, cx, cy)) continue;
    let prot = 0;
    let tooClose = false;
    const n = Math.min(3, q.threats.length);
    for (let k = 0; k < n; k++) {
      const th = q.threats[k];
      const dt = Math.hypot(th.x - cx, th.y - cy);
      if (dt < 4.5) {
        tooClose = true;
        break;
      }
      prot += protectionFrom(map, cx, cy, th.x, th.y) * (k === 0 ? 1.5 : 1);
    }
    if (tooClose) continue;
    prot /= n + 0.5;
    if (prot < (q.mode === 'hide' ? 0.55 : 0.35)) continue;
    let score = prot * 5 - d * (q.center ? 0.08 : 0.25);
    if (q.mode === 'fight') {
      const dm = Math.hypot(main.x - cx, main.y - cy);
      if (dm > s.weapon.range * 0.95) score -= 3;
      const los = sim.los(cx, cy, main.x, main.y);
      if (!los) score -= 4;
      else score += 2.5;
    } else {
      // hiding: don't walk into the enemy
      const before = Math.hypot(main.x - s.x, main.y - s.y);
      const after = Math.hypot(main.x - cx, main.y - cy);
      if (after < before) score -= (before - after) * 0.35;
      if (structureOpacity(map, cx, cy, main.x, main.y, 1) >= 1) score += 1.5;
    }
    if (q.toward) {
      const gain = Math.hypot(q.toward.x - s.x, q.toward.y - s.y) - Math.hypot(q.toward.x - cx, q.toward.y - cy);
      if (q.minGain !== undefined && gain < q.minGain) continue;
      score += gain * q.toward.w;
    }
    // indoors near a window is a strong fighting spot
    if (map.isIndoor(cx, cy) >= 0) score += q.mode === 'fight' ? 0.6 : 0.3;
    // spread out from friends' reserved spots
    for (const [cell, id] of team.coverRes) {
      if (id === s.id) continue;
      const fx = (cell % map.w) + 0.5;
      const fy = Math.floor(cell / map.w) + 0.5;
      const fd = Math.hypot(fx - cx, fy - cy);
      if (fd < 1.6) score -= (1.6 - fd) * 2;
    }
    score += rng.range(-noise, noise);
    // prefer staying on the same side as the current facing
    if (Math.abs(angleDiff(mainAng, Math.atan2(cy - s.y, cx - s.x))) > 2.4) score -= 0.5;
    if (score > bestScore) {
      bestScore = score;
      best = i;
    }
  }
  return best;
}

/** Protection the soldier currently enjoys against its top threats. */
export function currentProtection(sim: Simulation, s: Soldier, th: Contact[]): number {
  if (th.length === 0) return 1;
  let p = 0;
  const n = Math.min(2, th.length);
  for (let k = 0; k < n; k++) p += protectionFrom(sim.map, s.x, s.y, th[k].x, th[k].y);
  return p / n;
}

/** Best fire-control target for a soldier (or -1). */
export function pickTarget(sim: Simulation, s: Soldier): number {
  let best = -1;
  let bestScore = -Infinity;
  for (const c of s.contacts.values()) {
    if (!c.visible || c.isTank) continue;
    const e = sim.get(c.id);
    if (!e || e.kind !== 'soldier' || !e.active) continue;
    const d = Math.hypot(e.x - s.x, e.y - s.y);
    if (d > s.weapon.range * 1.05) continue;
    let score = -d;
    if (e.id === s.bb.target) score += 6;
    if (sim.time - e.lastShotAt < 1.5) score += 4;
    if (e.role === 'mg') score += 3;
    if (e.role === 'at' && sim.tanks.some((t) => t.team === s.team && t.alive)) score += 4;
    if (e.role === 'medic' && e.busyKind === 'revive') score += 5;
    if (s.lastHitAt > sim.time - 2 && Math.hypot(s.lastHitFrom.x - e.x, s.lastHitFrom.y - e.y) < 3) score += 6;
    const exposed = 1 - protectionFrom(sim.map, e.x, e.y, s.x, s.y);
    score += exposed * 6;
    if (score > bestScore) {
      bestScore = score;
      best = e.id;
    }
  }
  return best;
}

/** Where to throw a frag, or null if no worthwhile target. */
export function grenadeOpportunity(sim: Simulation, s: Soldier): { x: number; y: number; value: number } | null {
  let best: { x: number; y: number; value: number } | null = null;
  for (const c of s.contacts.values()) {
    if (c.isTank || sim.time - c.t > 3) continue;
    const e = sim.get(c.id);
    if (!e || e.kind !== 'soldier' || !e.active) continue;
    const d = Math.hypot(c.x - s.x, c.y - s.y);
    if (d < GRENADE.minThrow || d > GRENADE.maxThrow - 2) continue;
    let value = 0;
    for (const o of s.contacts.values()) {
      if (o.isTank || sim.time - o.t > 4) continue;
      if (Math.hypot(o.x - c.x, o.y - c.y) < 3.5) value += 1;
    }
    const prot = protectionFrom(sim.map, c.x, c.y, s.x, s.y);
    if (prot > 0.45) value += 1.2;
    if (sim.map.isIndoor(c.x, c.y) >= 0) value += 0.6;
    if (e.state === 'wounded') value += 0.2;
    // never near friends
    let unsafe = false;
    for (const f of sim.soldiers) {
      if (f.team !== s.team || !f.alive) continue;
      if (Math.hypot(f.x - c.x, f.y - c.y) < GRENADE.radius + 1) {
        unsafe = true;
        break;
      }
    }
    if (unsafe) continue;
    // need a throwing lane out of our own position (not facing a wall point-blank)
    const ang = Math.atan2(c.y - s.y, c.x - s.x);
    if (structureOpacity(sim.map, s.x, s.y, s.x + Math.cos(ang) * 3, s.y + Math.sin(ang) * 3, 1) >= 1) continue;
    if (!best || value > best.value) best = { x: c.x, y: c.y, value };
  }
  return best && best.value >= 1.55 ? best : null;
}

/** Escape point away from a grenade, preferring spots shielded by walls. */
export function grenadeEscape(sim: Simulation, s: Soldier, g: Grenade): { x: number; y: number } | null {
  let best: { x: number; y: number } | null = null;
  let bestScore = -Infinity;
  const finder = sim.paths.finder;
  for (let k = 0; k < 16; k++) {
    const a = (k / 16) * Math.PI * 2;
    for (const r of [2.5, 4.5, 6.5]) {
      const x = s.x + Math.cos(a) * r;
      const y = s.y + Math.sin(a) * r;
      if (!sim.map.walkablePos(x, y)) continue;
      if (!finder.clearSegment('inf', s.x, s.y, x, y, 0.3)) continue;
      const dg = Math.hypot(x - g.x, y - g.y);
      let score = dg * 1.2 - r * 0.25;
      if (!blastClear(sim.map, g.x, g.y, x, y)) score += 6;
      if (dg > GRENADE.radius) score += 3;
      if (score > bestScore) {
        bestScore = score;
        best = { x, y };
      }
    }
  }
  return best;
}

/** A point between `from` and the main threat, for a smoke screen. */
export function smokePoint(from: { x: number; y: number }, threat: { x: number; y: number }, dist = 4.5) {
  const dx = threat.x - from.x;
  const dy = threat.y - from.y;
  const len = Math.hypot(dx, dy) || 1;
  const d = Math.min(dist, len * 0.5);
  return { x: from.x + (dx / len) * d, y: from.y + (dy / len) * d };
}

/** Does any known, live enemy have a line of sight onto (x, y)? */
export function exposedAt(sim: Simulation, team: TeamId, x: number, y: number, contacts: Iterable<Contact>): Contact | null {
  for (const c of contacts) {
    if (sim.time - c.t > 8) continue;
    const e = sim.get(c.id);
    if (!e || !e.alive || e.team === team) continue;
    if (Math.hypot(c.x - x, c.y - y) > 50) continue;
    if (sim.los(c.x, c.y, x, y)) return c;
  }
  return null;
}

/** Flank waypoint: offset perpendicular to the line to the enemy. */
export function flankPoint(sim: Simulation, s: Soldier, c: Contact, side: number): { x: number; y: number } | null {
  const dx = c.x - s.x;
  const dy = c.y - s.y;
  const d = Math.hypot(dx, dy);
  if (d < 10) return null;
  const ux = dx / d;
  const uy = dy / d;
  const off = Math.min(14, d * 0.5);
  for (const f of [1, 0.7, 0.45]) {
    const x = s.x + ux * d * 0.55 - uy * off * side * f;
    const y = s.y + uy * d * 0.55 + ux * off * side * f;
    const cx = Math.floor(x);
    const cy = Math.floor(y);
    if (!sim.map.inBounds(cx, cy) || CELL_INFO[sim.map.kind(cx, cy)].blocksMove) continue;
    return { x, y };
  }
  return null;
}

/** Slot behind a tank, shielded from the threat direction. */
export function shieldSlotPos(t: Tank, threat: { x: number; y: number }, slot: number) {
  const ax = threat.x - t.x;
  const ay = threat.y - t.y;
  const len = Math.hypot(ax, ay) || 1;
  const ux = ax / len;
  const uy = ay / len;
  // behind the tank relative to the threat, spread laterally per slot
  const back = 3.4;
  const lateral = (slot - 1) * 1.15;
  return { x: t.x - ux * back - uy * lateral, y: t.y - uy * back + ux * lateral };
}

export function nearestEnemyTank(sim: Simulation, s: Agent, maxD: number): { tank: Tank; c: Contact; d: number } | null {
  let best: { tank: Tank; c: Contact; d: number } | null = null;
  for (const c of s.contacts.values()) {
    if (!c.isTank || sim.time - c.t > 10) continue;
    const t = sim.get(c.id);
    if (!t || t.kind !== 'tank' || !t.alive) continue;
    const d = Math.hypot(c.x - s.x, c.y - s.y);
    if (d < maxD && (!best || d < best.d)) best = { tank: t, c, d };
  }
  return best;
}

export function isCellWalkable(sim: Simulation, x: number, y: number) {
  const k = sim.map.kind(Math.floor(x), Math.floor(y));
  return !CELL_INFO[k].blocksMove && k !== Cell.Wreck;
}
