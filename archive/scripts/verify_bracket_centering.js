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

async function verify() {
  const chrome = spawn("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", [
    "--headless=new",
    "--remote-debugging-port=9233",
    "--no-sandbox",
    "--disable-gpu",
    "--window-size=1440,900"
  ]);

  await sleep(1200);
  try {
    const targets = await fetchJson("http://localhost:9233/json");
    const pageTarget = targets.find(t => t.type === "page");
    const client = new CDPClient(pageTarget.webSocketDebuggerUrl);
    await client.connect();
    await client.send("Page.enable");
    await client.send("Page.navigate", { url: "http://localhost:8088/sankey.html" });
    await sleep(2500);

    const measurements = await client.send("Runtime.evaluate", {
      expression: `(() => {
        const svg = document.querySelector("#sankey-container svg");
        if (!svg) return { error: "No SVG" };

        const allTexts = Array.from(svg.querySelectorAll("text"));
        const bracketTexts = allTexts.filter(t => t.textContent.includes("BASIN")).map(t => {
          const bbox = t.getBBox();
          return {
            text: t.textContent,
            x: bbox.x,
            y: bbox.y,
            width: bbox.width,
            height: bbox.height,
            transform: t.getAttribute("transform"),
            textAnchor: t.getAttribute("text-anchor")
          };
        });

        const stateTexts = Array.from(svg.querySelectorAll("g.node text")).filter(t => {
          const bbox = t.getBBox();
          return bbox.x > 900;
        }).map(t => {
          const bbox = t.getBBox();
          return {
            text: t.textContent.trim(),
            x: bbox.x,
            y: bbox.y,
            width: bbox.width,
            height: bbox.height,
            right: bbox.x + bbox.width,
            bottom: bbox.y + bbox.height
          };
        });

        // Paths for brackets
        const paths = Array.from(svg.querySelectorAll("path")).filter(p => {
          const stroke = p.getAttribute("stroke");
          return (stroke === "#0284c7" || stroke === "#ea580c") && p.getAttribute("stroke-width") === "2.5";
        }).map(p => ({
          d: p.getAttribute("d"),
          stroke: p.getAttribute("stroke")
        }));

        return {
          bracketTexts,
          stateTexts,
          bracketPaths: paths
        };
      })()`,
      returnByValue: true
    });

    console.log("Measurements:\n", JSON.stringify(measurements.result.value, null, 2));

    // Full screen capture
    const shot = await client.send("Page.captureScreenshot", { format: "png" });
    fs.writeFileSync("/Users/macstudio/.gemini/antigravity/brain/aad5e810-76c0-4f7e-a9c4-9eb2855ee883/sankey_centered_brackets_verified.png", Buffer.from(shot.data, "base64"));
    console.log("Saved sankey_centered_brackets_verified.png");

    // Also check index.html budget tab
    await client.send("Page.navigate", { url: "http://localhost:8088/index.html" });
    await sleep(1500);
    await client.send("Runtime.evaluate", { expression: "window.setTab('sankey')" });
    await sleep(2500);

    const shotIndex = await client.send("Page.captureScreenshot", { format: "png" });
    fs.writeFileSync("/Users/macstudio/.gemini/antigravity/brain/aad5e810-76c0-4f7e-a9c4-9eb2855ee883/index_budget_centered_brackets.png", Buffer.from(shotIndex.data, "base64"));
    console.log("Saved index_budget_centered_brackets.png");

    client.close();
  } catch (err) {
    console.error("Error:", err);
  } finally {
    chrome.kill();
  }
}
verify();
