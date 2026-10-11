'use strict';
// 瓦片地图与关卡解析

const SOLID_TILES = { '#': 1, '=': 1, 'I': 1, '?': 1, 'B': 1, 'x': 1, 'U': 1 };
const ENTITY_CHARS = 'o*+CGP!@S|MNKwkhftbTszi';

class TileMap {
  constructor(rows) {
    this.h = rows.length;
    this.w = rows[0].length;
    this.t = [];
    for (const r of rows) for (let x = 0; x < this.w; x++) this.t.push(r[x] || '.');
    this.markers = new Set();
  }
  get(tx, ty) {
    if (tx < 0 || tx >= this.w) return '#';
    if (ty < 0 || ty >= this.h) return '.';
    return this.t[ty * this.w + tx];
  }
  set(tx, ty, c) {
    if (tx < 0 || tx >= this.w || ty < 0 || ty >= this.h) return;
    this.t[ty * this.w + tx] = c;
  }
  solid(tx, ty) {
    return SOLID_TILES[this.get(tx, ty)] === 1;
  }
  oneway(tx, ty) {
    return this.get(tx, ty) === '-';
  }
  isMarker(tx, ty) {
    return this.markers.has(tx + ',' + ty);
  }
  // 平台/锯片是否该在这里折返
  blocksMover(tx, ty) {
    return this.isMarker(tx, ty) || this.solid(tx, ty) || tx < 0 || tx >= this.w || ty < -2 || ty > this.h + 1;
  }
  get pw() { return this.w * TILE; }
  get ph() { return this.h * TILE; }
}

function parseLevel(L) {
  const map = new TileMap(L.rows);
  const spawns = [];
  let start = { tx: 2, ty: 2 };
  for (let ty = 0; ty < map.h; ty++) {
    for (let tx = 0; tx < map.w; tx++) {
      const c = map.get(tx, ty);
      if (ENTITY_CHARS.indexOf(c) < 0) continue;
      map.set(tx, ty, '.');
      if (c === '|') { map.markers.add(tx + ',' + ty); continue; }
      if (c === 'P') { start = { tx, ty }; continue; }
      spawns.push({ c, tx, ty });
    }
  }
  // 宝石按出现顺序（从左到右、从上到下）编号
  spawns.sort((a, b) => a.tx - b.tx || a.ty - b.ty);
  let gi = 0, si = 0;
  for (const s of spawns) {
    if (s.c === '*') s.index = gi++;
    if (s.c === '!') s.index = si++;
  }
  return { map, spawns, start };
}

if (typeof module !== 'undefined') module.exports = { TileMap, parseLevel, SOLID_TILES };
