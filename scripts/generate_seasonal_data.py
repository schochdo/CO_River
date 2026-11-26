#!/usr/bin/env python3
"""
Generates seasonal_regimes.json from SQLite (SSOT) and renders
web/data/charts/compact_accounting_100yr.png from `annual_lees_ferry`.
"""

import os
import sqlite3
import sys

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import pandas as pd

REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if REPO_ROOT not in sys.path:
    sys.path.insert(0, REPO_ROOT)

from scripts.build_database import main as rebuild_database
from scripts.export_sqlite_to_json import DB_PATH, export_seasonal_regimes, get_conn


def render_compact_png(conn: sqlite3.Connection) -> None:
    charts_dir = os.path.join(REPO_ROOT, "web", "data", "charts")
    os.makedirs(charts_dir, exist_ok=True)
    df = pd.read_sql_query(
        """
        SELECT water_year AS wy, natural_flow_maf AS supply_maf,
               gaged_flow_maf AS lees_ferry_release_maf
        FROM annual_lees_ferry
        WHERE water_year >= 1922
        ORDER BY water_year ASC
        """,
        conn,
    )
    if df.empty:
        return

    fig, ax = plt.subplots(figsize=(14, 6.5), dpi=150)
    bars_colors = ["#1e40af" if s >= 16.5 else "#dc2626" for s in df["supply_maf"]]
    ax.bar(df["wy"], df["supply_maf"], color=bars_colors, width=0.85, alpha=0.85, label="USBR Natural Flow at Lees Ferry (MAF)")
    ax.plot(df["wy"], df["lees_ferry_release_maf"], color="#0f172a", linewidth=2.0, label="USGS Lees Ferry Gaged Release (#09380000)")
    ax.axhline(16.5, color="#d97706", linestyle="--", linewidth=2.2, label="1922 Compact + 1944 Treaty Paper Allocation (16.5 MAF/yr)")
    ax.axvline(1963, color="#64748b", linestyle=":", linewidth=1.5, label="1963 Glen Canyon Dam Closure")
    ax.set_title("1922-2024 Water Accounting: USBR Natural Flow vs. 16.5 MAF Paper Allocations", fontsize=14, fontweight="bold", pad=12)
    ax.set_xlabel("Water Year (October 1 - September 30)", fontsize=11, fontweight="600")
    ax.set_ylabel("Annual Water Volume (Million Acre-Feet / yr)", fontsize=11, fontweight="600")
    ax.set_xlim(1920, 2026)
    ax.set_ylim(0, 28)
    ax.grid(axis="y", linestyle="--", alpha=0.4)
    ax.legend(loc="upper right", framealpha=0.95, fontsize=9.5)
    fig.tight_layout()
    out_png = os.path.join(charts_dir, "compact_accounting_100yr.png")
    fig.savefig(out_png)
    plt.close(fig)
    print(f"[EXPORT] {os.path.relpath(out_png, REPO_ROOT)} ({len(df)} water years)")


def run_analysis():
    if not os.path.exists(DB_PATH):
        rebuild_database()
    conn = get_conn(DB_PATH)
    try:
        export_seasonal_regimes(conn)
        render_compact_png(conn)
    finally:
        conn.close()


if __name__ == "__main__":
    run_analysis()
