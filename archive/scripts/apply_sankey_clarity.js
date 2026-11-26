const fs = require("fs");
let html = fs.readFileSync("web/sankey.html", "utf8");

// 1. Add CSS rules for in-iframe compactness and zero gap
const iframeCss = `
    body.in-iframe #btn-back-workspace {
      display: none !important;
    }
    body.in-iframe header {
      display: none !important;
    }
    body.in-iframe #macro-banner {
      display: none !important;
    }
    body.in-iframe .sankey-page-container {
      max-width: 100% !important;
      padding: 0 !important;
      margin: 0 !important;
    }
`;

html = html.replace(
  `    body.in-iframe #btn-back-workspace {
      display: none !important;
    }`,
  iframeCss
);

// Add id="macro-banner" to context banner and class="sankey-page-container" to outer container
html = html.replace(
  '<div class="max-w-[1450px] mx-auto">',
  '<div class="sankey-page-container max-w-[1450px] mx-auto">'
);
html = html.replace(
  '<div class="mb-3 bg-white border border-stone-200 rounded-xl p-3 shadow-xs flex flex-wrap items-center justify-between gap-4 text-xs text-stone-700">',
  '<div id="macro-banner" class="mb-3 bg-white border border-stone-200 rounded-xl p-3 shadow-xs flex flex-wrap items-center justify-between gap-4 text-xs text-stone-700">'
);

// 2. Update Column Header styling in DOM
html = html.replace(
  `<div class="grid grid-cols-5 text-center text-[11px] font-bold tracking-wider uppercase pb-2 mb-2 border-b border-stone-200 text-stone-500">
          <div class="text-left pl-2">1. Inflows &amp; Storage Overdraft</div>
          <div>2. Powell &amp; Mead Storage Pools</div>
          <div>3. State &amp; Sovereign Allocations</div>
          <div>4. Major Conveyance Conduits</div>
          <div class="text-right pr-2">5. End Uses (Ag vs Municipal by State)</div>
        </div>`,
  `<div class="grid grid-cols-5 text-center text-xs font-black tracking-wider uppercase pb-2 mb-2 border-b border-stone-200 text-stone-600">
          <div class="text-left pl-2">1. Inflow Sources &amp; Overdraft</div>
          <div>2. Powell &amp; Mead Storage Pools</div>
          <div>3. State &amp; Sovereign Allocations</div>
          <div>4. Major Conveyance Conduits</div>
          <div class="text-right pr-2">5. End Uses (Ag vs Municipal by State)</div>
        </div>`
);

// 3. Update renderSankey implementation
const startTag = "function renderSankey() {";
const endTag = "function updateTooltip(e) {";

const startIndex = html.indexOf(startTag);
const endIndex = html.indexOf(endTag);

if (startIndex === -1 || endIndex === -1) {
  console.error("Tags not found");
  process.exit(1);
}

const newRenderSankey = `function renderSankey() {
      const container = document.getElementById('sankey-container');
      if (!container) return;
      container.innerHTML = '';

      const width = 2100;
      const height = 980;

      const nodes = [
        // --- Tier 1: Inflow Sources & Storage Overdraft (depth 0) ---
        { name: "Upper Colorado Mainstem", category: "inflow" },
        { name: "Green River Basin", category: "inflow" },
        { name: "San Juan River Basin", category: "inflow" },
        { name: "Lower Basin Tributaries (Virgin & Little CO)", category: "inflow" },
        { name: "Reservoir Storage Drawdown", category: "deficit" },

        // --- Tier 2: Storage Hubs (Powell & Mead Pools) (depth 1) ---
        { name: "Lake Powell Pool (Glen Canyon Dam)", category: "inflow", basin: "upper" },
        { name: "Lake Mead Pool (Hoover Dam Hub)", category: "inflow", basin: "lower" },

        // --- Tier 3: 7 States, Mexico Treaty & Losses (depth 2) ---
        { name: "Colorado", category: "inflow", basin: "upper" },
        { name: "Utah", category: "inflow", basin: "upper" },
        { name: "Wyoming", category: "inflow", basin: "upper" },
        { name: "New Mexico", category: "inflow", basin: "upper" },
        { name: "California", category: "inflow", basin: "lower" },
        { name: "Arizona", category: "inflow", basin: "lower" },
        { name: "Nevada", category: "inflow", basin: "lower" },
        { name: "1944 Mexico Treaty", category: "treaty", basin: "lower" },
        { name: "System Losses & Conveyance", category: "loss", basin: "lower" },

        // --- Tier 4: Canals & Conveyance Infrastructure (depth 3) ---
        { name: "Western Slope Gravity Canals", category: "ag" },
        { name: "Trans-Mountain Diversion Tunnels", category: "municipal" },
        { name: "Uinta & Green Basin Canals", category: "ag" },
        { name: "Central Utah Project (CUP)", category: "municipal" },
        { name: "Upper Green River Irrigation", category: "ag" },
        { name: "San Juan Basin Diversions", category: "ag" },
        { name: "All-American Canal (AAC)", category: "ag" },
        { name: "Colorado River Aqueduct (CRA)", category: "municipal" },
        { name: "Lower River Gravity Canals (AZ)", category: "ag" },
        { name: "Central Arizona Project (CAP)", category: "municipal" },
        { name: "Lake Mead SNWA Intakes", category: "municipal" },
        { name: "Morelos Dam & Central Feeder Canal", category: "treaty" },
        { name: "Reservoir Open-Water Evaporation", category: "loss" },
        { name: "River Transit & Riparian Losses", category: "loss" },

        // --- Tier 5: Consumptive End Uses (Disaggregated & State-Grouped!) (depth 4) ---
        { name: "Colorado Western Slope Ag", category: "ag", state: "CO" },
        { name: "Front Range Municipal (CO)", category: "municipal", state: "CO" },
        { name: "Utah Uinta Basin Ag", category: "ag", state: "UT" },
        { name: "Wasatch Front Municipal (UT)", category: "municipal", state: "UT" },
        { name: "Wyoming Upper Green Ag", category: "ag", state: "WY" },
        { name: "New Mexico San Juan Ag", category: "ag", state: "NM" },
        { name: "California Imperial & Coachella Ag", category: "ag", state: "CA" },
        { name: "Southern California Municipal (MWD)", category: "municipal", state: "CA" },
        { name: "Arizona Mainstem River Ag", category: "ag", state: "AZ" },
        { name: "Central Arizona Municipal (Phoenix/Tucson)", category: "municipal", state: "AZ" },
        { name: "Central Arizona Ag & Tribal (CAP)", category: "ag", state: "AZ" },
        { name: "Las Vegas Valley Municipal (SNWA)", category: "municipal", state: "NV" },
        { name: "Southern Nevada Parks & Irrigation", category: "municipal", state: "NV" },
        { name: "Mexicali Valley Agriculture (Mexico)", category: "ag", state: "MX" },
        { name: "Baja California Municipal (Tijuana/Mexicali)", category: "municipal", state: "MX" },
        { name: "Atmospheric Evaporation (Mead & Powell)", category: "loss", state: "LOSS" },
        { name: "Riparian & Channel Seepage", category: "loss", state: "LOSS" }
      ];

      const links = [
        // --- Tier 1 -> Tier 2 (Inflow Sources to Powell & Mead Pools) ---
        { source: "Upper Colorado Mainstem", target: "Lake Powell Pool (Glen Canyon Dam)", value: 2.50, category: "inflow" },
        { source: "Upper Colorado Mainstem", target: "Lake Mead Pool (Hoover Dam Hub)", value: 4.30, category: "inflow" },
        { source: "Green River Basin", target: "Lake Powell Pool (Glen Canyon Dam)", value: 1.30, category: "inflow" },
        { source: "Green River Basin", target: "Lake Mead Pool (Hoover Dam Hub)", value: 2.60, category: "inflow" },
        { source: "San Juan River Basin", target: "Lake Powell Pool (Glen Canyon Dam)", value: 0.70, category: "inflow" },
        { source: "San Juan River Basin", target: "Lake Mead Pool (Hoover Dam Hub)", value: 1.00, category: "inflow" },
        { source: "Lower Basin Tributaries (Virgin & Little CO)", target: "Lake Mead Pool (Hoover Dam Hub)", value: 0.45, category: "inflow" },
        { source: "Reservoir Storage Drawdown", target: "Lake Mead Pool (Hoover Dam Hub)", value: 2.05, category: "deficit" },

        // --- Tier 2 -> Tier 3 (Storage Hubs to 7 States, Mexico & Losses) ---
        { source: "Lake Powell Pool (Glen Canyon Dam)", target: "Colorado", value: 2.33, category: "inflow" },
        { source: "Lake Powell Pool (Glen Canyon Dam)", target: "Utah", value: 1.04, category: "inflow" },
        { source: "Lake Powell Pool (Glen Canyon Dam)", target: "Wyoming", value: 0.63, category: "inflow" },
        { source: "Lake Powell Pool (Glen Canyon Dam)", target: "New Mexico", value: 0.50, category: "inflow" },

        { source: "Lake Mead Pool (Hoover Dam Hub)", target: "California", value: 4.40, category: "inflow" },
        { source: "Lake Mead Pool (Hoover Dam Hub)", target: "Arizona", value: 2.80, category: "inflow" },
        { source: "Lake Mead Pool (Hoover Dam Hub)", target: "Nevada", value: 0.30, category: "inflow" },
        { source: "Lake Mead Pool (Hoover Dam Hub)", target: "1944 Mexico Treaty", value: 1.50, category: "treaty" },
        { source: "Lake Mead Pool (Hoover Dam Hub)", target: "System Losses & Conveyance", value: 1.40, category: "loss" },

        // --- Tier 3 -> Tier 4 (States to Major Conduits) ---
        { source: "Colorado", target: "Western Slope Gravity Canals", value: 1.85, category: "ag" },
        { source: "Colorado", target: "Trans-Mountain Diversion Tunnels", value: 0.48, category: "municipal" },

        { source: "Utah", target: "Uinta & Green Basin Canals", value: 0.92, category: "ag" },
        { source: "Utah", target: "Central Utah Project (CUP)", value: 0.12, category: "municipal" },

        { source: "Wyoming", target: "Upper Green River Irrigation", value: 0.63, category: "ag" },

        { source: "New Mexico", target: "San Juan Basin Diversions", value: 0.50, category: "ag" },

        { source: "California", target: "All-American Canal (AAC)", value: 3.40, category: "ag" },
        { source: "California", target: "Colorado River Aqueduct (CRA)", value: 1.00, category: "municipal" },

        { source: "Arizona", target: "Lower River Gravity Canals (AZ)", value: 1.45, category: "ag" },
        { source: "Arizona", target: "Central Arizona Project (CAP)", value: 1.35, category: "municipal" },

        { source: "Nevada", target: "Lake Mead SNWA Intakes", value: 0.30, category: "municipal" },

        { source: "1944 Mexico Treaty", target: "Morelos Dam & Central Feeder Canal", value: 1.50, category: "treaty" },

        { source: "System Losses & Conveyance", target: "Reservoir Open-Water Evaporation", value: 0.90, category: "loss" },
        { source: "System Losses & Conveyance", target: "River Transit & Riparian Losses", value: 0.50, category: "loss" },

        // --- Tier 4 -> Tier 5 (Canals to State-Grouped End Uses - Planar, Zero Crossover) ---
        { source: "Western Slope Gravity Canals", target: "Colorado Western Slope Ag", value: 1.85, category: "ag" },
        { source: "Trans-Mountain Diversion Tunnels", target: "Front Range Municipal (CO)", value: 0.48, category: "municipal" },

        { source: "Uinta & Green Basin Canals", target: "Utah Uinta Basin Ag", value: 0.92, category: "ag" },
        { source: "Central Utah Project (CUP)", target: "Wasatch Front Municipal (UT)", value: 0.12, category: "municipal" },

        { source: "Upper Green River Irrigation", target: "Wyoming Upper Green Ag", value: 0.63, category: "ag" },

        { source: "San Juan Basin Diversions", target: "New Mexico San Juan Ag", value: 0.50, category: "ag" },

        { source: "All-American Canal (AAC)", target: "California Imperial & Coachella Ag", value: 3.40, category: "ag" },
        { source: "Colorado River Aqueduct (CRA)", target: "Southern California Municipal (MWD)", value: 1.00, category: "municipal" },

        { source: "Lower River Gravity Canals (AZ)", target: "Arizona Mainstem River Ag", value: 1.45, category: "ag" },
        { source: "Central Arizona Project (CAP)", target: "Central Arizona Municipal (Phoenix/Tucson)", value: 0.90, category: "municipal" },
        { source: "Central Arizona Project (CAP)", target: "Central Arizona Ag & Tribal (CAP)", value: 0.45, category: "ag" },

        { source: "Lake Mead SNWA Intakes", target: "Las Vegas Valley Municipal (SNWA)", value: 0.28, category: "municipal" },
        { source: "Lake Mead SNWA Intakes", target: "Southern Nevada Parks & Irrigation", value: 0.02, category: "municipal" },

        { source: "Morelos Dam & Central Feeder Canal", target: "Mexicali Valley Agriculture (Mexico)", value: 1.25, category: "ag" },
        { source: "Morelos Dam & Central Feeder Canal", target: "Baja California Municipal (Tijuana/Mexicali)", value: 0.25, category: "municipal" },

        { source: "Reservoir Open-Water Evaporation", target: "Atmospheric Evaporation (Mead & Powell)", value: 0.90, category: "loss" },
        { source: "River Transit & Riparian Losses", target: "Riparian & Channel Seepage", value: 0.50, category: "loss" }
      ];

      // Give 160px margin on right for state labels
      const sankey = d3.sankey()
        .nodeId(d => d.name)
        .nodeWidth(18)
        .nodePadding(18)
        .nodeSort(null)
        .extent([[24, 25], [width - 160, height - 25]]);

      const graph = sankey({
        nodes: nodes.map(d => Object.assign({}, d)),
        links: links.map(d => Object.assign({}, d))
      });

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
        .style("font", "12px Inter, -apple-system, sans-serif");

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

      // Smooth, less-wavy engineering transit curves
      function customLinkPath(d) {
        const x0 = d.source.x1;
        const x1 = d.target.x0;
        const y0 = d.y0;
        const y1 = d.y1;
        const dx = (x1 - x0) * 0.35;
        return "M" + x0 + "," + y0 +
               "C" + (x0 + dx) + "," + y0 +
               " " + (x1 - dx) + "," + y1 +
               " " + x1 + "," + y1;
      }

      // Exact boundaries per column between Upper Basin and Lower Basin:
      const d0_nm = graph.nodes.find(n => n.name === "San Juan River Basin");
      const d0_ca = graph.nodes.find(n => n.name === "Lower Basin Tributaries (Virgin & Little CO)");
      const y_d0 = (d0_nm.y1 + d0_ca.y0) / 2;

      const d1_nm = graph.nodes.find(n => n.name === "Lake Powell Pool (Glen Canyon Dam)");
      const d1_ca = graph.nodes.find(n => n.name === "Lake Mead Pool (Hoover Dam Hub)");
      const y_d1 = (d1_nm.y1 + d1_ca.y0) / 2;

      const d2_nm = graph.nodes.find(n => n.name === "New Mexico");
      const d2_ca = graph.nodes.find(n => n.name === "California");
      const y_d2 = (d2_nm.y1 + d2_ca.y0) / 2;

      const d3_nm = graph.nodes.find(n => n.name === "San Juan Basin Diversions");
      const d3_ca = graph.nodes.find(n => n.name === "All-American Canal (AAC)");
      const y_d3 = (d3_nm.y1 + d3_ca.y0) / 2;

      const d4_nm = graph.nodes.find(n => n.name === "New Mexico San Juan Ag");
      const d4_ca = graph.nodes.find(n => n.name === "California Imperial & Coachella Ag");
      const y_d4 = (d4_nm.y1 + d4_ca.y0) / 2;

      const segs = [
        { x0: 16, x1: d1_nm.x0 - 15, y: y_d0 },
        { x0: d1_nm.x0 - 15, x1: d2_nm.x0 - 15, y: y_d1 },
        { x0: d2_nm.x0 - 15, x1: d3_nm.x0 - 15, y: y_d2 },
        { x0: d3_nm.x0 - 15, x1: d4_nm.x0 - 15, y: y_d3 },
        { x0: d4_nm.x0 - 15, x1: width - 16, y: y_d4 }
      ];

      // Upper Basin background
      svg.append("rect")
        .attr("x", 12)
        .attr("y", 12)
        .attr("width", width - 24)
        .attr("height", height - 24)
        .attr("fill", "#fafaf9")
        .attr("rx", 6)
        .attr("stroke", "#e7e5e4");

      // Stepped connecting line
      let linePathD = \`M \${segs[0].x0} \${segs[0].y}\`;
      segs.forEach((s, idx) => {
        linePathD += \` L \${s.x1} \${s.y}\`;
        if (idx < segs.length - 1) {
          linePathD += \` L \${s.x1} \${segs[idx+1].y}\`;
        }
      });

      svg.append("path")
        .attr("d", linePathD)
        .attr("fill", "none")
        .attr("stroke", "#0284c7")
        .attr("stroke-width", 2.5)
        .attr("stroke-dasharray", "8 5");

      // Shaded Upper Basin Polygon
      let upperPolyD = \`M 12 12 L \${width - 24} 12 L \${width - 24} \${y_d4} \`;
      for (let i = segs.length - 1; i >= 0; i--) {
        upperPolyD += \`L \${segs[i].x1} \${segs[i].y} L \${segs[i].x0} \${segs[i].y} \`;
      }
      upperPolyD += "L 12 12 Z";

      svg.append("path")
        .attr("d", upperPolyD)
        .attr("fill", "#f0f9ff")
        .attr("opacity", 0.65);

      // Basin Watermark Badges
      svg.append("text")
        .attr("x", 24)
        .attr("y", 32)
        .attr("font-size", "13px")
        .attr("font-weight", "900")
        .attr("letter-spacing", "0.08em")
        .attr("fill", "#0284c7")
        .text("▲ UPPER BASIN (COLORADO, UTAH, WYOMING, NEW MEXICO) — 4.50 MAF CONSUMPTIVE USE");

      svg.append("text")
        .attr("x", 24)
        .attr("y", y_d0 + 26)
        .attr("font-size", "13px")
        .attr("font-weight", "900")
        .attr("letter-spacing", "0.08em")
        .attr("fill", "#ea580c")
        .text("▼ LOWER BASIN & MEXICO (CALIFORNIA, ARIZONA, NEVADA, MEXICO) — 10.40 MAF CONVEYANCE & LOSSES");

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
        .attr("stroke-opacity", d => d.category === 'deficit' ? 0.75 : 0.48)
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
        .attr("stroke-width", 0.7)
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

      // Node text labels
      const textGroup = node.append("text")
        .attr("x", d => {
          if (d.depth === 4) return d.x0 - 12;
          return d.x1 + 8;
        })
        .attr("y", d => (d.y1 + d.y0) / 2)
        .attr("text-anchor", d => {
          if (d.depth === 4) return "end";
          return "start";
        })
        .style("paint-order", "stroke fill")
        .style("stroke", "#ffffff")
        .style("stroke-width", "4.5px")
        .style("stroke-linejoin", "round");

      // Clean Node Titles in 12px font
      textGroup.append("tspan")
        .attr("x", function() { return d3.select(this.parentNode).attr("x"); })
        .attr("dy", "-0.26em")
        .attr("font-size", d => (d.depth === 2 ? "13.5px" : "12px"))
        .attr("font-weight", d => (d.depth === 2 || d.category === 'deficit') ? "900" : "700")
        .attr("fill", d => d.depth === 2 ? "#0f172a" : "#1e293b")
        .text(d => NODE_META[d.name]?.cleanTitle || d.name);

      // Node Values in 11.5px tabular figures
      textGroup.append("tspan")
        .attr("x", function() { return d3.select(this.parentNode).attr("x"); })
        .attr("dy", "1.35em")
        .attr("font-size", "11.5px")
        .attr("font-family", "'Inter', -apple-system, sans-serif")
        .style("font-variant-numeric", "tabular-nums")
        .attr("font-weight", "800")
        .attr("fill", d => colorMap[d.category] || "#475569")
        .text(d => \`\${d.value.toFixed(2)} MAF/yr\`);

      // State Group Brackets to the right of Column 5 bar
      const stateGroups = [
        { state: "COLORADO", vol: "2.33 MAF", nodes: ["Colorado Western Slope Ag", "Front Range Municipal (CO)"], color: "#0284c7" },
        { state: "UTAH", vol: "1.04 MAF", nodes: ["Utah Uinta Basin Ag", "Wasatch Front Municipal (UT)"], color: "#0284c7" },
        { state: "WYOMING", vol: "0.63 MAF", nodes: ["Wyoming Upper Green Ag"], color: "#0284c7" },
        { state: "NEW MEXICO", vol: "0.50 MAF", nodes: ["New Mexico San Juan Ag"], color: "#0284c7" },
        { state: "CALIFORNIA", vol: "4.40 MAF", nodes: ["California Imperial & Coachella Ag", "Southern California Municipal (MWD)"], color: "#ea580c" },
        { state: "ARIZONA", vol: "2.80 MAF", nodes: ["Arizona Mainstem River Ag", "Central Arizona Municipal (Phoenix/Tucson)", "Central Arizona Ag & Tribal (CAP)"], color: "#ea580c" },
        { state: "NEVADA", vol: "0.30 MAF", nodes: ["Las Vegas Valley Municipal (SNWA)", "Southern Nevada Parks & Irrigation"], color: "#ea580c" },
        { state: "1944 TREATY", vol: "1.50 MAF", nodes: ["Mexicali Valley Agriculture (Mexico)", "Baja California Municipal (Tijuana/Mexicali)"], color: "#4338ca" },
        { state: "SYSTEM LOSSES", vol: "1.40 MAF", nodes: ["Atmospheric Evaporation (Mead & Powell)", "Riparian & Channel Seepage"], color: "#64748b" }
      ];

      stateGroups.forEach(sg => {
        const matching = graph.nodes.filter(n => sg.nodes.includes(n.name));
        if (!matching.length) return;
        const minY = d3.min(matching, n => n.y0);
        const maxY = d3.max(matching, n => n.y1);
        const barX = matching[0].x1;

        // Draw bracket on the right margin of the bar (x1 + 4)
        svg.append("path")
          .attr("d", \`M \${barX + 4} \${minY + 2} L \${barX + 10} \${minY + 2} L \${barX + 10} \${maxY - 2} L \${barX + 4} \${maxY - 2}\`)
          .attr("fill", "none")
          .attr("stroke", sg.color)
          .attr("stroke-width", 2.5);

        // State Group Tag Label to the right of the bracket!
        svg.append("text")
          .attr("x", barX + 16)
          .attr("y", (minY + maxY) / 2)
          .attr("text-anchor", "start")
          .attr("alignment-baseline", "middle")
          .attr("font-size", "11.5px")
          .attr("font-weight", "900")
          .attr("letter-spacing", "0.06em")
          .attr("fill", sg.color)
          .style("paint-order", "stroke fill")
          .style("stroke", "#ffffff")
          .style("stroke-width", "3.5px")
          .text(\`\${sg.state} (\${sg.vol})\`);
      });
    }

    `;

html = html.substring(0, startIndex) + newRenderSankey + html.substring(endIndex);
fs.writeFileSync("web/sankey.html", html);
console.log("Successfully applied clarity overhaul in web/sankey.html!");
