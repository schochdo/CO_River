"""
Verification Audit Script for River Network & Hydrology:
Checks:
1. Every tracked reservoir has a submerged_path segment and inflow_cfs != outflow_cfs.
2. Zero free-flowing reaches have fake multipliers (0.9x or 1.8x) or absurd fallback spikes (21,900 or 19,200).
3. Prints every reach in river_network.json:
   [reach | category | reach_type | length_miles | gauge_id | live_flow_cfs]
"""

import json
from shapely.geometry import shape

def run_audit():
    with open('web/data/river_network.json', 'r') as f:
        rn = json.load(f)

    with open('web/data/latest_metrics.json', 'r') as f:
        metrics = json.load(f)

    streamflows = {s['id']: s for s in metrics.get('streamflows', [])}

    print(f"Total features in river_network.json: {len(rn['features'])}")
    print("=" * 110)
    print(f"{'Reach ID':<32} | {'Category':<16} | {'Reach Type':<16} | {'Miles':<6} | {'Gage ID':<9} | {'Live CFS'}")
    print("=" * 110)

    # 1 degree approx 69 miles in planar approximation for length
    DEG_TO_MILES = 58.5 # at ~37-40 lat

    submerged_paths = {}
    reaches_by_id = {}

    for f in rn['features']:
        p = f['properties']
        geom = shape(f['geometry'])
        r = p.get('reach', 'unknown')
        cat = p.get('category', 'unknown')
        rtype = p.get('reach_type', 'unknown')
        gid = p.get('gauge_id')
        length_miles = geom.length * DEG_TO_MILES
        flow = p.get('flow_cfs')
        live_cfs = streamflows.get(gid, {}).get('flow_cfs', flow) if gid else flow

        reaches_by_id[r] = {
            'properties': p,
            'live_cfs': live_cfs,
            'length_miles': length_miles
        }

        if rtype == 'submerged_path' or 'submerged' in r:
            submerged_paths[r] = reaches_by_id[r]

        gid_str = gid if gid else "None"
        flow_str = f"{live_cfs:,.1f}" if live_cfs is not None else "0 (pool)"
        print(f"{r:<32} | {cat:<16} | {rtype:<16} | {length_miles:5.1f}m | {gid_str:<9} | {flow_str}")

    print("=" * 110)

    print("\n--- RESERVOIR MASS-BALANCE & SUBMERGED PATH AUDIT ---")
    reservoir_pairs = [
        ("Lake Powell", "powell_submerged_path", "cataract_canyon", "lees_ferry"),
        ("Lake Mead", "mead_submerged_path", "grand_canyon_lower", "lower_basin_hoover_davis"),
        ("Flaming Gorge", "flaming_gorge_submerged_path", "green_greenriverwy_flaminggorge", "green_upper"),
        ("Navajo Reservoir", "navajo_submerged_path", "sanjuan_headwaters", "sanjuan_upper"),
        ("Blue Mesa", "blue_mesa_submerged_path", "gunnison_headwaters", "gunnison_aspinall_cascade"),
        ("Fontenelle", "fontenelle_submerged_path", "green_daniel_fontenelle", "green_fontenelle_greenriverwy"),
        ("Lake Mohave", "mohave_submerged_path", "lower_basin_hoover_davis", "lower_basin_davis_parker"),
        ("Lake Havasu", "havasu_submerged_path", "lower_basin_davis_parker", "lower_basin_parker_paloverde"),
        ("Lake Granby", "granby_submerged_path", "headwaters", "colorado_granby_windygap"),
        ("Dillon Reservoir", "dillon_submerged_path", "blue_river_headwaters", "blue_river_middle"),
    ]

    all_reservoirs_pass = True
    for res_name, sub_id, in_id, out_id in reservoir_pairs:
        sub_exists = sub_id in reaches_by_id
        in_flow = reaches_by_id.get(in_id, {}).get('live_cfs')
        out_flow = reaches_by_id.get(out_id, {}).get('live_cfs')

        if not sub_exists:
            print(f"FAIL: {res_name} missing submerged path {sub_id}!")
            all_reservoirs_pass = False
        elif in_flow == out_flow:
            print(f"FAIL: {res_name} in_flow ({in_flow}) == out_flow ({out_flow})!")
            all_reservoirs_pass = False
        else:
            print(f"PASS: {res_name:<16} | Submerged: {sub_id:<30} | Inflow ({in_id}): {in_flow:,.1f} cfs != Outflow ({out_id}): {out_flow:,.1f} cfs")

    print("\n--- FAKE MULTIPLIERS & ABSURD FALLBACK CHECK ---")
    absurd_values = [21900, 19200]
    has_absurd = False
    for r, data in reaches_by_id.items():
        flow = data['properties'].get('flow_cfs')
        if flow in absurd_values:
            print(f"FAIL: Reach {r} has absurd fallback {flow} cfs!")
            has_absurd = True

    if not has_absurd:
        print("PASS: Zero free-flowing reaches contain absurd fallback numbers (21,900 / 19,200).")

    # Check app.js for fake multipliers
    with open('web/app.js', 'r') as f:
        app_js = f.read()

    has_fake_mult = False
    if "* 0.90" in app_js:
        print("FAIL: Found '* 0.90' multiplier in web/app.js!")
        has_fake_mult = True
    if "* 1.8" in app_js:
        print("FAIL: Found '* 1.8' multiplier in web/app.js!")
        has_fake_mult = True

    if not has_fake_mult:
        print("PASS: Zero fake multipliers (* 0.90 or * 1.8) found in web/app.js.")

    return all_reservoirs_pass and not has_absurd and not has_fake_mult

if __name__ == '__main__':
    ok = run_audit()
    exit(0 if ok else 1)
