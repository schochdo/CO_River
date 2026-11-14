#!/usr/bin/env python3
"""
Update web/data/river_network.json and river_network.geojson:
1. Re-map tributaries with real, genuine USGS gauge IDs (eliminating borrowed gauges).
2. Split Little Colorado River into 3 hydrologic reaches (Upper, Middle, Lower).
3. Split Virgin River into 2 hydrologic reaches (Upper, Lower).
4. Split White River into 2 hydrologic reaches (Upper, Lower).
"""

import json
import os

repo_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
json_path = os.path.join(repo_root, "web", "data", "river_network.json")
geojson_path = os.path.join(repo_root, "web", "data", "river_network.geojson")

with open(json_path, "r") as f:
    net = json.load(f)

new_features = []

for f in net["features"]:
    p = f["properties"]
    r = p.get("reach")
    
    if r == "little_colorado_river":
        # Split Little Colorado River (total ~300+ miles) into 3 reaches
        coords = f["geometry"]["coordinates"]
        line0 = coords[0] # 1481 pts
        line1 = coords[1] # 31 pts
        
        # 1. Upper: Headwaters / White Mountains to St. Johns (Lyman Lake)
        # Measured by USGS #09384000 at St. Johns (pt 161)
        feat_upper = {
            "type": "Feature",
            "properties": {
                **p,
                "reach": "little_colorado_upper",
                "name": "Little Colorado River - White Mountains to St. Johns (Lyman Lake)",
                "gauge_id": "09384000",
                "category": "major_tributary",
                "flow_cfs": 18.3,
                "notes": "USGS #09384000 Little Colorado River above Lyman Lake near St. Johns, AZ"
            },
            "geometry": {
                "type": "MultiLineString",
                "coordinates": [line1, line0[:162]]
            }
        }
        
        # 2. Middle: St. Johns through Holbrook to Winslow
        # Measured by USGS #09400000 at Winslow (pt 863)
        feat_mid = {
            "type": "Feature",
            "properties": {
                **p,
                "reach": "little_colorado_middle",
                "name": "Little Colorado River - St. Johns to Winslow",
                "gauge_id": "09400000",
                "category": "major_tributary",
                "flow_cfs": 13.0,
                "notes": "USGS #09400000 Little Colorado River near Winslow, AZ"
            },
            "geometry": {
                "type": "LineString",
                "coordinates": line0[161:864]
            }
        }
        
        # 3. Lower: Winslow through Cameron Gorge to Grand Canyon mouth
        # Measured by USGS #09402000 at Cameron (pt 1285)
        feat_lower = {
            "type": "Feature",
            "properties": {
                **p,
                "reach": "little_colorado_lower",
                "name": "Little Colorado River - Winslow through Cameron Gorge to Grand Canyon",
                "gauge_id": "09402000",
                "category": "major_tributary",
                "flow_cfs": 348.0,
                "notes": "USGS #09402000 Little Colorado River near Cameron, AZ"
            },
            "geometry": {
                "type": "LineString",
                "coordinates": line0[863:]
            }
        }
        new_features.extend([feat_upper, feat_mid, feat_lower])
        print("Split Little Colorado River into 3 segments: Upper, Middle, Lower")
        
    elif r == "virgin_river":
        # Split Virgin River into 2 reaches:
        # Upper: Zion National Park & Hurricane to St. George (USGS #09406000 at Virgin, UT)
        # Lower: St. George through Virgin River Gorge to Lake Mead (USGS #09415000 at Littlefield, AZ)
        coords = f["geometry"]["coordinates"] # 4 lines: 0, 1, 2, 3
        feat_upper = {
            "type": "Feature",
            "properties": {
                **p,
                "reach": "virgin_river_upper",
                "name": "Virgin River - Zion & Hurricane to St. George",
                "gauge_id": "09406000",
                "category": "major_tributary",
                "flow_cfs": 152.0,
                "notes": "USGS #09406000 Virgin River at Virgin, UT"
            },
            "geometry": {
                "type": "MultiLineString",
                "coordinates": [coords[3], coords[2]]
            }
        }
        feat_lower = {
            "type": "Feature",
            "properties": {
                **p,
                "reach": "virgin_river",
                "name": "Virgin River - St. George through Virgin Gorge to Lake Mead",
                "gauge_id": "09415000",
                "category": "major_tributary",
                "flow_cfs": 332.0,
                "notes": "USGS #09415000 Virgin River at Littlefield, AZ"
            },
            "geometry": {
                "type": "MultiLineString",
                "coordinates": [coords[1], coords[0]]
            }
        }
        new_features.extend([feat_upper, feat_lower])
        print("Split Virgin River into 2 segments: Upper (Zion) and Lower (Littlefield)")
        
    elif r == "white_river":
        # Split White River into 2 reaches:
        # Upper: Flat Tops / Trappers Lake to Meeker, CO (USGS #09304500 near Meeker)
        # Lower: Meeker through Rangely to Green River confluence (USGS #09306500 near Watson, UT)
        coords = f["geometry"]["coordinates"] # 6 lines: 0..5
        feat_upper = {
            "type": "Feature",
            "properties": {
                **p,
                "reach": "white_river_upper",
                "name": "White River - Flat Tops to Meeker",
                "gauge_id": "09304500",
                "category": "major_tributary",
                "flow_cfs": 251.0,
                "notes": "USGS #09304500 White River near Meeker, CO"
            },
            "geometry": {
                "type": "MultiLineString",
                "coordinates": [coords[5], coords[4], coords[3]]
            }
        }
        feat_lower = {
            "type": "Feature",
            "properties": {
                **p,
                "reach": "white_river",
                "name": "White River - Meeker to Green River Confluence",
                "gauge_id": "09306500",
                "category": "major_tributary",
                "flow_cfs": 284.0,
                "notes": "USGS #09306500 White River near Watson, UT"
            },
            "geometry": {
                "type": "MultiLineString",
                "coordinates": [coords[2], coords[1], coords[0]]
            }
        }
        new_features.extend([feat_upper, feat_lower])
        print("Split White River into 2 segments: Upper (Meeker) and Lower (Watson)")
        
    else:
        # Re-assign genuine USGS gauge IDs to all tributaries (eliminating borrowed proxies)
        if r == "muddy_river":
            p["gauge_id"] = "09419000"
            p["notes"] = "USGS #09419000 Muddy River near Glendale, NV"
            p["flow_cfs"] = 43.7
        elif r == "havasu_creek":
            p["gauge_id"] = "09404115"
            p["notes"] = "USGS #09404115 Havasu Creek above the mouth, near Supai, AZ"
            p["flow_cfs"] = 70.3
        elif r == "kanab_creek":
            p["gauge_id"] = "09403850"
            p["notes"] = "USGS #09403850 Kanab Creek above the mouth near Supai, AZ"
            p["flow_cfs"] = 12.8
        elif r == "little_snake_river":
            p["gauge_id"] = "09260000"
            p["notes"] = "USGS #09260000 Little Snake River near Lily, CO"
            p["flow_cfs"] = 116.0
        elif r == "uncompahgre_river":
            p["gauge_id"] = "09149500"
            p["notes"] = "USGS #09149500 Uncompahgre River at Delta, CO"
            p["flow_cfs"] = 525.0
        elif r == "fraser_river":
            p["gauge_id"] = "09033300"
            p["notes"] = "USGS #09033300 Fraser River below Crooked Creek at Tabernash, CO"
            p["flow_cfs"] = 18.7
        elif r == "san_pedro_river":
            p["gauge_id"] = "09471000"
            p["notes"] = "USGS #09471000 San Pedro River at Charleston, AZ"
            p["flow_cfs"] = 7.21
        elif r == "dirty_devil_river":
            p["gauge_id"] = "09333500"
            p["notes"] = "USGS #09333500 Dirty Devil River near Hanksville, UT"
            p["flow_cfs"] = 130.0
        elif r == "escalante_river":
            p["gauge_id"] = "09337500"
            p["notes"] = "USGS #09337500 Escalante River near Escalante, UT"
            p["flow_cfs"] = 7.36
        elif r == "price_river":
            p["gauge_id"] = "09314500"
            p["notes"] = "USGS #09314500 Price River at Woodside, UT"
            p["flow_cfs"] = 48.1
        elif r == "san_rafael_river":
            p["gauge_id"] = "09328500"
            p["notes"] = "USGS #09328500 San Rafael River near Green River, UT"
            p["flow_cfs"] = 37.6
        new_features.append(f)

net["features"] = new_features

with open(json_path, "w") as f:
    json.dump(net, f, indent=2)

with open(geojson_path, "w") as f:
    json.dump(net, f, indent=2)

print(f"Updated both river_network.json and river_network.geojson with {len(new_features)} reaches!")
