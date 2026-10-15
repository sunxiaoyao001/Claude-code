#!/bin/bash
cd "$(dirname "$0")"
echo "正在合并 4K 成片，请稍候..."
cat BGL_4K60.mp4.part* > "别过来_4K60.mp4"
if command -v shasum >/dev/null; then shasum -a 256 "别过来_4K60.mp4"; fi
echo "完成：别过来_4K60.mp4"
