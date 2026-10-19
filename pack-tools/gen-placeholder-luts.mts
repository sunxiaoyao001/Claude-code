// Generates the built-in placeholder LUTs as 6x6-tile PNGs into miniprogram/assets/luts/.
//   node --experimental-strip-types pack-tools/gen-placeholder-luts.mts [--cube <dir>]
// --cube also writes the .cube files for inspection in other tools (not committed: reproducible).
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { buildCube, formatCube } from './lib/cube.mts';
import { applyLook, PLACEHOLDER_LOOKS } from './lib/looks.mts';
import { packTiles } from './lib/lutTiles.mts';
import { encodePngRgb } from './lib/png.mts';

const LUT_SIZE = 33;
const root = join(import.meta.dirname, '..');
const outDir = join(root, 'miniprogram', 'assets', 'luts');
const cubeFlag = process.argv.indexOf('--cube');
const cubeDir = cubeFlag >= 0 ? process.argv[cubeFlag + 1] : undefined;

mkdirSync(outDir, { recursive: true });
if (cubeDir) mkdirSync(cubeDir, { recursive: true });

for (const [id, look] of Object.entries(PLACEHOLDER_LOOKS)) {
  const cube = buildCube(`${id} (placeholder)`, LUT_SIZE, (r, g, b) => applyLook(look, [r, g, b]));
  const tiles = packTiles(cube);
  const png = encodePngRgb(tiles.width, tiles.height, tiles.rgb);
  writeFileSync(join(outDir, `${id}.png`), png);
  if (cubeDir) writeFileSync(join(cubeDir, `${id}.cube`), formatCube(cube));
  console.log(`${id}: ${tiles.width}x${tiles.height} PNG, ${(png.length / 1024).toFixed(1)} KB`);
}
