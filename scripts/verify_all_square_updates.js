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

async function verifyAll() {
  const chrome = spawn("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", [
    "--headless=new",
    "--remote-debugging-port=9277",
    "--no-sandbox",
    "--disable-gpu",
    "--window-size=1440,900"
  ]);

  await sleep(1200);
  try {
    const targets = await fetchJson("http://localhost:9277/json");
    const pageTarget = targets.find(t => t.type === "page");
    const client = new CDPClient(pageTarget.webSocketDebuggerUrl);
    await client.connect();
    await client.send("Page.enable");

    // 1. Check web/pipeline.html Flow Schematic
    await client.send("Page.navigate", { url: "http://localhost:8088/pipeline.html" });
    await sleep(2000);
    const shotSchematic = await client.send("Page.captureScreenshot", { format: "png" });
    fs.writeFileSync("/Users/macstudio/.gemini/antigravity/brain/aad5e810-76c0-4f7e-a9c4-9eb2855ee883/verified_square_flow_schematic.png", Buffer.from(shotSchematic.data, "base64"));
    console.log("Captured verified_square_flow_schematic.png");

    // 2. Check web/pipeline.html Elevation Profile
    await client.send("Runtime.evaluate", { expression: "switchPipelineSubtab('elevation')" });
    await sleep(1500);
    const shotElevation = await client.send("Page.captureScreenshot", { format: "png" });
    fs.writeFileSync("/Users/macstudio/.gemini/antigravity/brain/aad5e810-76c0-4f7e-a9c4-9eb2855ee883/verified_square_elevation_profile.png", Buffer.from(shotElevation.data, "base64"));
    console.log("Captured verified_square_elevation_profile.png");

    // 3. Check web/ml_analysis.html (Option 1: 7 independent tributaries, 0 duplicates)
    await client.send("Page.navigate", { url: "http://localhost:8088/ml_analysis.html" });
    await sleep(2000);
    const mlCheck = await client.send("Runtime.evaluate", {
      expression: `(() => {
        return {
          riverCount: RIVERS.length,
          rivers: RIVERS.map(r => ({ id: r.id, name: r.name, y: r.y, sharePct: r.sharePct, rbi: r.rbi })),
          sumVolume: RIVERS.reduce((acc, r) => acc + r.y, 0).toFixed(2),
          sumPct: RIVERS.reduce((acc, r) => acc + r.sharePct, 0)
        };
      })()`,
      returnByValue: true
    });
    console.log("ML Analysis River Data:\n", JSON.stringify(mlCheck.result.value, null, 2));

    const shotML = await client.send("Page.captureScreenshot", { format: "png" });
    fs.writeFileSync("/Users/macstudio/.gemini/antigravity/brain/aad5e810-76c0-4f7e-a9c4-9eb2855ee883/verified_ml_analysis_independent_tributaries.png", Buffer.from(shotML.data, "base64"));
    console.log("Captured verified_ml_analysis_independent_tributaries.png");

    // 4. Check web/index.html Map tab: zoom +- controls, legend toggle, collapse icon
    await client.send("Page.navigate", { url: "http://localhost:8088/index.html" });
    await sleep(2500);

    const mapControlsCheck = await client.send("Runtime.evaluate", {
      expression: `(() => {
        const iframe = document.querySelector("#tab-map iframe") || document.querySelector("iframe");
        const doc = iframe ? iframe.contentDocument : document;
        const zoomCtrl = doc.querySelector(".maplibregl-ctrl-group");
        const collapseIcons = Array.from(doc.querySelectorAll(".collapse-icon"));
        const legendToggle = doc.querySelector(".legend-toggle-chevron");

        return {
          zoomCtrlRadius: zoomCtrl ? window.getComputedStyle(zoomCtrl).borderRadius : "none",
          collapseIconRadius: collapseIcons.length > 0 ? window.getComputedStyle(collapseIcons[0]).borderRadius : "none",
          legendToggleRadius: legendToggle ? window.getComputedStyle(legendToggle).borderRadius : "none",
          collapseIconCount: collapseIcons.length
        };
      })()`,
      returnByValue: true
    });
    console.log("Map Controls & Toggles Computed Radii:\n", JSON.stringify(mapControlsCheck.result.value, null, 2));

    const shotMap = await client.send("Page.captureScreenshot", { format: "png" });
    fs.writeFileSync("/Users/macstudio/.gemini/antigravity/brain/aad5e810-76c0-4f7e-a9c4-9eb2855ee883/verified_map_square_controls.png", Buffer.from(shotMap.data, "base64"));
    console.log("Captured verified_map_square_controls.png");

    // 5. Open Basin Metrics Drawer to inspect collapse-icons and cards
    await client.send("Runtime.evaluate", {
      expression: `(() => {
        const iframe = document.querySelector("#tab-map iframe") || document.querySelector("iframe");
        const doc = iframe ? iframe.contentDocument : document;
        const expandTab = doc.querySelector(".sidebar-expand-tab");
        if (expandTab) expandTab.click();
      })()`
    });
    await sleep(1500);
    const shotDrawer = await client.send("Page.captureScreenshot", { format: "png" });
    fs.writeFileSync("/Users/macstudio/.gemini/antigravity/brain/aad5e810-76c0-4f7e-a9c4-9eb2855ee883/verified_drawer_square_collapse_icons.png", Buffer.from(shotDrawer.data, "base64"));
    console.log("Captured verified_drawer_square_collapse_icons.png");

    // 6. Check web/sankey.html (Proposal 1 & Square architecture)
    await client.send("Runtime.evaluate", { expression: "window.setTab('sankey')" });
    await sleep(2500);
    const shotSankey = await client.send("Page.captureScreenshot", { format: "png" });
    fs.writeFileSync("/Users/macstudio/.gemini/antigravity/brain/aad5e810-76c0-4f7e-a9c4-9eb2855ee883/verified_sankey_proposal1_square.png", Buffer.from(shotSankey.data, "base64"));
    console.log("Captured verified_sankey_proposal1_square.png");

    client.close();
  } catch (err) {
    console.error("Verification error:", err);
  } finally {
    chrome.kill();
  }
}

verifyAll();
