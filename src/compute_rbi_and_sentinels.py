#!/usr/bin/env python3
"""
Computes true daily Richards-Baker Flashiness Index (RBI) from USGS NWIS
daily discharge records (WY 2016-2025) and Sentinel Status Hierarchy for
Colorado River Basin dashboard facilities, writing:
  - web/data/station_hierarchy.json
  - data/colorado_river_basin.db (rbi_flashiness table)

Formula (on raw daily Q_t, not smoothed multi-year normals):
  RBI = mean_over_complete_WYs( sum(|Q_t - Q_{t-1}|) / sum(Q_t) )
Regimes:
  - Regulated: RBI < 0.045
  - Snowmelt:  0.045 <= RBI < 0.150
  - Flashy:    RBI >= 0.150
"""

import json
import os
import re
import sqlite3
import statistics
import time
import requests

REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
METRICS_PATH = os.path.join(REPO_ROOT, "web", "data", "latest_metrics.json")
OUTPUT_PATH = os.path.join(REPO_ROOT, "web", "data", "station_hierarchy.json")
DB_PATH = os.path.join(REPO_ROOT, "data", "colorado_river_basin.db")

USER_AGENT = "DAT1001-Colorado-River-Dashboard/1.0"
USGS_DV_URL = (
    "https://waterservices.usgs.gov/nwis/dv/"
    "?format=json&sites={sites}&parameterCd=00060"
    "&startDT=2015-10-01&endDT=2025-09-30"
)

COMPACT_SENTINEL_IDS = {"09380000"}

BASIN_SENTINEL_IDS = {
    "09095500", "09070500", "09163500", "09180500",
    "09234500", "09260050", "09261000", "09315000",
    "09152500", "09180000", "09379500",
    "USBR-HOOVER", "USBR_HOOVER", "09421500",
    "USBR-DAVIS", "USBR_DAVIS", "09423000",
    "USBR-PARKER", "USBR_PARKER", "09427520",
    "09429100", "09429500",
}

SHOWCASE_DB_STATIONS = [
    ("09380000", "Colorado R at Lees Ferry (Glen Canyon)", 107900.0, 0),
    ("09234500", "Green R bl Flaming Gorge Dam", 15090.0, 0),
    ("09429500", "Colorado R below Imperial Dam", 184500.0, 0),
    ("09095500", "Colorado R near Cameo (Upper Mainstem)", 8050.0, 1),
    ("09180500", "Colorado R near Cisco (Grand Valley)", 24100.0, 1),
    ("09315000", "Green River at Green River, UT", 40600.0, 1),
    ("09379500", "San Juan River near Bluff, UT", 23000.0, 2),
    ("09333500", "Dirty Devil River near Hanksville, UT", 4190.0, 3),
    ("09337500", "Escalante River near Escalante, UT", 320.0, 3),
    ("09382000", "Paria River at Lees Ferry", 1410.0, 3),
    ("09520500", "Gila River at Dome, AZ", 58080.0, 3),
]


def water_year(date_str):
    y, m, _ = map(int, date_str.split("-"))
    return y + 1 if m >= 10 else y


def fetch_daily_rbi_and_cv(site_ids):
    """Fetch 10-yr USGS daily discharge in batches and compute true daily RBI and CV."""
    stats_by_site = {}
    batch_size = 15
    for i in range(0, len(site_ids), batch_size):
        batch = site_ids[i:i + batch_size]
        url = USGS_DV_URL.format(sites=",".join(batch))
        print(f"Fetching USGS daily batch {i // batch_size + 1} ({len(batch)} sites)...")
        resp = None
        for attempt in range(3):
            try:
                resp = requests.get(url, headers={"User-Agent": USER_AGENT}, timeout=60)
                if resp.status_code == 200:
                    break
            except Exception as e:
                print(f"  Attempt {attempt + 1} error: {e}")
                time.sleep(1.5 * (attempt + 1))
        if resp is None or resp.status_code != 200:
            print(f"  Warning: failed batch {batch}")
            continue
        payload = resp.json()
        for ts in payload.get("value", {}).get("timeSeries", []):
            sid = ts["sourceInfo"]["siteCode"][0]["value"]
            by_wy = {}
            all_q = []
            for v in ts.get("values", [{}])[0].get("value", []):
                dt = v.get("dateTime", "")[:10]
                try:
                    q = float(v.get("value"))
                except (TypeError, ValueError):
                    continue
                if q < 0:
                    continue
                by_wy.setdefault(water_year(dt), []).append((dt, q))
                all_q.append(q)

            if not all_q:
                continue

            # Prefer complete water years (>=330 days); fall back to >=180 days if shorter record
            wy_list = [rows for rows in by_wy.values() if len(rows) >= 330]
            if not wy_list:
                wy_list = [rows for rows in by_wy.values() if len(rows) >= 180]

            wy_rbis = []
            for rows in wy_list:
                rows.sort(key=lambda x: x[0])
                qs = [q for _, q in rows]
                tot = sum(qs)
                if tot > 0:
                    diffs = sum(abs(qs[k] - qs[k - 1]) for k in range(1, len(qs)))
                    wy_rbis.append(diffs / tot)

            rbi = round(statistics.mean(wy_rbis), 4) if wy_rbis else None
            mean_q = statistics.mean(all_q)
            cv = round(statistics.stdev(all_q) / mean_q, 2) if (len(all_q) > 1 and mean_q > 0) else None
            stats_by_site[sid] = {"rbi": rbi, "cv": cv, "n_wys": len(wy_list)}
    return stats_by_site


def classify_rbi(rbi, default_regime="Storage Buffer", is_dam_tailwater=False):
    if rbi is None:
        return {"score": None, "regime": default_regime, "badge": "bg-stone-100 text-slate-600 border-stone-300"}
    if is_dam_tailwater or rbi < 0.045:
        return {"score": rbi, "regime": "Regulated", "badge": "bg-emerald-100 text-emerald-800 border-emerald-300"}
    elif rbi < 0.150:
        return {"score": rbi, "regime": "Snowmelt", "badge": "bg-sky-100 text-sky-800 border-sky-300"}
    else:
        return {"score": rbi, "regime": "Flashy", "badge": "bg-amber-100 text-amber-900 border-amber-300"}


DAM_TAILWATER_IDS = {
    "09380000", "09234500", "09355500", "09128000", "09169500",
    "09050700", "09057500", "09041400", "09211200", "09421500",
    "09423000", "09426000", "09427520", "09429100", "09502000", "09510000",
}


def main():
    import sys
    sys.path.insert(0, os.path.join(REPO_ROOT, "scripts"))
    from export_sqlite_to_json import export_station_hierarchy

    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()

    streamflows = [dict(r) for r in cur.execute("SELECT station_id AS id, name FROM telemetry_latest WHERE station_type='streamflow'").fetchall()]
    tunnels = [dict(r) for r in cur.execute("SELECT station_id AS id, name FROM telemetry_latest WHERE station_type='diversion_tunnel'").fetchall()]
    canals = [dict(r) for r in cur.execute("SELECT station_id AS id, name FROM telemetry_latest WHERE station_type='diversion_canal'").fetchall()]
    reservoirs = [dict(r) for r in cur.execute("SELECT reservoir_id AS id, name FROM reservoirs").fetchall()]

    usgs_ids = sorted({
        s["id"] for s in (streamflows + canals)
        if re.fullmatch(r"\d{8}", str(s.get("id", "")))
    } | {sid for sid, _, _, _ in SHOWCASE_DB_STATIONS})

    daily_stats = fetch_daily_rbi_and_cv(usgs_ids)
    print(f"Computed true daily RBI for {len(daily_stats)} USGS stations.")

    hierarchy_rows = []
    for s in streamflows:
        sid = s["id"]
        if sid in COMPACT_SENTINEL_IDS:
            tier_code, tier_label, tier_rank = "compact_sentinel", "Compact Sentinel", 1
        elif sid in BASIN_SENTINEL_IDS:
            tier_code, tier_label, tier_rank = "basin_sentinel", "Basin Sentinel", 2
        else:
            tier_code, tier_label, tier_rank = "tributary_gage", "Tributary Gage", 3

        rbi_val = daily_stats.get(sid, {}).get("rbi")
        default_reg = "Regulated Dam" if "USBR" in sid else "Unmeasured"
        rbi_meta = classify_rbi(rbi_val, default_regime=default_reg, is_dam_tailwater=(sid in DAM_TAILWATER_IDS or "USBR" in sid))
        hierarchy_rows.append((sid, s["name"], "streamflow", tier_code, tier_label, tier_rank, rbi_meta["score"], rbi_meta["regime"], rbi_meta["badge"]))

    for t in tunnels:
        hierarchy_rows.append((t["id"], t["name"], "diversion_tunnel", "export_tunnel", "Trans-Divide Tunnel", 4, None, "Regulated Export", "bg-emerald-100 text-emerald-800 border-emerald-300"))

    for c in canals:
        sid = c["id"]
        rbi_val = daily_stats.get(sid, {}).get("rbi")
        rbi_meta = classify_rbi(rbi_val, default_regime="Regulated Canal", is_dam_tailwater=True)
        hierarchy_rows.append((sid, c["name"], "diversion_canal", "conveyance_canal", "Conveyance Canal", 5, rbi_meta["score"], rbi_meta["regime"], rbi_meta["badge"]))

    for r in reservoirs:
        hierarchy_rows.append((r["id"], r["name"], "reservoir", "storage_reservoir", "Storage Reservoir", 6, None, "Storage Buffer", "bg-stone-100 text-slate-600 border-stone-300"))

    cur.execute("DELETE FROM station_hierarchy;")
    cur.executemany(
        """
        INSERT INTO station_hierarchy (station_id, name, station_type, tier_code, tier_label, tier_rank, rbi, regime, badge_class)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        hierarchy_rows,
    )

    # Sync SQLite rbi_flashiness table for ALL measured USGS stations
    showcase_meta = {sid: (sname, sqmi, cid) for sid, sname, sqmi, cid in SHOWCASE_DB_STATIONS}
    name_by_id = {s["id"]: s["name"] for s in (streamflows + canals)}
    cur.execute("DELETE FROM rbi_flashiness;")
    for sid in sorted(daily_stats):
        st = daily_stats[sid]
        rbi_val = st.get("rbi")
        cv_val = st.get("cv")
        if rbi_val is None:
            continue
        sname, sqmi, cid = showcase_meta.get(sid, (name_by_id.get(sid, f"USGS {sid}"), None, 99))
        regime = classify_rbi(rbi_val, is_dam_tailwater=(sid in DAM_TAILWATER_IDS))["regime"]
        cur.execute(
            """
            INSERT INTO rbi_flashiness (station_id, station_name, drainage_sqmi, rbi_index, flow_regime, cv_discharge, cluster_id, complete_wys, period)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'WY 2016-2025')
            """,
            (sid, sname, sqmi, rbi_val, regime, cv_val, cid, st.get("n_wys")),
        )

    conn.commit()
    export_station_hierarchy(conn)
    conn.close()
    print(f"Synced {len(daily_stats)} RBI records and {len(hierarchy_rows)} station_hierarchy rows to SQLite.")


if __name__ == "__main__":
    main()
