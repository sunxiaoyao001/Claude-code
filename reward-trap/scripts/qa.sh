#!/usr/bin/env bash
# Post-render QA: stream info, loudness, and a contact sheet sampled every N seconds.
# Usage: scripts/qa.sh out/reward-trap.mp4 [interval_seconds]
set -euo pipefail
in="${1:-out/reward-trap.mp4}"
step="${2:-6}"
ffprobe -v error -show_entries format=duration,size,bit_rate:stream=codec_name,width,height,r_frame_rate,sample_rate,channels -of default=nw=1 "$in"
ffmpeg -hide_banner -nostats -i "$in" -af ebur128 -f null - 2>&1 | grep -E "^\s+I:|^\s+LRA:" | head -2
mkdir -p out/qa
rm -f out/qa/*.png
ffmpeg -loglevel error -i "$in" -vf "fps=1/${step},scale=480:-1,drawtext=text='%{pts\:hms}':x=6:y=6:fontsize=16:fontcolor=white:box=1:boxcolor=black@0.55" out/qa/f%03d.png
ffmpeg -loglevel error -y -pattern_type glob -i 'out/qa/f*.png' -vf "tile=6x5:padding=4:color=black" -frames:v 1 out/qa-sheet-1.png
n=$(ls out/qa/f*.png | wc -l)
if [ "$n" -gt 30 ]; then
  ffmpeg -loglevel error -y -start_number 31 -i 'out/qa/f%03d.png' -vf "tile=6x5:padding=4:color=black" -frames:v 1 out/qa-sheet-2.png
fi
echo "frames sampled: $n"
