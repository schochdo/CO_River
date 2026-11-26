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
    '--remote-debugging-port=9340',
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
        const list = await fetchJson('http://localhost:9340/json/list');
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

    client.ws.addEventListener('message', (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.method === 'Runtime.consoleAPICalled') {
          console.log('[BROWSER CONSOLE]', data.params.type, data.params.args.map(a => a.value || a.description).join(' '));
        }
        if (data.method === 'Log.entryAdded') {
          console.log('[BROWSER LOG]', data.params.entry.level, data.params.entry.text);
        }
        if (data.method === 'Runtime.exceptionThrown') {
          console.error('[BROWSER EXCEPTION]', data.params.exceptionDetails);
        }
      } catch (e) {}
    });

    console.log('Navigating to http://localhost:8088/map.html ...');
    await client.send('Page.navigate', { url: 'http://localhost:8088/map.html' });

    // Wait for cachedRiverNetwork and live telemetry to initialize
    for (let i = 0; i < 30; i++) {
      const chk = await client.send('Runtime.evaluate', {
        expression: 'Boolean(window.cachedRiverNetwork && window.cachedRiverNetwork.features)',
        returnByValue: true
      });
      if (chk?.result?.value) break;
      await sleep(500);
    }
    await sleep(2000);

    const evalResult = await client.send('Runtime.evaluate', {
      expression: `(() => {
        if (!window.cachedRiverNetwork) return { error: "No cachedRiverNetwork found" };
        const features = window.cachedRiverNetwork.features || [];
        const checkedReaches = [
          "muddy_river",
          "havasu_creek",
          "kanab_creek",
          "little_snake_river",
          "uncompahgre_river",
          "fraser_river",
          "san_pedro_river",
          "white_river_upper",
          "white_river",
          "little_colorado_upper",
          "little_colorado_middle",
          "little_colorado_lower",
          "virgin_river_upper",
          "virgin_river"
        ];
        const results = {};
        for (const r of checkedReaches) {
          const feat = features.find(f => f.properties.reach === r);
          if (feat) {
            results[r] = {
              name: feat.properties.name,
              gauge_id: feat.properties.gauge_id,
              flow_cfs: feat.properties.flow_cfs,
              source_label: feat.properties.source_label,
              gauge_info: feat.properties.gauge_info
            };
          } else {
            results[r] = "NOT_FOUND";
          }
        }
        return {
          totalFeatures: features.length,
          streamflowsCount: (window.metricsData && window.metricsData.streamflows) ? window.metricsData.streamflows.length : (window.streamflows ? window.streamflows.length : "N/A"),
          reaches: results
        };
      })()`,
      returnByValue: true
    });

    console.log('\n--- VERIFICATION AUDIT RESULTS ---');
    console.log(JSON.stringify(evalResult.result.value, null, 2));

    // Capture screenshot of map
    const scr = await client.send('Page.captureScreenshot', { format: 'png' });
    const outPath = '/Users/macstudio/.gemini/antigravity/brain/58cfdbf8-91b4-4263-ad4e-596d29fac1a2/verified_real_gauges_map.png';
    fs.writeFileSync(outPath, Buffer.from(scr.data, 'base64'));
    console.log(`\nScreenshot saved to: ${outPath}`);

    client.close();
  } finally {
    chrome.kill();
  }
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
