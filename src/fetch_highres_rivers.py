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
