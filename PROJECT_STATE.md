# Colorado River Basin Hydrology & Plumbing Project (DAT1001)

## 1. Project Background & Objective
* **Course Context:** Intro to Data Science (DAT1001). Needs clean, explainable, defensible code (no massive AI spaghetti).
* **Dual Deliverables:**
  1. A well-documented **Jupyter Notebook** explaining the data pipeline, API parameters, and hydrologic context for academic evaluation.
  2. A fast, interactive **Web Dashboard** (Leaflet/MapLibre GL with shaded relief terrain) running locally and deployable to GitHub Pages (100% free, zero monthly hosting, no sleeping servers).
* **Domain Focus:**
  * The plumbing of the Colorado River system, connecting the author's West Slope backyard trans-mountain diversions to the macro Colorado River Basin.
  * Historical & legal context: *Cadillac Desert*, 1922 Colorado River Compact (Upper vs. Lower Basin split at Lees Ferry, AZ), senior water rights (1902 Shoshone call in Glenwood Canyon), and "paper water" vs. actual wet water.

---

## 2. Verified Data Sources & Sentinel Stations

### A. USGS Streamflow (NWIS Instantaneous Values API)
*Endpoint:* `https://waterservices.usgs.gov/nwis/iv/?format=json&sites={site_ids}&parameterCd=00060&siteStatus=all`
*Verified Sentinel Gauges:*
* `09070500` - **Colorado River near Dotsero, CO** (captures high-country mountain runoff below Eagle River)
* `09095500` - **Colorado River near Cameo, CO** (upstream of Grand Valley agricultural diversion)
* `09180500` - **Colorado River near Cisco, UT** (outflow from Colorado before Green River confluence)
* `09380000` - **Colorado River at Lees Ferry, AZ** (the legal dividing line between Upper and Lower Basins)

### B. Colorado Division of Water Resources (CDWR HydroBase REST API)
*Endpoint:* `https://dwr.state.co.us/Rest/GET/api/v2/telemetrystations/telemetrytimeseriesday/?format=json&abbrev={abbrev}`
*Verified Trans-Mountain Tunnels (diverting West Slope water under Continental Divide to Front Range):*
* `ADATUNCO` - **Alva B. Adams Tunnel** (C-BT project, Grand Lake -> Estes Park / Northern Water)
* `MOFTUNCO` - **Moffat Water Tunnel** (Fraser River -> Gross Reservoir / Denver Water)
* `ROBTUNCO` - **Harold D. Roberts Tunnel** (Dillon Reservoir -> South Platte / Denver Water)
* `BOUTUNCO` - **Charles H. Boustead Tunnel** (Fryingpan-Arkansas Project)

### C. Bureau of Reclamation (USBR API) - Planned Next
* Reservoirs: **Lake Powell** (Glen Canyon Dam) and **Lake Mead** (Hoover Dam) storage, elevation, and % capacity.

---

## 3. Environment & Tooling
* **OS:** macOS (Apple Silicon).
* **Python Virtual Environment:** `.venv/` in project root.
  * Installed: `pandas`, `requests`, `folium`, `numpy`.
  * Activation: `source .venv/bin/activate` or invoke via `.venv/bin/python`.
* **Execution Workflow:**
  * Develop and test modular scripts in `src/` or `pipeline/`.
  * Run and verify data directly in chat.
  * Compile into clean Jupyter Notebooks for grading once the logic is solid.
  * Build the web interface using pre-calculated JSON snapshots to guarantee instant, 0ms latency.

---

## 4. Current State & Milestones Completed
1. [x] Git repository initialized (`main`).
2. [x] Python isolated virtual environment (`.venv/`) configured with `pandas`, `requests`, `folium`, `numpy`.
3. [x] Verified USGS NWIS API for Upper Basin sentinel stations (Dotsero, Cameo, Cisco, Lees Ferry).
4. [x] Verified CDWR HydroBase API for West Slope trans-mountain diversions (Adams, Moffat, Roberts, Boustead tunnels).
5. [x] Verified USBR / USGS reservoir endpoints for Lake Powell (Glen Canyon) and Lake Mead (Hoover Dam).
6. [x] Unified Python data pipeline implemented in `src/fetch_water_data.py`.
7. [x] Live automated data snapshot successfully exported to `data/latest_metrics.json`.

## 5. Immediate Next Steps
1. [ ] Build the interactive web dashboard (HTML/JS or React + MapLibre) that consumes `data/latest_metrics.json`.
2. [ ] Add vector GeoJSON lines for the Continental Divide and the 3 trans-mountain tunnel paths.
3. [ ] Design the floating callout cards (matching the user's mockup: Lees Ferry flow badge, Lake Mead capacity bar).
4. [ ] Compile analytical narrative and data science calculations into the final Jupyter Notebook for DAT1001 submission.

