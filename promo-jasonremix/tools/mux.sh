#!/usr/bin/env bash
# Fügt die gerenderten Teile zusammen und legt den Ton darunter.
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p output
DUR=$(python3 -c "import json;print(json.load(open('build/timeline.json'))['duration'])")
ffmpeg -y -loglevel error -f concat -safe 0 -i build/parts.txt -i build/mix.wav \
  -map 0:v -map 1:a -c:v copy \
  -af "loudnorm=I=-14:TP=-1.0:LRA=9,afade=t=out:st=$(python3 -c "print($DUR-1.2)"):d=1.2" \
  -c:a aac -b:a 256k -t "$DUR" -movflags +faststart output/jasonremix-promo.mp4
cp build/untertitel.srt output/jasonremix-promo.srt
echo "fertig: output/jasonremix-promo.mp4"
