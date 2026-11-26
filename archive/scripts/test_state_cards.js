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
    "--remote-debugging-port=9295",
    "--headless=new",
    "--no-sandbox",
    "--window-size=1800,1350",
    "http://localhost:8088/sankey.html"
  ]);

  await sleep(1500);
  const list = await fetchJson("http://localhost:9295/json/list");
  const cdp = new CDPClient(list[0].webSocketDebuggerUrl);
  await cdp.connect();
  await cdp.send("Page.enable");
  await cdp.send("Runtime.enable");
  await sleep(2000);

  // Test styling and text placement in the live DOM
  await cdp.send("Runtime.evaluate", {
    expression: `(() => {
      // Find all text elements in Column 2 (States)
      const nodesCol2 = Array.from(document.querySelectorAll("g.node")).filter(g => {
        const rect = g.querySelector("rect");
        const x = parseFloat(rect.getAttribute("x"));
        return x > 600 && x < 900;
      });

      nodesCol2.forEach(g => {
        const rect = g.querySelector("rect");
        const text = g.querySelector("text");
        const rectX = parseFloat(rect.getAttribute("x"));
        const rectW = parseFloat(rect.getAttribute("width"));
        // Position to the right!
        text.setAttribute("x", rectX + rectW + 8);
        text.setAttribute("text-anchor", "start");
        const tspans = text.querySelectorAll("tspan");
        tspans.forEach(t => t.setAttribute("x", rectX + rectW + 8));
      });

      // Find all text elements in Column 3 (Canals)
      const nodesCol3 = Array.from(document.querySelectorAll("g.node")).filter(g => {
        const rect = g.querySelector("rect");
        const x = parseFloat(rect.getAttribute("x"));
        return x > 1000 && x < 1300;
      });

      nodesCol3.forEach(g => {
        const rect = g.querySelector("rect");
        const text = g.querySelector("text");
        const rectX = parseFloat(rect.getAttribute("x"));
        const rectW = parseFloat(rect.getAttribute("width"));
        // Position to the right!
        text.setAttribute("x", rectX + rectW + 8);
        text.setAttribute("text-anchor", "start");
        const tspans = text.querySelectorAll("tspan");
        tspans.forEach(t => t.setAttribute("x", rectX + rectW + 8));
      });
    })()`
  });

  await sleep(1000);
  const shot = await cdp.send("Page.captureScreenshot", { format: "png" });
  fs.writeFileSync("/Users/macstudio/.gemini/antigravity/brain/aad5e810-76c0-4f7e-a9c4-9eb2855ee883/sankey_right_align_test.png", Buffer.from(shot.data, "base64"));
  console.log("Saved sankey_right_align_test.png");

  cdp.close();
  chrome.kill();
}
run();
