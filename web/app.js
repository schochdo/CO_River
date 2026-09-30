// Colorado River Basin Water Infrastructure & Hydrology Dashboard
// Powered by MapLibre GL JS with 3D DEM Terrain Option & Top-Down 2D Default

let map;
let isTilted = false; // Default to clean, readable 2D top-down mode

// Marker and station registry
const markers = {
  gauges: [],
  tunnels: [],
  canals: [],
  reservoirs: []
};
let stationMarkers = {};
let tooltipPopup;
let cachedGeography = null;
let cachedRiverNetwork = null;
let cachedLakes = null;
let cachedMetrics = null;

// Basemap configurations: default to Soft Shaded Relief (Esri Terrain)
const basemapLayerKeys = [
  'esriTerrain', 'esriNatGeo', 'esriPhysical', 'esriSatellite',
  'esriRelief', 'cartoLight', 'usgsRelief', 'openTopo'
];

const initialStyle = {
  version: 8,
  sources: {
    'terrain-dem': {
      type: 'raster-dem',
      tiles: ['https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png'],
      tileSize: 256,
      encoding: 'terrarium',
      maxzoom: 15
    },
    'basemap-esriTerrain': {
      type: 'raster',
      tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Terrain_Base/MapServer/tile/{z}/{y}/{x}'],
      tileSize: 256,
      attribution: 'Tiles &copy; Esri &mdash; USGS, Esri, NPS'
    },
    'basemap-esriNatGeo': {
      type: 'raster',
      tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/NatGeo_World_Map/MapServer/tile/{z}/{y}/{x}'],
      tileSize: 256,
      attribution: 'Tiles &copy; Esri &mdash; National Geographic, USGS, NOAA'
    },
    'basemap-esriPhysical': {
      type: 'raster',
      tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Physical_Map/MapServer/tile/{z}/{y}/{x}'],
      tileSize: 256,
      maxzoom: 8,
      attribution: 'Tiles &copy; Esri &mdash; US NPS, USGS'
    },
    'basemap-esriSatellite': {
      type: 'raster',
      tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'],
      tileSize: 256,
      attribution: 'Tiles &copy; Esri'
    },
    'basemap-esriRelief': {
      type: 'raster',
      tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Shaded_Relief/MapServer/tile/{z}/{y}/{x}'],
      tileSize: 256,
      attribution: 'Tiles &copy; Esri'
    },
    'basemap-cartoLight': {
      type: 'raster',
      tiles: ['https://a.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png'],
      tileSize: 256,
      attribution: '&copy; CartoDB &copy; OpenStreetMap'
    },
    'basemap-usgsRelief': {
      type: 'raster',
      tiles: ['https://basemap.nationalmap.gov/arcgis/rest/services/USGSShadedReliefOnly/MapServer/tile/{z}/{y}/{x}'],
      tileSize: 256,
      attribution: 'Tiles courtesy USGS'
    },
    'basemap-openTopo': {
      type: 'raster',
      tiles: ['https://a.tile.opentopomap.org/{z}/{x}/{y}.png'],
      tileSize: 256,
      attribution: 'Tiles &copy; OpenTopoMap'
    },
    'basemap-labels': {
      type: 'raster',
      tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Reference_Overlay/MapServer/tile/{z}/{y}/{x}'],
      tileSize: 256
    }
  },
  layers: [
    // Soft Shaded Relief (Esri Terrain) active by default
    { id: 'layer-esriTerrain', type: 'raster', source: 'basemap-esriTerrain', layout: { visibility: 'visible' } },
    { id: 'layer-esriNatGeo', type: 'raster', source: 'basemap-esriNatGeo', layout: { visibility: 'none' } },
    { id: 'layer-esriPhysical', type: 'raster', source: 'basemap-esriPhysical', layout: { visibility: 'none' } },
    { id: 'layer-esriSatellite', type: 'raster', source: 'basemap-esriSatellite', layout: { visibility: 'none' } },
    { id: 'layer-esriRelief', type: 'raster', source: 'basemap-esriRelief', layout: { visibility: 'none' } },
    { id: 'layer-cartoLight', type: 'raster', source: 'basemap-cartoLight', layout: { visibility: 'none' } },
    { id: 'layer-usgsRelief', type: 'raster', source: 'basemap-usgsRelief', layout: { visibility: 'none' } },
    { id: 'layer-openTopo', type: 'raster', source: 'basemap-openTopo', layout: { visibility: 'none' } },
    // Reference labels overlay on top of terrain
    { id: 'layer-labels', type: 'raster', source: 'basemap-labels', layout: { visibility: 'visible' }, paint: { 'raster-opacity': 0.85 } }
  ]
};

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    initMap();
  });
} else {
  initMap();
}

function initMap() {
  // Default: clean 2D top-down orientation (pitch 0, bearing 0)
  map = new maplibregl.Map({
    container: 'map',
    style: initialStyle,
    center: [-109.8, 38.5],
    zoom: 6.3,
    pitch: 0,
    bearing: 0,
    maxPitch: 85
  });

  // Pitch & orientation navigation controls
  map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'top-left');
  map.addControl(new maplibregl.TerrainControl({ source: 'terrain-dem', exaggeration: 1.5 }), 'top-left');

  // Shared hover tooltip popup
  tooltipPopup = new maplibregl.Popup({
    closeButton: false,
    closeOnClick: false,
    offset: 12
  });

  map.on('load', () => {
    // Keep 3D terrain registered so toggling 3D tilt is instant
    map.setTerrain({
      source: 'terrain-dem',
      exaggeration: 1.5
    });

    loadData();
  });
}

function changeBasemap(key) {
  basemapLayerKeys.forEach(k => {
    const layerId = `layer-${k}`;
    if (map.getLayer(layerId)) {
      map.setLayoutProperty(layerId, 'visibility', k === key ? 'visible' : 'none');
    }
  });

  // Reference labels overlay for basemaps that lack built-in editorial labels
  const needsLabels = ['esriTerrain', 'esriPhysical', 'esriRelief', 'usgsRelief', 'esriSatellite'].includes(key);
  if (map.getLayer('layer-labels')) {
    map.setLayoutProperty('layer-labels', 'visibility', needsLabels ? 'visible' : 'none');
  }
}

function toggleTilt() {
  const btn = document.getElementById("tilt-toggle-btn");
  if (isTilted) {
    // Switch to top-down 2D mode
    map.easeTo({ pitch: 0, bearing: 0, duration: 1000 });
    isTilted = false;
    if (btn) btn.textContent = "3D Tilt: OFF (Flat 2D)";
  } else {
    // Switch to panoramic 3D tilted relief
    map.easeTo({ pitch: 42, bearing: -10, duration: 1000 });
    isTilted = true;
    if (btn) btn.textContent = "3D Tilt: ON (42°)";
  }
}

async function fetchLiveUSGS() {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 3500);

  try {
    const sites = "09070500,09095500,09152500,09180500,09260050,09379500,09380000,09527700";
    const url = `https://waterservices.usgs.gov/nwis/iv/?format=json&sites=${sites}&parameterCd=00060&siteStatus=all`;
    const res = await fetch(url, { headers: { 'Accept': 'application/json' }, signal: controller.signal });
    clearTimeout(timeoutId);
    if (!res.ok) throw new Error(`USGS HTTP ${res.status}`);
    const data = await res.json();
    const siteNames = {
      "09070500": "Colorado River near Dotsero, CO",
      "09095500": "Colorado River near Cameo, CO",
      "09152500": "Gunnison River near Grand Junction, CO",
      "09180500": "Colorado River near Cisco, UT",
      "09260050": "Yampa River at Deerlodge Park, CO",
      "09379500": "San Juan River near Bluff, UT",
      "09380000": "Colorado River at Lees Ferry, AZ",
      "09527700": "All-American Canal near Imperial Dam"
    };
    const streamflows = [];
    let aac = null;
    const series = data?.value?.timeSeries || [];
    for (const ts of series) {
      const code = ts.sourceInfo.siteCode[0].value;
      const name = siteNames[code] || ts.sourceInfo.siteName;
      const lat = ts.sourceInfo.geoLocation.geogLocation.latitude;
      const lon = ts.sourceInfo.geoLocation.geogLocation.longitude;
      const vals = ts.values[0]?.value;
      if (vals && vals.length > 0) {
        const latest = vals[vals.length - 1];
        const val = parseFloat(latest.value);
        if (val >= 0) {
          if (code === "09527700") {
            aac = { id: code, name, type: "diversion_canal", destination: "Imperial & Coachella Valleys", flow_cfs: val, timestamp: latest.dateTime, lat, lon };
          } else {
            streamflows.push({ id: code, name, type: "streamflow", flow_cfs: val, timestamp: latest.dateTime, lat, lon });
          }
        }
      }
    }
    return { streamflows, aac };
  } catch (e) {
    clearTimeout(timeoutId);
    throw e;
  }
}

function computeRiverWeight(flowCfs, category) {
  if (category === "mainstem") {
    if (flowCfs >= 6000) return 7.5;
    if (flowCfs >= 3000) return 6.0;
    if (flowCfs >= 1000) return 4.6;
    return 3.4;
  } else if (category === "major_tributary") {
    if (flowCfs >= 2500) return 3.2;
    if (flowCfs >= 1000) return 2.5;
    return 2.0;
  } else {
    if (flowCfs >= 400) return 1.6;
    if (flowCfs >= 150) return 1.3;
    return 1.0;
  }
}

function applyLiveHydrology(riverNetwork, metrics) {
  if (!riverNetwork || !riverNetwork.features || !metrics) return;
  
  const streamflows = metrics.streamflows || [];
  const dotsero = streamflows.find(s => s.id === "09070500");
  const cameo = streamflows.find(s => s.id === "09095500");
  const gunnison = streamflows.find(s => s.id === "09152500");
  const cisco = streamflows.find(s => s.id === "09180500");
  const yampa = streamflows.find(s => s.id === "09260050");
  const sanjuan = streamflows.find(s => s.id === "09379500");
  const leesFerry = streamflows.find(s => s.id === "09380000");

  riverNetwork.features.forEach(f => {
    const r = f.properties.reach;
    const cat = f.properties.category || "minor_tributary";
    let flow = f.properties.flow_cfs;
    let sourceLabel = "Hydrologic Baseflow Estimate";
    let gaugeInfo = f.properties.notes || "";
    let timestamp = null;

    if (r === "headwaters") {
      flow = 350;
      sourceLabel = "Snowpack Headwaters Inflow";
      gaugeInfo = "Rocky Mountain NP snowmelt; upstream of Adams Tunnel";
    } else if (r === "gore_canyon") {
      flow = dotsero ? dotsero.flow_cfs : 639;
      sourceLabel = "Live USGS Sentinel Gauge";
      gaugeInfo = "USGS #09070500 near Dotsero, CO";
      timestamp = dotsero ? dotsero.timestamp : null;
    } else if (r === "glenwood_cameo") {
      flow = cameo ? cameo.flow_cfs : 1280;
      sourceLabel = "Live USGS Sentinel Gauge";
      gaugeInfo = "USGS #09095500 near Cameo, CO (Glenwood Canyon)";
      timestamp = cameo ? cameo.timestamp : null;
    } else if (r === "grand_valley_cisco") {
      flow = cisco ? cisco.flow_cfs : 3820;
      sourceLabel = "Live USGS Sentinel Gauge";
      gaugeInfo = "USGS #09180500 near Cisco, UT (CO-UT State Line)";
      timestamp = cisco ? cisco.timestamp : null;
    } else if (r === "cataract_canyon") {
      const ciscoFlow = cisco ? cisco.flow_cfs : 3820;
      flow = Math.round(ciscoFlow + 2850 + 280); // Cisco + Green + Dolores
      sourceLabel = "Confluence Mass Balance (Live)";
      gaugeInfo = "Colorado + Green + Dolores Rivers to Lake Powell";
      timestamp = cisco ? cisco.timestamp : null;
    } else if (r === "lees_ferry") {
      flow = leesFerry ? leesFerry.flow_cfs : 8990;
      sourceLabel = "Live USGS Sentinel Gauge (1922 Compact Divide)";
      gaugeInfo = "USGS #09380000 at Lees Ferry, AZ (Glen Canyon Release)";
      timestamp = leesFerry ? leesFerry.timestamp : null;
    } else if (r === "grand_canyon") {
      const lfFlow = leesFerry ? leesFerry.flow_cfs : 8990;
      flow = Math.round(lfFlow + 250);
      sourceLabel = "Controlled Dam Release & Tributaries";
      gaugeInfo = "Glen Canyon Dam release through 277-mile Grand Canyon to Lake Mead";
      timestamp = leesFerry ? leesFerry.timestamp : null;
    } else if (r === "lower_basin_upper") {
      flow = 7200;
      sourceLabel = "Regulated Reservoir Release";
      gaugeInfo = "Hoover & Davis Dam releases for CRA / CAP municipal water orders";
    } else if (r === "lower_basin_taper") {
      flow = 1200;
      sourceLabel = "Residual Flow Downstream of Diversions";
      gaugeInfo = "Residual channel flow below All-American Canal (2,030 cfs) & Morelos Dam to Mexico";
    } else if (r === "gunnison_river") {
      flow = gunnison ? gunnison.flow_cfs : 1230;
      sourceLabel = "Live USGS Sentinel Gauge";
      gaugeInfo = "USGS #09152500 near Grand Junction, CO";
      timestamp = gunnison ? gunnison.timestamp : null;
    } else if (r === "yampa_river") {
      flow = yampa ? yampa.flow_cfs : 146;
      sourceLabel = "Live USGS Sentinel Gauge";
      gaugeInfo = "USGS #09260050 at Deerlodge Park, CO";
      timestamp = yampa ? yampa.timestamp : null;
    } else if (r === "sanjuan_river") {
      flow = sanjuan ? sanjuan.flow_cfs : 2460;
      sourceLabel = "Live USGS Sentinel Gauge";
      gaugeInfo = "USGS #09379500 near Bluff, UT";
      timestamp = sanjuan ? sanjuan.timestamp : null;
    }

    f.properties.flow_cfs = flow;
    f.properties.weight = computeRiverWeight(flow, cat);
    f.properties.source_label = sourceLabel;
    f.properties.gauge_info = gaugeInfo;
    if (timestamp) f.properties.timestamp = timestamp;
  });

  if (map && map.getSource('rivers')) {
    map.getSource('rivers').setData(riverNetwork);
  }
}

async function loadData(forceLive = false) {
  const syncElem = document.getElementById("sync-time");
  try {
    const t = Date.now();
    
    // 1. Fetch static base geometries on first load
    if (!cachedGeography || !cachedRiverNetwork || !cachedLakes) {
      const [geoRes, riverRes, lakesRes] = await Promise.all([
        fetch(`./data/geography.json?t=${t}`),
        fetch(`./data/river_network.json?t=${t}`),
        fetch(`./data/lakes.geojson?t=${t}`)
      ]);
      cachedGeography = await geoRes.json();
      cachedRiverNetwork = await riverRes.json();
      cachedLakes = await lakesRes.json();
      renderGeography(cachedGeography, cachedRiverNetwork, cachedLakes);
    }

    // 2. Load base metrics JSON snapshot
    const metricsRes = await fetch(`./data/latest_metrics.json?t=${t}`);
    const metrics = await metricsRes.json();
    cachedMetrics = metrics;

    // 3. Immediately render cached metrics so the map and UI are 100% interactive instantly!
    applyLiveHydrology(cachedRiverNetwork, metrics);
    renderMetrics(metrics);
    populateTelemetryTable(metrics);
    updateSidebar(metrics);

    const initialDateStr = formatTimestamp(metrics.fetched_at);
    if (syncElem) syncElem.textContent = `Telemetry Snapshot (${initialDateStr})`;

    // 4. In background (or when user clicks Reload), query live USGS directly from browser
    fetchLiveUSGS().then(live => {
      if (live && live.streamflows && live.streamflows.length > 0) {
        metrics.streamflows = live.streamflows;
        if (live.aac) {
          const idx = metrics.tunnels.findIndex(t => t.id === "09527700");
          if (idx !== -1) {
            metrics.tunnels[idx].flow_cfs = live.aac.flow_cfs;
            metrics.tunnels[idx].timestamp = live.aac.timestamp;
          }
        }
        metrics.fetched_at = new Date().toISOString();
        applyLiveHydrology(cachedRiverNetwork, metrics);
        renderMetrics(metrics);
        populateTelemetryTable(metrics);
        updateSidebar(metrics);
        const timeNow = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        if (syncElem) syncElem.textContent = `Live Telemetry (Synced ${timeNow})`;
      }
    }).catch(usgsErr => {
      console.warn("Live USGS query fell back to snapshot:", usgsErr);
    });

  } catch (error) {
    console.error("Error loading water dashboard data:", error);
    if (syncElem) syncElem.textContent = "Error loading live data";
  }
}

function formatTimestamp(isoString) {
  if (!isoString) return "Today";
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return "Today";
    return d.toLocaleString('en-US', {
      month: 'short', day: 'numeric',
      hour: 'numeric', minute: '2-digit', timeZoneName: 'short'
    });
  } catch (e) {
    return "Today";
  }
}

function renderGeography(geo, riverNetwork, lakes) {
  // 1. Basin Boundaries (Upper vs Lower)
  const basinsGeoJSON = {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        properties: { name: 'Upper Colorado River Basin (WY, CO, UT, NM)', fill: '#f59e0b', color: '#0284c7' },
        geometry: { type: 'Polygon', coordinates: [geo.upper_basin_outline] }
      },
      {
        type: 'Feature',
        properties: { name: 'Lower Colorado River Basin (NV, AZ, CA)', fill: '#ea580c', color: '#b45309' },
        geometry: { type: 'Polygon', coordinates: [geo.lower_basin_outline] }
      }
    ]
  };

  if (!map.getSource('basins')) {
    map.addSource('basins', { type: 'geojson', data: basinsGeoJSON });
    map.addLayer({
      id: 'basin-fill',
      type: 'fill',
      source: 'basins',
      paint: {
        'fill-color': ['get', 'fill'],
        'fill-opacity': 0.07
      }
    });
    map.addLayer({
      id: 'basin-line',
      type: 'line',
      source: 'basins',
      paint: {
        'line-color': ['get', 'color'],
        'line-width': 1.8,
        'line-dasharray': [3, 4]
      }
    });

    map.on('mousemove', 'basin-fill', (e) => {
      if (!e.features.length) return;
      map.getCanvas().style.cursor = 'pointer';
      tooltipPopup.setLngLat(e.lngLat).setHTML(`<strong>${e.features[0].properties.name}</strong>`).addTo(map);
    });
    map.on('mouseleave', 'basin-fill', () => {
      map.getCanvas().style.cursor = '';
      tooltipPopup.remove();
    });
  }

  // 2. Continental Divide Line
  const divideGeoJSON = {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        properties: { name: 'Continental Divide of the Americas' },
        geometry: { type: 'LineString', coordinates: geo.continental_divide }
      }
    ]
  };

  if (!map.getSource('divide')) {
    map.addSource('divide', { type: 'geojson', data: divideGeoJSON });
    map.addLayer({
      id: 'divide-line',
      type: 'line',
      source: 'divide',
      paint: {
        'line-color': '#b45309',
        'line-width': 3.5,
        'line-dasharray': [4, 3],
        'line-opacity': 0.85
      }
    });

    map.on('mousemove', 'divide-line', (e) => {
      map.getCanvas().style.cursor = 'pointer';
      tooltipPopup.setLngLat(e.lngLat).setHTML(`<strong>Continental Divide of the Americas</strong><br><span style="font-size:11px;color:#64748b;">Hydrologic Boundary between Pacific & Atlantic Slopes</span>`).addTo(map);
    });
    map.on('mouseleave', 'divide-line', () => {
      map.getCanvas().style.cursor = '';
      tooltipPopup.remove();
    });
  }

  // 3. Lakes & Reservoirs (USGS NHD Shorelines)
  if (lakes && lakes.features && !map.getSource('lakes')) {
    map.addSource('lakes', { type: 'geojson', data: lakes });
    map.addLayer({
      id: 'lakes-fill',
      type: 'fill',
      source: 'lakes',
      paint: {
        'fill-color': '#0284c7',
        'fill-opacity': 0.85
      }
    });
    map.addLayer({
      id: 'lakes-stroke',
      type: 'line',
      source: 'lakes',
      paint: {
        'line-color': '#0369a1',
        'line-width': 1.5
      }
    });

    map.on('mousemove', 'lakes-fill', (e) => {
      if (!e.features.length) return;
      map.getCanvas().style.cursor = 'pointer';
      const p = e.features[0].properties;
      const name = p.GNIS_NAME || "Reservoir";
      const area = p.AREASQKM ? `${Math.round(p.AREASQKM)} sq km` : "";
      tooltipPopup.setLngLat(e.lngLat).setHTML(`<strong>${name}</strong><br><span style="font-size:11px;color:#64748b;">USGS NHD Shoreline (${area})</span>`).addTo(map);
    });
    map.on('mouseleave', 'lakes-fill', () => {
      map.getCanvas().style.cursor = '';
      tooltipPopup.remove();
    });
  }

  // 4. CFS-Weighted River Network (Shapely-Welded Continuous Vectors)
  if (riverNetwork && !map.getSource('rivers')) {
    map.addSource('rivers', { type: 'geojson', data: riverNetwork });

    // 4a. Mainstem & Major Tributaries - Outer Glow
    map.addLayer({
      id: 'rivers-main-glow',
      type: 'line',
      source: 'rivers',
      filter: ['!=', ['get', 'category'], 'minor_tributary'],
      paint: {
        'line-color': '#38bdf8',
        'line-width': ['+', ['get', 'weight'], 2.0],
        'line-blur': 1.5,
        'line-opacity': 0.60
      }
    });

    // 4b. Mainstem & Major Tributaries - Core Flowline (Unified River Blue)
    map.addLayer({
      id: 'rivers-main-core',
      type: 'line',
      source: 'rivers',
      filter: ['!=', ['get', 'category'], 'minor_tributary'],
      layout: {
        'line-cap': 'round',
        'line-join': 'round'
      },
      paint: {
        'line-color': '#0284c7',
        'line-width': ['get', 'weight'],
        'line-opacity': 0.95
      }
    });

    // 4c. Secondary Minor Tributaries - Outer Glow (Subtle & Tight)
    map.addLayer({
      id: 'rivers-minor-glow',
      type: 'line',
      source: 'rivers',
      filter: ['==', ['get', 'category'], 'minor_tributary'],
      paint: {
        'line-color': '#38bdf8',
        'line-width': ['+', ['get', 'weight'], 0.8],
        'line-blur': 0.8,
        'line-opacity': 0.35
      }
    });

    // 4d. Secondary Minor Tributaries - Core Flowline (Same Unified River Blue, Leaner Width)
    map.addLayer({
      id: 'rivers-minor-core',
      type: 'line',
      source: 'rivers',
      filter: ['==', ['get', 'category'], 'minor_tributary'],
      layout: {
        'line-cap': 'round',
        'line-join': 'round'
      },
      paint: {
        'line-color': '#0284c7',
        'line-width': ['get', 'weight'],
        'line-opacity': 0.90
      }
    });

    // River hover tooltips with explicit real-time/baseflow clarity
    ['rivers-main-core', 'rivers-minor-core'].forEach(layerId => {
      map.on('mousemove', layerId, (e) => {
        if (!e.features.length) return;
        map.getCanvas().style.cursor = 'pointer';
        const p = e.features[0].properties;
        const catBadge = p.category === 'mainstem'
          ? '<span style="font-size:10px;font-weight:700;color:#0284c7;background:#e0f2fe;padding:2px 6px;border-radius:4px;">Mainstem Reach</span>'
          : (p.category === 'major_tributary'
              ? '<span style="font-size:10px;font-weight:700;color:#0284c7;background:#f0f9ff;padding:2px 6px;border-radius:4px;">Major Tributary</span>'
              : '<span style="font-size:10px;font-weight:600;color:#0284c7;background:#f1f5f9;padding:2px 6px;border-radius:4px;">Secondary Stream</span>');

        const sourceBadge = p.source_label ? `<div style="font-size:10px;font-weight:700;color:#0369a1;background:#f0f9ff;border:1px solid #bae6fd;padding:2px 6px;border-radius:4px;display:inline-block;margin-top:4px;">${p.source_label}</div>` : '';
        const stationHtml = p.gauge_info ? `<div style="font-size:11px;color:#475569;margin-top:4px;line-height:1.35;"><strong>Control / Station:</strong> ${p.gauge_info}</div>` : '';
        const timeHtml = p.timestamp ? `<div style="font-size:10px;color:#64748b;margin-top:2px;"><strong>Measured:</strong> ${formatTimestamp(p.timestamp)}</div>` : '';
        const notesHtml = p.notes && p.notes !== p.gauge_info ? `<div style="font-size:11px;color:#64748b;margin-top:4px;line-height:1.35;">${p.notes}</div>` : '';

        tooltipPopup.setLngLat(e.lngLat).setHTML(`
          <div style="font-family:'Inter',sans-serif; min-width: 190px; max-width: 270px;">
            <div style="margin-bottom:4px;">${catBadge}</div>
            <strong style="font-size:13px;color:#0f172a;line-height:1.35;display:block;">${p.name}</strong>
            <div style="margin: 6px 0; padding: 6px 10px; background:#f8fafc; border-radius:6px; border:1px solid #e2e8f0; display:flex; justify-content:space-between; align-items:baseline;">
              <span style="font-size:11px; color:#64748b; font-weight:600;">Streamflow:</span>
              <span style="font-size:16px; font-weight:800; color:#0284c7;">${Number(p.flow_cfs).toLocaleString()} <span style="font-size:10px; font-weight:600; color:#64748b;">cfs</span></span>
            </div>
            ${sourceBadge}
            ${stationHtml}
            ${timeHtml}
            <div style="font-size:10px;color:#64748b;margin-top:5px;border-top:1px solid #f1f5f9;padding-top:4px;">
              Flow Bracket: ${Number(p.flow_cfs) >= 5000 ? '> 5,000 cfs (High)' : (Number(p.flow_cfs) >= 1000 ? '1,000 - 5,000 cfs (Moderate)' : '< 1,000 cfs (Minor)')} • Line Width: ${p.weight}px
            </div>
            ${notesHtml}
          </div>
        `).addTo(map);
      });

      map.on('mouseleave', layerId, () => {
        map.getCanvas().style.cursor = '';
        tooltipPopup.remove();
      });
    });
  }

  // 5. Trans-Mountain Tunnels & Conveyance Canals (Separate Layers)
  if (geo.tunnels) {
    const tunnelFeats = geo.tunnels.filter(t => t.id && t.id.endsWith("TUNCO"));
    const canalFeats = geo.tunnels.filter(t => !t.id || !t.id.endsWith("TUNCO"));

    // 5a. Trans-Mountain Tunnels under Divide
    if (!map.getSource('tunnels')) {
      const tunnelsGeoJSON = {
        type: 'FeatureCollection',
        features: tunnelFeats.map(t => ({
          type: 'Feature',
          properties: { ...t },
          geometry: { type: 'LineString', coordinates: t.coords }
        }))
      };

      map.addSource('tunnels', { type: 'geojson', data: tunnelsGeoJSON });
      const showTunnels = document.getElementById('toggle-tunnels')?.checked ?? false;
      map.addLayer({
        id: 'tunnels-line',
        type: 'line',
        source: 'tunnels',
        layout: {
          'visibility': showTunnels ? 'visible' : 'none'
        },
        paint: {
          'line-color': '#9333ea',
          'line-width': 4.5,
          'line-dasharray': [2, 3],
          'line-opacity': 0.95
        }
      });

      map.on('click', 'tunnels-line', (e) => {
        if (!e.features.length) return;
        const t = e.features[0].properties;
        new maplibregl.Popup({ offset: 8 })
          .setLngLat(e.lngLat)
          .setHTML(`
            <div style="font-family:'Inter',sans-serif; min-width: 200px;">
              <span style="font-size:10px;font-weight:700;color:#7e22ce;background:#f3e8ff;padding:2px 6px;border-radius:4px;display:inline-block;margin-bottom:4px;">Trans-Mountain Diversion Tunnel</span>
              <strong style="font-size:13px;color:#0f172a;display:block;">${t.name}</strong>
              <span style="font-size:11px;color:#7c3aed;font-weight:600;">${t.operator || ''}</span>
              <hr style="margin:6px 0;border:none;border-top:1px solid #e2e8f0;">
              <div style="font-size:11px;line-height:1.45;color:#334155;">
                <strong>Length:</strong> ${t.length_miles} miles under Divide<br>
                <strong>West Portal:</strong> ${t.from}<br>
                <strong>East Portal:</strong> ${t.to}
              </div>
            </div>
          `)
          .addTo(map);
      });

      map.on('mouseenter', 'tunnels-line', () => map.getCanvas().style.cursor = 'pointer');
      map.on('mouseleave', 'tunnels-line', () => map.getCanvas().style.cursor = '');
    }

    // 5b. Major Conveyance Canals (All-American Canal & Colorado River Aqueduct)
    if (!map.getSource('canals')) {
      const canalsGeoJSON = {
        type: 'FeatureCollection',
        features: canalFeats.map(t => ({
          type: 'Feature',
          properties: { ...t },
          geometry: { type: 'LineString', coordinates: t.coords }
        }))
      };

      map.addSource('canals', { type: 'geojson', data: canalsGeoJSON });
      const showCanals = document.getElementById('toggle-canals')?.checked ?? false;
      map.addLayer({
        id: 'canals-line',
        type: 'line',
        source: 'canals',
        layout: {
          'visibility': showCanals ? 'visible' : 'none'
        },
        paint: {
          'line-color': '#0891b2',
          'line-width': 3.5,
          'line-dasharray': [4, 2],
          'line-opacity': 0.95
        }
      });

      map.on('click', 'canals-line', (e) => {
        if (!e.features.length) return;
        const t = e.features[0].properties;
        new maplibregl.Popup({ offset: 8 })
          .setLngLat(e.lngLat)
          .setHTML(`
            <div style="font-family:'Inter',sans-serif; min-width: 210px;">
              <span style="font-size:10px;font-weight:700;color:#0891b2;background:#e0f2fe;padding:2px 6px;border-radius:4px;display:inline-block;margin-bottom:4px;">Major Conveyance Canal</span>
              <strong style="font-size:13px;color:#0f172a;display:block;">${t.name}</strong>
              <span style="font-size:11px;color:#0369a1;font-weight:600;">${t.operator || ''}</span>
              <hr style="margin:6px 0;border:none;border-top:1px solid #e2e8f0;">
              <div style="font-size:11px;line-height:1.45;color:#334155;">
                <strong>Length:</strong> ${t.length_miles} miles<br>
                <strong>Intake:</strong> ${t.from}<br>
                <strong>Terminus:</strong> ${t.to}
              </div>
            </div>
          `)
          .addTo(map);
      });

      map.on('mouseenter', 'canals-line', () => map.getCanvas().style.cursor = 'pointer');
      map.on('mouseleave', 'canals-line', () => map.getCanvas().style.cursor = '');
    }
  }

  // 6. Major Dams (Native WebGL Symbol Layer - Locks 1:1 with Map Canvas, Zero Drag Latency)
  if (geo.dams && !map.getSource('dams')) {
    const damsGeoJSON = {
      type: 'FeatureCollection',
      features: geo.dams.map(d => ({
        type: 'Feature',
        properties: { ...d },
        geometry: { type: 'Point', coordinates: [d.lon, d.lat] }
      }))
    };

    map.addSource('dams', { type: 'geojson', data: damsGeoJSON });

    // Custom SVG dam icon loaded into MapLibre GPU texture
    const damSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 36 36">
      <rect x="3" y="3" width="30" height="30" rx="6" fill="#1e293b" stroke="#ffffff" stroke-width="2.5"/>
      <path d="M8 9h20l-3.2 18H11.2L8 9zm3.8 2.8l2.2 12.4h8l2.2-12.4H11.8z" fill="#38bdf8"/>
    </svg>`;

    const img = new Image(36, 36);
    img.onload = () => {
      if (!map.hasImage('dam-icon')) {
        map.addImage('dam-icon', img);
      }
      if (!map.getLayer('dams-layer')) {
        map.addLayer({
          id: 'dams-layer',
          type: 'symbol',
          source: 'dams',
          layout: {
            'icon-image': 'dam-icon',
            'icon-size': 0.65,
            'icon-allow-overlap': true,
            'icon-ignore-placement': true
          }
        });
      }
    };
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(damSvg);

    map.on('click', 'dams-layer', (e) => {
      if (!e.features.length) return;
      const d = e.features[0].properties;
      new maplibregl.Popup({ offset: 14 })
        .setLngLat(e.lngLat)
        .setHTML(`
          <div style="font-family:'Inter',sans-serif; min-width: 170px;">
            <strong style="font-size:13px;color:#0f172a;">${d.name}</strong><br>
            <span style="font-size:11px;color:#64748b;font-weight:600;">${d.operator}</span>
            <hr style="margin:6px 0;border:none;border-top:1px solid #e2e8f0;">
            <div style="font-size:11px;line-height:1.45;color:#334155;">
              <strong>Impounds:</strong> ${d.impounds}<br>
              <strong>Height:</strong> ${d.height_ft} ft | <strong>Built:</strong> ${d.year}<br>
              <strong>Purpose:</strong> ${d.purpose}
            </div>
          </div>
        `)
        .addTo(map);
    });

    map.on('mousemove', 'dams-layer', (e) => {
      if (!e.features.length) return;
      map.getCanvas().style.cursor = 'pointer';
      const d = e.features[0].properties;
      tooltipPopup.setLngLat(e.lngLat).setHTML(`
        <strong>${d.name}</strong><br>
        <span style="font-size:11px;color:#64748b;">${d.operator} • Impounds ${d.impounds}</span>
      `).addTo(map);
    });

    map.on('mouseleave', 'dams-layer', () => {
      map.getCanvas().style.cursor = '';
      tooltipPopup.remove();
    });
  }
}

function renderMetrics(metrics) {
  // Clear previous CFS markers
  Object.values(markers).forEach(arr => {
    arr.forEach(m => m.remove());
    arr.length = 0;
  });
  stationMarkers = {};

  const showGauges = document.getElementById('toggle-gauges')?.checked ?? false;
  const showTunnels = document.getElementById('toggle-tunnels')?.checked ?? false;
  const showCanals = document.getElementById('toggle-canals')?.checked ?? false;
  const showReservoirs = document.getElementById('toggle-reservoirs')?.checked ?? true;

  // 1. Streamflow Gauges (Compact CFS Badges) - Hidden by default for minimal clarity
  metrics.streamflows.forEach(s => {
    const isLeesFerry = s.id === "09380000";
    const highlightClass = isLeesFerry ? "lees-badge" : "";

    const el = document.createElement('div');
    el.className = 'cfs-marker-wrap';
    el.innerHTML = `<div class="cfs-badge gauge ${highlightClass}"><span class="cfs-val">${s.flow_cfs.toLocaleString()}</span> <span class="cfs-unit">cfs</span></div>`;

    const popup = new maplibregl.Popup({ offset: 12 }).setHTML(`
      <div style="font-family:'Inter',sans-serif; min-width: 215px; padding: 2px;">
        <div style="display:flex; align-items:center; gap:6px; margin-bottom:6px;">
          <span style="font-size:10px; font-weight:700; color:#0369a1; background:#e0f2fe; padding:2px 6px; border-radius:4px;">USGS Real-Time Gauge</span>
          ${isLeesFerry ? '<span style="font-size:10px; font-weight:700; color:#0369a1; background:#e0f2fe; border: 1px solid #bae6fd; padding:2px 6px; border-radius:4px;">1922 Compact Divide</span>' : ''}
        </div>
        <strong style="font-size:13px; color:#0f172a; line-height:1.35; display:block;">${s.name}</strong>
        <div style="margin: 8px 0; padding: 8px 10px; background:#f8fafc; border-radius:6px; border:1px solid #e2e8f0; display:flex; justify-content:space-between; align-items:baseline;">
          <span style="font-size:11px; color:#64748b; font-weight:600;">Current Discharge:</span>
          <span style="font-size:16px; font-weight:800; color:#0284c7;">${s.flow_cfs.toLocaleString()} <span style="font-size:11px; font-weight:600; color:#64748b;">cfs</span></span>
        </div>
        <div style="font-size:11px; color:#475569; line-height:1.5;">
          <strong>USGS Station ID:</strong> <a href="https://waterdata.usgs.gov/monitoring-location/${s.id}" target="_blank" style="color:#0284c7; text-decoration:none; font-weight:600;">${s.id} ↗</a><br>
          <strong>Last Measured:</strong> ${formatTimestamp(s.timestamp)}
        </div>
      </div>
    `);

    const marker = new maplibregl.Marker({ element: el, anchor: 'center' })
      .setLngLat([s.lon, s.lat])
      .setPopup(popup)
      .addTo(map);

    if (!showGauges) {
      marker.getElement().style.display = 'none';
    }

    markers.gauges.push(marker);
    stationMarkers[s.id] = { marker, popup, lat: s.lat, lon: s.lon };
  });

  // 2. Trans-Mountain Tunnels & Conveyance Canals Badges
  metrics.tunnels.forEach(t => {
    const isFrontRange = t.id && t.id.endsWith("TUNCO");
    const diversionBadge = isFrontRange ? "Trans-Mountain Diversion Tunnel" : "Major Conveyance Canal";
    const lengthText = isFrontRange ? `${t.length_miles} miles under Divide` : `${t.length_miles} miles`;
    const fromText = isFrontRange ? `<strong>West Portal:</strong> ${t.from}` : `<strong>Intake:</strong> ${t.from}`;
    const toText = isFrontRange ? `<strong>East Portal:</strong> ${t.to}` : `<strong>Terminus:</strong> ${t.to}`;
    const badgeClass = isFrontRange ? "tunnel-badge" : "canal-badge";

    const el = document.createElement('div');
    el.className = 'cfs-marker-wrap';
    el.innerHTML = `<div class="cfs-badge ${badgeClass}"><span class="cfs-val">${t.flow_cfs.toLocaleString()}</span> <span class="cfs-unit">cfs</span></div>`;

    const popup = new maplibregl.Popup({ offset: 12 }).setHTML(`
      <div style="font-family:'Inter',sans-serif; min-width: 220px; padding: 2px;">
        <div style="display:flex; align-items:center; gap:6px; margin-bottom:6px;">
          <span style="font-size:10px; font-weight:700; color:${isFrontRange ? '#7e22ce' : '#0891b2'}; background:${isFrontRange ? '#f3e8ff' : '#e0f2fe'}; padding:2px 6px; border-radius:4px;">${diversionBadge}</span>
        </div>
        <strong style="font-size:13px; color:#0f172a; line-height:1.35; display:block;">${t.name}</strong>
        <div style="font-size:11px; color:#64748b; font-weight:600; margin-bottom:6px;">${t.operator || ''}</div>
        <div style="margin: 6px 0; padding: 8px 10px; background:#f8fafc; border-radius:6px; border:1px solid #e2e8f0; display:flex; justify-content:space-between; align-items:baseline;">
          <span style="font-size:11px; color:#475569; font-weight:600;">Diverted Flow:</span>
          <span style="font-size:16px; font-weight:800; color:${isFrontRange ? '#7c3aed' : '#0891b2'};">${t.flow_cfs.toLocaleString()} <span style="font-size:11px; font-weight:600; color:#64748b;">cfs</span></span>
        </div>
        <div style="font-size:11px; color:#475569; line-height:1.5;">
          <strong>Destination:</strong> ${t.destination}<br>
          <strong>Length:</strong> ${lengthText}<br>
          ${fromText}<br>
          ${toText}<br>
          <strong>Last Measured:</strong> ${formatTimestamp(t.timestamp)}
        </div>
      </div>
    `);

    const marker = new maplibregl.Marker({ element: el, anchor: 'center' })
      .setLngLat([t.lon, t.lat])
      .setPopup(popup)
      .addTo(map);

    if (isFrontRange) {
      if (!showTunnels) marker.getElement().style.display = 'none';
      markers.tunnels.push(marker);
    } else {
      if (!showCanals) marker.getElement().style.display = 'none';
      markers.canals.push(marker);
    }

    stationMarkers[t.id] = { marker, popup, lat: t.lat, lon: t.lon };
  });

  // 3. Reservoirs Badges (Kept visible by default for key storage context)
  metrics.reservoirs.forEach(r => {
    const el = document.createElement('div');
    el.className = 'cfs-marker-wrap';
    el.innerHTML = `<div class="cfs-badge res-badge"><span class="cfs-val">${r.capacity_pct}%</span></div>`;

    const popup = new maplibregl.Popup({ offset: 12 }).setHTML(`
      <div style="font-family:'Inter',sans-serif; min-width: 215px; padding: 2px;">
        <div style="display:flex; align-items:center; gap:6px; margin-bottom:6px;">
          <span style="font-size:10px; font-weight:700; color:#0369a1; background:#e0f2fe; padding:2px 6px; border-radius:4px;">Mega-Reservoir Storage</span>
        </div>
        <strong style="font-size:13px; color:#0f172a; line-height:1.35; display:block;">${r.name}</strong>
        <div style="margin: 8px 0; padding: 8px 10px; background:#f8fafc; border-radius:6px; border:1px solid #e2e8f0;">
          <div style="display:flex; justify-content:space-between; align-items:baseline; margin-bottom:4px;">
            <span style="font-size:11px; color:#64748b; font-weight:600;">Current Storage:</span>
            <span style="font-size:16px; font-weight:800; color:#0284c7;">${r.capacity_pct}% <span style="font-size:11px; font-weight:600; color:#64748b;">Full</span></span>
          </div>
          <div style="height:6px; background:#e2e8f0; border-radius:3px; overflow:hidden;">
            <div style="width:${r.capacity_pct}%; height:100%; background:#0284c7;"></div>
          </div>
        </div>
        <div style="font-size:11px; color:#475569; line-height:1.5;">
          <strong>Elevation:</strong> ${r.elevation_ft.toLocaleString()} ft<br>
          <strong>Total Volume:</strong> ${Math.round(r.storage_af).toLocaleString()} Acre-Feet<br>
          <strong>Last Measured:</strong> ${formatTimestamp(r.timestamp)}
        </div>
      </div>
    `);

    const marker = new maplibregl.Marker({ element: el, anchor: 'center' })
      .setLngLat([r.lon, r.lat])
      .setPopup(popup)
      .addTo(map);

    if (!showReservoirs) {
      marker.getElement().style.display = 'none';
    }

    markers.reservoirs.push(marker);
    stationMarkers[r.id] = { marker, popup, lat: r.lat, lon: r.lon };
  });
}

function updateSidebar(metrics) {
  // 1. Total Siphoned Under Divide (Front Range only)
  const totalDiverted = metrics.tunnels
    .filter(t => t.id.endsWith("TUNCO"))
    .reduce((sum, t) => sum + t.flow_cfs, 0);
  document.getElementById("total-diverted-val").textContent = totalDiverted.toFixed(1);
  document.getElementById("diverted-comp").textContent = `${Math.round(totalDiverted)} cfs`;

  // 2. Dotsero comparison
  const dotsero = metrics.streamflows.find(s => s.id === "09070500");
  if (dotsero) {
    document.getElementById("dotsero-comp").textContent = `${Math.round(dotsero.flow_cfs)} cfs`;
  }

  // 3. Reservoir storage
  const powell = metrics.reservoirs.find(r => r.id === "lake_powell");
  if (powell) {
    document.getElementById("powell-storage-text").textContent = `${powell.capacity_pct}% (${(powell.storage_af / 1e6).toFixed(2)}M AF)`;
    document.getElementById("powell-meter").style.width = `${powell.capacity_pct}%`;
  }

  const mead = metrics.reservoirs.find(r => r.id === "lake_mead");
  if (mead) {
    document.getElementById("mead-storage-text").textContent = `${mead.capacity_pct}% (${(mead.storage_af / 1e6).toFixed(2)}M AF)`;
    document.getElementById("mead-meter").style.width = `${mead.capacity_pct}%`;
  }
}

function populateTelemetryTable(metrics) {
  const tbody = document.getElementById("telemetry-rows");
  tbody.innerHTML = "";

  const allNodes = [
    ...metrics.streamflows.map(s => ({
      id: s.id,
      name: s.name,
      type: "streamflow",
      basin: s.id === "09380000" ? "Upper/Lower Divide" : "Upper Basin",
      reading: `${s.flow_cfs.toLocaleString()} cfs`,
      notes: "USGS NWIS Real-Time Gauge",
      timestamp: s.timestamp,
      lat: s.lat,
      lon: s.lon
    })),
    ...metrics.tunnels.map(t => ({
      id: t.id,
      name: t.name,
      type: "diversion_tunnel",
      basin: "Continental Divide",
      reading: `${t.flow_cfs.toLocaleString()} cfs`,
      notes: t.destination,
      timestamp: t.timestamp,
      lat: t.lat,
      lon: t.lon
    })),
    ...metrics.reservoirs.map(r => ({
      id: r.id,
      name: r.name,
      type: "reservoir",
      basin: r.id === "lake_powell" ? "Upper Basin Storage" : "Lower Basin Storage",
      reading: `${r.capacity_pct}% (${Math.round(r.storage_af / 1000).toLocaleString()}k AF)`,
      notes: `Elevation: ${r.elevation_ft} ft`,
      timestamp: r.timestamp,
      lat: r.lat,
      lon: r.lon
    }))
  ];

  document.getElementById("node-count").textContent = allNodes.length;

  allNodes.forEach(node => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><strong>${node.name}</strong></td>
      <td><span class="type-pill ${node.type}">${node.type.replace('_', ' ')}</span></td>
      <td>${node.basin}</td>
      <td><strong>${node.reading}</strong></td>
      <td style="color:#64748b;font-size:11px;">${node.notes}</td>
      <td style="color:#64748b;font-size:11px;white-space:nowrap;">${formatTimestamp(node.timestamp)}</td>
    `;
    tr.addEventListener("click", () => {
      flyToNode(node.id, node.lat, node.lon);
    });
    tbody.appendChild(tr);
  });
}

function flyToNode(id, lat, lon) {
  map.flyTo({
    center: [lon, lat],
    zoom: 10.5,
    pitch: isTilted ? 48 : 0,
    bearing: isTilted ? -10 : 0,
    duration: 1500,
    essential: true
  });
  if (stationMarkers[id]) {
    setTimeout(() => {
      stationMarkers[id].popup.addTo(map);
    }, 1500);
  }
}

// Preset Zoom Navigation with mode-sensitive pitch
function zoomToPreset(preset) {
  document.querySelectorAll(".nav-btn").forEach(btn => btn.classList.remove("active"));
  if (event && event.target && event.target.classList.contains("nav-btn") && event.target.id !== "tilt-toggle-btn") {
    event.target.classList.add("active");
  }

  if (isTilted) {
    // 3D Oblique Perspectives
    switch(preset) {
      case "basin":
        map.flyTo({ center: [-110.2, 38.0], zoom: 6.3, pitch: 42, bearing: -10, duration: 1500 });
        break;
      case "divide":
        map.flyTo({ center: [-105.9, 39.85], zoom: 9.8, pitch: 56, bearing: -30, duration: 1500 });
        break;
      case "lees_ferry":
        map.flyTo({ center: [-111.59, 36.86], zoom: 11.2, pitch: 54, bearing: 40, duration: 1500 });
        break;
      case "reservoirs":
        map.flyTo({ center: [-113.2, 36.6], zoom: 7.5, pitch: 50, bearing: -15, duration: 1500 });
        break;
    }
  } else {
    // Clean, readable top-down 2D mode
    switch(preset) {
      case "basin":
        map.flyTo({ center: [-109.8, 38.5], zoom: 6.3, pitch: 0, bearing: 0, duration: 1500 });
        break;
      case "divide":
        map.flyTo({ center: [-105.95, 39.85], zoom: 9.8, pitch: 0, bearing: 0, duration: 1500 });
        break;
      case "lees_ferry":
        map.flyTo({ center: [-111.59, 36.86], zoom: 11.2, pitch: 0, bearing: 0, duration: 1500 });
        break;
      case "reservoirs":
        map.flyTo({ center: [-113.2, 36.6], zoom: 7.5, pitch: 0, bearing: 0, duration: 1500 });
        break;
    }
  }
}

// Layer Toggle Handlers
function setLayerVisibility(layerId, isVisible) {
  if (map && map.getLayer(layerId)) {
    map.setLayoutProperty(layerId, 'visibility', isVisible ? 'visible' : 'none');
  }
}

function toggleLayer(layerName) {
  const checkbox = document.getElementById(`toggle-${layerName}`);
  if (!checkbox) return;
  const isChecked = checkbox.checked;

  switch(layerName) {
    case "river":
      setLayerVisibility('rivers-main-glow', isChecked);
      setLayerVisibility('rivers-main-core', isChecked);
      break;
    case "minorRivers":
      setLayerVisibility('rivers-minor-glow', isChecked);
      setLayerVisibility('rivers-minor-core', isChecked);
      break;
    case "gauges":
      markers.gauges.forEach(m => m.getElement().style.display = isChecked ? '' : 'none');
      break;
    case "tunnels":
      setLayerVisibility('tunnels-line', isChecked);
      markers.tunnels.forEach(m => m.getElement().style.display = isChecked ? '' : 'none');
      break;
    case "canals":
      setLayerVisibility('canals-line', isChecked);
      markers.canals.forEach(m => m.getElement().style.display = isChecked ? '' : 'none');
      break;
    case "reservoirs":
      setLayerVisibility('lakes-fill', isChecked);
      setLayerVisibility('lakes-stroke', isChecked);
      markers.reservoirs.forEach(m => m.getElement().style.display = isChecked ? '' : 'none');
      break;
    case "dams":
      setLayerVisibility('dams-layer', isChecked);
      break;
    case "divide":
      setLayerVisibility('divide-line', isChecked);
      break;
    case "basin":
      setLayerVisibility('basin-fill', isChecked);
      setLayerVisibility('basin-line', isChecked);
      break;
  }
}

function toggleTableCollapse() {
  const container = document.getElementById("table-wrap");
  const icon = document.getElementById("collapse-icon");
  container.classList.toggle("collapsed");
  icon.textContent = container.classList.contains("collapsed") ? "▲" : "▼";
}

function refreshData() {
  const syncElem = document.getElementById("sync-time");
  if (syncElem) syncElem.textContent = "Querying live USGS gauges...";
  loadData(true);
}
