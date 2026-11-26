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
    "--remote-debugging-port=9310",
    "--headless=new",
    "--no-sandbox",
    "--window-size=1800,1400",
    "http://localhost:8088/sankey.html"
  ]);

  await sleep(1500);
  const list = await fetchJson("http://localhost:9310/json/list");
  const cdp = new CDPClient(list[0].webSocketDebuggerUrl);
  await cdp.connect();
  await cdp.send("Page.enable");
  await cdp.send("Runtime.enable");
  await sleep(2000);

  const evalRes = await cdp.send("Runtime.evaluate", {
    expression: `(() => {
      const container = document.getElementById('sankey-container');
      container.innerHTML = '';
      const width = 1750;
      const height = 980;

      // Update Column Headers in header row
      const headerRow = document.querySelector('.grid.grid-cols-5');
      if (headerRow) {
        headerRow.innerHTML = \`
          <div class="text-left pl-2">1. Inflow Sources &amp; Overdraft</div>
          <div>2. Buffer Storage (Powell &amp; Mead)</div>
          <div>3. State &amp; Sovereign Allocations</div>
          <div>4. Major Diversion Conduits</div>
          <div class="text-right pr-2">5. Consumptive Sectors (Ag vs City)</div>
        \`;
      }

      // Nodes:
      // Col 0: Inflow Sources & Storage Drawdown
      // Col 1: Buffer Storage Pools (Lake Powell Hub & Lake Mead Hub)
      // Col 2: 7 States, Mexico & Losses (Grouped!)
      // Col 3: Canals & Pipelines
      // Col 4: Consumptive End Uses
      
      const nodes = [
        // Col 0: Inflows (depth 0)
        { name: "Upper Colorado Mainstem", category: "inflow" },
        { name: "Green River Basin", category: "inflow" },
        { name: "San Juan River Basin", category: "inflow" },
        { name: "Lower Basin Tributaries (Virgin & Little CO)", category: "inflow" },
        { name: "Reservoir Storage Drawdown", category: "deficit" },

        // Col 1: Buffer Reservoirs (depth 1)
        { name: "Lake Powell (Glen Canyon Pool)", category: "inflow" },
        { name: "Lake Mead (Hoover Dam Hub)", category: "inflow" },

        // Col 2: State Apportionments (depth 2)
        { name: "State of Colorado", category: "inflow", basin: "upper" },
        { name: "State of Utah", category: "inflow", basin: "upper" },
        { name: "State of Wyoming", category: "inflow", basin: "upper" },
        { name: "State of New Mexico", category: "inflow", basin: "upper" },
        { name: "State of California", category: "inflow", basin: "lower" },
        { name: "State of Arizona", category: "inflow", basin: "lower" },
        { name: "State of Nevada", category: "inflow", basin: "lower" },
        { name: "1944 Mexico Treaty", category: "treaty", basin: "lower" },
        { name: "System Losses & Conveyance", category: "loss", basin: "lower" },

        // Col 3: Canals & Infrastructure (depth 3)
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

        // Col 4: Consumptive End Uses (depth 4)
        { name: "Colorado Western Slope Ag", category: "ag" },
        { name: "Front Range Municipal (CO)", category: "municipal" },
        { name: "Utah Uinta Basin Ag", category: "ag" },
        { name: "Wasatch Front Municipal (UT)", category: "municipal" },
        { name: "Wyoming Upper Green Ag", category: "ag" },
        { name: "New Mexico San Juan Ag", category: "ag" },
        { name: "California Imperial & Coachella Ag", category: "ag" },
        { name: "Southern California Municipal (MWD)", category: "municipal" },
        { name: "Arizona Mainstem River Ag", category: "ag" },
        { name: "Central Arizona Municipal (Phoenix/Tucson)", category: "municipal" },
        { name: "Central Arizona Ag & Tribal (CAP)", category: "ag" },
        { name: "Las Vegas Valley Municipal (SNWA)", category: "municipal" },
        { name: "Southern Nevada Parks & Irrigation", category: "municipal" },
        { name: "Mexicali Valley Agriculture (Mexico)", category: "ag" },
        { name: "Baja California Municipal (Tijuana/Mexicali)", category: "municipal" },
        { name: "Atmospheric Evaporation (Mead & Powell)", category: "loss" },
        { name: "Riparian & Channel Seepage", category: "loss" }
      ];

      const links = [
        // Col 0 -> Col 1: Inflows to Powell & Mead
        { source: "Upper Colorado Mainstem", target: "Lake Powell (Glen Canyon Pool)", value: 6.80, category: "inflow" },
        { source: "Green River Basin", target: "Lake Powell (Glen Canyon Pool)", value: 3.90, category: "inflow" },
        { source: "San Juan River Basin", target: "Lake Powell (Glen Canyon Pool)", value: 1.70, category: "inflow" },
        { source: "Lower Basin Tributaries (Virgin & Little CO)", target: "Lake Mead (Hoover Dam Hub)", value: 0.45, category: "inflow" },
        { source: "Reservoir Storage Drawdown", target: "Lake Mead (Hoover Dam Hub)", value: 2.05, category: "deficit" },

        // Col 1 -> Col 2: Storage Pools to States
        // Powell supplies Upper States (4.50 MAF consumptive use) + releases to Mead (7.90 MAF)
        // Wait, Powell to Mead is Col 1 to Col 1? In DAG, links must advance depth!
        // If Powell releases 7.90 to Lower Basin, let us see:
        // Powell -> Colorado (2.33), Utah (1.04), Wyoming (0.63), New Mexico (0.50) = 4.50 MAF
        // But what about the remaining 7.90 MAF? It goes downstream past Lees Ferry to Lake Mead!
        // If Powell connects to Mead, Powell is depth 1 and Mead is depth 2.
        // What if Col 1 has:
        // "Upper Basin (Lake Powell Hub)" -> supplies CO, UT, WY, NM
        // "Lower Basin (Lake Mead Hub)" -> supplies CA, AZ, NV, Mexico, Losses
        // With Upper Inflows (12.40 MAF) entering Lake Powell Hub, which splits:
        // - 4.50 MAF to Upper Basin States
        // - 7.90 MAF Lees Ferry release passing to Lake Mead Hub!
        // Wait, if Lake Powell Hub connects to Lake Mead Hub, they CANNOT be at the same depth in D3 sankey!
        return "Checking";
      })()`,
    returnByValue: true
  });

  console.log("Check:", evalRes.result.value);
  cdp.close();
  chrome.kill();
}
run();
