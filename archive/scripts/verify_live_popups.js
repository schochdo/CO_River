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
    '--remote-debugging-port=9275',
    '--headless=new',
    '--use-gl=angle',
    '--enable-webgl',
    '--ignore-gpu-blocklist',
    '--window-size=1600,1050',
    'about:blank'
  ]);

  try {
    let version = null;
    for (let i = 0; i < 20; i++) {
      try {
        version = await fetchJson('http://localhost:9275/json/version');
        if (version && version.webSocketDebuggerUrl) break;
      } catch (e) { await sleep(200); }
    }

    const list = await fetchJson('http://localhost:9275/json/list');
    const pageTarget = list.find(t => t.type === 'page') || list[0];
    const cdp = new CDPClient(pageTarget.webSocketDebuggerUrl);
    await cdp.connect();
    await cdp.send('Page.enable');
    await cdp.send('Runtime.enable');
    await cdp.send('Network.enable');
    await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });

    await cdp.send('Page.navigate', { url: 'http://localhost:8088/map.html' });
    await sleep(4000);

    async function testClickReach(reachId, screenshotName) {
      const info = await cdp.send('Runtime.evaluate', {
        expression: `(() => {
          const feat = window.cachedRiverNetwork.features.find(f => f.properties.reach === '${reachId}');
          if (!feat) return { error: 'reach not found: ${reachId}' };
          let coords = feat.geometry.coordinates;
          if (feat.geometry.type === 'MultiLineString') {
            coords = coords[0];
          }
          const pt = coords[Math.floor(coords.length / 2)];
          window.map.jumpTo({ center: pt, zoom: 10 });
          const p = window.map.project(pt);
          return { clientX: p.x, clientY: p.y, pt, name: feat.properties.name };
        })()`,
        returnByValue: true
      });

      if (!info.result || !info.result.value || info.result.value.error) {
        console.error('Error getting point for', reachId, info);
        return;
      }
      const pt = info.result.value;
      console.log('Testing reach:', reachId, pt.name, 'at', pt.clientX, pt.clientY);

      await sleep(1000);
      await cdp.send('Input.dispatchMouseEvent', {
        type: 'mousePressed',
        x: pt.clientX,
        y: pt.clientY,
        button: 'left',
        clickCount: 1
      });
      await cdp.send('Input.dispatchMouseEvent', {
        type: 'mouseReleased',
        x: pt.clientX,
        y: pt.clientY,
        button: 'left',
        clickCount: 1
      });
      await sleep(1000);

      const popup = await cdp.send('Runtime.evaluate', {
        expression: `(() => {
          const popupEl = document.querySelector('.maplibregl-popup-content');
          return popupEl ? popupEl.innerText : 'NO POPUP FOUND';
        })()`,
        returnByValue: true
      });
      console.log('--- Popup text for', reachId, ': ---\n', popup.result.value, '\n----------------');

      const scr = await cdp.send('Page.captureScreenshot', { format: 'png' });
      fs.writeFileSync('/Users/macstudio/.gemini/antigravity/brain/58cfdbf8-91b4-4263-ad4e-596d29fac1a2/' + screenshotName, Buffer.from(scr.data, 'base64'));
    }

    // Test Hoover to Davis
    await testClickReach('lower_basin_hoover_davis', 'live_hoover_davis_popup.png');

    // Test Davis to Parker
    await testClickReach('lower_basin_davis_parker', 'live_davis_parker_popup.png');

    // Test Parker to Palo Verde
    await testClickReach('lower_basin_parker_paloverde', 'live_parker_paloverde_popup.png');

    // Test Palo Verde to Imperial
    await testClickReach('lower_basin_paloverde_imperial', 'live_paloverde_imperial_popup.png');

    // Test San Juan Bluff to Powell
    await testClickReach('sanjuan_bluff_powell', 'live_sanjuan_bluff_popup.png');

    // Test San Juan Shiprock to Bluff
    await testClickReach('sanjuan_shiprock_bluff', 'live_sanjuan_shiprock_popup.png');

    cdp.close();
  } catch (err) {
    console.error('Error:', err);
  } finally {
    chrome.kill();
  }
}

run();
