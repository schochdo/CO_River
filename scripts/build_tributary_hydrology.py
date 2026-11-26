#!/usr/bin/env python3
"""
Delegates tributary hydrology & Lake Powell hypsometry rebuild to the SQLite SSOT
pipeline (`scripts/build_database.py` -> `scripts/export_sqlite_to_json.py`),
preserving downstream schema parity without direct raw-to-JSON bypasses.
"""

import os
import sys

REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if REPO_ROOT not in sys.path:
    sys.path.insert(0, REPO_ROOT)

from scripts.build_database import main as rebuild_database
from scripts.export_sqlite_to_json import DB_PATH, export_tributary_hydrology, get_conn


def main():
    rebuild_database()
    conn = get_conn(DB_PATH)
    try:
        export_tributary_hydrology(conn)
    finally:
        conn.close()


if __name__ == "__main__":
    main()
