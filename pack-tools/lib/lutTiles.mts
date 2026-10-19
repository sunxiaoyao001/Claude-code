// Packs a 3D LUT into the 2D tile layout the shaders read (CLAUDE.md §4): blue slice s is the tile at
// column s % tiles, row floor(s / tiles); inside a tile x = red, y = green. 33^3 -> 6x6 tiles, 198x198.
import type { Cube } from './cube.mts';

export interface TileImage {
  width: number;
  height: number;
  /** RGB, 3 bytes per pixel, row 0 at the top. */
  rgb: Uint8Array;
}

export function tilesPerSide(size: number): number {
  return Math.ceil(Math.sqrt(size));
}

export function packTiles(cube: Cube): TileImage {
  const { size, data } = cube;
  const tiles = tilesPerSide(size);
  const width = size * tiles;
  const rgb = new Uint8Array(width * width * 3);
  for (let b = 0; b < size; b++) {
    const tileX = (b % tiles) * size;
    const tileY = Math.floor(b / tiles) * size;
    for (let g = 0; g < size; g++) {
      for (let r = 0; r < size; r++) {
        const src = (b * size * size + g * size + r) * 3;
        const dst = ((tileY + g) * width + tileX + r) * 3;
        for (let c = 0; c < 3; c++) rgb[dst + c] = Math.round((data[src + c] ?? 0) * 255);
      }
    }
  }
  return { width, height: width, rgb };
}

/** Inverse of packTiles, used by tests and for inspecting shipped LUTs. */
export function unpackTiles(image: TileImage, size: number): Uint8Array {
  const tiles = tilesPerSide(size);
  const out = new Uint8Array(size ** 3 * 3);
  for (let b = 0; b < size; b++) {
    const tileX = (b % tiles) * size;
    const tileY = Math.floor(b / tiles) * size;
    for (let g = 0; g < size; g++) {
      for (let r = 0; r < size; r++) {
        const src = ((tileY + g) * image.width + tileX + r) * 3;
        const dst = (b * size * size + g * size + r) * 3;
        for (let c = 0; c < 3; c++) out[dst + c] = image.rgb[src + c] ?? 0;
      }
    }
  }
  return out;
}
