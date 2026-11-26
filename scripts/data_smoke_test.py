#!/usr/bin/env python3
"""
Quantitative Data, Schema, Parity & Provenance Smoke Tests.

Validates:
  1. data/raw/MANIFEST.csv existence, byte counts, and SHA-256 integrity
  2. SQLite database schema row counts and EOM standardization
  3. SQLite <-> web/data/*.json parity across all 10 static contracts
  4. Absence of deleted synthetic keys across web/data/*.json
  5. Post-1963 Lees Ferry natural flow vs. gaged release divergence (std > 1.0 MAF)
  6. 1937+ basin_storage_timeline start year and ISO as_of_date validity
  7. 2005-2024 water_budget.json multi-column mass-balance closure (< 0.01 MAF)
  8. Zero retired/unsourced claim strings in active web files & verified claims_register.csv
"""

import csv
import hashlib
import json
import os
import re
import sqlite3
import statistics
import sys

REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB_PATH = os.path.join(REPO_ROOT, "data", "colorado_river_basin.db")
MANIFEST_PATH = os.path.join(REPO_ROOT, "data", "raw", "MANIFEST.csv")
CLAIMS_PATH = os.path.join(REPO_ROOT, "data", "claims_register.csv")
WEB_DIR = os.path.join(REPO_ROOT, "web")
WEB_DATA_DIR = os.path.join(WEB_DIR, "data")

DELETED_SYNTHETIC_KEYS = {
    "reservoir_sawtooth_20yr",
    "kmeans_clusters",
    "swe_history",
    "state_consumptive_use",
    "canals_pipelines",
}

ACTIVE_WEB_FILES = [
    "web/index.html",
    "web/sankey.html",
    "web/law.html",
    "web/pipeline.html",
    "web/ml_analysis.html",
    "web/methodology.html",
    "web/data_sources.html",
    "web/telemetry.html",
    "web/map_embed.html",
    "web/dashboard.js",
    "web/app.js",
    "web/map.js",
]

RETIRED_STRINGS = [
    (r"\b2\.33\s*MAF", "2.33 MAF"),
    (r"\b2\.05\s*MAF", "2.05 MAF"),
    (r"\b14\.90\s*MAF", "14.90 MAF"),
    (r"\b12\.85\s*MAF", "12.85 MAF"),
    (r"\b15\.49\s*MAF", "15.49 MAF"),
    (r"\b37\.6\s*MAF", "37.6 MAF"),
    (r"\b1\.25\s*MAF", "1.25 MAF"),
    (r"\b3\.79\s*MAF", "3.79 MAF"),
    (r"crsp/studies/?\"", "crsp/studies/"),
    (r"pao/lawofrvr\.html", "pao/lawofrvr.html"),
    (r"\bflowCfs:", "flowCfs:"),
    (r"2005[–-]2024", "2005-2024"),
    (r"\b13\.89\s*MAF", "13.89 MAF"),
    (r"\b13\.51\s*MAF", "13.51 MAF"),
]


def sha256_file(path: str) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(65536), b""):
            h.update(chunk)
    return h.hexdigest()


def collect_keys(obj, found=None):
    if found is None:
        found = set()
    if isinstance(obj, dict):
        for k, v in obj.items():
            found.add(k)
            collect_keys(v, found)
    elif isinstance(obj, list):
        for item in obj:
            collect_keys(item, found)
    return found


def check_manifest(failures: list[str]) -> None:
    if not os.path.exists(MANIFEST_PATH):
        failures.append("Missing data/raw/MANIFEST.csv")
        return
    with open(MANIFEST_PATH, "r", encoding="utf-8") as f:
        rows = list(csv.DictReader(f))
    if len(rows) < 26:
        failures.append(f"MANIFEST.csv has {len(rows)} rows (expected >= 26)")
    for row in rows:
        rel = row["local_path"]
        abs_p = os.path.join(REPO_ROOT, rel)
        if not os.path.exists(abs_p):
            failures.append(f"MANIFEST file missing on disk: {rel}")
            continue
        actual_bytes = os.path.getsize(abs_p)
        expected_bytes = int(row["bytes"])
        if actual_bytes != expected_bytes:
            failures.append(f"Size mismatch for {rel}: disk={actual_bytes} != manifest={expected_bytes}")
        actual_sha = sha256_file(abs_p)
        if actual_sha != row["sha256"]:
            failures.append(f"SHA-256 mismatch for {rel}: disk={actual_sha[:12]} != manifest={row['sha256'][:12]}")


def check_sqlite_and_parity(failures: list[str]) -> None:
    if not os.path.exists(DB_PATH):
        failures.append("Missing SQLite database data/colorado_river_basin.db")
        return
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()

    min_counts = {
        "source_catalog": 30,
        "annual_lees_ferry": 103,
        "water_budget_nodes": 25,
        "water_budget_links": 39,
        "water_budget_stacked": 14,
        "reservoir_monthly_history": 350,
        "basin_storage_timeline": 90,
        "rbi_flashiness": 70,
        "station_hierarchy": 90,
        "station_daily_normals": 25000,
        "replay_matrices": 2,
    }
    for tbl, req in min_counts.items():
        n = cur.execute(f"SELECT COUNT(*) FROM {tbl}").fetchone()[0]
        if n < req:
            failures.append(f"SQLite table {tbl} has {n} rows (expected >= {req})")

    non_eom = cur.execute(
        "SELECT COUNT(*) FROM reservoir_monthly_history WHERE aggregation_method != 'EOM'"
    ).fetchone()[0]
    if non_eom != 0:
        failures.append(f"Found {non_eom} non-EOM rows in reservoir_monthly_history")

    # Parity checks across all 10 JSON contracts
    def load_json(fname: str):
        p = os.path.join(WEB_DATA_DIR, fname)
        if not os.path.exists(p):
            failures.append(f"Missing exported JSON contract: web/data/{fname}")
            return None
        with open(p, "r", encoding="utf-8") as f:
            data = json.load(f)
        bad_keys = DELETED_SYNTHETIC_KEYS & collect_keys(data)
        if bad_keys:
            failures.append(f"Deleted synthetic keys present in {fname}: {sorted(bad_keys)}")
        return data

    lm = load_json("latest_metrics.json")
    if lm is not None:
        sql_res = cur.execute("SELECT COUNT(*) FROM reservoirs_telemetry").fetchone()[0]
        if len(lm.get("reservoirs", [])) != sql_res:
            failures.append(f"latest_metrics reservoirs mismatch: json={len(lm.get('reservoirs', []))} sql={sql_res}")
        for stype, jkey in [("streamflow", "streamflows"), ("diversion_tunnel", "tunnels"), ("diversion_canal", "canals")]:
            sql_n = cur.execute(
                "SELECT COUNT(*) FROM telemetry_latest t JOIN stations s ON t.station_id=s.station_id WHERE s.station_type=?",
                (stype,),
            ).fetchone()[0]
            if len(lm.get(jkey, [])) != sql_n:
                failures.append(f"latest_metrics {jkey} mismatch: json={len(lm.get(jkey, []))} sql={sql_n}")

    ph = load_json("portal_historical.json")
    if ph is not None:
        tl = ph.get("basin_storage_timeline", [])
        sql_tl = cur.execute("SELECT COUNT(*) FROM basin_storage_timeline").fetchone()[0]
        if len(tl) != sql_tl:
            failures.append(f"portal_historical timeline count mismatch: json={len(tl)} sql={sql_tl}")
        if not tl or tl[0].get("year") != 1937:
            failures.append(f"basin_storage_timeline must start at 1937 (got {tl[0].get('year') if tl else None})")
        for row in tl:
            if not re.match(r"^\d{4}-\d{2}-\d{2}$", str(row.get("as_of_date", ""))):
                failures.append(f"Invalid as_of_date in basin_storage_timeline year={row.get('year')}: {row.get('as_of_date')}")
                break
        lf_n = cur.execute("SELECT COUNT(*) FROM lees_ferry_daily_recent").fetchone()[0]
        if len(ph.get("lees_ferry_daily", [])) != lf_n:
            failures.append("portal_historical lees_ferry_daily count mismatch vs SQLite")

    sr = load_json("seasonal_regimes.json")
    if sr is not None:
        ts = sr.get("compact_accounting_100yr", {}).get("annual_time_series", [])
        sql_lf = cur.execute("SELECT COUNT(*) FROM annual_lees_ferry WHERE in_compact_era = 1").fetchone()[0]
        if len(ts) != sql_lf:
            failures.append(f"seasonal_regimes annual_time_series mismatch: json={len(ts)} sql={sql_lf}")
        post_1963_diffs = [
            x["supply_maf"] - x["lees_ferry_release_maf"]
            for x in ts
            if x.get("wy", 0) >= 1964 and x.get("lees_ferry_release_maf") is not None
        ]
        if len(post_1963_diffs) < 50:
            failures.append(f"Too few post-1963 Lees Ferry gaged years ({len(post_1963_diffs)})")
        else:
            sd = statistics.stdev(post_1963_diffs)
            if sd <= 1.0:
                failures.append(f"Post-1963 natural minus gaged release std={sd:.3f} <= 1.0 MAF")

    th = load_json("tributary_hydrology.json")
    if th is not None:
        sql_tr = cur.execute("SELECT COUNT(*) FROM tributary_summaries").fetchone()[0]
        if len(th.get("tributaries", [])) != sql_tr:
            failures.append("tributary_hydrology tributaries count mismatch vs SQLite")

    sh = load_json("station_hierarchy.json")
    if sh is not None:
        sql_sh = cur.execute("SELECT COUNT(*) FROM station_hierarchy").fetchone()[0]
        if len(sh.get("stations", [])) != sql_sh:
            failures.append("station_hierarchy count mismatch vs SQLite")

    hn = load_json("historical_normals.json")
    if hn is not None:
        sql_hn = cur.execute("SELECT COUNT(*) FROM station_normals_meta").fetchone()[0]
        if len(hn.get("site_meta", {})) != sql_hn:
            failures.append("historical_normals site_meta count mismatch vs SQLite")

    wb = load_json("water_budget.json")
    if wb is not None:
        sql_nodes = cur.execute("SELECT COUNT(*) FROM water_budget_nodes").fetchone()[0]
        sql_links = cur.execute("SELECT COUNT(*) FROM water_budget_links").fetchone()[0]
        if len(wb.get("nodes", [])) != sql_nodes or len(wb.get("links", [])) != sql_links:
            failures.append("water_budget node/link count mismatch vs SQLite")
        meta = wb.get("meta", {})
        expected_total = float(meta.get("total_depletions_maf", 0.0))
        col0_sum = sum(n["maf_yr"] for n in wb["nodes"] if n["col"] == 0)
        col1_sum = sum(n["maf_yr"] for n in wb["nodes"] if n["col"] == 1)
        col2_sum = sum(n["maf_yr"] for n in wb["nodes"] if n["col"] == 2)
        col3_sum = sum(n["maf_yr"] for n in wb["nodes"] if n["col"] == 3)
        for label, s in [("col0", col0_sum), ("col1", col1_sum), ("col2", col2_sum), ("col3", col3_sum)]:
            if abs(s - expected_total) >= 0.01:
                failures.append(f"water_budget {label}={s:.4f} differs from total_depletions={expected_total:.4f} by >= 0.01")
        stacked = wb.get("stacked", [])
        expected_mainstream = float(meta.get("mainstream_inflow_maf", 0.0))
        expected_stat_evap = float(meta.get("statutory_plus_evap_maf", 0.0))
        sup_s = sum(r["maf_yr"] for r in stacked if r["side"] == "supply" and not r.get("excluded"))
        dem_s = sum(r["maf_yr"] for r in stacked if r["side"] == "demand" and not r.get("excluded"))
        if abs(sup_s - expected_mainstream) >= 0.01:
            failures.append(f"water_budget stacked supply={sup_s:.4f} vs mainstream_inflow={expected_mainstream:.4f}")
        if abs(dem_s - expected_stat_evap) >= 0.01:
            failures.append(f"water_budget stacked demand={dem_s:.4f} vs statutory_plus_evap={expected_stat_evap:.4f}")

    pr = load_json("provenance_registry.json")
    if pr is not None:
        sql_pr = cur.execute("SELECT COUNT(*) FROM source_catalog").fetchone()[0]
        if pr.get("total_sources") != sql_pr or len(pr.get("sources", [])) != sql_pr:
            failures.append("provenance_registry count mismatch vs SQLite source_catalog")

    for w in ("7d", "30d"):
        rep = load_json(f"replay_{w}.json")
        if rep is not None and not rep.get("timestamps"):
            failures.append(f"replay_{w}.json missing timestamps array")

    conn.close()


def check_web_and_claims(failures: list[str]) -> None:
    for rel in ACTIVE_WEB_FILES:
        abs_p = os.path.join(REPO_ROOT, rel)
        if not os.path.exists(abs_p):
            continue
        with open(abs_p, "r", encoding="utf-8") as f:
            text = f.read()
        for pat, desc in RETIRED_STRINGS:
            if re.search(pat, text):
                failures.append(f"Retired/unsourced string '{desc}' found in {rel}")

    if not os.path.exists(CLAIMS_PATH):
        failures.append("Missing data/claims_register.csv (run scripts/audit_claims_register.py)")
        return
    with open(CLAIMS_PATH, "r", encoding="utf-8") as f:
        rows = list(csv.DictReader(f))
    if not rows:
        failures.append("data/claims_register.csv is empty")
    bad_rows = [r for r in rows if r.get("status") != "verified"]
    if bad_rows:
        failures.append(f"data/claims_register.csv has {len(bad_rows)} non-verified rows")

    # Ensure exported HTML notebook contains executed PNG figures (guards against unexecuted nb export)
    nb_html = os.path.join(WEB_DIR, "notebooks", "colorado_river_analysis.html")
    if not os.path.exists(nb_html):
        failures.append("Missing web/notebooks/colorado_river_analysis.html")
    else:
        with open(nb_html, "r", encoding="utf-8") as f:
            png_count = f.read().count("data:image/png;base64")
        if png_count < 4:
            failures.append(f"web/notebooks/colorado_river_analysis.html has {png_count} embedded PNGs (expected >= 4)")


def main() -> int:
    failures = []
    check_manifest(failures)
    check_sqlite_and_parity(failures)
    check_web_and_claims(failures)

    if failures:
        print(f"DATA SMOKE TEST FAILED ({len(failures)} issues):", file=sys.stderr)
        for msg in failures:
            print(f"  [FAIL] {msg}", file=sys.stderr)
        return 1

    print("DATA SMOKE TEST PASSED: manifest SHA-256, SQLite schema, 10 JSON parity, Lees Ferry divergence, 1937+ timeline, water_budget closure, and claims register verified.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
