// Render lakehaven-map.html to an A4-landscape PDF with Playwright.
// Usage: node lakehaven/render_pdf.js [--png <dir>]   (--png also writes one preview PNG per page)
const path = require('path');
const { chromium } = require('playwright');

(async () => {
  const dir = __dirname;
  const pngIdx = process.argv.indexOf('--png');
  const pngDir = pngIdx > -1 ? process.argv[pngIdx + 1] || dir : null;
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1200, height: 900 }, deviceScaleFactor: 2 });
  await page.goto('file://' + path.join(dir, 'lakehaven-map.html'));
  await page.pdf({ path: path.join(dir, 'lakehaven-map.pdf'), format: 'A4', landscape: true, printBackground: true });
  if (pngDir) {
    await page.emulateMedia({ media: 'print' });
    const pages = await page.$$('.page');
    for (let i = 0; i < pages.length; i++) {
      await pages[i].screenshot({ path: path.join(pngDir, `preview-${i + 1}.png`) });
    }
  }
  await browser.close();
  console.log('wrote lakehaven-map.pdf');
})();
