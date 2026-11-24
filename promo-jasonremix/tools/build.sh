#!/usr/bin/env bash
# Komplett-Build: Stimme -> Musik/Mix -> Frames -> fertiges MP4
# Voraussetzung: PIPER_MODEL zeigt auf de_DE-thorsten-high.onnx
set -euo pipefail
cd "$(dirname "$0")/.."
python3 tools/tts.py
python3 tools/music.py
node tools/render.js --workers "${WORKERS:-3}"
tools/mux.sh
