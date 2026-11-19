/**
 * Verification test for Camera Controls Responsiveness & Anti-Bounce Elimination
 *
 * Verifies:
 * 1. ZERO Zoom-Bounce on Load:
 *    - On initial load or switching to map tab, map settles instantly without parabolic zoom ballooning/bouncing.
 * 2. Instant Control Responsiveness WITHOUT Clicking:
 *    - Keyboard flight controls (WASD, Arrows) respond immediately upon page / tab load without needing to click the map.
 * 3. Checkbox Isolation:
 *    - Toggling layer checkboxes (e.g. toggle-river-network) does NOT lock out WASD / Arrow keys.
 * 4. Presets Anti-Bounce:
 *    - Calling presets (divide, lees_ferry, basin) performs direct easeTo (or instant jumpTo) with ZERO parabolic flight curves.
 */

const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const assert = require('assert');

const ARTIFACT_DIR = '/Users/macstudio/.gemini/antigravity/brain/58cfdbf8-91b4-4263-ad4e-596d29fac1a2';
const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const DEBUG_PORT = 9275;

async function run() {
  console.log('=== STARTING CAMERA CONTROLS & ANTI-BOUNCE VERIFICATION ===\n');

  const chromeProc = spawn(CHROME_PATH, [
    '--headless=new',
    `--remote-debugging-port=${DEBUG_PORT}`,
    '--enable-webgl',
    '--ignore-gpu-blocklist',
    '--disable-background-timer-throttling',
    '--disable-renderer-backgrounding',
    '--window-size=1440,960',
    'about:blank'
  ]);

  try {
    await new Promise(r => setTimeout(r, 1200));
    const list = await new Promise((res, rej) => {
      http.get(`http://127.0.0.1:${DEBUG_PORT}/json/list`, r => {
        let d = ''; r.on('data', c => d += c); r.on('end', () => res(JSON.parse(d)));
      }).on('error', rej);
    });

    const ws = new WebSocket(list[0].webSocketDebuggerUrl);
    await new Promise(r => ws.onopen = r);

    let id = 1;
    const send = (m, p = {}) => new Promise((resolve, reject) => {
      const msgId = id++;
      const handler = (e) => {
        const msg = JSON.parse(e.data);
        if (msg.id === msgId) {
          ws.removeEventListener('message', handler);
          if (msg.error) reject(msg.error);
          else resolve(msg.result);
        }
      };
      ws.addEventListener('message', handler);
      ws.send(JSON.stringify({ id: msgId, method: m, params: p }));
    });

    await send('Page.enable');
    await send('Runtime.enable');
    await send('DOM.enable');

    const evalJs = async (expr) => {
      const res = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
      if (res.exceptionDetails) {
        throw new Error(JSON.stringify(res.exceptionDetails));
      }
      if (!res.result) return undefined;
      if (res.result.value !== undefined) return res.result.value;
      if (res.result.unserializableValue !== undefined) return Number(res.result.unserializableValue);
      return undefined;
    };

    // ─────────────────────────────────────────────────────────────
    // TEST 1: Load index.html?tab=map and audit zoom profile over time (NO BOUNCE)
    // ─────────────────────────────────────────────────────────────
    console.log('[TEST 1] Loading index.html?tab=map and recording zoom telemetry for 2.5 seconds...');
    await send('Page.navigate', { url: 'http://localhost:8088/index.html?tab=map' });
    
    // Wait until iframe map is initialized (distinguishing from <div id="map">)
    let ready = false;
    for (let r = 0; r < 40; r++) {
      const isReady = await evalJs(`
        (() => {
          const iframe = document.getElementById('iframe-map');
          const m = iframe?.contentWindow?.map;
          return !!(m && typeof m.getZoom === 'function');
        })()
      `);
      if (isReady) { ready = true; break; }
      await new Promise(res => setTimeout(res, 100));
    }
    console.log(`  Map ready state in iframe: ${ready}`);

    // Sample zoom and altitude 15 times over 1.5 seconds to ensure no parabolic bounce curve occurs
    const zoomHistory = [];
    for (let i = 0; i < 15; i++) {
      const data = await evalJs(`
        (() => {
          const iframe = document.getElementById('iframe-map');
          const m = iframe?.contentWindow?.map;
          if (m && typeof m.getZoom === 'function') {
            return {
              zoom: m.getZoom(),
              pitch: m.getPitch(),
              bearing: m.getBearing(),
              center: [m.getCenter().lng, m.getCenter().lat]
            };
          }
          return null;
        })()
      `);
      if (data) zoomHistory.push(data);
      await new Promise(r => setTimeout(r, 100));
    }

    console.log(`  Sampled ${zoomHistory.length} camera snapshots during initial load:`);
    zoomHistory.forEach((s, idx) => {
      console.log(`    #${idx+1}: zoom=${s.zoom.toFixed(2)}, pitch=${s.pitch.toFixed(1)}°, center=[${s.center[0].toFixed(2)}, ${s.center[1].toFixed(2)}]`);
    });

    // Check for zoom bounce: In a parabolic flyTo, zoom swings dramatically down then back up (or vice versa) with delta > 1.5
    const initialZoom = zoomHistory[0].zoom;
    const maxZoom = Math.max(...zoomHistory.map(z => z.zoom));
    const minZoom = Math.min(...zoomHistory.map(z => z.zoom));
    const zoomRange = maxZoom - minZoom;
    console.log(`  Zoom fluctuation range on load: ${zoomRange.toFixed(3)} (threshold < 0.5)`);
    assert(zoomRange < 0.5, `Map exhibited zoom bounce! Range: ${zoomRange.toFixed(3)}`);
    console.log('✓ TEST 1 PASSED: Zero zoom-bounce on map load.\n');

    // ─────────────────────────────────────────────────────────────
    // TEST 2: Keyboard Navigation WITHOUT Clicking the Map First
    // ─────────────────────────────────────────────────────────────
    console.log('[TEST 2] Testing keyboard controls responsiveness WITHOUT clicking map first...');
    const initialCam = await evalJs(`
      (() => {
        const m = document.getElementById('iframe-map').contentWindow.map;
        return { pitch: m.getPitch(), bearing: m.getBearing(), zoom: m.getZoom() };
      })()
    `);

    // Dispatch KeyW directly to parent window without any click
    await send('Input.dispatchKeyEvent', { type: 'keyDown', code: 'KeyW', key: 'w' });
    await new Promise(r => setTimeout(r, 350));
    await send('Input.dispatchKeyEvent', { type: 'keyUp', code: 'KeyW', key: 'w' });

    const pitchedCam = await evalJs(`
      (() => {
        const m = document.getElementById('iframe-map').contentWindow.map;
        return { pitch: m.getPitch(), bearing: m.getBearing(), zoom: m.getZoom() };
      })()
    `);
    console.log(`  Pitch response: initial=${initialCam.pitch.toFixed(1)}° -> after KeyW=${pitchedCam.pitch.toFixed(1)}°`);
    assert(pitchedCam.pitch > initialCam.pitch, `KeyW did not tilt pitch without map click! Initial: ${initialCam.pitch}, After: ${pitchedCam.pitch}`);
    console.log('✓ TEST 2 PASSED: Camera controls respond immediately without clicking the map.\n');

    // ─────────────────────────────────────────────────────────────
    // TEST 3: Checkbox Focus Isolation (WASD still works after toggling layers)
    // ─────────────────────────────────────────────────────────────
    console.log('[TEST 3] Testing checkbox isolation (toggling layer checkbox then pressing KeyD)...');
    // Focus and click a checkbox inside the iframe
    await evalJs(`
      (() => {
        const iframe = document.getElementById('iframe-map');
        const doc = iframe.contentWindow.document;
        const cb = doc.getElementById('toggle-river-network');
        if (cb) {
          cb.focus();
          cb.click();
        }
      })()
    `);

    const bearingBefore = await evalJs(`(() => document.getElementById('iframe-map').contentWindow.map.getBearing())()`);

    // Press KeyD to rotate bearing
    await send('Input.dispatchKeyEvent', { type: 'keyDown', code: 'KeyD', key: 'd' });
    await new Promise(r => setTimeout(r, 350));
    await send('Input.dispatchKeyEvent', { type: 'keyUp', code: 'KeyD', key: 'd' });

    const bearingAfter = await evalJs(`(() => document.getElementById('iframe-map').contentWindow.map.getBearing())()`);
    console.log(`  Bearing response: before=${bearingBefore.toFixed(1)}° -> after KeyD=${bearingAfter.toFixed(1)}°`);
    assert(Math.abs(bearingAfter - bearingBefore) > 0.5, `KeyD was blocked while checkbox was active! Before: ${bearingBefore}, After: ${bearingAfter}`);
    console.log('✓ TEST 3 PASSED: Checkbox does not lock out keyboard flight controls.\n');

    // ─────────────────────────────────────────────────────────────
    // TEST 4: Preset Navigation Direct EaseTo (NO Zoom Bouncing)
    // ─────────────────────────────────────────────────────────────
    console.log('[TEST 4] Testing preset navigation (Continental Divide preset)...');
    // Call zoomToPreset('divide')
    await evalJs(`(() => document.getElementById('iframe-map').contentWindow.zoomToPreset('divide'))()`);
    
    // Sample zoom trajectory during preset navigation
    const presetZooms = [];
    for (let i = 0; i < 10; i++) {
      const z = await evalJs(`(() => document.getElementById('iframe-map').contentWindow.map.getZoom())()`);
      presetZooms.push(z);
      await new Promise(r => setTimeout(r, 90));
    }
    console.log(`  Preset zoom trajectory: ${presetZooms.map(z => z.toFixed(2)).join(' -> ')}`);
    // In direct easeTo, zoom increases monotonically from basin (~5.4) to divide (~9.8).
    // In parabolic flyTo, it would dip downwards first before rising!
    const minPresetZoom = Math.min(...presetZooms);
    console.log(`  Minimum zoom during transition: ${minPresetZoom.toFixed(2)} (no downward swoop)`);
    assert(minPresetZoom >= presetZooms[0] - 0.05, `Preset navigation performed a parabolic zoom-out dip! Min: ${minPresetZoom}, Start: ${presetZooms[0]}`);
    console.log('✓ TEST 4 PASSED: Preset transitions smoothly without parabolic zoom dip/bounce.\n');

    // Capture screenshot of verified state
    const screenshot = await send('Page.captureScreenshot', { format: 'png' });
    const shotPath = `${ARTIFACT_DIR}/verified_camera_controls_nobounce.png`;
    fs.writeFileSync(shotPath, Buffer.from(screenshot.data, 'base64'));
    console.log(`Saved verification artifact to: ${shotPath}`);

    console.log('\n=== ALL 4 VERIFICATION TESTS PASSED! ===');
  } finally {
    try { chromeProc.kill('SIGKILL'); } catch (_) {}
  }
}

run().catch(err => {
  console.error('\nVerification failed:', err);
  process.exit(1);
});
