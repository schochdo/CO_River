const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');

const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const DEBUG_PORT = 9229;
const TARGET_URL = 'http://localhost:8088/map.html?show_canals=1';
const OUTPUT_DIR = '/Users/macstudio/.gemini/antigravity/brain/58cfdbf8-91b4-4263-ad4e-596d29fac1a2';

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
  console.log('Launching Headless Chrome for Canal & Alimentador Central Verification...');
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

    // Wait for map and canals source to load
    await cdp.send('Runtime.evaluate', {
      expression: `
        new Promise((resolve) => {
          let count = 0;
          const check = () => {
            count++;
            if (window.map && window.map.getSource && window.map.getSource('canals') && document.getElementById("flow-dest-chart")) {
              resolve();
            } else if (count > 60) {
              resolve();
            } else {
              setTimeout(check, 250);
            }
          };
          check();
        })
      `,
      awaitPromise: true
    });

    console.log('Map loaded! Waiting for initial data hydration...');
    await sleep(3500);

    // 1. Inspect all 4 canals in GeoJSON source
    const canalProps = await cdp.send('Runtime.evaluate', {
      expression: `
        (() => {
          const src = window.map.getSource('canals');
          if (!src || !src._data) return [];
          return (src._data.features || []).map(f => ({
            id: f.properties.id,
            name: f.properties.name,
            flow_cfs: f.properties.flow_cfs,
            weight: f.properties.weight,
            data_status: f.properties.data_status,
            capacity: f.properties.capacity_cfs
          }));
        })()
      `,
      returnByValue: true
    });
    console.log('Loaded canals in map state:', JSON.stringify(canalProps.result.value, null, 2));

    // 2. Read flow dest chart in sidebar
    const flowDestText = await cdp.send('Runtime.evaluate', {
      expression: `
        (() => {
          const el = document.getElementById("flow-dest-chart");
          return el ? el.innerText : "NOT_FOUND";
        })()
      `
    });
    console.log('Sidebar "Where Is the Water Going?" text:\n', flowDestText.result.value);

    // 3. Trigger handleConduitCardClick for Canal Alimentador Central (09522000)
    console.log('3. Triggering handleConduitCardClick for Canal Alimentador Central...');
    await cdp.send('Runtime.evaluate', {
      expression: `
        (() => {
          if (typeof handleConduitCardClick === 'function') {
            handleConduitCardClick('canal', '09522000', [-114.85, 32.65], 10.2);
          }
        })()
      `
    });
    await sleep(2500);

    const snap1 = await cdp.send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(`${OUTPUT_DIR}/verified_canal_alimentador_central.png`, Buffer.from(snap1.data, 'base64'));
    console.log('Saved verified_canal_alimentador_central.png');

    // 4. Trigger handleConduitCardClick for All-American Canal (09527700)
    console.log('4. Triggering handleConduitCardClick for All-American Canal...');
    await cdp.send('Runtime.evaluate', {
      expression: `
        (() => {
          if (typeof handleConduitCardClick === 'function') {
            handleConduitCardClick('canal', '09527700', [-115.1, 32.78], 9.8);
          }
        })()
      `
    });
    await sleep(2500);

    const snap2 = await cdp.send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(`${OUTPUT_DIR}/verified_all_american_canal.png`, Buffer.from(snap2.data, 'base64'));
    console.log('Saved verified_all_american_canal.png');

    cdp.close();
  } catch (err) {
    console.error('Error during canal verification:', err);
  } finally {
    try {
      chromeProc.kill('SIGTERM');
    } catch(e) {}
  }
}

main();
