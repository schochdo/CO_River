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
  echo "2. Syncing web assets to portfolio website with rsync..."
  mkdir -p "$PORTFOLIO_DIR/public/colorado_river" "$PORTFOLIO_DIR/scripts"
  rsync -av --delete --exclude='.cache_usgs*' web/ "$PORTFOLIO_DIR/public/colorado_river/"
  cp src/fetch_water_data.py "$PORTFOLIO_DIR/scripts/fetch_colorado_river.py"
  cp src/fetch_replay_7d.py "$PORTFOLIO_DIR/scripts/fetch_replay_7d.py"
  cp src/fetch_replay_30d.py "$PORTFOLIO_DIR/scripts/fetch_replay_30d.py"
  
  echo "3. Verifying Astro build in Website..."
  (cd "$PORTFOLIO_DIR" && npm run build)
  
  echo "4. Staging, committing and pushing to schochdo.github.io..."
  (
    cd "$PORTFOLIO_DIR"
    git add -A
    if git diff --staged --quiet; then
      echo "Website is already up to date. Nothing to commit."
    else
      git commit -m "Deploy Colorado River updates (v2.3.7): real API code boxes, 6h replay sync, monthly canal reporting, and UI polish"
      git push origin main
      echo "✓ Successfully pushed latest build to schochdo.github.io!"
    fi
  )
  echo "Done! Assets synced and pushed to live portfolio."
fi
