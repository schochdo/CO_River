"""
Remediate River Network Topology & GIS Reservoir Decoupling:
1. Merge Glenwood Springs + Cameo + Grand Junction into a single contiguous reach
   from the Roaring Fork confluence at Glenwood Springs to the Gunnison confluence at Grand Junction.
2. Align Lees Ferry and Marble Canyon so Lees Ferry ends exactly at the Paria River confluence (USGS #09382000),
   and Marble Canyon starts at Lees Ferry and ends at the Little Colorado River confluence (USGS #09402000).
3. Snap Animas River downstream terminal vertex to San Juan River at Farmington.
4. Snap Blue River downstream terminal vertex to Colorado River at Kremmling (Gore Canyon).
5. Slices river lines at reservoir boundaries to create submerged_path thalwegs for all 9 major reservoirs:
   - Lake Powell (powell_submerged_path, existing)
   - Lake Mead (mead_submerged_path, existing)
   - Navajo Reservoir (navajo_submerged_path, existing)
   - Blue Mesa Reservoir (blue_mesa_submerged_path, existing)
   - Fontenelle Reservoir (fontenelle_submerged_path, existing)
   - Flaming Gorge Reservoir (flaming_gorge_submerged_path, new)
   - Lake Mohave (mohave_submerged_path, new)
   - Lake Havasu (havasu_submerged_path, new)
   - Lake Granby (granby_submerged_path, new)
   - Dillon Reservoir (dillon_submerged_path, new)
"""

import json
from shapely.geometry import shape, mapping, LineString, MultiLineString
from shapely.ops import linemerge

def remediate():
    with open('web/data/river_network.json', 'r') as f:
        data = json.load(f)

    with open('web/data/lakes.geojson', 'r') as f:
        lakes = json.load(f)

    def get_lake_poly(name):
        for feat in lakes['features']:
            gnis = feat['properties'].get('GNIS_NAME') or ''
            if name.lower() in gnis.lower():
                return shape(feat['geometry'])
        return None

    features = data['features']
    by_reach = {f['properties'].get('reach'): f for f in features if f['properties'].get('reach')}

    # 1. Merge Glenwood Springs + Glenwood-Cameo + Cameo-GJ into a single reach
    glenwood_reaches = ['colorado_glenwood_springs', 'glenwood_cameo', 'cameo_grand_junction']
    lines = []
    for r in glenwood_reaches:
        feat = by_reach.get(r)
        if feat:
            geom = shape(feat['geometry'])
            if geom.geom_type == 'MultiLineString':
                lines.extend(geom.geoms)
            else:
                lines.append(geom)

    merged_glenwood = linemerge(lines)
    # Order downstream: Glenwood Springs (-107.3299, 39.54926) to Grand Junction (-108.57797, 39.06208)
    geoms_downstream = list(reversed(list(merged_glenwood.geoms)))
    merged_geom = MultiLineString([list(g.coords) for g in geoms_downstream])

    merged_feat = {
        "type": "Feature",
        "properties": {
            "reach": "glenwood_cameo",
            "name": "Colorado River - Glenwood Springs to Grand Junction (Cameo)",
            "category": "mainstem",
            "reach_type": "free_flowing",
            "flow_cfs": 1560,
            "weight": 5.5,
            "gauge_id": "09095500",
            "source_label": "USGS Gage",
            "gauge_info": "USGS #09095500 near Cameo, CO (Grand Valley above Gunnison Confluence)",
            "notes": "Colorado River from Roaring Fork confluence at Glenwood Springs through De Beque Canyon and Cameo (USGS #09095500) to Gunnison River confluence at Grand Junction."
        },
        "geometry": mapping(merged_geom)
    }

    # Remove the 3 old Glenwood reaches and insert the merged reach
    new_features = [f for f in features if f['properties'].get('reach') not in glenwood_reaches]
    new_features.append(merged_feat)

    # 2. Align Lees Ferry and Marble Canyon
    # Lees Ferry ends at Paria confluence [-111.60075, 36.85843]
    # Marble Canyon starts at Paria confluence and ends at Little Colorado River confluence [-111.80046, 36.19363]
    lf_feat = by_reach.get('lees_ferry')
    mc_feat = by_reach.get('marble_canyon')
    if lf_feat and mc_feat:
        lf_coords = lf_feat['geometry']['coordinates'][0]
        split_idx = 48  # [-111.60075, 36.85843]
        new_lf_coords = [lf_coords[:split_idx+1]]
        bridge_coords = lf_coords[split_idx:]
        mc_coords = mc_feat['geometry']['coordinates']
        new_mc_coords = bridge_coords + mc_coords[1:]

        lf_feat['geometry']['coordinates'] = new_lf_coords
        lf_feat['properties']['notes'] = "Glen Canyon Dam 15-mile tailwater reach to Paria River confluence at Lees Ferry, AZ (USGS #09380000)."
        lf_feat['properties']['gauge_id'] = "09380000"

        mc_feat['geometry']['coordinates'] = new_mc_coords
        mc_feat['properties']['gauge_id'] = "09380000"
        mc_feat['properties']['flow_cfs'] = 7670
        mc_feat['properties']['source_label'] = "USGS Gage (Marble Canyon Inflow)"
        mc_feat['properties']['gauge_info'] = "USGS #09380000 at Lees Ferry, AZ (Glen Canyon Tailwater through Marble Canyon)"
        mc_feat['properties']['notes'] = "Lees Ferry through Marble Canyon to the Little Colorado River confluence; Navajo Bridge & Echo Cliffs gorge."

    # 3. Snap Animas River terminal vertex to San Juan River at Farmington [-108.22275, 36.71454]
    animas_feat = by_reach.get('animas_river')
    if animas_feat:
        # Part 0 end is Farmington confluence
        animas_feat['geometry']['coordinates'][0][-1] = [-108.22275, 36.71454]

    # 4. Snap Blue River terminal vertex to Colorado River at Kremmling [-106.41318, 40.04007]
    blue_feat = by_reach.get('blue_river')
    if blue_feat:
        blue_feat['geometry']['coordinates'][-1] = [-106.41318, 40.04007]

    # 5. Reservoir Decoupling & Submerged Path Slicing
    def slice_reservoir(reach_id, lake_name, submerged_reach_id, submerged_name, inflow_gage, inflow_fallback, outflow_gage):
        lake_poly = get_lake_poly(lake_name)
        reach_f = by_reach.get(reach_id)
        if not lake_poly or not reach_f:
            print(f"Skipping {reach_id} / {lake_name}: not found")
            return

        r_geom = shape(reach_f['geometry'])
        diff = r_geom.difference(lake_poly)
        inter = r_geom.intersection(lake_poly)

        # Update upstream reach with difference (free flowing)
        reach_f['geometry'] = mapping(diff)
        reach_f['properties']['reach_type'] = "free_flowing"
        reach_f['properties']['gauge_id'] = inflow_gage
        reach_f['properties']['flow_cfs'] = inflow_fallback

        # Create submerged path feature (inside reservoir)
        submerged_feat = {
            "type": "Feature",
            "properties": {
                "reach": submerged_reach_id,
                "name": submerged_name,
                "category": "submerged_path",
                "reach_type": "submerged_path",
                "flow_cfs": 0,
                "weight": 1.4,
                "gauge_id": None,
                "source_label": "Submerged Thalweg (Impounded Pool)",
                "gauge_info": f"Submerged thalweg impounded behind {lake_name}",
                "notes": f"Submerged river channel through flooded reservoir pool of {lake_name}"
            },
            "geometry": mapping(inter)
        }
        new_features.append(submerged_feat)
        print(f"Decoupled {lake_name}: created {submerged_reach_id} and trimmed {reach_id}")

    # Slice Flaming Gorge
    slice_reservoir(
        'green_greenriverwy_flaminggorge', 'Flaming Gorge',
        'flaming_gorge_submerged_path', 'Flaming Gorge Reservoir Submerged Channel',
        '09217000', 807, '09234500'
    )

    # Slice Lake Mohave
    slice_reservoir(
        'lower_basin_hoover_davis', 'Mohave',
        'mohave_submerged_path', 'Lake Mohave Submerged River Channel',
        '09421500', 1452, '09423000'
    )

    # Slice Lake Havasu
    slice_reservoir(
        'lower_basin_davis_parker', 'Havasu',
        'havasu_submerged_path', 'Lake Havasu Submerged River Channel',
        '09423000', 14800, '09427520'
    )

    # Slice Lake Granby
    slice_reservoir(
        'headwaters', 'Granby',
        'granby_submerged_path', 'Lake Granby Submerged River Channel',
        '09010500', 12.6, '09019500'
    )

    # Slice Dillon Reservoir
    slice_reservoir(
        'blue_river_headwaters', 'Dillon',
        'dillon_submerged_path', 'Dillon Reservoir Submerged Channel',
        '09046600', 32.3, '09050700'
    )

    # Update data features
    data['features'] = new_features

    # Write out to river_network.json and river_network.geojson
    with open('web/data/river_network.json', 'w') as f:
        json.dump(data, f, indent=2)

    with open('web/data/river_network.geojson', 'w') as f:
        json.dump(data, f, indent=2)

    print(f"Successfully remediated river network topology: {len(new_features)} total features.")

if __name__ == '__main__':
    remediate()
