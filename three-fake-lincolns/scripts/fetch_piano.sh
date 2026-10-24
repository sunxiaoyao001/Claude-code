#!/usr/bin/env bash
# Fetch the Salamander Grand Piano V3 samples the score uses (Alexander Holm, CC BY 3.0)
# from github.com/sfzinstruments/SalamanderGrandPiano and convert them to WAV.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SRC="${SALAMANDER_DIR:-$ROOT/assets/salamander}"
OUT="$ROOT/assets/piano_src"
if [ ! -d "$SRC/.git" ]; then
  GIT_LFS_SKIP_SMUDGE=1 git clone --depth 1 --filter=blob:none --no-checkout https://github.com/sfzinstruments/SalamanderGrandPiano "$SRC"
fi
files=$(git -C "$SRC" ls-tree -r --name-only HEAD Samples | grep -E "^Samples/(C2|D#2|F#2|A2|C3|D#3|F#3|A3|C4|D#4|F#4|A4|C5|D#5|F#5)v(7|11)\.flac$")
git -C "$SRC" checkout HEAD -- $files
mkdir -p "$OUT"
git -C "$SRC" show HEAD:LICENSE > "$OUT/LICENSE-CC-BY-3.0.txt"
for f in $files; do
  name=$(basename "$f" .flac)
  ffmpeg -v error -y -i "$SRC/$f" -ar 48000 -ac 2 -c:a pcm_s16le "$OUT/$name.wav"
done
echo "$(ls "$OUT"/*.wav | wc -l) samples in $OUT"
