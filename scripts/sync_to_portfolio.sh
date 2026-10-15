#!/bin/bash
# Sync Colorado River Dashboard web assets and telemetry to the Website portfolio
set -e
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$DIR"

echo "1. Fetching freshest hydrologic telemetry snapshot..."
PY="$([ -x .venv/bin/python ] && echo .venv/bin/python || echo python3)"
"$PY" src/fetch_water_data.py

PORTFOLIO_DIR="$HOME/Documents/Antigravity/Website"
if [ -d "$PORTFOLIO_DIR" ]; then
  echo "2. Syncing web assets to portfolio website..."
  mkdir -p "$PORTFOLIO_DIR/public/colorado_river" "$PORTFOLIO_DIR/scripts"
  cp -r web/* "$PORTFOLIO_DIR/public/colorado_river/"
  cp src/fetch_water_data.py "$PORTFOLIO_DIR/scripts/fetch_colorado_river.py"
  echo "Done! Assets synced to $PORTFOLIO_DIR."
fi
