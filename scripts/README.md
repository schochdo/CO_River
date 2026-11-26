# Active Pipeline & Build Scripts

All active data-ingestion, SQLite-compilation, documentation, and verification scripts are listed below in execution order. One-off migration and visual-inspection scripts from earlier sprints are archived in [`../archive/scripts/`](../archive/scripts/).

## 1. Full Clean-Slate SQLite Rebuild (Manual / Schema Updates)

1. `python3 scripts/download_raw_sources.py` — Downloads/verifies the `26` authoritative federal files in `data/raw/` and writes SHA-256 checksums to `data/raw/MANIFEST.csv`.
2. `python3 scripts/build_database.py` — Creates/populates `data/colorado_river_basin.db` from `data/raw/` workbooks, compacts, historical series, and USBR CUL accounting tables.
3. `python3 scripts/generate_seasonal_data.py` — Rebuilds seasonal inflow/release summaries and the `1922–2024` USBR Lees Ferry Natural Flow chart asset.
4. `python3 scripts/build_tributary_hydrology.py` — Computes 10-year (`WY 2016–2025`) tributary daily RBI, Lake Powell hypsometry (`AF/ft`), and the `WY 2021` Dirty Devil vs. Cisco comparison into SQLite.
5. `python3 src/compute_rbi_and_sentinels.py` — Computes `WY 2016–2025` daily Richards–Baker Flashiness (`RBI`) across all `74` USGS streamgages in SQLite `rbi_flashiness`.
6. `python3 src/fetch_historical_normals.py` — Refreshes USGS daily normal statistics (`station_daily_normals`) in SQLite.

## 2. Scheduled 6-Hour Live Refresh (`.github/workflows/update_data.yml`)

1. `python3 src/fetch_water_data.py` — Queries live USGS NWIS IV/DV, USBR HydroData CSVs, USBR RiverOps teletypes, and Colorado DWR (CDSS) REST feeds into SQLite.
2. `python3 src/fetch_historical_portal_data.py` — Updates monthly reservoir matrices (`EOM`) and `basin_storage_timeline` in SQLite.
3. `python3 src/fetch_replay_7d.py` & `python3 src/fetch_replay_30d.py` — Refreshes 7-day and 30-day multi-reach flow replay matrices in SQLite.
4. `python3 scripts/export_sqlite_to_json.py` — Exports all `10` static JSON contracts in `web/data/*.json` exclusively from `data/colorado_river_basin.db`.

## 3. Research Notebook & AI Dialogue Archive

1. `python3 scripts/build_unified_notebook.py` — Generates `notebooks/colorado_river_analysis.ipynb` (execute via `nbclient` / Jupyter).
2. `python3 scripts/export_notebooks_to_html.py` — Syncs `.ipynb` and renders standalone HTML to `web/notebooks/colorado_river_analysis.html`.
3. `python3 scripts/compile_full_ai_transcript.py` — Compiles all Colorado River Antigravity session transcripts and Gemini Web PDFs into `web/ai_complete_prompt_archive.html`.

## 4. Verification Gates & Deployment

1. `python3 scripts/audit_claims_register.py` — Verifies quantitative prose claims recorded in `data/claims_register.csv`.
2. `python3 scripts/data_smoke_test.py` — Verifies `MANIFEST.csv` SHA-256 hashes, SQLite schema, 10-JSON parity, post-1963 Lees Ferry divergence, `1937+` storage timeline, `water_budget.json` closure (`< 0.01 MAF`), and zero `needs_fix` claims.
3. `node scripts/smoke_test.js` — Serves `web/` locally and runs headless Chrome DevTools checks across `9` pages at mobile (`390×844`) and desktop (`1360×860`) viewports (`npm test` runs both #2 and #3).
4. `./scripts/release_check.sh` — Pre-commit gate: recompiles the AI prompt archive, runs `npm test`, and verifies that both `CHANGELOG.md` and `AI_LOG.md` have been updated relative to `HEAD`.
5. `./scripts/sync_to_portfolio.sh` — Syncs `web/` to the `schochdo.github.io` portfolio repository when explicitly requested.
