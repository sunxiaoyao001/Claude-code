import { SOLDIER } from '../config';
import type { Agent, Soldier, Tank } from '../entities';
import { Cell, Mat } from '../map/GameMap';
import type { Simulation } from '../Simulation';

export type DamageKind = 'bullet' | 'blast' | 'crush' | 'collapse' | 'bleed';

function roleLabel(s: Soldier) {
  return s.role;
}

export function damageSoldier(sim: Simulation, s: Soldier, dmg: number, attacker: Agent | null, weapon: string, kind: DamageKind) {
  if (s.state === 'dead' || dmg <= 0) return;
  const now = sim.time;
  s.lastHitAt = now;
  if (attacker) {
    s.lastHitFrom.x = attacker.x;
    s.lastHitFrom.y = attacker.y;
    attacker.stats.damage += Math.min(dmg, Math.max(1, s.hp + 50));
    sim.teams[attacker.team].stats.damage += Math.min(dmg, Math.max(1, s.hp + 50));
    // being hit reveals the attacker's rough position
    sim.reveal(s, attacker, false);
  }
  if (s.state === 'downed') {
    s.hp -= dmg;
    if (s.hp <= -50 || (kind === 'blast' && dmg > 45)) killSoldier(sim, s, attacker, weapon);
    return;
  }
  s.hp -= dmg;
  s.suppression = Math.min(1, s.suppression + 0.3);
  if (s.hp <= 0) {
    const overkill = -s.hp;
    const instant = overkill > 40 || (kind === 'blast' && sim.rng.chance(0.35)) || kind === 'collapse' && sim.rng.chance(0.3);
    if (instant) killSoldier(sim, s, attacker, weapon);
    else downSoldier(sim, s, attacker, weapon);
  } else if (s.hp < s.maxHp * 0.55) {
    if (s.state === 'healthy' && sim.rng.chance(0.5)) s.say(sim.rng.pick(['hit', 'hurt']), now);
    s.state = 'wounded';
  }
}

export function downSoldier(sim: Simulation, s: Soldier, attacker: Agent | null, weapon: string) {
  const now = sim.time;
  s.state = 'downed';
  s.hp = 0;
  s.downedAt = now;
  s.bleed = SOLDIER.bleedout * (s.revivedCount > 0 ? 0.6 : 1);
  s.stance = 'prone';
  s.anim = 'downed';
  s.reloadT = 0;
  s.busyUntil = 0;
  s.busyKind = '';
  if (s.body) sim.physics.setDowned(s.body);
  sim.resetBrain(s);
  s.say('medic', now, 2.4);
  sim.teams[s.team].stats.downed++;
  if (attacker) attacker.stats.downs++;
  sim.emit({ type: 'downed', id: s.id, by: attacker?.id ?? -1 });
  sim.pushFeed('down', s.team, 'feed.down', { victim: s.id, killer: attacker?.id ?? -1, weapon }, s.x, s.y, s.id);
}

export function killSoldier(sim: Simulation, s: Soldier, attacker: Agent | null, weapon: string) {
  if (s.state === 'dead') return;
  const wasDowned = s.state === 'downed';
  s.state = 'dead';
  s.hp = Math.min(0, s.hp);
  s.diedAt = sim.time;
  s.anim = 'dead';
  s.vx = s.vy = 0;
  if (s.body) {
    sim.physics.remove(s.body);
    s.body = null;
  }
  sim.resetBrain(s);
  sim.loseUnit(s);
  sim.teams[s.team].stats.deaths++;
  if (attacker && attacker.team !== s.team) {
    attacker.stats.kills++;
    sim.teams[attacker.team].stats.kills++;
  }
  sim.emit({ type: 'killed', id: s.id, by: attacker?.id ?? -1, weapon, victimTank: false });
  sim.pushFeed('kill', attacker ? attacker.team : -1, wasDowned ? 'feed.finished' : 'feed.kill', { victim: s.id, killer: attacker?.id ?? -1, weapon, role: roleLabel(s) }, s.x, s.y, attacker?.id ?? s.id);
}

export function reviveSoldier(sim: Simulation, s: Soldier, by: Soldier) {
  if (s.state !== 'downed') return;
  s.state = 'wounded';
  s.hp = by.role === 'medic' ? 45 : 30;
  s.revivedCount++;
  s.stance = 'crouch';
  s.anim = 'idle';
  s.suppression = 0.3;
  if (s.body) sim.physics.setUp(s.body);
  sim.teams[s.team].rescues.delete(s.id);
  by.stats.revives++;
  sim.teams[s.team].stats.revives++;
  s.say('thanks', sim.time);
  sim.emit({ type: 'revived', id: s.id, by: by.id });
  sim.pushFeed('revive', s.team, 'feed.revive', { victim: s.id, medic: by.id }, s.x, s.y, s.id);
}

/** Armour multiplier from hit direction: rear hits hurt most. */
export function armourFactor(t: Tank, fromX: number, fromY: number) {
  const ax = Math.cos(t.angle);
  const ay = Math.sin(t.angle);
  const dx = t.x - fromX;
  const dy = t.y - fromY;
  const len = Math.hypot(dx, dy) || 1;
  const dot = (dx * ax + dy * ay) / len; // >0: shot travelling along hull forward => rear hit
  if (dot > 0.5) return 1.4;
  if (dot < -0.55) return 0.72;
  return 1.0;
}

export function damageTank(sim: Simulation, t: Tank, dmg: number, attacker: Agent | null, weapon: string) {
  if (t.state === 'dead' || dmg <= 0) return;
  t.hp -= dmg;
  t.lastHitAt = sim.time;
  if (attacker) {
    attacker.stats.damage += dmg;
    sim.teams[attacker.team].stats.damage += dmg;
    sim.reveal(t, attacker, false);
  }
  if (t.hp <= 0) destroyTank(sim, t, attacker, weapon);
  else if (t.hp < t.maxHp * 0.45) t.state = 'wounded';
}

export function destroyTank(sim: Simulation, t: Tank, attacker: Agent | null, weapon: string) {
  t.state = 'dead';
  t.hp = 0;
  t.diedAt = sim.time;
  t.speed = 0;
  if (t.body) sim.physics.freezeTank(t.body);
  sim.resetBrain(t);
  sim.loseUnit(t);
  // the hulk becomes hard cover on the grid
  const c = Math.cos(t.angle);
  const s = Math.sin(t.angle);
  for (let y = Math.floor(t.y - 4); y <= Math.ceil(t.y + 4); y++)
    for (let x = Math.floor(t.x - 4); x <= Math.ceil(t.x + 4); x++) {
      const lx = (x + 0.5 - t.x) * c + (y + 0.5 - t.y) * s;
      const ly = -(x + 0.5 - t.x) * s + (y + 0.5 - t.y) * c;
      if (Math.abs(lx) < t.length / 2 - 0.35 && Math.abs(ly) < t.width / 2 - 0.35 && sim.map.inBounds(x, y)) {
        const k = sim.map.kind(x, y);
        if (k === Cell.Empty || k === Cell.Rubble) {
          sim.map.set(x, y, Cell.Wreck, Mat.TankWreck);
          sim.structureChanged(x, y);
        }
      }
    }
  sim.teams[t.team].stats.deaths++;
  if (attacker && attacker.team !== t.team) {
    attacker.stats.kills++;
    sim.teams[attacker.team].stats.kills++;
    sim.teams[attacker.team].stats.tankKills++;
  }
  sim.emit({ type: 'explosion', x: t.x, y: t.y, r: 5, kind: 'tank' });
  sim.emit({ type: 'killed', id: t.id, by: attacker?.id ?? -1, weapon, victimTank: true });
  sim.addFire(t.x, t.y, 45, 1);
  sim.pushFeed('tank', attacker ? attacker.team : -1, 'feed.tankKilled', { victim: t.id, killer: attacker?.id ?? -1, weapon }, t.x, t.y, t.id);
}
