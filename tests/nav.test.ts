import { describe, expect, it } from 'vitest';
import { Cell, GameMap, Mat } from '../src/game/sim/map/GameMap';
import { NavGrid } from '../src/game/sim/nav/NavGrid';
import { Pathfinder } from '../src/game/sim/nav/Pathfinder';
import { hasLOS } from '../src/game/sim/nav/los';
import { protectionFrom } from '../src/game/sim/map/cover';

function wallMap() {
  const m = new GameMap(32, 'urban', 1);
  // a vertical wall at x=15 with a single gap at y=28
  for (let y = 0; y < 32; y++) if (y !== 28) m.set(15, y, Cell.Wall, Mat.Concrete);
  return m;
}

describe('navigation', () => {
  it('routes infantry around a wall through the only gap', () => {
    const m = wallMap();
    const pf = new Pathfinder(new NavGrid(m));
    const res = pf.find('inf', 5.5, 5.5, 25.5, 5.5)!;
    expect(res.complete).toBe(true);
    // every waypoint is walkable and the route passes the gap row
    for (const p of res.points) expect(m.blocksMove(Math.floor(p.x), Math.floor(p.y))).toBe(false);
    expect(res.points.some((p) => Math.abs(p.y - 28.5) < 1.5)).toBe(true);
  });

  it('lets tanks plough through soft walls when it is much shorter', () => {
    const m = wallMap();
    const pf = new Pathfinder(new NavGrid(m));
    const res = pf.find('tank', 5.5, 5.5, 25.5, 5.5)!;
    expect(res.complete).toBe(true);
    const crossed = res.points.every((p) => p.y < 20);
    expect(crossed).toBe(true);
  });

  it('blocks line of sight through walls but not through windows', () => {
    const m = wallMap();
    expect(hasLOS(m, [], 5.5, 5.5, 25.5, 5.5)).toBe(false);
    m.set(15, 5, Cell.Window, Mat.Concrete);
    expect(hasLOS(m, [], 5.5, 5.5, 25.5, 5.5)).toBe(true);
    // a smoke cloud on the line hides it again
    expect(hasLOS(m, [{ x: 10, y: 5.5, r: 4, density: 0.42 }], 5.5, 5.5, 25.5, 5.5)).toBe(false);
  });

  it('measures protection from cover against a threat direction', () => {
    const m = new GameMap(32, 'urban', 1);
    m.set(11, 10, Cell.Low, Mat.Sandbag);
    expect(protectionFrom(m, 10.5, 10.5, 25.5, 10.5)).toBeGreaterThan(0.6);
    expect(protectionFrom(m, 10.5, 10.5, 0.5, 10.5)).toBe(0);
  });
});
