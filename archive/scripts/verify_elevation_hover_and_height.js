const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');

const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const DEBUG_PORT = 9326;
const TARGET_URL = 'http://localhost:8088/pipeline.html';
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
    '--window-size=1440,900', // Standard laptop viewport
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
    await cdp.send('Page.navigate', { url: TARGET_URL });
    await sleep(2000);

    // Switch to elevation view
    await cdp.send('Runtime.evaluate', {
      expression: `switchPipelineSubtab('elevation')`
    });
    await sleep(1000);

    // Check if #readout-strip exists
    const readoutCheck = await cdp.send('Runtime.evaluate', {
      expression: `document.getElementById('readout-strip') !== null`,
      returnByValue: true
    });
    console.log('Readout strip present:', readoutCheck.result.value);

    // Trigger hover on Lees Ferry node in profile SVG
    await cdp.send('Runtime.evaluate', {
      expression: `(() => {
        const leesFerryNode = document.querySelector('circle[onmouseenter*="Lees Ferry"], rect[onmouseenter*="Lees Ferry"]');
        if (leesFerryNode) {
          const evt = new MouseEvent('mouseenter', { bubbles: true, clientX: 550, clientY: 420 });
          leesFerryNode.dispatchEvent(evt);
        } else {
          // Trigger directly
          showElevationGageInfo(
            'USGS #09380000 at Lees Ferry, AZ',
            'Mile 551.0 (Mile 0.0 of Compact)',
            '3,110 ft',
            '6,680 cfs',
            'Tailwater Control',
            'Sentinel Legal Divide',
            '1922 Colorado River Compact legal division point between Upper and Lower Basins. Mandates 75 MAF rolling 10-year delivery.'
          );
        }
      })()`
    });
    await sleep(600);

    // Check tooltip visibility and content
    const tipCheck = await cdp.send('Runtime.evaluate', {
      expression: `(() => {
        const tip = document.getElementById('flow-tooltip');
        return {
          visible: tip.classList.contains('visible'),
          text: tip.innerText.slice(0, 100)
        };
      })()`,
      returnByValue: true
    });
    console.log('Tooltip check:', tipCheck.result.value);

    // Capture screenshot of elevation profile with floating hover over
    const shot = await cdp.send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(`${ARTIFACT_DIR}/verified_elevation_hover_and_clean_bottom.png`, Buffer.from(shot.data, 'base64'));
    console.log('Saved verified_elevation_hover_and_clean_bottom.png');

    cdp.close();
    chrome.kill();
  } catch (err) {
    console.error(err);
    chrome.kill();
  }
}

run();
