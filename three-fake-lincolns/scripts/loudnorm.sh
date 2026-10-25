#!/usr/bin/env bash
# Two-pass loudness normalisation to −14 LUFS / −1.5 dBTP; the video stream is copied untouched.
# Usage: scripts/loudnorm.sh <in.mp4> <out.mp4>
set -euo pipefail
in="$1"
out="$2"
stats=$(ffmpeg -hide_banner -nostats -i "$in" -af loudnorm=I=-14:TP=-1.5:LRA=11:print_format=json -f null - 2>&1 | sed -n '/^{/,/^}/p')
get() { echo "$stats" | python3 -I -c "import json,sys; print(json.load(sys.stdin)['$1'])"; }
ffmpeg -hide_banner -y -i "$in" -c:v copy -c:a aac -b:a 320k -ar 48000 \
  -af "loudnorm=I=-14:TP=-1.5:LRA=11:measured_I=$(get input_i):measured_TP=$(get input_tp):measured_LRA=$(get input_lra):measured_thresh=$(get input_thresh):offset=$(get target_offset):linear=true" \
  -movflags +faststart "$out"
