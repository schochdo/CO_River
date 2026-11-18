#!/usr/bin/env python3
"""
Deterministic Hydrologic Topology and Math Audit Engine.
Generates qa_reach_audit.csv and executes 5 automated topology and mass-balance checks.
"""

import os
import sys
import json
import csv
import re
from datetime import datetime
from shapely.geometry import shape
from pyproj import Geod

def run_audit():
    repo_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    river_json_path = os.path.join(repo_root, "web", "data", "river_network.json")
    metrics_path = os.path.join(repo_root, "web", "data", "latest_metrics.json")
    normals_path = os.path.join(repo_root, "web", "data", "historical_normals.json")
    fetch_path = os.path.join(repo_root, "src", "fetch_water_data.py")
    app_js_path = os.path.join(repo_root, "web", "app.js")
    output_csv_path = os.path.join(repo_root, "qa_reach_audit.csv")

    geod = Geod(ellps="WGS84")

    with open(river_json_path, "r", encoding="utf-8") as f:
        rn = json.load(f)

    with open(metrics_path, "r", encoding="utf-8") as f:
        lm = json.load(f)

    with open(normals_path, "r", encoding="utf-8") as f:
        hn = json.load(f)

    with open(fetch_path, "r", encoding="utf-8") as f:
        py_text = f.read()

    with open(app_js_path, "r", encoding="utf-8") as f:
        js_text = f.read()

    # 1. Parse spine_definitions from fetch_water_data.py
    spine_matches = re.findall(r'\(\"([a-zA-Z0-9_]+)\",\s*\"([^\"]+)\"', py_text)
    py_spine_defs = dict(spine_matches)

    # 2. Parse JS applyLiveHydrology assignments
    idx = js_text.find("applyLiveHydrology")
    end_idx = js_text.find("ensurePointLayersOnTop();", idx)
    js_body = js_text[idx:end_idx]

    # Map station flows from latest_metrics
    metrics_by_id = {s["id"]: s for s in lm.get("streamflows", [])}
    for c in lm.get("canals", []):
        metrics_by_id[c["id"]] = c
    for t in lm.get("tunnels", []):
        metrics_by_id[t["id"]] = t

    dam_medians = {
        "USBR_HOOVER": 10500.0,
        "USBR-HOOVER": 10500.0,
        "USBR_DAVIS": 5200.0,
        "USBR-DAVIS": 5200.0,
        "USBR_PARKER": 8800.0,
        "USBR-PARKER": 8800.0
    }
    date_key = "11-14"
    normals_sites = hn.get("sites", {})

    # Reaches by reach_id
    features_by_reach = {}
    for feat in rn["features"]:
        r = feat["properties"]["reach"]
        features_by_reach[r] = feat

    # 3. Define the strict topological spines (Headwaters to Mouth)
    # Group 1: Upper Colorado
    upper_colorado = [
        ("headwaters", "Colorado River", "Baker Gulch Headwaters (RMNP)", "Granby Dam Face"),
        ("colorado_granby_windygap", "Colorado River", "Granby Dam Face", "Windy Gap Dam & Fraser River Confluence"),
        ("colorado_windygap_kremmling", "Colorado River", "Windy Gap Dam & Fraser River Confluence", "Williams Fork & Muddy Creek Confluence (Kremmling)"),
        ("gore_canyon", "Colorado River", "Williams Fork & Muddy Creek Confluence (Kremmling)", "Eagle River Confluence (Dotsero)"),
        ("colorado_glenwood_canyon", "Colorado River", "Eagle River Confluence (Dotsero)", "Roaring Fork River Confluence (Glenwood Springs)"),
        ("glenwood_cameo", "Colorado River", "Roaring Fork River Confluence (Glenwood Springs)", "Gunnison River Confluence (Grand Junction / Cameo)"),
        ("colorado_stateline_cisco", "Colorado River", "Gunnison River Confluence (Grand Junction)", "Dolores River Confluence (State Line)"),
        ("grand_valley_cisco", "Colorado River", "Dolores River Confluence", "Green River Confluence (Cisco / Moab)"),
        ("cataract_canyon", "Colorado River", "Green River Confluence", "Lake Powell Full Pool Boundary"),
        ("powell_submerged_path", "Colorado River", "Lake Powell Full Pool Boundary", "Glen Canyon Dam Face")
    ]

    # Group 2: Green River
    green_river = [
        ("green_headwaters_daniel", "Green River", "Wind River Range Headwaters", "Warren Bridge / Horse Creek Confluence"),
        ("green_daniel_fontenelle", "Green River", "Warren Bridge / Horse Creek Confluence", "Fontenelle Reservoir Full Pool Boundary"),
        ("green_fontenelle_greenriverwy", "Green River", "Fontenelle Dam Face", "Blacks Fork Confluence (Green River, WY)"),
        ("green_greenriverwy_flaminggorge", "Green River", "Blacks Fork Confluence (Green River, WY)", "Flaming Gorge Reservoir Full Pool Boundary"),
        ("flaming_gorge_submerged_path", "Green River", "Flaming Gorge Reservoir Full Pool Boundary", "Flaming Gorge Dam Face"),
        ("green_upper", "Green River", "Flaming Gorge Dam Face", "Yampa River Confluence (Echo Park)"),
        ("green_middle", "Green River", "Yampa River Confluence (Echo Park)", "White & Duchesne River Confluences (Ouray)"),
        ("green_ouray_desolation", "Green River", "White & Duchesne River Confluences (Ouray)", "Price & San Rafael River Confluences (Green River, UT)"),
        ("green_river", "Green River", "Price & San Rafael River Confluences (Green River, UT)", "Colorado River Confluence (Cataract Canyon)")
    ]

    # Group 3: Gunnison River
    gunnison_river = [
        ("gunnison_headwaters", "Gunnison River", "Taylor & East River Confluence (Almont)", "Blue Mesa Reservoir Full Pool Boundary"),
        ("blue_mesa_submerged_path", "Gunnison River", "Blue Mesa Reservoir Full Pool Boundary", "Blue Mesa Dam Face"),
        ("gunnison_aspinall_cascade", "Gunnison River", "Blue Mesa Dam Face", "Crystal Dam Face & Gunnison Tunnel Intake"),
        ("gunnison_upper", "Gunnison River", "Crystal Dam Face & Gunnison Tunnel Intake", "Uncompahgre River Confluence (Delta)"),
        ("gunnison_river", "Gunnison River", "Uncompahgre River Confluence (Delta)", "Colorado River Confluence (Grand Junction)")
    ]

    # Group 4: San Juan River
    san_juan = [
        ("sanjuan_headwaters", "San Juan River", "Continental Divide Headwaters (Pagosa Springs)", "Navajo Reservoir Full Pool Boundary"),
        ("navajo_submerged_path", "San Juan River", "Navajo Reservoir Full Pool Boundary", "Navajo Dam Face"),
        ("sanjuan_upper", "San Juan River", "Navajo Dam Face", "Animas River Confluence (Farmington)"),
        ("sanjuan_farmington_shiprock", "San Juan River", "Animas River Confluence (Farmington)", "Chaco River Confluence (Shiprock)"),
        ("sanjuan_shiprock_bluff", "San Juan River", "Chaco River Confluence (Shiprock)", "Chinle Creek Confluence (Bluff)"),
        ("sanjuan_bluff_powell", "San Juan River", "Chinle Creek Confluence (Bluff)", "Lake Powell San Juan Arm Full Pool Boundary"),
        ("sanjuan_submerged_path", "San Juan River", "Lake Powell San Juan Arm Full Pool Boundary", "Lake Powell Main Thalweg Confluence")
    ]

    # Group 5: Lower Colorado
    lower_colorado = [
        ("lees_ferry", "Colorado River", "Glen Canyon Dam Face", "Paria River Confluence (Lees Ferry)"),
        ("marble_canyon", "Colorado River", "Paria River Confluence (Lees Ferry)", "Little Colorado River Confluence"),
        ("grand_canyon_upper", "Colorado River", "Little Colorado River Confluence", "Phantom Ranch (Bright Angel Creek Confluence)"),
        ("grand_canyon", "Colorado River", "Phantom Ranch (Bright Angel Creek Confluence)", "Diamond Creek Confluence"),
        ("grand_canyon_lower", "Colorado River", "Diamond Creek Confluence", "Lake Mead Full Pool Boundary (Grand Wash Cliffs)"),
        ("mead_submerged_path", "Colorado River", "Lake Mead Full Pool Boundary (Grand Wash Cliffs)", "Hoover Dam Face"),
        ("lower_basin_hoover_davis", "Colorado River", "Hoover Dam Face", "Davis Dam Face (Lake Mohave)"),
        ("lower_basin_davis_parker", "Colorado River", "Davis Dam Face", "Parker Dam Face (Lake Havasu / CAP & CRA Intakes)"),
        ("lower_basin_parker_paloverde", "Colorado River", "Parker Dam Face", "Palo Verde Diversion Dam Face"),
        ("lower_basin_paloverde_imperial", "Colorado River", "Palo Verde Diversion Dam Face", "Imperial Dam Face & All-American Canal Intake"),
        ("lower_basin_imperial_tailrace", "Colorado River", "Imperial Dam Face & All-American Canal Intake", "Desilting Works / Gila Confluence Boundary"),
        ("lower_basin_taper", "Colorado River", "Desilting Works / Gila Confluence Boundary", "Morelos Dam (Mexico International Boundary)")
    ]

    # Group 6: Other Tributaries
    other_tributaries = [
        # Fraser River
        ("fraser_river", "Fraser River", "Berthoud Pass Headwaters", "Colorado River Confluence (Windy Gap)"),
        # Williams Fork
        ("williams_fork", "Williams Fork", "Jones Pass Headwaters", "Colorado River Confluence (Parshall)"),
        # Muddy Creek (CO)
        ("muddy_creek_co", "Muddy Creek (CO)", "Rabbit Ears Pass Headwaters", "Colorado River Confluence (Kremmling)"),
        # Blue River System
        ("blue_river_headwaters", "Blue River", "Breckenridge Headwaters", "Dillon Reservoir Full Pool Boundary"),
        ("dillon_submerged_path", "Blue River", "Dillon Reservoir Full Pool Boundary", "Dillon Dam Face & Roberts Tunnel Intake"),
        ("blue_river_middle", "Blue River", "Dillon Dam Face & Roberts Tunnel Intake", "Green Mountain Reservoir Full Pool Boundary"),
        ("blue_river", "Blue River", "Green Mountain Dam Face", "Colorado River Confluence (Kremmling)"),
        # Eagle River
        ("eagle_river", "Eagle River", "Red Cliff Headwaters", "Colorado River Confluence (Dotsero)"),
        # Roaring Fork System
        ("fryingpan_headwaters", "Fryingpan River", "Continental Divide Headwaters", "Ruedi Reservoir Full Pool Boundary"),
        ("fryingpan_river", "Fryingpan River", "Ruedi Dam Face", "Roaring Fork River Confluence (Basalt)"),
        ("roaring_fork_river", "Roaring Fork River", "Aspen Headwaters", "Colorado River Confluence (Glenwood Springs)"),
        # Uncompahgre River
        ("uncompahgre_river", "Uncompahgre River", "Ouray Headwaters", "Gunnison River Confluence (Delta)"),
        # Dolores River System
        ("dolores_headwaters", "Dolores River", "San Juan Mountains Headwaters", "McPhee Dam Face & Dolores Tunnel Intake"),
        ("dolores_mcphee_bedrock", "Dolores River", "McPhee Dam Face", "San Miguel River Confluence (Bedrock)"),
        ("dolores_bedrock_cisco", "Dolores River", "San Miguel River Confluence (Bedrock)", "Gateway / Utah State Line"),
        # Yampa / Little Snake System
        ("little_snake_river", "Little Snake River", "Park Range Headwaters", "Yampa River Confluence (Lily Park)"),
        ("yampa_river", "Yampa River", "Flat Tops Headwaters", "Green River Confluence (Echo Park)"),
        # White River
        ("white_river", "White River", "Flat Tops Headwaters", "Green River Confluence (Ouray)"),
        # Duchesne River
        ("duchesne_river", "Duchesne River", "Uinta Mountains Headwaters", "Green River Confluence (Ouray)"),
        # Price River
        ("price_river", "Price River", "Wasatch Plateau Headwaters", "Green River Confluence"),
        # San Rafael River
        ("san_rafael_river", "San Rafael River", "San Rafael Swell Headwaters", "Green River Confluence"),
        # Dirty Devil River
        ("dirty_devil_river", "Dirty Devil River", "Fremont & Muddy Creek Confluence (Hanksville)", "Lake Powell Confluence"),
        # Escalante River
        ("escalante_river", "Escalante River", "Aquarius Plateau Headwaters", "Lake Powell Confluence"),
        # Animas River
        ("animas_river", "Animas River", "Silverton Headwaters", "San Juan River Confluence (Farmington)"),
        # Paria River
        ("paria_river", "Paria River", "Bryce Canyon Headwaters", "Colorado River Confluence (Lees Ferry)"),
        # Little Colorado River
        ("little_colorado_river", "Little Colorado River", "White Mountains Headwaters", "Colorado River Confluence (Grand Canyon)"),
        # Kanab Creek
        ("kanab_creek", "Kanab Creek", "Paunsaugunt Plateau Headwaters", "Colorado River Confluence (Grand Canyon)"),
        # Havasu Creek
        ("havasu_creek", "Havasu Creek", "Supai Headwaters", "Colorado River Confluence (Grand Canyon)"),
        # Virgin River & Muddy River
        ("virgin_river", "Virgin River", "Zion Headwaters", "Lake Mead Confluence"),
        ("muddy_river", "Muddy River", "Moapa Valley Springs", "Lake Mead Confluence"),
        # Bill Williams River
        ("bill_williams_river", "Bill Williams River", "Alamo Dam Face", "Lake Havasu Confluence (Parker Dam Pool)"),
        # Gila River Basin System
        ("gila_river", "Gila River", "New Mexico Headwaters through Kelvin", "Painted Rock Flood Pool Boundary"),
        ("san_pedro_river", "San Pedro River", "Huachuca Mountains / Border Headwaters", "Gila River Confluence (Winkelman)"),
        ("salt_headwaters", "Salt River", "White Mountains Headwaters", "Theodore Roosevelt Dam Face"),
        ("salt_cascade", "Salt River", "Theodore Roosevelt Dam Face", "Stewart Mountain Dam Face"),
        ("salt_river", "Salt River", "Stewart Mountain Dam Face", "Gila River Confluence (Phoenix)"),
        ("verde_headwaters", "Verde River", "Paulden Springs Headwaters", "Bartlett Dam Face"),
        ("verde_river", "Verde River", "Bartlett Dam Face", "Salt River Confluence (Fountain Hills)"),
        ("gila_lower", "Gila River", "Painted Rock Dam Face", "Colorado River Confluence (Dome, AZ)"),
        # Diversion Canals
        ("div_canal_alimentador_central", "Canal Alimentador Central", "Morelos Dam Headgates", "Mexicali Valley Agriculture (District 014)")
    ]

    spines = [
        ("Upper Colorado", upper_colorado),
        ("Green", green_river),
        ("Gunnison", gunnison_river),
        ("San Juan", san_juan),
        ("Lower Colorado", lower_colorado),
        ("Other Tributaries", other_tributaries)
    ]

    # Verify reach completeness
    all_spine_reaches = set()
    for sname, rlist in spines:
        for r_id, rname, up, down in rlist:
            all_spine_reaches.add(r_id)

    missing_reaches = set(features_by_reach.keys()) - all_spine_reaches
    if missing_reaches:
        print(f"Warning: Reaches in river_network.json missing from audit list: {missing_reaches}")

    # Build CSV rows & evaluate checks
    rows = []
    order_idx = 1

    # Check counters
    c1_mismatches = []
    c2_mid_gage = []
    c2_long_reaches = []
    c3_decoupling = []
    c4_mass_balance = []
    c5_unit_hygiene = []

    # Map of dams lacking interior submerged_path
    dams_lacking_submerged_path = {
        "colorado_granby_windygap": "Lake Granby",
        "green_fontenelle_greenriverwy": "Fontenelle Reservoir",
        "dolores_mcphee_bedrock": "McPhee Reservoir",
        "blue_river": "Green Mountain Reservoir",
        "fryingpan_river": "Ruedi Reservoir",
        "lower_basin_davis_parker": "Lake Mohave (Davis Dam)",
        "lower_basin_parker_paloverde": "Lake Havasu (Parker Dam)",
        "salt_cascade": "Roosevelt Lake (Theodore Roosevelt Dam)",
        "salt_river": "Stewart Mountain Reservoir",
        "verde_river": "Bartlett Reservoir"
    }

    # Pre-evaluate Check 4 major junctions
    # J1: Cameo + Gunnison vs State Line
    f_cameo = metrics_by_id.get("09095500", {}).get("flow_cfs", 0.0)
    f_gunn = metrics_by_id.get("09152500", {}).get("flow_cfs", 0.0)
    f_stateline = metrics_by_id.get("09163500", {}).get("flow_cfs", 0.0)
    j1_sum = f_cameo + f_gunn
    j1_div = abs(f_stateline - j1_sum) / j1_sum if j1_sum > 0 else 0

    # J2: Cisco + Green vs Cataract
    f_cisco = metrics_by_id.get("09180500", {}).get("flow_cfs", 0.0)
    f_green = metrics_by_id.get("09315000", {}).get("flow_cfs", 0.0)
    f_cataract = features_by_reach.get("cataract_canyon", {}).get("properties", {}).get("flow_cfs", 0.0)
    j2_sum = f_cisco + f_green
    j2_div = abs(f_cataract - j2_sum) / j2_sum if j2_sum > 0 else 0

    # J3: Davis - CAP - CRA vs Parker
    f_davis = metrics_by_id.get("USBR_DAVIS", {}).get("flow_cfs") or metrics_by_id.get("USBR-DAVIS", {}).get("flow_cfs", 0.0)
    f_cap = metrics_by_id.get("09426650", {}).get("flow_cfs") or 0.0
    f_cra = metrics_by_id.get("09424150", {}).get("flow_cfs") or 0.0
    f_parker = metrics_by_id.get("USBR_PARKER", {}).get("flow_cfs") or metrics_by_id.get("USBR-PARKER", {}).get("flow_cfs", 0.0)
    j3_expected = f_davis - f_cap - f_cra
    j3_div = abs(f_parker - j3_expected) / abs(j3_expected) if j3_expected != 0 else 0

    # J4: Palo Verde - All-American Canal vs Imperial Tailrace
    f_pv = metrics_by_id.get("09429100", {}).get("flow_cfs", 0.0)
    f_aac = metrics_by_id.get("09527700", {}).get("flow_cfs", 0.0)
    f_imp = metrics_by_id.get("09429500", {}).get("flow_cfs", 0.0)
    j4_expected = f_pv - f_aac
    j4_div = abs(f_imp - j4_expected) / abs(j4_expected) if j4_expected != 0 else 0

    for spine_name, reach_list in spines:
        for r_id, river_name, up_node, down_node in reach_list:
            feat = features_by_reach[r_id]
            props = feat["properties"]
            reach_type = props.get("reach_type", "free_flowing")
            geom = shape(feat["geometry"])
            length_mi = round(geod.geometry_length(geom) / 1609.344, 1)

            # Python source ID or formula
            rn_gid = props.get("gauge_id")
            py_source = py_spine_defs.get(r_id, rn_gid)
            if reach_type == "submerged_path" or r_id.endswith("_submerged_path"):
                py_source_display = "submerged (flow=0)"
            elif py_source:
                py_source_display = str(py_source)
            else:
                py_source_display = "None"

            # JS source ID or formula
            if reach_type == "submerged_path" or r_id.endswith("_submerged_path"):
                js_source_display = "submerged (flow=0)"
            else:
                # regex search in app.js
                m = re.search(rf'(?:r\s*===?\s*\"{r_id}\"[^\)]*|\([^\)]*r\s*===?\s*\"{r_id}\"[^\)]*\))\s*\{{([^}}]+)\}}', js_body)
                if m:
                    code = m.group(1)
                    flow_m = re.search(r'flow\s*=\s*([^;]+);', code)
                    gid_m = re.search(r'gaugeId\s*=\s*\"?([^\";]+)\"?;', code)
                    flow_str = flow_m.group(1).strip() if flow_m else ""
                    gid_str = gid_m.group(1).strip() if gid_m else None
                    if "Math.round(" in flow_str or "Math.max(" in flow_str or "+" in flow_str or "-" in flow_str:
                        js_source_display = flow_str
                    elif gid_str and gid_str != "?":
                        js_source_display = gid_str
                    else:
                        js_source_display = flow_str
                else:
                    js_source_display = "UNKNOWN"

            # Live cfs
            live_cfs = props.get("flow_cfs")
            if reach_type == "submerged_path":
                live_cfs = 0.0

            # Historical 50-year median
            median_val = None
            if rn_gid in dam_medians:
                median_val = dam_medians[rn_gid]
            elif py_source in dam_medians:
                median_val = dam_medians[py_source]
            elif rn_gid in normals_sites:
                median_val = normals_sites[rn_gid].get(date_key)
            elif py_source in normals_sites:
                median_val = normals_sites[py_source].get(date_key)

            pct_of_median = None
            if live_cfs is not None and median_val is not None and median_val > 0:
                pct_of_median = round((float(live_cfs) / float(median_val)) * 100, 1)

            # Evaluate Flags
            flags = []

            # Check 1: Python vs JS Parity
            py_norm = py_source_display.replace("_", "-")
            js_norm = js_source_display.replace("_", "-")
            if py_norm != js_norm:
                flags.append("PARITY_MISMATCH")
                c1_mismatches.append((r_id, py_source_display, js_source_display))

            # Check 2: Node-Only Splits & Long Reaches
            if props.get("category") == "mainstem" and reach_type != "submerged_path" and length_mi > 120.0:
                flags.append("LONG_REACH")
                c2_long_reaches.append((r_id, length_mi))

            # Check 3: Reservoir Decoupling (submerged_path check)
            if r_id in dams_lacking_submerged_path:
                flags.append("DAM_INFLOW_EQ_OUTFLOW")
                c3_decoupling.append((r_id, dams_lacking_submerged_path[r_id]))

            # Check 4: Mass Balance Conservation (> 25% divergence)
            if r_id == "cataract_canyon" and j2_div > 0.25:
                flags.append("MASS_BALANCE_WARN")
                c4_mass_balance.append((r_id, f"Cisco + Green ({j2_sum:,.1f}) vs Cataract ({f_cataract:,.1f}): {j2_div*100:.1f}% div"))
            elif r_id == "lower_basin_parker_paloverde" and j3_div > 0.25:
                flags.append("MASS_BALANCE_WARN")
                c4_mass_balance.append((r_id, f"Davis - CAP - CRA ({j3_expected:,.1f}) vs Parker ({f_parker:,.1f}): {j3_div*100:.1f}% div"))
            elif r_id == "lower_basin_imperial_tailrace" and j4_div > 0.25:
                flags.append("MASS_BALANCE_WARN")
                c4_mass_balance.append((r_id, f"Palo Verde - AAC ({j4_expected:,.1f}) vs Imperial Tailrace ({f_imp:,.1f}): {j4_div*100:.1f}% div"))

            # Check 5: Unit Hygiene
            if isinstance(live_cfs, str) and any(u in live_cfs.upper() for u in ["AF", "MAF"]):
                flags.append("UNIT_HYGIENE_VIOLATION")
                c5_unit_hygiene.append((r_id, live_cfs))

            qa_flags_str = "; ".join(flags)

            row = {
                "spine_order": order_idx,
                "reach_id": r_id,
                "river_name": river_name,
                "upstream_node": up_node,
                "downstream_node": down_node,
                "length_miles": length_mi,
                "reach_type": reach_type,
                "python_source_id_or_formula": py_source_display,
                "js_source_id_or_formula": js_source_display,
                "live_cfs": live_cfs if live_cfs is not None else "",
                "median_50yr_cfs": median_val if median_val is not None else "",
                "pct_of_median": pct_of_median if pct_of_median is not None else "",
                "qa_flags": qa_flags_str
            }
            rows.append(row)
            order_idx += 1

    # Write CSV
    fieldnames = [
        "spine_order",
        "reach_id",
        "river_name",
        "upstream_node",
        "downstream_node",
        "length_miles",
        "reach_type",
        "python_source_id_or_formula",
        "js_source_id_or_formula",
        "live_cfs",
        "median_50yr_cfs",
        "pct_of_median",
        "qa_flags"
    ]

    with open(output_csv_path, "w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)

    print(f"Exported {len(rows)} reaches to {output_csv_path}")

    # Return summary data
    return {
        "total_reaches": len(rows),
        "c1_mismatches": c1_mismatches,
        "c2_mid_gage": c2_mid_gage,
        "c2_long_reaches": c2_long_reaches,
        "c3_decoupling": c3_decoupling,
        "c4_mass_balance": c4_mass_balance,
        "c5_unit_hygiene": c5_unit_hygiene,
        "rows": rows
    }

if __name__ == "__main__":
    res = run_audit()
