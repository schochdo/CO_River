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
    "--remote-debugging-port=9375",
    "--headless=new",
    "--no-sandbox",
    "--window-size=1440,900",
    "http://localhost:8088/sankey.html"
  ]);

  await sleep(1500);
  const list = await fetchJson("http://localhost:9375/json/list");
  const cdp = new CDPClient(list[0].webSocketDebuggerUrl);
  await cdp.connect();

  await cdp.send("Page.enable");
  await sleep(1000);

  // We can inject and test the new 4-tier Sankey right here in the page!
  const testScript = `(() => {
    const container = document.getElementById('sankey-container');
    container.innerHTML = '';

    const width = Math.max(1200, container.clientWidth || 1350);
    const height = 760;

    const nodes = [
      // --- Column 0: Natural Runoff & Storage Drawdown ---
      { name: "Upper Colorado Mainstem", category: "inflow", basin: "upper" },
      { name: "Green River Basin", category: "inflow", basin: "upper" },
      { name: "San Juan River Basin", category: "inflow", basin: "upper" },
      { name: "Lower Basin Tributaries (Virgin & Little CO)", category: "inflow", basin: "lower" },
      { name: "Reservoir Storage Overdraft", category: "deficit", basin: "lower" },

      // --- Column 1: Storage Pools & Allocations ---
      { name: "Upper Basin In-Basin Pool", category: "inflow", basin: "upper" },
      { name: "Lake Powell Pool (Glen Canyon Dam)", category: "inflow", basin: "upper" },
      { name: "Lower Basin Tributary Inflows", category: "inflow", basin: "lower" },
      { name: "Lower Basin Storage Drawdown", category: "deficit", basin: "lower" },

      // --- Column 2: Regional Conveyance & Mainstem Hubs ---
      { name: "Western Slope Gravity Canals", category: "ag", basin: "upper" },
      { name: "Trans-Mountain Diversion Tunnels", category: "municipal", basin: "upper" },
      { name: "Lake Mead Pool (Hoover Dam Hub)", category: "inflow", basin: "lower" },

      // --- Column 3: State-Grouped Consumptive Uses & Losses ---
      { name: "State of Colorado", category: "ag", basin: "upper", sub: "Western Slope Ag 1.85 • Front Range 0.48", vol: 2.33 },
      { name: "State of Utah", category: "ag", basin: "upper", sub: "Uinta Basin Ag 0.92 • Wasatch Cities 0.12", vol: 1.04 },
      { name: "State of Wyoming", category: "ag", basin: "upper", sub: "Upper Green River Ag 0.63", vol: 0.63 },
      { name: "State of New Mexico", category: "ag", basin: "upper", sub: "San Juan Basin & Navajo Ag 0.50", vol: 0.50 },

      { name: "State of California", category: "ag", basin: "lower", sub: "Imperial / AAC 3.40 • SoCal MWD CRA 1.00", vol: 4.40 },
      { name: "State of Arizona", category: "ag", basin: "lower", sub: "Central AZ CAP 1.38 • River Ag 1.42", vol: 2.80 },
      { name: "State of Nevada", category: "municipal", basin: "lower", sub: "Las Vegas Valley / SNWA Intakes 0.30", vol: 0.30 },
      { name: "1944 Mexico Water Treaty", category: "treaty", basin: "lower", sub: "Mexicali Valley Ag 1.25 • Baja Cities 0.25", vol: 1.50 },
      { name: "System Evaporation & Losses", category: "loss", basin: "lower", sub: "Mead/Powell Evaporation 0.90 • Transit 0.50", vol: 1.40 }
    ];

    const links = [
      // Col 0 -> Col 1
      { source: "Upper Colorado Mainstem", target: "Upper Basin In-Basin Pool", value: 2.50, category: "inflow" },
      { source: "Upper Colorado Mainstem", target: "Lake Powell Pool (Glen Canyon Dam)", value: 4.30, category: "inflow" },

      { source: "Green River Basin", target: "Upper Basin In-Basin Pool", value: 1.30, category: "inflow" },
      { source: "Green River Basin", target: "Lake Powell Pool (Glen Canyon Dam)", value: 2.60, category: "inflow" },

      { source: "San Juan River Basin", target: "Upper Basin In-Basin Pool", value: 0.70, category: "inflow" },
      { source: "San Juan River Basin", target: "Lake Powell Pool (Glen Canyon Dam)", value: 1.00, category: "inflow" },

      { source: "Lower Basin Tributaries (Virgin & Little CO)", target: "Lower Basin Tributary Inflows", value: 0.45, category: "inflow" },
      { source: "Reservoir Storage Overdraft", target: "Lower Basin Storage Drawdown", value: 2.05, category: "deficit" },

      // Col 1 -> Col 2
      { source: "Upper Basin In-Basin Pool", target: "Western Slope Gravity Canals", value: 3.90, category: "ag" },
      { source: "Upper Basin In-Basin Pool", target: "Trans-Mountain Diversion Tunnels", value: 0.60, category: "municipal" },

      { source: "Lake Powell Pool (Glen Canyon Dam)", target: "Lake Mead Pool (Hoover Dam Hub)", value: 7.90, category: "inflow" },
      { source: "Lower Basin Tributary Inflows", target: "Lake Mead Pool (Hoover Dam Hub)", value: 0.45, category: "inflow" },
      { source: "Lower Basin Storage Drawdown", target: "Lake Mead Pool (Hoover Dam Hub)", value: 2.05, category: "deficit" },

      // Col 2 -> Col 3 (States & Sovereigns)
      { source: "Western Slope Gravity Canals", target: "State of Colorado", value: 1.85, category: "ag" },
      { source: "Western Slope Gravity Canals", target: "State of Utah", value: 0.92, category: "ag" },
      { source: "Western Slope Gravity Canals", target: "State of Wyoming", value: 0.63, category: "ag" },
      { source: "Western Slope Gravity Canals", target: "State of New Mexico", value: 0.50, category: "ag" },

      { source: "Trans-Mountain Diversion Tunnels", target: "State of Colorado", value: 0.48, category: "municipal" },
      { source: "Trans-Mountain Diversion Tunnels", target: "State of Utah", value: 0.12, category: "municipal" },

      { source: "Lake Mead Pool (Hoover Dam Hub)", target: "State of California", value: 4.40, category: "inflow" },
      { source: "Lake Mead Pool (Hoover Dam Hub)", target: "State of Arizona", value: 2.80, category: "inflow" },
      { source: "Lake Mead Pool (Hoover Dam Hub)", target: "State of Nevada", value: 0.30, category: "municipal" },
      { source: "Lake Mead Pool (Hoover Dam Hub)", target: "1944 Mexico Water Treaty", value: 1.50, category: "treaty" },
      { source: "Lake Mead Pool (Hoover Dam Hub)", target: "System Evaporation & Losses", value: 1.40, category: "loss" }
    ];

    const sankey = d3.sankey()
      .nodeId(d => d.name)
      .nodeWidth(18)
      .nodePadding(16)
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
      .style("font", "12px Inter, sans-serif");

    // Clean smooth engineering transit curve
    function customLinkPath(d) {
      const x0 = d.source.x1;
      const x1 = d.target.x0;
      const y0 = d.y0;
      const y1 = d.y1;
      const dx = (x1 - x0) * 0.40;
      return "M" + x0 + "," + y0 +
             "C" + (x0 + dx) + "," + y0 +
             " " + (x1 - dx) + "," + y1 +
             " " + x1 + "," + y1;
    }

    const col0_ub = graph.nodes.find(n => n.name === "San Juan River Basin");
    const col0_lb = graph.nodes.find(n => n.name === "Lower Basin Tributaries (Virgin & Little CO)");
    const y_col0 = (col0_ub.y1 + col0_lb.y0) / 2;

    const col1_ub = graph.nodes.find(n => n.name === "Lake Powell Pool (Glen Canyon Dam)");
    const col1_lb = graph.nodes.find(n => n.name === "Lower Basin Tributary Inflows");
    const y_col1 = (col1_ub.y1 + col1_lb.y0) / 2;

    const col2_ub = graph.nodes.find(n => n.name === "Trans-Mountain Diversion Tunnels");
    const col2_lb = graph.nodes.find(n => n.name === "Lake Mead Pool (Hoover Dam Hub)");
    const y_col2 = (col2_ub.y1 + col2_lb.y0) / 2;

    const col3_ub = graph.nodes.find(n => n.name === "State of New Mexico");
    const col3_lb = graph.nodes.find(n => n.name === "State of California");
    const y_col3 = (col3_ub.y1 + col3_lb.y0) / 2;

    // Background container
    svg.append("rect")
      .attr("x", 12)
      .attr("y", 12)
      .attr("width", width - 24)
      .attr("height", height - 24)
      .attr("fill", "#fafaf9")
      .attr("rx", 6)
      .attr("stroke", "#e7e5e4");

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

    // Labels
    const textGroup = node.append("text")
      .attr("x", d => {
        if (d.depth === 3) return d.x0 - 10;
        return d.x1 + 10;
      })
      .attr("y", d => (d.y1 + d.y0) / 2)
      .attr("text-anchor", d => {
        if (d.depth === 3) return "end";
        return "start";
      })
      .style("paint-order", "stroke fill")
      .style("stroke", "#ffffff")
      .style("stroke-width", "4px")
      .style("stroke-linejoin", "round");

    textGroup.append("tspan")
      .attr("x", function() { return d3.select(this.parentNode).attr("x"); })
      .attr("dy", "-0.3em")
      .attr("font-size", d => (d.depth === 3 ? "13px" : "12px"))
      .attr("font-weight", "800")
      .attr("fill", "#0f172a")
      .text(d => d.name);

    textGroup.append("tspan")
      .attr("x", function() { return d3.select(this.parentNode).attr("x"); })
      .attr("dy", "1.35em")
      .attr("font-size", "11.5px")
      .style("font-variant-numeric", "tabular-nums")
      .attr("font-weight", "700")
      .attr("fill", d => colorMap[d.category] || "#334155")
      .text(d => {
        if (d.sub) return d.value.toFixed(2) + " MAF/yr — " + d.sub;
        return d.value.toFixed(2) + " MAF/yr";
      });

    return {
      width, height,
      y_col0, y_col1, y_col2, y_col3,
      nodeCount: graph.nodes.length
    };
  })()`;

  const res = await cdp.send("Runtime.evaluate", {
    expression: testScript,
    returnByValue: true
  });

  console.log("Evaluation result:", JSON.stringify(res.result.value, null, 2));

  const shot = await cdp.send("Page.captureScreenshot", { format: "png" });
  fs.writeFileSync("/Users/macstudio/.gemini/antigravity/brain/aad5e810-76c0-4f7e-a9c4-9eb2855ee883/test_new_sankey_preview.png", Buffer.from(shot.data, "base64"));
  console.log("Saved test_new_sankey_preview.png");

  cdp.close();
  chrome.kill();
}

run().catch(console.error);
