# Project To-Do List

## High Priority — Data Integrity & Hydrologic Verification

- [x] **Add a Data & Hydrologic Smoke Test (`scripts/data_smoke_test.py` & `npm test`):**
  - [x] Assert that post-1963 `supply_maf` and `lees_ferry_release_maf` in `web/data/seasonal_regimes.json` have std dev > 1.0 MAF (catches silent fallback regressions).
  - [x] Verify MANIFEST SHA-256 checksums, SQLite/JSON parity across all 10 JSON contracts, `1937+` timeline start, `EOM` standardization, `water_budget.json` mass-balance closure, and `data/claims_register.csv` (`0` `needs_fix`).
- [ ] **Audit `scripts/` and `src/` for Legacy Fallbacks & Remaining Threshold Checks:**
  - Sweep remaining helper scripts for defensive `.get(..., 0)` defaults or silent `except:` blocks in non-export utilities.
  - [x] Replace pre- and post-1963 `supply_maf` flat depletion estimates in `scripts/generate_seasonal_data.py` with official USBR Lees Ferry Natural Flow records (`1922–2024`).
  - Verify all domain threshold labels and benchmark elevations across Mead, Powell, and tributary views against official USBR/USGS documentation.

## Completed Quality Items

- [x] **Consumptive Use by State (`web/dashboard.js` → Overview Card 4):** Replaced mixed hardcoded consumptive-use estimates with exact statutory apportionments (`CA 4.40`, `CO 3.86`, `AZ 2.85`, `UT 1.71`, `WY 1.04`, `NM 0.84`, `NV 0.30` = `15.00 MAF/yr` under the 1922/1948 Compacts & 1928 BCPA / 1964 Decree).
- [x] **Macro Water Budget Sankey (`web/sankey.html`):** Re-anchored from `12.40 + 2.50 = 14.90 MAF` onto the USBR CY/WY 2005–2024 (`13.89 MAF/yr`) CUL + Natural Flow SQLite balance rendered dynamically from `web/data/water_budget.json`.
- [x] **`5 Flow Regimes` Monsoon Curve (`scripts/build_database.py`, `scripts/export_sqlite_to_json.py`, `web/ml_analysis.html`):** Removed snowmelt-dominated San Juan (`09379500`) from `monsoon_tributaries`; now averages Little Colorado (`09402000`) and Paria River (`09382000`).
- [x] **Unused Static JSON Blocks:** Removed `swe_history`, `state_consumptive_use`, and `canals_pipelines` from `web/data/portal_historical.json`, `reservoir_sawtooth_20yr` from `web/data/seasonal_regimes.json`, and `kmeans_clusters` from `web/data/tributary_hydrology.json`.
