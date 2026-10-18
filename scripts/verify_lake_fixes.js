const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');

const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const DEBUG_PORT = 9226;
const TARGET_URL = 'http://localhost:8088/index.html';
const ARTIFACT_DIR = '/Users/macstudio/.gemini/antigravity/brain/bbab402d-c7b9-479d-b2e0-9fb8404a0e69';

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

  close() {
    if (this.ws) this.ws.close();
  }
}

async function run() {
  console.log('Launching headless Chrome on port ' + DEBUG_PORT);
  const chrome = spawn(CHROME_PATH, [
    '--headless=new',
    `--remote-debugging-port=${DEBUG_PORT}`,
    '--enable-webgl',
    '--ignore-gpu-blocklist',
    '--use-gl=angle',
    '--use-angle=metal',
    '--no-first-run',
    '--no-default-browser-check',
    '--user-data-dir=/tmp/chrome-lake-test-' + Date.now(),
    '--window-size=1440,900',
    'about:blank'
  ]);

  try {
    let version = null;
    for (let i = 0; i < 20; i++) {
      try {
        version = await fetchJson(`http://localhost:${DEBUG_PORT}/json/version`);
        if (version && version.webSocketDebuggerUrl) break;
      } catch (e) {
        await sleep(250);
      }
    }

    if (!version) throw new Error('Could not connect to Chrome debugging endpoint');

    const list = await fetchJson(`http://localhost:${DEBUG_PORT}/json/list`);
    const pageTarget = list.find(t => t.type === 'page') || list[0];
    const wsUrl = pageTarget.webSocketDebuggerUrl;

    const cdp = new CDPClient(wsUrl);
    await cdp.connect();
    await cdp.send('Page.enable');
    await cdp.send('Runtime.enable');

    console.log('Navigating to ' + TARGET_URL);
    await cdp.send('Page.navigate', { url: TARGET_URL });

    console.log('Waiting 5s for dashboard & MapLibre to load...');
    await sleep(5000);

    // 1. Glen Canyon Dam Connection View
    console.log('Focusing on Glen Canyon Dam tailrace and connection to Lees Ferry...');
    await cdp.send('Runtime.evaluate', {
      expression: `
        if (window.map) {
          window.map.flyTo({ center: [-111.488, 36.925], zoom: 13, pitch: 0, duration: 0 });
        }
      `
    });
    await sleep(2500);

    const shot1 = await cdp.send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(`${ARTIFACT_DIR}/glen_canyon_dam_connection.png`, Buffer.from(shot1.data, 'base64'));
    console.log('Captured glen_canyon_dam_connection.png');

    // 2. Lake Mead / Virgin Basin View
    console.log('Focusing on Lake Mead Virgin Basin / Big Gypsum Ledges...');
    await cdp.send('Runtime.evaluate', {
      expression: `
        if (window.map) {
          window.map.flyTo({ center: [-114.38, 36.22], zoom: 11.5, pitch: 0, duration: 0 });
        }
      `
    });
    await sleep(2500);

    const shot2 = await cdp.send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(`${ARTIFACT_DIR}/lake_mead_virgin_basin.png`, Buffer.from(shot2.data, 'base64'));
    console.log('Captured lake_mead_virgin_basin.png');

    // 3. Lake Powell Overview
    console.log('Focusing on Lake Powell overview...');
    await cdp.send('Runtime.evaluate', {
      expression: `
        if (window.map) {
          window.map.flyTo({ center: [-111.1, 37.2], zoom: 9, pitch: 0, duration: 0 });
        }
      `
    });
    await sleep(2500);

    const shot3 = await cdp.send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(`${ARTIFACT_DIR}/lake_powell_overview.png`, Buffer.from(shot3.data, 'base64'));
    console.log('Captured lake_powell_overview.png');

    // 4. Click Lake Powell to open popup
    console.log('Clicking on Lake Powell to verify popup...');
    await cdp.send('Runtime.evaluate', {
      expression: `
        const features = window.map.queryRenderedFeatures({ layers: ['lakes-fill'] });
        const powellFeat = features.find(f => f.properties && f.properties.GNIS_NAME === 'Lake Powell');
        if (powellFeat) {
          const pt = window.map.project([-111.45, 37.05]);
          const clickEv = {
            lngLat: { lng: -111.45, lat: 37.05 },
            point: pt,
            features: [powellFeat]
          };
          window.map.fire('click', clickEv);
        }
      `
    });
    await sleep(1500);

    const shot4 = await cdp.send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(`${ARTIFACT_DIR}/lake_powell_popup_fixed.png`, Buffer.from(shot4.data, 'base64'));
    console.log('Captured lake_powell_popup_fixed.png');

    console.log('All verification screenshots captured successfully!');
    cdp.close();
  } catch (err) {
    console.error('Error during verification:', err);
  } finally {
    chrome.kill();
  }
}

run();
