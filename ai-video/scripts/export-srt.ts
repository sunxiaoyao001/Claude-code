// 导出字幕 / 录音稿：node scripts/export-srt.ts
// 生成 out/subtitles.srt（可导入剪映等剪辑软件）和 out/narration.txt（录音时照着读）。
import {mkdirSync, writeFileSync} from 'node:fs';
import {FPS, SCENES} from '../src/script.ts';

const stamp = (frame: number) => {
	const ms = Math.round((frame / FPS) * 1000);
	const pad = (n: number, w = 2) => String(n).padStart(w, '0');
	return `${pad(Math.floor(ms / 3600000))}:${pad(Math.floor(ms / 60000) % 60)}:${pad(Math.floor(ms / 1000) % 60)},${pad(ms % 1000, 3)}`;
};

const srt: string[] = [];
const narration: string[] = [];
let offset = 0;
let n = 1;
for (const s of SCENES) {
	narration.push(`【${s.chapter ? `${s.chapter.no} ${s.chapter.title}` : s.id}】 ${stamp(offset)}`);
	for (const line of s.lines) {
		srt.push(`${n++}\n${stamp(offset + line.from)} --> ${stamp(offset + line.from + line.duration)}\n${line.text}\n`);
		narration.push(line.text);
	}
	narration.push('');
	offset += s.durationInFrames;
}

mkdirSync('out', {recursive: true});
writeFileSync('out/subtitles.srt', srt.join('\n'));
writeFileSync('out/narration.txt', narration.join('\n'));
console.log(`共 ${n - 1} 句字幕，总时长 ${(offset / FPS).toFixed(1)} 秒 → out/subtitles.srt, out/narration.txt`);
