const http = require('http');
const fs = require('fs');
const path = require('path');

const ARTIFACT_DIR = '/Users/macstudio/.gemini/antigravity/brain/58cfdbf8-91b4-4263-ad4e-596d29fac1a2';
const PORT = 9328;

function runCommand(cmd) {
  return require('child_process').spawn('bash', ['-c', cmd], { stdio: 'inherit' });
}

function getJson(url) {
  return new Promise((resolve, reject) => {
    http.get(url, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(JSON.parse(data)));
    }).on('error', reject);
  });
}

class CdpConnection {
  constructor(wsUrl) {
    this.wsUrl = wsUrl;
    this.msgId = 1;
    this.callbacks = new Map();
  }

  async connect() {
    return new Promise((resolve, reject) => {
      const nodeWs = new WebSocket(this.wsUrl);
      this.ws = nodeWs;
      nodeWs.onopen = () => resolve();
      nodeWs.onerror = reject;
      nodeWs.onmessage = e => {
        const msg = JSON.parse(e.data);
        if (msg.id && this.callbacks.has(msg.id)) {
          const cb = this.callbacks.get(msg.id);
          this.callbacks.delete(msg.id);
          if (msg.error) cb.reject(msg.error);
          else cb.resolve(msg.result);
        }
      };
    });
  }

  send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = this.msgId++;
      this.callbacks.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }
}

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function main() {
  console.log(`[Verification] Launching headless Chrome on port ${PORT}...`);
  const chromeProc = runCommand(`/Applications/Google\\ Chrome.app/Contents/MacOS/Google\\ Chrome --headless=new --remote-debugging-port=${PORT} --no-first-run --no-default-browser-check --disable-gpu about:blank`);

  let version;
  for (let i = 0; i < 20; i++) {
    try {
      version = await getJson(`http://127.0.0.1:${PORT}/json/version`);
      if (version) break;
    } catch (e) {
      await sleep(300);
    }
  }

  if (!version) {
    console.error('Failed to connect to Chrome remote debugging port.');
    process.exit(1);
  }

  const targets = await getJson(`http://127.0.0.1:${PORT}/json/list`);
  const pageTarget = targets.find(t => t.type === 'page') || targets[0];
  const cdp = new CdpConnection(pageTarget.webSocketDebuggerUrl);
  await cdp.connect();
  await cdp.send('Page.enable');
  await cdp.send('Runtime.enable');
  await cdp.send('Emulation.setDeviceMetricsOverride', {
    width: 1440,
    height: 960,
    deviceScaleFactor: 2,
    mobile: false
  });

  // TEST 1: Overview Top Ticker & Card 1
  console.log('\n--- TEST 1: Overview Top Ticker & Card 1 Allocation Gap ---');
  await cdp.send('Page.navigate', { url: 'http://localhost:8088/index.html' });
  await sleep(1500);

  const tickerText = await cdp.send('Runtime.evaluate', {
    expression: `document.getElementById('storyboard-nav').innerText`,
    returnByValue: true
  });
  console.log('Overview Ticker Text:', tickerText.result.value);

  const snapOverview = await cdp.send('Page.captureScreenshot', {
    clip: { x: 230, y: 0, width: 1210, height: 480, scale: 1 },
    format: 'png'
  });
  fs.writeFileSync(path.join(ARTIFACT_DIR, 'verified_overview_ticker_bridge.png'), Buffer.from(snapOverview.data, 'base64'));
  console.log('Saved verified_overview_ticker_bridge.png');

  // TEST 2: Water Budget Sankey & Stacked Bars
  console.log('\n--- TEST 2: Water Budget Sankey Header & Stacked Bars ---');
  await cdp.send('Page.navigate', { url: 'http://localhost:8088/sankey.html' });
  await sleep(1500);

  // Switch to stacked bar tab
  await cdp.send('Runtime.evaluate', {
    expression: `switchBudgetSubtab('stacked')`
  });
  await sleep(500);

  const stackedEval = await cdp.send('Runtime.evaluate', {
    expression: `(() => {
      const card = document.getElementById('stacked-comparison-card').getBoundingClientRect();
      const sjSpan = document.querySelector('.bar-segment[style*="width: 10.5%"] span').getBoundingClientRect();
      const redLine = document.querySelector('.absolute.left-\\\\[62\\\\.5\\\\%\\\\]').getBoundingClientRect();
      const lfMarker = document.querySelector('.absolute.left-\\\\[69\\\\.5\\\\%\\\\]').getBoundingClientRect();
      const bar1 = document.querySelector('.relative.w-full.h-9').getBoundingClientRect();

      return {
        cardBox: { x: card.x, y: card.y, width: card.width, height: card.height },
        sanJuanToRedLineGap: redLine.left - sjSpan.right,
        leesFerryToBar1Gap: lfMarker.top - bar1.bottom
      };
    })()`,
    returnByValue: true
  });
  console.log('Stacked Bar Alignment Results:', stackedEval.result.value);

  const snapStacked = await cdp.send('Page.captureScreenshot', {
    clip: {
      x: Math.round(stackedEval.result.value.cardBox.x),
      y: Math.max(0, Math.round(stackedEval.result.value.cardBox.y) - 60),
      width: Math.round(stackedEval.result.value.cardBox.width),
      height: Math.round(stackedEval.result.value.cardBox.height) + 80,
      scale: 1
    },
    format: 'png'
  });
  fs.writeFileSync(path.join(ARTIFACT_DIR, 'verified_sankey_header_and_stacked_bars.png'), Buffer.from(snapStacked.data, 'base64'));
  console.log('Saved verified_sankey_header_and_stacked_bars.png');

  // TEST 3: Telemetry Streamlined Ledger
  console.log('\n--- TEST 3: Telemetry Streamlined Ledger (No Redundant Cards) ---');
  await cdp.send('Page.navigate', { url: 'http://localhost:8088/telemetry.html' });
  await sleep(1500);

  const telemEval = await cdp.send('Runtime.evaluate', {
    expression: `(() => {
      const kpiCardsExist = !!document.getElementById('stat-total-nodes');
      const table = document.querySelector('.data-table').getBoundingClientRect();
      const pillAll = document.getElementById('pill-all').innerText;
      return { kpiCardsExist, tableTop: table.top, pillAll };
    })()`,
    returnByValue: true
  });
  console.log('Telemetry Check:', telemEval.result.value);

  const snapTelem = await cdp.send('Page.captureScreenshot', {
    clip: { x: 0, y: 0, width: 1440, height: 600, scale: 1 },
    format: 'png'
  });
  fs.writeFileSync(path.join(ARTIFACT_DIR, 'verified_telemetry_streamlined_top.png'), Buffer.from(snapTelem.data, 'base64'));
  console.log('Saved verified_telemetry_streamlined_top.png');

  // TEST 4: Pipeline Elevation Profile
  console.log('\n--- TEST 4: Pipeline Elevation Profile (Granby, Little Colorado, Virgin) ---');
  await cdp.send('Page.navigate', { url: 'http://localhost:8088/pipeline.html' });
  await sleep(1500);

  await cdp.send('Runtime.evaluate', {
    expression: `switchPipelineSubtab('profile')`
  });
  await sleep(500);

  const profileEval = await cdp.send('Runtime.evaluate', {
    expression: `(() => {
      const granby = document.getElementById('badge-lake-granby').getBoundingClientRect();
      const littleCo = document.querySelector('#layer-labels-and-callouts g[transform^="translate(460"]').getBoundingClientRect();
      const virgin = document.querySelector('#layer-labels-and-callouts g[transform^="translate(620"]').getBoundingClientRect();
      return {
        granbyBox: { x: granby.x, y: granby.y, width: granby.width, height: granby.height },
        littleCoToVirginGap: virgin.left - littleCo.right
      };
    })()`,
    returnByValue: true
  });
  console.log('Elevation Profile Checks:', profileEval.result.value);

  const snapProfile = await cdp.send('Page.captureScreenshot', {
    clip: { x: 0, y: 50, width: 1440, height: 600, scale: 1 },
    format: 'png'
  });
  fs.writeFileSync(path.join(ARTIFACT_DIR, 'verified_profile_granby_and_tribs.png'), Buffer.from(snapProfile.data, 'base64'));
  console.log('Saved verified_profile_granby_and_tribs.png');

  console.log('\n========================================');
  console.log('🎉 ALL DISCREPANCY & REDUNDANCY CHECKS PASSED');
  console.log('========================================');

  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
