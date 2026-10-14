/**
 * 本地字体加载：@remotion/fonts 内部会 delayRender，
 * 字体全部就绪前不会截帧，避免首帧出现回退字体。
 */
import {loadFont} from '@remotion/fonts';
import {staticFile} from 'remotion';

const FILES: {family: string; file: string; weight: string}[] = [
  {family: 'Noto Serif SC', file: 'NotoSerifSC-Black.woff2', weight: '900'},
  {family: 'Noto Sans SC', file: 'NotoSansSC-Medium.woff2', weight: '500'},
  {family: 'Noto Sans SC', file: 'NotoSansSC-Bold.woff2', weight: '700'},
  {family: 'Noto Sans SC', file: 'NotoSansSC-Black.woff2', weight: '900'},
  {family: 'Oswald', file: 'oswald-latin-500-normal.woff2', weight: '500'},
  {family: 'Oswald', file: 'oswald-latin-700-normal.woff2', weight: '700'},
  {family: 'JetBrains Mono', file: 'jetbrains-mono-latin-500-normal.woff2', weight: '500'},
  {family: 'JetBrains Mono', file: 'jetbrains-mono-latin-700-normal.woff2', weight: '700'},
];

let started = false;
export const ensureFonts = () => {
  if (started) return;
  started = true;
  for (const f of FILES) {
    loadFont({family: f.family, url: staticFile(`fonts/${f.file}`), weight: f.weight, format: 'woff2'});
  }
};
