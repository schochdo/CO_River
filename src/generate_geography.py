import json
import os

def generate_geography():
    os.makedirs("web/data", exist_ok=True)
    
    # 1. Continental Divide (Colorado Section)
    divide_coords = [
        [-113.80, 48.90],
        [-112.50, 47.00],
        [-112.00, 45.50],
        [-110.50, 44.40],
        [-109.80, 43.50],
        [-109.00, 42.50],
        [-107.50, 41.50],
        [-106.85, 41.00],
        [-106.68, 40.80],
        [-106.61, 40.52],
        [-106.33, 40.35],
        [-105.80, 40.43],
        [-105.74, 40.26],
        [-105.67, 39.90],
        [-105.83, 39.75],
        [-105.88, 39.66],
        [-105.85, 39.55],
        [-106.06, 39.36],
        [-106.20, 39.29],
        [-106.39, 39.27],
        [-106.56, 39.25],
        [-106.37, 38.84],
        [-106.33, 38.50],
        [-106.80, 38.10],
        [-107.20, 37.90],
        [-107.50, 37.75],
        [-106.80, 37.40],
        [-106.60, 37.00],
        [-106.70, 36.50],
        [-107.50, 35.50],
        [-108.20, 34.00],
        [-108.50, 33.00],
        [-108.60, 32.00],
        [-108.70, 31.00]
    ]
    
    # 2. Trans-Mountain Tunnels (Polylines cutting under the Divide from West Slope to Front Range)
    tunnels = [
        {
            "id": "ADATUNCO",
            "name": "Alva B. Adams Tunnel (C-BT)",
            "length_miles": 13.1,
            "operator": "Northern Water / USBR",
            "from": "Grand Lake / Shadow Mountain Reservoir (West Slope)",
            "to": "Estes Park / Big Thompson River (East Slope)",
            "coords": [
                [-105.823, 40.244], # West Portal at Grand Lake
                [-105.578, 40.328]  # East Portal at Wind River / Estes Park
            ]
        },
        {
            "id": "MOFTUNCO",
            "name": "Moffat Water Tunnel",
            "length_miles": 6.2,
            "operator": "Denver Water",
            "from": "Fraser River Collection System / Winter Park (West Slope)",
            "to": "South Boulder Creek / Gross Reservoir (East Slope)",
            "coords": [
                [-105.765, 39.888], # West Portal near Winter Park
                [-105.643, 39.902]  # East Portal near Rollinsville
            ]
        },
        {
            "id": "ROBTUNCO",
            "name": "Harold D. Roberts Tunnel",
            "length_miles": 23.3,
            "operator": "Denver Water",
            "from": "Dillon Reservoir (West Slope)",
            "to": "North Fork South Platte River / Grant (East Slope)",
            "coords": [
                [-106.050, 39.620], # Dillon Reservoir Dam intake
                [-105.679, 39.463]  # East Portal outfall at Grant
            ]
        },
        {
            "id": "BOUTUNCO",
            "name": "Charles H. Boustead Tunnel",
            "length_miles": 5.4,
            "operator": "Southeastern Colorado Water / USBR",
            "from": "Fryingpan River Collection System (West Slope)",
            "to": "Turquoise Lake / Arkansas River (East Slope)",
            "coords": [
                [-106.600, 39.262], # West Portal (Fryingpan)
                [-106.400, 39.261]  # East Portal (Turquoise Lake)
            ]

        },
        {
            "id": "09424150",
            "name": "Colorado River Aqueduct",
            "length_miles": 242.0,
            "operator": "Metropolitan Water District (MWD)",
            "from": "Lake Havasu / Parker Dam (AZ/CA)",
            "to": "Lake Mathews / Los Angeles Basin (CA)",
            "coords": [
                [-114.16, 34.31], 
                [-115.50, 34.00], 
                [-116.80, 33.90], 
                [-117.44, 33.81]  
            ]
        },
        {
            "id": "09527700",
            "name": "All-American Canal",
            "length_miles": 82.0,
            "operator": "Imperial Irrigation District (IID)",
            "from": "Imperial Dam (AZ/CA)",
            "to": "Imperial Valley (CA)",
            "coords": [
                [-114.47, 32.88], 
                [-114.72, 32.73], 
                [-115.30, 32.68], 
                [-115.55, 32.70]  
            ]
        }
    ]

    # 3. Colorado River Basin Demarcation Outline (Simplified Upper & Lower Basin polygons)
    upper_basin_outline = [
        [-109.8, 43.5], [-108.5, 43.0], [-107.0, 41.5], [-105.8, 40.4],
        [-105.6, 39.5], [-106.5, 38.0], [-106.8, 37.0], [-107.5, 36.0],
        [-109.0, 35.5], [-111.5, 36.8], [-111.6, 37.0], [-112.5, 38.5],
        [-112.0, 40.5], [-110.5, 42.5], [-109.8, 43.5]
    ]

    lower_basin_outline = [
        [-111.5, 36.8], [-109.0, 35.5], [-108.5, 33.5], [-110.0, 31.3],
        [-114.5, 31.5], [-116.0, 33.0], [-116.5, 34.5], [-115.0, 36.0],
        [-114.0, 37.5], [-111.5, 36.8]
    ]

    # River Mainstem Spine (Green River headwaters down to Gulf of California)
    river_spine = [
        [-105.82, 40.24], # Grand Lake Headwaters
        [-106.37, 40.08], # Granby / Kremmling
        [-107.08, 39.64], # Dotsero
        [-107.32, 39.55], # Glenwood Canyon
        [-108.27, 39.24], # Cameo / Grand Valley
        [-108.57, 39.06], # Grand Junction
        [-109.29, 38.81], # Cisco, UT
        [-109.80, 38.19], # Green River Confluence
        [-110.40, 37.50], # Cataract Canyon
        [-110.87, 37.18], # San Juan Confluence (Lake Powell)
        [-111.48, 36.94], # Glen Canyon Dam
        [-111.59, 36.86], # Lees Ferry, AZ
        [-112.14, 36.05], # Grand Canyon
        [-114.74, 36.01], # Hoover Dam / Lake Mead
        [-114.60, 35.00], # Davis Dam / Lake Mohave
        [-114.28, 34.18], # Parker Dam / Lake Havasu
        [-114.50, 32.70], # Imperial Dam
        [-114.70, 32.40]  # Mexican Border / Morelos Dam
    ]

    payload = {
        "continental_divide": divide_coords,
        "tunnels": tunnels,
        "upper_basin_outline": upper_basin_outline,
        "lower_basin_outline": lower_basin_outline,
        "river_spine": river_spine
    }

    out_file = "web/data/geography.json"
    with open(out_file, "w") as f:
        json.dump(payload, f, indent=2)
    print(f"Generated {out_file} successfully!")

if __name__ == "__main__":
    generate_geography()
