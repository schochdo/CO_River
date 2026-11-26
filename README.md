# Colorado River Basin Hydrologic & Infrastructure Platform

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Academic Project](https://img.shields.io/badge/Course-DAT1001-0284c7.svg)](https://coloradomtn.edu/)
[![Zero-Framework](https://img.shields.io/badge/Frontend-Vanilla_JS_%2B_MapLibre-0f172a.svg)](#architecture--frontend-tech-stack)
[![Colorblind Safe](https://img.shields.io/badge/Palette-ColorBrewer_%26_Okabe--Ito-009E73.svg)](SYSTEM_GUIDE.md#1-executive-summary--design-philosophy)

An academic research platform and interactive web dashboard modeling the hydrology, infrastructure, statutory allocations, and multi-decade reservoir drawdowns of the 246,000-square-mile Colorado River Basin.

Developed for **Introduction to Data Science (DAT1001)** at Colorado Mountain College by **Douglas Schoch**.

---

## Primary Documentation & References

| Document | Description |
| :--- | :--- |
| **[SYSTEM_GUIDE.md](SYSTEM_GUIDE.md)** | **Master Guide:** Basin Math Rosetta Stone (`15.0` vs `16.5` vs `17.5` vs `18.76` vs `13.51` / `13.89 MAF/yr`), domain physics, water law history, frontend architecture, and topological engineering. |
| **[CHANGELOG.md](CHANGELOG.md)** | **Semantic Release Log:** Day-by-day record of features, data calibrations, and bug fixes following the *Keep a Changelog* standard. |
| **[AI_LOG.md](AI_LOG.md)** | **Methodology Log:** Pair-programming log detailing models used, prompt scopes, verification checks, and human review for academic evaluation. |
| **[scripts/README.md](scripts/README.md)** | **Pipeline Runbook:** Execution order for raw source archiving, SQLite compilation, JSON export, notebook builds, and automated smoke tests. |

---

## Key Highlights & Core Analytical Views

The web dashboard is organized into seven analytical views (plus Methodology, Law of the River, Data Sources, Research Notebook, and AI Prompt Archive):

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                        COLORADO RIVER BASIN ANALYTICAL SUITE                           │
├────────────────────┬───────────────────────────────────────────────────────────────────┤
│ 1. Basin Overview  │ Four-act briefing deck: Statutory Gap, Seasonal Inflow vs. Dam    │
│                    │ Release, 90-Year Storage Drawdown, and State Apportionments       │
├────────────────────┼───────────────────────────────────────────────────────────────────┤
│ 2. System Map      │ Full-bleed MapLibre GL 3D vector map with live USGS streamflow,   │
│                    │ dynamic line weighting (sqrt(Q)), Continental Divide, & dams      │
├────────────────────┼───────────────────────────────────────────────────────────────────┤
│ 3. Gage Registry   │ Searchable ledger of 92 cataloged facilities (81 gages/tunnels +  │
│                    │ 11 reservoirs) across USGS, USBR, and CDWR feeds                  │
├────────────────────┼───────────────────────────────────────────────────────────────────┤
│ 4. Flow Schematic  │ Swiss transit-style topological flow schematic & USGS 3DEP        │
│                    │ elevation profile scaling by annualized MAF/yr volumes            │
├────────────────────┼───────────────────────────────────────────────────────────────────┤
│ 5. Water Budget    │ D3.js Sankey & stacked mass-balance bars closing at 13.89 MAF/yr  │
│                    │ across CY/WY 2005–2024 USBR Consumptive Uses & Losses accounting  │
├────────────────────┼───────────────────────────────────────────────────────────────────┤
│ 6. Reservoirs      │ Multi-reservoir storage timeline (1937–2026), 1922–2024 Compact   │
│                    │ accounting, and monthly elevation heatmaps for Mead and Powell    │
├────────────────────┼───────────────────────────────────────────────────────────────────┤
│ 7. Tributaries &   │ Daily Richards–Baker Flashiness (RBI across 74 USGS gages), Lake  │
│    Flow Regimes    │ Powell canyon hypsometry, WY 2021 flood vs. snowmelt, & 5 regimes │
└────────────────────┴───────────────────────────────────────────────────────────────────┘
```

---

## The Basin Math at a Glance (Verified 2005–2024 Accounting Baseline)

*Why 2005–2024?* Live USGS/USBR streamgages and reservoir sensors run through **November 2026**, whereas basin-wide **Natural Flow** and **Consumptive Uses & Losses (CUL)** require post-season irrigation diversion/return-flow audits and satellite evapotranspiration processing across seven states and Mexico—so **2024** is the latest complete year published across Reclamation's Natural Flow (`LFnatFlow1906-2024.xlsx`) and Upper/Lower CUL workbooks, and `2005–2024` is Reclamation's standard `'20 yr'` contemporary CUL reporting window.

* **15.00 MAF/yr:** 1922 Compact domestic core apportionment (`7.50` Upper + `7.50` Lower, Article III.a).
* **16.50 MAF/yr:** Core domestic apportionment (`15.00`) + 1944 Mexican Water Treaty obligation (`1.50`).
* **17.50 MAF/yr:** **Full Statutory Paper Entitlements** (`15.00` Art. III.a + `1.00` Lower Art. III.b + `1.50` Mexico Treaty).
* **18.76 MAF/yr:** **Statutory Claims + Measured Mainstem Evaporation** (`17.50` paper claims + `1.26 MAF/yr` measured CRSP/Lower mainstem reservoir evaporation over CY 2005–2024).
* **13.51 MAF/yr:** **Physical Mainstream Inflow (2005–2024 Mean)** (`13.12 MAF/yr` USBR Lees Ferry natural flow + `0.39 MAF/yr` from 5 gaged Lower Basin mainstem tributaries). *(Note: Across the longer Water Years 2000–2024 Millennium Drought window—which includes the severe 2000–2004 drought onset—Lees Ferry natural flow averaged **12.40 MAF/yr**, vs. **14.11 MAF/yr** over 1922–2024).*
* **13.89 MAF/yr:** **Closed 2005–2024 Mainstream Water Budget** (`13.51` mainstream inflow + `0.26` net 5-reservoir storage drawdown + `0.12` ungaged side inflows/closure residual = `13.89 MAF/yr` actual depletions & evaporation).
* **+3.99 / +5.25 MAF/yr Over-Allocation:** Gap between `13.51 MAF/yr` physical mainstream inflow and `17.50 MAF/yr` statutory claims (`+3.99`) or `18.76 MAF/yr` claims plus mainstem evaporation (`+5.25`). Between Sep 1999 (`53.5 MAF`) and Mar 2023 (`16.3 MAF`), the 5 major federal reservoirs lost **37.2 MAF** of stored water.

*For the full breakdown and source citations, see [Section 2 of SYSTEM_GUIDE.md](SYSTEM_GUIDE.md#2-the-basin-math-rosetta-stone) and `web/data/water_budget.json`.*

---

## Architecture & Tech Stack

* **Vanilla Web Frontend:** Semantic HTML5, Vanilla JavaScript (ES6+), and Tailwind CSS without React, Next.js, or runtime server dependencies, hosted as static files on GitHub Pages.
* **Visualization Engines:**
  * **MapLibre GL JS (v4.7.1):** WebGL GeoJSON vector rendering with USGS 3DEP terrain hillshading and 3D camera flight.
  * **D3.js (v7):** Flow-proportional SVG Sankey mass-balance network (`web/sankey.html`).
  * **Chart.js (v4):** Historical timelines, seasonal inflow-vs-release hydrographs, tributary RBI scatter plots, and reservoir elevation heatmaps.
* **Single-Source-of-Truth Data Pipeline:**
  * **Immutable Raw Archive (`data/raw/`):** `26` federal workbooks, compacts, and agency series verified by SHA-256 checksums (`data/raw/MANIFEST.csv`).
  * **Relational Store (`data/colorado_river_basin.db`):** Normalized SQLite database (`31` tables, `3` analytical views) refreshed every 6 hours by GitHub Actions (`.github/workflows/update_data.yml`) and compiled into `10` static JSON contracts via `scripts/export_sqlite_to_json.py`.
  * **Two-Tier Browser Fetch:** Direct client-side REST queries to CORS-enabled USGS NWIS (`waterservices.usgs.gov`), with automatic fallback to the 6-hour static snapshot (`web/data/latest_metrics.json`).

---

## Quickstart & Verification

### 1. Environment Setup
```bash
git clone https://github.com/schochdo/CO_River.git
cd CO_River

python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
npm install
```

### 2. Refresh Data & Export Static JSON Contracts
```bash
python3 src/fetch_water_data.py
python3 scripts/export_sqlite_to_json.py
```

### 3. Run Automated Data & UI Smoke Tests
```bash
npm test
# Or run the full pre-commit release check (transcript compile + npm test + log check):
./scripts/release_check.sh
```

### 4. Launch Local Server
```bash
./start.sh
# Open http://localhost:8088/index.html (stop with ./stop.sh)
```

---

## Reproducible Research Notebook

All hydrologic accounting, live USGS API queries, SQLite analytics, tributary flashiness analysis, and water-budget mass-balance checks are consolidated in one executable Jupyter notebook:
- **`notebooks/colorado_river_analysis.ipynb`** (built via `scripts/build_unified_notebook.py` and rendered to `web/notebooks/colorado_river_analysis.html`).

---

## License & Academic Attribution
Released under the [MIT License](LICENSE). Built for academic evaluation in DAT1001 (Colorado Mountain College).
