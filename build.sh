#!/usr/bin/env bash
# One-command pipeline: lint -> typecheck -> test -> build -> size gate -> preview QR code.
#
#   ./build.sh           full pipeline; preview is skipped (with the reason) when credentials or
#                        WeChat's servers are unavailable, e.g. in the cloud sandbox
#   ./build.sh preview   same, but a skipped preview is an error (use locally with MP_APPID +
#                        MP_PRIVATE_KEY_PATH set)
#   ./build.sh check     stop after the size gate
set -euo pipefail
cd "$(dirname "$0")"

mode="${1:-all}"
case "$mode" in
  all|preview|check) ;;
  *) echo "usage: ./build.sh [all|preview|check]" >&2; exit 2 ;;
esac

step() { printf '\n==> %s\n' "$1"; }

if [ ! -d node_modules ]; then
  step "install"
  npm ci
fi

step "lint"
BUILD_ENV=production npx eslint .

step "typecheck"
npx tsc -p tsconfig.json --noEmit
npx tsc -p tsconfig.tools.json

step "test"
npx vitest run

step "build"
node scripts/build.mjs

step "size"
node scripts/size-check.mjs

if [ "$mode" = "check" ]; then
  exit 0
fi

step "preview"
if [ "$mode" = "preview" ]; then
  node scripts/preview.mjs --require
else
  node scripts/preview.mjs
fi
