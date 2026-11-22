const fs = require('fs');

let html = fs.readFileSync('web/sankey.html', 'utf8');

// Replace renderSankey in web/sankey.html
const startMarker = 'function renderSankey() {';
const endMarker = 'function updateTooltip(e) {';

const startIndex = html.indexOf(startMarker);
const endIndex = html.indexOf(endMarker);

if (startIndex === -1 || endIndex === -1) {
  console.error("Could not find markers for renderSankey");
  process.exit(1);
}

const newRenderSankey = `function renderSankey() {
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

        // --- Column 1: Storage Pools & Allocations ---
        { name: "Upper Basin In-Basin Allocations", category: "inflow", basin: "upper", desc: "Upstream depletions across CO, UT, WY, NM" },
        { name: "Lake Powell Pool (Glen Canyon Dam)", category: "inflow", basin: "upper", desc: "Regulatory storage buffer releasing past Lees Ferry" },
        { name: "Lower Basin Inflows & Storage Drawdown", category: "deficit", basin: "lower", desc: "Lower Tributaries (0.45) + Storage Drawdown (2.05)" },

        // --- Column 2: Regional Conveyance & Mainstem Hubs ---
        { name: "Western Slope Gravity Canals", category: "ag", basin: "upper", desc: "In-basin agricultural irrigation across 4 Upper states" },
        { name: "Front Range Tunnels (CO)", category: "municipal", basin: "upper", desc: "Adams, Moffat, Roberts, Boustead tunnels across Continental Divide" },
        { name: "Wasatch Front Tunnels (UT / CUP)", category: "municipal", basin: "upper", desc: "Strawberry Valley & Central Utah Project trans-basin diversions" },
        { name: "Lake Mead Pool (Hoover Dam Hub)", category: "inflow", basin: "lower", desc: "Primary distribution hub for Lower Basin & Mexico" },

        // --- Column 3: State-Grouped Consumptive Uses & Losses ---
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
            "- Imperial & Coachella: 3.40",
            "- SoCal MWD / CRA: 1.00"
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
            "- Baja Cities: 0.25"
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
        // Col 0 -> Col 1
        { source: "Upper Colorado Mainstem", target: "Upper Basin In-Basin Allocations", value: 2.50, category: "inflow" },
        { source: "Upper Colorado Mainstem", target: "Lake Powell Pool (Glen Canyon Dam)", value: 4.30, category: "inflow" },

        { source: "Green River Basin", target: "Upper Basin In-Basin Allocations", value: 1.30, category: "inflow" },
        { source: "Green River Basin", target: "Lake Powell Pool (Glen Canyon Dam)", value: 2.60, category: "inflow" },

        { source: "San Juan River Basin", target: "Upper Basin In-Basin Allocations", value: 0.70, category: "inflow" },
        { source: "San Juan River Basin", target: "Lake Powell Pool (Glen Canyon Dam)", value: 1.00, category: "inflow" },

        { source: "Lower Basin Tributaries (Virgin & Little CO)", target: "Lower Basin Inflows & Storage Drawdown", value: 0.45, category: "inflow" },
        { source: "Reservoir Storage Overdraft", target: "Lower Basin Inflows & Storage Drawdown", value: 2.05, category: "deficit" },

        // Col 1 -> Col 2
        { source: "Upper Basin In-Basin Allocations", target: "Western Slope Gravity Canals", value: 3.90, category: "ag" },
        { source: "Upper Basin In-Basin Allocations", target: "Front Range Tunnels (CO)", value: 0.48, category: "municipal" },
        { source: "Upper Basin In-Basin Allocations", target: "Wasatch Front Tunnels (UT / CUP)", value: 0.12, category: "municipal" },

        { source: "Lake Powell Pool (Glen Canyon Dam)", target: "Lake Mead Pool (Hoover Dam Hub)", value: 7.90, category: "inflow" },
        { source: "Lower Basin Inflows & Storage Drawdown", target: "Lake Mead Pool (Hoover Dam Hub)", value: 2.50, category: "deficit" },

        // Col 2 -> Col 3
        { source: "Western Slope Gravity Canals", target: "Colorado", value: 1.85, category: "ag" },
        { source: "Western Slope Gravity Canals", target: "Utah", value: 0.92, category: "ag" },
        { source: "Western Slope Gravity Canals", target: "Wyoming", value: 0.63, category: "ag" },
        { source: "Western Slope Gravity Canals", target: "New Mexico", value: 0.50, category: "ag" },

        { source: "Front Range Tunnels (CO)", target: "Colorado", value: 0.48, category: "municipal" },
        { source: "Wasatch Front Tunnels (UT / CUP)", target: "Utah", value: 0.12, category: "municipal" },

        { source: "Lake Mead Pool (Hoover Dam Hub)", target: "California", value: 4.40, category: "inflow" },
        { source: "Lake Mead Pool (Hoover Dam Hub)", target: "Arizona", value: 2.80, category: "inflow" },
        { source: "Lake Mead Pool (Hoover Dam Hub)", target: "Nevada", value: 0.30, category: "municipal" },
        { source: "Lake Mead Pool (Hoover Dam Hub)", target: "1944 Mexico Treaty", value: 1.50, category: "treaty" },
        { source: "Lake Mead Pool (Hoover Dam Hub)", target: "System Losses & Evaporation", value: 1.40, category: "loss" }
      ];

      // Reserve 300px on the right for state breakdowns
      const sankey = d3.sankey()
        .nodeId(d => d.name)
        .nodeWidth(18)
        .nodePadding(20)
        .nodeSort(null)
        .extent([[24, 25], [width - 300, height - 25]]);

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
    }

    `;

html = html.substring(0, startIndex) + newRenderSankey + html.substring(endIndex);

fs.writeFileSync('web/sankey.html', html);
console.log('Successfully updated sankey.html with narrow stacked labels!');
