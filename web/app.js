// Global State
let map;
let layers = {
  river: L.layerGroup(),
  minorRivers: L.layerGroup(),
  divide: L.layerGroup(),
  tunnels: L.layerGroup(),
  basin: L.layerGroup(),
  gauges: L.layerGroup(),
  reservoirs: L.layerGroup(),
  dams: L.layerGroup()
};

let telemetryData = [];
let stationMarkers = {};

let currentBasemap;
const basemaps = {
  esriNatGeo: L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/NatGeo_World_Map/MapServer/tile/{z}/{y}/{x}", {
    maxZoom: 16,
    attribution: 'Tiles &copy; Esri &mdash; National Geographic, USGS, NOAA'
  }),
  esriPhysical: L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Physical_Map/MapServer/tile/{z}/{y}/{x}", {
    maxZoom: 8,
    attribution: 'Tiles &copy; Esri &mdash; US National Park Service, U.S. Geological Survey'
  }),
  esriSatellite: L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", {
    maxZoom: 17,
    attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP'
  }),
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

  // Set default basemap: National Geographic Style (Warm Pictorial Relief)
  currentBasemap = basemaps.esriNatGeo;
  currentBasemap.addTo(map);

  // Add all layer groups to map by default
  Object.values(layers).forEach(layer => layer.addTo(map));

  // Explicit zIndex panes for cartographic stacking
  map.createPane('riverPane');
  map.getPane('riverPane').style.zIndex = 410; // Continuous river on bottom

  map.createPane('lakesPane');
  map.getPane('lakesPane').style.zIndex = 420; // Lake bodies sit cleanly on top of river

  map.createPane('dividePane');
  map.getPane('dividePane').style.zIndex = 430; // Continental divide sits above water

  map.createPane('tunnelsPane');
  map.getPane('tunnelsPane').style.zIndex = 440; // Aqueducts and tunnels sit above water

  map.createPane('damsPane');
  map.getPane('damsPane').style.zIndex = 450; // Dam markers sit above lines and water
}

function changeBasemap(key) {
  if (basemaps[key]) {
    map.removeLayer(currentBasemap);
    currentBasemap = basemaps[key];
    currentBasemap.addTo(map);
    
    // Keep reference labels on top for basemaps that lack labels
    if (key === "esriTerrain" || key === "esriRelief" || key === "usgsRelief" || key === "esriSatellite" || key === "esriPhysical") {
      if (!map.hasLayer(referenceLabels)) {
        referenceLabels.addTo(map);
      }
      referenceLabels.bringToFront();
    } else {
      // esriNatGeo has built-in classic editorial labels
      if (map.hasLayer(referenceLabels)) {
        map.removeLayer(referenceLabels);
      }
    }
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
  // 1. Official USGS NHD Lake Polygons (Lake Powell & Lake Mead)
  if (lakes && lakes.features) {
    L.geoJSON(lakes, {
      pane: 'lakesPane',
      style: {
        color: "#0369a1",
        weight: 1.5,
        fillColor: "#0284c7",
        fillOpacity: 0.85
      },
      onEachFeature: (feature, layer) => {
        const name = feature.properties.GNIS_NAME || "Reservoir";
        const area = feature.properties.AREASQKM ? `${Math.round(feature.properties.AREASQKM)} sq km` : "";
        layer.bindTooltip(`<strong>${name}</strong><br>USGS NHD Shoreline (${area})`, { sticky: true });
      }
    }).addTo(layers.reservoirs);
  }

  // 2. Basin Boundaries (Upper vs Lower) with Warm Artistic Regional Washes
  if (geo.upper_basin_outline) {
    const upperCoords = geo.upper_basin_outline.map(pt => [pt[1], pt[0]]);
    L.polygon(upperCoords, {
      color: "#0284c7",
      weight: 1.8,
      dashArray: "5, 7",
      fillColor: "#f59e0b", // warm amber sandstone wash
      fillOpacity: 0.07
    }).bindTooltip("Upper Colorado River Basin (WY, CO, UT, NM)", { sticky: true })
      .addTo(layers.basin);
  }

  if (geo.lower_basin_outline) {
    const lowerCoords = geo.lower_basin_outline.map(pt => [pt[1], pt[0]]);
    L.polygon(lowerCoords, {
      color: "#b45309",
      weight: 1.8,
      dashArray: "5, 7",
      fillColor: "#ea580c", // warm desert terracotta wash
      fillOpacity: 0.07
    }).bindTooltip("Lower Colorado River Basin (NV, AZ, CA)", { sticky: true })
      .addTo(layers.basin);
  }

  // 3. Continental Divide
  if (geo.continental_divide) {
    const divideCoords = geo.continental_divide.map(pt => [pt[1], pt[0]]);
    L.polyline(divideCoords, {
      pane: 'dividePane',
      color: "#b45309",
      weight: 3.5,
      dashArray: "8, 6",
      opacity: 0.85
    }).bindTooltip("Continental Divide of the Americas", { sticky: true })
      .addTo(layers.divide);
  }

  // 4. CFS-Weighted River Network (Width Scaled to Flow Volume) with Luminous Glow Halo
  if (riverNetwork) {
    layers.river.clearLayers();
    layers.minorRivers.clearLayers();
    riverNetwork.forEach(seg => {
      // Handle MultiPolyline (array of lines, where each line is an array of [lon, lat] points)
      const coords = seg.coords.map(line => line.map(pt => [pt[1], pt[0]]));
      const isMinor = seg.category === "minor_tributary";
      const targetLayer = isMinor ? layers.minorRivers : layers.river;
      const catBadge = seg.category === "mainstem" 
        ? '<span style="font-size:10px;font-weight:700;color:#0284c7;background:#e0f2fe;padding:1px 5px;border-radius:4px;">Mainstem Reach</span>' 
        : (seg.category === "major_tributary" 
            ? '<span style="font-size:10px;font-weight:700;color:#0369a1;background:#f0f9ff;padding:1px 5px;border-radius:4px;">Major Tributary</span>'
            : '<span style="font-size:10px;font-weight:600;color:#0284c7;background:#f1f5f9;padding:1px 5px;border-radius:4px;">Tributary Reach</span>');

      const notesHtml = seg.notes ? `<div style="font-size:11px;color:#64748b;margin-top:3px;line-height:1.3;">${seg.notes}</div>` : '';

      // Flowline with GPU drop-shadow glow (eliminates overlapping cap/bubble artifacts)
      L.polyline(coords, {
        pane: 'riverPane',
        className: 'river-flowline',
        color: isMinor ? "#0284c7" : "#0369a1",
        weight: seg.weight,
        opacity: 0.95,
        lineCap: "round",
        lineJoin: "round"
      }).bindTooltip(`
        <div style="font-family:'Inter',sans-serif; min-width: 140px;">
          <div style="margin-bottom:3px;">${catBadge}</div>
          <strong style="font-size:12px;color:#0f172a;">${seg.name}</strong><br>
          <div style="font-size:11px;color:#334155;margin-top:2px;">
            Estimated Discharge: <strong>${seg.flow_cfs.toLocaleString()} cfs</strong><br>
            <span style="font-size:10px;color:#64748b;">Hydraulic Width: ${seg.weight}px (w &sim; Q<sup>0.5</sup>)</span>
          </div>
          ${notesHtml}
        </div>
      `, { sticky: true })
        .addTo(targetLayer);
    });
  }

  // 5. Trans-Mountain Tunnels
  if (geo.tunnels) {
    geo.tunnels.forEach(t => {
      const coords = t.coords.map(pt => [pt[1], pt[0]]);
      const isFrontRange = t.id.endsWith("TUNCO");
      const lengthText = isFrontRange ? `${t.length_miles} miles under Divide` : `${t.length_miles} miles`;
      const fromText = isFrontRange ? `<strong>West Portal:</strong> ${t.from}` : `<strong>Intake:</strong> ${t.from}`;
      const toText = isFrontRange ? `<strong>East Portal:</strong> ${t.to}` : `<strong>Terminus:</strong> ${t.to}`;

      L.polyline(coords, {
        pane: 'tunnelsPane',
        color: "#9333ea",
        weight: 4.5,
        dashArray: "3, 5",
        opacity: 0.95
      }).bindPopup(`
        <strong>${t.name}</strong><br>
        <em>${t.operator}</em><br>
        <strong>Length:</strong> ${lengthText}<br>
        ${fromText}<br>
        ${toText}
      `).addTo(layers.tunnels);
    });
  }

  // 6. Major Dams (Concrete & Earthfill Impoundments)
  if (geo.dams) {
    layers.dams.clearLayers();
    geo.dams.forEach(d => {
      const icon = L.divIcon({
        className: "dam-div-icon",
        html: `
          <div class="dam-marker" title="${d.name}">
            <svg viewBox="0 0 24 24" width="13" height="13" fill="#ffffff">
              <path d="M4 4h16l-3 16H7L4 4zm2.5 2l2.25 12h6.5l2.25-12h-11z"/>
            </svg>
          </div>
        `,
        iconSize: [20, 20],
        iconAnchor: [10, 10]
      });

      L.marker([d.lat, d.lon], { icon: icon, pane: 'damsPane' })
        .bindPopup(`
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
        .addTo(layers.dams);
    });
  }
}

function renderMetrics(metrics) {
  // Clear previous markers
  layers.gauges.clearLayers();

  // 1. Streamflow Gauges (Compact CFS Badges Anchored Directly on Gauge Points)
  metrics.streamflows.forEach(s => {
    const isLeesFerry = s.id === "09380000";
    const highlightClass = isLeesFerry ? "lees-badge" : "";

    const icon = L.divIcon({
      className: "cfs-div-icon",
      html: `<div class="cfs-badge gauge ${highlightClass}"><span class="cfs-val">${s.flow_cfs.toLocaleString()}</span> <span class="cfs-unit">cfs</span></div>`,
      iconSize: [0, 0],
      iconAnchor: [0, 0]
    });

    const marker = L.marker([s.lat, s.lon], { icon: icon })
      .bindTooltip(`<strong>${s.name.split(',')[0]}</strong><br>Discharge: <strong>${s.flow_cfs.toLocaleString()} cfs</strong>`, {
        direction: "top",
        offset: [0, -10]
      })
      .bindPopup(`
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
      `, { offset: [0, -8] })
      .addTo(layers.gauges);

    stationMarkers[s.id] = marker;
  });

  // 2. Trans-Mountain Tunnels & Diversion Badges
  metrics.tunnels.forEach(t => {
    const isFrontRange = t.id.endsWith("TUNCO");
    const siphonText = isFrontRange ? "Eastbound Siphon" : "Aqueduct Diversion";
    const lengthText = isFrontRange ? `${t.length_miles} miles under Divide` : `${t.length_miles} miles`;
    const fromText = isFrontRange ? `<strong>West Portal:</strong> ${t.from}` : `<strong>Intake:</strong> ${t.from}`;
    const toText = isFrontRange ? `<strong>East Portal:</strong> ${t.to}` : `<strong>Terminus:</strong> ${t.to}`;

    const icon = L.divIcon({
      className: "cfs-div-icon",
      html: `<div class="cfs-badge tunnel-badge"><span class="cfs-val">${t.flow_cfs.toLocaleString()}</span> <span class="cfs-unit">cfs</span></div>`,
      iconSize: [0, 0],
      iconAnchor: [0, 0]
    });

    const marker = L.marker([t.lat, t.lon], { icon: icon })
      .bindTooltip(`<strong>${t.name.split('(')[0]}</strong><br>Diverted: <strong>${t.flow_cfs.toLocaleString()} cfs</strong>`, {
        direction: "top",
        offset: [0, -10]
      })
      .bindPopup(`
        <div style="font-family:'Inter',sans-serif; min-width: 220px; padding: 2px;">
          <div style="display:flex; align-items:center; gap:6px; margin-bottom:6px;">
            <span style="font-size:10px; font-weight:700; color:#7e22ce; background:#f3e8ff; padding:2px 6px; border-radius:4px;">${siphonText}</span>
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
      `, { offset: [0, -8] })
      .addTo(layers.tunnels);

    stationMarkers[t.id] = marker;
  });

  // 3. Mega-Reservoirs Badges
  metrics.reservoirs.forEach(r => {
    const icon = L.divIcon({
      className: "cfs-div-icon",
      html: `<div class="cfs-badge res-badge"><span class="cfs-val">${r.capacity_pct}%</span></div>`,
      iconSize: [0, 0],
      iconAnchor: [0, 0]
    });

    const marker = L.marker([r.lat, r.lon], { icon: icon })
      .bindTooltip(`<strong>${r.name.split('(')[0]}</strong>: ${r.capacity_pct}% Full`, {
        direction: "top",
        offset: [0, -10]
      })
      .bindPopup(`
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
      `, { offset: [0, -8] })
      .addTo(layers.reservoirs);

    stationMarkers[r.id] = marker;
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
