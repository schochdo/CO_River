/**
 * Automated Verification Script for Dynamic Map Legend Synchronization
 *
 * Verifies that:
 * 1. Default initial legend accurately reflects active default layers.
 * 2. Toggling off individual layers (dams, tunnels, canals, reservoirs, divide, basin)
 *    immediately hides their corresponding legend items.
 * 3. Toggling off an entire category (e.g. all 3 streamflow tiers) hides the category header.
 * 4. Station grid reflects station visibility and sub-layer visibility (tunnels, canals, reservoirs).
 * 5. Badges toggle controls the Live Flow Badge legend item.
 * 6. Topology diagnostics items are granularly synced (only active diagnostic features appear).
 * 7. When all layers are turned off, the empty notice appears cleanly.
 * 8. Re-enabling layers restores their legend items and section headers.
 */

const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const path = require('path');
const assert = require('assert');

const ARTIFACT_DIR = '/Users/macstudio/.gemini/antigravity/brain/58cfdbf8-91b4-4263-ad4e-596d29fac1a2';
const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const DEBUG_PORT = 9272;

async function run() {
  console.log('=== STARTING MAP LEGEND LAYER SYNC VERIFICATION SUITE ===\n');

  const chromeProc = spawn(CHROME_PATH, [
    '--headless=new',
    `--remote-debugging-port=${DEBUG_PORT}`,
    '--enable-webgl',
    '--ignore-gpu-blocklist',
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
        const res = JSON.parse(e.data);
        if (res.id === msgId) {
          ws.removeEventListener('message', handler);
          if (res.error) reject(new Error(JSON.stringify(res.error)));
          else resolve(res.result);
        }
      };
      ws.addEventListener('message', handler);
      ws.send(JSON.stringify({ id: msgId, method: m, params: p }));
    });

    await send('Page.enable');
    await send('Runtime.enable');
    await send('Emulation.setDeviceMetricsOverride', {
      width: 1440,
      height: 960,
      deviceScaleFactor: 2,
      mobile: false
    });

    async function evaluate(expr) {
      const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
      if (r.exceptionDetails) {
        throw new Error(JSON.stringify(r.exceptionDetails));
      }
      return r.result.value;
    }

    async function captureScreenshot(filename) {
      const shot = await send('Page.captureScreenshot', { format: 'png' });
      const filePath = path.join(ARTIFACT_DIR, filename);
      fs.writeFileSync(filePath, Buffer.from(shot.data, 'base64'));
      console.log(`Saved screenshot: ${filename}`);
      return filePath;
    }

    async function getLegendDisplays() {
      return await evaluate(`(() => {
        const getD = id => {
          const el = document.getElementById(id);
          return el ? window.getComputedStyle(el).display : 'NOT_FOUND';
        };
        return {
          secStreamflow: getD('legend-sec-streamflow'),
          itemMainstem: getD('legend-item-river-mainstem'),
          itemMajor: getD('legend-item-river-major'),
          itemMinor: getD('legend-item-river-minor'),

          secInfra: getD('legend-sec-infrastructure'),
          itemReservoirs: getD('legend-item-reservoirs'),
          itemDams: getD('legend-item-dams'),
          itemDivide: getD('legend-item-divide'),
          itemBasin: getD('legend-item-basin'),
          itemTunnels: getD('legend-item-tunnels'),
          itemCanals: getD('legend-item-canals'),

          stationGrid: getD('legend-stations-grid'),
          stStreamflow: getD('legend-item-station-streamflow'),
          stReservoirs: getD('legend-item-station-reservoirs'),
          stTunnels: getD('legend-item-station-tunnels'),
          stCanals: getD('legend-item-station-canals'),
          itemFlowBadge: getD('legend-item-flow-badge'),

          secTopology: getD('topology-diagnostics-legend'),
          diagArrows: getD('legend-item-diag-arrows'),
          diagJunctions: getD('legend-item-diag-junctions'),
          diagSectionsStart: getD('legend-item-diag-sections-start'),
          diagSectionsBoundary: getD('legend-item-diag-sections-boundary'),

          secFlowHealth: getD('flow-health-legend'),
          emptyNotice: getD('legend-empty-notice')
        };
      })()`);
    }

    async function toggleCheckbox(id, checked) {
      await evaluate(`(() => {
        const cb = document.getElementById('${id}');
        if (cb) {
          cb.checked = ${checked};
          toggleLayer('${id.replace('toggle-', '')}');
        }
      })()`);
    }

    // Navigate to map.html
    console.log('--- TEST 1: Default Initial State on map.html ---');
    await send('Page.navigate', { url: 'http://localhost:8088/map.html' });
    await new Promise(r => setTimeout(r, 3000));

    let state = await getLegendDisplays();
    console.log('Default legend displays:', state);

    assert.notStrictEqual(state.secStreamflow, 'none', 'Streamflow section must be visible by default');
    assert.notStrictEqual(state.itemMainstem, 'none', 'Mainstem item must be visible');
    assert.notStrictEqual(state.itemMajor, 'none', 'Major rivers item must be visible');
    assert.notStrictEqual(state.itemMinor, 'none', 'Secondary streams item must be visible');

    assert.notStrictEqual(state.secInfra, 'none', 'Infrastructure section must be visible');
    assert.notStrictEqual(state.itemReservoirs, 'none', 'Reservoirs item must be visible');
    assert.notStrictEqual(state.itemDams, 'none', 'Dams item must be visible');
    assert.notStrictEqual(state.itemDivide, 'none', 'Divide item must be visible');
    assert.notStrictEqual(state.itemBasin, 'none', 'Basin item must be visible');
    assert.notStrictEqual(state.itemTunnels, 'none', 'Tunnels item must be visible');
    assert.notStrictEqual(state.itemCanals, 'none', 'Canals item must be visible');

    assert.notStrictEqual(state.stationGrid, 'none', 'Station grid must be visible by default');
    assert.strictEqual(state.itemFlowBadge, 'none', 'Live Flow Badge must be hidden by default (toggle is unchecked)');
    assert.strictEqual(state.secTopology, 'none', 'Topology diagnostics must be hidden by default');
    assert.strictEqual(state.emptyNotice, 'none', 'Empty notice must be hidden when layers are active');

    await captureScreenshot('verified_legend_default_state.png');
    console.log('✔ Initial default legend matches active layers accurately\n');

    // --- TEST 2: Turning off individual infrastructure layers ---
    console.log('--- TEST 2: Turn off Dams, Tunnels, and Canals ---');
    await toggleCheckbox('toggle-dams', false);
    await toggleCheckbox('toggle-tunnels', false);
    await toggleCheckbox('toggle-canals', false);
    state = await getLegendDisplays();

    console.log('After turning off dams, tunnels, canals:');
    assert.strictEqual(state.itemDams, 'none', 'Dams item must be hidden when toggle-dams is unchecked');
    assert.strictEqual(state.itemTunnels, 'none', 'Tunnels item must be hidden when toggle-tunnels is unchecked');
    assert.strictEqual(state.stTunnels, 'none', 'Station tunnels item in grid must be hidden when toggle-tunnels is unchecked');
    assert.strictEqual(state.itemCanals, 'none', 'Canals item must be hidden when toggle-canals is unchecked');
    assert.strictEqual(state.stCanals, 'none', 'Station canals item in grid must be hidden when toggle-canals is unchecked');
    assert.notStrictEqual(state.itemReservoirs, 'none', 'Reservoirs item must still be visible');
    assert.notStrictEqual(state.secInfra, 'none', 'Infrastructure section must remain visible while other items are active');
    console.log('✔ Individual infrastructure items turn off on legend when unchecked\n');

    // --- TEST 3: Turning off remaining infrastructure to test section header auto-hide ---
    console.log('--- TEST 3: Turn off Reservoirs, Divide, and Basin (Full Infrastructure Collapse) ---');
    await toggleCheckbox('toggle-reservoirs', false);
    await toggleCheckbox('toggle-divide', false);
    await toggleCheckbox('toggle-basin', false);
    state = await getLegendDisplays();

    assert.strictEqual(state.itemReservoirs, 'none', 'Reservoirs item must be hidden');
    assert.strictEqual(state.stReservoirs, 'none', 'Station reservoirs item in grid must be hidden');
    assert.strictEqual(state.itemDivide, 'none', 'Divide item must be hidden');
    assert.strictEqual(state.itemBasin, 'none', 'Basin item must be hidden');
    assert.strictEqual(state.secInfra, 'none', 'Infrastructure section title MUST be hidden when all infrastructure items are off');
    console.log('✔ Infrastructure section header auto-hides when all infrastructure items are off\n');

    // --- TEST 4: Turn off rivers one by one ---
    console.log('--- TEST 4: Turn off Streamflow Reaches (Mainstem, Major, Minor) ---');
    await toggleCheckbox('toggle-river-mainstem', false);
    state = await getLegendDisplays();
    assert.strictEqual(state.itemMainstem, 'none', 'Mainstem item must be hidden');
    assert.notStrictEqual(state.itemMajor, 'none', 'Major tributaries must remain visible');
    assert.notStrictEqual(state.secStreamflow, 'none', 'Streamflow section header must remain visible');

    await toggleCheckbox('toggle-river-major', false);
    await toggleCheckbox('toggle-river-minor', false);
    state = await getLegendDisplays();
    assert.strictEqual(state.itemMajor, 'none', 'Major item must be hidden');
    assert.strictEqual(state.itemMinor, 'none', 'Minor item must be hidden');
    assert.strictEqual(state.secStreamflow, 'none', 'Streamflow section title MUST be hidden when all river tiers are off');
    assert.strictEqual(state.stStreamflow, 'none', 'Station streamflow in grid must be hidden when streamflow reaches are off');
    console.log('✔ Streamflow items and header auto-hide cleanly\n');

    // --- TEST 5: Toggle stations and badges ---
    console.log('--- TEST 5: Toggle Stations & Live Flow Badges ---');
    await toggleCheckbox('toggle-all-badges', true);
    state = await getLegendDisplays();
    assert.notStrictEqual(state.itemFlowBadge, 'none', 'Live Flow Badge must become visible when toggle-all-badges is checked');

    await toggleCheckbox('toggle-streamflow-gauges', false);
    state = await getLegendDisplays();
    assert.strictEqual(state.stationGrid, 'none', 'Station grid must be completely hidden when toggle-streamflow-gauges is off');
    console.log('✔ Station grid and flow badges dynamically sync with checkboxes\n');

    // --- TEST 6: Granular Topology Diagnostics Sync ---
    console.log('--- TEST 6: Granular Topology Diagnostics Layer Sync ---');
    // Turn on only flow direction arrows
    await toggleCheckbox('toggle-flow-arrows', true);
    state = await getLegendDisplays();
    assert.notStrictEqual(state.secTopology, 'none', 'Topology section must be visible');
    assert.notStrictEqual(state.diagArrows, 'none', 'Flow Direction (▶) must be visible');
    assert.strictEqual(state.diagJunctions, 'none', 'Confluence Junctions (■) must remain hidden');
    assert.strictEqual(state.diagSectionsStart, 'none', 'Reach Section Nodes must remain hidden');

    // Turn off arrows, turn on junctions
    await toggleCheckbox('toggle-flow-arrows', false);
    await toggleCheckbox('toggle-topology-junctions', true);
    state = await getLegendDisplays();
    assert.notStrictEqual(state.secTopology, 'none', 'Topology section must be visible');
    assert.strictEqual(state.diagArrows, 'none', 'Flow Direction (▶) must be hidden');
    assert.notStrictEqual(state.diagJunctions, 'none', 'Confluence Junctions (■) must be visible');
    assert.strictEqual(state.diagSectionsStart, 'none', 'Reach Section Nodes must remain hidden');

    // Turn on section nodes
    await toggleCheckbox('toggle-topology-sections', true);
    state = await getLegendDisplays();
    assert.notStrictEqual(state.diagSectionsStart, 'none', 'Reach Start must be visible');
    assert.notStrictEqual(state.diagSectionsBoundary, 'none', 'Reach Boundary must be visible');
    console.log('✔ Topology diagnostics legend shows ONLY the active diagnostic layers\n');

    // --- TEST 7: Turn off literally EVERYTHING (Empty Notice Check) ---
    console.log('--- TEST 7: Turn off All Layers & Verify Empty Notice ---');
    await toggleCheckbox('toggle-topology-junctions', false);
    await toggleCheckbox('toggle-topology-sections', false);
    await toggleCheckbox('toggle-all-badges', false);
    await toggleCheckbox('toggle-flow-health', false);
    state = await getLegendDisplays();

    console.log('All layers off state:', state);
    assert.strictEqual(state.secStreamflow, 'none');
    assert.strictEqual(state.secInfra, 'none');
    assert.strictEqual(state.stationGrid, 'none');
    assert.strictEqual(state.itemFlowBadge, 'none');
    assert.strictEqual(state.secTopology, 'none');
    assert.strictEqual(state.secFlowHealth, 'none');
    assert.notStrictEqual(state.emptyNotice, 'none', 'Empty notice must appear when ALL layers are turned off');

    await captureScreenshot('verified_legend_all_layers_off.png');
    console.log('✔ Empty notice appears when all layers are turned off\n');

    // --- TEST 8: Re-enable layers and verify instant recovery ---
    console.log('--- TEST 8: Re-enable layers and verify instant recovery ---');
    await toggleCheckbox('toggle-river-mainstem', true);
    await toggleCheckbox('toggle-dams', true);
    state = await getLegendDisplays();

    assert.strictEqual(state.emptyNotice, 'none', 'Empty notice must disappear as soon as any layer is active');
    assert.notStrictEqual(state.secStreamflow, 'none', 'Streamflow section must re-appear');
    assert.notStrictEqual(state.itemMainstem, 'none', 'Mainstem item must re-appear');
    assert.strictEqual(state.itemMajor, 'none', 'Major item remains hidden (still unchecked)');
    assert.notStrictEqual(state.secInfra, 'none', 'Infrastructure section must re-appear');
    assert.notStrictEqual(state.itemDams, 'none', 'Dams item must re-appear');
    assert.strictEqual(state.itemReservoirs, 'none', 'Reservoirs remains hidden (still unchecked)');

    await captureScreenshot('verified_legend_partial_reenabled.png');
    console.log('✔ Legend accurately updates on re-enabling layers\n');

    console.log('==================================================');
    console.log('ALL 8 LEGEND SYNC TESTS PASSED WITH 100% SUCCESS!');
    console.log('==================================================');
  } finally {
    chromeProc.kill('SIGKILL');
  }
}

run().catch(err => {
  console.error('VERIFICATION FAILED:', err);
  process.exit(1);
});
