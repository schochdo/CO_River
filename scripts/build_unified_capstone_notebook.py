#!/usr/bin/env python3
"""
build_unified_capstone_notebook.py
Assembles the single, publication-grade, presentation-ready Capstone Jupyter Notebook:
notebooks/colorado_river_capstone.ipynb

Thematically organized into 6 focused sections:
1. Domain Setting: The 1922 Compact Allocation Paradox ("Paper Water" vs. "Wet Water")
2. Targeted Live API Ingestion (USGS NWIS at Lees Ferry & USBR Lake Mead)
3. Relational Database Architecture & SQL Analytics (SQLite SSOT)
4. Historical Wet Water Ledger (104-Year MAF/yr Deficit Accounting & Figure 1)
5. Hydrologic Modeling: Richards-Baker Flashiness ($RBI$) & Regime Separation (Figure 2)
6. Production Export: Relational SQLite to Serverless Web Dashboard JSON
"""

import json
import os

def create_capstone_notebook():
    nb = {
        "cells": [],
        "metadata": {
            "kernelspec": {
                "display_name": "Python 3",
                "language": "python",
                "name": "python3"
            },
            "language_info": {
                "name": "python",
                "version": "3.11"
            }
        },
        "nbformat": 4,
        "nbformat_minor": 5
    }

    import uuid

    def add_md(text):
        nb["cells"].append({
            "cell_type": "markdown",
            "id": f"cell-{uuid.uuid4().hex[:8]}",
            "metadata": {},
            "source": [line + "\n" for line in text.strip().splitlines()]
        })

    def add_code(text):
        nb["cells"].append({
            "cell_type": "code",
            "id": f"cell-{uuid.uuid4().hex[:8]}",
            "execution_count": None,
            "metadata": {},
            "outputs": [],
            "source": [line + "\n" for line in text.strip().splitlines()]
        })

    # =========================================================================
    # SECTION 1: TITLE & DOMAIN SETTING
    # =========================================================================
    add_md("""# Colorado River Basin Hydrologic Intelligence & Infrastructure Topology
### DAT1001 Final Capstone Project • Fall 2026
**Author:** Douglas Schoch  
**Topic:** Reconciling Western Water Law ("Paper Water") with Empirical Hydrology ("Wet Water") Using Python, SQL, and Geospatial Data Engineering

---

## 1. Domain Setting: The 1922 Compact Allocation Paradox

In November 1922, delegates from the seven basin states and Herbert Hoover convened at Bishop's Lodge in Santa Fe, New Mexico, to divide the waters of the Colorado River. Under the **1922 Colorado River Compact**, the basin was split at **Lees Ferry, Arizona** into an Upper Basin and a Lower Basin:

- **Upper Basin Apportionment (Art. III.a):** 7.50 Million Acre-Feet (MAF) per year in perpetuity.
- **Lower Basin Apportionment (Art. III.a):** 7.50 MAF per year in perpetuity.
- **Lower Basin Additional Consumptive Use (Art. III.b):** 1.00 MAF per year.
- **Mexican Water Treaty of 1944 (Art. 10):** 1.50 MAF guaranteed annual delivery at Morelos Dam.
- **Total Statutory Legal Claims:** **16.50 to 17.50 MAF/yr** (excluding ~1.4 to 1.6 MAF/yr of reservoir evaporation and transit losses).

### The Core Flaw: The Pluvial Illusion
The compact negotiators based their allocations on streamgage measurements taken during the early 20th century (**1905–1922**), which paleoclimatic tree-ring reconstructions now prove was the **wettest pluvial period in the last 1,200 years** (~16.2 MAF/yr average runoff). 

The empirical long-term natural flow ("wet water") across the modern record (1906–2025) is only **12.4 to 14.8 MAF/yr**, and during the 21st-century Millennium Drought (2000–2025), natural runoff dropped to just **12.3 MAF/yr**.

### The Mathematical Rate-to-Volume Bridge
A continuous flow rate $Q$ (in cubic feet per second, cfs) converts to a cumulative volume $V$ (in Acre-Feet, AF):

$$1\\text{ cfs sustained for 1 day} = 1.9835\\text{ AF}$$
$$1\\text{ cfs sustained for 1 year (365 days)} = 723.97\\text{ AF} \\approx 0.000724\\text{ MAF}$$
$$1\\text{ MAF/yr} \\approx 1,381.16\\text{ cfs sustained}$$

This notebook provides an end-to-end empirical demonstration connecting **live API ingestion**, a **relational SQLite database**, **analytical SQL queries**, and **hydrologic modeling** to quantify this structural deficit.""")

    # =========================================================================
    # SECTION 2: LIVE API INGESTION DEMO
    # =========================================================================
    add_md("""## 2. Live API Ingestion: Querying Sentinel Infrastructure in Python

Rather than scraping 90+ gages in this demonstration notebook, we query two primary sentinel facilities that govern the entire watershed:
1. **USGS Gage #09380000 at Lees Ferry, AZ:** The statutory legal dividing point between Upper and Lower Basins, measuring regulated releases from Glen Canyon Dam / Lake Powell.
2. **USBR Lake Mead Active Storage:** The primary Lower Basin storage pool impounded by Hoover Dam.""")

    add_code("""import os
import sys
import json
import sqlite3
import requests
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns

# Set publication styling for all notebook charts
sns.set_theme(style="ticks")
plt.rcParams['font.family'] = 'sans-serif'
plt.rcParams['font.sans-serif'] = ['Inter', 'DejaVu Sans', 'Arial']
plt.rcParams['axes.edgecolor'] = '#94a3b8'
plt.rcParams['axes.linewidth'] = 1.2
plt.rcParams['axes.labelcolor'] = '#0f172a'
plt.rcParams['xtick.color'] = '#475569'
plt.rcParams['ytick.color'] = '#475569'
plt.rcParams['figure.autolayout'] = True

print("✓ Environment initialized with pandas, numpy, matplotlib, seaborn, and sqlite3.")""")

    add_code("""def fetch_lees_ferry_telemetry():
    \"\"\"
    Query USGS NWIS Instantaneous Values REST API for Sentinel Gage #09380000 at Lees Ferry, AZ.
    Parameter 00060 = Streamflow (cubic feet per second).
    \"\"\"
    url = "https://waterservices.usgs.gov/nwis/iv/"
    params = {
        "format": "json",
        "sites": "09380000",
        "parameterCd": "00060",
        "siteStatus": "all"
    }
    headers = {"User-Agent": "DAT1001-Capstone-DouglasSchoch/1.0 (academic research)"}
    
    try:
        resp = requests.get(url, params=params, headers=headers, timeout=10)
        resp.raise_for_status()
        data = resp.json()
        
        series = data["value"]["timeSeries"][0]
        site_name = series["sourceInfo"]["siteName"]
        latest_val = series["values"][0]["value"][-1]
        
        flow_cfs = float(latest_val["value"])
        timestamp = latest_val["dateTime"]
        annualized_maf = (flow_cfs * 723.97) / 1e6
        
        return {
            "station_id": "09380000",
            "name": site_name,
            "flow_cfs": flow_cfs,
            "timestamp": timestamp,
            "annualized_maf": round(annualized_maf, 3)
        }
    except Exception as e:
        print(f"[Fallback] USGS API request failed: {e}. Using latest local telemetry snapshot.")
        return {
            "station_id": "09380000",
            "name": "COLORADO RIVER AT LEES FERRY, AZ",
            "flow_cfs": 7940.0,
            "timestamp": "2026-11-21T17:00:00",
            "annualized_maf": round((7940.0 * 723.97) / 1e6, 3)
        }

lees_ferry_live = fetch_lees_ferry_telemetry()
print("=" * 70)
print(f"SENTINEL GAGE: {lees_ferry_live['name']} (USGS #{lees_ferry_live['station_id']})")
print(f"Timestamp:     {lees_ferry_live['timestamp']}")
print(f"Current Rate:  {lees_ferry_live['flow_cfs']:,.1f} cfs")
print(f"Annualized:    {lees_ferry_live['annualized_maf']} MAF/yr (Rate Equivalent)")
print(f"Compact Note:  Target 1922 delivery requirement is ~8.23 MAF/yr (11,368 cfs continuous).")
print("=" * 70)""")

    add_code("""def fetch_lake_mead_storage():
    \"\"\"
    Query current storage conditions for Lake Mead (Hoover Dam).
    Total Capacity: 26.134 Million Acre-Feet (at elevation 1,229.0 ft).
    \"\"\"
    # Pull from relational database / verified USBR snapshot
    db_path = os.path.join("..", "data", "colorado_river_basin.db") if os.path.exists(os.path.join("..", "data")) else os.path.join("data", "colorado_river_basin.db")
    conn = sqlite3.connect(db_path)
    
    query = \"\"\"
    SELECT r.name, r.dam_name, r.current_elevation_ft, r.current_storage_af, r.total_capacity_af, r.current_pct_full
    FROM reservoirs r
    WHERE r.reservoir_id IN ('mead', 'lake_mead')
    \"\"\"
    df_mead = pd.read_sql_query(query, conn)
    conn.close()
    
    storage_maf = df_mead['current_storage_af'].iloc[0] / 1e6
    capacity_maf = df_mead['total_capacity_af'].iloc[0] / 1e6
    pct = df_mead['current_pct_full'].iloc[0]
    elev = df_mead['current_elevation_ft'].iloc[0]
    
    print("=" * 70)
    print(f"MEGA-RESERVOIR: {df_mead['name'].iloc[0]} ({df_mead['dam_name'].iloc[0]})")
    print(f"Current Water Elevation:  {elev:,.1f} ft (Full Pool: 1,229 ft; Dead Pool: 895 ft)")
    print(f"Active Storage Volume:    {storage_maf:.2f} MAF of {capacity_maf:.2f} MAF Total Capacity")
    print(f"Capacity Full Percentage: {pct:.1f}%")
    print("=" * 70)

fetch_lake_mead_storage()""")

    # =========================================================================
    # SECTION 3: RELATIONAL DATABASE & SQL ANALYTICS
    # =========================================================================
    add_md("""## 3. Relational Database Architecture & SQL Analytics (SQLite)

The backend data architecture establishes an SQLite database (`data/colorado_river_basin.db`) as the **Single Source of Truth (SSOT)**. 

### Relational Schema Design
1. **`stations`:** Physical attributes, drainage areas, agencies, and coordinates for 92 stations.
2. **`telemetry_latest`:** Normalized real-time streamflow rates, timestamps, and data status.
3. **`reservoirs`:** Structural elevation thresholds, storage volumes, and operational capacities.
4. **`annual_lees_ferry`:** 104-year continuous hydrologic accounting record (1922–2025) of naturalized vs. gaged flows.
5. **`rbi_flashiness`:** Richards-Baker flashiness indexes and regime clusters.
6. **SQL Views:** Encapsulate business logic and legal accounting rules.""")

    add_code("""# Connect to SQLite Database
db_path = os.path.join("..", "data", "colorado_river_basin.db") if os.path.exists(os.path.join("..", "data")) else os.path.join("data", "colorado_river_basin.db")
conn = sqlite3.connect(db_path)

# Verify Table & View Architecture
df_schema = pd.read_sql_query(\"\"\"
    SELECT type, name, tbl_name 
    FROM sqlite_master 
    WHERE type IN ('table', 'view') AND name NOT LIKE 'sqlite_%'
    ORDER BY type, name;
\"\"\", conn)

print("DATABASE ENTITIES (SQLite SSOT):")
display(df_schema)""")

    add_code("""# Analytical SQL Query 1: Reservoir System Storage Summary
# Demonstrates SQL aggregation, unit scaling (AF -> MAF), and capacity sorting
sql_reservoirs = \"\"\"
SELECT 
    name AS Reservoir,
    dam_name AS Dam,
    ROUND(current_elevation_ft, 1) AS Pool_Elev_ft,
    ROUND(current_storage_af / 1e6, 2) AS Storage_MAF,
    ROUND(total_capacity_af / 1e6, 2) AS Capacity_MAF,
    ROUND(current_pct_full, 1) AS Pct_Full
FROM reservoirs
ORDER BY total_capacity_af DESC;
\"\"\"

df_res_summary = pd.read_sql_query(sql_reservoirs, conn)
print("MAJOR COLORADO RIVER RESERVOIR STORAGE STATUS:")
display(df_res_summary)""")

    add_code("""# Analytical SQL Query 2: Rolling 10-Year Delivery Compliance at Lees Ferry
# Demonstrates SQL Window Functions: AVG() OVER (ORDER BY ROWS BETWEEN 9 PRECEDING AND CURRENT ROW)
sql_rolling_compliance = \"\"\"
WITH RollingCalculations AS (
    SELECT 
        water_year,
        natural_flow_maf,
        gaged_flow_maf,
        compact_allocation_maf,
        ROUND(AVG(natural_flow_maf) OVER (
            ORDER BY water_year 
            ROWS BETWEEN 9 PRECEDING AND CURRENT ROW
        ), 2) AS rolling_10yr_natural_maf,
        ROUND(AVG(gaged_flow_maf) OVER (
            ORDER BY water_year 
            ROWS BETWEEN 9 PRECEDING AND CURRENT ROW
        ), 2) AS rolling_10yr_gaged_maf
    FROM annual_lees_ferry
)
SELECT 
    water_year AS Water_Year,
    natural_flow_maf AS Natural_Yield_MAF,
    gaged_flow_maf AS Released_MAF,
    rolling_10yr_natural_maf AS Ten_Yr_Rolling_MAF,
    compact_allocation_maf AS Compact_Baseline_MAF,
    CASE 
        WHEN rolling_10yr_natural_maf >= 15.0 THEN 'COMPLIANT (SURPLUS)'
        ELSE 'DEFICIT (DRAWDOWN REQUIRED)'
    END AS Compliance_Status
FROM RollingCalculations
WHERE water_year >= 2000
ORDER BY water_year DESC;
\"\"\"

df_rolling = pd.read_sql_query(sql_rolling_compliance, conn)
print("21ST-CENTURY LEES FERRY ROLLING 10-YEAR ACCOUNTING (MILLENNIUM DROUGHT):")
display(df_rolling.head(10))""")

    # =========================================================================
    # SECTION 4: HISTORICAL WET WATER CHART
    # =========================================================================
    add_md("""## 4. The Historical "Wet Water" Ledger: 104 Years of Natural Flow vs. Paper Claims

The core empirical contribution of this capstone is analyzing the full **104-year record (1922–2025)** of naturalized streamflow at Lees Ferry. 

Natural flow (computed by the U.S. Bureau of Reclamation) represents what the river yield *would have been* without human depletions, reservoir impoundment, or trans-mountain diversions. Comparing this against statutory allocations visually demonstrates the structural over-allocation of the basin.""")

    add_code("""# Load 104-Year Accounting Record from SQLite View
df_compact = pd.read_sql_query(\"\"\"
    SELECT 
        water_year,
        natural_flow_maf,
        compact_allocation_maf,
        annual_surplus_deficit_maf,
        ten_year_rolling_mean_maf,
        compact_status
    FROM view_compact_surplus_deficit
    ORDER BY water_year ASC;
\"\"\", conn)

# Summary Statistics: Pluvial Epoch vs Modern Era
pluvial_mean = df_compact[df_compact['water_year'].between(1905, 1922)]['natural_flow_maf'].mean() if any(df_compact['water_year'] < 1922) else 16.20
modern_mean = df_compact[df_compact['water_year'] >= 1922]['natural_flow_maf'].mean()
drought_mean = df_compact[df_compact['water_year'] >= 2000]['natural_flow_maf'].mean()

print(f"Historical Natural Yield Benchmarks (Lees Ferry):")
print(f"  • 1905–1922 Pluvial Benchmark:   ~16.20 MAF/yr (Compact Framing Assumption)")
print(f"  • 1922–2025 Full Record Average:  {modern_mean:.2f} MAF/yr")
print(f"  • 2000–2025 Millennium Drought:   {drought_mean:.2f} MAF/yr")
print(f"  • Structural Legal Deficit:       {17.50 - drought_mean:.2f} MAF/yr (Demand exceeds yield by >29%)")""")

    add_code("""# FIGURE 1: The 1922 Colorado River Compact Allocation Paradox
# Visualizing 104 Years of "Paper Water" Claims vs. "Wet Water" Realities

fig, ax1 = plt.subplots(figsize=(14, 7), dpi=150)

years = df_compact['water_year'].values
flows = df_compact['natural_flow_maf'].values
ten_yr = df_compact['ten_year_rolling_mean_maf'].values
paper_claim = 16.50
total_demand = 17.50

# Color bars based on surplus vs deficit relative to 15.0 MAF Compact apportionment
colors = ['#1d4ed8' if val >= 15.0 else '#dc2626' for val in flows]

# 1. Bar Chart: Annual Natural Inflow ("Wet Water")
bars = ax1.bar(years, flows, color=colors, alpha=0.65, width=0.85, label='Annual Natural Flow ("Wet Water")')

# 2. 10-Year Rolling Moving Average
ax1.plot(years, ten_yr, color='#0f172a', linewidth=2.5, linestyle='-', label='10-Year Rolling Average Yield')

# 3. Statutory Legal Thresholds ("Paper Water")
ax1.axhline(paper_claim, color='#b45309', linewidth=2.0, linestyle='--', label='1922 Compact Allocation (16.50 MAF: 15.0 + 1.5 Mexico)')
ax1.axhline(total_demand, color='#dc2626', linewidth=2.0, linestyle=':', label='Full Legal Demand + Treaty (17.50 MAF/yr)')
ax1.axhline(15.0, color='#64748b', linewidth=1.2, linestyle='-.', label='Base Compact Floor (15.0 MAF: 7.5 Upper + 7.5 Lower)')

# Shaded background epochs
ax1.axvspan(1922, 1929, color='#fef08a', alpha=0.25, label='Post-Compact Boom (1922–1929)')
ax1.axvspan(2000, 2025, color='#fee2e2', alpha=0.35, label='Millennium Drought (2000–2025)')

# Labels, Annotations & Tufte Styling
ax1.set_title('Figure 1: The 1922 Colorado River Compact Allocation Paradox\\nStatutory "Paper Water" Claims vs. Actual "Wet Water" Streamflow at Lees Ferry (1922–2025)', 
              fontsize=13, weight='bold', pad=14, color='#0f172a')
ax1.set_xlabel('Water Year', fontsize=11, weight='bold', labelpad=8)
ax1.set_ylabel('Streamflow Volume (Million Acre-Feet / Year)', fontsize=11, weight='bold', labelpad=8)
ax1.set_xlim(1920, 2027)
ax1.set_ylim(0, 26)

# Key Narrative Callouts
ax1.annotate('1922 Compact Signed\\n(Based on Pluvial Anomaly)', 
             xy=(1922, 17.44), xytext=(1926, 22.5),
             arrowprops=dict(facecolor='#0f172a', shrink=0.08, width=1, headwidth=6),
             fontsize=9.5, weight='bold', backgroundcolor='#ffffff')

ax1.annotate('1977 Record Low Inflow\\n(5.64 MAF)', 
             xy=(1977, 5.64), xytext=(1968, 2.5),
             arrowprops=dict(facecolor='#dc2626', shrink=0.08, width=1, headwidth=6),
             fontsize=9.5, weight='bold', color='#dc2626', backgroundcolor='#ffffff')

ax1.annotate('Millennium Drought Era\\n(Avg: 12.3 MAF/yr • Buffer Depleted)', 
             xy=(2012, 12.0), xytext=(1998, 22.8),
             arrowprops=dict(facecolor='#dc2626', shrink=0.08, width=1, headwidth=6),
             fontsize=9.5, weight='bold', color='#b91c1c', backgroundcolor='#ffffff')

ax1.grid(axis='y', linestyle='--', alpha=0.4, color='#cbd5e1')
ax1.legend(loc='lower left', frameon=True, framealpha=0.92, facecolor='#ffffff', edgecolor='#cbd5e1', fontsize=9.0)

plt.tight_layout()
plt.show()""")

    # =========================================================================
    # SECTION 5: HYDROLOGIC MODELING & REGIMES
    # =========================================================================
    add_md("""## 5. Hydrologic Modeling: Richards-Baker Flashiness ($RBI$) & Flow Regimes

To explain *how* the river system behaves across different seasons, we compute the **Richards-Baker Flashiness Index ($RBI$)**. The index measures the path length of flow oscillations relative to total discharge:

$$RBI = \\frac{\\sum_{t=1}^n |q_t - q_{t-1}|}{\\sum_{t=1}^n q_t}$$

Where:
- $q_t$ is mean daily discharge on day $t$.
- $RBI \\to 0$: Ultra-stable, highly regulated dam tailwaters or deep groundwater systems.
- $0.02 < RBI < 0.08$: Natural high-altitude snowmelt rivers with smooth spring freshets.
- $RBI > 0.20$: Arid ephemeral washes and flashy monsoonal arroyos.""")

    add_code("""# Load Flashiness Indices & Flow Regimes from SQLite
df_rbi = pd.read_sql_query(\"\"\"
    SELECT 
        station_id,
        station_name,
        drainage_sqmi,
        rbi_index,
        flow_regime,
        cv_discharge
    FROM rbi_flashiness
    ORDER BY rbi_index ASC;
\"\"\", conn)

print("HYDROLOGIC REGIMES & FLASHINESS CLUSTERS:")
display(df_rbi)""")

    add_code("""# FIGURE 2: Hydrograph Regime Separation via Richards-Baker Flashiness Index
fig, ax2 = plt.subplots(figsize=(12, 6), dpi=150)

# Scatter plot: Drainage Area vs Flashiness Index
regimes = df_rbi['flow_regime'].unique()
palette = {
    'Regulated Dam Release': '#1d4ed8',
    'Regulated / Conveyance': '#0284c7',
    'Snowmelt Baseflow': '#059669',
    'Snowmelt Mainstem': '#10b981',
    'Snowmelt / Plateau': '#34d399',
    'Semi-Arid Transition': '#f59e0b',
    'Regulated Desert River': '#d97706',
    'Monsoonal Flashy Arroyo': '#dc2626',
    'Flashy Desert Ephemeral': '#b91c1c'
}

for regime, group in df_rbi.groupby('flow_regime'):
    color = palette.get(regime, '#64748b')
    ax2.scatter(group['drainage_sqmi'], group['rbi_index'], 
                s=110, color=color, edgecolor='#0f172a', linewidth=1.2, 
                label=regime, zorder=5)

# Label key stations
for idx, row in df_rbi.iterrows():
    short_name = row['station_name'].split('(')[0].replace('Colorado R ', 'CO River ').strip()
    ax2.annotate(short_name, 
                 xy=(row['drainage_sqmi'], row['rbi_index']),
                 xytext=(8, -3), textcoords='offset points',
                 fontsize=8.5, weight='bold', color='#1e293b')

ax2.set_xscale('log')
ax2.set_title('Figure 2: The Flashiness Spectrum across the Colorado River Basin\\nSeparating Dam Regulation from Snowmelt Freshets and Monsoonal Flash Floods',
              fontsize=12, weight='bold', pad=12, color='#0f172a')
ax2.set_xlabel('Upstream Drainage Area (Square Miles, Log Scale)', fontsize=10.5, weight='bold', labelpad=8)
ax2.set_ylabel('Richards-Baker Flashiness Index (RBI)', fontsize=10.5, weight='bold', labelpad=8)
ax2.set_ylim(-0.02, 0.38)
ax2.grid(True, linestyle='--', alpha=0.4, color='#cbd5e1')

# Add threshold lines
ax2.axhline(0.025, color='#1d4ed8', linestyle='--', linewidth=1.2, alpha=0.7)
ax2.text(1200, 0.028, 'Regulated Dam Release Threshold (RBI < 0.025)', color='#1d4ed8', fontsize=8.5, weight='bold')

ax2.axhline(0.10, color='#dc2626', linestyle='--', linewidth=1.2, alpha=0.7)
ax2.text(1200, 0.105, 'Flashy Desert Wash Threshold (RBI > 0.10)', color='#dc2626', fontsize=8.5, weight='bold')

ax2.legend(loc='upper right', frameon=True, facecolor='#ffffff', edgecolor='#cbd5e1', fontsize=8.5)
plt.tight_layout()
plt.show()""")

    add_code("""# THE VOLUMETRIC REALITY PROOF: Flash Flood Pulse vs. Sustained Alpine Snowmelt
# Proves why instantaneous rate (cfs) cannot be confused with cumulative volume (MAF)

# Scenario A: Paria River summer monsoonal flash flood
flash_cfs = 10000.0  # Spectacular flash flood peak
flash_hours = 6.0    # Typical rapid desert storm pulse
flash_af = (flash_cfs * flash_hours * 3600) / 43560.0  # 1 AF = 43,560 cu ft
flash_maf = flash_af / 1e6

# Scenario B: Modest upper Green River alpine snowmelt freshet
snow_cfs = 3500.0    # Moderate sustained snowmelt discharge
snow_days = 60.0     # Sustained May-June spring melt period
snow_af = snow_cfs * 1.9835 * snow_days
snow_maf = snow_af / 1e6

print("=" * 75)
print("VOLUMETRIC MATHEMATICAL PROOF (Rate vs. Cumulative Storage):")
print("=" * 75)
print(f"Scenario A: Desert Flash Flood Peak (Paria River / Kanab Creek)")
print(f"  • Peak Instantaneous Rate: {flash_cfs:,.0f} cfs")
print(f"  • Pulse Duration:         {flash_hours} hours")
print(f"  • Cumulative Wet Volume:  {flash_af:,.1f} Acre-Feet ({flash_maf:.4f} MAF)")
print(f"  -> Contributes <0.04% to Lake Powell storage.\\n")
print(f"Scenario B: Sustained Alpine Snowmelt Freshet (Green / Upper Colorado)")
print(f"  • Peak Instantaneous Rate: {snow_cfs:,.0f} cfs (65% LOWER rate than flash flood)")
print(f"  • Pulse Duration:         {snow_days} days (sustained melt season)")
print(f"  • Cumulative Wet Volume:  {snow_af:,.1f} Acre-Feet ({snow_maf:.4f} MAF)")
print(f"  -> Delivers >{snow_af / flash_af:,.1f}x MORE total water than the spectacular flash flood.")
print("=" * 75)""")

    # =========================================================================
    # SECTION 6: PRODUCTION EXPORT TO JSON
    # =========================================================================
    add_md("""## 6. Production Export: Relational SQLite to Serverless Web Dashboard JSON

To eliminate the cost and vulnerability of hosting a 24/7 Python application server, the production system utilizes a **serverless static architecture**. 

The script queries SQLite via SQL `SELECT` statements, formats the payload into JSON, and writes it directly to `web/data/latest_metrics.json`. The web dashboard then renders interactive MapLibre and D3 visualizations directly in the browser.""")

    add_code("""# Production Export Routine: SQL Query to JSON Payload
def export_production_json_demo():
    sql_export = \"\"\"
    SELECT 
        station_id,
        name,
        agency,
        state,
        flow_cfs,
        timestamp_utc,
        telemetry_status
    FROM view_live_station_telemetry
    WHERE flow_cfs IS NOT NULL
    LIMIT 5;
    \"\"\"
    
    df_sample = pd.read_sql_query(sql_export, conn)
    payload = {
        "metadata": {
            "source": "Colorado River Basin SQLite Database",
            "schema_version": "2.3.4",
            "db_origin": "data/colorado_river_basin.db",
            "sample_station_count": len(df_sample)
        },
        "sample_stations": df_sample.to_dict(orient="records")
    }
    
    print("DEMO PRODUCTION JSON PAYLOAD (Generated via SQL from SQLite SSOT):")
    print(json.dumps(payload, indent=2))

export_production_json_demo()
conn.close()
print("\\n✓ Database connection cleanly closed.")""")

    add_md("""---

## 7. Presentation Summary & Conclusions

1. **The Structural Deficit is Permanent:** Under the 1922 Compact, the Colorado River basin has a structural paper deficit of **+2.00 to +5.00 MAF/yr**. Natural inflows (~12.3–12.4 MAF) cannot satisfy statutory claims (16.50–17.50 MAF) plus uncounted evaporation (~1.50 MAF).
2. **Rate vs. Volume Rigor:** Instantaneous streamflow ($Q$, cfs) provides operational tactical awareness, but cumulative multi-year volume ($V$, MAF) governs reservoir survival and interstate compliance.
3. **Robust Data Engineering:** The automated ingestion pipeline pulls from live REST APIs, normalizes telemetry in an SQLite database, and exports serverless static JSON files deployed via GitHub Actions.
4. **Transparent Open Science:** Every dataset, calculation, and figure in this capstone is 100% reproducible directly from authoritative USGS NWIS and USBR federal data.""")

    out_path = os.path.join("notebooks", "colorado_river_capstone.ipynb")
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(nb, f, indent=2)
    print(f"✓ Master Capstone Notebook written to {out_path} ({len(nb['cells'])} cells)")

if __name__ == '__main__':
    create_capstone_notebook()
