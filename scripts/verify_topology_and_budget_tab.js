/**
 * Verification Script for:
 * 1. Topology Diagnostics OFF by default on map.html & map_embed.html
 * 2. Un-squeezing River Flow Schematic on pipeline.html (removed stacked comparison card, full viewport height)
 * 3. Water Budget tab on sankey.html (full height Sankey diagram, top sub-tab switcher, embedded stacked runoff vs paper bars)
 */

const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const path = require('path');
const assert = require('assert');

const ARTIFACT_DIR = '/Users/macstudio/.gemini/antigravity/brain/58cfdbf8-91b4-4263-ad4e-596d29fac1a2';
const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const DEBUG_PORT = 9268;

async function run() {
  console.log('=== STARTING TOPOLOGY & WATER BUDGET VERIFICATION SUITE ===\n');

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

    // =========================================================================
    // TEST 1: MAP.HTML - TOPOLOGY DIAGNOSTICS OFF BY DEFAULT
    // =========================================================================
    console.log('--- TEST 1: Map.html Topology Diagnostics Off by Default ---');
    await send('Page.navigate', { url: 'http://localhost:8088/map.html' });
    await new Promise(r => setTimeout(r, 3000));

    const mapToggles = await evaluate(`(() => {
      const tArrows = document.getElementById('toggle-flow-arrows')?.checked;
      const tJunctions = document.getElementById('toggle-topology-junctions')?.checked;
      const tSections = document.getElementById('toggle-topology-sections')?.checked;
      const legend = document.getElementById('topology-diagnostics-legend');
      const legendDisplay = legend ? window.getComputedStyle(legend).display : null;
      const junctionVisibility = window.map?.getLayoutProperty('topology-junctions', 'visibility');
      return {
        tArrows,
        tJunctions,
        tSections,
        legendDisplay,
        junctionVisibility
      };
    })()`);

    console.log('Map default topology state:', mapToggles);
    assert.strictEqual(mapToggles.tArrows, false, 'Flow arrows toggle must be unchecked by default');
    assert.strictEqual(mapToggles.tJunctions, false, 'Topology junctions toggle must be unchecked by default');
    assert.strictEqual(mapToggles.tSections, false, 'Topology sections toggle must be unchecked by default');
    assert.strictEqual(mapToggles.legendDisplay, 'none', 'Topology legend must be hidden by default');
    assert.strictEqual(mapToggles.junctionVisibility, 'none', 'topology-junctions layer must be "none"');
    console.log('✔ Map topology diagnostics are completely off by default\n');

    // Test URL param topology_junctions=1 explicitly enables
    await send('Page.navigate', { url: 'http://localhost:8088/map.html?topology_junctions=1' });
    await new Promise(r => setTimeout(r, 2500));
    const paramResult = await evaluate(`(() => {
      const tJunctions = document.getElementById('toggle-topology-junctions')?.checked;
      const legend = document.getElementById('topology-diagnostics-legend');
      const legendDisplay = legend ? window.getComputedStyle(legend).display : null;
      return { tJunctions, legendDisplay };
    })()`);
    console.log('With ?topology_junctions=1:', paramResult);
    assert.strictEqual(paramResult.tJunctions, true, 'Explicit URL param must enable junctions');
    assert.strictEqual(paramResult.legendDisplay, 'block', 'Topology legend must display when enabled');
    console.log('✔ URL parameter ?topology_junctions=1 correctly enables layer on demand\n');

    // =========================================================================
    // TEST 2: PIPELINE.HTML - RIVER FLOW SCHEMATIC FULL HEIGHT & NO SQUEEZE
    // =========================================================================
    console.log('--- TEST 2: Pipeline.html Flow Schematic Full Height & Un-Squeezed ---');
    await send('Page.navigate', { url: 'http://localhost:8088/pipeline.html' });
    await new Promise(r => setTimeout(r, 2000));

    const pipelineCheck = await evaluate(`(() => {
      const stackedCard = document.getElementById('stacked-comparison-card');
      const svg = document.getElementById('canvas');
      const container = svg?.parentElement;
      const containerRect = container ? container.getBoundingClientRect() : null;
      const svgRect = svg ? svg.getBoundingClientRect() : null;
      const buttonLabel = document.getElementById('subtab-btn-schematic')?.innerText.trim();
      return {
        hasStackedCard: !!stackedCard,
        containerHeight: containerRect ? containerRect.height : 0,
        svgHeight: svgRect ? svgRect.height : 0,
        buttonLabel
      };
    })()`);

    console.log('Pipeline schematic state:', pipelineCheck);
    assert.strictEqual(pipelineCheck.hasStackedCard, false, 'Stacked comparison card must be completely removed from pipeline.html');
    assert.ok(pipelineCheck.containerHeight >= 640, `Container height (${pipelineCheck.containerHeight}px) must be >= 640px`);
    assert.ok(pipelineCheck.svgHeight >= 600, `SVG height (${pipelineCheck.svgHeight}px) must be >= 600px`);
    assert.ok(pipelineCheck.buttonLabel.includes('Topological River Reach Network'), 'Sub-tab button should reflect pure topological network');
    await captureScreenshot('verified_pipeline_full_height_schematic.png');
    console.log('✔ Flow schematic takes full height without squeeze or stacked bar card\n');

    // =========================================================================
    // TEST 3: SANKEY.HTML - SANKEY FULL HEIGHT & SUB-TAB SWITCHER
    // =========================================================================
    console.log('--- TEST 3: Sankey.html Water Budget Full Height & Stacked Integration ---');
    await send('Page.navigate', { url: 'http://localhost:8088/sankey.html' });
    await new Promise(r => setTimeout(r, 2000));

    // Test 3A: Default Sankey View
    const sankeyDefault = await evaluate(`(() => {
      const sankeySec = document.getElementById('view-sankey-section');
      const stackedSec = document.getElementById('view-stacked-section');
      const container = document.getElementById('sankey-container');
      const containerRect = container ? container.getBoundingClientRect() : null;
      const svg = container ? container.querySelector('svg') : null;
      const svgRect = svg ? svg.getBoundingClientRect() : null;
      const nodeCount = svg ? svg.querySelectorAll('.node').length : 0;
      const linkCount = svg ? svg.querySelectorAll('.link').length : 0;

      return {
        sankeySecDisplay: sankeySec ? window.getComputedStyle(sankeySec).display : null,
        stackedSecDisplay: stackedSec ? window.getComputedStyle(stackedSec).display : null,
        containerHeight: containerRect ? containerRect.height : 0,
        svgHeight: svgRect ? svgRect.height : 0,
        nodeCount,
        linkCount
      };
    })()`);

    console.log('Sankey default view state:', sankeyDefault);
    assert.strictEqual(sankeyDefault.sankeySecDisplay, 'block', 'Sankey section must be block by default');
    assert.strictEqual(sankeyDefault.stackedSecDisplay, 'none', 'Stacked section must be hidden on default tab');
    assert.ok(sankeyDefault.containerHeight >= 720, `Sankey container height (${sankeyDefault.containerHeight}px) must be >= 720px`);
    assert.ok(sankeyDefault.svgHeight >= 700, `Sankey SVG height (${sankeyDefault.svgHeight}px) must be >= 700px`);
    assert.ok(sankeyDefault.nodeCount >= 18, `Node count (${sankeyDefault.nodeCount}) should be >= 18`);
    assert.ok(sankeyDefault.linkCount >= 16, `Link count (${sankeyDefault.linkCount}) should be >= 16`);
    await captureScreenshot('verified_sankey_full_height.png');
    console.log('✔ Sankey diagram is full height (>= 720px), completely un-squeezed\n');

    // Test 3B: Switch to Stacked Runoff vs Paper Allocations View
    console.log('--- TEST 3B: Switch to Stacked Runoff vs Paper Allocations View ---');
    await evaluate(`switchBudgetSubtab('stacked')`);
    await new Promise(r => setTimeout(r, 500));

    const stackedCheck = await evaluate(`(() => {
      const sankeySec = document.getElementById('view-sankey-section');
      const stackedSec = document.getElementById('view-stacked-section');
      const card = document.getElementById('stacked-comparison-card');
      const barSegments = card ? card.querySelectorAll('.bar-segment').length : 0;
      const detailBadge = document.getElementById('st-badge')?.innerText;
      const detailTitle = document.getElementById('st-title')?.innerText;

      return {
        sankeySecDisplay: sankeySec ? window.getComputedStyle(sankeySec).display : null,
        stackedSecDisplay: stackedSec ? window.getComputedStyle(stackedSec).display : null,
        hasCard: !!card,
        barSegments,
        detailBadge,
        detailTitle
      };
    })()`);

    console.log('Stacked view state:', stackedCheck);
    assert.strictEqual(stackedCheck.sankeySecDisplay, 'none', 'Sankey section must be hidden');
    assert.strictEqual(stackedCheck.stackedSecDisplay, 'block', 'Stacked section must be visible');
    assert.strictEqual(stackedCheck.hasCard, true, 'Stacked comparison card must exist in sankey.html');
    assert.ok(stackedCheck.barSegments >= 16, `Bar segments (${stackedCheck.barSegments}) must be >= 16`);

    // Test segment hover interaction
    await evaluate(`inspectStackedSegment('Upper CO Mainstem', '4.00 MAF/yr (5,525 cfs)', '26.3% of Basin Natural Runoff', 'Alpine Snowmelt', 'Physical Inflow')`);
    const hoverCheck = await evaluate(`(() => ({
      badge: document.getElementById('st-badge')?.innerText,
      vol: document.getElementById('st-vol')?.innerText,
      share: document.getElementById('st-share')?.innerText
    }))()`);
    console.log('Hover readout check:', hoverCheck);
    assert.strictEqual(hoverCheck.badge, 'PHYSICAL INFLOW');
    assert.strictEqual(hoverCheck.vol, '4.00 MAF/yr (5,525 cfs)');
    assert.strictEqual(hoverCheck.share, '26.3% of Basin Natural Runoff');

    await captureScreenshot('verified_sankey_stacked_tab.png');
    console.log('✔ Stacked Runoff vs Paper Allocations tab works with full interactivity\n');

    // Test 3C: Switch to "Both (Continuous Scroll)" View
    console.log('--- TEST 3C: View Both (Continuous Scroll) Mode ---');
    await evaluate(`switchBudgetSubtab('both')`);
    await new Promise(r => setTimeout(r, 500));

    const bothCheck = await evaluate(`(() => {
      const sankeySec = document.getElementById('view-sankey-section');
      const stackedSec = document.getElementById('view-stacked-section');
      return {
        sankeySecDisplay: sankeySec ? window.getComputedStyle(sankeySec).display : null,
        stackedSecDisplay: stackedSec ? window.getComputedStyle(stackedSec).display : null
      };
    })()`);

    console.log('Both mode state:', bothCheck);
    assert.strictEqual(bothCheck.sankeySecDisplay, 'block', 'Sankey section must be visible in both mode');
    assert.strictEqual(bothCheck.stackedSecDisplay, 'block', 'Stacked section must be visible in both mode');
    await captureScreenshot('verified_sankey_both_mode.png');
    console.log('✔ Both mode renders both diagrams sequentially for continuous scroll\n');

    console.log('==================================================');
    console.log('ALL TESTS PASSED WITH 100% SUCCESS!');
    console.log('==================================================');
  } finally {
    chromeProc.kill('SIGKILL');
  }
}

run().catch(err => {
  console.error('VERIFICATION FAILED:', err);
  process.exit(1);
});
