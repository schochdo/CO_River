const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const path = require('path');

const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const DEBUG_PORT = 9239;
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
    const list = await fetchJson(`http://127.0.0.1:${DEBUG_PORT}/json`);
    const client = new CDPClient(list[0].webSocketDebuggerUrl);
    await client.connect();
    await client.send('Page.enable');
    await client.send('Runtime.enable');

    console.log('Navigating to http://localhost:8088/map.html...');
    await client.send('Page.navigate', { url: 'http://localhost:8088/map.html' });
    
    // Wait until map and cachedRiverNetwork are loaded
    console.log('Waiting for map and river network to load...');
    for (let i = 0; i < 20; i++) {
      const check = await client.send('Runtime.evaluate', {
        expression: 'Boolean(window.map && window.cachedRiverNetwork && window.openReachPopup)'
      });
      if (check.result.value) {
        console.log('Map, cachedRiverNetwork, and openReachPopup ready at loop', i);
        break;
      }
      await sleep(500);
    }

    // Helper to get mid coord from feature
    const getMidCoordExpr = `
      function getFeatureMidCoord(feat) {
        const geom = feat.geometry;
        if (geom.type === 'LineString') {
          return geom.coordinates[Math.floor(geom.coordinates.length / 2)];
        } else if (geom.type === 'MultiLineString') {
          const line = geom.coordinates[Math.floor(geom.coordinates.length / 2)];
          return line[Math.floor(line.length / 2)];
        }
        return [0, 0];
      }
    `;

    // 1. Trigger popup on grand_canyon_upper
    console.log('Opening popup for grand_canyon_upper...');
    const res = await client.send('Runtime.evaluate', {
      expression: `
        (() => {
          ${getMidCoordExpr}
          const rn = window.cachedRiverNetwork;
          const feat = rn.features.find(f => f.properties && f.properties.reach === 'grand_canyon_upper');
          if (!feat) return { error: 'reach grand_canyon_upper not found' };
          
          const midCoord = getFeatureMidCoord(feat);
          window.map.flyTo({ center: midCoord, zoom: 8.5, duration: 0 });
          window.openReachPopup(feat.properties, midCoord);
          
          return {
            success: true,
            reach: feat.properties.reach,
            name: feat.properties.name,
            flow_cfs: feat.properties.flow_cfs,
            confluence_info: feat.properties.confluence_info
          };
        })()
      `,
      returnByValue: true
    });
    console.log('Evaluate result grand_canyon_upper:', JSON.stringify(res.result.value, null, 2));

    await sleep(2000);

    // Check popup content
    const popupContent = await client.send('Runtime.evaluate', {
      expression: `
        (() => {
          const popup = document.querySelector('.maplibregl-popup-content');
          if (!popup) return { found: false };
          return {
            found: true,
            confluence_box: popup.querySelector('div[style*="background:#f0f9ff"]')?.innerText || 'Not found'
          };
        })()
      `,
      returnByValue: true
    });
    console.log('Grand Canyon Popup confluence box:\n', popupContent.result.value.confluence_box);

    // Capture screenshot of grand_canyon_upper
    const shot = await client.send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(ARTIFACT_DIR, 'verified_grand_canyon_upper_confluence_math.png'), Buffer.from(shot.data, 'base64'));
    console.log('Saved screenshot to verified_grand_canyon_upper_confluence_math.png');

    // 2. Test Gunnison River Confluence at Grand Junction (colorado_stateline_cisco)
    console.log('\nTesting colorado_stateline_cisco (Gunnison River Confluence)...');
    const resGunnison = await client.send('Runtime.evaluate', {
      expression: `
        (() => {
          ${getMidCoordExpr}
          const rn = window.cachedRiverNetwork;
          const feat = rn.features.find(f => f.properties && f.properties.reach === 'colorado_stateline_cisco');
          if (!feat) return { error: 'reach colorado_stateline_cisco not found' };
          
          const midCoord = getFeatureMidCoord(feat);
          window.map.flyTo({ center: midCoord, zoom: 8.5, duration: 0 });
          window.openReachPopup(feat.properties, midCoord);
          return {
            success: true,
            reach: feat.properties.reach,
            confluence_info: feat.properties.confluence_info
          };
        })()
      `,
      returnByValue: true
    });
    console.log('Evaluate result Gunnison:', JSON.stringify(resGunnison.result.value, null, 2));

    await sleep(2000);
    const popupGunnison = await client.send('Runtime.evaluate', {
      expression: `
        (() => {
          const popup = document.querySelector('.maplibregl-popup-content');
          if (!popup) return { found: false };
          return {
            found: true,
            confluence_box: popup.querySelector('div[style*="background:#f0f9ff"]')?.innerText || 'Not found'
          };
        })()
      `,
      returnByValue: true
    });
    console.log('Gunnison Popup confluence box:\n', popupGunnison.result.value.confluence_box);

    const shotGunnison = await client.send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(ARTIFACT_DIR, 'verified_gunnison_confluence_math.png'), Buffer.from(shotGunnison.data, 'base64'));
    console.log('Saved screenshot to verified_gunnison_confluence_math.png');

    client.close();
  } finally {
    chrome.kill();
  }
}

run().catch(console.error);
