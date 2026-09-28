"""
Fetch all major tributaries of the Colorado River Basin from USGS NHD.

Strategy:
  1. For each river, query NHD Layer 4 (Flowline Small Scale) near a known point
     with the river's GNIS name to discover its LevelPathI (mainstem ID).
  2. Then fetch ALL segments for that LevelPathI to get continuous flowlines
     including segments through reservoirs.
  3. Save each river as a separate GeoJSON file in web/data/tributaries/.
"""

import requests
import json
import os
import time

NHD_URL = "https://hydro.nationalmap.gov/arcgis/rest/services/nhd/MapServer/4/query"
OUT_DIR = "web/data/tributaries"

# Each entry: (name, gnis_name, known_lon, known_lat, search_radius_deg)
TRIBUTARIES = [
    # ── Upper Basin ──
    ("White River",         "White River",         -108.50, 40.05, 0.20),
    ("Duchesne River",      "Duchesne River",      -110.40, 40.16, 0.20),
    ("Price River",         "Price River",          -110.50, 39.60, 0.20),
    ("Little Snake River",  "Little Snake River",   -108.20, 40.80, 0.20),
    ("Dolores River",       "Dolores River",        -108.90, 38.45, 0.20),
    ("Uncompahgre River",   "Uncompahgre River",    -107.67, 38.45, 0.20),
    ("San Rafael River",    "San Rafael River",     -110.60, 38.75, 0.20),
    ("Dirty Devil River",   "Dirty Devil River",    -110.40, 38.20, 0.25),
    ("Escalante River",     "Escalante River",      -111.30, 37.80, 0.30),
    ("Animas River",        "Animas River",         -107.88, 37.28, 0.20),
    
    # ── Lower Basin ──
    ("Little Colorado River","Little Colorado River",-111.20, 35.20, 0.25),
    ("Paria River",         "Paria River",          -111.90, 37.00, 0.25),
    ("Virgin River",        "Virgin River",         -113.80, 36.80, 0.25),
    ("Bill Williams River", "Bill Williams River",  -113.75, 34.30, 0.25),
    ("Gila River",          "Gila River",           -110.80, 33.00, 0.25),
    ("Salt River",          "Salt River",           -111.10, 33.55, 0.25),
    ("Verde River",         "Verde River",          -111.76, 34.35, 0.20),
]


def discover_levelpath(gnis_name, lon, lat, radius):
    """Query NHD near a known point to find the LevelPathI for a named river."""
    bbox = f"{lon - radius},{lat - radius},{lon + radius},{lat + radius}"
    params = {
        "geometry": bbox,
        "geometryType": "esriGeometryEnvelope",
        "spatialRel": "esriSpatialRelIntersects",
        "inSR": "4326",
        "where": f"GNIS_NAME = '{gnis_name}'",
        "outFields": "LevelPathI,GNIS_NAME,LENGTHKM",
        "returnGeometry": "false",
        "f": "json"
    }
    
    try:
        resp = requests.get(NHD_URL, params=params, timeout=30)
        data = resp.json()
    except Exception as e:
        print(f"  ⚠ Network error discovering LevelPathI: {e}")
        return None
    
    features = data.get("features", [])
    if not features:
        return None
    
    # Find the most common LevelPathI (= the mainstem)
    lp_counts = {}
    for f in features:
        lp = f["attributes"].get("LevelPathI")
        if lp:
            lp_counts[lp] = lp_counts.get(lp, 0) + 1
    
    if not lp_counts:
        return None
    
    best_lp = max(lp_counts, key=lp_counts.get)
    return int(best_lp)


def fetch_by_levelpath(levelpath_id, name, out_file):
    """Fetch all NHD segments for a given LevelPathI."""
    print(f"  Fetching segments for LevelPathI={levelpath_id}...")
    
    params = {
        "where": f"LevelPathI = {levelpath_id}",
        "returnIdsOnly": "true",
        "f": "json"
    }
    
    try:
        resp = requests.get(NHD_URL, params=params, timeout=30)
        data = resp.json()
    except Exception as e:
        print(f"  ⚠ Error fetching IDs: {e}")
        return 0
    
    ids = data.get("objectIds", [])
    if not ids:
        print(f"  ⚠ No segments found for LevelPathI={levelpath_id}")
        return 0
    
    print(f"  Found {len(ids)} segments.")
    
    features = []
    chunk_size = 500
    for i in range(0, len(ids), chunk_size):
        chunk = ids[i:i + chunk_size]
        p = {
            "objectIds": ",".join(map(str, chunk)),
            "outFields": "GNIS_NAME,FTYPE,FCODE",
            "f": "geojson",
            "outSR": "4326"
        }
        try:
            r = requests.get(NHD_URL, params=p, timeout=60)
            result = r.json()
            if "features" in result:
                features.extend(result["features"])
            print(f"  Fetched {len(features)} / {len(ids)}")
        except Exception as e:
            print(f"  ⚠ Error fetching chunk: {e}")
        
        time.sleep(0.3)
    
    with open(out_file, "w") as f:
        json.dump({"type": "FeatureCollection", "features": features}, f)
    
    return len(features)


def fetch_by_name_bbox(gnis_name, lon, lat, out_file):
    """
    Fallback: fetch all segments matching GNIS_NAME within a large bounding box.
    """
    big_radius = 3.0
    bbox = f"{lon - big_radius},{lat - big_radius},{lon + big_radius},{lat + big_radius}"
    
    params = {
        "geometry": bbox,
        "geometryType": "esriGeometryEnvelope",
        "spatialRel": "esriSpatialRelIntersects",
        "inSR": "4326",
        "where": f"GNIS_NAME = '{gnis_name}'",
        "returnIdsOnly": "true",
        "f": "json"
    }
    
    try:
        resp = requests.get(NHD_URL, params=params, timeout=30)
        data = resp.json()
    except Exception as e:
        print(f"  ⚠ Name+bbox fallback error: {e}")
        return 0
    
    ids = data.get("objectIds", [])
    if not ids:
        return 0
    
    print(f"  Fallback: found {len(ids)} segments by name+bbox.")
    
    features = []
    chunk_size = 500
    for i in range(0, len(ids), chunk_size):
        chunk = ids[i:i + chunk_size]
        p = {
            "objectIds": ",".join(map(str, chunk)),
            "outFields": "GNIS_NAME,FTYPE,FCODE",
            "f": "geojson",
            "outSR": "4326"
        }
        try:
            r = requests.get(NHD_URL, params=p, timeout=60)
            result = r.json()
            if "features" in result:
                features.extend(result["features"])
        except Exception as e:
            print(f"  ⚠ Chunk error: {e}")
        time.sleep(0.3)
    
    with open(out_file, "w") as f:
        json.dump({"type": "FeatureCollection", "features": features}, f)
    
    return len(features)


def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    
    results = {}
    
    for display_name, gnis_name, lon, lat, radius in TRIBUTARIES:
        safe_name = display_name.lower().replace(" ", "_")
        out_file = os.path.join(OUT_DIR, f"{safe_name}_raw.geojson")
        
        print(f"\n{'='*60}")
        print(f"Processing: {display_name} (GNIS: '{gnis_name}')")
        print(f"  Known point: ({lon}, {lat}), search radius: {radius}°")
        
        # Try LevelPathI discovery first
        lp = discover_levelpath(gnis_name, lon, lat, radius)
        
        if lp:
            print(f"  ✓ Discovered LevelPathI = {lp}")
            count = fetch_by_levelpath(lp, display_name, out_file)
        else:
            print(f"  ✗ LevelPathI not found, trying name+bbox fallback...")
            count = fetch_by_name_bbox(gnis_name, lon, lat, out_file)
        
        if count > 0:
            results[display_name] = {"file": out_file, "segments": count, "levelpath": lp}
            print(f"  ✓ Saved {count} segments to {out_file}")
        else:
            print(f"  ✗ FAILED to fetch {display_name}")
            results[display_name] = {"file": None, "segments": 0, "levelpath": None}
        
        time.sleep(0.5)
    
    # Summary
    print(f"\n{'='*60}")
    print("FETCH SUMMARY")
    print(f"{'='*60}")
    total = 0
    for name, info in results.items():
        status = f"✓ {info['segments']} segs (LP={info['levelpath']})" if info['segments'] > 0 else "✗ FAILED"
        print(f"  {name:30s} {status}")
        total += info['segments']
    
    successes = sum(1 for v in results.values() if v['segments'] > 0)
    print(f"\nTotal: {total} segments across {successes}/{len(TRIBUTARIES)} rivers")
    
    discovery_file = os.path.join(OUT_DIR, "_discovery.json")
    with open(discovery_file, "w") as f:
        json.dump(results, f, indent=2)
    print(f"Saved discovery metadata to {discovery_file}")


if __name__ == "__main__":
    main()
