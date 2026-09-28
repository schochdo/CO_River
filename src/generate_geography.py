import json
import os

def generate_geography():
    os.makedirs("web/data", exist_ok=True)
    
    # 1. Continental Divide (Colorado Section)
    divide_coords = [
        [-106.85, 41.00], # WY/CO border near Sierra Madre / Park Range
        [-106.68, 40.80], # Mount Zirkel Wilderness
        [-106.61, 40.52], # Rabbit Ears Pass
        [-106.33, 40.35], # Muddy Pass
        [-105.80, 40.43], # Rocky Mountain National Park / Milner Pass
        [-105.74, 40.26], # RMNP / Longs Peak ridge
        [-105.67, 39.90], # Rollins Pass / Moffat Tunnel crossing
        [-105.83, 39.75], # Berthoud Pass
        [-105.88, 39.66], # Loveland Pass
        [-105.85, 39.55], # Montezuma / Roberts Tunnel crossing
        [-106.06, 39.36], # Hoosier Pass (Breckenridge / Alma)
        [-106.20, 39.29], # Fremont Pass (Climax)
        [-106.39, 39.27], # Tennessee Pass
        [-106.56, 39.25], # Boustead Tunnel crossing (Independence Pass / Hunter-Fryingpan)
        [-106.37, 38.84], # Cottonwood Pass
        [-106.33, 38.50], # Monarch Pass
        [-106.80, 38.10], # Cochetopa Pass
        [-107.20, 37.90], # Slumgullion Pass / San Juans
        [-107.50, 37.75], # Weminuche Wilderness
        [-106.80, 37.40], # Wolf Creek Pass
        [-106.60, 37.00]  # NM/CO border
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
