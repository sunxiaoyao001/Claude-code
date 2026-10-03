#!/usr/bin/env bash
# One-shot build: fonts → cue export → music → frames → final mp4
set -euo pipefail
cd "$(dirname "$0")"
[ -d node_modules ] || npm install
export NODE_PATH="${NODE_PATH:-$(npm root -g)}"
node render.js cues
python3 music.py
node render.js video "${WORKERS:-4}"
ffmpeg -y -loglevel error -i out/video_noaudio.mp4 -i out/music.wav \
  -c:v libx264 -preset slow -crf 23 -pix_fmt yuv420p -af loudnorm=I=-14:TP=-1.5:LRA=11 -c:a aac -b:a 192k -ar 44100 \
  -movflags +faststart -shortest ../vibe-coding-jargon.mp4
echo "→ ../vibe-coding-jargon.mp4"
