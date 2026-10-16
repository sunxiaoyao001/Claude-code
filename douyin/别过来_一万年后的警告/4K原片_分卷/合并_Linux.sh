#!/bin/bash
cd "$(dirname "$0")"
echo "正在合并 4K 成片，请稍候……"
cat BGL_V2_4K60.mp4.part* > "别过来_V2_4K60.mp4"
if command -v shasum >/dev/null; then shasum -a 256 "别过来_V2_4K60.mp4"; elif command -v sha256sum >/dev/null; then sha256sum "别过来_V2_4K60.mp4"; fi
echo "完成：别过来_V2_4K60.mp4"
