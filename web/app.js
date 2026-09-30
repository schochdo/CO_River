// Colorado River Basin Water Infrastructure & Hydrology Dashboard
// Powered by MapLibre GL JS with 3D DEM Terrain Option & Top-Down 2D Default

let map;
let isTilted = false; // Default to clean, readable 2D top-down mode

// Marker and station registry
const markers = {
  gauges: [],
  tunnels: [],
  reservoirs: []
};
let stationMarkers = {};
let tooltipPopup;

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

document.addEventListener("DOMContentLoaded", () => {
  initMap();
});

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

async function loadData() {
  try {
    const t = Date.now();
    const [geoRes, metricsRes, riverRes, lakesRes] = await Promise.all([
      fetch(`./data/geography.json?t=${t}`),
      fetch(`./data/latest_metrics.json?t=${t}`),
      fetch(`./data/river_network.json?t=${t}`),
      fetch(`./data/lakes.geojson?t=${t}`)
    ]);

    const geography = await geoRes.json();
    const metrics = await metricsRes.json();
    const riverNetwork = await riverRes.json();
    const lakes = await lakesRes.json();

    renderGeography(geography, riverNetwork, lakes);
    renderMetrics(metrics);
    populateTelemetryTable(metrics);
    updateSidebar(metrics);

    const dateStr = new Date(metrics.fetched_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    document.getElementById("sync-time").textContent = `Live Telemetry (Synced ${dateStr})`;
  } catch (error) {
    console.error("Error loading water dashboard data:", error);
    document.getElementById("sync-time").textContent = "Error loading live data";
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

    // River hover tooltips
    ['rivers-main-core', 'rivers-minor-core'].forEach(layerId => {
      map.on('mousemove', layerId, (e) => {
        if (!e.features.length) return;
        map.getCanvas().style.cursor = 'pointer';
        const p = e.features[0].properties;
        const catBadge = p.category === 'mainstem'
          ? '<span style="font-size:10px;font-weight:700;color:#0284c7;background:#e0f2fe;padding:1px 5px;border-radius:4px;">Mainstem Reach</span>'
          : (p.category === 'major_tributary'
              ? '<span style="font-size:10px;font-weight:700;color:#0284c7;background:#f0f9ff;padding:1px 5px;border-radius:4px;">Major Tributary</span>'
              : '<span style="font-size:10px;font-weight:600;color:#0284c7;background:#f1f5f9;padding:1px 5px;border-radius:4px;">Tributary Reach</span>');

        const notesHtml = p.notes ? `<div style="font-size:11px;color:#64748b;margin-top:3px;line-height:1.3;">${p.notes}</div>` : '';

        tooltipPopup.setLngLat(e.lngLat).setHTML(`
          <div style="font-family:'Inter',sans-serif; min-width: 140px;">
            <div style="margin-bottom:3px;">${catBadge}</div>
            <strong style="font-size:12px;color:#0f172a;">${p.name}</strong><br>
            <div style="font-size:11px;color:#334155;margin-top:2px;">
              Estimated Discharge: <strong>${Number(p.flow_cfs).toLocaleString()} cfs</strong><br>
              <span style="font-size:10px;color:#64748b;">Flow Bracket: ${Number(p.flow_cfs) >= 5000 ? '> 5,000 cfs (High)' : (Number(p.flow_cfs) >= 1000 ? '1,000 - 5,000 cfs (Moderate)' : '< 1,000 cfs (Minor)')} • Width: ${p.weight}px</span>
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

  // 5. Trans-Mountain Tunnels & Siphons
  if (geo.tunnels && !map.getSource('tunnels')) {
    const tunnelsGeoJSON = {
      type: 'FeatureCollection',
      features: geo.tunnels.map(t => ({
        type: 'Feature',
        properties: { ...t },
        geometry: { type: 'LineString', coordinates: t.coords }
      }))
    };

    map.addSource('tunnels', { type: 'geojson', data: tunnelsGeoJSON });
    map.addLayer({
      id: 'tunnels-line',
      type: 'line',
      source: 'tunnels',
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
      const isFrontRange = t.id && t.id.endsWith("TUNCO");
      const lengthText = isFrontRange ? `${t.length_miles} miles under Divide` : `${t.length_miles} miles`;
      const fromText = isFrontRange ? `<strong>West Portal:</strong> ${t.from}` : `<strong>Intake:</strong> ${t.from}`;
      const toText = isFrontRange ? `<strong>East Portal:</strong> ${t.to}` : `<strong>Terminus:</strong> ${t.to}`;

      new maplibregl.Popup({ offset: 8 })
        .setLngLat(e.lngLat)
        .setHTML(`
          <div style="font-family:'Inter',sans-serif; min-width: 200px;">
            <strong style="font-size:13px;color:#0f172a;">${t.name}</strong><br>
            <span style="font-size:11px;color:#7c3aed;font-weight:600;">${t.operator || ''}</span>
            <hr style="margin:6px 0;border:none;border-top:1px solid #e2e8f0;">
            <div style="font-size:11px;line-height:1.45;color:#334155;">
              <strong>Length:</strong> ${lengthText}<br>
              ${fromText}<br>
              ${toText}
            </div>
          </div>
        `)
        .addTo(map);
    });

    map.on('mouseenter', 'tunnels-line', () => map.getCanvas().style.cursor = 'pointer');
    map.on('mouseleave', 'tunnels-line', () => map.getCanvas().style.cursor = '');
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

  // 1. Streamflow Gauges (Compact CFS Badges)
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
          ${isLeesFerry ? '<span style="font-size:10px; font-weight:700; color:#dc2626; background:#fee2e2; padding:2px 6px; border-radius:4px;">1922 Compact Divide</span>' : ''}
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

    markers.gauges.push(marker);
    stationMarkers[s.id] = { marker, popup, lat: s.lat, lon: s.lon };
  });

  // 2. Trans-Mountain Tunnels & Diversion Badges
  metrics.tunnels.forEach(t => {
    const isFrontRange = t.id.endsWith("TUNCO");
    const diversionBadge = isFrontRange ? "Trans-Mountain Diversion Tunnel" : "Major Conveyance Canal";
    const lengthText = isFrontRange ? `${t.length_miles} miles under Divide` : `${t.length_miles} miles`;
    const fromText = isFrontRange ? `<strong>West Portal:</strong> ${t.from}` : `<strong>Intake:</strong> ${t.from}`;
    const toText = isFrontRange ? `<strong>East Portal:</strong> ${t.to}` : `<strong>Terminus:</strong> ${t.to}`;

    const el = document.createElement('div');
    el.className = 'cfs-marker-wrap';
    el.innerHTML = `<div class="cfs-badge tunnel-badge"><span class="cfs-val">${t.flow_cfs.toLocaleString()}</span> <span class="cfs-unit">cfs</span></div>`;

    const popup = new maplibregl.Popup({ offset: 12 }).setHTML(`
      <div style="font-family:'Inter',sans-serif; min-width: 220px; padding: 2px;">
        <div style="display:flex; align-items:center; gap:6px; margin-bottom:6px;">
          <span style="font-size:10px; font-weight:700; color:#7e22ce; background:#f3e8ff; padding:2px 6px; border-radius:4px;">${diversionBadge}</span>
        </div>
        <strong style="font-size:13px; color:#0f172a; line-height:1.35; display:block;">${t.name}</strong>
        <div style="font-size:11px; color:#64748b; font-weight:600; margin-bottom:6px;">${t.operator || ''}</div>
        <div style="margin: 6px 0; padding: 8px 10px; background:#faf5ff; border-radius:6px; border:1px solid #f3e8ff; display:flex; justify-content:space-between; align-items:baseline;">
          <span style="font-size:11px; color:#6b21a8; font-weight:600;">Diverted Flow:</span>
          <span style="font-size:16px; font-weight:800; color:#7c3aed;">${t.flow_cfs.toLocaleString()} <span style="font-size:11px; font-weight:600; color:#6b21a8;">cfs</span></span>
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

    markers.tunnels.push(marker);
    stationMarkers[t.id] = { marker, popup, lat: t.lat, lon: t.lon };
  });

  // 3. Reservoirs Badges
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
  syncElem.textContent = "Refreshing live feeds...";
  loadData();
}
