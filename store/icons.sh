#!/usr/bin/env bash
# Renders the extension icons and the Edge store logo from store/icon.svg.
# Needs librsvg: brew install librsvg
set -eu
cd "$(dirname "$0")/.."

for size in 16 32 48 96 128; do
  rsvg-convert -w "$size" -h "$size" store/icon.svg -o "public/icon/$size.png"
done

# Edge shows its store logo at 300 by 300. Chrome and Firefox take the 128.
mkdir -p store/images
rsvg-convert -w 300 -h 300 store/icon.svg -o store/images/logo-300.png
