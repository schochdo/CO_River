const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');

const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const DEBUG_PORT = 9225;
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
    '--user-data-dir=/tmp/chrome-test-profile-' + Date.now(),
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

    // Zoom in to Lake Powell & Cataract Canyon
    console.log('Focusing on Lake Powell & Cataract Canyon...');
    await cdp.send('Runtime.evaluate', {
      expression: `
        if (window.map) {
          window.map.flyTo({ center: [-110.85, 37.35], zoom: 8.8, pitch: 0, duration: 0 });
        }
      `
    });
    await sleep(2500);

    // Capture initial Lake Powell view
    console.log('Capturing Lake Powell dual-boundary shoreline...');
    const shot1 = await cdp.send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(`${ARTIFACT_DIR}/lake_powell_dual_boundary.png`, Buffer.from(shot1.data, 'base64'));
    console.log('Captured lake_powell_dual_boundary.png');

    // Click Lake Powell active pool to open popup
    console.log('Triggering click on Lake Powell active pool...');
    await cdp.send('Runtime.evaluate', {
      expression: `
        const features = window.map.queryRenderedFeatures({ layers: ['lake-powell-active-pool'] });
        if (features && features.length > 0) {
          const pt = window.map.project([-111.48, 36.94]);
          const clickEv = {
            lngLat: { lng: -111.48, lat: 36.94 },
            point: pt,
            features: [features[0]]
          };
          window.map.fire('click', clickEv);
        }
      `
    });
    await sleep(1500);

    const shot2 = await cdp.send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(`${ARTIFACT_DIR}/lake_powell_popup_verified.png`, Buffer.from(shot2.data, 'base64'));
    console.log('Captured lake_powell_popup_verified.png');

    // Switch popup to API & Code tab
    console.log('Switching popup to API & Code tab...');
    await cdp.send('Runtime.evaluate', {
      expression: `
        const tabBtn = document.querySelectorAll('.popup-tab-btn')[1];
        if (tabBtn) tabBtn.click();
      `
    });
    await sleep(800);

    const shot3 = await cdp.send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(`${ARTIFACT_DIR}/lake_powell_code_tab_verified.png`, Buffer.from(shot3.data, 'base64'));
    console.log('Captured lake_powell_code_tab_verified.png');

    // Enable Flow Health toggle and verify NO yellow line in Lake Powell
    console.log('Enabling Flow Health layer...');
    await cdp.send('Runtime.evaluate', {
      expression: `
        const cb = document.getElementById('toggle-flow-health');
        if (cb && !cb.checked) {
          cb.click();
        }
      `
    });
    await sleep(1500);

    const shot4 = await cdp.send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(`${ARTIFACT_DIR}/lake_powell_flow_health_verified.png`, Buffer.from(shot4.data, 'base64'));
    console.log('Captured lake_powell_flow_health_verified.png');

    // Open API & Code Modal and verify Chapter 5 Jupyter notebooks
    console.log('Opening API modal...');
    await cdp.send('Runtime.evaluate', { expression: `window.openApiModal();` });
    await sleep(1000);

    const shot5 = await cdp.send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(`${ARTIFACT_DIR}/api_modal_notebooks_verified.png`, Buffer.from(shot5.data, 'base64'));
    console.log('Captured api_modal_notebooks_verified.png');

    cdp.close();
    console.log('Verification run successfully complete!');
  } finally {
    chrome.kill('SIGKILL');
  }
}

run().catch(err => {
  console.error('Test script error:', err);
  process.exit(1);
});
