# Colorado River Basin Hydrologic Intelligence & Infrastructure Topology Platform

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Academic Project](https://img.shields.io/badge/Course-DAT1001-0284c7.svg)](https://coloradomtn.edu/)
[![Zero-Framework](https://img.shields.io/badge/Frontend-Vanilla_JS_%2B_MapLibre-0f172a.svg)](#architecture--frontend-tech-stack)
[![Colorblind Safe](https://img.shields.io/badge/Palette-ColorBrewer_%26_Okabe--Ito-009E73.svg)](#anti-saas-design-standards)

An academic research platform and high-performance interactive web dashboard modeling the hydrology, infrastructure, statutory allocations, and multi-decade reservoir drawdowns of the 246,000-square-mile Colorado River Basin.

Developed for **Introduction to Data Science (DAT1001)** at Colorado Mountain College by **Douglas Schoch**.

---

## 📖 Primary Documentation & References

| Document | Description |
| :--- | :--- |
| **[SYSTEM_GUIDE.md](SYSTEM_GUIDE.md)** | **Master Guide:** Basin Math Rosetta Stone (15 vs 16.5 vs 17.5 vs 19.5 vs 12.4 MAF), domain physics, 19th-century water law history, frontend architecture, and topological engineering. |
| **[CHANGELOG.md](CHANGELOG.md)** | **Semantic Release Log:** Granular day-by-day record of features, cartographic updates, and bug fixes following the *Keep a Changelog* standard. |
| **[AI_LOG.md](AI_LOG.md)** | **Methodology Log:** Comprehensive pair-programming log detailing models used, prompt scopes, verification scripts, and human-in-the-loop control for academic evaluation. |
| **[PROJECT_MANIFEST.md](PROJECT_MANIFEST.md)** | **Systems Manifest:** Complete file tree, API endpoints, schema contracts, and notebook descriptions. |

---

## ⚡ Key Highlights & Core Analytical Views

The web dashboard is organized into seven specialized analytical views:

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                        COLORADO RIVER BASIN ANALYTICAL SUITE                           │
├────────────────────┬───────────────────────────────────────────────────────────────────┤
│ 1. Overview Deck   │ 10-Minute Presentation Storyboard (Acts 1–4, Math Gap, Seasonal   │
│                    │ Engine, 90-Yr Drawdown, Mining Law "Use It or Lose It" Paradox)   │
├────────────────────┼───────────────────────────────────────────────────────────────────┤
│ 2. Hydrology Map   │ Full-bleed MapLibre GL 3D vector map with live USGS streamflow,   │
│                    │ dynamic line weighting (sqrt(Q)), Continental Divide, & dams      │
├────────────────────┼───────────────────────────────────────────────────────────────────┤
│ 3. Gage Registry   │ Searchable real-time ledger of 30+ USGS, USBR, and CDWR stations  │
├────────────────────┼───────────────────────────────────────────────────────────────────┤
│ 4. Flow Schematic  │ Swiss transit-style topological flow schematic with dynamic SVG   │
│                    │ strokes scaling by statutory allocation volumes                   │
├────────────────────┼───────────────────────────────────────────────────────────────────┤
│ 5. Water Budget    │ D3.js true Sankey diagram modeling mass-balance from headwaters to│
│                    │ international treaty delivery and delta losses                    │
├────────────────────┼───────────────────────────────────────────────────────────────────┤
│ 6. Reservoirs      │ 90-year multi-reservoir storage timeline (1935–2026) and monthly  │
│                    │ elevation heatmaps for Lake Mead and Lake Powell                  │
├────────────────────┼───────────────────────────────────────────────────────────────────┤
│ 7. ML Analysis     │ Single-screen Gapminder dashboard with K-Means regime clustering, │
│                    │ Richards-Baker Flashiness index, and lagged travel times to Powell│
└────────────────────┴───────────────────────────────────────────────────────────────────┘
```

---

## ⚖️ The Basin Math at a Glance

* **15.0 MAF/yr:** 1922 Compact domestic baseline (7.5 Upper + 7.5 Lower, Article III.a).
* **16.0 MAF/yr:** Compact baseline + 1.0 MAF Lower Basin tributary concession (Article III.b).
* **17.5 MAF/yr:** **Total Statutory Paper Allocations** (15.0 domestic + 1.0 surplus + 1.5 Mexico Treaty).
* **~19.5 MAF/yr:** **Gross System Demand** (17.5 paper rights + ~1.8–2.0 MAF uncounted reservoir evaporation & river seepage).
* **12.4 MAF/yr:** **Physical Wet Water Reality** (2000–2026 Millennium Drought natural virgin flow at Lee's Ferry).
* **-5.1 MAF/yr Deficit:** Annual structural overdraft absorbed by draining 60 MAF of storage down to ~17.7 MAF (29.5%) today.

*For the comprehensive step-by-step breakdown, see [Section 2 of SYSTEM_GUIDE.md](SYSTEM_GUIDE.md#2-the-basin-math-rosetta-stone).*

---

## 🛠️ Architecture & Frontend Tech Stack

* **Zero-Framework Web Engine:** Built strictly in **Semantic HTML5, Vanilla JavaScript (ES6+), and Tailwind CSS**.
* **Zero Production Bundlers:** No React, no Next.js, no Node.js runtime in production. 100% static client that deploys seamlessly to GitHub Pages or AWS S3 with zero monthly hosting costs and zero cold starts.
* **Geospatial & Visualization Engines:**
  * **MapLibre GL / Leaflet:** Dynamic client-side GeoJSON vector rendering with 3D terrain mesh.
  * **D3.js (v7):** True flow-proportional SVG Sankey diagram.
  * **Chart.js (v4):** Time series, seasonal hydrographs, stacked storage areas, and standardized monthly heatmaps.
* **Backend Data Pipeline:** Python 3 (`src/fetch_water_data.py`) querying USGS NWIS IV/DV REST APIs, CDWR HydroBase, and USBR operational teletypes with automated 3-tier fallback.

---

## 🚀 Quickstart & Local Execution

### 1. Environment Setup
```bash
# Clone the repository
git clone https://github.com/schochdo/CO_River.git
cd CO_River

# Create and activate Python virtual environment
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

### 2. Update Live Streamflow & Reservoir Telemetry
```bash
# Run the Python ingestion pipeline
python3 src/fetch_water_data.py
```

### 3. Launch Local Dashboard
```bash
./start.sh
# Open http://localhost:8088/index.html in your browser
```
*(To stop the server: `./stop.sh`)*

---

## 🔬 Reproducible Research Notebooks

The data science pipeline is fully reproducible via three Jupyter notebooks in `notebooks/`:
1. **`01_build_river_network.ipynb`:** Geospatial topology builder, NHD flowline extraction, and Lake Powell bathymetric slicing.
2. **`02_analyze_flow_and_export.ipynb`:** Live streamflow & reservoir telemetry query engine, reach deltas, and JSON exporter.
3. **`03_tributary_ml_analysis.ipynb`:** Machine learning classification of river regimes, K-Means clustering, Richards-Baker Flashiness index, and lagged travel times to Lake Powell.

---

## 📄 License & Academic Attribution
Released under the [MIT License](LICENSE). Built for academic evaluation in DAT1001 (Colorado Mountain College).
