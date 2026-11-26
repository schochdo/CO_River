const fs = require("fs");
const path = require("path");

const sankeyPath = path.join(__dirname, "../web/sankey.html");
let html = fs.readFileSync(sankeyPath, "utf8");

// 1. Add / Update NODE_META entries
const nodeMetaInsert = `      "Upper Basin Allocations": {
        cleanTitle: "Upper Basin Allocations",
        summary: "Apportioned consumptive use across Colorado, Utah, Wyoming, and New Mexico under the 1922 Colorado River Compact (4.50 MAF total current consumption).",
        stationId: "09095500",
        stationLabel: "Upper Basin Network",
        portalUrl: "https://waterdata.usgs.gov/monitoring-location/09095500/#parameterCode=00060",
        flowCfs: null,
        pctMean: null
      },
      "Lake Powell Storage Pool (Glen Canyon Dam)": {
        cleanTitle: "Lake Powell Storage Pool (Glen Canyon Dam)",
        summary: "Glen Canyon Dam regulatory pool (24.3 MAF capacity). Buffers Upper Basin inflows to guarantee 7.50+ MAF delivery past Lees Ferry to the Lower Basin.",
        stationId: "lake_powell",
        stationLabel: "USBR Lake Powell",
        portalUrl: "https://www.usbr.gov/uc/water/crsp/cs/gcd.html",
        flowCfs: 8420,
        pctMean: "101%"
      },
      "Lower Basin Tributary & Overdraft Inflows": {
        cleanTitle: "Lower Basin Tributary & Overdraft Inflows",
        summary: "Combined Lower Basin supply increments: natural tributary inflows (Virgin & Little Colorado rivers, ~0.45 MAF) plus reservoir storage overdraft (~2.05 MAF drawdown).",
        stationId: "lake_mead",
        stationLabel: "USBR Lower Colorado",
        portalUrl: "https://www.usbr.gov/lc/region/g4000/hourly/mead-elv.html",
        flowCfs: null,
        pctMean: null
      },
      "Lower Basin Allocations (Lake Mead Hub)": {
        cleanTitle: "Lower Basin Allocations (Lake Mead Hub)",
        summary: "Hoover Dam mainstem distribution hub controlling 10.40 MAF of releases to California (4.40), Arizona (2.80), Nevada (0.30), 1944 Mexico Treaty (1.50), and system losses (1.40).",
        stationId: "lake_mead",
        stationLabel: "USBR Lake Mead",
        portalUrl: "https://www.usbr.gov/lc/region/g4000/hourly/mead-elv.html",
        flowCfs: 9150,
        pctMean: "98%"
      },
      "Western Slope Gravity Canals": {
        cleanTitle: "Western Slope Gravity Canals",
        summary: "Senior in-basin agricultural irrigation across Colorado, Utah, Wyoming, and New Mexico (~3.90 MAF total consumptive use).",
        stationId: "09095500",
        stationLabel: "USGS Cameo / Grand Valley",
        portalUrl: "https://waterdata.usgs.gov/monitoring-location/09095500/#parameterCode=00060",
        flowCfs: 1850,
        pctMean: "94%"
      },
      "Front Range Tunnels (CO)": {
        cleanTitle: "Front Range Municipal Tunnels (CO)",
        summary: "Adams, Moffat, Roberts, and Boustead trans-mountain tunnels under the Continental Divide supplying Denver and Colorado Springs (~0.48 MAF).",
        stationId: "ROBTUNCO",
        stationLabel: "CDSS #ROBTUNCO",
        portalUrl: "https://dwr.state.co.us/Tools/Stations?station=ROBTUNCO",
        flowCfs: 410,
        pctMean: "85%"
      },
      "Wasatch Front Tunnels (UT / CUP)": {
        cleanTitle: "Wasatch Front Municipal Tunnels (UT / CUP)",
        summary: "Strawberry Valley Tunnel and Central Utah Project trans-basin conduits delivering water to Salt Lake City and Utah County (~0.12 MAF).",
        stationId: "09315000",
        stationLabel: "Central Utah WCD",
        portalUrl: "https://waterrights.utah.gov/",
        flowCfs: null,
        pctMean: null
      },
      "Colorado": {
        cleanTitle: "Colorado Consumptive Use",
        summary: "Total annual consumptive use: 2.33 MAF/yr (Western Slope Ag: 1.85 MAF • Front Range Cities: 0.48 MAF).",
        stationId: "09095500",
        stationLabel: "USGS Cameo",
        portalUrl: "https://waterdata.usgs.gov/monitoring-location/09095500/#parameterCode=00060",
        flowCfs: 1850,
        pctMean: "94%"
      },
      "Utah": {
        cleanTitle: "Utah Consumptive Use",
        summary: "Total annual consumptive use: 1.04 MAF/yr (Uinta Basin Ag: 0.92 MAF • Wasatch Front Cities: 0.12 MAF).",
        stationId: "09315000",
        stationLabel: "USGS Green River, UT",
        portalUrl: "https://waterdata.usgs.gov/monitoring-location/09315000/#parameterCode=00060",
        flowCfs: 1200,
        pctMean: "90%"
      },
      "Wyoming": {
        cleanTitle: "Wyoming Consumptive Use",
        summary: "Total annual consumptive use: 0.63 MAF/yr (Upper Green River native hay meadow irrigation and cattle ranching).",
        stationId: "09211200",
        stationLabel: "USGS Upper Green",
        portalUrl: "https://waterdata.usgs.gov/monitoring-location/09211200/#parameterCode=00060",
        flowCfs: 540,
        pctMean: "91%"
      },
      "New Mexico": {
        cleanTitle: "New Mexico Consumptive Use",
        summary: "Total annual consumptive use: 0.50 MAF/yr (San Juan Basin, Navajo Indian Irrigation Project, and municipal diversions).",
        stationId: "09368000",
        stationLabel: "USGS Shiprock",
        portalUrl: "https://waterdata.usgs.gov/monitoring-location/09368000/#parameterCode=00060",
        flowCfs: 680,
        pctMean: "93%"
      },
      "California": {
        cleanTitle: "California Consumptive Use",
        summary: "Total annual consumptive use: 4.40 MAF/yr (All-American Canal Ag: 3.40 MAF • Colorado River Aqueduct / MWD Cities: 1.00 MAF).",
        stationId: "09527700",
        stationLabel: "USGS Imperial Valley",
        portalUrl: "https://waterdata.usgs.gov/monitoring-location/09527700/#parameterCode=00060",
        flowCfs: 2850,
        pctMean: "96%"
      },
      "Arizona": {
        cleanTitle: "Arizona Consumptive Use",
        summary: "Total annual consumptive use: 2.80 MAF/yr (Lower River Mainstem Ag: 1.42 MAF • Central Arizona Project Municipal & Tribal: 1.38 MAF).",
        stationId: "09426650",
        stationLabel: "USGS CAP Mark Wilmer",
        portalUrl: "https://waterdata.usgs.gov/monitoring-location/09426650/#parameterCode=00060",
        flowCfs: 1450,
        pctMean: "92%"
      },
      "Nevada": {
        cleanTitle: "Nevada Consumptive Use",
        summary: "Total annual consumptive use: 0.30 MAF/yr (SNWA deep lake intakes supplying Las Vegas Valley municipal drinking water).",
        stationId: "lake_mead",
        stationLabel: "SNWA Lake Mead Intakes",
        portalUrl: "https://www.snwa.com/",
        flowCfs: null,
        pctMean: null
      },
      "1944 Mexico Treaty": {
        cleanTitle: "Mexico (1944 Treaty Delivery)",
        summary: "International treaty delivery: 1.50 MAF/yr delivered at Morelos Dam for Mexicali Valley agriculture (1.25) and Baja California cities (0.25).",
        stationId: "09522000",
        stationLabel: "IBWC Morelos Dam",
        portalUrl: "https://www.ibwc.gov/",
        flowCfs: null,
        pctMean: null
      },
      "System Losses & Evaporation": {
        cleanTitle: "System Losses & Evaporation",
        summary: "Annual lower system losses: 1.40 MAF/yr (Lake Mead & lower reservoir surface evaporation: 0.90 MAF • River channel transit seepage and phreatophyte uptake: 0.50 MAF).",
        stationId: "lake_mead",
        stationLabel: "USBR Lower Colorado",
        portalUrl: "https://www.usbr.gov/lc/region/g4000/riverops/hourly7.html",
        flowCfs: null,
        pctMean: null
      },`;

// Inject into NODE_META
html = html.replace('const NODE_META = {', 'const NODE_META = {\n' + nodeMetaInsert);

// 2. Replace formatSankeyLinkCard
const newFormatSankeyLinkCard = `    function formatSankeyLinkCard(d) {
      const sourceMeta = NODE_META[d.source.name] || {};
      const targetMeta = NODE_META[d.target.name] || {};
      const sourceName = sourceMeta.cleanTitle || d.source.name;
      const targetName = targetMeta.cleanTitle || d.target.name;
      const conduitTitle = d.conduitName || \`\${sourceName} → \${targetName}\`;
      const rateCfs = Math.round(d.value * 1381.16);

      let catLabel = "Conveyance";
      let catColor = "#0284c7";
      if (d.category === 'ag') { catLabel = "Agricultural Irrigation"; catColor = "#15803d"; }
      else if (d.category === 'municipal') { catLabel = "Municipal & Industrial"; catColor = "#b45309"; }
      else if (d.category === 'treaty') { catLabel = "International Treaty Delivery"; catColor = "#4338ca"; }
      else if (d.category === 'loss') { catLabel = "System Evaporation & Loss"; catColor = "#64748b"; }
      else if (d.category === 'deficit') { catLabel = "Storage Drawdown"; catColor = "#b2182b"; }

      return \`
        <div class="sankey-card" style="font-family:'Inter',sans-serif; min-width:250px; max-width:320px; line-height:1.4;">
          <div style="font-size:10px; font-weight:800; text-transform:uppercase; letter-spacing:0.06em; color:\${catColor}; margin-bottom:2px;">\${catLabel}</div>
          <div style="font-size:13px; font-weight:800; color:#0f172a; margin-bottom:2px;">\${conduitTitle}</div>
          <div style="font-size:11px; color:#475569; margin-bottom:6px; line-height:1.35;">\${sourceName} → \${targetName}</div>
          <div style="border-top:1px solid #e2e8f0; border-bottom:1px solid #e2e8f0; padding:6px 0; margin-bottom:6px; font-size:11px;">
            <div style="display:flex; justify-content:space-between; margin-bottom:2px;">
              <span style="color:#64748b;">Annual Volume:</span>
              <strong style="color:#0f172a; font-variant-numeric:tabular-nums;">\${d.value.toFixed(2)} MAF/yr</strong>
            </div>
            <div style="display:flex; justify-content:space-between;">
              <span style="color:#64748b;">Continuous Rate (Equiv):</span>
              <strong style="color:#0284c7; font-variant-numeric:tabular-nums;">~\${rateCfs.toLocaleString()} cfs</strong>
            </div>
          </div>
          <div style="font-size:10.5px; color:#64748b;">Water Budget Accounting • 1 MAF/yr ≈ 1,381 cfs</div>
        </div>
      \`;
    }`;

html = html.replace(/function formatSankeyLinkCard\(d\)[\s\S]*?renderSankey\(\)/, newFormatSankeyLinkCard + "\n\n    function renderSankey()");

// 3. Replace renderSankey
const newRenderSankey = `    function renderSankey() {
      const container = document.getElementById('sankey-container');
      if (!container) return;
      container.innerHTML = '';

      const width = Math.max(1280, container.clientWidth || 1350);
      const height = 800;

      const nodes = [
        // --- Column 0: Natural Runoff & Storage Drawdown ---
        { name: "Upper Colorado Mainstem", category: "inflow", basin: "upper", desc: "Rocky Mtn National Park to Cisco (CO)" },
        { name: "Green River Basin", category: "inflow", basin: "upper", desc: "Wind River & Uintas (WY, UT, CO)" },
        { name: "San Juan River Basin", category: "inflow", basin: "upper", desc: "San Juan Mountains (CO, NM)" },
        { name: "Lower Basin Tributaries (Virgin & Little CO)", category: "inflow", basin: "lower", desc: "Virgin & Little Colorado Rivers (AZ, NV, UT)" },
        { name: "Reservoir Storage Overdraft", category: "deficit", basin: "lower", desc: "Structural drawdown from Lake Mead" },

        // --- Column 1: Storage Pools & Allocations (SYMMETRICAL TERMINOLOGY) ---
        { name: "Upper Basin Allocations", category: "inflow", basin: "upper", desc: "Upstream consumptive apportionments across CO, UT, WY, NM" },
        { name: "Lake Powell Storage Pool (Glen Canyon Dam)", category: "inflow", basin: "upper", desc: "Regulatory storage buffer releasing past Lees Ferry" },
        { name: "Lower Basin Tributary & Overdraft Inflows", category: "deficit", basin: "lower", desc: "Lower Tributaries (0.45) + Reservoir Storage Drawdown (2.05)" },

        // --- Column 2: Regional Conveyance Conduits & Mainstem Hub ---
        { name: "Western Slope Gravity Canals", category: "ag", basin: "upper", desc: "In-basin agricultural irrigation across 4 Upper states" },
        { name: "Front Range Tunnels (CO)", category: "municipal", basin: "upper", desc: "Adams, Moffat, Roberts, Boustead tunnels across Continental Divide" },
        { name: "Wasatch Front Tunnels (UT / CUP)", category: "municipal", basin: "upper", desc: "Strawberry Valley & Central Utah Project trans-basin diversions" },
        { name: "Lower Basin Allocations (Lake Mead Hub)", category: "inflow", basin: "lower", desc: "Primary distribution and delivery hub for Lower Basin & Mexico" },

        // --- Column 3: State-Grouped Consumptive Uses & Sovereigns ---
        // Upper Basin States (4.50 MAF)
        {
          name: "Colorado",
          displayName: "Colorado",
          category: "ag",
          basin: "upper",
          vol: "2.33 MAF/yr",
          breakdowns: [
            "- Western Slope Ag: 1.85",
            "- Front Range Cities: 0.48"
          ]
        },
        {
          name: "Utah",
          displayName: "Utah",
          category: "ag",
          basin: "upper",
          vol: "1.04 MAF/yr",
          breakdowns: [
            "- Uinta Basin Ag: 0.92",
            "- Wasatch Front: 0.12"
          ]
        },
        {
          name: "Wyoming",
          displayName: "Wyoming",
          category: "ag",
          basin: "upper",
          vol: "0.63 MAF/yr",
          breakdowns: [
            "- Upper Green Ag: 0.63"
          ]
        },
        {
          name: "New Mexico",
          displayName: "New Mexico",
          category: "ag",
          basin: "upper",
          vol: "0.50 MAF/yr",
          breakdowns: [
            "- San Juan & Navajo Ag: 0.50"
          ]
        },

        // Lower Basin States & Sovereigns (10.40 MAF)
        {
          name: "California",
          displayName: "California",
          category: "ag",
          basin: "lower",
          vol: "4.40 MAF/yr",
          breakdowns: [
            "- Imperial & Coachella Ag: 3.40",
            "- SoCal MWD / CRA Cities: 1.00"
          ]
        },
        {
          name: "Arizona",
          displayName: "Arizona",
          category: "ag",
          basin: "lower",
          vol: "2.80 MAF/yr",
          breakdowns: [
            "- Central AZ Project: 1.38",
            "- Mainstem River Ag: 1.42"
          ]
        },
        {
          name: "Nevada",
          displayName: "Nevada",
          category: "municipal",
          basin: "lower",
          vol: "0.30 MAF/yr",
          breakdowns: [
            "- Las Vegas Valley / SNWA: 0.30"
          ]
        },
        {
          name: "1944 Mexico Treaty",
          displayName: "Mexico (1944 Treaty)",
          category: "treaty",
          basin: "lower",
          vol: "1.50 MAF/yr",
          breakdowns: [
            "- Mexicali Valley Ag: 1.25",
            "- Baja California Cities: 0.25"
          ]
        },
        {
          name: "System Losses & Evaporation",
          displayName: "System Losses & Evaporation",
          category: "loss",
          basin: "lower",
          vol: "1.40 MAF/yr",
          breakdowns: [
            "- Lake Evaporation: 0.90",
            "- River Transit & Seepage: 0.50"
          ]
        }
      ];

      const links = [
        // Col 0 -> Col 1 (Inflow & Overdraft Sources to Storage/Allocations)
        { source: "Upper Colorado Mainstem", target: "Upper Basin Allocations", value: 2.50, category: "inflow" },
        { source: "Upper Colorado Mainstem", target: "Lake Powell Storage Pool (Glen Canyon Dam)", value: 4.30, category: "inflow" },

        { source: "Green River Basin", target: "Upper Basin Allocations", value: 1.30, category: "inflow" },
        { source: "Green River Basin", target: "Lake Powell Storage Pool (Glen Canyon Dam)", value: 2.60, category: "inflow" },

        { source: "San Juan River Basin", target: "Upper Basin Allocations", value: 0.70, category: "inflow" },
        { source: "San Juan River Basin", target: "Lake Powell Storage Pool (Glen Canyon Dam)", value: 1.00, category: "inflow" },

        { source: "Lower Basin Tributaries (Virgin & Little CO)", target: "Lower Basin Tributary & Overdraft Inflows", value: 0.45, category: "inflow" },
        { source: "Reservoir Storage Overdraft", target: "Lower Basin Tributary & Overdraft Inflows", value: 2.05, category: "deficit" },

        // Col 1 -> Col 2 (Upper Basin Allocations to Conduits; Powell & Lower Inflows to Mead Hub)
        { source: "Upper Basin Allocations", target: "Western Slope Gravity Canals", value: 3.90, category: "ag" },
        { source: "Upper Basin Allocations", target: "Front Range Tunnels (CO)", value: 0.48, category: "municipal" },
        { source: "Upper Basin Allocations", target: "Wasatch Front Tunnels (UT / CUP)", value: 0.12, category: "municipal" },

        { source: "Lake Powell Storage Pool (Glen Canyon Dam)", target: "Lower Basin Allocations (Lake Mead Hub)", value: 7.90, category: "inflow" },
        { source: "Lower Basin Tributary & Overdraft Inflows", target: "Lower Basin Allocations (Lake Mead Hub)", value: 2.50, category: "deficit" },

        // Col 2 -> Col 3 (Conduits to Upper Basin States)
        { source: "Western Slope Gravity Canals", target: "Colorado", value: 1.85, category: "ag" },
        { source: "Western Slope Gravity Canals", target: "Utah", value: 0.92, category: "ag" },
        { source: "Western Slope Gravity Canals", target: "Wyoming", value: 0.63, category: "ag" },
        { source: "Western Slope Gravity Canals", target: "New Mexico", value: 0.50, category: "ag" },

        { source: "Front Range Tunnels (CO)", target: "Colorado", value: 0.48, category: "municipal" },
        { source: "Wasatch Front Tunnels (UT / CUP)", target: "Utah", value: 0.12, category: "municipal" },

        // Col 2 -> Col 3 (Lower Basin Allocations Hub to Lower States & Sovereigns: AG vs MUNICIPAL SPLIT!)
        // California: 3.40 Ag (All-American Canal) + 1.00 Muni (Colorado River Aqueduct)
        { source: "Lower Basin Allocations (Lake Mead Hub)", target: "California", value: 3.40, category: "ag", conduitName: "All-American Canal (CA Agriculture)" },
        { source: "Lower Basin Allocations (Lake Mead Hub)", target: "California", value: 1.00, category: "municipal", conduitName: "Colorado River Aqueduct (CA Municipal)" },

        // Arizona: 1.42 Ag (Mainstem Canals) + 1.38 Muni (Central Arizona Project)
        { source: "Lower Basin Allocations (Lake Mead Hub)", target: "Arizona", value: 1.42, category: "ag", conduitName: "Lower River Mainstem Canals (AZ Agriculture)" },
        { source: "Lower Basin Allocations (Lake Mead Hub)", target: "Arizona", value: 1.38, category: "municipal", conduitName: "Central Arizona Project (AZ Municipal)" },

        // Nevada: 0.30 Muni (SNWA Intakes)
        { source: "Lower Basin Allocations (Lake Mead Hub)", target: "Nevada", value: 0.30, category: "municipal", conduitName: "Lake Mead SNWA Intakes (NV Municipal)" },

        // Mexico & Losses
        { source: "Lower Basin Allocations (Lake Mead Hub)", target: "1944 Mexico Treaty", value: 1.50, category: "treaty", conduitName: "1944 Mexico Treaty Delivery (Morelos Dam)" },
        { source: "Lower Basin Allocations (Lake Mead Hub)", target: "System Losses & Evaporation", value: 1.40, category: "loss", conduitName: "System Evaporation & Transit Losses" }
      ];

      // Base padding for initial layout computation
      const basePadding = 18;
      const sankey = d3.sankey()
        .nodeId(d => d.name)
        .nodeWidth(18)
        .nodePadding(basePadding)
        .nodeSort(null)
        .extent([[24, 25], [width - 300, height - 25]]);

      const graph = sankey({
        nodes: nodes.map(d => Object.assign({}, d)),
        links: links.map(d => Object.assign({}, d))
      });

      // EXACT BALANCED EQUATION HEIGHT CALIBRATION:
      // Left side (14.90 MAF total inflow + storage drawdown) = Right side (14.90 MAF consumptive depletions).
      // Align all columns so the top of each column starts at y = targetYTop,
      // and the bottom of each column ends at y = targetYBottom!
      const col3Nodes = graph.nodes.filter(n => n.depth === 3).sort((a,b) => a.y0 - b.y0);
      const targetYTop = col3Nodes[0].y0;
      const targetYBottom = col3Nodes[col3Nodes.length - 1].y1;
      const targetTotalHeight = targetYBottom - targetYTop;

      const columns = [
        graph.nodes.filter(n => n.depth === 0).sort((a,b) => a.y0 - b.y0),
        graph.nodes.filter(n => n.depth === 1).sort((a,b) => a.y0 - b.y0),
        graph.nodes.filter(n => n.depth === 2).sort((a,b) => a.y0 - b.y0),
        col3Nodes
      ];

      // Re-distribute inter-node gaps across Column 0, 1, and 2 so each spans the exact same vertical frame
      for (let c = 0; c < 3; c++) {
        const colNodes = columns[c];
        const sumNodeHeights = colNodes.reduce((acc, n) => acc + (n.y1 - n.y0), 0);
        const numGaps = colNodes.length - 1;
        const totalGapSpace = targetTotalHeight - sumNodeHeights;
        const gap = totalGapSpace / numGaps;

        let currentY = targetYTop;
        for (const node of colNodes) {
          const h = node.y1 - node.y0;
          node.y0 = currentY;
          node.y1 = currentY + h;
          currentY += h + gap;
        }
      }

      // Recompute link y0 and y1 coordinates with deterministic link ordering to prevent any crossing
      const catOrder = { ag: 1, municipal: 2, treaty: 3, loss: 4, inflow: 5, deficit: 6 };
      function linkSort(a, b) {
        if (a.target.y0 !== b.target.y0) return a.target.y0 - b.target.y0;
        if (a.source.y0 !== b.source.y0) return a.source.y0 - b.source.y0;
        return (catOrder[a.category] || 99) - (catOrder[b.category] || 99);
      }

      for (const node of graph.nodes) {
        node.sourceLinks.sort(linkSort);
        let sy = node.y0;
        for (const link of node.sourceLinks) {
          link.y0 = sy + link.width / 2;
          sy += link.width;
        }

        node.targetLinks.sort(linkSort);
        let ty = node.y0;
        for (const link of node.targetLinks) {
          link.y1 = ty + link.width / 2;
          ty += link.width;
        }
      }

      const colorMap = {
        inflow: "#0284c7",
        deficit: "#b2182b",
        ag: "#15803d",
        municipal: "#b45309",
        treaty: "#4338ca",
        loss: "#64748b"
      };

      const linkColorMap = {
        inflow: "#0284c7",
        deficit: "#b2182b",
        ag: "#15803d",
        municipal: "#b45309",
        treaty: "#4338ca",
        loss: "#64748b"
      };

      const svg = d3.select(container)
        .append("svg")
        .attr("viewBox", [0, 0, width, height])
        .attr("width", "100%")
        .attr("height", "100%")
        .style("font", "12px Inter, sans-serif");

      const tooltip = document.getElementById("sankey-tooltip");
      const flowComparisonBox = document.getElementById("flowComparisonBox");
      const combinedInflowBox = document.getElementById("combinedInflowBox");
      window.flowComparisonBox = flowComparisonBox;
      window.combinedInflowBox = combinedInflowBox;

      let tooltipTimer = null;
      tooltip.addEventListener('mouseenter', () => {
        if (tooltipTimer) clearTimeout(tooltipTimer);
      });
      tooltip.addEventListener('mouseleave', () => {
        tooltip.classList.remove('visible');
      });

      const scheduleTooltipHide = () => {
        tooltipTimer = setTimeout(() => {
          tooltip.classList.remove('visible');
        }, 220);
      };

      function updateCardBoxes(html) {
        if (flowComparisonBox) flowComparisonBox.innerHTML = html;
        if (combinedInflowBox) combinedInflowBox.innerHTML = html;
      }

      // Smooth engineering transit curves (gentle 0.38 tangents)
      function customLinkPath(d) {
        const x0 = d.source.x1;
        const x1 = d.target.x0;
        const y0 = d.y0;
        const y1 = d.y1;
        const dx = (x1 - x0) * 0.38;
        return "M" + x0 + "," + y0 +
               "C" + (x0 + dx) + "," + y0 +
               " " + (x1 - dx) + "," + y1 +
               " " + x1 + "," + y1;
      }

      // Outer editorial frame
      svg.append("rect")
        .attr("x", 12)
        .attr("y", 12)
        .attr("width", width - 24)
        .attr("height", height - 24)
        .attr("fill", "#fafaf9")
        .attr("rx", 6)
        .attr("stroke", "#e2e8f0");

      // State Group Brackets on the Right Margin
      const coNode = graph.nodes.find(n => n.name === "Colorado");
      const nmNode = graph.nodes.find(n => n.name === "New Mexico");
      const caNode = graph.nodes.find(n => n.name === "California");
      const lossNode = graph.nodes.find(n => n.name === "System Losses & Evaporation");

      // Upper Basin Bracket (Blue #0284c7)
      svg.append("path")
        .attr("d", "M " + (width - 24) + " " + (coNode.y0 + 2) + " L " + (width - 16) + " " + (coNode.y0 + 2) + " L " + (width - 16) + " " + (nmNode.y1 - 2) + " L " + (width - 24) + " " + (nmNode.y1 - 2))
        .attr("fill", "none")
        .attr("stroke", "#0284c7")
        .attr("stroke-width", 2.5);

      svg.append("text")
        .attr("x", width - 28)
        .attr("y", (coNode.y0 + nmNode.y1) / 2)
        .attr("text-anchor", "end")
        .attr("transform", "rotate(-90 " + (width - 28) + " " + ((coNode.y0 + nmNode.y1) / 2) + ")")
        .attr("font-size", "10px")
        .attr("font-weight", "900")
        .attr("letter-spacing", "0.08em")
        .attr("fill", "#0284c7")
        .text("UPPER BASIN (4.50 MAF)");

      // Lower Basin Bracket (Orange #ea580c)
      svg.append("path")
        .attr("d", "M " + (width - 24) + " " + (caNode.y0 + 2) + " L " + (width - 16) + " " + (caNode.y0 + 2) + " L " + (width - 16) + " " + (lossNode.y1 - 2) + " L " + (width - 24) + " " + (lossNode.y1 - 2))
        .attr("fill", "none")
        .attr("stroke", "#ea580c")
        .attr("stroke-width", 2.5);

      svg.append("text")
        .attr("x", width - 28)
        .attr("y", (caNode.y0 + lossNode.y1) / 2)
        .attr("text-anchor", "end")
        .attr("transform", "rotate(-90 " + (width - 28) + " " + ((caNode.y0 + lossNode.y1) / 2) + ")")
        .attr("font-size", "10px")
        .attr("font-weight", "900")
        .attr("letter-spacing", "0.08em")
        .attr("fill", "#ea580c")
        .text("LOWER BASIN & DELIVERIES (10.40 MAF)");

      // Render Links
      const link = svg.append("g")
        .attr("fill", "none")
        .selectAll("g")
        .data(graph.links)
        .join("g")
        .style("mix-blend-mode", "multiply");

      link.append("path")
        .attr("d", customLinkPath)
        .attr("stroke", d => linkColorMap[d.category] || "#94a3b8")
        .attr("stroke-width", d => Math.max(2, d.width))
        .attr("stroke-opacity", d => d.category === 'deficit' ? 0.70 : 0.45)
        .attr("class", "link")
        .on("mouseenter", (e, d) => {
          if (tooltipTimer) clearTimeout(tooltipTimer);
          const html = formatSankeyLinkCard(d);
          tooltip.innerHTML = html;
          updateCardBoxes(html);
          tooltip.classList.add("visible");
          updateTooltip(e);
        })
        .on("mousemove", updateTooltip)
        .on("mouseleave", scheduleTooltipHide)
        .on("click", (e, d) => {
          e.stopPropagation();
          if (tooltipTimer) clearTimeout(tooltipTimer);
          const html = formatSankeyLinkCard(d);
          tooltip.innerHTML = html;
          updateCardBoxes(html);
          tooltip.classList.add("visible");
          updateTooltip(e);
        });

      // Render Nodes
      const node = svg.append("g")
        .selectAll("g")
        .data(graph.nodes)
        .join("g")
        .attr("class", "node");

      node.append("rect")
        .attr("x", d => d.x0)
        .attr("y", d => d.y0)
        .attr("height", d => Math.max(3, d.y1 - d.y0))
        .attr("width", d => d.x1 - d.x0)
        .attr("rx", 3)
        .attr("fill", d => colorMap[d.category] || "#64748b")
        .attr("stroke", "#0f172a")
        .attr("stroke-width", 0.8)
        .attr("fill-opacity", 0.95)
        .on("mouseenter", (e, d) => {
          if (tooltipTimer) clearTimeout(tooltipTimer);
          const html = formatSankeyNodeCard(d);
          tooltip.innerHTML = html;
          updateCardBoxes(html);
          tooltip.classList.add("visible");
          updateTooltip(e);
        })
        .on("mousemove", updateTooltip)
        .on("mouseleave", scheduleTooltipHide)
        .on("click", (e, d) => {
          e.stopPropagation();
          if (tooltipTimer) clearTimeout(tooltipTimer);
          const html = formatSankeyNodeCard(d);
          tooltip.innerHTML = html;
          updateCardBoxes(html);
          tooltip.classList.add("visible");
          updateTooltip(e);
        });

      // Text Labels - Positioned to the right of bars with multi-line stacking
      const textGroup = node.append("text")
        .attr("x", d => d.x1 + 10)
        .attr("y", d => {
          if (d.depth === 3 && d.breakdowns) {
            const numLines = 1 + d.breakdowns.length;
            return ((d.y0 + d.y1) / 2) - ((numLines - 1) * 6.5);
          }
          return (d.y1 + d.y0) / 2;
        })
        .attr("text-anchor", "start")
        .style("paint-order", "stroke fill")
        .style("stroke", "#ffffff")
        .style("stroke-width", "4.5px")
        .style("stroke-linejoin", "round");

      // Line 1: State/Entity Name & Total on ONE LINE, separated with hyphen
      textGroup.append("tspan")
        .attr("x", function() { return d3.select(this.parentNode).attr("x"); })
        .attr("dy", d => (d.depth === 3 && d.breakdowns ? "0.3em" : "-0.32em"))
        .attr("font-size", d => (d.depth === 3 ? "12.5px" : (d.depth === 1 || d.depth === 2 ? "12px" : "11.5px")))
        .attr("font-weight", "800")
        .attr("fill", "#0f172a")
        .text(d => {
          if (d.depth === 3) {
            const label = d.displayName || d.name;
            return label + " — " + d.value.toFixed(2) + " MAF/yr";
          }
          return NODE_META[d.name]?.cleanTitle || d.name;
        });

      // Sub-lines for Column 3: Breakdowns on NEW LINES with hyphen separation
      graph.nodes.forEach(d => {
        const textElem = textGroup.filter(n => n.name === d.name);
        if (d.depth === 3 && d.breakdowns) {
          d.breakdowns.forEach(sub => {
            textElem.append("tspan")
              .attr("x", d.x1 + 12)
              .attr("dy", "1.32em")
              .attr("font-size", "10.5px")
              .attr("font-weight", "600")
              .attr("fill", "#475569")
              .style("font-variant-numeric", "tabular-nums")
              .text(sub);
          });
        } else if (d.depth !== 3) {
          textElem.append("tspan")
            .attr("x", d.x1 + 10)
            .attr("dy", "1.4em")
            .attr("font-size", "11px")
            .attr("font-family", "'Inter', -apple-system, sans-serif")
            .style("font-variant-numeric", "tabular-nums")
            .attr("font-weight", "700")
            .attr("fill", "#334155")
            .text(d.value.toFixed(2) + " MAF/yr");
        }
      });
    }`;

html = html.replace(/function renderSankey\(\)[\s\S]*?function updateTooltip\(e\)/, newRenderSankey + "\n\n    function updateTooltip(e)");

fs.writeFileSync(sankeyPath, html, "utf8");
console.log("Successfully applied symmetric ag/muni sankey to web/sankey.html!");
