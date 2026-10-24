#!/usr/bin/env bash
# Fetch the Noto CJK sources (SIL OFL 1.1) that scripts/subset_fonts.py subsets.
set -euo pipefail
cd "$(dirname "$0")/../assets/fonts_src"
base="https://raw.githubusercontent.com/notofonts/noto-cjk/main"
for f in Serif/SubsetOTF/SC/NotoSerifSC-Black.otf Sans/SubsetOTF/SC/NotoSansSC-Medium.otf Sans/SubsetOTF/SC/NotoSansSC-Bold.otf; do
  [ -f "$(basename "$f")" ] || curl -sSL --fail -o "$(basename "$f")" "$base/$f"
done
[ -f LICENSE-OFL.txt ] || curl -sSL --fail -o LICENSE-OFL.txt "$base/Sans/LICENSE"
