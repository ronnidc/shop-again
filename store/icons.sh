#!/usr/bin/env bash
# Renders the extension icons and the Edge store logo. The toolbar sizes come
# from the small mark, the bag alone, because the full mark's arrow turns to
# mush below 48 pixels. Needs librsvg: brew install librsvg
set -eu
cd "$(dirname "$0")/.."

for size in 16 32; do
  rsvg-convert -w "$size" -h "$size" assets/icon-small.svg -o "public/icon/$size.png"
done
for size in 48 96 128; do
  rsvg-convert -w "$size" -h "$size" assets/icon.svg -o "public/icon/$size.png"
done

# Edge shows its store logo at 300 by 300. Chrome and Firefox take the 128.
mkdir -p store/images
rsvg-convert -w 300 -h 300 assets/icon.svg -o store/images/logo-300.png
