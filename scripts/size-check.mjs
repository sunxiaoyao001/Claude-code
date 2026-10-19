// Main-package size gate. WeChat rejects a main package over 2 MB; we warn from 1.8 MB.
// Measures the unminified dist/, so the real upload is a little smaller than reported here.
import { existsSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const WARN_BYTES = 1.8 * 1024 * 1024;
const LIMIT_BYTES = 2 * 1024 * 1024;

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'dist');
if (!existsSync(outDir)) {
  console.error('size: dist/ not found, run the build first');
  process.exit(1);
}

const files = [];
function walk(dir) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    const stat = statSync(path);
    if (stat.isDirectory()) walk(path);
    else files.push({ path: relative(outDir, path), bytes: stat.size });
  }
}
walk(outDir);

const total = files.reduce((sum, file) => sum + file.bytes, 0);
const kb = (bytes) => `${(bytes / 1024).toFixed(1)} KB`;
console.log(`size: main package ${kb(total)} / ${kb(LIMIT_BYTES)} (${files.length} files)`);
for (const file of files.sort((a, b) => b.bytes - a.bytes).slice(0, 5)) {
  console.log(`  ${kb(file.bytes).padStart(10)}  ${file.path}`);
}

if (total > LIMIT_BYTES) {
  console.error('size: FAIL, main package exceeds 2 MB');
  process.exit(1);
}
if (total > WARN_BYTES) console.warn('size: WARN, main package is above 1.8 MB');
