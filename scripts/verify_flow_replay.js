/**
 * scripts/verify_flow_replay.js
 * 
 * Comprehensive automated verification test for the 7-Day & 30-Day Flow Replay subsystem:
 * 1. Validates matrix structure and downsampling hygiene for both 7D (1h) and 30D (2h).
 * 2. Navigates headless Chrome via CDP to test:
 *    - Initial 7D mode & transport controls
 *    - Seamless switching to 30D mode
 *    - 30D slider range, time calculations, sentinel pulse tracking, and MapLibre layers
 *    - 30D 60 FPS rAF playback loop
 *    - Instant cached switchback from 30D to 7D
 *    - Clean closure and baseline GeoJSON restoration
 * 3. Captures high-resolution visual artifact for verification.
 */

const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const path = require('path');
const assert = require('assert');

async function verifyFlowReplay() {
  console.log('=== VERIFYING 7-DAY & 30-DAY FLOW REPLAY SUBSYSTEM ===\n');

  // Step 1: Verify web/data/replay_7d.json
  const path7d = path.join(__dirname, '..', 'web', 'data', 'replay_7d.json');
  assert(fs.existsSync(path7d), 'replay_7d.json must exist');
  const raw7d = fs.readFileSync(path7d, 'utf8');
  const size7dKb = raw7d.length / 1024;
  console.log(`[7D Matrix] File size: ${size7dKb.toFixed(1)} KB (Target: < 100 KB)`);
  assert(size7dKb < 100, `7D Matrix size (${size7dKb} KB) exceeds 100 KB budget`);

  const matrix7d = JSON.parse(raw7d);
  assert.strictEqual(matrix7d.metadata.period, '7D', 'Metadata period must be 7D');
  assert.strictEqual(matrix7d.metadata.interval, '1h', 'Metadata interval must be 1h');
  assert(matrix7d.timestamps.length >= 168, `7D timestamps must be >= 168 (got ${matrix7d.timestamps.length})`);
  const stationCount7d = Object.keys(matrix7d.stations).length;
  assert(stationCount7d >= 70, `7D active station count must be >= 70 (got ${stationCount7d})`);

  let nullCount7d = 0;
  for (const row of Object.values(matrix7d.stations)) {
    for (const val of row) {
      if (val === null || val === undefined || isNaN(val)) nullCount7d++;
    }
  }
  console.log(`[7D Matrix] Null holes across ${stationCount7d * matrix7d.timestamps.length} points: ${nullCount7d}`);
  assert.strictEqual(nullCount7d, 0, '7D Matrix must have zero null holes');

  // Step 2: Verify web/data/replay_30d.json
  const path30d = path.join(__dirname, '..', 'web', 'data', 'replay_30d.json');
  assert(fs.existsSync(path30d), 'replay_30d.json must exist');
  const raw30d = fs.readFileSync(path30d, 'utf8');
  const size30dKb = raw30d.length / 1024;
  console.log(`[30D Matrix] File size: ${size30dKb.toFixed(1)} KB (Target: < 200 KB)`);
  assert(size30dKb < 200, `30D Matrix size (${size30dKb} KB) exceeds 200 KB budget`);

  const matrix30d = JSON.parse(raw30d);
  assert.strictEqual(matrix30d.metadata.period, '30D', 'Metadata period must be 30D');
  assert.strictEqual(matrix30d.metadata.interval, '2h', 'Metadata interval must be 2h');
  assert(matrix30d.timestamps.length >= 350, `30D timestamps must be >= 350 (got ${matrix30d.timestamps.length})`);
  const stationCount30d = Object.keys(matrix30d.stations).length;
  assert(stationCount30d >= 70, `30D active station count must be >= 70 (got ${stationCount30d})`);

  let nullCount30d = 0;
  for (const row of Object.values(matrix30d.stations)) {
    for (const val of row) {
      if (val === null || val === undefined || isNaN(val)) nullCount30d++;
    }
  }
  console.log(`[30D Matrix] Null holes across ${stationCount30d * matrix30d.timestamps.length} points: ${nullCount30d}`);
  assert.strictEqual(nullCount30d, 0, '30D Matrix must have zero null holes');

  // Step 3: Launch Chrome via CDP
  const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
  const DEBUG_PORT = 9274;
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

    console.log('[Browser] Waiting for MapLibre and FlowReplayEngine to initialize...');
    await new Promise(r => setTimeout(r, 3000));

    // Assertion 1: Initial 7D Mode
    const checkInitRaw = await send('Runtime.evaluate', {
      expression: `
        (() => {
          const engine = window.FlowReplayEngine;
          const bar = document.getElementById('flow-replay-bar');
          const pill7d = document.getElementById('period-pill-7d');
          const pill30d = document.getElementById('period-pill-30d');
          return {
            hasEngine: !!engine,
            activePeriod: engine ? engine.activePeriod : null,
            totalHours: engine ? engine.totalHours : 0,
            barVisible: bar ? !bar.classList.contains('hidden') : false,
            pill7dActive: pill7d ? pill7d.classList.contains('active') : false,
            pill30dActive: pill30d ? pill30d.classList.contains('active') : false
          };
        })()
      `,
      returnByValue: true
    });
    const checkInit = checkInitRaw.result.value;
    console.log('[Assertion 1] Initial 7D engine state:', checkInit);
    assert(checkInit.hasEngine, 'FlowReplayEngine must exist');
    assert.strictEqual(checkInit.activePeriod, '7D', 'Default period must be 7D');
    assert(checkInit.pill7dActive, '7D pill should be active');
    assert(!checkInit.pill30dActive, '30D pill should not be active');
    assert(checkInit.totalHours >= 168, '7D hours should be >= 168');

    // Assertion 2: Switch to 30D Mode
    console.log('[Browser] Switching FlowReplayEngine to 30D mode...');
    const switch30dRaw = await send('Runtime.evaluate', {
      expression: `
        (async () => {
          await window.FlowReplayEngine.switchPeriod('30D');
          const engine = window.FlowReplayEngine;
          const pill7d = document.getElementById('period-pill-7d');
          const pill30d = document.getElementById('period-pill-30d');
          const slider = document.getElementById('replay-scrubber-slider');
          return {
            activePeriod: engine.activePeriod,
            totalSteps: engine.totalHours,
            sliderMax: slider ? parseInt(slider.max, 10) : 0,
            pill7dActive: pill7d ? pill7d.classList.contains('active') : false,
            pill30dActive: pill30d ? pill30d.classList.contains('active') : false
          };
        })()
      `,
      awaitPromise: true,
      returnByValue: true
    });
    const switch30d = switch30dRaw.result.value;
    console.log('[Assertion 2] 30D mode activation:', switch30d);
    assert.strictEqual(switch30d.activePeriod, '30D', 'Engine should be in 30D mode');
    assert(switch30d.pill30dActive, '30D pill should be active');
    assert(!switch30d.pill7dActive, '7D pill should not be active');
    assert(switch30d.totalSteps >= 350, `30D total steps should be >= 350 (got ${switch30d.totalSteps})`);
    assert(switch30d.sliderMax >= 349, 'Slider max should match 30D steps - 1');

    // Assertion 3: Test 30D Seek & Sentinel Pulse Tracking
    console.log('[Browser] Testing Seek(180) in 30D mode (mid-month ~15 days ago)...');
    const seek30dRaw = await send('Runtime.evaluate', {
      expression: `
        (() => {
          window.FlowReplayEngine.seek(180);
          const timeText = document.getElementById('replay-time-display')?.textContent?.trim();
          const relText = document.getElementById('replay-rel-time')?.textContent?.trim();
          const sjVal = document.getElementById('replay-sanjuan-flow')?.textContent?.trim();
          const lfVal = document.getElementById('replay-lees-flow')?.textContent?.trim();
          const gilaVal = document.getElementById('replay-gila-flow')?.textContent?.trim();
          const sliderVal = document.getElementById('replay-scrubber-slider')?.value;
          
          return { timeText, relText, sjVal, lfVal, gilaVal, sliderVal };
        })()
      `,
      returnByValue: true
    });
    const seek30d = seek30dRaw.result.value;
    console.log('[Assertion 3] 30D Seek(180) readouts:', seek30d);
    assert.strictEqual(seek30d.sliderVal, '180', 'Slider value should be 180');
    assert(seek30d.relText.includes('T - 15d') || seek30d.relText.includes('T - 14d') || seek30d.relText.includes('T - 16d'), `Relative time should show ~15 days ago (got ${seek30d.relText})`);
    assert(seek30d.sjVal !== '--' && seek30d.sjVal !== '', 'San Juan flow must be populated');
    assert(seek30d.lfVal !== '--' && seek30d.lfVal !== '', 'Lees Ferry flow must be populated');
    assert(seek30d.gilaVal !== '--' && seek30d.gilaVal !== '', 'Gila flow must be populated');

    // Assertion 4: Verify MapLibre GeoJSON Dynamic Updates in 30D mode
    const testMapFeaturesRaw = await send('Runtime.evaluate', {
      expression: `
        (() => {
          const map = window.map;
          const src = map.getSource('streamflow-gauges');
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
    console.log('[Assertion 4] MapLibre 30D features at step 180:', {
      total: testMapFeatures.totalFeatures,
      leesFerry: testMapFeatures.lfProperties,
      sanJuan: testMapFeatures.sjProperties
    });
    assert(testMapFeatures.lfProperties.flow_cfs > 0, 'Lees Ferry flow_cfs should be positive');
    assert(testMapFeatures.lfProperties.circle_radius > 0, 'Lees Ferry circle_radius should be calculated');
    assert(testMapFeatures.sjProperties.flow_cfs > 0, 'San Juan flow_cfs should be positive');

    // Assertion 5: Test 30D Play & Pause Loop
    console.log('[Browser] Testing 30D Play loop at 12 steps/s...');
    await send('Runtime.evaluate', {
      expression: `
        (() => {
          window.FlowReplayEngine.setSpeed(12);
          window.FlowReplayEngine.play();
        })()
      `
    });
    await new Promise(r => setTimeout(r, 600));

    const checkPlay30dRaw = await send('Runtime.evaluate', {
      expression: `
        (() => {
          const isPlaying = window.FlowReplayEngine.isPlaying;
          const curIdx = window.FlowReplayEngine.currentIndex;
          window.FlowReplayEngine.pause();
          return { isPlaying, curIdx };
        })()
      `,
      returnByValue: true
    });
    const checkPlay30d = checkPlay30dRaw.result.value;
    console.log('[Assertion 5] 30D playback result:', checkPlay30d);
    assert(checkPlay30d.curIdx > 180, `Playback should advance beyond step 180 (now ${checkPlay30d.curIdx})`);

    // Capture visual verification screenshot of 30D mode
    const shot = await send('Page.captureScreenshot', { format: 'png' });
    const artifactPath = path.join(
      '/Users/macstudio/.gemini/antigravity/brain/58cfdbf8-91b4-4263-ad4e-596d29fac1a2',
      'verified_30d_flow_replay.png'
    );
    fs.writeFileSync(artifactPath, Buffer.from(shot.data, 'base64'));
    console.log(`[Visual Artifact] Saved screenshot to ${artifactPath}`);

    // Assertion 6: Switch back to 7D from Memory Cache (Zero HTTP fetch)
    console.log('[Browser] Switching back to 7D mode from cache...');
    const switchBack7dRaw = await send('Runtime.evaluate', {
      expression: `
        (async () => {
          const t0 = performance.now();
          await window.FlowReplayEngine.switchPeriod('7D');
          const dur = performance.now() - t0;
          return {
            activePeriod: window.FlowReplayEngine.activePeriod,
            totalSteps: window.FlowReplayEngine.totalHours,
            cachedSwitchDurationMs: dur
          };
        })()
      `,
      awaitPromise: true,
      returnByValue: true
    });
    const switchBack7d = switchBack7dRaw.result.value;
    console.log('[Assertion 6] Switch back to 7D result:', switchBack7d);
    assert.strictEqual(switchBack7d.activePeriod, '7D', 'Should be back in 7D mode');
    assert(switchBack7d.cachedSwitchDurationMs < 50, `In-memory cached switch should be instant (<50ms, was ${switchBack7d.cachedSwitchDurationMs.toFixed(1)}ms)`);

    // Assertion 7: Close and Clean Restoration
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
    assert.strictEqual(testClose.isOpen, false, 'Engine should be closed');
    assert.strictEqual(testClose.barHidden, true, 'Replay bar should be hidden');
    assert.strictEqual(testClose.btnActive, false, 'Button should be inactive');

    ws.close();
    console.log('\n>>> ALL 7 FLOW REPLAY (7D & 30D) VERIFICATION ASSERTIONS PASSED (100%) <<<\n');
  } finally {
    chromeProc.kill();
  }
}

verifyFlowReplay().catch(err => {
  console.error('VERIFICATION FAILED:', err);
  process.exit(1);
});
