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
    "--remote-debugging-port=9280",
    "--headless=new",
    "--no-sandbox",
    "--window-size=1800,1350",
    "http://localhost:8088/sankey.html"
  ]);

  await sleep(1500);
  const list = await fetchJson("http://localhost:9280/json/list");
  const cdp = new CDPClient(list[0].webSocketDebuggerUrl);
  await cdp.connect();
  await cdp.send("Page.enable");
  await cdp.send("Runtime.enable");
  await sleep(2000);

  const evalRes = await cdp.send("Runtime.evaluate", {
    expression: `(() => {
      // Test the layout where:
      // Col 0: Inflow Sources & Storage Overdraft
      // Col 1: Storage Reservoirs & Buffer Pools (Lake Powell Hub & Lake Mead Hub)
      // Col 2: Major Canals, Aqueducts & Tunnels
      // Col 3: State Apportionments & Compact Allocations (Grouped by Upper & Lower)
      // Col 4: Consumptive End Uses (Ag vs Municipal by State)
      
      const nodes = [
        // Col 0: Inflows (depth 0)
        { name: "Upper Colorado Mainstem", category: "inflow" },
        { name: "Green River Basin", category: "inflow" },
        { name: "San Juan River Basin", category: "inflow" },
        { name: "Lower Basin Tributaries (Virgin & Little CO)", category: "inflow" },
        { name: "Reservoir Storage Drawdown", category: "deficit" },

        // Col 1: Reservoirs & Hubs (depth 1)
        { name: "Lake Powell Pool (Glen Canyon)", category: "inflow" },
        { name: "Lake Mead Pool (Hoover Dam)", category: "inflow" },

        // Col 2: Canals & Conduits (depth 2)
        { name: "Upper Basin Gravity Canals", category: "ag" },
        { name: "Trans-Mountain Diversion Tunnels", category: "municipal" },
        { name: "Central Utah Project (CUP)", category: "municipal" },
        { name: "All-American Canal (AAC)", category: "ag" },
        { name: "Colorado River Aqueduct (CRA)", category: "municipal" },
        { name: "Lower River Gravity Canals (AZ)", category: "ag" },
        { name: "Central Arizona Project (CAP)", category: "municipal" },
        { name: "Lake Mead SNWA Intakes", category: "municipal" },
        { name: "Morelos Dam & Central Feeder Canal", category: "treaty" },
        { name: "Atmospheric Surface Evaporation", category: "loss" },
        { name: "Riparian & River Transit Loss", category: "loss" },

        // Col 3: States & Compact Apportionments (depth 3)
        { name: "Colorado", category: "inflow" },
        { name: "Utah", category: "inflow" },
        { name: "Wyoming", category: "inflow" },
        { name: "New Mexico", category: "inflow" },
        { name: "California", category: "inflow" },
        { name: "Arizona", category: "inflow" },
        { name: "Nevada", category: "inflow" },
        { name: "1944 Mexico Treaty", category: "treaty" },
        { name: "System Losses & Conveyance", category: "loss" },

        // Col 4: Consumptive End Uses (depth 4)
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

      return { totalNodes: nodes.length };
    })()`,
    returnByValue: true
  });

  console.log("Layout test:", evalRes.result.value);
  cdp.close();
  chrome.kill();
}
run();
