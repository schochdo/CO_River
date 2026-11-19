# Changelog

All notable changes to the Colorado River Basin Hydrologic Intelligence & Infrastructure Topology Platform will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project adheres to semantic academic versioning organized by granular work days.

---

## [2.3.0] - 2026-11-17 – 2026-11-19
### Removed
- **Redundant OS Fullscreen Toggle & Remote Desktop Spaces Glitch (`web/index.html`):**
  - Removed the redundant `Toggle Fullscreen` button from the primary sidebar and eliminated `document.documentElement.requestFullscreen()` and `fullscreenchange` event listeners.
  - Calling the HTML5 Fullscreen API on macOS triggers Quartz WindowServer to spawn a brand-new Mission Control Virtual Space (e.g. Space 2) and horizontally slide the window over, which breaks remote desktop sessions (Apple Screen Sharing, VNC, Chrome Remote Desktop, Microsoft RDP) whose display capture buffer remains pinned to Desktop 1, leaving users stranded staring at Finder or background windows.
  - Native window maximization is natively supported via the operating system (`Ctrl+Cmd+F`, `F11`, or `Option`-clicking the green macOS window circle to zoom without creating a new Space).

### Fixed
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
