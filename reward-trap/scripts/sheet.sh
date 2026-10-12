#!/usr/bin/env bash
# Contact sheet: scripts/sheet.sh out/sheet.png img1.png img2.png ... (3 columns)
set -euo pipefail
out="$1"; shift
n=$#
cols=${COLS:-3}
rows=$(( (n + cols - 1) / cols ))
inputs=()
for f in "$@"; do inputs+=(-i "$f"); done
filter=""
for i in $(seq 0 $((n-1))); do filter+="[$i:v]scale=640:-1,drawtext=text='$(basename "${@:$((i+1)):1}" .png)':x=8:y=8:fontsize=18:fontcolor=white:box=1:boxcolor=black@0.5[v$i];"; done
for i in $(seq 0 $((n-1))); do filter+="[v$i]"; done
layout=""
for i in $(seq 0 $((n-1))); do
  c=$(( i % cols )); r=$(( i / cols ))
  layout+="$(( c * 640 ))_$(( r * 360 ))|"
done
filter+="xstack=inputs=$n:layout=${layout%|}:fill=black"
ffmpeg -loglevel error -y "${inputs[@]}" -filter_complex "$filter" "$out"
echo "$out"
