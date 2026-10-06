import type { Contact, Squad } from '../entities';
import type { Simulation } from '../Simulation';
import type { TeamId } from '../types';

/**
 * Team-level command layer: assigns squads to objectives (capture / defend /
 * assault), keeps tanks with a squad, and merges shattered squads.
 */
export function runCommander(sim: Simulation, team: TeamId) {
  const now = sim.time;
  const squads = sim.squads.filter((q) => q.team === team);
  const alive = (q: Squad) => q.members.filter((id) => sim.soldier(id)?.active);

  // merge squads that are down to a single soldier into the nearest healthy squad
  for (const q of squads) {
    const live = alive(q);
    if (live.length !== 1) continue;
    const lone = sim.soldier(live[0])!;
    let best: Squad | null = null;
    let bestD = Infinity;
    for (const o of squads) {
      if (o === q || alive(o).length < 2) continue;
      const lead = sim.soldier(alive(o)[0])!;
      const d = Math.hypot(lead.x - lone.x, lead.y - lone.y);
      if (d < bestD) {
        bestD = d;
        best = o;
      }
    }
    if (best) {
      q.members = q.members.filter((id) => id !== lone.id);
      best.members.push(lone.id);
      lone.squad = best.id;
      lone.leader = false;
    }
  }

  // team-wide intel: union of member contacts (freshest wins)
  const intel = new Map<number, Contact>();
  for (const a of sim.liveAgents) {
    if (a.team !== team) continue;
    for (const c of a.contacts.values()) {
      const e = sim.get(c.id);
      if (!e || !e.alive || (e.kind === 'soldier' && !e.active)) continue;
      const cur = intel.get(c.id);
      if (!cur || cur.t < c.t) intel.set(c.id, c);
    }
  }
  const enemyKnown = [...intel.values()].filter((c) => now - c.t < 15);
  const ours = sim.activeCount(team);

  const active = squads.filter((q) => alive(q).length > 0);
  const centroid = (q: Squad) => {
    let x = 0;
    let y = 0;
    const live = alive(q);
    for (const id of live) {
      const s = sim.soldier(id)!;
      x += s.x;
      y += s.y;
    }
    return { x: x / live.length, y: y / live.length };
  };

  interface Target {
    x: number;
    y: number;
    point: number;
    kind: 'capture' | 'defend' | 'assault';
    value: number;
    enemy: number;
  }
  const targets: Target[] = sim.points.map((p) => {
    const owned = p.owner === team;
    let enemy = 0;
    for (const c of enemyKnown) if (Math.hypot(c.x - p.x, c.y - p.y) < p.r + 12) enemy += c.isTank ? 3 : 1;
    let value = owned ? 1 : 3;
    if (p.owner !== -1 && !owned) value += 1.2;
    if (p.contested) value += 2;
    if (owned && enemy > 0) value += 2.5;
    if (p.label === 'B') value += 0.6;
    if (sim.config.mode === 'annihilation') value *= 0.6;
    return { x: p.x, y: p.y, point: p.id, kind: owned ? 'defend' : 'capture', value, enemy };
  });

  // assault the enemy if we're clearly stronger, or if nothing else is left to do
  const allOurs = sim.points.every((p) => p.owner === team);
  if (enemyKnown.length > 0) {
    let ex = 0;
    let ey = 0;
    for (const c of enemyKnown) {
      ex += c.x;
      ey += c.y;
    }
    ex /= enemyKnown.length;
    ey /= enemyKnown.length;
    const stronger = ours >= enemyKnown.length * 1.4;
    targets.push({ x: ex, y: ey, point: -1, kind: 'assault', value: stronger || allOurs ? 4 : sim.config.mode === 'annihilation' ? 2.2 : 0.8, enemy: enemyKnown.length });
  } else if (allOurs || sim.config.mode === 'annihilation') {
    // sweep toward the enemy deployment zone
    const z = sim.map.spawns[team === 0 ? 1 : 0];
    targets.push({ x: (z.x0 + z.x1) / 2, y: (z.y0 + z.y1) / 2, point: -1, kind: 'assault', value: now > 60 ? 3 : 0.5, enemy: 0 });
  }

  const assigned = new Map<Target, number>();
  // strongest squads choose first
  active.sort((a, b) => alive(b).length - alive(a).length);
  for (const q of active) {
    const c = centroid(q);
    const size = alive(q).length;
    let best: Target | null = null;
    let bestScore = -Infinity;
    for (const t of targets) {
      const d = Math.hypot(t.x - c.x, t.y - c.y);
      let score = t.value - d / 32 - (assigned.get(t) ?? 0) * 2.2 - Math.max(0, t.enemy - size) * 0.45;
      // stickiness: avoid flip-flopping orders
      if (q.order && Math.hypot(q.order.x - t.x, q.order.y - t.y) < 3) score += 1.1;
      if (score > bestScore) {
        bestScore = score;
        best = t;
      }
    }
    if (!best) continue;
    assigned.set(best, (assigned.get(best) ?? 0) + 1);
    const changed = !q.order || Math.hypot(q.order.x - best.x, q.order.y - best.y) > 3;
    q.order = { kind: best.kind, x: best.x, y: best.y, point: best.point };
    if (changed) q.orderedAt = now;
  }

  // tanks follow a live squad
  for (const t of sim.tanks) {
    if (t.team !== team || !t.alive) continue;
    const sq = sim.squads[t.squad];
    if (!sq || alive(sq).length === 0) {
      const other = active[0];
      if (other) {
        if (sq) sq.tank = -1;
        t.squad = other.id;
        if (other.tank < 0) other.tank = t.id;
      }
    }
  }
}

/** Pair downed soldiers with the best available rescuer (medics preferred). */
export function updateRescueAssignments(sim: Simulation, team: TeamId) {
  const t = sim.teams[team];
  const taken = new Set(t.rescues.values());
  for (const d of sim.soldiers) {
    if (d.team !== team || d.state !== 'downed') continue;
    const cur = t.rescues.get(d.id);
    if (cur !== undefined) {
      const r = sim.soldier(cur);
      if (r && r.active) continue;
      t.rescues.delete(d.id);
      taken.delete(cur);
    }
    let best = -1;
    let bestScore = Infinity;
    for (const r of sim.soldiers) {
      if (r.team !== team || !r.active || taken.has(r.id)) continue;
      const dist = Math.hypot(r.x - d.x, r.y - d.y);
      const medic = r.role === 'medic';
      if (dist > (medic ? 45 : 15)) continue;
      // recruits are less willing to run into fire for a friend
      if (!medic && sim.rng.next() > r.skillDef.tactics) continue;
      const score = dist - (medic ? 18 : 0) + r.suppression * 20 + (r.state === 'wounded' ? 8 : 0) + (r.bb.grenade >= 0 ? 50 : 0);
      if (score < bestScore) {
        bestScore = score;
        best = r.id;
      }
    }
    if (best >= 0) {
      t.rescues.set(d.id, best);
      taken.add(best);
    }
  }
}
