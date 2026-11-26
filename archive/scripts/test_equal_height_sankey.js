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
    "--remote-debugging-port=9420",
    "--headless=new",
    "--no-sandbox",
    "--window-size=1440,900",
    "http://localhost:8088/sankey.html"
  ]);

  await sleep(1500);
  const list = await fetchJson("http://localhost:9420/json/list");
  const cdp = new CDPClient(list[0].webSocketDebuggerUrl);
  await cdp.connect();

  await cdp.send("Page.enable");
  await sleep(1000);

  const testScript = `(() => {
    const container = document.getElementById('sankey-container');
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

    // Compute standard layout with base padding
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

    // NOW: Make Left side and Right side the EXACT SAME HEIGHT!
    // The right side (Column 3) has 9 nodes (8 gaps = 8 * 18 = 144px total gaps).
    // Let us measure the target yTop and yBottom from Column 3:
    const col3Nodes = graph.nodes.filter(n => n.depth === 3).sort((a,b) => a.y0 - b.y0);
    const targetYTop = col3Nodes[0].y0;
    const targetYBottom = col3Nodes[col3Nodes.length - 1].y1;
    const targetTotalHeight = targetYBottom - targetYTop;

    // Group nodes by column
    const columns = [
      graph.nodes.filter(n => n.depth === 0).sort((a,b) => a.y0 - b.y0),
      graph.nodes.filter(n => n.depth === 1).sort((a,b) => a.y0 - b.y0),
      graph.nodes.filter(n => n.depth === 2).sort((a,b) => a.y0 - b.y0),
      col3Nodes
    ];

    // Align Column 0 (Left side), Column 1, and Column 2 to span from targetYTop to targetYBottom!
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

    // Now recompute link y0 and y1 to reflect the new node positions!
    for (const node of graph.nodes) {
      // Sort sourceLinks to match order
      node.sourceLinks.sort((a,b) => a.target.y0 - b.target.y0);
      let sy = node.y0;
      for (const link of node.sourceLinks) {
        link.y0 = sy + link.width / 2;
        sy += link.width;
      }

      // Sort targetLinks to match order
      node.targetLinks.sort((a,b) => a.source.y0 - b.source.y0);
      let ty = node.y0;
      for (const link of node.targetLinks) {
        link.y1 = ty + link.width / 2;
        ty += link.width;
      }
    }

    // Measure top and bottom of each column
    const colMetrics = columns.map((col, idx) => ({
      col: idx,
      yTop: col[0].y0,
      yBottom: col[col.length - 1].y1,
      totalSpan: col[col.length - 1].y1 - col[0].y0
    }));

    return {
      targetYTop,
      targetYBottom,
      targetTotalHeight,
      colMetrics
    };
  })()`;

  const res = await cdp.send("Runtime.evaluate", {
    expression: testScript,
    returnByValue: true
  });

  console.log("Equal Height Verification:", JSON.stringify(res.result.value, null, 2));

  cdp.close();
  chrome.kill();
}

run().catch(console.error);
