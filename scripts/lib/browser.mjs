// Shared headless-Chromium plumbing for the GPU check and the preview renderers: finds Playwright,
// launches Chromium with SwiftShader WebGL, and serves miniprogram/ TypeScript to the page as ES
// modules (transpiled on the fly), so browser code runs the real pipeline sources.
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, extname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const require = createRequire(import.meta.url);
const ts = require('typescript');

export const ORIGIN = 'http://gl.test';

const TYPES = { '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.html': 'text/html', '.css': 'text/css' };

export async function loadPlaywright() {
  const candidates = ['playwright', process.env.PLAYWRIGHT_MODULE, '/opt/node-tools/node_modules/playwright/index.mjs'].filter(Boolean);
  for (const candidate of candidates) {
    try {
      const specifier = candidate.startsWith('/') ? pathToFileURL(candidate).href : candidate;
      return await import(specifier);
    } catch {
      // try the next location
    }
  }
  return null;
}

/** Launches Chromium, or returns { skip: reason } when Playwright or the browser is unavailable. */
export async function launchChromium() {
  const playwright = await loadPlaywright();
  if (!playwright?.chromium) return { skip: 'Playwright/Chromium not available (set PLAYWRIGHT_MODULE to its index.mjs)' };
  try {
    const browser = await playwright.chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
    return { browser };
  } catch (error) {
    return { skip: `Chromium failed to launch (${String(error.message ?? error).split('\n')[0]})` };
  }
}

export function transpile(file) {
  const output = ts.transpileModule(readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020, verbatimModuleSyntax: false },
    fileName: file,
  });
  return output.outputText;
}

/**
 * Default routes: /core/** and /components/** -> miniprogram TS as ES modules, /pack-tools/**.mts,
 * /assets/** files. `extra(pathname)` can answer first (pages, harness scripts, sample photos).
 */
export function resolveRequest(pathname, extra) {
  const custom = extra?.(pathname);
  if (custom) return custom;
  if (pathname.startsWith('/pack-tools/') && pathname.endsWith('.mts')) return { body: transpile(join(root, pathname)), type: 'text/javascript' };
  if (pathname.startsWith('/assets/')) {
    return { body: readFileSync(join(root, 'miniprogram', pathname)), type: TYPES[extname(pathname)] ?? 'application/octet-stream' };
  }
  if (pathname.startsWith('/core/') || pathname.startsWith('/components/')) {
    return { body: transpile(join(root, 'miniprogram', `${pathname}.ts`)), type: 'text/javascript' };
  }
  return null;
}

/** Opens a page on ORIGIN whose requests are answered by resolveRequest(…, extra). */
export async function openPage(browser, extra, options = {}) {
  const page = await browser.newPage(options);
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.route(`${ORIGIN}/**`, (route) => {
    let resolved = null;
    try {
      resolved = resolveRequest(new URL(route.request().url()).pathname, extra);
    } catch (error) {
      errors.push(String(error.message ?? error));
    }
    if (!resolved) return route.fulfill({ status: 404, body: 'not found' });
    return route.fulfill({ status: 200, contentType: resolved.type, body: resolved.body });
  });
  return { page, errors };
}
