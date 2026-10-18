import {loadFont} from '@remotion/fonts';
import {staticFile} from 'remotion';

export const fontsReady = Promise.all([
	loadFont({family: 'Noto Sans SC', url: staticFile('fonts/NotoSansSC.woff2'), weight: '100 900'}),
	loadFont({family: 'Noto Serif SC', url: staticFile('fonts/NotoSerifSC.woff2'), weight: '200 900'}),
	loadFont({family: 'JetBrains Mono', url: staticFile('fonts/JetBrainsMono.woff2'), weight: '100 800'}),
	loadFont({family: 'Inter Tight', url: staticFile('fonts/InterTight.woff2'), weight: '100 900'}),
]);
