import requests

url = "https://hydro.nationalmap.gov/arcgis/rest/services/nhd/MapServer/4/query"
params = {
    "where": "gnis_name = 'Colorado River'",
    "outFields": "objectid,reachcode,fdate,lengthkm,gnis_name",
    "f": "json",
    "returnGeometry": "false"
}
response = requests.get(url, params=params).json()
print("Colorado River features:", len(response.get("features", [])))

params["where"] = "gnis_name = 'Green River'"
response = requests.get(url, params=params).json()
print("Green River features:", len(response.get("features", [])))
