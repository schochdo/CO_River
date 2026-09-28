import requests
import json

url = "https://hydro.nationalmap.gov/arcgis/rest/services/nhd/MapServer/4/query"

def fetch_features_by_query(where_clause, out_file):
    print(f"Querying: {where_clause}...")
    params = {
        "where": where_clause,
        "returnIdsOnly": "true",
        "f": "json"
    }
    resp = requests.get(url, params=params).json()
    ids = resp.get("objectIds", [])
    print(f"Found {len(ids)} IDs.")

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
    # LevelPathI = 720000024 is the complete unbroken USGS hydrologic centerline for the Colorado River
    fetch_features_by_query("LevelPathI = 720000024", "web/data/co_river_raw.geojson")
    fetch_features_by_query("gnis_name = 'Green River'", "web/data/green_river_raw.geojson")
    fetch_features_by_query("gnis_name = 'Yampa River'", "web/data/yampa_river_raw.geojson")
    fetch_features_by_query("gnis_name = 'San Juan River'", "web/data/sanjuan_river_raw.geojson")
    fetch_features_by_query("gnis_name = 'Gunnison River'", "web/data/gunnison_river_raw.geojson")
