# Colorado River Basin Hydrologic & Legal Knowledge Base

> **Authoritative Technical & Policy Reference for Autonomous Sessions**  
> *Course Context:* DAT1001 • Colorado Mountain College • Author: Douglas Schoch  
> *Scope:* Hydrologic physics, statutory Law of the River, authoritative gage registries, reservoir elevations, and API data contracts.  
> *Usage Rule:* Consult this document before improvising, querying search engines, or extrapolating basin data. Every metric here is physically or legally verified.

---

## 1. Quick Q&A Reference Index

| Common Session Question | Verified Domain Answer & Citation |
|---|---|
| **Where is Hoover Dam geographically located?** | On the Nevada–Arizona state border inside Black Canyon at river mile 1,000 (`36.0157° N, -114.7378° W`). West abutment is Clark County, NV; east abutment is Mohave County, AZ. |
| **How does Nevada draw water from Lake Mead?** | Southern Nevada Water Authority (SNWA) operates three deep intake "straws" (Pumping Station 1, 2, and the deep Intake 3 at elevation 860 ft). Nevada's net allocation is 0.30 MAF/yr, but Las Vegas recycles virtually all indoor water via the Las Vegas Wash, earning return flow credits that allow 0.45+ MAF gross diversions. |
| **What is the difference between "Lee Ferry" and "Lees Ferry"?** | **Lees Ferry** (with apostrophe/s) is the historic ferry crossing, boat launch, and active USGS streamgage site (`#09380000`) located at river mile 551.0, 15.8 miles below Glen Canyon Dam. **Lee Ferry** (singular, no 's') is the official statutory dividing point defined in the 1922 Compact, located **1.0 mile downstream** from the mouth of the Paria River (`#09382000`). |
| **Why does Lake Powell absorb San Juan River flash floods without Lees Ferry flow changing?** | Lake Powell is an impounded slackwater pool (26.2M AF capacity, velocity $\approx 0$). Inflows enter the dead/active storage pool. Glen Canyon Dam releases are governed strictly by WAPA hydroelectric schedules and the 2016 LTEMP Record of Decision, not by instantaneous tributary inflows. |
| **Why can't Gila River floods help Lake Mead or Lake Powell?** | The Gila River confluence is at Dome/Yuma, AZ at elevation **120 ft MSL**, physically hundreds of miles downstream and thousands of feet lower than Lake Mead (1,065 ft MSL) and Lake Powell (3,540 ft MSL). Water cannot flow uphill. Gila floods flow into the Morelos Dam reach and Mexico. |
| **What is the Structural Deficit?** | An annual imbalance of **+3.90 MAF/yr** over natural baseline runoff (and **+6.60 MAF/yr** during modern post-2000 megadrought flows). Physical supply is ~15.2 MAF/yr (modern wet water ~12.4 MAF/yr); legal paper rights and systemic losses total **19.10 MAF/yr**. |
| **What is the Richards-Baker Flashiness Index (RBI)?** | $\text{RBI} = \frac{\sum_{t=1}^n |q_t - q_{t-1}|}{\sum_{t=1}^n q_t}$. A dimensionless ratio of daily flow oscillations to total volume. Dam-regulated reaches score $<0.020$; natural snowmelt scores $0.020\text{–}0.060$; flashy desert monsoons score $\ge 0.060$. |
| **What are the 6 major tributaries and their runoff?** | Green River (4.90 MAF), Gunnison River (2.10 MAF), San Juan River (2.50 MAF), Little Colorado River (0.25 MAF), Virgin River (0.18 MAF), and Gila River (0.87 MAF). |

---

## 2. Basin Water Budget: The Master Rosetta Stone

The most common error in Western water analysis is confusing legal paper claims with physical wet water. The platform adheres strictly to the following mass-balance accounting:

```
+----------------------------------------------------------------------------------------------------+
|                               THE COLORADO RIVER WATER BUDGET PARADOX                              |
+----------------------------------------------------------------------------------------------------+
|  PHYSICAL WATER SUPPLY (Where water originates):                                                    |
|  - Upper Basin Snowmelt (Above Lee's Ferry):  13.90 MAF/yr  (91.4% of total basin runoff)          |
|  - Lower Basin Tributaries (Below Lee's Ferry): 1.30 MAF/yr  ( 8.6% of total basin runoff)          |
|  ========================================================================================          |
|  TOTAL NATURAL RUNOFF (Historical Mean):      15.20 MAF/yr  (100.0%)                               |
|  MODERN 21ST CENTURY WET WATER (Post-2000):   ~12.40 to 12.50 MAF/yr (Megadrought reality)         |
+----------------------------------------------------------------------------------------------------+
|  STATUTORY DEMANDS & PAPER ALLOCATIONS (Where claims exist):                                       |
|  - Upper Basin Statutory Apportionment:        7.50 MAF/yr  (39.3% of total demand)                |
|  - Lower Basin Mainstem Apportionment:         7.50 MAF/yr  (39.3% of total demand)                |
|  - Lower Basin Article III(b) Right:           1.00 MAF/yr  ( 5.2% of total demand)                |
|  - 1944 Mexican Treaty Obligation:             1.50 MAF/yr  ( 7.9% of total demand)                |
|  - Uncounted System Losses (Evaporation/Seep): 1.60 MAF/yr  ( 8.3% of total demand)                |
|  ========================================================================================          |
|  TOTAL PAPER COMMITMENTS:                     19.10 MAF/yr  (100.0%)                               |
+----------------------------------------------------------------------------------------------------+
|  THE STRUCTURAL OVERDRAFT (The Gap):                                                               |
|  - Overdraft vs. Historical Natural Runoff:   +3.90 MAF/yr                                         |
|  - Overdraft vs. Modern Drought Runoff:       +6.60 MAF/yr                                         |
|                                                                                                    |
|  THE CORE GEOGRAPHIC PARADOX:                                                                      |
|  91.4% of physical water enters ABOVE Lee's Ferry.                                                 |
|  60.7% of legal claims and systemic evaporation occur BELOW Lee's Ferry.                           |
+----------------------------------------------------------------------------------------------------+
```

### Dimensional Conversion Bridge (Strict Hygiene Rule)
- **Discharge Rate:** $Q = \frac{dV}{dt}$ in cubic feet per second (cfs). Operational, instantaneous.
- **Volumetric Mass:** $V = \int Q \, dt$ in Million Acre-Feet (MAF) or Acre-Feet (AF). Cumulative, annual.
- **Physical Conversion Constant:**
  $$1\text{ cfs sustained for 1 year} = 723.97\text{ AF} \approx 0.000724\text{ MAF}$$
  $$1\text{ MAF/yr sustained} = 1,381.27\text{ cfs}$$

---

## 3. Physical Geography & Tributary Inflow Accounting

All river reaches must maintain mass-balance closure at confluences:
$$\text{Reach Discharge} \approx \text{Upstream Mainstem} + \text{Tributary Inflow} - \text{Diversions} - \text{Seepage/Evaporation}$$

| Tributary River | Mean Runoff (MAF/yr) | Share of Inflow | Alpine Headwaters Crest | Confluence Node & Elevation | Sentinel USGS Gage |
|---|---|---|---|---|---|
| **Green River** | **4.90 MAF** | 32.2% | Wind River Range, WY (13,800 ft) | Cataract Canyon, Canyonlands, UT (3,880 ft, Mile 380) | #09315000 Green River at Green River, UT |
| **Colorado Mainstem Headwaters** | **4.00 MAF** | 26.3% | Continental Divide, Rocky Mtn NP (12,800 ft) | Confluence above Canyonlands (3,880 ft, Mile 380) | #09180500 Colorado River near Cisco, UT |
| **San Juan River** | **2.50 MAF** | 16.4% | San Juan Mountains, CO/NM (11,500 ft) | Lake Powell Pool, UT (3,540 ft, Mile 480) | #09379500 San Juan River at Mexican Hat, UT |
| **Gunnison River** | **2.10 MAF** | 13.8% | Elk Mountains, CO (12,000 ft) | Grand Junction, CO (4,790 ft, Mile 190) | #09152500 Gunnison River nr Grand Junction |
| **Dolores River & Upper Minor** | **0.80 MAF** | 5.3% | San Miguel & La Plata Mtns, CO (11,000 ft) | Cisco reach above Moab, UT (4,050 ft, Mile 340) | #09180000 Dolores River near Cisco, UT |
| **Gila River & Lower Tributaries** | **0.87 MAF** | 5.7% | Black Range / Mogollon Rim, NM/AZ (8,000 ft) | Yuma, AZ above Morelos Dam (105 ft, Mile 1,380) | #09520500 Gila River near Dome, AZ |
| **Little Colorado River** | **0.25 MAF** | 1.6% | White Mountains, AZ (9,500 ft) | Marble Canyon, Grand Canyon, AZ (2,420 ft, Mile 615) | #09402000 Little Colorado at Cameron, AZ |
| **Virgin River** | **0.18 MAF** | 1.2% | Zion National Park Plateau, UT (9,000 ft) | Lake Mead Overton Arm, NV (1,065 ft, Mile 780) | #09415000 Virgin River at Littlefield, AZ |

### Trans-Mountain Out-of-Basin Diversions (Continental Divide Tunnels)
The Upper Basin exports ~450,000 to 500,000 AF/yr beneath the Continental Divide into the South Platte and Arkansas River basins on Colorado's Front Range:
1. **Alva B. Adams Tunnel (`ADATUNCO`):** Colorado-Big Thompson (C-BT) Project. Pulls from Shadow Mountain / Grand Lake under Rocky Mountain National Park to Estes Park. Capacity: 550 cfs (~220,000 AF/yr).
2. **Harold D. Roberts Tunnel (`ROBTUNCO`):** Denver Water. 23.3-mile conduit diverting Dillon Reservoir under Front Range to South Platte. Capacity: 1,020 cfs (~60,000 AF/yr).
3. **Moffat Water Tunnel (`MOFTUNCO`):** Denver Water. Diverts Fraser and Williams Fork rivers beneath James Peak. Capacity: 600 cfs (~50,000 AF/yr).
4. **Charles H. Boustead Tunnel (`BOUTUNCO`):** Fryingpan-Arkansas Project. Diverts Fryingpan River headwaters to Turquoise Lake. Capacity: 945 cfs (~55,000 AF/yr).

---

## 4. Storage Impoundments & Reservoir Elevation Thresholds

```
Lake Powell (Glen Canyon Dam)                 Lake Mead (Hoover Dam)
Elevation (ft NGVD 1929)                      Elevation (ft NGVD 1929)
3,700 ft ----------------- Full Pool (26.2M)  1,221.4 ft -------------- Spillway Crest (26.1M)
3,648 ft ----------------- Top of Joint Use   1,075.0 ft -------------- Tier 1 Shortage (DCP Trigger)
3,490 ft ----------------- Min Power Pool     1,050.0 ft -------------- Tier 2 Shortage
3,370 ft ----------------- Dead Pool (River   1,025.0 ft -------------- Tier 3 Shortage
                           Outlet Works)        950.0 ft -------------- Min Power Pool (No Hydro)
                                                895.0 ft -------------- Dead Pool (Intake 3 Only)
```

### Complete Capacity & Elevation Matrix

| Reservoir Name | Dam Facility | River Reached | Total Capacity | Surface Elevation (Full Pool) | Inflow Control Station | Tailwater Release Station |
|---|---|---|---|---|---|---|
| **Lake Powell** | Glen Canyon Dam | Mainstem (Mile 535) | 26,215,000 AF | 3,700.0 ft | #09180500 Cisco + #09315000 Green | #09380000 Lees Ferry |
| **Lake Mead** | Hoover Dam | Mainstem (Mile 1,000) | 26,134,000 AF | 1,221.4 ft | #09404208 Grand Wash Cliffs | `USBR-HOOVER` Hoover Tailrace |
| **Flaming Gorge** | Flaming Gorge Dam | Green River, UT/WY | 3,788,900 AF | 6,040.0 ft | #09217000 Green River, WY | #09234500 nr Greendale, UT |
| **Navajo Reservoir** | Navajo Dam | San Juan River, NM | 1,696,000 AF | 6,085.0 ft | #09365000 San Juan at Archuleta | #09365000 Archuleta Tailrace |
| **Lake Mohave** | Davis Dam | Mainstem (Mile 1,067) | 1,809,800 AF | 647.0 ft | `USBR-HOOVER` Tailrace | `USBR-DAVIS` Davis Dam |
| **Blue Mesa** | Blue Mesa Dam | Gunnison River, CO | 829,500 AF | 7,519.0 ft | #09114500 Gunnison nr Gunnison | #09128000 blw Gunnison Tunnel |
| **Lake Havasu** | Parker Dam | Mainstem (Mile 1,123) | 619,400 AF | 450.0 ft | `USBR-DAVIS` Tailrace | `USBR-PARKER` Parker Dam |
| **Dillon Reservoir** | Dillon Dam | Blue River, CO | 257,110 AF | 9,017.0 ft | #09046600 Blue nr Dillon | #09050700 Blue blw Dillon |
| **Lake Granby** | Granby Dam | Upper Mainstem, CO | 539,800 AF | 8,280.0 ft | #09010500 Baker Gulch | #09019500 Colorado blw Granby |

---

## 5. Operational Hydrology & Dam Hydrodynamics

### A. The Diurnal Hydropeaking Wave (Glen Canyon & Hoover)
- **Grid Economics:** Glen Canyon (1,320 MW) and Hoover (2,080 MW) are the Western Area Power Administration's (WAPA) primary peaking units. Spot electricity rates surge between 12:00 PM and 8:00 PM and plummet between 1:00 AM and 5:00 AM. Turbines open to generate valuable power during price peaks ($7,000\text{ to }14,000+\text{ cfs}$) and throttle down overnight.
- **Kinematic Sine Waves:** As pulses travel down the 277 miles of Grand Canyon, friction and channel storage disperse the wave, rounding steep surges into regular 24-hour sinusoidal oscillations.
- **Wave Travel Lag:**
  - Glen Canyon Dam $\rightarrow$ Lees Ferry (`#09380000`, Mile 15.8): **1.5 to 2 hours**
  - Lees Ferry $\rightarrow$ Phantom Ranch (`#09402500`, Mile 88): **14 to 18 hours**
  - Phantom Ranch $\rightarrow$ Diamond Creek (`#09404200`, Mile 225): **18 to 24 hours**
  - Diamond Creek $\rightarrow$ Lake Mead (`#09404208`, Mile 277): **8 to 12 hours**
- **Re-Regulation Difference:**
  - **Glen Canyon:** Completely un-re-regulated. Pulses flow continuously through Grand Canyon National Park into Lake Mead.
  - **Hoover Dam:** Directly re-regulated downstream by **Davis Dam** (Lake Mohave) and **Parker Dam** (Lake Havasu). Hydropeaking waves from Hoover are smoothed into constant, steady flows feeding the CAP and CRA canal diversions.

---

## 6. The Law of the River: Master Statutory & Judicial Reference

| Year | Landmark Instrument | Core Principle & Practical Operational Consequence |
|---|---|---|
| **1849** | **Mining Customs & Prior Appropriation** | *"First in time, first in right."* Established senior rights based on date of diversion and continuous beneficial use. Created the statutory **forfeiture trap** ("Use It or Lose It") where senior irrigators who conserve water risk legal abandonment of their water rights. |
| **1908** | **Winters v. United States (207 U.S. 564)** | Established implied federal reserved water rights for Indian tribes dating to reservation creation, with priority senior to virtually all state appropriators. The 30 Basin tribes hold recognized rights to ~3.2 MAF/yr (>25% of basin flow). |
| **1922** | **Wyoming v. Colorado (259 U.S. 419)** | Supreme Court held that prior appropriation applies across state lines without regard to state borders. Fast-growing downstream California would have legally captured the entire river, forcing the Upper Basin to demand an interstate compact. |
| **1922** | **Colorado River Compact** | Divided basin at Lee Ferry into Upper and Lower Basins. Apportioned 7.50 MAF/yr to each basin in perpetuity (Article III.a), plus an additional 1.00 MAF/yr to the Lower Basin (Article III.b). Mandated the Upper Basin deliver 75.0 MAF over every 10-year rolling period (Article III.d). **Core Flaw:** Pluvial overestimate based on the unusually wet 1905–1922 period (~17.5 MAF assumed vs ~12.4 MAF real flow). |
| **1928** | **Boulder Canyon Project Act** | Authorized Hoover Dam and All-American Canal. Ratified 1922 Compact without Arizona. Required California to limit consumption to 4.40 MAF/yr plus half of surplus. Apportioned Lower Basin mainstem: California 4.40 MAF, Arizona 2.80 MAF, Nevada 0.30 MAF. |
| **1944** | **Mexican Water Treaty (TS 994)** | Obligated U.S. to deliver 1.50 MAF/yr to Mexico at Morelos Dam (Article 10). Article III(c) of 1922 Compact requires both Upper and Lower Basins to share this burden equally (0.75 MAF each) in shortage years. |
| **1948** | **Upper Colorado River Basin Compact** | Apportioned Upper Basin water by **percentage** rather than fixed volume: Colorado **51.75%**, Utah **23.00%**, Wyoming **14.00%**, New Mexico **11.25%**, and Arizona (Upper) 50,000 AF. Guaranteed the Upper Basin cannot suffer fixed-volume default during droughts. |
| **1956** | **Colorado River Storage Project (CRSP) Act** | Authorized Glen Canyon, Flaming Gorge, Navajo, and Wayne N. Aspinall (Curecanti) dams. Function as "cash register" power dams to fund irrigation and hold water in reserve to satisfy the 10-year 75 MAF Compact delivery at Lee Ferry. |
| **1963** | **Arizona v. California (373 U.S. 546)** | Supreme Court ruled: 1) The 1922 Compact governs only mainstream Colorado River water, strictly excluding Arizona's Gila River tributary; 2) The Secretary of the Interior is the sole statutory Water Master for the Lower Basin; 3) Recognized Present Perfected Rights (PPRs) senior to the 1928 Act (e.g. Imperial Irrigation District ~3.1 MAF). |
| **1968** | **Colorado River Basin Project Act** | Authorized the Central Arizona Project (CAP). To win California's congressional votes, Arizona agreed to the **subordination clause**: during shortages, CAP canal deliveries are cut to zero before California loses a single acre-foot of its 4.40 MAF allocation. |
| **2007** | **Interim Guidelines for Lower Basin Shortages** | Tied Lower Basin delivery cuts to Lake Mead surface elevations (Tier 1: 1,075 ft; Tier 2: 1,050 ft; Tier 3: 1,025 ft). Synchronized Lake Powell and Lake Mead operational balancing tiers. |
| **2019** | **Drought Contingency Plans (DCP)** | Upper Basin: Drought Response Operations Agreement (DROA) releasing upstream CRSP water (Flaming Gorge, Blue Mesa) to defend Lake Powell 3,490 ft power pool. Lower Basin: Voluntary contributions by CA, NV, AZ to slow Mead's decline. |
| **Post-2026** | **Post-2026 Operational Framework** | Operating rules expire December 31, 2026. Required reductions: 2.0 to 4.0 MAF/yr permanent structural consumption cuts to bridge the gap between 12.4 MAF wet water and 19.1 MAF gross paper rights/losses. |

---

## 7. Major Diversion Canals & Conduits

| Canal / Aqueduct | Intake Waterbody & Dam | Annual Diversion | Flow Rate ($Q$) | Primary Beneficiary & Legal Priority |
|---|---|---|---|---|
| **All-American Canal (AAC)** | Imperial Dam (Mile 1,300) | **~2.60 to 3.10 MAF** | 4,000–11,500 cfs | Imperial Irrigation District (IID) & Coachella Valley. 1901 Present Perfected Rights (most senior priority in Lower Basin). |
| **Central Arizona Project (CAP)** | Lake Havasu / Mark Wilmer Pump | **~1.20 to 1.60 MAF** | 2,000–3,000 cfs | Phoenix, Tucson, & Central AZ agriculture. Junior priority; subordinated to California's 4.40 MAF allocation. |
| **Colorado River Aqueduct (CRA)** | Lake Havasu / Whitsett Intake | **~0.80 to 1.20 MAF** | 1,600–2,600 cfs | Metropolitan Water District of Southern California (MWD, Los Angeles & San Diego). Junior to IID agricultural rights. |
| **Canal Alimentador Central** | Morelos Dam, Mexicali (Mile 1,390) | **~1.50 MAF** | 1,500–2,000 cfs | Valle de Mexicali agriculture & San Luis Río Colorado under 1944 Mexican Treaty. |

---

## 8. Authoritative Agency Data APIs

When developing or updating data pipelines, query only these authoritative agency REST endpoints:

### 1. USGS National Water Information System (NWIS)
- **Instantaneous Values (IV) REST Service:**
  `https://waterservices.usgs.gov/nwis/iv/?sites={site_no}&parameterCd=00060&format=json`
- **Daily Values (DV) Mean Statistics:**
  `https://waterservices.usgs.gov/nwis/dv/?sites={site_no}&parameterCd=00060&format=json`
- **Reservoir Water Surface Elevation:**
  `https://waterservices.usgs.gov/nwis/iv/?sites={site_no}&parameterCd=62614&format=json`
- **Key Parameters:**
  - `00060`: Discharge in cubic feet per second (cfs)
  - `00065`: Gage height in feet (ft)
  - `62614`: Lake elevation in feet above NGVD 1929

### 2. Colorado Division of Water Resources (CDSS HydroBase v2)
- **Hourly Trans-Divide Tunnel Discharge:**
  `https://dwr.state.co.us/Rest/GET/api/v2/telemetrystations/telemetrytimeserieshour/?format=json&abbrev={ABBREV}`
- **Daily Reservoir Storage Accounting:**
  `https://dwr.state.co.us/Rest/GET/api/v2/telemetrystations/telemetrytimeseriesday/?format=json&abbrev={ABBREV}`
- **Key Stations:** `ADATUNCO` (Adams), `MOFTUNCO` (Moffat), `ROBTUNCO` (Roberts), `BOUTUNCO` (Boustead), `DILRESCO` (Dillon), `GRARESCO` (Granby), `GRERESCO` (Green Mtn), `HOMRESCO` (Homestake).

### 3. USBR Lower Colorado River Operations (HydroData / Hourly Teletype)
- **Hourly Hydroelectric Release Teletype:**
  `https://www.usbr.gov/lc/region/g4000/hourly/hourly.html`
- **Facilities:** Hoover Dam release (`USBR-HOOVER`), Davis Dam release (`USBR-DAVIS`), Parker Dam release (`USBR-PARKER`).
