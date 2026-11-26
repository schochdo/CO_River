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
    "--remote-debugging-port=9285",
    "--headless=new",
    "--no-sandbox",
    "--window-size=1800,1350",
    "http://localhost:8088/sankey.html"
  ]);

  await sleep(1500);
  const list = await fetchJson("http://localhost:9285/json/list");
  const cdp = new CDPClient(list[0].webSocketDebuggerUrl);
  await cdp.connect();
  await cdp.send("Page.enable");
  await cdp.send("Runtime.enable");
  await sleep(2000);

  const evalRes = await cdp.send("Runtime.evaluate", {
    expression: `(() => {
      const container = document.getElementById('sankey-container');
      container.innerHTML = '';
      const width = Math.max(1640, container.clientWidth || 1700);
      const height = 980;

      // 5 Column Nodes:
      // Col 0: Inflow Sources & Storage Drawdown
      // Col 1: Buffer Reservoirs (Powell & Mead)
      // Col 2: Conveyance Infrastructure (Canals & Tunnels)
      // Col 3: State Apportionments (Grouped to the right side!)
      // Col 4: Consumptive End Uses (Ag vs Municipal by State)

      const nodes = [
        // Col 0: Inflows
        { name: "Upper Colorado Mainstem", category: "inflow" },
        { name: "Green River Basin", category: "inflow" },
        { name: "San Juan River Basin", category: "inflow" },
        { name: "Lower Basin Tributaries (Virgin & Little CO)", category: "inflow" },
        { name: "Reservoir Storage Drawdown", category: "deficit" },

        // Col 1: Buffer Reservoirs
        { name: "Lake Powell (Glen Canyon Dam)", category: "inflow" },
        { name: "Lake Mead (Hoover Dam Hub)", category: "inflow" },

        // Col 2: Canals & Infrastructure
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

        // Col 3: States & Compact Apportionments (Grouped by Upper & Lower)
        { name: "Colorado", category: "inflow" },
        { name: "Utah", category: "inflow" },
        { name: "Wyoming", category: "inflow" },
        { name: "New Mexico", category: "inflow" },
        { name: "California", category: "inflow" },
        { name: "Arizona", category: "inflow" },
        { name: "Nevada", category: "inflow" },
        { name: "1944 Mexico Treaty", category: "treaty" },
        { name: "System Losses & Conveyance", category: "loss" },

        // Col 4: Consumptive End Uses (Ag vs Municipal by State)
        { name: "Colorado Agriculture", category: "ag" },
        { name: "Front Range Municipal (Denver/CO Springs)", category: "municipal" },
        { name: "Utah Agriculture (Uinta/Green)", category: "ag" },
        { name: "Wasatch Front Municipal (Salt Lake/Provo)", category: "municipal" },
        { name: "Wyoming Agriculture (Green River Basin)", category: "ag" },
        { name: "New Mexico Agriculture (San Juan/NAPI)", category: "ag" },
        { name: "California Agriculture (Imperial & Coachella)", category: "ag" },
        { name: "Southern California Municipal (MWD)", category: "municipal" },
        { name: "Arizona Mainstem Agriculture (Yuma)", category: "ag" },
        { name: "Central Arizona Municipal (Phoenix/Tucson)", category: "municipal" },
        { name: "Central Arizona Agriculture & Tribal", category: "ag" },
        { name: "Las Vegas Valley Municipal (SNWA)", category: "municipal" },
        { name: "Southern Nevada Parks & Landscape", category: "municipal" },
        { name: "Mexicali Valley Agriculture", category: "ag" },
        { name: "Baja California Municipal (Tijuana/Mexicali)", category: "municipal" },
        { name: "Lake Mead & Powell Evaporation", category: "loss" },
        { name: "River Channel Seepage & Phreatophytes", category: "loss" }
      ];

      const links = [
        // Col 0 -> Col 1: Inflows to Powell & Mead
        { source: "Upper Colorado Mainstem", target: "Lake Powell (Glen Canyon Dam)", value: 6.80, category: "inflow" },
        { source: "Green River Basin", target: "Lake Powell (Glen Canyon Dam)", value: 3.90, category: "inflow" },
        { source: "San Juan River Basin", target: "Lake Powell (Glen Canyon Dam)", value: 1.70, category: "inflow" },
        { source: "Lower Basin Tributaries (Virgin & Little CO)", target: "Lake Mead (Hoover Dam Hub)", value: 0.45, category: "inflow" },
        { source: "Reservoir Storage Drawdown", target: "Lake Mead (Hoover Dam Hub)", value: 2.05, category: "deficit" },

        // Col 1 -> Col 2: Storage to Conveyance Infrastructure
        // Upper Basin diversions from Powell upstream network: 4.50 MAF
        { source: "Lake Powell (Glen Canyon Dam)", target: "Western Slope Gravity Canals", value: 1.85, category: "ag" },
        { source: "Lake Powell (Glen Canyon Dam)", target: "Trans-Mountain Diversion Tunnels", value: 0.48, category: "municipal" },
        { source: "Lake Powell (Glen Canyon Dam)", target: "Uinta & Green Basin Canals", value: 0.92, category: "ag" },
        { source: "Lake Powell (Glen Canyon Dam)", target: "Central Utah Project (CUP)", value: 0.12, category: "municipal" },
        { source: "Lake Powell (Glen Canyon Dam)", target: "Upper Green River Irrigation", value: 0.63, category: "ag" },
        { source: "Lake Powell (Glen Canyon Dam)", target: "San Juan Basin Diversions", value: 0.50, category: "ag" },

        // Lees Ferry release to Mead is 7.90 MAF! But here, Mead releases to Lower Basin canals:
        // Total Mead throughput: 10.40 MAF (7.90 Powell release + 0.45 tribs + 2.05 storage drawdown)
        // Wait, if Powell connects to Mead, Powell is depth 1 and Mead is depth 2!
        // To keep them in the same column (depth 1), Powell supplies Upper Basin canals (4.50) + Lower Basin canals (7.90)?
        // No, if Powell connects to Mead, that is 6 stages!
        return "Testing";
      })();`,
    returnByValue: true
  });

  console.log("Result:", evalRes.result.value);
  cdp.close();
  chrome.kill();
}
run();
