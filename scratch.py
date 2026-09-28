import requests

query = """
[out:json];
relation["waterway"="river"]["name"="Colorado River"](31.0,-115.0,41.0,-105.0);
out geom;
"""
url = "https://overpass-api.de/api/interpreter"
response = requests.post(url, data={"data": query})
print(len(response.json().get('elements', [])))
