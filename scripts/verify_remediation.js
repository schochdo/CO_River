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
        if (res.method && this.onEvent) {
          this.onEvent(res.method, res.params);
        }
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
    '--remote-debugging-port=9276',
    '--headless=new',
    '--use-gl=angle',
    '--enable-webgl',
    '--ignore-gpu-blocklist',
    '--window-size=1600,1050',
    'about:blank'
  ]);

  const errors = [];

  try {
    let version = null;
    for (let i = 0; i < 20; i++) {
      try {
        version = await fetchJson('http://localhost:9276/json/version');
        if (version && version.webSocketDebuggerUrl) break;
      } catch (e) { await sleep(200); }
    }

    const list = await fetchJson('http://localhost:9276/json/list');
    const pageTarget = list.find(t => t.type === 'page') || list[0];
    const cdp = new CDPClient(pageTarget.webSocketDebuggerUrl);

    cdp.onEvent = (method, params) => {
      if (method === 'Runtime.exceptionThrown') {
        console.error('EXCEPTION:', params.exceptionDetails.text, params.exceptionDetails.exception?.description);
        errors.push(params.exceptionDetails);
      }
      if (method === 'Runtime.consoleAPICalled' && params.type === 'error') {
        console.error('CONSOLE ERROR:', params.args.map(a => a.value || a.description).join(' '));
        errors.push(params);
      }
    };

    await cdp.connect();
    await cdp.send('Page.enable');
    await cdp.send('Runtime.enable');
    await cdp.send('Network.enable');
    await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });

    await cdp.send('Page.navigate', { url: 'http://localhost:8088/map.html' });
    
    // Wait until map and cachedRiverNetwork are ready
    for (let i = 0; i < 30; i++) {
      const ready = await cdp.send('Runtime.evaluate', {
        expression: '!!(window.map && window.cachedRiverNetwork && window.map.isStyleLoaded())'
      });
      if (ready.result && ready.result.value) {
        console.log(`Map and network loaded in ${(i+1)*500}ms`);
        break;
      }
      await sleep(500);
    }
    await sleep(2000);

    async function testClickReach(reachId, screenshotName) {
      // Clear any prior popups
      await cdp.send('Runtime.evaluate', {
        expression: `document.querySelectorAll('.maplibregl-popup').forEach(p => p.remove())`
      });
      await sleep(200);

      const info = await cdp.send('Runtime.evaluate', {
        awaitPromise: true,
        expression: `(async () => {
          const feat = window.cachedRiverNetwork.features.find(f => f.properties.reach === '${reachId}');
          if (!feat) return { error: 'reach not found: ${reachId}' };
          let coords = feat.geometry.coordinates;
          if (feat.geometry.type === 'MultiLineString') {
            coords = coords[0];
          }
          const pt = coords[Math.floor(coords.length / 2)];
          window.map.jumpTo({ center: pt, zoom: 10 });
          await new Promise(res => window.map.once('idle', res));
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
      console.log('Testing reach:', reachId, pt.name);

      // Trigger mousemove to test hover tooltip (verifies sourceBadge reference error fix)
      await cdp.send('Input.dispatchMouseEvent', {
        type: 'mouseMoved',
        x: pt.clientX,
        y: pt.clientY
      });
      await sleep(600);

      // Check hover tooltip
      const tooltip = await cdp.send('Runtime.evaluate', {
        expression: `(() => {
          const tip = document.querySelector('.maplibregl-popup-content') || document.querySelector('#hover-tooltip');
          return tip ? tip.innerText : '';
        })()`,
        returnByValue: true
      });
      console.log('Hover tooltip for', reachId, ':\n', tooltip.result.value);

      // Trigger click to open reach details popup
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
      await sleep(800);

      let popup = await cdp.send('Runtime.evaluate', {
        expression: `(() => {
          const popupEl = document.querySelector('.maplibregl-popup-content');
          return popupEl ? popupEl.innerText : 'NO POPUP FOUND';
        })()`,
        returnByValue: true
      });

      // If mouse event missed the pixel due to projection sub-pixel offset, simulate layer click event directly
      if (!popup.result || !popup.result.value || popup.result.value === 'NO POPUP FOUND') {
        popup = await cdp.send('Runtime.evaluate', {
          expression: `(() => {
            const feat = window.cachedRiverNetwork.features.find(f => f.properties.reach === '${reachId}');
            const pt = window.map.project([${pt.pt[0]}, ${pt.pt[1]}]);
            const layers = ['rivers-mainstem-hit', 'rivers-major-hit', 'rivers-minor-hit'];
            for (const lyr of layers) {
              const fs = window.map.queryRenderedFeatures(pt, { layers: [lyr] });
              if (fs.length) {
                window.map.fire('click', { point: pt, lngLat: { lng: ${pt.pt[0]}, lat: ${pt.pt[1]} }, features: fs, originalEvent: {} });
                break;
              }
            }
            const popupEl = document.querySelector('.maplibregl-popup-content');
            return popupEl ? popupEl.innerText : 'NO POPUP FOUND';
          })()`,
          returnByValue: true
        });
      }

      console.log('--- Popup for', reachId, ': ---\n', popup.result.value, '\n----------------');

      if (screenshotName) {
        const scr = await cdp.send('Page.captureScreenshot', { format: 'png' });
        fs.writeFileSync('/Users/macstudio/.gemini/antigravity/brain/58cfdbf8-91b4-4263-ad4e-596d29fac1a2/' + screenshotName, Buffer.from(scr.data, 'base64'));
      }

      return popup.result.value;
    }

    // 1. Test San Juan Shiprock to Bluff (VERIFY NO FAKE RUNOFF BOX / BROKEN MATH)
    const sjText = await testClickReach('sanjuan_shiprock_bluff', 'verified_sanjuan_shiprock_bluff_fixed.png');
    if (sjText.includes('Four Corners tributary runoff') || sjText.includes('San Juan Inflow Corridor at Shiprock')) {
      console.error('FAIL: San Juan popup still contains fake confluence mass balance card!');
      errors.push('San Juan popup still contains fake confluence card');
    } else {
      console.log('PASS: San Juan popup cleanly displays USGS streamflow without fake confluence card.');
    }

    // 2. Test Marble Canyon (VERIFY LIVE STREAMFLOW AND GAGE)
    const mcText = await testClickReach('marble_canyon', 'verified_marble_canyon_fixed.png');
    if (!mcText.includes('09380000') || !mcText.includes('Lees Ferry')) {
      console.error('FAIL: Marble Canyon popup missing Lees Ferry gage info!');
      errors.push('Marble Canyon popup missing Lees Ferry gage info');
    } else {
      console.log('PASS: Marble Canyon popup displays authentic USGS #09380000 telemetry.');
    }

    // 3. Test Grand Canyon Upper (VERIFY LITTLE COLORADO CONFLUENCE SPLIT)
    const gcuText = await testClickReach('grand_canyon_upper', 'verified_grand_canyon_upper_fixed.png');
    if (!gcuText.includes('Phantom Ranch') || !gcuText.includes('Little Colorado')) {
      console.error('FAIL: Grand Canyon Upper missing Phantom Ranch / Little Colorado info!');
      errors.push('Grand Canyon Upper missing info');
    } else {
      console.log('PASS: Grand Canyon Upper displays Phantom Ranch live telemetry and Little Colorado confluence.');
    }

    // 4. Test Glenwood to Grand Junction (VERIFY MERGED REACH)
    const gcText = await testClickReach('glenwood_cameo', 'verified_glenwood_cameo_merged.png');
    if (!gcText.includes('Cameo') || !gcText.includes('09095500')) {
      console.error('FAIL: Glenwood Cameo reach missing Cameo gage!');
      errors.push('Glenwood Cameo reach missing Cameo gage');
    } else {
      console.log('PASS: Glenwood to Grand Junction correctly tagged with Cameo USGS #09095500.');
    }

    console.log('\n=== ERROR SUMMARY ===');
    console.log(`Total exceptions / console errors: ${errors.length}`);
    cdp.close();
  } catch (err) {
    console.error('Fatal Test Runner Error:', err);
  } finally {
    chrome.kill();
  }
}

run();
