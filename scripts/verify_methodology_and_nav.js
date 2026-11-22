const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const path = require('path');

const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const DEBUG_PORT = 9244;
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

async function captureUrl(client, url, filename, waitMs = 1500, evalFn = null) {
  await client.send('Page.navigate', { url });
  await sleep(waitMs);
  if (evalFn) {
    await client.send('Runtime.evaluate', { expression: evalFn });
    await sleep(500);
  }
  const { data } = await client.send('Page.captureScreenshot', { format: 'png' });
  const outPath = path.join(ARTIFACT_DIR, filename);
  fs.writeFileSync(outPath, Buffer.from(data, 'base64'));
  console.log(`Saved screenshot: ${outPath}`);
  return outPath;
}

async function run() {
  const chrome = spawn(CHROME_PATH, [
    `--remote-debugging-port=${DEBUG_PORT}`,
    '--headless=new',
    '--no-sandbox',
    '--window-size=1600,1200',
    'about:blank'
  ]);

  try {
    let list = null;
    for (let i = 0; i < 20; i++) {
      try {
        list = await fetchJson(`http://localhost:${DEBUG_PORT}/json/list`);
        if (list && list.length > 0) break;
      } catch (e) {
        await sleep(250);
      }
    }

    if (!list || list.length === 0) throw new Error('Chrome did not launch in time');
    const pageTarget = list.find(t => t.type === 'page') || list[0];
    const client = new CDPClient(pageTarget.webSocketDebuggerUrl);
    await client.connect();

    await client.send('Page.enable');
    await client.send('Runtime.enable');

    // 1. Index sidebar with Data Sources & Architecture & Methodology links
    await captureUrl(client, 'http://localhost:8088/index.html', 'verified_sidebar_architecture_link.png', 2000);

    // 2. Index with modal open showing callout
    await captureUrl(
      client,
      'http://localhost:8088/index.html',
      'verified_index_api_modal_callout.png',
      1500,
      `openApiModal();`
    );

    // 3. Standalone methodology.html top & architecture
    await captureUrl(client, 'http://localhost:8088/methodology.html', 'verified_methodology_top.png', 2000);

    // 4. Standalone methodology.html scrolled to pipelines & notebooks
    await captureUrl(
      client,
      'http://localhost:8088/methodology.html',
      'verified_methodology_notebooks.png',
      1000,
      `window.scrollTo(0, 1500);`
    );

    // 5. Standalone data_sources.html
    await captureUrl(client, 'http://localhost:8088/data_sources.html', 'verified_data_sources_split.png', 2000);

    client.close();
  } finally {
    chrome.kill('SIGKILL');
  }
}

run().catch(console.error);
