const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const path = require('path');

const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const DEBUG_PORT = 9236;
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
    await sleep(1500);
    const list = await fetchJson(`http://localhost:${DEBUG_PORT}/json/list`);
    const client = new CDPClient((list.find(t => t.type === 'page') || list[0]).webSocketDebuggerUrl);
    await client.connect();
    await client.send('Page.enable');
    await client.send('Runtime.enable');
    await client.send('Page.navigate', { url: 'http://localhost:8088/index.html' });
    await sleep(3500);

    // 1. Capture Act 1
    let shot = await client.send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(ARTIFACT_DIR, 'verified_overview_act1.png'), Buffer.from(shot.data, 'base64'));
    console.log('Saved verified_overview_act1.png');

    // 2. Click Act 2
    await client.send('Runtime.evaluate', { expression: `scrollToAct('act-2')` });
    await sleep(1200);
    shot = await client.send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(ARTIFACT_DIR, 'verified_overview_act2.png'), Buffer.from(shot.data, 'base64'));
    console.log('Saved verified_overview_act2.png');

    // 3. Click Act 3
    await client.send('Runtime.evaluate', { expression: `scrollToAct('act-3')` });
    await sleep(1200);
    shot = await client.send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(ARTIFACT_DIR, 'verified_overview_act3.png'), Buffer.from(shot.data, 'base64'));
    console.log('Saved verified_overview_act3.png');

    // 4. Click Act 4
    await client.send('Runtime.evaluate', { expression: `scrollToAct('act-4')` });
    await sleep(1200);
    shot = await client.send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(ARTIFACT_DIR, 'verified_overview_act4.png'), Buffer.from(shot.data, 'base64'));
    console.log('Saved verified_overview_act4.png');

    client.close();
    console.log('All overview act captures succeeded!');
  } finally {
    chrome.kill('SIGTERM');
  }
}
run();
