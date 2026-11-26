#!/bin/bash
# Sync Colorado River Dashboard web assets and telemetry to the Website portfolio
set -e
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$DIR"

echo "1. Fetching freshest hydrologic telemetry snapshot..."
PY="$([ -x "$DIR/.venv/bin/python" ] && echo "$DIR/.venv/bin/python" || echo python3)"
"$PY" src/fetch_water_data.py

PORTFOLIO_DIR="$HOME/Documents/Antigravity/Website"
if [ -d "$PORTFOLIO_DIR" ]; then
  echo "2. Syncing web assets, SQLite SSOT & exporter to portfolio website..."
  mkdir -p "$PORTFOLIO_DIR/public/colorado_river" "$PORTFOLIO_DIR/scripts" "$PORTFOLIO_DIR/data"
  rsync -av --delete --exclude='.cache_usgs*' web/ "$PORTFOLIO_DIR/public/colorado_river/"
  cp data/colorado_river_basin.db "$PORTFOLIO_DIR/data/colorado_river_basin.db"
  cp scripts/export_sqlite_to_json.py "$PORTFOLIO_DIR/scripts/export_sqlite_to_json.py"
  cp src/fetch_water_data.py "$PORTFOLIO_DIR/scripts/fetch_colorado_river.py"
  cp src/fetch_replay_7d.py "$PORTFOLIO_DIR/scripts/fetch_replay_7d.py"
  cp src/fetch_replay_30d.py "$PORTFOLIO_DIR/scripts/fetch_replay_30d.py"
  (cd "$PORTFOLIO_DIR" && "$PY" scripts/export_sqlite_to_json.py)
  
  echo "3. Verifying Astro build in Website..."
  (cd "$PORTFOLIO_DIR" && npm run build)
  
  echo "4. Staging, committing and pushing to schochdo.github.io..."
  (
    cd "$PORTFOLIO_DIR"
    git add -A
    if git diff --staged --quiet; then
      echo "Website is already up to date. Nothing to commit."
    else
      LATEST_MSG=$(git -C "$DIR" log -1 --pretty=%s)
      git commit -m "Deploy Colorado River updates: ${LATEST_MSG}"
      git push origin main
      echo "✓ Successfully pushed latest build to schochdo.github.io!"
    fi
  )
  echo "Done! Assets synced and pushed to live portfolio."
fi
