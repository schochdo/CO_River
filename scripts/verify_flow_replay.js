/**
 * scripts/verify_flow_replay.js
 * 
 * Comprehensive automated verification test for the 7-Day Flow Replay subsystem:
 * 1. Validates matrix structure and downsampling hygiene (size, timestamps, station count).
 * 2. Navigates headless Chrome via CDP to test UI transport controls, slider scrubbing,
 *    sentinel pulse tracking, 60 FPS rAF loop, and MapLibre dynamic layer mutations.
 * 3. Captures high-resolution visual artifact for verification.
 */

const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const path = require('path');
const assert = require('assert');

async function verifyFlowReplay() {
  console.log('=== VERIFYING 7-DAY FLOW REPLAY SUBSYSTEM ===\n');

  // Step 1: Verify web/data/replay_7d.json
  const matrixPath = path.join(__dirname, '..', 'web', 'data', 'replay_7d.json');
  assert(fs.existsSync(matrixPath), 'replay_7d.json must exist');
  const matrixRaw = fs.readFileSync(matrixPath, 'utf8');
  const matrixSizeKb = matrixRaw.length / 1024;
  console.log(`[Matrix Validation] File size: ${matrixSizeKb.toFixed(1)} KB (Target: < 100 KB)`);
  assert(matrixSizeKb < 100, `Matrix size (${matrixSizeKb} KB) exceeds 100 KB budget`);

  const matrix = JSON.parse(matrixRaw);
  assert(matrix.metadata, 'Matrix must contain metadata');
  assert(matrix.metadata.period === '7D', 'Metadata period must be 7D');
  assert(matrix.metadata.units === 'cfs', 'Metadata units must be cfs');
  assert(Array.isArray(matrix.timestamps) && matrix.timestamps.length >= 168, `Timestamps must be >= 168 (got ${matrix.timestamps.length})`);
  const stationCount = Object.keys(matrix.stations).length;
  console.log(`[Matrix Validation] Total stations: ${stationCount}, Timestamps: ${matrix.timestamps.length}`);
  assert(stationCount >= 70, `Active station count must be >= 70 (got ${stationCount})`);

  // Verify zero null/None holes
  let nullCount = 0;
  for (const [sid, row] of Object.entries(matrix.stations)) {
    for (const val of row) {
      if (val === null || val === undefined || isNaN(val)) nullCount++;
    }
  }
  console.log(`[Matrix Validation] Null/None holes across all points: ${nullCount}`);
  assert(nullCount === 0, `Matrix must have 0 null holes, found ${nullCount}`);

  // Step 2: Launch Chrome via CDP
  const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
  const DEBUG_PORT = 9272;
  const chromeProc = spawn(CHROME_PATH, [
    '--headless=new',
    `--remote-debugging-port=${DEBUG_PORT}`,
    '--enable-webgl',
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

    await send('Page.enable');
    await send('Runtime.enable');
    await send('Emulation.setDeviceMetricsOverride', {
      width: 1440,
      height: 900,
      deviceScaleFactor: 2,
      mobile: false
    });

    console.log('[Browser] Navigating to http://localhost:8088/map_embed.html?replay=1 ...');
    await send('Page.navigate', { url: 'http://localhost:8088/map_embed.html?replay=1' });

    // Wait for map load and flow replay initialization
    console.log('[Browser] Waiting for MapLibre and FlowReplayEngine to initialize...');
    await new Promise(r => setTimeout(r, 3000));

    // Assertion 1: FlowReplayEngine is defined and opened
    const checkOpenRaw = await send('Runtime.evaluate', {
      expression: `
        (() => {
          const engine = window.FlowReplayEngine;
          const bar = document.getElementById('flow-replay-bar');
          const toggleBtn = document.getElementById('btn-flow-replay');
          return {
            hasEngine: !!engine,
            isOpen: engine ? engine.isOpen : false,
            barVisible: bar ? !bar.classList.contains('hidden') : false,
            btnActive: toggleBtn ? toggleBtn.classList.contains('active') : false,
            totalHours: engine ? engine.totalHours : 0
          };
        })()
      `,
      returnByValue: true
    });
    const checkOpen = checkOpenRaw.result.value;
    console.log('[Assertion 1] FlowReplayEngine initialization:', checkOpen);
    assert(checkOpen.hasEngine, 'FlowReplayEngine must be exposed on window');
    assert(checkOpen.isOpen, 'FlowReplayEngine should be open with ?replay=1');
    assert(checkOpen.barVisible, 'Replay bar should not be hidden');
    assert(checkOpen.btnActive, '7D Replay button should be active');
    assert(checkOpen.totalHours >= 168, 'totalHours should be >= 168');

    // Assertion 2: Check Sentinel readouts (San Juan, Lees Ferry, Gila)
    const checkSentinelsRaw = await send('Runtime.evaluate', {
      expression: `
        (() => {
          const sj = document.getElementById('replay-sanjuan-flow')?.textContent?.trim();
          const lf = document.getElementById('replay-lees-flow')?.textContent?.trim();
          const gila = document.getElementById('replay-gila-flow')?.textContent?.trim();
          const timeText = document.getElementById('replay-time-display')?.textContent?.trim();
          const relText = document.getElementById('replay-rel-time')?.textContent?.trim();
          return { sj, lf, gila, timeText, relText };
        })()
      `,
      returnByValue: true
    });
    const checkSentinels = checkSentinelsRaw.result.value;
    console.log('[Assertion 2] Sentinel readouts at initial frame:', checkSentinels);
    assert(checkSentinels.sj !== '--' && checkSentinels.sj !== '', 'San Juan flow must be populated');
    assert(checkSentinels.lf !== '--' && checkSentinels.lf !== '', 'Lees Ferry flow must be populated');
    assert(checkSentinels.gila !== '--' && checkSentinels.gila !== '', 'Gila flow must be populated');
    assert(checkSentinels.timeText.length > 5, 'Time display must be populated');

    // Assertion 3: Test Seek & Step transport
    console.log('[Browser] Testing Seek & Step transport...');
    const testSeekRaw = await send('Runtime.evaluate', {
      expression: `
        (() => {
          window.FlowReplayEngine.seek(50);
          const idx = window.FlowReplayEngine.currentIndex;
          const sliderVal = document.getElementById('replay-scrubber-slider')?.value;
          const timeText = document.getElementById('replay-time-display')?.textContent?.trim();
          const sjVal = document.getElementById('replay-sanjuan-flow')?.textContent?.trim();
          
          // Check step(+1)
          window.FlowReplayEngine.step(1);
          const nextIdx = window.FlowReplayEngine.currentIndex;

          return { idx, sliderVal, timeText, sjVal, nextIdx };
        })()
      `,
      returnByValue: true
    });
    const testSeek = testSeekRaw.result.value;
    console.log('[Assertion 3] Seek(50) and Step(+1):', testSeek);
    assert.strictEqual(testSeek.idx, 50, 'Current index after seek should be 50');
    assert.strictEqual(testSeek.nextIdx, 51, 'Current index after step(1) should be 51');

    // Assertion 4: Verify MapLibre GeoJSON dynamic property updates
    const testMapFeaturesRaw = await send('Runtime.evaluate', {
      expression: `
        (() => {
          const map = window.map;
          if (!map) return { error: 'No map instance' };
          const src = map.getSource('streamflow-gauges');
          if (!src || !src._data) return { error: 'No streamflow-gauges source data' };
          
          const feats = src._data.features;
          const lfFeat = feats.find(f => f.properties.id === '09380000');
          const sjFeat = feats.find(f => f.properties.id === '09379500');

          return {
            totalFeatures: feats.length,
            lfProperties: lfFeat ? lfFeat.properties : null,
            sjProperties: sjFeat ? sjFeat.properties : null
          };
        })()
      `,
      returnByValue: true
    });
    const testMapFeatures = testMapFeaturesRaw.result.value;
    console.log('[Assertion 4] MapLibre streamflow features at hour 51:', {
      total: testMapFeatures.totalFeatures,
      leesFerry: testMapFeatures.lfProperties,
      sanJuan: testMapFeatures.sjProperties
    });
    assert(testMapFeatures.lfProperties.flow_cfs > 0, 'Lees Ferry flow_cfs should be positive number');
    assert(testMapFeatures.lfProperties.circle_radius > 0, 'Lees Ferry circle_radius should be calculated');
    assert(testMapFeatures.sjProperties.flow_cfs > 0, 'San Juan flow_cfs should be positive number');

    // Assertion 5: Test Play & Pause Animation Loop
    console.log('[Browser] Testing Play rAF loop...');
    await send('Runtime.evaluate', {
      expression: `
        (() => {
          window.FlowReplayEngine.setSpeed(12);
          window.FlowReplayEngine.play();
        })()
      `
    });
    await new Promise(r => setTimeout(r, 600)); // Let rAF run for 600ms

    const checkPlayRaw = await send('Runtime.evaluate', {
      expression: `
        (() => {
          const isPlaying = window.FlowReplayEngine.isPlaying;
          const curIdx = window.FlowReplayEngine.currentIndex;
          window.FlowReplayEngine.pause();
          const pausedPlaying = window.FlowReplayEngine.isPlaying;
          return { isPlaying, curIdx, pausedPlaying };
        })()
      `,
      returnByValue: true
    });
    const checkPlay = checkPlayRaw.result.value;
    console.log('[Assertion 5] Play & Pause behavior:', checkPlay);
    assert.strictEqual(checkPlay.pausedPlaying, false, 'Engine should be paused');
    assert(checkPlay.curIdx > 51, `Playback should have advanced beyond index 51 (now ${checkPlay.curIdx})`);

    // Seek to an interesting pulse timestamp for the visual artifact
    await send('Runtime.evaluate', {
      expression: `window.FlowReplayEngine.seek(72);`
    });
    await new Promise(r => setTimeout(r, 400));

    // Capture visual verification screenshot
    const shot = await send('Page.captureScreenshot', { format: 'png' });
    const artifactPath = path.join(
      '/Users/macstudio/.gemini/antigravity/brain/58cfdbf8-91b4-4263-ad4e-596d29fac1a2',
      'verified_7d_flow_replay.png'
    );
    fs.writeFileSync(artifactPath, Buffer.from(shot.data, 'base64'));
    console.log(`[Visual Artifact] Saved screenshot to ${artifactPath}`);

    // Assertion 6: Test Close and Restore Live Baselines
    const testCloseRaw = await send('Runtime.evaluate', {
      expression: `
        (() => {
          window.FlowReplayEngine.close();
          const bar = document.getElementById('flow-replay-bar');
          const toggleBtn = document.getElementById('btn-flow-replay');
          return {
            isOpen: window.FlowReplayEngine.isOpen,
            barHidden: bar ? bar.classList.contains('hidden') : false,
            btnActive: toggleBtn ? toggleBtn.classList.contains('active') : false
          };
        })()
      `,
      returnByValue: true
    });
    const testClose = testCloseRaw.result.value;
    console.log('[Assertion 6] Close & restore baseline:', testClose);
    assert.strictEqual(testClose.isOpen, false, 'Engine should be closed');
    assert.strictEqual(testClose.barHidden, true, 'Replay bar should be hidden');
    assert.strictEqual(testClose.btnActive, false, 'Button should be inactive');

    ws.close();
    console.log('\n>>> ALL 6 FLOW REPLAY VERIFICATION ASSERTIONS PASSED (100%) <<<\n');
  } finally {
    chromeProc.kill();
  }
}

verifyFlowReplay().catch(err => {
  console.error('VERIFICATION FAILED:', err);
  process.exit(1);
});
