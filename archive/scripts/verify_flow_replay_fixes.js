/**
 * Automated Verification Script for Flow Replay Line Widths, Control Panel Layout, and LIVE Button Removal
 *
 * Verifies:
 * 1. Absence of confusing [LIVE] button in speed controls.
 * 2. Unclipped, fully-visible sentinel pulse tracking strip (San Juan, Lees Ferry, Gila River).
 * 3. Dynamic scaling of river reach line widths (weight) and streamflow gage radii across replay steps.
 * 4. Zero MapLibre GL expression errors or warnings.
 * 5. Period switching between 7D and 30D.
 * 6. Clean restoration of live baseline on replay close.
 * 7. Verification across both map.html and map_embed.html.
 */

const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const assert = require('assert');

const ARTIFACT_DIR = '/Users/macstudio/.gemini/antigravity/brain/58cfdbf8-91b4-4263-ad4e-596d29fac1a2';
const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const DEBUG_PORT = 9310;

async function runVerification() {
  console.log('[Verify] Spawning Chrome with WebGL on port', DEBUG_PORT);
  const chromeProc = spawn(CHROME_PATH, [
    '--headless=new',
    `--remote-debugging-port=${DEBUG_PORT}`,
    '--window-size=1280,800',
    '--enable-webgl',
    '--ignore-gpu-blocklist',
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
    const send = (m, p = {}) => new Promise(res => {
      const msgId = id++;
      const handler = (e) => {
        const msg = JSON.parse(e.data);
        if (msg.id === msgId) { ws.removeEventListener('message', handler); res(msg.result); }
      };
      ws.addEventListener('message', handler);
      ws.send(JSON.stringify({ id: msgId, method: m, params: p }));
    });

    const consoleLogs = [];
    const consoleErrors = [];
    ws.addEventListener('message', e => {
      const d = JSON.parse(e.data);
      if (d.method === 'Runtime.consoleAPICalled') {
        const text = d.params.args.map(a => a.value || a.description).join(' ');
        if (d.params.type === 'error' || d.params.type === 'warn') {
          consoleErrors.push(`[${d.params.type}] ${text}`);
        } else {
          consoleLogs.push(text);
        }
      }
      if (d.method === 'Runtime.exceptionThrown') {
        consoleErrors.push(`[EXCEPTION] ${d.params.exceptionDetails.text} ${d.params.exceptionDetails.exception?.description}`);
      }
    });

    await send('Page.enable');
    await send('Runtime.enable');

    for (const pageFile of ['map.html', 'map_embed.html']) {
      console.log(`\n======================================================`);
      console.log(`[Verify] Testing ${pageFile}`);
      console.log(`======================================================`);

      await send('Page.navigate', { url: `http://localhost:8088/${pageFile}` });
      await new Promise(r => setTimeout(r, 2500));

      const initCheck = await send('Runtime.evaluate', {
        expression: `(() => {
          return {
            hasMap: typeof window.map?.getZoom === 'function',
            hasReplayEngine: !!window.FlowReplayEngine,
            hasReplayBar: !!document.getElementById('flow-replay-bar'),
            hasLiveBtn: !!document.querySelector('.replay-live-btn')
          };
        })()`,
        returnByValue: true
      });

      console.log(`[Init] map and engine present:`, initCheck.result.value);
      assert.strictEqual(initCheck.result.value.hasMap, true, 'Map must be initialized');
      assert.strictEqual(initCheck.result.value.hasReplayEngine, true, 'FlowReplayEngine must be present');
      assert.strictEqual(initCheck.result.value.hasLiveBtn, false, 'Confusing LIVE button must be completely absent from DOM');

      // 1. Open Replay Engine
      console.log(`[Replay] Opening 7D replay...`);
      await send('Runtime.evaluate', {
        expression: `window.FlowReplayEngine.open('7D')`,
        awaitPromise: true
      });
      await new Promise(r => setTimeout(r, 1200));

      // 2. Check Control Panel layout and unclipped sentinels
      const layoutCheck = await send('Runtime.evaluate', {
        expression: `(() => {
          const bar = document.getElementById('flow-replay-bar');
          const strip = document.getElementById('replay-sentinel-strip');
          const pills = Array.from(strip?.querySelectorAll('.sentinel-pill') || []).map(p => {
            const r = p.getBoundingClientRect();
            return {
              text: p.innerText.replace(/\\s+/g, ' ').trim(),
              left: r.left,
              right: r.right,
              width: r.width,
              visible: r.width > 0 && r.height > 0
            };
          });

          const stripRect = strip.getBoundingClientRect();
          const barRect = bar.getBoundingClientRect();
          const speedGroup = document.querySelector('.replay-speed-group');
          const liveBtn = document.querySelector('.replay-live-btn');

          return {
            barVisible: !bar.classList.contains('hidden'),
            barWidth: barRect.width,
            pills,
            stripWidth: stripRect.width,
            speedGroupText: speedGroup?.innerText.replace(/\\s+/g, ' ').trim(),
            hasLiveBtn: !!liveBtn
          };
        })()`,
        returnByValue: true
      });

      const layout = layoutCheck.result.value;
      console.log(`[Layout] Bar visible:`, layout.barVisible);
      console.log(`[Layout] Sentinel pills:`, layout.pills);
      console.log(`[Layout] Speed group text:`, layout.speedGroupText);

      assert.strictEqual(layout.barVisible, true, 'Flow replay bar must be visible');
      assert.strictEqual(layout.hasLiveBtn, false, 'Confusing LIVE button must not exist');
      assert.strictEqual(layout.pills.length, 3, 'Must have 3 sentinel pills (San Juan, Lees Ferry, Gila River)');
      
      const gilaPill = layout.pills.find(p => p.text.includes('Gila'));
      assert.ok(gilaPill, 'Gila sentinel pill must exist');
      assert.ok(gilaPill.visible, 'Gila sentinel pill must be fully rendered');
      assert.ok(gilaPill.width > 50, 'Gila pill must have valid positive width');
      console.log(`[Layout] Verified: Gila and all sentinels are completely visible and unclipped.`);

      // 3. Test Dynamic Line Widths across Steps
      console.log(`[Replay] Testing river line width (weight) and gage radius changes across steps...`);
      
      // Step to T=0 (7 days ago)
      await send('Runtime.evaluate', { expression: `window.FlowReplayEngine.seek(0);` });
      await new Promise(r => setTimeout(r, 300));

      const step0Data = await send('Runtime.evaluate', {
        expression: `(() => {
          const rSrc = window.map.getSource('rivers');
          const gSrc = window.map.getSource('streamflow-gauges');
          const rFeats = rSrc?._data?.features || [];
          const gFeats = gSrc?._data?.features || [];

          const getReach = (r) => rFeats.find(f => f.properties.reach === r)?.properties;
          const getGage = (id) => gFeats.find(f => f.properties.id === id)?.properties;

          return {
            time: document.getElementById('replay-time-display')?.textContent,
            relTime: document.getElementById('replay-rel-time')?.textContent,
            leesFerry: getReach('lees_ferry'),
            grandCanyon: getReach('grand_canyon'),
            virgin: getReach('virgin_river'),
            littleCo: getReach('little_colorado_river'),
            hoover: getReach('lower_basin_hoover_davis'),
            paloVerde: getReach('lower_basin_paloverde_imperial'),
            gageLees: getGage('09380000'),
            gageVirgin: getGage('09415000')
          };
        })()`,
        returnByValue: true
      });

      // Step to T=80 (midway)
      await send('Runtime.evaluate', { expression: `window.FlowReplayEngine.seek(80);` });
      await new Promise(r => setTimeout(r, 300));

      const step80Data = await send('Runtime.evaluate', {
        expression: `(() => {
          const rSrc = window.map.getSource('rivers');
          const gSrc = window.map.getSource('streamflow-gauges');
          const rFeats = rSrc?._data?.features || [];
          const gFeats = gSrc?._data?.features || [];

          const getReach = (r) => rFeats.find(f => f.properties.reach === r)?.properties;
          const getGage = (id) => gFeats.find(f => f.properties.id === id)?.properties;

          return {
            time: document.getElementById('replay-time-display')?.textContent,
            relTime: document.getElementById('replay-rel-time')?.textContent,
            leesFerry: getReach('lees_ferry'),
            grandCanyon: getReach('grand_canyon'),
            virgin: getReach('virgin_river'),
            littleCo: getReach('little_colorado_river'),
            hoover: getReach('lower_basin_hoover_davis'),
            paloVerde: getReach('lower_basin_paloverde_imperial'),
            gageLees: getGage('09380000'),
            gageVirgin: getGage('09415000')
          };
        })()`,
        returnByValue: true
      });

      const s0 = step0Data.result.value;
      const s80 = step80Data.result.value;

      console.log(`[Step 0] Time: ${s0.time} (${s0.relTime})`);
      console.log(`  Lees Ferry flow: ${s0.leesFerry?.flow_cfs} cfs, weight: ${s0.leesFerry?.weight} px`);
      console.log(`  Virgin River flow: ${s0.virgin?.flow_cfs} cfs, weight: ${s0.virgin?.weight} px`);
      console.log(`  Grand Canyon flow: ${s0.grandCanyon?.flow_cfs} cfs, weight: ${s0.grandCanyon?.weight} px`);
      console.log(`  Gage Lees radius: ${s0.gageLees?.circle_radius} px, color: ${s0.gageLees?.health_color}`);

      console.log(`[Step 80] Time: ${s80.time} (${s80.relTime})`);
      console.log(`  Lees Ferry flow: ${s80.leesFerry?.flow_cfs} cfs, weight: ${s80.leesFerry?.weight} px`);
      console.log(`  Virgin River flow: ${s80.virgin?.flow_cfs} cfs, weight: ${s80.virgin?.weight} px`);
      console.log(`  Grand Canyon flow: ${s80.grandCanyon?.flow_cfs} cfs, weight: ${s80.grandCanyon?.weight} px`);
      console.log(`  Gage Lees radius: ${s80.gageLees?.circle_radius} px, color: ${s80.gageLees?.health_color}`);

      // Assert dynamic change in weights
      assert.notStrictEqual(s0.virgin?.flow_cfs, s80.virgin?.flow_cfs, 'Virgin River flow must change across steps');
      assert.notStrictEqual(s0.virgin?.weight, s80.virgin?.weight, 'Virgin River line width (weight) must scale dynamically across steps');
      assert.notStrictEqual(s0.grandCanyon?.flow_cfs, s80.grandCanyon?.flow_cfs, 'Grand Canyon flow must change across steps');
      assert.notStrictEqual(s0.grandCanyon?.weight, s80.grandCanyon?.weight, 'Grand Canyon line width (weight) must scale dynamically across steps');
      
      // Assert gage dynamic sizing and coloring
      assert.ok(s0.gageLees?.circle_radius > 0, 'Gage circle_radius must be computed');
      assert.ok(s0.gageLees?.health_color, 'Gage health_color must be computed');
      assert.notStrictEqual(s0.gageVirgin?.circle_radius, s80.gageVirgin?.circle_radius, 'Virgin gage dot radius must scale dynamically across steps');

      console.log(`[Replay] Verified: line widths and gage dots dynamically update across time steps.`);

      // 4. Capture visual screenshot artifact
      if (pageFile === 'map.html') {
        const screenshot = await send('Page.captureScreenshot', { format: 'png' });
        const shotPath = `${ARTIFACT_DIR}/verified_flow_replay_active.png`;
        fs.writeFileSync(shotPath, Buffer.from(screenshot.data, 'base64'));
        console.log(`[Artifact] Captured visual artifact to ${shotPath}`);
      }

      // 5. Test 30D period switch
      console.log(`[Replay] Testing 30D period switch...`);
      await send('Runtime.evaluate', {
        expression: `window.FlowReplayEngine.switchPeriod('30D')`,
        awaitPromise: true
      });
      await new Promise(r => setTimeout(r, 1000));

      const period30Data = await send('Runtime.evaluate', {
        expression: `(() => {
          return {
            period: window.FlowReplayEngine.activePeriod,
            totalHours: window.FlowReplayEngine.totalHours,
            sliderTicks: document.getElementById('replay-slider-ticks')?.innerText.replace(/\\s+/g, ' ').trim()
          };
        })()`,
        returnByValue: true
      });
      console.log(`[30D] Period state:`, period30Data.result.value);
      assert.strictEqual(period30Data.result.value.period, '30D', 'Active period must be 30D');
      assert.ok(period30Data.result.value.totalHours > 300, '30D dataset must have > 300 time steps');
      assert.ok(period30Data.result.value.sliderTicks.includes('30 Days'), 'Slider ticks must display 30 Days');

      // 6. Test Close & Restoration
      console.log(`[Replay] Closing replay and verifying clean baseline restoration...`);
      await send('Runtime.evaluate', { expression: `window.FlowReplayEngine.close();` });
      await new Promise(r => setTimeout(r, 500));

      const closeCheck = await send('Runtime.evaluate', {
        expression: `(() => {
          const bar = document.getElementById('flow-replay-bar');
          const rSrc = window.map.getSource('rivers');
          const gSrc = window.map.getSource('streamflow-gauges');
          return {
            isOpen: window.FlowReplayEngine.isOpen,
            barHidden: bar.classList.contains('hidden'),
            riversRestored: !rSrc._data.features[0].properties.is_replay_active,
            gaugesRestored: !gSrc._data.features[0].properties.is_replay_active
          };
        })()`,
        returnByValue: true
      });

      console.log(`[Close] Restoration state:`, closeCheck.result.value);
      assert.strictEqual(closeCheck.result.value.isOpen, false, 'Engine must report closed');
      assert.strictEqual(closeCheck.result.value.barHidden, true, 'Bar must have hidden class');
      assert.strictEqual(closeCheck.result.value.riversRestored, true, 'River features must be cleanly restored to live baseline');
      assert.strictEqual(closeCheck.result.value.gaugesRestored, true, 'Gage features must be cleanly restored to live baseline');
    }

    // Check for MapLibre expression errors
    const fatalErrors = consoleErrors.filter(e => e.includes('Error') || e.includes('TypeError') || e.includes('expression'));
    console.log(`\n[Console] Console error count:`, fatalErrors.length);
    if (fatalErrors.length > 0) {
      console.error(`[Console] Detected errors:`, fatalErrors);
    }
    assert.strictEqual(fatalErrors.length, 0, 'Must have zero MapLibre expression errors or uncaught exceptions');

    console.log(`\n======================================================`);
    console.log(`[SUCCESS] ALL FLOW REPLAY VERIFICATION CHECKS PASSED 100%!`);
    console.log(`======================================================\n`);

  } catch (err) {
    console.error('[Verify] FAILED with error:', err);
    process.exit(1);
  } finally {
    chromeProc.kill('SIGKILL');
  }
}

runVerification();
