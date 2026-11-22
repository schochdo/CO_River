const { spawn } = require("child_process");
const http = require("http");
const fs = require("fs");

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
async function fetchJson(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = "";
      res.on("data", chunk => data += chunk);
      res.on("end", () => resolve(JSON.parse(data)));
    }).on("error", reject);
  });
}

class CDPClient {
  constructor(wsUrl) {
    this.wsUrl = wsUrl;
    this.ws = null;
    this.id = 1;
    this.callbacks = new Map();
  }
  async connect() {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.wsUrl);
      this.ws.onopen = () => resolve();
      this.ws.onerror = (err) => reject(err);
      this.ws.onmessage = (msg) => {
        const res = JSON.parse(msg.data);
        if (res.id && this.callbacks.has(res.id)) {
          const cb = this.callbacks.get(res.id);
          this.callbacks.delete(res.id);
          if (res.error) cb.reject(res.error);
          else cb.resolve(res.result);
        }
      };
    });
  }
  async send(method, params = {}) {
    const id = this.id++;
    return new Promise((resolve, reject) => {
      this.callbacks.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }
  close() { if (this.ws) this.ws.close(); }
}

async function run() {
  const chrome = spawn("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", [
    "--remote-debugging-port=9315",
    "--headless=new",
    "--no-sandbox",
    "--window-size=1800,1400",
    "http://localhost:8088/sankey.html"
  ]);

  await sleep(1500);
  const list = await fetchJson("http://localhost:9315/json/list");
  const cdp = new CDPClient(list[0].webSocketDebuggerUrl);
  await cdp.connect();
  await cdp.send("Page.enable");
  await cdp.send("Runtime.enable");
  await sleep(2000);

  const evalRes = await cdp.send("Runtime.evaluate", {
    expression: `(() => {
      const container = document.getElementById('sankey-container');
      container.innerHTML = '';
      const width = Math.max(1680, container.clientWidth || 1720);
      const height = 980;

      // Update Column Headers
      const headerRow = document.querySelector('.grid.grid-cols-5');
      if (headerRow) {
        headerRow.innerHTML = \`
          <div class="text-left pl-2">1. Inflow Sources &amp; Overdraft</div>
          <div>2. Powell &amp; Mead Storage Pools</div>
          <div>3. State &amp; Sovereign Allocations</div>
          <div>4. Major Conveyance Conduits</div>
          <div class="text-right pr-2">5. End Uses (Ag vs Municipal by State)</div>
        \`;
      }

      const nodes = [
        // --- Tier 1: Inflow Sources & Storage Overdraft (depth 0) ---
        { name: "Upper Colorado Mainstem", category: "inflow" },
        { name: "Green River Basin", category: "inflow" },
        { name: "San Juan River Basin", category: "inflow" },
        { name: "Lower Basin Tributaries (Virgin & Little CO)", category: "inflow" },
        { name: "Reservoir Storage Drawdown", category: "deficit" },

        // --- Tier 2: Storage Hubs (Powell & Mead) (depth 1) ---
        { name: "Lake Powell Pool (Glen Canyon Dam)", category: "inflow", basin: "upper" },
        { name: "Lake Mead Pool (Hoover Dam Hub)", category: "inflow", basin: "lower" },

        // --- Tier 3: 7 States, Mexico & Losses (depth 2) ---
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

        // --- Tier 5: Consumptive End Uses (Strictly State-Grouped!) (depth 4) ---
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

      // Clean, non-crossing links:
      const links = [
        // Col 0 -> Col 1 (Inflows to Powell & Mead)
        { source: "Upper Colorado Mainstem", target: "Lake Powell Pool (Glen Canyon Dam)", value: 2.50, category: "inflow" },
        { source: "Upper Colorado Mainstem", target: "Lake Mead Pool (Hoover Dam Hub)", value: 4.30, category: "inflow" },
        { source: "Green River Basin", target: "Lake Powell Pool (Glen Canyon Dam)", value: 1.30, category: "inflow" },
        { source: "Green River Basin", target: "Lake Mead Pool (Hoover Dam Hub)", value: 2.60, category: "inflow" },
        { source: "San Juan River Basin", target: "Lake Powell Pool (Glen Canyon Dam)", value: 0.70, category: "inflow" },
        { source: "San Juan River Basin", target: "Lake Mead Pool (Hoover Dam Hub)", value: 1.00, category: "inflow" },
        { source: "Lower Basin Tributaries (Virgin & Little CO)", target: "Lake Mead Pool (Hoover Dam Hub)", value: 0.45, category: "inflow" },
        { source: "Reservoir Storage Drawdown", target: "Lake Mead Pool (Hoover Dam Hub)", value: 2.05, category: "deficit" },

        // Col 1 -> Col 2 (Storage Hubs to States)
        { source: "Lake Powell Pool (Glen Canyon Dam)", target: "Colorado", value: 2.33, category: "inflow" },
        { source: "Lake Powell Pool (Glen Canyon Dam)", target: "Utah", value: 1.04, category: "inflow" },
        { source: "Lake Powell Pool (Glen Canyon Dam)", target: "Wyoming", value: 0.63, category: "inflow" },
        { source: "Lake Powell Pool (Glen Canyon Dam)", target: "New Mexico", value: 0.50, category: "inflow" },

        { source: "Lake Mead Pool (Hoover Dam Hub)", target: "California", value: 4.40, category: "inflow" },
        { source: "Lake Mead Pool (Hoover Dam Hub)", target: "Arizona", value: 2.80, category: "inflow" },
        { source: "Lake Mead Pool (Hoover Dam Hub)", target: "Nevada", value: 0.30, category: "inflow" },
        { source: "Lake Mead Pool (Hoover Dam Hub)", target: "1944 Mexico Treaty", value: 1.50, category: "treaty" },
        { source: "Lake Mead Pool (Hoover Dam Hub)", target: "System Losses & Conveyance", value: 1.40, category: "loss" },

        // Col 2 -> Col 3 (States to Canals)
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

        // Col 3 -> Col 4 (Canals to State-Grouped End Uses)
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

      // Fix system losses node name in Col 2
      // resolved

      const sankey = d3.sankey()
        .nodeId(d => d.name)
        .nodeWidth(16)
        .nodePadding(18)
        .nodeSort(null)
        .extent([[24, 25], [width - 24, height - 25]]);

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
        .style("font", "11px Inter, sans-serif");

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

      // 1. Swimlane Shading / Upper vs Lower Separation
      const nmNode = graph.nodes.find(n => n.name === "New Mexico");
      const caNode = graph.nodes.find(n => n.name === "California");
      const splitY = nmNode && caNode ? (nmNode.y1 + caNode.y0) / 2 : 305;

      // Upper Basin Swimlane background
      svg.append("rect")
        .attr("x", 12)
        .attr("y", 12)
        .attr("width", width - 24)
        .attr("height", splitY - 12)
        .attr("fill", "#f8fafc")
        .attr("rx", 6)
        .attr("stroke", "#e2e8f0")
        .attr("stroke-width", 1);

      // Upper Basin Header Watermark
      svg.append("text")
        .attr("x", 24)
        .attr("y", 30)
        .attr("font-size", "11px")
        .attr("font-weight", "800")
        .attr("letter-spacing", "0.08em")
        .attr("fill", "#0284c7")
        .text("▲ UPPER BASIN (COLORADO, UTAH, WYOMING, NEW MEXICO) — 4.50 MAF CONSUMPTIVE USE");

      // Lower Basin Swimlane background
      svg.append("rect")
        .attr("x", 12)
        .attr("y", splitY + 4)
        .attr("width", width - 24)
        .attr("height", height - splitY - 16)
        .attr("fill", "#fafaf9")
        .attr("rx", 6)
        .attr("stroke", "#e7e5e4")
        .attr("stroke-width", 1);

      // Lower Basin Header Watermark
      svg.append("text")
        .attr("x", 24)
        .attr("y", splitY + 20)
        .attr("font-size", "11px")
        .attr("font-weight", "800")
        .attr("letter-spacing", "0.08em")
        .attr("fill", "#ea580c")
        .text("▼ LOWER BASIN & MEXICO (CALIFORNIA, ARIZONA, NEVADA, MEXICO) — 10.40 MAF CONVEYANCE & LOSSES");

      // Boundary Line
      svg.append("line")
        .attr("x1", 16)
        .attr("x2", width - 16)
        .attr("y1", splitY)
        .attr("y2", splitY)
        .attr("stroke", "#94a3b8")
        .attr("stroke-width", 1.5)
        .attr("stroke-dasharray", "6 4");

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
        .attr("class", "link");

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
        .attr("fill-opacity", 0.95);

      // Clean, un-colliding text placement:
      // Depth 0: start at x1 + 8
      // Depth 1: start at x1 + 8
      // Depth 2 (States): start at x1 + 8 (Bold State Name & Apportionment!)
      // Depth 3 (Canals): start at x1 + 8
      // Depth 4 (End Uses): end at x0 - 8
      const textGroup = node.append("text")
        .attr("x", d => {
          if (d.depth === 4) return d.x0 - 8;
          return d.x1 + 8;
        })
        .attr("y", d => (d.y1 + d.y0) / 2)
        .attr("text-anchor", d => {
          if (d.depth === 4) return "end";
          return "start";
        })
        .style("paint-order", "stroke fill")
        .style("stroke", "#ffffff")
        .style("stroke-width", "3.5px")
        .style("stroke-linejoin", "round");

      textGroup.append("tspan")
        .attr("x", function() { return d3.select(this.parentNode).attr("x"); })
        .attr("dy", "-0.22em")
        .attr("font-size", d => (d.depth === 2 ? "11px" : (d.depth === 0 || d.depth === 4 ? "10.5px" : "10px")))
        .attr("font-weight", d => (d.depth === 2 || d.category === 'deficit') ? "800" : "600")
        .attr("fill", d => d.depth === 2 ? "#0f172a" : "#1e293b")
        .text(d => NODE_META[d.name]?.cleanTitle || d.name);

      textGroup.append("tspan")
        .attr("x", function() { return d3.select(this.parentNode).attr("x"); })
        .attr("dy", "1.30em")
        .attr("font-size", "10px")
        .attr("font-family", "'Inter', -apple-system, sans-serif")
        .style("font-variant-numeric", "tabular-nums")
        .attr("font-weight", "700")
        .attr("fill", d => colorMap[d.category] || "#475569")
        .text(d => d.value.toFixed(2) + " MAF/yr");

      // Right-Margin State Grouping Brackets & Summary Tags
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
        const rightX = width - 12;

        // Draw bracket on the right margin
        svg.append("path")
          .attr("d", \`M \${rightX - 6} \${minY + 2} L \${rightX} \${minY + 2} L \${rightX} \${maxY - 2} L \${rightX - 6} \${maxY - 2}\`)
          .attr("fill", "none")
          .attr("stroke", sg.color)
          .attr("stroke-width", 2);

        // State Group Tag Label
        svg.append("text")
          .attr("x", rightX - 10)
          .attr("y", (minY + maxY) / 2)
          .attr("text-anchor", "end")
          .attr("alignment-baseline", "middle")
          .attr("font-size", "10px")
          .attr("font-weight", "800")
          .attr("letter-spacing", "0.05em")
          .attr("fill", sg.color)
          .style("paint-order", "stroke fill")
          .style("stroke", "#ffffff")
          .style("stroke-width", "3.5px")
          .text(\`\${sg.state} (\${sg.vol})\`);
      });

      return { success: true };
    })()`,
    returnByValue: true
  });

  console.log("Evaluation completed:", JSON.stringify(evalRes));
  await sleep(1200);

  const shot = await cdp.send("Page.captureScreenshot", { format: "png" });
  fs.writeFileSync("/Users/macstudio/.gemini/antigravity/brain/aad5e810-76c0-4f7e-a9c4-9eb2855ee883/sankey_final_polished_preview.png", Buffer.from(shot.data, "base64"));
  console.log("Saved sankey_final_polished_preview.png");

  cdp.close();
  chrome.kill();
}
run();
