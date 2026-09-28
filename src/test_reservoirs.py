import requests
import json

def test_reservoirs():
    # USGS 09379900 = Lake Powell at Glen Canyon Dam
    # USGS 09421000 = Lake Mead at Hoover Dam
    # Parameter 62614 = Lake elevation (feet)
    # Parameter 00054 = Reservoir storage (acre-feet)
    # Parameter 62615 = Lake elevation (NAVD88)
    url = "https://waterservices.usgs.gov/nwis/iv/?format=json&sites=09379900,09421000&parameterCd=62614,00054,62615&siteStatus=all"
    
    res = requests.get(url, headers={"User-Agent": "DAT1001-Student/1.0"}).json()
    
    for ts in res["value"]["timeSeries"]:
        site = ts["sourceInfo"]["siteName"]
        param_desc = ts["variable"]["variableDescription"]
        vals = ts["values"][0]["value"]
        if vals:
            latest = vals[-1]
            val = latest["value"]
            dt = latest["dateTime"]
            print(f"{site}")
            print(f"  -> {param_desc}: {val} at {dt}")

if __name__ == "__main__":
    test_reservoirs()
