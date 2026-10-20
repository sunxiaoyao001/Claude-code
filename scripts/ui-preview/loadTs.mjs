// Loads miniprogram TypeScript in Node as CommonJS (transpile-only), so preview tools can call the real
// modules (pack catalogue, frame layout, component definitions) without a build step.
import { readFileSync, existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';

const require = createRequire(import.meta.url);
const ts = require('typescript');
const cache = new Map();

function resolveFile(from, specifier) {
  const base = resolve(dirname(from), specifier);
  for (const candidate of [base, `${base}.ts`, join(base, 'index.ts')]) {
    if (existsSync(candidate) && candidate.endsWith('.ts')) return candidate;
  }
  throw new Error(`cannot resolve ${specifier} from ${from}`);
}

/** Requires a .ts file; `globals` are visible to the module as free variables (e.g. Component, wx). */
export function loadTs(file, globals = {}) {
  const path = resolve(file);
  if (cache.has(path)) return cache.get(path).exports;
  const { outputText } = ts.transpileModule(readFileSync(path, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
    fileName: path,
  });
  const module = { exports: {} };
  cache.set(path, module);
  const localRequire = (specifier) => (specifier.startsWith('.') ? loadTs(resolveFile(path, specifier), globals) : require(specifier));
  const names = Object.keys(globals);
  new Function('exports', 'require', 'module', ...names, outputText)(module.exports, localRequire, module, ...names.map((n) => globals[n]));
  return module.exports;
}

/** Captures the options object a component file passes to Component(). */
export function loadComponentDefinition(file) {
  let captured = null;
  const wxStub = new Proxy({}, { get: () => () => undefined });
  const fresh = resolve(file);
  cache.delete(fresh);
  loadTs(fresh, { Component: (options) => { captured = options; }, wx: wxStub });
  if (!captured) throw new Error(`${file} did not call Component()`);
  return captured;
}
