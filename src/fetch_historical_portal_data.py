import subprocess
import urllib.request
import re
import json
import os
from datetime import datetime, timezone

MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC']


def fetch_text(url, timeout=15):
    """Fetch text using urllib with curl fallback."""
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'CO-River-Basin-Monitor/1.0'})
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            return resp.read().decode('utf-8', errors='ignore')
    except Exception:
        pass
    try:
        return subprocess.check_output(
            ['curl', '-s', '--max-time', str(timeout), url],
            stderr=subprocess.DEVNULL
        ).decode('utf-8', errors='ignore')
    except Exception:
        return ''


def fetch_usbr_daily_csv(site_id, param_id):
    """Parse USBR Upper Colorado HydroData daily CSV (datetime,value) -> [(YYYY-MM-DD, float)]."""
    url = f'https://www.usbr.gov/uc/water/hydrodata/reservoir_data/{site_id}/csv/{param_id}.csv'
    txt = fetch_text(url, timeout=20)
    rows = []
    for line in txt.splitlines():
        line = line.strip()
        if not line or ',' not in line or not line[:4].isdigit():
            continue
        parts = line.split(',')
        d_str = parts[0].strip()[:10]
        try:
            val = float(parts[1].strip())
        except (ValueError, IndexError):
            continue
        rows.append((d_str, val))
    return rows


def build_monthly_elevation_series(daily_rows, existing_records=None, min_year=None):
    """Aggregate daily (YYYY-MM-DD, elev_ft) rows into the annual 12-month matrix structure."""
    by_year_month = {}
    for d_str, val in daily_rows:
        try:
            yr = int(d_str[:4])
            mo = int(d_str[5:7])
        except ValueError:
            continue
        if min_year and yr < min_year:
            continue
        if 1 <= mo <= 12:
            by_year_month.setdefault(yr, {}).setdefault(mo, []).append(val)

    existing_by_yr = {r['year']: r for r in (existing_records or []) if 'year' in r}
    all_years = sorted(set(existing_by_yr.keys()) | set(by_year_month.keys()))

    records = []
    for yr in all_years:
        prev = existing_by_yr.get(yr, {})
        prev_elevs = prev.get('elevations') or {}
        elevations = {}
        yr_months = by_year_month.get(yr, {})

        for idx, m_name in enumerate(MONTHS, 1):
            vals = yr_months.get(idx)
            if vals:
                elevations[m_name] = round(sum(vals) / len(vals), 2)
            elif m_name in prev_elevs and prev_elevs[m_name] is not None:
                elevations[m_name] = round(float(prev_elevs[m_name]), 2)
            else:
                elevations[m_name] = None

        valid_vals = [v for v in elevations.values() if v is not None]
        if valid_vals:
            annual_min = round(min(valid_vals), 1)
            annual_max = round(max(valid_vals), 1)
            annual_mean = round(sum(valid_vals) / len(valid_vals), 1)
            annual_range = round(annual_max - annual_min, 1)
        else:
            annual_min = annual_max = annual_mean = annual_range = None

        records.append({
            'year': yr,
            'elevations': elevations,
            'min': annual_min,
            'max': annual_max,
            'mean': annual_mean,
            'range': annual_range,
        })
    return records


def fetch_live_mead_month_fallback():
    """Fetch current-month Lake Mead end-of-period elevation from USBR daily/hourly feeds or latest_metrics.json."""
    # 1. USBR daily levels table for current month (https://www.usbr.gov/lc/region/g4000/hourly/levels.html)
    levels_html = fetch_text('https://www.usbr.gov/lc/region/g4000/hourly/levels.html', timeout=10)
    if levels_html:
        m_hdr = re.search(r'ACCUMULATIONS FOR\s+([A-Z]+)\s+(\d{4})', levels_html, re.IGNORECASE)
        if m_hdr:
            mon_full = m_hdr.group(1).strip().upper()[:3]
            yr = int(m_hdr.group(2))
            if mon_full in MONTHS:
                last_elev = None
                for line in levels_html.splitlines():
                    m_row = re.match(r'^\s*\d{1,2}\s+(?:\d+\s+\d+\s+)?(1\d{3}\.\d{2}|\d{3}\.\d{2})\s+', line)
                    if m_row:
                        val = float(m_row.group(1))
                        if 890.0 <= val <= 1230.0:
                            last_elev = val
                if last_elev is not None:
                    return yr, mon_full, round(last_elev, 2)

    # 2. Fallback to USBR HydroData site 921 daily elevation CSV
    mead_921 = fetch_usbr_daily_csv(921, 49)
    if mead_921:
        last_dt, last_val = mead_921[-1]
        yr = int(last_dt[:4])
        mo = int(last_dt[5:7])
        if 890.0 <= last_val <= 1230.0 and 1 <= mo <= 12:
            return yr, MONTHS[mo - 1], round(last_val, 2)

    # 3. Fallback to web/data/latest_metrics.json
    if os.path.exists('web/data/latest_metrics.json'):
        try:
            with open('web/data/latest_metrics.json', 'r') as f:
                lm = json.load(f)
            for res in lm.get('reservoirs', []):
                if res.get('id') == 'lake_mead' and res.get('elevation_ft'):
                    ts = res.get('timestamp') or ''
                    if len(ts) >= 7 and ts[:4].isdigit():
                        return int(ts[:4]), MONTHS[int(ts[5:7]) - 1], round(float(res['elevation_ft']), 2)
        except Exception:
            pass
    return None


def main():
    os.makedirs('web/data', exist_ok=True)
    portal_json_path = 'web/data/portal_historical.json'
    existing_data = {}
    if os.path.exists(portal_json_path):
        try:
            with open(portal_json_path, 'r') as f:
                existing_data = json.load(f)
        except Exception as e:
            print(f"Warning: could not read existing portal_historical.json ({e})")

    now_utc = datetime.now(timezone.utc)
    print(f"Refreshing historical portal datasets ({now_utc.strftime('%Y-%m-%d %H:%M UTC')})...")

    # 1. Lake Mead historical monthly elevations (1935 - Present)
    print("Fetching Lake Mead historical monthly elevations (1935 - Present)...")
    html_mead = fetch_text('https://www.usbr.gov/lc/region/g4000/hourly/mead-elv.html', timeout=15)
    mead_records = []
    pattern = re.compile(r'<TR><TH>(\d{4})</TH>(.*?)</TR>', re.DOTALL)
    td_pattern = re.compile(r'<TD>\s*([0-9\.]+|-+)\s*</TD>')

    for match in pattern.finditer(html_mead):
        year = int(match.group(1))
        tds = td_pattern.findall(match.group(2))
        elevations = {}
        for i, val in enumerate(tds[:12]):
            m = MONTHS[i]
            if val and val != '---' and not val.startswith('-'):
                try:
                    elevations[m] = round(float(val), 2)
                except ValueError:
                    elevations[m] = None
            else:
                elevations[m] = None

        valid_vals = [v for v in elevations.values() if v is not None]
        if valid_vals:
            annual_min = min(valid_vals)
            annual_max = max(valid_vals)
            annual_mean = round(sum(valid_vals) / len(valid_vals), 2)
            annual_range = round(annual_max - annual_min, 2)
        else:
            annual_min = annual_max = annual_mean = annual_range = None

        mead_records.append({
            'year': year,
            'elevations': elevations,
            'min': annual_min,
            'max': annual_max,
            'mean': annual_mean,
            'range': annual_range
        })

    live_mead = fetch_live_mead_month_fallback()
    if live_mead and mead_records:
        cur_yr, cur_mon, cur_elv = live_mead
        rec = next((r for r in mead_records if r['year'] == cur_yr), None)
        if rec is None:
            rec = {'year': cur_yr, 'elevations': {m: None for m in MONTHS}, 'min': None, 'max': None, 'mean': None, 'range': None}
            mead_records.append(rec)
        if rec['elevations'].get(cur_mon) is None:
            rec['elevations'][cur_mon] = cur_elv
            valid_vals = [v for v in rec['elevations'].values() if v is not None]
            if valid_vals:
                rec['min'] = min(valid_vals)
                rec['max'] = max(valid_vals)
                rec['mean'] = round(sum(valid_vals) / len(valid_vals), 2)
                rec['range'] = round(rec['max'] - rec['min'], 2)
            print(f"  Populated active month {cur_yr} {cur_mon}: {cur_elv} ft NGVD29")

    if mead_records:
        print(f"Parsed {len(mead_records)} years for Lake Mead ({mead_records[0]['year']} - {mead_records[-1]['year']})")
    else:
        mead_records = existing_data.get('lake_mead_historical', [])
        print("Warning: Lake Mead HTML empty; kept existing lake_mead_historical")

    # 2. Lake Powell annual storage summary (Water Years 1963 - Present) from USBR CSV 17
    print("Fetching Lake Powell historical storage (919/csv/17.csv)...")
    powell_af_rows = fetch_usbr_daily_csv(919, 17)
    powell_records = []
    if powell_af_rows:
        wy_groups = {}
        for d_str, val in powell_af_rows:
            yr, mo = int(d_str[:4]), int(d_str[5:7])
            wy = yr + 1 if mo >= 10 else yr
            wy_groups.setdefault(wy, []).append(val)
        for wy in sorted(wy_groups.keys()):
            vals = wy_groups[wy]
            if vals:
                powell_records.append({
                    'year': wy,
                    'min_af': round(min(vals)),
                    'max_af': round(max(vals)),
                    'mean_af': round(sum(vals) / len(vals)),
                    'year_end_af': round(vals[-1])
                })
        print(f"Extracted Lake Powell water-year storage for {len(powell_records)} years (latest WY {powell_records[-1]['year']})")
    else:
        powell_records = existing_data.get('lake_powell_historical', [])
        print("Warning: Lake Powell 17.csv fetch failed; kept existing lake_powell_historical")

    # 3. Upper Colorado USBR Monthly Elevation Matrices (Powell, Flaming Gorge, Navajo, Blue Mesa)
    upper_res_specs = [
        ('lake_powell_elevation_historical', 919, 1963),
        ('flaming_gorge_elevation_historical', 917, 1968),
        ('navajo_elevation_historical', 920, 1962),
        ('blue_mesa_elevation_historical', 913, 1965),
    ]
    elevation_updates = {}
    for key_name, site_id, min_yr in upper_res_specs:
        print(f"Fetching daily elevations for {key_name} (USBR site {site_id})...")
        daily_el = fetch_usbr_daily_csv(site_id, 49)
        if daily_el:
            elevation_updates[key_name] = build_monthly_elevation_series(
                daily_el, existing_records=existing_data.get(key_name), min_year=min_yr
            )
            last_rec = elevation_updates[key_name][-1]
            filled = [m for m in MONTHS if last_rec['elevations'].get(m) is not None]
            print(f"  {key_name}: {len(elevation_updates[key_name])} years, latest {last_rec['year']} ({filled[-1] if filled else 'none'})")
        else:
            elevation_updates[key_name] = existing_data.get(key_name, [])

    # 4. Dillon Reservoir monthly elevation update (CDWR DILRESCO)
    dillon_records = existing_data.get('dillon_elevation_historical', [])
    cur_cal_yr = now_utc.year
    cdwr_dillon_url = (
        f"https://dwr.state.co.us/Rest/GET/api/v2/telemetrystations/telemetrytimeseriesday/"
        f"?format=json&abbrev=DILRESCO&startDate=01%2F01%2F{cur_cal_yr}&endDate=12%2F31%2F{cur_cal_yr}"
    )
    cdwr_txt = fetch_text(cdwr_dillon_url, timeout=12)
    dillon_daily = []
    if cdwr_txt:
        try:
            for item in json.loads(cdwr_txt).get('ResultList', []):
                if item.get('parameter') == 'ELEV' and item.get('measValue') is not None:
                    d_str = (item.get('measDate') or '')[:10]
                    if len(d_str) == 10:
                        dillon_daily.append((d_str, float(item['measValue'])))
        except Exception:
            pass
    if dillon_daily:
        dillon_records = build_monthly_elevation_series(dillon_daily, existing_records=dillon_records, min_year=1984)
        print(f"Updated dillon_elevation_historical through {dillon_records[-1]['year']}")

    # 5. Macro Basin Multi-Reservoir Storage Timeline (update current year from latest USBR 17.csv & CDWR)
    timeline = list(existing_data.get('basin_storage_timeline', []))
    if timeline:
        latest_row_data = {}
        usbr_storage_latest = {
            'mead_maf': fetch_usbr_daily_csv(921, 17),
            'powell_maf': powell_af_rows,
            'flaming_gorge_maf': fetch_usbr_daily_csv(917, 17),
            'navajo_maf': fetch_usbr_daily_csv(920, 17),
            'blue_mesa_maf': fetch_usbr_daily_csv(913, 17),
        }
        for field, rows in usbr_storage_latest.items():
            cur_rows = [r for r in rows if r[0].startswith(f'{cur_cal_yr}-')]
            if cur_rows:
                latest_row_data[field] = round(cur_rows[-1][1] / 1e6, 3)

        # Fetch Granby & Dillon current-year storage (AF -> MAF) from CDWR
        for field, abbrev in [('dillon_maf', 'DILRESCO'), ('granby_maf', 'GRARESCO')]:
            u_cdwr = (
                f"https://dwr.state.co.us/Rest/GET/api/v2/telemetrystations/telemetrytimeseriesday/"
                f"?format=json&abbrev={abbrev}&startDate=10%2F01%2F{cur_cal_yr}&endDate=12%2F31%2F{cur_cal_yr}"
            )
            txt_c = fetch_text(u_cdwr, timeout=10)
            if txt_c:
                try:
                    pts = [
                        (it['measDate'][:10], float(it['measValue']))
                        for it in json.loads(txt_c).get('ResultList', [])
                        if it.get('parameter') == 'STORAGE' and it.get('measValue') is not None
                    ]
                    if pts:
                        pts.sort()
                        latest_row_data[field] = round(pts[-1][1] / 1e6, 3)
                except Exception:
                    pass

        if latest_row_data:
            existing_yr_idx = next((idx for idx, r in enumerate(timeline) if r.get('year') == cur_cal_yr), None)
            base_row = dict(timeline[existing_yr_idx]) if existing_yr_idx is not None else dict(timeline[-1], year=cur_cal_yr)
            base_row.update(latest_row_data)
            base_row['total_major_storage_maf'] = round(
                float(base_row.get('mead_maf', 0))
                + float(base_row.get('powell_maf', 0))
                + float(base_row.get('flaming_gorge_maf', 0))
                + float(base_row.get('navajo_maf', 0))
                + float(base_row.get('blue_mesa_maf', 0)),
                3,
            )
            if existing_yr_idx is not None:
                timeline[existing_yr_idx] = base_row
            else:
                timeline.append(base_row)
            print(f"Updated basin_storage_timeline[{cur_cal_yr}]: total_major_storage_maf={base_row['total_major_storage_maf']} MAF")

    # 6. Lee's Ferry Daily Streamflow (2024 - Present) from USGS
    print("Fetching Lee's Ferry daily flow series from USGS...")
    url_lees = 'https://waterservices.usgs.gov/nwis/dv/?format=json&sites=09380000&startDT=2024-01-01&parameterCd=00060'
    lees_daily = []
    try:
        lees_txt = fetch_text(url_lees, timeout=20)
        if lees_txt:
            lees_json = json.loads(lees_txt)
            raw_lees = lees_json['value']['timeSeries'][0]['values'][0]['value']
            lees_daily = [
                {'date': p['dateTime'][:10], 'cfs': int(float(p['value']))}
                for p in raw_lees
                if p.get('value') not in (None, '', '-999999')
            ]
    except Exception as e:
        print("Warning: USGS Lees Ferry fetch failed:", e)
    if lees_daily:
        print(f"Fetched {len(lees_daily)} daily points for Lee's Ferry (latest {lees_daily[-1]['date']})")
    else:
        lees_daily = existing_data.get('lees_ferry_daily', [])

    # Historical SWE (Snow Water Equivalent) Peak Data (1977-2026) in inches for Upper Colorado Basin
    swe_history = existing_data.get('swe_history') or [
        {"year": 1977, "swe_in": 7.2}, {"year": 1978, "swe_in": 15.6}, {"year": 1979, "swe_in": 17.1},
        {"year": 1980, "swe_in": 20.4}, {"year": 1981, "swe_in": 9.3}, {"year": 1982, "swe_in": 18.2},
        {"year": 1983, "swe_in": 21.8}, {"year": 1984, "swe_in": 24.1}, {"year": 1985, "swe_in": 16.5},
        {"year": 1986, "swe_in": 21.2}, {"year": 1987, "swe_in": 13.9}, {"year": 1988, "swe_in": 14.8},
        {"year": 1989, "swe_in": 14.1}, {"year": 1990, "swe_in": 11.2}, {"year": 1991, "swe_in": 12.8},
        {"year": 1992, "swe_in": 11.9}, {"year": 1993, "swe_in": 21.1}, {"year": 1994, "swe_in": 11.4},
        {"year": 1995, "swe_in": 21.5}, {"year": 1996, "swe_in": 14.2}, {"year": 1997, "swe_in": 20.1},
        {"year": 1998, "swe_in": 15.2}, {"year": 1999, "swe_in": 12.8}, {"year": 2000, "swe_in": 11.6},
        {"year": 2001, "swe_in": 11.2}, {"year": 2002, "swe_in": 5.8}, {"year": 2003, "swe_in": 13.1},
        {"year": 2004, "swe_in": 11.5}, {"year": 2005, "swe_in": 19.4}, {"year": 2006, "swe_in": 15.0},
        {"year": 2007, "swe_in": 11.3}, {"year": 2008, "swe_in": 18.2}, {"year": 2009, "swe_in": 15.8},
        {"year": 2010, "swe_in": 14.5}, {"year": 2011, "swe_in": 26.2}, {"year": 2012, "swe_in": 6.8},
        {"year": 2013, "swe_in": 11.9}, {"year": 2014, "swe_in": 16.4}, {"year": 2015, "swe_in": 11.8},
        {"year": 2016, "swe_in": 14.9}, {"year": 2017, "swe_in": 20.3}, {"year": 2018, "swe_in": 9.4},
        {"year": 2019, "swe_in": 21.8}, {"year": 2020, "swe_in": 16.5}, {"year": 2021, "swe_in": 12.1},
        {"year": 2022, "swe_in": 12.9}, {"year": 2023, "swe_in": 22.4}, {"year": 2024, "swe_in": 16.8},
        {"year": 2025, "swe_in": 14.2}, {"year": 2026, "swe_in": 13.5},
    ]

    state_consumptive_use = existing_data.get('state_consumptive_use') or [
        {"state": "CA", "name": "California", "allocated_maf": 4.40, "average_use_maf": 4.95, "primary_use": "Imperial & Coachella Irrigation (80%), MWD Los Angeles Municipal (20%)"},
        {"state": "AZ", "name": "Arizona", "allocated_maf": 2.80, "average_use_maf": 2.65, "primary_use": "Central Arizona Project (CAP Canal), Yuma Ag"},
        {"state": "UT", "name": "Utah", "allocated_maf": 1.71, "average_use_maf": 1.02, "primary_use": "Central Utah Project, Duchesne Basin Irrigation"},
        {"state": "CO", "name": "Colorado", "allocated_maf": 3.86, "average_use_maf": 2.50, "primary_use": "West Slope Agriculture, Front Range Trans-Mountain Tunnels"},
        {"state": "NV", "name": "Nevada", "allocated_maf": 0.30, "average_use_maf": 0.24, "primary_use": "Southern Nevada Water Authority (Las Vegas Municipal)"},
        {"state": "NM", "name": "New Mexico", "allocated_maf": 0.84, "average_use_maf": 0.48, "primary_use": "San Juan-Chama Diversion, Navajo Agricultural Products"},
        {"state": "WY", "name": "Wyoming", "allocated_maf": 1.04, "average_use_maf": 0.58, "primary_use": "Green River Basin Cattle Ranches & Forage"},
    ]

    canals_pipelines = existing_data.get('canals_pipelines') or [
        {"id": "all_american", "name": "All-American Canal", "flow_rate_cfs": 11500, "annual_maf": 2.90, "state": "CA", "source": "Imperial Dam"},
        {"id": "cap", "name": "Central Arizona Project", "flow_rate_cfs": 2100, "annual_maf": 1.50, "state": "AZ", "source": "Lake Havasu / Parker Dam"},
        {"id": "cra", "name": "Colorado River Aqueduct", "flow_rate_cfs": 1450, "annual_maf": 1.05, "state": "CA", "source": "Lake Havasu / Parker Dam"},
        {"id": "gila_gravity", "name": "Gila Gravity Canal", "flow_rate_cfs": 1200, "annual_maf": 0.70, "state": "AZ", "source": "Imperial Dam"},
        {"id": "front_range", "name": "Front Range Tunnels (4 Tunnels)", "flow_rate_cfs": 760, "annual_maf": 0.55, "state": "CO", "source": "Continental Divide Bores"},
        {"id": "grand_valley", "name": "Grand Valley Project Canal", "flow_rate_cfs": 1300, "annual_maf": 0.40, "state": "CO", "source": "Grand Valley Diversion Dam"},
    ]

    output_data = dict(existing_data)
    output_data.update({
        'lake_mead_historical': mead_records,
        'lake_powell_historical': powell_records,
        'lees_ferry_daily': lees_daily,
        'swe_history': swe_history,
        'state_consumptive_use': state_consumptive_use,
        'canals_pipelines': canals_pipelines,
        **elevation_updates,
        'dillon_elevation_historical': dillon_records,
        'basin_storage_timeline': timeline,
    })

    with open(portal_json_path, 'w') as f:
        json.dump(output_data, f, indent=2)

    print("Saved portal_historical.json successfully!")


if __name__ == '__main__':
    main()
