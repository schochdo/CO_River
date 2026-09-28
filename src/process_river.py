import json
import geopandas as gpd
from shapely.geometry import shape, Point, LineString

REACHES = {
    "Colorado River - Headwaters to Granby": {"id": "headwaters", "cfs": 350, "weight": 2.5, "pt": Point(-106.050, 40.090)},
    "Colorado River - Kremmling & Gore Canyon to Dotsero": {"id": "gore_canyon", "cfs": 718, "weight": 4.0, "pt": Point(-106.750, 39.880)},
    "Colorado River - Glenwood Canyon to Cameo": {"id": "glenwood_cameo", "cfs": 1420, "weight": 5.5, "pt": Point(-107.600, 39.530)},
    "Colorado River - Grand Valley to Cisco (State Line)": {"id": "grand_valley_cisco", "cfs": 2640, "weight": 7.0, "pt": Point(-108.950, 39.150)},
    "Colorado River - Confluence through Cataract Canyon to Lake Powell": {"id": "cataract_canyon", "cfs": 5490, "weight": 9.0, "pt": Point(-110.200, 37.850)},
    "Colorado River - Glen Canyon to Lees Ferry": {"id": "lees_ferry", "cfs": 8140, "weight": 11.5, "pt": Point(-111.520, 36.900)},
    "Colorado River - Grand Canyon to Lake Mead": {"id": "grand_canyon", "cfs": 8100, "weight": 10.5, "pt": Point(-112.500, 36.250)},
    "Colorado River - Lower Basin (Hoover Dam to Parker Dam)": {"id": "lower_basin_upper", "cfs": 6800, "weight": 8.0, "pt": Point(-114.600, 34.800)},
    "Colorado River - Agricultural Siphon to Mexico (Tapering)": {"id": "lower_basin_taper", "cfs": 1200, "weight": 3.5, "pt": Point(-114.520, 33.400)},
}

def get_closest_reach(centroid):
    min_dist = float('inf')
    best_reach = None
    for name, data in REACHES.items():
        dist = centroid.distance(data["pt"])
        if dist < min_dist:
            min_dist = dist
            best_reach = (name, data)
    return best_reach

def is_in_basin(geom):
    c = geom.centroid
    # The Colorado River Basin is roughly bounded by:
    # Longitude: -116.0 (California/Nevada border area) to -105.0 (Colorado headwaters)
    # Latitude: 31.0 (Mexico border) to 44.0 (Wyoming Green River headwaters)
    return -116.0 <= c.x <= -105.0 and 31.0 <= c.y <= 44.0

def process():
    print("Loading lakes...")
    lakes = gpd.read_file("web/data/lakes.geojson")
    lake_polygons = lakes.geometry.buffer(0).union_all()
    
    # Dictionary to collect MultiPolylines by reach name
    reach_groups = {}
    
    print("Processing Green River...")
    try:
        with open("web/data/green_river_raw.geojson") as f:
            green_data = json.load(f)
        
        green_lines = []
        for feat in green_data["features"]:
            geom = shape(feat["geometry"]).simplify(0.0005, preserve_topology=True)
            if not geom.is_empty and is_in_basin(geom):
                green_lines.append([[pt[0], pt[1]] for pt in geom.coords])
                
        reach_groups["Green River (Major Tributary)"] = {
            "name": "Green River (Major Tributary)",
            "reach": "green_river",
            "flow_cfs": 2850,
            "weight": 6.5,
            "coords": green_lines
        }
    except Exception as e:
        print("Error with green river:", e)

    print("Processing Colorado River...")
    with open("web/data/co_river_raw.geojson") as f:
        co_data = json.load(f)
        
    for feat in co_data["features"]:
        geom = shape(feat["geometry"])
        if geom.is_empty or not is_in_basin(geom): continue
        
        if geom.intersects(lake_polygons):
            intersection = geom.intersection(lake_polygons)
            if intersection.length > geom.length * 0.5:
                continue
            geom = geom.difference(lake_polygons)
            if geom.is_empty: continue
            
        geom = geom.simplify(0.0005, preserve_topology=True)
        if geom.is_empty: continue
        
        if geom.geom_type == 'MultiLineString':
            lines = list(geom.geoms)
        elif geom.geom_type == 'LineString':
            lines = [geom]
        else:
            continue
            
        for line in lines:
            if line.length < 0.001: continue
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
            
            reach_groups[reach_name]["coords"].append([[pt[0], pt[1]] for pt in line.coords])
            
    for name, raw_file, reach_id, weight in [
        ("Yampa River", "web/data/yampa_river_raw.geojson", "yampa_river", 4.0),
        ("San Juan River", "web/data/sanjuan_river_raw.geojson", "sanjuan_river", 5.0),
        ("Gunnison River", "web/data/gunnison_river_raw.geojson", "gunnison_river", 4.0)
    ]:
        print(f"Processing {name}...")
        try:
            with open(raw_file) as f:
                data = json.load(f)
            lines = []
            for feat in data["features"]:
                geom = shape(feat["geometry"]).simplify(0.0005, preserve_topology=True)
                if not geom.is_empty and is_in_basin(geom):
                    lines.append([[pt[0], pt[1]] for pt in geom.coords])
            if lines:
                reach_groups[name] = {
                    "name": name,
                    "reach": reach_id,
                    "flow_cfs": 1500, # Approximate, used for tooltip baseline if needed
                    "weight": weight,
                    "coords": lines
                }
        except Exception as e:
            print(f"Error with {name}:", e)
            
    output = list(reach_groups.values())
    with open("web/data/river_network.json", "w") as f:
        json.dump(output, f)
    print(f"Wrote {len(output)} reaches with multipolylines to river_network.json")

if __name__ == "__main__":
    process()
