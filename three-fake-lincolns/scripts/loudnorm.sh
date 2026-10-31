#!/usr/bin/env bash
# Mastering to −14 LUFS integrated, true peak ≤ −1 dBTP, with the film's dynamics kept.
# One fixed chain: input gain → light bus compressor (ratio 1.6) → 4x-oversampled look-ahead limiter
# at −2 dBFS (a true-peak limiter in effect). The input gain is solved by measurement (a few passes)
# so the chain itself lands on −14 LUFS. No loudnorm: when its linear mode has no true-peak headroom
# it silently falls back to dynamic AGC, which flattens the loudness range and pumps the loop seam.
# Usage: scripts/loudnorm.sh <in.mp4|wav> <out.mp4|wav>
set -euo pipefail
in="$1"
out="$2"
chain() { echo "volume=${1}dB,acompressor=threshold=-24dB:ratio=1.6:attack=12:release=220:knee=8,aresample=192000,alimiter=limit=0.79:attack=2:release=60:asc=1:level=disabled,aresample=48000"; }
measure_i() { ffmpeg -hide_banner -nostats -i "$in" -af "$1,ebur128" -f null - 2>&1 | awk '/Summary:/{s=1} s&&/I:/{print $2; exit}'; }
i_in=$(ffmpeg -hide_banner -nostats -i "$in" -af ebur128 -f null - 2>&1 | awk '/Summary:/{s=1} s&&/I:/{print $2; exit}')
gain=$(python3 -I -c "print(round(-14 - ($i_in), 2))")
for _ in 1 2 3 4 5; do
  got=$(measure_i "$(chain "$gain")")
  step=$(python3 -I -c "d = -14 - ($got); print(round(d, 2) if abs(d) > 0.1 else 0)")
  [[ "$step" == "0" ]] && break
  gain=$(python3 -I -c "print(round($gain + $step, 2))")
done
if [[ "$out" == *.mp4 ]]; then
  ffmpeg -hide_banner -loglevel error -y -i "$in" -c:v copy -c:a aac -b:a 320k -ar 48000 -af "$(chain "$gain")" -movflags +faststart "$out"
else
  ffmpeg -hide_banner -loglevel error -y -i "$in" -af "$(chain "$gain")" -ar 48000 "$out"
fi
echo "input ${i_in} LUFS, gain ${gain} dB -> output $(ffmpeg -hide_banner -nostats -i "$out" -af ebur128 -f null - 2>&1 | awk '/Summary:/{s=1} s&&/I:/{print $2; exit}') LUFS"
