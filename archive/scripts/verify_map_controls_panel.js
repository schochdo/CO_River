const { spawn } = require("child_process");
const http = require("http");
const fs = require("fs");
const path = require("path");

const WEB_DIR = "/Users/macstudio/Documents/Antigravity/CO_River/web";
const ARTIFACTS_DIR = "/Users/macstudio/.gemini/antigravity/brain/aad5e810-76c0-4f7e-a9c4-9eb2855ee883";
const PORT = 8099;

function startServer() {
  const mimeTypes = {
    ".html": "text/html",
    ".css": "text/css",
    ".js": "application/javascript",
    ".json": "application/json",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".svg": "image/svg+xml"
  };

  const server = http.createServer((req, res) => {
    let reqPath = req.url.split("?")[0];
    if (reqPath === "/") reqPath = "/index.html";
    const filePath = path.join(WEB_DIR, reqPath);
    if (!fs.existsSync(filePath)) {
      res.writeHead(404);
      res.end("Not Found");
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    const contentType = mimeTypes[ext] || "application/octet-stream";
    res.writeHead(200, { "Content-Type": contentType });
    fs.createReadStream(filePath).pipe(res);
  });

  return new Promise((resolve) => {
    server.listen(PORT, () => {
      console.log(`Server listening on http://localhost:${PORT}`);
      resolve(server);
    });
  });
}

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
  const server = await startServer();
  const chrome = spawn("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", [
    "--headless=new",
    "--remote-debugging-port=9288",
    "--user-data-dir=/tmp/chrome-test-profile",
    "--no-sandbox",
    "--disable-gpu",
    "--window-size=1440,900"
  ]);

  await sleep(1500);

  try {
    const targets = await fetchJson("http://127.0.0.1:9288/json");
    const pageTarget = targets.find(t => t.type === "page");
    const client = new CDPClient(pageTarget.webSocketDebuggerUrl);
    await client.connect();
    await client.send("Page.enable");
    await client.send("DOM.enable");

    console.log("Navigating to map_embed.html...");
    await client.send("Page.navigate", { url: `http://localhost:${PORT}/map_embed.html` });
    await sleep(2500);

    // 1. Open Map Controls dropdown (Layers Tab)
    console.log("Opening Map Controls (Layers)...");
    await client.send("Runtime.evaluate", {
      expression: `(() => {
        const btn = document.querySelector('#map-menu-btn');
        if (btn) btn.click();
      })()`
    });
    await sleep(1000);

    // Check computed styles of layers pane and items
    const layersStyles = await client.send("Runtime.evaluate", {
      expression: `(() => {
        const dropdown = document.querySelector('#map-menu-dropdown');
        const pane = document.querySelector('#pane-layers');
        const toggle = document.querySelector('#pane-layers .toggle-label');
        const dStyle = window.getComputedStyle(dropdown);
        const pStyle = window.getComputedStyle(pane);
        const tStyle = window.getComputedStyle(toggle);
        return {
          dropdownBg: dStyle.backgroundColor,
          dropdownBorder: dStyle.borderTopColor + ' ' + dStyle.borderTopWidth,
          paneBg: pStyle.backgroundColor,
          paneBorder: pStyle.borderTopColor + ' ' + pStyle.borderTopWidth,
          paneRadius: pStyle.borderRadius,
          toggleBg: tStyle.backgroundColor,
          toggleBorder: tStyle.borderTopColor + ' ' + tStyle.borderTopWidth,
          toggleRadius: tStyle.borderRadius
        };
      })()`,
      returnByValue: true
    });
    console.log("Layers Computed Styles:", JSON.stringify(layersStyles.result.value, null, 2));

    // Check slider dimensions
    const sliderCheck = await client.send("Runtime.evaluate", {
      expression: `(() => {
        const slider = document.querySelector('.slider');
        const sStyle = window.getComputedStyle(slider);
        return {
          width: sStyle.width,
          height: sStyle.height,
          borderRadius: sStyle.borderRadius
        };
      })()`,
      returnByValue: true
    });
    console.log("Slider Computed Dimensions:", JSON.stringify(sliderCheck.result.value, null, 2));

    const shotLayers = await client.send("Page.captureScreenshot", { format: "png" });
    fs.writeFileSync(path.join(ARTIFACTS_DIR, "verified_compact_layers_panel.png"), Buffer.from(shotLayers.data, "base64"));
    fs.writeFileSync(path.join(ARTIFACTS_DIR, "verified_map_controls_layers.png"), Buffer.from(shotLayers.data, "base64"));
    console.log("Captured verified_compact_layers_panel.png");

    // 2. Switch to Basemap Tab
    console.log("Switching to Basemap tab...");
    await client.send("Runtime.evaluate", {
      expression: `(() => {
        const tabBtn = document.querySelector('#tab-btn-basemaps');
        if (tabBtn) tabBtn.click();
      })()`
    });
    await sleep(800);

    const shotBasemap = await client.send("Page.captureScreenshot", { format: "png" });
    fs.writeFileSync(path.join(ARTIFACTS_DIR, "verified_compact_basemap_panel.png"), Buffer.from(shotBasemap.data, "base64"));
    fs.writeFileSync(path.join(ARTIFACTS_DIR, "verified_map_controls_basemap.png"), Buffer.from(shotBasemap.data, "base64"));
    console.log("Captured verified_compact_basemap_panel.png");

    // Close Map Controls dropdown
    await client.send("Runtime.evaluate", {
      expression: `(() => {
        const btn = document.querySelector('#map-menu-btn');
        if (btn) btn.click();
      })()`
    });
    await sleep(500);

    // 3. Test Map Legend in Expanded State
    console.log("Expanding Map Legend...");
    await client.send("Runtime.evaluate", {
      expression: `(() => {
        const leg = document.querySelector('#map-legend');
        if (leg && leg.classList.contains('collapsed')) {
          const toggle = leg.querySelector('.legend-header-toggle');
          if (toggle) toggle.click();
        }
      })()`
    });
    await sleep(800);

    const legendExpandedStyles = await client.send("Runtime.evaluate", {
      expression: `(() => {
        const leg = document.querySelector('#map-legend');
        const header = leg.querySelector('.legend-header-toggle');
        const h4 = leg.querySelector('h4');
        const content = leg.querySelector('.legend-content');
        const lStyle = window.getComputedStyle(leg);
        const hStyle = window.getComputedStyle(header);
        const tStyle = window.getComputedStyle(h4);
        const cStyle = window.getComputedStyle(content);
        return {
          legendBg: lStyle.backgroundColor,
          headerBg: hStyle.backgroundColor,
          titleColor: tStyle.color,
          contentBg: cStyle.backgroundColor
        };
      })()`,
      returnByValue: true
    });
    console.log("Legend Expanded Styles:", JSON.stringify(legendExpandedStyles.result.value, null, 2));

    const shotLegendExpanded = await client.send("Page.captureScreenshot", { format: "png" });
    fs.writeFileSync(path.join(ARTIFACTS_DIR, "verified_legend_expanded_reversed.png"), Buffer.from(shotLegendExpanded.data, "base64"));
    console.log("Captured verified_legend_expanded_reversed.png");

    // 4. Test Map Legend in Collapsed State
    console.log("Collapsing Map Legend...");
    await client.send("Runtime.evaluate", {
      expression: `(() => {
        const leg = document.querySelector('#map-legend');
        if (leg && !leg.classList.contains('collapsed')) {
          const toggle = leg.querySelector('.legend-header-toggle');
          if (toggle) toggle.click();
        }
      })()`
    });
    await sleep(800);

    const legendCollapsedStyles = await client.send("Runtime.evaluate", {
      expression: `(() => {
        const leg = document.querySelector('#map-legend');
        const h4 = leg.querySelector('h4');
        const lStyle = window.getComputedStyle(leg);
        const tStyle = window.getComputedStyle(h4);
        return {
          legendCollapsedBg: lStyle.backgroundColor,
          titleCollapsedColor: tStyle.color
        };
      })()`,
      returnByValue: true
    });
    console.log("Legend Collapsed Styles:", JSON.stringify(legendCollapsedStyles.result.value, null, 2));

    const shotLegendCollapsed = await client.send("Page.captureScreenshot", { format: "png" });
    fs.writeFileSync(path.join(ARTIFACTS_DIR, "verified_legend_collapsed_reversed.png"), Buffer.from(shotLegendCollapsed.data, "base64"));
    console.log("Captured verified_legend_collapsed_reversed.png");

    // 3. Open Basin Metrics Drawer
    console.log("Opening Basin Metrics drawer...");
    await client.send("Runtime.evaluate", {
      expression: `(() => {
        const expandTab = document.querySelector('#sidebar-expand-tab');
        if (expandTab) expandTab.click();
      })()`
    });
    await sleep(1000);

    const basinStyles = await client.send("Runtime.evaluate", {
      expression: `(() => {
        const panel = document.querySelector('#sidebar-panel');
        const card = document.querySelector('#outflows-card');
        const flowRow = document.querySelector('.flow-bar-row');
        const tab = document.querySelector('#sidebar-expand-tab');
        const pStyle = window.getComputedStyle(panel);
        const cStyle = window.getComputedStyle(card);
        const fStyle = flowRow ? window.getComputedStyle(flowRow) : null;
        const tStyle = tab ? window.getComputedStyle(tab) : null;
        return {
          panelBg: pStyle.backgroundColor,
          cardBg: cStyle.backgroundColor,
          cardBorder: cStyle.borderTopColor + ' ' + cStyle.borderTopWidth,
          flowRowRadius: fStyle ? fStyle.borderRadius : null,
          flowRowBg: fStyle ? fStyle.backgroundColor : null,
          flowRowBorder: fStyle ? fStyle.borderTopColor + ' ' + fStyle.borderTopWidth : null,
          tabActiveBg: tStyle ? tStyle.backgroundColor : null
        };
      })()`,
      returnByValue: true
    });
    console.log("Basin Metrics Computed Styles:", JSON.stringify(basinStyles.result.value, null, 2));

    const shotBasin = await client.send("Page.captureScreenshot", { format: "png" });
    fs.writeFileSync(path.join(ARTIFACTS_DIR, "verified_basin_metrics_comparison.png"), Buffer.from(shotBasin.data, "base64"));
    console.log("Captured verified_basin_metrics_comparison.png");

    // 4. Also check index.html with embedded map
    console.log("Navigating to index.html...");
    await client.send("Page.navigate", { url: `http://localhost:${PORT}/index.html` });
    await sleep(2500);

    console.log("Switching to map tab on index.html...");
    await client.send("Runtime.evaluate", {
      expression: `(() => {
        if (window.setTab) window.setTab('map');
      })()`
    });
    await sleep(2000);

    const shotIndexMap = await client.send("Page.captureScreenshot", { format: "png" });
    fs.writeFileSync(path.join(ARTIFACTS_DIR, "verified_index_system_map.png"), Buffer.from(shotIndexMap.data, "base64"));
    console.log("Captured verified_index_system_map.png");

    client.close();
  } catch (err) {
    console.error("Error during verification:", err);
  } finally {
    chrome.kill();
    server.close();
  }
}

run();
