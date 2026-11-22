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
  // 1. Build test HTML page from web/sankey.html
  let html = fs.readFileSync("web/sankey.html", "utf8");

  // Replace column headers
  html = html.replace(
    /<div>2\. Regulatory Storage \(Lake Powell\) &amp; Compact Pool<\/div>\s*<div>3\. Regional Conveyance &amp; Distribution Hub \(Lake Mead\)<\/div>/,
    `<div>2. Compact Basin Allocations</div>\n          <div>3. Regional Conveyance Conduits &amp; Losses</div>`
  );

  // Replace nodes
  const newNodesCode = `
      const nodes = [
        // --- Column 0: Water Sources (14.90 MAF) ---
        { name: "Upper Colorado Mainstem", category: "inflow", basin: "upper", desc: "Rocky Mtn National Park to Cisco (CO)" },
        { name: "Green River Basin", category: "inflow", basin: "upper", desc: "Wind River & Uintas (WY, UT, CO)" },
        { name: "San Juan River Basin", category: "inflow", basin: "upper", desc: "San Juan Mountains (CO, NM)" },
        { name: "Lower Basin Tributaries (Virgin & Little CO)", category: "inflow", basin: "lower", desc: "Virgin & Little Colorado Rivers (AZ, NV, UT)" },
        { name: "Reservoir Storage Overdraft", category: "deficit", basin: "lower", desc: "Structural drawdown from Lake Mead" },

        // --- Column 1: Compact Basin Allocations (14.90 MAF) ---
        { name: "Upper Basin Allocations", category: "inflow", basin: "upper", desc: "Consumptive apportionments across CO, UT, WY, NM (1922 & 1948 Compacts)" },
        { name: "Lower Basin Allocations & Deliveries", category: "inflow", basin: "lower", desc: "Statutory apportionments, treaty delivery, and system losses backed by Powell & Mead storage" },

        // --- Column 2: Regional Conveyance Conduits & Losses (14.90 MAF) ---
        // Upper Basin Conduits
        { name: "Western Slope Gravity Canals", category: "ag", basin: "upper", desc: "In-basin agricultural irrigation across 4 Upper states" },
        { name: "Front Range Tunnels (CO)", category: "municipal", basin: "upper", desc: "Adams, Moffat, Roberts, Boustead tunnels across Continental Divide" },
        { name: "Wasatch Front Tunnels (UT / CUP)", category: "municipal", basin: "upper", desc: "Strawberry Valley & Central Utah Project trans-basin diversions" },

        // Lower Basin Conduits & Conveyance
        { name: "All-American Canal & Imperial (CA)", category: "ag", basin: "lower", desc: "Gravity diversion at Imperial Dam serving Imperial & Coachella valleys" },
        { name: "Colorado River Aqueduct (CA / MWD)", category: "municipal", basin: "lower", desc: "Metropolitan Water District conveyance to coastal Southern California" },
        { name: "Central Arizona Project (AZ / CAP)", category: "municipal", basin: "lower", desc: "336-mile canal lifting water to Phoenix and Tucson municipal users" },
        { name: "Lower River Mainstem Canals (AZ)", category: "ag", basin: "lower", desc: "Gila, Yuma, and Parker valley irrigation diversions" },
        { name: "SNWA / Lake Mead Intakes (NV)", category: "municipal", basin: "lower", desc: "Deep lake pumping intakes supplying 90% of Las Vegas Valley drinking water" },
        { name: "Morelos Dam Diversion (Mexico)", category: "treaty", basin: "lower", desc: "International treaty deliveries via Morelos Dam to Mexicali Valley" },
        { name: "Reservoir Evaporation & Transit Losses", category: "loss", basin: "lower", desc: "Net reservoir surface evaporation and lower river transit losses" },

        // --- Column 3: State-Grouped Consumptive Uses & Sovereigns (14.90 MAF) ---
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
          displayName: "Mexico",
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
          displayName: "System Losses",
          category: "loss",
          basin: "lower",
          vol: "1.40 MAF/yr",
          breakdowns: [
            "- Lake Evaporation: 0.90",
            "- River Transit & Seepage: 0.50"
          ]
        }
      ];
`;

  const newLinksCode = `
      const links = [
        // Col 0 -> Col 1 (Sources to Compact Allocations)
        { source: "Upper Colorado Mainstem", target: "Upper Basin Allocations", value: 2.45, category: "inflow" },
        { source: "Upper Colorado Mainstem", target: "Lower Basin Allocations & Deliveries", value: 4.35, category: "inflow" },

        { source: "Green River Basin", target: "Upper Basin Allocations", value: 1.35, category: "inflow" },
        { source: "Green River Basin", target: "Lower Basin Allocations & Deliveries", value: 2.55, category: "inflow" },

        { source: "San Juan River Basin", target: "Upper Basin Allocations", value: 0.70, category: "inflow" },
        { source: "San Juan River Basin", target: "Lower Basin Allocations & Deliveries", value: 1.00, category: "inflow" },

        { source: "Lower Basin Tributaries (Virgin & Little CO)", target: "Lower Basin Allocations & Deliveries", value: 0.45, category: "inflow" },
        { source: "Reservoir Storage Overdraft", target: "Lower Basin Allocations & Deliveries", value: 2.05, category: "deficit" },

        // Col 1 -> Col 2 (Allocations to Conduits)
        // Upper Basin Conduits
        { source: "Upper Basin Allocations", target: "Western Slope Gravity Canals", value: 3.90, category: "ag" },
        { source: "Upper Basin Allocations", target: "Front Range Tunnels (CO)", value: 0.48, category: "municipal" },
        { source: "Upper Basin Allocations", target: "Wasatch Front Tunnels (UT / CUP)", value: 0.12, category: "municipal" },

        // Lower Basin Conduits
        { source: "Lower Basin Allocations & Deliveries", target: "All-American Canal & Imperial (CA)", value: 3.40, category: "ag" },
        { source: "Lower Basin Allocations & Deliveries", target: "Colorado River Aqueduct (CA / MWD)", value: 1.00, category: "municipal" },
        { source: "Lower Basin Allocations & Deliveries", target: "Central Arizona Project (AZ / CAP)", value: 1.38, category: "municipal" },
        { source: "Lower Basin Allocations & Deliveries", target: "Lower River Mainstem Canals (AZ)", value: 1.42, category: "ag" },
        { source: "Lower Basin Allocations & Deliveries", target: "SNWA / Lake Mead Intakes (NV)", value: 0.30, category: "municipal" },
        { source: "Lower Basin Allocations & Deliveries", target: "Morelos Dam Diversion (Mexico)", value: 1.50, category: "treaty" },
        { source: "Lower Basin Allocations & Deliveries", target: "Reservoir Evaporation & Transit Losses", value: 1.40, category: "loss" },

        // Col 2 -> Col 3 (Conduits to States & Sovereigns)
        // Upper Basin
        { source: "Western Slope Gravity Canals", target: "Colorado", value: 1.85, category: "ag" },
        { source: "Western Slope Gravity Canals", target: "Utah", value: 0.92, category: "ag" },
        { source: "Western Slope Gravity Canals", target: "Wyoming", value: 0.63, category: "ag" },
        { source: "Western Slope Gravity Canals", target: "New Mexico", value: 0.50, category: "ag" },

        { source: "Front Range Tunnels (CO)", target: "Colorado", value: 0.48, category: "municipal" },
        { source: "Wasatch Front Tunnels (UT / CUP)", target: "Utah", value: 0.12, category: "municipal" },

        // Lower Basin
        { source: "All-American Canal & Imperial (CA)", target: "California", value: 3.40, category: "ag" },
        { source: "Colorado River Aqueduct (CA / MWD)", target: "California", value: 1.00, category: "municipal" },

        { source: "Central Arizona Project (AZ / CAP)", target: "Arizona", value: 1.38, category: "municipal" },
        { source: "Lower River Mainstem Canals (AZ)", target: "Arizona", value: 1.42, category: "ag" },

        { source: "SNWA / Lake Mead Intakes (NV)", target: "Nevada", value: 0.30, category: "municipal" },

        { source: "Morelos Dam Diversion (Mexico)", target: "1944 Mexico Treaty", value: 1.50, category: "treaty" },

        { source: "Reservoir Evaporation & Transit Losses", target: "System Losses & Evaporation", value: 1.40, category: "loss" }
      ];
`;

  // Replace in HTML
  html = html.replace(/const nodes = \[[\s\S]*?\];/, newNodesCode.trim());
  html = html.replace(/const links = \[[\s\S]*?\];/, newLinksCode.trim());

  fs.writeFileSync("web/test_proposal1.html", html);
  console.log("Wrote web/test_proposal1.html");

  // Test with Chrome
  const chrome = spawn("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", [
    "--headless=new",
    "--remote-debugging-port=9244",
    "--no-sandbox",
    "--disable-gpu",
    "--window-size=1440,900"
  ]);

  await sleep(1200);
  try {
    const targets = await fetchJson("http://localhost:9244/json");
    const pageTarget = targets.find(t => t.type === "page");
    const client = new CDPClient(pageTarget.webSocketDebuggerUrl);
    await client.connect();
    await client.send("Page.enable");
    await client.send("Page.navigate", { url: "http://localhost:8088/test_proposal1.html" });
    await sleep(2500);

    const data = await client.send("Runtime.evaluate", {
      expression: `(() => {
        const svg = document.querySelector("#sankey-container svg");
        if (!svg) return { error: "No SVG" };

        const nodes = Array.from(svg.querySelectorAll("g.node")).map(g => {
          const rect = g.querySelector("rect");
          const text = g.querySelector("text");
          const tspan1 = text ? text.querySelector("tspan") : null;
          return {
            title: tspan1 ? tspan1.textContent : "",
            x: rect ? parseFloat(rect.getAttribute("x")) : 0,
            y: rect ? parseFloat(rect.getAttribute("y")) : 0,
            height: rect ? parseFloat(rect.getAttribute("height")) : 0
          };
        });

        // Group by column X
        const cols = {};
        for (const n of nodes) {
          const xInt = Math.round(n.x);
          if (!cols[xInt]) cols[xInt] = [];
          cols[xInt].push(n);
        }

        const colSummary = Object.keys(cols).sort((a,b) => a - b).map(x => ({
          x: parseInt(x),
          count: cols[x].length,
          topY: cols[x][0].y,
          bottomY: cols[x][cols[x].length - 1].y + cols[x][cols[x].length - 1].height,
          nodes: cols[x].map(n => ({ title: n.title, y: Math.round(n.y), h: Math.round(n.height) }))
        }));

        return { colSummary };
      })()`,
      returnByValue: true
    });

    console.log("Column analysis:\n", JSON.stringify(data.result.value, null, 2));

    const shot = await client.send("Page.captureScreenshot", { format: "png" });
    fs.writeFileSync("/Users/macstudio/.gemini/antigravity/brain/aad5e810-76c0-4f7e-a9c4-9eb2855ee883/test_proposal1_preview.png", Buffer.from(shot.data, "base64"));
    console.log("Saved test_proposal1_preview.png");

    client.close();
  } catch (err) {
    console.error("Error:", err);
  } finally {
    chrome.kill();
  }
}

run();
