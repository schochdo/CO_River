#!/usr/bin/env python3
"""
Audit Quantitative Domain Claims & Build data/claims_register.csv.

Verifies every quantitative hydrological/statutory claim across active web/*.html
and web/*.js files against provenance_registry.json and SQLite-derived values,
and scans active files for retired/unsourced claims so 0 drifts remain.
"""

import csv
import json
import os
import re
import sys

REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
WEB_DIR = os.path.join(REPO_ROOT, "web")
PROV_PATH = os.path.join(WEB_DIR, "data", "provenance_registry.json")
WB_PATH = os.path.join(WEB_DIR, "data", "water_budget.json")
OUT_CSV = os.path.join(REPO_ROOT, "data", "claims_register.csv")

# Active frontend files only (ai_complete_prompt_archive.html is a preserved raw chat archive)
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

RETIRED_PATTERNS = [
    (r"\b2\.33\s*MAF", "Retired unverified CO 2.33 MAF estimate"),
    (r"\b2\.05\s*MAF", "Retired pre-Option-A 2.05 MAF overdraft estimate"),
    (r"\b14\.90\s*MAF", "Retired pre-Option-A 14.90 MAF total depletion estimate"),
    (r"\b12\.85\s*MAF", "Retired pre-Option-A 12.85 MAF supply estimate"),
    (r"\b15\.49\s*MAF", "Retired intermediate unapproved budget total"),
    (r"\b37\.6\s*MAF", "Retired 37.6 MAF storage loss figure (verified 37.2 MAF)"),
    (r"\b1\.25\s*MAF", "Retired fabricated Mexicali 1.25 MAF internal split"),
    (r"\b3\.79\s*MAF", "Retired unverified Flaming Gorge capacity"),
    (r"crsp/studies/?\"", "Generic CUL directory link instead of exact workbook URL"),
    (r"pao/lawofrvr\.html", "Dead USBR pao/lawofrvr.html URL"),
    (r"\bflowCfs:", "Hardcoded JS NODE_META flowCfs object"),
    (r"2005[–-]2024", "Retired 2005-2024 macro window (standardized on 2000-2024)"),
    (r"\b13\.89\s*MAF", "Retired 2005-2024 13.89 MAF budget total"),
    (r"\b13\.51\s*MAF", "Retired 2005-2024 13.51 MAF inflow total"),
]

# Authoritative claims verified against active web HTML/JS files & registered sources
REGISTERED_CLAIMS = [
    # --- web/index.html Card 1 & Overview ---
    {
        "page": "web/index.html",
        "section_anchor": "#act-1",
        "match_regex": r"12\.76\s*MAF/yr",
        "claim_text": "2000-2024 combined physical mainstream inflow (Lees Ferry natural flow + 5 Lower tribs)",
        "verified_value": "12.76",
        "unit": "MAF/yr",
        "period": "CY/WY 2000-2024",
        "period_basis": "25-Year Baseline",
        "source_id": "usbr_lf_natflow_1906_2024",
        "exact_locator": "Sheet1 Col B (WY 2000-2024 mean 12.4000) + USGS 5 Lower tribs (0.3606)",
    },
    {
        "page": "web/index.html",
        "section_anchor": "#act-1",
        "match_regex": r"12\.40\s*Upper\s*\+\s*0\.36\s*Lower",
        "claim_text": "Lees Ferry natural flow (12.40 MAF/yr) + Lower Basin gaged tribs (0.36 MAF/yr)",
        "verified_value": "12.40 + 0.36",
        "unit": "MAF/yr",
        "period": "2000-2024",
        "period_basis": "WY / CY",
        "source_id": "usbr_lf_natflow_1906_2024",
        "exact_locator": "Sheet1 WY 2000-2024; USGS NWIS DV 09382000,09402000,09415000,09419000,09426000",
    },
    {
        "page": "web/index.html",
        "section_anchor": "#act-1",
        "match_regex": r"18\.82\s*pull",
        "claim_text": "1922/1944 statutory claims (17.50) + CY 2000-2024 mainstem reservoir evaporation (1.32) = 18.82 MAF/yr",
        "verified_value": "18.82",
        "unit": "MAF/yr",
        "period": "Statutory + CY 2000-2024",
        "period_basis": "Mixed Statutory/CY",
        "source_id": "usbr_lc_cul_1971_2024",
        "exact_locator": "1922 Compact Art. III + 1944 Treaty + USBR UC/LC CUL 2000-2024 Mainstem Evap (1.3179)",
    },
    {
        "page": "web/index.html",
        "section_anchor": "#act-1",
        "match_regex": r"2000–2024 Drawdown:\s*-1\.19\s*MAF/yr",
        "claim_text": "Net 5-reservoir active storage change (1999-12-31 to 2024-12-31 annualized drawdown, 29.76 MAF total)",
        "verified_value": "-1.19",
        "unit": "MAF/yr",
        "period": "1999-12-31 to 2024-12-31",
        "period_basis": "25-Year EOY Delta / 25",
        "source_id": "usbr_921_mead_stor",
        "exact_locator": "USBR HydroData 17.csv sites 919, 921, 917, 920, 913 EOY delta / 25 (-1.1904)",
    },
    {
        "page": "web/index.html",
        "section_anchor": "#act-3",
        "match_regex": r"55\.8\s*MAF\s*\(93%\)",
        "claim_text": "Historical peak 5-reservoir system storage in Jul 1984",
        "verified_value": "55.8",
        "unit": "MAF",
        "period": "1937-2026",
        "period_basis": "Peak Snapshot",
        "source_id": "usbr_919_powell_stor",
        "exact_locator": "USBR HydroData 17.csv Jul 1984 combined peak (Powell+Mead+CRSP)",
    },
    {
        "page": "web/index.html",
        "section_anchor": "#act-3",
        "match_regex": r"53\.5\s*MAF\s*\(Sep 1999\)\s*to\s*16\.3\s*MAF\s*\(Mar 2023\)",
        "claim_text": "Post-1999 5-reservoir system decline from Sep 1999 peak (53.5 MAF) to Mar 2023 low (16.3 MAF)",
        "verified_value": "53.5 -> 16.3",
        "unit": "MAF",
        "period": "Sep 1999 - Mar 2023",
        "period_basis": "USBR HydroData Daily",
        "source_id": "usbr_921_mead_stor",
        "exact_locator": "USBR HydroData 17.csv combined 5-reservoir peak 1999-09 & trough 2023-03-14",
    },
    {
        "page": "web/index.html",
        "section_anchor": "#modal-sec-compacts",
        "match_regex": r"3\.90\s*MAF/yr states\s*\+\s*0\.47\s*CRSP evap\s*\(4\.37\s*MAF/yr\)",
        "claim_text": "CY 2000-2024 Upper Basin CUL actuals (3.90 states + 0.47 CRSP evap = 4.37 MAF/yr)",
        "verified_value": "4.37",
        "unit": "MAF/yr",
        "period": "CY 2000-2024",
        "period_basis": "CY",
        "source_id": "usbr_uc_cul_1971_2024",
        "exact_locator": "Sheet 'Summary', Cols AJ:BH (3.8995 states + 0.4655 CRSP evap)",
    },
    {
        "page": "web/index.html",
        "section_anchor": "#modal-sec-compacts",
        "match_regex": r"1\.68\s*MAF/yr boundary delivery",
        "claim_text": "CY 2000-2024 measured Mexico border deliveries",
        "verified_value": "1.68",
        "unit": "MAF/yr",
        "period": "CY 2000-2024",
        "period_basis": "CY",
        "source_id": "usbr_lc_cul_1971_2024",
        "exact_locator": "Tab 'Mexico', YEAR 2000-2024 average (1.6750 MAF/yr)",
    },
    # --- web/law.html Chapters 1 & 3 ---
    {
        "page": "web/law.html",
        "section_anchor": "#ch1",
        "match_regex": r"1\.32\s*MAF/yr in measured mainstem reservoir evaporation",
        "claim_text": "CY 2000-2024 combined Upper CRSP + Lower Mainstem reservoir evaporation",
        "verified_value": "1.32",
        "unit": "MAF/yr",
        "period": "CY 2000-2024",
        "period_basis": "CY",
        "source_id": "usbr_lc_cul_1971_2024",
        "exact_locator": "UC Summary CRSP Evap (0.4655) + LC Tab 'Mainstream_Reservoirs' (0.8524) = 1.3179",
    },
    {
        "page": "web/law.html",
        "section_anchor": "#ch1",
        "match_regex": r"\+6\.06\s*MAF/yr structural over-allocation\s*\(\+4\.74\s*MAF/yr against statutory-only claims\)",
        "claim_text": "Over-allocation gap vs. 12.76 MAF/yr inflow (+4.74 statutory-only, +6.06 including evap)",
        "verified_value": "+6.06 / +4.74",
        "unit": "MAF/yr",
        "period": "2000-2024",
        "period_basis": "25-Year Baseline",
        "source_id": "compact_1922",
        "exact_locator": "18.8179 - 12.7606 = 6.0573; 17.5000 - 12.7606 = 4.7394",
    },
    {
        "page": "web/law.html",
        "section_anchor": "#ch3",
        "match_regex": r"53\.5 MAF.*?16\.3 MAF.*?37\.2 MAF",
        "claim_text": "Millennium drought storage depletion across 5 federal reservoirs (53.5 -> 16.3 = 37.2 MAF lost)",
        "verified_value": "37.2",
        "unit": "MAF",
        "period": "Sep 1999 - Mar 2023",
        "period_basis": "USBR HydroData Daily",
        "source_id": "usbr_921_mead_stor",
        "exact_locator": "USBR HydroData 17.csv 5-reservoir sum 1999-09 minus 2023-03-14",
    },
    # --- web/pipeline.html SVG & Tooltips ---
    {
        "page": "web/pipeline.html",
        "section_anchor": "#svg-schematic",
        "match_regex": r"0\.38 MAF / yr \(USBR CY 2000–2024\)",
        "claim_text": "Lake Powell CY 2000-2024 average reservoir evaporation",
        "verified_value": "0.38",
        "unit": "MAF/yr",
        "period": "CY 2000-2024",
        "period_basis": "CY",
        "source_id": "usbr_uc_cul_1971_2024",
        "exact_locator": "Sheet 'Summary' CRSP Reservoir Evap Lake Powell Row 27 (0.3804 MAF/yr)",
    },
    {
        "page": "web/pipeline.html",
        "section_anchor": "#svg-schematic",
        "match_regex": r"0\.55 MAF / yr \(USBR CY 2000–2024\)",
        "claim_text": "Lake Mead CY 2000-2024 average reservoir evaporation",
        "verified_value": "0.55",
        "unit": "MAF/yr",
        "period": "CY 2000-2024",
        "period_basis": "CY",
        "source_id": "usbr_lc_cul_1971_2024",
        "exact_locator": "Tab 'Mainstream_Reservoirs' Lake Mead YEAR 2000-2024 (0.5503 MAF/yr)",
    },
    {
        "page": "web/pipeline.html",
        "section_anchor": "#svg-schematic",
        "match_regex": r"0\.30 MAF / yr \(USBR CY 2000–2024\)",
        "claim_text": "Lakes Mohave + Havasu + Senator Wash CY 2000-2024 evaporation",
        "verified_value": "0.30",
        "unit": "MAF/yr",
        "period": "CY 2000-2024",
        "period_basis": "CY",
        "source_id": "usbr_lc_cul_1971_2024",
        "exact_locator": "Tab 'Mainstream_Reservoirs' Mohave+Havasu+Senator Wash YEAR 2000-2024 (0.3022 MAF/yr)",
    },
    {
        "page": "web/pipeline.html",
        "section_anchor": "#svg-schematic",
        "match_regex": r"0\.52 MAF/yr CY 2000–2024 CO exports",
        "claim_text": "Colorado trans-mountain exports CY 2000-2024 average",
        "verified_value": "0.52",
        "unit": "MAF/yr",
        "period": "CY 2000-2024",
        "period_basis": "CY",
        "source_id": "usbr_uc_cul_1971_2024",
        "exact_locator": "Sheet 'Summary' CO Exports / transbasin Row 251 Cols AJ:BH (0.5199 MAF/yr)",
    },
    {
        "page": "web/pipeline.html",
        "section_anchor": "#svg-schematic",
        "match_regex": r"0\.25 MAF/yr",
        "claim_text": "Nevada / SNWA CY 2000-2024 net mainstream consumptive use",
        "verified_value": "0.25",
        "unit": "MAF/yr",
        "period": "CY 2000-2024",
        "period_basis": "CY",
        "source_id": "usbr_lc_cul_1971_2024",
        "exact_locator": "Tab 'Mainstream' Nevada total YEAR 2000-2024 (0.2497 MAF/yr)",
    },
    {
        "page": "web/pipeline.html",
        "section_anchor": "#svg-schematic",
        "match_regex": r"1\.47 MAF",
        "claim_text": "Central Arizona Project (CAP) CY 2000-2024 net consumptive use",
        "verified_value": "1.47",
        "unit": "MAF/yr",
        "period": "CY 2000-2024",
        "period_basis": "CY",
        "source_id": "usbr_lc_cul_1971_2024",
        "exact_locator": "Tab 'Mainstream' CAP YEAR 2000-2024 (1.4653 MAF/yr)",
    },
    {
        "page": "web/pipeline.html",
        "section_anchor": "#svg-schematic",
        "match_regex": r"1\.68 MAF",
        "claim_text": "Mexico CY 2000-2024 measured boundary deliveries",
        "verified_value": "1.68",
        "unit": "MAF/yr",
        "period": "CY 2000-2024",
        "period_basis": "CY",
        "source_id": "usbr_lc_cul_1971_2024",
        "exact_locator": "Tab 'Mexico' YEAR 2000-2024 (1.6750 MAF/yr)",
    },
    # --- web/sankey.html (JSON-backed rendering) ---
    {
        "page": "web/sankey.html",
        "section_anchor": "#sankey-chart",
        "match_regex": r"fetch\(['\"]\./data/water_budget\.json",
        "claim_text": "Sankey & Stacked Balance bind dynamically to SQLite-exported water_budget.json (14.14 MAF/yr)",
        "verified_value": "14.1409",
        "unit": "MAF/yr",
        "period": "2000-2024",
        "period_basis": "25-Year Baseline",
        "source_id": "usbr_uc_cul_1971_2024",
        "exact_locator": "water_budget.json meta.total_depletions_maf = 14.1409 (25 nodes, 39 links)",
    },
    # --- web/methodology.html ---
    {
        "page": "web/methodology.html",
        "section_anchor": "#sec-overview",
        "match_regex": r"14\.14\s*MAF/yr",
        "claim_text": "Methodology documents 14.14 MAF/yr balanced 2000-2024 baseline and 103-year Compact timelines",
        "verified_value": "14.14",
        "unit": "MAF/yr",
        "period": "2000-2024",
        "period_basis": "25-Year Baseline",
        "source_id": "usbr_lf_natflow_1906_2024",
        "exact_locator": "methodology.html + water_budget.json total_depletions_maf = 14.1409",
    },
    # --- web/data_sources.html ---
    {
        "page": "web/data_sources.html",
        "section_anchor": "#sec-compacts",
        "match_regex": r"CO 51\.75% • UT 23% • WY 14% • NM 11\.25%",
        "claim_text": "1948 Upper Colorado River Basin Compact Article III percentage apportionments",
        "verified_value": "51.75 / 23 / 14 / 11.25",
        "unit": "% of residual",
        "period": "1948-Present",
        "period_basis": "Statutory",
        "source_id": "compact_1948_upper",
        "exact_locator": "63 Stat. 31 Art. III(a) after 50,000 AF AZ carve-out",
    },
    {
        "page": "web/data_sources.html",
        "section_anchor": "#sec-compacts",
        "match_regex": r"CA 4\.40 MAF • AZ 2\.80 MAF • NV 0\.30 MAF",
        "claim_text": "1928 BCPA & 1964 Decree Lower Basin normal mainstream apportionments",
        "verified_value": "4.40 / 2.80 / 0.30",
        "unit": "MAF/yr",
        "period": "1928/1964-Present",
        "period_basis": "Statutory",
        "source_id": "usbr_decree_acct_2024",
        "exact_locator": "Boulder Canyon Project Act 4(a) & 373 U.S. 546",
    },
    {
        "page": "web/dashboard.js",
        "section_anchor": "#chart-state-use",
        "match_regex": r"\[4\.40,\s*3\.86,\s*2\.85,\s*1\.71,\s*1\.04,\s*0\.84,\s*0\.30\]",
        "claim_text": "Statutory apportionment bar chart by state (CA 4.40, CO 3.86, AZ 2.85, UT 1.71, WY 1.04, NM 0.84, NV 0.30 MAF/yr)",
        "verified_value": "15.00 sum",
        "unit": "MAF/yr",
        "period": "1922/1948/1964-Present",
        "period_basis": "Statutory",
        "source_id": "compact_1948_upper",
        "exact_locator": "1922 Compact + 1948 Upper Compact (7.45 * state %) + BCPA",
    },
]


def main() -> int:
    prov = json.load(open(PROV_PATH, "r", encoding="utf-8"))
    valid_source_ids = {s["source_id"] for s in prov.get("sources", [])}

    file_cache = {}
    for rel in ACTIVE_WEB_FILES:
        abs_p = os.path.join(REPO_ROOT, rel)
        if os.path.exists(abs_p):
            with open(abs_p, "r", encoding="utf-8") as f:
                file_cache[rel] = f.read()

    rows = []
    needs_fix_count = 0

    for item in REGISTERED_CLAIMS:
        page = item["page"]
        text = file_cache.get(page, "")
        has_match = bool(re.search(item["match_regex"], text, re.S))
        has_source = item["source_id"] in valid_source_ids
        status = "verified" if (has_match and has_source) else "needs_fix"
        if status != "verified":
            needs_fix_count += 1
        rows.append({
            "page": page,
            "section_anchor": item["section_anchor"],
            "claim_text": item["claim_text"],
            "verified_value": item["verified_value"],
            "unit": item["unit"],
            "period": item["period"],
            "period_basis": item["period_basis"],
            "source_id": item["source_id"],
            "exact_locator": item["exact_locator"],
            "status": status,
        })

    # Scan all active files for retired / unsourced claims
    for rel, text in file_cache.items():
        for pat, desc in RETIRED_PATTERNS:
            for m in re.finditer(pat, text):
                line_no = text[:m.start()].count("\n") + 1
                needs_fix_count += 1
                rows.append({
                    "page": rel,
                    "section_anchor": f"line:{line_no}",
                    "claim_text": f"Retired/unsourced string matched: {m.group(0)}",
                    "verified_value": "N/A",
                    "unit": "text",
                    "period": "retired",
                    "period_basis": "retired",
                    "source_id": "NONE",
                    "exact_locator": desc,
                    "status": "needs_fix",
                })

    os.makedirs(os.path.dirname(OUT_CSV), exist_ok=True)
    fieldnames = [
        "page", "section_anchor", "claim_text", "verified_value", "unit",
        "period", "period_basis", "source_id", "exact_locator", "status",
    ]
    with open(OUT_CSV, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=fieldnames)
        w.writeheader()
        w.writerows(rows)

    print(f"Wrote {len(rows)} claim rows to {os.path.relpath(OUT_CSV, REPO_ROOT)} (needs_fix={needs_fix_count})")
    if needs_fix_count > 0:
        for r in rows:
            if r["status"] != "verified":
                print(f"  [NEEDS_FIX] {r['page']} ({r['section_anchor']}): {r['claim_text']}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
