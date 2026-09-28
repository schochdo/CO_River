import requests
import json
import numpy as np

def fetch_river_ids(name):
    print(f"Fetching IDs for {name}...")
    url = "https://hydro.nationalmap.gov/arcgis/rest/services/nhd/MapServer/4/query"
    params = {
        "where": f"gnis_name = '{name}'",
        "returnIdsOnly": "true",
        "f": "json"
    }
    resp = requests.get(url, params=params).json()
    return resp.get("objectIds", [])

def fetch_features_by_ids(ids):
    url = "https://hydro.nationalmap.gov/arcgis/rest/services/nhd/MapServer/4/query"
    features = []
    chunk_size = 500
    for i in range(0, len(ids), chunk_size):
        chunk = ids[i:i+chunk_size]
        params = {
            "objectIds": ",".join(map(str, chunk)),
            "outFields": "*",
            "f": "geojson",
            "outSR": "4326"
        }
        resp = requests.get(url, params=params).json()
        if "features" in resp:
            features.extend(resp["features"])
        print(f"Fetched {len(features)} / {len(ids)}")
    return features

if __name__ == "__main__":
    co_ids = fetch_river_ids("Colorado River")
    green_ids = fetch_river_ids("Green River")
    print(f"CO River IDs: {len(co_ids)}")
    print(f"Green River IDs: {len(green_ids)}")
    if co_ids:
        features = fetch_features_by_ids(co_ids)
        with open("web/data/co_river_raw.geojson", "w") as f:
            json.dump({"type": "FeatureCollection", "features": features}, f)
    if green_ids:
        features = fetch_features_by_ids(green_ids)
        with open("web/data/green_river_raw.geojson", "w") as f:
            json.dump({"type": "FeatureCollection", "features": features}, f)

    yampa_ids = fetch_river_ids("Yampa River")
    sanjuan_ids = fetch_river_ids("San Juan River")
    gunnison_ids = fetch_river_ids("Gunnison River")
    
    print(f"Yampa IDs: {len(yampa_ids)}")
    print(f"San Juan IDs: {len(sanjuan_ids)}")
    print(f"Gunnison IDs: {len(gunnison_ids)}")
    
    if yampa_ids:
        with open("web/data/yampa_river_raw.geojson", "w") as f:
            json.dump({"type": "FeatureCollection", "features": fetch_features_by_ids(yampa_ids)}, f)
    if sanjuan_ids:
        with open("web/data/sanjuan_river_raw.geojson", "w") as f:
            json.dump({"type": "FeatureCollection", "features": fetch_features_by_ids(sanjuan_ids)}, f)
    if gunnison_ids:
        with open("web/data/gunnison_river_raw.geojson", "w") as f:
            json.dump({"type": "FeatureCollection", "features": fetch_features_by_ids(gunnison_ids)}, f)
