const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');

const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const DEBUG_PORT = 9230;
const TARGET_URL = 'http://localhost:8088/map.html';
const OUTPUT_DIR = '/Users/macstudio/.gemini/antigravity/brain/58cfdbf8-91b4-4263-ad4e-596d29fac1a2';

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchJson(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

class CDPClient {
  constructor(wsUrl) {
    this.wsUrl = wsUrl;
    this.ws = null;
    this.id = 1;
    this.callbacks = new Map();
  }

  async connect() {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.wsUrl);
      this.ws.onopen = () => resolve();
      this.ws.onerror = (err) => reject(err);
      this.ws.onmessage = (event) => {
        const msg = JSON.parse(event.data);
        if (msg.id && this.callbacks.has(msg.id)) {
          const { resolve, reject } = this.callbacks.get(msg.id);
          this.callbacks.delete(msg.id);
          if (msg.error) {
            reject(new Error(msg.error.message || JSON.stringify(msg.error)));
          } else {
            resolve(msg.result);
          }
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

  close() {
    if (this.ws) this.ws.close();
  }
}

async function main() {
  console.log('Launching Headless Chrome for Location & Gage Verification...');
  const chromeProc = spawn(CHROME_PATH, [
    '--headless=new',
    `--remote-debugging-port=${DEBUG_PORT}`,
    '--enable-webgl',
    '--ignore-gpu-blocklist',
    '--use-gl=angle',
    '--use-angle=metal',
    '--window-size=1680,1050',
    'about:blank'
  ]);

  try {
    let version = null;
    for (let i = 0; i < 20; i++) {
      await sleep(250);
      try {
        version = await fetchJson(`http://127.0.0.1:${DEBUG_PORT}/json/version`);
        if (version) break;
      } catch (e) {}
    }

    const targets = await fetchJson(`http://127.0.0.1:${DEBUG_PORT}/json/list`);
    const target = targets.find(t => t.type === 'page') || targets[0];
    const cdp = new CDPClient(target.webSocketDebuggerUrl);
    await cdp.connect();

    await cdp.send('Page.enable');
    await cdp.send('Runtime.enable');
    await cdp.send('Page.navigate', { url: TARGET_URL });

    // Wait for map and dams source to load
    await cdp.send('Runtime.evaluate', {
      expression: `
        new Promise((resolve) => {
          let count = 0;
          const check = () => {
            count++;
            if (window.map && window.map.getSource && window.map.getSource('dams') && window.map.getSource('rivers')) {
              resolve();
            } else if (count > 60) {
              resolve();
            } else {
              setTimeout(check, 250);
            }
          };
          check();
        })
      `,
      awaitPromise: true
    });

    await sleep(2000);
    console.log('Map loaded and hydrologic sources ready.');

    // 1. Verify Gila River at Dome, AZ
    console.log('1. Flying to Gila River near Dome, AZ...');
    await cdp.send('Runtime.evaluate', {
      expression: `
        (() => {
          map.flyTo({ center: [-114.38, 32.755], zoom: 12.5, pitch: 0, bearing: 0 });
          // Click the lower Gila reach to open popup
          const features = map.queryRenderedFeatures({ layers: ['rivers-major-glow', 'rivers-major-core'] });
          const gilaFeat = features.find(f => f.properties && (f.properties.reach === 'gila_lower' || (f.properties.name && f.properties.name.includes('Dome'))));
          return gilaFeat ? gilaFeat.properties : null;
        })()
      `,
      returnByValue: true
    });
    await sleep(2000);

    // Click on the river reach at Dome to display popup
    await cdp.send('Runtime.evaluate', {
      expression: `
        (() => {
          const pt = map.project([-114.38, 32.755]);
          map.fire('click', { point: pt, lngLat: { lng: -114.38, lat: 32.755 } });
        })()
      `
    });
    await sleep(1000);

    const shot1 = await cdp.send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(`${OUTPUT_DIR}/verified_gila_dome_popup.png`, Buffer.from(shot1.data, 'base64'));
    console.log('Saved verified_gila_dome_popup.png');

    // 2. Verify Imperial Dam
    console.log('2. Flying to Imperial Dam...');
    await cdp.send('Runtime.evaluate', {
      expression: `
        (() => {
          map.flyTo({ center: [-114.4667, 32.88325], zoom: 14.5, pitch: 0, bearing: 0 });
        })()
      `
    });
    await sleep(2000);

    // Click Imperial Dam icon to trigger popup
    await cdp.send('Runtime.evaluate', {
      expression: `
        (() => {
          const pt = map.project([-114.4667, 32.88325]);
          map.fire('click', { point: pt, lngLat: { lng: -114.4667, lat: 32.88325 } });
        })()
      `
    });
    await sleep(1000);

    const shot2 = await cdp.send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(`${OUTPUT_DIR}/verified_imperial_dam_aligned.png`, Buffer.from(shot2.data, 'base64'));
    console.log('Saved verified_imperial_dam_aligned.png');

    // 3. Verify Headgate Rock Dam
    console.log('3. Flying to Headgate Rock Dam (Parker, AZ)...');
    await cdp.send('Runtime.evaluate', {
      expression: `
        (() => {
          map.flyTo({ center: [-114.2748, 34.1691], zoom: 14.5, pitch: 0, bearing: 0 });
        })()
      `
    });
    await sleep(2000);

    // Click Headgate Rock Dam icon
    await cdp.send('Runtime.evaluate', {
      expression: `
        (() => {
          const pt = map.project([-114.2748, 34.1691]);
          map.fire('click', { point: pt, lngLat: { lng: -114.2748, lat: 34.1691 } });
        })()
      `
    });
    await sleep(1000);

    const shot3 = await cdp.send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(`${OUTPUT_DIR}/verified_headgate_rock_aligned.png`, Buffer.from(shot3.data, 'base64'));
    console.log('Saved verified_headgate_rock_aligned.png');

    // 4. Verify Morelos Dam
    console.log('4. Flying to Morelos Dam (US-Mexico border)...');
    await cdp.send('Runtime.evaluate', {
      expression: `
        (() => {
          map.flyTo({ center: [-114.72917, 32.70556], zoom: 14.5, pitch: 0, bearing: 0 });
        })()
      `
    });
    await sleep(2000);

    // Click Morelos Dam icon
    await cdp.send('Runtime.evaluate', {
      expression: `
        (() => {
          const pt = map.project([-114.72917, 32.70556]);
          map.fire('click', { point: pt, lngLat: { lng: -114.72917, lat: 32.70556 } });
        })()
      `
    });
    await sleep(1000);

    const shot4 = await cdp.send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(`${OUTPUT_DIR}/verified_morelos_dam_aligned.png`, Buffer.from(shot4.data, 'base64'));
    console.log('Saved verified_morelos_dam_aligned.png');

    console.log('ALL SCREENSHOTS CAPTURED SUCCESSFULLY!');
    cdp.close();
  } catch (err) {
    console.error('Error during verification:', err);
  } finally {
    chromeProc.kill('SIGKILL');
  }
}

main();
