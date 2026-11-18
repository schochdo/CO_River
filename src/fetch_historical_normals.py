#!/usr/bin/env python3
"""
Fetches USGS historical daily-mean streamflow normals for all dashboard gauge sites.
Writes web/data/historical_normals.json:
  { "09380000": { "09-29": 8400, "09-30": 8350, ... }, ... }
  (keys are MM-DD, values are long-term daily mean in cfs)
"""
import requests
import json
import os
from datetime import datetime, timezone

USER_AGENT = "DAT1001-Research (Colorado River Dashboard)"

GAUGE_SITES = [
    # Mainstem Upper Basin
    "09010500",  # Colorado River below Baker Gulch (Headwaters)
    "09034250",  # Colorado River at Windy Gap near Granby, CO
    "09058000",  # Colorado River near Kremmling, CO
    "09070500",  # Colorado River near Dotsero, CO
    "09085100",  # Colorado River below Glenwood Springs, CO
    "09095500",  # Colorado River near Cameo (sentinel)
    "09163500",  # Colorado River near CO-UT State Line
    "09180500",  # Colorado River near Cisco
    "09380000",  # Colorado River at Lees Ferry (sentinel)
    "09402500",  # Colorado River near Grand Canyon (Phantom Ranch)
    "09404200",  # Colorado River above Diamond Creek near Peach Springs
    "09429100",  # Colorado River below Palo Verde Dam
    "09429500",  # Colorado River below Imperial Dam
    
    # Major Upper Basin Tributaries
    "09211200",  # Green River below Fontenelle Reservoir, WY
    "09217000",  # Green River near Green River, WY
    "09234500",  # Green River near Greendale, UT (Flaming Gorge Dam)
    "09260050",  # Yampa River at Deerlodge Park
    "09261000",  # Green River near Jensen, UT (below Yampa)
    "09307000",  # Green River near Ouray, UT
    "09302000",  # Duchesne River near Randlett
    "09306500",  # White River near Watson
    "09314500",  # Price River at Woodside, UT
    "09315000",  # Green River at Green River, UT
    "09328500",  # San Rafael River near Green River, UT
    "09333500",  # Dirty Devil River near Hanksville, UT
    "09337500",  # Escalante River near Escalante, UT
    "09114500",  # Gunnison River near Gunnison, CO (Headwaters)
    "09128000",  # Gunnison River below Gunnison Tunnel
    "09152500",  # Gunnison River near Grand Junction
    "09166500",  # Dolores River at Dolores, CO (Headwaters)
    "09169500",  # Dolores River at Bedrock, CO (McPhee Dam Release)
    "09180000",  # Dolores River near Cisco
    "09342500",  # San Juan River at Pagosa Springs (Headwaters)
    "09355500",  # San Juan River near Archuleta (Navajo Dam)
    "09364500",  # Animas River at Farmington
    "09365000",  # San Juan River at Farmington
    "09368000",  # San Juan River at Shiprock
    "09379500",  # San Juan River near Bluff
    
    # Headwaters & West Slope Tributaries
    "09033300",  # Fraser River below Crooked Creek
    "09037500",  # Williams Fork near Parshall, CO
    "09041400",  # Muddy Creek below Wolford Mtn Reservoir
    "09046600",  # Blue River near Dillon, CO
    "09050700",  # Blue River below Dillon, CO
    "09057500",  # Blue River below Green Mtn Reservoir
    "09070000",  # Eagle River below Gypsum
    "09085000",  # Roaring Fork at Glenwood Springs
    "09149500",  # Uncompahgre River at Delta
    "09260000",  # Little Snake River near Lily
    "09304500",  # White River near Meeker
    
    # Grand Canyon, Desert & Lower Basin Tributaries
    "09382000",  # Paria River at Lees Ferry
    "09384000",  # Little Colorado above Lyman Lake (St. Johns)
    "09400000",  # Little Colorado near Winslow
    "09402000",  # Little Colorado near Cameron
    "09403850",  # Kanab Creek above mouth
    "09404115",  # Havasu Creek above mouth
    "09406000",  # Virgin River at Virgin, UT
    "09415000",  # Virgin River at Littlefield
    "09419000",  # Muddy River near Glendale, NV
    "09426000",  # Bill Williams River below Alamo Dam
    "09471000",  # San Pedro River at Charleston
    "09474000",  # Gila River at Kelvin
    "09498500",  # Salt River near Roosevelt
    "09502000",  # Salt River below Stewart Mtn Dam
    "09506000",  # Verde River near Camp Verde
    "09510000",  # Verde River below Bartlett Dam
    "09511300",  # Verde River near Scottsdale
    "09520500",  # Gila River near Dome
    "09080400",  # Fryingpan River near Ruedi, CO
    "09188500",  # Green River at Warren Bridge near Daniel, WY
    "09209400",  # Green River near La Barge, WY
    "09251000",  # Yampa River near Maybell, CO
    "09272400",  # Green River at Ouray, UT
    
    # Major Conveyance / Diversion Canal
    "09527700",  # All-American Canal
]

STAT_URL = "https://waterservices.usgs.gov/nwis/stat/?format=rdb&sites={sites}&parameterCd=00060&statReportType=daily&statType=mean"

def fetch_normals_batch(site_ids):
    """Fetch daily mean stats for a batch of site IDs, return dict of {site_id: {MM-DD: mean_cfs}}"""
    url = STAT_URL.format(sites=",".join(site_ids))
    r = requests.get(url, headers={"User-Agent": USER_AGENT}, timeout=30)
    if r.status_code != 200:
        print(f"  ERROR {r.status_code} for sites {site_ids}")
        return {}

    result = {}
    for line in r.text.splitlines():
        if line.startswith("#") or line.startswith("5s") or line.startswith("agency"):
            continue
        parts = line.split("\t")
        if len(parts) < 11:
            continue
        try:
            site_no = parts[1].strip()
            month = int(parts[5].strip())
            day = int(parts[6].strip())
            mean_va = float(parts[10].strip())
            key = f"{month:02d}-{day:02d}"
            if site_no not in result:
                result[site_no] = {}
            result[site_no][key] = round(mean_va, 1)
        except (ValueError, IndexError):
            continue
    return result


def main():
    out_path = os.path.join(os.path.dirname(__file__), "..", "web", "data", "historical_normals.json")
    all_normals = {}

    # Fetch in batches of 8 (USGS recommends ≤ 10)
    batch_size = 8
    batches = [GAUGE_SITES[i:i+batch_size] for i in range(0, len(GAUGE_SITES), batch_size)]

    for i, batch in enumerate(batches):
        print(f"Fetching batch {i+1}/{len(batches)}: {batch}")
        normals = fetch_normals_batch(batch)
        all_normals.update(normals)
        print(f"  Got normals for {len(normals)} sites")

    # Write output
    out_data = {
        "fetched_at": datetime.now(timezone.utc).isoformat(),
        "description": "USGS historical daily-mean streamflow (cfs) keyed by site_no -> MM-DD",
        "sites": all_normals
    }
    with open(out_path, "w") as f:
        json.dump(out_data, f, indent=2)
    print(f"\nWrote {len(all_normals)} sites to {out_path}")
    for site, days in list(all_normals.items())[:3]:
        today_key = datetime.now().strftime("%m-%d")
        print(f"  {site}: today's mean ({today_key}) = {days.get(today_key, 'N/A')} cfs, {len(days)} days total")

if __name__ == "__main__":
    main()
