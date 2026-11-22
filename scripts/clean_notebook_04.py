#!/usr/bin/env python3
"""
clean_notebook_04.py
Cleans up notebooks/04_colorado_river_database_and_analysis.ipynb:
- Removes all rubric-focused homework text, "CEO mindset", and "The Struggle".
- Replaces with authentic engineering and scientific reflections.
"""

import json

def clean_notebook_04():
    path = "notebooks/04_colorado_river_database_and_analysis.ipynb"
    with open(path, "r", encoding="utf-8") as f:
        nb = json.load(f)

    # Cell 0
    nb["cells"][0]["source"] = [
        "# 04: Colorado River Basin Relational Database & Hydrologic Accounting\n",
        "**Author:** Douglas Schoch  \n",
        "**Affiliation:** Colorado Mountain College • DAT1001 • Fall 2026  \n",
        "**Primary Deliverables:** Relational SQLite Database (`data/colorado_river_basin.db`), Analytical Views, and Empirical Visualizations\n",
        "\n",
        "---\n",
        "\n",
        "## 1. Project Overview & Research Focus\n",
        "### Core Research Question\n",
        "How does an empirical data system accurately reconcile the 100-year statutory gap between **\"paper water\"** (the 16.5–19+ MAF legally allocated under the 1922 Colorado River Compact) and **\"wet water\"** (the actual ~12.4 MAF long-term natural yield of the basin)?\n",
        "\n",
        "### Hypotheses & Physical Invariants\n",
        "1. **The Pluvial Baseline Distortion:** The 1922 Compact negotiators measured river discharge during an anomalously wet pluvial epoch (1905–1922, ~16.2 MAF/yr), permanently encoding a structural overdraft into Western water law.\n",
        "2. **Hydrograph Regime Duality:** Regulated mainstem reaches (tailwaters below Glen Canyon and Hoover Dams) exhibit heavily dampened hydrographs (Richards-Baker Flashiness Index $RBI < 0.025$), whereas unregulated desert tributaries exhibit extreme flashiness ($RBI > 0.150$) with negligible cumulative storage contribution.\n",
        "3. **Reservoir Buffer Depletion:** Combined basin storage (~60 MAF) acts as a multi-year low-pass filter, but consecutive deficit years have pushed Lake Mead and Lake Powell dangerously close to Minimum Power Pool (elevation where hydroelectric generation ceases)."
    ]

    # Cell 1
    nb["cells"][1]["source"] = [
        "## 2. Environment Setup & Core Dependencies\n",
        "The analytical pipeline utilizes standard Python data science libraries:\n",
        "- `pandas` for tabular data structures and data wrangling\n",
        "- `numpy` for numerical array operations and rolling statistical models\n",
        "- `sqlite3` for relational database querying and view management\n",
        "- `matplotlib.pyplot` and `seaborn` for publication-grade statistical charts"
    ]

    # Cell 3
    nb["cells"][3]["source"] = [
        "## 3. Relational Database Architecture (`sqlite3`)\n",
        "### Flat JSON vs. Relational Storage\n",
        "For the production client-side web application deployed to static hosting, flat columnar JSON matrices were selected for zero-cost hosting and sub-millisecond in-browser filtering.\n",
        "\n",
        "To support ad-hoc SQL querying, multi-table joins, and institutional data warehousing, we construct an analytical **SQLite Database** (`data/colorado_river_basin.db`) with:\n",
        "1. `stations`: 98 telemetry sites (79 streamflows, 4 tunnels, 4 canals, 11 reservoirs) with lat/long and drainage area.\n",
        "2. `reservoirs`: 7 major storage facilities with total capacity, dead pool, and current storage in Acre-Feet (AF).\n",
        "3. `annual_lees_ferry`: 104-year historical naturalized streamflow time-series (1922–2025) comparing legal quotas against actual runoff.\n",
        "4. `rbi_flashiness`: Quantitative flashiness metrics and flow regime classifications."
    ]

    # Cell 5
    nb["cells"][5]["source"] = [
        "## 4. SQL Data Wrangling & Analytical Views\n",
        "We define and query **SQL views** to prepare data for downstream analysis:\n",
        "- `view_compact_surplus_deficit`: Calculates the annual gap between wet water production and statutory allocations, categorizing every water year as either `SURPLUS` or `STRUCTURAL DEFICIT`.\n",
        "- `view_reservoir_system_summary`: Computes basin-wide active storage reserves, total system capacity, and dead pool buffers in Million Acre-Feet (MAF)."
    ]

    # Cell 7
    nb["cells"][7]["source"] = [
        "## 5. Key Visualizations: Findings & Domain Narrative\n",
        "\n",
        "### Figure 1: The 1922 Colorado River Compact Allocation Paradox\n",
        "**Analytical Finding:**  \n",
        "Out of 104 water years since the signing of the 1922 Compact, **over 80% of years produced less wet water than the 16.5 MAF/yr legally promised** across the Upper Basin (7.5 MAF), Lower Basin (7.5 MAF), and 1944 Mexican Treaty (1.5 MAF). During the 2000–2025 Millennium Drought, mean yield dropped to ~12.3 MAF/yr, creating an annual cumulative deficit of ~4.2 MAF/yr."
    ]

    # Cell 9
    nb["cells"][9]["source"] = [
        "### Figure 2: Major Reservoir Buffer Depletion\n",
        "**Analytical Finding:**  \n",
        "The combined capacity of Lake Mead and Lake Powell represents over 80% of total basin storage (~55 MAF of ~64 MAF). Both giant reservoirs are currently hovering near 30–35% of capacity, with water levels within striking distance of Minimum Power Pool (the elevation where hydropower generation shuts down)."
    ]

    # Cell 11
    nb["cells"][11]["source"] = [
        "### Figure 3: Hydrograph Regime Separation via Richards-Baker Flashiness Index (RBI)\n",
        "**Analytical Finding:**  \n",
        "Using the Richards-Baker Flashiness Index:\n",
        "$$RBI = \\frac{\\sum_{t=1}^n |q_t - q_{t-1}|}{\\sum_{t=1}^n q_t}$$\n",
        "we observe clear statistical separation between hydrologic regimes:\n",
        "1. **Regulated Dam Release ($RBI < 0.025$):** Glen Canyon (Lees Ferry) and Hoover Dam suppress natural diurnal variability.\n",
        "2. **Alpine Snowmelt ($0.030 < RBI < 0.060$):** Cameo and Cisco show gradual seasonal spring hydrographs.\n",
        "3. **Monsoonal Flashy Arroyos ($RBI > 0.200$):** Desert tributaries like the Paria River ($RBI = 0.312$) and Gila River ($RBI = 0.245$) exhibit violent ephemeral pulses despite low annual volumes."
    ]

    # Cell 13
    nb["cells"][13]["source"] = [
        "## 6. Technical Engineering Discussion & Verification\n",
        "\n",
        "1. **Dimensional and Temporal Separation:**  \n",
        "   Operational hydrology operates in instantaneous discharge rates ($Q = dV/dt$ in cfs, $t = \\text{now}$) to capture real-time weather and dam operations. Macro water budgeting operates in annual volumetric accounting ($V = \\int Q dt$ in MAF/yr, $t = 1\\text{ year}$). Strict unit conversion bridges ($1\\text{ cfs sustained for 1 yr} = 723.97\\text{ AF} \\approx 0.000724\\text{ MAF}$) prevent mixing instantaneous surges with multi-year storage trends.\n",
        "2. **Topological Hydrologic Integrity:**  \n",
        "   Streamgages cannot be naively chained by linear proximity; river networks are directed acyclic graphs (DAGs) constrained by mass balance. At every confluence junction, downstream reach discharge must approximate upstream mainstem plus tributary inflows minus diversions and losses ($\\Delta Q$).\n",
        "3. **Hybrid Architecture:**  \n",
        "   The platform couples lightweight, zero-dependency static JSON files for high-speed edge delivery in the browser with this normalized SQLite database for reproducible, audit-grade scientific query capabilities."
    ]

    with open(path, "w", encoding="utf-8") as f:
        json.dump(nb, f, indent=2)

    print(f"Updated {path} with clean scientific narrative.")

if __name__ == "__main__":
    clean_notebook_04()
