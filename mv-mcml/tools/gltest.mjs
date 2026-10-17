import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
for (const args of [[], ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'], ['--enable-unsafe-swiftshader']]) {
  const b = await chromium.launch({ args });
  const p = await b.newPage();
  const r = await p.evaluate(() => {
    const c = document.createElement('canvas'); const g = c.getContext('webgl2');
    if (!g) return 'no webgl2';
    const e = g.getExtension('WEBGL_debug_renderer_info');
    return e ? g.getParameter(e.UNMASKED_RENDERER_WEBGL) : 'webgl2 ok (no debug info)';
  });
  console.log(JSON.stringify(args), '->', r, '|', b.version());
  await b.close();
}
