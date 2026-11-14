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
    '--remote-debugging-port=9350',
    '--headless=new',
    '--use-gl=angle',
    '--enable-webgl',
    '--ignore-gpu-blocklist',
    '--window-size=1440,900',
    'about:blank'
  ]);

  try {
    let targets = null;
    for (let i = 0; i < 30; i++) {
      try {
        const list = await fetchJson('http://localhost:9350/json/list');
        if (list && list.length > 0) {
          targets = list;
          break;
        }
      } catch (e) { await sleep(200); }
    }
    if (!targets) throw new Error('Chrome failed to start');
    const pageTarget = targets.find(t => t.type === 'page') || targets[0];

    const client = new CDPClient(pageTarget.webSocketDebuggerUrl);
    await client.connect();

    await client.send('Page.enable');
    await client.send('Runtime.enable');

    console.log('Navigating to http://localhost:8088/ml_analysis.html ...');
    await client.send('Page.navigate', { url: 'http://localhost:8088/ml_analysis.html' });

    await sleep(2500);

    // 1. Check layout height & scrolling
    const layoutCheck = await client.send('Runtime.evaluate', {
      expression: `(() => {
        const bodyHeight = document.body.offsetHeight;
        const scrollHeight = document.documentElement.scrollHeight;
        const clientHeight = document.documentElement.clientHeight;
        const hasScroll = scrollHeight > clientHeight;
        const pillText = document.getElementById('status-pill')?.textContent?.trim();
        return {
          windowInnerHeight: window.innerHeight,
          scrollHeight,
          clientHeight,
          hasScroll,
          pillText
        };
      })()`,
      returnByValue: true
    });
    console.log('Layout check:', layoutCheck.result.value);

    // Capture initial screenshot
    let scr = await client.send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync('/Users/macstudio/.gemini/antigravity/brain/58cfdbf8-91b4-4263-ad4e-596d29fac1a2/verified_ml_redesign_default.png', Buffer.from(scr.data, 'base64'));
    console.log('Saved verified_ml_redesign_default.png');

    // 2. Click a river (San Juan at Bluff)
    const selectSanJuan = await client.send('Runtime.evaluate', {
      expression: `(() => {
        selectRiver('san_juan_bluff');
        return document.getElementById('status-pill')?.textContent?.trim();
      })()`,
      returnByValue: true
    });
    console.log('Selected San Juan:', selectSanJuan.result.value);
    await sleep(800);

    scr = await client.send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync('/Users/macstudio/.gemini/antigravity/brain/58cfdbf8-91b4-4263-ad4e-596d29fac1a2/verified_ml_redesign_sanjuan_selected.png', Buffer.from(scr.data, 'base64'));
    console.log('Saved verified_ml_redesign_sanjuan_selected.png');

    // 3. Click regime filter [Snowmelt Rivers]
    const filterSnow = await client.send('Runtime.evaluate', {
      expression: `(() => {
        filterRegime('snowmelt');
        return document.getElementById('status-pill')?.textContent?.trim();
      })()`,
      returnByValue: true
    });
    console.log('Filtered Snowmelt:', filterSnow.result.value);
    await sleep(800);

    scr = await client.send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync('/Users/macstudio/.gemini/antigravity/brain/58cfdbf8-91b4-4263-ad4e-596d29fac1a2/verified_ml_redesign_snowmelt_filter.png', Buffer.from(scr.data, 'base64'));
    console.log('Saved verified_ml_redesign_snowmelt_filter.png');

    client.close();
  } finally {
    chrome.kill();
  }
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
