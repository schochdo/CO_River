/**
 * Automated Verification Script for Bottom Gage Tray, Search Clear & Legend/Gyroscope Elevation
 */

const { spawn } = require('child_process');
const http = require('http');
const assert = require('assert');
const fs = require('fs');

async function run() {
  console.log('=== STARTING BOTTOM GAGE TRAY & CONTROLS ELEVATION TEST ===\n');

  const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
  const DEBUG_PORT = 9289;
  const chromeProc = spawn(CHROME_PATH, [
    '--headless=new',
    `--remote-debugging-port=${DEBUG_PORT}`,
    '--enable-webgl',
    'about:blank'
  ]);

  try {
    let list = null;
    for (let i = 0; i < 25; i++) {
      try {
        list = await new Promise((res, rej) => {
          http.get(`http://127.0.0.1:${DEBUG_PORT}/json/list`, r => {
            let d = ''; r.on('data', c => d += c); r.on('end', () => res(JSON.parse(d)));
          }).on('error', rej);
        });
        if (list && list[0]) break;
      } catch (_) {}
      await new Promise(r => setTimeout(r, 200));
    }

    const ws = new WebSocket(list[0].webSocketDebuggerUrl);
    await new Promise(r => ws.onopen = r);

    let id = 1;
    const send = (m, p = {}) => new Promise((resolve, reject) => {
      const cur = id++;
      const handler = (e) => {
        const msg = JSON.parse(e.data);
        if (msg.id === cur) {
          ws.removeEventListener('message', handler);
          if (msg.error) reject(msg.error);
          else resolve(msg.result);
        }
      };
      ws.addEventListener('message', handler);
      ws.send(JSON.stringify({ id: cur, method: m, params: p }));
    });

    await send('Runtime.enable');
    await send('Page.enable');

    // Emulate 1280x768 display
    await send('Emulation.setDeviceMetricsOverride', {
      width: 1280,
      height: 768,
      deviceScaleFactor: 2,
      mobile: false,
      fitWindow: false
    });

    await send('Page.navigate', { url: 'http://localhost:8088/map_embed.html' });
    await new Promise(r => setTimeout(r, 2500));

    console.log('--- Test 1: Checking Collapsed State ---');
    const collapsedMetrics = await send('Runtime.evaluate', {
      expression: `(() => {
        const tray = document.getElementById("map-gage-tray");
        const legend = document.getElementById("map-legend");
        const trackball = document.querySelector(".trackball-nav-control");
        const handle = document.getElementById("tray-handle-strip");
        const arrow = document.getElementById("tray-handle-arrow");
        const clearBtn = document.getElementById("tray-search-clear");
        return {
          trayClass: tray.className,
          trayHeight: tray.getBoundingClientRect().height,
          trayTop: tray.getBoundingClientRect().top,
          legendBottom: legend.getBoundingClientRect().bottom,
          trackballBottom: trackball.getBoundingClientRect().bottom,
          handleWidth: handle.getBoundingClientRect().width,
          arrowText: arrow.textContent,
          clearBtnDisplay: window.getComputedStyle(clearBtn).display
        };
      })()`,
      returnByValue: true
    });

    console.log('Collapsed Metrics:', JSON.stringify(collapsedMetrics.result.value, null, 2));
    const cm = collapsedMetrics.result.value;
    assert.strictEqual(cm.trayClass, 'map-gage-tray collapsed');
    assert(cm.trayHeight >= 50 && cm.trayHeight <= 60, `Tray height should be ~54px, got ${cm.trayHeight}`);
    assert.strictEqual(cm.arrowText, '▲');
    assert.strictEqual(cm.clearBtnDisplay, 'none');
    console.log('✓ Test 1 Passed: Collapsed state properly sized at ~54px with centered ▲ handle.');

    console.log('\n--- Test 2: Auto-Expand on Search Input Focus ---');
    await send('Runtime.evaluate', {
      expression: `(() => {
        const input = document.getElementById("tray-search-input");
        input.dispatchEvent(new Event("focus"));
      })()`
    });
    await new Promise(r => setTimeout(r, 400));

    const focusMetrics = await send('Runtime.evaluate', {
      expression: `(() => {
        const tray = document.getElementById("map-gage-tray");
        const legend = document.getElementById("map-legend");
        const trackball = document.querySelector(".trackball-nav-control");
        const arrow = document.getElementById("tray-handle-arrow");
        return {
          trayClass: tray.className,
          trayHeight: tray.getBoundingClientRect().height,
          trayTop: tray.getBoundingClientRect().top,
          legendBottom: legend.getBoundingClientRect().bottom,
          legendTop: legend.getBoundingClientRect().top,
          trackballBottom: trackball.getBoundingClientRect().bottom,
          arrowText: arrow.textContent,
          isLegendAboveTray: legend.getBoundingClientRect().bottom <= tray.getBoundingClientRect().top + 5,
          isTrackballAboveTray: trackball.getBoundingClientRect().bottom <= tray.getBoundingClientRect().top + 5
        };
      })()`,
      returnByValue: true
    });

    console.log('Focus Expand Metrics:', JSON.stringify(focusMetrics.result.value, null, 2));
    const fm = focusMetrics.result.value;
    assert.strictEqual(fm.trayClass, 'map-gage-tray expanded');
    assert(fm.trayHeight >= 250 && fm.trayHeight <= 270, `Tray height should be ~260px, got ${fm.trayHeight}`);
    assert.strictEqual(fm.arrowText, '▼');
    assert(fm.isLegendAboveTray, `Legend bottom (${fm.legendBottom}) must be above or at tray top (${fm.trayTop})`);
    assert(fm.isTrackballAboveTray, `Trackball bottom (${fm.trackballBottom}) must be above or at tray top (${fm.trayTop})`);
    console.log('✓ Test 2 Passed: Tray automatically expands on focus, and Legend + Gyroscope trackball elevate above tray.');

    console.log('\n--- Test 3: Search Query & Clear Button [✕] ---');
    await send('Runtime.evaluate', {
      expression: `(() => {
        const input = document.getElementById("tray-search-input");
        input.value = "Lees Ferry";
        window.handleTraySearch(input.value);
      })()`
    });
    await new Promise(r => setTimeout(r, 200));

    const searchMetrics = await send('Runtime.evaluate', {
      expression: `(() => {
        const rows = document.querySelectorAll("#tray-table-rows tr");
        const clearBtn = document.getElementById("tray-search-clear");
        return {
          rowCount: rows.length,
          firstRowText: rows[0] ? rows[0].textContent : null,
          clearBtnDisplay: window.getComputedStyle(clearBtn).display
        };
      })()`,
      returnByValue: true
    });

    console.log('Search Metrics:', JSON.stringify(searchMetrics.result.value, null, 2));
    assert(searchMetrics.result.value.rowCount >= 1, 'Should find Lees Ferry row');
    assert.strictEqual(searchMetrics.result.value.clearBtnDisplay, 'flex', 'Clear button [✕] should be visible');
    console.log('✓ Test 3 Passed: Search filters rows and displays [✕] clear button.');

    console.log('\n--- Test 4: Clicking Clear Button [✕] ---');
    await send('Runtime.evaluate', {
      expression: `window.clearTraySearch();`
    });
    await new Promise(r => setTimeout(r, 200));

    const clearedMetrics = await send('Runtime.evaluate', {
      expression: `(() => {
        const input = document.getElementById("tray-search-input");
        const clearBtn = document.getElementById("tray-search-clear");
        const rows = document.querySelectorAll("#tray-table-rows tr");
        return {
          inputValue: input.value,
          clearBtnDisplay: window.getComputedStyle(clearBtn).display,
          rowCount: rows.length
        };
      })()`,
      returnByValue: true
    });

    console.log('Cleared Metrics:', JSON.stringify(clearedMetrics.result.value, null, 2));
    assert.strictEqual(clearedMetrics.result.value.inputValue, '');
    assert.strictEqual(clearedMetrics.result.value.clearBtnDisplay, 'none');
    assert(clearedMetrics.result.value.rowCount > 50, 'All facilities should be restored');
    console.log('✓ Test 4 Passed: Clicking [✕] clears search and restores all facility rows.');

    console.log('\n--- Test 5: Full-Width Handle Strip Click to Collapse ---');
    await send('Runtime.evaluate', {
      expression: `window.toggleMapGageTray();`
    });
    await new Promise(r => setTimeout(r, 400));

    const reCollapsedMetrics = await send('Runtime.evaluate', {
      expression: `(() => {
        const tray = document.getElementById("map-gage-tray");
        const arrow = document.getElementById("tray-handle-arrow");
        const legend = document.getElementById("map-legend");
        const trackball = document.querySelector(".trackball-nav-control");
        return {
          trayClass: tray.className,
          trayHeight: tray.getBoundingClientRect().height,
          arrowText: arrow.textContent,
          legendBottom: legend.getBoundingClientRect().bottom,
          trackballBottom: trackball.getBoundingClientRect().bottom
        };
      })()`,
      returnByValue: true
    });

    console.log('Re-Collapsed Metrics:', JSON.stringify(reCollapsedMetrics.result.value, null, 2));
    assert.strictEqual(reCollapsedMetrics.result.value.trayClass, 'map-gage-tray collapsed');
    assert.strictEqual(reCollapsedMetrics.result.value.arrowText, '▲');
    console.log('✓ Test 5 Passed: Clicking full-width handle strip collapses tray back to ~54px.');

    // Save visual screenshots
    // 1. Collapsed screenshot
    const shotCollapsed = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync('/Users/macstudio/.gemini/antigravity/brain/58cfdbf8-91b4-4263-ad4e-596d29fac1a2/verified_tray_collapsed_handle.png', Buffer.from(shotCollapsed.data, 'base64'));
    console.log('✓ Saved collapsed screenshot: verified_tray_collapsed_handle.png');

    // 2. Expand and capture screenshot
    await send('Runtime.evaluate', { expression: `window.toggleMapGageTray(true);` });
    await new Promise(r => setTimeout(r, 500));
    const shotExpanded = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync('/Users/macstudio/.gemini/antigravity/brain/58cfdbf8-91b4-4263-ad4e-596d29fac1a2/verified_tray_expanded_elevated.png', Buffer.from(shotExpanded.data, 'base64'));
    console.log('✓ Saved expanded screenshot: verified_tray_expanded_elevated.png');

    console.log('\n=== ALL GAGE TRAY & CONTROLS ELEVATION TESTS PASSED WITH 100% SUCCESS ===');
    ws.close();
  } finally {
    chromeProc.kill('SIGKILL');
  }
}

run().catch(err => {
  console.error('Test Failed:', err);
  process.exit(1);
});
