#!/usr/bin/env python3
"""
Computes the Richards-Baker Flashiness Index (RBI) and Sentinel Status Hierarchy
for all Colorado River Basin dashboard facilities and writes web/data/station_hierarchy.json.

Formulas:
  RBI = sum(|Q_t - Q_{t-1}|) / sum(Q_t)
Regimes:
  - Regulated / Attenuated: RBI < 0.020
  - Snowmelt Baseflow: 0.020 <= RBI < 0.060
  - Flashy / Desert Monsoon: RBI >= 0.060
  - Storage Buffer: N/A for reservoirs
"""

import json
import os

REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
NORMALS_PATH = os.path.join(REPO_ROOT, "web", "data", "historical_normals.json")
METRICS_PATH = os.path.join(REPO_ROOT, "web", "data", "latest_metrics.json")
OUTPUT_PATH = os.path.join(REPO_ROOT, "web", "data", "station_hierarchy.json")

# Explicit Sentinel Tiers
COMPACT_SENTINEL_IDS = {"09380000"}

BASIN_SENTINEL_IDS = {
    # Mainstem Upper Basin Sentinels
    "09095500",  # Cameo
    "09070500",  # Dotsero
    "09163500",  # CO-UT State Line
    "09180500",  # Cisco
    # Green River Major Accounting Nodes
    "09234500",  # Greendale (Flaming Gorge Dam Release)
    "09260050",  # Yampa River at Deerlodge Park
    "09261000",  # Jensen, UT
    "09315000",  # Green River at Green River, UT
    # Major Tributary Terminus Sentinels
    "09152500",  # Gunnison River near Grand Junction
    "09180000",  # Dolores River near Cisco
    "09379500",  # San Juan River near Bluff
    # Lower Basin Regulated Deliveries & Dams
    "09421500", "USBR_HOOVER", "USBR-HOOVER",
    "09423000", "USBR_DAVIS", "USBR-DAVIS",
    "09427520", "USBR_PARKER", "USBR-PARKER",
    "09429100",  # Below Palo Verde Dam
    "09429500",  # Below Imperial Dam
}

def calculate_rbi_for_normals(days_dict):
    sorted_days = sorted(days_dict.keys())
    values = [days_dict[d] for d in sorted_days]
    total_q = sum(values)
    if total_q <= 0:
        return 0.0
    abs_diff = sum(abs(values[i] - values[i-1]) for i in range(1, len(values)))
    return round(abs_diff / total_q, 4)

def classify_rbi(rbi):
    if rbi is None:
        return {"score": None, "regime": "Storage Buffer", "badge": "bg-slate-100 text-slate-600"}
    if rbi < 0.020:
        return {"score": rbi, "regime": "Regulated", "badge": "bg-emerald-100 text-emerald-800 border-emerald-300"}
    elif rbi < 0.060:
        return {"score": rbi, "regime": "Snowmelt", "badge": "bg-sky-100 text-sky-800 border-sky-300"}
    else:
        return {"score": rbi, "regime": "Flashy", "badge": "bg-amber-100 text-amber-900 border-amber-300"}

def main():
    with open(NORMALS_PATH) as f:
        normals_data = json.load(f)
    sites_normals = normals_data.get("sites", {})

    with open(METRICS_PATH) as f:
        metrics_data = json.load(f)

    # Compute RBI dictionary
    rbi_scores = {}
    for site_id, days in sites_normals.items():
        rbi_scores[site_id] = calculate_rbi_for_normals(days)

    # Known regulated dam release RBI defaults for USBR tailwaters
    dam_tailwaters = ["09421500", "USBR_HOOVER", "USBR-HOOVER", "09423000", "USBR_DAVIS", "USBR-DAVIS", "09427520", "USBR_PARKER", "USBR-PARKER"]
    for dw in dam_tailwaters:
        if dw not in rbi_scores:
            rbi_scores[dw] = 0.0150  # Strongly hydro-regulated release

    hierarchy = {
        "metadata": {
            "description": "Richards-Baker Flashiness Index & Basin Sentinel Hierarchy for Colorado River telemetry nodes",
            "formula": "RBI = sum(|Q_t - Q_{t-1}|) / sum(Q_t)",
            "tiers": [
                "Compact Sentinel (Tier 1)",
                "Basin Sentinel (Tier 2)",
                "Tributary Gage (Tier 3)",
                "Trans-Divide Tunnel (Tier 4)",
                "Conveyance Canal (Tier 5)",
                "Storage Reservoir (Tier 6)"
            ]
        },
        "stations": {}
    }

    # 1. Streamflows
    for s in metrics_data.get("streamflows", []):
        sid = s["id"]
        if sid in COMPACT_SENTINEL_IDS:
            tier_code = "compact_sentinel"
            tier_label = "Compact Sentinel"
            tier_rank = 1
        elif sid in BASIN_SENTINEL_IDS:
            tier_code = "basin_sentinel"
            tier_label = "Basin Sentinel"
            tier_rank = 2
        else:
            tier_code = "tributary_gage"
            tier_label = "Tributary Gage"
            tier_rank = 3

        rbi_val = rbi_scores.get(sid, 0.0180 if "USBR" in sid else None)
        rbi_meta = classify_rbi(rbi_val)

        hierarchy["stations"][sid] = {
            "id": sid,
            "name": s["name"],
            "type": "streamflow",
            "tier_code": tier_code,
            "tier_label": tier_label,
            "tier_rank": tier_rank,
            "rbi": rbi_meta["score"],
            "regime": rbi_meta["regime"],
            "badge_class": rbi_meta["badge"]
        }

    # 2. Tunnels
    for t in metrics_data.get("tunnels", []):
        sid = t["id"]
        hierarchy["stations"][sid] = {
            "id": sid,
            "name": t["name"],
            "type": "diversion_tunnel",
            "tier_code": "export_tunnel",
            "tier_label": "Trans-Divide Tunnel",
            "tier_rank": 4,
            "rbi": 0.0100,
            "regime": "Regulated Export",
            "badge_class": "bg-emerald-100 text-emerald-800 border-emerald-300"
        }

    # 3. Canals
    for c in metrics_data.get("canals", []):
        sid = c["id"]
        rbi_val = rbi_scores.get(sid, 0.0120)
        hierarchy["stations"][sid] = {
            "id": sid,
            "name": c["name"],
            "type": "diversion_canal",
            "tier_code": "conveyance_canal",
            "tier_label": "Conveyance Canal",
            "tier_rank": 5,
            "rbi": rbi_val,
            "regime": "Regulated Canal",
            "badge_class": "bg-emerald-100 text-emerald-800 border-emerald-300"
        }

    # 4. Reservoirs
    for r in metrics_data.get("reservoirs", []):
        sid = r["id"]
        hierarchy["stations"][sid] = {
            "id": sid,
            "name": r["name"],
            "type": "reservoir",
            "tier_code": "storage_reservoir",
            "tier_label": "Storage Reservoir",
            "tier_rank": 6,
            "rbi": None,
            "regime": "Storage Buffer",
            "badge_class": "bg-slate-100 text-slate-600 border-slate-300"
        }

    with open(OUTPUT_PATH, "w") as f:
        json.dump(hierarchy, f, indent=2)

    print(f"Wrote hierarchy & RBI data for {len(hierarchy['stations'])} stations to {OUTPUT_PATH}")

if __name__ == "__main__":
    main()
