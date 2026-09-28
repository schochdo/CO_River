import requests
import json
from shapely.geometry import shape

print("1. Extracting Montana Arc (HUC 10)...")
r10 = requests.get("https://hydro.nationalmap.gov/arcgis/rest/services/wbd/MapServer/1/query?where=huc2='10'&outFields=*&f=geojson").json()
geom10 = shape(r10['features'][0]['geometry']).simplify(0.003, preserve_topology=True)
ring10 = list(geom10.exterior.coords)
valid10 = [i for i, p in enumerate(ring10) if 43.45 <= p[1] <= 49.02]
chunks10 = []
curr = [valid10[0]]
for idx in valid10[1:]:
    if idx == curr[-1] + 1: curr.append(idx)
    else: chunks10.append(curr); curr = [idx]
chunks10.append(curr)
# Westernmost chunk
ranked10 = sorted([(sum(ring10[i][0] for i in c)/len(c), c) for c in chunks10], key=lambda x: x[0])
mt_pts = [ring10[i] for i in ranked10[0][1]]
if mt_pts[0][1] < mt_pts[-1][1]: mt_pts = list(reversed(mt_pts))

print("2. Extracting Wyoming / Colorado / Northern NM Arc (HUC 14)...")
r14 = requests.get("https://hydro.nationalmap.gov/arcgis/rest/services/wbd/MapServer/1/query?where=huc2='14'&outFields=*&f=geojson").json()
geom14 = shape(r14['features'][0]['geometry']).simplify(0.003, preserve_topology=True)
ring14 = list(geom14.exterior.coords)
idx_north = max(range(len(ring14)), key=lambda i: ring14[i][1])
idx_south = min(range(len(ring14)), key=lambda i: ring14[i][1])
if idx_north < idx_south:
    arc_a = ring14[idx_north:idx_south+1]
    arc_b = ring14[idx_south:] + ring14[:idx_north+1]
else:
    arc_a = ring14[idx_south:idx_north+1]
    arc_b = ring14[idx_north:] + ring14[:idx_south+1]
co_pts = arc_a if (sum(p[0] for p in arc_a)/len(arc_a)) > (sum(p[0] for p in arc_b)/len(arc_b)) else arc_b
if co_pts[0][1] < co_pts[-1][1]: co_pts = list(reversed(co_pts))

print("3. Extracting Southern NM Arc (HUC 15)...")
r15 = requests.get("https://hydro.nationalmap.gov/arcgis/rest/services/wbd/MapServer/1/query?where=huc2='15'&outFields=*&f=geojson").json()
geom15 = shape(r15['features'][0]['geometry']).simplify(0.003, preserve_topology=True)
ring15 = list(geom15.exterior.coords)
valid15 = [i for i, p in enumerate(ring15) if 31.33 <= p[1] <= 35.56]
chunks15 = []
curr = [valid15[0]]
for idx in valid15[1:]:
    if idx == curr[-1] + 1: curr.append(idx)
    else: chunks15.append(curr); curr = [idx]
chunks15.append(curr)
# Easternmost chunk
ranked15 = sorted([(sum(ring15[i][0] for i in c)/len(c), c) for c in chunks15], key=lambda x: -x[0])
nm_pts = [ring15[i] for i in ranked15[0][1]]
if nm_pts[0][1] < nm_pts[-1][1]: nm_pts = list(reversed(nm_pts))

# Stitch sequentially
full_divide = mt_pts + co_pts + nm_pts
print(f"Total Continental Divide vertices: {len(full_divide)}")

with open("web/data/geography.json", "r") as f:
    geo = json.load(f)

geo["continental_divide"] = [[round(p[0], 5), round(p[1], 5)] for p in full_divide]

with open("web/data/geography.json", "w") as f:
    json.dump(geo, f, indent=2)

print("Saved complete, smooth, authoritative geography.json!")
