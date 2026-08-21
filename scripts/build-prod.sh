#!/usr/bin/env bash
# Сборка в соседнюю папку, чтобы живой next start не терял .next посередине.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

export NEXT_DIST_DIR=".next-incoming"
rm -rf .next-incoming
npm run build

if [ -d .next/static ]; then
  mkdir -p .next-incoming/static
  cp -a .next/static/. .next-incoming/static/
fi

rm -rf .next-prev
if [ -d .next ]; then
  mv .next .next-prev
fi
mv .next-incoming .next
echo "Build swapped into .next"
