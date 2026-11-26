const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');

const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const DEBUG_PORT = 9235;
const ARTIFACT_DIR = '/Users/macstudio/.gemini/antigravity/brain/aad5e810-76c0-4f7e-a9c4-9eb2855ee883';

async function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }

async function fetchJson(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); } catch (e) { reject(e); }
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
  const chrome = spawn(CHROME_PATH, [
    `--remote-debugging-port=${DEBUG_PORT}`,
    '--headless=new',
    '--enable-webgl',
    '--ignore-gpu-blocklist',
    '--no-sandbox',
    '--window-size=1600,1200',
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

    const list = await fetchJson(`http://localhost:${DEBUG_PORT}/json/list`);
    const pageTarget = list.find(t => t.type === 'page') || list[0];
    const cdp = new CDPClient(pageTarget.webSocketDebuggerUrl);
    await cdp.connect();
    await cdp.send('Page.enable');
    await cdp.send('DOM.enable');

    // 1. Verify ml_analysis.html
    console.log('Navigating to ml_analysis.html...');
    await cdp.send('Page.navigate', { url: 'http://localhost:8088/ml_analysis.html' });
    await sleep(3500);
    const shotML = await cdp.send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(`${ARTIFACT_DIR}/verified_sourcing_ml_analysis.png`, Buffer.from(shotML.data, 'base64'));
    console.log('Saved verified_sourcing_ml_analysis.png');

    // 2. Verify pipeline.html (Schematic)
    console.log('Navigating to pipeline.html...');
    await cdp.send('Page.navigate', { url: 'http://localhost:8088/pipeline.html' });
    await sleep(3000);
    const shotPipelineSchematic = await cdp.send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(`${ARTIFACT_DIR}/verified_sourcing_pipeline_schematic.png`, Buffer.from(shotPipelineSchematic.data, 'base64'));
    console.log('Saved verified_sourcing_pipeline_schematic.png');

    // Switch to Elevation Profile in pipeline.html
    await cdp.send('Runtime.evaluate', {
      expression: `switchPipelineSubtab('elevation');`
    });
    await sleep(1500);
    const shotPipelineElev = await cdp.send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(`${ARTIFACT_DIR}/verified_sourcing_pipeline_elevation.png`, Buffer.from(shotPipelineElev.data, 'base64'));
    console.log('Saved verified_sourcing_pipeline_elevation.png');

    // 3. Verify sankey.html
    console.log('Navigating to sankey.html...');
    await cdp.send('Page.navigate', { url: 'http://localhost:8088/sankey.html' });
    await sleep(3500);
    // Scroll down slightly so the diagram footer is visible
    await cdp.send('Runtime.evaluate', {
      expression: `window.scrollTo(0, 400);`
    });
    await sleep(800);
    const shotSankey = await cdp.send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(`${ARTIFACT_DIR}/verified_sourcing_sankey_diagram.png`, Buffer.from(shotSankey.data, 'base64'));
    console.log('Saved verified_sourcing_sankey_diagram.png');

    // 4. Verify index.html overview cards
    console.log('Navigating to index.html...');
    await cdp.send('Page.navigate', { url: 'http://localhost:8088/index.html' });
    await sleep(3500);
    // Click on Overview tab if needed
    await cdp.send('Runtime.evaluate', {
      expression: `if (typeof setTab === 'function') setTab('overview');`
    });
    await sleep(1500);
    const shotIndex = await cdp.send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(`${ARTIFACT_DIR}/verified_sourcing_index_overview.png`, Buffer.from(shotIndex.data, 'base64'));
    console.log('Saved verified_sourcing_index_overview.png');

    cdp.close();
    chrome.kill();
  } catch (err) {
    console.error(err);
    chrome.kill();
  }
}

run();
