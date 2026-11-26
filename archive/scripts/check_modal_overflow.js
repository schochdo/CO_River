const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const path = require('path');

const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const DEBUG_PORT = 9248;
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

    await cdp.send('Page.navigate', { url: 'http://localhost:8088/index.html' });
    await sleep(2000);

    // Open Data Sources modal
    console.log('Opening API modal...');
    await cdp.send('Runtime.evaluate', { expression: "openApiModal()" });
    await sleep(1000);

    // Find any elements inside #api-modal that have scrollbars (scrollHeight > clientHeight or scrollWidth > clientWidth)
    const scrollables = await cdp.send('Runtime.evaluate', {
      returnByValue: true,
      expression: `
        (() => {
          const modal = document.getElementById('api-modal');
          const all = modal.querySelectorAll('*');
          const results = [];
          all.forEach(el => {
            const hasVScroll = el.scrollHeight > el.clientHeight && el.clientHeight > 0;
            const hasHScroll = el.scrollWidth > el.clientWidth && el.clientWidth > 0;
            const style = window.getComputedStyle(el);
            if ((hasVScroll && (style.overflowY === 'auto' || style.overflowY === 'scroll')) ||
                (hasHScroll && (style.overflowX === 'auto' || style.overflowX === 'scroll'))) {
              results.push({
                tag: el.tagName,
                id: el.id,
                className: el.className,
                hasVScroll,
                hasHScroll,
                scrollHeight: el.scrollHeight,
                clientHeight: el.clientHeight,
                scrollWidth: el.scrollWidth,
                clientWidth: el.clientWidth,
                overflowY: style.overflowY,
                overflowX: style.overflowX,
                textSnippet: el.innerText.substring(0, 50).replace(/\\n/g, ' ')
              });
            }
          });
          return results;
        })()
      `
    });
    console.log('Scrollable elements inside #api-modal:', JSON.stringify(scrollables.result.value, null, 2));

    // Capture screenshot of the modal
    const shot = await cdp.send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(ARTIFACT_DIR, 'verified_data_sources_modal.png'), Buffer.from(shot.data, 'base64'));
    console.log('Saved verified_data_sources_modal.png');

    cdp.close();
  } finally {
    chrome.kill();
  }
}

run().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
