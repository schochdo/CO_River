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
    '--remote-debugging-port=9355',
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
        const list = await fetchJson('http://localhost:9355/json/list');
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

    const errors = [];
    client.ws.addEventListener('message', (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.method === 'Runtime.consoleAPICalled' && data.params.type === 'error') {
          errors.push(data.params.args.map(a => a.value || a.description).join(' '));
        }
        if (data.method === 'Runtime.exceptionThrown') {
          errors.push(JSON.stringify(data.params.exceptionDetails));
        }
      } catch (e) {}
    });

    console.log('Navigating to http://localhost:8088/ml_analysis.html ...');
    await client.send('Page.navigate', { url: 'http://localhost:8088/ml_analysis.html' });

    // Wait for all 4 charts
    for (let i = 0; i < 30; i++) {
      const chk = await client.send('Runtime.evaluate', {
        expression: 'Boolean(window.chartBubble && window.chartTravel && window.chartCompact && window.chartHydro && window.chartHydro.data.datasets.length === 2)',
        returnByValue: true
      });
      if (chk?.result?.value) break;
      await sleep(250);
    }
    await sleep(600);

    const audit = await client.send('Runtime.evaluate', {
      expression: `(() => {
        const hydroDs = window.chartHydro.data.datasets;
        const bubbleDs = window.chartBubble.data.datasets;
        const compactDs = window.chartCompact.data.datasets;
        return {
          card4_title: document.querySelector('#chart-snowmelt-vs-flash').closest('section').querySelector('h2').innerText.trim(),
          card4_subtitle: document.querySelector('#chart-snowmelt-vs-flash').closest('section').querySelector('p').innerText.trim(),
          card4_datasets: hydroDs.map(d => ({
            label: d.label,
            borderColor: d.borderColor,
            backgroundColor: d.backgroundColor,
            dataPoints: d.data.length,
            sample: d.data.slice(140, 145)
          })),
          card1_bubble_sample: bubbleDs.map(d => ({
            label: d.label,
            color: d.borderColor,
            borderWidth: d.borderWidth
          })),
          card3_compact_bars: {
            tealCount: compactDs[0].backgroundColor.filter(c => c === '#0f766e').length,
            terracottaCount: compactDs[0].backgroundColor.filter(c => c === '#c2410c').length,
            releaseLineColor: compactDs[1].borderColor,
            compact165Color: compactDs[2].borderColor
          }
        };
      })()`,
      returnByValue: true
    });

    console.log('Audit Results:');
    console.log(JSON.stringify(audit.result.value, null, 2));

    // Default screenshot
    const scr1 = await client.send('Page.captureScreenshot', { format: 'png' });
    const out1 = '/Users/macstudio/.gemini/antigravity/brain/58cfdbf8-91b4-4263-ad4e-596d29fac1a2/verified_editorial_palette_default.png';
    fs.writeFileSync(out1, Buffer.from(scr1.data, 'base64'));
    console.log(`Saved screenshot 1 (Default): ${out1}`);

    // Click to select river 'cisco'
    console.log('\nSelecting river "cisco" ...');
    await client.send('Runtime.evaluate', { expression: 'selectRiver("cisco")' });
    await sleep(400);

    const scr2 = await client.send('Page.captureScreenshot', { format: 'png' });
    const out2 = '/Users/macstudio/.gemini/antigravity/brain/58cfdbf8-91b4-4263-ad4e-596d29fac1a2/verified_editorial_palette_selected.png';
    fs.writeFileSync(out2, Buffer.from(scr2.data, 'base64'));
    console.log(`Saved screenshot 2 (Selected Cisco): ${out2}`);

    // Click filter 'snowmelt'
    console.log('\nFiltering by regime "snowmelt" ...');
    await client.send('Runtime.evaluate', { expression: 'filterRegime("snowmelt")' });
    await sleep(400);

    const scr3 = await client.send('Page.captureScreenshot', { format: 'png' });
    const out3 = '/Users/macstudio/.gemini/antigravity/brain/58cfdbf8-91b4-4263-ad4e-596d29fac1a2/verified_editorial_palette_filtered.png';
    fs.writeFileSync(out3, Buffer.from(scr3.data, 'base64'));
    console.log(`Saved screenshot 3 (Snowmelt Filter): ${out3}`);

    console.log(`\nBrowser console errors encountered: ${errors.length}`);
    if (errors.length > 0) console.error(errors);

    client.close();
  } finally {
    chrome.kill();
  }
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
