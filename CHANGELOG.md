# Changelog

All notable changes to the Colorado River Basin Hydrologic Intelligence & Infrastructure Topology Platform will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project adheres to semantic academic versioning organized by granular work days.

---

## [2.3.5] - 2026-11-22
### Added (Lake Mead SNWA Intake No. 3 / "Third Straw" Reference Line)
- **Las Vegas Deep Intake Threshold & Benchmark Card ([web/index.html](file:///Users/macstudio/Documents/Antigravity/CO_River/web/index.html)):**
  - Added left-aligned `position: 'start'` pill placement support in `horizontalThresholdPlugin` (`line 2504`), added `{ value: 860.0, label: 'SNWA Intake No. 3 ("Third Straw")', color: '#6d28d9', dash: [3, 3], position: 'start' }` to `renderMeadHistoricalCharts()`, and extended the Lake Mead elevation chart y-axis floor from `880` to `830` ft (`860 ft` sits cleanly above the x-axis and separated horizontally from `Dead Pool (895 ft)`).
  - Expanded Lake Mead's operational benchmark strip from 4 to 5 cards (`grid-cols-2 sm:grid-cols-5`) to include **SNWA Intake No. 3 (`860.0 ft` — Las Vegas "Third Straw" (L3PS))**.
  - Verified via headless Chrome CDP (`1360×860`, `0` runtime exceptions): `y.min === 830`, `5` threshold lines active, `860.0 ft` pill renders cleanly on the left above the x-axis alongside all 5 benchmark cards (`verified_mead_third_straw_line.png`).

### Changed (Sidebar Brand Metadata Line Cleanup)
- **3-Line Sidebar Attribution Formatting ([web/index.html](file:///Users/macstudio/Documents/Antigravity/CO_River/web/index.html#L209-L216)):**
  - Unified `#sidebar-brand-header` attribution lines below `COLORADO RIVER BASIN` into three even `11px` regular-weight (`font-normal`, `text-stone-600`) single-line rows (`Douglas Schoch`, `Colorado Mountain College`, `DAT1001 • Fall 2026`), eliminating the awkward wrap that left a trailing bullet after `DAT1001 •`.
  - Verified via headless Chrome CDP (`1280×800`, `0` runtime exceptions): all 3 metadata rows measure `15px` height (`lineHeight: 15px`, `wrapped: false`, `verified_sidebar_brand_clean.png`).

### Added (System Map Standard Editorial Header)
- **Unified System Map Header Strip ([web/index.html](file:///Users/macstudio/Documents/Antigravity/CO_River/web/index.html)):**
  - Wrapped `#section-map` contents in a flex column container and added a warm sandstone editorial `<header>` (`bg-[#f5f2eb] border-b border-stone-300 px-4 md:px-6 py-2.5`) titled `System Map` matching `#academic-top-header` (`Basin Overview`) and every peer view, while keeping `#iframe-map` cleanly sized below (`flex-1 min-h-0`) and bumped to `./map_embed.html?v=20261122i`.
  - Verified via headless Chrome CDP (`1360×860`, `0` runtime exceptions): `System Map` header renders at `49px` height with `rgb(245, 242, 235)` (`#f5f2eb`) fill, `#iframe-map` sits directly below (`top: 49`, `height: 811`, `scrollH: 860 <= winH: 860`), and bottom `Gages & Monitoring Facilities` bar and compass controls remain completely unclipped (`verified_system_map_header.png`).

### Fixed (Chart Tick & SVG Label Overlap Remediation)
- **Tributaries X-Axis Tick & Bubble Pill De-Overlap ([web/ml_analysis.html](file:///Users/macstudio/Documents/Antigravity/CO_River/web/ml_analysis.html)):**
  - Replaced parenthetical Card 1 x-axis tick labels (`0.00 (Steady Dam)`, `0.40 (Snowmelt)`, `0.80 (Desert Flash)`) that collided with adjacent ticks on compact laptop screens with uniform 2-decimal ticks (`0.00`–`1.00`, `stepSize: 0.2`).
  - Upgraded `card1BubbleLabelsPlugin` to clamp candidate label pills inside `chartArea` bounds and run an iterative vertical de-overlap pass across placed label boxes so closely clustered bubbles (`Dirty Devil` / `Escalante`, `Flaming Gorge` / `Gunnison`) never overlap at narrow viewports.
- **Sankey Thin-Node Column Label De-Overlap ([web/sankey.html](file:///Users/macstudio/Documents/Antigravity/CO_River/web/sankey.html)):**
  - Added a per-column vertical spacing pass inside `renderSankey()` sorting node text groups top-to-bottom by `d.y0` and nudging any label whose bounding box sits within `3px` of the label above it, separating `Front Range Municipal Tunnels (CO)` (`0.48 MAF/yr`) and `Wasatch Front Municipal Tunnels (UT / CUP)` (`0.12 MAF/yr`).
  - Verified via headless Chrome CDP (`0` runtime exceptions; `0` Chart.js x-tick or label-box collisions on `ml_analysis.html` at both `860×680` and `1360×860` and `index.html?tab=overview`/`reservoirs` at `1120×720`; `0` SVG `<text>` overlaps or viewBox clips on `sankey.html` and `pipeline.html` at `1024×740`; visual confirmation in `verified_ml_zero_overlaps_compact.png` and `verified_sankey_zero_overlaps.png`).

### Removed (Excessive UI Instruction & Hover-Hint Copy)
- **Trimmed Redundant Instructional Microcopy ([web/ml_analysis.html](file:///Users/macstudio/Documents/Antigravity/CO_River/web/ml_analysis.html), [web/index.html](file:///Users/macstudio/Documents/Antigravity/CO_River/web/index.html), [web/sankey.html](file:///Users/macstudio/Documents/Antigravity/CO_River/web/sankey.html), [web/pipeline.html](file:///Users/macstudio/Documents/Antigravity/CO_River/web/pipeline.html)):**
  - Deleted `• Click lines/bubbles to compare (Shift-click for category)` from the Tributaries & Deficit header (`web/ml_analysis.html`).
  - Deleted `Hover any cell to inspect exact monthly elevation` from both the Lake Mead and Lake Powell elevation heatmap matrix footers (`web/index.html`).
  - Trimmed `Hover any band for details.` from the Physical Runoff vs. Paper Allocations subtitle (`web/sankey.html`).
  - Removed `Click any feature to inspect live operational data ↗` from the Flow Schematic SVG Legend and tightened its background rectangle height from `182px` to `164px` (`web/pipeline.html`).
  - Verified zero remaining occurrences across target files and `0` runtime exceptions in headless Chrome CDP (`verified_ml_no_hint_slop.png`, `#legend-box` height `164`).

### Changed (Warm Sandstone UI Chrome Unification)
- **Harmonized Remaining Cool-Gray UI Chrome to Warm Sandstone ([web/pipeline.html](file:///Users/macstudio/Documents/Antigravity/CO_River/web/pipeline.html), [web/telemetry.html](file:///Users/macstudio/Documents/Antigravity/CO_River/web/telemetry.html), [web/index.html](file:///Users/macstudio/Documents/Antigravity/CO_River/web/index.html), [web/data_sources.html](file:///Users/macstudio/Documents/Antigravity/CO_River/web/data_sources.html), [web/law.html](file:///Users/macstudio/Documents/Antigravity/CO_River/web/law.html), [web/methodology.html](file:///Users/macstudio/Documents/Antigravity/CO_River/web/methodology.html), [web/editorial.css](file:///Users/macstudio/Documents/Antigravity/CO_River/web/editorial.css)):**
  - Replaced cool blue-gray (`slate-*`, `#e2e8f0`, `#f1f5f9`, `#cbd5e1`, `#f8fafc`) segmented sub-tab bars, toolbars, category pills, borders, table headers, headers/footers, and code/quote boxes with warm `stone-*` and sandstone (`#ebe4d6`, `#f5f2eb`, `#f7f4ee`, `#cfc8ba`, `#dfd9ce`, `#ede8df`) tokens matching [web/sankey.html](file:///Users/macstudio/Documents/Antigravity/CO_River/web/sankey.html) and the warm parchment canvas (`#f4f1ea`), while preserving semantic data/heatmap band colors in `web/index.html`.
  - Updated JS class toggles in `switchPipelineSubtab()` (`web/pipeline.html`), `setCategoryFilter()` (`web/telemetry.html`), and `updateActiveActButton()` (`web/index.html`) so interactive state switches remain warm stone.
  - Verified via headless Chrome CDP (`0` runtime exceptions; `pipeline.html` tab container computed `rgba(231, 229, 228, 0.9)` warm stone and stayed `stone-*` on click; `telemetry.html` toolbar/pills warm stone; `data_sources.html` header/footer `#ebe4d6` / `rgb(235, 228, 214)`; `index.html?tab=law` `0` cool slate badges; visually confirmed in `verified_pipeline_warm_tabs.png` and `verified_telemetry_warm_toolbar.png`).

### Fixed (Site-Wide External Link Audit & 404 Remediation)
- **Replaced 13 Dead / Retired / Replaced External URLs Across Frontend & Pipeline ([web/index.html](file:///Users/macstudio/Documents/Antigravity/CO_River/web/index.html), [web/law.html](file:///Users/macstudio/Documents/Antigravity/CO_River/web/law.html), [web/data_sources.html](file:///Users/macstudio/Documents/Antigravity/CO_River/web/data_sources.html), [web/sankey.html](file:///Users/macstudio/Documents/Antigravity/CO_River/web/sankey.html), [web/pipeline.html](file:///Users/macstudio/Documents/Antigravity/CO_River/web/pipeline.html), [web/telemetry.html](file:///Users/macstudio/Documents/Antigravity/CO_River/web/telemetry.html), [web/map.html](file:///Users/macstudio/Documents/Antigravity/CO_River/web/map.html), [web/map_embed.html](file:///Users/macstudio/Documents/Antigravity/CO_River/web/map_embed.html), [web/app.js](file:///Users/macstudio/Documents/Antigravity/CO_River/web/app.js), [web/test_proposal1.html](file:///Users/macstudio/Documents/Antigravity/CO_River/web/test_proposal1.html), [src/fetch_water_data.py](file:///Users/macstudio/Documents/Antigravity/CO_River/src/fetch_water_data.py)):**
  - Audited all `113` unique external URLs (`29` files in `web/`, excluding the AI prompt archive) plus local `href` links (`0` broken local routes): identified `10` HTTP `404` URLs, `2` retired USDA `/wps/portal/` timeouts, and `1` replaced USBR feed (`hourly.html` notice pointing to `/riverops/hourly7.html`).
  - Replaced `usbr.gov/lc/region/g4000/lawofrvr.html` → `usbr.gov/lc/region/pao/lawofrvr.html`; `usbr.gov/lc/region/pao/laws-regs/synopses/crc.html` → `usbr.gov/lc/region/g1000/pdfiles/crcompct.pdf`; `usbr.gov/uc/envproc/culr/` → `usbr.gov/uc/water/crsp/studies/`; `usbr.gov/lc/region/g4000/hourly/{hourly,havasu-elv,mohave-elv}.html` → `riverops/hourly7.html` & `hourly/levels.html` (preserving the active teletype table parser on line `113` of `src/fetch_water_data.py` and the Python snippet in `web/map.html`); `usbr.gov/uc/rm/crsp/gunnison/` → `usbr.gov/uc/water/hydrodata/reservoir_data/913/dashboard.html`; `waterservices.usgs.gov/rest/{IV,DV}-Service.html` → `/docs/instantaneous-values/instantaneous-values-details/` & `/docs/dv-service/daily-values-service-details/`; `northernwater.org/.../c-bt-project` → `colorado-big-thompson-project`; `srpnet.com/water-irrigation/water-operations` → `grid-water-management/water-management/where-water-from`; and retired `nrcs.usda.gov/wps/portal/...` links → `wcc.sc.egov.usda.gov/` & `wcc.sc.egov.usda.gov/awdbRestApi/swagger-ui/index.html`.
  - Bumped `app.js?v=20261122i` in `web/map.html` and `web/map_embed.html`; updated `scripts/apply_symmetric_ag_muni_sankey.js` and `scripts/update_sankey_meta.js` so regenerated Sankey metadata keeps live URLs.
  - Verified via live paced HTTP sweep: `12/12` unique replacement URLs return `HTTP 200` and `0` `404` responses remain across all `87` swept content/portal URLs in `web/`.

### Added (Argon → Flash Cross-Reference Tagging in AI Dialogue Archive)
- **Bidirectional Argon → Flash Prompt Matching & Filter ([scripts/compile_full_ai_transcript.py](file:///Users/macstudio/Documents/Antigravity/CO_River/scripts/compile_full_ai_transcript.py), [web/ai_complete_prompt_archive.html](file:///Users/macstudio/Documents/Antigravity/CO_River/web/ai_complete_prompt_archive.html)):**
  - Added 6-word normalized shingle matching (`_norm_shingles()`, `>= 25` overlapping shingles and `>= 15%` prompt coverage) across all compiled Antigravity prompts and the 84 extracted turns in the 10 undated Gemini Web PDFs (`mockups/gemini_sessions/*.pdf`), accurately matching `25` Argon-authored meta-prompts without synthesizing artificial timestamps.
  - Added clickable `.badge-argon` pills (`Argon → Flash • #idx (PDF Title)`) on matched Antigravity prompt cards and reciprocal `.badge-argon-used` (`Used in Flash: #idx`) jump links on the originating Gemini PDF turn cards via `jumpToTurn()`, plus an `ARGON_TO_FLASH` option (`Argon → Flash Prompts (25 Matched)`) in `#sessionFilter` and total match count in `.audit-meta-line`.
  - Verified via headless Chrome CDP against `http://localhost:8088/ai_complete_prompt_archive.html` (`0` runtime exceptions; selecting `ARGON_TO_FLASH` filters to `25` matching cards all bearing `.badge-argon`, and clicking `#turn-674`'s badge resets the filter to `ALL` and jumps cleanly to Gemini Web card `#turn-722` bearing `.badge-argon-used`, captured in `verified_archive_argon_flash_tags.png`).

### Changed (Hover Tooltip Tightening & Viewport Clamping)
- **Pipeline Hover Cards & Viewport Edge Clamping ([web/pipeline.html](file:///Users/macstudio/Documents/Antigravity/CO_River/web/pipeline.html)):**
  - Constrained `#flow-tooltip` with `width: max-content; max-width: min(300px, calc(100vw - 24px)); box-sizing: border-box; overflow-wrap: break-word; padding: 9px 11px;` and updated `updateTooltipPos(e)` to clamp against `tooltip.offsetWidth` / `offsetHeight` so cards on right-hand elements never clip past the viewport edge.
  - Replaced narrative comparison-card prose and duplicated `Dead Pool` / `Tier 1` footnotes inside `renderComparisonCard()` (`flowComparisonBox`, `combinedInflowBox`, `canalComparisonBox`, `tunnelComparisonBox`, `reservoirStorageBox`) with two compact tabular rows (`Active Storage`, `Pool Elevation`), tightened all schematic hover entries in `setupTooltips()` to two concise spec lines, and compacted Elevation Profile marker notes and `showElevationTooltip()` padding.
- **Sankey, Stacked Bar & Overview Tooltip Tightening ([web/sankey.html](file:///Users/macstudio/Documents/Antigravity/CO_River/web/sankey.html), [web/index.html](file:///Users/macstudio/Documents/Antigravity/CO_River/web/index.html)):**
  - Bounded `#sankey-tooltip` and `#stacked-tooltip` CSS (`max-width: min(300px, calc(100vw - 24px)); box-sizing: border-box;`), added symmetric viewport clamping in `updateTooltip()` and `positionStackedTooltip()`, removed redundant `${sourceName} → ${targetName}` and `Water Budget Accounting • 1 MAF/yr ≈ 1,381 cfs` lines from `formatSankeyLinkCard()`, and condensed all 85 `NODE_META` `summary` strings and all 19 `inspectStackedSegment()` `desc` strings to `<= 75` characters.
  - Shortened Overview Card 2 (`renderSeasonalEngineChart()`) `afterBody` balance summary and Card 4 (`initOverviewCharts()`) `Consumptive Use` label in `web/index.html`.
  - Verified via headless Chrome CDP against `http://localhost:8088` (`0` runtime JS errors; `#dam-hoover` `#flow-tooltip` rendered at `300x199px`, `scrollWidth <= clientWidth`, `rectRight: 933 <= 1280`; `#dam-glencanyon` `offsetHeight: 199px`; `#sankey-tooltip` `offsetHeight: 138px`, `rectRight: 950 <= 1280`; `#stacked-tooltip` `offsetHeight: 120px`; visual inspection of `verified_pipeline_hoover_tooltip_tight.png` and `verified_sankey_tooltip_tight.png`).

### Changed (Tributaries & Deficit Direct Click Filtering)
- **Removed Header Regime Filter Buttons & Added Direct Multi-Line / Category Selection (`web/ml_analysis.html`):**
  - Removed the 4 top filter buttons (`All Rivers`, `Snowmelt Rivers`, `Dam-Controlled`, `Desert Flash-Flood`) that only scoped the top two charts, replacing them with a subtle clickable inline regime key (`Snowmelt`, `Dam-Regulated`, `Desert Flash` + contextual `Reset` link).
  - Replaced single-river selection with multi-select `selectedRiverIds` (`Set`), polyline segment hit-testing (`findHitRiverOnChart()` + `pointToSegmentDistance()`), and on-canvas label box hit-testing (`chart._labelBoxes`) across Card 1 (`Tributary Flashiness vs. Volume`) and Card 2 (`Travel Time to Lake Powell`): clicking lines, bubbles, or label pills toggles multiple rivers simultaneously, clicking any regime dot (or Shift-clicking any line/bubble) selects its full category, and clicking empty chart background clears the filter.
  - Unified hover tooltips on both Card 1 and Card 2 via `formatRiverHoverLines()` + `pointHitRadius: 24` so hovering any bubble or any section of a travel curve displays USGS station ID, regime, annual inflow (`MAF/yr` & `%` Powell share), RBI flashiness, and travel lag/river miles; verified via real mouse events in headless Chrome CDP (`oldButtonsCount: 0`, multi-select `["san_juan_bluff","cameo"]`, snowmelt category `["cameo","yampa"]`, `verified_tributaries_direct_click.png`).

### Fixed
- **Fullscreen Sidebar Preservation & Removal of Floating Exit Button (`web/index.html`):**
  - Removed the `body.workspace-fullscreen .sidebar-academic { display: none !important; }` override and deleted `#btn-exit-fullscreen-floating` so entering fullscreen keeps the left navigation sidebar (`256px`) accessible at all times and never overlays a floating button on top of `Basin Overview` or view headers.
  - Kept `syncFullscreenUI()` and `toggleFullScreen()` updating `#btn-fullscreen` cleanly between `Fullscreen` and `Exit Fullscreen` alongside native `requestFullscreen()` / `webkitRequestFullscreen()` and `Escape` key handling; verified via headless Chrome CDP (`sidebarWidth: 256`, `floatingBtnExists: false`, `fullscreenLabel: 'Exit Fullscreen'`, `verified_fullscreen_sidebar_intact.png`).

### Added
- **Shoshone Hydroelectric Plant Senior Water Rights (`1,250 cfs` 1902 Call) & USGS `#09070500` Integration (`src/fetch_water_data.py`, `web/data/station_hierarchy.json`, `web/data/river_network.json`, `web/telemetry.html`, `web/app.js`, `web/pipeline.html`, `web/index.html`, `scripts/build_unified_notebook.py`):**
  - Attributed **USGS `#09070500` (`Colorado River near Dotsero, CO`)** across `fetch_water_data.py` (`reach_audit_configs`), `station_hierarchy.json`, `river_network.json` / `river_network.geojson` / `build_pristine_network.py`, and `web/telemetry.html` (`Administers 1902 Shoshone Hydroelectric Plant call (1,250 cfs senior / 1,408 cfs total non-consumptive right) at Glenwood Canyon entrance`, plus `09085100` below Shoshone tailrace & Roaring Fork).
  - Added a `1902 Shoshone Call (1,250 cfs)` badge and explanatory water-right callout to `formatGaugePopup()` (`web/app.js?v=20261122h`) and updated the Elevation Profile / Flow Schematic tooltips in `web/pipeline.html`.
  - Documented the 1902 Shoshone Call (`1,250 cfs` senior / `1,408 cfs` total, predating Moffat 1921, Adams/C-BT 1935, and Roberts 1946 tunnels, supporting Cameo & the 15-Mile Reach) in **Law of the River Chapter 2 (`#law-sec-ch2`)** in `web/index.html` and Section 3 of `notebooks/colorado_river_analysis.ipynb` (re-executed via `nbclient` & exported to `web/notebooks/colorado_river_analysis.html`).
  - Verified via headless Chrome CDP that searching `"Shoshone"` in `telemetry.html` matches `#09070500` & `#09085100`, `#law-sec-ch2` renders the Shoshone Call writeup, and `formatGaugePopup('09070500')` emits both badge and callout (`verified_shoshone_gage_telemetry.png`, `verified_shoshone_law_writeup.png`).
- **Reverse-Chronological Sort & Refresh Timestamp in AI Dialogue Archive (`scripts/compile_full_ai_transcript.py`, `web/ai_complete_prompt_archive.html`):**
  - Added a `#sortOrder` dropdown (`Sort: Newest First (Nov 22 → Sep 27)` default vs. `Sort: Chronological (#1 Sep 27 → Nov 22)`) and `applySortOrder()` so recent Session 8 turns appear at the top immediately on load while preserving Gemini Web PDF cards (`gemini-web-sessions`) and original `#1..#N` IDs; added live compilation timestamp to `.audit-meta-line`.

### Changed
- **Removed Hydrologically Invalid "Combined Min Power Limit (~6.0 MAF)" Line (`web/index.html`):**
  - Removed the `{ value: 6.0, customLabel: 'Combined Min Power Limit (~6.0 MAF)' }` threshold line from `renderMacroStorageTimeline()` and `initOverviewCharts()`, along with its corresponding summary stat blocks in `#view-res-timeline` and Overview Act 3 (`#act-3`, refactored to 3-column benchmark grids matching `17.6 MAF` / `29.3%` current storage). Power generation cutoffs depend on individual dam turbine-intake head (`950.0 ft` at Hoover / `3,490.0 ft` at Glen Canyon, already plotted on their individual elevation charts) rather than a summed system storage volume, and the `6.0 MAF` horizontal label overlapped the 2005–2026 Mead/Powell traces.
  - Verified via headless Chrome CDP on `?tab=reservoirs` and `?tab=overview` (`thresholdCount: 1`, `hasCombinedMinPowerText: false`, `verified_macro_timeline_no_min_power_overlap.png`, `verified_overview_no_min_power.png`).
- **Full Historical Reservoir Matrix & Timeline Refresh (`src/fetch_historical_portal_data.py`, `web/data/portal_historical.json`, `.github/workflows/update_data.yml`):**
  - Expanded `src/fetch_historical_portal_data.py` (zero third-party dependencies) to refresh Lake Mead monthly/live elevations (`mead-elv.html`, `levels.html`, USBR HydroData site `921`), Lake Powell water-year storage (`919/csv/17.csv`), Upper Basin monthly elevation matrices (`919` Powell, `917` Flaming Gorge, `920` Navajo, `913` Blue Mesa `49.csv` monthly means), Dillon (`CDWR DILRESCO`), `basin_storage_timeline[2026]` (`17.606 MAF` unified USBR `17.csv` + CDWR snapshot), and USGS Lee's Ferry daily discharge (`09380000` through `2026-11-21`).
  - Populated `2026 OCT` (`1038.85 ft`) and `2026 NOV` (`1041.41 ft`) on Lake Mead and `2026 NOV` (`3538.29 ft`) on Lake Powell, plus `NOV 2026` on Flaming Gorge, Navajo, Blue Mesa, and Dillon.
  - Added `python3 src/fetch_historical_portal_data.py` to `.github/workflows/update_data.yml` so historical reservoir heatmaps and timelines update automatically alongside real-time telemetry runs.
  - Verified via headless Chrome CDP that Lake Mead (`2026 OCT: 1038.8 ft`, `2026 NOV: 1041.4 ft`), Lake Powell (`2026 OCT: 3522.4 ft`, `2026 NOV: 3538.3 ft`), and the recompiled AI archive (`Sort: Newest First`, `Updated Nov 22, 2026`) render accurately (`verified_heatmap_mead_nov2026.png`, `verified_heatmap_powell_nov2026.png`, `verified_archive_sorted.png`).

---

## [2.3.4] - 2026-11-21
### Added
- **Dedicated Platform Architecture & Methodology Guide (`web/methodology.html`):**
  - Split computational and architectural documentation away from the legal authorities registry (`web/data_sources.html`) into a comprehensive, standalone engineering guide.
  - *Modern Zero-Framework Tech Stack:* Detailed rationale for 100% native Vanilla JavaScript (ES6+), MapLibre GL JS v4.7.1, D3.js v7, Chart.js v4, Tailwind CSS, Python 3, and SQLite—eliminating node runtimes, dependency drift, and bundler bloat in production.
  - *Serverless Strategy & GitHub Actions:* Comprehensive explanation of why the platform avoids 24/7 backend servers (eliminates sleeping dyno cold starts, server patching, DDoS vulnerabilities, and recurring hosting costs). Detailed the 2x daily automated CI/CD workflow (`.github/workflows/update_data.yml` at 06:00 & 18:00 UTC) that triggers headless Python scrapers, validates mass-balance invariants, refreshes SQLite tables, updates static JSON contracts, and redeploys to GitHub Pages CDN edges.
  - *Relational SQLite Basin Database:* Documented `data/colorado_river_basin.db` relational schema (`stations`, `reservoirs`, `annual_lees_ferry`, `rbi_flashiness`) and the 4 compiled static JSON contracts (`latest_metrics.json`, `river_network.json`, `station_hierarchy.json`, `seasonal_regimes.json`).
  - *Hybrid Real-Time Hydrology (Two-Tier Architecture):* Explained how real-time operational feeds remain live despite having no 24/7 server—Tier 1 browser executes direct client-side CORS fetch against USGS NWIS REST API (`waterservices.usgs.gov`), with Tier 2 graceful fallback to `web/data/latest_metrics.json` if offline or rate-limited.
  - *Organized Research Notebooks Workflow:* Structured and cross-linked all 5 Jupyter research notebooks (`01` through `04` + `colorado_river_capstone.ipynb`) with direct links to rendered HTML views (`web/notebooks/*.html`), `.ipynb` downloads, and Google Colab launch buttons.
- **Data Sources & Authorities Registry Refactor (`web/data_sources.html`, `web/index.html`):**
  - Pure legal and hydrologic authorities registry: Statutory compacts (1922, 1948, 1928 BCPA, 1944 Treaty), decree accounting, operational streamgage feeds, and facility dictionary.
  - Added dedicated high-visibility callout banners in `web/data_sources.html` and `#api-modal` linking directly to `methodology.html`.
  - Updated `web/index.html` sidebar: split single button into `Data Sources` (opens registry modal) and `Architecture & Methodology ↗` (direct link to `methodology.html`).
- **Jupyter Notebook Execution & Clean Sync:**
  - Executed all 14 cells of `notebooks/03_tributary_ml_analysis.ipynb` with `nbclient` via `.venv/bin/python3 scripts/run_notebook.py`.
  - Re-exported all 5 notebooks to HTML in `web/notebooks/` and synced `.ipynb` files.

### Changed
- **Unified Reservoir Elevation Filter Bar (`web/index.html`):**
  - Standardized `#reservoir-filter-bar` (`Reservoir:` + `View:` segmented controls) on a single aligned row using warm sandstone pills (`bg-[#ece8df]`, `border-[#cfc8ba]`), matching square `26px` active/inactive button classes (`resFilterActiveCls` / `resFilterInactiveCls`, `border-[#b8ae9c]`), and `#reservoir-filter-bar button:focus/:focus-visible { outline: none !important; }` to suppress browser blue focus rings; verified at `1280×760` via CDP (`sameRow1280: true`, uniform `26px` heights, `outlineStyle: none`, `verified_reservoir_filters_clean.png`).
- **Small-Screen Sidebar Section Separation (`web/index.html`):**
  - Added explicit `mt-4` clearance, a `1.5px solid #b8ae9c` divider, and a `Reference & Code` category header above `#sidebar-bottom-utilities` (plus `pt-2.5 mt-2.5 border-t-[1.5px] border-[#b8ae9c]` above `#btn-fullscreen`) so the reference/utility links maintain crisp separation from `Decadal & Regimes` even when vertical `justify-between` slack collapses on compact viewports; verified at `1280×680` via CDP (`gapAboveDivider: 16`, `gapToLaw: 54.25`, invariant `30px` link height, `verified_sidebar_small_screen_division.png`).
- **Gemini Web Meta-Prompting PDFs Archived & Parsed into AI Dialogue Archive (`scripts/compile_full_ai_transcript.py`, `scripts/build_unified_notebook.py`, `mockups/gemini_sessions/*.pdf`):**
  - *Full PDF Extraction & Hosting (`web/ai_complete_prompt_archive.html`):* Parsed all 10 exported Gemini Argon PDFs in `mockups/gemini_sessions/` via macOS `PDFKit` into `84` filterable dialogue cards (`gemini-web-sessions` filter option, `759` total dialogues across `189` screenshots, `5.90 MB`), and staged all 10 source PDFs into `web/audit_assets/gemini_session_*.pdf` with direct links.
  - *Two-Model Meta-Prompting Documentation (`notebooks/colorado_river_analysis.ipynb`):* Documented how Gemini Argon sessions were used to audit water law/hydrology and draft structured anti-drift prompts for Gemini 3.8 Flash in Section 8, and verified `10` archived PDFs in Cell 16.
- **Consistent Sandstone Brown Tray Controls & Clean Title Header (`web/index.html`, `web/editorial.css`, `web/map_embed.html`, `web/map.html`):**
  - *Basin Metrics Popout & Map Handles:* Changed `.sidebar-expand-tab`, `.map-menu-btn`, and `.tray-handle-bar` from blue hover/active states (`#2b5c8f`) to a consistent light-sandstone (`#ede6d8`) → solid warm brown (`#6b5744`, border `#4f3f30`, `#faf8f4` ink) transition.
  - *Clean Sidebar Title Block (`web/index.html`):* Removed the top `border-t-[3px] border-t-[#2b5c8f]` rule from `#sidebar-brand-header`; bumped cache-busters (`?v=20261122g`) and verified via CDP (`restBg: rgb(237, 230, 216)`, `activeBg: rgb(107, 87, 68)`, `hdrBorderTop: 0px`, `verified_brown_tray_no_blue_line.png`).
- **Unobstructed `Copy` Button in Map Popup `API / Python` Tab (`web/app.js`, `web/map_embed.html`, `web/map.html`, `web/index.html`):**
  - Moved the `Copy` button from `position:absolute` inside `.popup-code-box` into the `.popup-pane-code` header row beside `${codeTitle}` and updated `copyPopupCode()` container lookup (`btn.closest('.popup-pane-code')`), eliminating overlap with the vertical brown scrollbar; bumped cache-busters (`?v=20261122f`) and verified via CDP (`copyBottom: 221.33 < preTop: 256`, `noOverlap: true`, `verified_popup_code_copy_clean.png`).
- **Centered Stacked Column Headings Over Bar Tracks (`web/sankey.html`):**
  - Wrapped `#stacked-heading-supply` / `#stacked-bar-supply` and `#stacked-heading-demand` / `#stacked-bar-demand` inside `max-w-[230px]` flex columns beside their side-bracket SVGs so both column titles center directly above their bar tracks rather than spanning the bracket width (`supplyDelta: 0`, `demandDelta: 0` verified via CDP in `verified_stacked_headings_centered.png`).
- **Warm Sandstone Corridor Theme for Map Popups & Tooltips (`web/editorial.css`, `web/map_embed.html`, `web/map.html`, `web/app.js`, `web/index.html`):**
  - *Popup Shell & Tip Overrides (`web/editorial.css`, `web/map_embed.html`):* Styled `.maplibregl-popup-content` (`#faf8f4`, `1.5px solid #b8ae9c`, `2px` radius), `.maplibregl-popup-close-button`, popup anchor tips (`#b8ae9c`), and `.map-hover-tooltip` (`#faf8f4` / `#b8ae9c`).
  - *Inline Popup Templates (`web/app.js`):* Updated 133 popup/tooltip template lines across `switchPopupTab()`, `formatTabbedPopup()`, `openReachPopup()`, `formatGaugePopup()`, `formatReservoirStationPopup()`, `formatCanalPopupHtml()`, dam popups, and hover tooltips from cold blue-gray (`#f8fafc`, `#f1f5f9`, `#f0f9ff`, `#e0f2fe`, `#1d4ed8`, `#0284c7`) to warm sandstone corridor tones (`#f2ede2`, `#ebe4d6`, `#cfc8ba`, `#b8ae9c`, `#2b5c8f`); bumped cache-busters (`?v=20261122e`).
  - *Automated CDP Verification:* Rendered Marble Canyon reach popup in `#iframe-map` (`bg: rgb(250, 248, 244)`, `border: rgb(184, 174, 156)`, `hasColdColors: false`, `0` JS errors; `verified_map_popup_warm_corridor.png`).
- **Hybrid Workspace + Native Fullscreen Toggle (`web/index.html`):**
  - *Brave / macOS Fullscreen Resilience:* Updated `toggleFullScreen()` and `syncFullscreenUI()` to combine a `body.workspace-fullscreen` layout mode (hiding `.sidebar-academic`, expanding main viewport/map to 100% width with `triggerViewportResize()`, and showing `#btn-exit-fullscreen-floating` + `Escape` support) alongside `requestFullscreen()` / `webkitRequestFullscreen()`, plus added `allow="fullscreen" allowfullscreen` on all 6 child `<iframe>` elements.
  - *Automated CDP Verification:* Confirmed `#btn-fullscreen` expands main viewport to `1440px` (`sidebarW: 0`) and `#btn-exit-fullscreen-floating` restores `sidebarW: 256` cleanly (`verified_workspace_fullscreen.png`).
- **Planning-Mode Plans in AI Archive & Attribution Footers (`scripts/compile_full_ai_transcript.py`, `scripts/export_notebooks_to_html.py`, `web/methodology.html`, `web/data_sources.html`):**
  - *Full Planning-Mode Output Extraction:* Updated `scripts/compile_full_ai_transcript.py` to include full `exit_plan_mode` plans (`Planning Mode Plan`), `enter_plan_mode` status reports (`Plan Review Status Report`), `implementation_plan.md` / `walkthrough.md` drafts, and fallback diagnostic reasoning blocks for interrupted turns (`667` total dialogues, `30` plans, `20` review reports, `65` diagnostic reasoning blocks).
  - *Page Attribution Footers:* Updated bottom footers on `web/methodology.html`, `web/data_sources.html`, `web/notebooks/colorado_river_analysis.html` (via `export_notebooks_to_html.py`), and `web/ai_complete_prompt_archive.html` to include `Colorado River Basin • DAT1001 • Douglas Schoch • Fall 2026`.
- **AI Transcript Archive Session 8 & GitHub / Portfolio Deployment (`scripts/compile_full_ai_transcript.py`, `web/ai_complete_prompt_archive.html`):**
  - Added Session 8 (`aad5e810-76c0-4f7e-a9c4-9eb2855ee883`, Nov 20–22) plus Sept 22 Gemini HTML prototype (`mockups/gemini-code-1790119779253.html`) and `.pdf` ingestion support to `scripts/compile_full_ai_transcript.py`, recompiling `666` dialogues and `185` staged screenshots into `web/ai_complete_prompt_archive.html`.
  - Committed and pushed updates to `origin main` (`schochdo/CO_River`) and deployed `web/` assets (including `ai_complete_prompt_archive.html`, `audit_assets/`, and `notebooks/colorado_river_analysis.html`) via `scripts/sync_to_portfolio.sh` to `schochdo.github.io/colorado_river/`.
- **Single Unified Research Notebook & Removal of "Capstone" Naming (`notebooks/colorado_river_analysis.ipynb`, `web/methodology.html`, `web/map.html`, `scripts/export_notebooks_to_html.py`, `README.md`):**
  - *Consolidated 5 Notebooks into 1 (`scripts/build_unified_notebook.py` → `notebooks/colorado_river_analysis.ipynb`):* Merged all 5 overlapping notebooks (`01`–`04` and `colorado_river_capstone.ipynb`) into a single 15-cell executable notebook covering dimensional rules, `river_network.json` Cataract Canyon re-emergence, live USGS NWIS + reach delta snapshot, SQLite schema/compliance views, 104-year Compact paradox & reservoir buffer depletion charts, tributary travel lags, RBI / $K$-Means ($k=4$) regimes, and 360× flood-vs-snowmelt proof.
  - *Purged "Capstone" Jargon & Superseded Copies:* Removed all "capstone" wording and deleted the 5 superseded `.ipynb`/`.html` files from `notebooks/` and `web/notebooks/`.
  - *Executed & Verified:* Executed end-to-end with `nbclient` (`scripts/run_notebook.py`), exported HTML via `scripts/export_notebooks_to_html.py`, and verified via headless Chrome CDP (`verified_single_notebook_methodology.png`, `verified_single_notebook_html.png`: `4/4` figures rendered, `8` TOC links, `0` "capstone" hits).
  - *Single-Submission Metadata & AI Audit Disclosure:* Added top-level submission links table and Section 8 (`Project Execution, Human Quality Control & AI Usage Disclosure`) with live/local links to `ai_complete_prompt_archive.html`, `AI_LOG.md`, and `CHANGELOG.md`, plus a programmatic audit cell and matching `AI Prompt Archive ↗` button on `web/methodology.html`.
- **3D Gyroscope Drag Direction, Reservoir Storage Sub-Tabs & Flow Replay Tan Theme (`web/app.js`, `web/index.html`, `web/editorial.css`):**
  - *Trackball / Gyroscope Horizontal & Ring Drag (`web/app.js`):* Inverted the horizontal bearing delta (`startBearing - deltaX * 0.55`) and outer compass ring delta (`startBearing - delta`) inside `initTrackballNavigation()` so dragging right orbits/rotates the map and compass ring clockwise with the cursor.
  - *Reservoir Storage Two-Tab Split (`web/index.html`):* Replaced the two-page vertical scroller in `#section-reservoirs` with a segmented sub-tab switcher (`Basin Storage Timeline` vs. `Mead & Powell Elevations`) via `switchReservoirsSubtab()`, matching `web/sankey.html`.
  - *Flow Replay Tan Theme (`web/editorial.css`):* Styled `.flow-replay-bar` and its pills, transport buttons, sentinel strip, and range slider in the warm sandstone tan palette (`#ede6d8`, `#f7f4ee`, `#b8ae9c`, `#6b5744`).
  - *Automated CDP Verification:* Verified right-drag bearing change (`0` → `-22`), Reservoir sub-tab switching (`meadCanvasH: 320`), and Flow Replay tan styling at `1440×900` with `0` JS errors (`verified_flow_replay_tan.png`, `verified_reservoirs_subtabs.png`).
- **5 Flow Regimes Sub-Tab on Tributaries, Title Tightening, Bullet Data Sources & Centered Full-Width Sidebar (`web/ml_analysis.html`, `web/index.html`, `web/editorial.css`):**
  - *Card 4 Sub-Tabs (`web/ml_analysis.html`):* Added `Supply vs. Demand` (`#btn-card4-mismatch`) and `5 Flow Regimes` (`#btn-card4-regimes`) toggle buttons inside Card 4 via `setCard4Mode()` and `renderCard4Regimes()`, rendering all 5 normalized Day-of-Year hydrographs (`Alpine Snowmelt`, `Summer Monsoons`, `Lower Basin Canals`, `Regulated Dam Releases`, `Trans-Mountain Tunnels`) from `seasonal_regimes.json` with muted corridor colors and toggling `#legend-hydrograph`.
  - *Concise Titles & Captions (`web/ml_analysis.html`, `web/index.html`):* Replaced verbose sentence-style titles and captions across Tributaries & Deficit (`Tributary Flashiness vs. Volume`, `Travel Time to Lake Powell`, `Natural Flow vs. Compact Promises (1922–2026)`, `Seasonal Supply vs. Demand`) and Basin Overview (`Statutory Rights vs. River Reality`, `Seasonal Supply vs. Demand`, `Basin Storage Trajectory (1935–2026)`, `Consumptive Use by State`).
  - *Scannable Data Sources (`web/index.html`):* Condensed paragraph prose in `#section-sources` (`#modal-sec-compacts` and `#modal-sec-accounting`) into crisp 2-bullet highlight lists preserving all statutory figures, citations, and agency links.
  - *Centered Navigation Panel & Full-Width Identity Header (`web/index.html`, `web/editorial.css`):* Centered `.sidebar-category-header` and `.sidebar-link` items (preserving invariant `30px` height) and expanded the top `COLORADO RIVER BASIN` / `Douglas Schoch` header block across the full sidebar width with larger `text-lg` / `text-xs` typography.
  - *Automated CDP Verification:* Inspected rendered `Tributaries & Deficit` (`5 Flow Regimes` active in `verified_ml_card4_regimes.png`) and `Data Sources` (`verified_sources_concise_bullets.png`) at `1440×900`, confirming `justifyContent: center`, `30px` invariant link heights, zero paragraph prose inside Compacts/Accounting cards (`sec1Paragraphs: 0`, `sec2Paragraphs: 0`), working Card 4 sub-tab switch (`2` vs. `5` datasets), and `0` JS/console errors.
- **Sidebar Category Title Contrast & Hierarchy (`web/editorial.css`, `web/index.html`):**
  - Increased `.sidebar-category-header` (`LIVE STREAMFLOW`, `ANNUAL BUDGET`, `DECADAL & REGIMES`) typography from `10.5px` / `700` / `#5c6773` to `11.5px` / `800` / `#1e293b` (`letter-spacing: 0.05em`) anchored over a `1.5px solid #b8ae9c` rule.
  - *Automated CDP Verification:* Confirmed computed `fontSize: 11.5px`, `fontWeight: 800`, `color: rgb(30, 41, 59)`, invariant `30px` across all 12 sidebar links, zero sidebar overflow, and `0` JS/console errors (`verified_sidebar_category_headers.png`).
- **Warm Tan Gyroscope & Map Zoom/Compass Controls (`web/editorial.css`, `web/map_embed.html`, `web/map.html`):**
  - *Trackball / Gyroscope Control:* Styled `.trackball-wrapper` in warm sandstone tan (`#ede6d8` fill, `#b8ae9c` border, `#f7f4ee` hover) and updated `#trackball-svg` elements in `web/map_embed.html` and `web/map.html` (`#8c7a66` outer bezel, `#9e3f32` North arrow/`N`, `#5c4a38`/`#3e3226` cardinal ticks & `E/S/W`, `#f7f2e7` inner gimbal orb with `#8c6d4f` rings and `#6b5744` pivot).
  - *MapLibre `+`, `-`, Compass `N` & Tilt Controls:* Styled `.maplibregl-ctrl-group` in warm tan (`#ede6d8`, `#b8ae9c` border, `#d6cfc2` dividers, `#f7f4ee` hover), shifted zoom icons to warm dark brown (`#4f3f30` / `#5c4a38`), recolored the compass chevron SVG to `#5c4a38`/`#3e3226`, and updated `.maplibregl-ctrl-tilt .ctrl-tilt-btn` active/hover tones.
  - *Automated CDP Verification:* Inspected WebGL-rendered `System Map` at `1440×900` (`verified_map_tan_controls.png`) confirming computed `rgb(237, 230, 216)` tan fills on both `.trackball-wrapper` and `.maplibregl-ctrl-group`, `#f7f2e7` inner orb, `#9e3f32` North arrow, and `0` JS/console errors.
- **Restored Dashboard Fullscreen Mode (`web/index.html`):**
  - Re-added the `#btn-fullscreen` sidebar action below `GitHub Repository ↗` (using `sidebar-link` geometry at invariant `30px` height with `#cfc8ba` divider border) alongside `toggleFullScreen()`, `syncFullscreenUI()`, and the `fullscreenchange` listener (updating icons and label between `Fullscreen` and `Exit Fullscreen`).
  - *Automated CDP Verification:* Verified button existence, `30px` height, `function` binding, zero sidebar overflow (`bottom: 880` inside `900px` viewport), and `0` JS/console errors (`verified_fullscreen_restored.png`).
- **Warm Dark-Brown Corridor Scrollbar Theme (`web/editorial.css`, `web/index.html`):**
  - Replaced cold gray (`#e2e8f0` / `#94a3b8`) custom scrollbars with universal `scrollbar-width: thin` and `::-webkit-scrollbar` rules matching the sandstone palette (`#6b5744` dark brown thumb, `#4f3f30` hover, `#ece8df` sandstone track, `2px` square thumb radius), including `.legend-content` in the map overlay.
  - *Automated CDP Verification:* Inspected `Reservoir Storage` (`verified_scrollbars_dark_brown.png`) confirming computed `scrollbarColor: rgb(107, 87, 68) rgb(236, 232, 223)`, visible warm-brown scrollbar along overflowing viewports (`1489px > 900px`), and `0` JS/console errors.
- **Basin Overview Color Unification & Chart Simplification (`web/index.html`):**
  - *Muted River-Corridor Palette Across Overview Cards (`#act-1`..`#act-4`):* Replaced clashing bright categorical colors (`#0072B2`, `#b2182b`, `#009E73`, `#D55E00`, `#56B4E9`, `#E69F00`) and harsh blues/yellows/greens on takeaway boxes with unified sandstone/river-corridor tones (`#2b5c8f` river blue, `#c26d2d` canyon ochre, `#3f6f58` riparian sage, `#9e3f32` canyon red, `#475569` slate, `#f5f2eb` fills, `#cfc8ba` card hairlines, and muted `#5c6773` kickers).
  - *Simplified Card 2 (`renderSeasonalEngineChart`):* Removed the cluttered `5 Regimes` toggle and view branch on Overview, locking Card 2 to the 2-line **Natural Inflow** (`#2b5c8f`) vs. **System Demand** (`#c26d2d`) comparison.
  - *Simplified Card 3 (`#chart-macro-overview-timeline`):* Removed the 3 cramped individual reservoir lines (`Lake Mead`, `Lake Powell`, `Upper CRSP`) and top legend from the compact Overview panel, leaving the single **Total Basin Major Storage** line (`#2b5c8f`) with `Full System Capacity (~60.0 MAF)` and `Min Power Pool Limit (~6.0 MAF)` dashed reference thresholds (while keeping full individual breakdown in the `Reservoir Storage` tab).
  - *Basin-Grouped Card 4 (`#chart-state-use`):* Consolidated the 7-color bar chart into 2 Basin groups (**Lower Basin** `CA`, `AZ`, `NV` in `#c26d2d`; **Upper Basin** `CO`, `UT`, `NM`, `WY` in `#2b5c8f`) with an inline 2-item header legend.
  - *Automated CDP Verification:* Inspected rendered `Basin Overview` at `1440×900` (`verified_overview_clean_corridor.png`) confirming simplified single-row Card 2 and Card 3 charts, cohesive colors, zero regime toggle button, and `0` JS/console errors.
- **Reservoir Multi-Line Switch, Slop Purge, Structured Sidebar & Warm Map Overlays (`web/index.html`, `web/editorial.css`, `web/map_embed.html`, `web/map.html`, `web/methodology.html`, `web/sankey.html`, `web/pipeline.html`):**
  - *Multi-Line Macro Storage Timeline (`web/index.html`):* Switched `renderMacroStorageTimeline()` from solid stacked area fills to `scales.y.stacked: false` with four transparent-fill lines in the muted river-corridor palette (`Combined Total` `#0f172a` 2.5px, `Lake Mead` `#2b5c8f` 2px, `Lake Powell` `#c26d2d` 2px, `Upper CRSP` `#3f6f58` 1.75px dashed `[4, 3]`).
  - *Slop & Engine Tag Purge:* Removed `Colorado River Basin Platform • Open Hydrologic Intelligence • Serverless Architecture` and renamed the capstone badge to `Colorado River Basin Dashboard` (`web/methodology.html`); removed `● Macro Basin Water Bank` and `● Unified Stacked Breakdown & Total Basin Trajectory` (`web/index.html` `#section-reservoirs`); removed `Engine:` footer tags from `web/sankey.html`, `web/pipeline.html`, `web/map_embed.html`, and `web/map.html`.
  - *Structured Navigation Panel (`web/editorial.css`, `web/index.html`):* Framed the sidebar header card in `#f7f4ee` with `#cfc8ba` border and `3px` top river-blue `#2b5c8f` stripe; added translucent white resting card fills (`rgba(255, 255, 255, 0.52)`), warm `#cfc8ba` borders, and bottom hairlines under `.sidebar-category-header` while maintaining invariant `30.00px` item height.
  - *Warm River-Corridor Map Overlays (`web/editorial.css`, `web/map_embed.html`):* Replaced cold slate grays (`#e2e8f0`, `#f1f5f9`, `#334155`, `#1e293b`, `#cbd5e1`) on `.sidebar-panel`, `.sidebar-expand-tab`, `.map-menu-btn`, `.map-menu-dropdown`, `.flow-bar-row`, `.res-row`, `.toggle-label`, `.basemap-item-btn`, `.map-legend`, and `.map-gage-tray` with warm sandstone parchment (`#f5f2eb`, `#faf8f4`), warm stone borders (`#cfc8ba`), and muted river-blue (`#2b5c8f`) accents; bumped cache-busters to `?v=20261121d`.
  - *Automated CDP Verification:* Inspected `System Map` and `Reservoir Storage` renders at `1440×900` (`verified_map_warm_corridor.png`, `verified_reservoirs_multiline_clean.png`) confirming `30px` invariant link heights, warm map panel RGBs (`rgb(245, 242, 235)` / `rgb(250, 248, 244)`), zero fluff strings, and `0` JS/console errors.
- **Reservoir Storage Stacked Area Chart Redesign (`web/index.html`):**
  - *Eliminated Alpha-Blending Bleed & Fixed Stack Order (`renderMacroStorageTimeline`):* Changed dataset fill targets from `fill: true` (each semi-transparent layer filling to `y=0` and blending into muddy olive/green) to `fill: 'origin'` on `Lake Mead` and `fill: '-1'` on `Lake Powell` and `Upper CRSP`, with aligned stack `order` (`Combined Total`: `0`, `Lake Mead`: `1` bottom, `Lake Powell`: `2` middle, `Upper CRSP`: `3` top).
  - *Muted River-Blue/Slate Band Palette:* Replaced the competing blue/amber/teal categorical fills with an opaque 3-step river-blue scale (`#2b5c8f` Lake Mead, `#6c93b8` Lake Powell, `#c8d8e6` Upper CRSP), crisp `1px` borders (`#234c77`, `#577fa4`, `#9db8cf`), and a refined `1.75px` top `Combined Total` boundary line (`#1e293b`).
  - *Automated CDP Verification:* Inspected rendered `Reservoir Storage` screenshot (`verified_reservoir_stacked_clean.png`) and verified `1984` stack coordinates (`Combined Total` `84.38px` matching top of `Upper CRSP` `84.38px`, `Lake Powell` `107.06px`, `Lake Mead` `196.26px`) with `0` JS/console errors.
- **Sankey Left-Side Brackets & Stacked Bar Anti-Slop Pass (`web/sankey.html`):**
  - *Left-Side Inflow Brackets on Sankey Diagram:* Widened D3 Sankey left extent margin from `20px` to `62px` and added matching `[` vertical brackets along Column 0 (`UPPER BASIN INFLOWS (12.40 MAF)` in `#0284c7` across Mainstem, Green, and San Juan basins; and a 2-line `LOWER & OVERDRAFT / (2.50 MAF)` in `#ea580c` across Lower Basin Tributaries and Reservoir Storage Overdraft).
  - *Stacked Bar Anti-Slop Cleanup (`#view-stacked-section`):* Removed jargon badges and helper filler (`Macro Basin Imbalance`, `Vertical Side-by-Side Scale: 0 to 20.0 MAF/yr (1 MAF = 24px)`, `Scale Headroom to 20 MAF`, and bottom Lee's Ferry pill banners), widened the shared Y-axis to `w-16 whitespace-nowrap` so `20.0 MAF`/`15.0 MAF`/`10.0 MAF` do not wrap, and styled right-column callout boxes with crisp left-accent editorial borders.
  - *Vertical Side-Brackets Beside Stacked Bars:* Added matching `]` SVG brackets beside both stacked bars showing `UPPER BASIN (13.90 MAF)` vs. `LOWER 1.40 MAF` on Physical Runoff and `UPPER BASIN (7.50 MAF)` vs. `LOWER BASIN & LOSSES (11.60 MAF)` on Paper Claims.
  - *Automated CDP Verification:* Inspected rendered screenshots (`verified_sankey_left_brackets.png`, `verified_stacked_brackets_clean.png`) confirming zero bottom-edge clipping, exact Y-axis baseline alignment, active hover tooltip behavior, and `0` JS/console errors.
- **Unified Visual Grammar & Muted River-Corridor Palette (`web/editorial.css`, `web/index.html`, `web/methodology.html`, `web/pipeline.html`, `web/sankey.html`, `web/telemetry.html`, `web/ml_analysis.html`):**
  - *Muted River-Corridor Palette:* Defined Colorado River corridor design tokens in `web/editorial.css` (`--canvas-bg: #f5f2eb` warm sandstone parchment, `--sidebar-bg: #ece8df` muted sandstone-gray navigation panel, `--sidebar-hover: #e2ddd1`, `--hairline: #cfc8ba`, `--river-blue: #2b5c8f`, `--riparian-green: #3f6f58`, `--canyon-red: #9e3f32`) so page elements have clean visual contrast without heavy saturated grays.
  - *Warm Sandstone Canvas (`#f5f2eb`):* Standardized all non-map panel backgrounds onto `#f5f2eb`, leaving `System Map` full-bleed with no border.
  - *Restrained Navigation Sidebar (`web/editorial.css`, `web/index.html`):* Updated `.sidebar-academic` to `#ece8df` with a `1px solid #cfc8ba` right hairline, `#e2ddd1` hover, white `#ffffff` active cards with `#2b5c8f` left accent bar, and invariant 30px height on tab switches.
  - *Compact Flow Schematic Headers Everywhere:* Replaced oversized hero banners, kicker pills, and buzzword taglines across `web/methodology.html`, `web/index.html` (`#section-law`, `#section-sources`, `#section-reservoirs`), `web/sankey.html`, `web/telemetry.html`, and `web/ml_analysis.html` with compact single-row headers (`text-lg md:text-xl font-black text-slate-900` + contextual controls or `Contents:` jump strip).
  - *Bordered Section Separation:* Wrapped every chapter in `Law of the River` (`#law-sec-ch1`..`#law-sec-ch5`) and every section in `Data Sources` (`#modal-sec-compacts`, `#modal-sec-accounting`, `#modal-sec-apis`) inside standalone white bordered boxes (`bg-white border border-stone-300 rounded-[2px] p-5`) matching `Architecture & Methodology`.
  - *Removed Redundant Water Budget Banners (`web/sankey.html`):* Deleted the redundant `Annual Scale: MAF/yr` badge, duplicate metric pills (`Natural Runoff`, `Active Storage Drawdown`, `Total Depletion`), `#macro-banner`, and separate sub-tab row above the Sankey diagram.
  - *Automated CDP Verification:* Verified panel colors (`navBg: rgb(236, 232, 223)`, `mainBg/secBg: rgb(245, 242, 235)`), 30px invariant link heights, and zero JS errors (`verified_river_corridor_palette_overview.png`, `verified_river_corridor_palette_law.png`).

### Fixed
- **Travel Time Chart Peak Label Collision Resolution (`web/ml_analysis.html`):**
  - *Fanned Out Peak Labels & Leader Lines (`card2RiverLabelsPlugin`):* Spread the initial offsets for the 5.5–8.0 day peak cluster (`Gunnison 5.5d`, `Cameo 6.5d`, `Flaming Gorge 7d`, `Yampa 8d`) alongside `San Juan 1.5d`, clamped label bounds strictly inside `chartArea`, added a 12-iteration pairwise AABB collision solver (`4px` padding), and drew crisp `1px` leader lines beneath solid `#ffffff` square label boxes.
  - *Automated CDP Verification:* Inspected full-panel (`verified_ml_travel_labels.png`) and Card 2 cropped (`verified_ml_travel_card2_crop.png`) headless Chrome CDP renders at `1440×900`, confirming zero overlap between any Card 2 labels or borders and `0` JS/console errors.
- **Stacked Bar Chart Floating Tooltip & Thin-Segment Overflow Fix (`web/sankey.html`):**
  - *Converted Static Detail Section to Floating Hover Tooltip:* Deleted `#stacked-detail-strip` below the stacked comparison bars and added a floating `#stacked-tooltip` card (`border: 1px solid #cfc8ba`, `border-radius: 2px`) that tracks cursor coordinates within `#view-stacked-section` and displays category badge, share, volume (`MAF/yr` & `cfs`), and legal explanation on hover.
  - *Eliminated Ultra-Thin Band Text Overflow:* Added `overflow: hidden` to `.bar-segment` CSS and removed inline `<span>` labels inside bands shorter than 16px (`Little Colorado` `6.0px`, `Virgin / Bill Williams` `6.7px`, `Nevada (SNWA)` `7.2px`), relying cleanly on the hover tooltip for full readout.
  - *Automated CDP Verification:* Confirmed zero overflowing segments (`overflowingSegs: []`), removal of `#stacked-detail-strip`, working hover tooltip on `Virgin / Bill Williams`, and `0` JS errors (`verified_sankey_stacked_clean_hover.png`).

- **Sankey Header & Stacked Bar Sub-Tabs Restoration, Supertitle Purge & Gages Rename (`web/sankey.html`, `web/index.html`, `web/pipeline.html`, `web/telemetry.html`, `web/ml_analysis.html`, `web/methodology.html`):**
  - *Restored Embedded Sankey Header & Stacked Bar View (`web/sankey.html`):* Removed the stale `body.in-iframe header { display: none !important; }` CSS override that hid `Colorado River Annual Water Budget` and the `Inflows to Consumptive Depletions` / `Physical Runoff vs. Statutory Paper Claims` toggle buttons inside the dashboard iframe.
  - *Purged Uppercase Supertitles Across All Panels:* Removed all small uppercase kicker labels above `<h1>` titles (`Annual Basin Mass-Balance`, `Operational Hydrology & Allocations`, `Real-Time Basin Telemetry`, `Tributary Timing, Flashiness & Compact Deficit`, `Computational Pipeline & Architecture`, `Multi-Decade Basin Buffer`, `Statutory Framework (1922–2026)`, `Federal Accounting, Compacts & Live APIs`).
  - *Renamed `Facility Database` to `Gages` (`web/index.html`, `web/telemetry.html`):* Updated sidebar link, page title, and `<header><h1>` from `Facility Database` / `Hydrologic Gage & Facility Registry` to `Gages`.
  - *Automated CDP Verification:* Verified embedded Sankey header visibility, stacked bar view toggle (`#view-stacked-section`), `Gages` rename, and zero supertitle kickers (`verified_sankey_header_restored.png`, `verified_sankey_stacked_bars.png`, `verified_gages_clean_header.png`).

- **Track 1, Phase 1 — Navigation & Window Consistency + Redundant Link Purge (`web/index.html`, `web/sankey.html`, `web/telemetry.html`):**
  - *Converted `Law of the River` and `Data Sources` to In-Panel Tabs (`web/index.html`):* Replaced `#law-modal` and `#api-modal` overlays with full-height in-panel tab sections (`#section-law` and `#section-sources`) featuring standardized `Overview`-style top header bars, keeping the persistent left navigation panel visible and eliminating duplicate close buttons (`✕` + bottom `Close`).
  - *Purged Redundant Water Budget Cross-Links (`web/sankey.html`):* Removed the `#budget-data-sources` card below the Sankey diagram, removed the header `Data Sources & Legal Authorities ↓` button and footer jump link, and removed the bottom-right `← Back to Inflows & Consumptive Depletions` return button on View 2.
  - *Telemetry Modal Close Cleanup (`web/telemetry.html`):* Removed the duplicate bottom `Close` button footer from `#schema-modal`, keeping only the top-right `✕` control.
  - *Automated CDP Verification:* Validated `setTab('law')` and `setTab('sources')` in-panel rendering, verified removal of `#budget-data-sources`, and confirmed zero JS errors via Chrome DevTools Protocol (`verified_law_in_panel.png`, `verified_sources_in_panel.png`, `verified_sankey_no_redundant_sources.png`).

- **Data Sources Redundant Cross-Navigation Purge & Embedded Methodology Tab (`web/index.html`, `web/data_sources.html`, `web/methodology.html`):**
  - *Removed Methodology Section from Sources Page:* Deleted Section 4 (*"Looking for Computational Architecture, Ingestion Pipelines & Research Notebooks?"*) from both `#api-modal` (`web/index.html`) and `web/data_sources.html`.
  - *Purged Redundant Header, Jump-Bar & Footer Links:* Removed `Architecture & Methodology ↗` from the Data Sources "Jump To" anchor strip, removed `Standalone Registry ↗` from the modal header, removed redundant footer navigation links (`Data Sources Registry ↗`, `Architecture & Methodology ↗`, `GitHub Repository ↗`) and duplicate `Close` button from `#api-modal`, and removed redundant `Data Sources & Legal Authorities ↗` and `GitHub Repository ↗` header/footer links from `web/methodology.html`.
  - *In-Panel Methodology Navigation:* Converted `Architecture & Methodology` in the primary sidebar (`web/index.html`) from a top-window navigation link to an in-panel tab (`setTab('methodology')` rendering `#section-methodology`), keeping the left navigation panel persistently visible without needing back-navigation buttons.
  - *Automated CDP Verification:* Verified removal of Section 4 and clean in-panel rendering via Chrome DevTools Protocol (`verified_sources_no_methodology_section.png`, `verified_methodology_in_panel.png`).

- **Bottom Gage Tray Drawer Handle Square Architecture (`web/style.css`, `web/editorial.css`):**
  - *Square Precision Handle Grip:* Converted `.tray-handle-bar` from fully rounded semicircular pill geometry (`border-radius: 6px`) to crisp square corners (`border-radius: 2px !important`) with a high-contrast `1px solid #94a3b8` border and slate arrow glyph, matching the universal square standard across the platform.
  - *Automated CDP Verification:* Validated computed `borderRadius: 2px`, 48px × 12px dimensions, and captured high-resolution verification screenshot via Chrome DevTools Protocol (`verified_tray_handle_squared.png`).

- **Navigation Bar Click Repositioning & Subpixel Jitter Elimination (`web/index.html`, `web/editorial.css`, `web/style.css`):**
  - *Root Cause Diagnosis:* Diagnosed the 1px jump/readjustment when clicking sidebar links: inactive buttons had `border: 1px solid transparent` while active buttons had `border: 1.5px solid var(--hairline)`, causing a 0.5px/1px physical box-model height expansion. Furthermore, `transition: all 0.15s ease` animated this dimension change across layout properties, forcing neighboring buttons to shift vertically while transitioning, compounded by fractional `padding: 6.5px 10px` and default browser outline shifts.
  - *Geometric & Border Invariance:* Enforced permanent `border: 1.5px solid transparent !important` and `border-left: 3.5px solid transparent !important` on `.sidebar-link`. Active state strictly overrides `border-color` and `border-left-color` without altering border thickness ($\Delta h = 0.00\text{px}$). Standardized padding to clean whole integer pixels (`padding: 6px 10px !important`), set `line-height: 1.25 !important`, added `box-sizing: border-box !important`, and set `outline: none !important`.
  - *Transition Property Scope Restriction:* Replaced `transition: all` with targeted `transition: background-color 0.12s ease, border-color 0.12s ease, color 0.12s ease !important`, permanently barring transition animations from touching geometric layout properties. Added `scrollbar-gutter: stable` to `.sidebar-academic` and added `{ preventScroll: true }` to all `iframe.focus()` calls in `setTab()`.
  - *Automated CDP Verification:* Validated exact height invariance (30.00px active == 30.00px inactive across all tabs) and zero layout movement via Chrome DevTools Protocol (`verified_sidebar_click_stabilized.png`).

- **Navigation Label Slop Purge & Cross-Platform UI De-Cluttering (`web/index.html`, `web/pipeline.html`, `web/map.html`, `web/map_embed.html`, `web/data_sources.html`):**
  - *Sidebar Navigation Label Cleanup:* Dropped `(92)` from `Facility Database (92)` in the primary desktop navigation sidebar (`web/index.html`), standardizing the item to concise, unbracketed `Facility Database`. Similarly simplified `Reservoirs (1935–Today)` to clean `Reservoir Storage`, eliminating awkward parenthetical dates and matching the pure noun-phrase architecture across all sidebar navigation destinations (`Overview`, `System Map`, `Facility Database`, `River Flow Network`, `Water Budget`, `Reservoir Storage`, `Tributaries & Deficit`).
  - *Sub-Tab Navigation Standardization:* Dropped `(1,400+ mi)` from `Longitudinal Elevation Profile (1,400+ mi)` in `web/pipeline.html`, ensuring clean sub-tab parity (`Topological River Reach Network` vs. `Longitudinal Elevation Profile`).
  - *Layer Toggle & Legend Slop Sweep:* Purged hardcoded parenthetical counts across Map layer menus and legends (`web/map.html`, `web/map_embed.html`): `Major Storage Dams (16)` $\to$ `Major Storage Dams`, `Active Stations (92 Gages & Facilities)` $\to$ `Active Gages & Facilities`, `Conveyance Canals (AAC/CAP/CRA)` $\to$ `Conveyance Canals`, and replaced static station counts in the legend grid (`Streamflow (79)`, `Reservoirs (11)`, `Tunnels (4)`, `Canals (4)`) with clean category headers (`Streamflow Gages`, `Reservoirs`, `Tunnels`, `Canals`). Removed lingering decorative `tray-indicator-dot` vanity element from the bottom tray header.
  - *Page Metadata Hygiene:* Cleaned `<title>` tag in `web/data_sources.html`, removing stale `& Research Notebooks` suffix after its computational separation into `web/methodology.html`.
  - *Automated CDP Verification:* Validated sidebar rendering and map UI labels via Chrome DevTools Protocol (`verified_sidebar_clean_labels.png`).

- **Flow Replay Bar Universal Square Corners & Text Overflow Elimination (`web/style.css`, `web/map.html`, `web/map_embed.html`):**
  - *Square Precision Aesthetic:* Enforced `border-radius: 2px !important` on `.flow-replay-bar`, `.replay-period-pills`, `.period-pill`, `.sentinel-pill`, `.replay-ctrl-btn`, `.speed-pill`, and `.replay-close-btn`. Converted the replay slider track to a flat precision line (`height: 5px; border-radius: 0px`) with square 12px × 12px precision thumbs (`border-radius: 2px`).
  - *Text Clipping & Strip Overflow Remediation:* Diagnosed and fixed horizontal clipping in the middle sentinel pulse strip (`#replay-sentinel-strip`). Replaced `justify-content: center` with `justify-content: space-between`, eliminating the coordinate clipping where `San Juan Inflow` was truncated on the left. Compacted verbose label strings across `web/map.html` and `web/map_embed.html` (`San Juan Inflow` $\to$ `San Juan:`, `Lees Ferry (Powell Release)` $\to$ `Lees Ferry:`, `Below Imperial Dam` $\to$ `Below Imperial:`, `Gila River (Dome)` $\to$ `Gila River:`), reducing strip width to 852px and achieving zero overflow (`scrollWidth === clientWidth`) within the 880px container.
  - *Bottom Docking Separation:* Elevated `.flow-replay-bar` to `bottom: calc(106px + env(safe-area-inset-bottom, 0px))`, creating clean vertical clearance above the docked Map Legend button (`bottom: 66px`, 36px height) and eliminating overlap across all desktop viewports.
  - *Automated CDP Verification:* Validated zero element overflow, 2px square corners across all sub-elements, zero legend overlap, and captured high-resolution verification screenshots via native Chrome DevTools Protocol (`verified_flow_replay_squared_clean.png`, `verified_flow_replay_bottom_context.png`).

- **USGS 400 Bad Request on Non-Numeric Station IDs (`USBR-HOOVER`, `USBR-DAVIS`, `USBR-PARKER`):**
  - *Diagnosis:* Traced HTTP 400 server errors on Hoover Dam Release to `formatGaugePopup` in `web/app.js`, which blindly concatenated `s.id` into `https://waterdata.usgs.gov/monitoring-location/${s.id}/#parameterCode=00060`. Because `USBR-HOOVER` is a USBR RiverOps telemetry identifier rather than an 8-digit USGS station number, USGS WaterData rejected the query as invalid.
  - *Dynamic Authoritative Portal Routing (`web/app.js`, `web/sankey.html`, `web/test_proposal1.html`):* Integrated `getPortalInfo(s)` in `formatGaugePopup` and `openReachPopup`. USBR dam releases now route directly to the official **USBR Lower Colorado River Operations Hourly Teletype** (`https://www.usbr.gov/lc/region/g4000/hourly/hourly.html`), Colorado DWR tunnels route to **CDSS Surface Water Portal**, and standard 8-digit USGS stations route to `waterdata.usgs.gov`.
  - *Badge & API Tab Alignment:* Displayed distinct green `USBR Dam Release` badge on map popups. Updated the API / Python tab to generate authentic USBR teletype scraping code and endpoint URLs rather than broken USGS NWIS queries.
  - *Visual & Navigation Verification:* Tested and verified via headless Chrome DevTools Protocol (`verified_hoover_popup.png`).

- **Unified Master Capstone Jupyter Notebook (`notebooks/colorado_river_capstone.ipynb`):**
  - Consolidated the 4 fragmented legacy research notebooks (`01` through `04`) into **ONE** publication-grade Capstone Notebook designed for end-of-semester coursework presentation and grading.
  - Created automated builder script (`scripts/build_unified_capstone_notebook.py`) structuring 19 sequential cells across 6 logical chapters:
    1. *Environment Setup & Live Hydrologic API Telemetry:* Targeted, low-latency live API query for Lees Ferry sentinel streamgage (`09380000`) and Lake Mead storage (Hoover Dam).
    2. *Relational Database Architecture & SQL Analytics (SQLite Single Source of Truth):* DDL schema inspection, analytical SQL aggregation queries for 7 major reservoirs, and SQL window functions computing 10-year rolling delivery compliance at Lees Ferry.
    3. *The Historical "Wet Water" Ledger (1922–2025):* Analysis of the full 104-year record of naturalized streamflow vs. statutory "paper water" compact claims.
    4. *Publication Figure 1 (Edward Tufte / NYT Standard):* High-resolution Seaborn/Matplotlib visualization comparing annual natural flow against the 15.0 MAF, 16.50 MAF, and 17.50 MAF legal baselines, with historical milestone callout annotations and KaTeX typography.
    5. *Hydrologic Modeling & Flow Regimes:* Richards-Baker Flashiness Index ($RBI$) calculation and scatter plot separating regulated tailwaters, snowmelt freshets, and monsoonal flash floods.
    6. *Volumetric Mathematical Proof & Serverless JSON Export:* Quantitative proof separating instantaneous rate ($Q$, cfs) from cumulative volume ($V$, MAF), followed by production SQL-to-JSON export routine.
  - Executed and validated all 19 cells with zero errors via headless test harness; rendered standalone HTML view to `web/notebooks/colorado_river_capstone.html`.
- **Seaborn vs. Chart.js Presentation Chart Architecture Analysis:**
  - Evaluated the architectural rationale for using Seaborn/Matplotlib in academic presentation notebooks and reports versus Chart.js in web applications: fixed aspect ratios, subpixel typography, direct point-of-interest annotations without canvas clipping, and direct DataFrame/SQL integration.
- **GitHub Actions Automated Pipeline & SQLite Database Staging (`.github/workflows/update_data.yml`):**
  - Confirmed and updated the scheduled GitHub Actions workflow (`.github/workflows/update_data.yml`) to automatically stage and commit `data/colorado_river_basin.db` (SQLite Single Source of Truth) alongside `data/*.json` and `web/data/*.json`.
  - The automated workflow runs on cron (`0 5,17 * * *`, twice daily at 10:00 AM & 10:00 PM MST) and manual dispatch: it executes `src/fetch_water_data.py`, ingesting live USGS NWIS, USBR RiverOps, and CDWR HydroBase streamflow into SQLite tables and views, then executes SQL queries to compile static JSON files for the serverless web frontend, committing both back to `origin/main`.
- **Theme Hydrologic Blue & Universal Square Architecture (`web/style.css`, `web/editorial.css`, `web/map_embed.html`):**
  - *Theme Color Calibration:* Eliminated electric ocean cyan (`#0ea5e9` / `#0284c7`) across all system stylesheets. Set `--color-primary` to deep hydrologic cobalt-blue (`#1d4ed8`, hover `#1e40af`, light `#eff6ff`), perfectly matching the slate and academic editorial theme.
  - *Square Edges on Basin Metrics Cards:* Enforced `border-radius: 2px` on all conduit cards (`.flow-bar-row`, `.flow-bar-row.interactive`) like "Lees Ferry", "All-American Canal", "Front Range Tunnels", and reservoir rows (`.res-row`), backed by flat precision progress tracks (`border-radius: 0px`).
  - *Square Precision Map Controls:* Converted `.map-menu-nav-tabs` and `.map-menu-tab-btn` from rounded pills (`8px` / `6px`) to crisp `2px` square cards. Scaled toggle sliders to square precision switches (`border-radius: 2px`) with theme blue active fill (`#1d4ed8`).
  - *Theme Slate Drawer Handles:* Styled `.sidebar-expand-tab.active` and `.map-menu-btn.active` with deep theme slate (`#1e293b`), permanently eliminating bright ocean blue from the map handles.
  - *Cache-Busting Assets:* Bounded stylesheet and iframe references with `?v=20261121c` in `web/index.html`, `web/map_embed.html`, and `web/map.html`.
  - Verified computed styles and visual layout via automated Chrome DevTools Protocol (`verified_square_basin_metrics.png`, `verified_square_map_controls.png`).
- **Map Controls (Layers & Basemaps) Lighter Interior & Item Cards (`web/editorial.css`):**
  - Styled `.map-menu-dropdown .map-menu-tab-pane` with a crisp white lighter card interior (`background: #ffffff !important; border: 1.5px solid var(--hairline); border-radius: var(--radius-card); padding: 6px 8px;`), matching the visual architecture of the Basin Metrics card.
  - Added dedicated light-slate card backgrounds (`background: #f1f5f9 !important; border: 1px solid #cbd5e1 !important; border-radius: var(--radius-button);`) under every individual layer toggle item (`.toggle-label`) and basemap item (`.basemap-item-btn`), allowing each control to stand out distinctly against the container.
  - Added indented card styling (`#f8fafc` background with `#e2e8f0` border) for sub-layer items (Mainstem Colorado, Major Tributaries, Secondary Streams, Reservoirs & Lakes, Flow Data Badges).
  - Enforced crisp hover transitions (`background: #ffffff; border-color: var(--hairline-dark);`) and high-contrast active basemap selection (`background: #ffffff; border: 1.5px solid #0284c7; font-weight: 700;`).
- **High-Density Space-Efficient Layers Panel & Compact Slider Switches (`web/editorial.css`):**
  - Scaled toggle sliders down from large 34px × 18px down to compact, Swiss-precision 22px × 12px switches (`.slider` 22px × 12px, `.slider:before` 8px × 8px thumb with 10px translation).
  - Reduced element spacing and vertical padding (`min-height: 22px`, `padding: 3.5px 8px`, `margin-bottom: 2px`, `gap: 2px`), achieving a ~50% vertical footprint reduction and eliminating scrolling for all 13 primary layer switches and 3 topology diagnostic controls.
- **Reversed Map Legend Color Scheme (`web/editorial.css`):**
  - Inverted the Map Legend color scheme: applied light gray (`#f8fafc`) to the legend interior body (`.legend-content`) and collapsed badge, with darker gray (`#475569`, slate-600) for the `MAP LEGEND` title text and section headers.
- **Basin Metrics Theme Blue & Square Card Aesthetic (`web/editorial.css`, `web/map_embed.html`):**
  - Replaced ocean cyan-blue (`#0284c7`) on `.sidebar-expand-tab.active` and the panel header icon with deep theme slate `#334155` (Slate-700), perfectly matching the navigation sidebar and top header ink palette.
  - Enforced square corners (`border-radius: var(--radius-card, 2px) !important;`) across all Basin Metrics cards (`.flow-bar-row`, `.flow-bar-row.interactive`, `.res-row`, `.flow-dest-item`), eliminating rounded bubble-wrap edges.
  - Set storage and flow progress bars to flat precision ends (`border-radius: 0px !important;`).
  - Replaced electric cyan fill on flow vectors with classic hydrologic royal blue (`#2563eb` fill, `#1d4ed8` text).
- **Simplified Sankey Primary Data Sources & Consolidated Data Sources Registry (`web/sankey.html`, `web/data_sources.html`, `web/index.html`):**
  - *Sankey Chart Space-Efficiency (`web/sankey.html`):* Condensed the primary data sources section directly below the Water Budget Sankey chart from a 13-card multi-column grid down to a compact, high-density 2-column editorial card (~150px height vs ~850px previously). Grouped into Statutory Apportionments (1922 Compact, 1948 Compact, 1928 BCPA / Decree, 1944 Mexico Treaty) and Empirical Accounting & Conduits (USBR Decree Accounting, Upper Basin CULR, Natural Flow, and Conveyance Authorities) with direct portal links, physical rate conversion bridge (`1 MAF/yr ≈ 1,381.16 cfs`), and quick link to full technical registry.
  - *Dedicated Standalone Data Sources Page (`web/data_sources.html`):* Created a standalone, publication-grade, consolidated registry containing comprehensive documentation, legal citations, statutory apportionments, federal decree accounting records, real-time REST API parameter dictionaries (USGS NWIS, USBR HDB, RiverOps teletype, CDWR HydroBase, SNOTEL), all 4 reproducible research notebooks (01–04), and Python data ingestion pipeline patterns.
  - *Consolidated Data Sources Modal (`web/index.html`):* Upgraded `#api-modal` into a consolidated 5-section registry matching `data_sources.html` with universal square styling (`2px` radius), fast jump anchor navigation, direct standalone page cross-link, and full inclusion of Notebook 04.
  - Fully verified live rendering via automated Chrome DevTools Protocol (`verified_sankey_simplified_sources.png`, `verified_data_sources_page.png`, `verified_api_modal_consolidated.png`).

### Changed
- **Light Editorial Code Box Backgrounds (`web/app.js`, `web/style.css`, `web/editorial.css`, `web/data_sources.html`, `web/index.html`):**
  - Replaced dark code backgrounds (`#0f172a`, `bg-stone-900`) across all interactive map gage/reservoir popups, modal code snippets, and documentation registries with standard light editorial styling:
    - Code Box Background: Clean light slate `#f8fafc` (`bg-slate-50`) with `#cbd5e1` hairline border (`border-slate-300`) and `2px` square radius.
    - Code Typography: Crisp dark slate `#0f172a` monospace text (`text-slate-900`) with `#1d4ed8` active tabs/links and `#15803d` comments/feedback.
    - Copy Button: Clean white background (`#ffffff`), `#cbd5e1` border, `#475569` text, transitioning to `#f0fdf4` / `#15803d` upon copying.
  - Verified live UI rendering via automated Chrome DevTools Protocol (`verified_light_code_popup.png`).

### Fixed
- **Basin Metrics Panel Numbers & Front Range Storage Restoration (`src/fetch_water_data.py`, `data/colorado_river_basin.db`, `web/data/latest_metrics.json`):**
  - *Diagnosed Root Cause of Blank/NaN Metrics:* The relational SQLite pipeline (`sync_to_sqlite` and `export_json_from_sqlite`) in `src/fetch_water_data.py` introduced key and schema mismatches that blanked the Basin Metrics panel:
    1. *Mismatched Foreign Keys:* The `reservoirs` table had legacy truncated IDs (`'mead'`, `'powell'`, `'mohave'`, `'navajo'`, `'havasu'`), while real-time telemetry used canonical IDs (`'lake_mead'`, `'lake_powell'`, `'lake_mohave'`, etc.). When `export_json_from_sqlite` executed `LEFT JOIN reservoirs_telemetry`, the join failed, producing `NULL` storage values for 5 of the 7 system facilities.
    2. *Missing Front Range Reservoirs:* The initial SQLite schema lacked the 4 Front Range collection reservoirs (`lake_granby`, `dillon_reservoir`, `green_mountain`, `homestake_reservoir`).
    3. *Missing Frontend Properties:* In `web/app.js`, storage aggregations require `category` (`'system'` vs `'front_range'`), `capacity_af`, and `capacity_pct`. Without `category`, Front Range facilities were dropped, and missing storage numbers evaluated to `NaNk AF`.
  - *Unified Relational Schema & Ingestion:*
    - Migrated `reservoirs` table in `colorado_river_basin.db` to store complete hydrologic attributes (`reservoir_id`, `name`, `dam_name`, `river`, `category`, `operator`, `capacity_af`, `total_capacity_af`, `capacity_pct`, `current_storage_af`, `current_elevation_ft`, `current_pct_full`, `feet_below_full`, `latitude`, `longitude`, `role`).
    - Standardized all 11 reservoirs on canonical IDs (`lake_mead`, `lake_powell`, `flaming_gorge`, `navajo_reservoir`, `lake_mohave`, `blue_mesa`, `lake_havasu`, `lake_granby`, `dillon_reservoir`, `green_mountain`, `homestake_reservoir`).
    - Enhanced `export_json_from_sqlite` to query all 11 reservoirs via SQL with clean categorization, sorting by capacity, and preserving fallback objects.
  - *Verified Complete Metrics Rendering:* Re-ran `fetch_water_data.py` pipeline and validated that `latest_metrics.json` renders all 11 reservoirs. Verified live UI in headless Chrome via automated DevTools script (`verified_basin_metrics_numbers_restored.png`, `verified_front_range_reservoirs_restored.png`):
    - System Total Storage: `21.52M AF` of `59.16M AF` (`36.4% Full`).
    - Front Range Total Storage: `450k AF` of `994k AF` (`45.2% Full`).
    - Every facility renders full volume, capacity, elevation, and live timestamp with zero `NaN` or unpopulated fields.
- **Basin Metrics Width-Jump Lock & Natural Up/Down Arrow Toggle Geometry (`web/style.css`, `web/editorial.css`, `web/map_embed.html`, `web/app.js`):**
  - *Eliminated Width-Jump Shift on Collapse:* Diagnosed root cause of the Basin Metrics panel expanding wider (+15px) when collapsing cards: under `overflow-y: auto`, collapsing a tall card reduced content height below the viewport, causing the browser vertical scrollbar to disappear and expanding remaining cards from 332px to 347px. Locked the scrollbar gutter permanently using `scrollbar-gutter: stable !important; overflow-y: scroll !important;` on `.sidebar-panel`, eliminating layout shifts ($\Delta w = 0.0\text{px}$).
  - *Replaced Sideways Arrow Rotations with Intuitive Up/Down Toggles:* Purged all awkward sideways `rotate(-90deg)` rotations across card collapse icons (`.collapse-icon`) and the Map Legend (`.legend-toggle-chevron`):
    - *Sidebar Cards:* When open/expanded, arrow points UP (`rotate(180deg)`), indicating "click to collapse upward"; when collapsed/closed, arrow points DOWN (`rotate(0deg)`), indicating "click to expand downward".
    - *Map Legend:* Anchored at the bottom of the map: when open/expanded, arrow points DOWN (`rotate(0deg)`), indicating "click to collapse downward"; when collapsed, arrow points UP (`rotate(180deg)`), indicating "click to expand upward into the map".
    - Both reverse symmetrically when toggled.
  - *Front Range Capacity Guard:* Guarded against `NaNk AF` storage text when Front Range storage totals are empty (`frTotalCap > 0`).
  - Verified live collapse, zero width expansion, and vertical arrow geometry via automated Chrome DevTools Protocol (`verified_drawer_collapsed.png`, `verified_drawer_expanded.png`, `verified_legend_collapsed_updown.png`).
- **Hydrologic Gage Registry 3-Tier Visual Hierarchy & Filter Reorganization (`web/telemetry.html`):**
  - *Resolved Disorganized Multi-Row Clutter:* Replaced the confusing tangle of wrapped pill buttons, mixed export actions, and unaligned dropdown filters with a clean, structured 3-tier visual hierarchy:
    - **Tier 1 (Utility Header):** Integrated live keyword search (`#search-input`) with real-time match counter (`Showing X of Y facilities`), clean table layout toggle (`Grouped by Reach` / `Flat Sortable`), and dedicated Data Tools action group (`Export CSV`, `Export JSON`, `Schema & Dictionary`).
    - **Tier 2 (Scope Ribbon):** Dedicated single horizontal ribbon clearly labeled `SCOPE:` hosting 7 concise, non-wrapping geographic and sentinel category buttons with live counts (`All Facilities`, `1922 Compact Divide`, `Basin Sentinels`, `Upper Basin`, `Lower Basin`, `Tunnels & Canals`, `Storage Reservoirs`).
    - **Tier 3 (Attribute Filter Strip):** Dedicated multi-attribute filter toolbar labeled `FILTER BY:` featuring 4 compact, neatly aligned dropdown selectors (`Facility Type`, `Sentinel Tier`, `Flashiness (RBI)`, `Flow Status`), plus a dynamic `Clear Filters` button that appears when any filter is active.
  - *Standardized Universal Square Architecture:* Converted all bubbly pill corners (`rounded-xl`, `rounded-lg`, `rounded-md`) across controls, table cards, and navigation buttons to crisp `border-radius: 2px` (`rounded-[2px]`).
  - Verified live layout, instant filtering, and responsive rendering via automated Chrome DevTools Protocol (`verified_telemetry_hierarchy_clean.png`, `verified_telemetry_search_filtered.png`).
- **Basin Metrics Card Expansion Lock & Vertical Accordion Chevrons (`web/style.css`, `web/editorial.css`, `web/map_embed.html`, `web/app.js`):**
  - *Expansion Lock on Card Collapse:* Fixed a 15px layout shift where collapsing any card caused remaining cards to grow wider (332px -> 347px). Diagnosed root cause: dynamic appearance/disappearance of the vertical scrollbar in the sidebar under `overflow-y: auto`. Added `scrollbar-gutter: stable !important; overflow-y: scroll !important;` to `.sidebar-panel`, locking sidebar inner content width permanently.
  - *Vertical Accordion Arrow Toggles & Stationary Square Housing:* Eliminated the rotating square animation by removing `transform` and transition from the button containers (`.collapse-icon`, `.legend-toggle-chevron`). The square housing remains completely stationary at all times. Applied state directly to the internal SVG with `transition: none !important` (no spinning animation): chevron points UP (`^`) when open to close, and DOWN (`v`) when collapsed to expand.
  - *Front Range Reservoirs NaN Guard:* Added `frTotalCap > 0` validation in `web/app.js`, preventing `NaNk AF` rendering when municipal capacity data is unpopulated.
- **Hydrologic Registry 3-Tier Visual Hierarchy Polish (`web/telemetry.html`):**
  - Re-architected the cluttered 5-row control section into a structured, editorial 3-tier hierarchy:
    - *Tier 1 (Utility Bar):* Full-width search bar + grouped view mode buttons (`Grouped by Reach` / `Flat Sortable`) + data export utilities (`Export CSV`, `Export JSON`, `Schema & Dictionary`).
    - *Tier 2 (Primary Scope Ribbon):* Single-line `SCOPE:` ribbon with 7 category buttons (`All Facilities`, `1922 Compact Divide`, `Key Streamgages`, `Upper Basin`, `Lower Basin`, `Tunnels & Canals`, `Storage Reservoirs`) with live facility counts.
    - *Tier 3 (Multi-Attribute Filter Strip):* High-density `FILTER BY:` strip with 4 dropdowns (`Facility Type`, `Gaging Priority`, `Flashiness Regime`, `Flow Health Status`) plus `✕ Clear Filters`.
  - Replaced all rounded borders with crisp `2px` square cards (`rounded-[2px]`).
- **Comprehensive Purge of Pseudo-Technical Jargon & Library Version Tags (`web/`):**
  - *Removed Library Build Tags (`web/ml_analysis.html`, `web/index.html`):* Deleted all user-facing library tags (`Chart.js v4.4 (Bubble)`, `Chart.js v4.4 (Line)`, etc.) in accordance with Rule 1 ("No Fake Versions or Build Tags").
  - *Eliminated Pseudo-Talk Across All Pages:*
    - Replaced `"The statutory legal fulcrum dividing Upper and Lower Basin allocations"` with `"Legal division point between Upper and Lower Basin allocations"`.
    - Replaced `"Basin Sentinels"` and `"Compact Sentinel"` with `"Key Reference Gages"` and `"1922 Compact Point"` across `web/telemetry.html`, `web/map.html`, `web/app.js`, and `web/data/station_hierarchy.json`.
    - Replaced `"Hypsometric descent..."` with `"Elevation profile..."` and purged `"horizontal pool bathtubs"`, `"vertical dam hydraulic head drops"`, and `"2.5D tributary feeder axes"` from `web/pipeline.html`.
    - Replaced `"Tailwater Control"` and `"Sentinel Legal Divide"` with `"Glen Canyon Dam Release"` and `"1922 Compact Divide"`.
    - Replaced `"Submerged Reservoir Thalweg"` and `"Submerged Thalweg"` with `"Submerged River Channel"` in `web/app.js` and `web/flowReplay.js`.
    - Replaced `"phreatophyte uptake / evapotranspiration"` with `"streamside / riverbank vegetation losses"` in `web/pipeline.html` and `web/sankey.html`.
    - Replaced `"Central Feeder Canal"` with `"Main Canal"` in `web/sankey.html`.
  - Verified clean rendering and plain-English tone via headless browser DevTools protocol (`verified_telemetry_desloppified.png`, `verified_ml_analysis_desloppified.png`, `verified_pipeline_elevation_desloppified.png`).
- **Sankey Bottom Whitespace Elimination & Responsive SVG Auto-Height (`web/sankey.html`):**
  - *Diagnosed Root Cause of Bottom Letterboxing Gap:* The `#sankey-container` element had a hardcoded CSS height class (`h-[660px] min-h-[640px]`), while the SVG was appended with `height="100%"` and `preserveAspectRatio="xMidYMin meet"`. On laptop screen viewports (such as the 1184px wide iframe inside `index.html`), the container's 1095px width scaled the 1280:660 viewBox down to a rendered height of 564px at the top (`YMin`), leaving a dead 101.1px empty white letterboxing band between the bottom of the Sankey diagram and the `Data Sources:` footer.
  - *Responsive Auto-Height Solution:*
    - Removed `h-[660px]` and `min-h-[640px]` from `#sankey-container`, setting it to natural `h-auto`.
    - Updated SVG initialization in `renderSankey()` to `height="auto"` with `display: block`, allowing the browser's native SVG aspect-ratio engine to size the container height identically to the graphic's rendered height on any viewport width.
  - *Verified Elimination of Whitespace:* Measured via headless Chrome DevTools Protocol inside `index.html`: container height reduced from 660px to 564.6px, and the gap between the outer editorial frame and `Data Sources:` collapsed from 101.1px down to 5.7px (`verified_sankey_no_bottom_whitespace.png`).
- **Sankey Whitespace Elimination & Redundant Footnotes Purge (`web/sankey.html`):**
  - *Deleted Redundant Footnote Cards:* Permanently removed the 3 explanatory footnote cards below the Sankey diagram ("Basin Inflow Sources", "Annual Storage Drawdown", "Consumptive Fate & Evaporation"), which duplicated the information already visualized in the Sankey ribbons, nodes, and authoritative provenance table.
  - *Eliminated Top/Bottom Letterboxing Gap:* Added `preserveAspectRatio="xMidYMin meet"` to the SVG and tightened the D3 Sankey extent `y` coordinates from `[25, height - 25]` to `[6, height - 6]`, anchoring the diagram directly beneath the 4-tier column headers and reducing the top vertical gap from ~72.5px down to 9.2px.
  - *Optimized Diagram Height & Card Padding:* Reduced `#sankey-container` height from `h-[780px]` to `h-[660px]` (viewBox `height = 660`), outer card padding from `p-4` to `px-4 pt-2.5 pb-2.5`, and header margin from `pb-2 mb-2` to `pb-1.5 mb-1`.
  - Fully preserved all 26 nodes, exact physical mass-balance closure (14.90 MAF = 14.90 MAF), right-hand state grouping brackets, and interactive hover cards.
  - Verified via automated Chrome DevTools Protocol (`verified_sankey_tightened.png`, `verified_sankey_bottom_tightened.png`).
- **Elevation Profile Full-Viewport Height Optimization & Floating Hover-Over Migration (`web/pipeline.html`):**
  - *Deleted Bottom Inspection Strip:* Permanently removed `#readout-strip` (~150px static container at bottom of page), eliminating unnecessary vertical page overflow and allowing the entire elevation profile to fit cleanly within standard laptop screens (`h-[calc(100vh-155px)]`, zero vertical scrolling).
  - *Migrated to Floating Hover-Over Cards:* Re-engineered `showElevationGageInfo()` and `showGapInfo()` to render dynamic, high-contrast floating tooltip cards positioned at the cursor (`showElevationTooltip`), detailing Sentinel type badges, River Mile, Surface Elevation, Live Discharge/Capacity, Hydraulic Head Drop, and Operational Context.
  - *Tooltip Container Scope Fix:* Relocated `<div id="flow-tooltip">` from inside `#view-schematic` out to `<body>`, making rich hover-overs universally available across both the Topological Schematic (View 1) and Longitudinal Elevation Profile (View 2) with smooth mousemove tracking and square corner geometry (`border-radius: 2px`).
  - Verified 100% tooltip initialization and clean single-screen layout via Chrome DevTools Protocol (`verified_elevation_hover_and_clean_bottom.png`, `verified_elevation_tooltip_rendered.png`).
- **Purge of AI Jargon, Vanity Pills & Redundant Banners (`web/pipeline.html`, `web/ml_analysis.html`):**
  - *Deleted Vanity Status Pill (`web/ml_analysis.html`):* Removed the generic instruction pill `<div id="status-pill">Click any tributary or flow curve below to inspect</div>` from the top header bar, freeing header horizontal space.
  - *Deleted Header Sub-Badge (`web/pipeline.html`):* Removed redundant `<span class="rounded-full">MAF/yr & Thalweg Profile</span>` bubble-wrap tag from the page title.
  - *Deleted Elevation Profile Jargon Header (`web/pipeline.html`):* Deleted the redundant banner card containing pseudo-technical clutter ("Hypsometric descent...", "horizontal pool bathtubs", "2.5D tributary feeder axes") and non-functional vanity pills ("Vertical Tributary Inflows", "Flow Widths Proportional to MAF"), allowing the elevation profile canvas to render cleanly and immediately below the navigation tabs.
- **Hydrologic ML Dashboard Bottom Charts Restoration (`web/data/seasonal_regimes.json`, `web/ml_analysis.html`):**
  - Diagnosed empty/collapsed rendering of Card 3 (*"100 Years of Wet Water vs. Paper Promises, 1922–2026"*) and Card 4 (*"Why Reservoirs Drain 9 Months of the Year: Seasonal Supply vs. Demand"*).
  - Traced root cause to an earlier test run of Notebook 03 which overwrote `web/data/seasonal_regimes.json` with a truncated 70-line payload missing `compact_accounting_100yr` and `supply_demand_mismatch`.
  - Restored the comprehensive 5,200-line historical time series in `web/data/seasonal_regimes.json` (and mirrored to `data/seasonal_regimes.json`), restoring all 104 years of reconstructed inflows, Lees Ferry deliveries, Glen Canyon Dam milestones, and 365-day day-of-year seasonal snowmelt and canal demand hydrographs.
  - Hardened `scripts/clean_notebook_03.py` and `notebooks/03_tributary_ml_analysis.ipynb` with non-destructive key merging so future notebook executions will never overwrite or truncate the parent seasonal dataset.
  - Verified 100% chart initialization (`chart-compact-100yr OK`, `chart-snowmelt-vs-flash OK`) and captured full visual render via Chrome DevTools Protocol (`verified_ml_charts_restored.png`).
  - Restored authentic cool slate blue-gray palette (`var(--surface-bg) = #e2e8f0`) across `.sidebar-academic`, `#academic-top-header`, `.sidebar-panel`, `.map-legend`, `.map-menu-dropdown`, and `.map-menu-btn`, reversing accidental blanket lightening.
  - Restored pure white card background (`#ffffff`) for `.sidebar-panel .card`, ensuring Basin Metrics retains its high-contrast editorial appearance.
  - Verified via native WebSocket Chrome DevTools Protocol (`verified_compact_layers_panel.png`, `verified_compact_basemap_panel.png`, `verified_legend_expanded_reversed.png`, `verified_legend_collapsed_reversed.png`, `verified_basin_metrics_comparison.png`, `verified_index_system_map.png`).

---

## [2.3.3] - 2026-11-20
### Fixed
- **Nevada State Label Positioning (`web/pipeline.html`):**
  - Diagnosed visibility failure where moving `<text id="state-nv">` to `(220, 180)` placed it directly behind the solid white background `<rect>` of the main flow legend box (`x="35" y="18" width="258" height="182"` spanning down to $y = 200$).
  - Repositioned `<text id="state-nv">` to `x="235" y="275"`, centering it in the open geographic interior of Nevada—clear of the legend box above ($y \le 200$), the diagonal California boundary below ($y \ge 365$), and the Utah border to the east ($x = 360$). Verified live via automated CDP rendering (`verified_nevada_visible.png`).

### Changed
- **Jupyter Notebook Redundancy Elimination & Academic Polish (`notebooks/`, `web/notebooks/`):**
  - **Notebook 03 Consolidation (`notebooks/03_tributary_ml_analysis.ipynb`):**
    - Eliminated redundant two-part notebook split (which previously had two separate K-Means routines, two 4-panel figures, two executive summary essays, and massive base64 image strings inflating the file to 26 cells and 2.03 MB).
    - Assembled a unified, publication-grade 14-cell notebook (now 447 KB, an 78% reduction in file size) combining:
      1. Sentinel tributary streamgage ingestion from USGS NWIS (2015–2025).
      2. Empirical river travel time lags to Lake Powell via cross-correlation analysis ($CCF$).
      3. Unsupervised K-Means flow regime clustering ($k=4$: Wild Alpine Snowmelt, Dam-Buffered Tailwaters, Monsoonal Flashy Arroyos, Hybrid Plateau Runoff) based on center-of-mass timing ($DOY_{50}$), Richards-Baker Flashiness Index ($RBI$), and spring snowmelt concentration ratio.
      4. Quantitative physical proof of Rate vs. Cumulative Storage Volume (desert flash flood spikes vs. sustained multi-month snowmelt).
      5. 104-year historical Compact deficit accounting (1922–2025) and the 75-day refill vs. 290-day structural depletion sawtooth engine.
    - Resolved pandas 2.2+ `.fillna(method='ffill')` deprecation by migrating to `.ffill()`.
    - Successfully re-executed and verified with all chart outputs and data summaries generated.
  - **Notebook 04 Relational SQLite & Hydrologic Views (`notebooks/04_colorado_river_database_and_analysis.ipynb`):**
    - Stripped artificial rubric homework commentary, meta-commentary ("CEO mindset", "The Struggle"), and repetitive boilerplate across Cells 0, 1, 3, 5, 7, 9, 11, and 13, replacing them with authentic engineering and hydrologic domain descriptions.
    - Resolved cross-environment database relative path resolution (`../data/colorado_river_basin.db` vs `data/colorado_river_basin.db`) and string escape syntax in SQL view reporting cells.
    - Successfully re-executed against `data/colorado_river_basin.db`, generating complete publication figures for the 104-year Compact allocation paradox, multi-year storage buffer depletion, and dual-regime hydrographs.
  - **Notebook 02 Hydrologic Preambles (`notebooks/02_analyze_flow_and_export.ipynb`):**
    - Streamlined introductory markdown cells to focus strictly on empirical mass-balance physics.
  - **Web Notebook Publishing & Sync (`web/notebooks/`):**
    - Re-rendered all standalone HTML pages (`web/notebooks/01_build_river_network.html`, `02_analyze_flow_and_export.html`, `03_tributary_ml_analysis.html`, `04_colorado_river_database_and_analysis.html`) via `scripts/export_notebooks_to_html.py`.
    - Synchronized raw `.ipynb` files to `web/notebooks/`.

---

## [2.3.2] - 2026-11-20
### Fixed
- **Elevation Profile Label Restoration (`web/pipeline.html`):**
  - Repaired 20 unclosed `<rect class="profile-node" ... />` elements (which had malformed trailing `hideGapInfo()"/` rather than `hideGapInfo()"/>`), resolving an XML/SVG parser truncation defect that caused the browser to swallow all 30 milestone labels, reservoir callouts, and tributary titles in `<g id="layer-labels-and-callouts">`.
- **Clean River & Diversion Line Joins (`web/pipeline.html`):**
  - Restored seamless `stroke-linecap: round; stroke-linejoin: round;` on `.river-path` and `.diversion-path`, eliminating the protruding square endcap stumps at the Continental Divide headwaters turn (`(1000, 150)`), the Yampa confluence (`(580, 182)`), and downstream river junctions.
- **Nevada State Watermark Interior Repositioning (`web/pipeline.html`):**
  - Relocated `<text id="state-nv">` from `y="340"` (which intersected the southwest NV-CA diagonal boundary line) to `y="180"` (`x="220"`), centering the state label in the open interior of Nevada with zero line collisions.
- **Universal Square Aesthetic Standardization (`web/pipeline.html`):**
  - Converted all remaining rounded cards, badges, and legend boxes to crisp square corners (`rx="2"` or `rx="1"`):
    - Flow schematic main legend box (`id="legend-box"`): `rx="8"` $\to$ `rx="2"`.
    - Elevation profile flow scale legend box (`id="flow-width-legend"`): `rx="8"` $\to$ `rx="2"`.
    - Reach station cards (`card-headwaters`, `card-green-river`, `node-delta`, `card-leesferry`, `card-hoover`, `card-parker`, `card-imperialspr`): `rx="6"` $\to$ `rx="2"`.
    - Trans-basin diversion badges (`.badge-bg`): `rx="4"` $\to$ `rx="2"`.
    - Elevation profile callout badges (`badge-lake-granby`, `badge-blue-mesa`, `badge-flaming-gorge`, `badge-navajo-dam`, `card-green-head`, `card-gunnison-head`, `card-sanjuan-head`): `rx="6"`, `rx="5"`, `rx="3.5"` $\to$ `rx="2"`.
    - Dam crest and reservoir gate icons: `rx="3"`, `rx="2.5"` $\to$ `rx="1"`.

---

## [2.3.1] - 2026-11-20
### Added
- **Universal Chart Sourcing & Rendering Library Attribution Standard (`web/sankey.html`, `web/ml_analysis.html`, `web/pipeline.html`, `web/index.html`, `web/map.html`, `web/map_embed.html`):**
  - *Zero Charts Without Exact Sources & Libraries:* Codified a permanent, cross-platform provenance standard requiring every chart and interactive graphic to explicitly disclose its exact authoritative government/state data sources and underlying rendering engine (D3.js, Chart.js, Custom SVG, or MapLibre GL).
  - *Water Budget Sankey & Statutory Ledger (`web/sankey.html`):*
    - *Primary Data Sources & Statutory Authority Ledger Card (`#budget-data-sources`):* Inserted a dedicated, high-contrast, Swiss-styled reference ledger directly below the Sankey diagram documenting all 13 foundational sources: the 1922 Compact (42 Stat. 171), 1948 Upper Compact (63 Stat. 31), 1928 BCPA / *Arizona v. California* Decree (373 U.S. 546), 1944 Mexico Treaty (TS 994), USBR Article V Decree Accounting, USBR Upper Basin CULR, Colorado DWR HydroBase Trans-Mountain Diversions (Adams, Roberts, Moffat, Boustead), Utah Central Utah Project (CUP) Bonneville Unit, California Conduits (IID & MWD), Arizona Conduits (CAP & USBR Yuma), Nevada SNWA Lake Mead Intakes, System Losses & Evaporation (USBR Basin Study Tech Report C), and Natural Virgin Runoff (USBR Natural Flow Database).
    - *Header Navigation Quick-Jump:* Added a crisp square button with vector SVG scales (`Data Sources & Legal Authorities ↓`) in the top metric bar smoothly jumping to `#budget-data-sources`.
    - *Inline Explanatory Footnotes:* Hyperlinked all 3 editorial footnotes directly to the USBR Natural Flow Database, USBR Lake Mead Teletype, and USBR Decree Accounting.
    - *Interactive Node Popups (`NODE_META`):* Standardized and verified all 26 diagram nodes with exact `portalUrl` and `portalLabel`, enabling 1-click external access to official portals (e.g. `USBR Decree Accounting ↗`, `Colorado DWR HydroBase ↗`, `Central Utah WCD ↗`, `IID Water Department ↗`, `CAP Operations ↗`, `SNWA Water Resources ↗`, `IBWC Treaty Portal ↗`).
    - *Sankey Diagram Card Provenance Bar:* Appended provenance footer to the main diagram card (`Data Sources: USBR Natural Flow Database ↗, USBR Decree Accounting ↗, UCRC Annual Reports ↗ • All 13 Portals & Compacts ↓ • Engine: D3.js v7 (d3-sankey)`).
    - *Stacked Comparison Card Provenance Bar:* Added provenance footer to View 2 (`Engine: Precision HTML5 / CSS Stacked Scale`).
  - *Hydrologic ML Analysis (`web/ml_analysis.html`):*
    - Integrated clean, compact provenance footers into all 4 Gapminder cards:
      - *Card 1 (River Behavior & Size):* `Source: USGS NWIS Streamflow Records ↗ (Richards–Baker Flashiness Index)` • `Engine: Chart.js v4.4 (Bubble)`.
      - *Card 2 (Travel Time to Lake Powell):* `Source: USGS NWIS ↗ & USBR Glen Canyon Dam Inflow Routing ↗` • `Engine: Chart.js v4.4 (Line)`.
      - *Card 3 (100 Years of Wet Water vs. Paper Promises):* `Source: USBR Natural Flow Database ↗ & USGS Lees Ferry Gage #09380000 ↗` • `Engine: Chart.js v4.4 (Bar/Line)`.
      - *Card 4 (Seasonal Supply vs. Demand):* `Source: USGS Mean Daily Discharge ↗ & USBR 24-Month Study Operations ↗` • `Engine: Chart.js v4.4 (Area/Line)`.
  - *Flow Schematic & Longitudinal Elevation Profile (`web/pipeline.html`):*
    - *Schematic Provenance Bar:* Appended provenance strip below the reach network SVG (`Data Sources: USGS NWIS Real-Time Streamflow ↗, USBR Lower Colorado Hourly Teletype ↗, USBR Decree Accounting ↗ • Engine: Custom Interactive SVG Vector Geometry`).
    - *Elevation Profile Provenance Bar:* Appended provenance strip below the profile inspection strip (`Data Sources: USGS 3D Elevation Program (3DEP) / NED ↗, USGS Streamgage Survey Datums ↗, USBR Dam Structural Profiles ↗ • Engine: Custom Precision SVG Hydraulic Profile`).
  - *Basin Overview & Reservoir Dynamics (`web/index.html`):*
    - Added data provenance and engine attribution across all 6 Chart.js charts and 2 DOM heatmap matrices:
      - *Card 2 (Seasonal Snowmelt Engine):* `Source: USGS NWIS Records ↗ & NOAA CBRFC ↗ • Chart.js v4.4`.
      - *Card 3 (90-Year Reservoir Buffer Depletion):* `Source: USBR Glen Canyon HydroData ↗ & Hoover Operations ↗ • Chart.js v4.4`.
      - *Card 4 (Consumptive Use by State & Sector):* `Source: USBR Article V Decree Accounting ↗ & UCRC Reports ↗ • Chart.js v4.4`.
      - *Card 5 (Macro Inflow Timeline):* `Source: USBR HydroData (Powell) ↗ & Hoover Teletype (Mead) ↗ • Chart.js v4.4`.
      - *Card 6 (Lake Mead Historic Elevation & Heatmap):* `Source: USBR Hoover Dam Records ↗ • Chart.js v4.4` & `Custom DOM Heatmap Matrix`.
      - *Card 7 (Lake Powell Historic Elevation & Heatmap):* `Source: USBR Glen Canyon HydroData ↗ • Chart.js v4.4` & `Custom DOM Heatmap Matrix`.
  - *System Map (`web/map.html`, `web/map_embed.html`):*
    - Expanded Map Legend footer attribution to clearly identify `Data: USGS NWIS & USBR Operations • Tiles © Esri, USGS` and `Engine: MapLibre GL JS v3`.
- **Option 1: True Independent Headwater Tributaries (`web/ml_analysis.html`):**
  - *Elimination of Hydrologic Double-Counting:* Resolved duplicate stations for the Green River (formerly showing both below Flaming Gorge Dam and 170 mi downstream at Green River, UT) and the Colorado River (formerly showing both Cameo alpine snowmelt and post-Gunnison combined flow at Cisco, UT).
  - *Purge of the 152% Inflow Paradox:* Removed the downstream combination stations (`Green River at Green River` and `Colorado River near Cisco`) that previously double-counted upstream tributary flows. Standardized Card 1 and Card 2 strictly on the 7 distinct, non-overlapping headwater and desert tributaries:
    - *Upper Colorado at Cameo:* 3.50 MAF/yr (37% of tributary inflow, RBI 0.32, Alpine Snowmelt)
    - *Gunnison River near Grand Junction:* 2.10 MAF/yr (22% of tributary inflow, RBI 0.15, Dam-Regulated)
    - *Flaming Gorge Outflow (Upper Green):* 1.40 MAF/yr (15% of tributary inflow, RBI 0.08, Steady Baseflow)
    - *Yampa River at Deerlodge Park:* 1.30 MAF/yr (14% of tributary inflow, RBI 0.42, Wild Snowmelt)
    - *San Juan River at Bluff:* 1.15 MAF/yr (12% of tributary inflow, RBI 0.78, Desert Monsoon Flash)
    - *Dirty Devil near Hanksville:* 0.07 MAF/yr (1% of tributary inflow, RBI 0.88, Extreme Desert Flash)
    - *Escalante River near Escalante:* 0.02 MAF/yr (<1% of tributary inflow, RBI 0.94, Extreme Desert Flash)
  - *True 100% Mass-Balance Closure:* Total independent tributary inflow now sums to 9.54 MAF/yr ($37\% + 22\% + 15\% + 14\% + 12\% + 1\% + <1\% = 100\%$), providing authentic hydrologic grounding.
  - *Direct Labeling & Arrival Alignment:* Updated Card 1 bubble labels to crisp square badges (`Upper CO (Cameo)`, `Gunnison`, `Flaming Gorge`, `Yampa`, `San Juan`, `Dirty Devil`, `Escalante`) and Card 2 travel time arrival curves to plot distinct basin arrival lags (San Juan 1.5d, Gunnison 5.5d, Cameo 6.5d, Flaming Gorge 7d, Yampa 8d).

- **Proposal 1: Pure Symmetrical Compact Architecture (`web/sankey.html`):**
  - *Symmetrical 4-Column Flow:* Implemented Proposal 1 to eliminate columnar asymmetry and category contamination:
    - *Column 1 (Inflow Sources & Drawdown):* 14.90 MAF total (Rockies Snowpack Runoff 12.40 MAF + Lower Basin Tributaries 0.45 MAF + Lake Mead Storage Overdraft 2.05 MAF).
    - *Column 2 (Compact Basin Allocations):* Upper Basin Allocations (4.50 MAF) and Lower Basin Allocations & Deliveries (10.40 MAF) sit side-by-side in the same column, eliminating the hybrid mixing of physical storage reservoirs and legal apportionments.
    - *Column 3 (Regional Conveyance Conduits & Losses):* All 10 conveyance conduits across the entire basin align in Column 3 (Upper Basin: Western Slope Canals 3.90, Front Range Tunnels 0.48, Wasatch Tunnels 0.12; Lower Basin: All-American Canal 3.40, CRA 1.00, CAP 1.38, Lower River Canals 1.42, SNWA Intakes 0.30, Morelos Dam Diversion 1.50, and Reservoir Evaporation & Transit Losses 1.40).
    - *Column 4 (Consumptive Depletions & Sovereigns):* All 9 state and sovereign end uses (CO, UT, WY, NM, CA, AZ, NV, Mexico Treaty, and System Losses).

- **Square Geometric Language & Precision End-Cap Standardization (`web/pipeline.html`, `web/style.css`, `web/editorial.css`, `web/map.html`, `web/map_embed.html`):**
  - *Flow Schematic Precision Linecaps & Joins (`web/pipeline.html`):* Updated `.river-path`, `.diversion-path`, and `.loss-path` from `stroke-linecap: round; stroke-linejoin: round;` to `stroke-linecap: square; stroke-linejoin: miter;`. Applied square cuts across all mainstem reach lines, headwater origins, canal branches, and Continental Divide diversions, evoking high-precision Swiss transit engineering.
  - *Square Reservoir Bathtubs & Flow Badges (`web/pipeline.html`):* Converted Lake Powell (`#body-powell`) and Lake Mead (`#body-mead`) reservoir polygons from `rx="7"` to crisp `rx="2"` square blocks. Converted all flow badges and intake diversion markers from rounded bubbles (`rx="4..8"`) to precision `rx="2"` / `rx="0"`.
  - *Longitudinal Elevation Profile Square Milestones & Vectors (`web/pipeline.html` #view-elevation):* Converted all dashed vertical tributary vectors to square/butt end caps. Converted circular milestone nodes (`<circle class="profile-node">`) into precision square milestones (`<rect rx="1">`), and flattened reservoir pool bathtubs to crisp square water blocks.
  - *Circular Expansion Toggles Converted to Square 2px Badges (`web/style.css`, `web/editorial.css`):* Converted `.collapse-icon` (collapsible card header chevrons in the Basin Metrics panel) and `.legend-toggle-chevron` (collapsible Map Legend header chevron) from circular bubbles (`border-radius: 50%`) to square `border-radius: 2px !important;` badges, preserving smooth 90° rotation and centered SVG chevron geometry.
  - *Map Zoom `+-` & Tilt Controls (`web/style.css`, `web/editorial.css`):* Converted MapLibre `.maplibregl-ctrl-group`, `.maplibregl-ctrl-tilt`, and navigation control buttons from `border-radius: 8px` to crisp `border-radius: 2px !important;`.
  - *Basin Metrics Cards, Badges & Sliders:* Enforced `border-radius: 2px !important;` across `.card`, `.stat-badge`, and `.custom-select`, `0px` on `.storage-bar-bg` and `.storage-bar-fill`, and `2px` on `.slider` switches.
- **Water Budget Sankey Redesign & Symmetrical Planar Architecture (`web/sankey.html`, `scripts/apply_symmetric_ag_muni_sankey.js`):**
  - *Symmetrical Allocation Terminology:* Harmonized linguistic phrasing symmetrically between basins. Renamed `"Upper Basin In-Basin Allocations"` to `"Upper Basin Allocations"` (4.50 MAF) in Column 1 and standardized Lower Basin distribution in Column 2 as `"Lower Basin Allocations (Lake Mead Hub)"` (10.40 MAF), eliminating asymmetric jargon.
  - *Lower Basin Agricultural vs. Municipal Ribbons:* Disaggregated previously solid blue Lower Basin links into authentic, color-coded functional conduits:
    - *California (4.40 MAF):* Split into All-American Canal (3.40 MAF, Agricultural Irrigation, Green `#15803d`) and Colorado River Aqueduct (1.00 MAF, Municipal & Industrial, Amber `#b45309`).
    - *Arizona (2.80 MAF):* Split into Lower River Mainstem Canals (1.42 MAF, Agricultural Irrigation, Green `#15803d`) and Central Arizona Project (1.38 MAF, Municipal & Tribal, Amber `#b45309`).
    - *Nevada, Mexico & Losses:* Nevada (0.30 MAF, Municipal, Amber `#b45309`), 1944 Mexico Treaty Delivery (1.50 MAF, International Treaty, Purple `#4338ca`), and System Losses & Evaporation (1.40 MAF, Evaporation & Seepage, Slate `#64748b`).
    - *Zero Plain Blue Ribbons to End Uses:* No generic blue ribbons reach any state or sovereign end use; both Upper and Lower basins now visually demonstrate their exact agricultural vs. municipal splits.
  - *Color Semantics & Node Clarity:* Standardized allocation nodes as river blue (`#0284c7`) and incoming natural supply as river blue with reservoir overdraft in deficit red (`#b2182b`). Outgoing conveyance ribbons from both Upper and Lower Basin allocations strictly adhere to functional domain colors (Green Ag, Amber Muni, Purple Treaty, Slate Losses).
  - *Deterministic Untangled Ribbon Ordering:* Implemented a strict deterministic multi-key comparator (`linkSort`) ensuring that multiple links sharing the same source and destination (e.g. California Ag and Municipal) flow in parallel without twisting or visual crossover.
  - *Enhanced Conveyance Inspection Cards:* Upgraded `formatSankeyLinkCard(d)` to display conduit titles, functional category tags, annual volume in MAF/yr, and continuous instantaneous equivalent rate in cfs ($1\text{ MAF/yr} \approx 1,381\text{ cfs}$).
  - *Lake Powell & Lake Mead Hub Integration:* Explicitly integrated Lake Powell Storage Pool (Glen Canyon Dam) in Column 1 as the Upper Basin regulatory storage pool (buffering snowmelt runoff to release 7.90 MAF past Lees Ferry) and Lake Mead Pool in Column 2 as the primary Lower Basin distribution hub.
  - *Lower Basin Tributary Inflows:* Incorporated Lower Basin tributaries (Virgin River and Little Colorado River, 0.45 MAF natural runoff) directly into Lake Mead mass-balance accounting alongside structural storage overdraft (2.05 MAF/yr).
  - *State-Grouped Disaggregation on Right Margin:* Positioned all consumptive end uses cleanly in Column 4, perfectly grouped into Upper Basin states (Colorado 2.33 MAF, Utah 1.04 MAF, Wyoming 0.63 MAF, New Mexico 0.50 MAF) and Lower Basin states/sovereigns (California 4.40 MAF, Arizona 2.80 MAF, Nevada 0.30 MAF, Mexico Treaty 1.50 MAF, and System Losses 1.40 MAF) with explicit sub-depletion descriptions.
  - *1:1 Scale Type Legibility & Zero Viewport Shrinkage:* Reverted artificial 2,100px SVG over-expansion down to native responsive container dimensions (`1350px × 780px`), eliminating the 0.64 scaling penalty that made text unreadable on laptops and desktop displays. Labels now render at true 12.5px/13px bold Inter with high-contrast `#0f172a` text, 4.5px crisp white halos, and zero background blending.
  - *Elimination of Jagged Stepped Dotted Lines:* Purged the stepped dotted line cutting across flowing ribbons. Upper and Lower Basins are now delineated with crisp vertical bracket annotations along the outer right margin (`UPPER BASIN 4.50 MAF` and `LOWER BASIN & DELIVERIES 10.40 MAF`), keeping all water vectors pure and unobstructed.
  - *Exact Equal-Height Balanced Mass-Balance Calibration:* Factored in physical mass-balance closure ($14.90\text{ MAF/yr}$ total supply + overdraft $\equiv 14.90\text{ MAF/yr}$ consumptive depletions) by mathematically calibrating inter-node spacing across columns. Re-distributed inter-node gaps ($P_0 = 36.4\text{px}$, $P_1 = 57.1\text{px}$, $P_2 = 38.3\text{px}$, $P_3 = 18.0\text{px}$) so that the left side (5 inflow/overdraft nodes) and right side (9 state consumptive use nodes) start at the exact same top boundary ($y = 25\text{px}$) and end at the exact same bottom boundary ($y = 775\text{px}$, total height $750\text{px}$, $\Delta h = 0\text{px}$), visually reflecting mathematical equality.
  - *State Label Width Reduction & Multi-Line Sub-Breakdowns:* Dropped redundant `"State of"` prefixes across all Column 4 nodes. Formatted labels with state name and total volume on line 1 (`Colorado — 2.33 MAF/yr`) followed by hyphenated sub-breakdowns stacked cleanly on subsequent lines (`- Western Slope Ag: 1.85`, `- Front Range Cities: 0.48`), reducing label width by over 50% (from 340px down to ~150px) and guaranteeing comfortable right-margin clearance before the outer basin brackets.
  - *Disaggregated Trans-Mountain & Trans-Basin Tunnels:* Disaggregated previously lumped trans-mountain tunnels into two geographically authentic conduits in Column 3: `Front Range Tunnels (CO)` (0.48 MAF across Continental Divide to Colorado municipalities) and `Wasatch Front Tunnels (UT / CUP)` (0.12 MAF via Strawberry Valley/Central Utah Project to the Wasatch urban corridor), completely eliminating the false visual implication of a Colorado tunnel supplying Utah.
  - *Consistent Right-Aligned Labels & Positive Clearances:* Standardized all labels to the right of node rectangles (`x1 + 10px`), ensuring positive mathematical clearances across all columns with zero collisions.
  - *Smoothed Transit Curves:* Replaced default wave-like cubic Bezier connectors with custom gentle transit schematics ($\pm 0.35$ horizontal tangents) to eliminate visual clutter and align with Edward Tufte information design principles.
  - *Vertical Stacked Bar Chart Verification:* Stacked the physical runoff vs. paper claims comparative charts side-by-side vertically (0 to 20.0 MAF/yr) with zero label clipping and verified interactive inspection.

### Changed
- **Visual Design Standardization & Theme Unification (`web/index.html`, `web/editorial.css`, `web/style.css`, `web/map_embed.html`):**
  - *Unified Geometric Language (Square Corner Look):* Standardized the interface architecture across the entire site to the crisp, square corner aesthetic (`border-radius: 2px` or `0px`) of the navigation panel, permanently eliminating bubbly rounded corners (`border-radius: 6px`, `8px`, `10px`, `12px`, `14px`, `rounded-xl`, `rounded-lg`) across cards, modals, buttons, badges, inputs, drawers, tabs, and legends.
  - *Harmonized Palette (Contrusty Blue-Gray & Slate):* Standardized all primary surfaces and panels onto the contrasty blue-gray palette from the Basin Metrics look:
    - Primary surface background: `#e2e8f0` (cool slate blue-gray) applied to the left navigation sidebar (`.sidebar-academic`), top header (`#academic-top-header`), Basin Metrics drawer (`.sidebar-panel`), Map Legend (`.map-legend`), floating Map Controls dropdown (`.map-menu-dropdown`), and drawer toggle handle (`.sidebar-expand-tab`).
    - Base canvas backdrop: `#cbd5e1` (slate-300 cool gray backdrop) replacing washed-out `#f8fafc`.
    - Interface hairlines & borders: Standardized on `#94a3b8` (high-contrast slate-400 border, 1.5px solid) across all cards, headers, sidebars, and dividers.
    - Card surfaces: Crisp `#ffffff` card surface with `1.5px solid #94a3b8` borders and `2px` corners across overview cards (`#act-1` through `#act-4`), modal cards, and Basin Metrics cards.
    - Active navigation links: Crisp `#ffffff` surface, `#94a3b8` border, square corners (`2px`), and bold `#0284c7` left indicator with `#0f172a` text.
  - *Map Embed Styling Integration (`web/map_embed.html`):* Linked `web/editorial.css` into `map_embed.html` and updated floating controls, popovers, tooltips, and tab handles to square corners (`2px`) and `#e2e8f0` / `#94a3b8` palette.

### Removed
- **Redundant Map Legend Footer Collapse Button (`web/map.html`, `web/map_embed.html`):**
  - Removed the redundant `Collapse ▲` button from the bottom footer of `.map-legend`. The legend card already features a sticky top header toggle (`.legend-header-toggle`) with title, chevron icon, and full keyboard/click accessibility, making the footer button duplicative visual clutter. Clean attribution (`Tiles © Esri, USGS`) is preserved.

### Fixed
- **Water Budget Sankey Basin Margin Brackets Centering & Text Collision Fix (`web/sankey.html`):**
  - *Centered on Bracket Bars:* Diagnosed root cause of vertical labels (`UPPER BASIN (4.50 MAF)` and `LOWER BASIN & DELIVERIES (10.40 MAF)`) pushing down to the bottom teeth of brackets: `text-anchor: "end"` combined with `rotate(-90)` offset the text downwards by its full length. Converted to `text-anchor: "middle"` centered on the exact midpoint of each bracket bar ($y_{\text{mid}} = (y_{\text{start}} + y_{\text{end}}) / 2$), achieving exact mathematical centering on both the blue Upper Basin bar ($\Delta = 0.0\text{px}$, 44.8px padding above/below) and orange Lower Basin bar ($\Delta = 0.0\text{px}$, 129.4px padding above/below).
  - *Zero Text Overlap:* Compacted Line 1 titles for Mexico (`Mexico — 1.50 MAF/yr`) and System Losses (`System Losses — 1.40 MAF/yr`), shrinking maximum label width from 276.5px down to 187.9px (and 172px across state lines). Increased horizontal clearance between the rightmost state label and the vertical bracket text to 74.1px – 117.3px of open whitespace, completely eliminating the overlap of `MAF/yr` across the Lower Basin text. Added 3.5px white halos to vertical bracket labels for crisp anti-collision rendering.
- **Deduplicated USBR Dam Release Stations in Master Facility Database (`src/fetch_water_data.py`, `src/compute_rbi_and_sentinels.py`, `scripts/build_capstone_sqlite_and_figures.py`, `web/telemetry.html`, `web/map.html`, `web/index.html`):**
  - Standardized exclusively on the authentic, authoritative federal operational identifiers matching the river reach network: `USBR-HOOVER`, `USBR-DAVIS`, and `USBR-PARKER`, correctly designated as `USBR` agency facilities with direct links to the live USBR Lower Colorado Hourly Operations teletype.
  - Eliminated the 6 redundant alias records. Rebuilt and verified `web/data/latest_metrics.json` (73 streamflows, 4 tunnels, 4 canals, 11 reservoirs = 92 clean, deduplicated facilities with zero duplicate IDs or names), `web/data/station_hierarchy.json` (92 stations), and SQLite table `stations` (92 rows). Updated all user-facing labels and export counts across `web/telemetry.html`, `web/map.html`, `web/map_embed.html`, and `web/index.html`.

## [2.3.0] - 2026-11-17 – 2026-11-19
### Removed
- **Redundant OS Fullscreen Toggle & Remote Desktop Spaces Glitch (`web/index.html`):**
  - Removed the redundant `Toggle Fullscreen` button from the primary sidebar and eliminated `document.documentElement.requestFullscreen()` and `fullscreenchange` event listeners.
  - Calling the HTML5 Fullscreen API on macOS triggers Quartz WindowServer to spawn a brand-new Mission Control Virtual Space (e.g. Space 2) and horizontally slide the window over, which breaks remote desktop sessions (Apple Screen Sharing, VNC, Chrome Remote Desktop, Microsoft RDP) whose display capture buffer remains pinned to Desktop 1, leaving users stranded staring at Finder or background windows.
  - Native window maximization is natively supported via the operating system (`Ctrl+Cmd+F`, `F11`, or `Option`-clicking the green macOS window circle to zoom without creating a new Space).

### Fixed
- **Flow Schematic Card Text Overflows & Realistic Nevada Boundary Geometry (`web/pipeline.html`):**
  - *Text Overflow Elimination:*
    - `card-green-river`: Expanded bounding rect width from 250px to 260px and refined subtitle text to `Upper Green: 3.60 MAF • ~40% of Powell Inflow` (computed length 209.6px), transforming a prior 16.6px text overflow into a comfortable 38.4px internal right margin.
    - `legend-box`: Expanded bounding rect width from 240px to 258px and height to 182px. Refined mass-balance formula line to `Mass-Balance: Mainstem + Tribs − Divs − Losses` (computed length 189.8px), converting a prior 8.7px text overflow into a generous 52.2px internal right margin, while guaranteeing $\ge 34.3\text{px}$ margin across all legend items and preserving a 12px open buffer before `card-green-river`.
    - *Virgin River Clearance:* Shifted text labels to $x = 348$ and flow badge to $x = 290$, creating a clean 12px clearance from the 114th meridian line.
    - *State Watermark Placement:* Centered `NEVADA` at $x = 220, y = 340$ inside the Nevada polygon, and positioned `CALIFORNIA` at $x = 130, y = 440$ west of the diagonal border, completely clear of CRA and AAC diversion vectors.
  - *Authentic Cartographic State Boundaries:*
    - *Root Cause Analysis:* Previously, the state boundary layer attempted to connect the 114th meridian at $x = 360$ to Hoover Dam at $x = 480$ by drawing an arbitrary $45^\circ$ diagonal dogleg at $(360, 430) \to (480, 515)$ cutting 120px southeast across dry desert, while the western diagonal border abruptly stopped in mid-air at $(140, 370)$ with zero northern or western borders drawn. This created a jagged, unnatural notch that distorted the geography of Nevada.
    - *Surgical Resolution:* Rendered authentic, recognizable state boundaries conforming to true western geography:
      1. Drawn the 114th meridian as a continuous, straight vertical line from 42° N ($y = 82$) through the Utah/Arizona corner ($y = 351$) straight down to Lake Mead ($y = 520$).
      2. Connected Lake Mead gracefully into Hoover Dam $(480, 561)$ via a smooth thalweg curve (`M 360,520 Q 405,535 480,561`).
      3. Maintained the Colorado River thalweg as the NV-AZ border from Hoover Dam to the southern tip of Nevada $(480, 580)$ and as the CA-AZ border down to Mexico $(480, 671)$.
      4. Rendered the NV-CA diagonal border from the southern tip of Nevada $(480, 580)$ northwest in a continuous straight trajectory to Lake Tahoe $(80, 250)$ at a natural $38^\circ$ cartographic azimuth.
      5. Drawn the 120th meridian western border from Lake Tahoe $(80, 250)$ due north to the 42nd parallel $(80, 82)$.
      6. Extended the 42nd parallel northern border across the top from $(80, 82)$ to $(1240, 82)$.
    - Restores the authentic, unmistakable 5-sided geometric silhouette of the State of Nevada.
  - *Automated CDP Verification Suite (`scripts/verify_schematic_text_and_borders.js`):* Validated 100% test pass rate across text margins ($\ge 34.3\text{px}$), elimination of the 430 dogleg, continuity of the 114th meridian, and clean polygon closure. Captured visual verification artifacts: `verified_schematic_nevada_exact.png`, `verified_schematic_nevada_v2.png`, and `verified_schematic_realistic_borders.png`.
- **Richards–Baker Flashiness X-Axis Label Bleed & Auto-Rotation Resolution (`web/ml_analysis.html` Card 1):**
  - *Root Cause Analysis:* Chart.js auto-rotation algorithm detected that the 60px tick label `'Steady / Dam'` exceeded the default horizontal tick spacing ($\sim 44\text{px}$ across 11 intervals from 0.0 to 1.0). In the absence of explicit rotation constraints, Chart.js automatically rotated the x-axis tick scale by $23.2^\circ$ (`labelRotation = 23.2`). Whenever `labelRotation > 0`, Chart.js unconditionally enforces `textAlign: 'right'`, which bypassed the intended `align: 'inner'` constraint. Consequently, `'Steady / Dam'` was anchored at the origin ($x=89.7\text{px}$) and rendered backwards to the left ($x \approx 34\text{px}$), bleeding across the vertical Y-axis boundary line and colliding directly with the Y-axis label column (`0.0 MAF`).
  - *Surgical Resolution:* Added explicit `maxRotation: 0` and `minRotation: 0` to Card 1's `scales.x.ticks`. Enforcing zero rotation restored Chart.js's native `align: 'inner'` evaluation, setting `textAlign: 'left'` for the first tick ($x=0.0$). The label `'Steady / Dam'` now anchors at exactly $x = 89.72\text{px}$ and renders horizontally to the right into the chart interior, establishing complete zero-overlap separation from the Y-axis numbers. In addition, eliminating slanted tick text expanded the usable vertical chart plotting height by 23px.
  - *Automated CDP Verification Suite (`scripts/verify_baker_flashiness_axis.js`):* Validated `labelRotation === 0`, `steady.textAlign === 'left'`, `steady.realX >= chartArea.left`, and clean right-boundary clearance for `Desert Flash` across standalone `ml_analysis.html` and embedded `index.html?tab=ml` viewports (1440x900, 1024x768, 800x600). Saved verified visual artifact `verified_baker_flashiness_axis_fixed.png`.
- **3D Terrain Camera Subsurface Penetration & Light Blue Screen Freeze (`web/app.js`, `web/cameraFlight.js`):**
  - *Root Cause Analysis:* When flying to high-altitude mountain streamflow stations (e.g., Baker Gulch `09010500` at ~2,700m / 8,900 ft elevation) and zooming in, an elevation freeze flag (`map._elevationFreeze = true;`) left over from prior pan/animation code permanently blocked MapLibre GL JS v4.7.1 from updating `this.transform.elevation` with the station's actual terrain elevation. In addition, MapLibre's native `easeTo` routine sets `this._elevationFreeze = true` on animation start but checks `freezeElevation` before unfreezing, leaving the freeze active when omitted. Consequently, zooming in drove the camera eye below the terrain surface ($alt < groundElev$). Due to OpenGL backface culling, the underside of mountain terrain polygons rendered invisible, displaying only the clear light-blue sky/fog background. Raycasting against the underground ground point either divided by zero or produced NaN, crashing camera event handlers and preventing the user from zooming out or moving without refreshing the page. Furthermore, an unconstrained `movestart` listener in `onPanStart` was inadvertently intercepting programmatic `safeFlyTo` animations and immediately resetting flight state to `idle`.
  - *Surgical Resolution:*
    - Removed manual `map._elevationFreeze = true` overrides across `web/app.js` and `web/cameraFlight.js`, allowing MapLibre's continuous terrain elevation sampler to track actual ground elevation under the camera focus.
    - Added explicit `map._elevationFreeze = false` in `safeEaseTo` `onEnd` and `stopFlight` handlers to guarantee elevation updates resume smoothly after any camera transition.
    - Updated `onPanStart(e)` with an explicit user event guard (`if (e && e.originalEvent && CameraStateMachine.getMode() === 'flyto')`) so that only genuine user mouse/touch drags pre-empt flight, preventing programmatic flights from cancelling themselves on start.
    - Replaced direct mutation of internal MapLibre transform elevations in vertical elevator keys (`Q`/`E`) with native smooth zoom adjustments (`map.setZoom(...)`), preventing view matrix corruption.
    - Configured explicit map bounds envelopes (`minZoom: 4.5`, `maxZoom: 18.5`, `maxPitch: 80`) in `initMap()`, preventing sub-polygon over-zoom clipping while allowing full macro basin overviews and dramatic 3D oblique viewing angles.
  - *Automated CDP Verification Suite:*
    - `scripts/verify_camera_controls_and_nobounce.js`: 4/4 tests passed (zero zoom bounce on load, instant keyboard flight, checkbox isolation, smooth preset flight).
    - `scripts/test_upgraded_camera_controls.js`: 14/14 tests passed (FSM mode transitions, manual preemption, invalid center NaN guard, pitch ceiling, trackpad disambiguation, wheel rotation, navigation zoom button interception).
    - `scripts/verify_panning_altitude_stability.js`: 4/4 tests passed (mouse drag pan altitude stability, keyboard cruising with zero zoom pumping, obstacle clearance floor, 2D/3D clean round-trip).
    - `scratch/verify_camera_fix_end_to_end.js`: Verified deep zoom (zoom 11 to 18) at high-altitude stations (Baker Gulch `09010500` at ~4,013m terrain, camAlt +4,216m, clearance strictly positive; Grand Canyon Phantom Ranch `09402500` at 1,108m canyon floor, clearance +1,091m) with immediate, unhindered zoom out back to macro basin view (zoom 5.5).
- **Chart Label Framing & Zero-Buffer Collision Elimination Across All Cards (`web/ml_analysis.html`, `web/index.html`, `web/sankey.html`):**
  - *Glen Canyon Dam Closes Label Clearance (`web/ml_analysis.html` Card 3):* Resolved zero-buffer collision where `1963: Glen Canyon Dam Closes` was jammed directly against the 25 MAF top gridline and canvas ceiling. Enclosed label in a solid white protective badge pill with a 1px slate border (`#cbd5e1`), centered typography, and an 8px vertical buffer below the 25 MAF gridline. Increased layout padding top from 8px to 16px across Cards 2, 3, and 4 (and 14px in Card 1), ensuring ample buffer above top gridlines and complete separation from HTML legends and card headers.
  - *Comparative Stacked Bars Vertical Buffer (`web/sankey.html`):* Restructured Bar 1 and Bar 2 track and marker hierarchies. Re-anchored Lee's Ferry callout markers to dedicated relative wrappers with generous spacing (`mt-2`, `mt-7`, `my-3`), providing 20–25px of clear whitespace around markers and preventing any overlap with the paradox connector bracket or bar titles.
  - *Universal Horizontal Threshold Top Guard (`web/index.html`):* Updated `horizontalThresholdPlugin` with an automatic top-boundary collision guard (`if (textY - (fontSize / 2) < top + 6) textY = yPos + fontSize + 4;`), guaranteeing at least 6–8px buffer from the top chart border for any threshold lines near the scale ceiling.

### Changed
- **Purge of Chart-Type Technical Jargon & Elimination of Continuous Scroll Redundancy (`web/sankey.html`, `web/index.html`, `web/ml_analysis.html`, `web/map.html`):**
  - *Elimination of Continuous Scroll:* Removed the redundant `[ ☰ View Both (Continuous Scroll) ]` sub-tab button and `both` mode from `web/sankey.html`. Retained strictly the two crisp toggleable sub-tabs for clean single-view focus.
  - *Domain Integrity over Technical Chart Jargon:* Replaced generic visualization jargon ("Sankey", "Heatmap", "Bubble") across all user-facing headers, tabs, tooltips, and badges with precise domain descriptions of what the charts actually show:
    - `Unified Sankey Diagram` $\to$ **`Inflows to Consumptive Depletions`** (`web/sankey.html`).
    - `Physical Runoff vs. Paper Allocations` $\to$ **`Physical Runoff vs. Statutory Paper Claims`** (`web/sankey.html`).
    - `← Back to Unified Sankey Flow Diagram` $\to$ **`← Back to Inflows & Consumptive Depletions`** (`web/sankey.html`).
    - `River Flow Schematic` $\to$ **`River Flow Network`** (`web/index.html` sidebar).
    - `Monthly Heatmap (All 12 Months)` $\to$ **`12-Month Water Level Matrix`** and `Seasonal Envelope (Clean)` $\to$ **`Seasonal Elevation Envelope`** (`web/index.html`).
    - `Click any river bubble or curve below to highlight` $\to$ **`Click any tributary or flow curve below to inspect`** (`web/ml_analysis.html`).
    - `Bubble Size = % of Powell Inflow` $\to$ **`Relative Volume = % of Powell Inflow`** (`web/ml_analysis.html`).
    - `Open Annual Water Budget Diagram` $\to$ **`Annual Water Budget & Allocations`** (`web/map.html`).
  - *Automated Verification (`scripts/verify_tabs_and_chart_descriptions.js`):* Validated absence of `subtab-btn-both`, clean rendering of the two sub-tabs, seamless tab toggling, and verified updated domain terminology across all pages; saved verified visual artifact `verified_sankey_clean_tabs_no_continuous_scroll.png`.
- **Harmonization of Statutory Paper Over-Allocation vs. Active Storage Drawdown (`web/index.html`, `web/sankey.html`):**
  - *Explicit Conceptual Bridge:* Eliminated researcher confusion caused by dual overdraft figures by clearly separating legal paper rights from physical reservoir drawdown across headers and cards:
    - **Full Statutory Paper Over-Allocation:** `+6.60 MAF/yr` ($19.10\text{ MAF paper claims \& system losses} - 12.50\text{ MAF modern river supply}$, or `+5.00 MAF/yr` paper gap without evaporation). Represents the structural deficit if all Upper and Lower Basin paper entitlements are fully exercised.
    - **Active Storage Drawdown:** `-2.05 MAF/yr` ($14.45\text{ MAF actual current depletions} - 12.40\text{ MAF natural runoff}$). Represents the actual physical rate at which Lake Mead and Lake Powell are currently losing storage because Upper Basin depletions are currently ~4.5 MAF.
  - *Overview Top Ticker (`web/index.html`):* Updated horizontal ticker from generic `OVERDRAFT: -6.60 MAF/yr` to explicit dual metrics: `RIVER SUPPLY: 12.50 MAF | 1922 COMPACT: 15.00 MAF | STATUTORY PAPER: 17.50 MAF | PAPER OVER-ALLOCATION: +6.60 MAF/yr | ACTIVE STORAGE DRAWDOWN: -2.05 MAF/yr`.
  - *Overview Card 1 (`web/index.html`):* Updated right callout card from `Physical Overdraft` to `Full Paper Over-Allocation: +6.60 MAF/yr` noting `Active Drawdown: -2.05 MAF`, and calibrated the takeaway sentence to state that legal claims exceed runoff by 5.00 MAF/yr (expanding to +6.60 MAF/yr with uncounted evaporation) while actual physical reservoir drawdown is -2.05 MAF/yr.
  - *Water Budget Header & Context Banner (`web/sankey.html`):* Renamed header pill from `Consumptive Overdraft` to `Active Storage Drawdown: -2.05 MAF/yr` and added an explicit bridge in the context banner contrasting the physical drawdown with the +6.60 MAF full statutory paper over-allocation.
- **Streamlined Gaging Registry & Elimination of Redundant KPI Grid (`web/telemetry.html`):**
  - Removed the 4 redundant top KPI summary cards (`Total Active Nodes`, `Streamflow Gages`, `Diversions & Tunnels`, `Storage Reservoirs`) which duplicated the filter pills directly below them.
  - Elevated the station category filter pills (`All Facilities (98)`, `1922 Compact Divide (1)`, `Basin Sentinels (23)`, `Upper Basin (42)`, `Lower Basin (37)`, `Tunnels & Canals (8)`, `Reservoirs (11)`) and search filters directly to the top of the container, bringing the 98-row gage database ~120px higher on screen and making station telemetry instantly accessible without scrolling.
  - Updated `updateKpis()` in JavaScript with defensive element guards for zero console errors.
- **Dual Stacked Comparative Bar Glitch Resolution (`web/sankey.html`):**
  - *San Juan Segment Clearance:* Re-anchored San Juan segment text in Bar 1 to `justify-start pl-1` enclosed in a solid protective white pill badge (`San Juan 2.1`), establishing a 138.25px open clearance before the 12.50 MAF modern drought red dashed line and completely eliminating line-through-text collisions.
  - *Tributary Text Truncation Cleanup:* Removed truncated overflow labels (`Dolores: ...`, `Lower Tri...`, `L...`, `V.`) on narrow segments ($<6\%$ width); applied clean unclipped labels (`Dolores`, `Lower Tribs`) and preserved full hover inspection cards and color swatches.
  - *Lee's Ferry Marker Vertical Clearance:* Repositioned the Lee's Ferry callout marker below Bar 1 to `top-full mt-1.5` with dedicated vertical padding (`pb-5`), creating a 26px clear gap above the paradox connector bracket and eliminating overlap with the Bar 1 bottom border.
  - *Scale & Demand Labels:* Clarified Bar 1 supply as `15.20 MAF/yr (20th-century historical avg • Drought: 12.50 MAF)` and Bar 2 demand as `19.10 MAF/yr (Paper Over-Allocation: +3.90 to +6.60 MAF)`.
- **Automated Verification Suite (`scripts/verify_streamlined_discrepancies.js`):**
  - Executed automated Chrome DevTools Protocol verification: verified ticker text, 138.25px San Juan clearance, 26px Lee's Ferry gap, 0 redundant cards on telemetry, and clean elevation profile rendering; saved visual artifacts: `verified_overview_ticker_bridge.png`, `verified_sankey_header_and_stacked_bars.png`, `verified_telemetry_streamlined_top.png`, and `verified_profile_granby_and_tribs.png`.

- **Canonical Compact Math Standardization & Single-Page Editorial Overview Redesign (`web/index.html`, `web/law.html`, `web/map.html`, `web/ml_analysis.html`):**
  - *Standardized Basin Compact Math:* Reconciled discordant math citations across the site into one unified, legally and physically airtight mathematical ladder:
    - **Modern River Supply (2000–2026):** `12.50 MAF/yr` (historical mean: `15.20 MAF/yr`)
    - **1922 Core Compact (Art. III.a):** `15.00 MAF/yr` (7.50 Upper + 7.50 Lower)
    - **Statutory Paper Rights Total:** `17.50 MAF/yr` (+1.00 Art. III.b Lower Expansion + 1.50 Mexican Water Treaty Art. 10)
    - **Total System Demand / Pull:** `19.10 MAF/yr` (17.50 statutory entitlements + 1.60 reservoir evaporation & transit losses)
    - **Statutory Paper Deficit:** `+5.00 MAF/yr` ($17.50 - 12.50$)
    - **Physical Structural Overdraft:** `+6.60 MAF/yr` ($19.10 - 12.50$)
  - *Harmonized Law Modals & ML Baseline:* Fixed contradictory citations in `web/law.html`, `web/map.html`, and `web/index.html` where text cited 16.5 MAF while stat cards cited 17.5 MAF; clarified Card 3 of `web/ml_analysis.html` as the 16.5 MAF core treaty line (7.5 Upper + 7.5 Lower + 1.5 MX) noting the full 17.5 MAF statutory apportionment.
  - *Single-Page Overview Dashboard (`web/index.html`):* Replaced the sprawling 4,500px vertical scrolling presentation deck (Acts 1–4) with a clean 2x2 grid of four high-contrast, easy-to-read charts with exactly one clear takeaway sentence per card, fitting desktop viewports with zero scrolling (`scrollRatio = 1.00`):
    - **Card 1 (The Allocation Gap):** Comparative horizontal ledger bars displaying 12.50 MAF vs 15.00 MAF vs 17.50 MAF vs 19.10 MAF, with +5.00 MAF paper deficit and +6.60 MAF physical overdraft callouts.
    - **Card 2 (The Seasonal Engine):** 365-day hydrograph canvas (`#chart-seasonal-engine`) with view toggles (`[ 5 Regimes ]` / `[ Inflow vs Demand ]`) and spring peak / winter base benchmarks.
    - **Card 3 (90-Year Reservoir Buffer Depletion):** System storage timeline (1935–2026) canvas (`#chart-macro-overview-timeline`) with 60 MAF capacity, 1984 peak (56.2 MAF), today (17.7 MAF / 29.5%), and Min Power Pool limit (6.0 MAF).
    - **Card 4 (Consumptive Use by State & Sector):** Depletion bar chart canvas (`#chart-state-use`) with clean Y-axis in `MAF`, >80% agriculture vs 15% municipal breakdown, and 1901 senior rights priority callout.
  - *Basin Core Accounting Ticker:* Collapsed the previous 2-tier header banner into a compact single-line horizontal ticker directly in the header bar showing: `RIVER SUPPLY: 12.50 MAF | 1922 COMPACT: 15.00 MAF | STATUTORY PAPER: 17.50 MAF | TOTAL PULL: 19.10 MAF | OVERDRAFT: -6.60 MAF/yr`.
  - *Complete Elimination of Redundant Sub-Navigation & Footers:*
    - Removed redundant bottom `DEEP-DIVE ANALYSIS` button dock and `Editorial Footer` from `web/index.html` (all sections and notebooks are permanently accessible in the left navigation sidebar).
    - Stripped redundant cross-tab navigation buttons from individual cards (`Budget Sankey →`, `Lake Levels →`, `Pipeline →`) and modals (`[Law of River ↗]`).
    - Stripped redundant embedded breadcrumb navigation links from `web/sankey.html` (`← Back to Colorado River Basin`, `View River Reach Network Diagram →`, and bottom exploration strip), `web/pipeline.html` (`← Back`, `Macro Sankey Water Budget →`), `web/telemetry.html` (`[Map View]`, `[Flow Network]`, `[Water Budget]`), `web/ml_analysis.html` (`← Back to Map`), and `web/map_embed.html` (`Full Ledger ↗`).
  - *Automated CDP Verification (`scripts/verify_overview_redesign.js`):* Validated single-page layout (0 vertical scroll on desktop, `scrollRatio = 1.00`), zero console errors, 100% canvas rendering, view toggle switching, and exact math verification; captured high-resolution verification artifact `verified_overview_single_page.png`.

### Fixed
- **Comprehensive Elimination of Text Overlaps, Card Collisions & Boundary Clipping (`web/ml_analysis.html`, `web/pipeline.html`, `scripts/verify_four_visual_fixes.js`):**
  - *Bug 1 (Travel Time Arrival Curve Labels - `web/ml_analysis.html`):* Upgraded `card2RiverLabelsPlugin` to render solid protective white badge pills (`ctx.fillStyle = '#ffffff'`, `ctx.roundRect`, `ctx.lineWidth = 1.2`, subtle drop shadow) behind all river labels. Shifted San Juan label from $x=1.5$ to $x=2.0$ with $y=-14\text{px}$ offset, completely eliminating collisions with the Dirty Devil dot at $(1, 0.48)$ and blocking all rising snowmelt curves from slicing across glyphs.
  - *Bug 2 (Legend Box vs. Green River Tributary Card Collision - `web/pipeline.html`):* Reduced `#legend-box` width from 270px to 240px ($x \in [35, 275]$) and shifted `#card-green-river` to `translate(305, 34)` with `width="250"`, establishing a clean 30px buffer margin ($[275, 305]$) that completely eliminates legend box overlay on Green River text.
  - *Bug 3 (Headwaters Card ViewBox Boundary & Text Overflow - `web/pipeline.html`):* Shortened title to `CO River Headwaters (4.00 MAF)` and subtitle to `Continental Divide • Rocky Mtn NP`, fitting all text comfortably within the 230px card at `translate(1015, 34)` with 29px internal right clearance and a guaranteed 37px right margin before the 1280px viewBox edge.
  - *Bug 4 (Hoover Dam, Parker Dam & Lake Havasu, and CAP Badge Collision - `web/pipeline.html`):* Enclosed Parker Dam and Lake Havasu in a dedicated white card badge (`#card-parker`, `width="195", height="32"`) at `translate(515, 570)`. Moved the Central Arizona Project (CAP) inspection badge from $x=600$ to $x=775$, providing a 59.4px clearance past the Parker Dam card. Lowered the CAP pipe to $y=608$ and Channel Transit Loss to $y=626, 634$, positioned Grand Canyon Reach text in open space at $y=497, 509$, and centered Imperial Dam text at $y=656$, completely separating all Lower Basin nodes.
  - *Automated CDP Verification Suite (`scripts/verify_four_visual_fixes.js`):* Verified 100% pass rate across geometry metrics (`legendGreenClearance: 22.6px`, `headCardSvgRightMargin: 37.1px`, `headTextInsideCard: 29.1px`, `hooverParkerGap: 10.6px`, `parkerCapBadgeClearance: 59.4px`) and captured verified visual artifacts: `verified_bug1_card2_arrival_badge.png`, `verified_bug2_green_river_legend.png`, `verified_bug3_headwaters_card.png`, and `verified_bug4_hoover_parker_cap.png`.

- **Systematic Resolution of 7 Visual & Axis Formatting Glitches across Dashboard (`web/pipeline.html`, `web/sankey.html`, `web/ml_analysis.html`, `web/index.html`):**
  - *Bug 1 (River Schematic View):* Elevated Hoover Dam card from `translate(515, 538)` to `translate(515, 520)` with `height="38"` ($y$-span $[520, 558]$), establishing a guaranteed 25px vertical clearance above Parker Dam text ($y=583$); moved Virgin River label and badge up to $y \in [438, 474]$ ($y$-span $[457, 474]$), providing 24px clearance above Lake Mead Evaporation plume ($y=498$); shortened SNWA diversion text and pulled diversion arrow back to $x=290$, eliminating text-over-arrow collision.
  - *Bug 2 (Elevation Profile View):* Repositioned Little Colorado card to `translate(460, 180)` ($x \in [460, 612], y \in [180, 212]$) and Virgin River card to `translate(620, 220)` ($x \in [620, 760], y \in [220, 252]$), eliminating 10px horizontal and 14px vertical overlap (now 8px clean separation in both X and Y with adjusted dashed leader lines).
  - *Bug 3 (Dual Stacked Bars):* Separated shared scale axis ticks from text labels (`h-6`, text at `top-0`, tick marks at `bottom-0`), eliminating line-through-text collisions; aligned San Juan segment text left (`justify-start pl-2`) and wrapped in a high-contrast protective badge (`bg-sky-300/85 text-stone-900 px-1 py-0.2 rounded text-[9.5px] font-black shadow-2xs`), ensuring the 12.50 MAF modern drought red dashed line never slices through "2.10"; removed inline truncated letters ("L...", "V.") from ultra-narrow segments ($<20\text{px}$) while preserving hover inspection cards and color stripes.
  - *Bug 4 (Card 2 Travel Time Arrival Curves):* Added 3.5px white stroke halo (`ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 3.5; ctx.strokeText(...)`) to `card2RiverLabelsPlugin` before `ctx.fillText`, ensuring arrival curves cleanly pass behind text labels (`San Juan 1.5d`, `Cisco 3.5d`, `Green 4.5d`, `Yampa 8d`) without slicing through glyphs.
  - *Bug 5 (Card 3 100-Year Cumulative Deficit):* Changed Y-axis `max: 26` to `max: 25` with `ticks.stepSize: 5`, eliminating adjacent 25/26 MAF tick label collision; added `layout.padding.left: 18` preventing rotated Y-axis title `Annual Volume (Million Acre-Feet)` from clipping on the left canvas boundary.
  - *Bug 6 (Card 1 River Regimes Bubble Chart):* Increased `layout.padding.left` from 6 to 18 to prevent rotated Y title from clipping to "An..."; aligned X ticks with `align: 'inner'` preventing "Steady / Dam" from bleeding into the Y-axis gutter.
  - *Bug 7 (Act 3 Macro Basin Storage Timeline):* Added 4px white stroke halo (`ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 4; ctx.strokeText(...)`) to unboxed reference lines (`noBox: true`) in `horizontalThresholdPlugin`, preventing data curves from slicing through `Min Power Pool Limit (~6.0 MAF)`.
  - *Automated Verification Suite (`scripts/verify_seven_image_glitches.js`):* Validated 100% pass rate via headless Chrome CDP testing; saved verified visual screenshot artifacts: `verified_bug1_schematic_hoover_virgin.png`, `verified_bug2_elevation_cards.png`, `verified_bug3_sankey_stacked_bars.png`, `verified_bugs4_5_6_ml_analysis.png`, and `verified_bug7_macro_timeline_min_power.png`.

### Added
- **Systematic Graphics Glitch Elimination & 5-Tier SVG Layer Hierarchy (`web/pipeline.html`, `web/editorial.css`, `scripts/verify_graphics_cleanliness.js`):**
  - *Root Cause Diagnosis & Structural Framework:* Decomposed graphics glitches across the platform into their four physical root causes in web SVG rendering:
    1. **DOM Painter's Algorithm Layer Inversion:** SVG has no CSS `z-index`; elements render strictly in document order. River lines drawn later in the file sliced directly on top of earlier label cards and text.
    2. **Fixed-Width Bounding Box Font Overflow:** Hardcoded box widths (e.g. 90px) paired with dynamic fonts that measured 111px across browser engines, causing text to spill over card edges.
    3. **Geometric Feature Collision:** Positioning label cards directly on top of the descending thalweg slope rather than in open white-space pockets.
    4. **ViewBox Margin & Anchor Misalignment:** Labels placed within $<30\text{px}$ of viewBox boundaries with unconstrained anchor offsets, causing drop shadows and text to clip against viewport edges.
  - *5-Tier SVG Layer Hierarchy Architecture:* Re-architected `#profile-svg` in `web/pipeline.html` into 5 strictly ordered document groups:
    1. `<g id="layer-grid-and-axes">`: Elevation guides (0 to 14,000 ft) and distance ticks (0 to 1,400 mi).
    2. `<g id="layer-terrain-fills">`: Mountain slope gradient fill polygon.
    3. `<g id="layer-flow-vectors">`: Tributary dashed lines and proportional mainstem thalweg paths.
    4. `<g id="layer-facilities-and-nodes">`: Reservoir pool bathtubs, dam vertical crests, and USGS sentinel gage dots.
    5. `<g id="layer-labels-and-callouts">`: **Topmost foreground tier** containing all label cards, badges, callout leader lines, and the MAF legend, physically guaranteeing that no vector line or pool can ever slice across text again.
  - *Lake Granby Fix:* Offset the Lake Granby card into the open white space to the right of the Baker Gulch descent at $x=122, y=234$ with width expanded to 116px (text = 92px, 12px margin on both sides), connected cleanly to the Granby Dam crest at $(113, 271)$ via a subtle blue leader callout line. Replaced the orphaned rectangle with an aligned reservoir pool bathtub at 8,280 ft contour.
  - *Blue Mesa Dam & Reservoir Fix:* Enclosed `Blue Mesa` inside a dedicated white card badge pill (`width="60" height="18"`) at $x=152, y=295$, safely positioned in the clear pocket between the descending mainstem river ($x \le 145$) and the vertical Gunnison tributary line ($x=226$).
  - *Flaming Gorge & Navajo Dam Badges:* Enclosed both dam labels in clean white card badges (`width="80"` and `width="74"`) offset safely to the left of their vertical tributary lines.
  - *Hoover Dam & Lake Mohave Separation:* Repositioned Hoover Dam text to $x=754, y=558$ with `text-anchor="end"`, cleanly separating it from Lake Mohave text centered at $x=785, y=555$ and eliminating label collision above the dam crest.
  - *Schematic View Margin Protection:* Reduced Colorado River Headwaters card width from 250px to 235px (`width="235"` at $x=1015$, total $x=1250$), establishing a guaranteed 30px right margin within the 1280px viewBox and assigning unique IDs (`card-headwaters`, `card-green-river`).
  - *Universal Editorial Cartographic Halo Standard (`web/editorial.css`):* Added Section 6 to `editorial.css` enforcing `paint-order: stroke fill; stroke: #ffffff; stroke-width: 3.5px;` and tabular figures across SVG typography site-wide.
  - *Automated Regression Suite (`scripts/verify_graphics_cleanliness.js`):* Built a Chrome DevTools Protocol test script validating: strict 5-tier layer ordering, 0 text overflows, and Headwaters viewBox boundary clearance (100% pass rate). Verified visual artifacts: `verified_lake_granby_v2.png`, `verified_hoover_mohave.png`, and `verified_full_profile.png`.
- **Flow Replay Dynamic Line Widths & Pulsing Gage Dots (`web/flowReplay.js`, `web/app.js`):**
  - Enhanced river reach `weight` calculation across all reach categories (Mainstem, Major Tributaries, Canals, and Minor Tributaries) using dynamic $\sqrt{Q}$ scaling ($w = 2.8 + \sqrt{Q} \cdot 0.095$ for mainstem, $2.0 + \sqrt{Q} \cdot 0.085$ for major tributaries, $1.8 + \sqrt{Q} \cdot 0.065$ for canals), producing crisp, hydrologically accurate line width variations across time steps.
  - Mapped USBR Lower Colorado Dam reaches (`USBR-HOOVER`, `USBR-DAVIS`, `USBR-PARKER`) to active dynamic USGS tailwater stations (`09404200` Diamond Creek and `09429100` Palo Verde Dam), ensuring the entire Lower Basin mainstem visibly pulses during flow replay instead of remaining static.
  - Enabled dynamic `circle_radius` and `circle_color` scaling on `streamflow-gauges-circle` and `streamflow-gauges-casing` via `coalesce` inside MapLibre's top-level zoom interpolation, restoring 60 FPS dot scaling and health color pulsing during temporal replay while preserving crisp baseline dots in live mode.
  - Added defensive `['coalesce', ['get', 'weight'], fallback]` across all river line layers in `web/app.js`, preventing expression failures from missing properties.
  - Added an active replay guard in `applyLiveHydrology` so background telemetry sync intervals never overwrite the active temporal replay buffer.
- **Control Panel Responsive Layout & Unclipped Sentinel Strip (`web/map.html`, `web/map_embed.html`, `web/style.css`):**
  - Resolved text clipping where "Gila and beyond" was hidden: Split the control panel into three distinct, dedicated rows:
    1. *Top Row:* Header kicker, 7D/30D period pills, localized Mountain Time timestamp, relative offset, and `✕` close button.
    2. *Middle Row:* Dedicated hydrologic storytelling strip (`#replay-sentinel-strip`) spanning full container width, cleanly displaying all sentinel facilities (`San Juan` $\to$ `Lake Powell` $\to$ `Lees Ferry` $\to$ `Lake Mead` $\to$ `Gila River`) with units and zero clipping.
    3. *Bottom Row:* Transport controls (`⏮ -1h`, `▶ Play`, `+1h ⏭`), scrubber slider with time ticks, and speed pills.
  - Expanded replay bar width from 840px to `min(880px, calc(100vw - 32px))` and made the sentinel strip scrollable on smaller screens (`overflow-x: auto; scrollbar-width: none;`).
- **Elimination of Confusing LIVE Button (`web/map.html`, `web/map_embed.html`, `web/style.css`):**
  - Removed the confusing green `[ LIVE ]` button that was situated awkwardly next to speed controls (`1h/s`, `4h/s`, `12h/s`).
  - Added a clean `Speed:` label to the speed group.
  - Made the "Live" tick at the right end of the scrubber slider directly clickable (`onclick="FlowReplayEngine.jumpToLive()"`), providing a natural timeline affordance with zero visual ambiguity.
- **Automated Flow Replay Verification Suite (`scripts/verify_flow_replay_fixes.js`):**
  - Built an automated Chrome DevTools Protocol verification script running headless Chrome with WebGL.
  - Verified 100% pass rate: verified absence of `replay-live-btn`, verified all 3 sentinel pills unclipped and fully rendered, verified dynamic river `weight` and gage radius changes across steps, verified 30D matrix switching, verified clean restoration of live GeoJSON baseline on close, and verified 0 MapLibre console errors across both `map.html` and `map_embed.html`.
  - Visual verification artifact: `verified_flow_replay_active.png`.
- **Restoration of Streamflow Gage Dots & MapLibre Radius Expression Repair (`web/app.js`):**
  - Diagnosed and resolved the root cause of missing gage dots: `circle-radius` on `streamflow-gauges-casing` and `streamflow-gauges-circle` previously wrapped an `interpolate` zoom expression inside a `coalesce` block with nested dynamic `match` expressions as stop outputs. MapLibre GL JS rejected both layers during `map.addLayer` with `Error: "zoom" expression may only be used as input to a top-level "step" or "interpolate" expression`, completely preventing the gage dots from rendering when flow badges were off.
  - Converted `circle-radius` on both layers to spec-compliant top-level linear zoom interpolation (`[interpolate, [linear], [zoom], 4, 3.5, 7, 5.0, 10, 7.0, 13, 9.0]` for the inner core dot and 1.5px larger for the white outer casing).
  - Maintained distinct station color coding on `streamflow-gauges-circle` matching the legend (`#0284c7` for streamflow gages, `#0891b2` for tunnels, `#059669` for canals, `#dc2626` for reservoirs).
  - Verified 100% layer creation and rendering: all 89 point facilities render cleanly above river reaches with full hover inspection tooltips and click popups, independent of whether flow badges are toggled.
- **Camera Controls Immediate Focus & Interaction (`web/cameraFlight.js`, `web/app.js`, `web/index.html`, `web/map.html`, `web/map_embed.html`):**
  - Eliminated the requirement to click the map before camera controls respond:
    - Fixed `isInputElementFocused()` in `cameraFlight.js`: Textbox check now isolates text-entry inputs (`text`, `search`, `password`, `email`, etc.) and no longer treats layer checkboxes (`<input type="checkbox">`), range sliders, or radio buttons as typing fields that lock out keyboard flight controls.
    - Fixed premature flight cancellation in `cameraFlight.js`: Removed `window.addEventListener('focus', stopFlightOnBlur)` which was incorrectly clearing keys and stopping animation whenever the canvas or window received focus.
    - Fixed self-cancelling flight loop: Guarded `onPanStart` with `if (CameraStateMachine.getMode() === 'flight') return;` so camera movements produced by keyboard flight do not falsely trigger manual pan aborts via MapLibre's `movestart` event.
    - Initialized keyboard flight controls and trackball widget synchronously upon map creation in `initMap()` rather than waiting for async vector tile and style download inside `map.on('load')`.
    - Automated iframe keyboard and focus synchronization in `index.html`: `setTab('map')` immediately focuses the iframe, hovering over `#section-map` focuses the map, and navigation keys (`WASD`, `Arrows`, `QE`, `ZX`) are forwarded into `iframe.contentWindow` seamlessly.
- **Zero Zoom-Bounce on Map Load & Elimination of Parabolic Flight Curves (`web/cameraFlight.js`, `web/app.js`, `web/index.html`):**
  - Eliminated the disorienting "zoom bounce" when loading or switching to the System Map:
    - In `index.html`, `syncMap()` now calls `zoomToPreset('basin', true)` with `instant = true`, instantly placing the camera via `jumpTo` with zero animation delay and zero zoom oscillation.
    - Added `duration: 0, animate: false` to MapLibre constructor `fitBoundsOptions`.
    - Replaced parabolic `flyTo` flight curves with direct linear `safeEaseTo` (or instant `jumpTo`) across `safeFlyTo` in `cameraFlight.js`, presets in `app.js`, and station focusing, ensuring smooth, grounded camera motion with zero parabolic ballooning anywhere on the platform.
- **Automated Anti-Bounce & Responsiveness Verification Suite (`scripts/verify_camera_controls_and_nobounce.js`):**
  - Automated 4-step Chrome DevTools Protocol verification:
    1. Zero zoom bounce on load (15 continuous telemetry samples verified with 0.000 fluctuation).
    2. Instant keyboard flight responsiveness without clicking the map (KeyW tilts pitch immediately from initial state).
    3. Checkbox isolation (layer checkboxes toggle without locking out WASD/Arrows).
    4. Direct linear preset easeTo transition (no parabolic zoom dip/bounce).
    - Verified artifact: `verified_camera_controls_nobounce.png`.
- **Dynamic Layer-Synchronized Map Legend (`web/map.html`, `web/map_embed.html`, `web/app.js`):**
  - Implemented real-time synchronization between Map Layer checkbox toggles and the Map Legend (`syncLegendToLayerToggles`):
    - When any individual layer is turned off (e.g. dams, tunnels, canals, reservoirs, continental divide, basin boundaries, or river reach tiers), its corresponding legend item is immediately removed (`display: none`).
    - When all items in a category are unchecked (such as all three streamflow tiers or all infrastructure features), the category section header is automatically hidden.
    - Station grid items (`Streamflow (79)`, `Reservoirs (11)`, `Tunnels (4)`, `Canals (4)`) dynamically reflect active sub-layers and hide entirely if the main `Active Stations` toggle is disabled.
    - Live Flow Badge (`7,800 cfs`) appears only when the `Flow Data Badges` sub-toggle is active.
    - Topology diagnostics legend displays only the specific active diagnostic layers (Flow Direction, Confluence Junctions, or Reach Nodes) and hides when all are off.
    - Displays a clean notice (`All map layers are currently turned off.`) if the user disables every layer, recovering instantly when any layer is re-enabled.
    - Verified 100% pass rate across all 8 assertions via automated headless Chrome CDP test suite (`scripts/verify_legend_sync.js`).
- **Water Budget Tab Architecture & Dual Stacked Bars Integration (`web/sankey.html`, `web/pipeline.html`):**
  - Relocated the complete "Physical Water Runoff vs. Legal Paper Allocations" dual stacked bar component into `web/sankey.html`, bringing both macro-annual accounting tools (Sankey Flow Diagram and Runoff vs. Paper Allocations) into a unified home on the Water Budget tab.
  - Added a responsive top view switcher: `[ ⇋ Unified Sankey Diagram ]`, `[ ⫸ Physical Runoff vs. Paper Allocations ]`, and `[ ☰ View Both (Continuous Scroll) ]`, allowing users to either toggle views with zero screen clutter or scroll continuously between them.
  - Un-squeezed the Sankey diagram by expanding its canvas container from 650px to 740px height (`min-h-[720px]`, `const height = 740`), providing generous vertical spacing for all 20 nodes and 21 links without crowding.
  - Ported interactive segment hover inspection (`#stacked-detail-strip`), shared 0–20 MAF scale, Lee's Ferry dividers, and the +3.90 MAF structural deficit overhang bracket to `web/sankey.html`.
  - Added deep-link URL parameter support: `?view=stacked` and `?view=both`.
- **Topological River Flow Schematic Full Viewport Expansion (`web/pipeline.html`):**
  - Removed the dual stacked comparison card from `web/pipeline.html`, eliminating the previous `max-h-[46vh]` height restriction.
  - Expanded the river reach schematic SVG container to full viewport height (`h-[calc(100vh-105px)] min-h-[640px]`), allowing the topological schematic to render with optimal scale and clarity.
  - Renamed the primary sub-tab to `Topological River Reach Network`.
- **Automated Topology & Budget Verification Suite (`scripts/verify_topology_and_budget_tab.js`):** Built an automated Chrome DevTools Protocol verification script validating: default topology diagnostics off-state on `map.html` and `map_embed.html`, explicit URL param override (`?topology_junctions=1`), un-squeezed full-height schematic on `pipeline.html`, and full-height Sankey plus interactive stacked bar sub-tab switching on `sankey.html`.
- **Vertical Tributary Inflows & 14,000 ft Elevation Headroom (`web/pipeline.html`):** Redesigned the Longitudinal Elevation Profile so all 6 major basin tributaries drop straight down vertically into their exact confluence river mile along the mainstem fall line:
  - *Green River (4.90 MAF, $w=7.3\text{px}$):* Drops vertically along $x=342$ from the 13,800 ft Wind River Range crest down to Cataract Canyon confluence at 3,880 ft, including Flaming Gorge pool (6,040 ft) and USGS streamgage #09315000.
  - *Gunnison River (2.10 MAF, $w=5.4\text{px}$):* Drops vertically along $x=226$ from 12,000 ft Elk Mtns down to Grand Junction at 4,790 ft, including Blue Mesa Dam.
  - *San Juan River (2.50 MAF, $w=5.8\text{px}$):* Drops vertically along $x=450$ from 11,500 ft San Juan Mtns down to Lake Powell at 3,540 ft, including Navajo Dam.
  - *Little Colorado River (0.25 MAF, $w=2.7\text{px}$):* Drops vertically along $x=540$ from 9,500 ft White Mtns down to Grand Canyon at 2,420 ft.
  - *Virgin River (0.18 MAF, $w=2.5\text{px}$):* Drops vertically along $x=690$ from 9,000 ft Zion Plateau down to Lake Mead at 1,065 ft.
  - *Gila River (0.87 MAF, $w=3.9\text{px}$):* Drops vertically along $x=995$ from 8,000 ft Black Range down to Morelos Dam reach at 105 ft.
  - *Extended Elevation Headroom:* Expanded coordinate space from 10,000 ft to 14,000 ft ($y = 590 - 0.038 \times \text{elev}$, viewBox `0 0 1200 650`), bringing the entire Wind River Range (13,800 ft) inside the chart with 58px headroom.
  - *Pure 2.5D Fall Line & Logarithmic Flow Legend:* Retained pure 2.5D perspective, dropped question mark un-gaged reach hatched bands, and scaled vector widths logarithmically according to $w = 2.0 + 3.0 \cdot \ln(1 + \text{MAF})$ with an explanatory legend.
- **Cartographic Text Halos & White Card Backing Standard (`web/pipeline.html`):**
  - Universal SVG text rule: `paint-order: stroke fill; stroke: #ffffff; stroke-width: 3.5px; stroke-linecap: round; stroke-linejoin: round;` preventing text from blending into river vectors, gradients, or grid lines.
  - Prominent white card backing pills (`fill="#ffffff" fill-opacity="0.96"` with drop shadows) for Green River ("Wind River Range Headwaters • 13,800 ft"), Gunnison River, San Juan River, Little Colorado, Virgin River, Gila River, Lake Powell, Lake Mead, Lake Granby, Lake Mohave, and Lake Havasu.
  - Darkened state watermark labels to bold `#334155` with 4px white stroke halos.
- **Bidirectional Station Highlighting in Bottom Gage Ledger (`web/app.js`, `web/style.css`):**
  - Clicking any streamflow gage, dam, reservoir, or diversion canal on the 3D map highlights its corresponding row in the bottom tray (`.active-station-row`, `#e0f2fe` background with `#0284c7` border) and smoothly auto-scrolls the table to that row.
  - Clicking any table row flies the camera smoothly to that facility.
- **River Flow Schematic Sub-Tabs: Topological Schematic & Longitudinal Elevation Profile (`web/pipeline.html`):** Integrated the 1,400+ river mile longitudinal elevation profile from `web/profile_mockup.html` directly into `web/pipeline.html` as a dedicated second sub-tab (`Longitudinal Elevation Profile (1,400+ mi)`). Added a top sub-tab switcher allowing users to toggle seamlessly between the topological river conveyance schematic and the hypsometric fall line profile. The elevation tab features 2D Orthographic vs. 2.5D Inflow Projection view toggles, Question Mark (?) un-gaged stretch diagnostic toggles (Lake Powell 105-mi slackwater pool, Grand Canyon 137-mi granite gorges with 18–24h wave travel lag, Lake Mead 85-mi slackwater pool), reservoir bathtubs, vertical dam hydraulic head drops (Glen Canyon ~390 ft, Hoover ~395 ft), 10 sentinel USGS streamgage nodes, and an interactive Feature Inspection Strip (`#readout-strip`).
- **Comparative Stacked Bars: Physical Runoff vs. Legal Paper Allocations (`web/pipeline.html`):** Replaced the 4 legacy summary metric cards with two comparative horizontal stacked bars aligned on a single shared scale from $0.0$ to $20.0\text{ MAF/yr}$ ($100\%$ width):
  - *Bar 1 (Physical Natural Runoff - $15.20\text{ MAF/yr}$ total supply):* Upper Basin snowmelt inflows upstream of Lee's Ferry totaling $13.90\text{ MAF}$ ($91.4\%$ of all physical runoff: Mainstem Headwaters $4.00$, Green River Basin $4.90$, Gunnison $2.10$, San Juan $2.10$, Dolores/Upper minor tribs $0.80$) separated by a clear Lee's Ferry indicator notch at $13.90\text{ MAF}$, followed by Lower Basin tributary inflows ($1.30\text{ MAF}$: Little Colorado $0.25$, Virgin $0.18$, Gila & Lower tribs $0.87$). Features a dashed reference line highlighting modern post-2000 drought runoff of $\sim 12.50\text{ MAF/yr}$.
  - *Bar 2 (Statutory Paper Allocations & Demands - $19.10\text{ MAF/yr}$ total demand):* Upper Basin statutory apportionments totaling $7.50\text{ MAF}$ ($39.3\%$ of claims: Colorado $3.86$, Utah $1.71$, Wyoming $1.04$, New Mexico $0.84$, Arizona Upper $0.05$) separated by a Lee's Ferry compact division notch at $7.50\text{ MAF}$ with callout for the statutory $8.25\text{ MAF/yr}$ downstream release mandate ($7.5\text{ MAF}$ base $+ 0.75\text{ MAF}$ Mexico share), followed downstream by California ($4.40$), Arizona Lower Mainstem ($2.80$), Nevada ($0.30$), Article III(b) Lower Right ($1.00$), 1944 Mexican Treaty ($1.50$), and Reservoir Evaporation/Transit Losses ($1.60\text{ MAF}$, omitted from 1922 Compact).
  - *The Lee's Ferry Divider & Paradox Callout:* Visually demonstrates the core structural paradox: $91.4\%$ of physical water originates *above* Lee's Ferry, while $60.7\%$ of paper commitments and losses are apportioned *below* Lee's Ferry.
  - *The Structural Deficit Overhang:* An editorial hatched bracket spanning from $15.20\text{ MAF}$ ($76\%$) to $19.10\text{ MAF}$ ($95.5\%$) directly below Bar 2, visually quantifying the $+3.90\text{ MAF/yr}$ structural overdraft ($+6.60\text{ MAF/yr}$ vs. modern drought flow).
  - *Dynamic Segment Telemetry Strip:* Hovering any segment instantly updates an inspection bar displaying segment title, volume in MAF/yr, continuous rate in cfs ($1\text{ MAF/yr} \approx 1,381\text{ cfs}$), percentage of total basin budget, and legal authority / USGS source.
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

### Fixed
- **Topology Diagnostics Off by Default (`web/map.html`, `web/map_embed.html`, `web/app.js`):**
  - Unchecked all 3 topology diagnostic layer toggles (`Flow Direction ▶`, `Confluence Junctions ■`, `Reach Section Nodes ●`) by default on both standalone map and embedded map interfaces.
  - Set `showJunctions` layer initialization default to `false` in `web/app.js`.
  - Updated URL parameter query string logic so Confluence Junctions are only rendered when explicitly requested via `?topology_junctions=1` or `?confluences=1`.
  - Kept `#topology-diagnostics-legend` hidden by default until a diagnostic layer is actively enabled by the user.
- **Constant-Altitude Camera Panning & Asymmetric Obstacle Clearance (`web/cameraFlight.js`, `web/app.js`):**
  - *Root Cause Diagnosis:* In MapLibre GL JS v4.7.1, `Map.prototype._render` continuously overwrites `this.transform.elevation` with `terrain.getElevationForLngLatZoom(center)` on every render frame. When panning across mountain ranges in 3D perspective ($pitch > 0$), camera altitude ($H = \cos(\text{pitch}) \cdot \frac{\text{dist}}{\text{ppm}} + \text{elevation}$) shifted by thousands of meters, causing the camera to bob/bounce up and down tracking the terrain elevation at the map's center crosshairs. In addition, keyboard flight was attempting to counteract this by pumping `map.setZoom()` via `adjustZoomForTargetAltitude`, which introduced visual zoom pumping (zooming out from zoom 12 to 7.5), and obstacle lookahead was erroneously sampling terrain at `center` (miles away).
  - *Constant-Altitude Panning Stabilization:* Engaged MapLibre's `_elevationFreeze = true` during 3D terrain operation (`isTilted` / $pitch > 5^\circ$) across all mouse/touch drag panning (`dragPan`), kinetic inertial panning, and keyboard flight cruising. When frozen, MapLibre preserves `transform.elevation`, allowing the camera to pan along a flat, constant absolute altitude plane (meters above sea level) with zero bouncing (<0.4% altitude variance across mountain passes).
  - *Asymmetric Obstacle Clearance Ratchet:* Implemented `enforceTerrainClearance(map)` sampling terrain directly beneath the camera (`queryTerrainElevation(camPos.lngLat)`):
    - *Terrain Clearance Condition:* If the terrain directly beneath or immediately ahead of the camera rises within the safety clearance floor ($35\text{m}$), `transform.elevation` smoothly steps up just enough to safely clear the obstacle ($\text{tr.elevation} += \text{requiredAlt} - \text{camPos.altitude}$).
    - *Asymmetric Valley Retention:* When the camera passes over the peak and crosses into valleys or canyons, `transform.elevation` is NEVER decreased, preventing the camera from plunging back down into the valley.
  - *Zero Zoom Pumping:* Eliminated continuous `adjustZoomForTargetAltitude` calls during horizontal keyboard flight, stabilizing zoom strictly to a fixed level ($12.00$) during cruising.
  - *Helicopter Elevator:* Streamlined Q/E vertical elevator to directly adjust `transform.elevation` along the Z-axis, providing pure vertical climb and descent without lateral coordinate drift.
  - *2D/3D Mode Switching Cleanliness:* Reset `_elevationFreeze = false` and `transform.elevation = 0` whenever returning to flat 2D ($pitch = 0^\circ$).
  - *Automated Verification:* Created `scripts/verify_panning_altitude_stability.js` asserting mouse drag pan altitude variance < 0.4% across 20 steps over rugged Colorado Rockies terrain, keyboard flight altitude variance of 0m with 0 zoom spread, obstacle clearance $\ge 35\text{m}$ with non-decreasing ratchet over valleys, and clean 2D/3D round-trip hygiene.
- **iPad Safari Collapsed Tray White Space Elimination (`web/style.css`):**
  - Diagnosed 20–34px white space artifact underneath `.map-gage-tray` when collapsed on iPadOS Safari caused by `padding-bottom: env(safe-area-inset-bottom, 0px)` remaining active while collapsed.
  - Sized `.map-gage-tray.collapsed` strictly to `height: 54px !important; max-height: 54px !important; bottom: 0 !important; padding-bottom: 0 !important;`, ensuring the collapsed toolbar is 100% flush to the screen bottom. Sized expanded tray to `height: calc(260px + env(safe-area-inset-bottom, 0px)) !important` with `padding-bottom: env(safe-area-inset-bottom, 0px)`.
- **iPad Safari Mouse Wheel & Trackpad Whole-Page Zoom Prevention (`web/cameraFlight.js`, `web/index.html`):**
  - Prevented external mouse wheel and pinch gestures on iPad Safari from zooming the entire browser window instead of the map canvas. Added `metaKey` guard alongside `ctrlKey` in `handleCanvasWheel` and bound passive-false `gesturestart`/`gesturechange` cancellation handlers on `window`.
- **Elevation Profile Headwaters Bounds & Vertical Fall Geometry (`web/pipeline.html`):**
  - Resolved clipping where the Green River Wind River Range headwaters (13,800 ft) rendered off the top edge of the SVG. Extended Y-axis scale to 14,000 ft ($y = 590 - 0.038 \times \text{elev}$, viewBox `0 0 1200 650`), providing comfortable headroom.
  - Dropped question mark (?) un-gaged reach hatched bands and diagnostic toggles, streamlining the view to a pure 2.5D longitudinal fall line profile.
- **River Flow Schematic Geographic State Boundaries & Nevada Hydrologic Topology (`web/pipeline.html`):**
  - *Hoover Dam State Border Placement:* Accurately depicted Hoover Dam on the Nevada–Arizona state line inside Black Canyon (`x=480, y=561`), with the NV–AZ boundary line running down the river channel through Lake Mead and Hoover Dam south to ~35° N (`line x1="480" y1="515" x2="480" y2="575"`). Updated Hoover Dam labeling to explicitly read `Hoover Dam & Lake Mead`, `NV–AZ Border • 26.1M AF Capacity`, and `West: Nevada (SNWA) • East: Arizona`.
  - *Nevada Geographic Extent & Infrastructure:* Corrected Nevada's boundary lines: the 114th meridian drops south from the 37th parallel (`d="M 360,351 L 360,430 L 480,515"`) into Lake Mead, continuing south along the river to the Nevada–California diagonal border (`line x1="480" y1="575" x2="140" y2="370"`), accurately encompassing Clark County. Added Southern Nevada Water Authority / Las Vegas diversion (`div-snwa`) taking Nevada's statutory 0.30 MAF/yr from Lake Mead via deep intake straws to the Las Vegas Valley (`d="M 445,542 L 270,542"`), with interactive telemetry, pumping station icon, and operational details on return flow credits via Las Vegas Wash.
  - *California & Arizona Jurisdictional Alignment:* Re-anchored the California–Arizona river border south of ~35° N (`y=575`) down to Morelos Dam at the Mexican border (`y=671`), accurately aligning the Colorado River Aqueduct (CRA, 1.05 MAF) and All-American Canal (AAC, 2.90 MAF) in California, and Central Arizona Project (CAP, 1.50 MAF) in Arizona.
  - *Zero Graphic Collision & Single-Screen Integrity:* Maintained 0 collisions across 84 text elements and 24 flow paths verified via `node scripts/test_sankey_clearance.js`, and confirmed single-screen height fit (<885px) via `node scripts/verify_pipeline_tabs_and_stacked_bars.js`.
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
- **Proportional Flow Widths on River Conveyance Schematic (`web/pipeline.html`):**
  - Scaled all mainstem reaches, tributary inflows, trans-mountain diversions, regional aqueducts, and reservoir evaporation plumes on the schematic proportionally to physical annual volume (MAF/yr) using square-root scaling:
    $w = 2.0 + 5.5 \cdot \sqrt{\text{MAF}}\text{ (px)}$.
  - Mainstem conduits visibly expand at confluences and contract at diversions, maintaining strict hydrologic mass-balance:
    - Colorado River Headwaters ($4.00\text{ MAF} \rightarrow 13.0\text{px}$)
    - Denver / Front Range Tunnels ($0.55\text{ MAF} \rightarrow 6.1\text{px}$)
    - Upper Mainstem pre-Gunnison ($3.45\text{ MAF} \rightarrow 12.2\text{px}$)
    - Gunnison River ($2.10\text{ MAF} \rightarrow 10.0\text{px}$)
    - Upper Mainstem post-Gunnison ($5.55\text{ MAF} \rightarrow 15.0\text{px}$, updated badge to 5.6 MAF)
    - Upper Green River ($3.60\text{ MAF} \rightarrow 12.4\text{px}$)
    - Yampa River ($1.30\text{ MAF} \rightarrow 8.3\text{px}$)
    - Green River post-Yampa ($4.90\text{ MAF} \rightarrow 14.2\text{px}$)
    - Cataract Canyon combined Green + Mainstem ($10.45\text{ MAF} \rightarrow 19.8\text{px}$)
    - San Juan River ($2.50\text{ MAF} \rightarrow 10.7\text{px}$)
    - Lake Powell Pool Reach ($13.90\text{ MAF} \rightarrow 22.5\text{px}$)
    - Lake Powell Evaporation Plume ($0.38\text{ MAF} \rightarrow 5.4\text{px}$)
    - Grand Canyon Reach Compact Release ($8.23\text{ MAF} \rightarrow 17.8\text{px}$)
    - Little Colorado River ($0.25\text{ MAF} \rightarrow 4.8\text{px}$)
    - Virgin River ($0.18\text{ MAF} \rightarrow 4.3\text{px}$)
    - Lake Mead Evaporation Plume ($0.65\text{ MAF} \rightarrow 6.4\text{px}$)
    - SNWA / Las Vegas Intake ($0.30\text{ MAF} \rightarrow 5.0\text{px}$)
    - Lower Basin Hoover Release ($9.00\text{ MAF} \rightarrow 18.5\text{px}$)
    - Central Arizona Project ($1.50\text{ MAF} \rightarrow 8.7\text{px}$)
    - Colorado River Aqueduct ($1.05\text{ MAF} \rightarrow 7.6\text{px}$)
    - Lower Basin Mid-Reach post-CAP/CRA ($6.45\text{ MAF} \rightarrow 16.0\text{px}$)
    - Channel Transit & Riparian Loss ($0.55\text{ MAF} \rightarrow 6.1\text{px}$)
    - River approaching Imperial Dam ($5.50\text{ MAF} \rightarrow 14.9\text{px}$)
    - All-American Canal ($2.90\text{ MAF} \rightarrow 11.4\text{px}$)
    - River post-Imperial to Morelos Dam ($2.60\text{ MAF} \rightarrow 10.9\text{px}$)
    - Mexican Treaty Delivery at Morelos Dam ($1.50\text{ MAF} \rightarrow 8.7\text{px}$)
    - Dewatered Delta downstream ($0.00\text{ MAF} \rightarrow 3.0\text{px}$ dashed)
  - Enhanced on-screen Legend Card with explicit formula callout: `Scaling: Width = 2.0 + 5.5 × √MAF (px)` and continuity principle: `Continuity: Downstream = Upstream + Tribs - Divs - Losses`.
  - Re-verified with 0 text collisions and 0 flowline collisions via `scripts/test_sankey_clearance.js` and confirmed single-screen fit (<883px total view height).
- **Knowledge Base Conversion to Developer/Session Reference (`KNOWLEDGE_BASE.md`):**
  - Removed `web/knowledge.html` as a standalone web page to eliminate navigation clutter, redundant content overlap, and client-side search failures.
  - Re-architected the knowledge base into a structured, persistent Markdown reference (`KNOWLEDGE_BASE.md`) for AI sessions and research lookups, consolidating the Master Rosetta Stone, 6-tributary inflow accounting, reservoir elevations, operational wave dynamics, Law of the River case law, and agency API contracts so future sessions have verified domain truth without needing web searches.
- **Sidebar View Mode: Dedicated Fullscreen Section (`web/index.html`):**
  - Separated the "Toggle Fullscreen" control into its own dedicated bottom section with a clear visual border divider (`border-t border-[#e2e8f0] pt-2.5 mt-2`), distinguishing viewing mode controls from reference links and modals.
- **Purge of "Telemetry" Buzzwords Basin-Wide (`web/`, `notebooks/`):**
  - Swept user-facing HTML, JavaScript, CSS, JSON, and Jupyter notebooks to eliminate the software jargon buzzword "telemetry" per domain integrity and anti-slop principles.
  - Replaced user-facing strings with authentic hydrologic and cartographic terminology: "Gages & Monitoring Facilities", "Streamgage Records", "Hydrologic Monitoring Network", "Live Observations", "Gage & Facility Registry", "Station Offline", "Delayed Feed", and "USBR Records".
  - Updated `web/telemetry.html` (title: *Colorado River Basin: Gage & Facility Registry*, header: *Hydrologic Gage & Facility Registry*), `web/app.js`, `web/knowledge.html`, `web/flowReplay.js`, `web/profile_mockup.html`, `notebooks/02_analyze_flow_and_export.ipynb`, and `web/data/station_hierarchy.json`.
- **Map Gage Ledger: Action Column Purge (`web/map.html`, `web/map_embed.html`, `web/app.js`):**
  - Removed redundant "Action" column and "Map ↗" buttons from bottom gage tray, streamlining table from 6 to 5 clean columns (Facility, ID, Hierarchy, Type, Live Flow/Vol).
  - Transformed table rows into direct click targets (`title="Click row to fly to facility on map"`), smoothly flying camera to the node on click.
- **Single-Screen Height Compression for River Flow Schematic (`web/pipeline.html`):** Compressed the SVG coordinate space from `viewBox="0 0 1280 1050"` down to `viewBox="0 0 1280 750"` (a 28.5% vertical compression) and adjusted CSS container sizing to `max-h-[46vh]`. Relocated Lake Mead / Hoover Dam labels to the right side of the dam (`x="510" y="556"`) to eliminate any visual competition with the Colorado River Aqueduct on the left. The entire river flow schematic, sub-tab controls, and dual stacked comparison bars now comfortably fit within 882px total height, rendering completely on a single screen without vertical scrolling on standard desktop and iPad viewports.
- **Automated CDP Verification Suite (`scripts/verify_pipeline_tabs_and_stacked_bars.js`, `scripts/test_sankey_clearance.js`):** Verified 100% collision clearance (0 text collisions, 0 flowline collisions across 84 text labels and 24 flow paths) and verified sub-tab switching, elevation 2.5D mode, hover telemetry, single-page height bounds, and iframe embedding in `index.html`. Captured visual verification screenshots (`verified_schematic_stacked_bars.png`, `verified_elevation_profile_tab.png`, `verified_dashboard_river_flow_tab.png`).
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
- **Dynamic Flow Timeline Color-Coding & Flow Health Integration (`web/flowReplay.js`, `web/app.js`, `web/map_embed.html`, `web/map.html`, `scripts/verify_flow_replay.js`):** Resolved hydrologic visualization defect where the 7-day and 30-day temporal replay timeline dynamically updated river reach vector widths ($\sqrt{Q}$) but left river polyline and gauge marker colors static or frozen at baseline.
  - *Columnar Matrix Normals Ingestion:* Linked `FlowReplayEngine` directly with the 366-day USGS historical normals matrix (`web/data/historical_normals.json`) across all 73 monitored basin stations. On each timeline step, dynamically extracts the UTC timestamp date key (`MM-DD`) and computes percentage of historical daily normal ($Q_{\text{observed}} / Q_{\text{normal}} \times 100$).
  - *Data-Driven WebGL Layer Paint Expressions:* Converted initial `rivers-mainstem-core`, `rivers-major-core`, `rivers-minor-core` and glow layer paint expressions to dynamically evaluate `['coalesce', ['get', 'health_color'], '#0284c7']`, eliminating initial static color clamping.
  - *Continuous Flow Health Color Scale:* Dynamically evaluates ColorBrewer hydrologic health on every frame: Abundant (> 150%, Deep Water Blue `#1d4ed8`), Normal (90–150%, Water Blue `#0284c7`), Below Normal (50–90%, Warm Ochre `#d97706`), Low Flow (25–50%, Terracotta `#ea580c`), Critically Low (< 25%, Deep Oxblood `#b2182b`), Submerged Thalwegs (`#0369a1`), and Dry Riverbed (`#94a3b8`).
  - *Synchronized Streamflow Gauge Dots:* Dynamically updates streamflow gauge `circle_color` on each frame to match reach flow health, eliminating misleading ad-hoc surge amber pulses on flash floods.
  - *Non-Destructive State Restoration:* Caches previous `toggle-flow-health` state on open, activates Flow Health and legend during replay, and smoothly restores original GeoJSON properties and toggle states upon exit.
  - *Automated Verification:* Upgraded `scripts/verify_flow_replay.js` asserting that during the Nov 3 storm peak (step 180), San Juan reach and gage dynamically update to `#1d4ed8` (> 2,400% of normal), Lees Ferry reflects `#d97706` (72%), and seeking to step 0 immediately transitions San Juan back to `#0284c7` (96%) with width dropping from 8.5 to 5.2. Verified 100% test pass rate (`verified_30d_flow_replay.png`).
- **Camera W & S Pitch Tilt Pivot Stabilization & Progressive Ceiling Removal (`web/cameraFlight.js`, `scripts/test_upgraded_camera_controls.js`):**
  - *Elimination of Zoom Drag on Pitch Tilt:* Diagnosed the root cause of the "strange, non-centered, low axis of rotation" during W (pitch up) and S (pitch down). The keyboard flight step was invoking `adjustZoomForTargetAltitude(map, heldFlightAltitude)` on every single frame of pitch tilt. Because line-of-sight distance formula $\cos(\text{pitch})$ decreases with pitch, `adjustZoomForTargetAltitude` erroneously deduced that camera altitude had collapsed and forced rapid zoom-outs (dropping zoom from 12 down to 10.7 while pitching up), dragging the foreground down toward the bottom of the viewport. Removed `adjustZoomForTargetAltitude` from pitch tilt so W and S solely modify pitch while zoom stays rock-solid ($0.00$ zoom drift), restoring the true, centered viewport pivot (`map.project(center) = [width/2, height/2]`).
  - *Removal of Artificial Pitch Clamping when Zoomed Out:* Diagnosed why the camera got stuck when pitching up while zoomed out. The function `getMaxAllowedPitch(zoom)` formulaically restricted pitch to `(zoom - 3.5) * 18`, capping pitch to an imperceptible 10° at zoom 4.07 (the basin overview) and 27° at zoom 5.0. Removed this restriction, enabling smooth 3D tilt up to 82° across all operational basin zoom levels.
  - *Automated Verification:* Verified 100% test pass rate across zoomed-out basin view (pitch from 0° to 54°+ at zoom 4.07 with zero zoom drift), zoomed-in view (pitch up to 54°+ at zoom 12 with exact screen center retention), and S-key down-pitch return via automated CDP test suites.
- **Bottom Gages Tray Slide Affordance, Search Clear & Overlap Defect Repair (`web/map_embed.html`, `web/map.html`, `web/app.js`, `web/style.css`):**
  - *Full-Width Slide Handle Strip:* Replaced the awkward corner "▲ Gages" text button with a dedicated full-width narrow handle strip (`.tray-handle-strip`, 18px high) across the top of `.map-gage-tray`. Features a centered grab bar and dynamic triangle chevron (`▲` when collapsed, `▼` when expanded) providing an intuitive, full-width click target to slide the tray up or down.
  - *Auto-Expand on Search Focus & Typing:* Resolved the defect where searching while collapsed pushed the bar up with an empty white spacer while keeping results hidden inside `overflow: hidden`. Focusing or typing in the search box now immediately expands the tray to 260px (`toggleMapGageTray(true)`), instantly revealing filtered rows in real time.
  - *Search Clear Button [✕]:* Added an interactive clear button (`.tray-search-clear`) inside the search input. Appears automatically when text is typed; clicking [✕] clears the query, hides the button, restores all 98 facilities, and retains focus.
  - *Legend & Gyroscope Trackball Elevation Fix:* Diagnosed root cause where expanding the tray covered the Map Legend and Gyroscope/Trackball dial. An extraneous `</div>` at line 520 in `web/map_embed.html` prematurely closed `#map-container`, causing the legend, trackball, and tray to fall outside the container and breaking `#map-container:has(.map-gage-tray.expanded)` CSS rules. Removed the stray tag and added redundant body-level classes (`body.map-gage-tray-expanded`, `#map-container.tray-expanded`). Elevated both `.map-legend` and `.trackball-nav-control` to `bottom: calc(274px + env(safe-area-inset-bottom, 0px))` with `z-index: 1060` (above tray's 1050), guaranteeing they float unobstructed above the expanded tray.
  - *Automated Verification:* Verified 100% test pass rate across collapsed sizing (54px), focus auto-expand (260px), search filtering, clear button reset, and collapse toggle via CDP suite `scripts/test_gage_tray_and_elevation.js` (`verified_tray_collapsed_handle.png`, `verified_tray_expanded_elevated.png`).
- **Safari on iPad & iOS Viewport Bottom Cutoff Repair (`web/index.html`, `web/map_embed.html`, `web/map.html`, `web/style.css`):**
  - Diagnosed critical Safari / WebKit defect where the bottom ~1 inch of the screen (Map Legend button, Gyroscope trackball dial, and navigation panel utilities) was clipped off on iPads and iOS devices due to WebKit calculating `100vh` against un-chromed viewport height, overflowing past the browser toolbar and home bar.
  - Added `viewport-fit=cover` and `maximum-scale=1.0` to the `<meta name="viewport">` declaration across all dashboard shells.
  - Upgraded root layout containers (`html`, `body`, `.sidebar-academic`, `main`, `#map-container`) from static `100vh` to dynamic viewport units: `height: 100%; height: -webkit-fill-available; height: 100dvh; max-height: 100dvh;`.
  - Integrated CSS environment variables (`env(safe-area-inset-bottom)`, `env(safe-area-inset-left)`, `env(safe-area-inset-right)`) across all docked map controls and navigation elements:
    - Elevated `.map-legend` to `bottom: calc(48px + env(safe-area-inset-bottom, 0px))` and `left: max(20px, calc(16px + env(safe-area-inset-left, 0px)))` (and `calc(256px + env(...))` when the gage tray is expanded).
    - Elevated `.trackball-nav-control` (Gyroscope dial) to `bottom: calc(48px + env(safe-area-inset-bottom, 0px))` and `right: max(20px, calc(16px + env(safe-area-inset-right, 0px)))`.
    - Elevated `.flow-replay-bar` to `bottom: calc(48px + env(safe-area-inset-bottom, 0px))` (and `calc(252px + env(...))` when expanded).
    - Elevated `.sidebar-academic` bottom utilities with `padding-bottom: max(1.25rem, calc(0.875rem + env(safe-area-inset-bottom, 0px))) !important;`, keeping the Fullscreen toggle, Data Sources modal, and legal links fully visible above the iPad home indicator.
    - Updated `.map-gage-tray` with `padding-bottom: env(safe-area-inset-bottom, 0px);` and dynamic safe-area height calculations.
  - Verified 100% on-screen visibility across iPad landscape (1024x768) and iPad portrait (810x1080) via automated Chrome DevTools Protocol test suite (`scripts/test_ipad_viewport.js`), capturing visual verification artifacts (`verified_ipad_landscape.png`, `verified_ipad_portrait.png`).
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

## [2.3.5] - 2026-11-22
### Added (Lake Mead SNWA Intake No. 3 / "Third Straw" Reference Line)
- **Las Vegas Deep Intake Threshold & Benchmark Card ([web/index.html](file:///Users/macstudio/Documents/Antigravity/CO_River/web/index.html)):**
  - Added left-aligned `position: 'start'` pill placement support in `horizontalThresholdPlugin` (`line 2504`), added `{ value: 860.0, label: 'SNWA Intake No. 3 ("Third Straw")', color: '#6d28d9', dash: [3, 3], position: 'start' }` to `renderMeadHistoricalCharts()`, and extended the Lake Mead elevation chart y-axis floor from `880` to `830` ft (`860 ft` sits cleanly above the x-axis and separated horizontally from `Dead Pool (895 ft)`).
  - Expanded Lake Mead's operational benchmark strip from 4 to 5 cards (`grid-cols-2 sm:grid-cols-5`) to include **SNWA Intake No. 3 (`860.0 ft` — Las Vegas "Third Straw" (L3PS))**.
  - Verified via headless Chrome CDP (`1360×860`, `0` runtime exceptions): `y.min === 830`, `5` threshold lines active, `860.0 ft` pill renders cleanly on the left above the x-axis alongside all 5 benchmark cards (`verified_mead_third_straw_line.png`).

### Changed (Sidebar Brand Metadata Line Cleanup)
- **3-Line Sidebar Attribution Formatting ([web/index.html](file:///Users/macstudio/Documents/Antigravity/CO_River/web/index.html#L209-L216)):**
  - Unified `#sidebar-brand-header` attribution lines below `COLORADO RIVER BASIN` into three even `11px` regular-weight (`font-normal`, `text-stone-600`) single-line rows (`Douglas Schoch`, `Colorado Mountain College`, `DAT1001 • Fall 2026`), eliminating the awkward wrap that left a trailing bullet after `DAT1001 •`.
  - Verified via headless Chrome CDP (`1280×800`, `0` runtime exceptions): all 3 metadata rows measure `15px` height (`lineHeight: 15px`, `wrapped: false`, `verified_sidebar_brand_clean.png`).

### Added (System Map Standard Editorial Header)
- **Unified System Map Header Strip ([web/index.html](file:///Users/macstudio/Documents/Antigravity/CO_River/web/index.html)):**
  - Wrapped `#section-map` contents in a flex column container and added a warm sandstone editorial `<header>` (`bg-[#f5f2eb] border-b border-stone-300 px-4 md:px-6 py-2.5`) titled `System Map` matching `#academic-top-header` (`Basin Overview`) and every peer view, while keeping `#iframe-map` cleanly sized below (`flex-1 min-h-0`) and bumped to `./map_embed.html?v=20261122i`.
  - Verified via headless Chrome CDP (`1360×860`, `0` runtime exceptions): `System Map` header renders at `49px` height with `rgb(245, 242, 235)` (`#f5f2eb`) fill, `#iframe-map` sits directly below (`top: 49`, `height: 811`, `scrollH: 860 <= winH: 860`), and bottom `Gages & Monitoring Facilities` bar and compass controls remain completely unclipped (`verified_system_map_header.png`).

### Fixed (Chart Tick & SVG Label Overlap Remediation)
- **Tributaries X-Axis Tick & Bubble Pill De-Overlap ([web/ml_analysis.html](file:///Users/macstudio/Documents/Antigravity/CO_River/web/ml_analysis.html)):**
  - Replaced parenthetical Card 1 x-axis tick labels (`0.00 (Steady Dam)`, `0.40 (Snowmelt)`, `0.80 (Desert Flash)`) that collided with adjacent ticks on compact laptop screens with uniform 2-decimal ticks (`0.00`–`1.00`, `stepSize: 0.2`).
  - Upgraded `card1BubbleLabelsPlugin` to clamp candidate label pills inside `chartArea` bounds and run an iterative vertical de-overlap pass across placed label boxes so closely clustered bubbles (`Dirty Devil` / `Escalante`, `Flaming Gorge` / `Gunnison`) never overlap at narrow viewports.
- **Sankey Thin-Node Column Label De-Overlap ([web/sankey.html](file:///Users/macstudio/Documents/Antigravity/CO_River/web/sankey.html)):**
  - Added a per-column vertical spacing pass inside `renderSankey()` sorting node text groups top-to-bottom by `d.y0` and nudging any label whose bounding box sits within `3px` of the label above it, separating `Front Range Municipal Tunnels (CO)` (`0.48 MAF/yr`) and `Wasatch Front Municipal Tunnels (UT / CUP)` (`0.12 MAF/yr`).
  - Verified via headless Chrome CDP (`0` runtime exceptions; `0` Chart.js x-tick or label-box collisions on `ml_analysis.html` at both `860×680` and `1360×860` and `index.html?tab=overview`/`reservoirs` at `1120×720`; `0` SVG `<text>` overlaps or viewBox clips on `sankey.html` and `pipeline.html` at `1024×740`; visual confirmation in `verified_ml_zero_overlaps_compact.png` and `verified_sankey_zero_overlaps.png`).

### Removed (Excessive UI Instruction & Hover-Hint Copy)
- **Trimmed Redundant Instructional Microcopy ([web/ml_analysis.html](file:///Users/macstudio/Documents/Antigravity/CO_River/web/ml_analysis.html), [web/index.html](file:///Users/macstudio/Documents/Antigravity/CO_River/web/index.html), [web/sankey.html](file:///Users/macstudio/Documents/Antigravity/CO_River/web/sankey.html), [web/pipeline.html](file:///Users/macstudio/Documents/Antigravity/CO_River/web/pipeline.html)):**
  - Deleted `• Click lines/bubbles to compare (Shift-click for category)` from the Tributaries & Deficit header (`web/ml_analysis.html`).
  - Deleted `Hover any cell to inspect exact monthly elevation` from both the Lake Mead and Lake Powell elevation heatmap matrix footers (`web/index.html`).
  - Trimmed `Hover any band for details.` from the Physical Runoff vs. Paper Allocations subtitle (`web/sankey.html`).
  - Removed `Click any feature to inspect live operational data ↗` from the Flow Schematic SVG Legend and tightened its background rectangle height from `182px` to `164px` (`web/pipeline.html`).
  - Verified zero remaining occurrences across target files and `0` runtime exceptions in headless Chrome CDP (`verified_ml_no_hint_slop.png`, `#legend-box` height `164`).

### Changed (Warm Sandstone UI Chrome Unification)
- **Harmonized Remaining Cool-Gray UI Chrome to Warm Sandstone ([web/pipeline.html](file:///Users/macstudio/Documents/Antigravity/CO_River/web/pipeline.html), [web/telemetry.html](file:///Users/macstudio/Documents/Antigravity/CO_River/web/telemetry.html), [web/index.html](file:///Users/macstudio/Documents/Antigravity/CO_River/web/index.html), [web/data_sources.html](file:///Users/macstudio/Documents/Antigravity/CO_River/web/data_sources.html), [web/law.html](file:///Users/macstudio/Documents/Antigravity/CO_River/web/law.html), [web/methodology.html](file:///Users/macstudio/Documents/Antigravity/CO_River/web/methodology.html), [web/editorial.css](file:///Users/macstudio/Documents/Antigravity/CO_River/web/editorial.css)):**
  - Replaced cool blue-gray (`slate-*`, `#e2e8f0`, `#f1f5f9`, `#cbd5e1`, `#f8fafc`) segmented sub-tab bars, toolbars, category pills, borders, table headers, headers/footers, and code/quote boxes with warm `stone-*` and sandstone (`#ebe4d6`, `#f5f2eb`, `#f7f4ee`, `#cfc8ba`, `#dfd9ce`, `#ede8df`) tokens matching [web/sankey.html](file:///Users/macstudio/Documents/Antigravity/CO_River/web/sankey.html) and the warm parchment canvas (`#f4f1ea`), while preserving semantic data/heatmap band colors in `web/index.html`.
  - Updated JS class toggles in `switchPipelineSubtab()` (`web/pipeline.html`), `setCategoryFilter()` (`web/telemetry.html`), and `updateActiveActButton()` (`web/index.html`) so interactive state switches remain warm stone.
  - Verified via headless Chrome CDP (`0` runtime exceptions; `pipeline.html` tab container computed `rgba(231, 229, 228, 0.9)` warm stone and stayed `stone-*` on click; `telemetry.html` toolbar/pills warm stone; `data_sources.html` header/footer `#ebe4d6` / `rgb(235, 228, 214)`; `index.html?tab=law` `0` cool slate badges; visually confirmed in `verified_pipeline_warm_tabs.png` and `verified_telemetry_warm_toolbar.png`).

### Fixed (Site-Wide External Link Audit & 404 Remediation)
- **Replaced 13 Dead / Retired / Replaced External URLs Across Frontend & Pipeline ([web/index.html](file:///Users/macstudio/Documents/Antigravity/CO_River/web/index.html), [web/law.html](file:///Users/macstudio/Documents/Antigravity/CO_River/web/law.html), [web/data_sources.html](file:///Users/macstudio/Documents/Antigravity/CO_River/web/data_sources.html), [web/sankey.html](file:///Users/macstudio/Documents/Antigravity/CO_River/web/sankey.html), [web/pipeline.html](file:///Users/macstudio/Documents/Antigravity/CO_River/web/pipeline.html), [web/telemetry.html](file:///Users/macstudio/Documents/Antigravity/CO_River/web/telemetry.html), [web/map.html](file:///Users/macstudio/Documents/Antigravity/CO_River/web/map.html), [web/map_embed.html](file:///Users/macstudio/Documents/Antigravity/CO_River/web/map_embed.html), [web/app.js](file:///Users/macstudio/Documents/Antigravity/CO_River/web/app.js), [web/test_proposal1.html](file:///Users/macstudio/Documents/Antigravity/CO_River/web/test_proposal1.html), [src/fetch_water_data.py](file:///Users/macstudio/Documents/Antigravity/CO_River/src/fetch_water_data.py)):**
  - Audited all `113` unique external URLs (`29` files in `web/`, excluding the AI prompt archive) plus local `href` links (`0` broken local routes): identified `10` HTTP `404` URLs, `2` retired USDA `/wps/portal/` timeouts, and `1` replaced USBR feed (`hourly.html` notice pointing to `/riverops/hourly7.html`).
  - Replaced `usbr.gov/lc/region/g4000/lawofrvr.html` → `usbr.gov/lc/region/pao/lawofrvr.html`; `usbr.gov/lc/region/pao/laws-regs/synopses/crc.html` → `usbr.gov/lc/region/g1000/pdfiles/crcompct.pdf`; `usbr.gov/uc/envproc/culr/` → `usbr.gov/uc/water/crsp/studies/`; `usbr.gov/lc/region/g4000/hourly/{hourly,havasu-elv,mohave-elv}.html` → `riverops/hourly7.html` & `hourly/levels.html` (preserving the active teletype table parser on line `113` of `src/fetch_water_data.py` and the Python snippet in `web/map.html`); `usbr.gov/uc/rm/crsp/gunnison/` → `usbr.gov/uc/water/hydrodata/reservoir_data/913/dashboard.html`; `waterservices.usgs.gov/rest/{IV,DV}-Service.html` → `/docs/instantaneous-values/instantaneous-values-details/` & `/docs/dv-service/daily-values-service-details/`; `northernwater.org/.../c-bt-project` → `colorado-big-thompson-project`; `srpnet.com/water-irrigation/water-operations` → `grid-water-management/water-management/where-water-from`; and retired `nrcs.usda.gov/wps/portal/...` links → `wcc.sc.egov.usda.gov/` & `wcc.sc.egov.usda.gov/awdbRestApi/swagger-ui/index.html`.
  - Bumped `app.js?v=20261122i` in `web/map.html` and `web/map_embed.html`; updated `scripts/apply_symmetric_ag_muni_sankey.js` and `scripts/update_sankey_meta.js` so regenerated Sankey metadata keeps live URLs.
  - Verified via live paced HTTP sweep: `12/12` unique replacement URLs return `HTTP 200` and `0` `404` responses remain across all `87` swept content/portal URLs in `web/`.

### Added (Argon → Flash Cross-Reference Tagging in AI Dialogue Archive)
- **Bidirectional Argon → Flash Prompt Matching & Filter ([scripts/compile_full_ai_transcript.py](file:///Users/macstudio/Documents/Antigravity/CO_River/scripts/compile_full_ai_transcript.py), [web/ai_complete_prompt_archive.html](file:///Users/macstudio/Documents/Antigravity/CO_River/web/ai_complete_prompt_archive.html)):**
  - Added 6-word normalized shingle matching (`_norm_shingles()`, `>= 25` overlapping shingles and `>= 15%` prompt coverage) across all compiled Antigravity prompts and the 84 extracted turns in the 10 undated Gemini Web PDFs (`mockups/gemini_sessions/*.pdf`), accurately matching `25` Argon-authored meta-prompts without synthesizing artificial timestamps.
  - Added clickable `.badge-argon` pills (`Argon → Flash • #idx (PDF Title)`) on matched Antigravity prompt cards and reciprocal `.badge-argon-used` (`Used in Flash: #idx`) jump links on the originating Gemini PDF turn cards via `jumpToTurn()`, plus an `ARGON_TO_FLASH` option (`Argon → Flash Prompts (25 Matched)`) in `#sessionFilter` and total match count in `.audit-meta-line`.
  - Verified via headless Chrome CDP against `http://localhost:8088/ai_complete_prompt_archive.html` (`0` runtime exceptions; selecting `ARGON_TO_FLASH` filters to `25` matching cards all bearing `.badge-argon`, and clicking `#turn-674`'s badge resets the filter to `ALL` and jumps cleanly to Gemini Web card `#turn-722` bearing `.badge-argon-used`, captured in `verified_archive_argon_flash_tags.png`).

### Changed (Hover Tooltip Tightening & Viewport Clamping)
- **Pipeline Hover Cards & Viewport Edge Clamping ([web/pipeline.html](file:///Users/macstudio/Documents/Antigravity/CO_River/web/pipeline.html)):**
  - Constrained `#flow-tooltip` with `width: max-content; max-width: min(300px, calc(100vw - 24px)); box-sizing: border-box; overflow-wrap: break-word; padding: 9px 11px;` and updated `updateTooltipPos(e)` to clamp against `tooltip.offsetWidth` / `offsetHeight` so cards on right-hand elements never clip past the viewport edge.
  - Replaced narrative comparison-card prose and duplicated `Dead Pool` / `Tier 1` footnotes inside `renderComparisonCard()` (`flowComparisonBox`, `combinedInflowBox`, `canalComparisonBox`, `tunnelComparisonBox`, `reservoirStorageBox`) with two compact tabular rows (`Active Storage`, `Pool Elevation`), tightened all schematic hover entries in `setupTooltips()` to two concise spec lines, and compacted Elevation Profile marker notes and `showElevationTooltip()` padding.
- **Sankey, Stacked Bar & Overview Tooltip Tightening ([web/sankey.html](file:///Users/macstudio/Documents/Antigravity/CO_River/web/sankey.html), [web/index.html](file:///Users/macstudio/Documents/Antigravity/CO_River/web/index.html)):**
  - Bounded `#sankey-tooltip` and `#stacked-tooltip` CSS (`max-width: min(300px, calc(100vw - 24px)); box-sizing: border-box;`), added symmetric viewport clamping in `updateTooltip()` and `positionStackedTooltip()`, removed redundant `${sourceName} → ${targetName}` and `Water Budget Accounting • 1 MAF/yr ≈ 1,381 cfs` lines from `formatSankeyLinkCard()`, and condensed all 85 `NODE_META` `summary` strings and all 19 `inspectStackedSegment()` `desc` strings to `<= 75` characters.
  - Shortened Overview Card 2 (`renderSeasonalEngineChart()`) `afterBody` balance summary and Card 4 (`initOverviewCharts()`) `Consumptive Use` label in `web/index.html`.
  - Verified via headless Chrome CDP against `http://localhost:8088` (`0` runtime JS errors; `#dam-hoover` `#flow-tooltip` rendered at `300x199px`, `scrollWidth <= clientWidth`, `rectRight: 933 <= 1280`; `#dam-glencanyon` `offsetHeight: 199px`; `#sankey-tooltip` `offsetHeight: 138px`, `rectRight: 950 <= 1280`; `#stacked-tooltip` `offsetHeight: 120px`; visual inspection of `verified_pipeline_hoover_tooltip_tight.png` and `verified_sankey_tooltip_tight.png`).

### Changed (Tributaries & Deficit Direct Click Filtering)
- **Removed Header Regime Filter Buttons & Added Direct Multi-Line / Category Selection (`web/ml_analysis.html`):**
  - Removed the 4 top filter buttons (`All Rivers`, `Snowmelt Rivers`, `Dam-Controlled`, `Desert Flash-Flood`) that only scoped the top two charts, replacing them with a subtle clickable inline regime key (`Snowmelt`, `Dam-Regulated`, `Desert Flash` + contextual `Reset` link).
  - Replaced single-river selection with multi-select `selectedRiverIds` (`Set`), polyline segment hit-testing (`findHitRiverOnChart()` + `pointToSegmentDistance()`), and on-canvas label box hit-testing (`chart._labelBoxes`) across Card 1 (`Tributary Flashiness vs. Volume`) and Card 2 (`Travel Time to Lake Powell`): clicking lines, bubbles, or label pills toggles multiple rivers simultaneously, clicking any regime dot (or Shift-clicking any line/bubble) selects its full category, and clicking empty chart background clears the filter.
  - Unified hover tooltips on both Card 1 and Card 2 via `formatRiverHoverLines()` + `pointHitRadius: 24` so hovering any bubble or any section of a travel curve displays USGS station ID, regime, annual inflow (`MAF/yr` & `%` Powell share), RBI flashiness, and travel lag/river miles; verified via real mouse events in headless Chrome CDP (`oldButtonsCount: 0`, multi-select `["san_juan_bluff","cameo"]`, snowmelt category `["cameo","yampa"]`, `verified_tributaries_direct_click.png`).

### Fixed
- **Fullscreen Sidebar Preservation & Removal of Floating Exit Button (`web/index.html`):**
  - Removed the `body.workspace-fullscreen .sidebar-academic { display: none !important; }` override and deleted `#btn-exit-fullscreen-floating` so entering fullscreen keeps the left navigation sidebar (`256px`) accessible at all times and never overlays a floating button on top of `Basin Overview` or view headers.
  - Kept `syncFullscreenUI()` and `toggleFullScreen()` updating `#btn-fullscreen` cleanly between `Fullscreen` and `Exit Fullscreen` alongside native `requestFullscreen()` / `webkitRequestFullscreen()` and `Escape` key handling; verified via headless Chrome CDP (`sidebarWidth: 256`, `floatingBtnExists: false`, `fullscreenLabel: 'Exit Fullscreen'`, `verified_fullscreen_sidebar_intact.png`).

### Added
- **Shoshone Hydroelectric Plant Senior Water Rights (`1,250 cfs` 1902 Call) & USGS `#09070500` Integration (`src/fetch_water_data.py`, `web/data/station_hierarchy.json`, `web/data/river_network.json`, `web/telemetry.html`, `web/app.js`, `web/pipeline.html`, `web/index.html`, `scripts/build_unified_notebook.py`):**
  - Attributed **USGS `#09070500` (`Colorado River near Dotsero, CO`)** across `fetch_water_data.py` (`reach_audit_configs`), `station_hierarchy.json`, `river_network.json` / `river_network.geojson` / `build_pristine_network.py`, and `web/telemetry.html` (`Administers 1902 Shoshone Hydroelectric Plant call (1,250 cfs senior / 1,408 cfs total non-consumptive right) at Glenwood Canyon entrance`, plus `09085100` below Shoshone tailrace & Roaring Fork).
  - Added a `1902 Shoshone Call (1,250 cfs)` badge and explanatory water-right callout to `formatGaugePopup()` (`web/app.js?v=20261122h`) and updated the Elevation Profile / Flow Schematic tooltips in `web/pipeline.html`.
  - Documented the 1902 Shoshone Call (`1,250 cfs` senior / `1,408 cfs` total, predating Moffat 1921, Adams/C-BT 1935, and Roberts 1946 tunnels, supporting Cameo & the 15-Mile Reach) in **Law of the River Chapter 2 (`#law-sec-ch2`)** in `web/index.html` and Section 3 of `notebooks/colorado_river_analysis.ipynb` (re-executed via `nbclient` & exported to `web/notebooks/colorado_river_analysis.html`).
  - Verified via headless Chrome CDP that searching `"Shoshone"` in `telemetry.html` matches `#09070500` & `#09085100`, `#law-sec-ch2` renders the Shoshone Call writeup, and `formatGaugePopup('09070500')` emits both badge and callout (`verified_shoshone_gage_telemetry.png`, `verified_shoshone_law_writeup.png`).
- **Reverse-Chronological Sort & Refresh Timestamp in AI Dialogue Archive (`scripts/compile_full_ai_transcript.py`, `web/ai_complete_prompt_archive.html`):**
  - Added a `#sortOrder` dropdown (`Sort: Newest First (Nov 22 → Sep 27)` default vs. `Sort: Chronological (#1 Sep 27 → Nov 22)`) and `applySortOrder()` so recent Session 8 turns appear at the top immediately on load while preserving Gemini Web PDF cards (`gemini-web-sessions`) and original `#1..#N` IDs; added live compilation timestamp to `.audit-meta-line`.

### Changed
- **Removed Hydrologically Invalid "Combined Min Power Limit (~6.0 MAF)" Line (`web/index.html`):**
  - Removed the `{ value: 6.0, customLabel: 'Combined Min Power Limit (~6.0 MAF)' }` threshold line from `renderMacroStorageTimeline()` and `initOverviewCharts()`, along with its corresponding summary stat blocks in `#view-res-timeline` and Overview Act 3 (`#act-3`, refactored to 3-column benchmark grids matching `17.6 MAF` / `29.3%` current storage). Power generation cutoffs depend on individual dam turbine-intake head (`950.0 ft` at Hoover / `3,490.0 ft` at Glen Canyon, already plotted on their individual elevation charts) rather than a summed system storage volume, and the `6.0 MAF` horizontal label overlapped the 2005–2026 Mead/Powell traces.
  - Verified via headless Chrome CDP on `?tab=reservoirs` and `?tab=overview` (`thresholdCount: 1`, `hasCombinedMinPowerText: false`, `verified_macro_timeline_no_min_power_overlap.png`, `verified_overview_no_min_power.png`).
- **Full Historical Reservoir Matrix & Timeline Refresh (`src/fetch_historical_portal_data.py`, `web/data/portal_historical.json`, `.github/workflows/update_data.yml`):**
  - Expanded `src/fetch_historical_portal_data.py` (zero third-party dependencies) to refresh Lake Mead monthly/live elevations (`mead-elv.html`, `levels.html`, USBR HydroData site `921`), Lake Powell water-year storage (`919/csv/17.csv`), Upper Basin monthly elevation matrices (`919` Powell, `917` Flaming Gorge, `920` Navajo, `913` Blue Mesa `49.csv` monthly means), Dillon (`CDWR DILRESCO`), `basin_storage_timeline[2026]` (`17.606 MAF` unified USBR `17.csv` + CDWR snapshot), and USGS Lee's Ferry daily discharge (`09380000` through `2026-11-21`).
  - Populated `2026 OCT` (`1038.85 ft`) and `2026 NOV` (`1041.41 ft`) on Lake Mead and `2026 NOV` (`3538.29 ft`) on Lake Powell, plus `NOV 2026` on Flaming Gorge, Navajo, Blue Mesa, and Dillon.
  - Added `python3 src/fetch_historical_portal_data.py` to `.github/workflows/update_data.yml` so historical reservoir heatmaps and timelines update automatically alongside real-time telemetry runs.
  - Verified via headless Chrome CDP that Lake Mead (`2026 OCT: 1038.8 ft`, `2026 NOV: 1041.4 ft`), Lake Powell (`2026 OCT: 3522.4 ft`, `2026 NOV: 3538.3 ft`), and the recompiled AI archive (`Sort: Newest First`, `Updated Nov 22, 2026`) render accurately (`verified_heatmap_mead_nov2026.png`, `verified_heatmap_powell_nov2026.png`, `verified_archive_sorted.png`).

---

## [2.3.4] - 2026-11-21
### Fixed
- **Overview Card 2 Seasonal Engine Chart Expansion into Whitespace (`web/index.html`):**
  - Replaced the fixed `h-36` (144px) container constraint on Card 2 (*"Seasonality vs. Demand: Why Reservoirs Exist"*) with dynamic flex-grow styling (`flex-1 min-h-[190px]`).
  - Allowed the 365-day hydrograph canvas to expand by +32% into previously dead white space, eliminating vertical crowding across all 5 regime curves and legend entries.
  - Collapsed the dead vertical white space gap between the data sources line and the key finding callout box from 34.25px (and 60–100px on narrow viewports) to a tight 8px.
  - Applied synchronized flex-1 expansion to Card 3 (*"90-Year Reservoir Buffer Depletion"*) and Card 4 (*"Consumptive Use by State & Sector"*).
  - Verified via automated Chrome DevTools Protocol (`verified_card2_expanded_crop.png`).
- **Overview Header Ticker & Scrollbar Purge (`web/index.html`):**
  - Permanently removed the redundant `#storyboard-nav` ticker from the `Basin Overview` header banner.
  - Eliminated the horizontal scrollbar and duplicated arithmetic ladder (`RIVER SUPPLY: 12.50 MAF | 1922 COMPACT: 15.00 MAF...`), which was already fully visualised in Card 1 (*"The Allocation Gap"*).
  - Preserved a clean, minimal header (`Basin Overview`) and eliminated unnecessary vertical scrolling.
  - Verified via automated Chrome DevTools Protocol (`verified_overview_clean_header.png`, `verified_overview_clean_header_crop.png`).
- **Map Legend Chevron Up-to-Expand & Down-to-Collapse Alignment (`web/style.css`):**
  - Calibrated the map legend toggle chevron to align with its physical bottom-docked position:
    - When collapsed: chevron points UP ($\blacktriangle$ / `rotate(180deg)`) indicating upward expansion into view.
    - When open: chevron points DOWN ($\blacktriangledown$ / `rotate(0deg)`) indicating downward collapse into the bottom bar.
  - Synchronized across both desktop and mobile viewports with zero rotating animations (`transition: none !important`).
  - Verified via automated Chrome DevTools Protocol (`verified_legend_collapsed_exact.png`, `verified_legend_open_exact.png`).
- **Flashiness Chart Bubble Label Redundancy Purge (`web/ml_analysis.html`):**
  - Removed redundant `(RBI {val})` text strings from direct canvas bubble labels in Card 1 (*"River Behavior & Annual Water Volume"*).
  - Bubbles now display concise, legible river names (`Upper CO (Cameo)`, `Gunnison`, `Flaming Gorge`, `Yampa`, `San Juan`, `Dirty Devil`, `Escalante`), eliminating repetitive acronym clutter.
  - Simplified x-axis title from `Richards–Baker Flashiness Index (RBI: 0.00 Steady → 1.00 Flashy)` to `Flashiness Index (0.00 Steady → 1.00 Flashy)`.
  - Updated hover tooltip to display `Flashiness Score: {val}`.
  - Verified via headless Chrome DevTools Protocol (`verified_card1_flashiness_crop.png`).
- **Light background for navigation and Basin Metrics panel items (`web/editorial.css`):** Added CSS rules to enforce `var(--bg-surface)` background on `.sidebar-panel .card` and `.sidebar-academic .sidebar-link` for consistent light panels across the UI. Verified via screenshot.
