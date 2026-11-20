const { spawn } = require("child_process");
const fs = require("fs");
const assert = require("assert");

async function run() {
  const chromePath = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
  const chrome = spawn(chromePath, [
    "--headless=new",
    "--remote-debugging-port=9233",
    "--no-sandbox",
    "--disable-gpu",
    "--window-size=1600,1100"
  ]);

  try {
    await new Promise(r => setTimeout(r, 1200));
    const targets = await (await fetch("http://localhost:9233/json")).json();
    const wsUrl = targets[0].webSocketDebuggerUrl;
    const ws = new WebSocket(wsUrl);

    let id = 1;
    const send = (method, params = {}) => new Promise((resolve) => {
      const curId = id++;
      const handler = (evt) => {
        const msg = JSON.parse(evt.data);
        if (msg.id === curId) {
          ws.removeEventListener("message", handler);
          resolve(msg.result || msg);
        }
      };
      ws.addEventListener("message", handler);
      ws.send(JSON.stringify({ id: curId, method, params }));
    });

    await new Promise(r => ws.addEventListener("open", r));
    await send("Page.enable");
    await send("Network.enable");
    await send("Network.setCacheDisabled", { cacheDisabled: true });
    await send("Page.navigate", { url: "http://localhost:8088/pipeline.html" });
    await new Promise(r => setTimeout(r, 2000));

    const result = await send("Runtime.evaluate", {
      expression: `
        (() => {
          const greenCard = document.getElementById("card-green-river");
          const greenRect = greenCard.querySelector("rect");
          const greenW = parseFloat(greenRect.getAttribute("width"));
          const gItems = Array.from(greenCard.querySelectorAll("text")).map(t => {
            const x = parseFloat(t.getAttribute("x"));
            const len = t.getComputedTextLength();
            return {
              text: t.textContent,
              x,
              len,
              marginRight: greenW - (x + len)
            };
          });

          const legend = document.getElementById("legend-box");
          const legendRect = legend.querySelector("rect");
          const legendW = parseFloat(legendRect.getAttribute("width"));
          const lItems = Array.from(legend.querySelectorAll("text")).map(t => {
            const x = parseFloat(t.getAttribute("x"));
            const len = t.getComputedTextLength();
            return {
              text: t.textContent,
              x,
              len,
              marginRight: legendW - (x + len)
            };
          });

          // State layer checks
          const stateLayer = document.getElementById("state-layer");
          const lines = Array.from(stateLayer.querySelectorAll("line, path")).map(el => ({
            tag: el.tagName,
            d: el.getAttribute("d"),
            x1: el.getAttribute("x1"),
            y1: el.getAttribute("y1"),
            x2: el.getAttribute("x2"),
            y2: el.getAttribute("y2")
          }));

          // Virgin river label clearance
          const vrText = Array.from(document.querySelectorAll("text")).find(t => t.textContent === "Virgin River");
          const vrX = vrText ? parseFloat(vrText.getAttribute("x")) : null;

          return {
            greenW,
            gItems,
            legendW,
            lItems,
            lines,
            vrX
          };
        })()
      `,
      returnByValue: true
    });

    const val = result.result.value;
    console.log("Evaluation result:", JSON.stringify(val, null, 2));

    // Assertions
    // 1. Green River card
    assert(val.greenW >= 260, "Green River card width should be >= 260px");
    val.gItems.forEach(item => {
      assert(item.marginRight >= 25, `Green River card item "${item.text}" margin (${item.marginRight}px) should be >= 25px`);
    });
    console.log("✓ Green River card text margins verified (min margin: " + Math.min(...val.gItems.map(i => i.marginRight)).toFixed(1) + "px)");

    // 2. Legend box
    assert(val.legendW >= 255, "Legend box width should be >= 255px");
    val.lItems.forEach(item => {
      assert(item.marginRight >= 25, `Legend box item "${item.text}" margin (${item.marginRight}px) should be >= 25px`);
    });
    console.log("✓ Legend box text margins verified (min margin: " + Math.min(...val.lItems.map(i => i.marginRight)).toFixed(1) + "px)");

    // 3. No jagged dogleg at (360, 430) -> (480, 515)
    const hasOldDogleg = val.lines.some(l => l.d && l.d.includes("360,430"));
    assert(!hasOldDogleg, "State layer should NOT have the unnatural dogleg at (360, 430)");

    // 4. Straight 114th meridian to Lake Mead
    const has114th = val.lines.some(l => l.x1 === "360" && l.x2 === "360" && parseFloat(l.y2) >= 500);
    assert(has114th, "State layer should have continuous 114th meridian to Lake Mead");
    console.log("✓ Nevada eastern meridian border verified (straight to Lake Mead)");

    // 5. Authentic NV diagonal and western border
    const hasDiagonal = val.lines.some(l => l.x1 === "480" && l.y1 === "580" && parseFloat(l.x2) <= 100);
    assert(hasDiagonal, "State layer should have realistic diagonal NV-CA border to Lake Tahoe");
    const hasWestBorder = val.lines.some(l => l.x1 === "80" && l.x2 === "80");
    assert(hasWestBorder, "State layer should have 120th meridian western border for Nevada");
    console.log("✓ Nevada authentic polygon borders verified (Tahoe diagonal + 120th meridian west border)");

    // 6. Virgin river clearance
    assert(val.vrX !== null && val.vrX <= 350, "Virgin river text should have clearance from 114th meridian (x <= 350)");
    console.log("✓ Virgin river label clearance verified (x=" + val.vrX + ")");

    // Capture screenshot
    const shot = await send("Page.captureScreenshot", { format: "png" });
    const outPath = "/Users/macstudio/.gemini/antigravity/brain/58cfdbf8-91b4-4263-ad4e-596d29fac1a2/verified_schematic_realistic_borders.png";
    fs.writeFileSync(outPath, Buffer.from(shot.data, "base64"));
    console.log("✓ Verification screenshot saved to " + outPath);

    console.log("\nALL VERIFICATIONS PASSED SUCCESSFULLY!");
  } finally {
    chrome.kill();
  }
}

run().catch(err => {
  console.error("Verification failed:", err);
  process.exit(1);
});
