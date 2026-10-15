// 从 timeline.js 导出：subtitles.srt（剪映/PR 可直接导入）与 voiceover.txt（配音稿，含停顿）
import fs from 'node:fs';
import vm from 'node:vm';
const ctx = { window: {} }; vm.createContext(ctx);
vm.runInContext(fs.readFileSync(new URL('../engine/timeline.js', import.meta.url), 'utf8'), ctx);
const { LINES } = ctx.window.ZG;
const ts = (t) => { const ms = Math.round(t * 1000), h = Math.floor(ms / 3600000), m = Math.floor(ms / 60000) % 60, s = Math.floor(ms / 1000) % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')},${String(ms % 1000).padStart(3, '0')}`; };
const srt = LINES.map((l, i) => `${i + 1}\n${ts(l.t0)} --> ${ts(l.t1)}\n${l.text}\n`).join('\n');
fs.writeFileSync(new URL('../subtitles.srt', import.meta.url), srt);
let prev = 0;
const vo = LINES.map((l) => { const gap = l.t0 - prev; prev = l.voEnd || l.t1;
  return `${gap > 0.35 ? `（停 ${gap.toFixed(1)} 秒）\n` : ''}[${l.t0.toFixed(1)}s] ${l.text.replace(/TA/g, '他')}`; }).join('\n');
fs.writeFileSync(new URL('../voiceover.txt', import.meta.url), '# 旁白稿（口播“他/她”同音，字幕用 TA）\n# 语速约每秒 4.5 字，句间停顿按括号提示\n\n' + vo + '\n');
console.log(LINES.length, 'lines');
