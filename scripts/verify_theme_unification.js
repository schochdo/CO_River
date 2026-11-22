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
    "--headless=new",
    "--remote-debugging-port=9230",
    "--no-sandbox",
    "--disable-gpu",
    "--window-size=1440,900"
  ]);

  await sleep(1200);
  try {
    const targets = await fetchJson("http://localhost:9230/json");
    const pageTarget = targets.find(t => t.type === "page");
    const client = new CDPClient(pageTarget.webSocketDebuggerUrl);
    await client.connect();
    await client.send("Page.enable");
    await client.send("DOM.enable");

    // 1. Capture Overview Tab
    console.log("Navigating to index.html...");
    await client.send("Page.navigate", { url: "http://localhost:8088/index.html" });
    await sleep(2500);

    const shotOverview = await client.send("Page.captureScreenshot", { format: "png" });
    fs.writeFileSync("/Users/macstudio/.gemini/antigravity/brain/aad5e810-76c0-4f7e-a9c4-9eb2855ee883/theme_unification_overview.png", Buffer.from(shotOverview.data, "base64"));
    console.log("Captured theme_unification_overview.png");

    // Check style values of sidebar and header
    const styleCheck = await client.send("Runtime.evaluate", {
      expression: `(() => {
        const sidebar = document.querySelector('.sidebar-academic');
        const activeLink = document.querySelector('.sidebar-link.active');
        const header = document.querySelector('#academic-top-header');
        const card = document.querySelector('#act-1');
        const sStyle = window.getComputedStyle(sidebar);
        const lStyle = window.getComputedStyle(activeLink);
        const hStyle = window.getComputedStyle(header);
        const cStyle = window.getComputedStyle(card);
        return {
          sidebarBg: sStyle.backgroundColor,
          sidebarBorderRight: sStyle.borderRightColor + ' ' + sStyle.borderRightWidth,
          activeLinkBg: lStyle.backgroundColor,
          activeLinkRadius: lStyle.borderRadius,
          activeLinkBorder: lStyle.borderTopColor + ' ' + lStyle.borderTopWidth,
          headerBg: hStyle.backgroundColor,
          headerBorderBottom: hStyle.borderBottomColor + ' ' + hStyle.borderBottomWidth,
          cardRadius: cStyle.borderRadius,
          cardBorder: cStyle.borderTopColor + ' ' + cStyle.borderTopWidth
        };
      })()`,
      returnByValue: true
    });
    console.log("Overview computed styles:", JSON.stringify(styleCheck.result.value, null, 2));

    // 2. Switch to System Map Tab
    console.log("Switching to map tab...");
    await client.send("Runtime.evaluate", {
      expression: `window.setTab('map')`
    });
    await sleep(3000);

    const shotMap = await client.send("Page.captureScreenshot", { format: "png" });
    fs.writeFileSync("/Users/macstudio/.gemini/antigravity/brain/aad5e810-76c0-4f7e-a9c4-9eb2855ee883/theme_unification_map.png", Buffer.from(shotMap.data, "base64"));
    console.log("Captured theme_unification_map.png");

    // 3. Open Basin Metrics Drawer inside map iframe
    console.log("Toggling Basin Metrics drawer...");
    await client.send("Runtime.evaluate", {
      expression: `(() => {
        const iframe = document.getElementById('iframe-map');
        if (iframe && iframe.contentWindow && iframe.contentWindow.toggleSidebar) {
          iframe.contentWindow.toggleSidebar();
          return true;
        }
        return false;
      })()`,
      returnByValue: true
    });
    await sleep(1500);

    const shotDrawer = await client.send("Page.captureScreenshot", { format: "png" });
    fs.writeFileSync("/Users/macstudio/.gemini/antigravity/brain/aad5e810-76c0-4f7e-a9c4-9eb2855ee883/theme_unification_drawer.png", Buffer.from(shotDrawer.data, "base64"));
    console.log("Captured theme_unification_drawer.png");

    // Check style values of drawer, legend, expand-tab inside map iframe
    const mapStyleCheck = await client.send("Runtime.evaluate", {
      expression: `(() => {
        const iframe = document.getElementById('iframe-map');
        if (!iframe || !iframe.contentDocument) return null;
        const doc = iframe.contentDocument;
        const legend = doc.querySelector('.map-legend');
        const drawer = doc.querySelector('.sidebar-panel');
        const expandTab = doc.querySelector('.sidebar-expand-tab');
        const card = doc.querySelector('.sidebar-panel .card');
        const legStyle = legend ? iframe.contentWindow.getComputedStyle(legend) : null;
        const drawStyle = drawer ? iframe.contentWindow.getComputedStyle(drawer) : null;
        const tabStyle = expandTab ? iframe.contentWindow.getComputedStyle(expandTab) : null;
        const cardStyle = card ? iframe.contentWindow.getComputedStyle(card) : null;
        return {
          legendBg: legStyle ? legStyle.backgroundColor : null,
          legendRadius: legStyle ? legStyle.borderRadius : null,
          legendBorder: legStyle ? legStyle.borderTopColor + ' ' + legStyle.borderTopWidth : null,
          drawerBg: drawStyle ? drawStyle.backgroundColor : null,
          drawerRadius: drawStyle ? drawStyle.borderRadius : null,
          drawerBorder: drawStyle ? drawStyle.borderLeftColor + ' ' + drawStyle.borderLeftWidth : null,
          tabRadius: tabStyle ? tabStyle.borderRadius : null,
          cardRadius: cardStyle ? cardStyle.borderRadius : null
        };
      })()`,
      returnByValue: true
    });
    console.log("Map iframe computed styles:", JSON.stringify(mapStyleCheck.result.value, null, 2));

    client.close();
  } catch (err) {
    console.error("CDP error:", err);
  } finally {
    chrome.kill();
  }
}

run();
