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
    '--remote-debugging-port=9272',
    '--no-sandbox',
    '--disable-gpu',
    '--window-size=1400,950'
  ]);
  await sleep(1500);
  try {
    const targets = await fetchJson('http://localhost:9272/json');
    const page = targets.find(t => t.type === 'page');
    const cdp = new CDP(page.webSocketDebuggerUrl);
    await cdp.connect();
    await cdp.send('Page.enable');
    await cdp.send('Page.navigate', { url: 'http://localhost:8088/pipeline.html' });
    await sleep(2000);

    // Get bounding box of Headwaters card and junction
    const headwatersBox = await cdp.send('Runtime.evaluate', {
      expression: `(() => {
        const card = document.querySelector("#card-headwaters");
        const b = card.getBoundingClientRect();
        return { x: b.x - 80, y: b.y - 30, width: b.width + 120, height: 260 };
      })()`,
      returnByValue: true
    });
    console.log('Headwaters clip box:', headwatersBox.result.value);

    // Clip of Headwaters / Front Range junction
    const shotCorner = await cdp.send('Page.captureScreenshot', {
      format: 'png',
      clip: {
        x: Math.max(0, headwatersBox.result.value.x),
        y: Math.max(0, headwatersBox.result.value.y),
        width: Math.min(1400, headwatersBox.result.value.width),
        height: Math.min(950, headwatersBox.result.value.height),
        scale: 1
      }
    });
    fs.writeFileSync('/Users/macstudio/.gemini/antigravity/brain/aad5e810-76c0-4f7e-a9c4-9eb2855ee883/verified_clean_join_corner.png', Buffer.from(shotCorner.data, 'base64'));
    console.log('Saved verified_clean_join_corner.png');

    // Get bounding box of Nevada label and surroundings
    const nvBox = await cdp.send('Runtime.evaluate', {
      expression: `(() => {
        const nv = document.querySelector("#state-nv");
        const b = nv.getBoundingClientRect();
        return { x: b.x - 100, y: b.y - 80, width: 280, height: 220 };
      })()`,
      returnByValue: true
    });
    console.log('Nevada clip box:', nvBox.result.value);

    const shotNv = await cdp.send('Page.captureScreenshot', {
      format: 'png',
      clip: {
        x: Math.max(0, nvBox.result.value.x),
        y: Math.max(0, nvBox.result.value.y),
        width: Math.min(1400, nvBox.result.value.width),
        height: Math.min(950, nvBox.result.value.height),
        scale: 1
      }
    });
    fs.writeFileSync('/Users/macstudio/.gemini/antigravity/brain/aad5e810-76c0-4f7e-a9c4-9eb2855ee883/verified_nevada_interior_label.png', Buffer.from(shotNv.data, 'base64'));
    console.log('Saved verified_nevada_interior_label.png');

    // Switch to elevation tab
    await cdp.send('Runtime.evaluate', { expression: 'switchPipelineSubtab("elevation")' });
    await sleep(1500);

    const shotElevFull = await cdp.send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync('/Users/macstudio/.gemini/antigravity/brain/aad5e810-76c0-4f7e-a9c4-9eb2855ee883/verified_elevation_full_profile.png', Buffer.from(shotElevFull.data, 'base64'));
    console.log('Saved verified_elevation_full_profile.png');

    cdp.close();
  } catch (e) {
    console.error('Error during cropped verification:', e);
  } finally {
    chrome.kill();
  }
})();
