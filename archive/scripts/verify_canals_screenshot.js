const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');

const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const DEBUG_PORT = 9227;
const TARGET_URL = 'http://localhost:8088/index.html';
const OUTPUT_DIR = '/Users/macstudio/.gemini/antigravity/brain/020c8971-5c78-4eba-8811-cea3997b058e';

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
  console.log('Launching Headless Chrome for Canal Survey Verification...');
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
            if (window.map && window.map.getSource && window.map.getSource('canals')) {
              resolve();
            } else if (count > 50) {
              resolve();
            } else {
              setTimeout(check, 200);
            }
          };
          check();
        })
      `,
      awaitPromise: true
    });

    console.log('Map loaded! Capturing canal views...');

    // 1. All-American Canal View
    await cdp.send('Runtime.evaluate', {
      expression: `
        (() => {
          if (window.map) {
            window.map.jumpTo({ center: [-115.1, 32.78], zoom: 9.6, pitch: 35, bearing: 0 });
          }
        })()
      `
    });
    await sleep(2500);
    const snap1 = await cdp.send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(`${OUTPUT_DIR}/canal_aac_survey_verified.png`, Buffer.from(snap1.data, 'base64'));
    console.log('Saved canal_aac_survey_verified.png');

    // 2. Central Arizona Project (CAP) & Colorado River Aqueduct (CRA) Intake View at Lake Havasu / Parker Dam
    await cdp.send('Runtime.evaluate', {
      expression: `
        (() => {
          if (window.map) {
            window.map.jumpTo({ center: [-114.15, 34.25], zoom: 10.5, pitch: 42, bearing: -15 });
          }
        })()
      `
    });
    await sleep(2500);
    const snap2 = await cdp.send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(`${OUTPUT_DIR}/canal_intakes_cra_cap_verified.png`, Buffer.from(snap2.data, 'base64'));
    console.log('Saved canal_intakes_cra_cap_verified.png');

    // 3. CAP Overview across Arizona (Whole Lower Basin View)
    await cdp.send('Runtime.evaluate', {
      expression: `
        (() => {
          if (window.map) {
            window.map.jumpTo({ center: [-113.0, 33.5], zoom: 7.6, pitch: 25, bearing: 0 });
          }
        })()
      `
    });
    await sleep(2500);
    const snap3 = await cdp.send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(`${OUTPUT_DIR}/canal_cap_overview_verified.png`, Buffer.from(snap3.data, 'base64'));
    console.log('Saved canal_cap_overview_verified.png');

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
