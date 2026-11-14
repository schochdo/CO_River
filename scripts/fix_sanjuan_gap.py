import json

def fix_sanjuan():
    with open('web/data/river_network.json') as f:
        data = json.load(f)

    bluff = next(f for f in data['features'] if f['properties'].get('reach') == 'sanjuan_bluff_powell')
    sub = next(f for f in data['features'] if f['properties'].get('reach') == 'sanjuan_submerged_path')

    b_coords = bluff['geometry']['coordinates']
    s_coords = sub['geometry']['coordinates']

    print(f"Original bluff coords: {len(b_coords)}, end: {b_coords[-1]}")
    print(f"Original sub coords: {len(s_coords)}, start: {s_coords[0]}, end: {s_coords[-1]}")

    # s_coords[28] is [-110.38273, 37.28799], the easternmost shoreline inlet of Lake Powell
    lake_inlet_idx = 28
    canyon_extension = s_coords[1:lake_inlet_idx + 1]

    new_bluff_coords = b_coords + canyon_extension
    new_sub_coords = s_coords[lake_inlet_idx:]

    print(f"New bluff coords: {len(new_bluff_coords)}, start: {new_bluff_coords[0]}, end: {new_bluff_coords[-1]}")
    print(f"New sub coords: {len(new_sub_coords)}, start: {new_sub_coords[0]}, end: {new_sub_coords[-1]}")

    bluff['geometry']['coordinates'] = new_bluff_coords
    bluff['properties']['weight'] = 6.1
    bluff['properties']['flow_cfs'] = 5140
    bluff['properties']['reach_type'] = "free_flowing"
    bluff['properties']['category'] = "major_tributary"

    sub['geometry']['coordinates'] = new_sub_coords
    sub['properties']['weight'] = 1.8
    sub['properties']['flow_cfs'] = 0
    sub['properties']['reach_type'] = "submerged_path"

    # Also make sure sanjuan_shiprock_bluff has weight properly populated
    shiprock = next(f for f in data['features'] if f['properties'].get('reach') == 'sanjuan_shiprock_bluff')
    shiprock['properties']['weight'] = 5.8

    with open('web/data/river_network.json', 'w') as f:
        json.dump(data, f, indent=2)

    with open('web/data/river_network.geojson', 'w') as f:
        json.dump(data, f, indent=2)

    print("Successfully updated river_network.json and river_network.geojson.")

if __name__ == '__main__':
    fix_sanjuan()
