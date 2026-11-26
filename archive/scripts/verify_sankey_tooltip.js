const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');

const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Chrome';
const DEBUG_PORT = 9232;
const TARGET_URL = 'http://localhost:8088/sankey.html';
const ARTIFACT_DIR = '/Users/macstudio/.gemini/antigravity/brain/bbab402d-c7b9-479d-b2e0-9fb8404a0e69';

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
  const chromeBin = fs.existsSync('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome')
    ? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
    : '/Applications/Google Chrome.app/Contents/MacOS/Chrome';

  const chrome = spawn(chromeBin, [
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
    await cdp.send('Runtime.enable');
    await cdp.send('Page.navigate', { url: TARGET_URL });
    await sleep(2500);

    // Capture overview
    const overviewShot = await cdp.send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(`${ARTIFACT_DIR}/sankey_editorial_overview.png`, Buffer.from(overviewShot.data, 'base64'));
    console.log('Saved sankey_editorial_overview.png');

    // Trigger hover on Lee's Ferry
    await cdp.send('Runtime.evaluate', {
      expression: `
        (() => {
          const el = document.getElementById('node-leesferry');
          const rect = el.getBoundingClientRect();
          const evt = new MouseEvent('mouseenter', {
            clientX: rect.left + 20,
            clientY: rect.top + 10,
            bubbles: true
          });
          el.dispatchEvent(evt);
        })()
      `
    });
    await sleep(500);

    const leesFerryShot = await cdp.send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(`${ARTIFACT_DIR}/sankey_tooltip_leesferry.png`, Buffer.from(leesFerryShot.data, 'base64'));
    console.log('Saved sankey_tooltip_leesferry.png');

    // Trigger hover on All-American Canal
    await cdp.send('Runtime.evaluate', {
      expression: `
        (() => {
          const prev = document.getElementById('node-leesferry');
          prev.dispatchEvent(new MouseEvent('mouseleave'));
          const el = document.getElementById('div-aac');
          const rect = el.getBoundingClientRect();
          const evt = new MouseEvent('mouseenter', {
            clientX: rect.left + 50,
            clientY: rect.top + 10,
            bubbles: true
          });
          el.dispatchEvent(evt);
        })()
      `
    });
    await sleep(500);

    const aacShot = await cdp.send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(`${ARTIFACT_DIR}/sankey_tooltip_aac.png`, Buffer.from(aacShot.data, 'base64'));
    console.log('Saved sankey_tooltip_aac.png');

    cdp.close();
    chrome.kill();
  } catch (err) {
    console.error(err);
    chrome.kill();
  }
}

run();
