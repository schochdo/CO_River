# AI Collaboration & Methodology Log (DAT1001)

## Project: Colorado River Basin Hydrologic Pipeline & Dashboard

This document tracks AI pair-programming usage for academic integrity and transparency, documenting the models used, the specific prompts/tasks, and how the outputs were verified.

---

## Session Log

| Date | Model Used | Task / Prompt Scope | Outcome & Human Verification |
|---|---|---|---|
| **2026-09-27** | Gemini 3.8 Flash | Project scoping, /grill-me architectural interview | Defined sentinel streamflow stations & trans-mountain diversion focus. |
| **2026-09-27** | Gemini 3.8 Flash | USGS NWIS API discovery & Lees Ferry live test | Verified parameter `00060` (discharge in cfs); confirmed 8,070 cfs live flow. |
| **2026-09-27** | Gemini 3.1 Pro | Hydrologic domain analysis (Shoshone call, 1922 Compact) | Mapped legal implications of Glenwood Canyon 1902 senior non-consumptive right. |
| **2026-09-27** | Gemini 3.1 Pro | Mockup generation (`upper_basin_mockup.html`) | Generated standalone Leaflet map with OpenTopoMap shaded relief. |
| **2026-09-27** | Gemini 3.8 Flash | macOS environment setup (PEP 668 fix) | Created isolated local `.venv` and verified `pandas`/`requests`. |
| **2026-09-27** | Gemini 3.8 Flash | CDWR HydroBase REST API integration | Identified station codes (`ADATUNCO`, `MOFTUNCO`, `ROBTUNCO`) and pulled live diversion flows. |
| **2026-09-27** | Gemini 3.8 Flash | USBR & USGS reservoir integration | Connected Lake Powell elevation (3,517.5 ft) and storage time series. |
| **2026-09-27** | Gemini 3.8 Flash | Unified pipeline script (`src/fetch_water_data.py`) | Ran automated pipeline and generated `data/latest_metrics.json`. |

---

## Methodological Summary
* **Human-in-the-Loop Control:** Architecture and design decisions (such as focusing on trans-mountain diversions rather than all regional tributaries) were directed by the human author.
* **Code Verification:** All API endpoints and returned data frames were inspected and verified via local Python executions and compared against official USGS/CDWR published records.
* **Environment Integrity:** Code was executed strictly within an isolated local virtual environment (`.venv`) tracked under git.
| **2026-09-27** | Gemini 3.8 Flash | Fetching USGS NHD Flowlines for River Segments | Used NHD API and geopandas/shapely to generate high-resolution river coordinates, preserving CFS weighting while routing around major reservoirs. |
| **2026-09-27** | Gemini 3.8 Flash | Map UX & Callout Collision Resolution | Replaced simple fixed anchors with dynamic, custom-offset SVG leader lines (`createLeaderLabel` in `app.js`) to visually spread out densely clustered elements (e.g., the four trans-mountain tunnels and Lees Ferry/Lake Powell) while still pointing to their precise geographic origins. |
| **2026-09-27** | Gemini 3.8 Flash | Bounding Box Geofencing | The raw NHD API returned all features named "Colorado River" and "Green River" nationwide (including rivers in TX, KY, WA, ND). Added a spatial bounding box geofence to `process_river.py` to strip out all non-basin imposter rivers. |
| **2026-09-27** | Gemini 3.8 Flash | Extending Domain Infrastructure & Tributaries | Added high-resolution geometries and live USGS NWIS flow data for major upper basin tributaries (Yampa, San Juan, Gunnison) and lower basin diversion infrastructure (All-American Canal, Colorado River Aqueduct). Used USGS Daily Values (DV) for CRA since Instantaneous Values (IV) are unavailable. |
| **2026-09-27** | Gemini 3.8 Flash | Map Polylines & Visual Boundaries | Extended the Continental Divide geo-coordinates North to Canada and South to Mexico for proper scale. Manually mapped dashed-line polylines for the Colorado River Aqueduct and All-American Canal in `geography.json` and customized their Leaflet popups in `app.js` to accurately describe their endpoints as aqueducts rather than under-divide tunnels. |
| **2026-09-27** | Gemini 3.8 Flash | Map Readability & Datetimes | Switched the default map base layer to `esriSatellite` (Esri World Imagery) to give accurate geographic and topographic context to the Continental Divide and aqueduct lines. Added `formatTimestamp` utility in `app.js` to parse raw ISO 8601 strings into human-readable local datetimes (e.g., "Sep 27, 6:00 PM") across the popups and sidebar. |
| **2026-09-27** | Gemini 3.8 Flash | Map Settings & Geometry Accuracy | Added a Layer Control dropdown to toggle between Basemaps (Satellite, Terrain, Positron, etc) and set Esri Terrain as the default. Built a script to query the OpenStreetMap Overpass API (`fetch_osm.py`) to extract the exact real-world line geometries for the Continental Divide, the Colorado River Aqueduct, and the All-American Canal. |
| **2026-09-27** | Gemini 3.8 Flash | Authoritative USGS Watershed Divide & Complete Canal Routing | Discovered that OSM queries were returning fractured, incomplete lines. Shifted to the official USGS Watershed Boundary Dataset (WBD HUC2 10, 14, and 15) to mathematically extract the exact, continuous 2,763-point Continental Divide spanning from Canada through Colorado (directly over all 4 Front Range tunnels) to Mexico. Reconstructed the full 264-point All-American Canal along the Mexico border and the complete 32-point 242-mile Colorado River Aqueduct across the Mojave Desert. Restored Esri Terrain as the default basemap with a persistent Basemap dropdown. |
| **2026-09-27** | Gemini 3.8 Flash | Dynamic Zoom Collision Avoidance & Leader-Line Relaxation | Designed and implemented a screen-space collision relaxation algorithm (`resolveLabelCollisions` in `app.js`). Hooks into Leaflet's `zoomend` and `moveend` events to calculate 2D bounding boxes in container pixel space. Automatically fans out and separates overlapping callout boxes vertically when zoomed out, smoothly pulls them closer to their true geographic coordinates when zoomed in, and animates both the SVG leader lines and boxes via CSS transitions. |
| **2026-09-27** | Gemini 3.8 Flash | Continuous River Thalweg & Leaflet Map Pane Layering | Removed `.difference(lake_polygons)` in `process_river.py` to keep the natural Colorado River thalweg completely continuous and unbroken through Lake Powell and Lake Mead, eliminating fragmented slivers and gaps. Introduced custom Leaflet map panes (`riverPane` zIndex 410, `lakesPane` zIndex 420) so the lake water bodies naturally layer cleanly on top of the river channel. If the reservoirs layer is toggled off, the complete unbroken river is visible from source to sea. |
| **2026-09-27** | Gemini 3.8 Flash | USGS Mainstem Centerline (LevelPathI) & Cache Busting | Identified that querying by `gnis_name = 'Colorado River'` missed the thalweg flowlines submerged beneath Lake Powell and Lake Mead because USGS tags submerged paths as `FTYPE=ArtificialPath` with blank names. Switched to querying the authoritative USGS NHD mainstem ID (`LevelPathI = 720000024`), pulling all 1,874 contiguous segments across Lake Powell (437 points) and Lake Mead (178 points). Added cache-busting timestamps (`?t=Date.now()`) to all JSON fetches in `app.js` and `index.html` to eliminate browser caching issues. |
