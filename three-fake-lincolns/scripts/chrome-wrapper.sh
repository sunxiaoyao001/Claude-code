#!/usr/bin/env bash
# Headless Chrome with a higher WebGL context limit. Motion blur renders each graded print several
# times per frame, and every print is its own WebGL canvas; Chrome's default limit (16) drops the
# oldest contexts. Used for the final render: --browser-executable=scripts/chrome-wrapper.sh
exec /opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell --max-active-webgl-contexts=256 "$@"
