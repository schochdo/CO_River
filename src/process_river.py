"""
Process all fetched river data into a single river_network.json for the Leaflet map.

Handles:
  1. Colorado River mainstem (LevelPathI-based, split into named reaches)
  2. Green River (LevelPathI-based, single reach)
  3. Major tributaries (Yampa, San Juan, Gunnison - LevelPathI-based)
  4. Headwater rivers (Eagle, Roaring Fork, Blue, Fraser - name-based from earlier fetch)
  5. NEW: All additional tributaries from fetch_tributaries.py (in web/data/tributaries/)

Output: web/data/river_network.json
"""

import json
import os
from shapely.geometry import shape, Point, MultiLineString

# ── Colorado River mainstem reach definitions ──
# These reference points are used to assign NHD segments to named reaches
REACHES = {
    "Colorado River - Headwaters to Granby": {
        "id": "headwaters", "cfs": 350, "weight": 2.5,
        "pt": Point(-106.050, 40.090)
    },
    "Colorado River - Kremmling & Gore Canyon to Dotsero": {
        "id": "gore_canyon", "cfs": 718, "weight": 4.0,
        "pt": Point(-106.750, 39.880)
    },
    "Colorado River - Glenwood Canyon to Cameo": {
        "id": "glenwood_cameo", "cfs": 1420, "weight": 5.5,
        "pt": Point(-107.600, 39.530)
    },
    "Colorado River - Grand Valley to Cisco (State Line)": {
        "id": "grand_valley_cisco", "cfs": 2640, "weight": 7.0,
        "pt": Point(-108.950, 39.150)
    },
    "Colorado River - Confluence through Cataract Canyon to Lake Powell": {
        "id": "cataract_canyon", "cfs": 5490, "weight": 9.0,
        "pt": Point(-110.200, 37.850)
    },
    "Colorado River - Glen Canyon to Lees Ferry": {
        "id": "lees_ferry", "cfs": 8140, "weight": 11.5,
        "pt": Point(-111.520, 36.900)
    },
    "Colorado River - Grand Canyon to Lake Mead": {
        "id": "grand_canyon", "cfs": 8100, "weight": 10.5,
        "pt": Point(-112.500, 36.250)
    },
    "Colorado River - Lower Basin (Hoover Dam to Parker Dam)": {
        "id": "lower_basin_upper", "cfs": 6800, "weight": 8.0,
        "pt": Point(-114.600, 34.800)
    },
    "Colorado River - Agricultural Siphon to Mexico (Tapering)": {
        "id": "lower_basin_taper", "cfs": 1200, "weight": 3.5,
        "pt": Point(-114.520, 33.400)
    },
}

# ── Tributary definitions ──
# Major rivers already fetched by fetch_highres_rivers.py (LevelPathI-based)
MAJOR_TRIBUTARIES = [
    ("Green River", "web/data/green_river_raw.geojson", "green_river", 6.5, 2850),
    ("Yampa River", "web/data/yampa_river_raw.geojson", "yampa_river", 4.0, 140),
    ("San Juan River", "web/data/sanjuan_river_raw.geojson", "sanjuan_river", 5.5, 2800),
    ("Gunnison River", "web/data/gunnison_river_raw.geojson", "gunnison_river", 4.5, 1140),
]

# New tributaries fetched by fetch_tributaries.py
# (display_name, filename_slug, reach_id, weight, approx_flow_cfs)
NEW_TRIBUTARIES = [
    # Upper Basin - Green River sub-tributaries
    ("White River",           "white_river",           "white_river",           3.5, 520),
    ("Duchesne River",        "duchesne_river",        "duchesne_river",        3.0, 310),
    ("Price River",           "price_river",           "price_river",           2.5, 85),
    
    # Upper Basin - Yampa sub-tributary
    ("Little Snake River",    "little_snake_river",    "little_snake_river",    2.5, 165),
    
    # Upper Basin - Colorado mainstem tributaries
    ("Dolores River",         "dolores_river",         "dolores_river",         3.5, 280),
    ("Uncompahgre River",     "uncompahgre_river",     "uncompahgre_river",     3.0, 380),
    
    # Upper Basin - Utah tributaries
    ("San Rafael River",      "san_rafael_river",      "san_rafael_river",      2.5, 65),
    ("Dirty Devil River",     "dirty_devil_river",     "dirty_devil_river",     2.5, 30),
    ("Escalante River",       "escalante_river",       "escalante_river",       2.0, 15),
    
    # Upper Basin - San Juan sub-tributary
    ("Animas River",          "animas_river",          "animas_river",          3.5, 620),
    
    # Lower Basin
    ("Little Colorado River", "little_colorado_river", "little_colorado_river", 3.5, 190),
    ("Paria River",           "paria_river",           "paria_river",           2.0, 15),
    ("Virgin River",          "virgin_river",          "virgin_river",          3.5, 190),
    ("Bill Williams River",   "bill_williams_river",   "bill_williams_river",   2.5, 25),
    
    # Gila River system
    ("Gila River",            "gila_river",            "gila_river",            4.5, 550),
    ("Salt River",            "salt_river",            "salt_river",            4.0, 640),
    ("Verde River",           "verde_river",           "verde_river",           3.5, 420),
]

# Headwater rivers (previously fetched by name query, included in earlier river_network.json)
# These use the existing data already in river_network.json — we'll re-fetch or preserve them
HEADWATER_RIVERS = [
    ("Eagle River",       "eagle_river",       3.5, 320),
    ("Roaring Fork River","roaring_fork_river", 4.0, 480),
    ("Blue River",        "blue_river",        3.0, 210),
    ("Fraser River",      "fraser_river",      2.2, 65),
]


def is_in_basin(geom):
    """Check if a geometry's centroid is within the broad Colorado River Basin bounds."""
    c = geom.centroid
    return -116.0 <= c.x <= -105.0 and 31.0 <= c.y <= 44.0


def get_closest_reach(centroid):
    """Find the closest Colorado River mainstem reach to a given centroid."""
    min_dist = float('inf')
    best_reach = None
    for name, data in REACHES.items():
        dist = centroid.distance(data["pt"])
        if dist < min_dist:
            min_dist = dist
            best_reach = (name, data)
    return best_reach


def process_geojson_file(filepath, simplify_tolerance=0.0005):
    """Load a GeoJSON file and return simplified coordinate arrays."""
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
    
    # ── 1. Green River (special: single reach from LevelPathI data) ──
    print("Processing Green River...")
    green_lines = process_geojson_file("web/data/green_river_raw.geojson")
    if green_lines:
        reach_groups["Green River"] = {
            "name": "Green River",
            "reach": "green_river",
            "flow_cfs": 2850,
            "weight": 6.5,
            "coords": green_lines
        }
        print(f"  ✓ {len(green_lines)} segments")
    
    # ── 2. Colorado River mainstem (split into named reaches) ──
    print("Processing Colorado River mainstem...")
    co_lines = process_geojson_file("web/data/co_river_raw.geojson")
    
    # Re-load raw to do reach assignment (need original geometry for centroids)
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
                reach_groups[reach_name] = {
                    "name": reach_name,
                    "reach": reach_data["id"],
                    "flow_cfs": reach_data["cfs"],
                    "weight": reach_data["weight"],
                    "coords": []
                }
            
            reach_groups[reach_name]["coords"].append(
                [[pt[0], pt[1]] for pt in line.coords]
            )
    
    co_reaches = sum(1 for k in reach_groups if k.startswith("Colorado River"))
    co_segs = sum(len(v["coords"]) for k, v in reach_groups.items() if k.startswith("Colorado River"))
    print(f"  ✓ {co_segs} segments across {co_reaches} reaches")
    
    # ── 3. Major tributaries (Yampa, San Juan, Gunnison) ──
    for name, raw_file, reach_id, weight, flow in MAJOR_TRIBUTARIES[1:]:  # Skip Green (done above)
        print(f"Processing {name}...")
        lines = process_geojson_file(raw_file)
        if lines:
            reach_groups[name] = {
                "name": name,
                "reach": reach_id,
                "flow_cfs": flow,
                "weight": weight,
                "coords": lines
            }
            print(f"  ✓ {len(lines)} segments")
        else:
            print(f"  ⚠ No data for {name}")
    
    # ── 4. New tributaries from fetch_tributaries.py ──
    print("\nProcessing new tributaries from web/data/tributaries/...")
    for display_name, slug, reach_id, weight, flow in NEW_TRIBUTARIES:
        raw_file = f"web/data/tributaries/{slug}_raw.geojson"
        print(f"Processing {display_name}...")
        lines = process_geojson_file(raw_file)
        if lines:
            reach_groups[display_name] = {
                "name": display_name,
                "reach": reach_id,
                "flow_cfs": flow,
                "weight": weight,
                "coords": lines
            }
            print(f"  ✓ {len(lines)} segments")
        else:
            print(f"  ⚠ No data for {display_name}")
    
    # ── 5. Headwater rivers (preserve from existing river_network.json) ──
    print("\nPreserving headwater rivers from existing data...")
    try:
        with open("web/data/river_network.json") as f:
            existing = json.load(f)
        
        headwater_names = {name for name, _, _, _ in HEADWATER_RIVERS}
        for reach in existing:
            if reach["name"] in headwater_names and reach["name"] not in reach_groups:
                reach_groups[reach["name"]] = reach
                print(f"  ✓ Preserved {reach['name']} ({len(reach['coords'])} segments)")
    except Exception as e:
        print(f"  ⚠ Could not preserve headwater rivers: {e}")
    
    # ── Output ──
    output = list(reach_groups.values())
    with open("web/data/river_network.json", "w") as f:
        json.dump(output, f)
    
    total_segments = sum(len(r["coords"]) for r in output)
    print(f"\n{'='*60}")
    print(f"RIVER NETWORK SUMMARY")
    print(f"{'='*60}")
    print(f"Total reaches: {len(output)}")
    print(f"Total segments: {total_segments}")
    print(f"\nReaches by type:")
    
    for r in sorted(output, key=lambda x: -x["weight"]):
        print(f"  {r['name']:55s} w={r['weight']:4.1f}  {len(r['coords']):5d} segs  ~{r['flow_cfs']:,} cfs")
    
    print(f"\nWrote {len(output)} reaches to web/data/river_network.json")


if __name__ == "__main__":
    process()
