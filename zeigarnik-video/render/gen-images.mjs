// 用 Pollinations（开源 Flux 模型）按导演手册的提示词生成写实镜头图，写入 assets/ 与 manifest.json
// 用法：node render/gen-images.mjs            # 生成所有缺失的镜头
//       node render/gen-images.mjs SH06 SH10  # 只重做指定镜头
//       node render/gen-images.mjs --seed 3   # 换一批随机种子
// 需要网络能访问 image.pollinations.ai
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ctx = { window: {} }; vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(ROOT, 'artifact/shots-doc.js'), 'utf8'), ctx);
const DOC = ctx.window.DOC;
const args = process.argv.slice(2), seedArg = args.indexOf('--seed'), SEED = seedArg >= 0 ? +args[seedArg + 1] : 1;
const only = args.filter((a, i) => /^SH\d/.test(a) && args[i - 1] !== '--seed'), DRY = args.includes('--dry');

// 静帧更适合偏写实摄影的描述：去掉 Midjourney 参数，强调真实照片与无文字
const STYLE = DOC.STYLE + ', real photograph, no text, no watermark, no logo';
const expand = (s) => Object.entries(DOC.CHAR).reduce((acc, [k, v]) => acc.split(k).join(v), s);
const PHOTOS = [
  'candid 35mm film snapshot from 2018, two friends hugging goodbye at an airport departure gate, faces turned away, warm afternoon light, nostalgic Kodak Portra 400 tones, slightly faded',
  'candid 35mm film snapshot from 2016, university graduates throwing caps into the sky seen from behind, summer light, nostalgic faded film colors',
  'candid 35mm film snapshot from 2020, a young woman waving from a train window at a station platform, motion blur, cool overcast tones, nostalgic',
  'candid 35mm film snapshot from 2015, two young people walking along a beach at sunset seen from behind, warm golden tones, nostalgic faded film',
  'candid 35mm film snapshot from 2019, a birthday cake with lit candles in a dim room, hands clapping around it, warm tungsten light, nostalgic',
];
const jobs = [];
for (const [id, d] of Object.entries(DOC.SHOTS)) if (d.img && id !== 'SH03') jobs.push({ id, w: 1080, h: 1920, prompt: `${expand(d.img)}, ${STYLE}` });
PHOTOS.forEach((p, i) => jobs.push({ id: `SH03-${i + 1}`, w: 768, h: 768, prompt: p + ', real photograph, no text' }));
// 半张照片里的画面是横向偏方的构图
const sh04 = jobs.find((j) => j.id === 'SH04'); if (sh04) { sh04.w = 768; sh04.h = 1024; }

const manPath = path.join(ROOT, 'assets/manifest.json');
const manifest = fs.existsSync(manPath) ? JSON.parse(fs.readFileSync(manPath, 'utf8')) : {};
let n = 0;
if (DRY) { jobs.forEach((j) => console.log(`${j.id} ${j.w}x${j.h}  ${j.prompt.slice(0, 110)}…`)); process.exit(0); }
for (const [k, j] of jobs.entries()) {
  if (only.length && !only.includes(j.id)) continue;
  const file = `${j.id}.jpg`, out = path.join(ROOT, 'assets', file);
  if (!only.length && fs.existsSync(out)) { manifest[j.id] = file; continue; }
  const seed = 1000 * SEED + k * 37 + 11;
  const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(j.prompt)}?width=${j.w}&height=${j.h}&seed=${seed}&model=flux&nologo=true&enhance=false&safe=true`;
  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      execFileSync('curl', ['-sS', '--fail', '--max-time', '180', '-o', out, url], { stdio: ['ignore', 'ignore', 'pipe'] });
      const head = fs.readFileSync(out).subarray(0, 3);
      if (head[0] !== 0xff || head[1] !== 0xd8) throw new Error('not a JPEG');
      manifest[j.id] = file; n++; console.log(`✓ ${j.id}  seed ${seed}`); break;
    } catch (e) {
      console.log(`… ${j.id} attempt ${attempt} failed: ${String(e.message).split('\n')[0]}`);
      if (attempt === 4) { try { fs.unlinkSync(out); } catch { /* 无文件 */ } }
      else execFileSync('sleep', [String(5 * attempt)]);
    }
  }
  fs.writeFileSync(manPath, JSON.stringify(manifest, null, 2));
}
fs.writeFileSync(manPath, JSON.stringify(manifest, null, 2));
console.log(`generated ${n}, manifest has ${Object.keys(manifest).length} entries`);
