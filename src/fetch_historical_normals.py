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
from datetime import datetime

USER_AGENT = "DAT1001-Research (Colorado River Dashboard)"

GAUGE_SITES = [
    "09057500",  # Blue River below Green Mtn Reservoir
    "09070000",  # Eagle River below Gypsum
    "09070500",  # Colorado River near Dotsero
    "09085000",  # Roaring Fork at Glenwood Springs
    "09095500",  # Colorado River near Cameo (sentinel)
    "09152500",  # Gunnison River near Grand Junction
    "09180000",  # Dolores River near Cisco
    "09180500",  # Colorado River near Cisco
    "09260050",  # Yampa River at Deerlodge Park
    "09302000",  # Duchesne River near Randlett
    "09306500",  # White River near Watson
    "09315000",  # Green River at Green River, UT
    "09364500",  # Animas River at Farmington
    "09379500",  # San Juan River near Bluff
    "09380000",  # Colorado River at Lees Ferry (sentinel)
    "09402000",  # Little Colorado near Cameron
    "09415000",  # Virgin River at Littlefield
    "09426000",  # Bill Williams River below Alamo Dam
    "09429100",  # Colorado River below Palo Verde Dam
    "09474000",  # Gila River at Kelvin
    "09498500",  # Salt River near Roosevelt
    "09511300",  # Verde River near Scottsdale
    "09520500",  # Gila River near Dome
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
        "fetched_at": datetime.utcnow().isoformat() + "Z",
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
