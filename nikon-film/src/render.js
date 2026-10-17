// render.js — worker: renders frames [f0, f1) and pipes raw RGBA into ffmpeg. node src/render.js f0 f1 out.mp4
'use strict';
const { spawn } = require('child_process');
const E = require('./engine');
const S = require('./scenes');
const [f0, f1, out] = [Number(process.argv[2]), Number(process.argv[3]), process.argv[4]];
const cv = E.createCanvas(E.W, E.H), ctx = cv.getContext('2d');
const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'rawvideo', '-pix_fmt', 'rgba', '-s', `${E.W}x${E.H}`, '-r', String(E.FPS), '-i', '-',
  '-c:v', 'libx264', '-preset', 'fast', '-crf', '10', '-pix_fmt', 'yuv420p', out], { stdio: ['pipe', 'inherit', 'inherit'] });
(async () => {
  for (let f = f0; f < f1; f++) {
    S.renderFrame(ctx, f / E.FPS);
    if (!ff.stdin.write(cv.data())) await new Promise(r => ff.stdin.once('drain', r));
    if ((f - f0) % 48 === 0) process.stderr.write(`[${f0}-${f1}] ${f}\n`);
  }
  ff.stdin.end();
})();
ff.on('close', code => process.exit(code));
