#!/usr/bin/env bash
# Assemble the delivery folder (brief, step 6) from a normalised final render.
# Usage: scripts/deliver.sh <final.mp4> [outDir=../output]
set -euo pipefail
here="$(cd "$(dirname "$0")/.." && pwd)"
final="$1"
out="${2:-$here/../output}"
research="$here/../research"
mkdir -p "$out"
# The delivery file: H.264 High at 7 Mb/s (two-pass), so it stays under GitHub's 100 MB file limit
# and inside every platform's upload spec (they all re-encode anyway). The mastered audio is copied
# untouched. The CRF 16 master stays in out/.
pass="$(mktemp -d)/x264"
ffmpeg -v error -y -i "$final" -c:v libx264 -preset slow -profile:v high -level 4.2 -pix_fmt yuv420p -b:v 7000k -maxrate 9000k -bufsize 14000k -pass 1 -passlogfile "$pass" -an -f null /dev/null
ffmpeg -v error -y -i "$final" -c:v libx264 -preset slow -profile:v high -level 4.2 -pix_fmt yuv420p -b:v 7000k -maxrate 9000k -bufsize 14000k -pass 2 -passlogfile "$pass" -c:a copy -movflags +faststart "$out/final.mp4"
# Cover: frame 0 of the delivered file (the loop frame), high-quality JPEG.
ffmpeg -v error -y -i "$out/final.mp4" -vf "select=eq(n\,0)" -frames:v 1 -q:v 2 "$out/cover.jpg"
(cd "$here" && node --no-warnings scripts/export_srt.mjs "$here/out" >/dev/null)
cp "$here/out/three-fake-lincolns.zh.srt" "$out/subtitles_zh.srt"
cp "$here/out/three-fake-lincolns.en.srt" "$out/subtitles_en.srt"
cp "$research/credits.draft.json" "$out/credits.json"
cp "$research/scorecard.md" "$out/scorecard.md"
cp "$research/publish.md" "$out/publish.md"
cp "$here/README.md" "$out/README.md"
{
  echo "# ffprobe 报告"
  echo
  echo '```'
  ffprobe -v error -select_streams v:0 -show_entries stream=codec_name,width,height,r_frame_rate,nb_frames,pix_fmt -show_entries format=duration,bit_rate,size -of default=noprint_wrappers=1 "$out/final.mp4"
  ffprobe -v error -select_streams a:0 -show_entries stream=codec_name,sample_rate,channels,bit_rate -of default=noprint_wrappers=1 "$out/final.mp4"
  echo '```'
  echo
  echo "要求：9:16 1080×1920，30 fps，89.6 秒（用户指定 75–90 秒）。"
  echo
  python3 -I "$here/scripts/qa.py" "$out/final.mp4" || true
} > "$out/ffprobe_report.md"
ls -la "$out"
