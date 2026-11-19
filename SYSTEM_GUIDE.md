# Colorado River Basin Hydrologic Intelligence Platform: System Guide & Architecture

**Course Context:** Intro to Data Science (DAT1001) • Colorado Mountain College  
**Author:** Douglas Schoch  
**Scope:** Offline/Batch Python Geoprocessing + Real-Time NWIS/HydroBase Ingestion + Decoupled Static Web Dashboard  

---

## Table of Contents
1. [Executive Summary & Design Philosophy](#1-executive-summary--design-philosophy)
2. [The Basin Math Rosetta Stone](#2-the-basin-math-rosetta-stone)
3. [System Architecture & Frontend Tech Stack](#3-system-architecture--frontend-tech-stack)
4. [Data Ingestion Pipeline & Agency APIs](#4-data-ingestion-pipeline--agency-apis)
5. [Hydrologic Physics & Operational Rules](#5-hydrologic-physics--operational-rules)
   - [A. Dimensional Hygiene: Rate vs. Volume](#a-dimensional-hygiene-rate-vs-volume-conversion-bridge)
   - [B. Confluence Mass-Balance Law](#b-confluence-mass-balance-law)
   - [C. Richards-Baker Flashiness Index (RBI)](#c-richards-baker-flashiness-index-rbi)
   - [D. Travel Time to Lake Powell](#d-travel-time-to-lake-powell-lagged-hydrograph-arrival)
   - [E. Cartographic River Line Weighting](#e-cartographic-river-line-weighting)
   - [F. Dam Hydrodynamics & The Diurnal Hydropeaking Wave](#f-dam-hydrodynamics--the-diurnal-hydropeaking-wave)
   - [G. Flood Pulse Routing & Reservoir Buffering Physics](#g-flood-pulse-routing--reservoir-buffering-physics)
6. [Historical Policy Context & Infrastructure Phases](#6-historical-policy-context--infrastructure-phases)
7. [Cartographic Engineering & Topological Dilemmas](#7-cartographic-engineering--topological-dilemmas)
8. [Known Approximations & Data Limitations](#8-known-approximations--data-limitations)

---

## 1. Executive Summary & Design Philosophy

The **Colorado River Basin Hydrologic Intelligence Platform** is an academic research platform and interactive operational dashboard tracking the hydrology, legal allocations, historical storage drawdowns, and infrastructure of the 246,000-square-mile Colorado River Basin.

### Anti-SaaS Principles (Edward Tufte / Swiss Transit Standard)
Unlike generic corporate dashboards that rely on SaaS templates, this platform adheres strictly to domain-authentic cartographic and editorial design standards:
* **Zero SaaS Vanity Clutter:** No decorative green pulsing dots, fake version pills (`v24.2 Stable`), or arbitrary "System Health: 99.8%" badges.
* **Layout Authenticity:** Uses an editorial data journalism and transit schematic layout (high-contrast typography, crisp borders, generous whitespace) rather than generic metric card grids.
* **ColorBrewer & Okabe-Ito Colorblind Safety:** All visualizations adhere to standardized, colorblind-safe palettes (e.g. Okabe-Ito Blue `#0072B2`, Vermillion `#D55E00`, Bluish Green `#009E73`, Amber `#E69F00`, and ColorBrewer `RdYlBu`).
* **Editorial Inter Typography:** Monospaced fonts are reserved strictly for tabular numbers (`tabular-nums`) and engineering code IDs; all narrative prose uses clean, legible Inter.

---

## 2. The Basin Math Rosetta Stone

One of the greatest points of confusion in Western water policy is the multitude of numbers cited in legal documents and news reports: **15.0 MAF**, **16.0 MAF**, **16.5 MAF**, **17.5 MAF**, and **19.5 MAF**. Each number represents a distinct legal layer or physical reality. The table and step-by-step breakdown below synthesize these figures into a single, cohesive accounting ledger.

### The Master Allocation & Mass-Balance Ledger

| Allocation Layer | Legal Citation / Source | Upper Basin | Lower Basin | Mexico | Total Basin (MAF/yr) | Cumulative Gross (MAF/yr) |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: |
| **1. Core Compact Apportionment** | 1922 Compact, Art. III(a) | 7.50 | 7.50 | — | **15.00** | **15.00** |
| **2. Lower Basin Tributary Surplus** | 1922 Compact, Art. III(b) | — | 1.00 | — | **1.00** | **16.00** |
| **3. International Treaty Obligation** | 1944 Mexican Treaty (TS 994) | (0.75)* | (0.75)* | 1.50 | **1.50** | **17.50** |
| **Total Statutory Paper Allocations** | **Consumptive Beneficial Rights** | **7.50** | **8.50** | **1.50** | **17.50** | **17.50** |
| **4. Uncounted Reservoir Evaporation** | Measured (USBR/USGS) | ~0.60 | ~0.80 | — | **~1.40** | **~18.90** |
| **5. Riparian & Transit Seepage Losses** | Measured (USBR Lower Basin) | ~0.15 | ~0.45 | — | **~0.60** | **~19.50** |
| **Total Gross System Demand** | **Paper Rights + Physical Losses** | **~8.25** | **~9.75** | **1.50** | **~19.50** | **~19.50** |

*\*Note: Under Article III(c), Mexico's 1.5 MAF is satisfied first from surplus waters above 16.0 MAF; when a deficit occurs, the burden is split equally (50/50: 0.75 MAF each) between the Upper and Lower Basins.*

---

### Step-by-Step Breakdown: What Each Number Means

```
15.0 MAF ──[+1.0 III(b)]──> 16.0 MAF ──[+1.5 Treaty]──> 17.5 MAF ──[+2.0 Losses]──> 19.5 MAF
(Core Compact)             (Statutory Apportionment)   (Paper Water Total)         (Gross System Demand)
                                                                                          │
                                                                                          ▼
                                                                                   12.4 MAF (Wet Water)
                                                                                          │
                                                                                          ▼
                                                                             [-5.1 to -7.1 MAF Deficit]
```

#### 1. The 15.0 MAF Baseline (Article III.a)
The foundational compromise of the **1922 Colorado River Compact**. Negotiators at Bishop's Lodge in Santa Fe, NM divided **15.0 MAF/yr** of exclusive beneficial consumptive use in perpetuity:
* **7.5 MAF/yr** to the Upper Basin (CO, NM, UT, WY).
* **7.5 MAF/yr** to the Lower Basin (AZ, CA, NV).

#### 2. The 16.0 MAF Statutory Apportionment (Article III.b)
To persuade Arizona to sign the Compact, Article III(b) granted the Lower Basin the legal right to increase its consumptive use by **1.0 MAF/yr** (specifically intended to account for Arizona's exclusive use of the Gila River). This brought total statutory domestic apportionments to **16.0 MAF/yr**.

#### 3. The 16.5 MAF Figure (Core Apportionment + Treaty)
Frequently cited in academic literature ($15.0	ext{ MAF} + 1.5	ext{ MAF} = 16.5	ext{ MAF}$). It combines the Article III(a) domestic baseline with Mexico's guaranteed delivery under the 1944 Treaty, omitting the Article III(b) Lower Basin surplus.

#### 4. The 17.5 MAF Figure: Total Statutory Paper Water
The authoritative total legal paper rights allocated across the entire basin:
$$	ext{Total Paper Rights} = 7.5	ext{ (Upper III.a)} + 7.5	ext{ (Lower III.a)} + 1.0	ext{ (Lower III.b)} + 1.5	ext{ (Mexico)} = 17.5	ext{ MAF/yr}$$

#### 5. The ~19.3 to 19.5 MAF Figure: Gross System Demand
The 1922 Compact negotiators committed a fatal mathematical omission: they allocated paper water as if water flowed through frictionless, covered pipes with zero evaporation and zero riverbed seepage. In the real world, hot desert sun and riparian vegetation consume enormous quantities of water:
* **Reservoir Evaporation:** Lake Mead, Lake Powell, and Upper CRSP reservoirs lose an average of **~1.3 to 1.5 MAF/yr**.
* **Transit Seepage & Phreatophytes:** Riverbed infiltration and native saltcedar/cottonwoods consume **~0.4 to 0.6 MAF/yr** between Lee's Ferry and the Southern International Boundary.
* Adding physical losses to statutory commitments yields a **Gross Physical Demand of ~19.5 MAF/yr**.

---

### Wet Water vs. Paper Water: The Physical Inflow Reality

How much water does the river actually produce?

| Hydrologic Era | Time Period | Natural Virgin Flow at Lee's Ferry | Characterization & Data Provenance |
| :--- | :---: | :---: | :--- |
| **Compact Baseline** | 1905–1922 | **~16.4 to 17.5 MAF/yr** | Anomalously wet pluvial decade. Tree-ring reconstructions prove this was the wettest period in over 1,200 years. |
| **Instrumental Record** | 1906–2020 | **14.8 MAF/yr** | 115-year historical average calculated by USBR natural flow models. |
| **21st-Century Millennium Drought** | 2000–2026 | **12.4 MAF/yr** | Modern aridification era. A **16.2% decline** driven by higher temperatures, thirsty soils, and declining snowpack. |

### The Over-Allocation Arithmetic (The Deficit)
* **Statutory Deficit:** $12.4	ext{ MAF (Wet Water)} - 17.5	ext{ MAF (Paper Rights)} = \mathbf{-5.1	ext{ MAF/yr}}$.
* **Physical Gross Deficit:** $12.4	ext{ MAF (Wet Water)} - 19.5	ext{ MAF (Gross Demand)} = \mathbf{-7.1	ext{ MAF/yr}}$.

**How did the system survive this 25-year deficit?**  
The United States constructed approximately **60.0 MAF** of total reservoir storage (Hoover Dam, Glen Canyon Dam, Flaming Gorge, Navajo, Blue Mesa)—roughly 4 to 5 times the annual flow of the river. From 1999 to 2026, the basin cushioned the annual 5.1 MAF deficit by draining these reservoirs from near-full (**56.2 MAF / 93.7%** in 1984/1999) down to critical levels (**~17.7 MAF / 29.5%**) today.

---

## 3. System Architecture & Frontend Tech Stack

### Why This Is NOT a React or Next.js App
A common question from software engineers inspecting the dashboard is: *"Where are the React components, Node server, or Webpack configurations?"*

The application was deliberately engineered with **Zero-Framework Vanilla Web Architecture**:
* **Frontend Core:** Pure Semantic HTML5, Vanilla JavaScript (ES6+), and Tailwind CSS (via static utility build/CDN).
* **Mapping Engine:** MapLibre GL / Leaflet with dynamic client-side GeoJSON vector rendering and shaded terrain hillshading.
* **Diagrammatic Engines:**
  * **D3.js (v7):** Drives the true flow-proportional SVG Water Budget Sankey Diagram (`web/sankey.html`).
  * **Chart.js (v4):** Drives all time-series charts, 365-day seasonal mismatch curves, 90-year storage timelines, and standardized reservoir elevation heatmaps.
* **Why Vanilla JS?**
  1. **Instantaneous Load Times:** Zero JavaScript bundle compilation overhead.
  2. **100% Static Deployment:** Can be hosted on GitHub Pages, AWS S3, or local Python HTTP servers with zero monthly server costs.
  3. **Zero Cold-Start Latency:** No sleeping backend dynos, Node processes, or serverless cold starts.
  4. **Pedagogical Explainability:** In an academic context (DAT1001), vanilla DOM manipulation and explicit math functions are transparent, debuggable, and defensible without thousands of opaque `node_modules` dependencies.

---

### Dashboard Organization: Seven Specialized Views

The application provides seven purpose-built analytical tabs:

1. **Overview Briefing Deck (`web/index.html`):** A 10-minute presentation deck structured into four sequential acts with a sticky storyboard navigation bar and scroll-spy:
   - *Act 1: The Math Gap (-5.1 MAF)*
   - *Act 2: The Physical Seasonal Engine (365-day hydrographs & 96 refill vs 269 drain days)*
   - *Act 3: Buffer Exhaustion (90-year multi-reservoir drawdown)*
   - *Act 4: Consumptive Depletions & The 19th-Century Mining Law Paradox*
2. **System Map (`web/map_embed.html` via `web/index.html`):** Full-bleed MapLibre GL geospatial map featuring real-time USGS/USBR streamflow lines, dynamic flowline widths, Continental Divide vector, and 3D terrain flight navigation.
3. **Gage Telemetry Ledger (`web/telemetry.html`):** Tabular inventory of all 30+ real-time monitoring stations with sortable columns, reach groupings, and direct station deep links.
4. **River Flow Transit Schematic (`web/pipeline.html`):** Topological flow schematic tracing water through natural canyons, dams, and major diversions with flow-proportional SVG strokes.
5. **Water Budget Diagram (`web/sankey.html`):** D3.js Sankey diagram modeling the macro annualized mass balance from headwaters to delta.
6. **Reservoirs 1935–Today (`web/index.html`):** Interactive 90-year multi-reservoir storage timeline and standardized monthly elevation heatmaps for Lake Mead and Lake Powell.
7. **Tributaries & Deficit ML Analysis (`web/ml_analysis.html`):** Single-screen Gapminder dashboard featuring K-Means regime clustering, Richards-Baker Flashiness index, and lagged travel times to Lake Powell.

---

## 4. Data Ingestion Pipeline & Agency APIs

The backend data architecture is governed by a **3-Tier Resilient Fallback Model**:

```
[ Tier 1: Real-Time Client Fetch ] ──(fail/CORS)──> [ Tier 2: Local JSON Snapshot ] ──(fail)──> [ Tier 3: Statutory Normals ]
(Live USGS, CDWR, USBR APIs)                         (latest_metrics.json via cron)             (Historical P50 Medians)
```

### Agency Data Sources & Endpoints

1. **USGS NWIS (National Water Information System):**
   * *Instantaneous Values (IV) API:* Pulls real-time discharge ($Q$ in cfs, parameter `00060`) and gage height (`00065`) every 15 minutes.  
     `https://waterservices.usgs.gov/nwis/iv/?format=json&sites={site_ids}&parameterCd=00060&siteStatus=all`
   * *Daily Values (DV) API:* Used for conveyance canals (Central Arizona Project, Colorado River Aqueduct) where instantaneous telemetry is withheld or smoothed.
2. **CDWR HydroBase (Colorado Division of Water Resources):**
   * *REST API:* Pulls live trans-mountain diversion discharges across the Continental Divide (Adams Tunnel `ADATUNCO`, Moffat Tunnel `MOFTUNCO`, Roberts Tunnel `ROBTUNCO`, Boustead Tunnel `BOUSTUCO`).  
     `https://dwr.state.co.us/Rest/GET/api/v2/telemetrystations/telemetrytimeseriesday/?format=json&abbrev={abbrev}`
3. **USBR HydroData (Bureau of Reclamation Upper & Lower Colorado):**
   * Continuous daily reservoir CSV feeds and operational reports for Lake Powell, Flaming Gorge, Navajo, Blue Mesa, Lake Mohave, and Lake Havasu.
   * *Hourly Hoover Dam / Lake Mead Scraping:* Scrapes USBR Page 1 operational teletypes for hourly elevation and tailwater releases.
4. **USDA NRCS SNOTEL (Snow Telemetry):**
   * Tracks basin-wide Snow Water Equivalent (SWE) percent-of-median across Upper Basin alpine headwaters to predict April–July runoff.

---

## 5. Hydrologic Physics & Operational Rules

### A. Dimensional Hygiene: Rate vs. Volume Conversion Bridge
A permanent engineering rule enforced across this project is the strict separation of **instantaneous rates** from **cumulative volumes**:
* **Discharge Rate:** Instantaneous streamflow rate, expressed in **cubic feet per second (cfs)**.
* **Volumetric Storage / Depletion:** Cumulative physical water volume, expressed in **Acre-Feet (AF)** or **Million Acre-Feet (MAF)**.

#### The Physical Conversion Arithmetic
One acre-foot is the volume of water required to cover one acre of land to a depth of one foot (43,560 cubic feet). One cubic foot per second sustained for one 365-day year equates to:
- 1 cfs sustained for 1 day = 86,400 cubic feet/day ≈ 1.9835 AF/day
- 1 cfs sustained for 1 year = (86,400 × 365) / 43,560 = **723.97 AF/yr** ≈ **0.000724 MAF/yr**

**Quick Mental Conversions:**
* **1,000 cfs sustained for 1 year** ≈ 0.724 MAF/yr
* **1.0 MAF/yr continuous flow** ≈ 1,381.3 cfs
* **All-American Canal capacity (11,500 cfs)** ≈ 2.9 MAF/yr continuous equivalent

---

### B. Confluence Mass-Balance Law
At every junction in the river network, physical conservation of mass is strictly enforced:
$$\text{Downstream Flow} \approx \text{Upstream Flow} + \sum\text{Tributary Inflows} - \sum\text{Diversions} - \text{Evaporative Losses}$$
* The platform never renders discontinuous, unexplained jumps or drops in streamflow between adjacent reaches.

---

### C. Richards-Baker Flashiness Index (RBI)
Used in `notebooks/03_tributary_ml_analysis.ipynb` and `web/ml_analysis.html` to quantitatively distinguish snowmelt-dominated rivers from flash-flood-dominated tributaries:
$$\text{RBI} = \frac{\sum_{t=1}^{n} |Q_t - Q_{t-1}|}{\sum_{t=1}^{n} Q_t}$$
* **Low Flashiness (RBI < 0.15):** Stable, snowmelt-driven baseflow (Upper Colorado at Dotsero, Green River, Gunnison).
* **High Flashiness (RBI > 0.40):** Arid, monsoon-driven flash-flood channels (San Juan at Bluff, Little Colorado, Paria River).

---

### D. Travel Time to Lake Powell (Lagged Hydrograph Arrival)
To calculate physical travel times from Upper Basin sentinel gages to Lake Powell, daily hydrograph peaks are tracked across sequential reaches:
* **Empirical Arrival Offsets:**
  * San Juan River at Bluff, UT: **1.5 days**
  * Colorado River at Cisco, UT: **3.5 days**
  * Green River at Green River, UT: **4.5 days**
  * Gunnison River at Grand Junction, CO: **5.5 days**
  * Colorado River at Cameo, CO: **6.5 days**
  * Yampa River at Maybell, CO: **8.0 days**

---

### E. Cartographic River Line Weighting
To keep river reaches visible against shaded relief terrain without ballooning at high spring flows, MapLibre line widths follow a square-root transformation scaled to discharge:
$$\text{stroke\_width} = \text{clamp}\left(\text{min\_width},\, \text{max\_width},\, \text{base} + k\sqrt{Q}\right)$$

---

### F. Dam Hydrodynamics & The Diurnal Hydropeaking Wave
One of the most distinct physical patterns observed in high-frequency USGS streamflow data below major storage dams (most prominently at Lees Ferry below Glen Canyon Dam and below Hoover Dam) is a continuous, daily sinusoidal wave pattern. This is not natural river physics; it is the physical manifestation of **hydropeaking**—the coupling of electrical grid economics with legal environmental operating constraints:

1. **Electrical Grid Peaking Economics (The Driver):**
   - Unlike thermal (coal/nuclear) or base-load renewables, hydroelectric turbines can spin up or throttle back in seconds. Glen Canyon (1,320 MW) and Hoover (2,080 MW) operate as critical peaking plants for the Western Area Power Administration (WAPA) grid.
   - Turbines open during peak demand hours (12:00 PM – 8:00 PM) when regional desert air conditioning and commercial loads spike wholesale spot electricity prices.
   - Turbines throttle down overnight (1:00 AM – 5:00 AM) when power demand collapses, banking water in the reservoir pool.
   - Weekend industrial demand drops cause noticeable dips in peak amplitudes on Saturdays and Sundays.

2. **Environmental Operating Constraints (Why It Looks Like a Sine Wave):**
   - If dam gates opened and closed instantly, the hydrograph would be a jagged square step function. Prior to 1991, unconstrained releases swung from 1,000 to 30,000 cfs in minutes, triggering severe bank slumping, sandbar loss, and fish stranding in the Grand Canyon.
   - The **1996 Record of Decision (ROD)** and the **2016 Long-Term Experimental and Management Plan (LTEMP)** legally cap ramp rates:
     - **Up-ramp limit:** Capped at 4,000 cfs/hour.
     - **Down-ramp limit:** Capped at 1,500 cfs/hour (slower to prevent sandbar collapse from bank pore-water pressure).
     - **Daily fluctuation band:** Capped between 5,000 and 8,000 cfs total daily swing depending on the monthly release volume.
     - **Minimum floor:** Strict 5,000 cfs night / 8,000 cfs day conservation baseline.
   - As water travels down the channel, hydrodynamic friction and kinematic wave dispersion naturally round off the rising and falling limbs into a smooth diurnal sine wave.

3. **Downstream Re-Regulation: Glen Canyon vs. Hoover:**
   - **Glen Canyon Dam $\rightarrow$ Grand Canyon $\rightarrow$ Lake Mead:** Glen Canyon discharges into ~250 miles of free-flowing, unregulated river. The diurnal wave travels the entire length of the Grand Canyon, taking roughly **36 to 48 hours** to attenuate and disperse before entering Lake Mead's slackwater pool.
   - **Hoover Dam $\rightarrow$ Lake Mohave (Davis Dam) $\rightarrow$ Lake Havasu (Parker Dam):** Hoover hydropeaks for Southern California, Nevada, and Arizona power loads, but you do not see a wild sine wave downstream at Yuma or the canal headings. **Davis Dam** and **Parker Dam** function as **re-regulating reservoirs**, absorbing hourly power pulses into Lake Mohave and Lake Havasu and releasing a flat, steady discharge tailored strictly to downstream agricultural delivery schedules and the 1944 Mexican Treaty obligation.

4. **"Bug Flows" (The Summer Weekend Flatline):**
   - During summer months (May–August), Reclamation frequently conducts experimental "Bug Flows." On weekends, releases are held at a completely flat, non-fluctuating baseline. This prevents aquatic insect eggs (midges and caddisflies) laid on shoreline cobblestones from drying out when power demand drops, restoring the aquatic food web for native humpback chub and rainbow trout.

---

### G. Flood Pulse Routing & Reservoir Buffering Physics
When analyzing temporal replay data across the basin, flash floods and seasonal surges reveal critical mass-balance and topological truths that frequently confuse outside observers:

1. **Reservoir Slackwater Absorption (The Lake Powell Buffer):**
   - *Example:* On November 3, 2026, an intense autumn storm surge drove the San Juan River at Bluff (`09379500`) to **32,900 cfs** (a ~1,500% spike over its 2,100 cfs baseline).
   - *The Non-Response Downstream:* Lees Ferry (`09380000`), just downstream of Lake Powell, showed zero reaction, holding completely steady at its regulated ~7,000 cfs release.
   - *Physical Mechanism:* Lake Powell is an immense hydrologic buffer with a surface area over 100,000 acres. An inflow surge of 30,000 cfs sustained for 48 hours delivers $\approx 120,000\text{ AF}$. While massive in a narrow river canyon, $120,000\text{ AF}$ spread across Lake Powell's surface raises the reservoir pool by only a fraction of an inch ($\approx 1.2\text{ ft}$). Glen Canyon Dam releases water based on annual statutory delivery schedules, not incoming instantaneous storm surges.

2. **Topological & Elevation Decoupling (The Gila River Fallacy):**
   - *The Misconception:* "Why didn't flash flooding on the Gila River help Lake Mead or Lake Powell?"
   - *Physical Reality:* The Gila River confluence with the Colorado River occurs at **Dome / Yuma, Arizona** (River Mile 0 of the Lower Colorado, elevation $\approx 120\text{ ft}$ MSL), more than **350 river miles downstream** of Hoover Dam (Lake Mead elevation $\approx 1,060\text{ ft}$ MSL) and **650 river miles downstream** of Glen Canyon Dam (Lake Powell elevation $\approx 3,570\text{ ft}$ MSL).
   - Water flows downhill. A flood on the Gila River can only flow into the Southerly International Boundary toward the Gulf of California or be diverted at Morelos Dam. It is physically separated from Lakes Mead and Powell by hundreds of miles and thousands of feet of elevation.

---

## 6. Historical Policy Context & Infrastructure Phases

The plumbing of the Colorado River cannot be understood without examining the historical and legal doctrines that governed each era of construction:

### Phase 1: 1849 Gold Rush Mining Customs & Prior Appropriation
Western water law did not evolve from English Common Law (the Riparian Doctrine, which guarantees reasonable water access to anyone owning land along a riverbank). It originated in the lawless 1849 California gold rush mining camps:
1. **"First in Time, First in Right":** The first person to divert water and put it to "beneficial use" holds senior priority over all later arrivals, regardless of whether their land borders the stream.
2. **The "Use It or Lose It" Forfeiture Trap:** Under Western statutory law, if an appropriator diverts less than their full paper right, they risk forfeiting the unused portion to subsequent claimants. This creates a perverse statutory disincentive to conserve, actively encouraging flood-irrigation of low-value forage crops (alfalfa) in 115°F desert heat to protect senior paper rights.

### Phase 2: The 1922 Colorado River Compact
* Driven by California's rapid agricultural and urban expansion, the seven basin states convened to divide the river. Upper Basin states feared that under Prior Appropriation, California would establish senior claims to the entire river before upstream states could develop.
* Negotiators compromised by splitting the basin at **Lee's Ferry, Arizona** (a remote sandstone ferry crossing 16 miles below Glen Canyon Dam).
* Crucially, the Compact was negotiated during an anomalously wet pluvial decade (1905–1922), leading negotiators to divide **17.5 MAF/yr** of paper rights against an average 21st-century wet water flow of only **12.4 MAF/yr**.

### Phase 3: The Big Dam Era (1928–1968)
* **1928 Boulder Canyon Project Act:** Authorized **Hoover Dam** (Lake Mead) and the **All-American Canal** to tame springtime floods, generate hydroelectricity, and secure Southern California's water supply.
* **1944 Mexican Water Treaty:** Committed the United States to deliver **1.5 MAF/yr** to Mexico across the international boundary.
* **1956 Colorado River Storage Project (CRSP) Act:** Authorized **Glen Canyon Dam** (Lake Powell), Flaming Gorge, Navajo, and the Wayne N. Aspinall unit (Blue Mesa). Lake Powell was built specifically as a "cash register" dam and regulatory buffer so the Upper Basin could meet its 10-year, 75 MAF delivery obligation to the Lower Basin at Lee's Ferry without cutting upstream Colorado/Utah water users during drought.
* **1968 Colorado River Basin Project Act:** Authorized the **Central Arizona Project (CAP)** to pump water 336 miles uphill to Phoenix and Tucson. In exchange for California's congressional support, Arizona was forced to agree that **CAP would hold junior priority to California's 4.4 MAF allocation**. When shortages strike, CAP absorbs mandatory cuts while California agriculture takes none.

### Phase 4: Aridification & The Post-2026 Operating Cliff
* From 2000 to 2026, climate-change-induced aridification reduced runoff by 16.2%. The seven states negotiated temporary stopgap agreements:
  * **2007 Interim Guidelines:** Tied Glen Canyon dam releases directly to Lake Mead's surface elevation.
  * **2019 Drought Contingency Plans (DCP):** Imposed tiered voluntary and mandatory delivery cuts on Arizona, Nevada, and Mexico.
* **The December 31, 2026 Cliff:** The 2007 Guidelines and 2019 DCP expire simultaneously at the end of 2026. The seven states are currently deadlocked in federal negotiations to permanently reduce consumption by 2 to 4 MAF/yr to match physical hydrology.

---

## 7. Cartographic Engineering & Topological Dilemmas

### The Inherent Gaging Dilemma (0D Points vs. 1D River Lines)
A fundamental engineering challenge in river visualization is the dimensional mismatch between monitoring gages and river reaches:
* **Streamflow Gages are 0D Points:** A gage measures discharge at a single, discrete cross-section at a specific latitude/longitude.
* **River Reaches are 1D Vector Polylines:** A reach extends over 30 to 80 miles of winding canyon, during which groundwater seepage, evaporation, unmonitored tributary trickles, and agricultural return flows constantly alter the flow.
* **The Attribution Trap:** Attributing a single gage's discharge to an entire 60-mile reach is a necessary mathematical approximation. If a reach is split directly at a gage, the segment immediately above the gage looks thin while the segment below looks thick (or vice versa), creating a jarring, artificial visual break on the map.

### Node-Only Reach Splitting (The Topology Fix)
To eliminate artificial visual flow drops and preserve mass balance:
* **The Rule:** Reaches must only split at **true physical nodes**—confluences with significant tributaries or physical civil engineering structures (dams, diversion gates).
* **Sentinel Pin Separation:** Streamflow gages are rendered as independent point markers elevated on a higher cartographic z-index (`streamflow-gauges-circle`), acting as empirical verification checks along the reach rather than polyline slicing boundaries.

### Dynamic Hit Buffers (24px Interaction Zones)
On high-density mobile and Retina displays, clicking on a 2px-wide stream vector causes frustrating pixel-hunting. The platform renders an invisible parallel vector layer (`line-width: 24px`, `opacity: 0.0001`) behind every reach, tunnel, and canal to capture mouse hover and touch events effortlessly.

---

## 8. Known Approximations & Data Limitations

1. **Agency Telemetry Latency:**
   * USGS instantaneous streamflow refreshes every 15 to 60 minutes.
   * CDWR diversion records refresh once daily.
   * USBR hourly teletype reports run on local operational log cycles.
   * The dashboard harmonizes these feeds into a synchronized snapshot via `latest_metrics.json`.
2. **Unmonitored Tributary Inflows & Return Flows:**
   * Minor ungaged desert washes and agricultural field drainage can occasionally cause downstream gages to read slightly higher than upstream gages without a named gaged tributary.
3. **Reservoir Sedimentation:**
   * Lake Powell and Lake Mead accumulate millions of tons of sediment annually behind their dam walls. While the dashboard uses USBR elevation-storage capacity tables, bathymetric silt accumulation gradually reduces true storage over decadal timescales.
4. **Static Statutory Transit Schematic vs. Live Gaged Map:**
   * The River Transit Schematic (`web/pipeline.html`) uses multi-year statutory allocation weights ($MAF/yr$) to explain the macro plumbing of the basin. The System Map (`web/map_embed.html`) displays real-time instantaneous rates ($cfs$) reflecting live snowmelt, rainfall, and dam pulses.

---
*System Guide compiled directly from verified workspace source code, official USGS/USBR datasets, and Colorado River legal compacts.*
