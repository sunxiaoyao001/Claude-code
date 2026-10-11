import '@fontsource/noto-sans-sc/400.css';
import '@fontsource/noto-sans-sc/500.css';
import '@fontsource/noto-sans-sc/700.css';
import '@fontsource/noto-sans-sc/900.css';
import '@fontsource/noto-serif-sc/600.css';
import '@fontsource/noto-serif-sc/900.css';
import '@fontsource/jetbrains-mono/400.css';
import '@fontsource/jetbrains-mono/600.css';
import {continueRender, delayRender} from 'remotion';
import {ALL_TEXT} from './copy';

const ascii = ' 0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ.,:;!?%/+-×=()[]&·•→←↓↑≈×°\'"#';
const text = ALL_TEXT + ascii;

let started = false;

export const ensureFonts = () => {
  if (started || typeof document === 'undefined') return;
  started = true;
  const handle = delayRender('fonts');
  const specs = [
    '400 40px "Noto Sans SC"',
    '500 40px "Noto Sans SC"',
    '700 40px "Noto Sans SC"',
    '900 40px "Noto Sans SC"',
    '600 40px "Noto Serif SC"',
    '900 40px "Noto Serif SC"',
    '400 40px "JetBrains Mono"',
    '600 40px "JetBrains Mono"',
  ];
  Promise.all(specs.map((s) => document.fonts.load(s, text)))
    .then(() => document.fonts.ready)
    .then(() => continueRender(handle))
    .catch((e) => {
      console.error('font load failed', e);
      continueRender(handle);
    });
};
