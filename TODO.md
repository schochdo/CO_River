# Project To-Do List

## Completed Pre-Submission Items

- [x] **Data & Hydrologic Smoke Test (`scripts/data_smoke_test.py` & `npm test`):**
  - [x] Assert post-1963 `supply_maf` and `lees_ferry_release_maf` divergence (`std > 1.0 MAF`).
  - [x] Verify `MANIFEST.csv` SHA-256 checksums, SQLite schema, 10-JSON parity, `1937+` timeline start, `EOM` standardization, `water_budget.json` closure (`< 0.01 MAF`), and `data/claims_register.csv` (`0` `needs_fix`).
- [x] **Reconcile Basin-Math Baselines & Archive Obsolete Docs (`README.md`, `SYSTEM_GUIDE.md`, `web/map.html`, `archive/docs/`):**
  - [x] Unified documentation and `web/map.html` Law modal onto the verified `2005–2024` USBR accounting baseline (`13.51` mainstream inflow, `13.89 MAF/yr` closed water budget, `17.50` / `18.76 MAF/yr` paper claims, `37.2 MAF` post-1999 5-reservoir drawdown) alongside labeled historical Lees Ferry windows (`1906–1921: 18.00`, `1922–2024: 14.11`, `2000–2024: 12.40`, `2005–2024: 13.12 MAF/yr`).
- [x] **Submission Research Notebook Rewrite (`scripts/build_unified_notebook.py` → `notebooks/colorado_river_analysis.ipynb`):**
  - [x] Streamlined code cells to query SQLite directly (`q(sql)`), included one concise live USGS NWIS API cell (`Lee's Ferry #09380000`), removed the redundant `cluster_id` RBI bar chart, and added a closed two-column `2005–2024` Water Budget chart (`13.8917 MAF/yr`, `0.0000` residual difference).
- [x] **Active Script Runbook, Transcript Recompile & Pre-Commit Gate (`scripts/README.md`, `scripts/release_check.sh`):**
  - [x] Archived 139 unreferenced one-off sprint scripts to `archive/scripts/`, compiled all `13` project sessions into `web/ai_complete_prompt_archive.html`, and added `scripts/release_check.sh`.

## Post-Class Portfolio Backlog (Deferred After Submission)

- [ ] **Modularize Frontend Scripts (`web/app.js`, `web/dashboard.js`):** Split `web/app.js` (`6,879` lines) into focused ES modules for map layers, popups, camera flight, and tray state.
- [ ] **Audit Ingestion Scripts for Defensive Fallbacks (`src/`, `scripts/`):** Sweep helper scripts for defensive `.get(..., 0)` defaults or broad `except:` clauses so upstream schema changes fail loudly.
- [ ] **Full USBR Threshold Document Cross-Check:** Re-verify every elevation benchmark across Mead, Powell, and Upper CRSP reservoirs against post-2026 NEPA Record of Decision updates.
