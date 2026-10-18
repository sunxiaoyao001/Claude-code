// Render the soundtrack to WAV via headless Chromium's OfflineAudioContext.
// usage: node tools/audio.js <out.wav>
const { chromium } = require('/opt/node-tools/node_modules/playwright');
const path = require('path'), fs = require('fs');
const { openTrailer } = require('./still.js');
(async () => {
  const out = process.argv[2];
  const browser = await chromium.launch();
  const page = await openTrailer(browser, path.resolve(__dirname, '../src'));
  const t0 = Date.now();
  const n = await page.evaluate(async () => {
    const buf = await AudioEngine.render();
    window.__wav = AudioEngine.toWav(buf);
    return window.__wav.length;
  });
  console.log('rendered audio in', (Date.now() - t0) / 1000, 's, bytes', n);
  const chunks = [];
  for (let o = 0; o < n; o += 4 << 20) {
    const b64 = await page.evaluate(([o, len]) => {
      const a = window.__wav.subarray(o, o + len); let s = '';
      for (let i = 0; i < a.length; i += 0x8000) s += String.fromCharCode.apply(null, a.subarray(i, i + 0x8000));
      return btoa(s);
    }, [o, 4 << 20]);
    chunks.push(Buffer.from(b64, 'base64'));
  }
  fs.writeFileSync(out, Buffer.concat(chunks));
  console.log('wrote', out);
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
