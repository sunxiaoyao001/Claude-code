import { Cell, Ground, type GameMap } from '../sim/map/GameMap';
import { BIOMES, hex, matColor, mix, type RGB } from './palette';

const TREE: RGB = hex('#2f4b36');
const WRECK: RGB = hex('#3a3632');

function cellColor(map: GameMap, i: number): RGB {
  const k = map.cells[i] as Cell;
  const look = BIOMES[map.biome];
  const g = map.ground[i] as Ground;
  const ground = look.ground[g] ?? look.ground[Ground.Sand] ?? hex('#888888');
  switch (k) {
    case Cell.Wall:
    case Cell.Window:
      return mix(matColor(map.mat[i], map.biome), [20, 20, 18], 0.45);
    case Cell.Low:
      return mix(matColor(map.mat[i], map.biome), ground, 0.35);
    case Cell.Tree:
      return map.biome === 'snow' ? mix(TREE, [240, 245, 248], 0.15) : TREE;
    case Cell.Rock:
      return mix(look.rock, [30, 30, 30], 0.3);
    case Cell.Wreck:
      return WRECK;
    case Cell.Rubble:
      return mix(ground, [110, 104, 96], 0.5);
    default:
      return map.bld[i] >= 0 ? mix(ground, [60, 55, 50], 0.25) : ground;
  }
}

/**
 * Draw the map as an isometric diamond into `ctx` (per-pixel inverse projection).
 * The diamond fills a W x H box where H = W / 2.
 */
export function drawMapThumb(ctx: CanvasRenderingContext2D, map: GameMap, W: number, H: number) {
  const img = ctx.createImageData(W, H);
  const d = img.data;
  const N = map.w;
  for (let py = 0; py < H; py++) {
    for (let px = 0; px < W; px++) {
      // inverse of: px = (x - y) / N * W/2 + W/2 ; py = (x + y) / N * H/2
      const a = ((px + 0.5 - W / 2) / (W / 2)) * N; // x - y
      const b = ((py + 0.5) / (H / 2)) * N; // x + y
      const x = Math.floor((a + b) / 2);
      const y = Math.floor((b - a) / 2);
      const o = (py * W + px) * 4;
      if (x < 0 || y < 0 || x >= N || y >= N) {
        d[o + 3] = 0;
        continue;
      }
      const c = cellColor(map, y * N + x);
      d[o] = c[0];
      d[o + 1] = c[1];
      d[o + 2] = c[2];
      d[o + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
}

/** World (metres) -> thumbnail pixel. */
export function thumbPos(map: GameMap, W: number, H: number, x: number, y: number) {
  const N = map.w;
  return { px: ((x - y) / N) * (W / 2) + W / 2, py: ((x + y) / N) * (H / 2) };
}

export function thumbToWorld(map: GameMap, W: number, H: number, px: number, py: number) {
  const N = map.w;
  const a = ((px - W / 2) / (W / 2)) * N;
  const b = (py / (H / 2)) * N;
  return { x: (a + b) / 2, y: (b - a) / 2 };
}
