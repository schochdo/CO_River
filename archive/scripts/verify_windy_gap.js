const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
async function fetchJson(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(JSON.parse(data)));
    }).on('error', reject);
  });
}

class CDPClient {
  constructor(wsUrl) { this.wsUrl = wsUrl; this.id = 1; this.callbacks = new Map(); }
  async connect() {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.wsUrl);
      this.ws.onopen = resolve;
      this.ws.onerror = reject;
      this.ws.onmessage = (msg) => {
        const res = JSON.parse(msg.data);
        if (res.id && this.callbacks.has(res.id)) {
          const cb = this.callbacks.get(res.id);
          this.callbacks.delete(res.id);
          if (res.error) cb.reject(res.error); else cb.resolve(res.result);
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
  close() { if (this.ws) this.ws.close(); }
}

async function run() {
  const chrome = spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', [
    '--remote-debugging-port=9335',
    '--headless=new',
    '--use-gl=angle',
    '--enable-webgl',
    '--ignore-gpu-blocklist',
    '--window-size=1200,900',
    'about:blank'
  ]);

  try {
    for (let i = 0; i < 25; i++) {
      try {
        const list = await fetchJson('http://localhost:9335/json/list');
        if (list && list.length > 0) break;
      } catch (e) { await sleep(200); }
    }

    const list = await fetchJson('http://localhost:9335/json/list');
    const pageTarget = list.find(t => t.type === 'page') || list[0];
    const client = new CDPClient(pageTarget.webSocketDebuggerUrl);
    await client.connect();

    await client.send('Page.enable');
    await client.send('Network.enable');
    await client.send('Network.setCacheDisabled', { cacheDisabled: true });
    await client.send('Page.navigate', { url: 'http://localhost:8088/map.html' });
    await sleep(4500);

    // 1. Center at Windy Gap Reservoir
    await client.send('Runtime.evaluate', {
      expression: `
        (() => {
          if (window.map) {
            window.map.jumpTo({ center: [-105.992, 40.106], zoom: 14.0 });
          }
        })()
      `
    });
    await sleep(3000);

    const scr1 = await client.send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync('/Users/macstudio/.gemini/antigravity/brain/58cfdbf8-91b4-4263-ad4e-596d29fac1a2/verified_windy_gap_perfect.png', Buffer.from(scr1.data, 'base64'));
    console.log('Saved verified_windy_gap_perfect.png');

    // 2. Middle Park view showing Williams Fork Dam/Res and Wolford Mtn Dam/Res
    await client.send('Runtime.evaluate', {
      expression: `
        (() => {
          if (window.map) {
            window.map.jumpTo({ center: [-106.30, 40.08], zoom: 10.5 });
          }
        })()
      `
    });
    await sleep(3000);

    const scr2 = await client.send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync('/Users/macstudio/.gemini/antigravity/brain/58cfdbf8-91b4-4263-ad4e-596d29fac1a2/verified_middle_park_perfect.png', Buffer.from(scr2.data, 'base64'));
    console.log('Saved verified_middle_park_perfect.png');

    client.close();
  } finally {
    chrome.kill('SIGKILL');
  }
}

run().catch(console.error);
