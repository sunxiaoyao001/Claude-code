#!/usr/bin/env bash
# Mastering + two-pass loudnorm: −14 LUFS integrated, true peak ≤ −1.5 dBTP, no clipping.
# The mix keeps cinematic peaks (sub hits, the seal), so a gentle bus compressor and a look-ahead
# limiter go first; loudnorm's second pass can then stay linear (no pumping).
# Usage: scripts/loudnorm.sh <in.mp4|wav> <out.mp4|wav>
set -euo pipefail
in="$1"
out="$2"
measure_i() { ffmpeg -hide_banner -nostats -i "$1" -af ebur128 -f null - 2>&1 | awk '/Summary:/{s=1} s&&/I:/{print $2; exit}'; }
i=$(measure_i "$in")
pre=$(python3 -I -c "print(round(-16 - ($i), 2))")
master="volume=${pre}dB,acompressor=threshold=-20dB:ratio=2.5:attack=8:release=180:knee=6,alimiter=limit=0.71:attack=3:release=60:asc=1:level=disabled"
json=$(ffmpeg -hide_banner -nostats -i "$in" -af "${master},loudnorm=I=-14:TP=-1.5:LRA=11:print_format=json" -f null - 2>&1 | sed -n '/^{/,/^}/p')
get() { echo "$json" | python3 -I -c "import json,sys; print(json.load(sys.stdin)['$1'])"; }
norm="loudnorm=I=-14:TP=-1.5:LRA=11:measured_I=$(get input_i):measured_TP=$(get input_tp):measured_LRA=$(get input_lra):measured_thresh=$(get input_thresh):offset=$(get target_offset):linear=true"
if [[ "$out" == *.mp4 ]]; then
  ffmpeg -hide_banner -loglevel error -y -i "$in" -c:v copy -c:a aac -b:a 320k -ar 48000 -af "${master},${norm}" -movflags +faststart "$out"
else
  ffmpeg -hide_banner -loglevel error -y -i "$in" -af "${master},${norm}" -ar 48000 "$out"
fi
echo "input ${i} LUFS -> output $(measure_i "$out") LUFS"
