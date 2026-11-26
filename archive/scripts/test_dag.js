const { spawn } = require("child_process");
const http = require("http");

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

async function run() {
  const chrome = spawn("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", [
    "--remote-debugging-port=9252",
    "--headless=new",
    "--no-sandbox",
    "http://localhost:8088/sankey.html"
  ]);

  await sleep(1500);
  const list = await fetchJson("http://localhost:9252/json/list");
  const ws = new WebSocket(list[0].webSocketDebuggerUrl);
  await new Promise(r => ws.onopen = r);
  let id = 1;
  const send = (method, params = {}) => new Promise((resolve) => {
    const curId = id++;
    const handler = (msg) => {
      const res = JSON.parse(msg.data);
      if (res.id === curId) {
        ws.removeEventListener("message", handler);
        resolve(res.result);
      }
    };
    ws.addEventListener("message", handler);
    ws.send(JSON.stringify({ id: curId, method, params }));
  });

  await send("Page.enable");
  await send("Runtime.enable");
  await sleep(2000);

  const res = await send("Runtime.evaluate", {
    expression: `(() => {
      const nodes = [
        { name: "Upper Colorado Mainstem" },
        { name: "Green River Basin" },
        { name: "San Juan River Basin" },
        { name: "Lower Basin Tributaries (Virgin & Little CO)" },
        { name: "Reservoir Storage Drawdown" },
        { name: "Upper Basin Consumptive Uses" },
        { name: "Lake Powell Pool (Glen Canyon Dam)" },
        { name: "Colorado" },
        { name: "Utah" },
        { name: "Wyoming" },
        { name: "New Mexico" },
        { name: "Lake Mead Pool (Hoover Dam Hub)" },
        { name: "Western Slope Gravity Canals" },
        { name: "Trans-Mountain Diversion Tunnels" },
        { name: "Uinta & Green Basin Canals" },
        { name: "Central Utah Project (CUP)" },
        { name: "Upper Green River Irrigation" },
        { name: "San Juan Basin Diversions" },
        { name: "California" },
        { name: "Arizona" },
        { name: "Nevada" },
        { name: "1944 Mexico Treaty" },
        { name: "System Losses & Conveyance" },
        { name: "Western Slope Agriculture" },
        { name: "Front Range Municipalities" },
        { name: "Wasatch Front Municipalities" },
        { name: "All-American Canal (AAC)" },
        { name: "Colorado River Aqueduct (CRA)" },
        { name: "Lower River Gravity Canals (AZ)" },
        { name: "Central Arizona Project (CAP)" },
        { name: "Lake Mead SNWA Intakes" },
        { name: "Morelos Dam & Central Feeder Canal" },
        { name: "Reservoir Open-Water Evaporation" },
        { name: "River Transit & Riparian Losses" },
        { name: "California Agriculture (Imperial & Coachella)" },
        { name: "Southern California Municipal (MWD)" },
        { name: "Arizona Mainstem Agriculture (Yuma & Palo Verde)" },
        { name: "Central Arizona Municipal (Phoenix & Tucson)" },
        { name: "Central Arizona Agriculture & Tribal" },
        { name: "Las Vegas Valley Municipal (SNWA)" },
        { name: "Southern Nevada Irrigation & Parks" },
        { name: "Mexicali Valley Agriculture" },
        { name: "Baja Municipal (Tijuana & Mexicali)" },
        { name: "Atmospheric Evaporation (Mead & Powell)" },
        { name: "Riparian & Channel Seepage" }
      ];

      const testLinks = [
        // 0 -> 1
        { source: "Upper Colorado Mainstem", target: "Upper Basin Consumptive Uses", value: 2.50 },
        { source: "Upper Colorado Mainstem", target: "Lake Powell Pool (Glen Canyon Dam)", value: 4.30 },
        { source: "Green River Basin", target: "Upper Basin Consumptive Uses", value: 1.30 },
        { source: "Green River Basin", target: "Lake Powell Pool (Glen Canyon Dam)", value: 2.60 },
        { source: "San Juan River Basin", target: "Upper Basin Consumptive Uses", value: 0.70 },
        { source: "San Juan River Basin", target: "Lake Powell Pool (Glen Canyon Dam)", value: 1.00 },
        { source: "Lower Basin Tributaries (Virgin & Little CO)", target: "Lake Mead Pool (Hoover Dam Hub)", value: 0.45 },
        { source: "Reservoir Storage Drawdown", target: "Lake Mead Pool (Hoover Dam Hub)", value: 2.05 },

        // 1 -> 2
        { source: "Upper Basin Consumptive Uses", target: "Colorado", value: 2.33 },
        { source: "Upper Basin Consumptive Uses", target: "Utah", value: 1.04 },
        { source: "Upper Basin Consumptive Uses", target: "Wyoming", value: 0.63 },
        { source: "Upper Basin Consumptive Uses", target: "New Mexico", value: 0.50 },
        { source: "Lake Powell Pool (Glen Canyon Dam)", target: "Lake Mead Pool (Hoover Dam Hub)", value: 7.90 },

        // 2 -> 3
        { source: "Colorado", target: "Western Slope Gravity Canals", value: 1.85 },
        { source: "Colorado", target: "Trans-Mountain Diversion Tunnels", value: 0.48 },
        { source: "Utah", target: "Uinta & Green Basin Canals", value: 0.92 },
        { source: "Utah", target: "Central Utah Project (CUP)", value: 0.12 },
        { source: "Wyoming", target: "Upper Green River Irrigation", value: 0.63 },
        { source: "New Mexico", target: "San Juan Basin Diversions", value: 0.50 },

        { source: "Lake Mead Pool (Hoover Dam Hub)", target: "California", value: 4.40 },
        { source: "Lake Mead Pool (Hoover Dam Hub)", target: "Arizona", value: 2.80 },
        { source: "Lake Mead Pool (Hoover Dam Hub)", target: "Nevada", value: 0.30 },
        { source: "Lake Mead Pool (Hoover Dam Hub)", target: "1944 Mexico Treaty", value: 1.50 },
        { source: "Lake Mead Pool (Hoover Dam Hub)", target: "System Losses & Conveyance", value: 1.40 },

        // 3 -> 4
        { source: "Western Slope Gravity Canals", target: "Western Slope Agriculture", value: 1.85 },
        { source: "Trans-Mountain Diversion Tunnels", target: "Front Range Municipalities", value: 0.48 },
        { source: "Uinta & Green Basin Canals", target: "Western Slope Agriculture", value: 0.92 },
        { source: "Central Utah Project (CUP)", target: "Wasatch Front Municipalities", value: 0.12 },
        { source: "Upper Green River Irrigation", target: "Western Slope Agriculture", value: 0.63 },
        { source: "San Juan Basin Diversions", target: "Western Slope Agriculture", value: 0.50 },

        { source: "California", target: "All-American Canal (AAC)", value: 3.40 },
        { source: "California", target: "Colorado River Aqueduct (CRA)", value: 1.00 },
        { source: "Arizona", target: "Lower River Gravity Canals (AZ)", value: 1.45 },
        { source: "Arizona", target: "Central Arizona Project (CAP)", value: 1.35 },
        { source: "Nevada", target: "Lake Mead SNWA Intakes", value: 0.30 },
        { source: "1944 Mexico Treaty", target: "Morelos Dam & Central Feeder Canal", value: 1.50 },
        { source: "System Losses & Conveyance", target: "Reservoir Open-Water Evaporation", value: 0.90 },
        { source: "System Losses & Conveyance", target: "River Transit & Riparian Losses", value: 0.50 },

        // 4 -> 5
        { source: "All-American Canal (AAC)", target: "California Agriculture (Imperial & Coachella)", value: 3.40 },
        { source: "Colorado River Aqueduct (CRA)", target: "Southern California Municipal (MWD)", value: 1.00 },
        { source: "Lower River Gravity Canals (AZ)", target: "Arizona Mainstem Agriculture (Yuma & Palo Verde)", value: 1.45 },
        { source: "Central Arizona Project (CAP)", target: "Central Arizona Municipal (Phoenix & Tucson)", value: 0.90 },
        { source: "Central Arizona Project (CAP)", target: "Central Arizona Agriculture & Tribal", value: 0.45 },
        { source: "Lake Mead SNWA Intakes", target: "Las Vegas Valley Municipal (SNWA)", value: 0.28 },
        { source: "Lake Mead SNWA Intakes", target: "Southern Nevada Irrigation & Parks", value: 0.02 },
        { source: "Morelos Dam & Central Feeder Canal", target: "Mexicali Valley Agriculture", value: 1.25 },
        { source: "Morelos Dam & Central Feeder Canal", target: "Baja Municipal (Tijuana & Mexicali)", value: 0.25 },
        { source: "Reservoir Open-Water Evaporation", target: "Atmospheric Evaporation (Mead & Powell)", value: 0.90 },
        { source: "River Transit & Riparian Losses", target: "Riparian & Channel Seepage", value: 0.50 }
      ];

      try {
        const sk = d3.sankey().nodeId(d => d.name).nodeSort(null);
        const g = sk({ nodes: nodes.map(d => Object.assign({}, d)), links: testLinks.map(d => Object.assign({}, d)) });
        const depths = {};
        g.nodes.forEach(n => {
          if (!depths[n.depth]) depths[n.depth] = [];
          depths[n.depth].push(n.name);
        });
        return { success: true, depths: depths };
      } catch (e) {
        return { error: e.message };
      }
    })()`,
    returnByValue: true
  });

  console.log("6-column natural test result:", JSON.stringify(res.result.value, null, 2));

  ws.close();
  chrome.kill();
}
run();
