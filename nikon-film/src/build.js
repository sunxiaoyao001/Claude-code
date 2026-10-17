// build.js — parallel render, concat, score, mux with grain, SRT + EDL export. node src/build.js [workers]
'use strict';
const { spawn, execFileSync } = require('child_process');
const fs = require('fs'), path = require('path');
const E = require('./engine');
const EDL = require('./edl');
const ROOT = path.join(__dirname, '..'), OUT = path.join(ROOT, 'out'), TMP = path.join(OUT, 'segments');
fs.mkdirSync(TMP, { recursive: true });
const N = Number(process.argv[2]) || 4;
const total = Math.round(EDL.DURATION * E.FPS);
const tag = EDL.SECOND === 'en' ? '' : '-zh';

fs.writeFileSync(path.join(OUT, 'edl.json'), JSON.stringify(EDL.toJSON(), null, 1));
fs.writeFileSync(path.join(OUT, `nikon-century${tag}.srt`), EDL.toSRT());

const run = (args) => new Promise((res, rej) => { const p = spawn('node', args, { stdio: 'inherit', env: process.env }); p.on('close', c => (c ? rej(new Error('worker ' + c)) : res())); });
(async () => {
  const t0 = Date.now();
  // interleave chunks so each worker gets a mix of heavy and light shots
  const CH = 48, chunks = [];
  for (let f = 0; f < total; f += CH) chunks.push([f, Math.min(total, f + CH)]);
  let next = 0;
  const worker = async () => { while (next < chunks.length) { const [a, b] = chunks[next++]; await run([path.join(__dirname, 'render.js'), a, b, path.join(TMP, `seg-${String(a).padStart(5, '0')}.mp4`)]); } };
  await Promise.all(Array.from({ length: N }, worker));
  const list = chunks.map(([a]) => `file 'seg-${String(a).padStart(5, '0')}.mp4'`).join('\n');
  fs.writeFileSync(path.join(TMP, 'list.txt'), list);
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', path.join(TMP, 'list.txt'), '-c', 'copy', path.join(OUT, `picture${tag}.mp4`)]);
  console.log(`picture: ${total} frames in ${((Date.now() - t0) / 1000).toFixed(0)} s`);
  // score reads edl.json; grain is added only here, at mux time
  execFileSync('python3', [path.join(ROOT, 'music', 'music.py')], { stdio: 'inherit' });
  const pic = path.join(OUT, `picture${tag}.mp4`), wav = path.join(OUT, 'score.wav'), film = path.join(OUT, `nikon-century${tag}.mp4`);
  const v = ['-vf', 'noise=alls=5:allf=t+u', '-c:v', 'libx264', '-b:v', '6M', '-preset', 'slow'];
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', pic, ...v, '-pass', '1', '-passlogfile', path.join(TMP, 'x264'), '-an', '-f', 'null', '/dev/null']);
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', pic, '-i', wav, ...v, '-maxrate', '9M', '-bufsize', '12M', '-pass', '2', '-passlogfile', path.join(TMP, 'x264'),
    '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '256k', '-movflags', '+faststart', '-shortest', film]);
  console.log('film:', film, `(${((Date.now() - t0) / 1000).toFixed(0)} s total)`);
})();
