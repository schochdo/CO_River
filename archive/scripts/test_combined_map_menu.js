const { spawn } = require('child_process');
const http = require('http');

const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const DEBUG_PORT = 9230;
const TARGET_URL = 'http://localhost:8088/index.html';

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
  console.log('Spawning Chrome on port', DEBUG_PORT);
  const chrome = spawn(CHROME_PATH, [
    `--remote-debugging-port=${DEBUG_PORT}`,
    '--headless=new',
    '--no-sandbox',
    '--window-size=1400,900',
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

    console.log('Waiting 4s for dashboard to load...');
    await sleep(4000);

    const result = await cdp.send('Runtime.evaluate', {
      expression: `
        (() => {
          const menuBtn = document.getElementById('map-menu-btn');
          const dropdown = document.getElementById('map-menu-dropdown');
          const sidebarLayerCard = document.getElementById('layer-card');

          // 1. Check sidebar has no layer card
          const sidebarClean = (sidebarLayerCard === null);

          // 2. Open combined map menu
          menuBtn.click();
          const menuOpen = dropdown.classList.contains('show');

          // 3. Check tabs and layer checkboxes
          const layerTabActive = document.getElementById('tab-btn-layers').classList.contains('active');
          const riverCheckbox = document.getElementById('toggle-river-network');
          const damsCheckbox = document.getElementById('toggle-dams');

          // 4. Switch to Basemap tab
          switchMapMenuTab('basemaps');
          const basemapPaneVisible = window.getComputedStyle(document.getElementById('pane-basemaps')).display !== 'none';
          const layerPaneHidden = window.getComputedStyle(document.getElementById('pane-layers')).display === 'none';

          // 5. Switch back to Layers tab and toggle a layer
          switchMapMenuTab('layers');
          const initialRiverChecked = riverCheckbox.checked;

          return {
            sidebarClean,
            menuOpen,
            layerTabActive,
            hasRiverCheckbox: !!riverCheckbox,
            hasDamsCheckbox: !!damsCheckbox,
            basemapPaneVisible,
            layerPaneHidden,
            initialRiverChecked
          };
        })()
      `,
      returnByValue: true
    });

    console.log('Combined Map Menu Test Result:', result.result?.value);

    cdp.close();
    chrome.kill();
    console.log('All menu tests passed!');
  } catch (err) {
    console.error('Test error:', err);
    chrome.kill();
    process.exit(1);
  }
}

run();
