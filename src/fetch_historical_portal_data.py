#!/usr/bin/env python3
"""
Refreshes historical reservoir EOM elevation matrices, Lake Powell WY storage,
dated basin storage timeline, and recent Lee's Ferry daily flow directly in
SQLite (data/colorado_river_basin.db), then exports web/data/portal_historical.json
via scripts/export_sqlite_to_json.py.

Zero hardcoded arrays (swe_history, state_consumptive_use, canals_pipelines removed)
and consistent End-of-Month (EOM) aggregation across all 6 reservoir matrices.
"""

import json
import os
import re
import sqlite3
import subprocess
import sys
import urllib.request
from collections import defaultdict
from datetime import datetime, timezone

REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB_PATH = os.path.join(REPO_ROOT, "data", "colorado_river_basin.db")
MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"]


def fetch_text(url: str, timeout: int = 20) -> str:
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "CO-River-Basin-Monitor/2.0"})
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            return resp.read().decode("utf-8", errors="ignore")
    except Exception:
        pass
    try:
        return subprocess.check_output(
            ["curl", "-sSL", "--max-time", str(timeout), url],
            stderr=subprocess.DEVNULL,
        ).decode("utf-8", errors="ignore")
    except Exception:
        return ""


def fetch_usbr_daily_csv(site_id: int, param_id: int) -> list[tuple[str, float]]:
    url = f"https://www.usbr.gov/uc/water/hydrodata/reservoir_data/{site_id}/csv/{param_id}.csv"
    txt = fetch_text(url, timeout=25)
    rows = []
    for line in txt.splitlines():
        line = line.strip()
        if not line or "," not in line or not line[:4].isdigit():
            continue
        parts = line.split(",")
        d_str = parts[0].strip()[:10]
        try:
            val = float(parts[1].strip())
        except (ValueError, IndexError):
            continue
        rows.append((d_str, val))
    rows.sort(key=lambda x: x[0])
    return rows


def eom_rows_from_daily(daily_rows: list[tuple[str, float]], min_year: int | None = None) -> dict[int, list[float | None]]:
    """Standardized End-of-Month (last valid observation per calendar month)."""
    by_ym = {}
    for d_str, val in daily_rows:
        try:
            yr, mo = int(d_str[:4]), int(d_str[5:7])
        except ValueError:
            continue
        if min_year and yr < min_year:
            continue
        if 1 <= mo <= 12:
            by_ym[(yr, mo)] = val

    out = {}
    for yr in sorted({y for y, _ in by_ym}):
        out[yr] = [round(by_ym[(yr, mo)], 2) if (yr, mo) in by_ym else None for mo in range(1, 13)]
    return out


def upsert_monthly_matrix(cur: sqlite3.Cursor, reservoir_id: str, mat: dict[int, list[float | None]], source_id: str) -> None:
    for yr, vals in sorted(mat.items()):
        valid = [v for v in vals if v is not None]
        amin = round(min(valid), 2) if valid else None
        amax = round(max(valid), 2) if valid else None
        amean = round(sum(valid) / len(valid), 2) if valid else None
        arange = round(amax - amin, 2) if valid else None
        cur.execute(
            """
            INSERT INTO reservoir_monthly_history (
                reservoir_id, year, jan, feb, mar, apr, may, jun, jul, aug, sep, oct, nov, dec,
                annual_min, annual_max, annual_mean, annual_range, aggregation_method, source_id
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'EOM', ?)
            ON CONFLICT(reservoir_id, year) DO UPDATE SET
                jan=COALESCE(excluded.jan, jan), feb=COALESCE(excluded.feb, feb),
                mar=COALESCE(excluded.mar, mar), apr=COALESCE(excluded.apr, apr),
                may=COALESCE(excluded.may, may), jun=COALESCE(excluded.jun, jun),
                jul=COALESCE(excluded.jul, jul), aug=COALESCE(excluded.aug, aug),
                sep=COALESCE(excluded.sep, sep), oct=COALESCE(excluded.oct, oct),
                nov=COALESCE(excluded.nov, nov), dec=COALESCE(excluded.dec, dec),
                annual_min=excluded.annual_min, annual_max=excluded.annual_max,
                annual_mean=excluded.annual_mean, annual_range=excluded.annual_range,
                aggregation_method='EOM', source_id=excluded.source_id
            """,
            (reservoir_id, yr, *vals, amin, amax, amean, arange, source_id),
        )


def fetch_live_mead_month_fallback() -> tuple[int, int, float] | None:
    levels_html = fetch_text("https://www.usbr.gov/lc/region/g4000/hourly/levels.html", timeout=10)
    if levels_html:
        m_hdr = re.search(r"ACCUMULATIONS FOR\s+([A-Z]+)\s+(\d{4})", levels_html, re.IGNORECASE)
        if m_hdr:
            mon_full = m_hdr.group(1).strip().upper()[:3]
            yr = int(m_hdr.group(2))
            if mon_full in MONTHS:
                last_elev = None
                for line in levels_html.splitlines():
                    m_row = re.match(r"^\s*\d{1,2}\s+(?:\d+\s+\d+\s+)?(1\d{3}\.\d{2}|\d{3}\.\d{2})\s+", line)
                    if m_row:
                        val = float(m_row.group(1))
                        if 890.0 <= val <= 1230.0:
                            last_elev = val
                if last_elev is not None:
                    return yr, MONTHS.index(mon_full) + 1, round(last_elev, 2)

    mead_921 = fetch_usbr_daily_csv(921, 49)
    if mead_921:
        last_dt, last_val = mead_921[-1]
        yr, mo = int(last_dt[:4]), int(last_dt[5:7])
        if 890.0 <= last_val <= 1230.0 and 1 <= mo <= 12:
            return yr, mo, round(last_val, 2)
    return None


def main():
    sys.path.insert(0, os.path.join(REPO_ROOT, "scripts"))
    from export_sqlite_to_json import export_portal_historical, get_conn

    now_utc = datetime.now(timezone.utc)
    cur_cal_yr = now_utc.year
    print(f"Refreshing SQLite historical portal datasets ({now_utc.strftime('%Y-%m-%d %H:%M UTC')})...")

    conn = get_conn(DB_PATH)
    cur = conn.cursor()

    # 1. Lake Mead EOM HTML + current-month fallback
    html_mead = fetch_text("https://www.usbr.gov/lc/region/g4000/hourly/mead-elv.html", timeout=15)
    mead_mat = {}
    for match in re.finditer(r"<TR><TH>(\d{4})</TH>(.*?)</TR>", html_mead, re.DOTALL):
        yr = int(match.group(1))
        tds = re.findall(r"<TD>\s*([0-9\.]+|-+)\s*</TD>", match.group(2))
        row = []
        for val in tds[:12]:
            if val and not val.startswith("-"):
                try:
                    row.append(round(float(val), 2))
                except ValueError:
                    row.append(None)
            else:
                row.append(None)
        while len(row) < 12:
            row.append(None)
        mead_mat[yr] = row

    live_mead = fetch_live_mead_month_fallback()
    if live_mead and mead_mat:
        ly, lm, le = live_mead
        row = mead_mat.setdefault(ly, [None] * 12)
        if row[lm - 1] is None:
            row[lm - 1] = le
    if mead_mat:
        upsert_monthly_matrix(cur, "lake_mead", mead_mat, "usbr_mead_eom_1935_present")
        print(f"  Upserted Lake Mead EOM elevations ({min(mead_mat)}-{max(mead_mat)})")

    # 2. Lake Powell WY storage (919/17.csv)
    powell_17 = fetch_usbr_daily_csv(919, 17)
    if powell_17:
        wy_groups = defaultdict(list)
        for d_str, val in powell_17:
            yr, mo = int(d_str[:4]), int(d_str[5:7])
            wy_groups[yr + 1 if mo >= 10 else yr].append(val)
        for wy, vals in sorted(wy_groups.items()):
            cur.execute(
                """
                INSERT INTO reservoir_wy_storage (reservoir_id, water_year, min_af, max_af, mean_af, year_end_af, source_id)
                VALUES ('lake_powell', ?, ?, ?, ?, ?, 'usbr_919_powell_stor')
                ON CONFLICT(reservoir_id, water_year) DO UPDATE SET
                    min_af=excluded.min_af, max_af=excluded.max_af,
                    mean_af=excluded.mean_af, year_end_af=excluded.year_end_af
                """,
                (wy, round(min(vals)), round(max(vals)), round(sum(vals) / len(vals)), round(vals[-1])),
            )
        print(f"  Upserted Lake Powell WY storage through WY {max(wy_groups)}")

    # 3. Upper Colorado USBR Monthly EOM Elevation Matrices
    for rid, site_id, min_yr, src_id in [
        ("lake_powell", 919, 1963, "usbr_919_powell_elev"),
        ("flaming_gorge", 917, 1968, "usbr_917_fg_elev"),
        ("navajo_reservoir", 920, 1962, "usbr_920_navajo_elev"),
        ("blue_mesa", 913, 1965, "usbr_913_bluemesa_elev"),
    ]:
        daily_el = fetch_usbr_daily_csv(site_id, 49)
        if daily_el:
            mat = eom_rows_from_daily(daily_el, min_year=min_yr)
            upsert_monthly_matrix(cur, rid, mat, src_id)
            print(f"  Upserted {rid} EOM elevations through {max(mat)}")

    # 4. Dillon Reservoir EOM elevation (current year)
    cdwr_dillon_url = (
        "https://dwr.state.co.us/Rest/GET/api/v2/telemetrystations/telemetrytimeseriesday/"
        f"?format=json&abbrev=DILRESCO&startDate=01%2F01%2F{cur_cal_yr}&endDate=12%2F31%2F{cur_cal_yr}"
    )
    cdwr_txt = fetch_text(cdwr_dillon_url, timeout=12)
    if cdwr_txt:
        try:
            dillon_daily = sorted(
                (it["measDate"][:10], float(it["measValue"]))
                for it in json.loads(cdwr_txt).get("ResultList", [])
                if it.get("parameter") == "ELEV" and it.get("measValue") is not None
            )
            if dillon_daily:
                upsert_monthly_matrix(cur, "dillon_reservoir", eom_rows_from_daily(dillon_daily), "cdwr_dillon_daily")
        except Exception:
            pass

    # 5. Update current year in dated basin_storage_timeline
    storage_latest = {}
    as_of_candidates = []
    for col, rows in [
        ("mead_maf", fetch_usbr_daily_csv(921, 17)),
        ("powell_maf", powell_17),
        ("flaming_gorge_maf", fetch_usbr_daily_csv(917, 17)),
        ("navajo_maf", fetch_usbr_daily_csv(920, 17)),
        ("blue_mesa_maf", fetch_usbr_daily_csv(913, 17)),
    ]:
        cur_rows = [r for r in rows if r[0].startswith(f"{cur_cal_yr}-")]
        if cur_rows:
            storage_latest[col] = round(cur_rows[-1][1] / 1e6, 3)
            as_of_candidates.append(cur_rows[-1][0])

    for col, abbrev in [("dillon_maf", "DILRESCO"), ("granby_maf", "GRARESCO")]:
        u_cdwr = (
            "https://dwr.state.co.us/Rest/GET/api/v2/telemetrystations/telemetrytimeseriesday/"
            f"?format=json&abbrev={abbrev}&startDate=01%2F01%2F{cur_cal_yr}&endDate=12%2F31%2F{cur_cal_yr}"
        )
        txt_c = fetch_text(u_cdwr, timeout=12)
        if txt_c:
            try:
                pts = sorted(
                    (it["measDate"][:10], float(it["measValue"]))
                    for it in json.loads(txt_c).get("ResultList", [])
                    if it.get("parameter") == "STORAGE" and it.get("measValue") is not None
                )
                if pts:
                    storage_latest[col] = round(pts[-1][1] / 1e6, 3)
            except Exception:
                pass

    if storage_latest:
        existing = cur.execute("SELECT * FROM basin_storage_timeline WHERE year=?", (cur_cal_yr,)).fetchone()
        base = dict(existing) if existing else {
            "year": cur_cal_yr, "as_of_date": max(as_of_candidates) if as_of_candidates else f"{cur_cal_yr}-12-31",
            "mead_maf": 0.0, "powell_maf": 0.0, "flaming_gorge_maf": 0.0,
            "navajo_maf": 0.0, "blue_mesa_maf": 0.0, "dillon_maf": 0.0, "granby_maf": 0.0,
        }
        base.update(storage_latest)
        if as_of_candidates:
            base["as_of_date"] = max(as_of_candidates)
        base["total_major_storage_maf"] = round(
            base["mead_maf"] + base["powell_maf"] + base["flaming_gorge_maf"] + base["navajo_maf"] + base["blue_mesa_maf"], 3
        )
        cur.execute(
            """
            INSERT INTO basin_storage_timeline (
                year, as_of_date, mead_maf, powell_maf, flaming_gorge_maf,
                navajo_maf, blue_mesa_maf, dillon_maf, granby_maf, total_major_storage_maf, source_id
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'usbr_919_powell_stor')
            ON CONFLICT(year) DO UPDATE SET
                as_of_date=excluded.as_of_date, mead_maf=excluded.mead_maf, powell_maf=excluded.powell_maf,
                flaming_gorge_maf=excluded.flaming_gorge_maf, navajo_maf=excluded.navajo_maf,
                blue_mesa_maf=excluded.blue_mesa_maf, dillon_maf=excluded.dillon_maf,
                granby_maf=excluded.granby_maf, total_major_storage_maf=excluded.total_major_storage_maf
            """,
            (
                cur_cal_yr, base["as_of_date"], base["mead_maf"], base["powell_maf"],
                base["flaming_gorge_maf"], base["navajo_maf"], base["blue_mesa_maf"],
                base["dillon_maf"], base["granby_maf"], base["total_major_storage_maf"],
            ),
        )
        print(f"  Updated basin_storage_timeline[{cur_cal_yr}] as_of={base['as_of_date']} total={base['total_major_storage_maf']} MAF")

    # 6. Lee's Ferry Daily Streamflow (2024 - Present)
    lees_txt = fetch_text("https://waterservices.usgs.gov/nwis/dv/?format=json&sites=09380000&startDT=2024-01-01&parameterCd=00060", timeout=20)
    if lees_txt:
        try:
            raw_lees = json.loads(lees_txt)["value"]["timeSeries"][0]["values"][0]["value"]
            cnt = 0
            for p in raw_lees:
                val = p.get("value")
                if val not in (None, "", "-999999"):
                    cur.execute(
                        """
                        INSERT INTO lees_ferry_daily_recent (obs_date, cfs, source_id)
                        VALUES (?, ?, 'usgs_lees_ferry_dv')
                        ON CONFLICT(obs_date) DO UPDATE SET cfs=excluded.cfs
                        """,
                        (p["dateTime"][:10], float(val)),
                    )
                    cnt += 1
            print(f"  Upserted {cnt} Lee's Ferry daily observations")
        except Exception as e:
            print("Warning: USGS Lees Ferry fetch failed:", e)

    conn.commit()
    export_portal_historical(conn)
    conn.close()


if __name__ == "__main__":
    main()
