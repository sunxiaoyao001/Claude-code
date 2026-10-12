import '@fontsource/noto-serif-sc/600.css';
import '@fontsource/noto-serif-sc/900.css';
import '@fontsource/noto-sans-sc/300.css';
import '@fontsource/noto-sans-sc/400.css';
import '@fontsource/noto-sans-sc/500.css';
import '@fontsource/noto-sans-sc/700.css';
import '@fontsource/noto-sans-sc/900.css';
import '@fontsource/jetbrains-mono/400.css';
import '@fontsource/jetbrains-mono/600.css';
import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import '@fontsource/inter/700.css';
import '@fontsource/inter/800.css';
import {continueRender, delayRender} from 'remotion';
import {CHARSET} from '../generated/charset';

// CJK fonts ship as ~100 unicode-range slices per weight. Ask the browser to fetch exactly the
// slices our copy needs and hold the first frame until they are in, so no frame ever shows a fallback.
const FACES = [
  '600 32px "Noto Serif SC"',
  '900 32px "Noto Serif SC"',
  '300 32px "Noto Sans SC"',
  '400 32px "Noto Sans SC"',
  '500 32px "Noto Sans SC"',
  '700 32px "Noto Sans SC"',
  '900 32px "Noto Sans SC"',
  '400 32px "JetBrains Mono"',
  '600 32px "JetBrains Mono"',
  '400 32px "Inter"',
  '500 32px "Inter"',
  '600 32px "Inter"',
  '700 32px "Inter"',
  '800 32px "Inter"',
];

let started = false;
export const ensureFonts = () => {
  if (started || typeof document === 'undefined') return;
  started = true;
  const handle = delayRender('Loading fonts', {timeoutInMilliseconds: 120000});
  Promise.all(FACES.map((f) => document.fonts.load(f, CHARSET)))
    .then(() => document.fonts.ready)
    .then(() => continueRender(handle))
    .catch((err) => {
      console.error('Font preload failed', err);
      continueRender(handle);
    });
};
