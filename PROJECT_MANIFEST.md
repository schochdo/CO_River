# PROJECT_MANIFEST.md: Colorado River Basin Hydrology & Plumbing Architecture

**Project Title:** Colorado River Basin Hydrologic Intelligence & Infrastructure Topology Platform  
**Academic & Systems Scope:** Intro to Data Science (DAT1001) • Research Pipeline Decoupling  
**Primary Architecture:** Offline/Batch Python Geoprocessing + Real-Time NWIS/HydroBase Ingestion + Decoupled Static GeoJSON/JSON Web Dashboard (MapLibre GL & Interactive SVG Water Budget Diagram)  
**Constraints Followed:** Zero Code Modifications • Strict Anti-SaaS Metric Hygiene ($Q = \frac{dV}{dt}$ vs. $V = \int Q dt$) • Hydrologic Mass-Balance Laws Enforced  

---

## 1. Folder & File Structure

```text
.
├── PROJECT_MANIFEST.md                 # Master documentation of architecture, APIs, data contracts, and notebooks (this file)
├── PROJECT_STATE.md                    # Core project context, academic deliverables, and verified sentinel stations
├── AI_LOG.md                           # Historical devlog of sessions, bug fixes, and feature additions
├── README.md                           # Public repository overview and installation guide
├── GEMINI.md                           # Workspace domain rules (metric hygiene, confluence laws, anti-SaaS constraints)
├── package.json                        # Development tooling dependencies (e.g., Puppeteer for headless visual regression)
├── start.sh                            # Development server initialization script (python3 -m http.server 8000)
├── stop.sh                             # Development server termination script (kills PID from server.pid)
├── server.pid                          # Process ID tracking file for the local web server
├── server.log                          # Local HTTP server access and error logs
├── updater.pid                         # Process ID tracking file for the background data refresh loop
├── updater.log                         # Telemetry update logs from background ingestion
│
├── notebooks/                          # Production Jupyter Data Science & Geospatial Processing Notebooks
│   ├── 01_build_river_network.ipynb    # Geospatial topology builder, NHDPlus VAA querying, Powell bathymetry slicer
│   └── 02_analyze_flow_and_export.ipynb# Live streamflow & reservoir telemetry query engine, reach deltas, JSON exporter
├── 01_usgs_data_exploration.ipynb      # Legacy exploratory notebook for testing USGS REST responses
│
├── src/                                # Modular Data Pipeline & ETL Python Scripts
│   ├── fetch_water_data.py             # Primary cron/daemon script: pulls USGS NWIS, CDWR HydroBase, and USBR operational feeds
│   ├── fetch_historical_normals.py     # Queries 50-year daily statistical normals (P50 median discharge) per sentinel gauge
│   ├── fetch_highres_rivers.py         # Queries high-resolution NHD hydrographic flowlines from USGS National Map
│   ├── fetch_tributaries.py            # Extracts tributary geometry segments from USGS hydro services
│   ├── generate_river_network.py       # Assembles curated reach coordinates and initial baseflow topology
│   ├── generate_geography.py           # Assembles Continental Divide & HUC Basin polygons from USGS WBD MapServer
│   ├── process_river.py                # Simplification and attribute aggregation utilities for GeoJSON flowlines
│   ├── test_nhd.py                     # Diagnostic script testing PyNHD NLDI query parameters
│   └── test_reservoirs.py              # Diagnostic script verifying USBR CSV/HTML scraping endpoints
│
├── web/                                # Client-Facing Interactive Dashboard Frontend
│   ├── index.html                      # Main geospatial cartographic application container (Leaflet/MapLibre GL, controls, panels)
│   ├── sankey.html                     # Macro Water Budget Diagram (Swiss schematic transit layout, 1922 Compact accounting)
│   ├── style.css                       # Design system stylesheet: typography, responsive glass panels, print media rules
│   ├── app.js                          # Client engine (172 KB): MapLibre GL layer management, live telemetry fetcher, dynamic river weighting
│   └── data/                           # Cached and Generated Data Contracts (Static Storage / GitHub Pages Ready)
│       ├── latest_metrics.json         # Real-time snapshot of USGS streamflows, CDWR tunnels, and USBR reservoirs
│       ├── latest_conditions.json      # Output contract from Notebook 02 with computed reach deltas and health tiers
│       ├── river_network.json          # Curated reach topology with smoothed bed elevations and reach types
│       ├── river_network.geojson       # Simplified planar GeoJSON for MapLibre multi-layer rendering
│       ├── geography.json              # Continental Divide vector, Upper/Lower Basin boundary polygons
│       ├── lakes.geojson               # Static lake polygons for major Western reservoirs
│       ├── powell_contours.geojson     # Discrete topobathymetric contour slices of Lake Powell (3,490' - 3,700')
│       ├── historical_normals.json     # Station-by-station 365-day historical median flow statistics
│       ├── co_river_raw.geojson        # Raw downloaded flowline coordinates for Upper Colorado River
│       ├── green_river_raw.geojson     # Raw flowline coordinates for Green River
│       ├── gunnison_river_raw.geojson  # Raw flowline coordinates for Gunnison River
│       ├── sanjuan_river_raw.geojson   # Raw flowline coordinates for San Juan River
│       ├── yampa_river_raw.geojson     # Raw flowline coordinates for Yampa River
│       └── tributaries/                # Directory containing sub-basin tributary geometry fragments
│
├── data/                               # Secondary root data directory
│   └── latest_metrics.json             # Root-level mirror of latest fetched water metrics
│
├── cache/                              # Persistent local cache for heavy geoprocessing
│   ├── nldplus_vaa.parquet             # Parquet storage of NHDPlus Value Added Attributes
│   ├── aiohttp_cache.sqlite            # Cached HTTP responses for async scraping routines
│   └── c9d2d672...parquet              # Cached PyNHD query result frames
│
├── scripts/                            # Visual Regression, Testing & Synchronization Automation
│   ├── sync_to_portfolio.sh           # Shell deployment script copying static build assets to external web portfolio
│   ├── capture_sankey.js               # Puppeteer script for automated headless rendering and screenshot of Sankey diagram
│   ├── test_sankey_clearance.js        # DOM layout verification script testing SVG element overlapping
│   ├── verify_canals_screenshot.js     # Headless visual check for canal stroke and styling
│   ├── verify_confluence_highlight.js  # Headless test for river junction glow and popup behavior
│   ├── verify_confluence_popup.js      # Headless test checking confluence math-card contents
│   ├── verify_lake_fixes.js            # Visual check for reservoir polygon clipping
│   ├── verify_powell.js                # Headless test for Lake Powell active contour filtering
│   ├── verify_sankey_tooltip.js        # Automated interaction test verifying hover telemetry tooltip cards
│   └── verify_tunnels_screenshot.js    # Visual regression script capturing Continental Divide trans-mountain tunnels
│
├── mockups/                            # Design explorations, concept mockups, and visual reference renders
│   ├── gemini-code-1790119779253.html  # Standalone HTML prototype of early dashboard interface
│   └── Gemini_Generated_Image_*.jpeg   # Visual design mockups for topographic and cartographic elevation styles
│
├── Screenshots/                        # Baseline interface regression captures
│   └── 9-27-26.jpg                     # Historical capture of original prototype layout
│
└── scratch/                            # Ephemeral diagnostic scripts
    └── make_notebooks.py               # Utility script generating the structured DAT1001 educational notebooks
```

---

## 2. Data & API Registry

The application utilizes three primary telemetry providers alongside USGS hydrographic data services. No authentication keys are required; all endpoints query official public federal and state APIs.

### A. Live API Endpoint Specifications

| System / Network | Provider | Endpoint URL / Pattern | Purpose | Fetch Method |
| :--- | :--- | :--- | :--- | :--- |
| **NWIS Instantaneous Values (IV)** | USGS | `https://waterservices.usgs.gov/nwis/iv/?format=json&sites={site_ids}&parameterCd={parameter_code}&siteStatus=all` | Real-time 15-minute streamflow (`00060`), gage height (`00065`), and reservoir pool elevation (`62614`, `00054`) | REST GET (JSON) |
| **NWIS Daily Values (DV)** | USGS | `https://waterservices.usgs.gov/nwis/dv/?format=json&sites={site_ids}&parameterCd=00060&siteStatus=all` | Daily aggregated discharge for aqueducts and canals lacking 15-min telemetry | REST GET (JSON) |
| **NWIS Daily Statistics (Stats)** | USGS | `https://waterservices.usgs.gov/nwis/stat/?format=rdb&sites={sites}&parameterCd=00060&statReportType=daily&statType=mean` | 50-year historical daily median streamflow values used for drought/health categorization | REST GET (RDB/TSV) |
| **HydroBase Telemetry API** | CDWR | `https://dwr.state.co.us/Rest/GET/api/v2/telemetrystations/{endpoint}/?format=json&abbrev={abbrevs}`<br>*(endpoints: `telemetrytimeserieshour`, `telemetrytimeseriesday`)* | Hourly/daily discharge (`DISCHRG`), reservoir storage (`STORAGE`), and elevation (`ELEV`) for Colorado trans-mountain infrastructure | REST GET (JSON) |
| **USBR Upper Colorado HydroData** | USBR | `https://www.usbr.gov/uc/water/hydrodata/reservoir_data/{res_id}/csv/{param_id}.csv`<br>*(Params: `17` = Storage AF, `49` = Pool Elevation ft)* | Official daily midnight operational accounting for CRSP reservoirs (Powell, Flaming Gorge, Navajo, Blue Mesa) | Direct CSV Download |
| **USBR Lower Colorado Hourly Operations** | USBR | `https://www.usbr.gov/lc/region/g4000/hourly/hourly.html` | Real-time hourly tailrace releases and pool elevations for Mead, Mohave, and Havasu | Raw HTML Scrape (Regex Table Parsing) |
| **USBR Lake Mead Elevation Table** | USBR | `https://www.usbr.gov/lc/region/g4000/hourly/mead-elv.html` | Direct hourly elevation table for Hoover Dam forebay | HTML Table Parse |
| **USGS Watershed Boundary Dataset (WBD)** | USGS | `https://hydro.nationalmap.gov/arcgis/rest/services/wbd/MapServer/1/query?where=huc2='{huc2}'&outFields=*&f=geojson` | Watershed boundaries and Continental Divide extraction (HUC 10, 14, 15) | ArcGIS REST GeoJSON |
| **NHDPlus Network Navigation (NLDI)** | USGS | Native PyNHD Python client (`pynhd.NLDI`) querying USGS Hydro-NLDI endpoints | Topological upstream/downstream network tracing from Lees Ferry | REST API |
| **Terrarium Terrain Elevation Tiles** | AWS / Mapzen | `https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png` | Client-side 3D terrain elevation mesh and hillshading in MapLibre GL | Raster DEM (PNG) |
| **Esri National Geographic Basemap** | Esri | `https://server.arcgisonline.com/ArcGIS/rest/services/NatGeo_World_Map/MapServer/tile/{z}/{y}/{x}` | Default warm physical editorial basemap tiles | Raster Tile (PNG) |

---

### B. Registry of Hardcoded Station & Facility IDs

#### 1. Streamflow Sentinel Stations (USGS NWIS)

| Station ID | Official Station Name | Parameter Measured | Dimension / Unit | River Network Location |
| :--- | :--- | :--- | :--- | :--- |
| **`09058000`** | Colorado River near Kremmling, CO | Discharge (`00060`) | Rate: $Q$ (cfs) | Upper Mainstem below Fraser & Williams Fork confluences |
| **`09070500`** | Colorado River near Dotsero, CO | Discharge (`00060`), Stage (`00065`) | Rate: $Q$ (cfs), $L$ (ft) | Upper Mainstem in Glenwood Canyon below Eagle River |
| **`09095500`** | Colorado River near Cameo, CO | Discharge (`00060`), Stage (`00065`) | Rate: $Q$ (cfs), $L$ (ft) | Upper Mainstem in De Beque Canyon above Grand Valley diversions |
| **`09163500`** | Colorado River near CO-UT State Line | Discharge (`00060`) | Rate: $Q$ (cfs) | Upper Mainstem below Gunnison River confluence & Grand Valley |
| **`09180500`** | Colorado River near Cisco, UT | Discharge (`00060`), Stage (`00065`) | Rate: $Q$ (cfs), $L$ (ft) | Outflow gauge of Upper Mainstem before Green River confluence |
| **`09380000`** | Colorado River at Lees Ferry, AZ | Discharge (`00060`), Stage (`00065`) | Rate: $Q$ (cfs), $L$ (ft) | 1922 Compact Divide (1 mi downstream of Paria River; Glen Canyon outflow) |
| **`09429100`** | Colorado River below Palo Verde Dam, AZ-CA | Discharge (`00060`) | Rate: $Q$ (cfs) | Lower Basin Mainstem below Parker Dam, CAP, and CRA diversions |
| **`09234500`** | Green River near Greendale, UT | Discharge (`00060`) | Rate: $Q$ (cfs) | Green River headwaters directly below Flaming Gorge Dam |
| **`09260050`** | Yampa River at Deerlodge Park, CO | Discharge (`00060`), Stage (`00065`) | Rate: $Q$ (cfs), $L$ (ft) | Yampa River mouth immediately before Echo Park confluence |
| **`09261000`** | Green River near Jensen, UT | Discharge (`00060`) | Rate: $Q$ (cfs) | Middle Green River below Yampa River confluence |
| **`09306500`** | White River near Watson, UT | Discharge (`00060`), Stage (`00065`) | Rate: $Q$ (cfs), $L$ (ft) | White River tributary near Utah-Colorado border |
| **`09302000`** | Duchesne River near Randlett, UT | Discharge (`00060`) | Rate: $Q$ (cfs) | Uinta Basin tributary mouth before Green River confluence |
| **`09315000`** | Green River at Green River, UT | Discharge (`00060`), Stage (`00065`) | Rate: $Q$ (cfs), $L$ (ft) | Lower Green River sentinel station before Cataract Canyon |
| **`09128000`** | Gunnison River below Gunnison Tunnel, CO | Discharge (`00060`) | Rate: $Q$ (cfs) | Gunnison River inside Black Canyon below diversion tunnel |
| **`09152500`** | Gunnison River near Grand Junction, CO | Discharge (`00060`), Stage (`00065`) | Rate: $Q$ (cfs), $L$ (ft) | Gunnison River mouth before confluence with Colorado Mainstem |
| **`09180000`** | Dolores River near Cisco, UT | Discharge (`00060`) | Rate: $Q$ (cfs) | Dolores River mouth entering Colorado River near Dewey Bridge |
| **`09355500`** | San Juan River near Archuleta, NM | Discharge (`00060`) | Rate: $Q$ (cfs) | Upper San Juan River tailrace below Navajo Dam |
| **`09364500`** | Animas River at Farmington, NM | Discharge (`00060`) | Rate: $Q$ (cfs) | Animas River mouth immediately above San Juan confluence |
| **`09379500`** | San Juan River near Bluff, UT | Discharge (`00060`), Stage (`00065`) | Rate: $Q$ (cfs), $L$ (ft) | Lower San Juan River inflow terminal entering Lake Powell |
| **`09085000`** | Roaring Fork River at Glenwood Springs, CO | Discharge (`00060`) | Rate: $Q$ (cfs) | Roaring Fork mouth entering Colorado River at Glenwood Springs |
| **`09070000`** | Eagle River below Gypsum, CO | Discharge (`00060`) | Rate: $Q$ (cfs) | Eagle River mouth entering Colorado River at Dotsero |
| **`09057500`** | Blue River below Green Mtn Reservoir, CO | Discharge (`00060`) | Rate: $Q$ (cfs) | Blue River tailrace entering Colorado River at Kremmling |
| **`09402000`** | Little Colorado River near Cameron, AZ | Discharge (`00060`) | Rate: $Q$ (cfs) | Desert tributary entering Grand Canyon reach of Colorado River |
| **`09415000`** | Virgin River at Littlefield, AZ | Discharge (`00060`) | Rate: $Q$ (cfs) | Lower Basin desert tributary entering Lake Mead (Overton Arm) |
| **`09426000`** | Bill Williams River below Alamo Dam, AZ | Discharge (`00060`) | Rate: $Q$ (cfs) | Desert tributary entering Lake Havasu above Parker Dam |
| **`09474000`** | Gila River at Kelvin, AZ | Discharge (`00060`) | Rate: $Q$ (cfs) | Lower Gila River basin monitoring point |
| **`09520500`** | Gila River near Dome, AZ | Discharge (`00060`) | Rate: $Q$ (cfs) | Historic Gila River confluence near Yuma, AZ |
| **`09498500`** | Salt River near Roosevelt, AZ | Discharge (`00060`) | Rate: $Q$ (cfs) | Salt River tributary to Gila River / Central Arizona |
| **`09511300`** | Verde River near Scottsdale, AZ | Discharge (`00060`) | Rate: $Q$ (cfs) | Verde River tributary to Salt River / Central Arizona |

---

#### 2. Trans-Mountain Diversion Tunnels (CDWR HydroBase)

| Station Abbrev | Facility Name | Parameter Measured | Capacity (cfs) | Diversion Source $\rightarrow$ Destination |
| :--- | :--- | :--- | :--- | :--- |
| **`ADATUNCO`** | Alva B. Adams Tunnel | Discharge (`DISCHRG`) | 1,020 cfs | Grand Lake / Shadow Mtn $\rightarrow$ Estes Park (C-BT / Northern Water) |
| **`MOFTUNCO`** | Moffat Water Tunnel | Discharge (`DISCHRG`) | 1,280 cfs | Fraser River Basin $\rightarrow$ South Boulder Creek / Gross Res (Denver Water) |
| **`ROBTUNCO`** | Harold D. Roberts Tunnel | Discharge (`DISCHRG`) | 1,020 cfs | Dillon Reservoir (Blue River) $\rightarrow$ North Fork South Platte (Denver Water) |
| **`BOUTUNCO`** | Charles H. Boustead Tunnel | Discharge (`DISCHRG`) | 945 cfs | Fryingpan River Basin $\rightarrow$ Turquoise Lake / Arkansas River (Aurora / SECWCD) |

---

#### 3. Major Conveyance & Irrigation Canals (USGS NWIS)

| Station ID | Canal / Aqueduct Name | Parameter Measured | Typical Capacity | Diversion Off-Take $\rightarrow$ Destination |
| :--- | :--- | :--- | :--- | :--- |
| **`09527700`** | All-American Canal near Imperial Dam | Discharge (`00060`, IV) | ~15,155 cfs | Imperial Dam $\rightarrow$ Imperial & Coachella Valleys (IID/CVWD) |
| **`09424150`** | Colorado River Aqueduct near Parker Dam | Discharge (`00060`, DV) | ~1,600 cfs | Lake Havasu (Whitsett Intake) $\rightarrow$ Southern California / MWD |
| **`09426650`** | Central Arizona Project (CAP) Canal | Discharge (`00060`, DV) | ~3,000 cfs | Lake Havasu (Mark Wilmer Pumping Plant) $\rightarrow$ Phoenix & Tucson |

---

#### 4. Major Storage Reservoirs (System-Wide & Front Range Collection)

| Facility ID / Abbrev | Reservoir & Dam Name | Primary Authority / Endpoint | Total Capacity ($V$) | Full Pool Elev | River Basin / Network Position |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **`lake_powell`** (`09379900`) | Lake Powell (Glen Canyon Dam) | USGS IV (`62614`) / USBR CSV `919` | 24,322,000 AF | 3,700.0 ft | Mainstem AZ/UT; Upper Basin Compact delivery bank |
| **`lake_mead`** (`09421000`) | Lake Mead (Hoover Dam) | USBR Hourly HTML / USGS IV (`62614`) | 26,134,000 AF | 1,229.0 ft | Mainstem AZ/NV; Lower Basin primary regulatory storage |
| **`flaming_gorge`** | Flaming Gorge Reservoir | USBR HydroData CSV `917` (17, 49) | 3,749,000 AF | 6,040.0 ft | Green River UT/WY; Upper CRSP drought release facility |
| **`navajo_reservoir`** | Navajo Reservoir (Navajo Dam) | USBR HydroData CSV `920` (17, 49) | 1,696,000 AF | 6,085.0 ft | San Juan River NM/CO; San Juan Basin & Navajo supply |
| **`lake_mohave`** (`09422500`) | Lake Mohave (Davis Dam) | USGS IV (`00054`, `62614`) / USBR Hourly | 1,810,000 AF | 647.0 ft | Lower Mainstem AZ/NV; Mexican Treaty delivery regulation |
| **`blue_mesa`** | Blue Mesa Reservoir | USBR HydroData CSV `913` (17, 49) | 829,500 AF | 7,519.4 ft | Gunnison River CO; Aspinall Unit primary storage |
| **`lake_havasu`** (`09427500`) | Lake Havasu (Parker Dam) | USGS IV (`00054`, `62614`) / USBR Hourly | 619,400 AF | 450.0 ft | Lower Mainstem AZ/CA; Pumping forebay for CRA and CAP |
| **`lake_granby`** (`GRARESCO`) | Lake Granby (Granby Dam) | CDWR HydroBase (`STORAGE`, `ELEV`) | 539,800 AF | 8,280.0 ft | Upper Colorado River (Grand County, CO); C-BT storage |
| **`dillon_reservoir`** (`DILRESCO`) | Dillon Reservoir (Dillon Dam) | CDWR HydroBase (`STORAGE`, `ELEV`) | 257,114 AF | 9,017.0 ft | Blue River (Summit County, CO); Denver Water collection |
| **`green_mountain`** (`GRERESCO`) | Green Mountain Reservoir | CDWR HydroBase (`STORAGE`, `ELEV`) | 153,639 AF | 7,950.0 ft | Blue River (Grand/Summit, CO); C-BT West Slope compensatory storage |
| **`homestake_reservoir`** (`HOMRESCO`)| Homestake Reservoir | CDWR HydroBase (`STORAGE`, `ELEV`) | 43,600 AF | 10,260.0 ft | Homestake Creek (Eagle County, CO); Aurora / Colorado Springs |

---

## 3. Notebook 1 & Notebook 2 Breakdown

### Notebook 1: `notebooks/01_build_river_network.ipynb`
**Title:** *Colorado River Basin Geospatial Topology & Dynamic Shoreline Engine*  
**Objective:** Decouple GIS data preparation from runtime dashboard execution. Constructs clean river centerline networks, splits artificial reservoir centerlines from flowing reaches, extracts bed elevations from NHDPlus VAA, generates topobathymetric slices for Lake Powell, and exports simplified GeoJSON layers.

| Cell Index | Cell Type | Inputs | Processing Logic & Operations | Outputs |
| :---: | :---: | :--- | :--- | :--- |
| **Cell 0** | Markdown | None | Educational framing: NHDPlus navigation, artificial path separation, bed elevations, dynamic re-emergence, topobathymetric contour deck. | Formatted course context |
| **Cell 1** | Code | Python packages: `geopandas`, `shapely`, `rasterio`, `pynhd`, `scipy` | Imports spatial analysis engines and prints version telemetry (`pynhd`, `geopandas`). | Session validation |
| **Cell 2** | Markdown | None | Step 1 explanation: upstream tracing via NLDI from Lees Ferry (`USGS-09380000`). | Documentation |
| **Cell 3** | Code | NLDI Hydrographic Web Service | Instantiates `NLDI()`. Runs `navigate_byid` starting at `USGS-09380000` upstream 999 km along `flowlines` and `nwissite`. | In-memory `GeoDataFrame` (`mainstem_nldi`, `nwis_stations`) |
| **Cell 4** | Markdown | None | Step 2 explanation: querying NHDPlus VAA and extracting smoothed bed elevations (`minelevsmo`). | Documentation |
| **Cell 5** | Code | `pynhd.WaterData("nhdflowline_network")` | Queries NHDPlus VAA across Lake Powell bounding box `(-111.7, 36.8, -109.8, 38.3)`. Converts `minelevsmo` and `maxelevsmo` from cm to feet ($ft = cm \times 0.0328084$). | In-memory `powell_flowlines` DataFrame |
| **Cell 6** | Markdown | None | Step 3 explanation: separating open river flowlines (`StreamRiver`) from drowned reservoir paths (`ArtificialPath`). | Documentation |
| **Cell 7** | Code | `web/data/river_network.json` | Parses curated basin reach MultiLineStrings. Separates `lees_ferry` into free-flowing tailrace below dam vs. drowned canyon thalweg (`powell_submerged_path`). Enriches reaches with bed elevation limits (`minelev_ft`, `maxelev_ft`). | In-memory GeoDataFrame `enriched_rivers` |
| **Cell 8** | Markdown | None | Step 4 explanation: Cataract Canyon dynamic re-emergence rule based on active pool elevation. | Documentation |
| **Cell 9** | Code | `enriched_rivers` GeoDataFrame | Defines `apply_reservoir_reemergence(flowlines_gdf, current_powell_elev_ft=3570.0)`. Checks whether reach bed elevation $\ge$ reservoir water surface elevation. Dynamically updates `re_emerged` boolean and `reach_type`. | Evaluated `GeoDataFrame` (`evaluated_rivers`) |
| **Cell 10** | Markdown | None | Step 5 explanation: in-memory topobathymetric contour synthesis from Lake Powell polygon. | Documentation |
| **Cell 11** | Code | `web/data/lakes.geojson`, USBR Elevation-Storage capacity table | Extracts Lake Powell polygon; creates a $650 \times 650$ raster mask. Computes Euclidean distance transform and canyon thalweg profile vector (Glen Canyon Dam to Hite). Slices 11 discrete elevation tiers (3,490' to 3,700'). Converts masks to simplified polygon GeoJSON features. | In-memory `contour_features` list |
| **Cell 12** | Markdown | None | Step 6 explanation: planar coordinate reprojection (`EPSG:5070`), Douglas-Peucker simplification, and export. | Documentation |
| **Cell 13** | Code | `evaluated_rivers`, `contour_features` | Reprojects river network to CONUS Albers (`EPSG:5070`), applies planar `.simplify(tolerance=50)`, reprojects back to WGS84 (`EPSG:4326`). Serializes outputs to disk. | **Files written:**<br>1. `web/data/powell_contours.geojson`<br>2. `web/data/river_network.geojson`<br>3. `web/data/river_network.json` |

---

### Notebook 2: `notebooks/02_analyze_flow_and_export.ipynb`
**Title:** *Real-Time Telemetry & Hydrological Metric Engine*  
**Objective:** Ingest live USGS streamflows, calculate historical median departures, perform sequential reach-by-reach mass balance accounting ($\Delta Q$), model Lake Powell / Lake Mead storage metrics, and export a static runtime contract for web client consumption.

| Cell Index | Cell Type | Inputs | Processing Logic & Operations | Outputs |
| :---: | :---: | :--- | :--- | :--- |
| **Cell 0** | Markdown | None | Educational framing: decoupled static contract pattern, zero runtime Python dependency for web hosting. | Formatted course context |
| **Cell 1** | Code | Python packages: `requests`, `dataretrieval.nwis`, `pandas`, `numpy` | Imports dependencies and validates `dataretrieval` installation. | Session validation |
| **Cell 2** | Markdown | None | Step 1 explanation: Sentinel gauge definitions across Upper and Lower Basins. | Documentation |
| **Cell 3** | Code | Station metadata dictionary | Defines `SENTINEL_GAUGES` (16 stations) and `RESERVOIR_GAUGES` (Powell & Mead) with metadata, legal order, and storage capacities. | In-memory dictionaries `SENTINEL_GAUGES`, `RESERVOIR_GAUGES` |
| **Cell 4** | Markdown | None | Step 2 explanation: querying real-time instantaneous discharge (`00060`) and stage (`00065`). | Documentation |
| **Cell 5** | Code | USGS NWIS Web Services via `dataretrieval.nwis.get_iv` | Queries live instantaneous values for all 16 stations simultaneously. Extracts the latest valid numeric discharge and stage values per station. | In-memory dictionary `latest_readings` |
| **Cell 6** | Markdown | None | Step 3 explanation: Flow Health formula ($\text{pct\_of\_median} = \frac{Q_{\text{current}}}{Q_{\text{median}}} \times 100$) and color tiers. | Mathematical documentation |
| **Cell 7** | Code | `latest_readings`, `dataretrieval.nwis.get_stats` | Queries 50-year daily statistics (`statReportType="daily"`) for current month/day. Computes percent of median; assigns health tiers: Critically Low ($<25\%$), Low ($25-50\%$), Below Normal ($50-90\%$), Normal ($90-115\%$), Above Normal ($>115\%$). | Enriched `latest_readings` |
| **Cell 8** | Markdown | None | Step 4 explanation: Sequential Reach Delta Analysis ($\Delta Q = Q_{\text{downstream}} - Q_{\text{upstream}}$) along the Colorado mainstem. | Mathematical documentation |
| **Cell 9** | Code | `latest_readings` | Computes sequential mass balances:<br>1. Gore Canyon $\rightarrow$ Cameo<br>2. Cameo $\rightarrow$ Cisco (adjusting for Gunnison)<br>3. Cisco (+ Green River) $\rightarrow$ Lees Ferry (measuring Lake Powell retention)<br>4. Navajo Outflow + Animas $\rightarrow$ Bluff, UT (San Juan accretion). | In-memory list `reach_deltas` |
| **Cell 10** | Markdown | None | Step 5 explanation: Lake Powell and Lake Mead live elevation and active capacity calculations. | Documentation |
| **Cell 11** | Code | USGS NWIS parameter `62614` | Queries water surface elevation for Powell (`09379900`) and Mead (`09421000`). Applies USBR elevation-to-storage polynomial approximations. Determines active capacity percentage and feet below full pool. | In-memory dictionary `reservoir_metrics` |
| **Cell 12** | Markdown | None | Step 6 explanation: packaging the JSON export contract. | Documentation |
| **Cell 13** | Code | `latest_readings`, `reservoir_metrics`, `reach_deltas` | Builds JSON payload containing ISO UTC timestamp, active Powell pool elevation, reservoir states, sentinel readings, and reach mass balances. Exports to disk. | **File written:**<br>`web/data/latest_conditions.json` |

---

## 4. Dashboard & Water Budget Logic

### A. Map Interface: Line Width & Visual Weight Calculation (`web/app.js`)

In the geospatial interface (`web/index.html` & `web/app.js`), river, canal, and tunnel geometries dynamically scale their visual line widths to represent physical conveyance and instantaneous discharge ($Q = \text{cfs}$).

#### 1. Mathematical Scaling Functions

* **River Reach Flowlines (`computeRiverWeight(flowCfs, category)`):**
  River line weight scales non-linearly using a square-root transformation of discharge ($\sqrt{Q}$) to maintain visual differentiation across 3 orders of magnitude (from 50 cfs creeks to 15,000 cfs mainstems) without saturating the screen:
  $$\text{weight}_{\text{mainstem}} = \text{clamp}\left(2.8,\, 12.5,\, 2.0 + 0.08 \sqrt{Q}\right)$$
  $$\text{weight}_{\text{major\_tributary}} = \text{clamp}\left(1.8,\, 7.5,\, 1.4 + 0.065 \sqrt{Q}\right)$$
  $$\text{weight}_{\text{minor\_tributary}} = \text{clamp}\left(1.2,\, 4.0,\, 0.8 + 0.05 \sqrt{Q}\right)$$

* **Trans-Mountain Diversion Tunnels (`computeTunnelWeight(flowCfs)`):**
  $$\text{weight}_{\text{tunnel}} = \begin{cases} 2.5\text{ px} & \text{if } Q \le 0 \\ \min\left(8.0,\, 2.5 + 0.28 \sqrt{Q}\right)\text{ px} & \text{if } Q > 0 \end{cases}$$
  *(Enforces a 2.5px minimum threshold so dry or low-flow tunnels remain visible and interactive).*

* **Canal Diversions (All-American Canal, CRA, CAP):**
  Rendered using a fixed high-contrast dashed blue line:
  * `line-width`: `3.5px`
  * `line-dasharray`: `[3, 2.5]`
  * `line-color`: `#0284c7`

* **Submerged Reservoir Thalweg Centerlines (`reach_type == "submerged_path"`):**
  Rendered with a faint, muted dashed stroke:
  * `line-width`: `1.4px`
  * `line-dasharray`: `[2, 3]`
  * `line-color`: `#0369a1`
  * `line-opacity`: `0.25`

* **Interaction Hit Buffers:**
  To eliminate pixel-hunting when clicking thin vectors on high-DPI displays, every river reach, tunnel, and canal has an invisible parallel hit layer (`line-width: 22px - 24px`, `line-opacity: 0.0001`) that captures hover tooltips and click events.

---

### B. Water Budget Diagram: Layout & Flow Dimensions (`web/sankey.html`)

The Macro Water Budget Diagram (`web/sankey.html`) visualizes the multi-year legal water budget allocated under the 1922 Colorado River Compact and the 1944 Mexican Water Treaty.

#### 1. Temporal & Dimensional Architecture
* **Strict Anti-SaaS Separation:** In strict adherence to workspace domain rules, the visual width of diagram conduits represents **annualized volumetric allocations** ($V$, in Million Acre-Feet per year, MAF/yr), **not** instantaneous streamflow.
* **The Physical Conversion Bridge:** To prevent dimensional confusion, tooltips display both dimensions converted via the physical hydrologic bridge:
  $$1\text{ cfs sustained for 1 year} = 723.97\text{ AF} \approx 0.00072397\text{ MAF}$$
  $$\text{Equivalently: } 1\text{ MAF/yr continuous flow} = \frac{1,000,000\text{ AF}}{723.97\text{ AF/(cfs}\cdot\text{yr)}} \approx 1,381.27\text{ cfs}$$

#### 2. Stroke-Width to Volumetric Allocation Table

The visual width (`stroke-width`) in the SVG diagram maps proportionally to the annualized volume ($MAF/yr$):

| Diagram Path ID | Element Name | Visual `stroke-width` | Budget Allocation ($V$) | Continuous Equivalent ($Q$) |
| :--- | :--- | :---: | :---: | :---: |
| `river-powell-reach` | Lake Powell Thalweg Conduit | **36 px** | ~14.80 MAF/yr | ~20,443 cfs |
| `river-cataract` | Cataract Canyon (Upper Confluence) | **30 px** | 14.80 MAF/yr | 20,443 cfs |
| `river-lower-spine` | Lower Basin Mainstem (Hoover to Parker)| **28 px** | ~10.00 MAF/yr | ~13,813 cfs |
| `river-grandcanyon` | Grand Canyon (Glen Canyon Release) | **24 px** | 8.23 - 10.00 MAF/yr | 11,368 - 13,813 cfs |
| `river-upper-main` | Colorado Mainstem (below Gunnison) | **22 px** | 9.00 MAF/yr | 12,431 cfs |
| `river-lower-mid` | Lower Colorado (below Parker Dam) | **20 px** | 7.45 MAF/yr | 10,290 cfs |
| `river-green` | Green River (below Yampa Confluence) | **18 px** | 4.90 MAF/yr | 6,768 cfs |
| `river-headwaters` | Upper Mainstem Snowpack Headwaters | **18 px** | ~4.50 MAF/yr | ~6,215 cfs |
| `river-lower-canal` | Lower Colorado (above Imperial Dam) | **18 px** | 6.00 MAF/yr | 8,288 cfs |
| `river-upper-main-pre`| Upper Mainstem (above Gunnison) | **16 px** | 3.50 MAF/yr | 4,834 cfs |
| `div-aac` | All-American Canal Diversion | **14 px** | 2.90 MAF/yr | 4,006 cfs |
| `river-green-upper` | Upper Green River (Flaming Gorge) | **14 px** | 3.60 MAF/yr | 4,973 cfs |
| `river-sanjuan` | San Juan River Basin | **10 px** | 2.20 MAF/yr | 3,039 cfs |
| `div-cap` | Central Arizona Project (CAP) | **9 px** | 1.40 MAF/yr | 1,934 cfs |
| `river-gunnison` | Gunnison River Inflow | **9 px** | 2.10 MAF/yr | 2,901 cfs |
| `div-mexico` | 1944 Mexican Water Treaty Delivery | **8.5 px**| 1.50 MAF/yr | 2,072 cfs |
| `river-lower-treaty` | Morelos Dam Tailrace to Delta | **8 px** | 1.50 MAF/yr | 2,072 cfs |
| `div-cra` | Colorado River Aqueduct (CRA) | **7 px** | 1.05 MAF/yr | 1,450 cfs |
| `river-yampa` | Yampa River Inflow | **7 px** | 1.30 MAF/yr | 1,796 cfs |
| `div-frontrange` | Trans-Mountain Front Range Export | **5.5 px**| 0.55 MAF/yr | 760 cfs |
| `river-littleco` | Little Colorado River Inflow | **4.5 px**| 0.20 MAF/yr | 276 cfs |
| `river-delta-dry` | Dry Colorado River Delta Channel | **4.5 px**| 0.00 MAF/yr | 0 cfs |
| `river-virgin` | Virgin River Inflow | **4 px** | 0.25 MAF/yr | 345 cfs |
| `loss-powell` | Lake Powell Evaporation & Bank Loss | **3.5 px**| 0.38 MAF/yr | 525 cfs |
| `loss-mead` | Lake Mead Evaporation & Bank Loss | **3.5 px**| 0.60 MAF/yr | 829 cfs |
| `loss-lower` | Lower Basin Transit & Riparian Losses| **3.5 px**| 0.80 MAF/yr | 1,105 cfs |

---

### C. Hardcoded / Mocked vs. Real Data Audit

The codebase follows a resilient **dual-tier fallback architecture**. Real live telemetry is requested on page load directly from official APIs (and updated via background cron). If network connections fail or CORS restrictions intervene, the UI falls back cleanly to local static JSON snapshots or published historical averages:

| Feature / Metric | Data Ingestion Mode | Real Telemetry Source | Hardcoded / Mocked Fallback Values |
| :--- | :--- | :--- | :--- |
| **Sentinel Streamflows (Map)** | **Live Dynamic (with fallback)** | Direct client fetch from USGS NWIS API (`fetchLiveUSGS()`) or local snapshot (`latest_metrics.json`) | Fallbacks in `applyLiveHydrology()`: Kremmling (429 cfs), Dotsero (660 cfs), Cameo (1,700 cfs), State Line (2,820 cfs), Cisco (3,150 cfs), Lees Ferry (7,940 cfs), Palo Verde (2,230 cfs), Green River (4,500 cfs), Gunnison (1,270 cfs). |
| **Front Range Tunnels (Map)** | **Live Dynamic (with fallback)** | Direct client fetch from CDWR HydroBase API (`fetchLiveCDWR()`) or `latest_metrics.json` | Fallback in `fetch_water_data.py`: `measValue = 0.0` if CDWR timeseries is unavailable. Capacities hardcoded to design maximums (Adams: 1,020 cfs, Moffat: 1,280 cfs, Roberts: 1,020 cfs, Boustead: 945 cfs). |
| **Canal Diversions (Map)** | **Semi-Live (with fallback)** | All-American Canal (`09527700`) is live via USGS NWIS IV. CAP & CRA pulled via USGS DV (`fetch_usgs_daily()`). | In `fetch_water_data.py`, if DV stations have latency/missing records, hardcoded baseline pumping rates apply: CAP (`1,500.0 cfs`), CRA (`1,350.0 cfs`). |
| **Reservoir Storage & Elevation** | **Live Dynamic (with fallback)** | USBR HydroData CSVs (Powell, Flaming Gorge, Navajo, Blue Mesa) + USBR Hourly Scraping (Mead, Mohave, Havasu) + CDWR HydroBase (Dillon, Granby, Green Mtn, Homestake). | Fallbacks in `fetch_reservoirs()` if scrapers fail: Powell (3,518.9 ft / 5,223,099 AF), Mead (1,037.6 ft / 8,600,000 AF), Flaming Gorge (6,006.0 ft / 2,460,597 AF), Navajo (6,018.9 ft / 856,394 AF), Mohave (638.9 ft / 1,582,000 AF), Blue Mesa (7,412.1 ft / 140,029 AF), Havasu (448.7 ft / 595,800 AF). |
| **Dynamic Shoreline (Powell Contours)** | **Dynamic Selection against Pre-computed Slices** | Live elevation from `latest_metrics.json` / USGS NWIS (`09379900`) determines active contour slice. | Slices themselves (3,490' through 3,700' in 20' increments) are pre-calculated offline by Notebook 01 using a distance-transform bathymetric model. |
| **Confluence Mass-Balance Cards** | **Live Calculated** | Evaluated dynamically in `applyLiveHydrology()`: $\text{Mainstem} + \text{Tributary} = \text{Downstream}$. | If upstream or tributary live gauge fails, defaults to modeled tributary inflow (e.g. Uncompahgre fallback: 380 cfs; Fryingpan fallback: 180 cfs). |
| **Sankey Conduit Widths** | **Fixed Statutory Accounting** | Based on multi-year legal allocations (1922 Compact, 1944 Treaty, USBR historical averages). | Static SVG `stroke-width` attributes. Path widths do not flutter with 15-minute weather pulses. |
| **Sankey Tooltip Telemetry Cards** | **Live Comparison Cards** | In `web/sankey.html`, JavaScript dynamically fetches `latest_metrics.json` and evaluates `flowComparisonBox()`, `combinedInflowBox()`, and `reservoirStorageBox()`. | If `latest_metrics.json` cannot be fetched, comparison boxes gracefully collapse, showing only the static statutory allocation text. |
| **Flow Health Departure (%)** | **Live Calculated** | Real-time flow divided by historical median from `web/data/historical_normals.json`. | Hardcoded default normals in `applyLiveHydrology()` if JSON missing: Cataract (7,210 cfs), Green Middle (1,960 cfs), State Line (3,000 cfs), San Juan (1,410 cfs), Grand Canyon (10,522 cfs). |

---
*Manifest generated directly from workspace inspection. Preserves documentation and architectural integrity.*
