import requests
import json

url = "https://hydro.nationalmap.gov/arcgis/rest/services/nhd/MapServer/4/query"

def fetch_levelpath(levelpath_id, name, out_file):
    print(f"Fetching {name} (LevelPathI = {levelpath_id})...")
    params = {
        "where": f"LevelPathI = {levelpath_id}",
        "returnIdsOnly": "true",
        "f": "json"
    }
    resp = requests.get(url, params=params).json()
    ids = resp.get("objectIds", [])
    print(f"Found {len(ids)} segments for {name}.")

    features = []
    chunk_size = 500
    for i in range(0, len(ids), chunk_size):
        chunk = ids[i:i+chunk_size]
        p = {
            "objectIds": ",".join(map(str, chunk)),
            "outFields": "GNIS_NAME,FTYPE,FCODE",
            "f": "geojson",
            "outSR": "4326"
        }
        r = requests.get(url, params=p).json()
        if "features" in r:
            features.extend(r["features"])
        print(f"Fetched {len(features)} / {len(ids)}")

    with open(out_file, "w") as f:
        json.dump({"type": "FeatureCollection", "features": features}, f)
    print(f"Saved {len(features)} features to {out_file}!\n")

if __name__ == "__main__":
    # Authoritative USGS NHD Mainstem LevelPath IDs for all 5 major basin rivers
    fetch_levelpath(720000024, "Colorado River", "web/data/co_river_raw.geojson")
    fetch_levelpath(760000974, "San Juan River", "web/data/sanjuan_river_raw.geojson")
    fetch_levelpath(760000231, "Green River", "web/data/green_river_raw.geojson")
    fetch_levelpath(760002305, "Yampa River", "web/data/yampa_river_raw.geojson")
    fetch_levelpath(760003236, "Gunnison River", "web/data/gunnison_river_raw.geojson")
