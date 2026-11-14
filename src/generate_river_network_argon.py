import json

def generate_river_network():
    """
    Control-Volume Reach Network (Argon Proposal):
    Every segment starts and ends strictly at a physical hydrological node
    (Confluence, Dam Face, Reservoir Boundary, or Major Canal Intake)
    and is tagged with the representative USGS Sentinel Gage for that reach.

    NOTE: This is the raw reference script provided from Argon.
    It contains 18 simplified stick-figure reaches without GeoJSON envelope
    or tributary coverage (San Juan, Gunnison, Dolores, etc.).
    """
    segments = [
        # ==================== UPPER COLORADO MAINSTEM ====================
        {
            "name": "Colorado River - Headwaters to Lake Granby",
            "reach": "headwaters",
            "reach_type": "mainstem",
            "gage_id": "09019500",
            "flow_cfs": 350,
            "weight": 2.5,
            "coords": [
                [-105.823, 40.244], [-105.850, 40.180], [-105.865, 40.148] # Lake Granby / Granby Dam
            ]
        },
        {
            "name": "Colorado River - Granby Dam to Kremmling (Blue River Confluence)",
            "reach": "granby_kremmling",
            "reach_type": "mainstem",
            "gage_id": "09019500", # Colorado River near Granby (post-Adams Tunnel export)
            "flow_cfs": 280,
            "weight": 2.8,
            "coords": [
                [-105.865, 40.148], [-105.940, 40.140], [-106.050, 40.090],
                [-106.200, 40.060], [-106.370, 40.080] # Kremmling / Blue River Confluence
            ]
        },
        {
            "name": "Colorado River - Kremmling (Blue River Conf) to Dotsero (Eagle River Conf)",
            "reach": "gore_canyon",
            "reach_type": "mainstem",
            "gage_id": "09058000", # Colorado River near Kremmling
            "flow_cfs": 718,
            "weight": 4.0,
            "coords": [
                [-106.370, 40.080], [-106.500, 40.030], [-106.620, 39.950],
                [-106.750, 39.880], [-106.850, 39.800], [-106.980, 39.700],
                [-107.050, 39.660], [-107.065, 39.650] # Eagle River Confluence at Dotsero
            ]
        },
        {
            "name": "Colorado River - Dotsero (Eagle Conf) to Glenwood Springs (Roaring Fork Conf)",
            "reach": "glenwood_canyon",
            "reach_type": "mainstem",
            "gage_id": "09070500", # Colorado River near Dotsero (captures Eagle River addition)
            "flow_cfs": 1050,
            "weight": 4.8,
            "coords": [
                [-107.065, 39.650], [-107.078, 39.645], [-107.180, 39.600],
                [-107.222, 39.574], # Shoshone Power Plant
                [-107.325, 39.550]  # SPLIT NODE: Roaring Fork Confluence at Glenwood Springs
            ]
        },
        {
            "name": "Colorado River - Glenwood Springs (Roaring Fork Conf) to Grand Junction (Gunnison Conf)",
            "reach": "glenwood_cameo",
            "reach_type": "mainstem",
            "gage_id": "09095500", # Colorado River near Cameo (measures combined flow mid-reach)
            "flow_cfs": 1700,
            "weight": 5.5,
            "coords": [
                [-107.325, 39.550], # Starts at Roaring Fork Confluence
                [-107.450, 39.540], [-107.600, 39.530], [-107.780, 39.480],
                [-108.050, 39.380], [-108.200, 39.290], [-108.266, 39.239], # Passes Cameo gauge
                [-108.350, 39.180], [-108.500, 39.100],
                [-108.572, 39.058]  # SPLIT NODE: Gunnison River Confluence at Grand Junction
            ]
        },
        {
            "name": "Colorado River - Grand Junction (Gunnison Conf) to Dewey Bridge (Dolores Conf)",
            "reach": "grand_valley_stateline",
            "reach_type": "mainstem",
            "gage_id": "09163500", # Colorado River near CO-UT State Line (captures Gunnison addition)
            "flow_cfs": 2820,
            "weight": 6.8,
            "coords": [
                [-108.572, 39.058], # Starts at Gunnison Confluence
                [-108.750, 39.120], [-108.950, 39.150], [-109.050, 39.100],
                [-109.180, 38.950], [-109.255, 38.815] # SPLIT NODE: Dolores River Confluence
            ]
        },
        {
            "name": "Colorado River - Dolores Confluence (Cisco) to Green River Confluence",
            "reach": "grand_valley_cisco",
            "reach_type": "mainstem",
            "gage_id": "09180500", # Colorado River near Cisco, UT
            "flow_cfs": 3150,
            "weight": 7.0,
            "coords": [
                [-109.255, 38.815], [-109.293, 38.811], # Passes Cisco gauge
                [-109.550, 38.570], # Moab
                [-109.805, 38.189]  # SPLIT NODE: Green River Confluence
            ]
        },
        {
            "name": "Colorado River - Cataract Canyon (Green Conf to Lake Powell Inflow at Hite)",
            "reach": "cataract_canyon",
            "reach_type": "mainstem",
            "gage_id": "09180500+09315000", # Combined Cisco + Green River mass balance
            "flow_cfs": 7650,
            "weight": 9.0,
            "coords": [
                [-109.805, 38.189], # Starts at Green River Confluence
                [-109.950, 38.050], [-110.200, 37.850],
                [-110.395, 37.805]  # SPLIT NODE: Lake Powell Inflow / Hite
            ]
        },
        {
            "name": "Lake Powell Submerged Thalweg (Hite to Glen Canyon Dam)",
            "reach": "powell_submerged_path",
            "reach_type": "submerged_path",
            "gage_id": "09379900",
            "flow_cfs": 0,
            "weight": 1.4,
            "coords": [
                [-110.395, 37.805], [-110.450, 37.550], [-110.700, 37.350],
                [-111.000, 37.100], [-111.484, 36.937] # SPLIT NODE: Glen Canyon Dam
            ]
        },

        # ==================== GREEN RIVER SPINE (SPLIT AT CONFLUENCES) ====================
        {
            "name": "Green River - Flaming Gorge Dam to Yampa Confluence (Echo Park)",
            "reach": "green_upper",
            "reach_type": "major_tributary",
            "gage_id": "09234500", # Green River near Greendale (Flaming Gorge outflow)
            "flow_cfs": 1650,
            "weight": 4.2,
            "coords": [
                [-109.421, 40.914], # Flaming Gorge Dam
                [-109.300, 40.750], [-108.989, 40.528] # SPLIT NODE: Yampa Confluence at Echo Park
            ]
        },
        {
            "name": "Green River - Echo Park (Yampa Conf) to Ouray (Duchesne/White Conf)",
            "reach": "green_middle",
            "reach_type": "major_tributary",
            "gage_id": "09261000", # Green River near Jensen, UT (includes Yampa inflow)
            "flow_cfs": 3450,
            "weight": 5.8,
            "coords": [
                [-108.989, 40.528], [-109.250, 40.300], [-109.600, 40.088] # SPLIT NODE: Ouray (Duchesne/White Conf)
            ]
        },
        {
            "name": "Green River - Ouray to Colorado River Confluence",
            "reach": "green_river",
            "reach_type": "major_tributary",
            "gage_id": "09315000", # Green River at Green River, UT
            "flow_cfs": 4500,
            "weight": 6.5,
            "coords": [
                [-109.600, 40.088], [-109.850, 39.800], [-110.050, 39.300],
                [-110.150, 38.950], [-110.080, 38.600],
                [-109.805, 38.189] # SPLIT NODE: Confluence with Colorado River
            ]
        },

        # ==================== LOWER BASIN MAINSTEM (SPLIT AT DAMS & CANALS) ====================
        {
            "name": "Colorado River - Glen Canyon Dam to Lees Ferry & Little Colorado Conf",
            "reach": "lees_ferry",
            "reach_type": "mainstem",
            "gage_id": "09380000", # Colorado River at Lees Ferry
            "flow_cfs": 7940,
            "weight": 10.5,
            "coords": [
                [-111.484, 36.937], [-111.520, 36.900], [-111.588, 36.864], # Lees Ferry
                [-111.800, 36.700], [-111.797, 36.191] # SPLIT NODE: Little Colorado Confluence
            ]
        },
        {
            "name": "Colorado River - Grand Canyon (Little CO Conf to Lake Mead Inflow)",
            "reach": "grand_canyon",
            "reach_type": "mainstem",
            "gage_id": "09402500", # Colorado River near Grand Canyon
            "flow_cfs": 8220,
            "weight": 10.8,
            "coords": [
                [-111.797, 36.191], [-112.140, 36.050], # Phantom Ranch
                [-112.500, 36.250], [-112.900, 36.250], [-113.350, 36.150],
                [-113.800, 36.000], [-114.000, 36.120] # SPLIT NODE: Lake Mead Inflow (Pearce Ferry)
            ]
        },
        {
            "name": "Lake Mead Submerged Thalweg (Pearce Ferry to Hoover Dam)",
            "reach": "mead_submerged_path",
            "reach_type": "submerged_path",
            "gage_id": "09421000",
            "flow_cfs": 0,
            "weight": 1.4,
            "coords": [
                [-114.000, 36.120], [-114.400, 36.150], [-114.738, 36.016] # SPLIT NODE: Hoover Dam
            ]
        },
        {
            "name": "Colorado River - Hoover Dam to Parker Dam (Lake Havasu)",
            "reach": "lower_basin_upper",
            "reach_type": "mainstem",
            "gage_id": "09421500", # Colorado River below Hoover Dam
            "flow_cfs": 9200,
            "weight": 8.5,
            "coords": [
                [-114.738, 36.016], [-114.650, 35.500], [-114.580, 35.150], # Davis Dam / Laughlin
                [-114.600, 34.800], [-114.450, 34.400], [-114.139, 34.296] # SPLIT NODE: Parker Dam (CAP & CRA divert here)
            ]
        },
        {
            "name": "Colorado River - Parker Dam to Imperial Dam (Palo Verde Reach)",
            "reach": "lower_basin_palo_verde",
            "reach_type": "mainstem",
            "gage_id": "09429100", # Colorado River below Palo Verde Dam (after CAP & CRA pump out)
            "flow_cfs": 4200,
            "weight": 6.2,
            "coords": [
                [-114.139, 34.296], [-114.280, 34.180], [-114.450, 33.700],
                [-114.520, 33.400], [-114.465, 32.883] # SPLIT NODE: Imperial Dam (All-American Canal intake)
            ]
        },
        {
            "name": "Colorado River - Imperial Dam to Morelos Dam (Mexico Border)",
            "reach": "lower_basin_taper",
            "reach_type": "mainstem",
            "gage_id": "09522000", # Below All-American Canal diversion
            "flow_cfs": 1200,
            "weight": 3.5,
            "coords": [
                [-114.465, 32.883], [-114.650, 32.720], [-114.728, 32.705] # SPLIT NODE: Morelos Dam
            ]
        }
    ]

    with open("web/data/river_network_argon_simplified.json", "w") as f:
        json.dump(segments, f, indent=2)
    print(f"Generated web/data/river_network_argon_simplified.json with {len(segments)} reaches.")

if __name__ == "__main__":
    generate_river_network()
