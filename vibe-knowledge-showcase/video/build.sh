#!/usr/bin/env bash
# One-shot build for an episode: cue export → music → frames → final mp4
# Usage: ./build.sh ep02   (writes ../<slug>.mp4, slug comes from the episode's CONFIG.slug)
set -euo pipefail
cd "$(dirname "$0")"
EP="${1:?usage: ./build.sh <ep>   e.g. ./build.sh ep02}"
[ -d node_modules ] || npm install
export NODE_PATH="${NODE_PATH:-$(npm root -g)}"
node render.js "$EP" cues
python3 music.py "$EP"
node render.js "$EP" video "${WORKERS:-4}"
SLUG=$(python3 -c "import json,sys; print(json.load(open(sys.argv[1]))['slug'])" "out/$EP/cues.json")
ffmpeg -y -loglevel error -i "out/$EP/video_noaudio.mp4" -i "out/$EP/music.wav" \
  -c:v libx264 -preset slow -crf 23 -pix_fmt yuv420p -af loudnorm=I=-14:TP=-1.5:LRA=11 -c:a aac -b:a 192k -ar 44100 \
  -movflags +faststart -shortest "../$SLUG.mp4"
echo "→ ../$SLUG.mp4"
