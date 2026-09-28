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
