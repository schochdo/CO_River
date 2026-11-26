#!/usr/bin/env python3
"""
Downloads immutable authoritative reference datasets into data/raw/ and writes
data/raw/MANIFEST.csv with exact retrieval timestamps, byte sizes, and SHA-256 hashes.
Uses curl -sSL fallback for hosts (such as www.usbr.gov Akamai) that reset Python TLS.
"""

import csv
import hashlib
import os
import subprocess
import sys
from datetime import datetime, timezone

REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RAW_DIR = os.path.join(REPO_ROOT, "data", "raw")
MANIFEST_PATH = os.path.join(RAW_DIR, "MANIFEST.csv")

# Authoritative archival & baseline sources
SOURCES = [
    {
        "source_id": "usbr_lf_natflow_1906_2024",
        "category": "accounting_archive",
        "agency": "U.S. Bureau of Reclamation (Lower Colorado Region)",
        "title": "Lees Ferry Natural Flow Workbook (Water Years 1906-2024 Provisional)",
        "period": "WY 1906-2024",
        "period_basis": "WY",
        "official_url": "https://www.usbr.gov/lc/region/g4000/NaturalFlow/LFnatFlow1906-2024.2024.9.12.xlsx",
        "local_path": "data/raw/usbr_natural_flow/LFnatFlow1906-2024.2024.9.12.xlsx",
        "magic": b"PK\x03\x04",
        "locator_summary": "Sheet 1 ('Sheet1'), Col A (Water Year) & Col B (Natural Flow AF)",
        "used_by_pages": "index.html, sankey.html, law.html, data_sources.html",
    },
    {
        "source_id": "usbr_29node_natflow_1906_2020",
        "category": "accounting_archive",
        "agency": "U.S. Bureau of Reclamation (Lower Colorado Region)",
        "title": "Colorado River Basin Natural Flow 29-Node Workbook (Water Years 1906-2020)",
        "period": "WY 1906-2020",
        "period_basis": "WY",
        "official_url": "https://www.usbr.gov/lc/region/g4000/NaturalFlow/NaturalFlows1906-2020_20221215.xlsx",
        "local_path": "data/raw/usbr_natural_flow/NaturalFlows1906-2020_20221215.xlsx",
        "magic": b"PK\x03\x04",
        "locator_summary": "Annual/Monthly 29-node natural flow workbook (archival sub-basin reference through WY 2020)",
        "used_by_pages": "sankey.html, data_sources.html",
    },
    {
        "source_id": "usbr_uc_cul_1971_2024",
        "category": "accounting_archive",
        "agency": "U.S. Bureau of Reclamation (Upper Colorado Basin Region)",
        "title": "Upper Colorado River System Consumptive Uses and Losses Summary (1971-2024 Complete)",
        "period": "CY 1971-2024",
        "period_basis": "CY",
        "official_url": "https://www.usbr.gov/uc/DocLibrary/Reports/ConsumptiveUsesLosses/20251201-UpperColoradoCUL1971-2025_v24.5_MajorTribSummary-DataSummariesFigures.xlsx",
        "local_path": "data/raw/usbr_consumptive_use/UpperColoradoCUL1971-2025_Summary.xlsx",
        "magic": b"PK\x03\x04",
        "locator_summary": "Sheet 'Summary', Rows 6-28 & 37-259, Cols AO:BH (CY 2005-2024) & Col BL ('20 yr')",
        "used_by_pages": "sankey.html, index.html, pipeline.html, data_sources.html",
    },
    {
        "source_id": "usbr_lc_cul_1971_2024",
        "category": "accounting_archive",
        "agency": "U.S. Bureau of Reclamation (Lower Colorado Region)",
        "title": "Lower Colorado River System Consumptive Uses and Losses Data (1971-2024)",
        "period": "CY 1971-2024",
        "period_basis": "CY",
        "official_url": "https://www.usbr.gov/lc/region/g4000/4200Rpts/CULReport/1971-2024%20Lower%20Colorado%20River%20System%20CUL%20Data.xlsx",
        "local_path": "data/raw/usbr_consumptive_use/LowerColoradoCUL1971-2024_Data.xlsx",
        "magic": b"PK\x03\x04",
        "locator_summary": "Tabs 'Mainstream', 'Mainstream_Reservoirs', 'Mexico', 'Tributary', YEAR 2005-2024",
        "used_by_pages": "sankey.html, index.html, pipeline.html, data_sources.html",
    },
    {
        "source_id": "usbr_decree_acct_2024",
        "category": "accounting_archive",
        "agency": "U.S. Bureau of Reclamation (Lower Colorado Region)",
        "title": "Colorado River Accounting and Water Use Report: Arizona, California, and Nevada (CY 2024)",
        "period": "CY 2024",
        "period_basis": "CY",
        "official_url": "https://www.usbr.gov/lc/region/g4000/4200Rpts/DecreeRpt/2024/2024.pdf",
        "local_path": "data/raw/usbr_consumptive_use/2024_LowerColorado_Decree_Accounting.pdf",
        "magic": b"%PDF",
        "locator_summary": "Article V Decree Accounting annual contractor diversions, return flows & net consumptive use",
        "used_by_pages": "data_sources.html, law.html",
    },
    {
        "source_id": "usbr_uc_cul_rpt_2021_2025",
        "category": "accounting_archive",
        "agency": "U.S. Bureau of Reclamation (Upper Colorado Basin Region)",
        "title": "Provisional Upper Colorado River System Consumptive Uses and Losses Report (2021-2025)",
        "period": "CY 2021-2025",
        "period_basis": "CY",
        "official_url": "https://www.usbr.gov/uc/DocLibrary/Reports/ConsumptiveUsesLosses/uc-ucrb-provisionalconsumptiveusesandlosses-2021-2025-508-20251200.pdf",
        "local_path": "data/raw/usbr_consumptive_use/Provisional_UpperColorado_CUL_2021-2025.pdf",
        "magic": b"%PDF",
        "locator_summary": "Upper Basin CUL narrative, eeMETRIC/OpenET methodology & summary tables",
        "used_by_pages": "data_sources.html",
    },
    {
        "source_id": "compact_1922",
        "category": "compact",
        "agency": "Seven Basin States / U.S. Congress (42 Stat. 171)",
        "title": "1922 Colorado River Compact",
        "period": "1922-Present (Perpetual)",
        "period_basis": "Statutory",
        "official_url": "https://www.usbr.gov/lc/region/g1000/pdfiles/crcompct.pdf",
        "local_path": "data/raw/legal_compacts/1922_Colorado_River_Compact.pdf",
        "magic": b"%PDF",
        "locator_summary": "Art. III(a) 7.5+7.5 MAF; Art. III(b) +1.0 MAF; Art. III(d) 75 MAF/10-yr Lees Ferry floor",
        "used_by_pages": "index.html, law.html, sankey.html, data_sources.html",
    },
    {
        "source_id": "compact_1948_upper",
        "category": "compact",
        "agency": "Upper Division States / U.S. Congress (63 Stat. 31)",
        "title": "1948 Upper Colorado River Basin Compact",
        "period": "1948-Present (Perpetual)",
        "period_basis": "Statutory",
        "official_url": "https://www.govinfo.gov/content/pkg/STATUTE-63/pdf/STATUTE-63-Pg31.pdf",
        "local_path": "data/raw/legal_compacts/1948_Upper_Colorado_River_Basin_Compact_63Stat31.pdf",
        "magic": b"%PDF",
        "locator_summary": "Art. III(a): AZ 50,000 AF/yr; remainder CO 51.75%, UT 23.00%, WY 14.00%, NM 11.25%",
        "used_by_pages": "index.html, law.html, data_sources.html",
    },
    {
        "source_id": "usbr_mead_eom_1935_present",
        "category": "historical_series",
        "agency": "U.S. Bureau of Reclamation (Lower Colorado Region)",
        "title": "Lake Mead at Hoover Dam End-of-Month Elevations (1935-Present)",
        "period": "Feb 1935 - Present",
        "period_basis": "EOM",
        "official_url": "https://www.usbr.gov/lc/region/g4000/hourly/mead-elv.html",
        "local_path": "data/raw/reservoirs/mead-elv.html",
        "magic": b"<",
        "locator_summary": "HTML tables (1935-Present JAN-DEC EOM feet NGVD29)",
        "used_by_pages": "index.html, data_sources.html",
    },
    {
        "source_id": "usbr_919_powell_stor",
        "category": "historical_series",
        "agency": "U.S. Bureau of Reclamation (HydroData)",
        "title": "Lake Powell Daily Storage Volume CSV (Site 919, Datatype 17)",
        "period": "1963 - Present",
        "period_basis": "Daily",
        "official_url": "https://www.usbr.gov/uc/water/hydrodata/reservoir_data/919/csv/17.csv",
        "local_path": "data/raw/reservoirs/usbr_919_powell_17_storage.csv",
        "magic": b"",
        "locator_summary": "CSV columns datetime,value (Acre-Feet)",
        "used_by_pages": "index.html, ml_analysis.html, sankey.html, data_sources.html",
    },
    {
        "source_id": "usbr_919_powell_elev",
        "category": "historical_series",
        "agency": "U.S. Bureau of Reclamation (HydroData)",
        "title": "Lake Powell Daily Surface Elevation CSV (Site 919, Datatype 49)",
        "period": "1963 - Present",
        "period_basis": "Daily",
        "official_url": "https://www.usbr.gov/uc/water/hydrodata/reservoir_data/919/csv/49.csv",
        "local_path": "data/raw/reservoirs/usbr_919_powell_49_elevation.csv",
        "magic": b"",
        "locator_summary": "CSV columns datetime,value (ft NGVD29)",
        "used_by_pages": "index.html, ml_analysis.html, data_sources.html",
    },
    {
        "source_id": "usbr_921_mead_stor",
        "category": "historical_series",
        "agency": "U.S. Bureau of Reclamation (HydroData)",
        "title": "Lake Mead Daily Storage Volume CSV (Site 921, Datatype 17)",
        "period": "May 1937 - Present",
        "period_basis": "Daily",
        "official_url": "https://www.usbr.gov/uc/water/hydrodata/reservoir_data/921/csv/17.csv",
        "local_path": "data/raw/reservoirs/usbr_921_mead_17_storage.csv",
        "magic": b"",
        "locator_summary": "CSV columns datetime,value (Acre-Feet)",
        "used_by_pages": "index.html, sankey.html, data_sources.html",
    },
    {
        "source_id": "usbr_921_mead_elev",
        "category": "historical_series",
        "agency": "U.S. Bureau of Reclamation (HydroData)",
        "title": "Lake Mead Daily Surface Elevation CSV (Site 921, Datatype 49)",
        "period": "1935 - Present",
        "period_basis": "Daily",
        "official_url": "https://www.usbr.gov/uc/water/hydrodata/reservoir_data/921/csv/49.csv",
        "local_path": "data/raw/reservoirs/usbr_921_mead_49_elevation.csv",
        "magic": b"",
        "locator_summary": "CSV columns datetime,value (ft NGVD29)",
        "used_by_pages": "index.html, data_sources.html",
    },
    {
        "source_id": "usbr_917_fg_stor",
        "category": "historical_series",
        "agency": "U.S. Bureau of Reclamation (HydroData)",
        "title": "Flaming Gorge Daily Storage Volume CSV (Site 917, Datatype 17)",
        "period": "1962 - Present",
        "period_basis": "Daily",
        "official_url": "https://www.usbr.gov/uc/water/hydrodata/reservoir_data/917/csv/17.csv",
        "local_path": "data/raw/reservoirs/usbr_917_flaming_gorge_17_storage.csv",
        "magic": b"",
        "locator_summary": "CSV columns datetime,value (Acre-Feet)",
        "used_by_pages": "index.html, sankey.html, data_sources.html",
    },
    {
        "source_id": "usbr_917_fg_elev",
        "category": "historical_series",
        "agency": "U.S. Bureau of Reclamation (HydroData)",
        "title": "Flaming Gorge Daily Surface Elevation CSV (Site 917, Datatype 49)",
        "period": "1962 - Present",
        "period_basis": "Daily",
        "official_url": "https://www.usbr.gov/uc/water/hydrodata/reservoir_data/917/csv/49.csv",
        "local_path": "data/raw/reservoirs/usbr_917_flaming_gorge_49_elevation.csv",
        "magic": b"",
        "locator_summary": "CSV columns datetime,value (ft)",
        "used_by_pages": "index.html, data_sources.html",
    },
    {
        "source_id": "usbr_920_navajo_stor",
        "category": "historical_series",
        "agency": "U.S. Bureau of Reclamation (HydroData)",
        "title": "Navajo Reservoir Daily Storage Volume CSV (Site 920, Datatype 17)",
        "period": "1962 - Present",
        "period_basis": "Daily",
        "official_url": "https://www.usbr.gov/uc/water/hydrodata/reservoir_data/920/csv/17.csv",
        "local_path": "data/raw/reservoirs/usbr_920_navajo_17_storage.csv",
        "magic": b"",
        "locator_summary": "CSV columns datetime,value (Acre-Feet)",
        "used_by_pages": "index.html, sankey.html, data_sources.html",
    },
    {
        "source_id": "usbr_920_navajo_elev",
        "category": "historical_series",
        "agency": "U.S. Bureau of Reclamation (HydroData)",
        "title": "Navajo Reservoir Daily Surface Elevation CSV (Site 920, Datatype 49)",
        "period": "1962 - Present",
        "period_basis": "Daily",
        "official_url": "https://www.usbr.gov/uc/water/hydrodata/reservoir_data/920/csv/49.csv",
        "local_path": "data/raw/reservoirs/usbr_920_navajo_49_elevation.csv",
        "magic": b"",
        "locator_summary": "CSV columns datetime,value (ft)",
        "used_by_pages": "index.html, data_sources.html",
    },
    {
        "source_id": "usbr_913_bluemesa_stor",
        "category": "historical_series",
        "agency": "U.S. Bureau of Reclamation (HydroData)",
        "title": "Blue Mesa Reservoir Daily Storage Volume CSV (Site 913, Datatype 17)",
        "period": "1965 - Present",
        "period_basis": "Daily",
        "official_url": "https://www.usbr.gov/uc/water/hydrodata/reservoir_data/913/csv/17.csv",
        "local_path": "data/raw/reservoirs/usbr_913_blue_mesa_17_storage.csv",
        "magic": b"",
        "locator_summary": "CSV columns datetime,value (Acre-Feet)",
        "used_by_pages": "index.html, sankey.html, data_sources.html",
    },
    {
        "source_id": "usbr_913_bluemesa_elev",
        "category": "historical_series",
        "agency": "U.S. Bureau of Reclamation (HydroData)",
        "title": "Blue Mesa Reservoir Daily Surface Elevation CSV (Site 913, Datatype 49)",
        "period": "1965 - Present",
        "period_basis": "Daily",
        "official_url": "https://www.usbr.gov/uc/water/hydrodata/reservoir_data/913/csv/49.csv",
        "local_path": "data/raw/reservoirs/usbr_913_blue_mesa_49_elevation.csv",
        "magic": b"",
        "locator_summary": "CSV columns datetime,value (ft)",
        "used_by_pages": "index.html, data_sources.html",
    },
    {
        "source_id": "cdwr_dillon_daily",
        "category": "historical_series",
        "agency": "Colorado Division of Water Resources (CDSS)",
        "title": "Dillon Reservoir Historical Daily Elevation & Storage (DILRESCO)",
        "period": "1984 - Present",
        "period_basis": "Daily",
        "official_url": "https://dwr.state.co.us/Rest/GET/api/v2/telemetrystations/telemetrytimeseriesday/?format=json&abbrev=DILRESCO&startDate=01%2F01%2F1984&endDate=12%2F31%2F2026",
        "local_path": "data/raw/reservoirs/cdwr_dilresco_daily.json",
        "magic": b"{",
        "locator_summary": "JSON ResultList parameter='ELEV' and 'STORAGE'",
        "used_by_pages": "index.html, data_sources.html",
    },
    {
        "source_id": "cdwr_granby_daily",
        "category": "historical_series",
        "agency": "Colorado Division of Water Resources (CDSS)",
        "title": "Lake Granby Historical Daily Elevation & Storage (GRARESCO)",
        "period": "1984 - Present",
        "period_basis": "Daily",
        "official_url": "https://dwr.state.co.us/Rest/GET/api/v2/telemetrystations/telemetrytimeseriesday/?format=json&abbrev=GRARESCO&startDate=01%2F01%2F1984&endDate=12%2F31%2F2026",
        "local_path": "data/raw/reservoirs/cdwr_graresco_daily.json",
        "magic": b"{",
        "locator_summary": "JSON ResultList parameter='ELEV' and 'STORAGE'",
        "used_by_pages": "index.html, data_sources.html",
    },
    {
        "source_id": "usgs_lees_ferry_dv",
        "category": "historical_series",
        "agency": "U.S. Geological Survey (NWIS)",
        "title": "Colorado River at Lees Ferry Daily Discharge (09380000, WY 1922-Present)",
        "period": "1921-10-01 - Present",
        "period_basis": "Daily/WY",
        "official_url": "https://waterservices.usgs.gov/nwis/dv/?format=json&sites=09380000&parameterCd=00060&startDT=1921-10-01&endDT=2026-12-31",
        "local_path": "data/raw/usgs_baselines/usgs_lees_ferry_09380000_dv.json",
        "magic": b"{",
        "locator_summary": "NWIS dv JSON timeSeries[0].values[0].value (parameterCd=00060 cfs)",
        "used_by_pages": "index.html, data_sources.html",
    },
    {
        "source_id": "usgs_water_budget_gages_dv",
        "category": "historical_series",
        "agency": "U.S. Geological Survey (NWIS)",
        "title": "Basin Sentinel & Lower Mainstem Tributary Daily Discharge (2004-2025)",
        "period": "2004-10-01 - 2025-09-30",
        "period_basis": "CY/WY",
        "official_url": "https://waterservices.usgs.gov/nwis/dv/?format=json&sites=09180500,09315000,09379500,09380000,09382000,09402000,09415000,09419000,09426000&parameterCd=00060&startDT=1999-10-01&endDT=2025-09-30",
        "local_path": "data/raw/usgs_baselines/usgs_budget_and_inflow_gages_dv.json",
        "magic": b"{",
        "locator_summary": "NWIS dv JSON parameterCd=00060 for 9 basin sentinel & lower tributary gages",
        "used_by_pages": "sankey.html, index.html, data_sources.html",
    },
    {
        "source_id": "usgs_tributary_wy2016_2025_dv",
        "category": "historical_series",
        "agency": "U.S. Geological Survey (NWIS)",
        "title": "Upper Basin Tributary & Flashiness Daily Discharge (WY 2016-2025)",
        "period": "WY 2016-2025",
        "period_basis": "WY",
        "official_url": "https://waterservices.usgs.gov/nwis/dv/?format=json&sites=09180500,09315000,09379500,09234500,09333500,09337500,09380000,09429500,09095500,09382000,09520500&parameterCd=00060&startDT=2015-10-01&endDT=2025-09-30",
        "local_path": "data/raw/usgs_baselines/usgs_tributary_wy2016_2025_dv.json",
        "magic": b"{",
        "locator_summary": "NWIS dv JSON parameterCd=00060 for WY 2016-2025 RBI & WY 2021 pulse comparison",
        "used_by_pages": "ml_analysis.html, telemetry.html, data_sources.html",
    },
    {
        "source_id": "usgs_daily_normals_stat",
        "category": "historical_series",
        "agency": "U.S. Geological Survey (NWIS)",
        "title": "USGS Historical Daily-Mean Streamflow Statistics (Full Period of Record per Gage)",
        "period": "Full Gage POR",
        "period_basis": "POR",
        "official_url": "https://waterservices.usgs.gov/nwis/stat/?format=rdb&sites=09095500,09260050,09379500,09402000,09382000,09380000,09527700&parameterCd=00060&statReportType=daily&statType=mean",
        "local_path": "data/raw/usgs_baselines/usgs_daily_normals_74sites.rdb",
        "magic": b"#",
        "locator_summary": "NWIS stat RDB columns site_no, begin_yr, end_yr, count_nu, month_nu, day_nu, mean_va",
        "used_by_pages": "telemetry.html, ml_analysis.html, data_sources.html",
    },
    {
        "source_id": "cdwr_tunnels_daily",
        "category": "historical_series",
        "agency": "Colorado Division of Water Resources (CDSS)",
        "title": "Colorado Trans-Mountain Tunnel Daily Discharge (2022-2024)",
        "period": "CY 2022-2024",
        "period_basis": "CY",
        "official_url": "https://dwr.state.co.us/Rest/GET/api/v2/telemetrystations/telemetrytimeseriesday/?format=json&abbrev=ADATUNCO&startDate=01%2F01%2F2022&endDate=12%2F31%2F2024",
        "local_path": "data/raw/usgs_baselines/cdwr_tunnels_daily_2022_2024.json",
        "magic": b"{",
        "locator_summary": "Combined CDWR JSON daily timeseries for ADATUNCO, MOFTUNCO, ROBTUNCO, BOUTUNCO",
        "used_by_pages": "ml_analysis.html, data_sources.html",
    },
]


def download_file(url: str, dest: str, timeout: int = 90) -> None:
    os.makedirs(os.path.dirname(dest), exist_ok=True)
    cmd = ["curl", "-sSL", "--fail", "--max-time", str(timeout), "-A", "DAT1001-Colorado-River-Pipeline/2.0", "-o", dest, url]
    res = subprocess.run(cmd, capture_output=True, text=True)
    if res.returncode != 0:
        raise RuntimeError(f"curl failed ({res.returncode}) for {url}: {res.stderr.strip()}")


def build_combined_tunnel_json(dest: str) -> None:
    import json
    os.makedirs(os.path.dirname(dest), exist_ok=True)
    out = {}
    for abbrev in ("ADATUNCO", "MOFTUNCO", "ROBTUNCO", "BOUTUNCO"):
        url = (
            "https://dwr.state.co.us/Rest/GET/api/v2/telemetrystations/telemetrytimeseriesday/"
            f"?format=json&abbrev={abbrev}&startDate=01%2F01%2F2022&endDate=12%2F31%2F2024"
        )
        tmp = dest + f".{abbrev}.tmp"
        download_file(url, tmp)
        with open(tmp, "r", encoding="utf-8") as f:
            out[abbrev] = json.load(f).get("ResultList", [])
        os.remove(tmp)
    with open(dest, "w", encoding="utf-8") as f:
        json.dump(out, f)


def download_full_normals_rdb(dest: str) -> None:
    import ast
    normals_src = os.path.join(REPO_ROOT, "src", "fetch_historical_normals.py")
    with open(normals_src, "r", encoding="utf-8") as f:
        tree = ast.parse(f.read(), filename=normals_src)
    gauge_sites = None
    for node in tree.body:
        if isinstance(node, ast.Assign) and any(getattr(t, "id", None) == "GAUGE_SITES" for t in node.targets):
            gauge_sites = ast.literal_eval(node.value)
            break
    if not gauge_sites:
        raise RuntimeError("Could not parse GAUGE_SITES from src/fetch_historical_normals.py")
    os.makedirs(os.path.dirname(dest), exist_ok=True)
    from concurrent.futures import ThreadPoolExecutor
    lines_out = []
    batch_size = 8
    header_written = False

    def fetch_batch(i_batch):
        i, batch = i_batch
        url = (
            "https://waterservices.usgs.gov/nwis/stat/?format=rdb"
            f"&sites={','.join(batch)}&parameterCd=00060&statReportType=daily&statType=mean"
        )
        tmp = dest + f".b{i}.tmp"
        try:
            download_file(url, tmp, timeout=20)
            txt = open(tmp, "r", encoding="utf-8", errors="ignore").readlines()
            os.remove(tmp)
            return txt
        except RuntimeError:
            if os.path.exists(tmp):
                os.remove(tmp)
            out_lines = []
            for sid in batch:
                u1 = (
                    "https://waterservices.usgs.gov/nwis/stat/?format=rdb"
                    f"&sites={sid}&parameterCd=00060&statReportType=daily&statType=mean"
                )
                t1 = dest + f".{sid}.tmp"
                try:
                    download_file(u1, t1, timeout=12)
                    out_lines.extend(open(t1, "r", encoding="utf-8", errors="ignore").readlines())
                except RuntimeError:
                    pass
                finally:
                    if os.path.exists(t1):
                        os.remove(t1)
            return out_lines

    batches = [(i, gauge_sites[i:i + batch_size]) for i in range(0, len(gauge_sites), batch_size)]
    with ThreadPoolExecutor(max_workers=4) as pool:
        for chunk_lines in pool.map(fetch_batch, batches):
            for line in chunk_lines:
                if not header_written or (not line.startswith("#") and not line.startswith("agency_cd") and not line.startswith("5s")):
                    lines_out.append(line)
            if chunk_lines:
                header_written = True

    with open(dest, "w", encoding="utf-8") as f:
        f.writelines(lines_out)


def sha256_file(path: str) -> tuple[int, str]:
    h = hashlib.sha256()
    size = 0
    with open(path, "rb") as f:
        while chunk := f.read(65536):
            h.update(chunk)
            size += len(chunk)
    return size, h.hexdigest()


def main():
    refresh = "--refresh" in sys.argv
    os.makedirs(RAW_DIR, exist_ok=True)
    now_iso = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

    # Preserve existing timestamps if file already exists and not --refresh
    prev_manifest = {}
    if os.path.exists(MANIFEST_PATH):
        with open(MANIFEST_PATH, newline="", encoding="utf-8") as f:
            for r in csv.DictReader(f):
                prev_manifest[r["source_id"]] = r

    manifest_rows = []
    for src in SOURCES:
        abs_path = os.path.join(REPO_ROOT, src["local_path"])
        retrieved_at = now_iso
        if os.path.exists(abs_path) and not refresh:
            retrieved_at = prev_manifest.get(src["source_id"], {}).get("retrieved_at_utc", now_iso)
            print(f"[SKIP] {src['source_id']} already present ({src['local_path']})")
        else:
            print(f"[GET ] {src['source_id']} -> {src['local_path']}")
            if src["source_id"] == "cdwr_tunnels_daily":
                build_combined_tunnel_json(abs_path)
            elif src["source_id"] == "usgs_daily_normals_stat":
                download_full_normals_rdb(abs_path)
            else:
                download_file(src["official_url"], abs_path)

        with open(abs_path, "rb") as f:
            head = f.read(16)
        if src["magic"] and not head.lstrip().startswith(src["magic"]):
            raise ValueError(f"Magic byte mismatch for {src['local_path']}: got {head[:16]!r}")

        n_bytes, digest = sha256_file(abs_path)
        if n_bytes == 0:
            raise ValueError(f"Empty file downloaded: {src['local_path']}")

        manifest_rows.append({
            "source_id": src["source_id"],
            "category": src["category"],
            "agency": src["agency"],
            "title": src["title"],
            "period": src["period"],
            "period_basis": src["period_basis"],
            "official_url": src["official_url"],
            "local_path": src["local_path"],
            "retrieved_at_utc": retrieved_at,
            "bytes": n_bytes,
            "sha256": digest,
            "locator_summary": src["locator_summary"],
            "used_by_pages": src["used_by_pages"],
        })

    fieldnames = [
        "source_id", "category", "agency", "title", "period", "period_basis",
        "official_url", "local_path", "retrieved_at_utc", "bytes", "sha256",
        "locator_summary", "used_by_pages",
    ]
    with open(MANIFEST_PATH, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=fieldnames)
        w.writeheader()
        w.writerows(manifest_rows)

    total_mb = sum(int(r["bytes"]) for r in manifest_rows) / (1024 * 1024)
    print(f"\n[DONE] Archived {len(manifest_rows)} sources ({total_mb:.2f} MB) -> {MANIFEST_PATH}")


if __name__ == "__main__":
    main()
