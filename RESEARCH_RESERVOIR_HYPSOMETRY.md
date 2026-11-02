# Hydro-Bathymetric Geometry: Elevation vs. Fill Volume (The Hypsometric Principle)

**Author:** Douglas Schoch  
**Project:** Colorado River Basin Hydrology & Capstone Research (DAT1001)  
**Domain Standard:** Anti-SaaS / Tufte Hydrological Mass-Balance  

---

## 1. The Core Scientific Premise

A widespread public and policy misconception is that **reservoir pool elevation** ($z$, feet above sea level) scales linearly with **stored water volume** ($V$, Million Acre-Feet). In reality, natural canyon reservoirs are not vertical geometric cylinders; they are carved dendritic river canyons and multi-tiered desert valleys whose horizontal cross-sectional surface area expands rapidly as elevation increases.

Mathematically, cumulative storage is the definite integral of water surface area $A(h)$ with respect to elevation:

$$V(z) = \int_{z_{\text{dead}}}^{z} A(h) \, dh \quad \Longleftrightarrow \quad \frac{dV}{dz} = A(z)$$

The **marginal water yield per foot of elevation change** ($\frac{dV}{dz}$) is identical to the instantaneous lake surface area at that elevation. 

---

## 2. Lake Mead (Hoover Dam) Hypsometric Profile

Lake Mead spans from the deep, narrow Black Canyon and Boulder Canyon into the broad expanses of the Virgin Basin, Temple Bar, and Gregg Basin.

```
Elevation (ft NGVD29)       Surface Area (Acres)     Marginal Vol / Foot (AF/ft)      Cumulative Live Storage (MAF)
1,221.4 (Spillway Crest)   ░░░░░░░░░░░░░░░░ 158,000   160,000 AF / ft (80,700 cfs-day)  26.13 MAF (100.0%)
1,150.0                    ░░░░░░░░░░░░ 122,000       125,000 AF / ft                   16.30 MAF ( 62.4%)
1,075.0 (Tier 1 Trigger)   ░░░░░░░░ 82,000             85,000 AF / ft                    9.60 MAF ( 36.7%)
1,040.0 (Drought Record)   ░░░░░░ 65,000               68,000 AF / ft                    6.95 MAF ( 26.6%)
  950.0 (Min Power Pool)   ░░░░ 41,000                 43,000 AF / ft                    2.00 MAF (  7.7%)
  895.0 (Dead Pool Sill)   ░░ 28,000                   28,000 AF / ft                    0.00 MAF (  0.0%)
```

### Key Quantitative Comparisons
1. **$1\text{ Foot}$ at Full Pool ($1,221.4\text{ ft}$)** stores **$\sim 160,000\text{ AF}$**—nearly **$6\times$ more water** than $1\text{ foot}$ at Dead Pool ($28,000\text{ AF}$), and **$2.4\times$ more** than $1\text{ foot}$ at the 2022 drought low ($68,000\text{ AF}$).
2. **The "Disappearing Water" Effect:** Between $1,220\text{ ft}$ and $1,150\text{ ft}$ ($70\text{ ft}$ drop), Lake Mead surrenders **$9.83\text{ MAF}$** of storage ($\sim 140,000\text{ AF/ft}$). But between $1,020\text{ ft}$ and $950\text{ ft}$ (the same $70\text{ ft}$ drop), the lake yields only **$4.0\text{ MAF}$** ($\sim 57,000\text{ AF/ft}$).

---

## 3. Lake Powell (Glen Canyon Dam) Hypsometric Profile

Lake Powell fills the deeply incised Navajo and Wingate sandstone canyons, with broad submerged bays at Wahweap, Padre Bay, and Bullfrog Basin.

```
Elevation (ft NGVD29)       Surface Area (Acres)     Marginal Vol / Foot (AF/ft)      Cumulative Live Storage (MAF)
3,700.0 (Full Pool Crest)  ░░░░░░░░░░░░░░░░ 161,000   163,000 AF / ft                   24.32 MAF (100.0%)
3,648.0 (Joint Use Pool)   ░░░░░░░░░░░░░ 128,000      131,000 AF / ft                   17.10 MAF ( 70.3%)
3,575.0                    ░░░░░░░░ 83,000             86,000 AF / ft                    9.50 MAF ( 39.1%)
3,532.0 (Current Pool)     ░░░░░░ 64,000               66,000 AF / ft                    5.95 MAF ( 24.5%)
3,490.0 (Min Power Pool)   ░░░░ 51,000                 53,000 AF / ft                    4.00 MAF ( 16.4%)
3,370.0 (Dead Pool Sill)   ░░ 22,000                   23,000 AF / ft                    0.00 MAF (  0.0%)
```

---

## 4. Hydrologic Operational Implications

### A. The "False Spring Rebound" Illusion
When Lake Powell or Lake Mead is depleted into critical drought pools, a modest seasonal snowmelt pulse (e.g., $600,000\text{ AF}$) causes the water surface elevation to spike upward by **$9\text{ to }10\text{ feet}$**, generating deceptive headlines that drought recovery is rapid. When the reservoir is near full, that identical $600,000\text{ AF}$ inflow raises the elevation by only **$3.7\text{ feet}$**.

### B. The Accelerating Drawdown Trap
When downstream consumptive demand and evaporation continuously exceed tributary inflows (the Colorado River allocation deficit), **the vertical elevation drop accelerates exponentially**. As the canyon narrows, each vertical foot drawn down releases fewer acre-feet, forcing dam operators to drop pool levels at higher rates of vertical speed to meet statutory downstream delivery orders (such as the 1922 Compact $7.5\text{ MAF}$ delivery requirement at Lee's Ferry).

### C. Sedimentation Wedging
Over 60 to 90 years of continuous operation, upstream sediment carried by the Colorado, Green, and San Juan rivers settles preferentially in the deepest, lowest canyon pools. This gradual sedimentation reduces the actual physical storage capacity of lower elevation tiers, further sharpening the hypsometric curve.
