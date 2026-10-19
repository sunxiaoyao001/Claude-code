// Builds dist/ from miniprogram/: cleans, compiles TypeScript with tsc, then copies every
// non-TypeScript file (wxml, wxss, json, images, binary LUTs) with the same relative path.
import { spawnSync } from 'node:child_process';
import { cpSync, existsSync, readdirSync, rmSync, statSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const srcDir = join(root, 'miniprogram');
const outDir = join(root, 'dist');

rmSync(outDir, { recursive: true, force: true });

const tsc = createRequire(import.meta.url).resolve('typescript/bin/tsc');
const compile = spawnSync(process.execPath, [tsc, '-p', join(root, 'tsconfig.json')], { stdio: 'inherit' });
if (compile.status !== 0) {
  console.error('build: tsc failed');
  process.exit(compile.status ?? 1);
}

let copied = 0;
function copyAssets(dir) {
  for (const name of readdirSync(dir)) {
    const from = join(dir, name);
    if (statSync(from).isDirectory()) {
      copyAssets(from);
      continue;
    }
    if (name.endsWith('.ts')) continue;
    cpSync(from, join(outDir, relative(srcDir, from)));
    copied += 1;
  }
}
copyAssets(srcDir);

if (!existsSync(join(outDir, 'app.js')) || !existsSync(join(outDir, 'app.json'))) {
  console.error('build: dist/ is missing app.js or app.json');
  process.exit(1);
}
console.log(`build: dist/ ready (${copied} assets copied)`);
