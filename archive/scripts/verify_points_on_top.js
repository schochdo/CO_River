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
    '--remote-debugging-port=9305',
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
        const list = await fetchJson('http://localhost:9305/json/list');
        if (list && list.length > 0) break;
      } catch (e) { await sleep(200); }
    }

    const list = await fetchJson('http://localhost:9305/json/list');
    const pageTarget = list.find(t => t.type === 'page') || list[0];
    const client = new CDPClient(pageTarget.webSocketDebuggerUrl);
    await client.connect();

    await client.send('Page.enable');
    await client.send('Network.enable');
    await client.send('Network.setCacheDisabled', { cacheDisabled: true });
    await client.send('Page.navigate', { url: 'http://localhost:8088/map.html' });
    await sleep(4500);

    // Zoom into Glenwood Springs confluence with Flow Health toggle active (matching user's screen)
    await client.send('Runtime.evaluate', {
      expression: `
        (() => {
          const toggle = document.getElementById("toggle-flow-health");
          if (toggle && !toggle.checked) {
            toggle.checked = true;
            toggle.dispatchEvent(new Event("change"));
          }
          if (window.map) {
            window.map.jumpTo({ center: [-107.334, 39.551], zoom: 13.5 });
          }
        })()
      `
    });
    await sleep(3000);

    const scrGlenwood = await client.send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync('/Users/macstudio/.gemini/antigravity/brain/58cfdbf8-91b4-4263-ad4e-596d29fac1a2/verified_points_on_top_glenwood.png', Buffer.from(scrGlenwood.data, 'base64'));
    console.log('Saved verified_points_on_top_glenwood.png');

    // Also verify dam icon over river line at Hoover Dam [-114.7377, 36.0156]
    await client.send('Runtime.evaluate', {
      expression: `
        window.map.jumpTo({ center: [-114.7377, 36.0156], zoom: 13.0 });
      `
    });
    await sleep(2500);

    const scrDam = await client.send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync('/Users/macstudio/.gemini/antigravity/brain/58cfdbf8-91b4-4263-ad4e-596d29fac1a2/verified_dam_on_top.png', Buffer.from(scrDam.data, 'base64'));
    console.log('Saved verified_dam_on_top.png');

    // Report layer order
    const evalLayers = await client.send('Runtime.evaluate', {
      expression: `
        (() => {
          const layers = window.map.getStyle().layers;
          return layers.slice(-8).map(l => l.id);
        })()
      `,
      returnByValue: true
    });
    console.log('Top layers:', evalLayers.result.value);

    client.close();
  } finally {
    chrome.kill('SIGKILL');
  }
}

run().catch(console.error);
