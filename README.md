# Colorado River Basin Dashboard (DAT1001)

## Project Overview
A real-time data pipeline and interactive dashboard tracking the hydrology of the Colorado River. This project focuses on the Upper Basin "Plumbing" and trans-mountain diversions to the Front Range.

## Architecture
This project is split into two components to satisfy both academic requirements and portfolio presentation:
1. **Data Science Core (`notebooks/`)**: Jupyter Notebooks used for API exploration, data wrangling, and academic explanation of the hydrology (e.g., the 1922 Compact, the Shoshone Call).
2. **Interactive Web Dashboard (`web/`)**: A fast, static Leaflet/MapLibre frontend that consumes clean JSON outputs from the data pipeline, requiring zero server hosting.

## Sentinel Stations Tracked
### Upper Basin Mainstem (USGS)
* **Dotsero, CO** (Upper mainstem runoff)
* **Cameo, CO** (Above Grand Valley diversions)
* **Cisco, UT** (State line outflow)
* **Lees Ferry, AZ** (The legal dividing line between Upper and Lower Basin)

### Front Range Diversions (CDWR)
* Adams Tunnel (C-BT)
* Moffat Tunnel (Denver Water)
* Roberts Tunnel (Denver Water)

### Mega-Reservoirs (USBR)
* Lake Powell
* Lake Mead

## Quickstart & Environment Setup

### 1. Install Dependencies
```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
npm install
```

### 2. Update Live Telemetry
```bash
npm run update:data
```

### 3. Run Automated Tests
```bash
npm test
```

### 4. Launch Local Web Dashboard
```bash
./start.sh
# Open http://localhost:8000/web/index.html in your browser
```
