import {loadFont} from '@remotion/fonts';
import {staticFile} from 'remotion';

loadFont({family: 'Noto Sans SC', url: staticFile('fonts/NotoSansSC.woff2'), weight: '100 900'});
loadFont({family: 'Noto Serif SC', url: staticFile('fonts/NotoSerifSC.woff2'), weight: '200 900'});
loadFont({family: 'JetBrains Mono', url: staticFile('fonts/JetBrainsMono.woff2'), weight: '100 800'});
