const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');

const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const DEBUG_PORT = 9224;
const TARGET_URL = 'http://localhost:8088/index.html';
const OUTPUT_PATH = '/Users/macstudio/.gemini/antigravity/brain/020c8971-5c78-4eba-8811-cea3997b058e/main_map_tunnels_barbell_verified.png';

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchJson(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
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
      this.ws.onmessage = (event) => {
        const msg = JSON.parse(event.data);
        if (msg.id && this.callbacks.has(msg.id)) {
          const { resolve, reject } = this.callbacks.get(msg.id);
          this.callbacks.delete(msg.id);
          if (msg.error) {
            reject(new Error(msg.error.message || JSON.stringify(msg.error)));
          } else {
            resolve(msg.result);
          }
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

  close() {
    if (this.ws) this.ws.close();
  }
}

async function main() {
  console.log('Launching Headless Chrome for Tunnels Verification...');
  const chromeProc = spawn(CHROME_PATH, [
    '--headless=new',
    `--remote-debugging-port=${DEBUG_PORT}`,
    '--enable-webgl',
    '--ignore-gpu-blocklist',
    '--use-gl=angle',
    '--use-angle=metal',
    '--window-size=1680,1050',
    'about:blank'
  ]);

  try {
    let version = null;
    for (let i = 0; i < 20; i++) {
      await sleep(250);
      try {
        version = await fetchJson(`http://127.0.0.1:${DEBUG_PORT}/json/version`);
        if (version) break;
      } catch (e) {}
    }

    const targets = await fetchJson(`http://127.0.0.1:${DEBUG_PORT}/json/list`);
    const target = targets.find(t => t.type === 'page') || targets[0];
    const cdp = new CDPClient(target.webSocketDebuggerUrl);
    await cdp.connect();

    await cdp.send('Page.enable');
    await cdp.send('Runtime.enable');
    await cdp.send('Page.navigate', { url: TARGET_URL });

    // Wait for page, map, and tunnels layer to load
    await cdp.send('Runtime.evaluate', {
      expression: `
        new Promise((resolve) => {
          let count = 0;
          const check = () => {
            count++;
            if (window.map && window.map.getSource && window.map.getSource('tunnels')) {
              resolve();
            } else if (count > 50) {
              resolve(); // fallback after 10s
            } else {
              setTimeout(check, 200);
            }
          };
          check();
        })
      `,
      awaitPromise: true
    });

    console.log('Map and geography loaded! Flying to West Slope & Tunnels...');

    // Fly to divide and trigger popup & open outflows card
    await cdp.send('Runtime.evaluate', {
      expression: `
        (() => {
          if (window.map) {
            window.map.jumpTo({ center: [-105.95, 39.75], zoom: 9.6, pitch: 48, bearing: -20 });
          }

          // Open "Where Is the Water Going?" card if collapsed
          const outflowsCard = document.querySelector('.card.outflows-card');
          if (outflowsCard && outflowsCard.classList.contains('collapsed')) {
            const header = outflowsCard.querySelector('.card-header-clickable');
            if (header) header.click();
          }

          // Trigger click on Moffat Tunnel or Roberts Tunnel to show popup
          setTimeout(() => {
            if (window.stationMarkers && window.stationMarkers['MOFTUNCO']) {
              window.stationMarkers['MOFTUNCO'].popup.addTo(window.map);
            } else if (window.stationMarkers && window.stationMarkers['ROBTUNCO']) {
              window.stationMarkers['ROBTUNCO'].popup.addTo(window.map);
            }
          }, 800);
        })()
      `
    });

    // Wait for animation and map render to complete
    await sleep(4000);

    const { data } = await cdp.send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(OUTPUT_PATH, Buffer.from(data, 'base64'));
    console.log(`Saved screenshot to ${OUTPUT_PATH}`);

    cdp.close();
  } catch (err) {
    console.error('Error during screenshot:', err);
  } finally {
    try {
      chromeProc.kill('SIGTERM');
    } catch(e) {}
  }
}

main();
