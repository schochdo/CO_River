// Global State
let map;
let layers = {
  river: L.layerGroup(),
  divide: L.layerGroup(),
  tunnels: L.layerGroup(),
  basin: L.layerGroup(),
  gauges: L.layerGroup(),
  reservoirs: L.layerGroup()
};

let telemetryData = [];
let stationMarkers = {};

let currentBasemap;
const basemaps = {
  esriTerrain: L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Terrain_Base/MapServer/tile/{z}/{y}/{x}", {
    maxZoom: 13,
    attribution: 'Tiles &copy; Esri &mdash; Source: USGS, Esri, TANA, DeLorme, NPS'
  }),
  esriRelief: L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Shaded_Relief/MapServer/tile/{z}/{y}/{x}", {
    maxZoom: 13,
    attribution: 'Tiles &copy; Esri &mdash; Source: Esri'
  }),
  cartoLight: L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
  }),
  usgsRelief: L.tileLayer("https://basemap.nationalmap.gov/arcgis/rest/services/USGSShadedReliefOnly/MapServer/tile/{z}/{y}/{x}", {
    maxZoom: 16,
    attribution: 'Tiles courtesy of the <a href="https://usgs.gov/">U.S. Geological Survey</a>'
  }),
  openTopo: L.tileLayer("https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png", {
    maxZoom: 16,
    attribution: 'Map data: &copy; OpenStreetMap contributors, SRTM | Map style: &copy; OpenTopoMap'
  })
};

let referenceLabels = L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Reference_Overlay/MapServer/tile/{z}/{y}/{x}", {
  maxZoom: 13,
  opacity: 0.75
});

document.addEventListener("DOMContentLoaded", () => {
  initMap();
  loadData();
});

function initMap() {
  // Center on Colorado River Basin
  map = L.map("map", {
    zoomControl: false
  }).setView([38.5, -109.8], 6);

  L.control.zoom({ position: "topleft" }).addTo(map);

  // Set default basemap: Soft Shaded Relief (Esri Terrain Base)
  currentBasemap = basemaps.esriTerrain;
  currentBasemap.addTo(map);
  referenceLabels.addTo(map);

  // Add all layer groups to map by default
  Object.values(layers).forEach(layer => layer.addTo(map));
}

function changeBasemap(key) {
  if (basemaps[key]) {
    map.removeLayer(currentBasemap);
    currentBasemap = basemaps[key];
    currentBasemap.addTo(map);
    
    // Keep reference labels on top of shaded relief
    if (key === "esriTerrain" || key === "esriRelief" || key === "usgsRelief") {
      if (!map.hasLayer(referenceLabels)) {
        referenceLabels.addTo(map);
      }
      referenceLabels.bringToFront();
    } else {
      if (map.hasLayer(referenceLabels)) {
        map.removeLayer(referenceLabels);
      }
    }
  }
}

async function loadData() {
  try {
    const [geoRes, metricsRes, riverRes, lakesRes] = await Promise.all([
      fetch("./data/geography.json"),
      fetch("./data/latest_metrics.json"),
      fetch("./data/river_network.json"),
      fetch("./data/lakes.geojson")
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

function renderGeography(geo, riverNetwork, lakes) {
  // 1. Official USGS NHD Lake Polygons (Lake Powell & Lake Mead)
  if (lakes && lakes.features) {
    L.geoJSON(lakes, {
      style: {
        color: "#0369a1",
        weight: 1.5,
        fillColor: "#0284c7",
        fillOpacity: 0.75
      },
      onEachFeature: (feature, layer) => {
        const name = feature.properties.GNIS_NAME || "Reservoir";
        const area = feature.properties.AREASQKM ? `${Math.round(feature.properties.AREASQKM)} sq km` : "";
        layer.bindTooltip(`<strong>${name}</strong><br>USGS NHD Shoreline (${area})`, { sticky: true });
      }
    }).addTo(layers.reservoirs);
  }

  // 2. Basin Boundaries (Upper vs Lower)
  if (geo.upper_basin_outline) {
    const upperCoords = geo.upper_basin_outline.map(pt => [pt[1], pt[0]]);
    L.polygon(upperCoords, {
      color: "#0284c7",
      weight: 1.5,
      dashArray: "4, 6",
      fillColor: "#0284c7",
      fillOpacity: 0.04
    }).bindTooltip("Upper Colorado River Basin (WY, CO, UT, NM)", { sticky: true })
      .addTo(layers.basin);
  }

  if (geo.lower_basin_outline) {
    const lowerCoords = geo.lower_basin_outline.map(pt => [pt[1], pt[0]]);
    L.polygon(lowerCoords, {
      color: "#d97706",
      weight: 1.5,
      dashArray: "4, 6",
      fillColor: "#d97706",
      fillOpacity: 0.04
    }).bindTooltip("Lower Colorado River Basin (NV, AZ, CA)", { sticky: true })
      .addTo(layers.basin);
  }

  // 3. Continental Divide
  if (geo.continental_divide) {
    const divideCoords = geo.continental_divide.map(pt => [pt[1], pt[0]]);
    L.polyline(divideCoords, {
      color: "#d97706",
      weight: 3.5,
      dashArray: "8, 6",
      opacity: 0.85
    }).bindTooltip("Continental Divide of the Americas", { sticky: true })
      .addTo(layers.divide);
  }

  // 4. CFS-Weighted River Network (Width Scaled to Flow Volume)
  if (riverNetwork) {
    riverNetwork.forEach(seg => {
      const coords = seg.coords.map(pt => [pt[1], pt[0]]);
      L.polyline(coords, {
        color: "#0284c7",
        weight: seg.weight,
        opacity: 0.88,
        lineCap: "round",
        lineJoin: "round"
      }).bindTooltip(`<strong>${seg.name}</strong><br>Flow: <strong>${seg.flow_cfs.toLocaleString()} cfs</strong>`, { sticky: true })
        .addTo(layers.river);
    });
  }

  // 5. Trans-Mountain Tunnels
  if (geo.tunnels) {
    geo.tunnels.forEach(t => {
      const coords = t.coords.map(pt => [pt[1], pt[0]]);
      L.polyline(coords, {
        color: "#9333ea",
        weight: 4.5,
        dashArray: "3, 5",
        opacity: 0.95
      }).bindPopup(`
        <strong>${t.name}</strong><br>
        <em>${t.operator}</em><br>
        <strong>Length:</strong> ${t.length_miles} miles under Divide<br>
        <strong>West Portal:</strong> ${t.from}<br>
        <strong>East Portal:</strong> ${t.to}
      `).addTo(layers.tunnels);
    });
  }
}

function renderMetrics(metrics) {
  // Clear previous markers
  layers.gauges.clearLayers();

  // 1. Streamflow Gauges
  metrics.streamflows.forEach(s => {
    const isLeesFerry = s.id === "09380000";
    const highlightClass = isLeesFerry ? "highlight-lees" : "";
    const tagHtml = isLeesFerry ? `<div class="callout-tag">1922 Compact Divide</div>` : "";

    const html = `
      <div class="custom-callout ${highlightClass}">
        <div class="callout-title">${s.name.split(",")[0]}</div>
        <div class="callout-val">${s.flow_cfs.toLocaleString()} <span style="font-size:10px;font-weight:600;color:#64748b;">cfs</span></div>
        ${tagHtml}
      </div>
    `;

    const icon = L.divIcon({
      className: "clean-div-icon",
      html: html,
      iconSize: null,
      iconAnchor: [70, 20]
    });

    const marker = L.marker([s.lat, s.lon], { icon: icon })
      .bindPopup(`
        <strong>${s.name}</strong><br>
        <strong>USGS Gauge ID:</strong> ${s.id}<br>
        <strong>Discharge:</strong> ${s.flow_cfs.toLocaleString()} cfs<br>
        <strong>Measured:</strong> ${s.timestamp}
      `)
      .addTo(layers.gauges);

    stationMarkers[s.id] = marker;
  });

  // 2. Trans-Mountain Tunnels Badges
  metrics.tunnels.forEach(t => {
    const html = `
      <div class="custom-callout highlight-tunnel">
        <div class="callout-title">${t.name.split("(")[0]}</div>
        <div class="callout-val" style="color:#7c3aed;">${t.flow_cfs.toLocaleString()} <span style="font-size:10px;font-weight:600;color:#64748b;">cfs</span></div>
        <div style="font-size:9px;color:#7c3aed;font-weight:600;">Eastbound Siphon</div>
      </div>
    `;

    const icon = L.divIcon({
      className: "clean-div-icon",
      html: html,
      iconSize: null,
      iconAnchor: [75, 22]
    });

    const marker = L.marker([t.lat, t.lon], { icon: icon })
      .bindPopup(`
        <strong>${t.name}</strong><br>
        <strong>Diverted Flow:</strong> ${t.flow_cfs} cfs<br>
        <strong>Route:</strong> ${t.destination}<br>
        <strong>Source:</strong> CDWR HydroBase
      `)
      .addTo(layers.tunnels);

    stationMarkers[t.id] = marker;
  });

  // 3. Mega-Reservoirs Badges
  metrics.reservoirs.forEach(r => {
    const html = `
      <div class="custom-callout">
        <div class="callout-title">${r.name.split("(")[0]}</div>
        <div class="callout-val">${r.capacity_pct}% <span style="font-size:10px;font-weight:600;color:#64748b;">Full</span></div>
        <div class="callout-meter">
          <div class="callout-meter-fill" style="width: ${r.capacity_pct}%;"></div>
        </div>
      </div>
    `;

    const icon = L.divIcon({
      className: "clean-div-icon",
      html: html,
      iconSize: null,
      iconAnchor: [70, 22]
    });

    const marker = L.marker([r.lat, r.lon], { icon: icon })
      .bindPopup(`
        <strong>${r.name}</strong><br>
        <strong>Elevation:</strong> ${r.elevation_ft.toLocaleString()} ft<br>
        <strong>Storage:</strong> ${Math.round(r.storage_af).toLocaleString()} Acre-Feet<br>
        <strong>Capacity:</strong> ${r.capacity_pct}% of full pool
      `)
      .addTo(layers.reservoirs);

    stationMarkers[r.id] = marker;
  });
}

function updateSidebar(metrics) {
  // 1. Total Siphoned Under Divide
  const totalDiverted = metrics.tunnels.reduce((sum, t) => sum + t.flow_cfs, 0);
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
      <td style="color:#64748b;font-size:11px;">${node.timestamp ? node.timestamp.split('T')[0] : 'Today'}</td>
    `;
    tr.addEventListener("click", () => {
      flyToNode(node.id, node.lat, node.lon);
    });
    tbody.appendChild(tr);
  });
}

function flyToNode(id, lat, lon) {
  map.flyTo([lat, lon], 10, { duration: 1.2 });
  if (stationMarkers[id]) {
    setTimeout(() => {
      stationMarkers[id].openPopup();
    }, 1200);
  }
}

// Preset Zoom Navigation
function zoomToPreset(preset) {
  document.querySelectorAll(".nav-btn").forEach(btn => btn.classList.remove("active"));
  event.target.classList.add("active");

  switch(preset) {
    case "basin":
      map.flyTo([38.5, -109.8], 6, { duration: 1.2 });
      break;
    case "divide":
      // Focus on the West Slope headwater tunnels in the user's backyard
      map.flyTo([39.8, -105.9], 9, { duration: 1.2 });
      break;
    case "lees_ferry":
      map.flyTo([36.86, -111.59], 10, { duration: 1.2 });
      break;
    case "reservoirs":
      map.flyTo([36.5, -113.0], 7, { duration: 1.2 });
      break;
  }
}

// Layer Toggle Handlers
function toggleLayer(layerName) {
  const checkbox = document.getElementById(`toggle-${layerName}`);
  if (!checkbox) return;

  if (checkbox.checked) {
    map.addLayer(layers[layerName]);
  } else {
    map.removeLayer(layers[layerName]);
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
