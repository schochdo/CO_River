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

async function capture() {
  const chrome = spawn("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", [
    "--remote-debugging-port=9447",
    "--headless=new",
    "--no-sandbox",
    "--window-size=1440,900",
    "http://localhost:8088/sankey.html"
  ]);

  await sleep(1500);
  const list = await fetchJson("http://localhost:9447/json/list");
  const cdp = new CDPClient(list[0].webSocketDebuggerUrl);
  await cdp.connect();
  await cdp.send("Page.enable");
  await sleep(1200);

  // Capture standalone sankey
  const shot1 = await cdp.send("Page.captureScreenshot", { format: "png" });
  fs.writeFileSync("/Users/macstudio/.gemini/antigravity/brain/aad5e810-76c0-4f7e-a9c4-9eb2855ee883/sankey_live_verified_symmetric.png", Buffer.from(shot1.data, "base64"));
  console.log("Saved sankey_live_verified_symmetric.png");

  // Navigate to index.html and switch to Budget tab
  await cdp.send("Page.navigate", { url: "http://localhost:8088/index.html" });
  await sleep(1500);

  // Click the Water Budget tab
  await cdp.send("Runtime.evaluate", {
    expression: `(() => {
      const tabs = Array.from(document.querySelectorAll("button, a"));
      const budgetTab = tabs.find(t => t.textContent.includes("Water Budget"));
      if (budgetTab) budgetTab.click();
      return !!budgetTab;
    })()`
  });
  await sleep(1200);

  const shot2 = await cdp.send("Page.captureScreenshot", { format: "png" });
  fs.writeFileSync("/Users/macstudio/.gemini/antigravity/brain/aad5e810-76c0-4f7e-a9c4-9eb2855ee883/index_budget_tab_verified_symmetric.png", Buffer.from(shot2.data, "base64"));
  console.log("Saved index_budget_tab_verified_symmetric.png");

  cdp.close();
  chrome.kill();
}

capture().catch(console.error);
