import { angleDiff } from '../../core/math';
import { GRENADE, SOLDIER, TANK } from '../config';
import type { Agent, Contact } from '../entities';
import { blastClear } from '../nav/los';
import type { Simulation } from '../Simulation';

const buf: Agent[] = [];

function share(to: Agent, c: Contact) {
  const mine = to.contacts.get(c.id);
  if (mine && mine.t >= c.t) return;
  if (mine) {
    if (mine.visible) return;
    mine.x = c.x;
    mine.y = c.y;
    mine.t = c.t;
    mine.confirmed = true;
  } else {
    to.contacts.set(c.id, { id: c.id, x: c.x, y: c.y, t: c.t, visible: false, confirmed: true, isTank: c.isTank });
  }
}

/**
 * Sense layer: vision cone + line of sight (walls, trees, smoke), stance and
 * indoor concealment, memory decay, and squad radio sharing.
 */
export function perceive(sim: Simulation, a: Agent) {
  const now = sim.time;
  const isSoldier = a.kind === 'soldier';
  const vision = isSoldier ? a.vision : TANK.vision * a.skillDef.visionMul;
  const facing = isSoldier ? a.facing : a.turret;
  const fovHalf = isSoldier ? SOLDIER.fov / 2 : Math.PI;
  for (const c of a.contacts.values()) c.visible = false;

  buf.length = 0;
  sim.hash.query(a.x, a.y, vision * 1.3, buf);
  const myIndoor = isSoldier ? a.indoor : -1;
  for (const e of buf) {
    if (e.team === a.team || !e.alive) continue;
    const dx = e.x - a.x;
    const dy = e.y - a.y;
    const d = Math.hypot(dx, dy);
    let range = vision;
    if (e.kind === 'soldier') {
      if (e.stance === 'prone' || e.state === 'downed') range *= 0.55;
      else if (e.stance === 'crouch') range *= 0.85;
      if (e.indoor >= 0 && e.indoor !== myIndoor) range *= 0.72;
      // muzzle flashes give shooters away
      if (now - e.lastShotAt < 0.5) range *= 1.25;
    } else {
      range *= 1.3;
    }
    if (d > range) continue;
    if (d > SOLDIER.nearAwareness && Math.abs(angleDiff(facing, Math.atan2(dy, dx))) > fovHalf) continue;
    if (!sim.los(a.x, a.y, e.x, e.y)) continue;
    sim.reveal(a, e, true);
  }
  // forget the dead and the stale
  for (const [id, c] of a.contacts) {
    const e = sim.get(id);
    if (!e || !e.alive || now - c.t > SOLDIER.memory) a.contacts.delete(id);
  }
  // radio: share fresh sightings with the squad (and the squad's tank)
  const sq = sim.squads[a.squad];
  if (!sq) return;
  for (const c of a.contacts.values()) {
    if (!c.visible) continue;
    for (const mid of sq.members) {
      if (mid === a.id) continue;
      const m = sim.get(mid);
      if (m && m.alive) share(m, c);
    }
    if (sq.tank >= 0 && sq.tank !== a.id) {
      const t = sim.get(sq.tank);
      if (t && t.alive) share(t, c);
    }
  }
}

/** Soldiers notice live frag grenades after a skill-dependent reaction delay. */
export function updateGrenadeAwareness(sim: Simulation) {
  const now = sim.time;
  for (const g of sim.grenades) {
    if (g.kind !== 'frag' || g.heldBy >= 0) continue;
    if (!g.landed && g.z > 2.2) continue;
    for (const s of sim.soldiers) {
      if (!s.active || g.noticed.has(s.id)) continue;
      const d = Math.hypot(g.x - s.x, g.y - s.y);
      if (d > GRENADE.radius + 3) continue;
      if (d > 3 && !sim.los(s.x, s.y, g.x, g.y)) continue;
      if (!blastClear(sim.map, g.x, g.y, s.x, s.y) && d > 2) continue;
      // a nearby friend already shouting "grenade!" speeds things up
      let warned = false;
      for (const [id, t] of g.noticed) {
        if (t > now) continue;
        const o = sim.soldier(id);
        if (o && o.team === s.team && Math.hypot(o.x - s.x, o.y - s.y) < 10) {
          warned = true;
          break;
        }
      }
      const reaction = s.skillDef.reaction * sim.rng.range(0.7, 1.35) * (warned ? 0.6 : 1);
      g.noticed.set(s.id, now + reaction);
    }
  }
}
