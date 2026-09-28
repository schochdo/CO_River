"""
Process all fetched river data into a single river_network.json for the Leaflet map.

Handles:
  1. Colorado River mainstem (LevelPathI-based, split into 9 contiguous reaches with cumulative mass balance)
  2. Green River (LevelPathI-based, single reach)
  3. Major tributaries (Yampa, San Juan, Gunnison - LevelPathI-based)
  4. Headwater rivers (Eagle, Roaring Fork, Blue, Fraser - name-based)
  5. Primary tributaries (White, Duchesne, Price, Little Snake, Dolores, Uncompahgre,
     San Rafael, Dirty Devil, Escalante, Animas, Little Colorado, Paria, Virgin, Bill Williams,
     Gila, Salt, Verde)
  6. Secondary tributaries (Fryingpan, Muddy, San Pedro, Santa Cruz, Kanab, Havasu)

Weighting:
  Uses USGS empirical hydraulic geometry scaling: Width = Base + k * (Flow ^ 0.5).
  As tributaries enter the mainstem, the flow accumulates and the polyline widens proportionally.

Output: web/data/river_network.json
"""

import json
import os
from shapely.geometry import shape, Point, MultiLineString

def compute_weight(flow_cfs):
    """
    Computes cartographic polyline pixel width using hydraulic geometry scaling:
    w = 1.4 + 0.11 * (flow_cfs ^ 0.5)
    Derived from Leopold & Maddock's classic USGS empirical river hydraulic geometry equation w = a * Q^b.
    """
    if flow_cfs <= 0:
        return 1.8
    return round(1.4 + 0.11 * (flow_cfs ** 0.5), 1)

# ── Colorado River mainstem reaches with cumulative hydrologic mass balance ──
REACHES = {
    "Colorado River - Headwaters to Granby": {
        "id": "headwaters",
        "cfs": 350,
        "category": "mainstem",
        "pt": Point(-106.050, 40.090),
        "notes": "Snowpack headwaters in RMNP; upstream of C-BT Adams Tunnel diversions"
    },
    "Colorado River - Kremmling & Gore Canyon to Dotsero": {
        "id": "gore_canyon",
        "cfs": 718,
        "category": "mainstem",
        "pt": Point(-106.750, 39.880),
        "notes": "After Blue & Williams Fork confluences; Gore Canyon whitewater"
    },
    "Colorado River - Glenwood Canyon to Cameo": {
        "id": "glenwood_cameo",
        "cfs": 1420,
        "category": "mainstem",
        "pt": Point(-107.600, 39.530),
        "notes": "After Eagle & Roaring Fork/Fryingpan confluences; Shoshone hydro reach"
    },
    "Colorado River - Grand Valley to Cisco (State Line)": {
        "id": "grand_valley_cisco",
        "cfs": 2640,
        "category": "mainstem",
        "pt": Point(-108.950, 39.150),
        "notes": "After Gunnison River confluence at Grand Junction; enters Utah slickrock"
    },
    "Colorado River - Confluence through Cataract Canyon to Lake Powell": {
        "id": "cataract_canyon",
        "cfs": 5770,
        "category": "mainstem",
        "pt": Point(-110.200, 37.850),
        "notes": "After Green River & Dolores River confluences in Canyonlands National Park"
    },
    "Colorado River - Glen Canyon to Lees Ferry": {
        "id": "lees_ferry",
        "cfs": 8140,
        "category": "mainstem",
        "pt": Point(-111.520, 36.900),
        "notes": "Glen Canyon Dam controlled release; 1922 Compact official divide point"
    },
    "Colorado River - Grand Canyon to Lake Mead": {
        "id": "grand_canyon",
        "cfs": 8400,
        "category": "mainstem",
        "pt": Point(-112.500, 36.250),
        "notes": "277-mile canyon reach joined by Paria, Little Colorado, Kanab, and Havasu creeks"
    },
    "Colorado River - Lower Basin (Hoover Dam to Parker Dam)": {
        "id": "lower_basin_upper",
        "cfs": 7200,
        "category": "mainstem",
        "pt": Point(-114.600, 34.800),
        "notes": "Lake Mohave & Lake Havasu; CRA & CAP municipal intake pools"
    },
    "Colorado River - Agricultural Siphon to Mexico (Tapering)": {
        "id": "lower_basin_taper",
        "cfs": 1200,
        "category": "mainstem",
        "pt": Point(-114.520, 33.400),
        "notes": "All-American Canal diversion at Imperial Dam; Morelos Dam diversion to Mexicali"
    },
}

# ── Major Tributaries (LevelPathI-based) ──
MAJOR_TRIBUTARIES = [
    ("Green River",    "web/data/green_river_raw.geojson",    "green_river",    2850, "major_tributary"),
    ("San Juan River", "web/data/sanjuan_river_raw.geojson",  "sanjuan_river",  2800, "major_tributary"),
    ("Gunnison River", "web/data/gunnison_river_raw.geojson", "gunnison_river", 1140, "major_tributary"),
    ("Yampa River",    "web/data/yampa_river_raw.geojson",    "yampa_river",     305, "major_tributary"),
]

# ── All Basin Tributaries (Primary + Secondary) ──
# (display_name, filename_slug, reach_id, approx_flow_cfs, category)
ALL_TRIBUTARIES = [
    # Upper Basin - Green River Sub-Basin
    ("White River",           "white_river",           "white_river",           520, "major_tributary"),
    ("Duchesne River",        "duchesne_river",        "duchesne_river",        310, "minor_tributary"),
    ("Price River",           "price_river",           "price_river",            85, "minor_tributary"),
    ("Little Snake River",    "little_snake_river",    "little_snake_river",    165, "minor_tributary"),
    
    # Upper Basin - Colorado Mainstem Tributaries
    ("Dolores River",         "dolores_river",         "dolores_river",         280, "major_tributary"),
    ("Uncompahgre River",     "uncompahgre_river",     "uncompahgre_river",     380, "minor_tributary"),
    ("Fryingpan River",       "fryingpan_river",       "fryingpan_river",       180, "minor_tributary"),
    
    # Upper Basin - Utah Slickrock Tributaries
    ("San Rafael River",      "san_rafael_river",      "san_rafael_river",       65, "minor_tributary"),
    ("Dirty Devil River",     "dirty_devil_river",     "dirty_devil_river",      30, "minor_tributary"),
    ("Escalante River",       "escalante_river",       "escalante_river",        15, "minor_tributary"),
    
    # Upper Basin - San Juan Sub-Basin
    ("Animas River",          "animas_river",          "animas_river",          620, "minor_tributary"),
    
    # Lower Basin - Grand Canyon & Mojave Tributaries
    ("Little Colorado River", "little_colorado_river", "little_colorado_river", 190, "major_tributary"),
    ("Paria River",           "paria_river",           "paria_river",            15, "minor_tributary"),
    ("Virgin River",          "virgin_river",          "virgin_river",          190, "major_tributary"),
    ("Muddy River",           "muddy_river",           "muddy_river",            45, "minor_tributary"),
    ("Kanab Creek",           "kanab_creek",           "kanab_creek",            25, "minor_tributary"),
    ("Havasu Creek",          "havasu_creek",          "havasu_creek",           65, "minor_tributary"),
    ("Bill Williams River",   "bill_williams_river",   "bill_williams_river",    25, "minor_tributary"),
    
    # Lower Basin - Gila / Salt River System (Arizona)
    ("Gila River",            "gila_river",            "gila_river",            550, "major_tributary"),
    ("Salt River",            "salt_river",            "salt_river",            640, "major_tributary"),
    ("Verde River",           "verde_river",           "verde_river",           420, "minor_tributary"),
    ("San Pedro River",       "san_pedro_river",       "san_pedro_river",       140, "minor_tributary"),
    ("Santa Cruz River",      "santa_cruz_river",      "santa_cruz_river",       90, "minor_tributary"),
]

# Headwater rivers in Colorado
HEADWATER_RIVERS = [
    ("Eagle River",        "eagle_river",        320, "minor_tributary"),
    ("Roaring Fork River", "roaring_fork_river", 480, "minor_tributary"),
    ("Blue River",         "blue_river",         210, "minor_tributary"),
    ("Fraser River",       "fraser_river",        65, "minor_tributary"),
]

def is_in_basin(geom):
    """Check if geometry centroid is within the broad Colorado River Basin bounds."""
    c = geom.centroid
    return -116.5 <= c.x <= -105.0 and 31.0 <= c.y <= 44.5

def get_closest_reach(centroid):
    """Find closest Colorado River reach reference point."""
    min_dist = float('inf')
    best_reach = None
    for name, data in REACHES.items():
        dist = centroid.distance(data["pt"])
        if dist < min_dist:
            min_dist = dist
            best_reach = (name, data)
    return best_reach

def process_geojson_file(filepath, simplify_tolerance=0.0005):
    """Load a GeoJSON file and return simplified coordinate lines."""
    if not os.path.exists(filepath):
        print(f"  ⚠ File not found: {filepath}")
        return []
    
    with open(filepath) as f:
        data = json.load(f)
    
    lines = []
    for feat in data.get("features", []):
        try:
            geom = shape(feat["geometry"])
            if geom.is_empty:
                continue
            
            geom = geom.simplify(simplify_tolerance, preserve_topology=True)
            if geom.is_empty:
                continue
            
            if not is_in_basin(geom):
                continue
            
            if geom.geom_type == 'MultiLineString':
                for line in geom.geoms:
                    if line.length >= 0.0003:
                        lines.append([[pt[0], pt[1]] for pt in line.coords])
            elif geom.geom_type == 'LineString':
                if geom.length >= 0.0003:
                    lines.append([[pt[0], pt[1]] for pt in geom.coords])
        except Exception:
            continue
    
    return lines

def process():
    reach_groups = {}
    
    # ── 1. Green River (single reach) ──
    print("Processing Green River...")
    green_lines = process_geojson_file("web/data/green_river_raw.geojson")
    if green_lines:
        cfs = 2850
        reach_groups["Green River"] = {
            "name": "Green River",
            "reach": "green_river",
            "flow_cfs": cfs,
            "weight": compute_weight(cfs),
            "category": "major_tributary",
            "coords": green_lines
        }
        print(f"  ✓ {len(green_lines)} segments (flow={cfs} cfs, weight={compute_weight(cfs)})")
    
    # ── 2. Colorado River mainstem (reach-split with cumulative mass balance) ──
    print("Processing Colorado River mainstem...")
    with open("web/data/co_river_raw.geojson") as f:
        co_data = json.load(f)
    
    for feat in co_data["features"]:
        geom = shape(feat["geometry"])
        if geom.is_empty or not is_in_basin(geom):
            continue
        
        geom = geom.simplify(0.0005, preserve_topology=True)
        if geom.is_empty:
            continue
        
        if geom.geom_type == 'MultiLineString':
            lines = list(geom.geoms)
        elif geom.geom_type == 'LineString':
            lines = [geom]
        else:
            continue
        
        for line in lines:
            if line.length < 0.0005:
                continue
            centroid = line.centroid
            reach_name, reach_data = get_closest_reach(centroid)
            
            if reach_name not in reach_groups:
                cfs = reach_data["cfs"]
                reach_groups[reach_name] = {
                    "name": reach_name,
                    "reach": reach_data["id"],
                    "flow_cfs": cfs,
                    "weight": compute_weight(cfs),
                    "category": reach_data["category"],
                    "notes": reach_data.get("notes", ""),
                    "coords": []
                }
            
            reach_groups[reach_name]["coords"].append(
                [[pt[0], pt[1]] for pt in line.coords]
            )
    
    # ── 3. Major tributaries (Yampa, San Juan, Gunnison) ──
    for name, raw_file, reach_id, cfs, category in MAJOR_TRIBUTARIES[1:]:
        print(f"Processing {name}...")
        lines = process_geojson_file(raw_file)
        if lines:
            reach_groups[name] = {
                "name": name,
                "reach": reach_id,
                "flow_cfs": cfs,
                "weight": compute_weight(cfs),
                "category": category,
                "coords": lines
            }
            print(f"  ✓ {len(lines)} segments (flow={cfs} cfs, weight={compute_weight(cfs)})")
    
    # ── 4. All Basin Tributaries (Primary + Secondary) ──
    print("\nProcessing all basin tributaries from web/data/tributaries/...")
    for display_name, slug, reach_id, cfs, category in ALL_TRIBUTARIES:
        raw_file = f"web/data/tributaries/{slug}_raw.geojson"
        lines = process_geojson_file(raw_file)
        if lines:
            reach_groups[display_name] = {
                "name": display_name,
                "reach": reach_id,
                "flow_cfs": cfs,
                "weight": compute_weight(cfs),
                "category": category,
                "coords": lines
            }
            print(f"  ✓ {display_name:25s}: {len(lines):4d} segments (flow={cfs:4d} cfs, weight={compute_weight(cfs):4.1f})")
        else:
            print(f"  ⚠ No data for {display_name}")
    
    # ── 5. Headwater rivers (preserve from existing river_network.json) ──
    print("\nPreserving headwater rivers from existing data...")
    try:
        with open("web/data/river_network.json") as f:
            existing = json.load(f)
        
        hw_dict = {name: (cfs, cat) for name, _, cfs, cat in HEADWATER_RIVERS}
        for reach in existing:
            if reach["name"] in hw_dict and reach["name"] not in reach_groups:
                cfs, cat = hw_dict[reach["name"]]
                reach["flow_cfs"] = cfs
                reach["weight"] = compute_weight(cfs)
                reach["category"] = cat
                reach_groups[reach["name"]] = reach
                print(f"  ✓ Preserved {reach['name']} ({len(reach['coords'])} segments, flow={cfs} cfs, weight={compute_weight(cfs)})")
    except Exception as e:
        print(f"  ⚠ Could not preserve headwater rivers: {e}")
    
    # ── Output ──
    output = list(reach_groups.values())
    with open("web/data/river_network.json", "w") as f:
        json.dump(output, f)
    
    total_segments = sum(len(r["coords"]) for r in output)
    print(f"\n{'='*70}")
    print(f"COMPREHENSIVE RIVER NETWORK SUMMARY")
    print(f"{'='*70}")
    print(f"Total reaches: {len(output)}")
    print(f"Total segments: {total_segments}")
    print(f"\nReaches sorted by flow rate (hydraulic geometry width):")
    
    for r in sorted(output, key=lambda x: -x["flow_cfs"]):
        cat_badge = "[MAIN]" if r.get("category") == "mainstem" else ("[MAJ]" if r.get("category") == "major_tributary" else "[MIN]")
        print(f"  {cat_badge} {r['name']:55s} Flow: {r['flow_cfs']:5,d} cfs -> Weight: {r['weight']:4.1f} px ({len(r['coords']):4d} segs)")
    
    print(f"\nWrote {len(output)} reaches to web/data/river_network.json successfully!")

if __name__ == "__main__":
    process()
