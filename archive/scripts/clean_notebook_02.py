#!/usr/bin/env python3
import json

def clean_notebook_02():
    path = "notebooks/02_analyze_flow_and_export.ipynb"
    with open(path, "r", encoding="utf-8") as f:
        nb = json.load(f)

    nb["cells"][0]["source"] = [
        "# 02: Real-Time Hydrologic Metric & Monitoring Engine\n",
        "**Author:** Douglas Schoch  \n",
        "**Affiliation:** Colorado Mountain College • DAT1001 • Fall 2026  \n",
        "\n",
        "This notebook ingests operational streamflow and reservoir observations using the USGS `dataretrieval` library:\n",
        "1. **Instantaneous Telemetry:** Ingests discharge (`00060`, cfs) and gauge height (`00065`, ft) for basin sentinel stations.\n",
        "2. **Historical Baselines:** Evaluates current discharge against 50-year daily statistics (`pct_of_median = current / median * 100`).\n",
        "3. **Sequential Reach Mass-Balance ($\\Delta Q$):** Evaluates streamflow gains and losses between successive mainstem stations.\n",
        "4. **Reservoir Storage:** Ingests live pool elevations (`62614`) for Lake Mead and Lake Powell to compute active capacity percentages.\n",
        "5. **Static Artifact Generation:** Exports `web/data/latest_conditions.json` for edge client hydration."
    ]

    with open(path, "w", encoding="utf-8") as f:
        json.dump(nb, f, indent=2)

    print(f"Cleaned {path} Cell 0 successfully.")

if __name__ == "__main__":
    clean_notebook_02()
