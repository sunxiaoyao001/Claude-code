// Converts a 33^3 .cube into the 6x6-tile PNG the shaders sample (CLAUDE.md §4).
//   node --experimental-strip-types pack-tools/cube2png.mts <input.cube> <output.png>
// PNG instead of a raw .bin: always on the code-package upload whitelist, decoded natively into a
// texture, and deflate makes it smaller than the 107,811-byte raw table.
import { readFileSync, writeFileSync } from 'node:fs';
import { parseCube } from './lib/cube.mts';
import { packTiles } from './lib/lutTiles.mts';
import { encodePngRgb } from './lib/png.mts';

const SHADER_LUT_SIZE = 33;
const [input, output] = process.argv.slice(2);
if (!input || !output) {
  console.error('usage: cube2png <input.cube> <output.png>');
  process.exit(2);
}

const cube = parseCube(readFileSync(input, 'utf8'));
if (cube.size !== SHADER_LUT_SIZE) {
  console.error(`expected LUT_3D_SIZE ${SHADER_LUT_SIZE} (the shader layout), got ${cube.size}; resample first`);
  process.exit(1);
}
const tiles = packTiles(cube);
const png = encodePngRgb(tiles.width, tiles.height, tiles.rgb);
writeFileSync(output, png);
console.log(`${output}: ${tiles.width}x${tiles.height}, ${(png.length / 1024).toFixed(1)} KB`);
