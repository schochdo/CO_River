const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
async function fetchJson(url) {
  return new Promise((res, rej) => {
    http.get(url, (r) => {
      let data = '';
      r.on('data', c => data += c);
      r.on('end', () => res(JSON.parse(data)));
    }).on('error', rej);
  });
}

class CDP {
  constructor(url) { this.url = url; this.ws = null; this.id = 1; this.cbs = new Map(); }
  connect() {
    return new Promise((res, rej) => {
      this.ws = new WebSocket(this.url);
      this.ws.onopen = res;
      this.ws.onerror = rej;
      this.ws.onmessage = (m) => {
        const d = JSON.parse(m.data);
        if (d.id && this.cbs.has(d.id)) {
          const cb = this.cbs.get(d.id);
          this.cbs.delete(d.id);
          if (d.error) cb.rej(d.error); else cb.res(d.result);
        }
      };
    });
  }
  send(method, params = {}) {
    const id = this.id++;
    return new Promise((res, rej) => {
      this.cbs.set(id, { res, rej });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }
  close() { if (this.ws) this.ws.close(); }
}

(async () => {
  const chrome = spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', [
    '--headless=new',
    '--remote-debugging-port=9271',
    '--no-sandbox',
    '--disable-gpu',
    '--window-size=1400,950'
  ]);
  await sleep(1500);
  try {
    const targets = await fetchJson('http://localhost:9271/json');
    const page = targets.find(t => t.type === 'page');
    const cdp = new CDP(page.webSocketDebuggerUrl);
    await cdp.connect();
    await cdp.send('Page.enable');
    await cdp.send('Page.navigate', { url: 'http://localhost:8088/pipeline.html' });
    await sleep(2000);

    // 1. Capture Flow Schematic full view
    const shotSchematic = await cdp.send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync('/Users/macstudio/.gemini/antigravity/brain/aad5e810-76c0-4f7e-a9c4-9eb2855ee883/verified_schematic_clean_joins_and_square_cards.png', Buffer.from(shotSchematic.data, 'base64'));
    console.log('Saved verified_schematic_clean_joins_and_square_cards.png');

    // 2. Switch to elevation tab
    await cdp.send('Runtime.evaluate', { expression: 'switchPipelineSubtab("elevation")' });
    await sleep(1500);
    const shotElevation = await cdp.send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync('/Users/macstudio/.gemini/antigravity/brain/aad5e810-76c0-4f7e-a9c4-9eb2855ee883/verified_elevation_labels_restored_square.png', Buffer.from(shotElevation.data, 'base64'));
    console.log('Saved verified_elevation_labels_restored_square.png');

    // 3. Inspect Nevada label and border clearance
    const nvInfo = await cdp.send('Runtime.evaluate', {
      expression: `(() => {
        const nv = document.querySelector("#state-nv");
        const b = nv.getBoundingClientRect();
        return { text: nv.textContent, rect: { x: b.x, y: b.y, w: b.width, h: b.height } };
      })()`,
      returnByValue: true
    });
    console.log('Nevada Label Position:', JSON.stringify(nvInfo.result.value, null, 2));

    // 4. Inspect Legend Box in Schematic
    const legendInfo = await cdp.send('Runtime.evaluate', {
      expression: `(() => {
        const leg = document.querySelector("#legend-box rect");
        const flowLeg = document.querySelector("#flow-width-legend rect");
        return {
          schematicLegendRx: leg ? leg.getAttribute("rx") : null,
          elevationLegendRx: flowLeg ? flowLeg.getAttribute("rx") : null
        };
      })()`,
      returnByValue: true
    });
    console.log('Legend Rx values:', JSON.stringify(legendInfo.result.value, null, 2));

    cdp.close();
  } catch (e) {
    console.error('Error during verification:', e);
  } finally {
    chrome.kill();
  }
})();
