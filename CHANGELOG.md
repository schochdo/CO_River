# Changelog

All notable changes to the Colorado River Basin Hydrologic Intelligence & Infrastructure Topology Platform will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project adheres to semantic academic versioning organized by granular work days.

---

## [2.3.0] - 2026-11-17 – 2026-11-18
### Added
- **System Compendium & Knowledge Base (`web/knowledge.html`):** Built a standalone editorial knowledge management system translating the complete hydrologic and legal architecture of `SYSTEM_GUIDE.md` into a searchable web interface. Features real-time client-side search, 7 chapter sections (Basin Math Rosetta Stone, Dam Hydrodynamics & Peaking Waves, Flood Pulse Routing & Slackwater Buffering, Dimensional Standards & Richards-Baker Flashiness, Law of the River & Case Law Decrees, Post-2026 Cliff, and Geodatabase Architecture), deep links to gages and maps, and Edward Tufte styling.
- **Facility Database Export Engine & Data Dictionary Modal (`web/telemetry.html`):** Elevated the 98-station gage ledger into a client-side database explorer. Added one-click client-side CSV export (`colorado_river_basin_facility_database.csv`), JSON export, and an interactive Data Dictionary modal specifying entity definitions, attribute types, measurement units ($Q$ in cfs, $V$ in AF), Sentinel Hierarchy tiers, and API provenance.
- **Automated Portfolio Website Sync & Deployment Pipeline (`scripts/sync_to_portfolio.sh`):** Enhanced synchronization script with `rsync -av --delete --exclude='.cache_usgs*'` to mirror `web/` cleanly into the Astro portfolio website (`Website/public/colorado_river/`), execute local Astro builds, and automatically commit and push to `schochdo.github.io` (`origin main`) for automated GitHub Pages deployment.
- **Automated 2x/Daily GitHub Actions Ingestion Workflow (`.github/workflows/update_data.yml`):** Implemented an automated serverless data refresh workflow running twice daily at 05:00 UTC and 17:00 UTC (`cron: '0 5,17 * * *'`) plus manual execution on demand via `workflow_dispatch`. The job checks out the repository, installs Python dependencies (`requests`), executes `src/fetch_water_data.py`, `src/fetch_replay_7d.py`, and `src/fetch_replay_30d.py`, detects whether data matrices have updated via `git diff --staged`, and commits updated JSON files back to `main` as `github-actions[bot]`.
- **Automated Map Drag Panning Verification Suite (`scripts/test_drag_pan.js`):** Built automated Chrome DevTools Protocol test simulating mouse drag panning at 0° pitch and 45° 3D terrain pitch, verifying continuous non-sticking map movement, correct coordinate deltas, and clean return to FSM `idle` mode.
- **7-Day & 30-Day Empirical Flow Replay Subsystem (`src/fetch_replay_7d.py`, `src/fetch_replay_30d.py`, `web/flowReplay.js`, `web/map_embed.html`, `web/map.html`, `web/style.css`):** Built a high-performance, zero-bloat temporal replay player for the System Map visualizing flood wave movement and reservoir buffering across 1-week and 1-month horizons using real USGS streamflow data:
  - *Lightweight Pre-Downsampled Columnar Matrices:* 
    - 7-Day Window (`web/data/replay_7d.json`): 1-hour resolution, 170 steps across 70 stations = **81.9 KB uncompressed** (11.9 KB gzipped).
    - 30-Day Window (`web/data/replay_30d.json`): 2-hour resolution, 362 steps across 70 stations = **166.4 KB uncompressed** (35.4 KB gzipped), with zero null holes. Captures diurnal snowmelt cycles and desert flash flood crests (such as the Nov 3 San Juan River surge to 32,900 cfs).
    - Total combined disk storage for both replay datasets: **under 250 KB** (smaller than a single satellite map tile).
  - *Persistent Pipeline Chunk Caching & Gzip Compression:* Updated data pipeline with gzip wire compression (`Accept-Encoding: gzip`) and persistent local chunk caching (`web/data/.cache_usgs_*/`). Subsequent pipeline builds skip network queries entirely for cached chunks.
  - *Multi-Period Switching & In-Memory Client Caching:* Added responsive `[ 7D ] [ 30D ]` selector pills to the scrubber bar. Lazy-loads and retains both datasets in memory; switching between 7D and 30D executes in **<2ms** with zero network calls.
  - *Non-Destructive Baseline Restoration:* Cached original GeoJSON states for `streamflow-gauges` and `rivers`. Closing the replay player or clicking "LIVE" immediately restores original baseline geometry and paint properties with zero lingering mutations.
  - *Hydrologic Sentinel Pulse Tracking Strip:* Integrated dedicated sentinels callout directly on the scrubber bar: San Juan River at Mexican Hat (`09379500`) entering Lake Powell, Lees Ferry (`09380000`) showing steady controlled releases below Glen Canyon Dam, and Gila River near Dome (`09520500`) showing lower-basin border flow. Visually demonstrates why San Juan flash floods are buffered by Lake Powell (leaving Lees Ferry steady) and why Gila floods cannot reach Lake Powell or Lake Mead.
  - *60 FPS WebGL Layer Mutations:* Updated `streamflow-gauges-circle` and `streamflow-gauges-casing` paint expressions using MapLibre `coalesce` to dynamically scale marker radius via $r = \max(3.5, \min(22.0, 3.5 + \sqrt{Q} \times 0.088))$ and highlight surge spikes in amber (`#f59e0b`). Updated river reach vector line weights via `computeRiverWeight(flow, category)`.
  - *Transport Controls & Editorial Scrubber:* Docked centered scrubber bar with Play/Pause rAF animation loop, step forward/back (±1 step), scrub slider, speed multipliers (1h/s, 4h/s, 12h/s), Mountain Time ISO timestamp formatting, and relative time offsets (`T - Xd Yh`).
  - *Automated Verification Suite:* Created `scripts/verify_flow_replay.js` validating all 7 matrix, browser CDP transport, period switching, MapLibre vector property, and baseline restoration assertions with 100% pass rate; captured high-resolution verification screenshots (`verified_7d_flow_replay.png`, `verified_30d_flow_replay.png`).
- **Flawless 3D Camera & Flight Subsystem (`web/cameraFlight.js`, `web/app.js`):** Completely upgraded 3D camera controls and flight engine in MapLibre GL JS based on expert graphics engineering specifications:
  - *Camera Finite State Machine (FSM):* Implemented centralized `CameraStateMachine` managing modes (`'idle'`, `'flight'`, `'flyto'`, `'inspect'`).
  - *Manual Preemption:* Enforced immediate flight preemption (`cancelProgrammaticFlight(map)` $\rightarrow$ `map.stop()`) on user keydown, pointer/drag, touch, or UI zoom click.
  - *Safe Navigation Wrappers:* Built `safeFlyTo` and `safeEaseTo` with target coordinate validation (`isFinite(lng)`, `isFinite(lat)`, NaN/undefined guards), ground clamping (`setCenterClampedToGround(true)`), FSM mode tracking with `map.once('moveend')` cleanup, and progressive pitch ceiling enforcement. Replaced all direct `map.flyTo` / `map.easeTo` calls across `web/app.js`.
  - *60 FPS Keyboard Flight Engine:* Disabled default MapLibre keyboard stepping (`map.keyboard.disable()`). Implemented dedicated rAF loop driven by `activeKeys: Set<string>`:
    - Arrow Keys: Horizontal ground plane cruising along current camera bearing.
    - WASD: 3D pitch tilt ($36^\circ/\text{s}$, $72^\circ/\text{s}$ with Shift) and azimuth heading rotation ($42^\circ/\text{s}$, $84^\circ/\text{s}$ with Shift).
    - Q / E (or PageDown / PageUp): True vertical "helicopter elevator" changing altitude straight up/down without lateral ground drift, using focal offset formula $\Delta d = (h_{\text{next}} - h_{\text{prev}}) \tan(\text{pitch})$.
    - +/- or Z / X: Line-of-sight zoom with collision safety floor.
    - Shift: 2.5× sprint multiplier across all flight axes.
  - *Pitfall 1 (Smooth Key-Release Terrain Settlement):* On flight stop, cleared internal `heldFlightAltitude = null` and `isElevationHeld` without calling private MapLibre methods `releaseElevation()` or `putCenterBackOnTerrain()`, letting MapLibre's terrain compositor settle the center smoothly with zero camera bounce or slam.
  - *Pitfall 2 (Safari Trackpad Double-Zoom Prevention):* Disabled `map.scrollZoom` on `gesturestart`, re-enabling on `gestureend` with a 400ms watchdog timer.
  - *Pitfall 3 (MacBook Trackpad Disambiguation):* Disambiguated MacIntel trackpads from iOS touchscreens using `'ontouchend' in document` check.
  - *Pitfall 4 (Guarded Synchronous Pitch Corrections):* Guarded `moveend` and `zoom` pitch correction handlers with `if (cameraStateMachine.getMode() === 'flight') return;`, eliminating unwanted jerk frames on key release.
  - *Pitfall 5 (Ground Collision Clearance Floor with 0.6s Lookahead):* Implemented predictive 0.6-second terrain elevation sampling at current position and lookahead vector. Enforced $25.0\text{ m}$ clearance floor (`MIN_CAMERA_CLEARANCE_METERS = 25.0`), smoothly elevating altitude or preventing descent near steep terrain.
  - *Trackpad & Mouse Wheel Controller:* Attached captured `{ passive: false, capture: true }` wheel listener on canvas container: Shift+wheel tilts 3D pitch directly, Alt+wheel rotates azimuth heading directly, and Ctrl+wheel prevents browser tab zoom.
  - *Tablet & Mobile Two-Finger Touch Arbiter:* Disabled `map.touchPitch.disable()`. Implemented touch arbiter with a 12px deadzone locking into `'pitch'` vs. `'zoom-rotate'`. Enforced 120ms single-finger pan suppression on 2-to-1 finger transition to eliminate camera snapping.
  - *Continuous Progressive Pitch Ceiling:* Implemented single formula $\text{maxAllowedPitch} = \max(0, \min(82, (\text{zoom} - 3.5) \times 18))$, seamlessly ramping pitch from $0^\circ$ at globe level ($z \le 3.5$) up to $82^\circ$ at local mountain level ($z \ge 8.0$).
  - *UI Navigation Zoom Buttons (+ / -):* Intercepted click events on `.maplibregl-ctrl-zoom-in` and `.maplibregl-ctrl-zoom-out` to cancel flight and use `safeEaseTo(map, { zoom: curZoom ± 1, duration: 250, freezeElevation: true })`.
  - *Automated Test Suite & Verification:* Created `scripts/test_upgraded_camera_controls.js` verifying all 14 unit, kinematic, and browser runtime assertions with 100% pass rate; captured high-resolution verification screenshot (`verified_3d_camera_controls.png`).
- **Longitudinal River Profile Mockup (`river_elevation_profile_mockup.html`):** Built interactive 2.5D hypsometric elevation profile prototype (Elevation in ft vs. Colorado River Miles from 0 to 1,400+ mi):
  - *2.5D Oblique Tributary Inflow Vectors:* Modeled lateral tributary inflows (Green River, Gunnison, San Juan, Little Colorado, Virgin, Gila) on an axonometric Z-axis entering at physical confluence nodes.
  - *Reservoir "Bathtub" Pools & Hydraulic Head Drops:* Rendered Lake Granby, Lake Powell, Lake Mead, Lake Mohave, and Lake Havasu as flat water pools with vertical dam hydraulic drops (Glen Canyon ~390 ft drop, Hoover ~395 ft drop).
  - *Gage Coverage Diagnostics ("Question Marks"):* Analyzed un-gaged long stretches, distinguishing physical slackwater impoundment pools (velocity $\approx 0$) from inaccessible wilderness gorges (137-mile Grand Canyon Granite Gorges with 18–24h wave travel lag).
  - *Artifact & Local Server Verification:* Saved standalone HTML artifact and deployed to `web/profile_mockup.html`; captured high-resolution verification screenshots (`verified_elevation_profile_mockup_25d.png`, `verified_elevation_profile_mockup_2d.png`).
- **GIS Topology Diagnostics Layer (`web/map.html`, `web/app.js`):** Implemented desktop GIS troubleshooting tools requested for reach geometry and vector inspection:
  - *Downstream Flow Direction Vectors:* Added toggleable MapLibre layer `gis-flow-arrows` rendering dynamic downstream flow direction vectors (`▶`) along all 83 river reaches using an offline 16x16 HTML5 Canvas icon and MapLibre `symbol-placement: 'line'` along polyline tangents.
  - *Reach Topology Nodes & Vertices:* Added toggleable MapLibre layer `topology-nodes` extracting start/inflow vertices (Emerald `#10b981`) and end/confluence vertices (Amber `#f59e0b`) across all 83 river reaches (166 total nodes).
  - *Interactive Vertex Diagnostics:* Added hover diagnostics tooltip displaying reach name, reach ID, vertex role, exact WGS84 coordinates, and reach selection/highlight on click.
  - *UI Controls & Legend:* Added layer toggles under `#pane-layers` ("GIS & Topology Diagnostics") and legend items.
- **1:1 Telemetry Station Parity (98/98 Stations Mapped):**
  - Integrated all 98 stations from `web/telemetry.html` into the native WebGL map point layer `streamflow-gauges`:
    - 79 USGS Streamflow Gages (USGS Blue `#0284c7`)
    - 4 Trans-Mountain Diversion Tunnels (Trans-Divide Cyan `#0891b2`)
    - 4 Conveyance Canals (Conveyance Emerald `#059669`)
    - 11 Storage Reservoirs (Storage Crimson `#dc2626`)
  - Updated `stationMarkers` registry to index all 98 stations with rich tabbed popups (live telemetry + Python API / cURL snippets).
  - Updated `focusMapStation(stationId)` so clicking "Map ↗" from any row in the telemetry table or passing `?station=<id>` flies to the point, highlights the feature (and reservoir polygon), and opens the station popup.
  - Resolved `null.toLocaleString()` bug on offline conduits (e.g. Colorado River Aqueduct maintenance status) to ensure resilient point layer generation.
  - Verified 1:1 parity via Chrome DevTools automation (`verified_all_stations_and_gis_layers.png`, `verified_gis_confluence_arrows_nodes.png`, `verified_reservoir_station_popup.png`, `verified_tunnel_station_popup.png`).
- **Richards-Baker Flashiness Index & Basin Sentinel Hierarchy (`web/telemetry.html`, `src/compute_rbi_and_sentinels.py`, `web/data/station_hierarchy.json`):**
  - Implemented the Richards-Baker Flashiness Index ($RBI = \sum |q_t - q_{t-1}| / \sum q_t$) across all dashboard gaging sites. Expanded `src/fetch_historical_normals.py` to 73 USGS stations with full 366-day daily mean normals.
  - Built automated calculation utility `src/compute_rbi_and_sentinels.py` producing `web/data/station_hierarchy.json` classifying all 98 facilities into 6 sentinel tiers and 4 flashiness regimes:
    - *Compact Sentinel (Tier 1):* Lees Ferry statutory legal divide fulcrum (`09380000`, $RBI = 0.0146$).
    - *Basin Sentinel (Tier 2):* 23 key mainstem and tributary accounting nodes (Cameo, Dotsero, State Line, Cisco, Greendale/Flaming Gorge, Jensen, Green River UT, Grand Junction, Dolores, Bluff, Hoover tailwater, Davis tailwater, Parker tailwater, Palo Verde tailwater, Imperial tailwater).
    - *Tributary Gage (Tier 3):* Secondary upstream and headwater river reaches.
    - *Trans-Divide Tunnel (Tier 4):* Continental Divide export conduits (Adams, Moffat, Roberts, Boustead).
    - *Conveyance Canal (Tier 5):* Interstate delivery canals (All-American Canal, CAP, CRA, Canal Alimentador).
    - *Storage Reservoir (Tier 6):* 11 federal and Front Range storage impoundments (Mead, Powell, Flaming Gorge, Navajo, Mohave, Blue Mesa, Havasu, Dillon, Granby, Green Mountain, Homestake).
  - Enhanced `web/telemetry.html` with:
    - Sortable columns for `Hierarchy / Status ↕` and `Flashiness (RBI) ↕` (numeric score with qualitative regime badge).
    - Sentinel Hierarchy filter dropdown and Flashiness Regime filter dropdown.
    - Quick-filter category pills including `Basin Sentinels (23)` and `1922 Compact Divide (1)`.
- **Docked Collapsible Telemetry Gage Tray on Map (`web/map_embed.html`, `web/map.html`, `web/app.js`, `web/style.css`):**
  - Restored the docked bottom telemetry tray requested by the user, providing an efficient, integrated way to inspect, filter, and fly to all 98 gages without switching tabs.
- **Topology Diagnostics Redesign, Confluence Junctions & MultiLineString Flow Reversal Fix (`web/map_embed.html`, `web/map.html`, `web/app.js`, `web/style.css`, `web/data/river_network.geojson`, `web/data/river_network.json`):**
  - *Elimination of Viewport Clutter:* Dropped floating `#gis-quick-bar` toolbar from the top-right of the map per Anti-SaaS design principles.
  - *Map Layers Drawer Diagnostics:* Renamed section header to strictly `Topology Diagnostics` in `#pane-layers`; wrapped toggles in `.topology-diagnostics-group` with `display: flex; flex-direction: column; gap: 10px;` and updated `.toggle-label` with `min-height: 24px; padding: 3px 0;`, completely eliminating toggle slider collision/overlap. Replaced term "vector" with "flow direction" across all UI labels and legends.
  - *MultiLineString Line Order & Direction Repair:* Diagnosed why intermediate nodes appeared mid-river on the Gila River. In 12 MultiLineString features (`gila_river`, `yampa_river`, `white_river`, `roaring_fork_river`, `little_colorado_river`, `virgin_river`, `animas_river`, `havasu_creek`, `san_pedro_river`, `fraser_river`, `fryingpan_headwaters`, `muddy_river`), segment arrays were stored in reverse line order (downstream-to-upstream). Re-chained and oriented all features strictly from upstream headwaters to downstream mouth, ensuring downstream flow direction arrows point consistently downstream into confluences.
  - *Confluence Junctions (■ Squares):* Built dedicated `confluence-square` Canvas icon (`■`, Amber `#d97706` fill with dark slate border and white inner ring) cataloging 31 verified confluences across the basin (e.g. Green + Colorado, Gunnison + Colorado, San Juan + Colorado, Gila + Colorado, Salt + Gila, Verde + Salt, San Pedro + Gila, Yampa + Green). Interactive tooltip displays tributary name, mainstem joined, geographic location, and WGS84 coordinates.
  - *Reach Section Nodes (● Dots):* Implemented distinct styling for reach section boundaries without requiring selection/click to see reach extents:
    - *Headwaters Origin (`●` Emerald `#10b981`):* Stream origin points (Baker Gulch, Daniel WY, Flat Tops, Silverton, Gila Headwaters NM).
    - *Reach Section Boundary (`●` Sky Blue `#0284c7`):* Transition boundaries between consecutive reaches (Granby Dam, Dotsero, Cameo, State Line, Glen Canyon Dam, Lees Ferry, Hoover Dam, Davis Dam, Parker Dam, Imperial Dam, Painted Rock).
    - *Basin Terminus (`●` Crimson `#ef4444`):* Morelos Dam / Mexican Border outflow.
  - *Independent Toggles & Legend Sync:* Separated Map Layers drawer into 3 independent toggles: `Flow Direction (▶ Downstream)`, `Confluence Junctions (■ Squares)`, and `Reach Section Nodes (● Dots)`. Updated `#map-legend` accordingly.
  - *Headless Chrome Verification:* Verified via native WebSocket Chrome DevTools Protocol (`verified_topology_drawer_spacing.png`, `verified_gila_river_topology_junctions.png`, `verified_yuma_gila_confluence_tooltip.png`, `verified_basinwide_all_confluences.png`).
  - Implemented simplified, responsive layout:
    - Header bar: Title with active count badge `(98)`, quick search input (`Search name, ID, type...`), quick category filter buttons (`All`, `Sentinels`, `Tributaries`, `Exports`, `Reservoirs`), `Full Ledger ↗` link, and `▲ Gages` / `▼ Hide` collapse button.
    - Scrollable table container: 5 essential columns (Station Name with official portal link, Station ID, Hierarchy / Status badge, Type pill, Current Flow / Storage, Action button `Map ↗`).
    - Click-to-Fly Integration: Clicking any row or `Map ↗` smoothly flies the 3D/2D camera directly to that gage point and opens its popup.
    - Resilient Layout: Tray defaults to collapsed (height 36px) as a sleek bottom toolbar; when expanded (height 240px), `.map-legend` and `.trackball-nav-control` smoothly elevate without colliding, and tray shifts left when the Basin Metrics drawer opens.
    - Fixed null-safety in flow formatting (`s.flow_cfs != null`) to ensure robust operation when conduits are offline.
  - Verified via native WebSocket Chrome DevTools Protocol automation (`verified_telemetry_with_sentinel_pill.png`, `verified_map_embed_tray_collapsed.png`, `verified_map_embed_tray_populated.png`, `verified_map_tray_search_lees_ferry.png`, `verified_map_fly_to_lees_ferry.png`).
- **Master System Guide (`SYSTEM_GUIDE.md`):** Authored comprehensive human-readable architecture, domain science, and policy reference document:
  - *Basin Math Rosetta Stone:* Step-by-step mathematical reconciliation of 15.0 MAF (Core Compact III.a), 16.0 MAF (III.b concession), 16.5 MAF (Core + Treaty), 17.5 MAF (Total Statutory Paper Rights), ~19.5 MAF (Gross System Demand including uncounted evaporation/seepage), and 12.4 MAF (21st-century wet water reality).
  - *Zero-Framework Architecture:* Documented rationale for pure Vanilla JS, MapLibre GL, D3.js, Chart.js, and static deployment (zero build step, zero hosting cost, no sleeping servers).
  - *Cartographic Engineering & Topological Dilemmas:* Detailed the 0D gage point vs. 1D continuous river polyline attribution dilemma and documented the node-only reach splitting fix.
  - *Hydrologic Physics:* Articulated dimensional rate vs. volume conversion bridges ($1\text{ cfs sustained for 1 yr} = 723.97\text{ AF}$), Richards-Baker Flashiness index, and lagged travel times to Lake Powell.
- **Repository Landing Page Overhaul (`README.md`):** Restructured `README.md` into an executive, visual orientation hub linking directly to `SYSTEM_GUIDE.md`, reproducible Jupyter notebooks, and live dashboard tabs.
- **Changelog Reconstruction & Day-by-Day Mapping:** Reconstructed project-wide development history across 166 Git commits and agent interaction transcripts, organizing deliverables into granular calendar sprint windows.
- **Mandatory Documentation Rule:** Codified Section 5 in `GEMINI.md` requiring continuous session logging in `CHANGELOG.md` and `AI_LOG.md` for all future tasks.

### Changed
- **Architectural Performance Hardening (Chart.js Reuse, Event Delegation & DocumentFragment Batching) (`web/app.js`, `web/index.html`, `web/style.css`):**
  - *Chart.js In-Place Mutation:* Refactored Act 2 seasonal engine hydrograph (`renderSeasonalEngineChart()` in `web/index.html`) to reuse the single `seasonalChartInstance` on view toggles between "5 River Pulses" and "Supply vs. Demand Mismatch". Mutates `chart.data` and `chart.options` in-place and calls `chart.update('none')`, permanently eliminating canvas destruction, context recreation, and garbage collection spikes.
  - *Table Event Delegation:* Eliminated inline `onclick` attributes across all 98 table rows and buttons in the docked gage tray (`renderTrayRows()` in `web/app.js`). Replaced with a single delegated click listener on `tbody` resolving `tr[data-station-id]`.
  - *DocumentFragment Batching:* Refactored `populateTelemetryTable()` to build DOM nodes in a detached `document.createDocumentFragment()` before executing a single `replaceChildren(fragment)` insertion, eliminating 98 synchronous layout reflows.
  - *Active Row Highlight & Idempotent Selection Guard:* Styled `.active-station-row` in `web/style.css`. Added idempotent guard in `focusMapStation()` to prevent redundant re-flying and camera stutter when the same station is clicked repeatedly.
  - *Automated Verification:* Verified 100% test pass rate via `scripts/verify_architectural_optimizations.js`.
- **Purge of "GIS" Nomenclature & Renaming to "System Map" (`web/index.html`, `web/map.html`, `web/map_embed.html`, `web/app.js`, `SYSTEM_GUIDE.md`):**
  - *Domain Accuracy:* Replaced "GIS Hydrology Map" with **"System Map"** across the primary navigation sidebar, tooltips, and documentation, accurately reflecting the platform as an interactive operational hydrologic dashboard rather than a desktop geoprocessing GIS tool (where users author/edit spatial layers or run vector geoprocessing).
  - *DOM & Code Hygiene:* Renamed `id="toggle-gis-flow-arrows"` to `id="toggle-flow-arrows"`, renamed internal MapLibre layer `gis-flow-arrows` to `flow-direction-arrows`, removed legacy unused `.gis-quick-toolbar` CSS rules from `web/map_embed.html`, and updated `SYSTEM_GUIDE.md` references.
  - *Headless Chrome Verification:* Verified sidebar navigation button label and title (`System Map`) and map tab loading via automated CDP script `scripts/verify_gis_removal.js` (`verified_system_map_tab.png`, `verified_sidebar_system_map.png`).
- **Brand Title & Author Attribution Redesign (`web/index.html`, `web/law.html`, `web/pipeline.html`, `web/sankey.html`, `web/telemetry.html`):**
  - *Full Basin Nomenclature:* Updated the primary brand title from "Colorado Basin" to the full hydrologic and statutory watershed designation **"COLORADO RIVER BASIN"** (encompassing both Upper and Lower Basins under the 1922 Compact).
  - *Purge of "Research Workspace":* Completely removed the "Research Workspace" label across the primary sidebar and all secondary return navigation links (`← Back to Colorado River Basin` across `pipeline.html`, `sankey.html`, `telemetry.html`, `law.html`).
  - *Author & Academic Term Attribution:* Added author name **Douglas Schoch** in bold stone-800 typography, alongside course and term details: `Colorado Mountain College • DAT1001 • Fall 2026`.
  - *Page Title Tag:* Synchronized `<title>` to `Colorado River Basin | Douglas Schoch (DAT1001 Fall 2026)`.
  - *Headless Chrome Verification:* Verified layout and text rendering via automated CDP script `scripts/verify_sidebar_header.js` (`verified_sidebar_brand_header.png`, `verified_sidebar_full_crop.png`).
- **Monospace "Slop Font" Purge & Project Typography Harmonization (`web/index.html`, `web/profile_mockup.html`, `web/editorial.css`, `web/sankey.html`, `web/telemetry.html`, `web/ml_analysis.html`, `web/pipeline.html`):**
  - *Lake Mead & Powell Operational Badges:* Replaced monospaced typewriter font (`.mono`, `font-mono`) on reservoir threshold elevation and volume metric cards (e.g. Lake Mead Spillway Crest `1,221.4 ft`, Tier 1 Shortage `1,075.0 ft`, Min Power Pool `950.0 ft`, Dead Pool `895.0 ft`; Lake Powell Full Pool `3,700.0 ft`, Top Joint Use `3,648.0 ft`, Min Power `3,490.0 ft`, Dead Pool `3,370.0 ft`; System Capacities `~60.0 MAF`, `56.2 MAF`, `~17.7 MAF`, `~6.0 MAF`) with the project's standard editorial sans-serif font (**Inter**) styled with proportional tabular lining numbers (`tabular-nums`).
  - *Overview Storyboard Metrics:* Purged `font-mono` across Acts 1 through 4 (comparative mass balance ledger `17.5 MAF/yr`, `12.4 MAF/yr`, `-5.1 MAF/yr`; visual proportional comparison bars; 3 historical era cards; seasonal pulse benchmarks `~48,000 cfs`, `~6,100 cfs`, `~15,000 cfs`, `96d Refill / 269d Drain`; elevation range indicators; conveyance canal flow indicators `11,500 cfs`, `3,000 cfs`, `2,600 cfs`; and legal expiration badges).
  - *Elevation Profile Mockup (`web/profile_mockup.html`):* Purged `font-mono` across all SVG axes tick labels, river inflow callouts, question-mark stretch diagnostics, and the docked live telemetry readout strip (`#readout-elev`, `#readout-flow`, `#readout-drop`, `#readout-span`, `#readout-mile`), harmonizing them with the site's Inter typography.
  - *Stylesheet & Script Purge:* Decoupled `.mono` from `code, pre` CSS selectors across `web/index.html`, `web/sankey.html`, `web/telemetry.html`, and `web/ml_analysis.html`; updated monthly elevation heatmap dynamic JavaScript year labels to use `tabular-nums`; reserved monospace typography strictly for genuine code artifacts (e.g. `/nwis/iv/`, `src/fetch_water_data.py`, `.ipynb` notebook links).
  - *Automated Chrome DevTools Verification:* Verified computed font families on Lake Mead Spillway Crest (`Inter, -apple-system, sans-serif`), Lake Powell, Overview Acts, and Profile Mockup via CDP script `scripts/verify_font_cleanup.js` (`verified_reservoirs_font_clean.png`, `verified_mead_badges_crop.png`, `verified_spillway_crest_card_clean.png`, `verified_overview_font_clean.png`, `verified_profile_mockup_font_clean.png`).
- **Overview Page Editorial Clean-up & Zero-Gap Header Docking (`web/index.html`):**
  - *Purge of "10-Minute Briefing" Terminology:* Removed presentation/briefing wording and badges (`● 10-MINUTE BRIEFING:`) from the navigation bar and HTML structure, establishing a permanent academic and research orientation ("Overview" and "Basin Overview & Water Balance").
  - *Zero-Gap Flush Header Sub-Bar:* Relocated the section navigation bar (`#storyboard-nav`) out of `#section-overview` (which introduced 24–28px container padding and a visual gap) directly into `<header id="academic-top-header">`. Docked it flush beneath the title with `border-t border-[#e2e8f0] bg-[#f8fafc] px-6 py-2` and `gap-2`, completely eliminating the top void and anchoring the section jump buttons directly to the header.
  - *Purge of "Presenter Takeaway" Wording:* Replaced all instances of "Presenter Key Takeaway" across Acts 1, 2, 3, and 4 with direct academic callouts ("Key Finding:").
  - *Scroll-Spy & Synchronized Navigation:* Updated scroll offsets and event listeners (`scrollToAct`, `initActScrollSpy`, `updateActiveActButton`) ensuring seamless scrolling, smooth active button highlight transitions, and full tab isolation (confined strictly to the Overview tab).
  - *Headless Chrome Protocol Verification:* Verified zero gap, smooth scrolling, active states, and editorial styling across all 4 sections via automated CDP scripts (`verified_overview_act1.png`, `verified_overview_act2.png`, `verified_overview_act3.png`, `verified_overview_act4.png`).
- **Longitudinal River Profile Light Theme & Animation Purge (`web/profile_mockup.html`, `river_elevation_profile_mockup.html`):**
  - Redesigned the elevation profile mockup into the project's Edward Tufte / Swiss transit editorial light palette (crisp `#ffffff` card surfaces, `#f8fafc` slate background, dark charcoal typography `#0f172a`, subtle `#e2e8f0` gridlines, and `#0284c7` water blue thalweg).
  - Completely purged the shooting green circle animation (`animate-ping` ping ring at the Green River confluence) and decorative pulsing status pills (`animate-pulse`) in strict adherence to Rule 1 anti-SaaS principles.
  - Replaced high-contrast neon bands with editorial amber-hatched diagnostic question-mark spans, and updated gage station points to crisp white-and-blue dots matching the map standard.
  - Eliminated the obstructive floating popup overlay (`#readout-card`) that previously covered Lake Mead, Hoover Dam, Davis Dam, Parker Dam, and Imperial Dam; converted inspection into a docked, horizontal **Feature Inspection Strip** below the SVG canvas, keeping 100% of the 1,400+ river miles visible and unobstructed.
  - Verified 2D orthographic, 2.5D inflow projection, and unobstructed docked strip views via automated headless Chrome (`verified_elevation_profile_mockup_light_2d.png`, `verified_elevation_profile_mockup_light_25d.png`, `verified_profile_mockup_unobscured.png`).
- **Quick GIS Diagnostics Toolbar & Map Layers Parity (`web/map_embed.html`, `web/map.html`, `web/app.js`):**
  - Resolved missing GIS layer controls on the integrated system map: synchronized `web/map_embed.html` with `web/map.html` so all GIS debugging layers (`gis-flow-arrows`, `topology-nodes`), the 98-station telemetry label, and the 4-category legend appear in the main embedded dashboard tab.
  - Added a prominent, 1-click **Quick GIS Diagnostics Toolbar** directly on the map viewport (`GIS: [ ▶ Vectors ] [ ● Nodes ]`) with two-way reactive state sync between the quick buttons and drawer checkboxes (`toggleQuickGis()`, `syncQuickGisButtons()`).
  - Added visible, high-contrast text (`Map Layers`) to `#map-menu-btn` to eliminate mystery icon navigation.
  - Verified complete iframe and standalone parity via automated headless Chrome (`verified_map_embed_gis_quick_bar.png`, `verified_map_embed_layers_drawer.png`, `verified_integrated_dashboard_map_tab.png`).
- **Comprehensive Calculus & Pseudo-Equation Slop Purge:**
  - *Telemetry Ledger Footer (`web/telemetry.html`):* Removed awkward raw calculus equation string (`Instantaneous rate $Q = dV/dt$ (cfs); Cumulative storage $V$ (Acre-Feet)`). Replaced with clear, professional domain text: `Streamflow reported in cubic feet per second (cfs); reservoir storage reported in acre-feet (AF)`.
  - *Elevation Profile Mockup (`web/profile_mockup.html`, `river_elevation_profile_mockup.html`):* Purged raw LaTeX math symbols (`$v$`, `$v \approx 0.01\text{ ft/s}$`, `$\Delta V/\Delta t$`) from diagnostic cards, articulating slackwater physics and Glen Canyon surface elevation tracking in plain English.
  - *Data Architecture Modal (`web/map.html`):* Replaced pseudo-equation `Q_downstream = Q_mainstem_upstream + &Sigma;...` with a readable Reach Mass Balance definition.
  - *Master Guides (`SYSTEM_GUIDE.md`, `PROJECT_MANIFEST.md`):* Eliminated unnecessary derivatives/integrals and fixed corrupted escape sequences in Section 5, presenting dimensional arithmetic and physical conservation laws clearly.
  - *Visual Verification:* Captured headless Chrome screenshots confirming clean editorial footers and cards (`verified_telemetry_clean_footer_visible.png`, `verified_profile_mockup_clean_cards.png`).

### Fixed
- **Map Legend Overflow & Close Inaccessibility Defect (`web/style.css`, `web/map.html`, `web/map_embed.html`, `web/app.js`):**
  - Diagnosed critical UX defect on laptop and smaller height screens where the Map Legend expanded upward beyond the top of the browser viewport (`top: -63px` to `-267px`), pushing the `.legend-header-toggle` with the collapse button completely off-screen and leaving users with no way to close it.
  - Eliminated horizontal bloat (previously 634px wide) by setting a clean editorial fixed width of `290px` with `box-sizing: border-box`.
  - Implemented flex column layout with `max-height: min(65vh, 460px)` (and `min(48vh, 320px)` when the gage tray is expanded), guaranteeing the legend never breaches the top edge of the map viewport.
  - Pinned `.legend-header-toggle` with `flex-shrink: 0; background: #f8fafc`, ensuring the close toggle is permanently visible and accessible at the top of the card at all times.
  - Added internal vertical scrolling on `.legend-content` with a sleek 5px custom scrollbar (`scrollbar-width: thin; overscroll-behavior: contain`).
  - Added an explicit secondary `Collapse ▲` button in the legend footer so users who scroll to the bottom can collapse the legend without scrolling back up.
  - Streamlined gage indicators into a compact 2-column grid (`Streamflow`, `Reservoirs`, `Tunnels`, `Canals`), saving 4 lines of dead height.
  - Wrapped 3D flight & keyboard shortcuts in an expandable `<details>` section and made Topology Diagnostics and Flow Health display dynamically only when those layers are active.
  - Enhanced `initLegendState()` to auto-collapse the legend on short viewports (`window.innerHeight <= 700`) and when the bottom gage tray opens on smaller displays.
  - Verified 100% pass rate via automated CDP test suite (`scripts/verify_collapsible_legend_sizing.js`) across 1280x720 and 1024x600 viewports (`verified_legend_compact_sizing.png`, `verified_legend_collapsed_pill.png`).
- **Map Drag Pan "Sticking" Defect (`web/cameraFlight.js`):**
  - Eliminated map drag stuttering and sticking caused by:
    1. `onMapMoveDuringDrag` repeatedly invoking `map.setZoom()` inside `map.on('move')` while `map.isDragging()` was true, which repeatedly reset MapLibre's internal `DragPanHandler` projection offset to zero. Removed `onMapMoveDuringDrag` and its `map.on('move')` listener.
    2. `cancelProgrammaticFlight` invoking `map.stop()` unconditionally on every pointerdown/mousedown capture event. Guarded `cancelProgrammaticFlight` and pointer listeners so `map.stop()` is only invoked when `CameraStateMachine.getMode() === 'flyto'`. Converted pointer event listeners on canvas container to non-capturing `{ passive: true }`.
    3. MapLibre's internal drag pan kinetic deceleration passing `{ noMoveStart: true }` into `map.easeTo` (wrapped by `safeEaseTo`), which previously triggered `cancelProgrammaticFlight` and locked the FSM into `'flyto'`. Added `isInternalInertia` guard (`options.noMoveStart || mapInstance.isDragging()`) to pass inertial deceleration directly to native `easeTo` without disrupting the camera state machine.
  - Verified 100% smooth drag pan without sticking or stuttering across both 0° pitch and 45° 3D terrain pitch via automated CDP test suite (`scripts/test_drag_pan.js`).
- **Top Actions Bar Replay Button Label (`web/map.html`, `web/map_embed.html`):**
  - Renamed top floating replay button from `7D Replay` to `Flow Replay` with updated tooltip `Historical Flow Replay (7-Day & 30-Day)` and aria-label `Toggle Historical Flow Replay`, accurately reflecting both available 7-day and 30-day temporal horizons. Verified in live browser.
- **Data Sources Modal Mini Scrollbar & Overflow Elimination (`web/index.html`):**
  - Diagnosed double vertical scrollbar artifact in the "Data Sources and Research Notebooks" modal (`#api-modal`). The Jump To anchor bar had `overflow-x-auto` without `overflow-y-hidden`, causing browsers to compute `overflow-y: auto` and sprout an 8px vertical scrollbar thumb immediately above the modal body's main scrollbar.
  - Converted the Jump To navigation bar to `flex flex-wrap items-center gap-2 px-6 py-2.5 border-b border-stone-200 bg-stone-50 text-[11px] font-semibold text-stone-700`, removing unnecessary overflow constraints.
  - Added `overflow-y-hidden` to the data sources table wrapper, python code snippet box, overview storyboard navigation, and reservoir heatmaps to permanently prevent unwanted mini scrollbars across all viewports (verified at 1440px, 1024px, and 800px).
  - Verified via native Chrome DevTools Protocol (`scripts/check_modal_overflow.js`, `verified_data_sources_modal.png`, `verified_modal_no_mini_scrollbar.png`).
- **Confluence Mass Balance Mathematical Closure (`web/app.js`):**
  - Resolved the arithmetic discrepancy where `Upstream Mainstem + Inflow != Reach Discharge` in confluence popup cards (e.g. Marble Canyon 5,169 cfs + Little Colorado 111 cfs displayed with `= Reach Discharge: 7,900 cfs`).
  - Added an intermediate accounting row bridging the confluence junction to the downstream reach control gage:
    - Positive delta ($\Delta Q > 0$): `+ Additional Inflow to Downstream Gage:` (capturing ungaged lateral tributaries, springs, groundwater accretion, and diurnal hydropeaking wave transit lag).
    - Negative delta ($\Delta Q < 0$): `- Diversions & Losses to Downstream Gage:` (capturing canal diversions, irrigation withdraws, channel seepage, and evaporation).
  - Explicitly tagged the downstream control gage name on the total line (e.g. `= Reach Discharge (Phantom Ranch): 7,130 cfs`).
  - Ensured complete mathematical closure: $\text{Upstream} + \text{Inflow} + \Delta Q \equiv \text{Reach Discharge}$ across all 18 basin confluences.
  - Verified via native Chrome DevTools Protocol automation across `grand_canyon_upper` and `colorado_stateline_cisco` (`verified_grand_canyon_upper_confluence_math.png`, `verified_gunnison_confluence_math.png`, `verified_map_embed_confluence_math.png`).
- **Basin-Wide River Network Topology Snapping (Zero-Gap Verification):**
  - Audited and topologically snapped all 83 reaches in `web/data/river_network.geojson` and `web/data/river_network.json` against the user's conceptual diagram (confluence nodes, submerged reservoir thalwegs, and dam flow breaks).
  - Snapped the remaining 7 micro-gaps: Virgin River to Lake Mead submerged thalweg (0.33m $\rightarrow$ 0.00m), Dirty Devil River to Cataract Canyon (0.37m $\rightarrow$ 0.00m), Havasu Creek to Grand Canyon (0.17m $\rightarrow$ 0.00m), Gila River to Gila Lower at Painted Rock Dam (32.28m $\rightarrow$ 0.00m), Gila Lower to Lower Basin Taper at Dome (0.14m $\rightarrow$ 0.00m), Salt River Headwaters to Salt Cascade at Roosevelt Dam (11.36m $\rightarrow$ 0.00m), and San Pedro River to Gila River at Winkelman (5.99m $\rightarrow$ 0.00m).
  - Verified 100% topological continuity: 55/55 tributaries, 21/21 mainstem reaches, and 7/7 submerged reservoir centerlines now connect with 0.00m gaps.
  - Verified downstream flow growth at all confluences ($Q_{\text{combined}} = Q_{\text{upstream}} + Q_{\text{tributary}}$) with $\sqrt{Q}$ line weight scaling, submerged reservoir thalweg rendering, and dam flow breaks decoupling pool inflows from tailwater releases. Verified visually with headless Chrome screenshots.

### Documented
- **Operational Hydrology Knowledge Base (`SYSTEM_GUIDE.md` Section 5.F & 5.G):** Codified permanent domain reference records for dam release hydrodynamics and flood routing to ensure operational insights persist across sessions:
  - *Diurnal Hydropeaking Wave (Section 5.F):* Documented WAPA electrical peaking grid economics (Glen Canyon 1,320 MW, Hoover 2,080 MW), wholesale spot price cycling (12–8 PM peaks vs 1–5 AM troughs), 1996 ROD and 2016 LTEMP legal ramp rate constraints (4,000 cfs/hr up-ramp, 1,500 cfs/hr down-ramp, 5k–8k cfs daily fluctuation band), kinematic wave dispersion rounding hydrographs into sine waves, downstream re-regulation (Glen Canyon free-flowing Grand Canyon wave taking 36–48h to attenuate to Mead vs Hoover power waves re-regulated by Davis and Parker dams), and summer weekend "Bug Flows."
  - *Flood Pulse Routing & Reservoir Buffering (Section 5.G):* Documented reservoir slackwater absorption physics (e.g. Nov 3 San Juan River 32,900 cfs spike swallowed by Lake Powell with zero response at Lees Ferry) and geomorphic/elevation decoupling (why Gila River floods at Dome/Yuma at 120 ft MSL are physically hundreds of miles below and thousands of feet lower than Lakes Mead and Powell).
- **The Law of the River, Landmark Decrees & Statutory Compact History (`SYSTEM_GUIDE.md` Section 6, `web/law.html`):** Codified comprehensive statutory and constitutional legal doctrines into the master system architecture and synchronized the standalone web Law viewer:
  - *1849 Mining Customs & Prior Appropriation (Section 6.A):* Traced the common law origins from California placer camps ("First in Time, First in Right") and documented the statutory "Use It or Lose It" forfeiture trap creating perverse disincentives for agricultural conservation.
  - *Wyoming v. Colorado (1922) Catalyst (Section 6.B):* Documented the pivotal Supreme Court decision establishing interstate prior appropriation across state borders, creating the existential legal pressure that forced the Upper Basin to demand the 1922 Compact.
  - *The 1922 Colorado River Compact (Section 6.C):* Articulated the statutory split at Lee's Ferry, Articles III(a) and III(b) allocations, Article III(c) Mexican burden, Article III(d) 10-year rolling 75 MAF delivery mandate, and the 17.5 MAF pluvial paper water overestimate vs. 12.4 MAF wet water reality.
  - *Winters v. United States (1908) & Tribal Water Rights (Section 6.D):* Documented implied federal tribal reservations, the dismissal of Indian rights in Compact Article VII, and modern realities where 30 Basin tribes hold recognized rights to ~3.2 MAF/yr (>25% of basin flow).
  - *Boulder Canyon Act (1928), Mexican Treaty (1944) & 1948 Upper Basin Compact (Section 6.E):* Detailed Hoover Dam authorization, Mexican 1.5 MAF delivery and Salinity Minutes (242, 319, 323), the Upper Basin's durable percentage apportionment model (CO 51.75%, UT 23%, WY 14%, NM 11.25%), and the 1956 CRSP Act (cash-register storage at Glen Canyon, Flaming Gorge, Navajo, Blue Mesa).
  - *Arizona v. California (1963 / 1964 Decree) (Section 6.F):* Documented the mainstream-only apportionment doctrine, Gila River tributary exclusion, California's 1901 Present Perfected Rights (IID ~3.1 MAF senior priority), the Secretary of the Interior's role as sole Lower Basin Water Master, and the Practicably Irrigable Acreage (PIA) standard for tribal quantification.
  - *Central Arizona Project Subordination Compromise (Section 6.G):* Documented the 1968 Colorado River Basin Project Act deal subordinating CAP canal deliveries to California's 4.4 MAF allocation during shortage declarations.
  - *Modern Drought Frameworks & Post-2026 Cliff (Section 6.H):* Documented the 2007 Interim Guidelines, 2019 Drought Contingency Plans, Lower Basin evaporation debiting (~1.5 MAF), and the urgent requirement for 2.0 to 4.0 MAF permanent structural reductions.

---

## [2.2.0] - 2026-11-15
### Added
- **10-Minute Presentation Storyboard Deck:** Redesigned the primary Overview tab into four presentation-ready acts with a sticky storyboard navigation bar and active scroll-spy:
  - **Act 1 (0:00–2:00): The Math Gap:** 17.5 MAF paper rights vs. 12.4 MAF physical flow vs. 1.8 MAF system losses (-5.1 MAF annual overdraft).
  - **Act 2 (2:00–4:30): The Physical Seasonal Engine:** Interactive toggle between 5 normalized river pulses and the physical supply-demand mismatch (96 surplus days vs. 269 deficit days).
  - **Act 3 (4:30–7:00): Buffer Exhaustion:** 90-year multi-reservoir storage drawdown (1935–2026) showing total storage decline from 56.2 MAF (94% in 1984) to ~17.7 MAF (29.5%) today.
  - **Act 4 (7:00–9:30): Consumptive Use & The Mining Law Paradox:** 80% ag allocation breakdown, All-American Canal / CAP / CRA conveyance infrastructure, and the Prior Appropriation legal trap.
- **The Mining Law Paradox ("Use It or Lose It"):** Integrated historical legal analysis of 1849 California gold rush customs, the statutory forfeiture trap penalizing conservation, and downstream California seniority (Imperial Valley 1901 rights) forcing junior upstream Arizona cities to take mandatory cuts first under the 1968 Basin Project Act.
- **Automated Network Reach QA Pipeline:** Developed `src/audit_river_network.py` and `qa_reach_audit.csv` validating all 40+ reaches, topological node snapping, and physical USGS/USBR gage assignments.

### Changed
- **Site-Wide Color System Overhaul:** Formulated and implemented `color_system_plan.md` using ColorBrewer and Okabe-Ito colorblind-safe palettes across the Map, Water Budget Sankey, River Transit Pipeline, Reservoir Timeline, and ML Analysis.
- **Reservoir Heatmap Standardization:** Aligned Lake Mead and Lake Powell monthly elevation heatmaps to a consistent ColorBrewer `RdYlBu` palette with standardized year-month grid axes.

---

## [2.1.0] - 2026-11-14
### Added
- **Prominent High-Contrast UI Controls:** Added SVG expand and collapse chevrons to map legend and sidebar cards.
- **Interactive Tooltip Cards:** Redesigned all Chart.js and D3.js hover tooltips as editorial cards with bold metrics, units, and authoritative source citations.

### Changed
- **Civil Engineering Precision Alignment:** Re-anchored Hoover Dam point to the Arizona crest abutment to resolve visual overlap with the USGS tailwater gage. Precision-aligned Imperial, Headgate Rock, Palo Verde, Navajo, and Roosevelt dams onto satellite footprints.
- **Editorial Typography & Tone:** Replaced monospaced body fonts with editorial Inter and tabular-nums. Calibrated commentary from sensationalist phrasing to grounded academic water policy and resource economics.
- **Interface Palette:** Standardized top navigation bar, sidebar links, and action buttons to a calm blue-gray slate theme (`#0f172a`, `#64748b`).

---

## [2.0.0] - 2026-11-13
### Added
- **Single-Screen Gapminder ML Dashboard:** Complete redesign of the ML Tributaries page into a single-screen analytical suite featuring K-Means clustering, 100-year Compact cumulative surplus/deficit, and 365-day seasonal mismatch hydrographs.
- **3-Tier Hydrologic Telemetry Integrity:** Automated mass-balance validation, Lower Basin dam release cross-checks, and USBR hourly teletype ingestion.
- **3D Keyboard Flight Controller:** 60 FPS smooth flight camera controller for MapLibre GL with WASD/arrow pitch, roll, and altitude navigation.

### Changed
- **Strict Node-Only Topology:** Dissolved artificial mid-reach splits and enforced strict confluence-to-confluence reach boundaries across the entire river network.
- **Okabe-Ito Palette Adoption:** Standardized chart styling to Edward Tufte minimalist aesthetics and colorblind-safe color schemes.

---

## [1.9.0] - 2026-11-10
### Changed
- **Repository State Sync & Verification:** Synchronized working tree, verified notebook execution environments, and confirmed clean local server execution.

---

## [1.8.0] - 2026-11-08
### Fixed
- **Sentinel Station Lake Powell Audit:** Audited tributary station selections for Lake Powell inflow share. Corrected artificial reach splits at mid-reach gaging stations (Paria River) to preserve continuous downstream discharge.

---

## [1.7.0] - 2026-11-07
### Fixed
- **Network Topology Restructuring:** Reconnected fragmented river reaches along the Dolores, Gunnison, and Green rivers. Fixed mid-reach flow drop anomalies where tributary inflows were severed from downstream segments.

---

## [1.6.0] - 2026-11-06
### Added
- **Machine Learning Regime Prototyping:** Structured `notebooks/03_tributary_ml_analysis.ipynb`. Applied K-Means clustering ($k=4$) to USGS daily flow signatures (snowmelt, monsoons, dam releases).

---

## [1.5.0] - 2026-11-01
### Added
- **Dedicated Gage Telemetry Registry:** Added a sortable, searchable telemetry registry tab with hydrologic reach grouping and station-level deep-linking.
- **Interactive Canal & Diversion Highlighting:** Luminous selection styling for the All-American Canal, Central Arizona Project, and Colorado River Aqueduct.
- **Unified Slide-Out Drawer Architecture:** Synchronized slide-out behavior between the Basin Metrics drawer and Map Layer controls to prevent screen collisions.

### Changed
- **Decoupled Sankey from Transit Schematic:** Separated the macro annual water budget (Sankey diagram) from the physical river routing (Transit Schematic), eliminating terminology confusion.

---

## [1.4.0] - 2026-10-18
### Changed
- **Dimensional Metric Rigor & Anti-SaaS Cleanup:** Enforced strict separation between instantaneous discharge rates ($Q$ in cfs) and annualized cumulative volumes ($V$ in MAF/yr). Purged all SaaS vanity status badges and pulsing dots.

---

## [1.3.0] - 2026-10-17
### Added
- **Dynamic Reservoir Shorelines:** Replaced static bounding polygon approximations with dynamic reservoir waterbody polygons. Fixed Glen Canyon Dam river gap and smoothed Lake Mead geometry.
- **San Juan River Confluence Split:** Split reach at Animas confluence; unified dual popups into clean single-pane cards.

---

## [1.2.0] - 2026-10-16
### Added
- **Mobile Drawer Architecture:** Converted sidebar cards into smooth sliding drawers for mobile viewports (390px/900px).
- **Gyroscope Widget Centering:** Perfected subpixel centering of the 3D compass navigation dial with bold Inter 900 typography.

---

## [1.1.0] - 2026-10-15
### Added
- **Flow-Proportional SVG Transit Schematic:** Dynamic stroke scaling where river reaches thicken at confluences and narrow at major diversions.
- **5-Chapter Law of the River Reference:** Comprehensive legal reference covering the 1922 Compact, 1928 Boulder Canyon Project Act, 1944 Mexico Treaty, 1963 Arizona v. California, and modern Interim Guidelines.
- **Live USBR & USGS Ingestion Pipeline:** Automated pipeline pulling streamflow from USGS NWIS, reservoir storage from USBR HydroData, and trans-mountain diversions from CDWR HydroBase.

---

## [1.0.0] - 2026-10-13
### Added
- **3D GIS Navigation & Compass Controls:** Gyroscope dial and trackball camera controls for 3D map exploration.
- **Front Range Terminal Reservoirs:** Added Denver Water storage reservoirs (Dillon, Gross, Elevenmile) to telemetry monitoring.
- **Subway Transit Schematic:** Initial transit-style water budget diagram with CAP, CRA, and All-American Canal.

---

## [0.2.0] - 2026-09-29
### Added
- **Screen-Space Collision Avoidance:** 2D screen-space label relaxation engine preventing marker overlap in dense reaches.
- **7-Reservoir Storage Expansion:** Added Lake Mead, Lake Powell, Flaming Gorge, Navajo, Mohave, Blue Mesa, and Havasu.
- **Invisible Reach Hit Buffers:** 24px interactive hit buffers across all river reaches.

---

## [0.1.0] - 2026-09-27
### Added
- **Initial Project Scoping & Sentinel Stations:** Established prototype data pipeline for four sentinel streamflow gages (Dotsero, Cameo, Cisco, Lees Ferry) and four Front Range trans-mountain tunnels (Adams, Moffat, Roberts, Boustead).
- **Core GIS Vector Basemap:** Leaflet/MapLibre map with USGS NHD flowlines, Continental Divide boundary, and initial reservoir footprints.
