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
    "--remote-debugging-port=9255",
    "--headless=new",
    "--no-sandbox",
    "--window-size=1680,1250",
    "http://localhost:8088/sankey.html"
  ]);

  await sleep(1500);
  const list = await fetchJson("http://localhost:9255/json/list");
  const cdp = new CDPClient(list[0].webSocketDebuggerUrl);
  await cdp.connect();
  await cdp.send("Page.enable");
  await cdp.send("Runtime.enable");
  await sleep(2000);

  // Evaluate and inject our new test layout directly into sankey-container to see how it renders!
  const evalRes = await cdp.send("Runtime.evaluate", {
    expression: `(() => {
      const container = document.getElementById('sankey-container');
      container.innerHTML = '';
      const width = Math.max(1600, container.clientWidth || 1650);
      const height = 980;

      const nodes = [
        // Col 0: Inflows & Storage Drawdown
        { name: "Upper Colorado Mainstem", category: "inflow" },
        { name: "Green River Basin", category: "inflow" },
        { name: "San Juan River Basin", category: "inflow" },
        { name: "Lower Basin Tributaries (Virgin & Little CO)", category: "inflow" },
        { name: "Reservoir Storage Drawdown", category: "deficit" },

        // Col 1: Upper Basin Inflow & Lake Powell
        { name: "Upper Basin Consumptive Uses", category: "inflow" },
        { name: "Lake Powell Pool (Glen Canyon Dam)", category: "inflow" },

        // Col 2: Upper States & Lake Mead Hub
        { name: "Colorado", category: "inflow" },
        { name: "Utah", category: "inflow" },
        { name: "Wyoming", category: "inflow" },
        { name: "New Mexico", category: "inflow" },
        { name: "Lake Mead Pool (Hoover Dam Hub)", category: "inflow" },

        // Col 3: Upper Conduits & Lower Allocations
        { name: "Western Slope Gravity Canals", category: "ag" },
        { name: "Trans-Mountain Diversion Tunnels", category: "municipal" },
        { name: "Uinta & Green Basin Canals", category: "ag" },
        { name: "Central Utah Project (CUP)", category: "municipal" },
        { name: "Upper Green River Irrigation", category: "ag" },
        { name: "San Juan Basin Diversions", category: "ag" },
        { name: "California", category: "inflow" },
        { name: "Arizona", category: "inflow" },
        { name: "Nevada", category: "inflow" },
        { name: "1944 Mexico Treaty", category: "treaty" },
        { name: "System Losses & Conveyance", category: "loss" },

        // Col 4: Upper End Uses & Lower Conduits
        { name: "Western Slope Agriculture", category: "ag" },
        { name: "Front Range Municipalities", category: "municipal" },
        { name: "Wasatch Front Municipalities", category: "municipal" },
        { name: "All-American Canal (AAC)", category: "ag" },
        { name: "Colorado River Aqueduct (CRA)", category: "municipal" },
        { name: "Lower River Gravity Canals (AZ)", category: "ag" },
        { name: "Central Arizona Project (CAP)", category: "municipal" },
        { name: "Lake Mead SNWA Intakes", category: "municipal" },
        { name: "Morelos Dam & Central Feeder Canal", category: "treaty" },
        { name: "Reservoir Open-Water Evaporation", category: "loss" },
        { name: "River Transit & Riparian Losses", category: "loss" },

        // Col 5: Lower End Uses
        { name: "California Agriculture (Imperial & Coachella)", category: "ag" },
        { name: "Southern California Municipal (MWD)", category: "municipal" },
        { name: "Arizona Mainstem Agriculture (Yuma & Palo Verde)", category: "ag" },
        { name: "Central Arizona Municipal (Phoenix & Tucson)", category: "municipal" },
        { name: "Central Arizona Agriculture & Tribal", category: "ag" },
        { name: "Las Vegas Valley Municipal (SNWA)", category: "municipal" },
        { name: "Southern Nevada Irrigation & Parks", category: "municipal" },
        { name: "Mexicali Valley Agriculture", category: "ag" },
        { name: "Baja Municipal (Tijuana & Mexicali)", category: "municipal" },
        { name: "Atmospheric Evaporation (Mead & Powell)", category: "loss" },
        { name: "Riparian & Channel Seepage", category: "loss" }
      ];

      const links = [
        // Col 0 -> Col 1
        { source: "Upper Colorado Mainstem", target: "Upper Basin Consumptive Uses", value: 2.50, category: "inflow" },
        { source: "Upper Colorado Mainstem", target: "Lake Powell Pool (Glen Canyon Dam)", value: 4.30, category: "inflow" },
        { source: "Green River Basin", target: "Upper Basin Consumptive Uses", value: 1.30, category: "inflow" },
        { source: "Green River Basin", target: "Lake Powell Pool (Glen Canyon Dam)", value: 2.60, category: "inflow" },
        { source: "San Juan River Basin", target: "Upper Basin Consumptive Uses", value: 0.70, category: "inflow" },
        { source: "San Juan River Basin", target: "Lake Powell Pool (Glen Canyon Dam)", value: 1.00, category: "inflow" },
        { source: "Lower Basin Tributaries (Virgin & Little CO)", target: "Lake Mead Pool (Hoover Dam Hub)", value: 0.45, category: "inflow" },
        { source: "Reservoir Storage Drawdown", target: "Lake Mead Pool (Hoover Dam Hub)", value: 2.05, category: "deficit" },

        // Col 1 -> Col 2
        { source: "Upper Basin Consumptive Uses", target: "Colorado", value: 2.33, category: "inflow" },
        { source: "Upper Basin Consumptive Uses", target: "Utah", value: 1.04, category: "inflow" },
        { source: "Upper Basin Consumptive Uses", target: "Wyoming", value: 0.63, category: "inflow" },
        { source: "Upper Basin Consumptive Uses", target: "New Mexico", value: 0.50, category: "inflow" },
        { source: "Lake Powell Pool (Glen Canyon Dam)", target: "Lake Mead Pool (Hoover Dam Hub)", value: 7.90, category: "inflow" },

        // Col 2 -> Col 3
        { source: "Colorado", target: "Western Slope Gravity Canals", value: 1.85, category: "ag" },
        { source: "Colorado", target: "Trans-Mountain Diversion Tunnels", value: 0.48, category: "municipal" },
        { source: "Utah", target: "Uinta & Green Basin Canals", value: 0.92, category: "ag" },
        { source: "Utah", target: "Central Utah Project (CUP)", value: 0.12, category: "municipal" },
        { source: "Wyoming", target: "Upper Green River Irrigation", value: 0.63, category: "ag" },
        { source: "New Mexico", target: "San Juan Basin Diversions", value: 0.50, category: "ag" },

        { source: "Lake Mead Pool (Hoover Dam Hub)", target: "California", value: 4.40, category: "inflow" },
        { source: "Lake Mead Pool (Hoover Dam Hub)", target: "Arizona", value: 2.80, category: "inflow" },
        { source: "Lake Mead Pool (Hoover Dam Hub)", target: "Nevada", value: 0.30, category: "inflow" },
        { source: "Lake Mead Pool (Hoover Dam Hub)", target: "1944 Mexico Treaty", value: 1.50, category: "treaty" },
        { source: "Lake Mead Pool (Hoover Dam Hub)", target: "System Losses & Conveyance", value: 1.40, category: "loss" },

        // Col 3 -> Col 4
        { source: "Western Slope Gravity Canals", target: "Western Slope Agriculture", value: 1.85, category: "ag" },
        { source: "Trans-Mountain Diversion Tunnels", target: "Front Range Municipalities", value: 0.48, category: "municipal" },
        { source: "Uinta & Green Basin Canals", target: "Western Slope Agriculture", value: 0.92, category: "ag" },
        { source: "Central Utah Project (CUP)", target: "Wasatch Front Municipalities", value: 0.12, category: "municipal" },
        { source: "Upper Green River Irrigation", target: "Western Slope Agriculture", value: 0.63, category: "ag" },
        { source: "San Juan Basin Diversions", target: "Western Slope Agriculture", value: 0.50, category: "ag" },

        { source: "California", target: "All-American Canal (AAC)", value: 3.40, category: "ag" },
        { source: "California", target: "Colorado River Aqueduct (CRA)", value: 1.00, category: "municipal" },
        { source: "Arizona", target: "Lower River Gravity Canals (AZ)", value: 1.45, category: "ag" },
        { source: "Arizona", target: "Central Arizona Project (CAP)", value: 1.35, category: "municipal" },
        { source: "Nevada", target: "Lake Mead SNWA Intakes", value: 0.30, category: "municipal" },
        { source: "1944 Mexico Treaty", target: "Morelos Dam & Central Feeder Canal", value: 1.50, category: "treaty" },
        { source: "System Losses & Conveyance", target: "Reservoir Open-Water Evaporation", value: 0.90, category: "loss" },
        { source: "System Losses & Conveyance", target: "River Transit & Riparian Losses", value: 0.50, category: "loss" },

        // Col 4 -> Col 5
        { source: "All-American Canal (AAC)", target: "California Agriculture (Imperial & Coachella)", value: 3.40, category: "ag" },
        { source: "Colorado River Aqueduct (CRA)", target: "Southern California Municipal (MWD)", value: 1.00, category: "municipal" },
        { source: "Lower River Gravity Canals (AZ)", target: "Arizona Mainstem Agriculture (Yuma & Palo Verde)", value: 1.45, category: "ag" },
        { source: "Central Arizona Project (CAP)", target: "Central Arizona Municipal (Phoenix & Tucson)", value: 0.90, category: "municipal" },
        { source: "Central Arizona Project (CAP)", target: "Central Arizona Agriculture & Tribal", value: 0.45, category: "ag" },
        { source: "Lake Mead SNWA Intakes", target: "Las Vegas Valley Municipal (SNWA)", value: 0.28, category: "municipal" },
        { source: "Lake Mead SNWA Intakes", target: "Southern Nevada Irrigation & Parks", value: 0.02, category: "municipal" },
        { source: "Morelos Dam & Central Feeder Canal", target: "Mexicali Valley Agriculture", value: 1.25, category: "ag" },
        { source: "Morelos Dam & Central Feeder Canal", target: "Baja Municipal (Tijuana & Mexicali)", value: 0.25, category: "municipal" },
        { source: "Reservoir Open-Water Evaporation", target: "Atmospheric Evaporation (Mead & Powell)", value: 0.90, category: "loss" },
        { source: "River Transit & Riparian Losses", target: "Riparian & Channel Seepage", value: 0.50, category: "loss" }
      ];

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
        const dx = (x1 - x0) * 0.38;
        return "M" + x0 + "," + y0 +
               "C" + (x0 + dx) + "," + y0 +
               " " + (x1 - dx) + "," + y1 +
               " " + x1 + "," + y1;
      }

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

      const textGroup = node.append("text")
        .attr("x", d => {
          if (d.depth === 0) return d.x1 + 8;
          if (d.depth === 5) return d.x0 - 8;
          return d.x0 < width / 2 ? d.x1 + 8 : d.x0 - 8;
        })
        .attr("y", d => (d.y1 + d.y0) / 2)
        .attr("text-anchor", d => {
          if (d.depth === 0) return "start";
          if (d.depth === 5) return "end";
          return d.x0 < width / 2 ? "start" : "end";
        })
        .style("paint-order", "stroke fill")
        .style("stroke", "#ffffff")
        .style("stroke-width", "3.5px")
        .style("stroke-linejoin", "round");

      textGroup.append("tspan")
        .attr("x", function() { return d3.select(this.parentNode).attr("x"); })
        .attr("dy", "-0.22em")
        .attr("font-size", d => (d.depth === 0 || d.depth === 5) ? "10.5px" : "10px")
        .attr("font-weight", d => d.category === 'deficit' ? "800" : "600")
        .attr("fill", "#0f172a")
        .text(d => NODE_META[d.name]?.cleanTitle || d.name);

      textGroup.append("tspan")
        .attr("x", function() { return d3.select(this.parentNode).attr("x"); })
        .attr("dy", "1.30em")
        .attr("font-size", "10px")
        .attr("font-family", "'Inter', -apple-system, sans-serif")
        .style("font-variant-numeric", "tabular-nums")
        .attr("font-weight", "600")
        .attr("fill", d => colorMap[d.category] || "#475569")
        .text(d => d.value.toFixed(2) + " MAF/yr");

      return { nodeCount: graph.nodes.length, linkCount: graph.links.length };
    })()`,
    returnByValue: true
  });

  console.log("Injection eval result:", JSON.stringify(evalRes.result.value));
  await sleep(1000);

  const shot = await cdp.send("Page.captureScreenshot", { format: "png" });
  const shotPath = "/Users/macstudio/.gemini/antigravity/brain/aad5e810-76c0-4f7e-a9c4-9eb2855ee883/sankey_editorial_6col_test.png";
  fs.writeFileSync(shotPath, Buffer.from(shot.data, "base64"));
  console.log("Saved preview to:", shotPath);

  cdp.close();
  chrome.kill();
}
run();
