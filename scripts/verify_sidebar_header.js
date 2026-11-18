const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const path = require('path');

const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const DEBUG_PORT = 9244;
const ARTIFACT_DIR = '/Users/macstudio/.gemini/antigravity/brain/58cfdbf8-91b4-4263-ad4e-596d29fac1a2';

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
async function fetchJson(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let d = ''; res.on('data', c => d += c); res.on('end', () => resolve(JSON.parse(d)));
    }).on('error', reject);
  });
}

class CDPClient {
  constructor(wsUrl) { this.wsUrl = wsUrl; this.id = 1; this.callbacks = new Map(); }
  async connect() {
    return new Promise((res, rej) => {
      this.ws = new WebSocket(this.wsUrl);
      this.ws.onopen = () => res();
      this.ws.onerror = rej;
      this.ws.onmessage = (msg) => {
        const r = JSON.parse(msg.data);
        if (r.id && this.callbacks.has(r.id)) {
          const cb = this.callbacks.get(r.id);
          this.callbacks.delete(r.id);
          if (r.error) cb.reject(r.error); else cb.resolve(r.result);
        }
      };
    });
  }
  async send(m, p = {}) {
    const id = this.id++;
    return new Promise((resolve, reject) => {
      this.callbacks.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method: m, params: p }));
    });
  }
  close() { if (this.ws) this.ws.close(); }
}

async function run() {
  const chrome = spawn(CHROME_PATH, [
    `--remote-debugging-port=${DEBUG_PORT}`, '--headless=new', '--no-sandbox', '--window-size=1440,960', 'about:blank'
  ]);
  try {
    let wsUrl = null;
    for (let i = 0; i < 30; i++) {
      try {
        const list = await fetchJson(`http://127.0.0.1:${DEBUG_PORT}/json/list`);
        if (list && list[0] && list[0].webSocketDebuggerUrl) {
          wsUrl = list[0].webSocketDebuggerUrl;
          break;
        }
      } catch (e) {}
      await sleep(200);
    }
    const cdp = new CDPClient(wsUrl);
    await cdp.connect();
    await cdp.send('Page.enable');
    await cdp.send('DOM.enable');

    console.log('Navigating to http://localhost:8088/index.html...');
    await cdp.send('Page.navigate', { url: 'http://localhost:8088/index.html' });
    await sleep(2000);

    // Get the bounding box of the sidebar header
    const box = await cdp.send('Runtime.evaluate', {
      returnByValue: true,
      expression: `
        (() => {
          const el = document.querySelector('.sidebar-academic .cursor-pointer');
          const r = el.getBoundingClientRect();
          return {
            x: r.x, y: r.y, width: r.width, height: r.height,
            innerText: el.innerText
          };
        })()
      `
    });
    console.log('Sidebar header box & text:', box.result.value);
    const b = box.result.value;

    const clipShot = await cdp.send('Page.captureScreenshot', {
      format: 'png',
      clip: { x: Math.max(0, Math.round(b.x - 10)), y: Math.max(0, Math.round(b.y - 10)), width: Math.round(b.width + 20), height: Math.round(b.height + 25), scale: 2 }
    });
    fs.writeFileSync(path.join(ARTIFACT_DIR, 'verified_sidebar_brand_header.png'), Buffer.from(clipShot.data, 'base64'));
    console.log('Saved verified_sidebar_brand_header.png');

    // Also capture full sidebar
    const sideBox = await cdp.send('Runtime.evaluate', {
      returnByValue: true,
      expression: `
        (() => {
          const el = document.querySelector('.sidebar-academic');
          const r = el.getBoundingClientRect();
          return { x: r.x, y: r.y, width: r.width, height: r.height };
        })()
      `
    });
    const sb = sideBox.result.value;
    const sideShot = await cdp.send('Page.captureScreenshot', {
      format: 'png',
      clip: { x: Math.round(sb.x), y: Math.round(sb.y), width: Math.round(sb.width), height: Math.min(600, Math.round(sb.height)), scale: 2 }
    });
    fs.writeFileSync(path.join(ARTIFACT_DIR, 'verified_sidebar_full_crop.png'), Buffer.from(sideShot.data, 'base64'));
    console.log('Saved verified_sidebar_full_crop.png');

    cdp.close();
  } finally {
    chrome.kill();
  }
}

run().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
