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
    '--remote-debugging-port=9345',
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
        const list = await fetchJson('http://localhost:9345/json/list');
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

    const consoleErrors = [];
    client.ws.addEventListener('message', (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.method === 'Runtime.consoleAPICalled') {
          const text = data.params.args.map(a => a.value || a.description).join(' ');
          if (data.params.type === 'error') {
            consoleErrors.push(text);
            console.error('[BROWSER ERROR]', text);
          } else {
            console.log('[BROWSER CONSOLE]', data.params.type, text);
          }
        }
        if (data.method === 'Log.entryAdded' && data.params.entry.level === 'error') {
          consoleErrors.push(data.params.entry.text);
          console.error('[BROWSER LOG ERROR]', data.params.entry.text);
        }
        if (data.method === 'Runtime.exceptionThrown') {
          consoleErrors.push(JSON.stringify(data.params.exceptionDetails));
          console.error('[BROWSER EXCEPTION]', data.params.exceptionDetails);
        }
      } catch (e) {}
    });

    console.log('Navigating to http://localhost:8088/map.html ...');
    await client.send('Page.navigate', { url: 'http://localhost:8088/map.html' });

    // Wait for cachedRiverNetwork
    for (let i = 0; i < 30; i++) {
      const chk = await client.send('Runtime.evaluate', {
        expression: 'Boolean(window.cachedRiverNetwork && window.cachedRiverNetwork.features && window.map)',
        returnByValue: true
      });
      if (chk?.result?.value) break;
      await sleep(500);
    }
    await sleep(2500);

    const evalResult = await client.send('Runtime.evaluate', {
      expression: `(() => {
        if (!window.cachedRiverNetwork) return { error: "No cachedRiverNetwork found" };
        const features = window.cachedRiverNetwork.features || [];
        const requiredReaches = [
          "little_colorado_river",
          "virgin_river",
          "white_river",
          "yampa_river",
          "roaring_fork_river",
          "eagle_river",
          "duchesne_river"
        ];
        const obsoleteReaches = [
          "little_colorado_upper",
          "little_colorado_middle",
          "little_colorado_lower",
          "virgin_river_upper",
          "white_river_upper",
          "yampa_upper",
          "roaring_fork_upper"
        ];
        const results = {};
        for (const r of requiredReaches) {
          const feat = features.find(f => f.properties.reach === r);
          results[r] = feat ? {
            name: feat.properties.name,
            gauge_id: feat.properties.gauge_id,
            flow_cfs: feat.properties.flow_cfs,
            weight: feat.properties.weight,
            category: feat.properties.category,
            geom_type: feat.geometry.type
          } : "MISSING";
        }
        const obsoleteFound = [];
        for (const r of obsoleteReaches) {
          if (features.find(f => f.properties.reach === r)) obsoleteFound.push(r);
        }
        return {
          totalFeatures: features.length,
          results,
          obsoleteFound
        };
      })()`,
      returnByValue: true
    });

    console.log('\n--- RIVER NETWORK EVALUATION RESULTS ---');
    console.log(JSON.stringify(evalResult.result.value, null, 2));

    // Pan map to Little Colorado River at Winslow: [ -110.65, 35.0 ]
    console.log('\nFlying map to Little Colorado River at Winslow (lat 35.0, lon -110.65) ...');
    await client.send('Runtime.evaluate', {
      expression: `(() => {
        if (window.map) {
          window.map.jumpTo({
            center: [-110.65, 35.0],
            zoom: 9.2,
            pitch: 0,
            bearing: 0
          });
        }
      })()`
    });
    await sleep(3000);

    const scrWinslow = await client.send('Page.captureScreenshot', { format: 'png' });
    const outWinslow = '/Users/macstudio/.gemini/antigravity/brain/58cfdbf8-91b4-4263-ad4e-596d29fac1a2/verified_little_colorado_winslow_node_only.png';
    fs.writeFileSync(outWinslow, Buffer.from(scrWinslow.data, 'base64'));
    console.log(`Saved screenshot of Little Colorado River at Winslow to: ${outWinslow}`);

    // Also pan to Yampa River (Echo Park / Maybell)
    console.log('\nFlying map to Yampa River (Maybell to Echo Park) ...');
    await client.send('Runtime.evaluate', {
      expression: `(() => {
        if (window.map) {
          window.map.jumpTo({
            center: [-108.3, 40.5],
            zoom: 8.5,
            pitch: 0,
            bearing: 0
          });
        }
      })()`
    });
    await sleep(3000);

    const scrYampa = await client.send('Page.captureScreenshot', { format: 'png' });
    const outYampa = '/Users/macstudio/.gemini/antigravity/brain/58cfdbf8-91b4-4263-ad4e-596d29fac1a2/verified_yampa_continuous_node_only.png';
    fs.writeFileSync(outYampa, Buffer.from(scrYampa.data, 'base64'));
    console.log(`Saved screenshot of Yampa River to: ${outYampa}`);

    console.log(`\nBrowser console errors encountered: ${consoleErrors.length}`);
    if (consoleErrors.length > 0) {
      console.error(consoleErrors);
    }

    client.close();
  } finally {
    chrome.kill();
  }
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
