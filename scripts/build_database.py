#!/usr/bin/env python3
"""
Builds and populates the canonical SQLite Single Source of Truth
(data/colorado_river_basin.db) deterministically from immutable archival files
in data/raw/ and data/raw/MANIFEST.csv.

All tabular, historical, accounting, and citation tables live in SQLite.
Static JSON payloads in web/data/*.json are exported solely by
scripts/export_sqlite_to_json.py.
"""

import csv
import io
import json
import os
import re
import sqlite3
import statistics
import xml.etree.ElementTree as ET
import zipfile
from collections import defaultdict
from datetime import datetime, timezone

REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RAW_DIR = os.path.join(REPO_ROOT, "data", "raw")
MANIFEST_PATH = os.path.join(RAW_DIR, "MANIFEST.csv")
DB_PATH = os.path.join(REPO_ROOT, "data", "colorado_river_basin.db")

MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"]
LC_MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]
CFS_DAY_TO_AF = 1.983471
CFS_DAY_TO_MAF = CFS_DAY_TO_AF / 1e6

BUDGET_START_YR = 2000
BUDGET_END_YR = 2024
BUDGET_N_YRS = BUDGET_END_YR - BUDGET_START_YR + 1


def water_year(date_str: str) -> int:
    y, m = int(date_str[:4]), int(date_str[5:7])
    return y + 1 if m >= 10 else y


def col_idx(ref: str) -> int:
    letters = re.match(r"[A-Z]+", ref).group(0)
    n = 0
    for ch in letters:
        n = n * 26 + (ord(ch) - 64)
    return n - 1


def parse_xlsx_sheets(path: str, sheet_names: set[str] | None = None) -> dict[str, dict[int, dict[int, str]]]:
    zf = zipfile.ZipFile(path)
    ns = {"m": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}
    ss = []
    if "xl/sharedStrings.xml" in zf.namelist():
        root = ET.fromstring(zf.read("xl/sharedStrings.xml"))
        ss = ["".join(t.text or "" for t in si.findall(".//m:t", ns)) for si in root.findall("m:si", ns)]

    wb = ET.fromstring(zf.read("xl/workbook.xml"))
    rels = ET.fromstring(zf.read("xl/_rels/workbook.xml.rels"))
    rmap = {r.attrib["Id"]: "xl/" + r.attrib["Target"].lstrip("/") for r in rels}

    out = {}
    for s in wb.findall(".//m:sheet", ns):
        name = s.attrib["name"].strip()
        if sheet_names is not None and name not in sheet_names:
            continue
        rid = s.attrib["{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id"]
        sh = ET.fromstring(zf.read(rmap[rid]))
        rows = {}
        for r in sh.findall(".//m:sheetData/m:row", ns):
            rn = int(r.attrib["r"])
            cells = {}
            for c in r.findall("m:c", ns):
                ci = col_idx(c.attrib["r"])
                t = c.attrib.get("t")
                v = c.find("m:v", ns)
                if v is not None:
                    cells[ci] = ss[int(v.text)] if t == "s" else v.text
            rows[rn] = cells
        out[name] = rows
    return out


def load_usbr_csv_series(path: str) -> list[tuple[str, float]]:
    rows = []
    with open(path, "r", encoding="utf-8", errors="ignore") as f:
        for line in f:
            line = line.strip()
            if not line or "," not in line or not line[:4].isdigit():
                continue
            parts = line.split(",")
            dt = parts[0].strip()[:10]
            try:
                val = float(parts[1].strip())
            except (ValueError, IndexError):
                continue
            rows.append((dt, val))
    rows.sort(key=lambda x: x[0])
    return rows


def load_usgs_dv_json(path: str) -> dict[str, dict[str, float]]:
    with open(path, "r", encoding="utf-8") as f:
        payload = json.load(f)
    out = {}
    for ts in payload.get("value", {}).get("timeSeries", []):
        sid = ts["sourceInfo"]["siteCode"][0]["value"]
        vals = {}
        for v in ts.get("values", [{}])[0].get("value", []):
            dt = v.get("dateTime", "")[:10]
            try:
                q = float(v.get("value"))
            except (TypeError, ValueError):
                continue
            if q < 0 or not dt:
                continue
            vals[dt] = q
        out[sid] = vals
    return out


def init_schema(cur: sqlite3.Cursor) -> None:
    cur.executescript("""
    CREATE TABLE IF NOT EXISTS stations (
        station_id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        state TEXT,
        agency TEXT,
        latitude REAL,
        longitude REAL,
        elevation_ft REAL,
        drainage_sqmi REAL,
        station_type TEXT,
        is_sentinel INTEGER,
        historical_mean_cfs REAL
    );

    CREATE TABLE IF NOT EXISTS telemetry_latest (
        station_id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        provider TEXT,
        station_type TEXT,
        flow_cfs REAL,
        timestamp_utc TEXT,
        age_hours REAL,
        data_status TEXT,
        latitude REAL,
        longitude REAL,
        updated_at TEXT,
        FOREIGN KEY (station_id) REFERENCES stations(station_id)
    );

    CREATE TABLE IF NOT EXISTS reservoirs (
        reservoir_id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        dam_name TEXT,
        river TEXT,
        state TEXT,
        category TEXT,
        operator TEXT,
        total_capacity_af REAL,
        active_capacity_af REAL,
        capacity_af REAL,
        capacity_pct REAL,
        min_power_pool_af REAL,
        dead_pool_af REAL,
        current_storage_af REAL,
        current_elevation_ft REAL,
        current_pct_full REAL,
        feet_below_full REAL,
        latitude REAL,
        longitude REAL,
        role TEXT
    );

    CREATE TABLE IF NOT EXISTS reservoirs_telemetry (
        reservoir_id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        storage_af REAL,
        elevation_ft REAL,
        percent_full REAL,
        inflow_cfs REAL,
        release_cfs REAL,
        timestamp_utc TEXT,
        data_status TEXT,
        updated_at TEXT,
        FOREIGN KEY (reservoir_id) REFERENCES reservoirs(reservoir_id)
    );

    CREATE TABLE IF NOT EXISTS ingestion_runs (
        run_id INTEGER PRIMARY KEY AUTOINCREMENT,
        run_timestamp TEXT NOT NULL,
        stations_fetched INTEGER,
        reservoirs_fetched INTEGER,
        validation_status TEXT,
        notes TEXT,
        validation_json TEXT
    );

    CREATE TABLE IF NOT EXISTS rbi_flashiness (
        station_id TEXT PRIMARY KEY,
        station_name TEXT,
        drainage_sqmi REAL,
        water_years INTEGER,
        mean_cfs REAL,
        std_cfs REAL,
        cv_discharge REAL,
        rbi_index REAL,
        flow_regime TEXT,
        cluster_id INTEGER,
        updated_at TEXT,
        complete_wys INTEGER,
        period TEXT
    );

    CREATE TABLE IF NOT EXISTS source_catalog (
        source_id TEXT PRIMARY KEY,
        category TEXT NOT NULL,
        agency TEXT NOT NULL,
        title TEXT NOT NULL,
        period TEXT NOT NULL,
        period_basis TEXT NOT NULL,
        locator_detail TEXT NOT NULL,
        official_url TEXT NOT NULL,
        doc_url TEXT,
        local_raw_path TEXT,
        retrieved_at_utc TEXT,
        bytes INTEGER,
        sha256 TEXT,
        used_by_pages TEXT
    );

    CREATE TABLE IF NOT EXISTS annual_lees_ferry (
        water_year INTEGER PRIMARY KEY,
        natural_flow_maf REAL,
        gaged_flow_maf REAL,
        compact_allocation_maf REAL,
        annual_surplus_deficit_maf REAL,
        ten_year_rolling_mean_maf REAL,
        natural_flow_af REAL,
        in_compact_era INTEGER DEFAULT 1,
        source_id TEXT DEFAULT 'usbr_lf_natflow_1906_2024'
    );

    CREATE TABLE IF NOT EXISTS cul_upper_annual (
        water_or_cal_year INTEGER NOT NULL,
        jurisdiction TEXT NOT NULL,
        sector TEXT NOT NULL,
        value_af REAL NOT NULL,
        source_id TEXT NOT NULL,
        sheet_name TEXT NOT NULL,
        row_ref TEXT NOT NULL,
        PRIMARY KEY (water_or_cal_year, jurisdiction, sector)
    );

    CREATE TABLE IF NOT EXISTS cul_lower_annual (
        cal_year INTEGER NOT NULL,
        tab_name TEXT NOT NULL,
        jurisdiction TEXT NOT NULL,
        sector TEXT NOT NULL,
        value_af REAL NOT NULL,
        source_id TEXT NOT NULL,
        PRIMARY KEY (cal_year, tab_name, jurisdiction, sector)
    );

    CREATE TABLE IF NOT EXISTS water_budget_nodes (
        node_id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        display_name TEXT NOT NULL,
        col_tier INTEGER NOT NULL,
        category TEXT NOT NULL,
        basin TEXT NOT NULL,
        maf_yr REAL NOT NULL,
        summary TEXT NOT NULL,
        breakdowns_json TEXT,
        station_id TEXT,
        station_label TEXT,
        portal_url TEXT,
        source_id TEXT NOT NULL,
        locator TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS water_budget_links (
        link_id INTEGER PRIMARY KEY AUTOINCREMENT,
        source_name TEXT NOT NULL,
        target_name TEXT NOT NULL,
        value_maf REAL NOT NULL,
        category TEXT NOT NULL,
        source_id TEXT NOT NULL,
        locator TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS water_budget_stacked (
        seg_id INTEGER PRIMARY KEY AUTOINCREMENT,
        side TEXT NOT NULL,
        label TEXT NOT NULL,
        maf_yr REAL NOT NULL,
        share_label TEXT NOT NULL,
        category TEXT NOT NULL,
        color_hex TEXT NOT NULL,
        excluded INTEGER DEFAULT 0,
        description TEXT NOT NULL,
        source_id TEXT NOT NULL,
        locator TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS water_budget_meta (
        meta_key TEXT PRIMARY KEY,
        meta_value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS reservoir_monthly_history (
        reservoir_id TEXT NOT NULL,
        year INTEGER NOT NULL,
        jan REAL, feb REAL, mar REAL, apr REAL, may REAL, jun REAL,
        jul REAL, aug REAL, sep REAL, oct REAL, nov REAL, dec REAL,
        annual_min REAL, annual_max REAL, annual_mean REAL, annual_range REAL,
        aggregation_method TEXT NOT NULL DEFAULT 'EOM',
        source_id TEXT NOT NULL,
        PRIMARY KEY (reservoir_id, year)
    );

    CREATE TABLE IF NOT EXISTS reservoir_wy_storage (
        reservoir_id TEXT NOT NULL,
        water_year INTEGER NOT NULL,
        min_af REAL, max_af REAL, mean_af REAL, year_end_af REAL,
        source_id TEXT NOT NULL,
        PRIMARY KEY (reservoir_id, water_year)
    );

    CREATE TABLE IF NOT EXISTS basin_storage_timeline (
        year INTEGER PRIMARY KEY,
        as_of_date TEXT NOT NULL,
        mead_maf REAL NOT NULL,
        powell_maf REAL NOT NULL,
        flaming_gorge_maf REAL NOT NULL,
        navajo_maf REAL NOT NULL,
        blue_mesa_maf REAL NOT NULL,
        dillon_maf REAL NOT NULL,
        granby_maf REAL NOT NULL,
        total_major_storage_maf REAL NOT NULL,
        source_id TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS lees_ferry_daily_recent (
        obs_date TEXT PRIMARY KEY,
        cfs REAL NOT NULL,
        source_id TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS station_normals_meta (
        station_id TEXT PRIMARY KEY,
        station_name TEXT,
        begin_yr INTEGER,
        end_yr INTEGER,
        count_nu INTEGER,
        source_id TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS station_daily_normals (
        station_id TEXT NOT NULL,
        mm_dd TEXT NOT NULL,
        mean_cfs REAL NOT NULL,
        PRIMARY KEY (station_id, mm_dd)
    );

    CREATE TABLE IF NOT EXISTS seasonal_heartbeats (
        doy INTEGER PRIMARY KEY,
        alpine_snowmelt REAL NOT NULL,
        front_range_tunnels REAL NOT NULL,
        monsoon_tributaries REAL NOT NULL,
        regulated_dam_releases REAL NOT NULL,
        lower_basin_canals REAL NOT NULL
    );

    CREATE TABLE IF NOT EXISTS seasonal_supply_demand (
        doy INTEGER PRIMARY KEY,
        supply_cfs REAL NOT NULL,
        demand_cfs REAL NOT NULL
    );

    CREATE TABLE IF NOT EXISTS seasonal_meta (
        meta_key TEXT PRIMARY KEY,
        meta_value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS tributary_summaries (
        station_id TEXT PRIMARY KEY,
        short_name TEXT NOT NULL,
        name TEXT NOT NULL,
        regime TEXT NOT NULL,
        is_terminal_inflow INTEGER NOT NULL,
        approx_miles_to_powell INTEGER NOT NULL,
        complete_water_years INTEGER NOT NULL,
        annual_maf REAL NOT NULL,
        inflow_share_pct REAL,
        rbi REAL NOT NULL,
        median_cfs REAL NOT NULL,
        max_daily_cfs REAL NOT NULL,
        max_daily_date TEXT NOT NULL,
        peak_to_median REAL NOT NULL,
        usgs_url TEXT NOT NULL,
        source_id TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS powell_hypsometry_curve (
        elev_ft INTEGER PRIMARY KEY,
        sample_elev_ft REAL NOT NULL,
        storage_af INTEGER NOT NULL,
        storage_maf REAL NOT NULL,
        af_per_ft INTEGER NOT NULL,
        k_af_per_ft REAL NOT NULL,
        rise_ft_per_100k_af REAL,
        sample_latest_date TEXT NOT NULL,
        n_samples INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS powell_hypsometry_meta (
        meta_key TEXT PRIMARY KEY,
        meta_value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS event_hydrograph_comparison (
        obs_date TEXT PRIMARY KEY,
        cisco_cfs REAL NOT NULL,
        dirty_devil_cfs REAL NOT NULL
    );

    CREATE TABLE IF NOT EXISTS event_hydrograph_meta (
        meta_key TEXT PRIMARY KEY,
        meta_value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS station_hierarchy (
        station_id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        station_type TEXT NOT NULL,
        tier_code TEXT NOT NULL,
        tier_label TEXT NOT NULL,
        tier_rank INTEGER NOT NULL,
        rbi REAL,
        regime TEXT NOT NULL,
        badge_class TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS dam_releases_latest (
        dam_key TEXT PRIMARY KEY,
        station_id TEXT NOT NULL,
        name TEXT NOT NULL,
        flow_cfs REAL,
        timestamp_utc TEXT,
        source TEXT NOT NULL,
        source_url TEXT NOT NULL,
        age_hours REAL,
        data_status TEXT,
        lat REAL,
        lon REAL,
        updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS replay_matrices (
        window_key TEXT PRIMARY KEY,
        generated_at TEXT NOT NULL,
        payload_json TEXT NOT NULL
    );
    """)

    # Add new columns to existing annual_lees_ferry / rbi_flashiness / ingestion_runs if needed
    for table, col, typ in [
        ("annual_lees_ferry", "natural_flow_af", "REAL"),
        ("annual_lees_ferry", "in_compact_era", "INTEGER DEFAULT 1"),
        ("annual_lees_ferry", "source_id", "TEXT"),
        ("rbi_flashiness", "complete_wys", "INTEGER"),
        ("rbi_flashiness", "period", "TEXT"),
        ("ingestion_runs", "validation_json", "TEXT"),
    ]:
        cols = {c[1] for c in cur.execute(f"PRAGMA table_info({table});").fetchall()}
        if cols and col not in cols:
            cur.execute(f"ALTER TABLE {table} ADD COLUMN {col} {typ};")

    cur.executescript("""
    CREATE VIEW IF NOT EXISTS view_reservoir_system_summary AS
    SELECT
        r.reservoir_id,
        r.name,
        r.category,
        r.capacity_af,
        t.storage_af,
        t.elevation_ft,
        ROUND(COALESCE(t.percent_full, r.capacity_pct), 1) AS capacity_pct,
        t.data_status,
        t.timestamp_utc
    FROM reservoirs r
    LEFT JOIN reservoirs_telemetry t ON r.reservoir_id = t.reservoir_id;

    CREATE VIEW IF NOT EXISTS view_compact_surplus_deficit AS
    SELECT
        water_year,
        natural_flow_maf,
        gaged_flow_maf,
        compact_allocation_maf,
        annual_surplus_deficit_maf,
        ten_year_rolling_mean_maf
    FROM annual_lees_ferry
    WHERE water_year >= 1922;
    """)


def populate_source_catalog(cur: sqlite3.Cursor) -> None:
    cur.execute("DELETE FROM source_catalog;")
    with open(MANIFEST_PATH, newline="", encoding="utf-8") as f:
        for r in csv.DictReader(f):
            cur.execute(
                """
                INSERT INTO source_catalog (
                    source_id, category, agency, title, period, period_basis,
                    locator_detail, official_url, doc_url, local_raw_path,
                    retrieved_at_utc, bytes, sha256, used_by_pages
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    r["source_id"], r["category"], r["agency"], r["title"],
                    r["period"], r["period_basis"], r["locator_summary"],
                    r["official_url"], r["official_url"], r["local_path"],
                    r["retrieved_at_utc"], int(r["bytes"]), r["sha256"], r["used_by_pages"],
                ),
            )

    # Register live API endpoints and static GIS layers for complete provenance
    live_and_gis = [
        (
            "usgs_nwis_iv", "live_api", "U.S. Geological Survey (NWIS)",
            "USGS Water Services Instantaneous Values (15-min telemetry & P7D/P30D replay)",
            "Live (15-60 min) / Rolling 7D & 30D", "Instantaneous UTC",
            "Endpoint /nwis/iv/?format=json&parameterCd=00060,00065 (74+ active gages)",
            "https://waterservices.usgs.gov/nwis/iv/?format=rdb&sites=09380000&parameterCd=00060",
            "https://waterservices.usgs.gov/docs/instantaneous-values/instantaneous-values-details/",
            None, None, None, None, "map_embed.html, telemetry.html, pipeline.html, data_sources.html",
        ),
        (
            "usgs_nwis_dv", "live_api", "U.S. Geological Survey (NWIS)",
            "USGS Water Services Daily Values (CAP, Morelos & Historical Flows)",
            "Daily / Monthly Delay (CAP & Morelos)", "Daily Mean",
            "Endpoint /nwis/dv/?format=json&parameterCd=00060 (09426650 CAP, 09522000 Morelos)",
            "https://waterservices.usgs.gov/nwis/dv/?format=rdb&sites=09380000&parameterCd=00060&startDT=2024-01-01",
            "https://waterservices.usgs.gov/docs/dv-service/daily-values-service-details/",
            None, None, None, None, "map_embed.html, telemetry.html, ml_analysis.html, data_sources.html",
        ),
        (
            "usbr_uc_hydrodata_live", "live_api", "U.S. Bureau of Reclamation (HydroData)",
            "USBR Upper Colorado HydroData Reservoir CSV Service (Sites 919, 921, 917, 920, 913)",
            "Daily (06:00 MST)", "Daily EOD",
            "CSV 17.csv (Storage AF) & 49.csv (Pool Elevation ft)",
            "https://www.usbr.gov/uc/water/hydrodata/reservoir_data/919/csv/17.csv",
            "https://www.usbr.gov/uc/water/hydrodata/reservoir_data/site_map.html",
            None, None, None, None, "index.html, telemetry.html, map_embed.html, data_sources.html",
        ),
        (
            "usbr_lc_hourly7", "live_api", "U.S. Bureau of Reclamation (Lower Colorado RiverOps)",
            "USBR Lower Colorado Hourly Dam Operations Teletype",
            "Hourly Teletype", "Hourly MST",
            "HTML table /riverops/hourly7.html (Hoover, Davis, Parker releases cfs & Mead elev)",
            "https://www.usbr.gov/lc/region/g4000/riverops/hourly7.html",
            "https://www.usbr.gov/lc/riverops.html",
            None, None, None, None, "map_embed.html, telemetry.html, pipeline.html, data_sources.html",
        ),
        (
            "cdwr_rest_hourly", "live_api", "Colorado Division of Water Resources (CDSS)",
            "Colorado DWR Telemetry Time Series REST API v2",
            "Hourly", "Hourly MST/MDT",
            "/Rest/GET/api/v2/telemetrystations/telemetrytimeserieshour (ADATUNCO, MOFTUNCO, ROBTUNCO, BOUTUNCO, DILRESCO, GRARESCO)",
            "https://dwr.state.co.us/Rest/GET/api/v2/telemetrystations/telemetrytimeserieshour/?format=json&abbrev=ROBTUNCO",
            "https://dwr.state.co.us/Rest/GET/Help",
            None, None, None, None, "map_embed.html, telemetry.html, pipeline.html, data_sources.html",
        ),
        (
            "gis_nhdplus_network", "gis_layer", "USGS National Hydrography Dataset Plus (NHDPlus HR)",
            "Static Cartographic River Network & Reservoir Polygons",
            "Static GIS Reference", "Cartographic",
            "web/data/river_network.geojson, lakes.geojson, powell_contours.geojson, tributaries/*.geojson",
            "https://www.usgs.gov/national-hydrography/nhdplus-high-resolution",
            "https://www.usgs.gov/national-hydrography/nhdplus-high-resolution",
            "web/data/river_network.geojson", None, None, None, "map_embed.html, data_sources.html",
        ),
    ]
    for row in live_and_gis:
        cur.execute(
            """
            INSERT INTO source_catalog (
                source_id, category, agency, title, period, period_basis,
                locator_detail, official_url, doc_url, local_raw_path,
                retrieved_at_utc, bytes, sha256, used_by_pages
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            row,
        )


def populate_annual_lees_ferry(cur: sqlite3.Cursor) -> dict[int, float]:
    xlsx_path = os.path.join(RAW_DIR, "usbr_natural_flow", "LFnatFlow1906-2024.2024.9.12.xlsx")
    sheets = parse_xlsx_sheets(xlsx_path)
    sh = next(iter(sheets.values()))
    wy_af = {}
    for rn in sorted(sh):
        r = sh[rn]
        try:
            wy = int(float(r.get(0, "")))
            af = float(r.get(1, ""))
            if 1906 <= wy <= 2030:
                wy_af[wy] = af
        except (TypeError, ValueError):
            continue

    lf_dv = load_usgs_dv_json(os.path.join(RAW_DIR, "usgs_baselines", "usgs_lees_ferry_09380000_dv.json")).get("09380000", {})
    gaged_by_wy = defaultdict(float)
    for dt, q in lf_dv.items():
        gaged_by_wy[water_year(dt)] += q * CFS_DAY_TO_MAF

    # Also update lees_ferry_daily_recent (2024-01-01 onwards)
    cur.execute("DELETE FROM lees_ferry_daily_recent;")
    for dt in sorted(lf_dv):
        if dt >= "2024-01-01":
            cur.execute(
                "INSERT INTO lees_ferry_daily_recent (obs_date, cfs, source_id) VALUES (?, ?, ?)",
                (dt, round(lf_dv[dt], 1), "usgs_lees_ferry_dv"),
            )

    cur.execute("DELETE FROM annual_lees_ferry;")
    sorted_wys = sorted(wy_af.keys())
    window = []
    for wy in sorted_wys:
        nat_af = wy_af[wy]
        nat_maf = round(nat_af / 1e6, 4)
        window.append(nat_maf)
        if len(window) > 10:
            window.pop(0)
        roll_10 = round(sum(window) / len(window), 4)
        gaged_maf = round(gaged_by_wy[wy], 4) if wy in gaged_by_wy else None
        surplus_def = round(nat_maf - 16.5, 4)
        cur.execute(
            """
            INSERT INTO annual_lees_ferry (
                water_year, natural_flow_maf, gaged_flow_maf, compact_allocation_maf,
                annual_surplus_deficit_maf, ten_year_rolling_mean_maf,
                natural_flow_af, in_compact_era, source_id
            ) VALUES (?, ?, ?, 16.5, ?, ?, ?, ?, 'usbr_lf_natflow_1906_2024')
            """,
            (wy, nat_maf, gaged_maf, surplus_def, roll_10, nat_af, 1 if wy >= 1922 else 0),
        )
    return {wy: wy_af[wy] / 1e6 for wy in sorted_wys}


def populate_cul_tables(cur: sqlite3.Cursor) -> None:
    # 1. Upper Basin CUL 1971-2024
    uc_path = os.path.join(RAW_DIR, "usbr_consumptive_use", "UpperColoradoCUL1971-2025_Summary.xlsx")
    uc = parse_xlsx_sheets(uc_path, {"Summary"})["Summary"]
    hdr = uc[4]
    yr_cols = {int(float(v)): k for k, v in hdr.items() if k >= 6 and str(v).strip()[:4].isdigit()}

    # Exact verified row map in Sheet 'Summary'
    uc_row_spec = [
        # (jurisdiction, sector, list_of_row_nums, row_ref_label)
        ("Arizona_Upper", "agriculture", [39, 87], "Rows 39+87 (Irr.Ag + Livestock/Stockpond)"),
        ("Arizona_Upper", "transbasin_export", [247], "Row 247 (Exports Outside System)"),
        ("Arizona_Upper", "mi_energy_minerals", [158, 175, 193], "Rows 158+175+193 (M&I + Power + Minerals)"),
        ("Arizona_Upper", "state_reservoir_evap", [137], "Row 137 (State Major+Minor Reservoir Evap)"),
        ("Arizona_Upper", "state_total", [8], "Row 8 (Arizona Upper Total)"),

        ("Colorado", "agriculture", [43, 91], "Rows 43+91 (Irr.Ag + Livestock/Stockpond)"),
        ("Colorado", "transbasin_export", [251], "Row 251 (Exports Outside System)"),
        ("Colorado", "mi_energy_minerals", [162, 179, 197], "Rows 162+179+197 (M&I + Power + Minerals)"),
        ("Colorado", "state_reservoir_evap", [141], "Row 141 (State Major+Minor Reservoir Evap)"),
        ("Colorado", "state_total", [12], "Row 12 (Colorado Total)"),

        ("New Mexico", "agriculture", [44, 92], "Rows 44+92 (Irr.Ag + Livestock/Stockpond)"),
        ("New Mexico", "transbasin_export", [252], "Row 252 (Exports Outside System)"),
        ("New Mexico", "mi_energy_minerals", [163, 180, 198], "Rows 163+180+198 (M&I + Power + Minerals)"),
        ("New Mexico", "state_reservoir_evap", [142], "Row 142 (State Major+Minor Reservoir Evap)"),
        ("New Mexico", "state_total", [13], "Row 13 (New Mexico Total)"),

        ("Utah", "agriculture", [48, 96], "Rows 48+96 (Irr.Ag + Livestock/Stockpond)"),
        ("Utah", "transbasin_export", [256], "Row 256 (Exports Outside System)"),
        ("Utah", "mi_energy_minerals", [167, 184, 202], "Rows 167+184+202 (M&I + Power + Minerals)"),
        ("Utah", "state_reservoir_evap", [146], "Row 146 (State Major+Minor Reservoir Evap)"),
        ("Utah", "state_total", [17], "Row 17 (Utah Total)"),

        ("Wyoming", "agriculture", [49, 97], "Rows 49+97 (Irr.Ag + Livestock/Stockpond)"),
        ("Wyoming", "transbasin_export", [257], "Row 257 (Exports Outside System)"),
        ("Wyoming", "mi_energy_minerals", [168, 185, 203], "Rows 168+185+203 (M&I + Power + Minerals)"),
        ("Wyoming", "state_reservoir_evap", [147], "Row 147 (State Major+Minor Reservoir Evap)"),
        ("Wyoming", "state_total", [18], "Row 18 (Wyoming Total)"),

        ("CRSP_Mainstem", "evap_flaming_gorge", [24], "Row 24 (Undistributed CRSP Evap: Flaming Gorge)"),
        ("CRSP_Mainstem", "evap_blue_mesa", [25], "Row 25 (Undistributed CRSP Evap: Blue Mesa)"),
        ("CRSP_Mainstem", "evap_morrow_point", [26], "Row 26 (Undistributed CRSP Evap: Morrow Point)"),
        ("CRSP_Mainstem", "evap_lake_powell", [27], "Row 27 (Undistributed CRSP Evap: Lake Powell)"),
        ("CRSP_Mainstem", "evap_total", [23], "Row 23 (CU&L Undistributed Reservoir Evaporation)"),
        ("Upper_Basin_Total", "grand_total", [6], "Row 6 (Total Upper Basin CUL incl. CRSP Evap)"),
    ]

    cur.execute("DELETE FROM cul_upper_annual;")
    for yr in range(1971, 2025):
        col = yr_cols[yr]
        for jur, sec, rnums, rref in uc_row_spec:
            val_af = sum(float(uc[rn].get(col, 0) or 0) for rn in rnums)
            cur.execute(
                """
                INSERT INTO cul_upper_annual (
                    water_or_cal_year, jurisdiction, sector, value_af, source_id, sheet_name, row_ref
                ) VALUES (?, ?, ?, ?, 'usbr_uc_cul_1971_2024', 'Summary', ?)
                """,
                (yr, jur, sec, val_af, rref),
            )

    # 2. Lower Basin CUL 1971-2024
    lc_path = os.path.join(RAW_DIR, "usbr_consumptive_use", "LowerColoradoCUL1971-2024_Data.xlsx")
    lc_sheets = parse_xlsx_sheets(lc_path, {"Area_Reference", "Mainstream", "Mainstream_Reservoirs", "Mexico", "Tributary"})

    def tab_dicts(sh):
        hdr_row = sh[min(sh)]
        hdr_map = {k: v.strip() for k, v in hdr_row.items()}
        out = []
        for rn in sorted(sh):
            if rn == min(sh):
                continue
            r = sh[rn]
            if r:
                out.append({hdr_map[k]: r[k] for k in r if k in hdr_map})
        return out

    area_map = {r["NODE_CODE"]: r["REPORTING_AREA"] for r in tab_dicts(lc_sheets["Area_Reference"])}

    agg = defaultdict(float)
    for r in tab_dicts(lc_sheets["Mainstream"]):
        yr = int(float(r.get("YEAR", 0)))
        if 1971 <= yr <= 2024:
            tot = sum(float(r.get(m, 0) or 0) for m in LC_MONTHS)
            agg[(yr, "Mainstream", r["STATE_NAME"], r["CALC_TYPE"])] += tot

    for r in tab_dicts(lc_sheets["Mainstream_Reservoirs"]):
        yr = int(float(r.get("YEAR", 0)))
        if 1971 <= yr <= 2024:
            tot = sum(float(r.get(m, 0) or 0) for m in LC_MONTHS)
            agg[(yr, "Mainstream_Reservoirs", "System_Water", r["RESERVOIR_NAME"])] += tot

    for r in tab_dicts(lc_sheets["Mexico"]):
        yr = int(float(r.get("YEAR", 0)))
        if 1971 <= yr <= 2024:
            tot = sum(float(r.get(m, 0) or 0) for m in LC_MONTHS)
            agg[(yr, "Mexico", "Mexico", r["DELIVERY_TYPE"])] += tot

    for r in tab_dicts(lc_sheets["Tributary"]):
        yr = int(float(r.get("Year", 0)))
        if 1971 <= yr <= 2024:
            area = area_map.get(r["NODE_CODE"], "UNKNOWN")
            if area == "Gila":
                tot = sum(float(r.get(m, 0) or 0) for m in LC_MONTHS)
                agg[(yr, "Tributary", "Gila_Basin", "TOTAL_TRIB_CUL")] += tot

    cur.execute("DELETE FROM cul_lower_annual;")
    for (yr, tab, jur, sec), val_af in agg.items():
        cur.execute(
            """
            INSERT INTO cul_lower_annual (cal_year, tab_name, jurisdiction, sector, value_af, source_id)
            VALUES (?, ?, ?, ?, ?, 'usbr_lc_cul_1971_2024')
            """,
            (yr, tab, jur, sec, val_af),
        )


def populate_water_budget(cur: sqlite3.Cursor) -> None:
    """Compute CY/WY 2000-2024 water budget directly from SQLite tables & archived gages/storage."""
    def uc_mean(jur, sec):
        row = cur.execute(
            "SELECT AVG(value_af)/1e6 FROM cul_upper_annual WHERE water_or_cal_year BETWEEN ? AND ? AND jurisdiction=? AND sector=?",
            (BUDGET_START_YR, BUDGET_END_YR, jur, sec),
        ).fetchone()
        return float(row[0] or 0.0)

    def lc_mean(tab, jur, sec):
        row = cur.execute(
            "SELECT AVG(value_af)/1e6 FROM cul_lower_annual WHERE cal_year BETWEEN ? AND ? AND tab_name=? AND jurisdiction=? AND sector=?",
            (BUDGET_START_YR, BUDGET_END_YR, tab, jur, sec),
        ).fetchone()
        return float(row[0] or 0.0)

    lf_nat_maf = float(
        cur.execute(
            "SELECT AVG(natural_flow_maf) FROM annual_lees_ferry WHERE water_year BETWEEN ? AND ?",
            (BUDGET_START_YR, BUDGET_END_YR),
        ).fetchone()[0]
    )

    # Lower mainstem gaged tributaries CY 2000-2024 from archived USGS dv
    budget_gages = load_usgs_dv_json(os.path.join(RAW_DIR, "usgs_baselines", "usgs_budget_and_inflow_gages_dv.json"))
    trib_means = {}
    for sid in ("09382000", "09402000", "09415000", "09419000", "09426000"):
        tot_af = sum(q * CFS_DAY_TO_AF for dt, q in budget_gages[sid].items() if BUDGET_START_YR <= int(dt[:4]) <= BUDGET_END_YR)
        trib_means[sid] = tot_af / BUDGET_N_YRS / 1e6
    lb_tribs_maf = sum(trib_means.values())

    # Dated 5-reservoir storage change: (BUDGET_START_YR-1)-12-31 -> BUDGET_END_YR-12-31 (in MAF/yr)
    start_eoy = f"{BUDGET_START_YR - 1}-12-31"
    end_eoy = f"{BUDGET_END_YR}-12-31"
    res_files = {
        "lake_powell": "usbr_919_powell_17_storage.csv",
        "lake_mead": "usbr_921_mead_17_storage.csv",
        "flaming_gorge": "usbr_917_flaming_gorge_17_storage.csv",
        "navajo_reservoir": "usbr_920_navajo_17_storage.csv",
        "blue_mesa": "usbr_913_blue_mesa_17_storage.csv",
    }
    ds_by_res = {}
    for rid, fn in res_files.items():
        dmap = dict(load_usbr_csv_series(os.path.join(RAW_DIR, "reservoirs", fn)))
        ds_by_res[rid] = (dmap[end_eoy] - dmap[start_eoy]) / BUDGET_N_YRS / 1e6
    net_drawdown_maf = -sum(ds_by_res.values())  # positive = storage drawdown supplying demand

    # Upper Basin states & sectors
    ub_states = ["Colorado", "Utah", "Wyoming", "New Mexico", "Arizona_Upper"]
    ub_state_totals = {s: uc_mean(s, "state_total") for s in ub_states}
    ub_ag = sum(uc_mean(s, "agriculture") for s in ub_states)
    ub_exp = sum(uc_mean(s, "transbasin_export") for s in ub_states)
    ub_mi_res = sum(uc_mean(s, "mi_energy_minerals") + uc_mean(s, "state_reservoir_evap") for s in ub_states)
    ub_crsp_evap = uc_mean("CRSP_Mainstem", "evap_total")
    ub_total_cul = uc_mean("Upper_Basin_Total", "grand_total")

    # Upper Basin delivery to Lower Basin implied by Natural Flow minus Upper CUL
    lf_implied_delivery_maf = lf_nat_maf - ub_total_cul

    # Lower Basin states & sectors
    ca_out = lc_mean("Mainstream", "California", "OUTSIDE_SYSTEM")
    ca_ag = lc_mean("Mainstream", "California", "AGRICULTURE")
    ca_mi = lc_mean("Mainstream", "California", "M_I_OTHER")
    ca_tot = ca_out + ca_ag + ca_mi

    az_within = lc_mean("Mainstream", "Arizona", "WITHIN_SYSTEM")
    az_ag = lc_mean("Mainstream", "Arizona", "AGRICULTURE")
    az_mi = lc_mean("Mainstream", "Arizona", "M_I_OTHER")
    az_tot = az_within + az_ag + az_mi

    nv_ag = lc_mean("Mainstream", "Nevada", "AGRICULTURE")
    nv_mi = lc_mean("Mainstream", "Nevada", "M_I_OTHER") + lc_mean("Mainstream", "Nevada", "TEP")
    nv_tot = nv_ag + nv_mi

    lb_onriver_ag = ca_ag + az_ag + nv_ag
    lb_mi = ca_mi + az_mi + nv_mi

    lb_res_evap = sum(
        lc_mean("Mainstream_Reservoirs", "System_Water", r)
        for r in ("LAKE_MEAD", "LAKE_MOHAVE", "LAKE_HAVASU", "DIVERSION_DAMS", "SENATOR_WASH")
    )
    mainstem_evap_tot = ub_crsp_evap + lb_res_evap

    mx_treaty = lc_mean("Mexico", "Mexico", "DELIVERIES_TO_MEXICO_IN_SATISFACTION_OF_TREATY")
    mx_min242 = lc_mean("Mexico", "Mexico", "WATER_BYPASSED_PURSUANT_TO_MINUTE_242_OF_THE_IBWC")
    mx_excess = lc_mean("Mexico", "Mexico", "TO_MEXICO_IN_EXCESS_OF_TREATY")
    mx_tot = mx_treaty + mx_min242 + mx_excess

    total_depletions_maf = ub_total_cul + ca_tot + az_tot + nv_tot + lb_res_evap + mx_tot
    total_measured_inflow_maf = lf_nat_maf + lb_tribs_maf
    residual_maf = total_depletions_maf - (total_measured_inflow_maf + net_drawdown_maf)

    lb_pool_maf = lf_implied_delivery_maf + lb_tribs_maf + net_drawdown_maf + residual_maf
    gila_cul_maf = lc_mean("Tributary", "Gila_Basin", "TOTAL_TRIB_CUL")
    lf_gaged_maf = float(
        cur.execute(
            "SELECT AVG(gaged_flow_maf) FROM annual_lees_ferry WHERE water_year BETWEEN ? AND ?",
            (BUDGET_START_YR, BUDGET_END_YR),
        ).fetchone()[0]
    )
    win = f"{BUDGET_START_YR}-{BUDGET_END_YR}"

    # Populate water_budget_nodes
    cur.execute("DELETE FROM water_budget_nodes;")
    nodes = [
        # Col 0
        ("Upper Basin Natural Flow (Lees Ferry)", "Upper Basin Natural Flow (Lees Ferry)", 0, "inflow", "upper",
         lf_nat_maf, f"Unimpaired USBR Lees Ferry natural flow (WY {win} 25-year mean).", None,
         "09380000", "USBR Natural Flow / USGS #09380000", "https://www.usbr.gov/lc/region/g4000/NaturalFlow/LFnatFlow1906-2024.2024.9.12.xlsx",
         "usbr_lf_natflow_1906_2024", f"Sheet1, WY {win}"),
        ("Lower Mainstem Gaged Tributaries", "Lower Mainstem Gaged Tributaries", 0, "inflow", "lower",
         lb_tribs_maf, f"USGS CY {win} gaged mainstem tributaries: Virgin ({trib_means['09415000']:.2f}), Little CO ({trib_means['09402000']:.2f}), Bill Williams ({trib_means['09426000']:.2f}), Muddy ({trib_means['09419000']:.2f}), Paria ({trib_means['09382000']:.2f}).", None,
         "09415000", "USGS Lower Mainstem Tributaries", f"https://waterservices.usgs.gov/nwis/dv/?format=rdb&sites=09382000,09402000,09415000,09419000,09426000&parameterCd=00060&startDT={BUDGET_START_YR}-01-01&endDT={BUDGET_END_YR}-12-31",
         "usgs_water_budget_gages_dv", f"5 Lower Mainstem Tributary Gages, CY {win}"),
        ("Net Reservoir Storage Drawdown", "Net Reservoir Storage Drawdown", 0, "deficit", "lower",
         net_drawdown_maf, f"Measured 5-reservoir change ({start_eoy} to {end_eoy}, 29.76 MAF total): Mead {ds_by_res['lake_mead']:+.2f}, Powell {ds_by_res['lake_powell']:+.2f}, FG/Navajo/BM {ds_by_res['flaming_gorge']+ds_by_res['navajo_reservoir']+ds_by_res['blue_mesa']:+.2f} MAF/yr.", None,
         "lake_mead", "USBR HydroData Storage (17.csv)", "https://www.usbr.gov/uc/water/hydrodata/reservoir_data/921/csv/17.csv",
         "usbr_921_mead_stor", f"921/919/917/920/913 17.csv, {start_eoy} to {end_eoy}"),
        ("Ungaged Side Inflows & Residual", "Ungaged Side Inflows & Residual", 0, "inflow", "lower",
         residual_maf, f"Closure residual ({abs(residual_maf)/total_depletions_maf*100:.1f}%): ungaged Grand Canyon springs, side washes, LV Wash runoff & WY/CY boundary offset.", None,
         None, "Mass-Balance Closure Residual", None,
         "usbr_lc_cul_1971_2024", "Derived: Total Depletions - (Natural Flow + Gaged Tribs + Net Storage Drawdown)"),

        # Col 1
        ("Upper Basin Depletions & CRSP Evap", "Upper Basin Depletions & CRSP Evap", 1, "inflow", "upper",
         ub_total_cul, f"USBR Upper Colorado CUL CY {win}: {sum(ub_state_totals.values()):.2f} MAF state uses + {ub_crsp_evap:.2f} MAF CRSP mainstem evap.", None,
         "09095500", "USBR Upper Basin CUL", "https://www.usbr.gov/uc/DocLibrary/Reports/ConsumptiveUsesLosses/20251201-UpperColoradoCUL1971-2025_v24.5_MajorTribSummary-DataSummariesFigures.xlsx",
         "usbr_uc_cul_1971_2024", f"Summary Row 6, CY {win}"),
        ("Lower Basin Mainstream & Treaty Pool", "Lower Basin Mainstream & Treaty Pool", 1, "inflow", "lower",
         lb_pool_maf, f"Lees Ferry delivery ({lf_implied_delivery_maf:.2f} MAF net; {lf_gaged_maf:.2f} MAF USGS gaged incl. Powell drawdown) + Lower tribs + storage drawdown + ungaged.", None,
         "lake_mead", "USBR Lower Colorado CUL", "https://www.usbr.gov/lc/region/g4000/4200Rpts/CULReport/1971-2024%20Lower%20Colorado%20River%20System%20CUL%20Data.xlsx",
         "usbr_lc_cul_1971_2024", f"Lower CUL Mainstream + Reservoirs + Mexico, CY {win}"),

        # Col 2
        ("Upper Basin In-Basin Agriculture", "Upper Basin In-Basin Agriculture", 2, "ag", "upper",
         ub_ag, "Irrigated agriculture, livestock & stockponds across CO, UT, WY, NM, AZ (Upper).", None,
         "09095500", "USBR Upper CUL Ag", "https://www.usbr.gov/uc/DocLibrary/Reports/ConsumptiveUsesLosses/20251201-UpperColoradoCUL1971-2025_v24.5_MajorTribSummary-DataSummariesFigures.xlsx",
         "usbr_uc_cul_1971_2024", "Summary Rows 39-49 + 87-97"),
        ("Upper Basin Trans-Basin Exports", "Upper Basin Trans-Basin Exports", 2, "municipal", "upper",
         ub_exp, f"Exports outside system: CO ({uc_mean('Colorado','transbasin_export'):.2f}), UT ({uc_mean('Utah','transbasin_export'):.2f}), NM ({uc_mean('New Mexico','transbasin_export'):.2f}), WY ({uc_mean('Wyoming','transbasin_export'):.2f}).", None,
         "ROBTUNCO", "USBR Outside-System Exports", "https://www.usbr.gov/uc/DocLibrary/Reports/ConsumptiveUsesLosses/20251201-UpperColoradoCUL1971-2025_v24.5_MajorTribSummary-DataSummariesFigures.xlsx",
         "usbr_uc_cul_1971_2024", "Summary Rows 247-257"),
        ("Upper Basin M&I, Energy & Local Reservoirs", "Upper Basin M&I, Energy & Local Reservoirs", 2, "municipal", "upper",
         ub_mi_res, "Upper Basin in-basin M&I, thermal power, minerals & state-level minor/major reservoir evaporation.", None,
         "09368000", "USBR Upper CUL M&I/Power", "https://www.usbr.gov/uc/DocLibrary/Reports/ConsumptiveUsesLosses/20251201-UpperColoradoCUL1971-2025_v24.5_MajorTribSummary-DataSummariesFigures.xlsx",
         "usbr_uc_cul_1971_2024", "Summary Rows 137-203"),
        ("Mainstem Reservoir Evaporation", "Mainstem Reservoir Evaporation", 2, "loss", "lower",
         mainstem_evap_tot, f"Powell/FG/Aspinall CRSP ({ub_crsp_evap:.2f}) + Mead/Mohave/Havasu/Dams ({lb_res_evap:.2f}) open-water evap.", None,
         "lake_powell", "USBR CRSP & LC Reservoir Evap", "https://www.usbr.gov/lc/region/g4000/4200Rpts/CULReport/1971-2024%20Lower%20Colorado%20River%20System%20CUL%20Data.xlsx",
         "usbr_lc_cul_1971_2024", "UC Summary R23 + LC Mainstream_Reservoirs"),
        ("California Outside-System Exports (AAC & CRA)", "California Outside-System Exports (AAC & CRA)", 2, "ag", "lower",
         ca_out, "USBR OUTSIDE_SYSTEM: Imperial/Coachella Salton Trough agriculture (AAC) & MWD coastal SoCal (CRA).", None,
         "09527700", "USBR LC Mainstream CA", "https://www.usbr.gov/lc/region/g4000/4200Rpts/CULReport/1971-2024%20Lower%20Colorado%20River%20System%20CUL%20Data.xlsx",
         "usbr_lc_cul_1971_2024", "Mainstream Tab: CA OUTSIDE_SYSTEM"),
        ("Central Arizona Project (Interior Transfer)", "Central Arizona Project (Interior Transfer)", 2, "municipal", "lower",
         az_within, "USBR AZ WITHIN_SYSTEM: CAP Canal deliveries to Maricopa, Pinal & Pima counties.", None,
         "09426650", "USGS #09426650 / USBR LC", "https://www.usbr.gov/lc/region/g4000/4200Rpts/CULReport/1971-2024%20Lower%20Colorado%20River%20System%20CUL%20Data.xlsx",
         "usbr_lc_cul_1971_2024", "Mainstream Tab: AZ WITHIN_SYSTEM"),
        ("Lower River On-Mainstem Agriculture", "Lower River On-Mainstem Agriculture", 2, "ag", "lower",
         lb_onriver_ag, f"Yuma/Wellton-Mohawk/CRIT AZ ({az_ag:.2f}), Palo Verde/Yuma CA ({ca_ag:.2f}), NV ({nv_ag:.3f}).", None,
         "USBR-PARKER", "USBR LC Mainstream Ag", "https://www.usbr.gov/lc/region/g4000/4200Rpts/CULReport/1971-2024%20Lower%20Colorado%20River%20System%20CUL%20Data.xlsx",
         "usbr_lc_cul_1971_2024", "Mainstream Tab: AGRICULTURE"),
        ("Lower River In-Basin M&I (SNWA & Cities)", "Lower River In-Basin M&I (SNWA & Cities)", 2, "municipal", "lower",
         lb_mi, f"Nevada SNWA net ({nv_mi:.2f}) plus Arizona ({az_mi:.2f}) & California ({ca_mi:.3f}) river-corridor M&I.", None,
         "lake_mead", "USBR LC Mainstream M&I", "https://www.usbr.gov/lc/region/g4000/4200Rpts/CULReport/1971-2024%20Lower%20Colorado%20River%20System%20CUL%20Data.xlsx",
         "usbr_lc_cul_1971_2024", "Mainstream Tab: M_I_OTHER + TEP"),
        ("Morelos Dam & Border Deliveries (Mexico)", "Morelos Dam & Border Deliveries (Mexico)", 2, "treaty", "lower",
         mx_tot, f"1944 Treaty satisfaction ({mx_treaty:.2f}), Minute 242 bypass ({mx_min242:.2f}), excess ({mx_excess:.2f}).", None,
         "09522000", "USBR LC Mexico Tab", "https://www.usbr.gov/lc/region/g4000/4200Rpts/CULReport/1971-2024%20Lower%20Colorado%20River%20System%20CUL%20Data.xlsx",
         "usbr_lc_cul_1971_2024", "Mexico Tab: TOTAL"),

        # Col 3
        ("Colorado", "Colorado", 3, "ag", "upper",
         ub_state_totals["Colorado"], f"USBR Upper CUL CY {win} state total (excludes shared CRSP evap).",
         json.dumps([
             f"- In-Basin Ag: {uc_mean('Colorado','agriculture'):.2f}",
             f"- Outside Exports: {uc_mean('Colorado','transbasin_export'):.2f}",
             f"- M&I / Energy / Res Evap: {uc_mean('Colorado','mi_energy_minerals')+uc_mean('Colorado','state_reservoir_evap'):.2f}",
         ]),
         "09095500", "USBR Upper CUL (CO)", "https://www.usbr.gov/uc/DocLibrary/Reports/ConsumptiveUsesLosses/20251201-UpperColoradoCUL1971-2025_v24.5_MajorTribSummary-DataSummariesFigures.xlsx",
         "usbr_uc_cul_1971_2024", "Summary Row 12"),
        ("Utah", "Utah", 3, "ag", "upper",
         ub_state_totals["Utah"], f"USBR Upper CUL CY {win} state total.",
         json.dumps([
             f"- In-Basin Ag: {uc_mean('Utah','agriculture'):.2f}",
             f"- Outside Exports (CUP): {uc_mean('Utah','transbasin_export'):.2f}",
             f"- M&I / Energy / Res Evap: {uc_mean('Utah','mi_energy_minerals')+uc_mean('Utah','state_reservoir_evap'):.2f}",
         ]),
         "09315000", "USBR Upper CUL (UT)", "https://www.usbr.gov/uc/DocLibrary/Reports/ConsumptiveUsesLosses/20251201-UpperColoradoCUL1971-2025_v24.5_MajorTribSummary-DataSummariesFigures.xlsx",
         "usbr_uc_cul_1971_2024", "Summary Row 17"),
        ("Wyoming", "Wyoming", 3, "ag", "upper",
         ub_state_totals["Wyoming"], f"USBR Upper CUL CY {win} state total.",
         json.dumps([f"- In-Basin Ag: {uc_mean('Wyoming','agriculture'):.2f}", f"- Energy/M&I/Exp/Evap: {ub_state_totals['Wyoming']-uc_mean('Wyoming','agriculture'):.2f}"]),
         "09211200", "USBR Upper CUL (WY)", "https://www.usbr.gov/uc/DocLibrary/Reports/ConsumptiveUsesLosses/20251201-UpperColoradoCUL1971-2025_v24.5_MajorTribSummary-DataSummariesFigures.xlsx",
         "usbr_uc_cul_1971_2024", "Summary Row 18"),
        ("New Mexico", "New Mexico", 3, "ag", "upper",
         ub_state_totals["New Mexico"], f"USBR Upper CUL CY {win} state total.",
         json.dumps([f"- In-Basin Ag: {uc_mean('New Mexico','agriculture'):.2f}", f"- Exports & Energy/Evap: {ub_state_totals['New Mexico']-uc_mean('New Mexico','agriculture'):.2f}"]),
         "09368000", "USBR Upper CUL (NM)", "https://www.usbr.gov/uc/DocLibrary/Reports/ConsumptiveUsesLosses/20251201-UpperColoradoCUL1971-2025_v24.5_MajorTribSummary-DataSummariesFigures.xlsx",
         "usbr_uc_cul_1971_2024", "Summary Row 13"),
        ("Arizona (Upper)", "Arizona (Upper)", 3, "municipal", "upper",
         ub_state_totals["Arizona_Upper"], f"USBR Upper CUL CY {win} Arizona Upper Basin share (0.05 MAF statutory cap).",
         json.dumps([f"- Power/M&I/Ag/Evap: {ub_state_totals['Arizona_Upper']:.3f}"]),
         "09380000", "USBR Upper CUL (AZ)", "https://www.usbr.gov/uc/DocLibrary/Reports/ConsumptiveUsesLosses/20251201-UpperColoradoCUL1971-2025_v24.5_MajorTribSummary-DataSummariesFigures.xlsx",
         "usbr_uc_cul_1971_2024", "Summary Row 8"),

        ("California", "California", 3, "ag", "lower",
         ca_tot, f"USBR Lower CUL CY {win} mainstream consumptive use (AAC + CRA + Palo Verde/Yuma).",
         json.dumps([f"- Outside-System (AAC/CRA): {ca_out:.2f}", f"- On-River Ag & M&I: {ca_ag+ca_mi:.2f}"]),
         "09527700", "USBR Lower CUL (CA)", "https://www.usbr.gov/lc/region/g4000/4200Rpts/CULReport/1971-2024%20Lower%20Colorado%20River%20System%20CUL%20Data.xlsx",
         "usbr_lc_cul_1971_2024", "Mainstream Tab (CA)"),
        ("Arizona (Lower)", "Arizona (Lower)", 3, "ag", "lower",
         az_tot, f"USBR Lower CUL CY {win} mainstream consumptive use (excludes Gila Basin).",
         json.dumps([f"- CAP (Within-System): {az_within:.2f}", f"- On-River Ag & M&I: {az_ag+az_mi:.2f}"]),
         "09426650", "USBR Lower CUL (AZ)", "https://www.usbr.gov/lc/region/g4000/4200Rpts/CULReport/1971-2024%20Lower%20Colorado%20River%20System%20CUL%20Data.xlsx",
         "usbr_lc_cul_1971_2024", "Mainstream Tab (AZ)"),
        ("Nevada", "Nevada", 3, "municipal", "lower",
         nv_tot, f"USBR Lower CUL CY {win} net mainstream consumptive use (after Las Vegas Wash return credits).",
         json.dumps([f"- SNWA M&I / TEP: {nv_mi:.2f}", f"- On-River Ag: {nv_ag:.3f}"]),
         "lake_mead", "USBR Lower CUL (NV)", "https://www.usbr.gov/lc/region/g4000/4200Rpts/CULReport/1971-2024%20Lower%20Colorado%20River%20System%20CUL%20Data.xlsx",
         "usbr_lc_cul_1971_2024", "Mainstream Tab (NV)"),
        ("1944 Mexico Treaty", "Mexico", 3, "treaty", "lower",
         mx_tot, f"USBR Mexico Tab CY {win} measured deliveries at international boundary.",
         json.dumps([f"- Treaty Satisfaction: {mx_treaty:.2f}", f"- Min. 242 Bypass & Excess: {mx_min242+mx_excess:.2f}"]),
         "09522000", "USBR Lower CUL (Mexico)", "https://www.usbr.gov/lc/region/g4000/4200Rpts/CULReport/1971-2024%20Lower%20Colorado%20River%20System%20CUL%20Data.xlsx",
         "usbr_lc_cul_1971_2024", "Mexico Tab"),
        ("System Mainstem Evaporation", "Mainstem Evap", 3, "loss", "lower",
         mainstem_evap_tot, f"Combined USBR Upper CRSP ({ub_crsp_evap:.2f}) & Lower Mainstream ({lb_res_evap:.2f}) open-water reservoir evaporation.",
         json.dumps([f"- Upper CRSP (Powell/FG): {ub_crsp_evap:.2f}", f"- Lower (Mead/Mohave/Hav): {lb_res_evap:.2f}"]),
         "lake_mead", "USBR UC + LC Evap", "https://www.usbr.gov/lc/region/g4000/4200Rpts/CULReport/1971-2024%20Lower%20Colorado%20River%20System%20CUL%20Data.xlsx",
         "usbr_lc_cul_1971_2024", "UC Summary R23 + LC Mainstream_Reservoirs"),
    ]
    for n in nodes:
        cur.execute(
            """
            INSERT INTO water_budget_nodes (
                node_id, name, display_name, col_tier, category, basin, maf_yr,
                summary, breakdowns_json, station_id, station_label, portal_url, source_id, locator
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (n[0], *n),
        )

    # Populate links ensuring exact node inflow == outflow conservation
    cur.execute("DELETE FROM water_budget_links;")
    links = [
        # Col 0 -> Col 1
        ("Upper Basin Natural Flow (Lees Ferry)", "Upper Basin Depletions & CRSP Evap", ub_total_cul, "inflow", "usbr_uc_cul_1971_2024", "Summary Row 6"),
        ("Upper Basin Natural Flow (Lees Ferry)", "Lower Basin Mainstream & Treaty Pool", lf_implied_delivery_maf, "inflow", "usbr_lf_natflow_1906_2024", "Lees Ferry Natural Flow - Upper CUL"),
        ("Lower Mainstem Gaged Tributaries", "Lower Basin Mainstream & Treaty Pool", lb_tribs_maf, "inflow", "usgs_water_budget_gages_dv", "5 Lower Mainstem Tributaries"),
        ("Net Reservoir Storage Drawdown", "Lower Basin Mainstream & Treaty Pool", net_drawdown_maf, "deficit", "usbr_921_mead_stor", f"5-Reservoir dS {start_eoy} to {end_eoy}"),
        ("Ungaged Side Inflows & Residual", "Lower Basin Mainstream & Treaty Pool", residual_maf, "inflow", "usbr_lc_cul_1971_2024", "Mass-Balance Closure Residual"),

        # Col 1 -> Col 2
        ("Upper Basin Depletions & CRSP Evap", "Upper Basin In-Basin Agriculture", ub_ag, "ag", "usbr_uc_cul_1971_2024", "Summary Rows 39-49 + 87-97"),
        ("Upper Basin Depletions & CRSP Evap", "Upper Basin Trans-Basin Exports", ub_exp, "municipal", "usbr_uc_cul_1971_2024", "Summary Rows 247-257"),
        ("Upper Basin Depletions & CRSP Evap", "Upper Basin M&I, Energy & Local Reservoirs", ub_mi_res, "municipal", "usbr_uc_cul_1971_2024", "Summary Rows 137-203"),
        ("Upper Basin Depletions & CRSP Evap", "Mainstem Reservoir Evaporation", ub_crsp_evap, "loss", "usbr_uc_cul_1971_2024", "Summary Row 23 (CRSP)"),

        ("Lower Basin Mainstream & Treaty Pool", "Mainstem Reservoir Evaporation", lb_res_evap, "loss", "usbr_lc_cul_1971_2024", "Mainstream_Reservoirs Tab"),
        ("Lower Basin Mainstream & Treaty Pool", "California Outside-System Exports (AAC & CRA)", ca_out, "ag", "usbr_lc_cul_1971_2024", "Mainstream Tab CA OUTSIDE_SYSTEM"),
        ("Lower Basin Mainstream & Treaty Pool", "Central Arizona Project (Interior Transfer)", az_within, "municipal", "usbr_lc_cul_1971_2024", "Mainstream Tab AZ WITHIN_SYSTEM"),
        ("Lower Basin Mainstream & Treaty Pool", "Lower River On-Mainstem Agriculture", lb_onriver_ag, "ag", "usbr_lc_cul_1971_2024", "Mainstream Tab AGRICULTURE"),
        ("Lower Basin Mainstream & Treaty Pool", "Lower River In-Basin M&I (SNWA & Cities)", lb_mi, "municipal", "usbr_lc_cul_1971_2024", "Mainstream Tab M_I_OTHER + TEP"),
        ("Lower Basin Mainstream & Treaty Pool", "Morelos Dam & Border Deliveries (Mexico)", mx_tot, "treaty", "usbr_lc_cul_1971_2024", "Mexico Tab TOTAL"),

        # Col 2 -> Col 3 (Upper States)
        ("Upper Basin In-Basin Agriculture", "Colorado", uc_mean("Colorado", "agriculture"), "ag", "usbr_uc_cul_1971_2024", "Summary Rows 43+91"),
        ("Upper Basin In-Basin Agriculture", "Utah", uc_mean("Utah", "agriculture"), "ag", "usbr_uc_cul_1971_2024", "Summary Rows 48+96"),
        ("Upper Basin In-Basin Agriculture", "Wyoming", uc_mean("Wyoming", "agriculture"), "ag", "usbr_uc_cul_1971_2024", "Summary Rows 49+97"),
        ("Upper Basin In-Basin Agriculture", "New Mexico", uc_mean("New Mexico", "agriculture"), "ag", "usbr_uc_cul_1971_2024", "Summary Rows 44+92"),
        ("Upper Basin In-Basin Agriculture", "Arizona (Upper)", uc_mean("Arizona_Upper", "agriculture"), "ag", "usbr_uc_cul_1971_2024", "Summary Rows 39+87"),

        ("Upper Basin Trans-Basin Exports", "Colorado", uc_mean("Colorado", "transbasin_export"), "municipal", "usbr_uc_cul_1971_2024", "Summary Row 251"),
        ("Upper Basin Trans-Basin Exports", "Utah", uc_mean("Utah", "transbasin_export"), "municipal", "usbr_uc_cul_1971_2024", "Summary Row 256"),
        ("Upper Basin Trans-Basin Exports", "Wyoming", uc_mean("Wyoming", "transbasin_export"), "municipal", "usbr_uc_cul_1971_2024", "Summary Row 257"),
        ("Upper Basin Trans-Basin Exports", "New Mexico", uc_mean("New Mexico", "transbasin_export"), "municipal", "usbr_uc_cul_1971_2024", "Summary Row 252"),

        ("Upper Basin M&I, Energy & Local Reservoirs", "Colorado", uc_mean("Colorado", "mi_energy_minerals") + uc_mean("Colorado", "state_reservoir_evap"), "municipal", "usbr_uc_cul_1971_2024", "Summary Rows 141+162+179+197"),
        ("Upper Basin M&I, Energy & Local Reservoirs", "Utah", uc_mean("Utah", "mi_energy_minerals") + uc_mean("Utah", "state_reservoir_evap"), "municipal", "usbr_uc_cul_1971_2024", "Summary Rows 146+167+184+202"),
        ("Upper Basin M&I, Energy & Local Reservoirs", "Wyoming", uc_mean("Wyoming", "mi_energy_minerals") + uc_mean("Wyoming", "state_reservoir_evap"), "municipal", "usbr_uc_cul_1971_2024", "Summary Rows 147+168+185+203"),
        ("Upper Basin M&I, Energy & Local Reservoirs", "New Mexico", uc_mean("New Mexico", "mi_energy_minerals") + uc_mean("New Mexico", "state_reservoir_evap"), "municipal", "usbr_uc_cul_1971_2024", "Summary Rows 142+163+180+198"),
        ("Upper Basin M&I, Energy & Local Reservoirs", "Arizona (Upper)", uc_mean("Arizona_Upper", "mi_energy_minerals") + uc_mean("Arizona_Upper", "state_reservoir_evap"), "municipal", "usbr_uc_cul_1971_2024", "Summary Rows 137+158+175+193"),

        # Col 2 -> Col 3 (Lower States, Mexico & Mainstem Evap)
        ("Mainstem Reservoir Evaporation", "System Mainstem Evaporation", mainstem_evap_tot, "loss", "usbr_lc_cul_1971_2024", "UC Row 23 + LC Mainstream_Reservoirs"),
        ("California Outside-System Exports (AAC & CRA)", "California", ca_out, "ag", "usbr_lc_cul_1971_2024", "Mainstream CA OUTSIDE_SYSTEM"),
        ("Lower River On-Mainstem Agriculture", "California", ca_ag, "ag", "usbr_lc_cul_1971_2024", "Mainstream CA AGRICULTURE"),
        ("Lower River In-Basin M&I (SNWA & Cities)", "California", ca_mi, "municipal", "usbr_lc_cul_1971_2024", "Mainstream CA M_I_OTHER"),

        ("Central Arizona Project (Interior Transfer)", "Arizona (Lower)", az_within, "municipal", "usbr_lc_cul_1971_2024", "Mainstream AZ WITHIN_SYSTEM"),
        ("Lower River On-Mainstem Agriculture", "Arizona (Lower)", az_ag, "ag", "usbr_lc_cul_1971_2024", "Mainstream AZ AGRICULTURE"),
        ("Lower River In-Basin M&I (SNWA & Cities)", "Arizona (Lower)", az_mi, "municipal", "usbr_lc_cul_1971_2024", "Mainstream AZ M_I_OTHER"),

        ("Lower River On-Mainstem Agriculture", "Nevada", nv_ag, "ag", "usbr_lc_cul_1971_2024", "Mainstream NV AGRICULTURE"),
        ("Lower River In-Basin M&I (SNWA & Cities)", "Nevada", nv_mi, "municipal", "usbr_lc_cul_1971_2024", "Mainstream NV M_I_OTHER + TEP"),

        ("Morelos Dam & Border Deliveries (Mexico)", "1944 Mexico Treaty", mx_tot, "treaty", "usbr_lc_cul_1971_2024", "Mexico Tab TOTAL"),
    ]
    for l in links:
        if l[2] > 0.00001:
            cur.execute(
                """
                INSERT INTO water_budget_links (source_name, target_name, value_maf, category, source_id, locator)
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                l,
            )

    # Stacked View 2: Physical Supply (2000-2024) vs Statutory Paper Claims + Mainstem Evap
    cur.execute("DELETE FROM water_budget_stacked;")
    stacked = [
        ("supply", "Upper Basin Natural Flow (Lees Ferry)", lf_nat_maf, f"{lf_nat_maf/total_measured_inflow_maf*100:.1f}% of Mainstream Supply", "Physical Inflow", "#0284c7", 0,
         f"Unimpaired USBR Lees Ferry natural flow (WY {win} {BUDGET_N_YRS}-year mean).", "usbr_lf_natflow_1906_2024", f"Sheet1 WY {win}"),
        ("supply", "Lower Mainstem Gaged Tributaries", lb_tribs_maf, f"{lb_tribs_maf/total_measured_inflow_maf*100:.1f}% of Mainstream Supply", "Physical Inflow", "#0d9488", 0,
         f"Virgin, Little Colorado, Bill Williams, Muddy & Paria rivers entering below Lees Ferry (CY {win}).", "usgs_water_budget_gages_dv", f"5 USGS Gages CY {win}"),
        ("supply", "Gila River Basin (Excluded CUL Ref.)", gila_cul_maf, "Off-Mainstem / Excluded", "Off-Mainstem / Excluded", "#0f766e", 1,
         f"USBR Tributary CUL (CY {win}): intercepted in AZ/NM below Imperial Dam; excluded from Compact mainstream accounting.", "usbr_lc_cul_1971_2024", "Tributary Tab REPORTING_AREA='Gila'"),

        ("demand", "Colorado (Upper Basin Statutory 51.75%)", 3.855, "51.75% of 7.45 MAF Upper Pool", "Paper Allocation", "#1e40af", 0,
         "1948 Upper Basin Compact Art. III(a) statutory percentage share at 7.50 MAF Upper Basin cap.", "compact_1948_upper", "63 Stat. 31 Art. III(a)"),
        ("demand", "Utah (Upper Basin Statutory 23.00%)", 1.714, "23.00% of 7.45 MAF Upper Pool", "Paper Allocation", "#2563eb", 0,
         "1948 Upper Basin Compact Art. III(a) statutory percentage share.", "compact_1948_upper", "63 Stat. 31 Art. III(a)"),
        ("demand", "Wyoming (Upper Basin Statutory 14.00%)", 1.043, "14.00% of 7.45 MAF Upper Pool", "Paper Allocation", "#3b82f6", 0,
         "1948 Upper Basin Compact Art. III(a) statutory percentage share.", "compact_1948_upper", "63 Stat. 31 Art. III(a)"),
        ("demand", "New Mexico (Upper Basin Statutory 11.25%)", 0.838, "11.25% of 7.45 MAF Upper Pool", "Paper Allocation", "#60a5fa", 0,
         "1948 Upper Basin Compact Art. III(a) statutory percentage share.", "compact_1948_upper", "63 Stat. 31 Art. III(a)"),
        ("demand", "Arizona (Upper Basin Fixed 50,000 AF)", 0.050, "50,000 AF Fixed Upper Share", "Paper Allocation", "#93c5fd", 0,
         "1948 Upper Basin Compact Art. III(a)(1) fixed allocation.", "compact_1948_upper", "63 Stat. 31 Art. III(a)(1)"),
        ("demand", "California (1928 BCPA / 1964 Decree)", 4.400, "Lower Basin Senior Share", "Paper Allocation", "#c2410c", 0,
         "Boulder Canyon Project Act s.4(a) and 1964 Supreme Court Decree.", "compact_1922", "42 Stat. 171 / 373 U.S. 546"),
        ("demand", "Arizona (Lower Mainstem BCPA)", 2.800, "Junior Mainstem Share", "Paper Allocation", "#ea580c", 0,
         "1928 BCPA & 1964 Decree mainstream allocation (excludes Gila).", "compact_1922", "373 U.S. 546 Art. II(B)"),
        ("demand", "Nevada (Lower Mainstem BCPA)", 0.300, "Southern Nevada Share", "Paper Allocation", "#fb923c", 0,
         "1928 BCPA & 1964 Decree mainstream allocation.", "compact_1922", "373 U.S. 546 Art. II(B)"),
        ("demand", "1922 Compact Article III(b)", 1.000, "Additional Lower Basin Claim", "Paper Allocation", "#fdba74", 0,
         "Authorizes +1.0 MAF/yr Lower Basin beneficial consumptive use.", "compact_1922", "42 Stat. 171 Art. III(b)"),
        ("demand", "1944 Mexico Water Treaty", 1.500, "International Treaty Delivery", "Treaty Obligation", "#7c3aed", 0,
         "Guaranteed 1.50 MAF/yr treaty delivery at international boundary.", "compact_1922", "1944 Treaty TS 994 Art. 10"),
        ("demand", f"Mainstem Reservoir Evaporation (Measured {win})", mainstem_evap_tot, "Omitted from 1922 Compact", "System Depletion", "#64748b", 0,
         f"USBR CY {win} measured mainstem evaporation: CRSP {ub_crsp_evap:.2f} + Lower {lb_res_evap:.2f} MAF/yr.", "usbr_lc_cul_1971_2024", "UC Row 23 + LC Mainstream_Reservoirs"),
    ]
    for st in stacked:
        cur.execute(
            """
            INSERT INTO water_budget_stacked (
                side, label, maf_yr, share_label, category, color_hex, excluded, description, source_id, locator
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            st,
        )

    # Summary scalar metadata for strict consistency across pages & smoke tests
    cur.execute("DELETE FROM water_budget_meta;")
    meta_kv = {
        "period": f"{BUDGET_START_YR}-{BUDGET_END_YR} ({BUDGET_N_YRS}-Year Baseline)",
        "period_start": str(BUDGET_START_YR),
        "period_end": str(BUDGET_END_YR),
        "lf_natural_flow_maf": f"{lf_nat_maf:.4f}",
        "lb_gaged_tribs_maf": f"{lb_tribs_maf:.4f}",
        "mainstream_inflow_maf": f"{total_measured_inflow_maf:.4f}",
        "net_storage_drawdown_maf": f"{net_drawdown_maf:.4f}",
        "closure_residual_maf": f"{residual_maf:.4f}",
        "total_depletions_maf": f"{total_depletions_maf:.4f}",
        "ub_states_cul_maf": f"{sum(ub_state_totals.values()):.4f}",
        "ub_crsp_evap_maf": f"{ub_crsp_evap:.4f}",
        "ub_total_cul_maf": f"{ub_total_cul:.4f}",
        "lb_states_cul_maf": f"{(ca_tot+az_tot+nv_tot):.4f}",
        "lb_res_evap_maf": f"{lb_res_evap:.4f}",
        "mainstem_evap_maf": f"{mainstem_evap_tot:.4f}",
        "mexico_total_maf": f"{mx_tot:.4f}",
        "gila_cul_maf": f"{gila_cul_maf:.4f}",
        "statutory_claims_maf": "17.5000",
        "statutory_plus_evap_maf": f"{(17.5 + mainstem_evap_tot):.4f}",
        "statutory_deficit_maf": f"{(17.5 - total_measured_inflow_maf):.4f}",
        "full_over_allocation_maf": f"{(17.5 + mainstem_evap_tot - total_measured_inflow_maf):.4f}",
    }
    for k, v in meta_kv.items():
        cur.execute("INSERT INTO water_budget_meta (meta_key, meta_value) VALUES (?, ?)", (k, v))


def populate_reservoir_history_and_timeline(cur: sqlite3.Cursor) -> None:
    """Build standardized End-of-Month (EOM) monthly matrices & dated 1935-present storage timeline strictly from data/raw/."""
    def eom_matrix(daily_rows, min_year=None):
        by_ym = {}
        for dt, val in daily_rows:
            yr, mo = int(dt[:4]), int(dt[5:7])
            if min_year and yr < min_year:
                continue
            # Keep last observation of each calendar month (EOM)
            by_ym[(yr, mo)] = (dt, val)
        years = sorted({yr for yr, _ in by_ym})
        out = {}
        for yr in years:
            row = [None] * 12
            for mo in range(1, 13):
                if (yr, mo) in by_ym:
                    row[mo - 1] = round(by_ym[(yr, mo)][1], 2)
            out[yr] = row
        return out

    # 1. Lake Mead EOM from mead-elv.html + active month from 921/49.csv
    with open(os.path.join(RAW_DIR, "reservoirs", "mead-elv.html"), "r", encoding="utf-8", errors="ignore") as f:
        html_mead = f.read()
    mead_mat = {}
    for m in re.finditer(r"<TR><TH>(\d{4})</TH>(.*?)</TR>", html_mead, re.DOTALL):
        yr = int(m.group(1))
        tds = re.findall(r"<TD>\s*([0-9\.]+|-+)\s*</TD>", m.group(2))
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
    mead_49 = load_usbr_csv_series(os.path.join(RAW_DIR, "reservoirs", "usbr_921_mead_49_elevation.csv"))
    if mead_49:
        last_dt, last_el = mead_49[-1]
        lyr, lmo = int(last_dt[:4]), int(last_dt[5:7])
        if 890.0 <= last_el <= 1230.0:
            row = mead_mat.setdefault(lyr, [None] * 12)
            if row[lmo - 1] is None:
                row[lmo - 1] = round(last_el, 2)

    all_matrices = [("lake_mead", mead_mat, "usbr_mead_eom_1935_present")]
    upper_specs = [
        ("lake_powell", "usbr_919_powell_49_elevation.csv", 1963, "usbr_919_powell_elev"),
        ("flaming_gorge", "usbr_917_flaming_gorge_49_elevation.csv", 1968, "usbr_917_fg_elev"),
        ("navajo_reservoir", "usbr_920_navajo_49_elevation.csv", 1962, "usbr_920_navajo_elev"),
        ("blue_mesa", "usbr_913_blue_mesa_49_elevation.csv", 1965, "usbr_913_bluemesa_elev"),
    ]
    for rid, fn, min_yr, sid in upper_specs:
        rows = load_usbr_csv_series(os.path.join(RAW_DIR, "reservoirs", fn))
        all_matrices.append((rid, eom_matrix(rows, min_year=min_yr), sid))

    with open(os.path.join(RAW_DIR, "reservoirs", "cdwr_dilresco_daily.json"), "r", encoding="utf-8") as f:
        dil_res = json.load(f).get("ResultList", [])
    dil_elev = sorted((it["measDate"][:10], float(it["measValue"])) for it in dil_res if it.get("parameter") == "ELEV" and it.get("measValue") is not None)
    all_matrices.append(("dillon_reservoir", eom_matrix(dil_elev, min_year=1987), "cdwr_dillon_daily"))

    cur.execute("DELETE FROM reservoir_monthly_history;")
    for rid, mat, sid in all_matrices:
        for yr in sorted(mat):
            vals = mat[yr]
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
                """,
                (rid, yr, *vals, amin, amax, amean, arange, sid),
            )

    # 2. Powell Water-Year Storage Summary (1963-present)
    powell_17 = load_usbr_csv_series(os.path.join(RAW_DIR, "reservoirs", "usbr_919_powell_17_storage.csv"))
    wy_groups = defaultdict(list)
    for dt, v in powell_17:
        wy_groups[water_year(dt)].append(v)
    cur.execute("DELETE FROM reservoir_wy_storage;")
    for wy in sorted(wy_groups):
        vals = wy_groups[wy]
        cur.execute(
            """
            INSERT INTO reservoir_wy_storage (reservoir_id, water_year, min_af, max_af, mean_af, year_end_af, source_id)
            VALUES ('lake_powell', ?, ?, ?, ?, ?, 'usbr_919_powell_stor')
            """,
            (wy, round(min(vals)), round(max(vals)), round(sum(vals) / len(vals)), round(vals[-1])),
        )

    # 3. Dated Annual Basin Storage Timeline (1935-present) strictly from raw CSVs + CDWR JSONs
    def annual_eoy(daily_rows):
        by_yr = {}
        for dt, val in daily_rows:
            yr = int(dt[:4])
            by_yr[yr] = (dt, val / 1e6)
        return by_yr

    mead_eoy = annual_eoy(load_usbr_csv_series(os.path.join(RAW_DIR, "reservoirs", "usbr_921_mead_17_storage.csv")))
    powell_eoy = annual_eoy(powell_17)
    fg_eoy = annual_eoy(load_usbr_csv_series(os.path.join(RAW_DIR, "reservoirs", "usbr_917_flaming_gorge_17_storage.csv")))
    nav_eoy = annual_eoy(load_usbr_csv_series(os.path.join(RAW_DIR, "reservoirs", "usbr_920_navajo_17_storage.csv")))
    bm_eoy = annual_eoy(load_usbr_csv_series(os.path.join(RAW_DIR, "reservoirs", "usbr_913_blue_mesa_17_storage.csv")))

    dil_stor = sorted((it["measDate"][:10], float(it["measValue"])) for it in dil_res if it.get("parameter") == "STORAGE" and it.get("measValue") is not None)
    dil_eoy = annual_eoy(dil_stor)

    with open(os.path.join(RAW_DIR, "reservoirs", "cdwr_graresco_daily.json"), "r", encoding="utf-8") as f:
        gra_res = json.load(f).get("ResultList", [])
    gra_stor = sorted((it["measDate"][:10], float(it["measValue"])) for it in gra_res if it.get("parameter") == "STORAGE" and it.get("measValue") is not None)
    gra_eoy = annual_eoy(gra_stor)

    # Mead 17.csv starts 1937-05-28 (1935-1936 elevations exist in mead-elv.html / 49.csv without volumetric CSV).
    max_yr = max(max(mead_eoy), max(powell_eoy))
    cur.execute("DELETE FROM basin_storage_timeline;")
    for yr in range(1937, max_yr + 1):
        as_of = mead_eoy[yr][0] if yr in mead_eoy else f"{yr}-12-31"
        m_v = round(mead_eoy.get(yr, (as_of, 0.0))[1], 3)
        p_v = round(powell_eoy.get(yr, (as_of, 0.0))[1], 3)
        fg_v = round(fg_eoy.get(yr, (as_of, 0.0))[1], 3)
        nv_v = round(nav_eoy.get(yr, (as_of, 0.0))[1], 3)
        bm_v = round(bm_eoy.get(yr, (as_of, 0.0))[1], 3)
        dl_v = round(dil_eoy.get(yr, (as_of, 0.0))[1], 3)
        gr_v = round(gra_eoy.get(yr, (as_of, 0.0))[1], 3)
        tot = round(m_v + p_v + fg_v + nv_v + bm_v, 3)
        cur.execute(
            """
            INSERT INTO basin_storage_timeline (
                year, as_of_date, mead_maf, powell_maf, flaming_gorge_maf,
                navajo_maf, blue_mesa_maf, dillon_maf, granby_maf, total_major_storage_maf, source_id
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'usbr_919_powell_stor')
            """,
            (yr, as_of, m_v, p_v, fg_v, nv_v, bm_v, dl_v, gr_v, tot),
        )


def populate_normals_and_seasonal(cur: sqlite3.Cursor) -> None:
    # 1. Station daily normals + POR metadata from raw RDB
    rdb_path = os.path.join(RAW_DIR, "usgs_baselines", "usgs_daily_normals_74sites.rdb")
    cur.execute("DELETE FROM station_daily_normals;")
    cur.execute("DELETE FROM station_normals_meta;")
    meta_seen = {}
    normals = {}

    with open(rdb_path, "r", encoding="utf-8", errors="ignore") as f:
        header_cols = None
        for line in f:
            if line.startswith("#"):
                continue
            parts = line.rstrip("\r\n").split("\t")
            if line.startswith("agency_cd"):
                header_cols = {name: idx for idx, name in enumerate(parts)}
                continue
            if not header_cols or line.startswith("5s"):
                continue
            try:
                sid = parts[header_cols["site_no"]].strip()
                mo = int(parts[header_cols["month_nu"]].strip())
                dy = int(parts[header_cols["day_nu"]].strip())
                mean_va = round(float(parts[header_cols["mean_va"]].strip()), 1)
                begin_yr = int(parts[header_cols["begin_yr"]].strip())
                end_yr = int(parts[header_cols["end_yr"]].strip())
                count_nu = int(parts[header_cols["count_nu"]].strip())
            except (KeyError, ValueError, IndexError):
                continue
            mmdd = f"{mo:02d}-{dy:02d}"
            normals.setdefault(sid, {})[mmdd] = mean_va
            if sid not in meta_seen:
                meta_seen[sid] = (begin_yr, end_yr, count_nu)
            else:
                b0, e0, c0 = meta_seen[sid]
                meta_seen[sid] = (min(b0, begin_yr), max(e0, end_yr), max(c0, count_nu))

    for sid, (byr, eyr, cnt) in meta_seen.items():
        st_row = cur.execute("SELECT name FROM stations WHERE station_id=?", (sid,)).fetchone()
        st_name = st_row[0] if st_row else f"USGS {sid}"
        cur.execute(
            "INSERT INTO station_normals_meta (station_id, station_name, begin_yr, end_yr, count_nu, source_id) VALUES (?, ?, ?, ?, ?, 'usgs_daily_normals_stat')",
            (sid, st_name, byr, eyr, cnt),
        )
    for sid, days in normals.items():
        for mmdd, val in days.items():
            cur.execute(
                "INSERT INTO station_daily_normals (station_id, mm_dd, mean_cfs) VALUES (?, ?, ?)",
                (sid, mmdd, val),
            )

    # 2. 5 Seasonal Heartbeats (fixing monsoon_tributaries: Little Colorado 09402000 + Paria 09382000 ONLY)
    mmdd_order = []
    for m in range(1, 13):
        dim = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][m - 1]
        for d in range(1, dim + 1):
            mmdd_order.append(f"{m:02d}-{d:02d}")

    def curve_for(sid):
        d = normals.get(sid, {})
        arr = [float(d.get(k, 0.0)) for k in mmdd_order]
        mx = max(arr) if arr else 0.0
        return [v / mx if mx > 0 else 0.0 for v in arr]

    c_cameo = curve_for("09095500")
    c_yampa = curve_for("09260050")
    snowmelt = [(a + b) / 2.0 for a, b in zip(c_cameo, c_yampa)]

    c_lcr = curve_for("09402000")
    c_paria = curve_for("09382000")
    monsoon = [(a + b) / 2.0 for a, b in zip(c_lcr, c_paria)]

    dam_rel = curve_for("09380000")
    canal = curve_for("09527700")

    with open(os.path.join(RAW_DIR, "usgs_baselines", "cdwr_tunnels_daily_2022_2024.json"), "r", encoding="utf-8") as f:
        tun_raw = json.load(f)
    tun_sum = [0.0] * 365
    for abbrev, recs in tun_raw.items():
        by_mmdd = defaultdict(list)
        for it in recs:
            dt = (it.get("measDate") or "")[:10]
            val = it.get("measValue")
            if len(dt) == 10 and val is not None and dt[5:10] != "02-29":
                by_mmdd[dt[5:10]].append(float(val))
        for idx, k in enumerate(mmdd_order):
            if by_mmdd[k]:
                tun_sum[idx] += sum(by_mmdd[k]) / len(by_mmdd[k])
    tun_max = max(tun_sum) if tun_sum else 1.0
    tun_norm = [v / tun_max if tun_max > 0 else 0.0 for v in tun_sum]

    cur.execute("DELETE FROM seasonal_heartbeats;")
    for doy_idx in range(365):
        cur.execute(
            """
            INSERT INTO seasonal_heartbeats (doy, alpine_snowmelt, front_range_tunnels, monsoon_tributaries, regulated_dam_releases, lower_basin_canals)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (doy_idx + 1, round(snowmelt[doy_idx], 4), round(tun_norm[doy_idx], 4), round(monsoon[doy_idx], 4), round(dam_rel[doy_idx], 4), round(canal[doy_idx], 4)),
        )

    # 3. Seasonal Supply vs Demand Mismatch (WY 2000-2024 identical dates matching macro baseline)
    gages = load_usgs_dv_json(os.path.join(RAW_DIR, "usgs_baselines", "usgs_budget_and_inflow_gages_dv.json"))
    common_dates = sorted(
        dt for dt in (set(gages["09180500"]) & set(gages["09315000"]) & set(gages["09379500"]) & set(gages["09380000"]))
        if f"{BUDGET_START_YR - 1}-10-01" <= dt <= f"{BUDGET_END_YR}-09-30" and dt[5:10] != "02-29"
    )
    by_mmdd_sup = defaultdict(list)
    by_mmdd_rel = defaultdict(list)
    for dt in common_dates:
        mmdd = dt[5:10]
        by_mmdd_sup[mmdd].append(gages["09180500"][dt] + gages["09315000"][dt] + gages["09379500"][dt])
        by_mmdd_rel[mmdd].append(gages["09380000"][dt])

    sup_curve = [sum(by_mmdd_sup[k]) / len(by_mmdd_sup[k]) for k in mmdd_order]
    rel_curve = [sum(by_mmdd_rel[k]) / len(by_mmdd_rel[k]) for k in mmdd_order]

    cur.execute("DELETE FROM seasonal_supply_demand;")
    for doy_idx in range(365):
        cur.execute(
            "INSERT INTO seasonal_supply_demand (doy, supply_cfs, demand_cfs) VALUES (?, ?, ?)",
            (doy_idx + 1, round(sup_curve[doy_idx], 1), round(rel_curve[doy_idx], 1)),
        )

    surplus_days = sum(1 for s, r in zip(sup_curve, rel_curve) if s > r)
    cur.execute("DELETE FROM seasonal_meta;")
    for k, v in {
        "spring_peak_cfs": str(round(max(sup_curve))),
        "winter_base_cfs": str(round(sum(sup_curve[:31]) / 31.0)),
        "mean_release_cfs": str(round(sum(rel_curve) / 365.0)),
        "surplus_days": str(surplus_days),
        "deficit_days": str(365 - surplus_days),
    }.items():
        cur.execute("INSERT INTO seasonal_meta (meta_key, meta_value) VALUES (?, ?)", (k, v))


def populate_tributary_hydrology(cur: sqlite3.Cursor) -> None:
    trib_dv = load_usgs_dv_json(os.path.join(RAW_DIR, "usgs_baselines", "usgs_tributary_wy2016_2025_dv.json"))
    # River miles above Lake Powell (approx. NHDPlus river miles to Lees Ferry / Powell upper pool)
    stations_meta = [
        {"id": "09180500", "short_name": "CO River (Cisco)", "name": "Colorado River near Cisco, UT", "regime": "snowmelt", "is_terminal_inflow": 1, "miles": 105},
        {"id": "09315000", "short_name": "Green River", "name": "Green River at Green River, UT", "regime": "snowmelt", "is_terminal_inflow": 1, "miles": 120},
        {"id": "09379500", "short_name": "San Juan (Bluff)", "name": "San Juan River near Bluff, UT", "regime": "snowmelt", "is_terminal_inflow": 1, "miles": 40},
        {"id": "09234500", "short_name": "Flaming Gorge", "name": "Green River near Greendale, UT (Flaming Gorge Dam)", "regime": "dam_controlled", "is_terminal_inflow": 0, "miles": 350},
        {"id": "09333500", "short_name": "Dirty Devil", "name": "Dirty Devil River near Hanksville, UT", "regime": "flash_flood", "is_terminal_inflow": 1, "miles": 30},
        {"id": "09337500", "short_name": "Escalante", "name": "Escalante River near Escalante, UT", "regime": "flash_flood", "is_terminal_inflow": 1, "miles": 35},
    ]

    summaries = []
    for meta in stations_meta:
        dmap = trib_dv[meta["id"]]
        by_wy = defaultdict(list)
        for dt in sorted(dmap):
            wy = water_year(dt)
            if 2016 <= wy <= 2025:
                by_wy[wy].append((dt, dmap[dt]))
        comp = {wy: rows for wy, rows in by_wy.items() if len(rows) >= 330}
        wy_mafs, wy_rbis, all_q = [], [], []
        max_q, max_dt = -1.0, ""
        for wy, rows in sorted(comp.items()):
            qs = [q for _, q in rows]
            all_q.extend(qs)
            tot = sum(qs)
            exp_days = 366 if (wy % 4 == 0 and (wy % 100 != 0 or wy % 400 == 0)) else 365
            scale = exp_days / len(qs) if len(qs) < exp_days else 1.0
            wy_mafs.append((tot * scale * CFS_DAY_TO_AF) / 1e6)
            if tot > 0:
                wy_rbis.append(sum(abs(qs[i] - qs[i - 1]) for i in range(1, len(qs))) / tot)
            for dt, q in rows:
                if q > max_q:
                    max_q, max_dt = q, dt
        med_q = statistics.median(all_q)
        summaries.append({
            **meta,
            "complete_wys": len(comp),
            "annual_maf": round(statistics.mean(wy_mafs), 4),
            "rbi": round(statistics.mean(wy_rbis), 4),
            "median_cfs": round(med_q, 1),
            "max_daily_cfs": round(max_q, 1),
            "max_daily_date": max_dt,
            "peak_to_median": round(max_q / med_q, 1),
        })

    term_tot = sum(s["annual_maf"] for s in summaries if s["is_terminal_inflow"])
    cur.execute("DELETE FROM tributary_summaries;")
    for s in summaries:
        share = round(s["annual_maf"] / term_tot * 100.0, 2) if s["is_terminal_inflow"] else None
        cur.execute(
            """
            INSERT INTO tributary_summaries (
                station_id, short_name, name, regime, is_terminal_inflow, approx_miles_to_powell,
                complete_water_years, annual_maf, inflow_share_pct, rbi, median_cfs,
                max_daily_cfs, max_daily_date, peak_to_median, usgs_url, source_id
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'usgs_tributary_wy2016_2025_dv')
            """,
            (
                s["id"], s["short_name"], s["name"], s["regime"], s["is_terminal_inflow"], s["miles"],
                s["complete_wys"], s["annual_maf"], share, s["rbi"], s["median_cfs"],
                s["max_daily_cfs"], s["max_daily_date"], s["peak_to_median"],
                f"https://waterdata.usgs.gov/monitoring-location/{s['id']}/#parameterCode=00060",
            ),
        )

    # Powell Hypsometry
    elev_map = dict(load_usbr_csv_series(os.path.join(RAW_DIR, "reservoirs", "usbr_919_powell_49_elevation.csv")))
    stor_map = dict(load_usbr_csv_series(os.path.join(RAW_DIR, "reservoirs", "usbr_919_powell_17_storage.csv")))
    paired = [(dt, elev_map[dt], stor_map[dt]) for dt in sorted(set(elev_map) & set(stor_map)) if 3370.0 <= elev_map[dt] <= 3710.0 and stor_map[dt] >= 0]
    latest_dt, latest_el, latest_st = paired[-1]
    pre = [x for x in paired if x[0] <= "2021-12-31"]
    post = [x for x in paired if x[0] >= "2023-01-01"]

    bins = []
    for target_el in range(3490, 3701, 10):
        cand = [x for x in pre if abs(x[1] - target_el) <= 1.2]
        cand = sorted(pre, key=lambda x: abs(x[1] - target_el))[:15] if len(cand) < 5 else cand[-40:]
        bins.append({
            "elev_ft": target_el,
            "sample_elev_ft": round(statistics.median(x[1] for x in cand), 2),
            "storage_af": round(statistics.median(x[2] for x in cand)),
            "sample_latest_date": max(x[0] for x in cand),
            "n_samples": len(cand),
        })
    for i, b in enumerate(bins):
        if i == 0:
            ds, de = bins[1]["storage_af"] - b["storage_af"], bins[1]["sample_elev_ft"] - b["sample_elev_ft"]
        elif i == len(bins) - 1:
            ds, de = b["storage_af"] - bins[i - 1]["storage_af"], b["sample_elev_ft"] - bins[i - 1]["sample_elev_ft"]
        else:
            ds, de = bins[i + 1]["storage_af"] - bins[i - 1]["storage_af"], bins[i + 1]["sample_elev_ft"] - bins[i - 1]["sample_elev_ft"]
        af_ft = ds / de
        b["af_per_ft"] = round(af_ft)
        b["k_af_per_ft"] = round(af_ft / 1000.0, 1)
        b["storage_maf"] = round(b["storage_af"] / 1e6, 2)
        b["rise_100k"] = round(100000.0 / af_ft, 2)

    cur.execute("DELETE FROM powell_hypsometry_curve;")
    for b in bins:
        cur.execute(
            """
            INSERT INTO powell_hypsometry_curve (
                elev_ft, sample_elev_ft, storage_af, storage_maf, af_per_ft, k_af_per_ft,
                rise_ft_per_100k_af, sample_latest_date, n_samples
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (b["elev_ft"], b["sample_elev_ft"], b["storage_af"], b["storage_maf"], b["af_per_ft"], b["k_af_per_ft"], b["rise_100k"], b["sample_latest_date"], b["n_samples"]),
        )

    cur_lo = [x for x in post if abs(x[1] - (latest_el - 5.0)) <= 1.2]
    cur_hi = [x for x in post if abs(x[1] - (latest_el + 5.0)) <= 1.2]
    cur_af_ft = round((statistics.median(x[2] for x in cur_hi) - statistics.median(x[2] for x in cur_lo)) /
                      (statistics.median(x[1] for x in cur_hi) - statistics.median(x[1] for x in cur_lo))) if cur_lo and cur_hi else bins[5]["af_per_ft"]

    cur.execute("DELETE FROM powell_hypsometry_meta;")
    for k, v in {
        "latest_date": latest_dt,
        "latest_elev_ft": str(round(latest_el, 2)),
        "latest_storage_af": str(round(latest_st)),
        "latest_storage_maf": str(round(latest_st / 1e6, 2)),
        "min_power_af_per_ft": str(bins[0]["af_per_ft"]),
        "current_af_per_ft": str(cur_af_ft),
        "full_pool_af_per_ft": str(bins[-1]["af_per_ft"]),
    }.items():
        cur.execute("INSERT INTO powell_hypsometry_meta (meta_key, meta_value) VALUES (?, ?)", (k, v))

    # Event Comparison (WY 2021 Dirty Devil vs Cisco)
    cisco_m, dd_m = trib_dv["09180500"], trib_dv["09333500"]
    best_wy = max(
        (wy for wy in range(2016, 2026) if len([d for d in (set(cisco_m) & set(dd_m)) if water_year(d) == wy]) >= 360),
        key=lambda wy: max(dd_m[d] for d in (set(cisco_m) & set(dd_m)) if water_year(d) == wy),
    )
    ev_dates = sorted(d for d in (set(cisco_m) & set(dd_m)) if water_year(d) == best_wy)
    cur.execute("DELETE FROM event_hydrograph_comparison;")
    for d in ev_dates:
        cur.execute(
            "INSERT INTO event_hydrograph_comparison (obs_date, cisco_cfs, dirty_devil_cfs) VALUES (?, ?, ?)",
            (d, round(cisco_m[d], 1), round(dd_m[d], 1)),
        )
    dd_vals = [dd_m[d] for d in ev_dates]
    cisco_vals = [cisco_m[d] for d in ev_dates]
    pk_idx = max(range(len(dd_vals)), key=lambda i: dd_vals[i])
    ev_3d_af = sum(dd_vals[max(0, pk_idx - 1):min(len(dd_vals), pk_idx + 2)]) * CFS_DAY_TO_AF
    cur.execute("DELETE FROM event_hydrograph_meta;")
    for k, v in {
        "water_year": str(best_wy),
        "cisco_wy_maf": str(round(sum(cisco_vals) * CFS_DAY_TO_AF / 1e6, 2)),
        "cisco_peak_cfs": str(round(max(cisco_vals), 1)),
        "dirty_devil_wy_af": str(round(sum(dd_vals) * CFS_DAY_TO_AF)),
        "dirty_devil_wy_maf": str(round(sum(dd_vals) * CFS_DAY_TO_AF / 1e6, 3)),
        "dirty_devil_peak_date": ev_dates[pk_idx],
        "dirty_devil_peak_cfs": str(round(dd_vals[pk_idx], 1)),
        "dirty_devil_event_3d_af": str(round(ev_3d_af)),
        "dirty_devil_event_powell_inches": str(round((ev_3d_af / cur_af_ft) * 12.0, 2)),
    }.items():
        cur.execute("INSERT INTO event_hydrograph_meta (meta_key, meta_value) VALUES (?, ?)", (k, v))


def main():
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    init_schema(cur)
    populate_source_catalog(cur)
    populate_annual_lees_ferry(cur)
    populate_cul_tables(cur)
    populate_water_budget(cur)
    populate_reservoir_history_and_timeline(cur)
    populate_normals_and_seasonal(cur)
    populate_tributary_hydrology(cur)
    conn.commit()

    print("=== SQLite Build Complete:", DB_PATH, "===")
    for (t,) in cur.execute("SELECT name FROM sqlite_master WHERE type='table' AND name != 'sqlite_sequence' ORDER BY name").fetchall():
        cnt = cur.execute(f"SELECT COUNT(*) FROM {t}").fetchone()[0]
        print(f"  {t:32s}: {cnt:6d} rows")
    conn.close()


if __name__ == "__main__":
    main()
