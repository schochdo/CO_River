/**
 * Automated CDP Verification Suite for River Flow Schematic Tabs & Comparative Stacked Bars
 */

const { spawn } = require('child_process');
const http = require('http');
const path = require('path');
const fs = require('fs');

const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const DEBUG_PORT = 9224;
const TARGET_URL = 'http://localhost:8088/pipeline.html';
const EMBED_URL = 'http://localhost:8088/?tab=pipeline';
const ARTIFACT_DIR = '/Users/macstudio/.gemini/antigravity/brain/58cfdbf8-91b4-4263-ad4e-596d29fac1a2';

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
    this.callbacks = new Map();
  }

  async connect() {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.wsUrl);
      this.ws.onopen = () => resolve();
      this.ws.onerror = (err) => reject(err);
      this.ws.onmessage = (event) => {
        const msg = JSON.parse(event.data);
        if (msg.id && this.callbacks.has(msg.id)) {
          const { resolve, reject } = this.callbacks.get(msg.id);
          this.callbacks.delete(msg.id);
          if (msg.error) {
            reject(new Error(msg.error.message || JSON.stringify(msg.error)));
          } else {
            resolve(msg.result);
          }
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

  close() {
    if (this.ws) this.ws.close();
  }
}

async function run() {
  console.log('🚀 Starting Verification: Pipeline Sub-tabs & Dual Stacked Bars...');

  const chromeProc = spawn(CHROME_PATH, [
    '--headless=new',
    `--remote-debugging-port=${DEBUG_PORT}`,
    '--disable-gpu',
    '--no-sandbox',
    '--window-size=1600,1050',
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

    if (!version) throw new Error('Chrome did not respond on debugging port');

    // 1. TEST STANDALONE PIPELINE.HTML
    const tabs = await fetchJson(`http://127.0.0.1:${DEBUG_PORT}/json/list`);
    let tab = tabs.find(t => t.type === 'page');
    if (!tab) {
      tab = await fetchJson(`http://127.0.0.1:${DEBUG_PORT}/json/new?${encodeURIComponent(TARGET_URL)}`);
    }

    const cdp = new CDPClient(tab.webSocketDebuggerUrl);
    await cdp.connect();
    await cdp.send('Page.enable');
    await cdp.send('Runtime.enable');
    await cdp.send('Page.navigate', { url: TARGET_URL });
    await sleep(1500);

    // Verify DOM structure in default (Schematic) tab
    const evalSchematic = await cdp.send('Runtime.evaluate', {
      expression: `(() => {
        const btnSchematic = document.getElementById('subtab-btn-schematic');
        const btnElevation = document.getElementById('subtab-btn-elevation');
        const viewSchematic = document.getElementById('view-schematic');
        const viewElevation = document.getElementById('view-elevation');
        const canvas = document.getElementById('canvas');
        const stackedCard = document.getElementById('stacked-comparison-card');

        // Check that old summary cards are gone
        const oldCards = document.querySelectorAll('.grid-cols-4');
        const hasOldCards = Array.from(oldCards).some(c => c.textContent.includes('Natural Basin Runoff (Supply)'));

        // Check stacked bars
        const barSegments = document.querySelectorAll('.bar-segment');
        const deficitBracket = document.querySelector('.deficit-stripe');

        // Check bounding rect of viewSchematic vs viewport
        const rect = viewSchematic.getBoundingClientRect();

        return {
          hasBtnSchematic: !!btnSchematic,
          hasBtnElevation: !!btnElevation,
          schematicVisible: !viewSchematic.classList.contains('hidden'),
          elevationHidden: viewElevation.classList.contains('hidden'),
          canvasFound: !!canvas,
          canvasViewBox: canvas?.getAttribute('viewBox'),
          hasStackedCard: !!stackedCard,
          hasOldCards,
          barSegmentCount: barSegments.length,
          hasDeficitBracket: !!deficitBracket,
          viewHeight: rect.height,
          windowHeight: window.innerHeight
        };
      })()`,
      returnByValue: true
    });

    console.log('Schematic Tab Verification:', evalSchematic.result.value);
    const sResult = evalSchematic.result.value;
    if (!sResult.hasBtnSchematic || !sResult.hasBtnElevation) throw new Error('Sub-tab buttons missing');
    if (!sResult.schematicVisible || !sResult.elevationHidden) throw new Error('Initial tab visibility incorrect');
    if (sResult.canvasViewBox !== '0 0 1280 750') throw new Error(`Canvas viewBox unexpected: ${sResult.canvasViewBox}`);
    if (sResult.hasOldCards) throw new Error('Old summary cards were not removed');
    if (!sResult.hasStackedCard) throw new Error('Stacked comparison card not found');
    if (sResult.barSegmentCount < 15) throw new Error(`Expected at least 15 bar segments, found: ${sResult.barSegmentCount}`);
    if (!sResult.hasDeficitBracket) throw new Error('Deficit overhang bracket not found');

    // Test hovering a bar segment to verify dynamic telemetry update
    const hoverTest = await cdp.send('Runtime.evaluate', {
      expression: `(() => {
        inspectStackedSegment('Green River Basin (WY/UT/CO)', '4.90 MAF/yr (6,768 cfs)', '32.2% of Basin Natural Runoff', 'Test green river description', 'Physical Inflow');
        const title = document.getElementById('st-title').innerText;
        const vol = document.getElementById('st-vol').innerText;
        const share = document.getElementById('st-share').innerText;
        const badge = document.getElementById('st-badge').innerText;
        return { title, vol, share, badge };
      })()`,
      returnByValue: true
    });
    console.log('Hover Telemetry Test:', hoverTest.result.value);
    if (!hoverTest.result.value.title.includes('Green River') || !hoverTest.result.value.vol.includes('4.90 MAF')) {
      throw new Error('Segment telemetry inspection did not update properly');
    }

    // Capture Schematic + Stacked Bars Screenshot
    const shot1 = await cdp.send('Page.captureScreenshot', { format: 'png' });
    const shot1Path = path.join(ARTIFACT_DIR, 'verified_schematic_stacked_bars.png');
    fs.writeFileSync(shot1Path, Buffer.from(shot1.data, 'base64'));
    console.log(`📸 Saved screenshot: ${shot1Path}`);

    // 2. SWITCH TO ELEVATION PROFILE TAB
    await cdp.send('Runtime.evaluate', {
      expression: `switchPipelineSubtab('elevation')`
    });
    await sleep(500);

    const evalElevation = await cdp.send('Runtime.evaluate', {
      expression: `(() => {
        const viewSchematic = document.getElementById('view-schematic');
        const viewElevation = document.getElementById('view-elevation');
        const profileSvg = document.getElementById('profile-svg');
        const readoutStrip = document.getElementById('readout-strip');
        const btn2d = document.getElementById('btn-view-2d');
        const btn25d = document.getElementById('btn-view-25d');

        // Test mode switch to 2.5D
        switchElevationView('25d');
        const tribsOpacity = document.getElementById('tribs-25d-group').style.opacity;

        // Test hover gage
        showElevationGageInfo('USGS #09380000 at Lees Ferry, AZ', 'Mile 551.0', '3,110 ft', '6,680 cfs', 'Tailwater Control', 'Sentinel Legal Divide', 'Testing lees ferry operational note');
        const readoutElev = document.getElementById('readout-elev').innerText;
        const readoutFlow = document.getElementById('readout-flow').innerText;

        return {
          schematicHidden: viewSchematic.classList.contains('hidden'),
          elevationVisible: !viewElevation.classList.contains('hidden'),
          hasProfileSvg: !!profileSvg,
          hasReadoutStrip: !!readoutStrip,
          tribsOpacity25d: tribsOpacity,
          readoutElev,
          readoutFlow
        };
      })()`,
      returnByValue: true
    });

    console.log('Elevation Profile Tab Verification:', evalElevation.result.value);
    const eResult = evalElevation.result.value;
    if (!eResult.schematicHidden || !eResult.elevationVisible) throw new Error('Sub-tab switch failed');
    if (!eResult.hasProfileSvg) throw new Error('Elevation profile SVG not found');
    if (!eResult.hasReadoutStrip) throw new Error('Readout strip not found');
    if (eResult.tribsOpacity25d !== '1' && eResult.tribsOpacity25d !== '1.0') throw new Error('2.5D mode opacity unexpected');
    if (eResult.readoutElev !== '3,110 ft') throw new Error('Elevation readout unexpected');

    // Capture Elevation Tab Screenshot
    const shot2 = await cdp.send('Page.captureScreenshot', { format: 'png' });
    const shot2Path = path.join(ARTIFACT_DIR, 'verified_elevation_profile_tab.png');
    fs.writeFileSync(shot2Path, Buffer.from(shot2.data, 'base64'));
    console.log(`📸 Saved screenshot: ${shot2Path}`);

    // Switch back to schematic
    await cdp.send('Runtime.evaluate', {
      expression: `switchPipelineSubtab('schematic')`
    });
    await sleep(300);

    // 3. TEST EMBED INSIDE MAIN APPLICATION (INDEX.HTML?TAB=PIPELINE)
    await cdp.send('Page.navigate', { url: EMBED_URL });
    await sleep(2000);

    const evalEmbed = await cdp.send('Runtime.evaluate', {
      expression: `(() => {
        const secPipeline = document.getElementById('section-pipeline');
        const iframe = document.getElementById('iframe-pipeline');
        const iframeDoc = iframe?.contentDocument || iframe?.contentWindow?.document;
        const subtabBtn = iframeDoc?.getElementById('subtab-btn-schematic');
        const stackedBar = iframeDoc?.getElementById('stacked-comparison-card');

        return {
          pipelineSectionVisible: secPipeline && !secPipeline.classList.contains('hidden'),
          iframeLoaded: !!iframeDoc,
          subtabFoundInIframe: !!subtabBtn,
          stackedBarFoundInIframe: !!stackedBar
        };
      })()`,
      returnByValue: true
    });

    console.log('Embedded in index.html Verification:', evalEmbed.result.value);
    if (!evalEmbed.result.value.pipelineSectionVisible) throw new Error('section-pipeline not visible in main app');
    if (!evalEmbed.result.value.subtabFoundInIframe) throw new Error('Sub-tabs not loaded inside iframe');
    if (!evalEmbed.result.value.stackedBarFoundInIframe) throw new Error('Stacked bars not found inside iframe');

    // Capture main app screenshot with pipeline embedded
    const shot3 = await cdp.send('Page.captureScreenshot', { format: 'png' });
    const shot3Path = path.join(ARTIFACT_DIR, 'verified_dashboard_river_flow_tab.png');
    fs.writeFileSync(shot3Path, Buffer.from(shot3.data, 'base64'));
    console.log(`📸 Saved screenshot: ${shot3Path}`);

    cdp.close();
    console.log('\n🎉 ALL VERIFICATIONS PASSED: 100% SUCCESS!');
    process.exit(0);

  } catch (err) {
    console.error('❌ Verification failed:', err);
    process.exit(1);
  } finally {
    try { chromeProc.kill('SIGTERM'); } catch (e) {}
  }
}

run();
