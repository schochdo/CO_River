import json

def generate_river_network():
    # Coordinated segments representing the Colorado River spine and major tributaries
    # Each segment has flow_cfs, name, and coordinate sequence
    segments = [
        {
            "name": "Colorado River - Headwaters to Granby",
            "reach": "headwaters",
            "flow_cfs": 350,
            "weight": 2.5,
            "coords": [
                [-105.823, 40.244], [-105.850, 40.180], [-105.940, 40.140],
                [-106.050, 40.090], [-106.200, 40.060], [-106.370, 40.080]
            ]
        },
        {
            "name": "Colorado River - Kremmling & Gore Canyon to Dotsero",
            "reach": "gore_canyon",
            "flow_cfs": 718,
            "weight": 4.0,
            "coords": [
                [-106.370, 40.080], [-106.500, 40.030], [-106.620, 39.950],
                [-106.750, 39.880], [-106.850, 39.800], [-106.980, 39.700],
                [-107.050, 39.660], [-107.078, 39.645] # Dotsero gauge
            ]
        },
        {
            "name": "Colorado River - Glenwood Canyon to Cameo",
            "reach": "glenwood_cameo",
            "flow_cfs": 1420,
            "weight": 5.5,
            "coords": [
                [-107.078, 39.645], [-107.180, 39.600], [-107.222, 39.574], # Shoshone Power Plant
                [-107.325, 39.550], # Glenwood Springs / Roaring Fork confluence
                [-107.450, 39.540], [-107.600, 39.530], [-107.780, 39.480],
                [-108.050, 39.380], [-108.200, 39.290], [-108.266, 39.239] # Cameo gauge
            ]
        },
        {
            "name": "Colorado River - Grand Valley to Cisco (State Line)",
            "reach": "grand_valley_cisco",
            "flow_cfs": 2640,
            "weight": 7.0,
            "coords": [
                [-108.266, 39.239], [-108.350, 39.180], [-108.500, 39.100],
                [-108.572, 39.058], # Grand Junction / Gunnison confluence
                [-108.750, 39.120], [-108.950, 39.150], [-109.050, 39.100], # CO/UT border
                [-109.180, 38.950], [-109.293, 38.811] # Cisco, UT gauge
            ]
        },
        {
            "name": "Green River (Major Tributary)",
            "reach": "green_river",
            "flow_cfs": 2850,
            "weight": 6.5,
            "coords": [
                [-109.500, 41.000], [-109.450, 40.750], [-109.300, 40.500],
                [-109.250, 40.300], [-109.600, 40.100], [-109.850, 39.800],
                [-110.050, 39.300], [-110.150, 38.950], [-110.080, 38.600],
                [-109.805, 38.189] # Confluence with Colorado
            ]
        },
        {
            "name": "Colorado River - Confluence through Cataract Canyon to Lake Powell",
            "reach": "cataract_canyon",
            "flow_cfs": 5490,
            "weight": 9.0,
            "coords": [
                [-109.293, 38.811], [-109.550, 38.570], # Moab
                [-109.805, 38.189], # Green River Confluence
                [-109.950, 38.050], [-110.200, 37.850], [-110.450, 37.550],
                [-110.700, 37.350], [-111.000, 37.100], [-111.484, 36.937] # Glen Canyon Dam
            ]
        },
        {
            "name": "Colorado River - Glen Canyon to Lees Ferry",
            "reach": "lees_ferry",
            "flow_cfs": 8140,
            "weight": 11.5,
            "coords": [
                [-111.484, 36.937], [-111.520, 36.900], [-111.588, 36.864] # Lees Ferry
            ]
        },
        {
            "name": "Colorado River - Grand Canyon to Lake Mead",
            "reach": "grand_canyon",
            "flow_cfs": 8100,
            "weight": 10.5,
            "coords": [
                [-111.588, 36.864], [-111.800, 36.700], [-111.850, 36.350],
                [-112.140, 36.050], # Phantom Ranch
                [-112.500, 36.250], [-112.900, 36.250], [-113.350, 36.150],
                [-113.800, 36.000], [-114.100, 36.100], [-114.400, 36.150],
                [-114.738, 36.016] # Hoover Dam
            ]
        },
        {
            "name": "Colorado River - Lower Basin (Hoover Dam to Parker Dam)",
            "reach": "lower_basin_upper",
            "flow_cfs": 6800,
            "weight": 8.0,
            "coords": [
                [-114.738, 36.016], [-114.650, 35.500], [-114.580, 35.150], # Davis Dam / Laughlin
                [-114.600, 34.800], [-114.450, 34.400], [-114.280, 34.180] # Parker Dam
            ]
        },
        {
            "name": "Colorado River - Agricultural Siphon to Mexico (Tapering)",
            "reach": "lower_basin_taper",
            "flow_cfs": 1200,
            "weight": 3.5,
            "coords": [
                [-114.280, 34.180], [-114.450, 33.700], [-114.520, 33.400],
                [-114.550, 32.850], # Imperial Dam (All-American Canal diversion)
                [-114.650, 32.720], [-114.720, 32.480] # Mexican Border / Morelos Dam
            ]
        }
    ]

    with open("web/data/river_network.json", "w") as f:
        json.dump(segments, f, indent=2)
    print("Generated web/data/river_network.json successfully!")

if __name__ == "__main__":
    generate_river_network()
