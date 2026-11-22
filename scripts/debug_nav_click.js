const http = require("http");
const { spawn } = require("child_process");

(async () => {
  const chrome = spawn("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", [
    "--remote-debugging-port=9251",
    "--headless=new",
    "--no-sandbox",
    "--window-size=1400,900",
    "http://localhost:8088/index.html"
  ]);
  await new Promise(r => setTimeout(r, 1500));
  try {
    const targets = await new Promise((r, j) => http.get("http://localhost:9251/json/list", res => {
      let d = ""; res.on("data", c => d += c); res.on("end", () => r(JSON.parse(d)));
    }).on("error", j));
    const pt = targets.find(t => t.type === "page");
    const ws = new WebSocket(pt.webSocketDebuggerUrl);
    await new Promise(r => ws.onopen = r);
    let id = 1;
    const send = (m, p = {}) => new Promise(r => {
      const curId = id++;
      const handler = (msg) => {
        const d = JSON.parse(msg.data);
        if (d.id === curId) { ws.removeEventListener("message", handler); r(d.result); }
      };
      ws.addEventListener("message", handler);
      ws.send(JSON.stringify({ id: curId, method: m, params: p }));
    });
    await send("Page.enable");
    await send("Runtime.enable");
    await new Promise(r => setTimeout(r, 2000));

    const tabs = ['map', 'pipeline', 'sankey', 'reservoirs', 'telemetry', 'ml', 'overview'];
    for (const targetTab of tabs) {
      console.log(`\nTesting switch to ${targetTab}...`);
      const script = `
        (() => {
          const log = [];
          const track = (tag) => {
            const items = Array.from(document.querySelectorAll("nav .sidebar-link")).map(el => {
              const r = el.getBoundingClientRect();
              const span = el.querySelector("span");
              const spanR = span ? span.getBoundingClientRect() : null;
              return {
                id: el.id,
                top: r.top,
                left: r.left,
                width: r.width,
                height: r.height,
                spanLeft: spanR ? spanR.left : 0,
                spanTop: spanR ? spanR.top : 0
              };
            });
            const aside = document.querySelector(".sidebar-academic").getBoundingClientRect();
            log.push({ tag, asideWidth: aside.width, items });
          };

          track("before");
          document.getElementById("tab-btn-${targetTab}").click();
          track("after_sync");
          return log;
        })()
      `;
      const evalRes = await send("Runtime.evaluate", { expression: script, returnByValue: true });
      const [before, after] = evalRes.result.value;
      if (Math.abs(before.asideWidth - after.asideWidth) > 0.1) {
        console.log(`ASIDE WIDTH CHANGED! ${before.asideWidth} -> ${after.asideWidth}`);
      }
      before.items.forEach((item, idx) => {
        const next = after.items[idx];
        const dTop = next.top - item.top;
        const dLeft = next.left - item.left;
        const dW = next.width - item.width;
        const dH = next.height - item.height;
        if (Math.abs(dTop) > 0.1 || Math.abs(dLeft) > 0.1 || Math.abs(dW) > 0.1 || Math.abs(dH) > 0.1) {
          console.log(`  Item ${item.id} shifted! dTop: ${dTop.toFixed(2)}, dLeft: ${dLeft.toFixed(2)}, dW: ${dW.toFixed(2)}, dH: ${dH.toFixed(2)}`);
        }
      });
      await new Promise(r => setTimeout(r, 200));
    }

  } finally {
    chrome.kill("SIGKILL");
  }
})();
