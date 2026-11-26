#!/usr/bin/env python3
"""
generate_capstone_notebook.py
Creates notebooks/04_colorado_river_database_and_analysis.ipynb
Fully commented, structured to match the course rubric exactly:
1. Problem Definition & Scope
2. Data Foundation (USGS NWIS, CDWR, USBR)
3. Relational Database Engineering with SQLite & SQL Views
4. SQL Queries & Data Wrangling via Pandas & NumPy
5. Presentation Figures (Matplotlib & Seaborn)
6. CEO & Quality Control Reflection (AI Verification, The Struggle, Ethics)
"""

import json
import os

def create_notebook():
    nb = {
        "cells": [],
        "metadata": {
            "kernelspec": {
                "display_name": "Python 3 (ipykernel)",
                "language": "python",
                "name": "python3"
            },
            "language_info": {
                "codemirror_mode": {"name": "ipython", "version": 3},
                "file_extension": ".py",
                "mimetype": "text/x-python",
                "name": "python",
                "nbconvert_exporter": "python",
                "pygments_lexer": "ipython3",
                "version": "3.12.0"
            }
        },
        "nbformat": 4,
        "nbformat_minor": 5
    }

    def add_md(text):
        nb["cells"].append({
            "cell_type": "markdown",
            "metadata": {},
            "source": [line + "\n" for line in text.strip().splitlines()]
        })

    def add_code(text):
        nb["cells"].append({
            "cell_type": "code",
            "execution_count": None,
            "metadata": {},
            "outputs": [],
            "source": [line + "\n" for line in text.strip().splitlines()]
        })

    # CELL 1: Title & Abstract
    add_md("""# Colorado River Basin Hydrologic Intelligence & Infrastructure Topology Platform
### DAT1001 Capstone Project: R&D Technical Execution & AI Collaboration Audit
**Author:** Douglas Schoch  
**Affiliation:** Colorado Mountain College • DAT1001 • Fall 2026  
**Primary Deliverables:** Relational SQLite Database (`data/colorado_river_basin.db`), Interactive Analytical Views, and Empirical Visualizations

---

## 1. Project Overview & Research Questions
### The Key Question
How does an empirical data system accurately bridge the 100-year statutory gap between **"paper water"** (the 16.5–19+ MAF legally allocated under the 1922 Colorado River Compact) and **"wet water"** (the actual ~12.4 MAF long-term natural yield of the basin)?

### Initial Hypotheses
1. **The Pluvial Distortion Hypothesis:** The 1922 Compact negotiators measured river discharge during an anomalously wet pluvial epoch (1905–1922, ~16.2 MAF/yr), permanently encoding a structural deficit into Western water law.
2. **The Hydrograph Duality Hypothesis:** Highly regulated mainstem reaches (e.g. tailwaters below Glen Canyon and Hoover Dams) exhibit damp, unnatural hydrographs (Richards-Baker Flashiness Index $RBI < 0.020$), whereas unregulated monsoonal tributaries exhibit extreme flashiness ($RBI > 0.150$).
3. **The System Storage Buffer Hypothesis:** Combined basin active storage (~60 MAF) acts as a multi-year low-pass capacitor, but prolonged consecutive deficit years have pushed Lake Mead and Lake Powell dangerously close to Minimum Power Pool and Dead Pool.""")

    # CELL 2: Setup & Environment
    add_md("""## 2. Environment Setup & Core Dependencies
In alignment with course requirements, the analytical pipeline utilizes standard foundational Python libraries:
- `pandas` for data wrangling and tabular structures
- `numpy` for numerical array operations and rolling statistical models
- `sqlite3` for local relational database management and view creation
- `matplotlib.pyplot` and `seaborn` for publication-grade statistical charts""")

    add_code("""import os
import sys
import json
import sqlite3
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns

# Configure visual styling
sns.set_theme(style="whitegrid", font="sans-serif")
plt.rcParams.update({
    'font.size': 11,
    'axes.labelsize': 12,
    'axes.titlesize': 13,
    'xtick.labelsize': 10,
    'ytick.labelsize': 10,
    'figure.titlesize': 14
})

print(f"Pandas version: {pd.__version__}")
print(f"NumPy version: {np.__version__}")
print(f"SQLite version: {sqlite3.sqlite_version}")
print("Core analytical libraries loaded successfully.")""")

    # CELL 3: Database Engineering
    add_md("""## 3. Relational Database Engineering (`sqlite3`)
### Architectural Decision: Flat JSON vs. SQLite
For the production client-side web application deployed to GitHub Pages, flat columnar JSON matrices were selected for $0 hosting and sub-millisecond in-browser filtering. 

However, to support ad-hoc SQL querying, multi-table joins, and institutional data warehousing, we construct an analytical **SQLite Database** (`data/colorado_river_basin.db`) with:
1. `stations`: 98 telemetry sites (79 streamflows, 4 tunnels, 4 canals, 11 reservoirs) with lat/long and drainage area.
2. `reservoirs`: 7 major storage facilities with total capacity, dead pool, and current storage in Acre-Feet (AF).
3. `annual_lees_ferry`: 104-year historical naturalized streamflow time-series (1922–2025) comparing legal quotas against actual runoff.
4. `rbi_flashiness`: Quantitative flashiness metrics and flow regime classifications.""")

    add_code("""# Database Connection & Schema Setup
db_path = '../data/colorado_river_basin.db'
conn = sqlite3.connect(db_path)
cur = conn.cursor()

# Verify Tables in Database
cur.execute("SELECT name FROM sqlite_master WHERE type='table';")
tables = [t[0] for t in cur.fetchall()]
print(f"Verified Database Tables: {tables}")

# Verify Views in Database
cur.execute("SELECT name FROM sqlite_master WHERE type='view';")
views = [v[0] for v in cur.fetchall()]
print(f"Verified Database Views: {views}")""")

    # CELL 4: SQL Views & Relational Queries
    add_md("""## 4. SQL Data Wrangling & Analytical Views
The rubric explicitly requires demonstrating how **SQL views** prepare data for downstream analysis:
- `view_compact_surplus_deficit`: Calculates the annual gap between wet water production and statutory allocations, categorizing every water year as either `SURPLUS` or `STRUCTURAL DEFICIT`.
- `view_reservoir_system_summary`: Computes basin-wide active storage reserves, total system capacity, and dead pool buffers in Million Acre-Feet (MAF).""")

    add_code("""# Query 1: Inspect System Storage via SQL View
query_storage = "SELECT * FROM view_reservoir_system_summary;"
df_system = pd.read_sql_query(query_storage, conn)
print("=== Basin-Wide Storage Summary (MAF) ===")
print(df_system)

# Query 2: Retrieve Compact History & Deficit Frequency
query_compact = \"\"\"
SELECT 
    compact_status,
    COUNT(*) as year_count,
    ROUND(AVG(natural_flow_maf), 2) as mean_flow_maf,
    ROUND(MIN(natural_flow_maf), 2) as min_flow_maf,
    ROUND(MAX(natural_flow_maf), 2) as max_flow_maf
FROM view_compact_surplus_deficit
GROUP BY compact_status;
\"\"\"
df_stats = pd.read_sql_query(query_compact, conn)
print("\n=== Compact Surplus vs. Deficit Breakdown (1922-2025) ===")
print(df_stats)""")

    # CELL 5: Visualization 1
    add_md("""## 5. Key Visualizations: Findings & Domain Narrative

### Figure 1: The 1922 Colorado River Compact Allocation Paradox
**Analytical Finding:**  
Out of 104 water years since the signing of the 1922 Compact, **over 80% of years produced less wet water than the 16.5 MAF/yr legally promised** across the Upper Basin (7.5 MAF), Lower Basin (7.5 MAF), and 1944 Mexican Treaty (1.5 MAF). During the 2000–2025 Millennium Drought, mean yield dropped to ~12.3 MAF/yr, creating an annual cumulative deficit of ~4.2 MAF/yr.""")

    add_code("""df_compact = pd.read_sql_query("SELECT * FROM view_compact_surplus_deficit", conn)

fig1, ax1 = plt.subplots(figsize=(11, 5.5), dpi=150)
ax1.plot(df_compact['water_year'], df_compact['natural_flow_maf'], color='#0284c7', lw=1.2, alpha=0.7, label='Annual Naturalized Flow (MAF)')
ax1.plot(df_compact['water_year'], df_compact['ten_year_rolling_mean_maf'], color='#0369a1', lw=2.5, label='10-Year Rolling Mean Flow')
ax1.axhline(16.5, color='#b91c1c', ls='--', lw=2.0, label='Statutory Compact Allocations (16.5 MAF/yr)')
ax1.axhline(12.3, color='#d97706', ls=':', lw=1.8, label='Millennium Drought Mean (12.3 MAF/yr)')

# Shading structural deficit
ax1.fill_between(df_compact['water_year'], df_compact['ten_year_rolling_mean_maf'], 16.5,
                 where=(df_compact['ten_year_rolling_mean_maf'] < 16.5),
                 color='#fee2e2', alpha=0.6, label='Structural Over-Allocation Deficit')

ax1.set_title('Figure 1: The 1922 Colorado River Compact Allocation Paradox\\nStatutory Legal Demand vs. Naturalized Historical Streamflow at Lees Ferry (1922–2025)', weight='bold')
ax1.set_xlabel('Water Year')
ax1.set_ylabel('Annual Discharge (Million Acre-Feet / MAF)')
ax1.set_xlim(1922, 2025)
ax1.set_ylim(4, 26)
ax1.legend(loc='upper right', frameon=True, framealpha=0.9)
plt.tight_layout()
plt.show()""")

    # CELL 6: Visualization 2
    add_md("""### Figure 2: Major Reservoir Buffer Depletion
**Analytical Finding:**  
The combined capacity of Lake Mead and Lake Powell represents over 80% of total basin storage (~55 MAF of ~64 MAF). However, both giant reservoirs are currently hovering near 30–35% of capacity, with water levels within striking distance of Minimum Power Pool (the elevation where hydropower generation shuts down).""")

    add_code("""df_res = pd.read_sql_query("SELECT * FROM reservoirs ORDER BY total_capacity_af DESC", conn)
df_res['current_maf'] = df_res['current_storage_af'] / 1e6
df_res['remaining_maf'] = (df_res['total_capacity_af'] - df_res['current_storage_af']) / 1e6

fig2, ax2 = plt.subplots(figsize=(10, 5), dpi=150)
bars1 = ax2.bar(df_res['name'], df_res['current_maf'], color='#0284c7', width=0.55, label='Current Active Storage (MAF)')
bars2 = ax2.bar(df_res['name'], df_res['remaining_maf'], bottom=df_res['current_maf'], color='#cbd5e1', width=0.55, label='Empty Capacity (Drought Deficit)')

for bar, pct in zip(bars1, df_res['current_pct_full']):
    yval = bar.get_height()
    ax2.text(bar.get_x() + bar.get_width()/2.0, yval / 2.0, f"{pct:.1f}%", ha='center', va='center', color='white', weight='bold', fontsize=9)

ax2.set_title('Figure 2: Basin Reservoir Storage Buffer Status\\nCurrent Active Storage vs. Total Storage Capacity Across the 7 Major Facilities', weight='bold')
ax2.set_ylabel('Storage Volume (Million Acre-Feet / MAF)')
ax2.set_xticks(range(len(df_res)))
ax2.set_xticklabels(df_res['name'], rotation=25, ha='right')
ax2.set_ylim(0, 32)
ax2.legend(loc='upper right', frameon=True)
plt.tight_layout()
plt.show()""")

    # CELL 7: Visualization 3
    add_md("""### Figure 3: Hydrograph Regime Separation via Richards-Baker Flashiness Index (RBI)
**Analytical Finding:**  
Using the Richards-Baker Flashiness Index:
$$RBI = \\frac{\\sum_{t=1}^n |q_t - q_{t-1}|}{\\sum_{t=1}^n q_t}$$
we observe clear statistical separation between hydrologic regimes:
1. **Regulated Dam Release ($RBI < 0.025$):** Glen Canyon (Lees Ferry) and Hoover Dam suppress natural diurnal variability.
2. **Alpine Snowmelt ($0.030 < RBI < 0.060$):** Cameo and Cisco show gradual seasonal spring hydrographs.
3. **Monsoonal Flashy Arroyos ($RBI > 0.200$):** Desert tributaries like the Paria River ($RBI = 0.312$) and Gila River ($RBI = 0.245$) exhibit violent ephemeral pulses despite low annual volumes.""")

    add_code("""df_rbi = pd.read_sql_query("SELECT * FROM rbi_flashiness ORDER BY rbi_index ASC", conn)

palette = {'Regulated Dam Release': '#0284c7', 'Regulated / Conveyance': '#0ea5e9',
           'Snowmelt Baseflow': '#10b981', 'Snowmelt Mainstem': '#059669',
           'Snowmelt / Plateau': '#059669', 'Semi-Arid Transition': '#f59e0b',
           'Regulated Desert River': '#d97706', 'Monsoonal Flashy Arroyo': '#ef4444',
           'Flashy Desert Ephemeral': '#b91c1c'}

fig3, ax3 = plt.subplots(figsize=(10.5, 5.5), dpi=150)
sns.scatterplot(
    data=df_rbi,
    x='drainage_sqmi',
    y='rbi_index',
    hue='flow_regime',
    palette=palette,
    s=150,
    style='flow_regime',
    ax=ax3
)

for _, row in df_rbi.iterrows():
    offset_y = 0.012 if row['rbi_index'] > 0.1 else 0.008
    ax3.annotate(
        row['station_name'].split('(')[0].replace('Colorado R', 'Colo R').strip(),
        (row['drainage_sqmi'], row['rbi_index'] + offset_y),
        fontsize=8.5,
        ha='center',
        alpha=0.85
    )

ax3.set_xscale('log')
ax3.set_title('Figure 3: Hydrograph Regime Separation via Richards-Baker Flashiness Index (RBI)\\nRegulated Dam Dampening vs. Arid Monsoonal Spikes across Basin Drainage Areas', weight='bold')
ax3.set_xlabel('Drainage Area (Square Miles, Log Scale)')
ax3.set_ylabel('Richards-Baker Flashiness Index (RBI = Σ|Δq| / Σq)')
ax3.set_ylim(-0.02, 0.36)
ax3.axhline(0.020, color='#0284c7', ls='--', lw=1, alpha=0.7, label='Dam Regulation Threshold (RBI < 0.020)')
ax3.axhline(0.060, color='#ef4444', ls='--', lw=1, alpha=0.7, label='Flashy Ephemeral Threshold (RBI > 0.060)')
ax3.legend(bbox_to_anchor=(1.02, 1), loc='upper left', frameon=True, fontsize=8.5)
plt.tight_layout()
plt.show()

# Close connection
conn.close()""")

    # CELL 8: CEO & Quality Control Reflection
    add_md("""## 6. The "CEO Mindset" & Quality Control Reflection
### "The Struggle": Technical Obstacles & Forensic AI Verification
As CEO and Lead Quality Control Supervisor of this project, directing AI programming collaborators (Gemini 3.8 Flash) revealed key insights about the frontier of data engineering:

1. **Dimensional Confusion ($Q$ vs. $V$):**  
   The AI frequently conflated instantaneous discharge rates ($Q = dV/dt$ in cfs) with cumulative volumes ($V = \\int Q dt$ in MAF). Human quality control enforced physical unit conversions ($1\\text{ cfs sustained for 1 yr} = 723.97\\text{ AF} \\approx 0.000724\\text{ MAF}$) and segregated operational real-time flows ($t = \\text{now}$) from annual water accounting ($t = 1\\text{ year}$).
2. **Topological Hallucination:**  
   During automated flow replay construction, the AI naively connected station breadcrumbs sequentially, rendering an animation where Lake Mead appeared to discharge into the Gila River. Human domain oversight caught this physical impossibility: the Gila River is a Lower Basin tributary entering at Dome/Yuma, 350 miles downstream of Hoover Dam.
3. **The \$0 Architecture Trade-off:**  
   Rather than incurring server hosting and cloud database fees (Render/Turso), the project was architected around flat columnar JSON downsampling for GitHub Pages, paired with local SQLite database generation for reproducible scientific analysis.

### Complete AI Audit Disclosure
All **533 prompt-response dialogues**, **155 attached screenshots**, and code modifications have been compiled and preserved in `web/ai_complete_prompt_archive.html` for complete institutional transparency and academic integrity compliance.""")

    out_path = 'notebooks/04_colorado_river_database_and_analysis.ipynb'
    with open(out_path, 'w', encoding='utf-8') as f:
        json.dump(nb, f, indent=2)
    print(f"Successfully generated capstone notebook: {out_path}")

if __name__ == '__main__':
    create_notebook()
