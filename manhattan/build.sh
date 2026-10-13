#!/bin/sh
# Inline all sources into a single page: manhattan/index.html
set -e
cd "$(dirname "$0")"
OUT=index.html
cat src/head.html > $OUT
echo '<script type="module">' >> $OUT
for f in core materials citygen builders parks landmarks bridges lands env life world player hud main; do
  echo "// ---- $f.js ----" >> $OUT
  cat src/$f.js >> $OUT
done
echo '</script>' >> $OUT
wc -c $OUT
