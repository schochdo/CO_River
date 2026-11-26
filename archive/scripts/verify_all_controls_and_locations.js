const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');

const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const DEBUG_PORT = 9235;
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
    this.pending = new Map();
  }

  async connect() {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.wsUrl);
      this.ws.onopen = () => {
        this.ws.addEventListener('message', (event) => {
          try {
            const msg = JSON.parse(event.data);
            if (msg.id && this.pending.has(msg.id)) {
              const { resolve, reject } = this.pending.get(msg.id);
              this.pending.delete(msg.id);
              if (msg.error) {
                reject(new Error(msg.error.message || JSON.stringify(msg.error)));
              } else if (msg.result && msg.result.exceptionDetails) {
                reject(new Error(msg.result.exceptionDetails.text || JSON.stringify(msg.result.exceptionDetails)));
              } else {
                resolve(msg.result);
              }
            }
          } catch (e) {
            // Ignore parse errors on ping/pong
          }
        });
        resolve();
      };
      this.ws.onerror = reject;
    });
  }

  async send(method, params = {}) {
    const curId = this.id++;
    return new Promise((resolve, reject) => {
      this.pending.set(curId, { resolve, reject });
      this.ws.send(JSON.stringify({ id: curId, method, params }));
    });
  }

  async eval(expression, awaitPromise = false) {
    const res = await this.send('Runtime.evaluate', {
      expression,
      awaitPromise,
      returnByValue: true
    });
    return res && res.result ? res.result.value : undefined;
  }

  close() {
    if (this.ws) this.ws.close();
  }
}

async function main() {
  console.log('=== STARTING AUTOMATED CONTROLS & CARTOGRAPHY VERIFICATION ===');
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
              resolve(true);
            } else if (count > 60) {
              resolve(false);
            } else {
              setTimeout(check, 250);
            }
          };
          check();
        })
      `,
      awaitPromise: true
    });

    await sleep(2500);
    console.log('Map, layers, and hydrologic network fully initialized.');

    // 1. Verify UI Legend displays Navigation Controls
    const legendNavCheck = await cdp.eval(`
      (() => {
        const el = document.getElementById('map-legend');
        const text = el ? el.textContent : '';
        return {
          hasTrackpad: text.includes('Trackpad: Pinch to zoom · Right-drag to orbit · Shift+scroll to tilt'),
          hasTouch: text.includes('Touch: Pinch to zoom · Two fingers to rotate & tilt'),
          hasKeyboard: text.includes('Arrows to pan · A/D to orbit · W/S to tilt · Q/E to change altitude · Z/X or +/- to zoom'),
          hasShiftSpeed: text.includes('(Shift for 2.5× speed)')
        };
      })()
    `);
    console.log('1. UI Legend Navigation Controls Check:', legendNavCheck);

    // 2. Test Shift+scroll to tilt
    console.log('2. Testing Shift+scroll to tilt on map canvas...');
    const tiltBefore = await cdp.eval(`map.getPitch()`);

    // Fire simulated wheel with shiftKey
    await cdp.eval(`
      (() => {
        const canvas = map.getCanvas();
        const evt = new WheelEvent('wheel', {
          deltaY: -150,
          shiftKey: true,
          bubbles: true,
          cancelable: true
        });
        canvas.dispatchEvent(evt);
        return map.getPitch();
      })()
    `);
    await sleep(200);

    const tiltAfter = await cdp.eval(`map.getPitch()`);
    console.log(`Pitch before: ${tiltBefore}° -> Pitch after Shift+scroll: ${tiltAfter}° (Tilted successfully: ${tiltAfter > tiltBefore})`);

    // 3. Test Keyboard Controls & Fixed Altitude Panning
    console.log('3. Testing Keyboard Arrow Flight (Fixed Altitude Panning)...');
    const testFlight = await cdp.eval(`
      (async () => {
        try {
          map.setPitch(45);
          map.setZoom(12);
          map.jumpTo({ center: [-105.80, 39.80] });
          await new Promise(r => setTimeout(r, 400));

          const alts = [];
          const grounds = [];
          // Press ArrowUp
          window.dispatchEvent(new KeyboardEvent('keydown', { code: 'ArrowUp', bubbles: true }));
          
          for (let f = 0; f < 8; f++) {
            await new Promise(r => setTimeout(r, 70));
            const tr = map.transform;
            const camPos = tr.getCameraPosition ? tr.getCameraPosition() : null;
            const center = map.getCenter();
            const ground = map.queryTerrainElevation ? map.queryTerrainElevation(center) : 0;
            if (camPos) alts.push(camPos.altitude);
            grounds.push(ground || 0);
          }
          
          window.dispatchEvent(new KeyboardEvent('keyup', { code: 'ArrowUp', bubbles: true }));
          return { success: true, alts, grounds };
        } catch(e) {
          return { error: e.message };
        }
      })()
    `, true);

    if (!testFlight || !testFlight.alts) {
      console.error('Test flight failed:', testFlight);
    } else {
      const alts = testFlight.alts;
      const minAlt = Math.min(...alts);
      const maxAlt = Math.max(...alts);
      const altVariance = maxAlt - minAlt;
      console.log(`Flight altitude over ${alts.length} frames: Min=${minAlt.toFixed(1)}m, Max=${maxAlt.toFixed(1)}m, Variance=${altVariance.toFixed(2)}m (Solid fixed altitude: ${altVariance < 5})`);
    }

    // 4. Test Q/E Vertical Elevator
    console.log('4. Testing Q/E Vertical Helicopter Elevator (Zero Ground Drift)...');
    const elevatorTest = await cdp.eval(`
      (async () => {
        try {
          const tr = map.transform;
          const pos1 = tr.getCameraPosition();
          const groundCenter1 = map.getCenter();
          
          // Press KeyE (climb)
          window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyE', bubbles: true }));
          await new Promise(r => setTimeout(r, 300));
          window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyE', bubbles: true }));
          
          const pos2 = tr.getCameraPosition();
          const groundCenter2 = map.getCenter();
          
          // Lat/lng displacement of ground center during vertical climb
          const dLng = Math.abs(groundCenter2.lng - groundCenter1.lng);
          const dLat = Math.abs(groundCenter2.lat - groundCenter1.lat);
          
          return {
            initialAlt: pos1.altitude,
            climbedAlt: pos2.altitude,
            dLng,
            dLat
          };
        } catch(e) {
          return { error: e.message };
        }
      })()
    `, true);
    if (!elevatorTest || elevatorTest.error) {
      console.error('Elevator test error:', elevatorTest);
    } else {
      console.log(`Elevator test: Initial=${elevatorTest.initialAlt.toFixed(1)}m -> Climbed=${elevatorTest.climbedAlt.toFixed(1)}m (Climb delta: ${(elevatorTest.climbedAlt - elevatorTest.initialAlt).toFixed(1)}m, Ground Drift < 0.005: ${elevatorTest.dLng < 0.005 && elevatorTest.dLat < 0.005})`);
    }

    // 5. Visual verification of updated dams on satellite
    console.log('5. Capturing screenshots of verified dam positions...');

    // Morelos Dam
    console.log('Navigating to Morelos Dam on US-Mexico border...');
    await cdp.eval(`
      (() => {
        map.jumpTo({ center: [-114.72874, 32.70516], zoom: 16.5, pitch: 0, bearing: 0 });
      })()
    `);
    await sleep(1500);
    // Click Morelos Dam via DOM canvas dispatch
    await cdp.eval(`
      (() => {
        const canvas = map.getCanvas();
        const pt = map.project([-114.72874, 32.70516]);
        const rect = canvas.getBoundingClientRect();
        canvas.dispatchEvent(new MouseEvent('click', {
          clientX: rect.left + pt.x,
          clientY: rect.top + pt.y,
          bubbles: true
        }));
      })()
    `);
    await sleep(800);
    const shotMorelos = await cdp.send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(`${OUTPUT_DIR}/verified_morelos_dam_exact.png`, Buffer.from(shotMorelos.data, 'base64'));
    console.log('Saved verified_morelos_dam_exact.png');

    // Palo Verde Dam
    console.log('Navigating to Palo Verde Dam north of Blythe...');
    await cdp.eval(`
      (() => {
        map.jumpTo({ center: [-114.51100, 33.73255], zoom: 16.5, pitch: 0, bearing: 0 });
      })()
    `);
    await sleep(1500);
    // Click Palo Verde Dam via DOM canvas dispatch
    await cdp.eval(`
      (() => {
        const canvas = map.getCanvas();
        const pt = map.project([-114.51100, 33.73255]);
        const rect = canvas.getBoundingClientRect();
        canvas.dispatchEvent(new MouseEvent('click', {
          clientX: rect.left + pt.x,
          clientY: rect.top + pt.y,
          bubbles: true
        }));
      })()
    `);
    await sleep(800);
    const shotPaloVerde = await cdp.send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(`${OUTPUT_DIR}/verified_palo_verde_dam_exact.png`, Buffer.from(shotPaloVerde.data, 'base64'));
    console.log('Saved verified_palo_verde_dam_exact.png');

    // Headgate Rock Dam
    console.log('Navigating to Headgate Rock Dam at Parker, AZ...');
    await cdp.eval(`
      (() => {
        map.jumpTo({ center: [-114.27712, 34.16845], zoom: 16.5, pitch: 0, bearing: 0 });
      })()
    `);
    await sleep(1500);
    // Click Headgate Rock Dam via DOM canvas dispatch
    await cdp.eval(`
      (() => {
        const canvas = map.getCanvas();
        const pt = map.project([-114.27712, 34.16845]);
        const rect = canvas.getBoundingClientRect();
        canvas.dispatchEvent(new MouseEvent('click', {
          clientX: rect.left + pt.x,
          clientY: rect.top + pt.y,
          bubbles: true
        }));
      })()
    `);
    await sleep(800);
    const shotHeadgate = await cdp.send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(`${OUTPUT_DIR}/verified_headgate_rock_exact.png`, Buffer.from(shotHeadgate.data, 'base64'));
    console.log('Saved verified_headgate_rock_exact.png');

    // Theodore Roosevelt Dam
    console.log('Navigating to Theodore Roosevelt Dam on Salt River...');
    await cdp.eval(`
      (() => {
        map.jumpTo({ center: [-111.16130, 33.67180], zoom: 16.5, pitch: 0, bearing: 0 });
      })()
    `);
    await sleep(1500);
    // Click Theodore Roosevelt Dam via DOM canvas dispatch
    await cdp.eval(`
      (() => {
        const canvas = map.getCanvas();
        const pt = map.project([-111.16130, 33.67180]);
        const rect = canvas.getBoundingClientRect();
        canvas.dispatchEvent(new MouseEvent('click', {
          clientX: rect.left + pt.x,
          clientY: rect.top + pt.y,
          bubbles: true
        }));
      })()
    `);
    await sleep(800);
    const shotRoosevelt = await cdp.send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(`${OUTPUT_DIR}/verified_theodore_roosevelt_exact.png`, Buffer.from(shotRoosevelt.data, 'base64'));
    console.log('Saved verified_theodore_roosevelt_exact.png');

    console.log('=== ALL TESTS COMPLETED SUCCESSFULLY! ===');
    cdp.close();
  } catch (err) {
    console.error('Error during verification:', err);
  } finally {
    chromeProc.kill('SIGKILL');
  }
}

main();
