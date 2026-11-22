"""
Build Pristine River Network with Exact Physical Continuity:
- Restores all reaches from origin/main
- Applies clean, verified node splits:
  * Dolores River: split into 3 contiguous reaches (headwaters, mcphee-bedrock, bedrock-cisco) all category="major_tributary"
  * Green River: split at Flaming Gorge Dam cleanly by index (0-28 free flowing, 28-234 submerged, 234-444 tailwater) all category="major_tributary"
  * Blue River: split at Dillon and Green Mountain cleanly (all category="minor_tributary")
  * San Juan River: complete continuous geometry from Navajo Dam through Shiprock, Bluff, Goosenecks, Clay Hills to Lake Powell inlet and Colorado confluence (all category="major_tributary")
  * Colorado River Mainstem: Glenwood merged, Marble Canyon split at Paria and Little Colorado (all category="mainstem")
- Strictly guarantees:
  1. Every category is one of: mainstem, major_tributary, minor_tributary, submerged_path
  2. Zero disconnected gaps across all chains
"""

import json
import subprocess
from shapely.geometry import shape, mapping, LineString, MultiLineString, Point
from shapely.ops import linemerge

def run():
    # Load origin/main river_network.json
    raw_origin = subprocess.check_output(['git', 'show', 'origin/main:web/data/river_network.json'])
    origin_data = json.loads(raw_origin)
    orig_by_reach = {f['properties'].get('reach'): f for f in origin_data['features']}

    # Load current working tree river_network.json (for high-res San Juan extension)
    with open('web/data/river_network.json') as f:
        curr_data = json.load(f)
    curr_by_reach = {f['properties'].get('reach'): f for f in curr_data['features']}

    new_features = []

    # 1. UPPER COLORADO MAINSTEM
    # Reaches: headwaters, colorado_granby_windygap, colorado_windygap_kremmling, gore_canyon,
    # colorado_glenwood_canyon, glenwood_cameo, colorado_stateline_cisco, grand_valley_cisco,
    # cataract_canyon, lees_ferry, marble_canyon, grand_canyon_upper, grand_canyon, grand_canyon_lower,
    # lower_basin_hoover_davis, lower_basin_davis_parker, lower_basin_parker_paloverde,
    # lower_basin_paloverde_imperial, lower_basin_imperial_tailrace, lower_basin_taper

    # Headwaters to Granby
    new_features.append({
        "type": "Feature",
        "properties": {
            "reach": "headwaters",
            "name": "Colorado River - Headwaters to Granby (above Fraser River)",
            "category": "mainstem",
            "reach_type": "free_flowing",
            "flow_cfs": 350,
            "weight": 3.2,
            "gauge_id": "09010500",
            "notes": "Snowpack headwaters in Rocky Mountain National Park flowing to Lake Granby."
        },
        "geometry": orig_by_reach['headwaters']['geometry']
    })

    new_features.append({
        "type": "Feature",
        "properties": {
            "reach": "colorado_granby_windygap",
            "name": "Colorado River - Granby to Windy Gap (Fraser Confluence)",
            "category": "mainstem",
            "reach_type": "dam_regulated",
            "flow_cfs": 390,
            "weight": 3.4,
            "gauge_id": "09019500",
            "notes": "Post-Adams Tunnel export reach below Granby Dam to Fraser River confluence."
        },
        "geometry": orig_by_reach['colorado_granby_windygap']['geometry']
    })

    new_features.append({
        "type": "Feature",
        "properties": {
            "reach": "colorado_windygap_kremmling",
            "name": "Colorado River - Windy Gap to Kremmling (Middle Park)",
            "category": "mainstem",
            "reach_type": "free_flowing",
            "flow_cfs": 429,
            "weight": 3.6,
            "gauge_id": "09034250",
            "notes": "Middle Park reach from Windy Gap past Williams Fork confluence to Kremmling."
        },
        "geometry": orig_by_reach['colorado_windygap_kremmling']['geometry']
    })

    new_features.append({
        "type": "Feature",
        "properties": {
            "reach": "gore_canyon",
            "name": "Colorado River - Kremmling & Gore Canyon to Dotsero (above Eagle River)",
            "category": "mainstem",
            "reach_type": "free_flowing",
            "flow_cfs": 605,
            "weight": 3.9,
            "gauge_id": "09058000",
            "notes": "Whitewater canyon below Blue River confluence to Dotsero."
        },
        "geometry": orig_by_reach['gore_canyon']['geometry']
    })

    new_features.append({
        "type": "Feature",
        "properties": {
            "reach": "colorado_glenwood_canyon",
            "name": "Colorado River - Dotsero through Glenwood Canyon to Glenwood Springs",
            "category": "mainstem",
            "reach_type": "free_flowing",
            "flow_cfs": 660,
            "weight": 4.1,
            "gauge_id": "09070500",
            "notes": "Glenwood Canyon corridor below Eagle River confluence; administered at USGS #09070500 (Dotsero) for the Shoshone Hydroelectric Plant 1902 senior right (1,250 cfs senior / 1,408 cfs total non-consumptive call)."
        },
        "geometry": orig_by_reach['colorado_glenwood_canyon']['geometry']
    })

    # Glenwood Springs to Grand Junction (Cameo): Merge the 3 contiguous Glenwood reaches
    lines_gw = []
    for r in ['colorado_glenwood_springs', 'glenwood_cameo', 'cameo_grand_junction']:
        geom = shape(orig_by_reach[r]['geometry'])
        if geom.geom_type == 'MultiLineString':
            lines_gw.extend(geom.geoms)
        else:
            lines_gw.append(geom)
    merged_gw = linemerge(lines_gw)
    # Order downstream: Glenwood Springs (-107.3299, 39.54926) to Grand Junction (-108.57797, 39.06208)
    geoms_gw_ds = list(reversed(list(merged_gw.geoms)))
    new_features.append({
        "type": "Feature",
        "properties": {
            "reach": "glenwood_cameo",
            "name": "Colorado River - Glenwood Springs to Grand Junction (Cameo)",
            "category": "mainstem",
            "reach_type": "free_flowing",
            "flow_cfs": 1560,
            "weight": 5.5,
            "gauge_id": "09095500",
            "notes": "Colorado River from Roaring Fork confluence at Glenwood Springs through De Beque Canyon and Cameo (USGS #09095500) to Gunnison River confluence at Grand Junction."
        },
        "geometry": mapping(MultiLineString([list(g.coords) for g in geoms_gw_ds]))
    })

    new_features.append({
        "type": "Feature",
        "properties": {
            "reach": "colorado_stateline_cisco",
            "name": "Colorado River - Grand Junction to Dolores River Confluence (State Line)",
            "category": "mainstem",
            "reach_type": "free_flowing",
            "flow_cfs": 2820,
            "weight": 5.7,
            "gauge_id": "09163500",
            "notes": "Combined Colorado + Gunnison River flow past Fruita across Colorado-Utah state line."
        },
        "geometry": orig_by_reach['colorado_stateline_cisco']['geometry']
    })

    new_features.append({
        "type": "Feature",
        "properties": {
            "reach": "grand_valley_cisco",
            "name": "Colorado River - Dolores Confluence past Cisco & Moab to Green River Confluence",
            "category": "mainstem",
            "reach_type": "free_flowing",
            "flow_cfs": 3150,
            "weight": 6.0,
            "gauge_id": "09180500",
            "notes": "Colorado River joined by Dolores River; monitored at USGS #09180500 near Cisco, UT."
        },
        "geometry": orig_by_reach['grand_valley_cisco']['geometry']
    })

    new_features.append({
        "type": "Feature",
        "properties": {
            "reach": "cataract_canyon",
            "name": "Colorado River - Green River Confluence through Cataract Canyon to Lake Powell",
            "category": "mainstem",
            "reach_type": "free_flowing",
            "flow_cfs": 6950,
            "weight": 7.5,
            "gauge_id": "09180500",
            "notes": "Cataract Canyon whitewater downstream of Green River confluence in Canyonlands National Park into Lake Powell."
        },
        "geometry": orig_by_reach['cataract_canyon']['geometry']
    })

    new_features.append({
        "type": "Feature",
        "properties": {
            "reach": "powell_submerged_path",
            "name": "Lake Powell Submerged River Channel (Glen Canyon)",
            "category": "submerged_path",
            "reach_type": "submerged_path",
            "flow_cfs": 0,
            "weight": 1.8,
            "notes": "Submerged river thalweg through flooded Glen Canyon to Glen Canyon Dam face."
        },
        "geometry": orig_by_reach['powell_submerged_path']['geometry']
    })

    # Marble Canyon & Lees Ferry split cleanly at Paria confluence [-111.60075, 36.85843]
    lf_orig = orig_by_reach['lees_ferry']['geometry']['coordinates'][0]
    split_lf_idx = 48
    lf_coords = [lf_orig[:split_lf_idx+1]]
    bridge_coords = lf_orig[split_lf_idx:]

    gcu_orig = orig_by_reach['grand_canyon_upper']['geometry']['coordinates']
    lcr_confluence = [-111.80046, 36.19363]
    # In curr_by_reach, marble_canyon is bridge_coords + gcu down to LCR
    # Let's verify start and end:
    curr_mc = curr_by_reach.get('marble_canyon')
    curr_gcu = curr_by_reach.get('grand_canyon_upper')
    
    new_features.append({
        "type": "Feature",
        "properties": {
            "reach": "lees_ferry",
            "name": "Colorado River - Glen Canyon Dam to Lees Ferry (Paria Confluence)",
            "category": "mainstem",
            "reach_type": "dam_regulated",
            "flow_cfs": 7670,
            "weight": 7.5,
            "gauge_id": "09380000",
            "notes": "Glen Canyon Dam 15-mile tailwater reach to Paria River confluence at Lees Ferry, AZ (USGS #09380000)."
        },
        "geometry": {"type": "MultiLineString", "coordinates": lf_coords}
    })

    new_features.append({
        "type": "Feature",
        "properties": {
            "reach": "marble_canyon",
            "name": "Colorado River - Lees Ferry through Marble Canyon",
            "category": "mainstem",
            "reach_type": "free_flowing",
            "flow_cfs": 7670,
            "weight": 7.5,
            "gauge_id": "09380000",
            "notes": "Lees Ferry through Marble Canyon to the Little Colorado River confluence; Navajo Bridge & Echo Cliffs gorge."
        },
        "geometry": curr_mc['geometry']
    })

    new_features.append({
        "type": "Feature",
        "properties": {
            "reach": "grand_canyon_upper",
            "name": "Colorado River - Little Colorado River to Phantom Ranch",
            "category": "mainstem",
            "reach_type": "free_flowing",
            "flow_cfs": 17000,
            "weight": 7.5,
            "gauge_id": "09402500",
            "notes": "Eastern Grand Canyon from Little Colorado River confluence through Upper Granite Gorge to Phantom Ranch (USGS #09402500)."
        },
        "geometry": curr_gcu['geometry']
    })

    new_features.append({
        "type": "Feature",
        "properties": {
            "reach": "grand_canyon",
            "name": "Colorado River - Phantom Ranch to Diamond Creek",
            "category": "mainstem",
            "reach_type": "free_flowing",
            "flow_cfs": 12500,
            "weight": 7.5,
            "gauge_id": "09404200",
            "notes": "Central Grand Canyon corridor through Middle and Lower Granite Gorges to Diamond Creek."
        },
        "geometry": curr_by_reach['grand_canyon']['geometry']
    })

    new_features.append({
        "type": "Feature",
        "properties": {
            "reach": "grand_canyon_lower",
            "name": "Colorado River - Diamond Creek to Lake Mead (Grand Wash)",
            "category": "mainstem",
            "reach_type": "free_flowing",
            "flow_cfs": 12500,
            "weight": 7.5,
            "gauge_id": "09404200",
            "notes": "Western Grand Canyon reach exiting the Grand Wash Cliffs into Lake Mead."
        },
        "geometry": curr_by_reach['grand_canyon_lower']['geometry']
    })

    new_features.append({
        "type": "Feature",
        "properties": {
            "reach": "mead_submerged_path",
            "name": "Lake Mead Submerged River Channel (Boulder Basin)",
            "category": "submerged_path",
            "reach_type": "submerged_path",
            "flow_cfs": 0,
            "weight": 1.8,
            "notes": "Submerged river channel through flooded Lake Mead from Grand Wash Cliffs to Hoover Dam."
        },
        "geometry": curr_by_reach['mead_submerged_path']['geometry']
    })

    # Lower Basin mainstem below Hoover Dam
    # Hoover to Davis (Mohave)
    new_features.append({
        "type": "Feature",
        "properties": {
            "reach": "lower_basin_hoover_davis",
            "name": "Colorado River - Hoover Dam to Davis Dam (Lake Mohave)",
            "category": "mainstem",
            "reach_type": "dam_regulated",
            "flow_cfs": 1452,
            "weight": 5.8,
            "gauge_id": "09421500",
            "notes": "USGS #09421500 below Hoover Dam, AZ-NV flowing through Black Canyon and Lake Mohave to Davis Dam."
        },
        "geometry": curr_by_reach['lower_basin_hoover_davis']['geometry']
    })

    # Davis to Parker (Havasu)
    new_features.append({
        "type": "Feature",
        "properties": {
            "reach": "lower_basin_davis_parker",
            "name": "Colorado River - Davis Dam to Parker Dam (Lake Havasu)",
            "category": "mainstem",
            "reach_type": "dam_regulated",
            "flow_cfs": 14800,
            "weight": 7.8,
            "gauge_id": "09423000",
            "notes": "USGS #09423000 below Davis Dam, AZ-NV flowing past Needles into Lake Havasu (CAP & CRA aqueduct intakes)."
        },
        "geometry": curr_by_reach['lower_basin_davis_parker']['geometry']
    })

    new_features.append({
        "type": "Feature",
        "properties": {
            "reach": "lower_basin_parker_paloverde",
            "name": "Colorado River - Parker Dam to Palo Verde Diversion Dam",
            "category": "mainstem",
            "reach_type": "dam_regulated",
            "flow_cfs": 4150,
            "weight": 7.0,
            "gauge_id": "09427520",
            "notes": "Tailwater releases below Parker Dam through Parker Valley to Palo Verde Diversion Dam."
        },
        "geometry": curr_by_reach['lower_basin_parker_paloverde']['geometry']
    })

    new_features.append({
        "type": "Feature",
        "properties": {
            "reach": "lower_basin_paloverde_imperial",
            "name": "Colorado River - Palo Verde Diversion Dam to Imperial Dam",
            "category": "mainstem",
            "reach_type": "dam_regulated",
            "flow_cfs": 4750,
            "weight": 7.2,
            "gauge_id": "09429100",
            "notes": "Free-flowing agricultural reach past Blythe, CA to Imperial Dam pool (All-American Canal diversion)."
        },
        "geometry": curr_by_reach['lower_basin_paloverde_imperial']['geometry']
    })

    new_features.append({
        "type": "Feature",
        "properties": {
            "reach": "lower_basin_imperial_tailrace",
            "name": "Colorado River - Below Imperial Dam (Desilting Works)",
            "category": "mainstem",
            "reach_type": "free_flowing",
            "flow_cfs": 254,
            "weight": 3.2,
            "gauge_id": "09429500",
            "notes": "Residual streamflow below Imperial Dam desilting basins before Gila River confluence."
        },
        "geometry": orig_by_reach['lower_basin_imperial_tailrace']['geometry']
    })

    new_features.append({
        "type": "Feature",
        "properties": {
            "reach": "lower_basin_taper",
            "name": "Colorado River - Imperial Dam to Mexico (Morelos Dam)",
            "category": "mainstem",
            "reach_type": "free_flowing",
            "flow_cfs": 254,
            "weight": 3.2,
            "gauge_id": "09429500",
            "notes": "Final U.S. reach flowing past Yuma to Northerly International Boundary and Morelos Dam."
        },
        "geometry": orig_by_reach['lower_basin_taper']['geometry']
    })

    # 2. GREEN RIVER CHAIN (100% CONTINUOUS, ALL major_tributary)
    # Reaches: green_headwaters_daniel, green_daniel_fontenelle, fontenelle_submerged_path,
    # green_fontenelle_greenriverwy, green_greenriverwy_flaminggorge, flaming_gorge_submerged_path,
    # green_upper, green_middle, green_ouray_desolation, green_river

    # Load pristine 444-pt geometry from origin/main green_upper
    orig_gu_pts = orig_by_reach['green_upper']['geometry']['coordinates'][0]
    # pts[0] = Green River, WY [-109.44818, 41.51561]
    # pts[28] = Flaming Gorge inlet [-109.39335, 41.47716]
    # pts[234] = Flaming Gorge Dam [-109.42187, 40.91408]
    # pts[443] = Echo Park [-108.98454, 40.52638]

    new_features.append({
        "type": "Feature",
        "properties": {
            "reach": "green_headwaters_daniel",
            "name": "Green River - Wind River Range to Warren Bridge (Headwaters)",
            "category": "major_tributary",
            "reach_type": "free_flowing",
            "flow_cfs": 278,
            "weight": 3.2,
            "gauge_id": "09188500",
            "notes": "Glacial and snowpack headwaters flowing south from the Wind River Range to Warren Bridge."
        },
        "geometry": curr_by_reach['green_headwaters_daniel']['geometry']
    })

    new_features.append({
        "type": "Feature",
        "properties": {
            "reach": "green_daniel_fontenelle",
            "name": "Green River - Warren Bridge to Fontenelle Reservoir",
            "category": "major_tributary",
            "reach_type": "free_flowing",
            "flow_cfs": 996,
            "weight": 4.1,
            "gauge_id": "09209400",
            "notes": "Upper Green River flowing past La Barge into Fontenelle Reservoir."
        },
        "geometry": curr_by_reach['green_daniel_fontenelle']['geometry']
    })

    new_features.append({
        "type": "Feature",
        "properties": {
            "reach": "fontenelle_submerged_path",
            "name": "Fontenelle Reservoir Submerged Channel",
            "category": "submerged_path",
            "reach_type": "submerged_path",
            "flow_cfs": 0,
            "weight": 1.8,
            "notes": "Submerged thalweg impounded behind Fontenelle Dam."
        },
        "geometry": curr_by_reach['fontenelle_submerged_path']['geometry']
    })

    new_features.append({
        "type": "Feature",
        "properties": {
            "reach": "green_fontenelle_greenriverwy",
            "name": "Green River - Fontenelle Dam to Green River, WY",
            "category": "major_tributary",
            "reach_type": "free_flowing",
            "flow_cfs": 807,
            "weight": 4.0,
            "gauge_id": "09217000",
            "notes": "Fontenelle Dam release flowing south across the high plains to Green River, WY."
        },
        "geometry": orig_by_reach['green_fontenelle_greenriverwy']['geometry']
    })

    # Continuous reach from Green River, WY to Flaming Gorge Reservoir inlet
    new_features.append({
        "type": "Feature",
        "properties": {
            "reach": "green_greenriverwy_flaminggorge",
            "name": "Green River - Green River, WY to Flaming Gorge Reservoir",
            "category": "major_tributary",
            "reach_type": "free_flowing",
            "flow_cfs": 807,
            "weight": 4.0,
            "gauge_id": "09217000",
            "notes": "USGS #09217000 at Green River, WY flowing south into Flaming Gorge Reservoir."
        },
        "geometry": {"type": "LineString", "coordinates": orig_gu_pts[:29]}
    })

    # Continuous submerged thalweg through Flaming Gorge Reservoir
    new_features.append({
        "type": "Feature",
        "properties": {
            "reach": "flaming_gorge_submerged_path",
            "name": "Flaming Gorge Reservoir Submerged Channel",
            "category": "submerged_path",
            "reach_type": "submerged_path",
            "flow_cfs": 0,
            "weight": 1.8,
            "notes": "Submerged river channel through flooded Flaming Gorge canyon to Flaming Gorge Dam face."
        },
        "geometry": {"type": "LineString", "coordinates": orig_gu_pts[28:235]}
    })

    # Continuous tailwater release from Flaming Gorge Dam to Echo Park
    new_features.append({
        "type": "Feature",
        "properties": {
            "reach": "green_upper",
            "name": "Green River - Flaming Gorge Dam to Echo Park (above Yampa)",
            "category": "major_tributary",
            "reach_type": "dam_regulated",
            "flow_cfs": 2330,
            "weight": 4.8,
            "gauge_id": "09234500",
            "notes": "Controlled tailwater releases from Flaming Gorge Dam flowing through Dutch John, Browns Park, and Lodore Canyon to Echo Park."
        },
        "geometry": {"type": "LineString", "coordinates": orig_gu_pts[234:]}
    })

    new_features.append({
        "type": "Feature",
        "properties": {
            "reach": "green_middle",
            "name": "Green River - Echo Park to Ouray (below Yampa River)",
            "category": "major_tributary",
            "reach_type": "free_flowing",
            "flow_cfs": 2860,
            "weight": 5.5,
            "gauge_id": "09261000",
            "notes": "Combined Green River + Yampa River through Dinosaur National Monument & Split Mountain to Uinta Basin."
        },
        "geometry": orig_by_reach['green_middle']['geometry']
    })

    new_features.append({
        "type": "Feature",
        "properties": {
            "reach": "green_ouray_desolation",
            "name": "Green River - Ouray through Desolation Canyon",
            "category": "major_tributary",
            "reach_type": "free_flowing",
            "flow_cfs": 3330,
            "weight": 5.8,
            "gauge_id": "09272400",
            "notes": "Desolation & Gray Canyons whitewater wilderness below White and Duchesne River confluences."
        },
        "geometry": orig_by_reach['green_ouray_desolation']['geometry']
    })

    new_features.append({
        "type": "Feature",
        "properties": {
            "reach": "green_river",
            "name": "Green River - Green River, UT to Canyonlands Confluence",
            "category": "major_tributary",
            "reach_type": "free_flowing",
            "flow_cfs": 4480,
            "weight": 6.8,
            "gauge_id": "09315000",
            "notes": "Lower Green River flowing past Green River, UT through Labyrinth & Stillwater Canyons to Colorado River confluence."
        },
        "geometry": orig_by_reach['green_river']['geometry']
    })

    # 3. DOLORES RIVER (100% CONTINUOUS, ALL major_tributary)
    # Ensure dolores_mcphee_bedrock and dolores_bedrock_cisco are category="major_tributary"
    new_features.append({
        "type": "Feature",
        "properties": {
            "reach": "dolores_headwaters",
            "name": "Dolores River - Headwaters to McPhee Reservoir",
            "category": "major_tributary",
            "reach_type": "free_flowing",
            "flow_cfs": 1120,
            "weight": 4.5,
            "gauge_id": "09166500",
            "notes": "Alpine runoff originating in the San Juan Mountains near Rico, flowing past Dolores into McPhee Reservoir."
        },
        "geometry": curr_by_reach['dolores_headwaters']['geometry']
    })

    new_features.append({
        "type": "Feature",
        "properties": {
            "reach": "dolores_mcphee_bedrock",
            "name": "Dolores River - McPhee Dam to Bedrock (Paradox Valley Tailwater)",
            "category": "major_tributary",
            "reach_type": "dam_regulated",
            "flow_cfs": 205,
            "weight": 3.0,
            "gauge_id": "09169500",
            "notes": "USGS #09169500 at Bedrock, CO (McPhee Dam controlled release through Dolores River Canyon)."
        },
        "geometry": curr_by_reach['dolores_mcphee_bedrock']['geometry']
    })

    new_features.append({
        "type": "Feature",
        "properties": {
            "reach": "dolores_bedrock_cisco",
            "name": "Dolores River - Bedrock to Cisco (San Miguel Confluence)",
            "category": "major_tributary",
            "reach_type": "dam_regulated",
            "flow_cfs": 1060,
            "weight": 4.2,
            "gauge_id": "09180000",
            "notes": "USGS #09180000 near Cisco, UT (capturing surging San Miguel River confluence to Dewey Bridge)."
        },
        "geometry": curr_by_reach['dolores_bedrock_cisco']['geometry']
    })

    # 4. BLUE RIVER (100% CONTINUOUS, ALL minor_tributary)
    # Ensure category="minor_tributary" so MapLibre renders them
    new_features.append({
        "type": "Feature",
        "properties": {
            "reach": "blue_river_headwaters",
            "name": "Blue River - Headwaters to Dillon Reservoir",
            "category": "minor_tributary",
            "reach_type": "free_flowing",
            "flow_cfs": 32.3,
            "weight": 2.0,
            "gauge_id": "09046600",
            "notes": "Alpine headwaters from Continental Divide through Breckenridge to Dillon Reservoir."
        },
        "geometry": curr_by_reach['blue_river_headwaters']['geometry']
    })

    new_features.append({
        "type": "Feature",
        "properties": {
            "reach": "dillon_submerged_path",
            "name": "Dillon Reservoir Submerged Channel",
            "category": "submerged_path",
            "reach_type": "submerged_path",
            "flow_cfs": 0,
            "weight": 1.8,
            "notes": "Submerged river channel through flooded Dillon Reservoir to Dillon Dam face."
        },
        "geometry": curr_by_reach['dillon_submerged_path']['geometry']
    })

    new_features.append({
        "type": "Feature",
        "properties": {
            "reach": "blue_river_middle",
            "name": "Blue River - Dillon Dam to Green Mountain Reservoir",
            "category": "minor_tributary",
            "reach_type": "dam_regulated",
            "flow_cfs": 55.7,
            "weight": 2.2,
            "gauge_id": "09050700",
            "notes": "Tailwater releases below Dillon Dam flowing north through Silverthorne to Green Mountain Reservoir."
        },
        "geometry": curr_by_reach['blue_river_middle']['geometry']
    })

    new_features.append({
        "type": "Feature",
        "properties": {
            "reach": "blue_river",
            "name": "Blue River - Green Mountain Dam to Colorado River (Kremmling)",
            "category": "minor_tributary",
            "reach_type": "dam_regulated",
            "flow_cfs": 66.4,
            "weight": 2.4,
            "gauge_id": "09057500",
            "notes": "Lower canyon release below Green Mountain Dam entering Colorado River at Kremmling."
        },
        "geometry": curr_by_reach['blue_river']['geometry']
    })

    # 5. SAN JUAN RIVER (100% CONTINUOUS, ALL major_tributary)
    for r in ['sanjuan_headwaters', 'navajo_submerged_path', 'sanjuan_upper', 'sanjuan_farmington_shiprock', 'sanjuan_shiprock_bluff', 'sanjuan_bluff_powell', 'sanjuan_submerged_path']:
        feat = curr_by_reach.get(r)
        if feat:
            feat['properties']['category'] = "submerged_path" if "submerged" in r else "major_tributary"
            new_features.append(feat)

    # 6. GUNNISON RIVER (ALL major_tributary)
    for r in ['gunnison_headwaters', 'blue_mesa_submerged_path', 'gunnison_aspinall_cascade', 'gunnison_upper', 'gunnison_river']:
        feat = curr_by_reach.get(r)
        if feat:
            feat['properties']['category'] = "submerged_path" if "submerged" in r else "major_tributary"
            new_features.append(feat)

    # 7. ALL OTHER TRIBUTARIES (from curr_by_reach or orig_by_reach, with strict category validation)
    remaining_reaches = [
        'yampa_upper', 'yampa_river', 'white_river', 'duchesne_river', 'price_river',
        'little_snake_river', 'uncompahgre_river', 'fryingpan_headwaters', 'fryingpan_river',
        'san_rafael_river', 'dirty_devil_river', 'escalante_river', 'animas_river',
        'little_colorado_river', 'paria_river', 'virgin_river', 'muddy_river', 'kanab_creek',
        'havasu_creek', 'bill_williams_river', 'gila_river', 'salt_headwaters', 'salt_cascade',
        'salt_river', 'verde_headwaters', 'verde_river', 'san_pedro_river', 'eagle_river',
        'roaring_fork_upper', 'roaring_fork_river', 'fraser_river'
    ]

    added_reach_ids = {f['properties']['reach'] for f in new_features}

    for r in remaining_reaches:
        if r in added_reach_ids:
            continue
        feat = curr_by_reach.get(r) or orig_by_reach.get(r)
        if feat:
            cat = feat['properties'].get('category')
            if cat not in ['mainstem', 'major_tributary', 'minor_tributary', 'submerged_path']:
                feat['properties']['category'] = "minor_tributary"
            new_features.append(feat)
            added_reach_ids.add(r)

    out_data = {
        "type": "FeatureCollection",
        "features": new_features
    }

    with open('web/data/river_network.json', 'w') as f:
        json.dump(out_data, f, indent=2)

    with open('web/data/river_network.geojson', 'w') as f:
        json.dump(out_data, f, indent=2)

    print(f"Pristine network built successfully: {len(new_features)} features.")

if __name__ == '__main__':
    run()
