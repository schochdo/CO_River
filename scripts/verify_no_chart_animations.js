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
    '--window-size=1600,1000',
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
    if (!pageTarget) throw new Error('No target page found');

    const client = new CDPClient(pageTarget.webSocketDebuggerUrl);
    await client.connect();

    await client.send('Page.enable');
    await client.send('Runtime.enable');
    await client.send('Log.enable');

    console.log('1. Testing http://localhost:8088/ml_analysis.html ...');
    await client.send('Page.navigate', { url: 'http://localhost:8088/ml_analysis.html' });

    // Wait for all 4 charts to initialize
    for (let i = 0; i < 30; i++) {
      const chk = await client.send('Runtime.evaluate', {
        expression: 'Boolean(window.chartBubble && window.chartTravel && window.chartCompact && window.chartHydro)',
        returnByValue: true
      });
      if (chk?.result?.value) break;
      await sleep(200);
    }
    await sleep(500);

    const mlAudit = await client.send('Runtime.evaluate', {
      expression: `(() => {
        return {
          chartDefaultsAnimation: Chart.defaults.animation,
          chartDefaultsAnimations: Chart.defaults.animations,
          chartDefaultsTransitions: Chart.defaults.transitions,
          bubbleAnimation: chartBubble.options.animation,
          travelAnimation: chartTravel.options.animation,
          compactAnimation: chartCompact.options.animation,
          hydroAnimation: chartHydro.options.animation
        };
      })()`,
      returnByValue: true
    });

    console.log('ML Analysis Chart Animation Audit:');
    console.log(JSON.stringify(mlAudit.result.value, null, 2));

    // Capture screenshot of instant ML page
    const scrMl = await client.send('Page.captureScreenshot', { format: 'png' });
    const outMl = '/Users/macstudio/.gemini/antigravity/brain/58cfdbf8-91b4-4263-ad4e-596d29fac1a2/verified_no_animations_ml.png';
    fs.writeFileSync(outMl, Buffer.from(scrMl.data, 'base64'));
    console.log(`Saved screenshot of static instant charts to: ${outMl}`);

    console.log('\n2. Testing http://localhost:8088/index.html ...');
    await client.send('Page.navigate', { url: 'http://localhost:8088/index.html' });

    for (let i = 0; i < 30; i++) {
      const chk = await client.send('Runtime.evaluate', {
        expression: 'typeof Chart !== "undefined"',
        returnByValue: true
      });
      if (chk?.result?.value) break;
      await sleep(200);
    }
    await sleep(800);

    const indexAudit = await client.send('Runtime.evaluate', {
      expression: `(() => {
        return {
          chartDefaultsAnimation: Chart.defaults.animation,
          chartDefaultsAnimations: Chart.defaults.animations,
          chartDefaultsTransitions: Chart.defaults.transitions
        };
      })()`,
      returnByValue: true
    });

    console.log('Index Workspace Chart Animation Audit:');
    console.log(JSON.stringify(indexAudit.result.value, null, 2));

    client.close();
  } finally {
    chrome.kill();
  }
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
