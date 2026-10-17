#!/bin/sh
# Downloads the fonts the engine registers (all SIL OFL). Run once before building.
set -e
cd "$(dirname "$0")" && mkdir -p fonts && cd fonts
base=https://raw.githubusercontent.com
curl -sSL -o NotoSansSC-Black.otf $base/notofonts/noto-cjk/main/Sans/OTF/SimplifiedChinese/NotoSansCJKsc-Black.otf
curl -sSL -o NotoSansSC-Bold.otf  $base/notofonts/noto-cjk/main/Sans/OTF/SimplifiedChinese/NotoSansCJKsc-Bold.otf
curl -sSL -o DMMono-Medium.ttf    $base/google/fonts/main/ofl/dmmono/DMMono-Medium.ttf
curl -sSL -o Inter-Black.otf      $base/rsms/inter/v3.19/docs/font-files/Inter-Black.otf
curl -sSL -o Inter-ExtraBold.otf  $base/rsms/inter/v3.19/docs/font-files/Inter-ExtraBold.otf
ls -la
