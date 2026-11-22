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
    "--remote-debugging-port=9389",
    "--headless=new",
    "--no-sandbox",
    "--window-size=1440,900",
    "http://localhost:8088/sankey.html"
  ]);

  await sleep(1500);
  const list = await fetchJson("http://localhost:9389/json/list");
  const cdp = new CDPClient(list[0].webSocketDebuggerUrl);
  await cdp.connect();

  await cdp.send("Page.enable");
  await sleep(1000);

  const testScript = `(() => {
    // Re-render with Col 3 bars at width - 280, and text placed to the RIGHT of the bar (x1 + 10)
    // with width = Math.max(1260, container.clientWidth || 1350);
    // Extent: [[24, 25], [width - 260, height - 25]]
    // In that case:
    // Col 0: x = 24, text to the right (x1 + 10)
    // Col 1: x ≈ 380, text to the right (x1 + 10)
    // Col 2: x ≈ 740, text to the right (x1 + 10)
    // Col 3: x ≈ 1100, text to the right (x1 + 10)!
    // Then Col 3 text has 260px of dedicated margin from 1118 to 1378!
    // Col 2 text ends at ~950, while Col 3 bar is at 1100 (150px clearance)!
    // Col 1 text ends at ~600, while Col 2 bar is at 740 (140px clearance)!
    // Col 0 text ends at ~250, while Col 1 bar is at 380 (130px clearance)!
    // ZERO OVERLAPS ACROSS ALL COLUMNS!
    const container = document.getElementById('sankey-container');
    container.innerHTML = '';

    const width = Math.max(1260, container.clientWidth || 1350);
    const height = 780;

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
      { name: "Trans-Mountain Diversion Tunnels", category: "municipal", basin: "upper", desc: "Continental Divide exports to Front Range & Wasatch" },
      { name: "Lake Mead Pool (Hoover Dam Hub)", category: "inflow", basin: "lower", desc: "Primary distribution hub for Lower Basin & Mexico" },

      // --- Column 3: State-Grouped Consumptive Uses & Losses ---
      // Upper Basin States (4.50 MAF)
      { name: "Colorado", category: "ag", basin: "upper", sub: "Western Slope Ag 1.85 • Front Range 0.48", vol: 2.33 },
      { name: "Utah", category: "ag", basin: "upper", sub: "Uinta Basin Ag 0.92 • Wasatch Front 0.12", vol: 1.04 },
      { name: "Wyoming", category: "ag", basin: "upper", sub: "Upper Green River Ag 0.63", vol: 0.63 },
      { name: "New Mexico", category: "ag", basin: "upper", sub: "San Juan Basin & Navajo Ag 0.50", vol: 0.50 },

      // Lower Basin States & Sovereigns (10.40 MAF)
      { name: "California", category: "ag", basin: "lower", sub: "Imperial / AAC 3.40 • SoCal MWD CRA 1.00", vol: 4.40 },
      { name: "Arizona", category: "ag", basin: "lower", sub: "Central AZ CAP 1.38 • Mainstem River Ag 1.42", vol: 2.80 },
      { name: "Nevada", category: "municipal", basin: "lower", sub: "Las Vegas Valley / SNWA Intakes 0.30", vol: 0.30 },
      { name: "1944 Mexico Treaty Delivery", category: "treaty", basin: "lower", sub: "Mexicali Valley Ag 1.25 • Baja Cities 0.25", vol: 1.50 },
      { name: "System Evaporation & Losses", category: "loss", basin: "lower", sub: "Mead/Powell Evap 0.90 • Transit Seepage 0.50", vol: 1.40 }
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
      { source: "Upper Basin In-Basin Allocations", target: "Trans-Mountain Diversion Tunnels", value: 0.60, category: "municipal" },

      { source: "Lake Powell Pool (Glen Canyon Dam)", target: "Lake Mead Pool (Hoover Dam Hub)", value: 7.90, category: "inflow" },
      { source: "Lower Basin Inflows & Storage Drawdown", target: "Lake Mead Pool (Hoover Dam Hub)", value: 2.50, category: "deficit" },

      // Col 2 -> Col 3
      { source: "Western Slope Gravity Canals", target: "Colorado", value: 1.85, category: "ag" },
      { source: "Western Slope Gravity Canals", target: "Utah", value: 0.92, category: "ag" },
      { source: "Western Slope Gravity Canals", target: "Wyoming", value: 0.63, category: "ag" },
      { source: "Western Slope Gravity Canals", target: "New Mexico", value: 0.50, category: "ag" },

      { source: "Trans-Mountain Diversion Tunnels", target: "Colorado", value: 0.48, category: "municipal" },
      { source: "Trans-Mountain Diversion Tunnels", target: "Utah", value: 0.12, category: "municipal" },

      { source: "Lake Mead Pool (Hoover Dam Hub)", target: "California", value: 4.40, category: "inflow" },
      { source: "Lake Mead Pool (Hoover Dam Hub)", target: "Arizona", value: 2.80, category: "inflow" },
      { source: "Lake Mead Pool (Hoover Dam Hub)", target: "Nevada", value: 0.30, category: "municipal" },
      { source: "Lake Mead Pool (Hoover Dam Hub)", target: "1944 Mexico Treaty Delivery", value: 1.50, category: "treaty" },
      { source: "Lake Mead Pool (Hoover Dam Hub)", target: "System Evaporation & Losses", value: 1.40, category: "loss" }
    ];

    // RESERVE 250px on the right margin for Column 3 labels!
    const sankey = d3.sankey()
      .nodeId(d => d.name)
      .nodeWidth(18)
      .nodePadding(18)
      .nodeSort(null)
      .extent([[24, 25], [width - 250, height - 25]]);

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

    svg.append("rect")
      .attr("x", 12)
      .attr("y", 12)
      .attr("width", width - 24)
      .attr("height", height - 24)
      .attr("fill", "#fafaf9")
      .attr("rx", 6)
      .attr("stroke", "#e2e8f0");

    // Brackets for Upper Basin and Lower Basin States on the far right
    const coNode = graph.nodes.find(n => n.name === "Colorado");
    const nmNode = graph.nodes.find(n => n.name === "New Mexico");
    const caNode = graph.nodes.find(n => n.name === "California");
    const lossNode = graph.nodes.find(n => n.name === "System Evaporation & Losses");

    // Upper Basin Bracket
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

    // Lower Basin Bracket
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

    // Links
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
      .attr("class", "link");

    // Nodes
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
      .attr("fill-opacity", 0.95);

    // Text labels - ALL pointing to the right (x1 + 10) with anchor 'start'!
    const textGroup = node.append("text")
      .attr("x", d => d.x1 + 10)
      .attr("y", d => (d.y1 + d.y0) / 2)
      .attr("text-anchor", "start")
      .style("paint-order", "stroke fill")
      .style("stroke", "#ffffff")
      .style("stroke-width", "4.5px")
      .style("stroke-linejoin", "round");

    textGroup.append("tspan")
      .attr("x", function() { return d3.select(this.parentNode).attr("x"); })
      .attr("dy", "-0.32em")
      .attr("font-size", d => (d.depth === 3 ? "13px" : (d.depth === 1 || d.depth === 2 ? "12px" : "11.5px")))
      .attr("font-weight", "800")
      .attr("fill", "#0f172a")
      .text(d => d.name);

    textGroup.append("tspan")
      .attr("x", function() { return d3.select(this.parentNode).attr("x"); })
      .attr("dy", "1.4em")
      .attr("font-size", "11px")
      .attr("font-family", "'Inter', -apple-system, sans-serif")
      .style("font-variant-numeric", "tabular-nums")
      .attr("font-weight", "700")
      .attr("fill", "#334155")
      .text(d => {
        if (d.sub) return d.value.toFixed(2) + " MAF/yr (" + d.sub + ")";
        return d.value.toFixed(2) + " MAF/yr";
      });

    // Check clearances
    const nodeData = Array.from(document.querySelectorAll(".node")).map(n => {
      const rect = n.querySelector("rect");
      const text = n.querySelector("text");
      const rBox = rect.getBBox();
      const tBox = text.getBBox();
      return {
        name: text.querySelector("tspan").textContent,
        col: Math.round(rBox.x / 200),
        rX: Math.round(rBox.x),
        tRight: Math.round(tBox.x + tBox.width)
      };
    });

    const col0 = nodeData.filter(n => n.rX < 100);
    const col1 = nodeData.filter(n => n.rX >= 300 && n.rX <= 450);
    const col2 = nodeData.filter(n => n.rX >= 650 && n.rX <= 800);
    const col3 = nodeData.filter(n => n.rX >= 1000);

    const c0_max = Math.max(...col0.map(n => n.tRight));
    const c1_min = col1[0].rX;

    const c1_max = Math.max(...col1.map(n => n.tRight));
    const c2_min = col2[0].rX;

    const c2_max = Math.max(...col2.map(n => n.tRight));
    const c3_min = col3[0].rX;

    const c3_max = Math.max(...col3.map(n => n.tRight));

    return {
      gap0_1: c1_min - c0_max,
      gap1_2: c2_min - c1_max,
      gap2_3: c3_min - c2_max,
      col3_rightMargin: width - c3_max
    };
  })()`;

  const res = await cdp.send("Runtime.evaluate", {
    expression: testScript,
    returnByValue: true
  });

  console.log("Audit Gaps:", JSON.stringify(res.result.value, null, 2));

  const shot = await cdp.send("Page.captureScreenshot", { format: "png" });
  fs.writeFileSync("/Users/macstudio/.gemini/antigravity/brain/aad5e810-76c0-4f7e-a9c4-9eb2855ee883/test_right_aligned_text.png", Buffer.from(shot.data, "base64"));
  console.log("Saved test_right_aligned_text.png");

  cdp.close();
  chrome.kill();
}

run().catch(console.error);
