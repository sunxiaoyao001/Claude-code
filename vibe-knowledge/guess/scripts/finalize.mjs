/**
 * 成片后期：npm run finalize
 *  - 全范围 yuvj420p → 标准 yuv420p（避免部分播放器 / 网页发灰）
 *  - 响度标准化到 -16 LUFS、真峰值 -1.5 dBTP（短视频平台常用响度）
 *  - faststart：moov 前置，网页可边下边播
 * 使用 Remotion 自带的 ffmpeg，无需额外安装。
 */
import {execFileSync} from 'node:child_process';
import fs from 'node:fs';

const src = 'out/vibe-guess-two-thirds-1080x1920.mp4';
const tmp = 'out/.finalize-tmp.mp4';
execFileSync(
  'npx',
  [
    'remotion', 'ffmpeg', '-y', '-loglevel', 'error', '-i', src,
    '-vf', 'scale=in_range=full:out_range=limited,format=yuv420p',
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '20', '-profile:v', 'high', '-color_range', 'tv',
    '-af', 'loudnorm=I=-16:TP=-1.5:LRA=11', '-c:a', 'aac', '-b:a', '192k', '-ar', '48000',
    '-movflags', '+faststart', tmp,
  ],
  {stdio: 'inherit'},
);
fs.renameSync(tmp, src);
console.log(`✓ ${src}  ${(fs.statSync(src).size / 1024 / 1024).toFixed(1)} MB`);
