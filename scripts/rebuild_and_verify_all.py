import json
import subprocess
from shapely.geometry import shape, Point

def rebuild():
    # 1. Fetch pristine baseline from origin/main
    raw_origin = subprocess.check_output(['git', 'show', 'origin/main:web/data/river_network.json'])
    origin_data = json.loads(raw_origin)
    orig_by_reach = {f['properties'].get('reach'): f for f in origin_data['features']}

    # 2. Fetch current working tree features
    with open('web/data/river_network.json') as f:
        curr_data = json.load(f)
    curr_by_reach = {f['properties'].get('reach'): f for f in curr_data['features']}

    new_features = []

    # =========================================================================
    # A. UPPER COLORADO RIVER MAINSTEM (Headwaters -> Mexico)
    # =========================================================================
    # 1. Headwaters to Granby Dam
    # Sliced cleanly at Granby Dam crest (vertex 194: [-105.86857, 40.14577])
    raw_headwaters = orig_by_reach['headwaters']['geometry']['coordinates']
    headwaters_coords = raw_headwaters[:195]  # RMNP to Granby Dam face [-105.86857, 40.14577]
    granby_tailwater = raw_headwaters[194:]   # Granby Dam face to Fraser River confluence

    new_features.append({
        "type": "Feature",
        "properties": {
            "reach": "headwaters",
            "name": "Colorado River - Headwaters to Granby Dam",
            "category": "mainstem",
            "reach_type": "free_flowing",
            "flow_cfs": 350,
            "weight": 3.2,
            "gauge_id": "09010500",
            "notes": "Snowpack headwaters in Rocky Mountain National Park flowing into Lake Granby to Granby Dam face."
        },
        "geometry": {"type": "LineString", "coordinates": headwaters_coords}
    })

    # 2. Granby Dam to Windy Gap (Fraser Confluence)
    # Starts at Granby Dam face [-105.86857, 40.14577] past Fraser River confluence to Windy Gap [-105.99783, 40.10976]
    orig_gw_coords = orig_by_reach['colorado_granby_windygap']['geometry']['coordinates']
    granby_windygap_coords = granby_tailwater + orig_gw_coords[1:]
    new_features.append({
        "type": "Feature",
        "properties": {
            "reach": "colorado_granby_windygap",
            "name": "Colorado River - Granby Dam to Windy Gap (Fraser Confluence)",
            "category": "mainstem",
            "reach_type": "dam_regulated",
            "flow_cfs": 390,
            "weight": 3.4,
            "gauge_id": "09019500",
            "notes": "Post-Adams Tunnel export reach below Granby Dam past Fraser River confluence to Windy Gap."
        },
        "geometry": {"type": "LineString", "coordinates": granby_windygap_coords}
    })

    # 3. Windy Gap to Kremmling
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

    # 4. Gore Canyon to Dotsero
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

    # 5. Glenwood Canyon
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
            "notes": "Glenwood Canyon corridor below Eagle River confluence with Shoshone Hydroelectric Plant."
        },
        "geometry": orig_by_reach['colorado_glenwood_canyon']['geometry']
    })

    # 6. Glenwood to Grand Junction (Cameo) - Merged Reach
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
        "geometry": curr_by_reach['glenwood_cameo']['geometry']
    })

    # 7. Grand Junction to State Line / Cisco
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

    # 8. Cisco past Moab to Green River Confluence
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

    # 9. Cataract Canyon
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

    # 10. Lake Powell Submerged Thalweg
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

    # 11. Lees Ferry (Glen Canyon Dam to Paria Confluence)
    # In origin/main, lees_ferry had 7 parts in reverse order.
    # Part 6 begins at Glen Canyon Dam [-111.4839, 36.9372] (matching powell_submerged_path end)
    # and ends at Paria confluence [-111.60075, 36.85843] (48 points).
    orig_lf_parts = orig_by_reach['lees_ferry']['geometry']['coordinates']
    # Welded downstream points from Glen Canyon Dam to Lees Ferry
    welded_lf = []
    for p in reversed(orig_lf_parts):
        if welded_lf:
            welded_lf.extend(p[1:])
        else:
            welded_lf.extend(p)
    
    # Paria confluence is at index 48 [-111.60075, 36.85843]
    lf_to_paria = welded_lf[:49]
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
        "geometry": {"type": "LineString", "coordinates": lf_to_paria}
    })

    # 12. Marble Canyon (Paria Confluence to Little Colorado River)
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
        "geometry": curr_by_reach['marble_canyon']['geometry']
    })

    # 13. Grand Canyon Upper (Little Colorado River to Phantom Ranch)
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
        "geometry": curr_by_reach['grand_canyon_upper']['geometry']
    })

    # 14. Grand Canyon (Phantom Ranch to Diamond Creek)
    new_features.append({
        "type": "Feature",
        "properties": {
            "reach": "grand_canyon",
            "name": "Colorado River - Phantom Ranch to Diamond Creek",
            "category": "mainstem",
            "reach_type": "free_flowing",
            "flow_cfs": 17000,
            "weight": 7.5,
            "gauge_id": "09402500",
            "notes": "Central Grand Canyon corridor through Middle and Lower Granite Gorges to Diamond Creek (monitored at upstream control station USGS #09402500 at Phantom Ranch)."
        },
        "geometry": curr_by_reach['grand_canyon']['geometry']
    })

    # 15. Grand Canyon Lower (Diamond Creek to Lake Mead / Grand Wash)
    new_features.append({
        "type": "Feature",
        "properties": {
            "reach": "grand_canyon_lower",
            "name": "Colorado River - Diamond Creek to Lake Mead (Grand Wash)",
            "category": "mainstem",
            "reach_type": "free_flowing",
            "flow_cfs": 12300,
            "weight": 7.5,
            "gauge_id": "09404200",
            "notes": "Western Grand Canyon reach exiting the Grand Wash Cliffs into Lake Mead (compliance flow monitored at USGS #09404200 above Diamond Creek)."
        },
        "geometry": curr_by_reach['grand_canyon_lower']['geometry']
    })

    # 16. Lake Mead Submerged Thalweg (Grand Wash Cliffs to Hoover Dam)
    # Extracted from part 2 of origin/main lower_basin_upper
    orig_lbu_parts = orig_by_reach['lower_basin_upper']['geometry']['coordinates']
    mead_sub_coords = orig_lbu_parts[2] # 79 pts: [-114.01119, 36.19585] to [-114.73732, 36.01609]
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
        "geometry": {"type": "LineString", "coordinates": mead_sub_coords}
    })

    # 17. Hoover Dam to Davis Dam (Lake Mohave)
    # Parts 1, 0, 3 of origin/main lower_basin_upper cleanly sliced at Davis Dam crest (vertex 135: [-114.56747, 35.19920])
    full_hoover_davis = orig_lbu_parts[1] + orig_lbu_parts[0][1:] + orig_lbu_parts[3][1:]
    hoover_davis_coords = full_hoover_davis[:136] # Hoover Dam [-114.73743, 36.01601] to Davis Dam face [-114.56747, 35.19920]
    davis_tailwater = full_hoover_davis[135:]     # Davis Dam face down through tailwater to Laughlin

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
            "notes": "USGS #09421500 below Hoover Dam, AZ-NV flowing through Black Canyon and Lake Mohave to Davis Dam face."
        },
        "geometry": {"type": "LineString", "coordinates": hoover_davis_coords}
    })

    # 18. Davis Dam to Parker Dam (Lake Havasu)
    # Sliced cleanly at Parker Dam crest (vertex 160: [-114.13981, 34.29696])
    davis_parker_parts = [orig_lbu_parts[i] for i in [4, 5, 6, 8, 7, 9, 10]]
    raw_dp = list(davis_tailwater)
    for p in davis_parker_parts:
        raw_dp.extend(p[1:])

    davis_parker_coords = raw_dp[:161] # Davis Dam face [-114.56747, 35.19920] to Parker Dam face [-114.13981, 34.29696]
    parker_tailwater = raw_dp[160:]    # Parker Dam face through Parker Canyon to Parker, AZ

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
            "notes": "USGS #09423000 below Davis Dam, AZ-NV flowing past Laughlin and Needles into Lake Havasu to Parker Dam face."
        },
        "geometry": {"type": "LineString", "coordinates": davis_parker_coords}
    })

    # 19. Parker Dam to Palo Verde Diversion Dam
    # Sliced cleanly from Parker Dam face [-114.13981, 34.29696] to Palo Verde Diversion Dam weir (vertex 121: [-114.51070, 33.73136])
    orig_lbm_parts = orig_by_reach['lower_basin_middle']['geometry']['coordinates']
    full_parker_ehrenberg = parker_tailwater + orig_lbm_parts[0][1:]
    pv_dam_idx = 121 # Palo Verde Dam weir [-114.51070, 33.73136]
    parker_pv_coords = full_parker_ehrenberg[:pv_dam_idx + 1]
    pv_tailwater = full_parker_ehrenberg[pv_dam_idx:]

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
            "notes": "Tailwater releases below Parker Dam (USGS #09427520) through Parker Valley to Palo Verde Diversion Dam weir."
        },
        "geometry": {"type": "LineString", "coordinates": parker_pv_coords}
    })

    # 20. Palo Verde Diversion Dam to Imperial Dam
    # Starts at Palo Verde Diversion Dam [-114.51070, 33.73136] past Blythe to Imperial Dam pool [-114.46702, 32.88325]
    pv_imperial_coords = pv_tailwater + orig_lbm_parts[1][1:] + orig_lbm_parts[2][1:]
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
            "notes": "Post-Palo Verde Canal diversion reach (USGS #09429100) past Blythe to Imperial Dam pool (All-American Canal diversion)."
        },
        "geometry": {"type": "LineString", "coordinates": pv_imperial_coords}
    })

    # 21. Below Imperial Dam (Desilting Works)
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

    # 22. Imperial Dam to Mexico
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

    # =========================================================================
    # B. GREEN RIVER CHAIN (100% Continuous, ALL category="major_tributary")
    # =========================================================================
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

    # In origin/main, green_fontenelle_greenriverwy starts at [-110.04967, 42.02153] (exact end of green_headwaters_fontenelle)
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

    # Green River 444 pts from origin/main green_upper
    orig_gu_pts = orig_by_reach['green_upper']['geometry']['coordinates'][0]
    # pts[:29]: Green River, WY [-109.44818, 41.51561] to Flaming Gorge Inlet [-109.39335, 41.47716]
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

    # pts[28:235]: Flaming Gorge Reservoir Submerged Thalweg to Dam Face [-109.42187, 40.91408]
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

    # pts[234:]: Flaming Gorge Dam to Echo Park [-108.98454, 40.52638]
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

    # Echo Park to Ouray
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

    # Ouray through Desolation Canyon
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

    # Lower Green River to Canyonlands Confluence
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

    # =========================================================================
    # C. DOLORES RIVER (100% Continuous, ALL category="major_tributary")
    # =========================================================================
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

    # =========================================================================
    # D. BLUE RIVER (100% Continuous, ALL category="minor_tributary")
    # =========================================================================
    # Pristine 227 points from origin/main blue_river
    orig_blue_pts = orig_by_reach['blue_river']['geometry']['coordinates']
    # 0 to 51: Breckenridge to Dillon inlet
    # 51 to 61: Dillon submerged thalweg to Dam
    # 61 to 160: Dillon Dam to Green Mountain Dam
    # 160 to 226: Green Mountain Dam to Kremmling / Gore Canyon
    blue_kremmling = orig_blue_pts[160:]
    blue_kremmling[-1] = [-106.41318, 40.04007] # snap exactly to Gore Canyon start

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
        "geometry": {"type": "LineString", "coordinates": orig_blue_pts[:52]}
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
        "geometry": {"type": "LineString", "coordinates": orig_blue_pts[51:62]}
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
        "geometry": {"type": "LineString", "coordinates": orig_blue_pts[61:161]}
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
        "geometry": {"type": "LineString", "coordinates": blue_kremmling}
    })

    # =========================================================================
    # E. SAN JUAN RIVER (100% Continuous, ALL category="major_tributary")
    # =========================================================================
    for r in ['sanjuan_headwaters', 'navajo_submerged_path', 'sanjuan_upper', 'sanjuan_farmington_shiprock', 'sanjuan_shiprock_bluff', 'sanjuan_bluff_powell', 'sanjuan_submerged_path']:
        feat = curr_by_reach.get(r)
        if feat:
            feat['properties']['category'] = "submerged_path" if "submerged" in r else "major_tributary"
            new_features.append(feat)

    # =========================================================================
    # F. GUNNISON RIVER (ALL category="major_tributary")
    # =========================================================================
    for r in ['gunnison_headwaters', 'blue_mesa_submerged_path', 'gunnison_aspinall_cascade', 'gunnison_upper', 'gunnison_river']:
        feat = curr_by_reach.get(r)
        if feat:
            feat['properties']['category'] = "submerged_path" if "submerged" in r else "major_tributary"
            new_features.append(feat)

    # =========================================================================
    # G. ALL OTHER PRIMARY & SECONDARY TRIBUTARIES
    # =========================================================================
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

    # Enforce minimum line weight standards across reaches for high cartographic legibility
    for f in new_features:
        cat = f['properties'].get('category')
        reach_type = f['properties'].get('reach_type')
        if reach_type != 'submerged_path':
            w = f['properties'].get('weight')
            if cat == 'minor_tributary':
                f['properties']['weight'] = max(2.4, w if w is not None else 2.4)
            elif cat == 'major_tributary':
                f['properties']['weight'] = max(3.2, w if w is not None else 3.2)
            elif cat == 'mainstem':
                f['properties']['weight'] = max(4.4, w if w is not None else 4.4)

    out_data = {
        "type": "FeatureCollection",
        "features": new_features
    }

    with open('web/data/river_network.json', 'w') as f:
        json.dump(out_data, f, indent=2)

    with open('web/data/river_network.geojson', 'w') as f:
        json.dump(out_data, f, indent=2)

    print(f"Pristine network successfully constructed with {len(new_features)} features.")

if __name__ == '__main__':
    rebuild()
